/**
 * Mock title screens for Do Svidaniya Monty, as pictures only (nothing is wired into the game): three alternative designs, A the map
 * strip, B the suitcase with a sticker from every country, C the postcard collage, each as a 320 x 200 C64 picture at 3x, three frames
 * of Monty moving. They share one logo, one lower part (the story scroller, ENTER CONTINUE where the strip goes, the credits) and the
 * scenes of the places; the credits never imply the originals' authors made this game.
 *
 * C64 limits kept: the lettering is the game's own character set (codes $40-$7F), the logo and the map are built of characters (a
 * 5 x 7 block font and a 4 x 4 pixel map cell, so a set of well under 256 distinct characters), pixels two wide as multicolour
 * draws them, Monty and his ushanka are the game's own sprites (small Monty is ), colours from the C64 palette.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/title-mock.ts <out-dir>
 */
import fs from 'node:fs';
import path from 'node:path';
import { bankImage } from '../../montyotr/src/data';
import { FIRST } from '../src/art/costume';
import { HAT_COLOUR, ushankaWorn } from '../src/art/hat';
import { Canvas, label } from './preview-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: title-mock.ts <out-dir>');
fs.mkdirSync(out, { recursive: true });

// C64 colours
const BLK = 0, WHT = 1, RED = 2, CYN = 3, PUR = 4, GRN = 5, BLU = 6, YEL = 7, ORG = 8, BRN = 9, LRD = 10, DGY = 11, MGY = 12, LGN = 13, LBL = 14, LGY = 15;

// ---- drawing helpers (pixels two wide, as multicolour draws them) -----------------------------------------------------------

function rect(cv: Canvas, x: number, y: number, w: number, h: number, c: number) {
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) cv.set(x + i, y + j, c);
}
function disc(cv: Canvas, cx: number, cy: number, r: number, c: number) {
  for (let j = -r; j <= r; j++) for (let i = -r * 2; i <= r * 2; i += 2) if ((i / 2) ** 2 + j * j <= r * r + r / 2) rect(cv, cx + i, cy + j, 2, 1, c);
}
/** A filled triangle by scanlines. */
function tri(cv: Canvas, x0: number, y0: number, x1: number, y1: number, x2: number, y2: number, c: number) {
  const top = Math.min(y0, y1, y2), bot = Math.max(y0, y1, y2);
  const pts: readonly (readonly [number, number])[] = [[x0, y0], [x1, y1], [x2, y2]];
  for (let y = top; y <= bot; y++) {
    const xs: number[] = [];
    for (let k = 0; k < 3; k++) {
      const a = pts[k], b = pts[(k + 1) % 3];
      if (a === undefined || b === undefined || a[1] === b[1]) continue;
      if ((y >= a[1] && y <= b[1]) || (y >= b[1] && y <= a[1])) xs.push(a[0] + ((y - a[1]) * (b[0] - a[0])) / (b[1] - a[1]));
    }
    if (xs.length > 1) { const l = Math.floor(Math.min(...xs) / 2) * 2, r = Math.max(...xs); rect(cv, l, y, Math.max(2, Math.round((r - l) / 2) * 2), 1, c); }
  }
}
/** A frame of one colour around a box. */
function frame(cv: Canvas, x: number, y: number, w: number, h: number, c: number, t = 2) {
  rect(cv, x, y, w, t, c); rect(cv, x, y + h - t, w, t, c); rect(cv, x, y, t, h, c); rect(cv, x + w - t, y, t, h, c);
}

// ---- the game's own lettering (Monty on the Run's charset: screen code ($40 | char & $3F)) ------------------------------------

