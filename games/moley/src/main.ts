import type { Host } from 'c64kit';
import { readJson } from '../../shared/guards';
import { LIVES_ASSIST } from '../../shared/lives';
import { RewardShow } from '../../shared/ending/show';
import { keepWon, readWon, wantsEnding } from '../../shared/native/ending';
import { runPort } from '../../shared/port';
import type { TouchLayout } from '../../shared/touch';
import type { TitleStrip } from '../../shared/continue';
import { PAUSE_COLOURS, SPECTRUM } from './colours';
import { CREDITS_TEXT_OURS, keyByte } from './controls';
import { Display } from './display';
import { endingStats, moleyEnding } from './ending';
import { spectrumFont } from './font';
import { hintsOf } from './hints';
import { MoleyFlow, type FlowOptions, type FlowStep } from './flow';
import { describeSave, moleyMap, noteDone, noteReached, SCREENS, type MoleyFound } from './map';
import { Key } from './monty';
import { SeededRandom } from './random';
import { MoleySound } from './sound';
import { CODEC, restoreGame, snapshotOf, type MoleySave } from './save';
import { MoleyView } from './view';

/**
 * Moley Christmas: the runstop64 front end for the rebuilt game. `MoleyFlow` is the whole game (the credits page, play, GAME OVER, the
 * Christmas card) as one object this file steps; `MoleyView` puts it on the renderer in the Spectrum's colours (ORIGINAL exact, ENHANCED
 * without colour clash and with smooth motion); the session (saves, continue, the pause screen with its map and travel, the ORIGINAL /
 * ENHANCED switch) is the shared one (games/shared/port.ts), and this file is what the game says to it.
 */
export { info } from './info';

/**
 * Where ENTER CONTINUE goes on the credits page: the empty rows between YOUR SINCLAIR and the Teque logo's line (the 8 pixels at y 164,
 * which are the page's cell row 20), in bright yellow, which reads on its black.
 */
export const STRIP_Y = 164;
const STRIP: TitleStrip = { y: STRIP_Y, colour: SPECTRUM.yellow };

/** Touch: the stick walks, climbs and flies (four directions), the one button jumps. */
const TOUCH: TouchLayout = { stick: '4', buttons: [{ label: 'JUMP', key: 'Space', size: 'big' }] };

/** The high score is kept in the browser (the original's is lost when the Spectrum is switched off). */
const HIGH_KEY = 'moley.high.v1';

function readHigh(): number {
  try {
    const kept: unknown = readJson(localStorage.getItem(HIGH_KEY) ?? 'null');
    return typeof kept === 'number' && Number.isInteger(kept) && kept >= 0 ? kept : 0;
  } catch { return 0; }
}

/** The jump key is held for this many frames after Enter or a tap on the credits page (it reads none while it looks for a joystick). */
const START_HOLD = 60;

