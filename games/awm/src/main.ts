import { BitmapFont, C64View, KIT_GLYPHS, SidPlayer, type Host } from 'c64kit';
import sidUrl from '../build/awm.sid?url';
import { ContinueFlow } from '../../shared/continue';
import { FrontEnd, type PauseRequest } from '../../shared/frontend';
import { isNumbers } from '../../shared/guards';
import type { TouchLayout } from '../../shared/touch';
import { TABLES } from './data';
import { Stick } from './input';
import { awmMap, describeSave, noteRoom } from './map';
import { Program, type Controls } from './program';
import { CODEC, snapshot, type AwmSave } from './save';
import { SOUND } from './sound';
import type { SoundCall } from './soundlog';

/** Touch: Monty walks and climbs (four directions) and jumps (the joystick's fire button). */
const TOUCH: TouchLayout = { stick: '4', buttons: [{ label: 'JUMP', key: 'Space', size: 'big' }] };

/**
 * Auf Wiedersehen Monty: the runstop64 front end for the rebuilt game (Program is the game as the original runs it, title,
 * play, GAME OVER; the picture is drawn by c64kit's C64View from what it makes): the music and effects by the original's
 * own drivers, and the shared pause screen with the map and travel, ENHANCED, autosave and continue (games/shared).
 */
export const info = {
  title: 'Auf Wiedersehen Monty',
  progress: 'Your progress is saved each time Monty enters a room: coming back to the game carries on where you were, and the save from before your last new game is kept too (the saved games: F1 on the directory).',
  html: `
    <p><a href="https://en.wikipedia.org/wiki/Auf_Wiedersehen_Monty">Auf Wiedersehen Monty</a> (1987) is the fourth game in the
    <a href="https://en.wikipedia.org/wiki/Monty_Mole">Monty Mole</a> series: Monty is on the run across Europe to the
    Costa Del Cashinhand, and must earn the money for it on the way. All credit for the game belongs to its creators:</p>
    <ul>
      <li>Design and programming: Pete Harrap, Shaun Hollingworth, Chris Kerry, Colin Dooley and Greg Holmes</li>
      <li>Graphics: Steve Kerry and T. Lloyd</li>
      <li>Music: Rob Hubbard and Ben Daglish (&ldquo;Robb and Benn&rdquo;), played by the game's own music and effect drivers</li>
      <li>Published by <a href="https://en.wikipedia.org/wiki/Gremlin_Graphics">Gremlin Graphics</a>, 1987</li>
    </ul>
    <p>Controls: arrows or WASD move (up climbs) &middot; Space jumps (also Z, X, gamepad A) and starts a game from the title &middot;
    on the title, F1 chooses the music and F7 the sound effects (on a touch screen, tap the line between the pillars) &middot;
    P or Esc pauses: items taken and a map; pick a room you've stood in and press Enter to travel there &middot;
    M mutes &middot; V authentic pixel steps &middot; gamepad Start pauses.</p>
    <p>Changes from the original (all in the spirit of the 1987 game; the
    <a href="https://github.com/ItsChrisHickman/runstop64/blob/main/games/awm/QOL.md">full log</a>):
    pause screen with a map of the world and travel &middot; autosave on every room and Continue after the last life
    (coming back carries on where you were; T on the pause screen goes to the title) &middot; smooth movement at any
    refresh rate &middot; the high score kept in your browser &middot; ENHANCED (switch to ORIGINAL on the pause screen):
    a death before Monty has had two seconds on his feet in a room starts him again where he last had them, so a life
    is lost once, not on every try.</p>
    <p>Source: <a href="https://github.com/ItsChrisHickman/runstop64">this remake</a> &middot; the game's own graphics,
    rooms and rules rebuilt from the original program and checked against it frame for frame</p>
  `,
};

/** Where ENTER CONTINUE goes on the title: the black lower part, under the moles' pillars and above the scroller. */
export const STRIP_Y = 152;

