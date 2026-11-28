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
export const MAP_ROWS = 7, SCROLLER_ROWS = 2;
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
 * Map cells: 80 x 14 of 4 x 4 pixels, the world east from the Aegean (20 E) round to Brazil's Atlantic coast (30 W) the way Monty goes, from the Arctic
 * coast (72 N) down past Rio to the River Plate (43 S): the real places, so each stop's mark and name are where the place is (Chris, 2026-11-27: "Hawaii is labelled nowhere
 * near Hawaii... Rio is also in the wrong spot - should be bottom right"). East to west is three pieces of one scale each (`colOf`): Europe and Asia to
 * Japan's east coast, the Pacific narrower (nothing stops on it but Hawaii), the Americas; north to south one scale (`yOf`). Land by runs [row, west,
 * east] in degrees east (0-360: the Americas past 180), turned into cells as the map is built; the mountains the same way.
 */
const LON_BREAKS: readonly (readonly [lon: number, col: number])[] = [[20, 0], [150, 40], [240, 50], [335, 80]];
/** The top row's latitude, and degrees a pixel down (Moscow, 55.7 N, eight pixels down: the walkers clear of the logo; Rio, 22.9 S, its mark clear of the foot row, its name under it). */
const NORTH = 72.3, DEG_PER_PIXEL = 2.12;
/** The map column (of 80, fractional) of a longitude (degrees east, 0-360). */
function colOf(lon: number): number {
  for (let i = 1; i < LON_BREAKS.length; i++) {
    const a = LON_BREAKS[i - 1], b = LON_BREAKS[i];
    if (a === undefined || b === undefined) break;
    if (lon <= b[0] || i === LON_BREAKS.length - 1) return a[1] + (lon - a[0]) * (b[1] - a[1]) / (b[0] - a[0]);
  }
  return 0;
}
/** The pixel row on the map (of 56) of a latitude (degrees north). */
const yOf = (lat: number) => (NORTH - lat) / DEG_PER_PIXEL;
/** A place's mark, in pixels from the map's top left. */
const placeAt = (lon: number, lat: number) => ({ x: Math.round(colOf(lon) * 4), y: Math.round(yOf(lat)) });

/** The land, a row of cells (8.3 degrees of latitude) at a time: [row, west, east], degrees east. */
const LAND_DEG: readonly (readonly [number, number, number])[] = [
  [0, 20, 180], [0, 192, 275], [0, 280, 300], [0, 305, 330], // the Arctic coast, Lapland to Chukotka; Alaska and Canada; Baffin Island; Greenland
  [1, 20, 140], [1, 155, 163], [1, 198, 265], [1, 282, 302], // Russia to the Sea of Okhotsk; Kamchatka; Alaska and Canada to Hudson Bay; Labrador
  [2, 20, 141], [2, 142, 144], [2, 236, 304], // Europe, the steppe, Mongolia, Manchuria; Sakhalin; British Columbia to Newfoundland
  [3, 20, 28], [3, 41, 47], [3, 54, 135], [3, 140, 145], [3, 236, 298], // the Balkans; the Caucasus between the Black Sea and the Caspian; Central Asia, China; Hokkaido; the States
  [4, 20, 23], [4, 26.5, 121], [4, 126, 129.5], [4, 130.5, 141], [4, 239, 284], // Greece, the Aegean, Turkey to China; Korea; Japan; California to the Carolinas
  [5, 20, 34], [5, 35, 50], [5, 56, 120], [5, 245, 263], [5, 278, 280], // Egypt; Arabia; Iran, India, China; Mexico and Texas; Florida
  [6, 20, 38], [6, 42, 58], [6, 72, 87], [6, 93, 108], [6, 120, 122], [6, 199, 205], [6, 255, 263], [6, 270, 273], [6, 275, 286], [6, 288, 292], // the Sahel; Yemen, Oman; India; Indochina; Luzon; Hawaii; Mexico, Yucatan, Cuba, Hispaniola
  [7, 20, 51], [7, 74, 82], [7, 97, 109], [7, 120, 126], [7, 270, 298], // Africa to the Horn; South India, Ceylon; Indochina; the Philippines; Central America, Colombia, Venezuela
  [8, 20, 45], [8, 95, 106], [8, 109, 125], [8, 127, 129], [8, 131, 138], [8, 280, 310], // Africa; Sumatra; Borneo, Sulawesi; Halmahera; New Guinea; Ecuador to the Amazon's mouth
  [9, 20, 40], [9, 105, 125], [9, 132, 151], [9, 279, 325], // Africa; Java and the Sundas; New Guinea; Peru to Brazil's corner
  [10, 20, 41], [10, 43, 50], [10, 122, 136], [10, 141, 146], [10, 284, 321], // Africa; Madagascar; northern Australia; Cape York; Peru, Bolivia, Brazil
  [11, 20, 35], [11, 43, 48], [11, 113, 153], [11, 289.5, 319], // Africa; Madagascar; Australia; Chile to Rio's coast
  [12, 20, 31], [12, 115, 153], [12, 288, 311], // South Africa; Australia, Perth to Sydney; Chile, Argentina, Uruguay
  [13, 141, 150], [13, 172, 179], [13, 286, 303], // Victoria and Tasmania; New Zealand; Patagonia's north, Buenos Aires
];
/** The mountains, the same way: the Urals, the Rockies, the Himalaya and Tibet, the Andes. */
const HIGH_DEG: readonly (readonly [number, number, number])[] = [
  [1, 57, 62], [2, 242, 252], [3, 245, 252], [4, 78, 100], [5, 80, 98], [8, 281, 284], [9, 281, 288], [10, 288, 293], [11, 291, 294], [12, 289, 293], [13, 288, 291],
];
/** Degree runs as cell runs: every cell a run reaches into. */
const inCells = (runs: readonly (readonly [number, number, number])[]) => runs.map(([r, a, b]) => [r, Math.floor(colOf(a)), Math.min(79, Math.floor(colOf(b)))] as const);
const LAND = inCells(LAND_DEG);
const HIGHLANDS = inCells(HIGH_DEG);
/** Montos, the small island in the Aegean (25 E, 37 N): a cell of land in the sea between Greece and Turkey. */
const MONTOS_AT = placeAt(25, 37);
const AEGEAN = { row: Math.floor(MONTOS_AT.y / 4), col: Math.floor(MONTOS_AT.x / 4) } as const;

