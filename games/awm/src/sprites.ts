/**
 * Sprite shapes: the game keeps 256 frames of 16 x 16 pixels (two bytes a row, from $0A40) and
 * composes a sprite's 63 bytes from a frame when it draws ($66CA): straight, or mirrored for an
 * entity facing left (each row's two bytes swapped and bit-reversed).
 */
import { reverseBits } from 'c64kit';

const FRAME_BYTES = 32;
export const FRAME_COUNT = 256;
export const SPRITE_BYTES = 63;

/** $66CA: a frame's picture into a sprite buffer at `at`: the game writes the two bytes of each of the 16 rows; the third byte and the last rows are never touched. */
export function putSpriteImage(ram: Uint8Array, at: number, frames: Uint8Array, frame: number, mirrored: boolean): void {
  const image = spriteImage(frames, frame, mirrored);
  for (let row = 0; row < 16; row++) {
    ram[at + row * 3] = image[row * 3] ?? 0;
    ram[at + row * 3 + 1] = image[row * 3 + 1] ?? 0;
  }
}

/** A frame as the 63 bytes of a hires sprite (24 pixels wide, the picture at the left, the third byte of each row clear). */
export function spriteImage(frames: Uint8Array, frame: number, mirrored: boolean): Uint8Array {
  const out = new Uint8Array(SPRITE_BYTES);
  const at = (frame & 0xff) * FRAME_BYTES;
  for (let row = 0; row < 16; row++) {
    const a = frames[at + row * 2], b = frames[at + row * 2 + 1];
    if (mirrored) {
      out[row * 3] = reverseBits(b);
      out[row * 3 + 1] = reverseBits(a);
    } else {
      out[row * 3] = a;
      out[row * 3 + 1] = b;
    }
  }
  return out;
}
