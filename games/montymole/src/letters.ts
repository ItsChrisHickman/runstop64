/**
 * The game's letters: the character of each glyph code of its font (`$813B`). Code 0 is a space, 1-26 the letters (glyph 17, where a Q
 * would be, is the apostrophe: no text has a Q), 27-36 the digits and 37 the colon. No data lives here, so the generator can use it.
 */
export const GLYPH_CHARS = " ABCDEFGHIJKLMNOP'RSTUVWXYZ0123456789:";
export const GLYPH_COUNT = GLYPH_CHARS.length;
/** The score's digit glyphs are the digit + `$1B`, the lives' too: the code of digit 0. */
export const DIGIT_BASE = 27;

/** The glyph code of a character; a character the font has not is a mistake. */
export function codeOf(ch: string): number {
  const code = GLYPH_CHARS.indexOf(ch);
  if (code < 0) throw new Error(`the game's font has no ${JSON.stringify(ch)}`);
  return code;
}