/** The game's character for a letter. Its apostrophe is $68 (where ( would be) and it has no (, which our title's set draws as a mirrored ). */
function glyphAt(ch: string) { return (ch === "'" ? 0x68 : ch === '(' ? 0x69 : (ch.charCodeAt(0) & 0x3f) | 0x40) * 8; }
/** Text in the game's lettering, one character cell 8 pixels (`sx`, `sy` stretch it: the scroller's 2 x 2). */
function text(cv: Canvas, s: string, x: number, y: number, c: number | readonly number[], sx = 1, sy = 1, from = 0) {
  [...s].forEach((ch, i) => {
    for (let r = 0; r < 8; r++) for (let b = 0; b < 8; b++) {
      if (((bankImage[glyphAt(ch) + r] ?? 0) & (0x80 >> (ch === '(' ? 7 - b : b))) === 0) continue;
      const ink = typeof c === 'number' ? c : c[(r + (i & 1)) % c.length] ?? WHT;
      rect(cv, x + (i * 8 + b) * sx - from, y + r * sy, sx, sy, ink);
    }
  });
}
const textWidth = (s: string, sx = 1) => s.length * 8 * sx;

// ---- the logo: a chunky 5 x 7 block font, raster bands, a lit top and left edge, a dark foot, a drop shadow ---------------------

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

interface LogoInk { readonly bands: readonly number[]; readonly lit: number; readonly foot: number; readonly shadow: number }
/** A word's build: a cell of cw x ch pixels, strokes made fatter by fx, fy, letters `gap` apart, a bevel `edge` pixels deep. */
interface LogoSize { readonly cw: number; readonly ch: number; readonly fx: number; readonly fy: number; readonly gap: number; readonly edge: number }

/** One word of the logo with its top left at x, y. Returns its width. */
function logoWord(cv: Canvas, word: string, x: number, y: number, z: LogoSize, ink: LogoInk) {
  const pitch = 5 * z.cw + z.gap;
  const cell = (lx: number, ly: number) => {
    const letter = FONT[word[Math.floor(lx / pitch)] ?? ''];
    const px = lx % pitch;
    if (letter === undefined || lx < 0 || px >= 5 * z.cw || ly < 0 || ly >= 7 * z.ch) return false;
    return letter[Math.floor(ly / z.ch)]?.[Math.floor(px / z.cw)] === '1';
  };
  // fat: each lit cell also covers the fx, fy beyond it on its right and below, so a stroke is a cell and a half
  const mask = (lx: number, ly: number) => cell(lx, ly) || cell(lx - z.fx, ly) || cell(lx, ly - z.fy) || cell(lx - z.fx, ly - z.fy);
  const w = word.length * pitch - z.gap + z.fx, h = 7 * z.ch + z.fy;
  for (let ly = 0; ly < h; ly++) for (let lx = 0; lx < w; lx += 2) if (mask(lx, ly) || mask(lx + 1, ly)) rect(cv, x + lx + 3, y + ly + 2, 2, 1, ink.shadow);
  for (let ly = 0; ly < h; ly++) for (let lx = 0; lx < w; lx += 2) {
    if (!mask(lx, ly)) continue;
    const band = ink.bands[Math.floor((ly / h) * ink.bands.length)] ?? WHT;
    const lit = !mask(lx, ly - z.edge) || !mask(lx - z.edge, ly);
    const foot = !mask(lx, ly + z.edge) || !mask(lx + z.edge, ly);
    rect(cv, x + lx, y + ly, 2, 1, lit ? ink.lit : foot ? ink.foot : band);
  }
  return w;
}

const SMALL: LogoSize = { cw: 4, ch: 3, fx: 2, fy: 2, gap: 4, edge: 2 };
const BIG: LogoSize = { cw: 8, ch: 4, fx: 4, fy: 3, gap: 7, edge: 3 };
/** The logo, DO SVIDANIYA small over MONTY large, in the house style: fat letters, banded like a raster, a bright top left edge, a dark foot, a drop shadow. */
function logo(cv: Canvas, ink: LogoInk, top = 10) {
  // the line over it: the next adventure of a series
  const line = 'A MONTY MOLE ADVENTURE';
  text(cv, line, Math.floor((320 - textWidth(line)) / 2), 0, [LGY, LBL, LBL, LGY]);
  const width = (n: number, z: LogoSize) => n * (5 * z.cw + z.gap) - z.gap + z.fx;
  const space = 14, total = width(2, SMALL) + space + width(9, SMALL);
  const x0 = Math.floor((320 - total) / 4) * 2;
  logoWord(cv, 'DO', x0, top, SMALL, ink);
  logoWord(cv, 'SVIDANIYA', x0 + width(2, SMALL) + space, top, SMALL, ink);
  logoWord(cv, 'MONTY', Math.floor((320 - width(5, BIG)) / 4) * 2, top + 7 * SMALL.ch + SMALL.fy + 5, BIG, ink);
}

