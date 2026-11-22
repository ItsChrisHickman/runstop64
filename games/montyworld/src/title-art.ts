import { QUARTER_CHARS } from '../../montyotr/src/scroller';
import { ROW } from '../../shared/monty/screen';

/**
 * The picture of Do Svidaniya Monty's title, made of one 256-character set and a colour for each cell, as the C64 draws it: the
 * game's own lettering ($40-$7F, copied from its bank), the scroller's sixteen quarter patterns ($F0-$FF), and the rest of the
 * set (63 + 112 characters) the logo and the world map are cut into, each distinct 8 x 8 picture once. The text rows are the
 * game's letters; the logo is a block font cut into cells, banded one colour to a row of cells; the map is Europe to South America
 * at four pixels to a map cell (two by two to a character), the land in its own characters over the blue of the screen, the
 * route's dots among them. Monty himself, and the scroller, are not in it (title.ts): he is two sprites, the scroller its own rows.
 */

// ---- the C64's colours (the ones used) -------------------------------------------------------------------------------------------
export const BLACK = 0, WHITE = 1, RED = 2, CYAN = 3, GREEN = 5, BLUE = 6, YELLOW = 7, ORANGE = 8, BROWN = 9, LGREY = 15, MGREY = 12, LGREEN = 13;

/** The screen's colour: the sea, and everything is drawn on it. */
export const SKY = BLUE;

// ---- where things are (character rows) ------------------------------------------------------------------------------------------
/** The line over the logo; the logo's two words; the map; the scroller; ENTER CONTINUE's line; the credits. */
export const ROWS = { line: 0, small: 1, big: 4, map: 8, scroller: 14, strip: 19, credits: 21 } as const;
/** The scroller's rows (four, its letters 32 pixels tall). */
export const SCROLLER_ROWS = 4;
/** The map's rows and top in pixels. */
const MAP_ROWS = 6, MAP_Y = ROWS.map * 8;

// ---- the set -----------------------------------------------------------------------------------------------------------------------
/** The characters with their pictures: allocating one that is there already gives its code. */
class CharSet {
  readonly bytes = new Uint8Array(2048);
  private readonly free: number[] = [];
  private readonly seen = new Map<string, number>();
  constructor() {
    for (let c = 1; c < 0x40; c++) this.free.push(c);
    for (let c = 0x80; c < 0xf0; c++) this.free.push(c);
  }
  /** The code of the character with these 8 bytes (blank is 0). */
  code(glyph: ArrayLike<number>): number {
    const key = Array.from({ length: 8 }, (_, i) => glyph[i] ?? 0).join(',');
    if (key === '0,0,0,0,0,0,0,0') return 0;
    const had = this.seen.get(key);
    if (had !== undefined) return had;
    const next = this.free.shift();
    if (next === undefined) throw new Error('the title needs more than the 175 characters the set has room for');
    for (let i = 0; i < 8; i++) this.bytes[next * 8 + i] = glyph[i] ?? 0;
    this.seen.set(key, next);
    return next;
  }
  get used() { return this.seen.size; }
}

/** A picture of pixels (one colour: lit or not), cut into character cells. */
class Mask {
  readonly px: Uint8Array;
  constructor(readonly w: number, readonly h: number) { this.px = new Uint8Array(w * h); }
  set(x: number, y: number, on = 1) { if (x >= 0 && y >= 0 && x < this.w && y < this.h) this.px[y * this.w + x] = on; }
  get(x: number, y: number) { return x >= 0 && y >= 0 && x < this.w && y < this.h ? this.px[y * this.w + x] === 1 : false; }
  rect(x: number, y: number, w: number, h: number) { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) this.set(x + i, y + j); }
  /** The 8 bytes of the cell at character column `cx`, row `cy`. */
  cell(cx: number, cy: number): number[] {
    return Array.from({ length: 8 }, (_, r) => {
      let b = 0;
      for (let k = 0; k < 8; k++) if (this.get(cx * 8 + k, cy * 8 + r)) b |= 0x80 >> k;
      return b;
    });
  }
}

