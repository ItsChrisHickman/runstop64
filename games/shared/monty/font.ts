import { BitmapFont, KIT_GLYPHS } from 'c64kit';
import { gameText, textCode } from './lettering';

/** The Monty games' lettering as a font: a character it has no glyph for is looked up as `gameText` writes it (the apostrophe is the charset's own); one the charset lacks but the font is given drawn (the per cent sign) is drawn as given. */
class MontyFont extends BitmapFont {
  override glyph(ch: string): Uint8Array | undefined {
    const mapped = gameText(ch);
    return (mapped === ' ' && ch !== ' ' ? super.glyph(ch) : undefined) ?? super.glyph(mapped);
  }
}

/** The per cent sign (the % complete: Do Svidaniya Monty's pause screen and THE END), drawn as bold as the lettering: the charset has none. */
const PERCENT: Record<string, string[]> = {
  '%': ['##...##.', '##..##..', '...##...', '..##....', '.##.....', '##..##..', '#...##..', '........'],
};

/** Monty on the Run's own lettering (screen codes $40-$7F of its charset), topped up with the kit's: the pause screen's font in montyotr and the remix. */
export function montyLettering(bank: Uint8Array): BitmapFont {
  return new MontyFont()
    .addFromCharsetMapped(bank, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!-:/()', (c) => textCode(String.fromCharCode(c)))
    .addDrawn(KIT_GLYPHS)
    .addDrawn(PERCENT);
}
