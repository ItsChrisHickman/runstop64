/**
 * The region bots' legs, played once, for every region (moscow.ts ... rio.ts): each leg is a goal (route.ts and the regions' *-route.ts), and a route found by
 * the search (bot.ts) is its proof. The search takes hundreds of thousands of states a leg (10 to 20 minutes a region), so the routes it found are recorded
 * (routes/<region>-<mode>.json, committed: one line a leg, its name and the `action:frames` steps) and a normal run only PLAYS them: the game's own frames,
 * every leg's goal checked and a move that lives on after it, as the search checks. A leg whose recorded route no longer reaches its goal (the room changed)
 * falls back to the search from where the leg starts, and the run says the route needs re-recording.
 *
 *   (nothing)   play the recorded routes; search only the legs whose route fails (and say so)
 *   --record    write the routes (played or found) back to the file: after a region's rooms changed, `... <region>.ts original --record`, and enhanced
 *   --full      ignore the recorded routes and search every leg from scratch (the full proof: the slow set; with --record it re-records them all)
 *
 * The positional arguments are the mode (`original`, `enhanced`, or `all`) and, where a region's bot takes them, the first and last leg to play.
 */
import fs from 'node:fs';
import { copy, NONE, type State } from '../../montyotr/test/play';
import { check } from '../../shared/test/check';
import { readJsonFile } from '../../shared/test/data';
import * as S from '../../../packages/c64kit/src/schema';
import { ACTIONS, hold, keyOf, livesOn, play, search, STEP, type Goal, type Route } from './bot';
import type { Leg } from './route';

export const ROUTES_DIR = 'games/montyworld/test/routes';

/** What the command line says: the mode, the legs to play, and the flags. */
export interface Args { only: string | undefined; first: number; last: number | undefined; record: boolean; full: boolean }
export function readArgs(argv: readonly string[] = process.argv.slice(2)): Args {
  const flags = argv.filter((a) => a.startsWith('--')), pos = argv.filter((a) => !a.startsWith('--'));
  return { only: pos[0], first: Number(pos[1] ?? 0), last: pos[2] === undefined ? undefined : Number(pos[2]), record: flags.includes('--record'), full: flags.includes('--full') };
}

const file = (region: string, mode: string) => `${ROUTES_DIR}/${region}-${mode}.json`;
const routesFile = S.object({ region: S.string, mode: S.string, legs: S.record(S.string) });

export const showRoute = (route: Route) => route.map(([a, f]) => `${a}:${f}`).join(' ');
export function parseRoute(steps: string): Route {
  return steps === '' ? [] : steps.split(' ').map((p): readonly [string, number] => { const at = p.lastIndexOf(':'); return [p.slice(0, at), Number(p.slice(at + 1))]; });
}

/** The routes recorded for a region in a mode, by leg name (none if there is no file). */
export function readRecorded(region: string, mode: string): Map<string, Route> {
  const out = new Map<string, Route>();
  if (!fs.existsSync(file(region, mode))) return out;
  const v = readJsonFile(file(region, mode));
  if (!routesFile(v)) throw new Error(`${file(region, mode)}: not a recorded route file`);
  for (const [name, steps] of Object.entries(v.legs)) out.set(name, parseRoute(steps));
  return out;
}

/** Write a region's routes, in the legs' order, one line a leg (so a re-recording's diff shows the legs that changed). */
export function writeRecorded(region: string, mode: string, legs: readonly Leg[], routes: ReadonlyMap<string, Route>): void {
  const lines = legs.flatMap((l) => { const r = routes.get(l.name); return r ? [`    ${JSON.stringify(l.name)}: ${JSON.stringify(showRoute(r))}`] : []; });
  fs.mkdirSync(ROUTES_DIR, { recursive: true });
  fs.writeFileSync(file(region, mode), `{\n  "region": ${JSON.stringify(region)},\n  "mode": ${JSON.stringify(mode)},\n  "legs": {\n${lines.join(',\n')}\n  }\n}\n`);
}

/** When a leg finds no way: where he could get to in the room he is in (the cells his top left reached in up to 150000 states), for finding what the layout lacks. */
function reached(from: State): string {
  const room = from.g.roomId;
  const seen = new Set([keyOf(from.g)]), cells = new Set<string>();
  let level = [from], nodes = 0;
  while (level.length && nodes < 150000) {
    const next: State[] = [];
    for (const n of level) {
      for (const [, stick] of n.g.montyAction || n.g.falling || n.g.gameMode ? [ACTIONS[4] ?? ['.', NONE]] : ACTIONS) {
        const t: State = { g: copy(n.g), col: n.col };
        const r = hold(t, stick, STEP);
        nodes++;
        if (r.dead || t.g.roomId !== room) continue;
        cells.add(`${t.g.montyCol - 4},${t.g.montyRow}`);
        const k = keyOf(t.g);
        if (!seen.has(k)) { seen.add(k); next.push(t); }
      }
    }
    level = next;
  }
  const g = from.g;
  return Array.from({ length: 20 }, (_, r) => `${String(r).padStart(2)} ${Array.from({ length: 32 }, (_, c) => (cells.has(`${c},${r + 3}`) ? '*' : g.flagAt(r + 3, c + 4) === 1 ? '#' : '.')).join('')}`).join('\n');
}

