/**
 * `search` for the mechanism tests (china-mechanisms.ts ...): the same call and the same answer, but recorded (routes/<test>.json, committed):
 * - a way the search found: the next run PLAYS it instead of searching again, and checks the goal (and that he lives on) as the search does. A route
 *   that no longer reaches its goal is searched afresh (and the run says so).
 * - a search that found NO way (the "no way without the key" proofs): the next run takes the answer as recorded while nothing the search depends on has
 *   changed, and searches again the moment anything has. Its key adds the start state's every field (states.ts `statePrint`: `keyOf` is coarse, and
 *   ORIGINAL and ENHANCED share it). What it depends on is fingerprinted (`proofPrint`), conservatively: the engine and every source that is not one
 *   room's (attribute.ts `Prints.rest`: the engine, the shared code, the game's sources outside its rooms, the tables' layout), the test-side code the
 *   test file imports (the test itself, its kits, this file, the bot), and every room of each region the search went into (a death's room too) or
 *   borders on (a room next to one on the exit grid; attribute.ts `Prints.room`: the room's text). The search is deterministic, so with all of those
 *   the same it goes into the same rooms and ends the same way. A goal is known by its text, so two searches from the same state with goals that differ
 *   only in what their closures hold would share a key: a no-way key searched twice in one run is never taken as recorded, nor written.
 * The key of a search is a hash of where it starts, what it aims at, the goal's text and its limits, so adding a search to a test moves no other.
 *
 *   --record   search everything again and write what was found, ways and no ways (after a room or a mechanism changed)
 *   --full     search everything again, write nothing
 * The test file's name is taken from the bundle (`runstop64-test-<name>-<pid>.mjs`); a game gives its routes folder, its fingerprints and where its tests are.
 */
import fs from 'node:fs';
import path from 'node:path';
import { readJsonFile } from '../../test/data';
import * as S from '../../../../packages/c64kit/src/schema';
import type { State } from '../../../montyotr/test/play';
import { keyOf, livesOn, play, search as bfs, useRandomOf, type Aim, type Goal, type Route, type SearchStats } from './bot';
import { parseRoute, showRoute } from './legs';
import type { Prints } from './attribute';
import { digest, statePrint } from './states';
import { ROOMS_ENV } from './scope';

/**
 * What a game's recorded searches need besides its routes folder: its fingerprints (read once, when a search first asks), a test's source file by its
 * name, and the rooms that go with a room in a no-way's fingerprint (its region's: a test's goals and starts are written about a region's rooms).
 */
export interface ProofSources { readonly prints: () => Prints; readonly testFile: (name: string) => string; readonly regionOf: (room: number) => readonly number[] }

/** A search that found no way, as recorded: the fingerprint it was found under, the rooms it went into, whether it looked at every state, and how many. */
const noneShape = S.object({ print: S.string, rooms: S.numbers, exhausted: S.boolean, nodes: S.number });
type None = S.Infer<typeof noneShape>;
const fileShape = S.object({ test: S.string, routes: S.record(S.string), none: S.optional(S.record(noneShape)) });

/** A test file and every test-side file it imports (relative imports into a `test/` folder, followed through), sorted: the code a search's start, goal and aim are written in. */
export function testSources(file: string): string[] {
  const out = new Set<string>();
  const visit = (f: string) => {
    if (out.has(f) || !fs.existsSync(f)) return;
    out.add(f);
    const text = fs.readFileSync(f, 'utf8');
    for (const m of text.matchAll(/(?:from|import)\s*'(\.[^']+)'/g)) {
      const spec = m[1];
      if (spec === undefined) continue;
      const base = path.join(path.dirname(f), spec);
      const target = [`${base}.ts`, base, path.join(base, 'index.ts')].find((c) => c.endsWith('.ts') && fs.existsSync(c));
      // (the game's and engine's sources are in the fingerprints already, region files room by room: only the test side is followed here)
      if (target && /(^|\/)test\//.test(target)) visit(target);
    }
  };
  visit(file);
  return [...out].sort();
}

