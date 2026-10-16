import { BitmapFont, C64, KIT_GLYPHS, type Host } from 'c64kit';
import { GAMES, type GameEntry } from './registry';
import type { TouchLayout } from './shared/touch';

/** Touch: tap a game (then tap it again), or move the choice with the stick and press LOAD. */
const TOUCH: TouchLayout = { stick: '4', buttons: [{ label: 'LOAD', key: 'Space', size: 'big' }] };

/**
 * The runstop64 front door: a C64-style READY screen that "loads" the game
 * directory. Pick a game with the arrows + fire/Enter, or click it. Under the
 * banner, where the C64 says how much memory it has, a line for the saved games
 * (F1, or a click or tap on it: games/saves.ts). The banner and that line stay put
 * however long the directory gets: the screen scrolls under them (PINNED).
 */
export const info = {
  title: 'runstop64',
  html: `
    <p>Commodore 64 classics, rebuilt for the browser from the original games' own data, with modern
    touches and the original SID music. Tributes, made by a fan, with full credit to the original creators.</p>
    <p>Pick a game with the arrows and Enter or Space, or click it and click it again to load it (on a phone: tap it, then tap it again, or use the stick and LOAD). Any key or tap skips the intro.</p>
    <p>Your progress in every game is saved as you play, and a game you come back to carries on where you were.
    F1 (or the line under the banner, or the gear) shows the saved games: continue one, bring back the save from before
    your last new game, or delete one.</p>
    <p>Source: <a href="https://github.com/ItsChrisHickman/runstop64">github.com/ItsChrisHickman/runstop64</a></p>
  `,
};

/**
 * Clicks and taps on the directory: the first on a game picks it, a second on the same one loads
 * it (one click loading straight away hid that there's a directory of games at all).
 */
export class Picker {
  /** The game the last click or tap picked; none yet. */
  private armed = -1;
  click(game: number): 'load' | 'pick' {
    if (game === this.armed) return 'load';
    this.armed = game;
    return 'pick';
  }
  /** Dragging a finger moves the pick (the game it ends on is picked). */
  drag(game: number) { this.armed = game; return game; }
}

export interface LoaderOptions {
  /** Load a game. */
  launch(g: GameEntry): void;
  /** Show the saved games (games/saves.ts). */
  saves(): void;
  /** Straight to the directory (coming back from the saved games). */
  skipIntro?: boolean;
  /** The directory's games (default the registry's GAMES; tests list more). */
  games?: readonly GameEntry[];
}

/** The row under the banner: the saved games (a C64's "64K RAM SYSTEM" line). */
const SAVES_ROW = 2;
/** The screen's rows. */
const ROWS = 25;
/**
 * The power-on lines (a blank row, the banner, the saved games line) stay where they are: the
 * screen scrolls under them, a line at a time as a C64's does (the typed LOAD"$",8, SEARCHING,
 * LOADING and READY. go up and off first), so the banner is never pushed off however long the
 * directory is. A directory too long even then scrolls with the choice, as a C64's screen
 * editor does with the cursor.
 */
const PINNED = 3;
const AREA = ROWS - PINNED;

/**
 * Which of the scrolling lines are shown: the first one shown (an offset into the lines under
 * the pinned rows). It follows the end as lines are printed (the cursor's line counts: the line
 * after READY.), and once there's a choice it keeps the chosen line in sight, moving no more
 * than it has to.
 */
export function scrollFor(lines: number, chosen: number | null, was: number): number {
  const end = Math.max(0, lines - AREA);
  if (chosen === null) return end;
  const at = Math.min(Math.max(was, 0), end);
  if (chosen < at) return chosen;
  if (chosen >= at + AREA) return chosen - AREA + 1;
  return at;
}

/** A pointer on the canvas, as the directory reads one (a PointerEvent). */
export interface PointerAt { clientX: number; clientY: number; pointerType: string; buttons: number }