/** The title's menu line between the pillars (screen pixels): a tap on it chooses the other of music and effects. */
const MENU_TAP = { x0: 96, x1: 224, y0: 104, y1: 128, frames: 4 };

/** The high score is kept in the browser (the original's is lost when the C64 is switched off). */
const HIGH_KEY = 'awm.high.v1';

function readHigh(): number[] | null {
  try {
    const kept: unknown = JSON.parse(localStorage.getItem(HIGH_KEY) ?? 'null');
    return isNumbers(kept) && kept.length === 5 && kept.every((d) => d >= 0 && d <= 255) ? kept : null;
  } catch { return null; }
}

/** The game's lettering (the letters, digits and signs of its character set), topped up with the kit's. */
function awmFont() {
  return new BitmapFont()
    .addFromCharsetMapped(TABLES.charset, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!-:/()?', (ascii) => (ascii + 0x60) & 0xff)
    .addDrawn(KIT_GLYPHS);
}

export function run(host: Host) {
  const { renderer, input, canvas } = host;
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
  const unlock = () => {
    if (music.unlocked) return;
    void music.unlock().then(() => music.play(SOUND.effectsSong)).then(() => { if (tune !== null) music.call(SOUND.tune, tune); });
  };
  canvas.addEventListener('pointerdown', unlock);
  let muted = false;

  // ---- saves, continue, the pause screen (games/shared) ---------------------------------------
  const font = awmFont();
  // (ENTER CONTINUE goes in the title's black lower part; F1 on the title is the music, not a restart: no restart keys)
  const flow = new ContinueFlow<AwmSave>({ id: 'awm', renderer, input, font, codec: CODEC, restartKeys: [], strip: { y: STRIP_Y }, describe: describeSave });
  let fireHeldOver = false;
  const fe = new FrontEnd<Program>({
    id: 'awm', input, renderer, map: awmMap,
    assists: [{ id: 'safe', long: 'SAFE RESPAWN' }],
    font: () => font,
    panel: (lines) => flow.panel(lines),
    canGoBack: () => program.kind === 'play' && flow.state.hasSave,
    saves: flow,
    onClose: () => { fireHeldOver = true; },
  });
  // the game reads ENHANCED's assist as the switch has it now, and the front end's grace
  program.safeRespawn = () => fe.assist.safe === true;
  program.graceActive = () => flow.grace.active;

  /** Each room's start, as a save, and a number that's new for each room entered. */
  let roomSave: AwmSave | null = null;
  let roomCount = 0;
  /** The room the front end has noted, and whether it is in a game (the title or the closing screen: not). */
  let seenRoom = -1;
  let inGame = false;
  let lastKind = program.kind;

  /** Monty has come into a room (or a game has begun in one): noted for the map, and a save to carry on from. */
  function enteredRoom() {
    const game = program.game;
    const picture = program.picture;
    if (!game || !picture) return;
    seenRoom = game.world.room;
    if (noteRoom(game, fe.found)) fe.keepFound();
    roomSave = snapshot(game, picture.hands);
    roomCount++;
  }

  /** A new game has begun from the title. */
  function newGame() {
    fe.newGame();
    roomSave = null;
    seenRoom = -1;
    fireHeldOver = true;
  }

  /** Carry on from a save (a room's start); after CONTINUE? from the last life lost, a new game's lives and score from nothing. */
  function resume(s: AwmSave, afterGameOver: boolean) {
    program.resume(s, afterGameOver && program.lastEnd !== 'ending');
    inGame = true;
    fireHeldOver = true;
    fe.wentBack();
    enteredRoom();
  }

  /** What the pause screen asked for: back to the room's start, or to the title (the save stays: ENTER CONTINUE). */
  function asked(r: PauseRequest) {
    if (r === 'roomStart') backToRoomStart();
    else if (r === 'title') { fe.wentBack(); flow.toTitle(); program.toTitle(); inGame = false; fireHeldOver = true; }
  }

  /** Back to how things were on coming into this room. */
  function backToRoomStart() {
    const s = flow.saved();
    if (!s || program.kind !== 'play') return;
    resume(s, false);
    flow.resumed(s, roomCount);
  }

  const status = () => ({
    onTitle: program.kind === 'title',
    room: program.kind === 'play' && !fe.holding && roomSave ? roomCount : null,
    save: () => roomSave,
  });

  /** A tap on the title's menu line, held as the key it stands for for a few frames (the title looks at its keys in one of its two phases). */
  let menuTap = { key: 'F1', frames: 0 };

  /** The keys and pad as the joystick the game reads, with fire held over from a screen that closed left out until it's let go. */
  function controls(): Controls {
    if (fireHeldOver && !input.held.fire) fireHeldOver = false;
    const h = input.held;
    const stick = (h.up ? Stick.Up : 0) | (h.down ? Stick.Down : 0) | (h.left ? Stick.Left : 0) | (h.right ? Stick.Right : 0) | (h.fire && !fireHeldOver ? Stick.Fire : 0);
    // the title's keys: F1 music, F7 effects (a tap on the menu line chooses the other)
    if (input.points.some((t) => t.x >= MENU_TAP.x0 && t.x < MENU_TAP.x1 && t.y >= MENU_TAP.y0 && t.y < MENU_TAP.y1)) menuTap = { key: program.effectsChosen ? 'F1' : 'F7', frames: MENU_TAP.frames };
    const held = menuTap.frames > 0 ? menuTap.key : null;
    if (menuTap.frames > 0) menuTap.frames--;
    return { stick, f1: input.down.has('F1') || held === 'F1', f7: input.down.has('F7') || held === 'F7' };
  }

  /** Whether the pause screen may open now: in play, nothing of the front end's up, and not in the closing screen. */
  const canPause = () => program.kind === 'play' && !flow.holding;

  // the game, as launched: the title (a save goes straight back into play, ContinueFlow)
  return {
    touch: TOUCH,
    /** For tests: the game and the front end's state. */
    get program() { return program; },
    get frontEnd() { return fe; },
    /** For tests: the moment's grace. */
    get grace() { return flow.grace; },
    get state() { return { kind: program.kind, paused: fe.paused, enhanced: fe.enhanced, going: fe.going, found: fe.found, grace: flow.grace.left, roomCount, ...flow.state }; },
    tick() {
      if (input.typed.length || input.held.fire) unlock();
      if (input.typed.includes('KeyM')) { muted = !muted; if (music.muted !== muted) music.toggleMute(); }
      if (input.typed.includes('KeyV')) renderer.snap = !renderer.snap;

      if (program.kind === 'play') {
        fe.pauseKey(program, canPause());
        if (fe.paused) {
          asked(fe.pausedTick(program, () => view.update()));
          return;
        }
        // travel: picked on the map, carried out between frames
        if (fe.going !== null) {
          const to = fe.going;
          fe.going = null;
          if (awmMap.go(to, program, fe.found)) {
            flow.grace.start();
                  }
        }
      }
      const answered = flow.before(status());
      if (answered) {
        resume(answered, flow.lastAnswer === 'continue');
        flow.resumed(answered, roomCount);
        return;
      }

      if (program.kind === 'title') {
        const c = controls();
        program.frame(flow.holding ? { ...c, stick: c.stick & ~Stick.Fire } : c);
      } else if (!flow.holding) {
        program.frame(controls());
        flow.grace.tick();
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
      lastKind = program.kind;
      if (flow.after(status())) fireHeldOver = true;
      view.update();
      flow.draw();
    },
    render(alpha: number) {
      music.hold(flow.covering || fe.holding);
      view.render(alpha);
      if (flow.covering || fe.holding) { renderer.hideSprites(); renderer.render(); }
    },
    /** The gear (or the touch PAUSE button): the pause screen, or back from it. */
    menu() {
      if (program.kind === 'play') fe.menu(program, canPause());
    },
  };

  function keepHigh() {
    try { localStorage.setItem(HIGH_KEY, JSON.stringify(program.high)); } catch { /* not kept */ }
  }
}
