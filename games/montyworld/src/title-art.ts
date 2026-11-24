import { ROW } from '../../shared/monty/screen';

/**
 * The picture of Do Svidaniya Monty's title, made of one 256-character set and a colour for each cell, as the C64 draws it in
 * multicolour character mode: each pixel pair is background (black, 00; the map's strip has a blue one for the sea), `MC1` (white, 01), `MC2` (brown, 10) or the cell's own colour
 * (11, one of 0-7), so a cell can carry a body, a light edge and a dark edge at once. The logo is a block font with a light top left
 * edge, a dark lower right edge and a drop shadow, banded one colour to a row of cells; the map is Europe to South America in the
 * same four colours, the route in white; the text is the game's own lettering in hires cells. The set holds each distinct 8 x 8
 * picture once (a test counts them); the scroller's 80 characters are reserved and drawn by title-scroll.ts. Monty himself is two
 * sprites (title.ts).
 */

// ---- the C64's colours (the ones used) -------------------------------------------------------------------------------------------
export const BLACK = 0, WHITE = 1, RED = 2, CYAN = 3, PURPLE = 4, GREEN = 5, BLUE = 6, YELLOW = 7, BROWN = 9;

/** The screen's colour: black all over; blue only behind the map's strip (`SEA`, the background colour changed down its lines as a raster split does). */
export const SKY = BLACK;
export const SEA = BLUE;
/** The two colours every multicolour cell shares: a light edge, a dark edge. */
export const MC1 = WHITE, MC2 = BROWN;

/** A cell in multicolour has its colour 8 more than its own (0-7). */
export const multi = (colour: number) => colour | 8;

// ---- where things are (character rows) ------------------------------------------------------------------------------------------
/** The logo's two words (it starts at the top); the map; the scroller (two rows, its letters 16 pixels tall); ENTER CONTINUE's line; the credits. */
export const ROWS = { small: 0, big: 3, map: 8, scroller: 15, strip: 18, credits: 20 } as const;
export const MAP_ROWS = 6, SCROLLER_ROWS = 2;
const MAP_Y = ROWS.map * 8;
/** The scroller's characters, reserved: two rows of forty. */
export const SCROLLER_CHARS = SCROLLER_ROWS * 40;

// ---- the set -----------------------------------------------------------------------------------------------------------------------
/** The characters with their pictures: allocating one that is there already gives its code. Code 0 is blank; the first 80 are the scroller's. */
class CharSet {
  readonly bytes = new Uint8Array(2048);
  private next = 1 + SCROLLER_CHARS;
  private readonly seen = new Map<string, number>();
  /** The code of the character with these 8 bytes (blank is 0). */
  code(glyph: ArrayLike<number>): number {
    const key = Array.from({ length: 8 }, (_, i) => glyph[i] ?? 0).join(',');
    if (key === '0,0,0,0,0,0,0,0') return 0;
    const had = this.seen.get(key);
    if (had !== undefined) return had;
    if (this.next > 255) throw new Error('the title needs more characters than the set of 256 has');
    for (let i = 0; i < 8; i++) this.bytes[this.next * 8 + i] = glyph[i] ?? 0;
    this.seen.set(key, this.next);
    return this.next++;
  }
  /** How many characters are taken, the scroller's and the blank included. */
  get used() { return this.next; }
}

