import type { Host } from 'c64kit';
import { readJson } from '../../shared/guards';
import { LIVES_ASSIST } from '../../shared/lives';
import { runPort } from '../../shared/port';
import type { TitleStrip } from '../../shared/continue';
import { PAUSE_COLOURS, SPECTRUM } from '../../shared/spectrum';
import { keyByte, Key } from './controls';
import { coalCount, hintsOf } from './hints';
import { MontyFlow, type FlowStep } from './flow';
import { spectrumFont } from '../../shared/spectrum-font';
import { Game, OPENING_ROOM } from './game';
import { describeSave, montyMap, noteReached, ROOM_COUNT, type MontyFound } from './map';
import { CODEC, restoreGame, snapshotOf, type MontySave } from './save';
import { MontySound } from './sound';
import { TOUCH } from './touch';
import { MontyView } from './view';

/**
 * Wanted: Monty Mole: the runstop64 front end for the rebuilt game. `MontyFlow` is the whole game (the title, the options, play, game over, the ending) as one object this
 * file steps; `MontyView` puts it on the renderer in the Spectrum's colours (ORIGINAL exact, ENHANCED without colour clash and with smooth motion); the session (saves,
 * continue, the pause screen with its map and travel, the ORIGINAL / ENHANCED switch) is the shared one (games/shared/port.ts), and this file is what the game says to it.
 */
export { info } from './info';

/**
 * Where ENTER CONTINUE goes on the title: the row of cells above the bottom one (the 8 pixel lines at y 176, which the loading picture leaves empty but for two bytes),
 * in bright white, which reads on the picture's magenta.
 */
export const STRIP_Y = 176;
const STRIP: TitleStrip = { y: STRIP_Y, colour: SPECTRUM.white };

/** The high score is kept in the browser (the original has none). */
const HIGH_KEY = 'montymole.high.v1';

function readHigh(): number {
  try {
    const kept: unknown = readJson(localStorage.getItem(HIGH_KEY) ?? 'null');
    return typeof kept === 'number' && Number.isInteger(kept) && kept >= 0 ? kept : 0;
  } catch { return 0; }
}

