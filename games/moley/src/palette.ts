/**
 * The Spectrum's 16 colours and their mapping onto the C64's 16 (the ENHANCED look). A Spectrum colour index is
 * `bright * 8 + colour` (0 black, 1 blue, 2 red, 3 magenta, 4 green, 5 cyan, 6 yellow, 7 white); bright black is black, so
 * there are 15 different colours. `SPECTRUM_TO_C64` gives each one a C64 colour index (the VIC-II codes of c64kit's
 * `C64_PALETTE`) made by `deriveMapping`: distinct C64 colours (so normal and bright of a hue stay two colours), as near as can
 * be in CIELAB to the colours they stand for (the more cells use a colour, the nearer), under the one limit that matters for a picture: every ink and paper that a cell of
 * the game uses together keeps its lightness difference. test/palette.ts runs the search over the game's attribute tables and
 * checks that this table is its answer and that no pair merges.
 */
import { C64_PALETTE } from 'c64kit';

/** The Spectrum's colours as 0xRRGGBB (the values the ULA is usually drawn with: 0xD7 normal, 0xFF bright). */
export const SPECTRUM_PALETTE: readonly number[] = [
  0x000000, 0x0000d7, 0xd70000, 0xd700d7, 0x00d700, 0x00d7d7, 0xd7d700, 0xd7d7d7,
  0x000000, 0x0000ff, 0xff0000, 0xff00ff, 0x00ff00, 0x00ffff, 0xffff00, 0xffffff,
];

/** Spectrum colour index (0-15) to C64 colour index (0-15). */
export const SPECTRUM_TO_C64: readonly number[] = [
  0, 4, 2, 11, 13, 12, 10, 15,
  0, 6, 8, 14, 5, 3, 7, 1,
];

export type Lab = readonly [number, number, number];

