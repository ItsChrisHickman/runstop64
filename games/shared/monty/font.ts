import { BitmapFont, KIT_GLYPHS } from 'c64kit';

/** Monty on the Run's own lettering (screen codes $40-$7F of its charset), topped up with the kit's: the pause screen's font in montyotr and the remix. */
export function montyLettering(bank: Uint8Array): BitmapFont {
  return new BitmapFont()
    .addFromCharsetMapped(bank, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!-:/()', (c) => (c & 0x3f) | 0x40)
    .addDrawn(KIT_GLYPHS);
}
