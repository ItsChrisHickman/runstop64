/**
 * Pacing from the region bots' recorded routes (test/routes/<region>-<mode>.json): nothing is played, the routes' own frames are added up. For each region, the
 * whole route (every coin and find, as the bot takes them), the part of it in legs named for a coin (the detours a speed runner may skip), the rooms, the room
 * changes and how many of them go back into a room already crossed, the seconds per room, the longest legs and every stand of more than STAND frames (a wait
 * for a timer). docs/dosvidaniya-pacing.md is written from it. 50 frames a second (PAL).
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/re/pacing.ts [original|enhanced] [region ...]
 */
import { readRecordedFile } from '../../shared/monty/test/legs';
import type { Route } from '../../shared/monty/test/bot';
import { ROUTES } from '../test/routes-dir';
import { SIB } from '../src/siberia';
import { CHI } from '../src/china';
import { JP } from '../src/japan';
import { PAC } from '../src/pacific';
import { AND } from '../src/andes';
import { RIO_ROOM } from '../src/rio';

const FPS = 50;
/** A stand longer than this (frames of the stick let go, not in a jump's arc) is a wait. */
const STAND = 75;
/** The steps after a jump that are its arc (the stick let go in the air), not a stand. */
const ARC = 12;

/** The regions with recorded routes, in the journey's order, and their rooms by name. */
const REGIONS: readonly (readonly [name: string, rooms: Readonly<Record<string, number>>])[] = [
  ['siberia', SIB], ['china', CHI], ['japan', JP], ['pacific', PAC], ['andes', AND], ['rio', RIO_ROOM],
];

const args = process.argv.slice(2);
const mode = args[0] === 'original' ? 'original' : 'enhanced';
const only = args.filter((a) => a !== 'original' && a !== 'enhanced');

const frames = (route: Route) => route.reduce((n, [, f]) => n + f, 0);
const secs = (f: number) => (f / FPS).toFixed(1);

/** The stands of a route (runs of the stick let go, less a jump's arc), in frames. */
function stands(route: Route): number[] {
  const out: number[] = [];
  let run = 0, arc = 0;
  for (const [a, f] of route) {
    if (a.startsWith('J')) { arc = ARC; if (run) out.push(run); run = 0; continue; }
    if (a === '.') { if (arc > 0) arc--; else run += f; continue; }
    arc = 0;
    if (run) out.push(run);
    run = 0;
  }
  if (run) out.push(run);
  return out;
}

/** A leg named for a coin and nothing else (not a way between rooms): its frames are a detour a speed runner may leave out. */
const coinOnly = (leg: string) => {
  const [where = '', what = ''] = leg.split(/:(.*)/s);
  return !where.includes(' to ') && /\bcoins?\b/.test(what) && !/,/.test(what.replace(/, the coin.*$/, ''));
};

let total = 0, totalCoin = 0;
for (const [region, ids] of REGIONS) {
  if (only.length && !only.includes(region)) continue;
  const rec = readRecordedFile(ROUTES, region, mode);
  if (!rec.routes.size) { console.log(`${region}: no recorded route`); continue; }
  const nameOf = new Map(Object.entries(ids).map(([k, v]) => [v, k]));
  const known = new Set(Object.values(ids));
  const perRoom = new Map<number, number>();
  const seq: number[] = [];
  const legs: { leg: string; f: number }[] = [];
  const waits: { leg: string; f: number }[] = [];
  let all = 0, coin = 0;
  for (const [leg, route] of rec.routes) {
    const f = frames(route);
    all += f;
    if (coinOnly(leg)) coin += f;
    legs.push({ leg, f });
    for (const w of stands(route)) if (w > STAND) waits.push({ leg, f: w });
    const rooms = [...new Set(rec.rooms.get(leg) ?? [])];
    for (const r of rooms) perRoom.set(r, (perRoom.get(r) ?? 0) + f / rooms.length);
    for (const r of rec.rooms.get(leg) ?? []) if (seq[seq.length - 1] !== r) seq.push(r);
  }
  total += all; totalCoin += coin;
  const changes = Math.max(seq.length - 1, 0), distinct = new Set(seq).size;
  console.log(`\n${region} (${mode}): ${secs(all)} s, ${secs(coin)} s of it in coin legs (${secs(all - coin)} s without them); ${distinct} rooms, ${changes} room changes, ${changes - distinct + 1} of them back into a room already crossed; ${secs(all / Math.max(changes, 1))} s a room visit`);
  console.log(`  rooms in order: ${seq.map((r) => nameOf.get(r) ?? r).join(' ')}`);
  console.log(`  seconds a room: ${[...perRoom].sort((a, b) => b[1] - a[1]).map(([r, f]) => `${nameOf.get(r) ?? r} ${secs(f)}`).join(', ')}`);
  console.log(`  longest legs: ${legs.sort((a, b) => b.f - a.f).slice(0, 4).map((l) => `${secs(l.f)} s ${l.leg}`).join(' | ')}`);
  for (const w of waits) console.log(`  stand ${secs(w.f)} s in "${w.leg}"`);
  const stray = [...new Set(seq)].filter((r) => !known.has(r) && r !== seq[0] && r !== seq[seq.length - 1]); // (the first and last are the regions either side)
  if (stray.length) console.log(`  rooms recorded that are not ${region}'s (stale ids?): ${stray.join(' ')}`);
}
console.log(`\nall: ${secs(total)} s (${(total / FPS / 60).toFixed(1)} min), ${secs(total - totalCoin)} s without the coin legs`);
