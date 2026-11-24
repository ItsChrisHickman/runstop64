/**
 * Every climb in every region (Chris on Moscow, 2026-11-22): going up a rope, vine or ladder from its foot works from anywhere touching
 * it (no overhang that blocks the head), and going down from the floor above works from anywhere over its top (the opening is wide
 * enough). Probed on the game's own physics (climb-kit.ts). Monty on the Run's own climbs are the norm (`motr` as an argument measures
 * them: its worst fails at 3 places of the 11 or so a rope can be touched from, the three unaligned ones beside an aligned fit; a pixel-perfect
 * place is one that works at 1 of them), so a climb may fail at `MOTR_NORM` places and no more. `show` prints the cells round each offender.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/climbs.ts [motr|show] [--room <rooms>]
 */
import { MOTR } from '../../montyotr/src/motr';
import { check, finish } from '../../shared/test/check';
import { WORLD } from '../src/data';
import type { MontyData } from '../../montyotr/src/montydata';
import { inRoom, probe, roomsOf, type Fail } from './climb-kit';
import { SCOPE } from './scope';

// the same run each time (a room's mechanisms take g.random(), which takes Math.random)
{
  let seed = 4242;
  Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
}

/** Monty on the Run's own norm: the most places (x2 values, 2 pixels apart) a climb may fail at. */
const MOTR_NORM = 3;
const ORIGINAL_ROOMS = 0x18;

/** The cells round a failing climb (flag classes: 1 solid, 2 floor, 3 rope, 4 hazard). */
function show(data: MontyData, room: number, f: Fail) {
  const s = inRoom(data, room);
  if (!s) return;
  for (let r = Math.max(0, f.floor - 5); r <= Math.min(19, f.floor + 2); r++) {
    let line = String(r).padStart(2) + ' ';
    for (let c = Math.max(0, f.climb.col - 8); c <= Math.min(31, f.climb.col + 8); c++) line += s.g.flagAt(3 + r, 4 + c) || '.';
    console.log(line + (r === f.floor ? '  <- floor' : ''));
  }
  console.log('   ' + ' '.repeat(Math.min(8, f.climb.col)) + '^ col ' + f.climb.col);
}

if (process.argv[2] === 'motr') {
  const all = probe(MOTR).filter(({ room }) => room < ORIGINAL_ROOMS);
  const widths = new Map<string, number>();
  for (const { found } of all) for (const o of found.openings) { const k = `${o.left}+${o.right}`; widths.set(k, (widths.get(k) ?? 0) + 1); }
  console.log('MOTR floor openings a rope goes down through (free cells left + right of the rope):', [...widths.entries()].sort().map(([k, n]) => `${k}:${n}`).join(' '));
  let worst = 0, climbs = 0;
  for (const { room, found } of all) {
    climbs += found.climbs.length;
    for (const f of found.fails) { worst = Math.max(worst, f.x2s.length); console.log(`MOTR $${room.toString(16)} col ${f.climb.col} rows ${f.climb.top}-${f.climb.bottom}: ${f.kind} (floor ${f.floor}) fails at ${f.x2s.length} places`); if (f.x2s.length > MOTR_NORM) show(MOTR, room, f); }
  }
  check(`Monty on the Run's ${climbs} climbs in its first ${ORIGINAL_ROOMS} rooms fail at ${worst} places at the worst (the norm, ${MOTR_NORM})`, worst <= MOTR_NORM);
  finish();
} else {
  const all = probe(WORLD, SCOPE.keep(roomsOf(WORLD)));
  let climbs = 0, offenders = 0;
  for (const { room, found } of all) {
    climbs += found.climbs.length;
    for (const f of found.fails) {
      if (f.x2s.length <= MOTR_NORM) continue;
      offenders++;
      console.log(`room ${room} col ${f.climb.col} rows ${f.climb.top}-${f.climb.bottom}: ${f.kind} (floor ${f.floor}) fails at ${f.x2s.length} places`);
      if (process.argv[2] === 'show') show(WORLD, room, f);
    }
  }
  console.log(`${climbs} climbs in ${all.length} rooms, ${offenders} offenders`);
  check(`${climbs} climbs in ${all.length} rooms: each works from nearly anywhere touching it (at most ${MOTR_NORM} places fail, as Monty on the Run's), up from the foot and down from the floor above`, offenders === 0);
  finish();
}