const FIRE: LogoInk = { bands: [YEL, YEL, YEL, ORG, ORG, RED, RED], lit: WHT, foot: BRN, shadow: BLU };
const ICE: LogoInk = { bands: [WHT, LBL, LBL, CYN, CYN, BLU, BLU], lit: WHT, foot: PUR, shadow: DGY };
const POST: LogoInk = { bands: [LRD, LRD, RED, RED, RED, BRN, BRN], lit: YEL, foot: BLK, shadow: PUR };

// ---- Monty: the game's own sprite in his ushanka, and a small one (12 x 10) for the map ----------------------------------------

const WORN = ushankaWorn(bankImage);
function montyBlock(ptr: number) { return WORN.monty.find((m) => m.ptr === ptr)?.block ?? bankImage.subarray(ptr * 64, ptr * 64 + 63); }
function montyHat(ptr: number) { return WORN.hat.find((h) => h.ptr === ptr); }
/** The ushanka as a hat sprite, Monty white: where each pixel is and its colour. */
function montyPixels(ptr: number): { x: number; y: number; c: number }[] {
  const px: { x: number; y: number; c: number }[] = [];
  const add = (block: ArrayLike<number>, dx: number, dy: number, c: number) => {
    for (let r = 0; r < 21; r++) for (let col = 0; col < 24; col++) if (((block[r * 3 + (col >> 3)] ?? 0) & (0x80 >> (col & 7))) !== 0) px.push({ x: col + dx, y: r + dy, c });
  };
  add(montyBlock(ptr), 0, 0, WHT);
  const h = montyHat(ptr);
  if (h) add(h.block, h.dx, h.dy, HAT_COLOUR);
  return px;
}
/** Monty at x, y, `scale` 1 or 2 (an expanded sprite), `flip` for facing the other way. */
function monty(cv: Canvas, ptr: number, x: number, y: number, scale = 1, flip = false) {
  for (const p of montyPixels(ptr)) rect(cv, x + (flip ? 23 - p.x : p.x) * scale, y + p.y * scale, scale, scale, p.c);
}
// walk pictures (the right-facing half of his set) and a leap
/** Monty's walking pictures face one way: whether the mock mirrors them to head east. */
const FLIP = true;
const WALK = [FIRST + 4, FIRST + 5, FIRST + 6, FIRST + 7] as const;

// ---- places: one small scene each, drawn into a box (the stickers' and the postcards' pictures) -----------------------------

type Place = 'moscow' | 'siberia' | 'china' | 'japan' | 'pacific' | 'andes' | 'rio';
const PLACES: readonly Place[] = ['moscow', 'siberia', 'china', 'japan', 'pacific', 'andes', 'rio'];
const NAMES: Readonly<Record<Place, string>> = { moscow: 'MOSCOW', siberia: 'SIBERIA', china: 'CHINA', japan: 'JAPAN', pacific: 'HAWAII', andes: 'ANDES', rio: 'RIO' };

