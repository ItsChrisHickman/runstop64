/**
 * The change detector's Monty half (tools/affected.mjs is the other): given the lines a `git diff` changed, which rooms they are about and
 * which room-scoped runs prove them. A game declares its regions and tests once (`MontyTests`, montyworld's in its `test/affected.ts`);
 * tools/affected.mjs runs that file with the changes and reads back the plan (`PLAN {json}` on a line of its own).
 *
 * - A line of a region file inside a room's literal (`{ id: SIB.coal, ... }`, `{ room: SIB.lake, ... }`: attribute.ts) is about that room.
 * - Any other line of a region file, and a change to a region's own art, pointers (its `extras`), is about every room of the region.
 * - Changes about one region: the room tests over those rooms (`--room`, with each join's neighbour), the region's own tests over them (its
 *   mechanisms' sections and its bot's legs through them), the tests of every region whose rooms or legs reach those rooms, and the cheap
 *   world-wide tests that read every room's data.
 * - Changes about several regions: the full suites (the plan says so; tools/affected.mjs runs every test that imports the files).
 * - Files that are no region's are not claimed here: tools/affected.mjs runs the tests that import them.
 */
import fs from 'node:fs';
import { readJsonFile } from '../../test/data';
import { isArrayOf, isNumbers, isRecord, isString } from '../../guards';
import { attribute, roomTables } from './attribute';
import { readRecordedFile } from './legs';
import type { RoomNames } from './scope';

/** A test run: a test file and its own arguments (the planner adds `--room`). */
export interface TestRun { readonly file: string; readonly args?: readonly string[] }

/** A region as the planner sees it: its source file, the files about all of it, its own tests and where its bot's routes are. */
export interface RegionTests {
  readonly name: string;
  /** The region file: its rooms' specs and mechanisms' entries. */
  readonly file: string;
  /** Files whose change is about every room of the region (its art, its sprite pointers). */
  readonly extras: readonly string[];
  /** Its own room-scoped tests: the mechanisms test, the bot in each mode, a layout test. */
  readonly tests: readonly TestRun[];
  /** Its bot's region name in the routes folder (`<route>-<mode>.json`, whose `rooms` say where each leg goes). */
  readonly route?: string;
}

/** A Monty game's tests, declared for the change detector. */
export interface MontyTests {
  readonly game: string;
  readonly names: RoomNames;
  /** Every room's place on the exit grid (for the rooms that join a room). */
  readonly grid: readonly { readonly id: number; readonly col: number; readonly row: number }[];
  readonly regions: readonly RegionTests[];
  /** Where the recorded routes are. */
  readonly routes: string;
  /** The world-wide room-level tests that take `--room` (joins, climbs, stands, edges...). */
  readonly roomTests: readonly TestRun[];
  /** Cheap world-wide tests run whole on any room change (totals over every region, every text, old saves). */
  readonly everyRoomChange: readonly TestRun[];
  /** Tests that import the region files but are about no room (the title, the tunes, the costumes): not run for a room change. */
  readonly roomFree: readonly string[];
  /** Slow tests about several regions' rooms that are not room-scoped (the reward show, the fairness runs): run only by the full suites. */
  readonly slowWide: readonly string[];
}

/** What changed: a file and its changed lines (new side, 1-based); `whole`: a file added or removed. */
export interface Change { readonly file: string; readonly lines: readonly number[]; readonly whole: boolean }

/** The plan for tools/affected.mjs. */
export interface Plan {
  readonly game: string;
  /** The files this game's planner read (the region files and their extras). */
  readonly claimed: readonly string[];
  /** Why the full suites must run instead, or null. */
  readonly full: string | null;
  readonly regions: readonly string[];
  readonly rooms: readonly number[];
  readonly runs: readonly { readonly file: string; readonly args: readonly string[]; readonly why: string }[];
  /** Test files that import the region files and are run or left out on purpose (so tools/affected.mjs does not run them whole). */
  readonly covered: readonly string[];
  readonly notes: readonly string[];
}

