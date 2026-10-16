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

/**
 * Decode a 64-byte hi-res C64 sprite (24×21, 3 bytes per row) into a Surface
 * in the given colour.
 */
export function decodeHiresSprite(bytes: ArrayLike<number>, colour: number): Surface {
  const s = new Surface(24, 21);
  for (let row = 0; row < 21; row++) {
    for (let b = 0; b < 3; b++) {
      const v = bytes[row * 3 + b];
      for (let bit = 0; bit < 8; bit++) if (v & (0x80 >> bit)) s.pixels[row * 24 + b * 8 + bit] = colour;
    }
  }
  return s;
}

/**
 * Decode a 64-byte multicolour C64 sprite (12×21 double-wide pixels, drawn
 * here as 24×21). Bit pairs: 01 → mc1, 10 → sprite colour, 11 → mc2.
 */
export function decodeMulticolourSprite(bytes: ArrayLike<number>, colour: number, mc1: number, mc2: number): Surface {
  const s = new Surface(24, 21);
  const map = [TRANSPARENT, mc1, colour, mc2];
  for (let row = 0; row < 21; row++) {
    for (let b = 0; b < 3; b++) {
      const v = bytes[row * 3 + b];
      for (let pair = 0; pair < 4; pair++) {
        const c = map[(v >> (6 - pair * 2)) & 3];
        const x = b * 8 + pair * 2;
        s.pixels[row * 24 + x] = c;
        s.pixels[row * 24 + x + 1] = c;
      }
    }
  }
  return s;
}

/**
 * Pixel-perfect overlap test between two surfaces at integer positions, like
 * the VIC-II's hardware sprite-sprite collision.
 */
export function surfacesOverlap(a: Surface, ax: number, ay: number, b: Surface, bx: number, by: number): boolean {
  ax = Math.round(ax); ay = Math.round(ay); bx = Math.round(bx); by = Math.round(by);
  const x0 = Math.max(ax, bx), x1 = Math.min(ax + a.width, bx + b.width);
  const y0 = Math.max(ay, by), y1 = Math.min(ay + a.height, by + b.height);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      if (a.pixels[(y - ay) * a.width + (x - ax)] !== TRANSPARENT && b.pixels[(y - by) * b.width + (x - bx)] !== TRANSPARENT) return true;
    }
  }
  return false;
}

export function hexBytes(hex: string): Uint8Array {
  const out = new Uint8Array(hex.length / 2);
  for (let i = 0; i < out.length; i++) out[i] = parseInt(hex.substr(i * 2, 2), 16);
  return out;
}