// ---- the logo: a chunky 5 x 7 block font ------------------------------------------------------------------------------------------
const FONT: Readonly<Record<string, readonly string[]>> = {
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  I: ['01110', '00100', '00100', '00100', '00100', '00100', '01110'],
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  N: ['10001', '11001', '10101', '10011', '10001', '10001', '10001'],
  Y: ['10001', '10001', '01010', '00100', '00100', '00100', '00100'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
};

/** A word's build: a font pixel `cw` x `ch` pixels, strokes made fatter by `fx`, `fy`, the letters `pitch` apart (a whole number of characters, so each letter is the same cells wherever it is). */
interface LogoSize { readonly cw: number; readonly ch: number; readonly fx: number; readonly fy: number; readonly pitch: number }
const SMALL: LogoSize = { cw: 4, ch: 3, fx: 2, fy: 2, pitch: 24 };
const BIG: LogoSize = { cw: 8, ch: 4, fx: 4, fy: 3, pitch: 48 };

function logoWord(m: Mask, word: string, x: number, y: number, z: LogoSize) {
  const cell = (lx: number, ly: number) => {
    const letter = FONT[word[Math.floor(lx / z.pitch)] ?? ''];
    const px = lx % z.pitch;
    if (letter === undefined || lx < 0 || px >= 5 * z.cw || ly < 0 || ly >= 7 * z.ch) return false;
    return letter[Math.floor(ly / z.ch)]?.[Math.floor(px / z.cw)] === '1';
  };
  const w = word.length * z.pitch, h = 7 * z.ch + z.fy;
  for (let ly = 0; ly < h; ly++) for (let lx = 0; lx < w; lx++) {
    if (cell(lx, ly) || cell(lx - z.fx, ly) || cell(lx, ly - z.fy) || cell(lx - z.fx, ly - z.fy)) m.set(x + lx, y + ly);
  }
}

/** The colour of each row of the logo's cells (raster bands: fire). */
const SMALL_COLOURS = [YELLOW, YELLOW, ORANGE] as const;
const BIG_COLOURS = [YELLOW, ORANGE, ORANGE, RED] as const;

// ---- the map -------------------------------------------------------------------------------------------------------------------------
/** Map cells: 80 x 12 of 4 x 4 pixels. Land by runs [row, from, to]; highlands (mountains, plateaus) marked after. */
const LAND: readonly (readonly [number, number, number])[] = [
  [0, 6, 9], [0, 14, 46], [0, 50, 64],
  [1, 3, 12], [1, 14, 46], [1, 48, 66],
  [2, 3, 9], [2, 10, 44], [2, 49, 66],
  [3, 2, 8], [3, 9, 14], [3, 15, 38], [3, 41, 42], [3, 52, 68],
  [4, 3, 8], [4, 10, 14], [4, 16, 35], [4, 38, 40], [4, 54, 70],
  [5, 0, 15], [5, 22, 25], [5, 28, 34], [5, 38, 39], [5, 58, 72],
  [6, 0, 7], [6, 12, 14], [6, 23, 25], [6, 30, 33], [6, 64, 74],
  [7, 0, 6], [7, 34, 37], [7, 65, 76],
  [8, 38, 43], [8, 66, 79],
  [9, 1, 12], [9, 32, 42], [9, 67, 79],
  [10, 1, 11], [10, 32, 41], [10, 68, 78],
  [11, 3, 9], [11, 69, 74],
];
const HIGHLANDS: readonly (readonly [number, number, number])[] = [[4, 21, 27], [3, 53, 58], [4, 54, 56], [7, 66, 67], [8, 67, 68], [9, 68, 69], [10, 69, 70], [5, 61, 63], [2, 54, 55]];
/** Montos, the island Monty leaves: one map cell in the Aegean. */
const MONTOS_CELL = { row: 7, col: 9 } as const;

/** What a map cell is. */
type Ground = 'sea' | 'land' | 'high';

function groundAt(row: number, col: number): Ground {
  if (row === MONTOS_CELL.row && col === MONTOS_CELL.col) return 'land';
  if (HIGHLANDS.some(([r, a, b]) => r === row && col >= a && col <= b)) return 'high';
  return LAND.some(([r, a, b]) => r === row && col >= a && col <= b) ? 'land' : 'sea';
}

/** A place on the route: its name, where its mark is (pixels from the map's top left) and where its name goes (character column and row, from the map's top). */
export interface Stop { readonly name: string; readonly x: number; readonly y: number; readonly label: { readonly col: number; readonly row: number } }

/** The route from Montos to Rio: where it goes (pixels from the map's top left); the stops are on it. */
export const STOPS: readonly Stop[] = [
  { name: 'MONTOS', x: 38, y: 30, label: { col: 6, row: 5 } },
  { name: 'MOSCOW', x: 46, y: 10, label: { col: 0, row: 0 } },
  { name: 'SIBERIA', x: 96, y: 8, label: { col: 10, row: 0 } },
  { name: 'CHINA', x: 124, y: 18, label: { col: 11, row: 4 } },
  { name: 'JAPAN', x: 150, y: 20, label: { col: 19, row: 3 } },
  { name: 'HAWAII', x: 206, y: 28, label: { col: 23, row: 4 } },
  { name: 'ANDES', x: 276, y: 38, label: { col: 27, row: 5 } },
  { name: 'RIO', x: 310, y: 42, label: { col: 31, row: 4 } },
];
/** Between the stops: the sea crossings bend. */
const WAYPOINTS: readonly (readonly [number, number])[] = [[38, 30], [46, 10], [96, 8], [124, 18], [150, 20], [178, 24], [206, 28], [276, 38], [310, 42]];

/** A point of the route, `t` from 0 (Montos) to 1 (Rio), in screen pixels. */
export function routeAt(t: number): { readonly x: number; readonly y: number } {
  const lens = WAYPOINTS.slice(1).map((p, i) => { const q = WAYPOINTS[i]; return q ? Math.hypot(p[0] - q[0], p[1] - q[1]) : 0; });
  const total = lens.reduce((a, b) => a + b, 0);
  let d = Math.min(Math.max(t, 0), 1) * total;
  for (let i = 0; i < lens.length; i++) {
    const l = lens[i] ?? 0, a = WAYPOINTS[i], b = WAYPOINTS[i + 1];
    if (a === undefined || b === undefined) break;
    if (d <= l || i === lens.length - 1) {
      const f = l === 0 ? 0 : Math.min(d, l) / l;
      return { x: a[0] + (b[0] - a[0]) * f, y: MAP_Y + a[1] + (b[1] - a[1]) * f };
    }
    d -= l;
  }
  return { x: 0, y: MAP_Y };
}
/** The route's length in pixels. */
export const ROUTE_LENGTH = WAYPOINTS.slice(1).reduce((sum, p, i) => { const q = WAYPOINTS[i]; return sum + (q ? Math.hypot(p[0] - q[0], p[1] - q[1]) : 0); }, 0);

// ---- text in the game's lettering ------------------------------------------------------------------------------------------------
/** The character for a letter: the game's own ($40 | letter & $3F), its apostrophe $68; the bracket (it has none) is the closing one turned round. */
function codeOf(ch: string, bracket: number): number {
  if (ch === ' ') return 0;
  if (ch === "'") return 0x68;
  if (ch === '(') return bracket;
  return (ch.charCodeAt(0) & 0x3f) | 0x40;
}

/** The credits: four lines, each in a colour of its own, centred. */
export const CREDIT_LINES: readonly { readonly text: string; readonly colour: number }[] = [
  { text: 'A NEW GAME BY CHRISTOPHER HICKMAN', colour: YELLOW },
  { text: 'WITH CLAUDE  MUSIC BY ROB HUBBARD', colour: WHITE },
  { text: "AFTER PETER HARRAP'S MONTY ON THE RUN", colour: LGREY },
  { text: '(GREMLIN GRAPHICS 1985)', colour: MGREY },
];
export const TAGLINE = 'A MONTY MOLE ADVENTURE';

/** The finished picture: the characters, and each cell's code and colour (the scroller's rows left blank). */
export interface TitleArt {
  readonly chars: Uint8Array;
  readonly screen: Uint8Array;
  readonly colour: Uint8Array;
  /** How many characters of the set the logo, the map and the odd ones take (of 175). */
  readonly used: number;
  /** The code of the mark's ring. */
  readonly ring: number;
}

/** The mark of a stop: a round dot, a character of its own. */
const RING = [0x18, 0x3c, 0x7e, 0x7e, 0x7e, 0x7e, 0x3c, 0x18];

/** Builds the title's picture from the game's bank (its lettering is in it, at $40-$7F of the characters). */
export function buildTitleArt(bank: Uint8Array): TitleArt {
  const set = new CharSet();
  const screen = new Uint8Array(1000), colour = new Uint8Array(1000);
  const put = (row: number, col: number, code: number, c: number) => { screen[row * ROW + col] = code; colour[row * ROW + col] = c; };

  // the game's lettering, and the scroller's patterns
  set.bytes.set(bank.subarray(0x40 * 8, 0x80 * 8), 0x40 * 8);
  set.bytes.set(QUARTER_CHARS, 0xf0 * 8);
  const bracket = set.code(Array.from({ length: 8 }, (_, r) => { // the closing bracket, turned round
    const b = bank[0x69 * 8 + r] ?? 0; let out = 0;
    for (let k = 0; k < 8; k++) if (b & (0x80 >> k)) out |= 1 << k;
    return out;
  }));
  const text = (row: number, col: number, s: string, c: number) => { [...s].forEach((ch, i) => put(row, col + i, codeOf(ch, bracket), c)); };
  const centred = (row: number, s: string, c: number) => text(row, Math.floor((40 - s.length) / 2), s, c);

  centred(ROWS.line, TAGLINE, CYAN);

  // the logo: DO SVIDANIYA over MONTY
  const logo = new Mask(320, 8 * (ROWS.big + 4 - ROWS.small));
  const smallWidth = 2 * SMALL.pitch + 24 + 9 * SMALL.pitch; // DO, a word space, SVIDANIYA
  const x0 = Math.floor((320 - smallWidth) / 16) * 8;
  logoWord(logo, 'DO', x0, 0, SMALL);
  logoWord(logo, 'SVIDANIYA', x0 + 2 * SMALL.pitch + 24, 0, SMALL);
  logoWord(logo, 'MONTY', Math.floor((320 - 5 * BIG.pitch) / 16) * 8 + 4, 8 * (ROWS.big - ROWS.small), BIG);
  for (let cy = 0; cy < ROWS.big + 4 - ROWS.small; cy++) {
    const row = ROWS.small + cy;
    const c = cy < ROWS.big - ROWS.small ? SMALL_COLOURS[cy] ?? YELLOW : BIG_COLOURS[cy - (ROWS.big - ROWS.small)] ?? YELLOW;
    for (let cx = 0; cx < 40; cx++) put(row, cx, set.code(logo.cell(cx, cy)), c);
  }

  // the map: two by two map cells to a character, its colour the strongest thing in it (the route, then mountains, then land)
  const dots = routeDots();
  const ring = set.code(RING);
  for (let cy = 0; cy < MAP_ROWS; cy++) for (let cx = 0; cx < 40; cx++) {
    const glyph = new Mask(8, 8);
    let ink = -1, onRoute = false;
    for (let j = 0; j < 2; j++) for (let i = 0; i < 2; i++) {
      const row = cy * 2 + j, col = cx * 2 + i, g = groundAt(row, col);
      const dotted = dots.has(row * 80 + col);
      if (g !== 'sea') { glyph.rect(i * 4, j * 4, 4, 4); ink = Math.max(ink, g === 'high' ? BROWN : GREEN); }
      if (dotted) { glyph.rect(i * 4 + 1, j * 4 + 1, 2, 2); onRoute = true; if (ink === -1) ink = YELLOW; }
    }
    if (ink === -1) continue;
    put(ROWS.map + cy, cx, set.code(glyph.cell(0, 0)), onRoute ? YELLOW : ink);
  }
  // the stops' rings and names (a name takes the characters under it)
  for (const s of STOPS) {
    put(ROWS.map + (s.y >> 3), s.x >> 3, ring, WHITE);
    text(ROWS.map + s.label.row, s.label.col, s.name, WHITE);
  }

  // the credits
  CREDIT_LINES.forEach((l, i) => centred(ROWS.credits + i, l.text, l.colour));
  return { chars: set.bytes, screen, colour, used: set.used, ring };
}

/** The map cells the route's dots are in (a dot in the middle of each, every cell along the way): `row * 80 + col`. */
function routeDots(): ReadonlySet<number> {
  const cells = new Set<number>();
  for (let d = 0; d <= ROUTE_LENGTH; d += 2) {
    const p = routeAt(d / ROUTE_LENGTH);
    cells.add(Math.floor((p.y - MAP_Y) / 4) * 80 + Math.floor(p.x / 4));
  }
  return cells;
}