/** How a region's search goes: `[state limit, weight]` looks, in order (the first that finds a way is the route). */
export type Plan = readonly (readonly [limit: number, weight: number])[];

export interface LegsRun {
  region: string;
  mode: string;
  legs: readonly Leg[];
  start: State;
  args: Args;
  plan: Plan;
}
export interface LegsResult { live: State; frames: number; nodes: number; replayed: number; searched: number; ok: boolean }

const total = (r: Route) => r.reduce((n, [, f]) => n + f, 0);
const describe = (s: State) => `   now in room ${s.g.roomId} at ${s.g.montyCol - 4},${s.g.montyRow - 3} y ${s.g.y} falling ${s.g.falling} action ${s.g.montyAction} arc ${s.g.arcIdx} rope ${s.g.onRope} counter ${s.g.actionCounter} script ${s.g.script ? 'yes' : 'no'}`;

/** Where a leg's goal holds and some move lives on (what the search asks of a state it ends in). */
const reachedGoal = (s: State | null, goal: Goal): s is State => s !== null && goal(s.g) && livesOn(s);

export function runLegs(run: LegsRun): LegsResult {
  const { region, mode, legs, args, plan } = run;
  if (new Set(legs.map((l) => l.name)).size !== legs.length) throw new Error(`${region}: two legs have the same name`);
  const recorded = args.full ? new Map<string, Route>() : readRecorded(region, mode);
  const routes = new Map<string, Route>();
  let live = run.start, frames = 0, nodes = 0, replayed = 0, searched = 0, ok = true;
  const stale: string[] = [];
  for (const [n, leg] of legs.entries()) {
    if (n < args.first || n >= (args.last ?? legs.length)) continue;
    const t0 = Date.now();
    const before = recorded.get(leg.name);
    const replay = before ? play(live, before) : null;
    if (before && reachedGoal(replay, leg.goal)) {
      routes.set(leg.name, before);
      frames += total(before);
      replayed++;
      check(`${mode}: ${leg.name} (recorded route, ${total(before)} frames)`, true, true);
      live = replay;
      continue;
    }
    if (before) { stale.push(leg.name); console.log(`   the recorded route of "${leg.name}" no longer reaches its goal: searching (it needs re-recording)`); }
    const stats = { exhausted: false };
    let found: ReturnType<typeof search> = null;
    for (const [limit, weight] of plan) { found = search(live, leg.goal, leg.aim, limit, weight, stats); if (found) break; }
    if (!found) {
      check(`${mode}: ${leg.name}: a way (${stats.exhausted ? 'every state looked at' : 'the search limit'})`, false);
      console.log(`   from room ${live.g.roomId} at ${live.g.montyCol - 4},${live.g.montyRow - 3} (y ${live.g.y}, lava ${live.g.lavas[0]?.t ?? '-'}), he reaches:\n${reached(live)}`);
      ok = false;
      break;
    }
    const next = play(live, found.route);
    const good = next !== null && leg.goal(next.g);
    searched++;
    frames += total(found.route);
    nodes += found.nodes;
    check(`${mode}: ${leg.name} (${total(found.route)} frames, ${found.nodes} states, ${((Date.now() - t0) / 1000).toFixed(1)}s)`, good);
    if (next) console.log(describe(next));
    if (!next || !good) { ok = false; break; }
    routes.set(leg.name, found.route);
    live = next;
  }
  const complete = ok && args.first === 0 && (args.last ?? legs.length) >= legs.length;
  if (args.record && complete) {
    writeRecorded(region, mode, legs, routes);
    console.log(`${mode}: ${routes.size} routes recorded in ${file(region, mode)}`);
  } else if (args.record) console.log(`${mode}: not recorded (only a complete run that passes is)`);
  else if (stale.length > 0 || (complete && searched > 0 && !args.full)) console.log(`${mode}: ${stale.length + (complete ? searched - stale.length : 0)} route(s) stale or missing: re-record with \`node tools/test.mjs games/montyworld/test/${region}.ts ${mode} --record\``);
  console.log(`${mode}: ${replayed} legs replayed from the recorded routes, ${searched} searched`);
  return { live, frames, nodes, replayed, searched, ok };
}
