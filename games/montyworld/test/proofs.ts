/**
 * `search` for the mechanism tests (china-mechanisms.ts ...): the same call and the same answer, but a way the search found is recorded
 * (routes/<test>.json, committed) and the next run PLAYS it instead of searching again, and checks the goal (and that he lives on) as the search does.
 * A search that finds no way (the "no way without the key" pointers) has nothing to record and is searched as before. A route that no longer reaches
 * its goal is searched afresh (and the run says so); the key of a route is a hash of where it starts, what it aims at and the goal's text, so adding
 * a search to a test moves no other.
 *
 *   --record   search everything again and write the routes found (after a room or a mechanism changed)
 *   --full     search everything again, write nothing
 * The test file's name is taken from the bundle (`runstop64-test-<name>-<pid>.mjs`), so a test needs nothing but to import `search` from here.
 */
import fs from 'node:fs';
import { readJsonFile } from '../../shared/test/data';
import * as S from '../../../packages/c64kit/src/schema';
import type { State } from '../../montyotr/test/play';
import { keyOf, livesOn, play, search as bfs, type Aim, type Goal, type Route } from './bot';
import { parseRoute, ROUTES_DIR, showRoute } from './legs';

const flags = process.argv.slice(2).filter((a) => a.startsWith('--'));
const record = flags.includes('--record'), full = flags.includes('--full');
const name = process.argv[1]?.match(/runstop64-test-(.+)-\d+\.mjs$/)?.[1] ?? 'mechanisms';
const file = `${ROUTES_DIR}/${name}.json`;
const fileShape = S.object({ test: S.string, routes: S.record(S.string) });

const recorded = new Map<string, Route>();
const kept = new Map<string, Route>();
if (!record && !full && fs.existsSync(file)) {
  const v = readJsonFile(file);
  if (!fileShape(v)) throw new Error(`${file}: not a recorded route file`);
  for (const [k, steps] of Object.entries(v.routes)) recorded.set(k, parseRoute(steps));
}

/** FNV-1a of a string, in hex. */
function hash(text: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 0x01000193) >>> 0;
  return h.toString(16);
}

function save(): void {
  const lines = [...kept].map(([k, r]) => `    ${JSON.stringify(k)}: ${JSON.stringify(showRoute(r))}`);
  fs.mkdirSync(ROUTES_DIR, { recursive: true });
  fs.writeFileSync(file, `{\n  "test": ${JSON.stringify(name)},\n  "routes": {\n${lines.join(',\n')}\n  }\n}\n`);
}

export function search(start: State, goal: Goal, aim?: readonly Aim[], limit = 400000, weight = 1.5, stats?: { exhausted: boolean }): { route: Route; end: State; nodes: number } | null {
  const key = hash([keyOf(start.g), goal.toString(), JSON.stringify(aim ?? null), limit, weight].join('|'));
  const before = recorded.get(key);
  if (before) {
    const end = play(start, before);
    if (end && goal(end.g) && livesOn(end)) { kept.set(key, before); return { route: before, end, nodes: 0 }; }
    console.log(`   a recorded route (${key}) no longer reaches its goal: searching (re-record with --record)`);
  } else if (!record && !full) console.log(`   no recorded route for the search ${key}: searching (record it with --record)`);
  const found = bfs(start, goal, aim, limit, weight, stats);
  if (found && record) { kept.set(key, found.route); save(); }
  return found;
}
