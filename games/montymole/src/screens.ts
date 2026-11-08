/**
 * The screens the game has besides its rooms, as the Spectrum shows them: a bitmap of 6144 bytes in its interleaved layout and 768 attribute bytes.
 *
 * - the title: the loading picture as the tape loads it (`TITLE_PICTURE`), under the title tune;
 * - the options (`$8000`): the game's own letters on a cleared screen, a line each in its colour. The original's three control lines (keyboard, Kempston, Sinclair) and
 *   PLAY GAME are ours here: they say our keys (src/controls.ts), in the same letters and colours;
 * - game over (`$F817`) and the ending (`$CAD1`): the screen cleared, the score put back, a cyan or yellow band of attributes under it, and the verse typed in the
 *   bottom row a letter at a time (`$CB35`: the glyph's 8 lines at the row of cells 22, from column 5 in the ending and 0 in game over), the whole lower part of the screen scrolled up a pixel line each
 *   time (`$CB63`: the 127 lines above the bottom two) for the 10 lines after each verse line (26 after every fourth), each scroll taking two frames. `VersePrinter`
 *   is that, one frame at a time. test/screens.ts compares it with the original's every frame.
 */
import { ENDING_VERSE, FONT, GAME_OVER_VERSE, MENU_LINES, SCORE_LINE, TITLE_PICTURE, type TextLine } from './data';
import { codeOf } from './letters';
import { drawLine, GLYPH_ROWS } from './font';
import { bitmapRow } from './room';
import { digitChar } from './field';

export const BITMAP_BYTES = 6144;
export const ATTR_BYTES = 768;

/** A screen: its bitmap and attributes. */
export class Screen {
  readonly bits: Uint8Array;
  readonly attrs: Uint8Array;
  constructor(bits = new Uint8Array(BITMAP_BYTES), attrs = new Uint8Array(ATTR_BYTES)) {
    this.bits = bits;
    this.attrs = attrs;
  }

  copy(): Screen { return new Screen(this.bits.slice(), this.attrs.slice()); }
}

/** The title: the loading picture. */
export function titleScreen(): Screen {
  return new Screen(TITLE_PICTURE.slice(0, BITMAP_BYTES), TITLE_PICTURE.slice(BITMAP_BYTES, BITMAP_BYTES + ATTR_BYTES));
}

/** The options screen's lines: the original's in their places and colours, with our words (`MENU_LINES`: OPTIONS at the top, then 140, 124, 108 and 76; 92 is the gap). */
export const OPTIONS_LINES: readonly TextLine[] = [
  MENU_LINES[0] ?? { column: 12, pixelRow: 172, colour: 0x42, attrRow: 2, text: 'OPTIONS' },
  { column: 3, pixelRow: 140, colour: 0x43, attrRow: 6, text: 'MOVE: ARROWS OR WASD' },
  { column: 3, pixelRow: 124, colour: 0x44, attrRow: 8, text: 'JUMP: SPACE Z OR X' },
  { column: 3, pixelRow: 108, colour: 0x45, attrRow: 10, text: 'GAMEPAD AND TOUCH TOO' },
  { column: 3, pixelRow: 92, colour: 0x47, attrRow: 12, text: 'P PAUSES AND M MUTES' },
  { column: 3, pixelRow: 76, colour: 0x46, attrRow: 14, text: 'PRESS JUMP TO PLAY' },
];

/** The best score so far (the original has none: the browser keeps it), under the lines, five digits like the score's. */
const HIGH_SCORE_LINE: TextLine = { column: 3, pixelRow: 60, colour: 0x45, attrRow: 16, text: 'HIGH SCORE: ' };

export function optionsScreen(high: number): Screen {
  const s = new Screen();
  for (const line of OPTIONS_LINES) drawLine({ bitmap: s.bits, attrs: s.attrs }, line);
  const digits = String(Math.min(high, 99999)).padStart(5, '0');
  drawLine({ bitmap: s.bits, attrs: s.attrs }, HIGH_SCORE_LINE, HIGH_SCORE_LINE.text + [...digits].map((d) => digitChar(Number(d))).join(''));
  return s;
}

/** The score line, five digits (units first, as the game keeps them) after `SCORE: `. */
function printScore(s: Screen, digits: readonly number[]): void {
  drawLine({ bitmap: s.bits, attrs: s.attrs }, SCORE_LINE, SCORE_LINE.text + [...digits].reverse().map(digitChar).join(''));
}

