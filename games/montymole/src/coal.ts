/**
 * The coal: 64 pieces in the whole game (five a room at most), each with a flag byte (`$964D + id`): bit 7 says the piece is still there,
 * the low 7 bits are what it scores (the bytes are leftovers of the programmer's assembler source, which is why some are worth 65 and 90).
 * A piece is drawn in its cell as the room's piece picture turned inside out (`$960F`), and its cell's attribute is changed each pass
 * (`$95B3` runs every pass: the paper goes one step on, the ink goes black: the piece flickers through the colours). The attribute buffer
 * `$CF54` is cleared by that routine and set to `$FF` in the cell of each piece there: the mask `$935C` looks at.
 */
import { COAL_COUNT, COAL_FLAGS } from './data';
import type { Field } from './field';
import { bitmapRow, ROOM_COLS, type RoomData } from './room';
import { Score } from './score';
import type { StateReader, StateWriter, Stateful } from '../../shared/state';

export const STILL_THERE = 0x80;
const wrap = (n: number): number => n & 0xff;

/** What collecting did, for the sound and the tests: the piece's number and its worth. */
export interface Collected { readonly id: number; readonly points: number }

export class Coal implements Stateful {
  /** the flag bytes: a new game starts them as the tape has them with every bit 7 set (what the opening scene does) */
  readonly flags: number[] = Array.from(COAL_FLAGS, (f) => f | STILL_THERE);

  /** How many pieces have been taken (the flags with bit 7 clear). */
  get taken(): number { return this.flags.filter((f) => (f & STILL_THERE) === 0).length; }

  /** `$95B3`: clear the mask and, for each of the room's pieces still there, change its cell's attribute, mark the mask and draw the piece. */
  draw(field: Field, room: RoomData): void {
    field.coalMask.fill(0);
    for (const piece of room.coal) {
      if (((this.flags[piece.id] ?? 0) & STILL_THERE) === 0 || (piece.col === 0 && piece.row === 0)) continue;
      const cell = piece.row * ROOM_COLS + piece.col;
      field.attrs[cell] = ((((field.attrs[cell] ?? 0) | 7) + 1) & 0x78); // $95E8
      field.coalMask[cell] = 0xff;
      this.drawPiece(field, room, piece.col, piece.row, false);
    }
  }

  /** `$960F`: the piece's 8 rows, each turned inside out, in the cell (column, row), on the screen and in the picture buffer; `erase` draws it as `$96AA` does, from rows of ones: nothing. */
  private drawPiece(field: Field, room: RoomData, col: number, row: number, erase: boolean): void {
    for (let k = 0; k < 8; k++) {
      const at = bitmapRow(row * 8 + k) + col;
      const byte = (~(erase ? 0xff : (room.nugget[k] ?? 0))) & 0xff;
      field.picture[at] = byte;
      field.screen[at] = byte;
    }
  }

  /**
   * `$935C`: Monty against the mask: eight points of his box (his top corners and middle, the middle of each side, and three on the row below his feet) are
   * looked up in the mask (`$9258`: the cell of a pixel); the first that is in a piece takes it: the mask cell and the cell's attribute go back to the room's blank
   * tile's, the piece's flag loses bit 7 and its worth is added to the score, and the piece is drawn away (`$96AA`). Returns what was taken.
   */
  collect(field: Field, room: RoomData, x: number, y: number, score: Score): Collected | null {
    const feet = wrap(y - 16);
    const points: readonly (readonly [number, number])[] = [
      [x, y], [wrap(x + 7), y], [wrap(x + 15), y], [x, wrap(y - 8)], [wrap(x + 15), wrap(y - 8)],
      [x, feet], [wrap(x + 8), feet], [wrap(x + 15), feet],
    ];
    for (const [px, py] of points) {
      const col = px >> 3;
      const row = wrap(0x18 - (py >> 3) - 1); // `$9258`: counted down from the top of the screen
      const cell = row * ROOM_COLS + col;
      if ((field.coalMask[cell] ?? 0) === 0) continue;
      field.coalMask[cell] = 0;
      field.attrs[cell] = room.tiles[0]?.attr ?? 0;
      const piece = room.coal.find((p) => p.col === col && p.row === row);
      if (piece === undefined) throw new Error(`room ${room.id}: a piece of coal in cell ${col}, ${row} that its list does not have`);
      this.flags[piece.id] = (this.flags[piece.id] ?? 0) & ~STILL_THERE;
      const points = (this.flags[piece.id] ?? 0) & 0x7f;
      score.add(points);
      this.drawPiece(field, room, col, row, true);
      return { id: piece.id, points };
    }
    return null;
  }

  save(w: StateWriter): void { w.put(...this.flags); }

  load(r: StateReader): void {
    for (let i = 0; i < COAL_COUNT; i++) this.flags[i] = r.get();
  }
}
