import { BitmapFont, C64View, KIT_GLYPHS, SidPlayer, type Host } from 'c64kit';
import sidUrl from '../build/awm.sid?url';
import { RewardShow } from '../../shared/ending/show';
<<<<<<< HEAD
import { keepWon, readWon, wantsEnding } from '../../shared/native/ending';
import { LIVES_ASSIST } from '../../shared/lives';
=======
import { keepWon, readWon, wantsEnding } from '../../shared/ending/credits';
>>>>>>> e1b86f4 (Endings: one shared show; the creature parade is folded into the montage for all eleven games)
import { runPort, type FrameResult } from '../../shared/port';
import { isNumbers, readJson } from '../../shared/guards';
import type { TouchLayout } from '../../shared/touch';
import { TABLES } from './data';
import { awmEnding, endingStats } from './ending';
import type { Game } from './game';
import { Stick } from './input';
import { awmMap, describeSave, noteRoom, type AwmFound } from './map';
import { Program, type Controls } from './program';
import { CODEC, snapshot, type AwmSave } from './save';
import { SOUND } from './sound';
import type { SoundCall } from './soundlog';

/** The key that boards a plane: the Commodore key in the original, C here (a PC keyboard has no such key). */
const FLY_KEY = 'KeyC';

/** Touch: Monty walks and climbs (four directions) and jumps (the joystick's fire button); FLY is the key that boards a plane. */
const TOUCH: TouchLayout = { stick: '4', buttons: [{ label: 'JUMP', key: 'Space', size: 'big' }, { label: 'FLY', key: FLY_KEY, size: 'small' }] };

/**
 * Auf Wiedersehen Monty: the runstop64 front end for the rebuilt game (Program is the game as the original runs it, title,
 * play, GAME OVER; the picture is drawn by c64kit's C64View from what it makes): the music and effects by the original's
 * own drivers, and the shared pause screen with the map and travel, ENHANCED, autosave and continue (games/shared).
 */
export { info } from './info';

/** Where ENTER CONTINUE goes on the title: the black lower part, under the moles' pillars and above the scroller. */
export const STRIP_Y = 152;

/** The title's menu line between the pillars (screen pixels): a tap on it chooses the other of music and effects. */
const MENU_TAP = { x0: 96, x1: 224, y0: 104, y1: 128, frames: 4 };

/** The high score is kept in the browser (the original's is lost when the C64 is switched off). */
const HIGH_KEY = 'awm.high.v1';

function readHigh(): number[] | null {
  try {
    const kept: unknown = readJson(localStorage.getItem(HIGH_KEY) ?? 'null');
    return isNumbers(kept) && kept.length === 5 && kept.every((d) => d >= 0 && d <= 255) ? kept : null;
  } catch { return null; }
}

/** The game's lettering (the letters, digits and signs of its character set), topped up with the kit's. */
export function awmFont() {
  return new BitmapFont()
    .addFromCharsetMapped(TABLES.charset, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!-:/)?', (ascii) => (ascii + 0x60) & 0xff)
    .addDrawn(KIT_GLYPHS);
}

