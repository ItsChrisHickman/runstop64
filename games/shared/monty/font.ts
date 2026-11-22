import { BitmapFont, KIT_GLYPHS } from 'c64kit';
import { gameText, textCode } from './lettering';

/** The Monty games' lettering as a font: a character it has no glyph for is looked up as `gameText` writes it (the apostrophe is the charset's own). */
class MontyFont extends BitmapFont {
  override glyph(ch: string): Uint8Array | undefined {
    return super.glyph(gameText(ch));
  }
}

/** Monty on the Run's own lettering (screen codes $40-$7F of its charset), topped up with the kit's: the pause screen's font in montyotr and the remix. */
export function montyLettering(bank: Uint8Array): BitmapFont {
  return new MontyFont()
    .addFromCharsetMapped(bank, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!-:/()', (c) => textCode(String.fromCharCode(c)))
    .addDrawn(KIT_GLYPHS);
}
