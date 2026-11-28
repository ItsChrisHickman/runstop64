/**
 * Every join of the world, for every region: where a room's edge is open (a cell he can stand or jump in), the cell he arrives in on the other side of the join is open too,
 * so a walk or a jump out of one room never lands inside a wall of the next (Chris: stuck in the river's wall after jumping right off the Forbidden City).
 * East-west joins compare a room's last column with its neighbour's first, at every row from 2 down (the two top rows are the ceiling's, nothing of him gets there); north-south
 * joins compare the bottom row with the top row of the room below (open at the bottom, wall at the top: a fall into a ceiling). A cell is solid when its tile's collision class stops him (1, 2 or 4). A wall meeting a wall is fine.
 * In a swim room with a surface (swim.ts: no stroke takes him above it) the sky over the sea at an edge is out of his reach unless a rope climbs there, so it may run on into the next room's rock
 * (LAND AHOY's sky over the sea cave's wall).
 *
 * And every east-west edge he can stand at is walked, both ways (Chris on THE WATCHTOWER, 2026-11-24: a way out that seemed one-way): wherever a floor runs to a room's edge with
 * room for him over it and the room across has a floor at the same row with room over it, he is put on it two cells from the edge and walks across; he must come into the
 * room across, and walk back. The cells can agree and the walk still fail (a floor's class, a gutter, the engine's edge), so the walk is the check, in the engine, without creatures.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/joins.ts [--room <rooms>]   (--room: only the joins of those rooms, with the neighbour across each)
 */
import { check, finish } from '../../shared/test/check';
import type { RoomSpec } from '../../shared/monty/rooms';
import { PLAY_ROW } from '../../shared/monty/screen';
import { WORLD } from '../src/data';
import { frame } from '../../montyotr/test/play';
import { inRoom } from './climb-kit';
import { standY } from './route';
import { ALL_ROOMS as ROOMS, SCOPE } from './scope';
import { RIO_ROOM } from '../src/rio';

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
/**
 * Edge cells that are open on the page but that nothing of him reaches, each for a reason of the room's shape: HOUSE OF COLOUR's tower top under the church (row 3 over its roof at row 4), four rows
 * over the favela's roofs (a jump rises two and a half), with no ladder up it and no room above, against Lapa's townhouse wall (closed to the edge so no slot shows beside the church).
 */
const UNREACHED: readonly (readonly [room: number, col: number, row: number])[] = [[RIO_ROOM.colour, 31, 3]];
const outOfReach = (r: RoomSpec, col: number, row: number): boolean => {
  if (UNREACHED.some(([room, c, rr]) => room === r.id && c === col && rr === row)) return true;
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

// ---- walked: every edge he can stand at, both ways ----
const flagOf = (r: RoomSpec, col: number, row: number): number => { const ch = r.map[row]?.[col] ?? '.'; return ch === '.' ? 0 : WORLD.tileProperty(r.tiles[Number(ch) - 1] ?? 0); };
/** He can stand on `floor` at columns c and c + 1: both hold him (a wall or a ledge), the two rows over them are air or a rope. */
const standsAt = (r: RoomSpec, c: number, floor: number) => [c, c + 1].every((cc) => [1, 2].includes(flagOf(r, cc, floor)) && [floor - 1, floor - 2].every((row) => [0, 3].includes(flagOf(r, cc, row))));
const RIGHT = { left: false, right: true, up: false, down: false, fire: false }, LEFT = { left: true, right: false, up: false, down: false, fire: false };
/** Put on `floor` at `col` of `from` and walk `way` for long enough to cross three cells: whether he came into `to`. */
function walks(from: RoomSpec, to: RoomSpec, col: number, floor: number, way: typeof RIGHT): boolean {
  const s = inRoom(WORLD, from.id);
  if (!s) return false;
  s.g.x2 = 0x0c + (col + 4) * 4; s.g.y = standY(floor); s.g.falling = 0; s.g.montyAction = 0; s.g.onRope = 0;
  for (let n = 0; n < 60 && s.g.roomId === from.id; n++) frame(s, way);
  return s.g.roomId === to.id;
}
/** What the room across has at its edge column over a floor row: its cells from two rows over the floor to the floor, by class ('.' air, 'R' rope, '#' wall, '=' ledge, '!' deadly). */
const edgeOf = (r: RoomSpec, col: number, floor: number) => `${r.id} col ${col} rows ${floor - 3}-${floor}: ${[floor - 3, floor - 2, floor - 1, floor].map((row) => '.#=R!'[flagOf(r, col, row)] ?? '?').join('')}`;
let walked = 0;
const oneWay: string[] = [];
for (const a of ROOMS) {
  const east = at(a.col + 1, a.row);
  if (!east || !SCOPE.any([a.id, east.id])) continue;
  if (WORLD.swimRooms.includes(a.id) || WORLD.swimRooms.includes(east.id)) continue; // (he swims there: a walk is not how he crosses)
  for (let floor = 2; floor < 20; floor++) {
    const fromWest = standsAt(a, 30, floor), fromEast = standsAt(east, 0, floor);
    if (fromWest) { walked++; if (!walks(a, east, 29, floor, RIGHT)) oneWay.push(`${a.id}|${east.id}: walking east on ${a.id}'s floor ${floor} (${edgeOf(east, 0, floor)}) does not come into ${east.id}`); }
    if (fromEast) { walked++; if (!walks(east, a, 1, floor, LEFT)) oneWay.push(`${a.id}|${east.id}: walking west on ${east.id}'s floor ${floor} (${edgeOf(a, 31, floor)}) does not come into ${a.id}`); }
  }
}

for (const b of [...bad, ...oneWay]) console.log(b);
check(`every edge he can stand at on both sides is walked across both ways (${walked} edges, ${oneWay.length} one-way)`, oneWay.length === 0 && (walked > 0 || !SCOPE.all));
check(`no join ${SCOPE.all ? 'of any region' : `of rooms ${[...SCOPE.rooms].join(', ')}`} (${joins} joins) has an open edge cell meeting a wall (${bad.length} offenders)`, bad.length === 0);
finish();
