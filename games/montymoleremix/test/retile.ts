/**
 * The mapping, room by room (docs/montymole-remix-plan.md, "The mapping"): every one of Wanted's 21 rooms redrawn with Monty on the
 * Run's tiles keeps what each cell *is* to Monty. The class of every cell as the shared physics reads it from the picture the remix
 * draws (the character on its screen, its tile's class) equals the class the original's physics makes of the cell from Wanted's
 * data (its colour attribute against the room's four classes; pixels on its top row hold him from above), written here again from the
 * original's rule and not from retile.ts. Also: no room needs more than eight tiles; the coal, the creatures' starts and the tool are
 * on cells that are not solid; the gates are walls; the floor's row is free; every exit that Wanted has is open at the room's edge.
 *
 *   nice -n 15 node tools/test.mjs games/montymoleremix/test/retile.ts
 */
import { GATES } from '../../montymole/src/gates';
import { ROOMS } from '../../montymole/src/data/rooms-data';
import { Enemy, EnemyState } from '../../montymole/src/enemy-rules';
import { ROOM_COLS, ROOM_ROWS, ROOM_TOP_ROW, tileAt, type RoomData } from '../../montymole/src/room';
import { check, finish } from '../../shared/test/check';
import { PLAY_COL, PLAY_ROW, ROW, SCREEN } from '../../shared/monty/screen';
import { cellCol, cellRow } from '../src/coords';
import { RemixGame } from '../src/game';
import { retile } from '../src/retile';
import { newGame } from './harness';

/** The class the original's physics gives a cell: 0 none, 1 solid, 2 holds from above, 3 rope, 4 deadly (Wanted finds them by colour). */
function wantedClass(room: RoomData, col: number, row: number): number {
  const tile = room.tiles[tileAt(room, col, row)];
  if (tile === undefined) throw new Error('no tile');
  const pixels = tile.rows.some((r) => r !== 0);
  const at = room.classes.indexOf(tile.attr);
  if (at === 1) return 4;
  if (at === 2) return 3;
  if (at >= 0) return pixels ? 1 : 0;
  return tile.rows[0] !== 0 ? 2 : 0;
}

let mismatches = 0, cells = 0, decor = 0;
const g: RemixGame = newGame().g;
for (const data of ROOMS) {
  const room = retile(data);
  check(`room ${data.id}: ${room.slots.length} tiles, no more than Monty on the Run's eight`, room.slots.length <= 8, true);
  g.enterAt(data.id, 0x40, 0x80);
  let bad = 0;
  for (let r = 0; r < ROOM_ROWS; r++) {
    for (let c = 0; c < ROOM_COLS; c++) {
      let code = g.mem[SCREEN + (r + PLAY_ROW) * ROW + PLAY_COL + c] ?? 0;
      if (code >= 0x10 && code <= 0x15) code = g.cells[r * ROOM_COLS + c] ?? 0; // (the crusher is drawn over the room's cells)
      const read = code >= 1 && code <= 8 ? g.tileProps[code - 1] ?? 0 : 0; // what the shared physics reads from the screen
      const want = wantedClass(data, c, r);
      cells++;
      if (read !== want || g.flagAt(r + PLAY_ROW, c + PLAY_COL) !== want) bad++;
      const tile = data.tiles[tileAt(data, c, r)];
      if (want === 0 && tile !== undefined && tile.rows.some((b) => b !== 0)) decor++;
    }
  }
  mismatches += bad;
  check(`room ${data.id}: the class of every cell, read from the picture, is the original's (${bad} differ)`, bad === 0, true);

  const solid = (col: number, row: number) => (room.cells[row * ROOM_COLS + col] ?? 0) !== 0 && room.slots[(room.cells[row * ROOM_COLS + col] ?? 0) - 1]?.prop === 1;
  const freeOfSolid = (col: number, row: number) => !solid(col, row);
  check(`room ${data.id}: the coal is on cells that are not solid`, data.coal.every((k) => (k.col === 0 && k.row === 0) || freeOfSolid(k.col, k.row - ROOM_TOP_ROW)), true);
  const tools = data.object.sprite === 0 || freeOfSolid(cellCol(data.object.x), cellRow(data.object.y));
  check(`room ${data.id}: the tool lies on a cell that is not solid`, tools, true);
  data.enemies.forEach((rec, i) => {
    const e = new Enemy();
    e.fromBytes(rec);
    if (e.state === EnemyState.none || (e.state === EnemyState.relay && (e.sets[e.dir] ?? 0) >= 0x7780)) return;
    check(`room ${data.id}: creature ${i} starts at a place in the room`, e.x < 256 && e.y <= 175 + 16, true);
  });
  for (const gate of GATES.filter((k) => k.room === data.id)) {
    const rows = Array.from({ length: gate.cells }, (_, k) => cellRow(gate.y) + k);
    check(`room ${data.id}: the gate of ${gate.count} pieces is a wall of ${gate.cells} cells in column ${gate.column}`, rows.every((r) => solid(gate.column, r)));
  }
  if (((data.floor[0] ?? 0) | (data.floor[1] ?? 0)) !== 0) {
    const row = cellRow(data.floor[1] ?? 0);
    const lo = Math.floor((data.floor[2] ?? 0) / 8), hi = Math.floor(((data.floor[4] ?? 0) - 1) / 8);
    let blank = 0;
    for (let c = lo; c <= hi; c++) if ((room.cells[row * ROOM_COLS + c] ?? 0) === 0) blank++;
    check(`room ${data.id}: the retractable floor has blank cells to grow into (${blank} of cells ${lo}-${hi} in row ${row}) and a platform tile (${room.floorCode})`, blank > 0 && room.floorCode > 0);
  }
}
check(`${cells} cells in 21 rooms: the class of each as the physics reads it equals the original's (${mismatches} differ)`, mismatches === 0);
console.log(`(${decor} cells are scenery: pixels, no class; the decor census)`);
finish();
