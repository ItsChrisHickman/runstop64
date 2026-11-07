/**
 * The retractable floor ("the constantly disappearing floor", `$8F31`, from the interrupt routine, 50 times a second): a bar of pixels that grows from both
 * ends towards the middle one pixel a step and then shrinks again. The room's record (`$C622`, seven bytes) is two pieces: the left (x1, y1: `+0`, `+1`) and the
 * right (x2, y2: `+4`, `+5`), the left's lowest x (`+2`) and highest x (`+3`), and a byte (`+6`) whose bit 7 says which way it is going (0 growing, 1 shrinking). A piece
 * with x and y both 0 is none. Growing, the left end moves right and the right end left, each putting a column of three pixels (one pixel wide, from row y down)
 * into the picture buffer and the screen, until the left end reaches its highest x; then it turns (and on the same step starts shrinking: the same step
 * the other way, clearing the columns). Shrinking ends at the left's lowest x. Monty stands on what is drawn: it is in the buffer.
 */
import { screenOffset } from './data';
import type { Field } from './field';
import type { RoomData } from './room';
import type { StateReader, StateWriter, Stateful } from '../../shared/state';

const wrap = (n: number): number => n & 0xff;

export class Floor implements Stateful {
  /** the seven bytes of the record (`$C622`): x1, y1, lowest, highest, x2, y2, flags */
  readonly b = [0, 0, 0, 0, 0, 0, 0];

  /** A new copy of the room's record (`$94C3`). */
  enter(room: RoomData): void {
    this.fromBytes(room.floor);
  }

  fromBytes(bytes: readonly number[]): void {
    for (let i = 0; i < 7; i++) this.b[i] = bytes[i] ?? 0;
  }

  toBytes(): number[] {
    return [...this.b];
  }

  /** `$8F31`. */
  step(field: Field): void {
    const b = this.b;
    if ((b[6] ?? 0) & 0x80) { this.shrinking(field); return; }
    this.growing(field);
  }

  /** `$8F3B`: growing; at the end of the bar it turns and goes straight on into `shrinking`. */
  private growing(field: Field): void {
    const b = this.b;
    if (((b[0] ?? 0) | (b[1] ?? 0)) === 0) return;
    if ((b[3] ?? 0) !== (b[0] ?? 0)) {
      b[0] = wrap((b[0] ?? 0) + 1);
      this.piece(field, 0, true);
      b[4] = wrap((b[4] ?? 0) - 1);
      this.piece(field, 4, true);
      return;
    }
    b[6] = (b[6] ?? 0) ^ 0x80;
    b[0] = wrap((b[0] ?? 0) + 1);
    b[4] = wrap((b[4] ?? 0) - 1);
    this.shrinking(field);
  }

  /** `$8F6D`: shrinking; at its lowest x it turns and goes straight on into `growing`. */
  private shrinking(field: Field): void {
    const b = this.b;
    if (((b[4] ?? 0) | (b[5] ?? 0)) === 0) return;
    if ((b[2] ?? 0) !== (b[0] ?? 0)) {
      b[0] = wrap((b[0] ?? 0) - 1);
      this.piece(field, 0, false);
      b[4] = wrap((b[4] ?? 0) + 1);
      this.piece(field, 4, false);
      return;
    }
    b[6] = (b[6] ?? 0) ^ 0x80;
    b[0] = wrap((b[0] ?? 0) - 1);
    b[4] = wrap((b[4] ?? 0) + 1);
    this.growing(field);
  }

  /** `$905C`: the column of three pixels of the piece at `b[at]`, `b[at + 1]` put into (`draw`) or cleared from the picture buffer and the screen. */
  private piece(field: Field, at: number, draw: boolean): void {
    const x = this.b[at] ?? 0, y = this.b[at + 1] ?? 0;
    if ((x | y) === 0) return;
    const mask = 0x80 >> (x & 7);
    const first = screenOffset(y) + (x >> 3);
    for (let line = 0; line < 3; line++) {
      const a = first + line * 256; // (`INC H`: the next pixel line of the cell)
      field.picture[a] = draw ? (field.picture[a] ?? 0) | mask : (field.picture[a] ?? 0) & ~mask & 0xff;
      field.screen[a] = draw ? (field.screen[a] ?? 0) | mask : (field.screen[a] ?? 0) & ~mask & 0xff;
    }
  }

  save(w: StateWriter): void { w.put(...this.b); }

  load(r: StateReader): void {
    for (let i = 0; i < 7; i++) this.b[i] = r.get();
  }
}
