/**
 * The room Monty is in as the physics sees it, and the world around it.
 *
 * The cells are the 32 x 18 buffer the room unpacker leaves at $0800 ($58D4): the physics reads this,
 * never the screen. The world is the 16 x 15 grid at $45AD; the game walks a pointer along it as Monty
 * leaves a room ($4E66), reading the neighbours at -1, +1, -16 and +16.
 */
import { COLS, ROWS, unpackCells, type Room } from './room';

/** One look into the cells ($4F38). */
export interface Look {
  /** The tile's name (the byte the physics works with), 0 for an empty cell, an item or animated cell, or a name in $B0-$B3. */
  readonly name: number;
  /** The cell's code when it is $10 or more (items $2F-$3E, animated $6D-$75, burning $77); else 0. */
  readonly code: number;
}

const EMPTY: Look = { name: 0, code: 0 };

export const GRID_COLS = 16;

export class World {
  /** The room number ($402B). */
  room: number;
  /** Where the room is in the grid (the pointer in $07/$08, as an index into the 240 bytes). */
  gridIndex: number;
  /** The 576 cells, row-major (no snake), as the physics reads them. Burning and burnt tiles change them. */
  cells: Uint8Array;
  private names: readonly number[];

  constructor(private readonly rooms: readonly Room[], private readonly grid: Uint8Array, private readonly noRoom: number, room: number) {
    this.room = room;
    this.names = [];
    this.cells = new Uint8Array(COLS * ROWS);
    this.gridIndex = 0;
    this.enter(room);
    this.locate();
  }

  /** The room's cells afresh ($5581 with $58D4; the items are not put in, they are stage 3). */
  enter(room: number): void {
    const data = this.rooms[room];
    if (!data) throw new Error(`no room ${room}`);
    this.room = room;
    this.names = data.names;
    this.cells = unpackCells(data);
  }

  /** The pointer on the grid found from the room number ($5B1F: searched from the grid's end; no room appears twice). */
  locate(): void {
    const at = this.grid.lastIndexOf(this.room);
    this.gridIndex = at < 0 ? 0 : at;
  }

  /** The cell at a pixel place of the play area ($4F38: y of $8F or more is empty). */
  look(x: number, y: number): Look {
    const px = x & 0xff, py = y & 0xff;
    if (py >= 0x8f) return EMPTY;
    const c = this.cells[(py >> 3) * COLS + (px >> 3)] ?? 0;
    if (c === 0) return EMPTY;
    if (c >= 0x10) return { name: 0, code: c };
    const name = this.names[c - 1] ?? 0;
    return { name: name >= 0xb0 && name < 0xb4 ? 0 : name, code: 0 };
  }

  /** Put a code into the cell at a pixel place ($5297). Out of the play area the original writes into whatever follows the buffer; here nothing happens. */
  put(x: number, y: number, code: number): void {
    const px = x & 0xff, py = y & 0xff;
    const at = (py >> 3) * COLS + (px >> 3);
    if (at < this.cells.length) this.cells[at] = code;
  }

  /** The room number at a grid index, or the "no room" mark outside the grid (where the original reads other bytes that are never a room Monty can reach). */
  private roomAt(index: number): number {
    return index >= 0 && index < this.grid.length ? this.grid[index] ?? this.noRoom : this.noRoom;
  }

  /** The neighbour in a direction, `noRoom` when there is none. */
  neighbour(dir: 'left' | 'right' | 'up' | 'down'): number {
    const offset = dir === 'left' ? -1 : dir === 'right' ? 1 : dir === 'up' ? -GRID_COLS : GRID_COLS;
    return this.roomAt(this.gridIndex + offset);
  }

  /** Move the pointer to the neighbour (the game does this when it enters it). */
  stepGrid(dir: 'left' | 'right' | 'up' | 'down'): void {
    this.gridIndex += dir === 'left' ? -1 : dir === 'right' ? 1 : dir === 'up' ? -GRID_COLS : GRID_COLS;
  }

  readonly isNoRoom = (room: number): boolean => room === this.noRoom;
}