/** The rooms each region's changes are about (a region's whole list when a change is outside its rooms). */
export function changedRooms(tests: MontyTests, changes: readonly Change[]): { claimed: string[]; byRegion: Map<string, Set<number>>; notes: string[] } {
  const texts = tests.regions.map((r) => (fs.existsSync(r.file) ? fs.readFileSync(r.file, 'utf8') : ''));
  const tables = roomTables(texts);
  const claimed: string[] = [], notes: string[] = [];
  const byRegion = new Map<string, Set<number>>();
  const add = (region: string, rooms: Iterable<number>) => { const s = byRegion.get(region) ?? new Set<number>(); for (const r of rooms) s.add(r); byRegion.set(region, s); };
  for (const c of changes) {
    const i = tests.regions.findIndex((r) => r.file === c.file);
    const region = tests.regions[i];
    if (region) {
      claimed.push(c.file);
      const all = tests.names.regions.get(region.name) ?? [];
      if (c.whole) { add(region.name, all); notes.push(`${c.file}: added or removed: every room of ${region.name}`); continue; }
      const read = attribute(texts[i] ?? '', tables);
      // a line that is only a comment (or blank) is prose: nothing a test reads (a constant's doc comment changed beside it no longer runs the whole region)
      const source = (texts[i] ?? '').split('\n');
      const code = c.lines.filter((l) => !/^\s*(\/\/|\/\*|\*|$)/.test(source[l - 1] ?? ''));
      const wide = code.filter((l) => read.roomOf(l) === null);
      const rooms = code.flatMap((l) => { const r = read.roomOf(l); return r === null ? [] : [r]; });
      add(region.name, rooms);
      if (wide.length) { add(region.name, all); notes.push(`${c.file}: line${wide.length > 1 ? 's' : ''} ${wide.slice(0, 8).join(', ')}${wide.length > 8 ? '...' : ''} outside any room: every room of ${region.name}`); }
      else notes.push(`${c.file}: rooms ${[...new Set(rooms)].join(', ')}`);
      continue;
    }
    const owner = tests.regions.find((r) => r.extras.includes(c.file));
    if (owner) { claimed.push(c.file); add(owner.name, tests.names.regions.get(owner.name) ?? []); notes.push(`${c.file}: ${owner.name}'s own: every room of ${owner.name}`); }
  }
  return { claimed, byRegion, notes };
}

/** The rooms next to a room on the exit grid (a join's other side). */
function neighbours(tests: MontyTests, room: number): number[] {
  const me = tests.grid.find((g) => g.id === room);
  if (!me) return [];
  return tests.grid.filter((g) => Math.abs(g.col - me.col) + Math.abs(g.row - me.row) === 1).map((g) => g.id);
}

/** The rooms a region's tests reach: its own, the ones its bot's legs go through (its routes' `rooms`), and the rooms joining them. */
function reachOf(tests: MontyTests, region: RegionTests): Set<number> {
  const out = new Set(tests.names.regions.get(region.name) ?? []);
  if (region.route) for (const mode of ['original', 'enhanced']) for (const rooms of readRecordedFile(tests.routes, region.route, mode).rooms.values()) for (const r of rooms) out.add(r);
  for (const r of [...out]) for (const n of neighbours(tests, r)) out.add(n);
  return out;
}

const argText = (t: TestRun) => [t.file, ...(t.args ?? [])].join(' ');

/** The plan for a set of changes. */
export function plan(tests: MontyTests, changes: readonly Change[]): Plan {
  const { claimed, byRegion, notes } = changedRooms(tests, changes);
  const regions = [...byRegion.keys()];
  const rooms = [...new Set([...byRegion.values()].flatMap((s) => [...s]))].sort((a, b) => a - b);
  const covered = [...tests.roomTests, ...tests.everyRoomChange, ...tests.regions.flatMap((r) => r.tests)].map((t) => t.file).concat(tests.roomFree, tests.slowWide);
  const base = { game: tests.game, claimed, regions, rooms, covered: [...new Set(covered)] };
  if (regions.length === 0) return { ...base, full: null, runs: [], notes };
  if (regions.length > 1) return { ...base, full: `changes about several regions (${regions.join(', ')})`, runs: [], notes };
  const room = `--room=${rooms.join(',')}`;
  const runs: { file: string; args: string[]; why: string }[] = [];
  const push = (t: TestRun, args: string[], why: string) => { if (!runs.some((r) => argText(r) === argText({ file: t.file, args: [...(t.args ?? []), ...args] }))) runs.push({ file: t.file, args: [...(t.args ?? []), ...args], why }); };
  for (const t of tests.roomTests) push(t, [room], 'room test, over the changed rooms');
  for (const r of tests.regions) {
    const reach = reachOf(tests, r);
    if (!rooms.some((x) => reach.has(x))) continue;
    for (const t of r.tests) push(t, [room], r.name === regions[0] ? `${r.name}'s own, over the changed rooms` : `${r.name}'s, whose rooms or legs reach the changed rooms`);
  }
  for (const t of tests.everyRoomChange) push(t, [], 'world-wide, cheap: read every room');
  notes.push(`not run for a room change: ${tests.roomFree.join(', ')} (about no room); slow and not room-scoped (the full suites run them): ${tests.slowWide.join(', ')}`);
  return { ...base, full: null, runs, notes };
}

/** The changes tools/affected.mjs hands over (a JSON file: `[{ file, lines, whole }]`). */
export function readChanges(file: string): Change[] {
  const v = readJsonFile(file);
  const isChange = (c: unknown): c is Change => isRecord(c) && isString(c.file) && isNumbers(c.lines) && typeof c.whole === 'boolean';
  if (!isArrayOf(v, isChange)) throw new Error(`${file}: not a list of changes`);
  return v;
}

/** The entry point a game's `test/affected.ts` calls: the changes file from the command line, the plan printed for tools/affected.mjs. */
export function printPlan(tests: MontyTests, argv: readonly string[] = process.argv.slice(2)): void {
  const file = argv[0];
  if (file === undefined) throw new Error('usage: node tools/test.mjs games/<game>/test/affected.ts <changes.json>  (tools/affected.mjs runs it)');
  const p = plan(tests, readChanges(file));
  console.log(`PLAN ${JSON.stringify(p)}`);
}