function scene(cv: Canvas, p: Place, x: number, y: number, w: number, h: number) {
  const gy = y + Math.floor(h * 0.72); // the ground
  const cx = x + Math.floor(w / 2 / 2) * 2;
  const sky = (c: number) => rect(cv, x, y, w, h, c);
  switch (p) {
    case 'moscow': {
      sky(BLU); rect(cv, x, gy, w, y + h - gy, WHT);
      rect(cv, cx - 12, gy - 10, 24, 10, RED); rect(cv, cx - 12, gy - 6, 24, 1, WHT);
      for (const [dx, hh, c] of [[-10, 8, GRN], [-2, 14, RED], [6, 8, YEL]] as const) {
        rect(cv, cx + dx - 2, gy - 10 - hh + 2, 6, hh, WHT);
        disc(cv, cx + dx + 1, gy - 10 - hh, 3, c); rect(cv, cx + dx, gy - 10 - hh - 5, 2, 3, YEL);
      }
      break;
    }
    case 'siberia': {
      sky(DGY); rect(cv, x, y, w, 5, MGY); rect(cv, x, gy, w, y + h - gy, WHT);
      rect(cv, cx - 14, gy - 7, 28, 7, BLK); rect(cv, cx + 4, gy - 11, 8, 5, BLK); rect(cv, cx + 6, gy - 14, 2, 3, MGY);
      for (let i = 0; i < 3; i++) rect(cv, cx - 12 + i * 8, gy - 6, 4, 3, YEL);
      for (const dx of [-18, 16]) { tri(cv, cx + dx, gy - 12, cx + dx - 4, gy - 3, cx + dx + 4, gy - 3, GRN); rect(cv, cx + dx, gy - 3, 2, 3, BRN); }
      break;
    }
    case 'china': {
      sky(LBL); tri(cv, x, gy, x + 14, gy - 12, x + 26, gy, GRN); tri(cv, x + 14, gy, x + w - 6, gy - 8, x + w, gy, LGN);
      rect(cv, x, gy, w, y + h - gy, GRN);
      for (let i = 0; i < 3; i++) { const bw = 20 - i * 4; rect(cv, cx - bw / 2, gy - 8 - i * 5, bw, 3, RED); rect(cv, cx - bw / 2 - 2, gy - 9 - i * 5, bw + 4, 1, YEL); }
      rect(cv, cx - 5, gy - 6, 10, 6, BRN);
      break;
    }
    case 'japan': {
      sky(LBL); disc(cv, x + w - 10, y + 7, 3, RED);
      tri(cv, cx, y + 4, x + 4, gy, x + w - 4, gy, BLU); tri(cv, cx, y + 4, cx - 6, y + 11, cx + 6, y + 11, WHT);
      rect(cv, x, gy, w, y + h - gy, GRN);
      break;
    }
    case 'pacific': {
      sky(CYN); disc(cv, x + 10, y + 7, 3, YEL); rect(cv, x, gy - 2, w, y + h - gy + 2, BLU); rect(cv, x, gy + 3, w, 1, LBL);
      rect(cv, cx + 6, gy - 14, 2, 14, BRN);
      for (const [dx, dy] of [[-6, -2], [-4, -5], [4, -6], [8, -3]] as const) tri(cv, cx + 7, gy - 15, cx + 7 + dx, gy - 15 + dy, cx + 7 + dx, gy - 13 + dy, GRN);
      rect(cv, x, gy + 5, w, y + h - gy - 5, YEL);
      break;
    }
    case 'andes': {
      sky(LBL); tri(cv, x + 6, gy, x + 14, y + 4, x + 24, gy, MGY); tri(cv, x + 16, gy, x + 26, y + 7, x + w, gy, LGY);
      tri(cv, x + 14, y + 4, x + 11, y + 9, x + 17, y + 9, WHT); rect(cv, x, gy, w, y + h - gy, BRN);
      rect(cv, cx + 4, gy - 6, 8, 3, WHT); rect(cv, cx + 10, gy - 9, 2, 4, WHT); rect(cv, cx + 4, gy - 3, 2, 3, WHT); rect(cv, cx + 10, gy - 3, 2, 3, WHT);
      break;
    }
    case 'rio': {
      sky(LBL); rect(cv, x, y, w, 4, CYN); rect(cv, x, gy, w, y + h - gy, BLU);
      tri(cv, x, gy, x + 16, gy - 12, x + 30, gy, GRN); tri(cv, x + 16, gy, x + w - 2, gy - 8, x + w, gy, BRN);
      rect(cv, x + 15, y + 3, 2, 10, WHT); rect(cv, x + 9, y + 5, 14, 2, WHT);
      break;
    }
  }
}

// ---- the lower part, shared: the story scroller, ENTER CONTINUE where the strip goes, the credits -------------------------------

