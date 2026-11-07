/**
 * The game's own font and how it puts it on the screen. The font is 38 glyphs of 8 bytes (`$813B`), indexed by the codes of
 * letters.ts. A glyph is 8 pixel rows, drawn from the pixel row a text's record gives (always 3 rows into a character cell: the
 * routine at `$80D1` writes 5 rows and then 3 more starting 2 rows into the cell below, which is 8 rows in a line).
 */
import { FONT, type TextLine } from './data';
import { codeOf, GLYPH_COUNT } from './letters';
import { bitmapRow } from './room';

export const GLYPH_ROWS = 8;

/** The 8 rows of glyph `code`. */
export function glyphRows(code: number): Uint8Array {
  if (code < 0 || code >= GLYPH_COUNT) throw new Error(`no glyph ${code}`);
  return FONT.subarray(code * GLYPH_ROWS, (code + 1) * GLYPH_ROWS);
}

/**
 * Put `text` on a bitmap of 6144 bytes (the screen as the Spectrum lays it out) from character column `column`, its 8 rows from pixel
 * row `top` (counted from the top of the screen), a glyph a column, as `$809D` does: the glyphs overwrite the bytes.
 */
export function drawText(bitmap: Uint8Array, text: string, column: number, top: number): void {
  for (let i = 0; i < text.length; i++) {
    const rows = glyphRows(codeOf(text.charAt(i)));
    for (let r = 0; r < GLYPH_ROWS; r++) bitmap[bitmapRow(top + r) + column + i] = rows[r] ?? 0;
  }
}

/** The two attribute rows a line of text sets (`$80FF`): the row it names gets its colour, the row below white on black ($47). */
export const BELOW_ATTR = 0x47;

/**
 * A line of text as the game's `$809D` prints it: the glyphs from its pixel row (counted up from the bottom: the top row of the
 * glyphs is `191 - pixelRow`) and its colours, on a screen of a bitmap and attributes.
 */
export function drawLine(screen: { readonly bitmap: Uint8Array; readonly attrs: Uint8Array }, line: TextLine, text: string = line.text): void {
  drawText(screen.bitmap, text, line.column, 191 - line.pixelRow);
  for (let i = 0; i < text.length; i++) {
    screen.attrs[line.attrRow * 32 + line.column + i] = line.colour;
    screen.attrs[(line.attrRow + 1) * 32 + line.column + i] = BELOW_ATTR;
  }
}
