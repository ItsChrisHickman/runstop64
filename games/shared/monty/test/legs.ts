/**
 * The region bots' legs, played once, for every region (moscow.ts ... rio.ts): each leg is a goal (route.ts and the regions' *-route.ts), and a route found by
 * the search (bot.ts) is its proof. The search takes hundreds of thousands of states a leg (10 to 20 minutes a region), so the routes it found are recorded
 * (routes/<region>-<mode>.json, committed: one line a leg, its name and the `action:frames` steps, and the rooms each leg's route goes through) and a normal run
 * only PLAYS them: the game's own frames, every leg's goal checked and a move that lives on after it, as the search checks. A leg whose recorded route no longer
 * reaches its goal (the room changed) falls back to the search from where the leg starts, and the run says the route needs re-recording.
 *
 *   (nothing)   play the recorded routes; search only the legs whose route fails (and say so)
 *   --record    write the routes (played or found) back to the file: after a region's rooms changed, `... <region>.ts original --record`, and enhanced
 *   --full      ignore the recorded routes and search every leg from scratch (the full proof: the slow set; with --record it re-records them all)
 *   --room <rooms>   (tools/test.mjs: `MONTY_ROOMS`; scope.ts) only the legs that start in, end in or pass through those rooms
 *
 * Room-scoped runs (`scope`): a leg is chosen by the rooms its recorded route went through. Its start is the state kept at the end of the leg before it
 * (states.ts: written by every complete run and `--record`, used only while the fingerprints of what made it still hold: the engine and everything outside
 * the rooms (`Prints.rest`), and each room the legs before it went through), or, where no kept state holds, reached by replaying the recorded routes before
 * it. After the chosen legs the state must be the kept one at the next leg's start (the chain joins the recorded one again, so the legs after play as
 * recorded); where it is not, the run goes on leg by leg until it is, or to the region's end. So a filter can skip only legs whose start, rooms and end
 * are what a full run would find.
 *
 * The positional arguments are the mode (`original`, `enhanced`, or `all`) and, where a region's bot takes them, the first and last leg to play.
 */
import fs from 'node:fs';
import { copy, NONE, type State } from '../../../montyotr/test/play';
import { check } from '../../test/check';
import { readJsonFile } from '../../test/data';
import * as S from '../../../../packages/c64kit/src/schema';
import { ACTIONS, hold, keyOf, livesOn, playThrough, search, STEP, type Aim, type Goal, type Route } from './bot';
import type { Prints } from './attribute';
import type { RoomScope } from './scope';
import { digest, freeze, readKept, thaw, writeKept, type KeptState } from './states';
/** A leg of a region's route: a goal for the bot to reach, and where to head (the aim only guides the search). */
/** One goal of a route (`pickup`: a coin or an item taken, which a player must be able to do without the bot's exact timing). */
export interface Leg { name: string; goal: Goal; aim: readonly Aim[]; pickup?: true }

/** What the command line says: the mode, the legs to play, and the flags. */
export interface Args { only: string | undefined; first: number; last: number | undefined; record: boolean; full: boolean }
export function readArgs(argv: readonly string[] = process.argv.slice(2)): Args {
  const flags = argv.filter((a) => a.startsWith('--')), pos = argv.filter((a) => !a.startsWith('--'));
  return { only: pos[0], first: Number(pos[1] ?? 0), last: pos[2] === undefined ? undefined : Number(pos[2]), record: flags.includes('--record'), full: flags.includes('--full') };
}

const file = (dir: string, region: string, mode: string) => `${dir}/${region}-${mode}.json`;
const routesFile = S.object({ region: S.string, mode: S.string, legs: S.record(S.string), rooms: S.optional(S.record(S.string)) });

export const showRoute = (route: Route) => route.map(([a, f]) => `${a}:${f}`).join(' ');
export function parseRoute(steps: string): Route {
  return steps === '' ? [] : steps.split(' ').map((p): readonly [string, number] => { const at = p.lastIndexOf(':'); return [p.slice(0, at), Number(p.slice(at + 1))]; });
}
const parseRooms = (text: string): number[] => text.split(' ').filter((t) => t !== '').map(Number);

