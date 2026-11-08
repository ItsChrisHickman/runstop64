/**
 * The conveyors and the water (rooms 8, 9, 10 and 11, `$8FC7` on, from the interrupt routine): a run of bytes on three pixel lines of the screen is turned one bit
 * left each step: the first byte of each line is rotated left and the rest of the run is made equal to it (`$90A8`). The runs' bytes are all the same in the room as it
 * is drawn, so it looks like a pattern running along; only the screen is changed (the picture buffer keeps the room as it was). Nothing carries Monty along:
 * no code reads them but the interrupt routine (test/lockstep.ts has him stand on them), and the touch test of his six points never lands on a run.
 */
import { screenOffset } from './data';
import type { Field } from './field';

/** A run: the pixel row of its top line (counted up, as the row table `$EA60` is) and the byte it starts at in that row, and how many bytes it has. */
export interface Run {
  readonly y: number;
  readonly start: number;
  readonly bytes: number;
}

/** The runs of each room, as `$8FC7-$9045` asks for them (the row table's entries `$EA9A`, `$EAAA`, `$EACA`, `$EB1A`, `$EB2A` are y 29, 37, 53, 93, 101). */
export const CONVEYORS: ReadonlyMap<number, readonly Run[]> = new Map([
  [8, [{ y: 37, start: 11, bytes: 5 }]],
  [9, [{ y: 53, start: 14, bytes: 18 }]],
  [10, [{ y: 53, start: 0, bytes: 20 }]],
  [11, [
    { y: 37, start: 6, bytes: 3 }, { y: 29, start: 12, bytes: 6 }, { y: 37, start: 21, bytes: 3 },
    { y: 37, start: 27, bytes: 2 }, { y: 101, start: 21, bytes: 2 }, { y: 93, start: 24, bytes: 3 },
  ]],
]);

/** `$90A8`: one run turned one bit on its three lines. */
export function turnRun(field: Field, run: Run): void {
  for (let line = 0; line < 3; line++) {
    const at = screenOffset(run.y) + run.start + line * 256;
    const first = field.screen[at] ?? 0;
    const turned = ((first << 1) | (first >> 7)) & 0xff;
    for (let i = 0; i < run.bytes; i++) field.screen[at + i] = turned;
  }
}

/** `$8FC7`: every run of room `room` turned one bit. */
export function turnConveyors(field: Field, room: number): void {
  for (const run of CONVEYORS.get(room) ?? []) turnRun(field, run);
}
