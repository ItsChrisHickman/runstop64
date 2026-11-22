import { glyphOf, SCROLLER_ROWS } from './title-art';

/**
 * The title's story scroller: the game's lettering at twice its size (16 pixels tall), scrolling left a few pixels a frame, drawn the way the
 * C64 does a text scroller in hires: its two rows of forty characters are redrawn each frame from the text as a strip of pixel columns, so
 * the characters are the scroller's own (80 of the set, title-art.ts reserves them) and the colour of each cell is that of the passage under it.
 */

/** A passage of the story and its colour (0-7). */
export interface Passage { readonly colour: number; readonly text: string }

const SCALE = 2;

export class StripScroller {
  /** The strip: for each pixel column of the text, its 16 pixel rows as bits (top = bit 0). */
  private readonly columns: Uint16Array;
  private readonly colours: Uint8Array;
  private pos = 0;

  /** The story's passages with `lead` blank columns before them and `tail` after (so the text comes in from the right and leaves on the left). */
  constructor(bank: Uint8Array, story: readonly Passage[], lead = 0, tail = 320) {
    const glyphs = story.flatMap((p) => [...p.text].map((ch) => ({ glyph: glyphOf(bank, ch), colour: p.colour })));
    const width = lead + glyphs.length * 8 * SCALE + tail;
    this.columns = new Uint16Array(width);
    this.colours = new Uint8Array(width).fill(story[0]?.colour ?? 1);
    glyphs.forEach(({ glyph, colour }, n) => {
      for (let gx = 0; gx < 8; gx++) for (let k = 0; k < SCALE; k++) {
        const x = lead + (n * 8 + gx) * SCALE + k;
        let bits = 0;
        for (let gy = 0; gy < 8; gy++) if ((glyph[gy] ?? 0) & (0x80 >> gx)) bits |= 3 << (gy * SCALE);
        this.columns[x] = bits;
      }
      for (let k = 0; k < 8 * SCALE; k++) this.colours[lead + n * 8 * SCALE + k] = colour;
    });
    this.colours.fill(story[story.length - 1]?.colour ?? 1, lead + glyphs.length * 8 * SCALE);
  }

  /** From the start. */
  reset() { this.pos = 0; }

  /** Scroll `pixels` left. */
  step(pixels: number) { this.pos = (this.pos + pixels) % this.columns.length; }

  /** Draw the two rows into the characters `codes` (row by row) of `mem` (the character set at 0) and their colours into `col` at `from`. */
  draw(mem: Uint8Array, codes: readonly number[], col: Uint8Array, from: number) {
    const n = this.columns.length;
    for (let r = 0; r < SCROLLER_ROWS; r++) for (let c = 0; c < 40; c++) {
      const code = codes[r * 40 + c] ?? 0;
      for (let y = 0; y < 8; y++) {
        let b = 0;
        for (let k = 0; k < 8; k++) if ((this.columns[(this.pos + c * 8 + k) % n] ?? 0) & (1 << (r * 8 + y))) b |= 0x80 >> k;
        mem[code * 8 + y] = b;
      }
      col[from + r * 40 + c] = this.colours[(this.pos + c * 8 + 4) % n] ?? 1;
    }
  }
}