const SCROLL_ROW = 138, ENTER_ROW = 158, CREDIT_ROW = 168;
const CREDITS: readonly { readonly text: string; readonly colour: number }[] = [
  { text: 'A NEW GAME BY CHRISTOPHER HICKMAN', colour: YEL },
  { text: 'WITH CLAUDE  MUSIC BY ROB HUBBARD', colour: LBL },
  { text: "AFTER PETER HARRAP'S MONTY ON THE RUN", colour: LGY },
  { text: '(GREMLIN GRAPHICS 1985)', colour: MGY },
];
/** The scroller shows the story as a window moving left `shift` pixels. */
function lower(cv: Canvas, shift: number, blink: boolean, enterColour = LGN) {
  const story = shift < 100 ? 'AND EUROPE IS NO LONGER SAFE. INTERMOLE CAN ONLY WORK IN EUROPE ' : 'WITH THANKS TO PETER HARRAP, ROB HUBBARD AND EVERYONE AT GREMLIN. ';
  const at = shift < 100 ? shift : shift - 108 + 0;
  text(cv, story.slice(Math.floor(at / 16)), -(at % 16), SCROLL_ROW, [CYN, LBL, LBL, WHT, LBL, CYN, BLU, BLU], 2, 2);
  if (blink) { const s = 'ENTER CONTINUE'; text(cv, s, Math.floor((320 - textWidth(s)) / 2), ENTER_ROW, enterColour); }
  CREDITS.forEach((l, i) => text(cv, l.text, Math.floor((320 - textWidth(l.text)) / 2), CREDIT_ROW + i * 8, l.colour));
}
const SHIFTS = [0, 54, 108] as const;

/** A short name in the 3 x 5 font with a black outline, so it reads over the land. */
function tag(cv: Canvas, name: string, x: number, y: number) {
  for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1], [1, 1], [-1, -1], [1, -1], [-1, 1]] as const) label(cv, name, x + dx, y + dy, BLK);
  label(cv, name, x, y, WHT);
}

// ---- A: the map strip ---------------------------------------------------------------------------------------------------------

/** The world as 80 x 12 cells of 4 x 4 pixels, Europe to South America, by runs: [row, from, to]. Highlands marked by kind 'h'. */
const LAND: readonly (readonly [number, number, number, string?])[] = [
  [0, 6, 9], [0, 14, 46], [0, 50, 64],
  [1, 3, 12], [1, 14, 46], [1, 48, 66], [1, 2, 2],
  [2, 3, 9], [2, 10, 44], [2, 49, 66], [2, 1, 2],
  [3, 2, 8], [3, 9, 14], [3, 15, 38], [3, 41, 42], [3, 52, 68],
  [4, 3, 8], [4, 10, 14], [4, 16, 35], [4, 38, 40], [4, 54, 70],
  [5, 0, 15], [5, 22, 25], [5, 28, 34], [5, 38, 39], [5, 58, 72],
  [6, 0, 14], [6, 23, 25], [6, 30, 33], [6, 64, 74],
  [7, 0, 13], [7, 34, 37], [7, 65, 76],
  [8, 1, 12], [8, 38, 43], [8, 66, 79],
  [9, 1, 11], [9, 32, 42], [9, 67, 79],
  [10, 2, 10], [10, 32, 41], [10, 68, 78],
  [11, 3, 8], [11, 69, 74],
];
const HIGHLANDS: readonly (readonly [number, number, number])[] = [[4, 21, 27], [3, 53, 58], [4, 54, 56], [7, 66, 67], [8, 67, 68], [9, 68, 69], [10, 69, 70], [5, 61, 63], [2, 54, 55]];

