/**
 * Finds the places' starts and routes for the reward show (src/ending-places.ts) and writes them to src/ending-routes.ts: for each place, in its room with what he has by then (`prepare`), a place he can stand a few cells
 * from a coin, and a search over the game's own frames (the bot's, test/bot.ts: the stick held 4 frames at a time, the game copied at each step) for a run that takes that coin without a death. The first coin of the room (in the
 * coin table's order) with a run of 100 to 600 frames is the scene's; a room he cannot stand in (the parachute's flight) starts him at the top, as the drop does. The finale starts him on the promenade and walks him to the bowl.
 * Then each place's encore (bot.ts `encore`): from where the run leaves him, in a game begun as the show begins a place, a run that keeps him on the go till the place ends (`placeFrames`) with no death, so
 * nothing of the room walks through him (the finale has none: its ending plays on by itself).
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/re/routes.ts [place ...]
 *   nice -n 15 node tools/test.mjs games/montyworld/re/routes.ts encore [place ...]   (the encores only, after the routes as they are)
 */
import fs from 'node:fs';
import { enterRoom } from '../../montyotr/src/ending';
import { Game } from '../../montyotr/src/game';
import { prngEntropy } from '../../shared/monty/screen';
import { routeText, stickOf, type Move } from '../../shared/ending/pilot';
import { frame, NONE, copy, type State } from '../../montyotr/test/play';
import { ACTIONS, encore, hold, search, STEP, type Route } from '../../shared/monty/test/bot';
import { parseRoute } from '../../shared/ending/pilot';
import { PLACES, placeFrames } from '../src/ending-places';
import { ROUTES } from '../src/ending-routes';
import { WORLD } from '../src/data';
import { standY } from '../test/route';
import { isMove } from '../../shared/ending/pilot';

{
  let seed = 12345;
  Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
}

const args = process.argv.slice(2);
const encoresOnly = args[0] === 'encore';
const only = (encoresOnly ? args.slice(1) : args).map(Number);
const X2 = (col: number) => 0x0c + (col + 4) * 4;
/** The most frames he may stand still together in a place (the reward test holds the show to 20: a step's worth under it). */
const STILL = 16;

