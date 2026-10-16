import { BitmapFont, C64View, KIT_GLYPHS, SidPlayer, type Host } from 'c64kit';
import sidUrl from '../build/awm.sid?url';
import { runPort } from '../../shared/port';
import { isNumbers, readJson } from '../../shared/guards';
import type { TouchLayout } from '../../shared/touch';
import { TABLES } from './data';
import { Stick } from './input';
import { awmMap, describeSave, noteRoom, type AwmFound } from './map';
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
    const kept: unknown = readJson(localStorage.getItem(HIGH_KEY) ?? 'null');
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
  /** A tap on the title's menu line, held as the key it stands for for a few frames (the title looks at its keys in one of its two phases). */
  let menuTap = { key: 'F1', frames: 0 };

  // ---- the session (games/shared/port.ts): saves, continue, the pause screen ---------------------
  const port = runPort<AwmSave, AwmFound, Program>(host, {
    id: 'awm', font: awmFont(), codec: CODEC, map: awmMap, describe: describeSave,
    // (ENTER CONTINUE goes in the title's black lower part; F1 on the title is the music, not a restart: no restart keys)
    restartKeys: [], strip: { y: STRIP_Y },
    assists: [{ id: 'safe', long: 'SAFE RESPAWN' }],
  }, ({ flow, fe, latch, rooms }) => {
    // the game reads ENHANCED's assist as the switch has it now, and the front end's grace
    program.safeRespawn = () => fe.assist.safe === true;
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
      return { stick, f1: input.down.has('F1') || held === 'F1', f7: input.down.has('F7') || held === 'F7' };
    }

    // the game, as launched: the title (a save goes straight back into play, ContinueFlow)
    return {
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
        let counted = false;
        if (program.kind === 'title') {
          const c = controls();
          program.frame(holding ? { ...c, stick: c.stick & ~Stick.Fire } : c);
        } else if (!holding) {
          program.frame(controls());
          counted = true;
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
        return counted;
      },
      updateView: () => view.update(),
      renderView: (alpha) => view.render(alpha),
      audio: {
        player: music,
        started: async () => { await music.play(SOUND.effectsSong); if (tune !== null) music.call(SOUND.tune, tune); },
        padUnlocks: true,
      },
    };
  });

  return {
    touch: TOUCH,
    /** For tests: the game and the front end's state. */
    get program() { return program; },
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