export function run(host: Host) {
  const { renderer, input } = host;
  // the sound (sound.ts): the first key or tap unlocks it and starts the music, M mutes both, the render tail holds it behind our screens
  const sound = new MoleySound();
  const options: FlowOptions = { creditsText: CREDITS_TEXT_OURS };
  let seed = (Date.now() >>> 0) ^ 0x2545f491;
  let high = readHigh();

  /** The credits page, with the best score so far. */
  const freshFlow = (): MoleyFlow => {
    const flow = new MoleyFlow(new SeededRandom(seed++), undefined, options);
    flow.highScore = Math.max(flow.highScore, high);
    return flow;
  };
  let current = freshFlow();
  const view = new MoleyView(renderer, current.display);

  /** The step being shown, and the frame of it (0 the first). */
  let step: FlowStep | null = null;
  let into = 0;
  let lastPhase = current.phase;
  let seenEntries = current.display.entries;
  /** The screen he is in (-1: none yet in this game), and whether the room just entered was by travel (not an exit). */
  let seenRoom = -1;
  let travelled = false;
  /** How the last game ended: GAME OVER, or the Christmas card. */
  let lastEnd: 'over' | 'ending' | null = null;
  /** The ending's show (src/ending.ts, shared/ending/show.ts), once the session is up; and whether it is on from the Christmas card (over the credits page it leaves) or from W or `?ending` (which end on the credits page by going back to the title). */
  let reward: RewardShow | null = null;
  let afterCard = false;
  /** Whether ENHANCED is on (the front end's switch, once the session is up). */
  let enhanced = (): boolean => false;
  let startFrames = 0;

  const port = runPort<MoleySave, MoleyFound, MoleyFlow>(host, {
    id: 'moley', font: spectrumFont(), codec: CODEC, map: moleyMap, describe: describeSave, colours: PAUSE_COLOURS,
    // (ENTER CONTINUE goes on the credits page's empty rows; neither F1 nor R restarts anything here)
    restartKeys: [], strip: STRIP,
    // (W on the pause screen: the ending, once the game has been won, in ENHANCED)
    ending: (): boolean => enhanced() && readWon('moley'),
    // ENHANCED is these four, together (the pause screen has the one switch): see QOL.md
    assists: [LIVES_ASSIST, { id: 'steer', long: 'AIR STEERING' }, { id: 'count', long: 'ITEMS LEFT' }, { id: 'look', long: 'NO CLASH, SMOOTH' }, { id: 'hints', long: 'SPARKLES' }],
  }, (self) => {
    const { flow, fe, latch, rooms } = self;
    enhanced = (): boolean => fe.enhanced;
    // ---- the reward for winning (ENHANCED): the montage of the six screens, the parade, THE END (src/ending.ts) ----
    const show = reward = new RewardShow({
      host,
      spec: moleyEnding(renderer, sound),
      font: () => flow.getFont(),
      // (the game's tune from its start; it goes on as it did when the show is over)
      music: { start: () => sound.restartMusic(), end: () => sound.restartMusic() },
      done: () => {
        sound.sync(current.game);
        if (afterCard) { afterCard = false; latch.hold(); } else self.backToTitle();
      },
    });
    /** A flow becomes the game being played (a new credits page, a game continued, a travel). */
    function adopt(next: MoleyFlow): void {
      current = next;
      next.game.graceActive = () => flow.grace.active;
      view.setDisplay(next.display);
      step = null;
      into = 0;
      lastPhase = next.phase;
      seenEntries = next.display.entries;
    }

    /** What ENHANCED is, from the switch as it is now. */
    function applyEnhancements(): void {
      const { enhanced } = current.game;
      enhanced.airSteering = fe.assist.steer === true;
      enhanced.itemCount = fe.assist.count === true;
      enhanced.unlimitedLives = fe.assist.lives === true;
    }

    function keepHigh(): void {
      high = Math.max(high, current.game.highScore, current.game.score);
      try { localStorage.setItem(HIGH_KEY, JSON.stringify(high)); } catch { /* not kept */ }
    }

    /** A screen has been entered (a way in, a death, a travel): noted for the map, and a save to carry on from. */
    function entered(): void {
      seenEntries = current.display.entries;
      const game = current.game;
      // (the card is room 6; a game over has lives gone and the ending is made: no save of those)
      if (game.room >= SCREENS || game.lives < 0 || game.ended) return;
      const room = game.room;
      let changed = noteReached(fe.found, room);
      if (seenRoom >= 0 && seenRoom !== room && !travelled) changed = noteDone(fe.found, seenRoom) || changed;
      travelled = false;
      seenRoom = room;
      if (changed) fe.keepFound();
      rooms.enter(snapshotOf(game));
    }

    /** The phase of the flow has changed. */
    function phaseChanged(from: MoleyFlow['phase'], to: MoleyFlow['phase']): void {
      if (from === 'credits' && to === 'play') {
        // a new game from the credits page: the save so far is kept as the previous one
        fe.newGame();
        rooms.clear();
        latch.hold();
        seenRoom = -1;
      } else if (to === 'over' || to === 'ending') {
        lastEnd = to;
        if (to === 'ending') keepWon('moley');
        if (to === 'ending' && seenRoom >= 0 && noteDone(fe.found, seenRoom)) fe.keepFound();
        keepHigh();
      } else if (from === 'ending' && to === 'credits' && fe.enhanced) {
        // the card is over: the show, over the credits page it has gone back to (the game's own end is as it was)
        afterCard = true;
        show.start(endingStats(current, fe.found));
      }
    }

    /** What a step has brought: the pass's effects, a change of phase, a screen entered. */
    function afterStep(next: FlowStep): void {
      const game = current.game;
      sound.afterStep(game, next);
      if (next.phase !== lastPhase) {
        phaseChanged(lastPhase, next.phase);
        lastPhase = next.phase;
      }
      if (next.phase === 'play' && current.display.entries !== seenEntries) entered();
    }

    /**
     * With no save to ask about, Enter or a tap on the credits page starts a game as the jump key does. The page reads no key for its first
     * 48 frames, so the press is kept for `START_HOLD`. Looked at every frame.
     */
    function watchStart(holding: boolean): void {
      if (current.phase !== 'credits' || holding) { startFrames = 0; return; }
      const asked = input.typed.includes('Enter') || input.typed.includes('NumpadEnter') || input.points.length > 0;
      if (asked && !flow.state.hasSave) startFrames = START_HOLD;
    }

    /** The byte of a pass (nothing while a question holds the credits page). */
    function keys(holding: boolean): number {
      const bits = keyByte(input.held, latch.filter(input.held.fire));
      if (current.phase !== 'credits') return bits;
      if (holding) return 0;
      return startFrames > 0 ? bits | Key.jump : bits;
    }
    /** Whether any key, button or tap at all is down (the Christmas card waits for one). */
    const anyKey = (): boolean => input.down.size > 0 || input.typed.length > 0 || input.points.length > 0 || Object.values(input.held).some((held) => held);

    // ?ending on the page: the ending at once, for review
    if (wantsEnding()) show.start(endingStats(current, fe.found));

    return {
      takeover: show,
      watchEnding() { afterCard = false; show.start(endingStats(current, fe.found)); },
      state: () => current,
      phase: () => (current.phase === 'credits' ? 'title' : current.phase === 'play' ? 'play' : 'other'),
      /** The pause map's travel: to the start of a screen he has come to, on a fresh flow (nothing queued from the one he was in). */
      travel(id) {
        if (!moleyMap.go(id, current, fe.found)) return false;
        adopt(new MoleyFlow(current.game.rng, { game: current.game, display: current.display }, options));
        sound.sync(current.game);
        travelled = true;
        entered();
        return true;
      },
      /** Carry on from a save (a screen's start); after CONTINUE? from the last life lost, a new game's lives and score from nothing. */
      resume(s, from) {
        const rng = new SeededRandom(seed++);
        const game = restoreGame(s, rng, high, from === 'continue' && lastEnd !== 'ending');
        const display = new Display(game);
        display.hud();
        adopt(new MoleyFlow(rng, { game, display }, options));
        seenRoom = s.room;
        lastEnd = null;
        sound.sync(game);
        rooms.enter(snapshotOf(game));
        // (the picture at once; the first step is a pass)
        const first: FlowStep = { phase: 'play', frames: 1, shot: display.still(1), fresh: false, redraw: false, before: null };
        step = first;
        view.present(first, 0, true);
      },
      toTitle() {
        adopt(freshFlow());
        seenRoom = -1;
        lastEnd = null;
      },
      frame(holding) {
        if (step !== null) into++;
        applyEnhancements();
        watchStart(holding);
        if (startFrames > 0 && current.phase === 'credits') startFrames--;
        if (holding && current.phase !== 'credits') return 'idle';
        if (step === null || into >= step.frames) {
          step = current.step({ keys: keys(holding), any: anyKey() });
          into = 0;
          afterStep(step);
        }
        return current.phase === 'play' ? 'played' : 'idle';
      },
      updateView() {
        view.look = fe.enhanced && fe.assist.look === true ? 'enhanced' : 'original';
        if (step !== null) view.present(step, into, true);
        // sparkles on the puzzles and the ways out (hints.ts): ENHANCED, in play, not over a held picture (a death's) nor a screen of ours
        const shown = fe.enhanced && fe.assist.hints === true && current.phase === 'play' && step?.shot === null && !fe.holding && !flow.covering;
        view.sparkle(shown ? hintsOf(current.game) : []);
      },
      renderView: (alpha) => view.render(alpha),
      audio: { player: sound, started: () => {} }, // (unlocking starts the music itself)
    };
  });

  return {
    touch: TOUCH,
    /** For tests: the flow being played, the front end, the grace and the state, and the ending's show. */
    get flow() { return current; },
    get ending() { return reward; },
    get frontEnd() { return port.fe; },
    get grace() { return port.flow.grace; },
    get sound() { return sound; },
    get state() {
      return { phase: current.phase, paused: port.fe.paused, enhanced: port.fe.enhanced, found: port.fe.found, grace: port.flow.grace.left, roomCount: port.rooms.count, ...port.flow.state };
    },
    tick: port.tick,
    render: port.render,
    menu: port.menu,
  };
}