/** A picture of pixel pairs (160 x 200, each 0-3: background, MC1, MC2, the cell's colour). */
class Pairs {
  readonly px = new Uint8Array(160 * 200);
  set(x: number, y: number, v: number) { if (x >= 0 && y >= 0 && x < 160 && y < 200) this.px[y * 160 + x] = v; }
  get(x: number, y: number) { return x >= 0 && y >= 0 && x < 160 && y < 200 ? (this.px[y * 160 + x] ?? 0) : 0; }
  /** The 8 bytes of the cell at character column `cx`, row `cy`. */
  cell(cx: number, cy: number): number[] {
    return Array.from({ length: 8 }, (_, r) => {
      let b = 0;
      for (let k = 0; k < 4; k++) b |= this.get(cx * 4 + k, cy * 8 + r) << (6 - k * 2);
      return b;
    });
  }
  /** Whether the cell has anything in it. */
  used(cx: number, cy: number) { return this.cell(cx, cy).some((b) => b !== 0); }
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

/**
 * A word's build, in pixel pairs across and rows down: a font pixel `cw` x `ch`, strokes made fatter by `fx`, `fy`, letters `pitch` apart (a whole number of cells, so a letter
 * is the same characters wherever it comes), a light edge `ex` pairs / `ey` rows deep on the top and left, a dark one on the bottom and right, and a drop shadow `sx`, `sy` off.
 */
interface LogoSize { readonly cw: number; readonly ch: number; readonly fx: number; readonly fy: number; readonly pitch: number; readonly ex: number; readonly ey: number; readonly sx: number; readonly sy: number }
const SMALL: LogoSize = { cw: 2, ch: 3, fx: 1, fy: 1, pitch: 12, ex: 1, ey: 1, sx: 1, sy: 1 };
const BIG: LogoSize = { cw: 4, ch: 4, fx: 2, fy: 2, pitch: 24, ex: 1, ey: 2, sx: 2, sy: 2 };

function logoWord(p: Pairs, word: string, x: number, y: number, z: LogoSize) {
  const cell = (lx: number, ly: number) => {
    const letter = FONT[word[Math.floor(lx / z.pitch)] ?? ''];
    const px = lx % z.pitch;
    if (letter === undefined || lx < 0 || px >= 5 * z.cw || ly < 0 || ly >= 7 * z.ch) return false;
    return letter[Math.floor(ly / z.ch)]?.[Math.floor(px / z.cw)] === '1';
  };
  const m = (lx: number, ly: number) => cell(lx, ly) || cell(lx - z.fx, ly) || cell(lx, ly - z.fy) || cell(lx - z.fx, ly - z.fy);
  const w = word.length * z.pitch + z.sx, h = 7 * z.ch + z.fy + z.sy;
  for (let ly = 0; ly < h; ly++) for (let lx = 0; lx < w; lx++) {
    if (m(lx, ly)) {
      const lit = !m(lx, ly - z.ey) || !m(lx - z.ex, ly), foot = !m(lx, ly + z.ey) || !m(lx + z.ex, ly);
      p.set(x + lx, y + ly, lit ? 1 : foot ? 2 : 3);
    } else if (m(lx - z.sx, ly - z.sy)) p.set(x + lx, y + ly, 2);
  }
}

/** The colour of each row of the logo's cells (raster bands: fire). */
const SMALL_COLOURS = [YELLOW, YELLOW, RED] as const;
const BIG_COLOURS = [YELLOW, YELLOW, RED, RED] as const;

// ---- the map -------------------------------------------------------------------------------------------------------------------------
/**
 * Map cells: 80 x 12 of 4 x 4 pixels, Europe to South America the way Monty goes, drawn so the stops are spread along it (the Pacific is short, Europe is
 * squeezed to give the Aegean room): the rows are about 7 degrees of latitude from 62 north. Land by runs [row, from, to]; hills marked after.
 */
const LAND: readonly (readonly [number, number, number])[] = [
  [0, 0, 2], [0, 4, 9], [0, 10, 48], [0, 57, 72],
  [1, 0, 3], [1, 4, 9], [1, 10, 47], [1, 56, 73],
  [2, 1, 9], [2, 12, 13], [2, 16, 46], [2, 46, 47], [2, 56, 72],
  [3, 0, 2], [3, 4, 5], [3, 7, 8], [3, 12, 17], [3, 18, 40], [3, 41, 42], [3, 45, 48], [3, 56, 70],
  [4, 5, 5], [4, 20, 27], [4, 28, 31], [4, 32, 42], [4, 45, 46], [4, 58, 66],
  [5, 0, 22], [5, 20, 26], [5, 28, 31], [5, 32, 42], [5, 57, 57], [5, 62, 68],
  [6, 0, 23], [6, 23, 25], [6, 29, 30], [6, 35, 36], [6, 43, 44], [6, 56, 57], [6, 66, 69],
  [7, 1, 25], [7, 36, 36], [7, 39, 42], [7, 66, 72],
  [8, 14, 22], [8, 34, 37], [8, 39, 42], [8, 45, 50], [8, 63, 76],
  [9, 15, 22], [9, 47, 51], [9, 62, 77],
  [10, 15, 21], [10, 40, 50], [10, 62, 77],
  [11, 16, 20], [11, 40, 50], [11, 64, 75],
];
const HIGHLANDS: readonly (readonly [number, number, number])[] = [[2, 3, 5], [4, 33, 36], [2, 56, 58], [3, 56, 58], [8, 63, 65], [9, 62, 65], [10, 62, 65], [11, 64, 65]];
const AEGEAN = { row: 3, col: 10 } as const;

/** What a map cell is. */
type Ground = 'sea' | 'land' | 'high';

function groundAt(row: number, col: number): Ground {
  if (row === AEGEAN.row && col === AEGEAN.col) return 'land';
  if (HIGHLANDS.some(([r, a, b]) => r === row && col >= a && col <= b && LAND.some(([lr, la, lb]) => lr === row && col >= la && col <= lb))) return 'high';
  return LAND.some(([r, a, b]) => r === row && col >= a && col <= b) ? 'land' : 'sea';
}

/** A place on the route: its name and where its mark is (pixels from the map's top left). Montos is the small island in the Aegean. */
export interface Stop { readonly name: string; readonly x: number; readonly y: number }

export const STOPS: readonly Stop[] = [
  { name: 'MONTOS', x: AEGEAN.col * 4 + 2, y: AEGEAN.row * 4 + 2 },
  { name: 'MOSCOW', x: 76, y: 9 },
  { name: 'SIBERIA', x: 116, y: 10 },
  { name: 'CHINA', x: 152, y: 14 },
  { name: 'JAPAN', x: 190, y: 15 },
  { name: 'HAWAII', x: 228, y: 23 },
  { name: 'ANDES', x: 270, y: 41 },
  { name: 'RIO', x: 296, y: 45 },
];
/** Between the stops: the sea crossings bend. */
const WAYPOINTS: readonly (readonly [number, number])[] = [
  [42, 14], [76, 9], [116, 10], [152, 14], [190, 15], [210, 19], [228, 23], [250, 32], [270, 41], [296, 45],
];

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
/** How far along the route, in pixels, it reaches screen column `x` (it only ever goes east). */
export function distanceAtX(x: number): number {
  let d = 0;
  for (let i = 1; i < WAYPOINTS.length; i++) {
    const a = WAYPOINTS[i - 1], b = WAYPOINTS[i];
    if (a === undefined || b === undefined) break;
    const l = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (x <= b[0]) return d + l * Math.max(0, x - a[0]) / (b[0] - a[0]);
    d += l;
  }
  return d;
}
/** The route's length in pixels. */
export const ROUTE_LENGTH = WAYPOINTS.slice(1).reduce((sum, p, i) => { const q = WAYPOINTS[i]; return sum + (q ? Math.hypot(p[0] - q[0], p[1] - q[1]) : 0); }, 0);

/** The mark of a stop: a round dot, white with a brown heart, in pixel pairs (3 across, 6 down). */
const MARK: readonly (readonly number[])[] = [[0, 1, 0], [1, 1, 1], [1, 2, 1], [1, 2, 1], [1, 1, 1], [0, 1, 0]];

/** The route and the marks, drawn over the land: a line over land (every pixel along it), dots over sea (a pair of pixels in every four). White. */
function drawRoute(p: Pairs) {
  const over = (x: number, y: number) => groundAt(Math.floor(y / 4), Math.floor(x / 4)) !== 'sea';
  for (let d = 0; d <= ROUTE_LENGTH; d++) {
    const at = routeAt(d / ROUTE_LENGTH);
    const x = Math.round(at.x), y = Math.round(at.y) - MAP_Y;
    if (over(x, y) || d % 4 < 2) for (let j = 0; j < 2; j++) p.set(Math.floor(x / 2), MAP_Y + y + j - 1, 1);
  }
}

/** Where a stop's mark is, in character cells (column, row from the map's top). */
const markCell = (s: Stop) => ({ col: Math.floor(s.x / 8), row: Math.floor(s.y / 8) });

/** A stop's name on the map: its first character's column and row from the map's top (a name takes the characters under it). */
export interface Label { readonly name: string; readonly col: number; readonly row: number }

/**
 * Where each name goes: in a row above or below its mark (the nearest that is free), over its column, over as little land as there is, never over the route or another mark or name, with a space between names, and wholly on the map. Found
 * by looking at the picture the route and the marks make.
 */
export function placeLabels(route: ReadonlySet<number>): readonly Label[] {
  const taken = new Set<number>(route);
  const labels: Label[] = [];
  for (const s of STOPS) {
    const m = markCell(s), len = s.name.length;
    let best: { col: number; row: number; score: number } | null = null;
    for (const [away, row] of [[0, m.row - 1], [0, m.row + 1], [1, m.row - 2], [1, m.row + 2], [2, m.row - 3], [2, m.row + 3], [3, m.row]] as const) {
      if (row < 0 || row >= MAP_ROWS) continue;
      for (let col = m.col - len - 3; col <= m.col + 4; col++) {
        if (col < 0 || col + len > 40) continue;
        const cells = Array.from({ length: len + 2 }, (_, i) => row * 40 + col - 1 + i);
        if (cells.some((c) => taken.has(c))) continue;
        let land = 0;
        for (let i = 0; i < len; i++) for (const [j, k] of [[0, 0], [0, 1], [1, 0], [1, 1]] as const) if (groundAt(row * 2 + j, (col + i) * 2 + k) !== 'sea') land++;
        const score = land + Math.abs(col + (len - 1) / 2 - m.col) * 4 + away * 1000;
        if (best === null || score < best.score) best = { col, row, score };
      }
    }
    if (best === null) throw new Error(`no place on the map for ${s.name}`);
    for (let i = -1; i <= len; i++) taken.add(best.row * 40 + best.col + i);
    labels.push({ name: s.name, col: best.col, row: best.row });
  }
  return labels;
}

// ---- text in the game's lettering ------------------------------------------------------------------------------------------------
/** The credits: three lines, each in a colour of its own, centred. */
export const CREDIT_LINES: readonly { readonly text: string; readonly colour: number }[] = [
  { text: 'A NEW GAME BY CHRISTOPHER HICKMAN', colour: YELLOW },
  { text: 'A TRIBUTE TO PETER HARRAP', colour: WHITE },
  { text: 'MUSIC BY ROB HUBBARD', colour: CYAN },
];

/** The finished picture: the characters, and each cell's code and colour (the scroller's rows left for it). */
export interface TitleArt {
  readonly chars: Uint8Array;
  readonly screen: Uint8Array;
  readonly colour: Uint8Array;
  /** How many of the set's 256 characters are taken (the scroller's 80 and the blank included). */
  readonly used: number;
  /** The characters the scroller draws its two rows in, row by row. */
  readonly scrollerCodes: readonly number[];
  /** The map's strip: the pixel rows (from the top, `height` of them) the sea's blue is the background colour of. */
  readonly sea: { readonly top: number; readonly height: number };
  /** Where each name is on the map. */
  readonly labels: readonly Label[];
  /** The picture's pixel pairs of the logo and the map (rows 1-13), for tests. */
  readonly pairs: Uint8Array;
}

/** The game's glyph for a letter: its own lettering ($40 | letter & $3F), the apostrophe at $68; the bracket (it has none) is the closing one turned round. */
export function glyphOf(bank: Uint8Array, ch: string): number[] {
  const at = ch === "'" ? 0x68 : ch === '(' ? 0x69 : (ch.charCodeAt(0) & 0x3f) | 0x40;
  return Array.from({ length: 8 }, (_, r) => {
    const b = bank[at * 8 + r] ?? 0;
    if (ch !== '(') return b;
    let out = 0;
    for (let k = 0; k < 8; k++) if (b & (0x80 >> k)) out |= 1 << k;
    return out;
  });
}

/** Builds the title's picture from the game's bank (its lettering is in it, at $40-$7F of the characters). */
export function buildTitleArt(bank: Uint8Array): TitleArt {
  const set = new CharSet();
  const screen = new Uint8Array(1000), colour = new Uint8Array(1000);
  const put = (row: number, col: number, code: number, c: number) => { screen[row * ROW + col] = code; colour[row * ROW + col] = c; };
  const text = (row: number, col: number, s: string, c: number) => { [...s].forEach((ch, i) => { if (ch !== ' ') put(row, col + i, set.code(glyphOf(bank, ch)), c); }); };
  const centred = (row: number, s: string, c: number) => text(row, Math.floor((40 - s.length) / 2), s, c);

  // the logo and the map, one picture of pixel pairs
  const p = new Pairs();
  const smallWidth = 2 * SMALL.pitch + SMALL.pitch + 9 * SMALL.pitch; // DO, a word space, SVIDANIYA
  logoWord(p, 'DO', Math.floor((160 - smallWidth) / 8) * 4, ROWS.small * 8, SMALL);
  logoWord(p, 'SVIDANIYA', Math.floor((160 - smallWidth) / 8) * 4 + 3 * SMALL.pitch, ROWS.small * 8, SMALL);
  logoWord(p, 'MONTY', Math.floor((160 - 5 * BIG.pitch) / 8) * 4, ROWS.big * 8, BIG);
  for (let cy = ROWS.small; cy < ROWS.map; cy++) {
    const c = cy < ROWS.big ? SMALL_COLOURS[cy - ROWS.small] ?? YELLOW : BIG_COLOURS[cy - ROWS.big] ?? YELLOW;
    for (let cx = 0; cx < 40; cx++) put(cy, cx, set.code(p.cell(cx, cy)), multi(c));
  }
  for (let r = 0; r < 12; r++) for (let c = 0; c < 80; c++) {
    const g = groundAt(r, c);
    if (g === 'sea') continue;
    for (let j = 0; j < 4; j++) for (let i = 0; i < 2; i++) p.set(c * 2 + i, MAP_Y + r * 4 + j, g === 'high' && (i + j + r) % 2 === 0 ? 2 : 3);
  }
  const land = new Pairs();
  land.px.set(p.px);
  drawRoute(p);
  for (const s of STOPS) MARK.forEach((row, j) => row.forEach((v, i) => { if (v) p.set(Math.floor(s.x / 2) - 1 + i, MAP_Y + s.y - 3 + j, v); }));
  // the cells the route and the marks are in: where the picture differs from the bare land
  const route = new Set<number>();
  for (let cy = 0; cy < MAP_ROWS; cy++) for (let cx = 0; cx < 40; cx++) {
    const cell = p.cell(cx, ROWS.map + cy), was = land.cell(cx, ROWS.map + cy);
    if (cell.some((b, i) => b !== was[i])) route.add(cy * 40 + cx);
  }
  // and the cells Monty and Viktor pass through (13 pixels wide, 18 tall, standing on the route): no name is where they walk
  for (let d = 0; d <= ROUTE_LENGTH; d++) {
    const at = routeAt(d / ROUTE_LENGTH), y = Math.round(at.y) - MAP_Y;
    for (let cy = Math.max(0, Math.floor((y - 18) / 8)); cy <= Math.min(MAP_ROWS - 1, Math.floor(y / 8)); cy++) {
      for (let cx = Math.max(0, Math.floor((at.x - 8) / 8)); cx <= Math.min(39, Math.floor((at.x + 8) / 8)); cx++) route.add(cy * 40 + cx);
    }
  }
  const labels = placeLabels(route);
  for (let cy = 0; cy < MAP_ROWS; cy++) for (let cx = 0; cx < 40; cx++) {
    if (p.used(cx, ROWS.map + cy)) put(ROWS.map + cy, cx, set.code(p.cell(cx, ROWS.map + cy)), multi(GREEN));
  }
  for (const l of labels) { for (let i = 0; i < l.name.length; i++) put(ROWS.map + l.row, l.col + i, 0, 0); text(ROWS.map + l.row, l.col, l.name, WHITE); }

  CREDIT_LINES.forEach((l, i) => centred(ROWS.credits + i, l.text, l.colour));
  const scrollerCodes = Array.from({ length: SCROLLER_CHARS }, (_, i) => 1 + i);
  for (let i = 0; i < SCROLLER_CHARS; i++) screen[ROWS.scroller * ROW + i] = 1 + i;
  return { chars: set.bytes, screen, colour, used: set.used, scrollerCodes, labels, pairs: p.px, sea: { top: MAP_Y, height: MAP_ROWS * 8 } };
}
