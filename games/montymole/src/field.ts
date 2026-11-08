/**
 * The Spectrum screen as the original keeps it, in the pieces its physics reads (re/README.md, "Drawing"): the **picture buffer**
 * (`$D260`: the room as drawn, nothing moving on it, plus what is printed at the room's start), the **screen** (`$4000`: the
 * picture with the sprites ORed on), and the colour attributes the screen shows (`$5800`) with the attribute buffer they are
 * copied from (`$CF54`). The buffers outlive a room: entering one redraws only the room's 20 rows, so what the two score and two
 * lives rows hold in the buffers is whatever was last printed there.
 *
 * Entering a room is `$9551` (game.ts `enter`): the room is drawn into the buffers (`drawRoom`: `$FDD5`, then the buffers are copied to the
 * screen, `$C62A`), the room's object is drawn and kept (`$952F`), the coal is drawn (`$95B3` clears the attribute buffer to the coal mask), the
 * score and the lives are printed, and the screen is copied back to the picture buffer (`keep`: `$D254`) so that all of it is part of the picture.
 */
import { DIGIT_BASE, GLYPH_CHARS } from './letters';
import { drawLine } from './font';
import { LIVES_LINE, OPENING_ATTRS, OPENING_COLS, OPENING_GLYPHS, OPENING_MAP, OPENING_ROWS, SCORE_LINE } from './data';
import { bitmapRow, drawRoom, ROOM_COLS, ROOM_ROWS, ROOM_TOP_ROW, type RoomData } from './room';

export const BITMAP_BYTES = 6144;
export const ATTR_BYTES = 768;

/** The character of a digit 0-9 as the font has it (the digit glyphs follow the letters). */
const digit = (n: number): string => GLYPH_CHARS.charAt(DIGIT_BASE + n);

export class Field {
  /** the picture buffer, `$D260` */
  readonly picture = new Uint8Array(BITMAP_BYTES);
  /** the screen's bitmap, `$4000` */
  readonly screen = new Uint8Array(BITMAP_BYTES);
  /** the screen's attributes, `$5800` */
  readonly attrs = new Uint8Array(ATTR_BYTES);
  /**
   * the attribute buffer, `$CF54`: the room is drawn into it and copied to the screen, and then `$95B3` (every pass) clears it to the
   * mask of the coal: `$FF` in the cell of each piece still there, 0 elsewhere
   */
  readonly coalMask = new Uint8Array(ATTR_BYTES);

  /**
   * `$FDD5` and `$C62A`: the room's rows drawn into the picture buffer and the attribute buffer, and both put on the screen. The two rows above and the two
   * below the room keep what they held (the picture buffer's; the attribute buffer's are 0, which `$95B3` left).
   */
  drawRoom(room: RoomData): void {
    const drawn = drawRoom(room);
    const staged = new Uint8Array(ATTR_BYTES);
    for (let row = ROOM_TOP_ROW; row < ROOM_TOP_ROW + ROOM_ROWS; row++) {
      for (let line = 0; line < 8; line++) {
        const at = bitmapRow(row * 8 + line);
        this.picture.set(drawn.bitmap.subarray(at, at + ROOM_COLS), at);
      }
      staged.set(drawn.attrs.subarray(row * ROOM_COLS, (row + 1) * ROOM_COLS), row * ROOM_COLS);
    }
    this.screen.set(this.picture);
    this.attrs.set(staged);
    this.coalMask.fill(0);
  }

  /**
   * `$CD73` to `$CD86`: the opening scene. The picture buffer is cleared and the scene's 28 x 20 cells drawn into it (`$EF7E`: columns 2-29 of rows 2-21, each cell a
   * glyph of the scene's own) with their colours in the attribute buffer, whose other cells keep what they held (the coal mask the last room left), and both are put on the
   * screen (`$C62A`).
   */
  drawOpening(): void {
    this.picture.fill(0);
    for (let r = 0; r < OPENING_ROWS; r++) {
      for (let c = 0; c < OPENING_COLS; c++) {
        const cell = r * OPENING_COLS + c;
        const glyph = ((OPENING_MAP[cell] ?? 0x80) - 0x80) * 8;
        const row = ROOM_TOP_ROW + r, col = 2 + c;
        for (let line = 0; line < 8; line++) this.picture[bitmapRow(row * 8 + line) + col] = OPENING_GLYPHS[glyph + line] ?? 0;
        this.coalMask[row * ROOM_COLS + col] = OPENING_ATTRS[cell] ?? 0;
      }
    }
    this.screen.set(this.picture);
    this.attrs.set(this.coalMask);
  }

  /** `$D254`: the screen's bitmap kept as the picture. */
  keep(): void {
    this.picture.set(this.screen);
  }

  /** `SCORE: ` and the five digits (the game keeps them units first), on the screen. */
  printScore(scoreDigits: readonly number[]): void {
    const text = SCORE_LINE.text + [...scoreDigits].reverse().map(digit).join('');
    drawLine({ bitmap: this.screen, attrs: this.attrs }, SCORE_LINE, text);
  }

  /** `LIVES: ` and the number left, on the screen (`$949E`). */
  printLives(lives: number): void {
    drawLine({ bitmap: this.screen, attrs: this.attrs }, LIVES_LINE, LIVES_LINE.text + digit(lives));
  }
}