/** What is recorded for a region in a mode: the routes by leg name, and the rooms each went through (none if there is no file). */
export interface Recorded { routes: Map<string, Route>; rooms: Map<string, number[]> }
export function readRecordedFile(dir: string, region: string, mode: string): Recorded {
  const out: Recorded = { routes: new Map(), rooms: new Map() };
  if (!fs.existsSync(file(dir, region, mode))) return out;
  const v = readJsonFile(file(dir, region, mode));
  if (!routesFile(v)) throw new Error(`${file(dir, region, mode)}: not a recorded route file`);
  for (const [name, steps] of Object.entries(v.legs)) out.routes.set(name, parseRoute(steps));
  for (const [name, rooms] of Object.entries(v.rooms ?? {})) out.rooms.set(name, parseRooms(rooms));
  return out;
}

/** The routes recorded for a region in a mode, by leg name (none if there is no file). */
export function readRecorded(dir: string, region: string, mode: string): Map<string, Route> {
  return readRecordedFile(dir, region, mode).routes;
}

/** Write a region's routes, in the legs' order, one line a leg (so a re-recording's diff shows the legs that changed), and the rooms each goes through. */
export function writeRecorded(dir: string, region: string, mode: string, legs: readonly Leg[], routes: ReadonlyMap<string, Route>, rooms: ReadonlyMap<string, readonly number[]> = new Map()): void {
  const lines = legs.flatMap((l) => { const r = routes.get(l.name); return r ? [`    ${JSON.stringify(l.name)}: ${JSON.stringify(showRoute(r))}`] : []; });
  const where = legs.flatMap((l) => { const r = rooms.get(l.name); return r ? [`    ${JSON.stringify(l.name)}: ${JSON.stringify(r.join(' '))}`] : []; });
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(file(dir, region, mode), `{\n  "region": ${JSON.stringify(region)},\n  "mode": ${JSON.stringify(mode)},\n  "legs": {\n${lines.join(',\n')}\n  }${where.length ? `,\n  "rooms": {\n${where.join(',\n')}\n  }` : ''}\n}\n`);
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
  /** Where the route files are (committed, one `<region>-<mode>.json` each): the game's `test/routes`. */
  dir: string;
  /** The region's name (the file's, and the test's: `<region>.ts` is what the re-record hint names). */
  region: string;
  mode: string;
  legs: readonly Leg[];
  start: State;
  args: Args;
  plan: Plan;
  /** Room-scoped testing (scope.ts): only the legs through these rooms; every leg when it is absent or names no rooms. */
  scope?: RoomScope;
  /** What a kept state depends on (attribute.ts `fingerprints`): without them no state is kept or used, and a scoped run replays from the region's start. */
  prints?: Prints;
  /** The game's name, for the kept states' file (by default the folder after `games/` in `dir`). */
  game?: string;
}
export interface LegsResult {
  /** The state at the end: of the last leg played, or of the region (`complete`). */
  live: State;
  frames: number; nodes: number; replayed: number; searched: number; ok: boolean;
  /** Whether `live` is the region's end, every leg's goal held on the way (played here, or skipped where the kept state holds): the region's own end checks belong only here. */
  complete: boolean;
}

const total = (r: Route) => r.reduce((n, [, f]) => n + f, 0);
const describe = (s: State) => `   now in room ${s.g.roomId} at ${s.g.montyCol - 4},${s.g.montyRow - 3} y ${s.g.y} falling ${s.g.falling} action ${s.g.montyAction} arc ${s.g.arcIdx} rope ${s.g.onRope} counter ${s.g.actionCounter} script ${s.g.script ? 'yes' : 'no'}`;

/** Where a leg's goal holds and some move lives on (what the search asks of a state it ends in). */
const reachedGoal = (s: State | null, goal: Goal): s is State => s !== null && goal(s.g) && livesOn(s);