/** What a map cell is. */
type Ground = 'sea' | 'land' | 'high';

function groundAt(row: number, col: number): Ground {
  if (row === AEGEAN.row && col === AEGEAN.col) return 'land';
  if (HIGHLANDS.some(([r, a, b]) => r === row && col >= a && col <= b && LAND.some(([lr, la, lb]) => lr === row && col >= la && col <= lb))) return 'high';
  return LAND.some(([r, a, b]) => r === row && col >= a && col <= b) ? 'land' : 'sea';
}

/**
 * A place on the route: its name and where its mark is (pixels from the map's top left). Montos is the small island in the Aegean. `label`: where its name goes, given (its first cell's column and
 * row on the map), where `placeLabels` would not find the place for it.
 */
export interface Stop { readonly name: string; readonly x: number; readonly y: number; readonly label?: { readonly col: number; readonly row: number } }

/**
 * The stops in the order Monty comes to them (the regions'), each where the place is: Siberia at Novosibirsk on the Trans-Siberian, China at Beijing, Japan at Tokyo, Hawaii at
 * Oahu, the Andes at Cusco, the Amazon at Manaus.
 */
export const STOPS: readonly Stop[] = [
  { name: 'MONTOS', x: AEGEAN.col * 4 + 2, y: AEGEAN.row * 4 + 2 },
  { name: 'MOSCOW', ...placeAt(37.6, 55.7) },
  { name: 'SIBERIA', ...placeAt(82.9, 55) },
  { name: 'CHINA', ...placeAt(116.4, 39.9) },
  { name: 'JAPAN', ...placeAt(139.7, 35.7) },
  { name: 'HAWAII', ...placeAt(202.2, 21.3) },
  // (the south-east corner: the route comes down past the three, and the walkers, 18 pixels tall, take every row above it; so the names go under it, in the order the places
  // are, west to east: the Andes on the Pacific side of their mark, the Amazon and Rio in the foot row under theirs)
  { name: 'ANDES', ...placeAt(288, -13.5), label: { col: 25, row: 5 } },
  { name: 'AMAZON', ...placeAt(300, -3.1), label: { col: 29, row: 6 } },
  { name: 'RIO', ...placeAt(316.8, -22.9), label: { col: 37, row: 6 } },
];
/** A stop's mark, by name. */
export function stopNamed(name: string): Stop {
  const s = STOPS.find((x) => x.name === name);
  if (!s) throw new Error(`no stop ${name} on the title's map`);
  return s;
}
/** The route: through the stops in turn (it only ever goes east). */
const WAYPOINTS: readonly (readonly [number, number])[] = STOPS.map((s) => [s.x, s.y] as const);

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
 * by looking at the picture the route and the marks make. Clear of where the walkers pass (`walked`) where it can be; where it cannot (the south-east corner, where the route comes down past the
 * Andes and the Amazon to Rio), over as little of it as there is: the walkers go behind a name (title.ts `behindNames`).
 */
