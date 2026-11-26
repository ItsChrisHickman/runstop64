import { cellOf, type MontyData } from './montydata';

/**
 * Where Monty can stand in a room, and where a room is come into: the one owner of both, for the saves of rooms a rebuild cut or changed (Do Svidaniya
 * Monty's save-migrate.ts) and for NEW GAME+'s map, every room a place to travel to before he has been in it (plus.ts).
 */

/** The playfield: 32 cells by 20 (row 0 the top), from screen column 4. */
const PLAY_COL = 4, COLS = 32, ROWS = 20;

/** Monty's x (halved, the engine's sprite x) standing at a playfield column, and his y standing on a floor row, as the engine places him. */
export const standX2 = (col: number) => 0x0c + (col + PLAY_COL) * 4;
export const standY = (floor: number) => 0x32 + (floor + 1) * 8;
/** The column and the floor row of a place (x2, y): `standX2` and `standY` the other way round. */
export const colAt = (x2: number) => Math.round((x2 - 0x0c) / 4) - PLAY_COL;
export const floorAt = (y: number) => Math.round((y - 0x32) / 8) - 1;

/** A cell's collision class in a room (0: air). */
function classOf(data: MontyData, room: number) {
  const def = data.roomDef(room);
  return (c: number, r: number) => {
    const code = def.cells[r * COLS + c] ?? 0;
    return code === 0 ? 0 : data.tileProperty(def.tiles[code - 1] ?? 0);
  };
}

/**
 * Whether he can stand at (col, floor) in a room: two cells of air for his body over two that hold him (a wall or a floor), nothing deadly underfoot, no timed strike
 * where he stands, and not at a plane waiting to take him (a boarding's box: with what it needs he would be flown off as he came in).
 */
export function canStand(data: MontyData, room: number, col: number, floor: number, flag = classOf(data, room)): boolean {
  if (col < 0 || col >= COLS - 1 || floor < 2 || floor >= ROWS) return false;
  const air = [floor - 2, floor - 1].every((r) => [col, col + 1].every((cc) => flag(cc, r) === 0 || flag(cc, r) === 3));
  const holds = [col, col + 1].every((cc) => flag(cc, floor) === 1 || flag(cc, floor) === 2);
  // (nor where a timed strike of the room comes: a torch, a vent, a moray)
  const struck = data.pulses.some((p) => p.room === room && p.live > 0 && p.col <= col + 1 && p.col + p.cols > col && p.row <= floor - 1 && p.row + p.rows > floor - 2);
  const boards = data.boardings.some((b) => b.room === room && b.box.col0 <= col + 1 && b.box.col1 >= col && b.box.row0 <= floor - 1 && b.box.row1 >= floor - 2);
  return air && holds && !struck && !boards;
}

/** The nearest place to (col, floor) in a room where he can stand (`canStand`), or null if there is none. */
export function standingPlace(data: MontyData, room: number, col: number, floor: number): { col: number; floor: number } | null {
  const flag = classOf(data, room);
  let best: { col: number; floor: number; d: number } | null = null;
  for (let f = 2; f < ROWS; f++) for (let c = 0; c < COLS - 1; c++) {
    if (!canStand(data, room, c, f, flag)) continue;
    const d = (c - col) ** 2 + (f - floor) ** 2;
    if (!best || d < best.d) best = { col: c, floor: f, d };
  }
  return best ? { col: best.col, floor: best.floor } : null;
}

/** West end, low: where a room is come into when nothing better is known (where a way in usually is). */
const WEST_LOW = { col: 0, floor: ROWS - 1 };

/**
 * Where a room is come into, as a place he stands at (x2, y), or null if he can stand nowhere in it: the game's own word for the room (`MontyData.waysIn`),
 * else a walk in across a join (a floor at the room's west edge, then its east, the lowest first, that runs on at the same row in the room across, two cells
 * in from the edge as a walk in comes to rest), else its west end, low.
 */
export function wayIn(data: MontyData, room: number): { x2: number; y: number } | null {
  const at = (p: { col: number; floor: number } | null) => (p ? { x2: standX2(p.col), y: standY(p.floor) } : null);
  const given = data.waysIn?.[room];
  if (given) return at(standingPlace(data, room, given.col, given.floor));
  const cell = cellOf(data, room);
  if (cell) {
    const { image, cols } = data.exitGrid;
    const flag = classOf(data, room);
    for (const side of [-1, 1] as const) {
      const col = cell.col + side, across = col >= 0 && col < cols ? image[cell.row * cols + col] ?? 0xff : 0xff;
      if (across === 0xff) continue;
      const edge = side < 0 ? 0 : COLS - 2, far = side < 0 ? COLS - 2 : 0, inside = side < 0 ? 2 : COLS - 4;
      const other = classOf(data, across);
      for (let f = ROWS - 1; f >= 2; f--) {
        if (!canStand(data, room, edge, f, flag) || !canStand(data, across, far, f, other)) continue;
        return at(canStand(data, room, inside, f, flag) ? { col: inside, floor: f } : { col: edge, floor: f });
      }
    }
  }
  return at(standingPlace(data, room, WEST_LOW.col, WEST_LOW.floor));
}