export function runLegs(run: LegsRun): LegsResult {
  const { dir, region, mode, legs, args, plan, prints } = run;
  if (new Set(legs.map((l) => l.name)).size !== legs.length) throw new Error(`${region}: two legs have the same name`);
  const game = run.game ?? /games\/([^/]+)\//.exec(dir)?.[1] ?? 'monty';
  const recordedFile: Recorded = args.full ? { routes: new Map(), rooms: new Map() } : readRecordedFile(dir, region, mode);
  const recorded = recordedFile.routes;
  const scope = run.scope && !run.scope.all ? run.scope : null;
  const from = args.first, to = Math.min(args.last ?? legs.length, legs.length);
  const data = run.start.g.data;
  const nameAt = (n: number) => legs[n]?.name ?? '(the end)';

  // ---- the kept states and when one holds -------------------------------------------------------------------------------------------------------------------
  const kept = prints && !args.full ? readKept(game, region, mode) : null;
  const keptStates = kept && prints && kept.rest === prints.rest && kept.states.length === legs.length + 1 && kept.states.every((s, i) => s.leg === nameAt(i)) ? kept.states : null;
  const sameRoom = (r: number) => kept !== null && prints !== undefined && kept.rooms[String(r)] === prints.room(r);
  const sameRoute = (n: number) => { const r = recorded.get(nameAt(n)); return r !== undefined && keptStates?.[n]?.route === digest(showRoute(r)); };
  /** Leg starts where the chain is known to be the kept one now: the region's start (if it is the kept one) and where a run of chosen legs joined it again. */
  const anchors: number[] = keptStates && keptStates[0]?.hash === digest(freeze(run.start)) ? [0] : [];
  /** Whether the kept state at leg n's start is the state the chain has now: from an anchor, every leg between played its recorded route through rooms that did not change. */
  const holds = (n: number): boolean => anchors.some((a) => {
    if (a > n || !keptStates) return false;
    for (let j = a; j < n; j++) if (!sameRoute(j) || !(keptStates[j]?.rooms ?? [-1]).every(sameRoom)) return false;
    return true;
  });
  const roomsOf = (n: number): readonly number[] | null => recordedFile.rooms.get(nameAt(n)) ?? keptStates?.[n]?.rooms ?? null;
  /** A leg the scope chooses: one whose route goes through a named room (or one whose rooms are not known). */
  const chosen = (n: number) => { if (!scope) return true; const r = roomsOf(n); return r === null || scope.any(r); };

  // ---- one leg: its recorded route played, or the search ----------------------------------------------------------------------------------------------------
  const routes = new Map<string, Route>();
  const legRooms = new Map<string, number[]>();
  const now: (KeptState | undefined)[] = Array.from({ length: legs.length + 1 }, () => undefined);
  let frames = 0, nodes = 0, replayed = 0, searched = 0;
  const stale: string[] = [];
  const keepAt = (n: number, s: State) => { if (prints) { const bytes = freeze(s); now[n] = { leg: nameAt(n), hash: digest(bytes), rooms: [], route: '', bytes }; } };

  const runLeg = (n: number, s: State): State | null => {
    const leg = legs[n];
    if (!leg) return null;
    keepAt(n, s);
    const t0 = Date.now();
    const before = recorded.get(leg.name);
    const replay = before ? playThrough(s, before) : null;
    let route: Route, end: State, rooms: number[];
    if (before && replay && reachedGoal(replay.end, leg.goal)) {
      frames += total(before);
      replayed++;
      check(`${mode}: ${leg.name} (recorded route, ${total(before)} frames)`, true, true);
      route = before; end = replay.end; rooms = replay.rooms;
    } else {
      if (before) { stale.push(leg.name); console.log(`   the recorded route of "${leg.name}" no longer reaches its goal: searching (it needs re-recording)`); }
      const stats = { exhausted: false };
      let found: ReturnType<typeof search> = null;
      for (const [limit, weight] of plan) { found = search(s, leg.goal, leg.aim, limit, weight, stats); if (found) break; }
      if (!found) {
        check(`${mode}: ${leg.name}: a way (${stats.exhausted ? 'every state looked at' : 'the search limit'})`, false);
        console.log(`   from room ${s.g.roomId} at ${s.g.montyCol - 4},${s.g.montyRow - 3} (y ${s.g.y}, lava ${s.g.lavas[0]?.t ?? '-'}), he reaches:\n${reached(s)}`);
        return null;
      }
      const next = playThrough(s, found.route);
      const good = next !== null && leg.goal(next.end.g);
      searched++;
      frames += total(found.route);
      nodes += found.nodes;
      check(`${mode}: ${leg.name} (${total(found.route)} frames, ${found.nodes} states, ${((Date.now() - t0) / 1000).toFixed(1)}s)`, good);
      if (next) console.log(describe(next.end));
      if (!next || !good) return null;
      route = found.route; end = next.end; rooms = next.rooms;
    }
    routes.set(leg.name, route);
    legRooms.set(leg.name, rooms);
    const mine = now[n];
    if (mine) { mine.rooms = rooms; mine.route = digest(showRoute(route)); }
    return end;
  };

  /** The state at leg n's start (n = legs.length: the region's end), when the legs before it were not played here: a kept one that holds, or the recorded routes replayed from the last that does (or the region's start). */
  let fromKept = 0, toReach = 0;
  const reach = (n: number): State | null => {
    const at = keptStates?.[n];
    if (at && holds(n)) { fromKept++; return thaw(data, at.bytes); }
    let j = n - 1;
    while (j > 0 && !holds(j)) j--;
    const base = keptStates?.[j];
    let s: State | null = j > 0 && base ? thaw(data, base.bytes) : run.start;
    if (j <= 0) j = 0;
    console.log(`   ${nameAt(n)}: no kept state holds there; playing legs ${j} to ${n - 1} to reach it`);
    for (let k = j; k < n && s; k++) { toReach++; s = runLeg(k, s); }
    return s;
  };

  // ---- the legs ---------------------------------------------------------------------------------------------------------------------------------------------
  if (scope && !legs.some((_, n) => n >= from && n < to && chosen(n))) {
    console.log(`${mode}: room filter: no leg of ${region} goes through rooms ${[...scope.rooms].join(', ')}: nothing to play`);
    return { live: run.start, frames: 0, nodes: 0, replayed: 0, searched: 0, ok: true, complete: false };
  }
  let live: State | null = run.start, at = 0, ok = true, going = false;
  for (let n = from; n < to; n++) {
    if (!chosen(n) && !going) continue;
    const s = live !== null && at === n ? live : reach(n);
    if (!s) { ok = false; break; }
    const next = runLeg(n, s);
    if (!next) { ok = false; break; }
    live = next; at = n + 1;
    if (scope && n + 1 < legs.length && !chosen(n + 1)) {
      // the chosen legs are done: the chain must be the recorded one again for the legs after to be what a full run plays
      if (keptStates?.[n + 1]?.hash === digest(freeze(next))) {
        anchors.push(n + 1);
        if (going) console.log(`   the chain is the recorded one again at "${nameAt(n + 1)}"`);
        going = false;
      } else {
        if (!going) console.log(`   after "${legs[n]?.name}" the state is ${keptStates ? 'not the kept one' : 'not known (no kept states)'}: playing on, leg by leg`);
        going = true;
      }
    }
  }
  const whole = from === 0 && to === legs.length;
  let end: State | null = live !== null && at === to ? live : null;
  if (ok && whole && end === null) { end = reach(legs.length); ok = end !== null; }
  if (end) keepAt(legs.length, end);
  const complete = ok && whole && end !== null;

  // ---- what is written --------------------------------------------------------------------------------------------------------------------------------------
  if (complete && prints) {
    // every leg's start is known now: played here, or kept and still holding
    for (let n = 0; n <= legs.length; n++) if (!now[n] && keptStates?.[n] && holds(n)) now[n] = keptStates[n];
    const states = now.flatMap((s) => (s ? [s] : []));
    if (states.length === legs.length + 1) {
      const rooms: Record<string, string> = {};
      for (const s of states) for (const r of s.rooms) rooms[String(r)] = prints.room(r);
      writeKept(game, region, mode, { rest: prints.rest, rooms, states });
    }
  }
  if (args.record && complete) {
    for (const l of legs) {
      const r = recorded.get(l.name);
      if (!routes.has(l.name) && r) routes.set(l.name, r);
      const where = roomsOf(legs.indexOf(l));
      if (!legRooms.has(l.name) && where) legRooms.set(l.name, [...where]);
    }
    writeRecorded(dir, region, mode, legs, routes, legRooms);
    console.log(`${mode}: ${routes.size} routes recorded in ${file(dir, region, mode)}`);
  } else if (args.record) console.log(`${mode}: not recorded (only a complete run that passes is)`);
  else if (stale.length > 0 || (complete && searched > 0 && !args.full)) console.log(`${mode}: ${stale.length + (complete ? searched - stale.length : 0)} route(s) stale or missing: re-record with \`node tools/test.mjs ${dir.replace(/\/routes$/, '')}/${region}.ts ${mode} --record\``);
  else if (complete && !scope && recordedFile.rooms.size < legs.length && !args.full) console.log(`${mode}: the route file has no rooms for some legs (room-scoped runs need them): re-record with \`node tools/test.mjs ${dir.replace(/\/routes$/, '')}/${region}.ts ${mode} --record\``);
  if (scope) console.log(`${mode}: room filter: ${replayed + searched} of ${legs.length} legs played (${toReach} of them only to reach a chosen leg's start), ${fromKept} start(s) taken from kept states, ${legs.length - replayed - searched} legs not played (their rooms not named, the chain the kept one round them)`);
  console.log(`${mode}: ${replayed} legs replayed from the recorded routes, ${searched} searched`);
  return { live: end ?? live ?? run.start, frames, nodes, replayed, searched, ok, complete };
}
