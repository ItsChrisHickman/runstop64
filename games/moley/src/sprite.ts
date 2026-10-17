/**
 * How the original puts a sprite frame on the screen (`$8931`), as pure functions: the 16 x 16 one-bit picture is turned to face
 * the way he moves, shifted right by `x AND 7` into three screen bytes a row, and each byte is put on the screen as
 * `buffer OR (b AND mask(buffer))`, in a copy of the screen's bitmap at $E000 (another routine copies cells from it to the screen):: the table at `$FF00` is indexed by the byte already there, and `mask(v)` is v's pixels and their left and
 * right neighbours cleared, so a sprite pixel shows only on paper with no ink beside it: the figure goes behind the background's
 * ink and keeps a one-pixel margin from it (the README had this the other way round). Room 5 draws with OR only.
 * test/data.ts proves these against the original's own routine for every frame.
 */
import { SPRITE_FRAMES } from './data';

export const SPRITE_BYTES = 32;
export const SPRITE_ROWS = 16;

/** A byte with its bits the other way round (the table at `$FE00`). */
export function reverseBits(b: number): number {
  let out = 0;
  for (let i = 0; i < 8; i++) if (b & (0x80 >> i)) out |= 1 << i;
  return out;
}

/** The table at `$FF00`: 1 where the byte `b` has no pixel and no neighbour to its left or right within the byte. */
export function sideMask(b: number): number {
  return ~(b | (b << 1) | (b >> 1)) & 0xff;
}

/**
 * The three screen bytes of each of the 16 rows (48 bytes) of a frame at pixel column `x`: the art is stored facing left, so it
 * is as stored when `facingLeft` (flag bit 7: he moved left) and mirrored otherwise.
 */
export function spriteRows(frame: number, x: number, facingLeft: boolean): Uint8Array {
  const out = new Uint8Array(SPRITE_ROWS * 3);
  const shift = x & 7;
  for (let row = 0; row < SPRITE_ROWS; row++) {
    let left = SPRITE_FRAMES[frame * SPRITE_BYTES + row];
    let right = SPRITE_FRAMES[frame * SPRITE_BYTES + SPRITE_ROWS + row];
    if (!facingLeft) [left, right] = [reverseBits(right), reverseBits(left)];
    const wide = ((left << 8) | right) << 8 >>> shift; // 24 bits: the 16 bits, shifted right
    out[row * 3] = (wide >> 16) & 0xff;
    out[row * 3 + 1] = (wide >> 8) & 0xff;
    out[row * 3 + 2] = wide & 0xff;
  }
  return out;
}

/** One screen byte after the sprite byte `b` is drawn over it. */
export function drawByte(screen: number, b: number, orOnly: boolean): number {
  return orOnly ? screen | b : screen | (b & sideMask(screen));
}
