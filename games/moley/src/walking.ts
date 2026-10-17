/**
 * Moving sideways on the room's tiles, written once for everything that walks: Monty (`$8E62`, `$8E79`), the walkers of the room
 * scripts (`$9E5B` and `$9E32` call the same two routines, `$8E65` and `$8E7C`) and a jump's sideways moves.
 */

/** Where the room's tiles are looked up: a pixel to the tile under it (`$8FCC`). */
export interface Tiles {
  at(x: number, y: number): number;
}

/** Anything with a place in the room: a top left corner in pixels. */
export interface Position {
  x: number;
  y: number;
}

/** The tiles that stop a sideways move (`$8EFC`). */
const SOLID_SIDE: readonly number[] = [0x01, 0x3f, 0x73];

const wrap = (n: number): number => n & 0xff;

/**
 * Whether a wall is in the way at pixel column `px` for the rows the thing covers from its top: 2 cells, and 3 when it is not on a
 * row of cells (`$8EFC`).
 */
export function wallAt(tiles: Tiles, px: number, y: number): boolean {
  const rows = (y & 7) === 0 ? 2 : 3;
  for (let r = 0; r < rows; r++) {
    if (SOLID_SIDE.includes(tiles.at(px, wrap(y + r * 8)))) return true;
  }
  return false;
}

/** Two pixels left (`$8E65`): not from x 1 or 2, not into a wall. Returns whether it moved. */
export function stepLeft(tiles: Tiles, p: Position): boolean {
  if (p.x === 1 || p.x === 2) return false;
  const next = wrap(p.x - 2);
  if (wallAt(tiles, next, p.y)) return false;
  p.x = next;
  return true;
}

/** Two pixels right (`$8E7C`): the wall is looked for 8 pixels further on, and from x $EF on it cannot move. Returns whether it moved. */
export function stepRight(tiles: Tiles, p: Position): boolean {
  const next = wrap(p.x + 2);
  if (next >= 0xef) return false;
  if (wallAt(tiles, wrap(next + 8), p.y)) return false;
  p.x = next;
  return true;
}
