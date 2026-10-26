import type { FrameCapture } from './machine';
import { Surface, TRANSPARENT } from '../surface';
import { decodeSprite } from '../vic';

/**
 * The picture as the VIC drew it from a frame's capture, without the sprites: each pixel's colour
 * (C64 colour index), and which character it's part of. Each text row is where the raster line it
 * was fetched on puts it (the vertical fine scroll), with its own colours, modes and horizontal
 * scroll (so raster splits work); the border covers the edges in 38-column and 24-row modes.
 *
 * In two layers, as the VIC has them for sprites set behind the characters: `fore` (multicolour
 * pairs 2 and 3, a hi-res character's set pixels, the border; TRANSPARENT elsewhere) and `back`
 * (the background: each row's background colour, pairs 0 and 1, a bitmap's or an extended colour
 * cell's off pixels). `colour` is the two together, as the picture shows.
 *
 * c64/view.ts (C64View) draws the screen from this, tools/probe's `renderPixels` the pictures tests
 * look at (with the sprites over it as the VIC orders them: `drawSprites`).
 */
interface DecodedPicture {
  /** 320×200 colour indexes: the picture. */
  colour: Uint8Array;
  /** 320×200: what's in front of sprites set behind (TRANSPARENT where nothing), and the background behind. */
  fore: Uint8Array;
  back: Uint8Array;
  /** 320×200: the character code drawn there (in its row's charset), or -1 (border, background, or a bitmap). */
  code: Int16Array;
  /** 320×200: the pixel's bit pair in a multicolour character (0-3), or 0/3 (off/on) in a hi-res one. */
  pair: Uint8Array;
  /** 320×200: the character row (0-24) the pixel is from, or -1. */
  row: Int8Array;
  /** 320×200: the character column (0-39) the pixel is from, or -1. */
  column: Int8Array;
}

const W = 320, H = 200;

/** A picture's arrays (to decode into, again and again). */
export function emptyPicture(): DecodedPicture {
  return { colour: new Uint8Array(W * H), fore: new Uint8Array(W * H), back: new Uint8Array(W * H), code: new Int16Array(W * H), pair: new Uint8Array(W * H), row: new Int8Array(W * H), column: new Int8Array(W * H) };
}

export function decodePicture(ram: Uint8Array, cap: FrameCapture, into: DecodedPicture = emptyPicture()): DecodedPicture {
  const { colour, fore, back, code, pair, row: rowOf, column } = into;
  fore.fill(TRANSPARENT); back.fill(cap.border); code.fill(-1); pair.fill(0); rowOf.fill(-1); column.fill(-1);
  // (lines above the first text row, when the vertical scroll moves it down, show the background)
  const first = cap.rows.find((r) => r);
  if (first?.line !== undefined && first.line > 0x33) back.fill(first.bg[0], 0, Math.min(H, first.line - 0x33) * W);
  for (let row = 0; row < 25; row++) {
    const r = cap.rows[row];
    if (!r) continue;
    const top = r.line !== undefined ? r.line - 0x33 : row * 8;
    const mcm = !!(r.d016 & 0x10), bmm = !!(r.d011 & 0x20), ecm = !!(r.d011 & 0x40);
    const charAt = r.bank + ((r.d018 >> 1) & 7) * 0x800, bitmapAt = r.bank + (r.d018 & 8 ? 0x2000 : 0);
    const xs = r.d016 & 7;
    // (the row's lines in its background colour: also left of the horizontal scroll)
    for (let y = 0; y < 8; y++) if (top + y >= 0 && top + y < H) back.fill(r.bg[0], (top + y) * W, (top + y + 1) * W);
    const multi = [r.bg[0], r.bg[1], r.bg[2], 0];
    // extended colour with bitmap mode (ECM and BMM both set) is one of the VIC's invalid modes: all black (the picture
    // draws nothing from the bitmap or the screen; sprites still show over it). Auf Wiedersehen Monty's title uses it to
    // blank the sprite fonts' memory under its scroller.
    if (ecm && bmm) {
      for (let y = 0; y < 8; y++) if (top + y >= 0 && top + y < H) back.fill(0, (top + y) * W, (top + y + 1) * W);
      continue;
    }
    for (let c = 0; c < 40; c++) {
      const cc = r.codes[c], col = r.colours[c] & 15;
      // extended colour mode: 64 characters, and the code's top two bits pick the cell's background
      const glyph = ecm ? cc & 63 : cc, cellBg = ecm ? r.bg[cc >> 6] : r.bg[0];
      const mc = mcm && (bmm || !!(col & 8));
      if (bmm) { multi[1] = cc >> 4; multi[2] = cc & 15; multi[3] = col; } else multi[3] = col & 7;
      for (let y = 0; y < 8; y++) {
        const Y = top + y;
        if (Y < 0 || Y >= H) continue;
        const bits = bmm ? ram[bitmapAt + (row * 40 + c) * 8 + y] : ram[charAt + glyph * 8 + y];
        for (let x = 0; x < 8; x++) {
          const X = c * 8 + x + xs;
          if (X >= W) break;
          const i = Y * W + X;
          let p: number;
          if (mc) {
            // (pairs 00 and 01 are background to the VIC: sprites set behind still show over them)
            p = (bits >> (6 - (x & 6))) & 3;
            if (p < 2) back[i] = multi[p]; else fore[i] = multi[p];
          } else if (bits & (0x80 >> x)) {
            p = 3;
            fore[i] = bmm ? cc >> 4 : col;
          } else {
            p = 0;
            if (bmm) back[i] = cc & 15;
            else if (ecm) back[i] = cellBg;
          }
          pair[i] = p; rowOf[i] = row; column[i] = c; code[i] = bmm ? -1 : glyph;
        }
      }
    }
    // 38-column mode: the border covers 7 pixels left and 9 right
    if (!(r.d016 & 8)) for (let y = 0; y < 8; y++) {
      const Y = top + y;
      if (Y < 0 || Y >= H) continue;
      for (const x of [0, 1, 2, 3, 4, 5, 6, 311, 312, 313, 314, 315, 316, 317, 318, 319]) border(Y * W + x, cap.borderLines[0x30 + Y]);
    }
  }
  // 24 rows ($D011 bit 3 off): the border covers the picture's top and bottom 4 lines
  const last = [...cap.rows].reverse().find((r) => r);
  for (const [r, from] of [[first, 0], [last, 196]] as const) {
    if (!r || r.d011 & 8) continue;
    for (let y = from; y < from + 4; y++) for (let x = 0; x < W; x++) border(y * W + x, cap.borderLines[0x33 + y]);
  }
  for (let i = 0; i < W * H; i++) colour[i] = fore[i] === TRANSPARENT ? back[i] : fore[i];
  return into;

  function border(i: number, c: number) { fore[i] = c; code[i] = -1; pair[i] = 0; rowOf[i] = -1; column[i] = -1; }
}

