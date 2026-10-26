import { writePng } from '../png';
import type { C64 } from '../../packages/c64kit/src/c64/machine';

/** What drawing a picture needs of a machine: its memory and the last frame's capture (a port can give these too). */
export type Picture = Pick<C64, 'ram' | 'capture'>;
import { C64_PALETTE } from '../../packages/c64kit/src/palette';
import { layOut, placeBox, type PictureLayout } from '../../packages/c64kit/src/layout';
import { capturedSprites, decodePicture, drawSprites } from '../../packages/c64kit/src/c64/picture';
import { TRANSPARENT } from '../../packages/c64kit/src/surface';

// ---- rendering (from the frame capture, like the browser renderer) -------------------------

/** Render the machine's last frame capture (playfield, 320×200; laid out by `layout` if given) to a PNG, scaled 2×; `rings` (screen x, y) are circled in light red (edged in black), `dots` marked in yellow. */
export function renderPng(m: Picture, file: string, rings: [number, number][] = [], dots: [number, number][] = [], layout: PictureLayout | null = null) {
  const px = renderPixels(m, layout);
  const W = 320, H = 200;
  for (const [cx, cy] of rings) for (let a = 0; a < 64; a++) {
    for (const [r, c] of [[8, 0], [9, 10], [10, 10], [11, 0]]) { // (light red, edged in black: seen on any colour)
      const X = Math.round(cx + r * Math.cos((a / 64) * 2 * Math.PI)), Y = Math.round(cy + r * Math.sin((a / 64) * 2 * Math.PI));
      if (X >= 0 && Y >= 0 && X < W && Y < H) px[Y * W + X] = c;
    }
  }
  for (const [cx, cy] of dots) for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) {
    const X = cx + x, Y = cy + y;
    if (X >= 0 && Y >= 0 && X < W && Y < H) px[Y * W + X] = 7;
  }
  indicesPng(file, px, W, H);
}

/**
 * The machine's last frame capture as C64 colour indexes, 320×200 (for comparing pictures): the
 * characters (c64kit's c64/picture.ts, as C64View draws them), with a `layout` laid out as the front
 * end shows it (c64kit's layout.ts), and the sprites over them as the VIC orders them (`drawSprites`:
 * the lowest-numbered in front, one set behind the characters hidden where they have a pixel).
 */
export function renderPixels(m: Picture, layout: PictureLayout | null = null) {
  const { fore, back } = shownLayers(m, layout), px = joinLayers(fore, back);
  // (each moved with the part of the picture its middle is in)
  drawSprites(px, fore, capturedSprites(m.capture).map((s) => ({ ...s, ...placeBox(layout, s) })));
  return px;
}

/** The two layers as one picture without the sprites (the renderer's screen over its backdrop). */
function joinLayers(fore: Uint8Array, back: Uint8Array) {
  // (a plain loop: Uint8Array.from with a map function goes through the iterator protocol, which was most of a frame's cost)
  const px = new Uint8Array(fore.length);
  for (let i = 0; i < px.length; i++) px[i] = fore[i] === TRANSPARENT ? back[i] : fore[i];
  return px;
}

/**
 * The characters as shown (laid out by `layout` if given), in the VIC's two layers: what's in front of
 * sprites set behind (TRANSPARENT where nothing) and the background (c64kit's decodePicture).
 */
export function shownLayers(m: Picture, layout: PictureLayout | null = null) {
  const { fore, back } = decodePicture(m.ram, m.capture);
  if (layout) layOut(layout, fore, back, m.ram, m.capture);
  return { fore, back };
}

/** renderPixels with rings and dots drawn over (as renderPng draws them). */
export function renderIndices(m: Picture, rings: [number, number][] = [], dots: [number, number][] = [], layout: PictureLayout | null = null) {
  const px = renderPixels(m, layout), W = 320, H = 200;
  for (const [cx, cy] of rings) for (let a = 0; a < 64; a++) {
    for (const [r, c] of [[8, 0], [9, 10], [10, 10], [11, 0]]) {
      const X = Math.round(cx + r * Math.cos((a / 64) * 2 * Math.PI)), Y = Math.round(cy + r * Math.sin((a / 64) * 2 * Math.PI));
      if (X >= 0 && Y >= 0 && X < W && Y < H) px[Y * W + X] = c;
    }
  }
  for (const [cx, cy] of dots) for (let y = -1; y <= 1; y++) for (let x = -1; x <= 1; x++) {
    const X = cx + x, Y = cy + y;
    if (X >= 0 && Y >= 0 && X < W && Y < H) px[Y * W + X] = 7;
  }
  return px;
}

/** C64 colour indices as RGB (0..1 floats, 3 per pixel), to draw more over (e.g. overlay effects). */
export function indicesToRgb(px: Uint8Array) {
  const out = new Float32Array(px.length * 3);
  for (let i = 0; i < px.length; i++) {
    const c = C64_PALETTE[px[i] & 15];
    out[i * 3] = (c >> 16) / 255; out[i * 3 + 1] = ((c >> 8) & 255) / 255; out[i * 3 + 2] = (c & 255) / 255;
  }
  return out;
}

/** An RGB picture (0..1 floats, 3 per pixel, W x H) as a PNG, each pixel scaled S times. */
export function rgbPng(file: string, rgb: Float32Array, W: number, H: number, S = 2) {
  const w = W * S, h = H * S, raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = (Math.floor(y / S) * W + Math.floor(x / S)) * 3, o = y * (w * 3 + 1) + 1 + x * 3;
    for (let k = 0; k < 3; k++) raw[o + k] = Math.max(0, Math.min(255, Math.round(rgb[i + k] * 255)));
  }
  writePng(file, raw, w, h);
}

/** C64 colour indices (W x H, one per pixel, low 4 bits used) as a PNG in the C64 palette, each pixel scaled S times. Tests and tools write C64 pictures through this (or rgbPng): no PNG writer of their own. */
export function indicesPng(file: string, px: ArrayLike<number>, W: number, H: number, S = 2) {
  const w = W * S, h = H * S, raw = Buffer.alloc((w * 3 + 1) * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const c = C64_PALETTE[px[Math.floor(y / S) * W + Math.floor(x / S)] & 15];
    const o = y * (w * 3 + 1) + 1 + x * 3;
    raw[o] = c >> 16; raw[o + 1] = (c >> 8) & 255; raw[o + 2] = c & 255;
  }
  writePng(file, raw, w, h);
}