function worldMap(cv: Canvas, x0: number, y0: number) {
  const land = Array.from({ length: 12 }, () => new Array<string>(80).fill(''));
  for (const [r, a, b] of LAND) for (let c = a; c <= b; c++) { const row = land[r]; if (row) row[c] = 'g'; }
  for (const [r, a, b] of HIGHLANDS) for (let c = a; c <= b; c++) { const row = land[r]; if (row?.[c]) row[c] = 'h'; }
  rect(cv, x0, y0, 320, 48, BLU);
  for (let r = 0; r < 12; r++) for (let c = 0; c < 80; c++) {
    const k = land[r]?.[c] ?? '';
    const px = x0 + c * 4, py = y0 + r * 4;
    if (k === '') { if ((c * 7 + r * 3) % 11 === 0) rect(cv, px + 2, py + 1, 2, 1, LBL); continue; }
    const north = land[r - 1]?.[c] ?? '', south = land[r + 1]?.[c] ?? '';
    rect(cv, px, py, 4, 4, k === 'h' ? BRN : GRN);
    if (north === '') rect(cv, px, py, 4, 1, k === 'h' ? ORG : LGN);
    if (south === '') rect(cv, px, py + 3, 4, 1, k === 'h' ? BLK : DGY);
    if (k === 'g' && (c + r * 5) % 7 === 0) rect(cv, px + 2, py + 2, 2, 1, LGN);
    if (k === 'h' && r > 0 && (c + r) % 3 === 0) rect(cv, px + 2, py + 1, 2, 1, WHT);
  }
  // ice at the top
  rect(cv, x0, y0, 320, 2, WHT);
}
/** The route's waypoints in the picture: Moscow, Siberia, China, Japan, the Pacific, Hawaii, the Andes, Rio. */
const ROUTE: readonly (readonly [number, number])[] = [[46, 10], [96, 8], [124, 18], [150, 20], [178, 24], [206, 28], [276, 38], [310, 42]];
const MARKS: readonly { readonly at: number; readonly name: string }[] = [{ at: 0, name: 'MOSCOW' }, { at: 1, name: 'SIBERIA' }, { at: 2, name: 'CHINA' }, { at: 3, name: 'JAPAN' }, { at: 5, name: 'HAWAII' }, { at: 6, name: 'ANDES' }, { at: 7, name: 'RIO' }];

function routeAt(t: number): readonly [number, number] {
  const lens = ROUTE.slice(1).map((p, i) => { const q = ROUTE[i]; return q ? Math.hypot(p[0] - q[0], p[1] - q[1]) : 0; });
  const total = lens.reduce((a, b) => a + b, 0);
  let d = t * total;
  for (let i = 0; i < lens.length; i++) {
    const l = lens[i] ?? 0, a = ROUTE[i], b = ROUTE[i + 1];
    if (a === undefined || b === undefined) break;
    if (d <= l || i === lens.length - 1) return [a[0] + ((b[0] - a[0]) * Math.min(d, l)) / l, a[1] + ((b[1] - a[1]) * Math.min(d, l)) / l];
    d -= l;
  }
  return [0, 0];
}

const MAP_Y = 76;
function mockA(frameNo: number): Canvas {
  const cv = new Canvas();
  logo(cv, FIRE);
  worldMap(cv, 0, MAP_Y);
  frame(cv, 0, MAP_Y - 2, 320, 52, MGY, 2);
  // the dotted route, then the marks and names
  for (let t = 0; t < 1; t += 0.006) { const [x, y] = routeAt(t); rect(cv, Math.floor(x / 2) * 2, MAP_Y + Math.round(y), 2, 2, Math.floor(t * 170) % 2 === 0 ? YEL : RED); }
  MARKS.forEach((m, i) => {
    const p = ROUTE[m.at];
    if (!p) return;
    rect(cv, p[0] - 2, MAP_Y + p[1] - 1, 4, 4, WHT); rect(cv, p[0] - 1, MAP_Y + p[1], 2, 2, RED);
    tag(cv, m.name, Math.max(3, Math.min(317 - m.name.length * 4, p[0] - m.name.length * 2)), MAP_Y + p[1] + (i % 2 === 0 ? 5 : -8));
  });
  // Monty on the road, in three frames: a quarter, a half, and three quarters of the way, his feet on the dots
  const [mx, my] = routeAt([0.2, 0.47, 0.74][frameNo] ?? 0);
  monty(cv, WALK[frameNo % WALK.length] ?? FIRST, Math.round(mx) - 12, MAP_Y + Math.round(my) - 21 + (frameNo === 1 ? -3 : 0), 1, FLIP);
  lower(cv, SHIFTS[frameNo] ?? 0, frameNo !== 1);
  return cv;
}

