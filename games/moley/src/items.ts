/**
 * The things lying about in a room (`$85DA`, `$8643`): up to 8 per room, each a cell of the tile map with a picture ($EC-$EF) and
 * an ink that cycles (the item's attribute cell holds only the ink, 0-7). Monty takes one by being within 8 pixels of it at any
 * of his four corners: +35, effect 2, the item's picture goes (the map cell becomes $F0-$F3, which the next entry of the room
 * turns back into an item, so everything is there again after a death). The count is what the exits look at.
 */
import { MAP_COLUMNS, ROOM_SIZE } from './data';
import type { Random } from './random';
import type { Sprite, WritableTiles } from './stage';
import type { StateReader, StateWriter, Stateful } from './state';

export const ITEM_SCORE = 35;
/** The room's map cells that are items: $EC-$EF lying about, $F0-$F3 taken. */
const FIRST_ITEM = 0xec, FIRST_TAKEN = 0xf0, AFTER_TAKEN = 0xf4;
/** The attribute an item's cell gets when it is taken (`$8697`): white ink, bright. */
const TAKEN_ATTR = 0x47;
const MAX_ITEMS = 8;

/** One item: where it is in pixels, and its cell (an index into the room's map and attributes), or -1 once it is taken. */
export interface ItemRecord {
  x: number;
  y: number;
  cell: number;
}

/** Whether two points are less than 8 pixels apart both ways (`$86F7`). */
const near = (ax: number, ay: number, bx: number, by: number): boolean => Math.abs(ax - bx) < 8 && Math.abs(ay - by) < 8;

export class Items implements Stateful {
  readonly records: ItemRecord[] = Array.from({ length: MAX_ITEMS }, () => ({ x: 0, y: 0, cell: -1 }));
  /** how many lie in the room (`$86F5`) */
  left = 0;

  /**
   * Entering a room: look through its map for items. Taken ones come back; each gets a random ink (`LD A,R; AND 7`, in the order
   * the cells are met).
   */
  scan(tiles: WritableTiles, attrs: Uint8Array, rng: Random): void {
    for (const r of this.records) { r.x = 0; r.y = 0; r.cell = -1; }
    this.left = 0;
    let slot = 0;
    for (let cell = 0; cell < ROOM_SIZE; cell++) {
      const at = tiles.base + cell;
      const tile = tiles.memory[at];
      if (tile < FIRST_ITEM || tile >= AFTER_TAKEN) continue;
      if (tile >= FIRST_TAKEN) tiles.memory[at] = tile - 4;
      this.left++;
      attrs[cell] = rng.byte() & 7;
      const record = this.records[slot++];
      if (record === undefined) throw new Error(`room has more than ${MAX_ITEMS} items`);
      record.x = (cell % MAP_COLUMNS) * 8;
      record.y = Math.floor(cell / MAP_COLUMNS) * 8;
      record.cell = cell;
    }
  }

  /**
   * Each pass, after the script (`$8643`): every item's ink moves on one, and one within reach of Monty is taken. `taken` is told
   * (the score and the sound belong to the game).
   */
  collect(monty: Sprite, tiles: WritableTiles, attrs: Uint8Array, taken: () => void): void {
    for (const r of this.records) {
      if (r.cell < 0) continue;
      attrs[r.cell] = (attrs[r.cell] + 1) & 7;
      const x = monty.x, y = monty.y;
      const reached = near(r.x, r.y, x, y) || near(r.x, r.y, (x + 8) & 0xff, y)
        || near(r.x, r.y, x, (y + 8) & 0xff) || near(r.x, r.y, (x + 8) & 0xff, (y + 8) & 0xff);
      if (!reached) continue;
      taken();
      attrs[r.cell] = TAKEN_ATTR;
      tiles.memory[tiles.base + r.cell] += 4;
      r.cell = -1;
      this.left--;
    }
  }

  save(w: StateWriter): void {
    w.put(this.left);
    for (const r of this.records) w.put(r.x, r.y, r.cell);
  }

  load(r: StateReader): void {
    this.left = r.get();
    for (const rec of this.records) { rec.x = r.get(); rec.y = r.get(); rec.cell = r.get(); }
  }
}
