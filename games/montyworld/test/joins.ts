/**
 * Every join of the world, for every region: where a room's edge is open (a cell he can stand or jump in), the cell he arrives in on the other side of the join is open too,
 * so a walk or a jump out of one room never lands inside a wall of the next (Chris: stuck in the river's wall after jumping right off the Forbidden City).
 * East-west joins compare a room's last column with its neighbour's first, at every row from 2 down (the two top rows are the ceiling's, nothing of him gets there); north-south
 * joins compare the bottom row with the top row of the room below (open at the bottom, wall at the top: a fall into a ceiling). A cell is solid when its tile's collision class stops him (1, 2 or 4). A wall meeting a wall is fine.
 * In a swim room with a surface (swim.ts: no stroke takes him above it) the sky over the sea at an edge is out of his reach unless a rope climbs there, so it may run on into the next room's rock
 * (LAND AHOY's sky over the sea cave's wall).
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/joins.ts [--room <rooms>]   (--room: only the joins of those rooms, with the neighbour across each)
 */
import { check, finish } from '../../shared/test/check';
import type { RoomSpec } from '../../shared/monty/rooms';
import { PLAY_ROW } from '../../shared/monty/screen';
import { WORLD } from '../src/data';
import { ALL_ROOMS as ROOMS, SCOPE } from './scope';

const solid = (r: RoomSpec, col: number, row: number): boolean => {
  const ch = r.map[row]?.[col] ?? '.';
  return ch !== '.' && [1, 2, 4].includes(WORLD.tileProperty(r.tiles[Number(ch) - 1] ?? 0));
};
/** Joins that look like a clash on the page but are made open in play (each proved by its region's mechanisms test): the chain's rows in the box (the cutters), the surf's waves (the snorkel) and the road's pool and the tower's trapdoor. */
const OPENED: readonly string[] = ['39|40', '41|43', '47/48', '21/20'];
const at = (col: number, row: number) => ROOMS.find((r) => r.col === col && r.row === row);
/** The playfield row of a swim room's surface (the row of its waves: `swimSurfaces` holds his sprite's y floating there, his head at the waterline, 4 pixels under the row's top). */
const surfaceRow = (r: RoomSpec): number | undefined => {
  const s = WORLD.swimSurfaces.find((x) => x.room === r.id);
  return s === undefined ? undefined : Math.round((s.y + 4 - 0x32) / 8) - PLAY_ROW;
};
/** A cell at a room's edge column he can never be in: over a swim room's surface, with no rope in that column up there (only a rope carries him above the surface). */
const outOfReach = (r: RoomSpec, col: number, row: number): boolean => {
  const surface = surfaceRow(r);
  if (surface === undefined || row >= surface) return false;
  return Array.from({ length: surface }, (_, rr) => r.map[rr]?.[col] ?? '.').every((ch) => ch === '.' || WORLD.tileProperty(r.tiles[Number(ch) - 1] ?? 0) !== 3);
};

const bad: string[] = [];
let joins = 0;
for (const a of ROOMS) {
  const east = at(a.col + 1, a.row);
  if (east && SCOPE.any([a.id, east.id])) {
    joins++;
    const rows = Array.from({ length: 18 }, (_, i) => i + 3).filter((row) => solid(a, 31, row) !== solid(east, 0, row))
      .filter((row) => !(solid(a, 31, row) ? outOfReach(east, 0, row) : outOfReach(a, 31, row)));
    const edge = (r: RoomSpec, c: number) => Array.from({ length: 20 }, (_, row) => (solid(r, c, row) ? '#' : '.')).join('');
    if (rows.length && process.argv[2] === 'dump') for (const r of [a, east]) console.log(`room ${r.id}\n${r.map.map((m, i) => `${String(i).padStart(2)} ${m}`).join('\n')}`);
    if (rows.length && !OPENED.includes(`${a.id}|${east.id}`)) bad.push(`${a.id}|${east.id} (east-west) rows ${rows.join(',')}  ${edge(a, 31)} | ${edge(east, 0)}`);
  }
  const below = at(a.col, a.row + 1);
  if (below && SCOPE.any([a.id, below.id])) {
    joins++;
    const cols = Array.from({ length: 32 }, (_, c) => c).filter((c) => !solid(a, c, 19) && solid(below, c, 0));
    if (cols.length && !OPENED.includes(`${a.id}/${below.id}`)) bad.push(`${a.id}/${below.id} (north-south) cols ${cols.join(',')}`);
  }
}
for (const b of bad) console.log(b);
check(`no join ${SCOPE.all ? 'of any region' : `of rooms ${[...SCOPE.rooms].join(', ')}`} (${joins} joins) has an open edge cell meeting a wall (${bad.length} offenders)`, bad.length === 0);
finish();