// ---- B: the suitcase with a sticker from every country --------------------------------------------------------------------------

function suitcase(cv: Canvas, x: number, y: number, w: number, h: number) {
  rect(cv, x + 6, y + h, w - 12, 2, DGY); // its shadow on the floor
  rect(cv, x, y, w, h, BRN); rect(cv, x, y, w, 2, ORG); rect(cv, x, y, 2, h, ORG); rect(cv, x, y + h - 3, w, 3, BLK); rect(cv, x + w - 2, y, 2, h, BLK);
  rect(cv, x + 6, y, 2, h, BLK); rect(cv, x + w - 8, y, 2, h, BLK); // its straps
  for (const sx of [x - 6, x + w]) rect(cv, sx, y + 6, 6, 14, DGY); // the corners' leather
  for (const lx of [x + w / 2 - 22, x + w / 2 + 14]) { rect(cv, lx, y - 3, 8, 5, YEL); rect(cv, lx + 2, y - 1, 4, 2, ORG); }
}

function mockB(frameNo: number): Canvas {
  const cv = new Canvas();
  logo(cv, ICE);
  const cx = 12, cw = 296, cy = 114, ch = 22;
  suitcase(cv, cx, cy, cw, ch);
  // a sticker from every place over its face, as on a well-travelled case
  PLACES.forEach((p, i) => {
    const sw = 36, sh = 16, sx = cx + 14 + i * 40, sy = cy + 2 + (i % 2) * 1;
    rect(cv, sx - 2, sy - 2, sw + 4, sh + 4, WHT); scene(cv, p, sx, sy, sw, sh);
  });
  // Monty strolls along its lid, a step each frame (an expanded sprite)
  const mx = [40, 128, 226][frameNo] ?? 40;
  monty(cv, WALK[frameNo % WALK.length] ?? FIRST, mx, cy - 42 + (frameNo === 1 ? -6 : 0), 2, FLIP);
  lower(cv, SHIFTS[frameNo] ?? 0, frameNo !== 1);
  return cv;
}

// ---- C: the postcard collage --------------------------------------------------------------------------------------------------

function postcard(cv: Canvas, p: Place, x: number, y: number, hot: boolean) {
  const w = 42, h = 34;
  rect(cv, x + 2, y + 2, w, h, DGY);
  rect(cv, x, y, w, h, hot ? YEL : WHT);
  scene(cv, p, x + 4, y + 4, w - 8, 22);
  label(cv, NAMES[p], x + 3, y + h - 8, hot ? RED : BLU);
  // a stamp
  rect(cv, x + w - 12, y + 1, 10, 3, RED); rect(cv, x + w - 12, y + 1, 2, 3, YEL);
}
function mockC(frameNo: number): Canvas {
  const cv = new Canvas();
  logo(cv, POST);
  // seven cards in a row, the one Monty has reached lit; a dotted road below them with Monty on it
  PLACES.forEach((p, i) => postcard(cv, p, 4 + i * 45, 71, i === [1, 3, 5][frameNo])); 
  for (let x = 4; x < 316; x += 6) rect(cv, x, 129, 2, 1, x % 12 === 4 ? YEL : ORG);
  monty(cv, WALK[frameNo % WALK.length] ?? FIRST, [52, 154, 250][frameNo] ?? 52, 108 + (frameNo === 1 ? -3 : 0), 1, FLIP);
  lower(cv, SHIFTS[frameNo] ?? 0, frameNo !== 1);
  return cv;
}

// ---- write -------------------------------------------------------------------------------------------------------------------------

const MOCKS = [['A-map-strip', mockA], ['B-suitcase', mockB], ['C-postcards', mockC]] as const;
for (const [name, make] of MOCKS) {
  for (let f = 0; f < 3; f++) make(f).png(path.join(out, `${name}-frame${f + 1}.png`), 3);
}
console.log('ok');
