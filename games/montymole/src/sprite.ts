/**
 * How the original puts a 16 x 16 sprite on the screen (`$EBE0`, as pure functions) and takes it off again (`$8452`).
 *
 * The game keeps two copies of the screen's bitmap: the picture buffer (`$D260`: the room, no sprites) and the screen. A sprite is
 * shifted right by `x AND 7` into three bytes a row and drawn on the 16 rows from `y` down (`y` counts up from the bottom, so row `y`
 * is the top of the sprite and `y - 15` the bottom), each byte as `screen = sprite OR picture`: a sprite is never behind the room,
 * it shows over every pixel. To take a sprite off, the picture's bytes are copied back. test/data.ts proves `blit` against the
 * original's routine for every frame at every shift.
 *
 * The routine writes three bytes from column `(x - 1) >> 3`: when `x AND 7` is 0 the first of them is empty (the sprite's two bytes
 * start in the second), so that byte is put back to the picture's; otherwise the three bytes start at column `x >> 3`.
 */
import { SPRITE_BYTES, screenOffset } from './data';

export const SPRITE_ROWS = 16;
export const SPRITE_WIDTH = 16;

/** The three bytes written for each of the 16 rows (48 bytes): the image shifted right by `x AND 7`. */
export function spriteRows(image: Uint8Array, x: number): Uint8Array {
  if (image.length !== SPRITE_BYTES) throw new Error('a sprite is 32 bytes');
  const out = new Uint8Array(SPRITE_ROWS * 3);
  const shift = x & 7;
  for (let r = 0; r < SPRITE_ROWS; r++) {
    const wide = (((image[2 * r] ?? 0) << 16) | ((image[2 * r + 1] ?? 0) << 8)) >> shift; // 24 bits
    if (shift === 0) {
      out[r * 3] = 0;
      out[r * 3 + 1] = image[2 * r] ?? 0;
      out[r * 3 + 2] = image[2 * r + 1] ?? 0;
    } else {
      out[r * 3] = (wide >> 16) & 255;
      out[r * 3 + 1] = (wide >> 8) & 255;
      out[r * 3 + 2] = wide & 255;
    }
  }
  return out;
}

/** The column the three bytes start in. */
export function firstColumn(x: number): number {
  return ((x - 1) & 255) >> 3;
}

/** Draw the image at (x, y) on `screen` over `picture`: both are 6144-byte bitmaps in the Spectrum's layout. */
export function blit(screen: Uint8Array, picture: Uint8Array, image: Uint8Array, x: number, y: number): void {
  const rows = spriteRows(image, x);
  const column = firstColumn(x);
  for (let r = 0; r < SPRITE_ROWS; r++) {
    const at = screenOffset(y - r) + column;
    for (let c = 0; c < 3; c++) screen[at + c] = (rows[r * 3 + c] ?? 0) | (picture[at + c] ?? 0);
  }
}

/** Put the picture's three bytes back on pixel rows `y` and `y - 1`, from column `x >> 3` (`$8452` does two rows a call). */
export function restoreRows(screen: Uint8Array, picture: Uint8Array, x: number, y: number): void {
  for (const row of [y, y - 1]) {
    const at = screenOffset(row) + (x >> 3);
    for (let c = 0; c < 3; c++) screen[at + c] = picture[at + c] ?? 0;
  }
}