/** The rooms a search's answer depends on: those it went into and every one next to one of them on the game's exit grid, and every room of their regions. */
function roomsAround(start: State, rooms: readonly number[], regionOf: (room: number) => readonly number[]): number[] {
  const grid = start.g.data.exitGrid;
  const out = new Set(rooms);
  for (let at = 0; at < grid.image.length; at++) {
    if (!rooms.includes(grid.image[at] ?? -1)) continue;
    const row = Math.floor(at / grid.cols), col = at % grid.cols;
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]] as const) {
      const r = row + dr, c = col + dc;
      if (r < 0 || r >= grid.rows || c < 0 || c >= grid.cols) continue;
      const n = grid.image[r * grid.cols + c];
      if (n !== undefined) out.add(n);
    }
  }
  for (const r of [...out]) for (const q of regionOf(r)) out.add(q);
  return [...out].sort((a, b) => a - b);
}

export function proofsIn(dir: string, sources: ProofSources): typeof bfs {
  const flags = process.argv.slice(2).filter((a) => a.startsWith('--'));
  const record = flags.includes('--record'), full = flags.includes('--full');
  const name = process.argv[1]?.match(/runstop64-test-(.+)-\d+\.mjs$/)?.[1] ?? 'mechanisms';
  const file = `${dir}/${name}.json`;

  const recorded = new Map<string, Route>();
  const recordedNone = new Map<string, None>();
  const kept = new Map<string, Route>();
  const keptNone = new Map<string, None>();
  /** How many times each no-way key has been asked this run (one asked twice is never taken as recorded, nor written). */
  const asked = new Map<string, number>();
  /** A scoped run's (`--room`, `MONTY_ROOMS`) `--record` keeps what the file holds for the searches it never asked: they are other rooms' (a scoped re-record once dropped Siberia's no-way proofs). */
  const carried = new Map<string, string>(), carriedNone = new Map<string, None>();
  const scoped = (process.env[ROOMS_ENV] ?? '').trim() !== '';
  if (fs.existsSync(file) && (!record && !full || scoped)) {
    const v = readJsonFile(file);
    if (!fileShape(v)) throw new Error(`${file}: not a recorded route file`);
    if (!record && !full) {
      for (const [k, steps] of Object.entries(v.routes)) recorded.set(k, parseRoute(steps));
      for (const [k, none] of Object.entries(v.none ?? {})) recordedNone.set(k, none);
    } else {
      for (const [k, steps] of Object.entries(v.routes)) carried.set(k, steps);
      for (const [k, none] of Object.entries(v.none ?? {})) carriedNone.set(k, none);
    }
  }

  /** FNV-1a of a string, in hex. */
  function hash(text: string): string {
    let h = 0x811c9dc5;
    for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
    return h.toString(16);
  }

  /** What every search of this run depends on alike: the fingerprints' rest and the test-side code (read once). */
  let common: { prints: Prints; code: string } | null = null;
  const commonPrint = () => {
    if (!common) {
      const prints = sources.prints();
      const code = digest(testSources(sources.testFile(name)).map((f) => `${f}\n${fs.readFileSync(f, 'utf8')}`).join('\n\u0000'));
      common = { prints, code };
    }
    return common;
  };
  /** The fingerprint of a no-way answer: everything it depends on (see the head of the file), with the rooms the search went into. */
  function proofPrint(start: State, rooms: readonly number[]): string {
    const { prints, code } = commonPrint();
    const around = roomsAround(start, rooms, sources.regionOf).map((r) => `${r}:${prints.room(r)}`);
    return digest([prints.rest, code, ...around].join('|'));
  }

  function save(): void {
    const lines = [...kept].map(([k, r]) => `    ${JSON.stringify(k)}: ${JSON.stringify(showRoute(r))}`)
      .concat([...carried].filter(([k]) => !kept.has(k)).map(([k, steps]) => `    ${JSON.stringify(k)}: ${JSON.stringify(steps)}`));
    const noLines = [...keptNone].filter(([k]) => (asked.get(k) ?? 0) === 1).map(([k, n]) => `    ${JSON.stringify(k)}: ${JSON.stringify(n)}`)
      .concat([...carriedNone].filter(([k]) => !asked.has(k)).map(([k, n]) => `    ${JSON.stringify(k)}: ${JSON.stringify(n)}`));
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, `{\n  "test": ${JSON.stringify(name)},\n  "routes": {\n${lines.join(',\n')}\n  },\n  "none": {\n${noLines.join(',\n')}\n  }\n}\n`);
  }

  function search(start: State, goal: Goal, aim?: readonly Aim[], limit = 400000, weight = 1.5, stats?: SearchStats): { route: Route; end: State; nodes: number } | null {
    try { return answer(start, goal, aim, limit, weight, stats); } finally { useRandomOf(start.g); }
  }
  /** The search's answer: played from a recorded route, taken from a recorded no-way, or searched. */
  function answer(start: State, goal: Goal, aim: readonly Aim[] | undefined, limit: number, weight: number, stats: SearchStats | undefined): { route: Route; end: State; nodes: number } | null {
    const key = hash([keyOf(start.g), goal.toString(), JSON.stringify(aim ?? null), limit, weight].join('|'));
    // a no-way first: it is known by the exact start, a route only by `keyOf`'s rough one (two starts a few frames apart can share a route's key)
    const noKey = hash(`${key}|${statePrint(start)}`);
    const times = (asked.get(noKey) ?? 0) + 1;
    asked.set(noKey, times);
    const none = times === 1 ? recordedNone.get(noKey) : undefined;
    if (times > 1) keptNone.delete(noKey);
    if (none) {
      const print = proofPrint(start, none.rooms);
      if (print === none.print) {
        if (stats) { stats.exhausted = none.exhausted; stats.nodes = none.nodes; stats.rooms = none.rooms; }
        console.log(`   no way (recorded, unchanged since ${print}): the search ${noKey}, ${none.nodes} states${none.exhausted ? ', every one there is' : ''}`);
        keptNone.set(noKey, none);
        return null;
      }
      console.log(`   the recorded no-way ${noKey} depends on something that changed (${none.print} -> ${print}): searching (re-record with --record)`);
    }
    const before = recorded.get(key);
    if (before) {
      const end = play(start, before);
      if (end && goal(end.g) && livesOn(end)) { kept.set(key, before); return { route: before, end, nodes: 0 }; }
      console.log(`   a recorded route (${key}) no longer reaches its goal: searching (re-record with --record)`);
    }
    const t0 = performance.now();
    const own: SearchStats = { exhausted: false };
    const found = bfs(start, goal, aim, limit, weight, own);
    if (stats) { stats.exhausted = own.exhausted; stats.nodes = own.nodes; stats.rooms = own.rooms; }
    const took = ((performance.now() - t0) / 1000).toFixed(1);
    console.log(`   searched ${found ? key : noKey}: ${found ? 'a way' : 'no way'}, ${own.nodes ?? 0} states${!found && own.exhausted ? ' (every one there is)' : ''}, ${took} s`);
    if (found && !before && !record && !full) console.log(`   no recorded route for the search ${key}: searched (record it with --record)`);
    if (!found && !none && times === 1 && !record && !full) console.log(`   no recorded no-way for the search ${noKey}: searched (record it with --record)`);
    if (found && record) kept.set(key, found.route);
    if (!found && record && times === 1) {
      const rooms = own.rooms ?? [start.g.roomId];
      keptNone.set(noKey, { print: proofPrint(start, rooms), rooms: [...rooms], exhausted: own.exhausted, nodes: own.nodes ?? 0 });
    }
    if (record) save();
    return found;
  }
  return search;
}