/** A new game in the place's room with what he has, at a spot (or null if the room will not take him there). */
function begin(index: number, x2: number, y: number, facing: number): State | null {
  return showGame(index, x2, y, facing);
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

interface Found { room: number; spot: { x2: number; y: number; facing: number }; route: string; encore?: string }

/**
 * Places whose route is set by hand: none now. OPEN ARMS (71) had one (the forest floor's coin walked to west from under the pedestal) while the vulture's dive at the hand's coin was at a phase the show did
 * not share; since the challenge pass (2026-11-28) the marmoset walks that floor, so the search finds its route in the show's own game like every other place.
 */
const HAND: Readonly<Record<number, Found>> = {};

/** A new game begun as the show begins a place (the random numbers the game's own, as `hold` makes them too): what he has by then, in the room at the spot; null if the room will not take him there. */
function showGame(index: number, x2: number, y: number, facing: number): State | null {
  const place = PLACES[index];
  if (!place) return null;
  const g = new Game(WORLD);
  g.start();
  g.entropy = () => prngEntropy(g.prng);
  g.assist = { lives: false, cloud: true, jetpack: true, c5: true, rooms: false, respawn: true, hints: true };
  place.prepare(g);
  if (!enterRoom(g, place.room, x2, y, facing)) return null;
  g.score = 0;
  return { g, col: 0 };
}

/**
 * The place's encore: in a game begun as the show begins the place, the route played, then a search for a run that keeps him going without a death till
 * the place ends. If none goes on from the route's end (he lands in a creature's way), from a step before it where what he does there is already done (the
 * route cut there): the route and the encore, or null.
 */
function withEncore(index: number, found: Found): Found | null {
  const place = PLACES[index];
  if (!place || 'treasure' in place.take) return found;
  const s = showGame(index, found.spot.x2, found.spot.y, found.spot.facing);
  if (!s) return null;
  // (the states at each step of the route, from its start, and the longest he has stood still by then)
  const moves = [...parseRoute(found.route)].flatMap((r) => Array.from({ length: r.steps }, () => r.move));
  const at: { s: State; n: number; stood: number }[] = [];
  let idle = 0, stood = 0;
  for (let n = 0; n < moves.length; n++) {
    if (n % STEP === 0) at.push({ s: { g: copy(s.g), col: s.col }, n, stood });
    const move = moves[n], { x2, y } = s.g;
    if (move === undefined || hold(s, stickOf(move), 1).dead) { console.log(`  place ${index}: its route dies as the show plays it`); return null; }
    idle = s.g.x2 === x2 && s.g.y === y ? idle + 1 : 0;
    stood = Math.max(stood, idle);
  }
  at.push({ s, n: moves.length, stood });
  const total = placeFrames(place);
  // (a route that has him stand about waiting is no use either: Chris saw him stand still)
  for (const cut of at.reverse()) {
    if (cut.s.g.score < 50 || cut.stood > STILL) continue;
    const more = encore(cut.s, total - cut.n, 80, STILL);
    if (!more) continue;
    const head = routeText(moves.slice(0, cut.n));
    return { ...found, route: head, encore: textOf(more) };
  }
  return null;
}

/** The place's runs, best first (the longest of the room's coins not over 500 frames: a run to watch, it is what the place shows). */
function find(index: number): Found[] {
  const place = PLACES[index];
  if (!place) return [];
  const room = place.room;
  const hand = HAND[room];
  if (hand) return [hand];
  if ('treasure' in place.take) {
    // the beach: in from the west on the promenade, east to the bowl on its table
    return [{ room, spot: { x2: X2(2), y: standY(18), facing: 0x01 }, route: '>200' }];
  }
  const probe = begin(index, X2(0), standY(18), 0x01);
  if (!probe) return [];
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
  const runs: (Found & { n: number })[] = [];
  for (const tr of tries.slice(0, 8)) {
    const s = begin(index, tr.x2, tr.y, tr.facing);
    if (!s) continue;
    const found = search(s, (g) => g.score >= 50 && g.roomId === room && !g.script, [{ room, col: tr.aim.col, row: tr.aim.row - 1 }], 30000, 1.5);
    if (!found) continue;
    const n = frames(found.route);
    if (n <= 500) runs.push({ room, spot: { x2: tr.x2, y: tr.y, facing: tr.facing }, route: textOf(found.route), n });
  }
  void ACTIONS;
  return runs.sort((a, b) => b.n - a.n).map(({ n: _, ...r }) => r);
}

const results: (Found | null)[] = [];
for (let i = 0; i < PLACES.length; i++) {
  const kept = ROUTES[i];
  const stored: Found | null = kept && kept.room === PLACES[i]?.room ? { room: kept.room, spot: kept.spot, route: kept.route, ...(kept.encore ? { encore: kept.encore } : {}) } : null;
  if (only.length && !only.includes(i)) { results.push(stored); continue; }
  // (the encores only: after the route as it is, its old encore dropped; else the best run that has an encore after it, or with none the best run, which the reward test will not pass)
  const runs = encoresOnly ? (stored ? [{ room: stored.room, spot: stored.spot, route: stored.route }] : []) : find(i);
  let r: Found | null = null;
  for (const run of runs) if ((r = withEncore(i, run))) break;
  if (!r) { console.log(`  place ${i}: NO ENCORE`); r = runs[0] ?? null; }
  console.log(`place ${i} (room ${PLACES[i]?.room}): ${r ? `${r.spot.x2.toString(16)},${r.spot.y.toString(16)} facing ${r.spot.facing.toString(16)} ${r.route}${r.encore ? ` + ${r.encore}` : ''}` : 'NO ROUTE'}`);
  results.push(r);
}
{
  const text = results.map((r) => (r ? `  { room: ${r.room}, spot: { x2: 0x${r.spot.x2.toString(16)}, y: 0x${r.spot.y.toString(16)}, facing: 0x${r.spot.facing.toString(16)} }, route: '${r.route}'${r.encore ? `, encore: '${r.encore}'` : ''} },` : '  // NO ROUTE')).join('\n');
  fs.writeFileSync('games/montyworld/src/ending-routes.ts', `/**\n * The places of the reward show: where each starts Monty, the route that does what it says there (a run of the stick, a move held for some steps) and the encore after it that keeps him on the go till the\n * place ends (no creature walks through him), found by \`re/routes.ts\`: searches over the game's own frames. Written by that script.\n */\nexport const ROUTES: readonly { room: number; spot: { x2: number; y: number; facing: number }; route: string; encore?: string }[] = [\n${text}\n];\n`);
}