/** A sprite as drawn: its pixels (C64 colour indexes, TRANSPARENT where clear) where it is on the picture, and its priority. */
interface DrawnSprite { n: number; x: number; y: number; w: number; h: number; pixels: Uint8Array; behind: boolean }

/** A frame capture's sprites decoded, where the machine puts them on the 320×200 picture. */
export function capturedSprites(cap: FrameCapture): DrawnSprite[] {
  return cap.sprites.map((s) => {
    const w = s.expandX ? 48 : 24, h = s.expandY ? 42 : 21, out = new Surface(w, h);
    decodeSprite(s.data, s.colour, s.multicolour, s.mc1, s.mc2, s.expandX, s.expandY, out);
    // (PAL sprite x runs 0-503; higher values are just left of the screen)
    return { n: s.n, x: (s.x >= 504 ? s.x - 504 : s.x) - 24, y: s.y - 50, w, h, pixels: out.pixels, behind: s.behind };
  });
}

/**
 * Sprites drawn over a picture (`px`, in place) as the VIC draws them: at each pixel the
 * lowest-numbered sprite with a pixel there wins over the other sprites, and it shows unless it's set
 * behind the characters ($D01B) and they have a pixel there (`fore`: decodePicture's): then the
 * characters show, even over a higher-numbered sprite set in front (the VIC decides between the
 * sprites first).
 */
export function drawSprites(px: Uint8Array, fore: Uint8Array, sprites: readonly DrawnSprite[]) {
  // (each pixel's winner: drawn highest-numbered first, so the lowest number is left)
  const colour = new Uint8Array(W * H).fill(TRANSPARENT), behind = new Uint8Array(W * H);
  for (const s of [...sprites].sort((a, b) => b.n - a.n)) {
    for (let y = 0; y < s.h; y++) for (let x = 0; x < s.w; x++) {
      const v = s.pixels[y * s.w + x], X = Math.round(s.x) + x, Y = Math.round(s.y) + y;
      if (v === TRANSPARENT || X < 0 || Y < 0 || X >= W || Y >= H) continue;
      colour[Y * W + X] = v; behind[Y * W + X] = s.behind ? 1 : 0;
    }
  }
  for (let i = 0; i < W * H; i++) if (colour[i] !== TRANSPARENT && !(behind[i] && fore[i] !== TRANSPARENT)) px[i] = colour[i];
}
