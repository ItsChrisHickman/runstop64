/**
 * The crusher (`$8DCD`, from the interrupt routine, 50 times a second): a 24 x 9 thing that goes up the room's column and down it again.
 * The room's record (`$C527`) is six bytes: the column (a cell, not a pixel), the row it is at (y, counted up: 2 a step), the lowest and the
 * highest y, a wait, and a direction (bit 0 set: going down). A column and a y that are both 0 are no crusher. While it waits the wait counts
 * down. Going up it moves 2 and is drawn until it passes its highest y; then it turns, waiting a random 1 to 128 steps. Going down it first looks
 * at the row under its base (`$9148`: three bytes of the screen against the picture buffer: Monty's pixels there are a death), then moves 2 and is
 * drawn until it reaches its lowest y; there it turns, with a thud. It is drawn into the picture buffer as well as the screen (a part of the room:
 * Monty stands on it), and its three cells' bright bits are set and cleared.
 */
import { CrusherRule, type CrusherStep } from './crusher-rules';
import { CRUSHER_DOWN, CRUSHER_PICTURES, CRUSHER_UP, screenOffset } from './data';
import type { Field } from './field';
import type { Random } from './random';

export type { CrusherStep };
const wrap = (n: number): number => n & 0xff;

/** The crusher as the Spectrum's screen shows it (the record and what a step does with it are src/crusher-rules.ts). */
export class Crusher extends CrusherRule {
  /** `$8DCD`. */
  step(field: Field, random: Random): CrusherStep {
    return this.advance({ random, touches: () => this.touches(field), draw: () => this.draw(field) });
  }

  /** `$9148`: whether anything is on the screen, but not in the picture, in the three bytes of the row under the base (`y - 9`). */
  private touches(field: Field): boolean {
    const at = screenOffset(wrap(this.y - 9)) + this.column;
    let bits = 0;
    for (let i = 0; i < 3; i++) bits |= (field.screen[at + i] ?? 0) ^ (field.picture[at + i] ?? 0);
    return bits !== 0;
  }

  /** `$8E2C`: its 9 rows into the picture buffer and the screen, from row y down, and the bright bits (`$8E9B`). */
  private draw(field: Field): void {
    const from = (this.direction & 1) !== 0 ? CRUSHER_DOWN : CRUSHER_UP;
    for (let row = 0; row < 9; row++) {
      const at = screenOffset(wrap(this.y - row)) + this.column;
      for (let i = 0; i < 3; i++) {
        const byte = CRUSHER_PICTURES[from + row * 3 + i] ?? 0;
        field.picture[at + i] = byte;
        field.screen[at + i] = byte;
      }
    }
    // `$8E9B`: the cell row of the pixel row y - 8; going down the first cell is made bright and the next two not, going up the three cells below are made bright
    const cell = (23 - (wrap(this.y - 8) >> 3)) * 32 + this.column;
    if ((this.direction & 1) !== 0) {
      field.attrs[cell] = (field.attrs[cell] ?? 0) | 0x40;
      field.attrs[cell + 1] = (field.attrs[cell + 1] ?? 0) & 0xbf;
      field.attrs[cell + 2] = (field.attrs[cell + 2] ?? 0) & 0xbf;
    } else {
      for (let i = 0; i < 3; i++) field.attrs[cell + 32 + i] = (field.attrs[cell + 32 + i] ?? 0) | 0x40;
    }
  }
}
