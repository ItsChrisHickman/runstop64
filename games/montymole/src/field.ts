/**
 * The Spectrum screen as the original keeps it, in the pieces its physics reads (re/README.md, "Drawing"): the **picture buffer**
 * (`$D260`: the room as drawn, nothing moving on it, plus what is printed at the room's start), the **screen** (`$4000`: the
 * picture with the sprites ORed on), and the colour attributes the screen shows (`$5800`) with the attribute buffer they are
 * copied from (`$CF54`). The buffers outlive a room: entering one redraws only the room's 20 rows, so what the two score and two
 * lives rows hold in the buffers is whatever was last printed there.
 *
 * Entering a room is `$9551`: the room is drawn into the buffers (`$FDD5`), the buffers are copied to the screen (`$C62A`), the
 * room's object and coal are drawn on the screen (`$95B3` clears the attribute buffer to the coal mask), the score and the lives are printed, and the screen is copied back to the picture
 * buffer (`$D254`) so that all of it is part of the picture.
 */
import { DIGIT_BASE, GLYPH_CHARS } from './letters';
import { drawLine } from './font';
import { LIVES_LINE, SCORE_LINE } from './data';
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
   * Enter a room (`$9551`): the room's rows drawn into the buffers, the buffers put on the screen, then the score and the lives
   * printed and the screen kept as the picture. `score` is five digits, units first, as the game keeps it.
   */
  enter(room: RoomData, scoreDigits: readonly number[], lives: number): void {
    const drawn = drawRoom(room);
    const staged = new Uint8Array(ATTR_BYTES); // (the attribute buffer, as `$FDD5` fills it: the two rows above and below the room are what the buffer held, which `$95B3` left 0)
    for (let row = ROOM_TOP_ROW; row < ROOM_TOP_ROW + ROOM_ROWS; row++) {
      for (let line = 0; line < 8; line++) {
        const at = bitmapRow(row * 8 + line);
        this.picture.set(drawn.bitmap.subarray(at, at + ROOM_COLS), at);
      }
      staged.set(drawn.attrs.subarray(row * ROOM_COLS, (row + 1) * ROOM_COLS), row * ROOM_COLS);
    }
    this.screen.set(this.picture);
    this.attrs.set(staged);
    this.coalMask.fill(0); // ($95B3: no coal yet)
    this.printScore(scoreDigits);
    this.printLives(lives);
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
