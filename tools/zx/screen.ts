/**
 * What the ULA shows, from memory: the 256 x 192 bitmap at $4000 (thirds, then pixel rows, then character rows) with
 * the colour attributes at $5800 (ink, paper, bright, flash), and the border. Colours are palette indexes 0..15
 * (bright * 8 + colour) into ZX_PALETTE.
 */
import { palettePng } from '../png';

const SCREEN_W = 256;
export const SCREEN_H = 192;

/** The Spectrum's colours: black, blue, red, magenta, green, cyan, yellow, white; then the same, bright. */
const ZX_PALETTE: readonly number[] = [
  0x000000, 0x0000d7, 0xd70000, 0xd700d7, 0x00d700, 0x00d7d7, 0xd7d700, 0xd7d7d7,
  0x000000, 0x0000ff, 0xff0000, 0xff00ff, 0x00ff00, 0x00ffff, 0xffff00, 0xffffff,
];

/** The address of a pixel row's first byte: the Spectrum's interleaved layout. */
export function rowAddress(y: number): number {
  return 0x4000 + ((y & 0xc0) << 5) + ((y & 7) << 8) + ((y & 0x38) << 2);
}

/** The picture as palette indexes, 256 x 192 (a flashing cell inverted when `flash` is set). */
export function screenIndexes(mem: Uint8Array, flash: boolean): Uint8Array {
  const px = new Uint8Array(SCREEN_W * SCREEN_H);
  for (let y = 0; y < SCREEN_H; y++) {
    const row = rowAddress(y), attrRow = 0x5800 + (y >> 3) * 32;
    for (let cx = 0; cx < 32; cx++) {
      const bits = mem[row + cx], attr = mem[attrRow + cx];
      const bright = (attr >> 3) & 8;
      let ink = (attr & 7) | bright, paper = ((attr >> 3) & 7) | bright;
      if (attr & 0x80 && flash) [ink, paper] = [paper, ink];
      for (let b = 0; b < 8; b++) px[y * SCREEN_W + cx * 8 + b] = bits & (0x80 >> b) ? ink : paper;
    }
  }
  return px;
}

/** The picture inside a border of the given width and height on every side (the border colour is 0..7). */
export function withBorder(px: Uint8Array, border: number, bw = 32, bh = 24): { px: Uint8Array; w: number; h: number } {
  const w = SCREEN_W + 2 * bw, h = SCREEN_H + 2 * bh;
  const out = new Uint8Array(w * h).fill(border);
  for (let y = 0; y < SCREEN_H; y++) out.set(px.subarray(y * SCREEN_W, (y + 1) * SCREEN_W), (y + bh) * w + bw);
  return { px: out, w, h };
}

/** The screen as a PNG, scaled `scale` times, with a border (unless `border` is false). */
export function screenPng(file: string, mem: Uint8Array, borderColour: number, flash: boolean, scale = 2, border = true) {
  const px = screenIndexes(mem, flash);
  if (!border) { palettePng(file, px, SCREEN_W, SCREEN_H, ZX_PALETTE, scale); return; }
  const b = withBorder(px, borderColour);
  palettePng(file, b.px, b.w, b.h, ZX_PALETTE, scale);
}