export function run(host: Host) {
  const { renderer, input } = host;
  renderer.frame = { x: 32, y: 36 };
  const program = new Program();
  const kept = readHigh();
  if (kept) program.high.splice(0, 5, ...kept);
  const view = new C64View(renderer, program);
  const music = new SidPlayer(sidUrl);

  // ---- sound: the game's requests of its drivers, played by the .sid's copies of them -------------
  /** The tune last asked for (played again once the audio is unlocked, which comes after the title began). */
  let tune: number | null = null;
  const play = (c: SoundCall) => {
    switch (c.kind) {
      case 'effect': return music.call(SOUND.request, c.n);
      case 'tune': tune = c.n; return music.call(SOUND.tune, c.n);
      case 'silence': return music.call(SOUND.silence, c.n);
      case 'stop': tune = null; return music.call(SOUND.stop);
    }
  };

  /** The room the front end has noted, and whether it is in a game (the title or the closing screen: not). */
  let seenRoom = -1;
  let inGame = false;
  let lastKind = program.kind;
  /** The ending's show, once the session is up (made in the session's build). */
  let rewardShow: RewardShow | null = null;
  /** Whether ENHANCED is on (the front end's switch, once the session is up). */
  let enhanced = () => false;
  /** The game last in play (its numbers are THE END's, when it has ended: the program has none on the title). */
  let lastGame: Game | null = null;
  /** A tap on the title's menu line, held as the key it stands for for a few frames (the title looks at its keys in one of its two phases). */
  let menuTap = { key: 'F1', frames: 0 };
  /** A tap on FLY is held a couple of frames: the game looks at the key in the logic phase, every other frame. */
  let flyFrames = 0;

  // ---- the session (games/shared/port.ts): saves, continue, the pause screen ---------------------
  const port = runPort<AwmSave, AwmFound, Program>(host, {
    id: 'awm', font: awmFont(), codec: CODEC, map: awmMap, describe: describeSave,
    // (ENTER CONTINUE goes in the title's black lower part; F1 on the title is the music, not a restart: no restart keys)
    restartKeys: [], strip: { y: STRIP_Y },
    assists: [LIVES_ASSIST, { id: 'safe', long: 'SAFE RESPAWN' }],
    // (W on the pause screen: the ending, once the game has been won, in ENHANCED)
    ending: () => enhanced() && readWon('awm'),
  }, (self) => {
    const { flow, fe, latch, rooms } = self;
    enhanced = () => fe.enhanced;
    // the game reads ENHANCED's assist as the switch has it now, and the front end's grace
    program.safeRespawn = () => fe.assist.safe === true;
    program.unlimitedLives = () => fe.assist.lives === true;
    program.graceActive = () => flow.grace.active;

    /** Monty has come into a room (or a game has begun in one): noted for the map, and a save to carry on from. */
    function enteredRoom() {
      const game = program.game;
      const picture = program.picture;
      if (!game || !picture) return;
      seenRoom = game.world.room;
      if (noteRoom(game, fe.found)) fe.keepFound();
      rooms.enter(snapshot(game, picture.hands));
    }

    /** A new game has begun from the title. */
    function newGame() {
      fe.newGame();
      rooms.clear();
      seenRoom = -1;
      latch.hold();
    }

    /** The keys and pad as the joystick the game reads, with fire held over from a screen that closed left out until it's let go. */
    function controls(): Controls {
      const h = input.held;
      const stick = (h.up ? Stick.Up : 0) | (h.down ? Stick.Down : 0) | (h.left ? Stick.Left : 0) | (h.right ? Stick.Right : 0) | (latch.filter(h.fire) ? Stick.Fire : 0);
      // the title's keys: F1 music, F7 effects (a tap on the menu line chooses the other)
      if (input.points.some((t) => t.x >= MENU_TAP.x0 && t.x < MENU_TAP.x1 && t.y >= MENU_TAP.y0 && t.y < MENU_TAP.y1)) menuTap = { key: program.effectsChosen ? 'F1' : 'F7', frames: MENU_TAP.frames };
      const held = menuTap.frames > 0 ? menuTap.key : null;
      if (menuTap.frames > 0) menuTap.frames--;
      if (input.typed.includes(FLY_KEY)) flyFrames = 2;
      const fly = input.down.has(FLY_KEY) || flyFrames > 0;
      if (flyFrames > 0) flyFrames--;
      return { stick, f1: input.down.has('F1') || held === 'F1', f7: input.down.has('F7') || held === 'F7', fly };
    }

    // ---- the reward for winning (ENHANCED): the montage, the creatures walking through it, THE END (src/ending.ts, shared/ending/show.ts) ----
    /** The show is on from the ending (the title is up under it, CONTINUE? comes after), not from W or ?ending (which end on the title). */
    let afterWin = false;
    const reward = rewardShow = new RewardShow({
      host,
      spec: awmEnding(renderer),
      font: () => flow.getFont(),
      // (the game's tune, from its start (nothing in the sound-effects mode), and again as the title's on the way out)
      music: {
        start() { play(program.effectsChosen ? { kind: 'stop' } : { kind: 'tune', n: 0 }); },
        end() { play({ kind: 'tune', n: 0 }); },
      },
      done() {
        // (the montage's engine drew on the renderer's backdrop: the game's view takes it back)
        renderer.backdrop = view.backdrop;
        if (afterWin) { afterWin = false; latch.hold(); } else self.backToTitle();
      },
    });
    // ?ending on the page: the ending at once, for review
    if (wantsEnding()) reward.start(endingStats(null, fe.found));

    // the game, as launched: the title (a save goes straight back into play, ContinueFlow)
    return {
      takeover: reward,
      watchEnding() { afterWin = false; reward.start(endingStats(program.game, fe.found)); },
      state: () => program,
      phase: () => (program.kind === 'closing' ? 'other' : program.kind),
      travel: (to) => awmMap.go(to, program, fe.found),
      /** Carry on from a save (a room's start); after CONTINUE? from the last life lost, a new game's lives and score from nothing. */
      resume(s, from) {
        program.resume(s, from === 'continue' && program.lastEnd !== 'ending');
        inGame = true;
        enteredRoom();
      },
      toTitle() { program.toTitle(); inGame = false; },
      frame(holding) {
        let result: FrameResult = 'idle';
        if (program.kind === 'title') {
          const c = controls();
          program.frame(holding ? { ...c, stick: c.stick & ~Stick.Fire } : c);
        } else if (!holding) {
          program.frame(controls());
          result = 'played';
        }
        for (const call of program.takeSound()) play(call);
        // a game has begun from the title / a room has been entered / the game has ended (GAME OVER, the title again)
        if (program.kind === 'play') {
          if (!inGame) { inGame = true; newGame(); }
          if (program.game && program.game.world.room !== seenRoom) enteredRoom();
        } else {
          inGame = false;
          if (program.kind === 'title' && lastKind === 'closing') keepHigh();
        }
        // the ending played out (GAME OVER, the title): the win is kept, and ENHANCED shows the reward
        if (program.kind === 'title' && lastKind === 'closing' && program.lastEnd === 'ending') {
          keepWon('awm');
          if (fe.enhanced) { afterWin = true; reward.start(endingStats(lastGame, fe.found)); }
        }
        if (program.game) lastGame = program.game;
        lastKind = program.kind;
        return result;
      },
      updateView: () => view.update(program.viewStep),
      renderView: (alpha) => view.render(alpha),
      audio: {
        player: music,
        started: async () => { await music.play(SOUND.effectsSong); if (tune !== null) music.call(SOUND.tune, tune); },
      },
    };
  });

  return {
    touch: TOUCH,
    /** For tests: the game and the front end's state. */
    get program() { return program; },
    /** For tests: the ending's show (src/ending.ts). */
    get ending() { return rewardShow; },
    get frontEnd() { return port.fe; },
    /** For tests: the moment's grace. */
    get grace() { return port.flow.grace; },
    get state() { return { kind: program.kind, paused: port.fe.paused, enhanced: port.fe.enhanced, going: port.fe.going, found: port.fe.found, grace: port.flow.grace.left, roomCount: port.rooms.count, ...port.flow.state }; },
    tick: port.tick,
    render: port.render,
    menu: port.menu,
  };

  function keepHigh() {
    try { localStorage.setItem(HIGH_KEY, JSON.stringify(program.high)); } catch { /* not kept */ }
  }
}
