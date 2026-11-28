/**
 * The challenge floor, measured against Monty on the Run (Chris 2026-11-27 on everything after Moscow: one creature a room, "no challenge";
 * "Russia was perfect"). Every room has at least two hazards (creatures, Mole Crushers and the mechanisms that kill: icicles, tunnel mouths,
 * cracking ice, timed strikes, dragons, rising lava, boulders, skewers, the cloud), as 48 of Monty on the Run's 51 rooms and every room
 * of Moscow but its first do; unless it is calm by design (`CALM`, with the reason). Patrol length is printed, not checked: Moscow's
 * walkers patrol 2 or 3 cells and Chris called it perfect, so length alone is not the fault (placement and density are: monty-room skill).
 *
 * `PENDING` is the work list: rooms that fail today. A pending room that passes is a failure too (take it off), so the list only shrinks.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/challenge.ts [--room ...]
 */
import { check, finish } from '../../shared/test/check';
import { WORLD } from '../src/data';
import { creaturesOf, crushersIn, mechanismsOf } from './recipe';
import { ALL_ROOMS, NAMES, scopedRooms } from './scope';

/** The mechanisms that kill (the others are ways through: lifts, escalators, vines, cable cars, floats). */
const DEADLY = new Set(['icicle', 'tunnel', 'cracking ice', 'timed strike', 'dragon', 'rising lava', 'boulder', 'skewer', 'cloud']);

/** Rooms calm by design, and why (Chris wants calm rooms where they mean something: the quality bar, 2026-11-22). */
const CALM: Readonly<Record<number, string>> = {
  0: 'the first room: where the game starts, before anything is asked of him',
};

/** Rooms under the floor today (2026-11-27), the challenge pass's work list: take one off when its fix lands. */
const PENDING: ReadonlySet<number> = new Set([32, 97, 88, 89, 90, 91, 92, 93, 51, 53, 55, 83, 76]);

const nameOf = (id: number) => [...NAMES.names].find(([n, v]) => v === id && n.includes('.'))?.[0] ?? `room ${id}`;

let pendingLeft = 0;
for (const r of scopedRooms(ALL_ROOMS)) {
  const cs = creaturesOf(WORLD, r.id);
  const deadly = mechanismsOf(WORLD, r.id).filter((m) => DEADLY.has(m));
  const hazards = cs.length + deadly.length + crushersIn(WORLD, r.id);
  const longest = Math.max(0, ...cs.map((c) => c.cells));
  const what = `${nameOf(r.id)} (${r.id}): ${hazards} hazard(s): ${cs.length} creature(s)${cs.length ? `, longest patrol ${longest} cells` : ''}${deadly.length ? `, ${deadly.join(', ')}` : ''}`;
  const calm = CALM[r.id];
  if (calm !== undefined) { check(`${what}; calm by design (${calm})`, true); continue; }
  if (PENDING.has(r.id)) {
    pendingLeft++;
    check(`${what}; PENDING, under the floor, and still fails (else take it off PENDING)`, hazards < 2);
    continue;
  }
  check(`${what}; at least two hazards`, hazards >= 2);
}
if (pendingLeft) console.log(`${pendingLeft} room(s) pending: the challenge pass's work list (PENDING in challenge.ts)`);
finish();