export function placeLabels(route: ReadonlySet<number>, walked: ReadonlySet<number> = new Set()): readonly Label[] {
  const taken = new Set<number>(route);
  const labels: Label[] = [];
  const keep = (name: string, col: number, row: number) => {
    for (let i = -1; i <= name.length; i++) if (col + i >= 0 && col + i < 40) taken.add(row * 40 + col + i);
    labels.push({ name, col, row });
  };
  // (the names given first, each checked: on the map, clear of the route, the marks and where the walkers pass)
  for (const s of STOPS) {
    if (!s.label) continue;
    const { col, row } = s.label;
    const cells = Array.from({ length: s.name.length }, (_, i) => row * 40 + col + i);
    if (row < 0 || row >= MAP_ROWS || col < 0 || col + s.name.length > 40 || cells.some((c) => taken.has(c) || walked.has(c))) throw new Error(`${s.name}'s name is not clear at column ${col}, row ${row}`);
    keep(s.name, col, row);
  }
  for (const s of STOPS) {
    if (s.label) continue;
    const m = markCell(s), len = s.name.length;
    let best: { col: number; row: number; score: number } | null = null;
    for (const [away, row] of [[0, m.row - 1], [0, m.row + 1], [1, m.row - 2], [1, m.row + 2], [2, m.row - 3], [2, m.row + 3], [3, m.row]] as const) {
      if (row < 0 || row >= MAP_ROWS) continue;
      for (let col = m.col - len - 3; col <= m.col + 4; col++) {
        if (col < 0 || col + len > 40) continue;
        const cells = Array.from({ length: len + 2 }, (_, i) => col - 1 + i).filter((c) => c >= 0 && c < 40).map((c) => row * 40 + c);
        if (cells.some((c) => taken.has(c))) continue;
        let land = 0;
        for (let i = 0; i < len; i++) for (const [j, k] of [[0, 0], [0, 1], [1, 0], [1, 1]] as const) if (groundAt(row * 2 + j, (col + i) * 2 + k) !== 'sea') land++;
        const behind = cells.filter((c) => walked.has(c)).length;
        const score = land + Math.abs(col + (len - 1) / 2 - m.col) * 4 + away * 1000 + behind * 5000;
        if (best === null || score < best.score) best = { col, row, score };
      }
    }
    if (best === null) throw new Error(`no place on the map for ${s.name}`);
    keep(s.name, best.col, best.row);
  }
  // (in the stops' order)
  return STOPS.flatMap((s) => labels.filter((l) => l.name === s.name));
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
  for (let r = 0; r < MAP_ROWS * 2; r++) for (let c = 0; c < 80; c++) {
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
  // and the cells Monty and Viktor pass through (13 pixels wide, 18 tall, standing on the route): no name is where they walk, where it can be helped
  const walked = new Set<number>();
  for (let d = 0; d <= ROUTE_LENGTH; d++) {
    const at = routeAt(d / ROUTE_LENGTH), y = Math.round(at.y) - MAP_Y;
    for (let cy = Math.max(0, Math.floor((y - 18) / 8)); cy <= Math.min(MAP_ROWS - 1, Math.floor(y / 8)); cy++) {
      for (let cx = Math.max(0, Math.floor((at.x - 8) / 8)); cx <= Math.min(39, Math.floor((at.x + 8) / 8)); cx++) walked.add(cy * 40 + cx);
    }
  }
  const labels = placeLabels(route, walked);
  for (let cy = 0; cy < MAP_ROWS; cy++) for (let cx = 0; cx < 40; cx++) {
    if (p.used(cx, ROWS.map + cy)) put(ROWS.map + cy, cx, set.code(p.cell(cx, ROWS.map + cy)), multi(GREEN));
  }
  for (const l of labels) { for (let i = 0; i < l.name.length; i++) put(ROWS.map + l.row, l.col + i, 0, 0); text(ROWS.map + l.row, l.col, l.name, WHITE); }

  CREDIT_LINES.forEach((l, i) => centred(ROWS.credits + i, l.text, l.colour));
  const scrollerCodes = Array.from({ length: SCROLLER_CHARS }, (_, i) => 1 + i);
  for (let i = 0; i < SCROLLER_CHARS; i++) screen[ROWS.scroller * ROW + i] = 1 + i;
  return { chars: set.bytes, screen, colour, used: set.used, scrollerCodes, labels, pairs: p.px, sea: { top: MAP_Y, height: MAP_ROWS * 8 } };
}
