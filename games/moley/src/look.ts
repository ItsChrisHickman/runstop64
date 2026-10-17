/**
 * The two looks of the picture. ORIGINAL is the Spectrum's screen exactly as the original makes it (display.ts): a sprite is
 * drawn into the bitmap, goes behind the scenery's ink, and shows in the ink of the cell it is over (the colour clash).
 * ENHANCED has no clash: the scenery is drawn without the sprites and each sprite is drawn over it, whole, in its colour
 * (`SPRITE_INK`), like a C64 sprite. Both use the Spectrum's colours.
 */
import { Display, pixelsOf, type SpritePlace } from './display';
import { PICTURE_HEIGHT, PICTURE_WIDTH } from './picture';
import { spriteRows } from './sprite';

export type Look = 'original' | 'enhanced';

/**
 * The colour of every sprite in ENHANCED (0-15: `bright * 8 + colour`): bright white. The rule is "the colour the original usually shows
 * it in", and it was measured: over 32,000 passes of the original (random players in every room, the bot through the whole game)
 * the ink under the pixels a sprite adds to the screen is bright white for 94 % of them, and the dominant colour of every one of the
 * 81 pictures seen in play (the others are the colour clash: the ink of a coloured cell it crosses). `re/colours.ts` measures it
 * and test/picture.ts checks it.
 */
export const SPRITE_INK = 15;

/** The 16 x 16 picture of a sprite as the rows of two bytes it is stored in, facing the way the entity does (row `r`: bytes `2r`, `2r+1`). */
export function spriteImage(frame: number, facingLeft: boolean): Uint8Array {
  const rows = spriteRows(frame, 0, facingLeft);
  const out = new Uint8Array(32);
  for (let r = 0; r < 16; r++) {
    out[r * 2] = rows[r * 3];
    out[r * 2 + 1] = rows[r * 3 + 1];
  }
  return out;
}

/** Whether the pixel (`c`, `r`) of a sprite image is set. */
export function spritePixel(image: Uint8Array, c: number, r: number): boolean {
  return (image[r * 2 + (c >> 3)] & (0x80 >> (c & 7))) !== 0;
}

/** The picture of a screen state as colour indexes, in a look. `plain` and `sprites` are only used by ENHANCED. */
export function paintPixels(look: Look, bits: Uint8Array, plain: Uint8Array, attrs: Uint8Array, sprites: readonly SpritePlace[], out: Uint8Array, flash = false): Uint8Array {
  if (look === 'original') return pixelsOf(bits, attrs, out, flash);
  pixelsOf(plain, attrs, out, flash);
  for (const s of sprites) {
    const image = spriteImage(s.frame, s.facingLeft);
    for (let r = 0; r < 16; r++) {
      const y = s.y + r;
      if (y >= PICTURE_HEIGHT) break;
      for (let c = 0; c < 16; c++) {
        const x = s.x + c;
        if (x < PICTURE_WIDTH && spritePixel(image, c, r)) out[y * PICTURE_WIDTH + x] = SPRITE_INK;
      }
    }
  }
  return out;
}

/** The picture the display shows now, in a look. */
export function picture(display: Display, look: Look, flash = false): Uint8Array {
  const out = new Uint8Array(PICTURE_WIDTH * PICTURE_HEIGHT);
  return paintPixels(look, display.bits, look === 'enhanced' ? display.plain() : display.bits, display.attributes(), display.sprites(), out, flash);
}
