import type { BitmapFont, Surface } from 'c64kit';

/**
 * The pause screen for native ports, in the spirit of the Monty remake's: the
 * game waits underneath while it shows a map of where the player is (as much as
 * they've found), how they're doing, and the game's options.
 *
 * Each game supplies a `PauseMap`: what to note as the player goes (`observe`,
 * every frame of play) and how to draw it. What's been found is the map's own type `F`, kept
 * with the autosave and empty with a new game; the map's `FoundCodec` reads it back from what
 * was kept.
 */
export interface Box { x: number; y: number; w: number; h: number }

/**
 * What the player has found, as a game's map has it (`F`: plain JSON, so it is kept as it is,
 * with JSON.stringify, by games/shared/saves.ts). The map says how to make one.
 */
export interface FoundCodec<F> {
  /** Nothing found yet (a new game). */
  empty(): F;
  /**
   * What was kept, read back: anything at all (storage holds what it holds, old saves included).
   * A part that doesn't check is empty, the rest is kept. Read once, when the front end starts;
   * the map never checks it again.
   */
  parse(kept: unknown): F;
}

/** A place on the map to go back to, where it's drawn (`r`: the picked box's half-height, to fit round its mark, 6 if not given; `rx`: its half-width, `r` if not given, for a place drawn wide); `here`: where the player is. */
export interface MapPlace { id: string; x: number; y: number; r?: number; rx?: number; here?: boolean }

export interface PauseMap<T, F> {
  /** How what the player has found is read back, and what a new game starts with. */
  readonly found: FoundCodec<F>;
  /** Every frame of play: note what the player has found (`vic`: the VIC-II registers). */
  observe(ram: T, found: F, vic: Uint8Array): void;
  /** The heading over the map, e.g. "FLOOR 3" (`page`: which page is shown, for maps with pages). */
  title(ram: T, page?: number): string;
  /** Draw the map into the box (`blink` alternates twice a second, for "you are here"; `pick`: the place picked, for maps that say more about it). */
  draw(s: Surface, box: Box, ram: T, found: F, blink: boolean, page?: number, font?: BitmapFont, pick?: string | null): void;
  /** Lines for the side panel (how the player is doing). */
  info(ram: T, found: F): string[];
  /** What the map's marks mean (a coloured square and a word each); or, for marks that come and go, what they mean now. */
  legend?: { colour: number; text: string }[] | ((ram: T) => { colour: number; text: string }[]);
  /** Maps in pages (e.g. floors): the pages there are to show, and the one the player is on. */
  pages?(ram: T, found: F): { list: number[]; current: number };
  /** Places on the shown page the player can go back to, where they're drawn in `box`; `here` is where the player is. */
  places?(box: Box, ram: T, found: F, page?: number): MapPlace[];
  /** Go to a place (called in the game's main loop, between its frames). Returns false if it can't from here. */
  go?(id: string, ram: T, found: F): boolean | void;
}

/**
 * A save described from a game's map (the save manager's lines): the map's heading for where
 * (a room, a floor, a level), then its side panel's lines for how the player is doing. For games
 * whose saves are the state the map reads (a machine's RAM); others describe their own saves.
 */
export function mapSummary<T, F>(map: PauseMap<T, F>, state: T, found: F): string[] {
  return [map.title(state), ...map.info(state, found)];
}

/** The pause screen's map controls: which page is shown and which place is picked. */
export interface PauseUi {
  page?: number;
  pick?: { x: number; y: number; r?: number; rx?: number; id?: string } | null;
  /** The touch controls are in use: say "tap" (and show < > for pages) instead of naming keys. */
  touch?: boolean;
  /** The options page: these lines where the map goes (each "KEY NAME ON/OFF"). */
  list?: string[];
}

/** Where things on the pause screen are, for taps (C64 pixels). */
export const PAUSE_TAP = {
  /** The title row: its left and right ends turn the pages. */
  title: { y0: 0, y1: 20, x1: 214 },
  /** The foot line: back to the game. */
  footY: 180,
  /** The options, bottom up from y=166, 12 apart, right of x=214. */
  optionsX: 214,
  /** Which option line (index into `options`) a tap is on, or -1. */
  option(x: number, y: number, count: number) {
    if (x < 214) return -1;
    for (let i = 0; i < count; i++) { const ly = 166 - (count - 1 - i) * 12; if (y >= ly - 3 && y < ly + 9) return i; }
    return -1;
  },
  /** The options page's lines: in the map's box, from its top, 14 apart. */
  listY: 30,
  listStep: 14,
  /** Which line of the options page a tap is on, or -1. */
  listLine(x: number, y: number, count: number) {
    if (x < 6 || x >= 210) return -1;
    const i = Math.floor((y - this.listY + 4) / this.listStep);
    return i >= 0 && i < count ? i : -1;
  },
};

/** The box the map is drawn in. */
export const MAP_BOX: Box = { x: 10, y: 22, w: 196, h: 150 };

/** C64 colours used by maps. */
export const COL = { black: 0, white: 1, red: 2, cyan: 3, purple: 4, green: 5, blue: 6, yellow: 7, orange: 8, brown: 9, pink: 10, dgrey: 11, grey: 12, lgreen: 13, lblue: 14, lgrey: 15 };

