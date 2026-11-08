/**
 * The retractable floor ("the constantly disappearing floor", `$8F31`, from the interrupt routine, 50 times a second) as the Spectrum's screen shows it:
 * its pieces are columns of three pixels in the picture buffer and the screen (src/floor-rules.ts says where they go and when). Monty stands on what is
 * drawn: it is in the buffer.
 */
import { screenOffset } from './data';
import type { Field } from './field';
import { FloorRule } from './floor-rules';

export class Floor extends FloorRule {
  /** `$8F31`. */
  step(field: Field): void {
    this.advance((x, y, draw) => this.place(field, x, y, draw));
  }

  /** `$905C`: the column of three pixels at (x, y) put into (`draw`) or cleared from the picture buffer and the screen. */
  private place(field: Field, x: number, y: number, draw: boolean): void {
    const mask = 0x80 >> (x & 7);
    const first = screenOffset(y) + (x >> 3);
    for (let line = 0; line < 3; line++) {
      const a = first + line * 256; // (`INC H`: the next pixel line of the cell)
      field.picture[a] = draw ? (field.picture[a] ?? 0) | mask : (field.picture[a] ?? 0) & ~mask & 0xff;
      field.screen[a] = draw ? (field.screen[a] ?? 0) | mask : (field.screen[a] ?? 0) & ~mask & 0xff;
    }
  }
}