export function run(host: Host) {
  const { renderer, input } = host;
  // the sound (sound.ts): the first key or tap unlocks it, M mutes, the render tail holds it behind our screens
  const sound = new MontySound();
  let high = readHigh();

  const freshFlow = (): MontyFlow => {
    const flow = new MontyFlow();
    flow.highScore = high;
    return flow;
  };
  let current = freshFlow();
  const view = new MontyView(renderer, current.game);

  /** The step being shown, and the frame of it (0 the first). */
  let step: FlowStep | null = null;
  let into = 0;
  let lastPhase = current.phase;
  let seenEntries = current.game.entries;
  /** How the last game ended, and whether a press was down on the last frame (a start is a new press). */
  let lastEnd: 'over' | 'ending' | null = null;
  let pressed = false;

  const port = runPort<MontySave, MontyFound, MontyFlow>(host, {
    id: 'montymole', font: spectrumFont(), codec: CODEC, map: montyMap, describe: describeSave, colours: PAUSE_COLOURS,
    // (ENTER CONTINUE goes on the title's empty row; neither F1 nor R restarts anything here)
    restartKeys: [], strip: STRIP,
    // ENHANCED is these, together (the pause screen has the one switch): see QOL.md
    assists: [LIVES_ASSIST, { id: 'falls', long: 'NO FALL DEATHS' }, { id: 'loops', long: 'NO DEATH LOOPS' }, { id: 'look', long: 'NO CLASH, SMOOTH' }, { id: 'count', long: 'COAL TO GATE' }, { id: 'hints', long: 'SPARKLES' }],
  }, (self) => {
    const { flow, fe, latch, rooms } = self;

    /** A flow becomes the game being played (a new title, a game continued, a travel). */
    function adopt(next: MontyFlow): void {
      current = next;
      next.game.graceActive = () => flow.grace.active;
      view.setGame(next.game);
      step = null;
      into = 0;
      lastPhase = next.phase;
      seenEntries = next.game.entries;
    }

    /** What ENHANCED is, from the switch as it is now. */
    function applyEnhancements(): void {
      current.game.unlimitedLives = fe.assist.lives === true;
      current.game.monty.safeFalls = fe.assist.falls === true;
      current.game.noDeathLoops = fe.assist.loops === true;
    }

    function keepHigh(): void {
      high = Math.max(high, current.game.score.value);
      current.highScore = high;
      try { localStorage.setItem(HIGH_KEY, JSON.stringify(high)); } catch { /* not kept */ }
    }

    /** A room has been entered (a way in, a death, a travel): noted for the map, and a save to carry on from. */
    function entered(): void {
      const game = current.game;
      seenEntries = game.entries;
      if (game.room >= ROOM_COUNT || game.outcome !== 'playing') return; // (the scene, the ending, a game over: no save of those)
      if (noteReached(fe.found, game.room, game.monty.x, game.monty.y)) fe.keepFound();
      rooms.enter(snapshotOf(game));
    }

    /** The phase of the flow has changed. */
    function phaseChanged(from: MontyFlow['phase'], to: MontyFlow['phase']): void {
      if (from === 'options' && to === 'play') {
        // a new game: the save so far is kept as the previous one
        fe.newGame();
        rooms.clear();
        latch.hold();
      } else if (to === 'over' || to === 'ending') {
        lastEnd = to;
        keepHigh();
      }
    }

    /** What a step has brought: the pass's beeps, a change of phase, a room entered. */
    function afterStep(next: FlowStep): void {
      const game = current.game;
      sound.beeps(game.beeps);
      if (next.phase !== lastPhase) {
        phaseChanged(lastPhase, next.phase);
        lastPhase = next.phase;
      }
      if (next.phase === 'play' && game.entries !== seenEntries) entered();
    }

    /** A press that goes on from the title and the options: the jump key, Enter (with no save: with one it is CONTINUE), a tap; a new press, not one still down. */
    function starts(keys: number): boolean {
      const asked = input.typed.includes('Enter') || input.typed.includes('NumpadEnter') || input.points.length > 0;
      const now = (keys & Key.jump) !== 0 || (asked && !flow.state.hasSave) || (asked && current.phase === 'options');
      const start = now && !pressed;
      pressed = now;
      return start;
    }
    /** Whether any key, button or tap at all is down (the verses end with one). */
    const anyKey = (): boolean => input.down.size > 0 || input.typed.length > 0 || input.points.length > 0 || Object.values(input.held).some((held) => held);

    return {
      state: () => current,
      phase: () => (current.phase === 'title' ? 'title' : current.phase === 'play' ? 'play' : 'other'),
      /** The pause map's travel: to a room he has come to, at the place he came into it. */
      travel(id) {
        if (!montyMap.go(id, current, fe.found)) return false;
        seenEntries = current.game.entries - 1;
        step = null;
        entered();
        return true;
      },
      /** Carry on from a save (a room's start); after CONTINUE? from the last life lost, a new game's lives. */
      resume(s, from) {
        const game = restoreGame(s, from === 'continue' && lastEnd !== 'ending');
        adopt(new MontyFlow(game, true));
        current.highScore = high;
        lastEnd = null;
        rooms.enter(snapshotOf(game));
        // (the picture at once; the first step is a pass)
        step = current.continued();
        view.present(step, 0, true);
      },
      toTitle() {
        adopt(freshFlow());
        lastEnd = null;
      },
      frame(holding) {
        if (step !== null) into++;
        applyEnhancements();
        const keys = keyByte(input.held, latch.filter(input.held.fire));
        const start = starts(keys);
        if (holding && current.phase !== 'title') return 'idle';
        if (step === null || into >= step.frames) {
          step = current.step({ keys: holding ? 0 : keys, start: start && !holding, any: anyKey() });
          into = 0;
          afterStep(step);
        }
        sound.title(current.phase === 'title');
        sound.death(current.isDying);
        return current.phase === 'play' && !current.isDying ? 'played' : 'idle';
      },
      updateView() {
        view.look = fe.enhanced && fe.assist.look === true ? 'enhanced' : 'original';
        // the coal count and the sparkles (hints.ts): ENHANCED, in play, not over a held picture (a death's) nor a screen of ours
        const shown = fe.enhanced && current.phase === 'play' && step?.shot === null && !fe.holding && !flow.holding;
        view.count = shown && fe.assist.count === true ? coalCount(current.game) : null;
        view.sparkle(shown && fe.assist.hints === true ? hintsOf(current.game) : []);
        if (step !== null) view.present(step, into, true);
      },
      renderView: (alpha) => view.render(alpha),
      audio: { player: sound, started: () => {} },
    };
  });

  return {
    touch: TOUCH,
    /** For tests: the flow being played, the front end, the grace, the state and the sound. */
    get flow() { return current; },
    get frontEnd() { return port.fe; },
    get grace() { return port.flow.grace; },
    get sound() { return sound; },
    get state() {
      return { phase: current.phase, paused: port.fe.paused, enhanced: port.fe.enhanced, found: port.fe.found, grace: port.flow.grace.left, roomCount: port.rooms.count, ...port.flow.state };
    },
    tick: port.tick,
    render: port.render,
    menu: port.menu,
    paused: port.paused,
  };
}

export { Game, OPENING_ROOM };
