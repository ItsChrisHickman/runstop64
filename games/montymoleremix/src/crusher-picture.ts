import { CRUSHER_DOWN, CRUSHER_PICTURES, CRUSHER_UP } from '../../montymole/src/data';
import { ROOM_ROWS } from '../../montymole/src/room';
import { cellRow, WANTED_TOP } from './coords';

/**
 * The crusher's picture as the original keeps it (`$8E2C`): it is not a thing that moves but a picture drawn over the room, nine rows of
 * three bytes from its y down, each step. The two pictures overlap in the original's code (`CRUSHER_DOWN`, `CRUSHER_UP`: eleven rows of
 * which each shows nine); going down, its top rows are the shaft, and the rows it passes keep the shaft it leaves, so the shaft runs from
 * where the crusher starts (just under the ceiling) down to the head; going up, the picture ends in blank rows that wipe the shaft
 * away behind the head. Nothing else draws or erases it: a row it has not written is the room's.
 *
 * This is that picture, kept as the original keeps it: a layer of three bytes for each of the Spectrum's 192 lines, `-1` where it has
 * written nothing, and the cell's brightness the original sets and clears with it (`$8E9B`). The game turns it into characters.
 */

/** Columns of the picture, and the lines of the screen it can be drawn on. */
export const CRUSHER_COLUMNS = 3;
const LINES = 192;
const HEIGHT = 9;

export class CrusherPicture {
  /** the bytes written, by Wanted's line y (counted up) and column; -1: none */
  private readonly bytes = new Int16Array(LINES * CRUSHER_COLUMNS).fill(-1);
  /** the cells' brightness it has set, by room row and column; -1: as the room has it */
  private readonly bright = new Int8Array(ROOM_ROWS * CRUSHER_COLUMNS).fill(-1);
  /** the room rows holding a line it has written (kept so a draw looks only there) */
  private first = ROOM_ROWS;
  private last = -1;

  /** In the state of another. */
  copyFrom(o: CrusherPicture): void {
    this.bytes.set(o.bytes);
    this.bright.set(o.bright);
    this.first = o.first;
    this.last = o.last;
  }

  clear(): void {
    this.bytes.fill(-1);
    this.bright.fill(-1);
    this.first = ROOM_ROWS;
    this.last = -1;
  }

  /** `$8E2C`: its nine rows from line `y` down, and the bright bits of `$8E9B`. */
  put(y: number, down: boolean): void {
    const from = down ? CRUSHER_DOWN : CRUSHER_UP;
    for (let row = 0; row < HEIGHT; row++) {
      const line = (y - row) & 0xff;
      if (line >= LINES) continue;
      for (let i = 0; i < CRUSHER_COLUMNS; i++) this.bytes[line * CRUSHER_COLUMNS + i] = CRUSHER_PICTURES[from + row * CRUSHER_COLUMNS + i] ?? 0;
      const r = cellRow(line);
      if (r >= 0 && r < ROOM_ROWS) { this.first = Math.min(this.first, r); this.last = Math.max(this.last, r); }
    }
    const cell = cellRow((y - 8) & 0xff);
    const set = (r: number, i: number, on: number) => { if (r >= 0 && r < ROOM_ROWS) this.bright[r * CRUSHER_COLUMNS + i] = on; };
    if (down) {
      set(cell, 0, 1);
      set(cell, 1, 0);
      set(cell, 2, 0);
    } else for (let i = 0; i < CRUSHER_COLUMNS; i++) set(cell + 1, i, 1);
  }

  /** The room rows a cell may be in. */
  get rows(): { first: number; last: number } { return { first: this.first, last: this.last }; }

  /** The eight rows of the cell at a room row and column over the room's own (`under`); null where nothing of it is written. */
  cell(row: number, column: number, under: Uint8Array): Uint8Array | null {
    let any = false;
    const out = new Uint8Array(8);
    for (let k = 0; k < 8; k++) {
      const b = this.bytes[(WANTED_TOP - row * 8 - k) * CRUSHER_COLUMNS + column] ?? -1;
      if (b >= 0) any = true;
      out[k] = b >= 0 ? b : under[k] ?? 0;
    }
    return any ? out : null;
  }

  /** The byte it has written at a Wanted line in a column (0-2); -1 where it has written nothing (the tests compare it with the original's picture). */
  written(line: number, column: number): number { return this.bytes[line * CRUSHER_COLUMNS + column] ?? -1; }

  /** The brightness the original has given a cell: 1, 0, or -1 (the room's). */
  brightAt(row: number, column: number): number { return this.bright[row * CRUSHER_COLUMNS + column] ?? -1; }
}
