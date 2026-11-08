import { ROOM_COLS, ROOM_ROWS } from '../../montymole/src/room';

/**
 * The changes to Wanted's layout that Monty on the Run's Monty calls for (docs/montymole-remix-plan.md, "Jumps, and every room still
 * passable"): never to the physics, always to the cells of a room, each one justified. The passability bot (test/passable.ts) found them;
 * `QOL.md` lists them.
 */

/** What a cell is made of, as retile.ts has it: its tile's class (0 none, 1 solid, 2 holds from above, 3 rope, 4 deadly) by code. */
export type ClassOf = (code: number) => number;

/**
 * **What is under the water is water.** In Wanted anything of Monty's that touches a deadly colour kills him: water is a thing he cannot be
 * in, whatever is under it. In Monty on the Run it is the cell under his feet that kills (a hazard floor), so water over a solid floor (the
 * bottoms of the pipe and castle caverns, rooms 12 to 16, and the shallows of 8 to 11 and 15) could be waded along inside, at his own
 * height, with the solid under the water holding him up: a way across every lake that Wanted does not have. Every solid cell under a
 * deadly one, down the column to the end of the solid, is made the same deadly tile, so that nothing holds him up inside the water and he
 * is where the original has him dead (a lake one cell deep over a floor is a lake to the room's bottom). Reads the cells as they were.
 */
export function waterBeds(cells: Uint8Array, classOf: ClassOf): number[] {
  const beds: number[] = [];
  for (let c = 0; c < ROOM_COLS; c++) {
    for (let r = 0; r < ROOM_ROWS - 1; r++) {
      if (classOf(cells[r * ROOM_COLS + c] ?? 0) !== 4) continue;
      for (let k = r + 1; k < ROOM_ROWS && classOf(cells[k * ROOM_COLS + c] ?? 0) === 1; k++) beds.push(k * ROOM_COLS + c);
    }
  }
  return beds;
}

/**
 * The pieces of coal that a fix moves by a cell or more (`rows`): none yet. Monty touches a piece when it is in the two by two cells of his box
 * (as Monty on the Run's coins are); Wanted takes it when a point of his box, to the pixel, is in the piece's cell, so a piece that Wanted
 * reaches standing on something that is a platform to the pixel (a crusher's head) can be a row out of the reach of the cells. The bot
 * (test/passable.ts) says which; a move goes here with the reason.
 */
export interface CoalMove { readonly room: number; readonly id: number; readonly rows: number; readonly why: string }
export const COAL_MOVES: readonly CoalMove[] = [];

/** A room's pieces of coal (the id, the cell: row 0 is the room's first), the moves above made. */
export function coalOf(room: { readonly id: number; readonly coal: readonly { readonly id: number; readonly col: number; readonly row: number }[] }, firstRow: number): { id: number; col: number; row: number }[] {
  return room.coal
    .filter((k) => k.col !== 0 || k.row !== 0)
    .map((k) => ({ id: k.id, col: k.col, row: k.row - firstRow + (COAL_MOVES.find((m) => m.room === room.id && m.id === k.id)?.rows ?? 0) }));
}
