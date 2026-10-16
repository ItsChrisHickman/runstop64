import { C64_RGBA } from './palette';

/**
 * An indexed-colour pixel buffer (one byte per pixel, C64 colour 0-15, or
 * TRANSPARENT). Everything the kit draws goes through one of these; renderers
 * turn them into textures.
 */
export const TRANSPARENT = 0xff;

export class Surface {
  readonly pixels: Uint8Array;
  /** Bumped on every change so renderers know when to re-upload. */
  version = 0;

  constructor(readonly width: number, readonly height: number, fill = TRANSPARENT) {
    this.pixels = new Uint8Array(width * height).fill(fill);
  }

  clear(colour = TRANSPARENT) {
    this.pixels.fill(colour);
    this.version++;
  }

  set(x: number, y: number, colour: number) {
    if (x < 0 || y < 0 || x >= this.width || y >= this.height) return;
    this.pixels[y * this.width + x] = colour;
    this.version++;
  }

  fillRect(x: number, y: number, w: number, h: number, colour: number) {
    for (let j = Math.max(0, y); j < Math.min(this.height, y + h); j++) {
      for (let i = Math.max(0, x); i < Math.min(this.width, x + w); i++) this.pixels[j * this.width + i] = colour;
    }
    this.version++;
  }

  /** Draw a hi-res 8×8 character (8 bytes, MSB = leftmost pixel). */
  drawChar(glyph: ArrayLike<number>, x: number, y: number, fg: number, bg = TRANSPARENT) {
    for (let row = 0; row < 8; row++) {
      const bits = glyph[row];
      const py = y + row;
      if (py < 0 || py >= this.height) continue;
      for (let col = 0; col < 8; col++) {
        const px = x + col;
        if (px < 0 || px >= this.width) continue;
        const on = bits & (0x80 >> col);
        if (on) this.pixels[py * this.width + px] = fg;
        else if (bg !== TRANSPARENT) this.pixels[py * this.width + px] = bg;
      }
    }
    this.version++;
  }

  /** Write the surface into an RGBA byte array (transparent pixels → alpha 0). */
  toRGBA(out: Uint8Array) {
    const out32 = new Uint32Array(out.buffer, out.byteOffset, this.width * this.height);
    const px = this.pixels;
    for (let i = 0; i < px.length; i++) out32[i] = px[i] === TRANSPARENT ? 0 : C64_RGBA[px[i] & 15];
  }
}

export function hexBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}
