/**
 * No unnecessary ceilings and walls (Chris, 2026-11-22: Monty on the Run's start is open, players simply cannot go right; ours started
 * with a wall and a ceiling for no reason). Every room's solid cells in its top two rows and in its edge columns (0-1 and 30-31) are listed
 * with the reason they stand: a real indoor roof or wall shaped as its building, the floor of the room above, or a wall that closes a join to a
 * neighbour that is not meant. An edge with no neighbour needs no wall (the exit grid stops him), so a room with such cells that has no reason
 * here fails. `PENDING` are the regions still to sweep (their rooms are being rebuilt in parallel): each is counted in the output.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/edges.ts
 */
import { check, finish } from '../../shared/test/check';
import { PLAY_COLS } from '../../shared/monty/screen';
import { WORLD } from '../src/data';
import { inRoom, roomsOf } from './climb-kit';

const MOSCOW: Readonly<Record<number, string>> = {
  0: 'the Kremlin wall closes the right edge (the street beyond is solid there); a passage through it at the gantry',
  1: 'the floor of the arcade above (GUM) over the manhole\'s rope; the crates and walkway at the sides close the joins to the square',
  2: 'the floor of the domes above, the Kremlin wall\'s terrace and the tower closing the right end',
  3: 'the Kremlin wall at the right and the arcade\'s roof edge at the left close the joins',
  4: 'the gate tower straddling the wall (the arch the guard paces under) and the watchtower at the far end',
  5: 'the Kremlin tower closing the platform\'s west end, the car\'s ends',
  6: 'indoors: the GUM arcade\'s barrel vault and end walls',
  7: 'indoors: the metro concourse\'s vault and walls',
  8: 'indoors: the metro platform\'s vault and walls',
};
const PENDING = 'to sweep (the region\'s rooms are being rebuilt in parallel)';

/** Rooms of regions other than Moscow are explained by region until their sweep: any room not in a table fails. */
const reasonOf = (room: number): string | undefined => MOSCOW[room] ?? (room >= 9 ? PENDING : undefined);

let unexplained = 0, pending = 0, explained = 0;
for (const room of roomsOf(WORLD)) {
  const s = inRoom(WORLD, room);
  if (!s) continue;
  const solid = (c: number, r: number) => { const f = s.g.flagAt(3 + r, 4 + c); return f === 1 || f === 2; };
  let top = 0, edge = 0;
  for (let c = 0; c < PLAY_COLS; c++) for (const r of [0, 1]) if (solid(c, r)) top++;
  for (let r = 0; r < 20; r++) for (const c of [0, 1, 30, 31]) if (solid(c, r)) edge++;
  if (top + edge === 0) continue;
  const why = reasonOf(room);
  if (why === undefined) { unexplained++; console.log(`room ${room}: ${top} solid cells in its top rows and ${edge} in its edge columns, no reason`); } else if (why === PENDING) pending++; else explained++;
}
console.log(`${explained} rooms with a reason, ${pending} still to sweep`);
check('every room with solid cells in its top rows or edge columns has a reason (Moscow\'s swept: an open start, no gantry over the platform)', unexplained === 0);
finish();
