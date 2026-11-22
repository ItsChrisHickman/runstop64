/**
 * Every join of the world, for every region: where a room's edge is open (a cell he can stand or jump in), the cell he arrives in on the other side of the join is open too,
 * so a walk or a jump out of one room never lands inside a wall of the next (Chris: stuck in the river's wall after jumping right off the Forbidden City).
 * East-west joins compare a room's last column with its neighbour's first, at every row from 2 down (the two top rows are the ceiling's, nothing of him gets there); north-south
 * joins compare the bottom row with the top row of the room below (open at the bottom, wall at the top: a fall into a ceiling). A cell is solid when its tile's collision class stops him (1, 2 or 4). A wall meeting a wall is fine.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/joins.ts
 */
import { check, finish } from '../../shared/test/check';
import type { RoomSpec } from '../../shared/monty/rooms';
import { WORLD } from '../src/data';
import { MOSCOW_ROOMS } from '../src/moscow';
import { SIBERIA_ROOMS } from '../src/siberia';
import { CHINA_ROOMS } from '../src/china';
import { JAPAN_ROOMS } from '../src/japan';
import { PACIFIC_ROOMS } from '../src/pacific';
import { ANDES_ROOMS } from '../src/andes';
import { RIO_ROOMS } from '../src/rio';

const ROOMS: readonly RoomSpec[] = [...MOSCOW_ROOMS, ...SIBERIA_ROOMS, ...CHINA_ROOMS, ...JAPAN_ROOMS, ...PACIFIC_ROOMS, ...ANDES_ROOMS, ...RIO_ROOMS];
const solid = (r: RoomSpec, col: number, row: number): boolean => {
  const ch = r.map[row]?.[col] ?? '.';
  return ch !== '.' && [1, 2, 4].includes(WORLD.tileProperty(r.tiles[Number(ch) - 1] ?? 0));
};
/** Joins that look like a clash on the page but are made open in play (each proved by its region's mechanisms test): the chain's rows in the box (the cutters), the surf's waves (the snorkel), the hold's door (the parachute) and the road's pool and the tower's trapdoor. */
const OPENED: readonly string[] = ['39|40', '41|43', '54|55', '47/48', '21/20'];
const at = (col: number, row: number) => ROOMS.find((r) => r.col === col && r.row === row);

const bad: string[] = [];
for (const a of ROOMS) {
  const east = at(a.col + 1, a.row);
  if (east) {
    const rows = Array.from({ length: 18 }, (_, i) => i + 3).filter((row) => solid(a, 31, row) !== solid(east, 0, row));
    const edge = (r: RoomSpec, c: number) => Array.from({ length: 20 }, (_, row) => (solid(r, c, row) ? '#' : '.')).join('');
    if (rows.length && process.argv[2] === 'dump') for (const r of [a, east]) console.log(`room ${r.id}\n${r.map.map((m, i) => `${String(i).padStart(2)} ${m}`).join('\n')}`);
    if (rows.length && !OPENED.includes(`${a.id}|${east.id}`)) bad.push(`${a.id}|${east.id} (east-west) rows ${rows.join(',')}  ${edge(a, 31)} | ${edge(east, 0)}`);
  }
  const below = at(a.col, a.row + 1);
  if (below) {
    const cols = Array.from({ length: 32 }, (_, c) => c).filter((c) => !solid(a, c, 19) && solid(below, c, 0));
    if (cols.length && !OPENED.includes(`${a.id}/${below.id}`)) bad.push(`${a.id}/${below.id} (north-south) cols ${cols.join(',')}`);
  }
}
for (const b of bad) console.log(b);
check(`no join of any region has an open edge cell meeting a wall (${bad.length} offenders)`, bad.length === 0);
finish();
