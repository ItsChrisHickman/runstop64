import { C64_KEYS, SidPlayer, Vic, VicView, type Host } from 'c64kit';
import sidUrl from '../assets/starquake.sid?url';
import { runPort, type ResumeFrom } from '../../shared/port';
import { DEL, drawPending, KeyPacer, NamePicker, RETURN, type NameSpec } from '../../shared/letters';
import type { TouchLayout } from '../../shared/touch';
import raw from './data/starquake.json';
import { titlePicture } from './data';
import * as Flow from './flow';
import * as Heroes from './heroes';
import { Game } from './game';
import { entryOf, starquakeMap, type StarquakeFound } from './map';
import * as Panel from './panel';
import { describeSave, restore, snapshot } from './save';
import * as Screens from './screens';
import * as Specials from './specials';

/**
 * Starquake: the runstop64 front end for the ported game (flow.ts and the
 * rest are the game): the title (the original's loading picture, and a page of
 * credits and keys), the intro, game over, the music and effects, and the
 * shared pause screen, map with travel, assists, autosave and continue.
 */
/** Touch: BLOB goes all eight ways (diagonals on the hover pad; up picks up, down builds a platform), and fires. */
/** A teleport's code or a hero's initials on a touch screen (games/shared/letters.ts): five letters, picked with the stick and FIRE. */
export const NAME: NameSpec = { alphabet: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ', max: 5, button: { label: 'FIRE', key: 'Space' } };
const TOUCH: TouchLayout = { stick: '8', buttons: [{ label: 'FIRE', key: 'Space', size: 'big', colour: 'red' }] };

export const info = {
  title: 'Starquake',
  progress: 'Your progress is saved each time BLOB comes into a room: coming back to the game carries on where you were, and the save from before your last new game is kept too (the saved games: F1 on the directory).',
  html: `
    <p><a href="https://en.wikipedia.org/wiki/Starquake_(video_game)">Starquake</a> (1985): BLOB must rebuild the
    core of an unstable planet before it explodes. All credit for the game belongs to its creators:</p>
    <ul>
      <li>Original game and design: Stephen Crow</li>
      <li>Commodore 64 version: Nick Strange</li>
      <li>Music: Stephen Crow, played by the C64 version's own player code</li>
      <li>Published by <a href="https://en.wikipedia.org/wiki/Bubble_Bus_Software">Bubble Bus Software</a>, 1985</li>
    </ul>
    <p>Controls: arrows or WASD move (up picks things up, down builds a platform) &middot; Space fires
    (also Z, X, gamepad A) &middot; P or Esc pauses: a map of the planet; pick a room you've been in and press
    Enter to go back there &middot; M sound on or off &middot; V authentic pixel steps</p>
    <p>Changes from the original (the
    <a href="https://github.com/ItsChrisHickman/runstop64/blob/main/games/starquake/QOL.md">full log</a>):
    pause screen with map and travel &middot; autosave on every room and Continue (coming back carries on where you were; T on the pause screen goes to the title) &middot; smooth movement at any
    refresh rate &middot; ENHANCED (on unless switched to ORIGINAL): full energy in each room and unlimited lives.</p>
    <p>Source: <a href="https://github.com/ItsChrisHickman/runstop64">this remake</a> &middot; ported from the C64
    original's own code and data</p>
  `,
};

const SOUND = raw.sound;
const TITLE_PAGE_TICKS = 6 * 50;

export function run(host: Host) {
  const { renderer, input } = host;
  renderer.frame = { x: 32, y: 36 };
  const vic = new Vic();
  vic.bitmap = true;
  vic.screenOffset = 0x1c00;
  vic.bitmapOffset = 0x2000;
  vic.priority = 0xff; // all sprites behind the bitmap's pixels ($D01B)
  const g = new Game(vic.bank);
  const view = new VicView(renderer, vic);
  const music = new SidPlayer(sidUrl);
  let song = 0;
  const playSong = (n: number) => { if (song !== n) { song = n; void music.play(n); } };
  g.sound = {
    effect: (id, voice) => music.call(SOUND.request, id, voice),
    effectIfFree: (id, voice) => music.call(SOUND.ifFree, id, voice),
    silence: () => music.call(SOUND.stop),
  };
  const font = Screens.gameFont();

  type Mode = 'title' | 'intro' | 'play' | 'ending' | 'final' | 'over' | 'hero' | 'heroes';
  let mode: Mode = 'title';
  let creditsShown = false; // (the title's page: the picture, or the credits and keys)
  let ticks = 0;
  let script: Flow.Script | null = null;

  // ---- the session (games/shared/port.ts): saves, continue, the pause screen ---------------------
  const port = runPort<Uint8Array, StarquakeFound, Game>(host, {
    id: 'starquake', font, codec: { pack: (s) => s, unpack: (b) => b }, map: starquakeMap, describe: describeSave,
    // (ENTER CONTINUE on the credits page, under its SPACE: NEW GAME: the picture page has no empty row)
    strip: { y: 15 * 8, short: true, when: () => mode === 'title' && creditsShown },
    assists: [
      { id: 'health', long: 'FULL ENERGY IN EACH ROOM' },
      { id: 'lives', long: 'INFINITE LIVES' },
    ],
  }, () => ({
    state: () => g,
    phase: () => (mode === 'title' || mode === 'play' ? mode : 'other'),
    // (letters are for the screens that ask for them: M, V and P mean nothing else there)
    typing,
    // (the pause key is a letter on a screen asking for letters; the gear is not)
    canPause: (byKey) => !(byKey && typing()),
    travel,
    resume: resumeGame,
    toTitle() { g.sound.silence(); title(); },
    frame,
    updateView,
    afterView: touchKeys,
    renderView: (alpha) => view.render(alpha),
    audio: {
      player: music,
      started: () => { const n = song; song = 0; playSong(n || SOUND.songs.title); },
    },
  }));
  const { flow, fe, latch, rooms } = port;

  const hooks: Flow.Hooks = {
    roomStart(game) {
      if (fe.assist.health && game.energy < 0x78) { game.energy = 0x78; game.panelDirty |= 1; }
      rooms.enter(snapshot(game));
    },
    died(game) {
      if (fe.assist.lives) Panel.extraLife(game);
    },
  };

  // ---- title -------------------------------------------------------------------------------------

  function showPicture() {
    if (!titlePicture) return;
    g.scr.bank.set(titlePicture.bitmap, 0x2000);
    g.scr.bank.set(titlePicture.screen, 0x1c00);
  }

  function showCredits() {
    Screens.clear(g);
    const t = (row: number, text: string, colour: number) => Screens.printText(g, colour, Math.floor((40 - text.length) / 2), row, text);
    t(3, 'STARQUAKE', 0x70);
    t(5, 'A TRIBUTE TO THE 1985 CLASSIC', 0xf0);
    t(8, 'ORIGINAL GAME: STEPHEN CROW', 0x30);
    t(9, 'C64 VERSION: NICK STRANGE', 0x30);
    t(10, 'MUSIC: STEPHEN CROW', 0xd0);
    t(11, '1985 BUBBLE BUS SOFTWARE', 0xc0);
    const touch = input.touch;
    t(14, touch ? 'FIRE: NEW GAME' : 'SPACE: NEW GAME', 0x10);
    t(17, touch ? 'STICK: MOVE   UP: PICK UP' : 'ARROWS OR WASD: MOVE   SPACE: FIRE', 0xb0);
    t(18, touch ? 'DOWN: PLATFORM   FIRE: LASER' : 'UP: PICK UP   DOWN: PLATFORM', 0xb0);
    t(19, touch ? 'PAUSE: THE MAP' : 'P OR ESC: THE MAP   M: SOUND', 0xb0);
    Screens.framed(g, 0, 0x60); // (the game's frame of tiles; no text block)
  }

  function title() {
    mode = 'title';
    ticks = 0;
    script = null;
    g.sprites.enable = 0;
    showPicture();
    playSong(SOUND.songs.title);
  }

  function tickTitle() {
    ticks++;
    const page = Math.floor(ticks / TITLE_PAGE_TICKS) % 2;
    if (ticks % TITLE_PAGE_TICKS === 1) (page ? showCredits() : showPicture());
    creditsShown = page === 1;
    if (input.typed.length && !page && ticks > 10) ticks = TITLE_PAGE_TICKS; // a key: the credits page
    if (input.pressed.fire && ticks > 25) startIntro();
  }

  function startIntro() {
    mode = 'intro';
    ticks = 0;
    Screens.intro(g);
    playSong(SOUND.songs.intro);
    latch.hold();
  }

  function startGame() {
    Screens.clear(g);
    Flow.newGame(g, (Math.random() * 0x100000000) >>> 0);
    fe.newGame();
    rooms.clear();
    playSong(SOUND.songs.game);
    g.sound.silence();
    script = Flow.play(g, hooks);
    mode = 'play';
    latch.hold();
  }

  /** Carry on from a save (a room's start): the room is drawn again from there. */
  g.graceActive = () => flow.grace.active && mode === 'play';

  function resumeGame(s: Uint8Array, from: ResumeFrom) {
    restore(g, s);
    playSong(SOUND.songs.game);
    g.sound.silence();
    script = Flow.play(g, hooks);
    mode = 'play';
    // continuing after the game is over: BLOB comes back with a new game's four lives (the
    // save is the last room's start, with however few were left then)
    if (from === 'continue') { g.lives = [0, 4]; g.livesRoll = 0; g.livesSteps = 0; g.livesDir = 0; g.panelDirty = 7; }
  }

  let over = { score: '', adventure: '' };
  function gameOver() {
    mode = 'over';
    ticks = 0;
    script = null;
    over = Screens.gameOver(g);
    playSong(SOUND.songs.gameOver);
  }

  // ---- the core of heroes (the high score table; kept in the browser) -----------------------------

  const HEROES_KEY = 'starquake.heroes.v1';
  let heroes = Heroes.freshTable();
  try {
    const kept = localStorage.getItem(HEROES_KEY);
    if (kept) heroes = Uint8Array.from(atob(kept), (c) => c.charCodeAt(0));
  } catch { /* the original's table */ }
  const keepHeroes = () => { try { localStorage.setItem(HEROES_KEY, btoa(String.fromCharCode(...heroes))); } catch { /* not kept */ } };

  /** $3534: after game over, a place among the heroes (initials to type), or just the table. */
  function afterGameOver() {
    const at = Heroes.place(heroes, over.score);
    if (at < 0) { showHeroes(); return; }
    mode = 'hero';
    ticks = 0;
    playSong(SOUND.songs.game); // (the effects: the typing clicks)
    g.sound.silence();
    script = Heroes.enter(g, heroes, at, over.score, over.adventure);
  }

  function showHeroes() {
    mode = 'heroes';
    ticks = 0;
    script = null;
    Heroes.show(g, heroes);
    playSong(SOUND.songs.hiScore);
  }

  /** The joystick bits BLOB reads ($76: low = pressed), from the keys, pad or touch. */
  function joy() {
    let j = 0x7f;
    if (input.held.up) j &= ~1;
    if (input.held.down) j &= ~2;
    if (input.held.left) j &= ~4;
    if (input.held.right) j &= ~8;
    if (latch.filter(input.held.fire)) j &= ~0x10;
    return j;
  }

  /** The key held now, as the C64's keyboard scan would give it ($C5: row × 8 + column, 64 none): teleport names, Cheops trades. `skip`: keys held that aren't the keyboard's here (the touch stick's, while it picks letters). */
  function c64Key(skip: ReadonlySet<string> = new Set()) {
    for (const code of input.down) {
      const k = C64_KEYS[code];
      if (k && !skip.has(code) && !['ShiftLeft', 'ShiftRight', 'ControlLeft'].includes(code)) return k[0] * 8 + k[1];
    }
    return 64;
  }

  // ---- touch: the screens that ask for keys --------------------------------------------------------
  // (a teleport's or a hero's five letters: picked with the stick, FIRE, RET (games/shared/letters.ts),
  // the letter under the cursor drawn there, as the routine ends by itself on the fifth; a Cheops
  // trade: tap one of its five things)

  const picker = new NamePicker(NAME);
  /** The picker's keys, one at a time (the routine takes a key when it changes: each is let go before the next). */
  const pacer = new KeyPacer(3, 3);
  const PICKER_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space']);
  let tapKey = { code: 64, frames: 0 };
  const keyOf = (ch: string) => {
    const k = C64_KEYS[ch === DEL ? 'Backspace' : ch === RETURN ? 'Enter' : `Key${ch}`];
    return k ? k[0] * 8 + k[1] : 64;
  };
  const picking = () => input.touch && g.asking === 'code' && (mode === 'play' || mode === 'hero');
  /** The key the game sees this frame: the picker's (one at a time), a tap's, or the keyboard's. */
  function keyNow() {
    if (!picking()) { picker.reset(); pacer.clear(); }
    else pacer.push(picker.frame(input).keys);
    const k = pacer.next();
    if (k !== null) return keyOf(k);
    if (tapKey.frames > 0) { tapKey.frames--; return tapKey.code; }
    return c64Key(picking() ? PICKER_KEYS : undefined);
  }
  function touchKeys() {
    if (!input.touch || !g.asking || (mode !== 'play' && mode !== 'hero')) return;
    const s = renderer.screen;
    if (g.asking === 'code') {
      // the letter under the cursor, in its cell (the routine's dash there taken out), and our controls
      const at = g.codeAt, ch = picker.pending;
      if (at && ch && !pacer.busy) drawPending(s, font, ch, at.col * 8, at.row * 8, 7, 0);
      font.drawCentred(s, picker.hint, 176, 7);
    } else {
      font.drawCentred(s, 'TAP ONE', 152, 1); // (on the black under the game's HIT ANY KEY FROM 1 TO 5)
      for (const t of input.points) {
        const b = Math.round((Math.floor(t.x / 8) - 8) / 6);
        if (t.y >= 96 && t.y < 128 && b >= 0 && b <= 4) tapKey = { code: [0x10, 0x0b, 0x08, 0x3b, 0x38][b], frames: 3 };
      }
    }
  }

  /** The game is asking for letters (a teleport's code, a hero's initials). */
  function typing() { return !!g.asking && (mode === 'play' || mode === 'hero'); }

  /** Travel: picked on the map; BLOB leaves this room as by an exit and comes into that one. */
  function travel(id: string) {
    const room = Number(id), at = entryOf(fe.found, room);
    if (!at || !starquakeMap.go(String(room), g, fe.found)) return false;
    script = Flow.travel(g, hooks, room, { col: at[0], row: at[1] });
    return true;
  }

  /** One frame of whatever the game is doing; whether it was a frame of play (the grace counts it). */
  function frame(holding: boolean) {
    let counted = false;
    if (mode === 'title') tickTitle();
    else if (mode === 'intro') {
      ticks++;
      if (ticks > 25 && (input.pressed.fire || input.typed.some((c) => c === 'Enter' || c === 'Space'))) startGame();
    } else if (mode === 'over') {
      ticks++;
      if ((ticks > 100 && (input.pressed.fire || input.typed.length)) || ticks > 60 * 50) afterGameOver();
    } else if (mode === 'heroes') {
      ticks++;
      if ((ticks > 100 && (input.pressed.fire || input.typed.length)) || ticks > 60 * 50) title();
    } else if (mode === 'ending') {
      // the core is complete: the end, until a key (or its tune has had time to end); then the final count ($4E2D) and game over
      ticks++;
      if ((ticks > 100 && (input.pressed.fire || input.typed.length)) || ticks > 60 * 50) { mode = 'final'; script = Flow.finalScore(g); }
    } else if (script && !holding) {
      g.joy = joy();
      g.key = keyNow();
      counted = mode === 'play' && !g.inScreen;
      if (script.next().done) {
        if (mode === 'play' && g.won) { mode = 'ending'; ticks = 0; script = null; Specials.ending(g); playSong(SOUND.songs.ending); }
        else if (mode === 'hero') { keepHeroes(); showHeroes(); }
        else gameOver();
      } else if (mode === 'play' && !g.inScreen) starquakeMap.observe(g, fe.found);
    }
    return counted;
  }

  /** The sprites: the registers as the game last wrote them (sprites 0-2 are BLOB, at sprite 0's place). */
  function updateView() {
    for (let n = 0; n < 8; n++) {
      const r = vic.sprites[n];
      r.x = g.vic.x[n] | (g.vic.msb & (1 << n) ? 0x100 : 0);
      r.y = g.vic.y[n];
      r.ptr = g.sprites.ptr[n];
      r.colour = g.sprites.colour[n];
    }
    vic.enable = mode === 'play' ? g.vic.enable : 0;
    view.update();
  }

  title();
  return {
    touch: TOUCH,
    /** For tests: the game and the front end's state. */
    get game() { return g; },
    /** For tests: the moment's grace. */
    get grace() { return flow.grace; },
    get state() { return { mode, paused: fe.paused, enhanced: fe.enhanced, going: fe.going, found: fe.found, grace: flow.grace.left, ...flow.state }; },
    tick: port.tick,
    render: port.render,
    menu: port.menu,
  };
}