/** Where the verse is typed: the first glyph column of each line and the row of its top line (`$50C0`: cell row 22). */
const VERSE_TOP = 176;
/** The column every line starts at: the ending's (`$CB17`'s operand, 5) or game over's (`$F834` makes it 0). */
const ENDING_COLUMN = 5, OVER_COLUMN = 0;
/** The lines the scroll moves up: lines 64 to 190 each to the one above (`$CB69`: the row table's entries from y 127 down to 1). */
const SCROLL_FROM = 64, SCROLL_TO = 190;
/** The scroll after a verse line is this many lines, and this many more after every fourth line. */
const SCROLL_LINES = 10, SCROLL_EXTRA = 16;
/** A scroll takes two frames; the first line is drawn at the end of the second (the screen is cleared first). */
export const SCROLL_FRAMES = 2, TYPING_START = 3;
/** The wait after the verse for a key: 255 turns of two `HALT`s (`$F853`). */
export const WAIT_FRAMES = 510;

/**
 * The scroll copies its 127 lines one after the other, from the top, taking a frame and a half: what a frame shows when the scroll starts in it is the first of the lines
 * moved and the rest as they were. This many lines are moved by the end of the frame it starts in (measured on the original).
 */
export const FIRST_FRAME_LINES = 86;

interface Op {
  readonly at: number;
  /** a glyph code, or `SCROLL`, `SCROLL_REST` or `NEW_LINE` */
  readonly glyph: number;
}
const SCROLL = -1, SCROLL_REST = -3, NEW_LINE = -2;

/** What `$F817` (game over, yellow) and `$CAD1` (the ending, cyan) show, a frame at a time. */
export class VersePrinter {
  readonly screen = new Screen();
  /** the frame the typing is over at (the last scroll done): the wait for a key begins */
  readonly typingFrames: number;
  private readonly ops: Op[] = [];
  private frame = -1;
  private next = 0;
  private column: number;
  private readonly start: number;

  /** `ending`: the ending's verse and colour; else game over's. `digits`: the score, units first. */
  constructor(ending: boolean, digits: readonly number[]) {
    this.start = this.column = ending ? ENDING_COLUMN : OVER_COLUMN;
    const s = this.screen;
    s.attrs.fill(ending ? 0x45 : 0x46, 64, 704); // ($5840, 640 bytes: rows 2 to 21)
    printScore(s, digits);
    // the schedule: a glyph is drawn when the scrolls before it are done, a scroll is two frames
    const lines = ending ? ENDING_VERSE : GAME_OVER_VERSE;
    let t = TYPING_START, lineNumber = 0;
    let drawn = t;
    lines.forEach((text, i) => {
      for (const ch of text) this.ops.push({ at: drawn, glyph: codeOf(ch) });
      if (i === lines.length - 1) return; // (the text ends: `$FE`; the others end with `$FF`)
      lineNumber = (lineNumber + 1) & 3;
      const scrolls = SCROLL_LINES + (lineNumber === 0 ? SCROLL_EXTRA : 0);
      for (let k = 0; k < scrolls; k++) this.ops.push({ at: t, glyph: SCROLL }, { at: t + 1, glyph: SCROLL_REST }), t += SCROLL_FRAMES;
      drawn = t - 1; // (the last scroll is done in the frame after the one it began in, and the next line's glyphs are drawn then: the next scroll waits for the frame after)
      this.ops.push({ at: drawn, glyph: NEW_LINE }); // (the next line starts at the first column)
    });
    this.typingFrames = t;
  }

  /** The screen as it is after the next frame; false once the typing is over (and nothing changes any more). */
  step(): boolean {
    this.frame++;
    while (this.next < this.ops.length && (this.ops[this.next]?.at ?? Infinity) <= this.frame) {
      const op = this.ops[this.next++];
      if (op === undefined) break;
      if (op.glyph >= 0) this.draw(op.glyph);
      else if (op.glyph === SCROLL) this.scroll(SCROLL_FROM, SCROLL_FROM + FIRST_FRAME_LINES - 1);
      else if (op.glyph === SCROLL_REST) this.scroll(SCROLL_FROM + FIRST_FRAME_LINES, SCROLL_TO);
      else this.column = this.start;
    }
    return this.frame < this.typingFrames;
  }

  private draw(glyph: number): void {
    const rows = FONT.subarray(glyph * GLYPH_ROWS, (glyph + 1) * GLYPH_ROWS);
    for (let r = 0; r < GLYPH_ROWS; r++) this.screen.bits[bitmapRow(VERSE_TOP + r) + this.column] = rows[r] ?? 0;
    this.column++;
  }

  /** `$CB63`: lines `from` to `to` (of 64 to 190) each become the line below them. */
  private scroll(from: number, to: number): void {
    const bits = this.screen.bits;
    for (let line = from; line <= to; line++) {
      const from = bitmapRow(line), to = bitmapRow(line - 1);
      bits.copyWithin(to, from, from + 32);
    }
  }
}
