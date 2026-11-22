/**
 * Finds the places' starts and routes for the reward show (src/ending-places.ts) and writes them to src/ending-routes.ts: for each place, in its room with what he has by then (`prepare`), a place he can stand a few cells
 * from a coin, and a search over the game's own frames (the bot's, test/bot.ts: the stick held 4 frames at a time, the game copied at each step) for a run that takes that coin without a death. The first coin of the room (in the
 * coin table's order) with a run of 100 to 600 frames is the scene's; a room he cannot stand in (the parachute's flight) starts him at the top, as the drop does. The finale starts him on the promenade and walks him to the bowl.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/re/routes.ts [place ...]
 */
import fs from 'node:fs';
import { enterRoom } from '../../montyotr/src/ending';
import { routeText, type Move } from '../../shared/ending/pilot';
import { frame, NONE, copy, type State } from '../../montyotr/test/play';
import { ACTIONS, newGame, search, type Route } from '../test/bot';
import { PLACES } from '../src/ending-places';
import { WORLD } from '../src/data';
import { standY } from '../test/route';
import { isMove } from '../../shared/ending/pilot';

{
  let seed = 12345;
  Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
}

const only = process.argv.slice(2).map(Number);
const X2 = (col: number) => 0x0c + (col + 4) * 4;

/** A new game in the place's room with what he has, at a spot (or null if the room will not take him there). */
function begin(index: number, x2: number, y: number, facing: number): State | null {
  const place = PLACES[index];
  if (!place) return null;
  const s = newGame(WORLD, true);
  s.g.graceActive = () => false;
  place.prepare(s.g);
  if (!enterRoom(s.g, place.room, x2, y, facing)) return null;
  s.g.score = 0;
  return s;
}

/** Whether he can stand at a spot of the room: alive, on his feet, where he was put. */
function standable(index: number, x2: number, y: number): boolean {
  const s = begin(index, x2, y, 0x01);
  if (!s) return false;
  const g = s.g;
  const free = [0, 1, 40, 41].every((o) => g.tileFlag(g.chr(g.montyChr + o)) !== 1);
  frame(s, NONE); frame(s, NONE);
  return free && g.x2 === x2 && g.y === y && !g.falling && !g.montyAction && !g.actionCounter && !g.gameMode;
}

/** The route as the show's text. */
function textOf(route: Route): string {
  const moves: Move[] = [];
  for (const [name, frames] of route) {
    if (!isMove(name)) throw new Error(`not a move: ${name}`);
    for (let f = 0; f < frames; f++) moves.push(name);
  }
  return routeText(moves);
}

const frames = (route: Route) => route.reduce((a, [, f]) => a + f, 0);

interface Found { room: number; spot: { x2: number; y: number; facing: number }; route: string }

function find(index: number): Found | null {
  const place = PLACES[index];
  if (!place) return null;
  const room = place.room;
  if ('treasure' in place.take) {
    // the beach: from the promenade to the bowl on its table
    return { room, spot: { x2: X2(16), y: standY(18), facing: 0x01 }, route: '>200' };
  }
  const probe = begin(index, X2(0), standY(18), 0x01);
  if (!probe) return null;
  const coins: { col: number; row: number }[] = [];
  const t = WORLD.coinTable;
  for (let i = 0; i * 3 < t.length; i++) if (t[i * 3] === room) coins.push({ col: t[i * 3 + 1] ?? 0, row: t[i * 3 + 2] ?? 0 });
  // standable places, floors from the bottom up
  const spots: { col: number; floor: number }[] = [];
  for (let floor = 19; floor >= 4; floor--) for (let col = 0; col < 28; col += 2) if (standable(index, X2(col), standY(floor))) spots.push({ col, floor });
  const tries: { x2: number; y: number; facing: number; aim: { col: number; row: number } }[] = [];
  // (the parachute's flight: he is carried down, so a coin high in the room, or the run ends under the playfield where the credits go)
  for (const c of spots.length ? coins : coins.filter((k) => k.row <= 12)) {
    const near = spots.filter((s) => Math.abs(s.col - c.col) >= 5 && Math.abs(s.col - c.col) <= 14 && Math.abs(s.floor - c.row) <= 6).sort((a, b) => Math.abs(a.col - c.col) - Math.abs(b.col - c.col));
    for (const s of near.slice(0, 2)) tries.push({ x2: X2(s.col), y: standY(s.floor), facing: c.col > s.col ? 0x01 : 0x81, aim: c });
    // (a room he cannot stand in: the flight's, from its top)
    if (!spots.length) tries.push({ x2: X2(10), y: standY(6), facing: 0x01, aim: c });
  }
  // the longest run of the room's coins that is not over 500 frames (a run to watch: it is what the place shows)
  let best: { room: number; spot: { x2: number; y: number; facing: number }; route: string; n: number } | null = null;
  for (const tr of tries.slice(0, 8)) {
    const s = begin(index, tr.x2, tr.y, tr.facing);
    if (!s) continue;
    const found = search(s, (g) => g.score >= 50 && g.roomId === room && !g.script, [{ room, col: tr.aim.col, row: tr.aim.row - 1 }], 30000, 1.5);
    if (!found) continue;
    const n = frames(found.route);
    if (n <= 500 && (!best || n > best.n)) best = { room, spot: { x2: tr.x2, y: tr.y, facing: tr.facing }, route: textOf(found.route), n };
  }
  void copy; void ACTIONS;
  return best ? { room, spot: best.spot, route: best.route } : null;
}

const results: (Found | null)[] = [];
for (let i = 0; i < PLACES.length; i++) {
  if (only.length && !only.includes(i)) { results.push(null); continue; }
  const r = find(i);
  console.log(`place ${i} (room ${PLACES[i]?.room}): ${r ? `${r.spot.x2.toString(16)},${r.spot.y.toString(16)} ${r.route}` : 'NO ROUTE'}`);
  results.push(r);
}
if (!only.length) {
  const text = results.map((r) => (r ? `  { room: ${r.room}, spot: { x2: 0x${r.spot.x2.toString(16)}, y: 0x${r.spot.y.toString(16)}, facing: 0x${r.spot.facing.toString(16)} }, route: '${r.route}' },` : '  // NO ROUTE')).join('\n');
  fs.writeFileSync('games/montyworld/src/ending-routes.ts', `/**\n * The places of the reward show: where each starts Monty and the route that does what it says there (a run of the stick, a move held for some steps), found by \`re/routes.ts\`: a search over the game's own frames. Written by that script.\n */\nexport const ROUTES: readonly { room: number; spot: { x2: number; y: number; facing: number }; route: string }[] = [\n${text}\n];\n`);
}
