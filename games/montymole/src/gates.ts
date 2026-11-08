/**
 * The four gates that open with the coal (`$F64D`, `$F6A6`, `$F71A`, from the interrupt routine): when exactly 16, 32, 48 or 64 pieces have been taken, a wall
 * of the room that belongs to that number (room 6, 11, 15, 20) is cleared one pixel row of its cells at a step, eight steps, and its cells' attributes set to the
 * room's blank tile's. Only if Monty is in that room when the count is reached: elsewhere the gate is marked done at once and stays as the room draws it. The
 * routine keeps a byte (`$F7D1`): bit 0 "open it now", bits 5, 4, 3, 2 the first, second, third and fourth gate done; and a counter (`$F7D4`) of its steps.
 */
import { screenOffset } from './data';
import type { Field } from './field';
import type { RoomData } from './room';
import type { StateReader, StateWriter, Stateful } from '../../shared/state';

const wrap = (n: number): number => n & 0xff;

/** A gate: the count that opens it, its room, the bit that says it is done, and its place: the column, the pixel row of the top of the lowest cell and how many cells high. */
export interface Gate {
  readonly count: number;
  readonly room: number;
  readonly done: number;
  readonly y: number;
  readonly column: number;
  readonly cells: number;
}
/** Where the code has them: `$F64D` (the counts and rooms) and `$F6A6` (`$9710`, `$8F14`, `$471F`, `$7718`: row y, column; the cell counts 7, 5, 5, 4). */
export const GATES: readonly Gate[] = [
  { count: 0x10, room: 6, done: 0x20, y: 0x97, column: 0x10, cells: 7 },
  { count: 0x20, room: 11, done: 0x10, y: 0x8f, column: 0x14, cells: 5 },
  { count: 0x30, room: 15, done: 0x08, y: 0x47, column: 0x1f, cells: 5 },
  { count: 0x40, room: 20, done: 0x04, y: 0x77, column: 0x18, cells: 4 },
];
const OPENING = 0x01;

/** The next gate to open when `taken` pieces are taken (the first whose count is not yet reached), or null once all four count as reached. */
export function nextGate(taken: number): Gate | null {
  return GATES.find((g) => g.count > taken) ?? null;
}

export class Gates implements Stateful {
  /** `$F7D1` */
  flags = 0;
  /** `$F7D4`: the step the opening is at, 0-7 */
  step = 0;
  /** `$F7D5`: the count of pieces taken the last time it was counted */
  counted = 0;

  /** `$F64D` then `$F6A6`: count the pieces taken and open the gate of the room Monty is in. `taken` is how many coal flags have bit 7 clear. */
  run(field: Field, room: RoomData, taken: number): void {
    this.counted = taken;
    const gate = GATES.find((g) => g.count === taken);
    if (gate !== undefined) this.flags |= gate.room === room.id ? OPENING : gate.done;
    const mine = GATES.find((g) => g.room === room.id);
    if (mine === undefined) { this.flags &= 0x3c; return; } // `$F6F4`: in any other room the "open it now" bit (and the two above) are cleared
    if ((this.flags & mine.done) !== 0) return;
    if ((this.flags & OPENING) !== 0) this.open(field, room, mine);
  }

  /** `$F71A`: one pixel row of the gate's cells cleared (from the bottom up, `y - step`, in each of its cells, one byte), then, after the eighth, the attributes. */
  private open(field: Field, room: RoomData, gate: Gate): void {
    for (let cell = 0; cell < gate.cells; cell++) {
      const at = screenOffset(wrap(gate.y - this.step - 8 * cell)) + gate.column;
      field.screen[at] = 0;
      field.picture[at] = 0;
    }
    this.step = (this.step + 1) & 7;
    if (this.step !== 0) return;
    // `$F6FD`: the room's blank colour on the gate's cells, a column from y down
    const first = wrap(0xbf - gate.y) * 4 + gate.column; // (the row of cells, times 32: `(191 - y) * 4`)
    for (let cell = 0; cell < gate.cells; cell++) field.attrs[first + cell * 32] = room.tiles[0]?.attr ?? 0;
    this.flags &= ~OPENING;
    this.flags |= gate.done;
  }

  save(w: StateWriter): void { w.put(this.flags, this.step, this.counted); }

  load(r: StateReader): void { this.flags = r.get(); this.step = r.get(); this.counted = r.get(); }
}