/** A 0xRRGGBB colour in CIELAB (D65, sRGB). */
export function lab(rgb: number): Lab {
  const lin = (v: number) => { const c = v / 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
  const r = lin((rgb >> 16) & 255), g = lin((rgb >> 8) & 255), b = lin(rgb & 255);
  const f = (t: number) => (t > 216 / 24389 ? Math.cbrt(t) : (24389 / 27 * t + 16) / 116);
  const x = f((0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047);
  const y = f(0.2126729 * r + 0.7151522 * g + 0.072175 * b);
  const z = f((0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883);
  return [116 * y - 16, 500 * (x - y), 200 * (y - z)];
}

/**
 * CIEDE2000 (Sharma, Wu and Dalal's formulation): the CIELAB colour difference that follows what the eye sees better than the
 * plain distance in CIELAB, which over-counts chroma.
 */
export function deltaE(a: number, b: number): number {
  const [l1, a1, b1] = lab(a), [l2, a2, b2] = lab(b);
  const rad = Math.PI / 180;
  const c1 = Math.hypot(a1, b1), c2 = Math.hypot(a2, b2), cm = (c1 + c2) / 2;
  const g = 0.5 * (1 - Math.sqrt(cm ** 7 / (cm ** 7 + 25 ** 7)));
  const ap1 = (1 + g) * a1, ap2 = (1 + g) * a2;
  const cp1 = Math.hypot(ap1, b1), cp2 = Math.hypot(ap2, b2);
  const hue = (y: number, x: number) => (x === 0 && y === 0 ? 0 : ((Math.atan2(y, x) / rad) + 360) % 360);
  const hp1 = hue(b1, ap1), hp2 = hue(b2, ap2);
  const dl = l2 - l1, dc = cp2 - cp1;
  let dh = 0;
  if (cp1 * cp2 !== 0) {
    dh = hp2 - hp1;
    if (dh > 180) dh -= 360;
    else if (dh < -180) dh += 360;
  }
  const dH = 2 * Math.sqrt(cp1 * cp2) * Math.sin(dh * rad / 2);
  const lm = (l1 + l2) / 2, cpm = (cp1 + cp2) / 2;
  let hm = hp1 + hp2;
  if (cp1 * cp2 !== 0) hm = Math.abs(hp1 - hp2) > 180 ? (hp1 + hp2 + (hp1 + hp2 < 360 ? 360 : -360)) / 2 : (hp1 + hp2) / 2;
  const t = 1 - 0.17 * Math.cos((hm - 30) * rad) + 0.24 * Math.cos(2 * hm * rad) + 0.32 * Math.cos((3 * hm + 6) * rad) - 0.2 * Math.cos((4 * hm - 63) * rad);
  const sl = 1 + 0.015 * (lm - 50) ** 2 / Math.sqrt(20 + (lm - 50) ** 2);
  const sc = 1 + 0.045 * cpm, sh = 1 + 0.015 * cpm * t;
  const rt = -2 * Math.sqrt(cpm ** 7 / (cpm ** 7 + 25 ** 7)) * Math.sin(60 * Math.exp(-(((hm - 275) / 25) ** 2)) * rad);
  return Math.sqrt((dl / sl) ** 2 + (dc / sc) ** 2 + (dH / sh) ** 2 + rt * (dc / sc) * (dH / sh));
}

/** The CIELAB lightness difference between two 0xRRGGBB colours. */
export function lightnessGap(a: number, b: number): number {
  return Math.abs(lab(a)[0] - lab(b)[0]);
}

/** Spectrum colours (indexes 0-15) that a cell puts side by side as ink and paper. */
export type ColourPair = readonly [number, number];

/**
 * The mapping of the Spectrum's 15 different colours (bright black is black) onto distinct C64 colours that costs least in
 * CIELAB distance from the colours they stand for, among those that keep every pair in `pairs` at least `minGap` apart in
 * lightness (CIELAB L). A colour's distance counts once for each of the `cells` that use it (index 0-15), so the colours a game
 * draws most get the nearest C64 colours and one it never uses takes what is left. The nearest-colour choice on its own would be an assignment problem; the pairs make it a search, run
 * here as branch and bound (colours with
 * the most pairs first, nearest C64 colours first, the cheapest still possible for the rest as the bound). Returns null when
 * nothing satisfies the limits.
 */
export function deriveMapping(pairs: readonly ColourPair[], minGap: number, cells: readonly number[]): number[] | null {
  const c64 = C64_PALETTE.map(lab);
  const degree = new Array<number>(16).fill(0);
  for (const [a, b] of pairs) { degree[a]++; degree[b]++; }
  const colours = [0, 1, 2, 3, 4, 5, 6, 7, 9, 10, 11, 12, 13, 14, 15].sort((a, b) => degree[b] - degree[a] || a - b);
  const cost = (s: number, c: number) => (1 + cells[s]) * deltaE(SPECTRUM_PALETTE[s], C64_PALETTE[c]);
  const nearest = colours.map((s) => [...Array(16).keys()].sort((a, b) => cost(s, a) - cost(s, b)));
  const floor = colours.map((s, i) => cost(s, nearest[i][0]));
  const rest = new Array<number>(colours.length + 1).fill(0); // the least the colours from i on can cost
  for (let i = colours.length - 1; i >= 0; i--) rest[i] = rest[i + 1] + floor[i];
  const lightness = (c: number) => c64[c][0];
  const map = new Array<number>(16).fill(-1);
  const taken = new Array<boolean>(16).fill(false);
  /** Whether giving Spectrum colour `s` the C64 colour `c` leaves a pair with a placed colour too close in lightness. */
  const breaks = (s: number, c: number): boolean => {
    for (const [a, b] of pairs) {
      const other = a === s ? b : b === s ? a : -1;
      if (other >= 0 && map[other] >= 0 && Math.abs(lightness(c) - lightness(map[other])) < minGap) return true;
    }
    return false;
  };
  let best: number[] | null = null, bestCost = Infinity;
  const place = (i: number, total: number): void => {
    if (total + rest[i] >= bestCost) return;
    if (i === colours.length) {
      best = [...map]; bestCost = total;
      return;
    }
    const s = colours[i];
    for (const c of nearest[i]) {
      if (taken[c] || breaks(s, c)) continue;
      map[s] = c; taken[c] = true;
      if (s === 0) map[8] = c;
      place(i + 1, total + cost(s, c));
      map[s] = -1; taken[c] = false;
      if (s === 0) map[8] = -1;
    }
  };
  place(0, 0);
  return best;
}