export function run(host: Host, opts: LoaderOptions) {
  const { renderer, input, canvas } = host;
  const games = opts.games ?? GAMES;
  const font = new BitmapFont().addDrawn(KIT_GLYPHS);
  const BG = C64.Blue, FG = C64.LightBlue;
  renderer.border = FG;
  renderer.background = BG;
  renderer.frame = { x: 32, y: 36 };

  // Script typed out on arrival; '>' lines are typed, others appear instantly.
  const SCRIPT = [
    '',
    '    **** RUNSTOP64 REMAKE SYSTEM ****',
    savesLine(),
    'READY.',
    '>LOAD"$",8',
    '',
    'SEARCHING FOR $',
    'LOADING',
    'READY.',
    '>LIST',
    '',
    '0 "RUNSTOP64       " RS 64',
    ...games.map((g) => `${String(g.blocks).padEnd(4)} "${g.name.padEnd(16)}" PRG`),
    `${Math.max(0, 664 - games.reduce((n, g) => n + g.blocks, 0))} BLOCKS FREE.`,
    'READY.',
  ];
  const FIRST_GAME_LINE = SCRIPT.indexOf('0 "RUNSTOP64       " RS 64') + 1;

  let lines: string[] = [];
  let scriptPos = 0;
  let typed = 0;
  let tick = 0;
  let selected = 0;
  let launching: GameEntry | null = null;
  let loaded = false;
  let launchTick = 0;
  /** The first of the scrolling lines shown (under the pinned rows): `scrollFor`. */
  let scroll = 0;
  /** Until the choice is moved, the screen shows the end of what's printed (with the choice in sight). */
  let follow = true;
  const choose = (game: number) => { selected = game; follow = false; };
  const done = () => scriptPos >= SCRIPT.length;

  function skipIntro() {
    lines = SCRIPT.map((l) => l.replace(/^>/, ''));
    scriptPos = SCRIPT.length;
  }

  function advanceScript() {
    if (done()) return;
    const line = SCRIPT[scriptPos];
    if (line.startsWith('>')) {
      if (tick % 2) return; // type one character every other tick
      typed++;
      lines[scriptPos] = line.slice(1, typed + 1);
      if (typed >= line.length - 1) { scriptPos++; typed = 0; }
    } else {
      lines[scriptPos] = line;
      scriptPos++;
    }
  }

  /** The saved games line, for the keyboard or a touch screen. */
  function savesLine() { return input.touch ? ' TAP HERE: SAVED GAMES' : ' F1 SAVED GAMES    CLICK A GAME TWICE'; }

  /** Leaving the directory: its listeners go. */
  function leave() {
    canvas.removeEventListener('pointerdown', onPointer);
    canvas.removeEventListener('pointermove', onMove);
    canvas.removeEventListener('pointerup', onUp);
  }

  function openSaves() {
    if (launching || loaded) return;
    loaded = true;
    leave();
    opts.saves();
  }

  function start(game: GameEntry) {
    launching = game;
    launchTick = tick;
    lines.push(`LOAD"${game.name}",8,1`, '', `SEARCHING FOR ${game.name}`, 'LOADING', 'READY.', 'RUN');
  }

  /** Whether the directory is up for choosing (listed, nothing loading). */
  const choosing = () => done() && !launching && !loaded;

  /**
   * The screen: the pinned rows, then the scrolling lines from `scroll` (the cursor's line after
   * them once the listing is done, as READY. leaves it), the chosen game in sight while choosing.
   */
  function layout() {
    const below = lines.slice(PINNED);
    const count = below.length + (done() ? 1 : 0);
    scroll = scrollFor(count, choosing() ? FIRST_GAME_LINE + selected - PINNED : null, follow ? count : scroll);
    const rows: string[] = [];
    for (let r = 0; r < ROWS; r++) rows.push((r < PINNED ? lines[r] : below[scroll + r - PINNED]) ?? '');
    return { rows, count };
  }
  /** The line (an index into `lines`) shown on a screen row (past the end: none there). */
  const lineOn = (row: number) => (row < PINNED ? row : scroll + row);

  function draw() {
    const s = renderer.screen;
    s.clear(BG);
    if (lines.length > SAVES_ROW) lines[SAVES_ROW] = savesLine(); // (keys or taps: as the controls are now)
    const { rows, count } = layout();
    rows.forEach((text, row) => {
      const gameIdx = lineOn(row) - FIRST_GAME_LINE;
      const isSel = choosing() && row >= PINNED && gameIdx === selected;
      if (isSel) s.fillRect(0, row * 8, 320, 8, FG);
      font.draw(s, text, 0, row * 8, isSel ? BG : FG);
    });
    if ((tick >> 4) & 1) {
      // the cursor: on the line after READY. when done, else after what's being typed
      const last = PINNED + count - 1 - scroll;
      const x = done() ? 0 : (lines[lines.length - 1]?.length ?? 0) * 8;
      if (lines.length <= PINNED) { const r = Math.max(0, lines.length - 1); s.fillRect((lines[r]?.length ?? 0) * 8, r * 8, 8, 8, FG); }
      else if (last < ROWS) s.fillRect(x, last * 8, 8, 8, FG);
    }
  }

  /** The game on a screen row (a finger needn't hit the line exactly: a line either side of the list counts as its end), or -1. */
  const gameOnRow = (row: number) => {
    if (row < PINNED || row >= ROWS) return -1;
    const idx = lineOn(row) - FIRST_GAME_LINE;
    return idx < -1 || idx > games.length ? -1 : Math.max(0, Math.min(games.length - 1, idx));
  };
  /** The game at a point on the canvas, or -1 (beside the picture: the touch controls). */
  const gameAt = (e: PointerAt) => {
    const p = renderer.toScreen(e.clientX, e.clientY);
    if (p.x < -8 || p.x >= 328 || p.y < -8 || p.y >= 208) return -1;
    return gameOnRow(Math.max(PINNED, Math.min(ROWS - 1, Math.floor(p.y / 8))));
  };
  // A click or tap picks a game, a second one on it loads it: one click loading straight away
  // hid that there's a directory of games at all. Dragging (touch) moves the choice.
  let dragging = false;
  const picker = new Picker();
  const onPointer = (e: PointerAt) => {
    if (!done()) { skipIntro(); return; }
    if (launching || loaded) return;
    // the saved games line (and round it: a finger needn't hit it exactly)
    const p = renderer.toScreen(e.clientX, e.clientY);
    if (p.y >= (SAVES_ROW - 1) * 8 && p.y < (SAVES_ROW + 1) * 8 + 2 && p.x >= -8 && p.x < 328) { openSaves(); return; }
    const idx = gameAt(e);
    if (idx < 0) return;
    dragging = e.pointerType !== 'mouse';
    if (picker.click(idx) === 'load') start(games[idx]);
    else choose(idx);
  };
  const onMove = (e: PointerAt) => {
    if (!dragging || !done() || launching || loaded || !(e.buttons & 1)) return;
    const idx = gameAt(e);
    if (idx >= 0) choose(picker.drag(idx));
  };
  const onUp = () => { dragging = false; };
  canvas.addEventListener('pointerdown', onPointer);
  canvas.addEventListener('pointermove', onMove);
  canvas.addEventListener('pointerup', onUp);
  if (opts.skipIntro) skipIntro();

  return {
    touch: TOUCH,
    /** For tests: the screen's rows as text, the row picked (-1: none), and the pointer as the canvas hands it over. */
    get state() {
      const { rows } = layout();
      const row = rows.findIndex((_, r) => choosing() && r >= PINNED && lineOn(r) - FIRST_GAME_LINE === selected);
      return { rows, selected, row, launching: launching?.id ?? null };
    },
    pointer: { down: onPointer, move: onMove, up: onUp },
    tick() {
      tick++;
      if (!done()) {
        if (input.typed.length) skipIntro();
        else advanceScript();
      } else if (loaded) {
        return;
      } else if (launching) {
        // RUN, then a turbo loader's raster bars in the border for a moment.
        // A nod to loading, not the two-minute tape wait.
        const t = tick - launchTick;
        if (t > 30 && t <= 95) {
          renderer.borderBands = Array.from({ length: 24 + (t % 7) }, () => {
            const r = Math.random();
            return r < 0.45 ? FG : r < 0.7 ? C64.Black : r < 0.85 ? C64.White : C64.Blue;
          });
        }
        if (t > 95) {
          renderer.borderBands = null;
          leave();
          const game = launching;
          launching = null;
          loaded = true; // (once: the game's code may take a while to arrive, and this keeps ticking)
          opts.launch(game);
          return;
        }
      } else {
        if (input.typed.includes('F1')) { openSaves(); return; }
        if (input.pressed.up) choose((selected + games.length - 1) % games.length);
        if (input.pressed.down) choose((selected + 1) % games.length);
        if (input.pressed.fire || input.typed.some((c) => c === 'Enter' || c === 'NumpadEnter')) start(games[selected]);
      }
      draw();
    },
    render() {
      renderer.render();
    },
    /** The gear: the saved games. */
    menu() { if (done()) openSaves(); else skipIntro(); },
  };
}