/** Draws the whole pause screen. */
export function drawPause<T, F>(s: Surface, font: BitmapFont, map: PauseMap<T, F>, ram: T, found: F, tick: number, options: string[], ui: PauseUi = {}) {
  s.fillRect(0, 0, 320, 200, COL.black);
  // frame, in the style of the Pendragon status lines
  s.fillRect(0, 0, 320, 2, COL.yellow); s.fillRect(0, 198, 320, 2, COL.yellow);
  s.fillRect(0, 0, 2, 200, COL.yellow); s.fillRect(318, 0, 2, 200, COL.yellow);
  s.fillRect(214, 2, 2, 178, COL.dgrey);
  s.fillRect(2, 178, 316, 2, COL.dgrey);
  const title = ui.list ? 'OPTIONS' : map.title(ram, ui.page);
  font.draw(s, title, Math.floor((214 - title.length * 8) / 2), 8, COL.yellow);
  if (ui.list) {
    // the options page: each line's key, name, and whether it's on
    ui.list.forEach((line, i) => {
      const y = PAUSE_TAP.listY + i * PAUSE_TAP.listStep, on = line.endsWith(' ON');
      font.draw(s, line.slice(0, 2), 10, y, COL.white);
      font.draw(s, line.slice(2, 19), 26, y, COL.lgrey);
      font.draw(s, on ? 'ON' : 'OFF', 178, y, on ? COL.lgreen : COL.grey);
    });
  } else {
    if (ui.touch && ui.page !== undefined) { font.draw(s, '<', 8, 8, COL.white); font.draw(s, '>', 198, 8, COL.white); }
    map.draw(s, MAP_BOX, ram, found, Math.floor(tick / 12) % 2 === 0, ui.page, font, ui.pick?.id ?? null);
  }
  if (ui.pick) { // the place picked to go to
    const { x, y } = ui.pick, r = ui.pick.r ?? 6, rx = ui.pick.rx ?? r, c = Math.floor(tick / 6) % 2 ? COL.cyan : COL.white;
    const x0 = Math.floor(x - rx), w = Math.ceil(2 * rx) + 1;
    s.fillRect(x0, y - r, w, 1, c); s.fillRect(x0, y + r, w, 1, c);
    s.fillRect(x0, y - r, 1, 2 * r + 1, c); s.fillRect(x0 + w - 1, y - r, 1, 2 * r + 1, c);
  }
  font.draw(s, 'PAUSED', 222, 8, COL.white);
  const info = map.info(ram, found);
  info.forEach((line, i) => font.draw(s, line.slice(0, 11), 222, 26 + i * 12, COL.lgrey));
  const legend = typeof map.legend === 'function' ? map.legend(ram) : map.legend ?? [];
  legend.forEach((l, i) => {
    const y = 26 + (info.length + i) * 12;
    s.fillRect(222, y + 1, 6, 6, l.colour);
    font.draw(s, l.text.slice(0, 9), 232, y, COL.lgrey);
  });
  options.forEach((line, i) => font.draw(s, line.slice(0, 11), 222, 166 - (options.length - 1 - i) * 12, COL.cyan));
  const foot = ui.list ? (ui.touch ? 'TAP AN OPTION TO CHANGE IT' : 'ITS KEY CHANGES IT  O MAP  P BACK') : ui.touch ? (ui.pick ? 'TAP A PLACE, TAP AGAIN TO GO THERE' : 'TAP HERE TO GO BACK TO THE GAME') : ui.pick ? (ui.page !== undefined ? 'ARROWS PICK ENTER GO  < > PAGES  P BACK' : 'ARROWS PICK  ENTER GO  P BACK') : ui.page !== undefined ? '< >  OTHER PAGES    P  BACK' : 'P OR ESC  BACK TO THE GAME';
  font.draw(s, foot, Math.floor((320 - foot.length * 8) / 2), 186, COL.white);
}

// What's been found is plain JSON kept in the browser: maps read their part back through these checks.
export { isNumber, isNumbers, isRecord, isRecordOf, isString, isStrings } from '../guards';

/**
 * A map drawn as strips, for games that keep their places as long sideways-scrolling strips
 * (Blackwyche's decks, The Staff of Karnath's levels): the picked place's name under the map,
 * so a pick says where it goes.
 */
export function drawPickName(s: Surface, box: Box, font: BitmapFont | undefined, name: string | null, note?: { text: string; colour: number }) {
  if (!font || !name) return;
  const room = Math.floor(box.w / 8), tail = note?.text ? ` ${note.text}` : '';
  const text = name.slice(0, room - tail.length), x = box.x + Math.floor((box.w - (text.length + tail.length) * 8) / 2);
  s.fillRect(box.x, box.y + box.h - 9, box.w, 9, COL.black);
  font.draw(s, text, x, box.y + box.h - 8, COL.cyan);
  if (note && tail) font.draw(s, tail, x + text.length * 8, box.y + box.h - 8, note.colour);
}

/** The colours places with everything in them collected shimmer through on a map (Monty on the Run's coin shimmer), one step every 4 frames. */
const SHIMMER = [2, 4, 4, 10, 7, 1, 1, 7, 10, 4, 4];
export const shimmerColour = (tick: number, offset: number) => SHIMMER[((tick >> 2) + offset) % SHIMMER.length];

/** Text on the screen at (row, col), from screen codes (letters 1-26; in Pendragon status lines $3A is 0 and $3B a colon). */
export function screenText(ram: Uint8Array, row: number, col: number, len: number) {
  let t = '';
  for (let i = 0; i < len; i++) {
    const c = ram[0x400 + row * 40 + col + i] & 0x7f;
    t += c >= 1 && c <= 26 ? String.fromCharCode(64 + c) : c >= 0x30 && c <= 0x39 ? String.fromCharCode(c) : c === 0x3a ? '0' : c === 0x3b ? ':' : ' ';
  }
  return t.trim().replace(/\s+/g, ' ');
}
/** A three-digit number shown in a Pendragon status line ($3A is 0). */
export const statusNumber = (ram: Uint8Array, at: number) => [0, 1, 2].reduce((n, i) => n * 10 + (ram[at + i] === 0x3a ? 0 : ram[at + i] - 0x30), 0);
