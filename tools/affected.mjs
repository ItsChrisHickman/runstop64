#!/usr/bin/env node
// The change detector: which tests a change needs, from `git diff` (Chris, 2026-11-23: a change about one room re-ran whole regions and
// took hours). The normal pre-ship check for an agent's change:
//
//   node tools/affected.mjs [base]            print the plan (base: main; the diff is from where HEAD left base to the working tree, untracked files too)
//   node tools/affected.mjs [base] --run      run it: typecheck, check:strict, then the plan's tests on tools/test-all.mjs (JOBS at a time, 2 by default, niced)
//   --slow                                    with a full fallback, the slow set too (the region bots, the reward show)
//   --list                                    only the changed files and what each maps to
//
// How a change maps to tests:
// - A Monty game's region file (games/montyworld/src/siberia.ts...): its changed lines are mapped to rooms (games/shared/monty/test/attribute.ts) and
//   the game's planner (games/<game>/test/affected.ts, the shared games/shared/monty/test/affected.ts) gives the room-scoped runs (`--room`): the room
//   tests over those rooms, the region's mechanisms and bot over them, and the cheap world-wide tests. Changes about several regions: the full suites.
// - Any other file: every test that imports it without going through a hub (`HUBS`: a game's whole-game value, data.ts, which imports
//   every region, tune, picture and set piece, so every test bundles nearly everything: following imports through it made a change to a
//   tune's constant run 42 tests, Chris 2026-11-24). A file reached only through a hub runs no test here; the end-of-batch verify covers it.
// - Markdown: nothing to test. A file no test imports (a tool, a config, package.json): the full suites (`node tools/test-all.mjs --slow`).
// The full suites stay the ship gate's fallback: `npm run verify` and `node tools/test-all.mjs --slow` are unchanged.
import { execFileSync, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import { ensureGen } from './gen.mjs';
import { TESTS } from './tests.mjs';
import { keyOf, readTimings, secondsOf } from './timings.mjs';

/** The aggregators: a game's whole value. Imports are not followed through them (see above). */
const HUBS = new Set(['games/montyworld/src/data.ts', 'games/montyotr/src/motr.ts', 'games/registry.ts']);
/** A run's budget in minutes (TEST_BUDGET_MIN): `--run` refuses a plan estimated over it unless `--over-budget` (a full run Chris asked for). */
const BUDGET_MIN = Number(process.env.TEST_BUDGET_MIN ?? 10) || 10;

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const base = argv.find((a) => !a.startsWith('--')) ?? 'main';
const git = (...args) => execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 64 << 20 });

// ---- what changed -------------------------------------------------------------------------------------------------------------------------------------------
const since = git('merge-base', base, 'HEAD').trim();
/** file -> { lines: changed lines (new side), whole: added or removed } */
const changes = new Map();
{
  let file = null;
  for (const line of git('diff', '-U0', '--no-color', '--no-renames', since).split('\n')) {
    if (line.startsWith('diff --git ')) { file = null; continue; }
    if (line.startsWith('--- ')) { const p = line.slice(4); if (p !== '/dev/null') file = p.replace(/^a\//, ''); continue; }
    if (line.startsWith('+++ ')) {
      const p = line.slice(4);
      const whole = p === '/dev/null' || (file === null);
      if (p !== '/dev/null') file = p.replace(/^b\//, '');
      if (file) changes.set(file, { lines: [], whole });
      continue;
    }
    const m = /^@@ -\d+(?:,\d+)? \+(\d+)(?:,(\d+))? @@/.exec(line);
    if (m && file) {
      const start = Number(m[1]), count = m[2] === undefined ? 1 : Number(m[2]);
      const c = changes.get(file);
      // a deletion is between two lines: both sides of it
      if (count === 0) c.lines.push(start, start + 1); else for (let i = 0; i < count; i++) c.lines.push(start + i);
    }
  }
  for (const f of git('ls-files', '--others', '--exclude-standard').split('\n').filter(Boolean)) changes.set(f, { lines: [], whole: true });
}
if (changes.size === 0) { console.log(`nothing changed since ${base} (${since.slice(0, 8)})`); process.exit(0); }

// ---- which test imports what (one esbuild pass over every test, nothing written) ---------------------------------------------------------------------------
ensureGen();
const entries = [...new Set(TESTS.filter((t) => t.file).map((t) => t.file))].filter((f) => fs.existsSync(path.join(root, f)));
const meta = (await build({
  entryPoints: entries, absWorkingDir: root, bundle: true, platform: 'node', format: 'esm', outdir: path.join(os.tmpdir(), 'runstop64-affected'), write: false, metafile: true, logLevel: 'silent',
  alias: { c64kit: path.join(root, 'games/shared/test/kit.ts') },
  plugins: [{
    name: 'url-stub',
    setup(b) {
      b.onResolve({ filter: /\?url$/ }, (a) => ({ path: a.path, namespace: 'url-stub' }));
      b.onLoad({ filter: /.*/, namespace: 'url-stub' }, () => ({ contents: 'export default ""', loader: 'js' }));
    },
  }],
})).metafile;
/** test file -> the files its bundle reads */
const bundled = new Map();
for (const out of Object.values(meta.outputs)) if (out.entryPoint) bundled.set(out.entryPoint, new Set(Object.keys(out.inputs)));
/** file -> the files it imports */
const edges = new Map(Object.entries(meta.inputs).map(([f, i]) => [f, i.imports.map((x) => x.path).filter((x) => x in meta.inputs)]));
/** test file -> the files it reaches without passing through a hub (a hub itself is reached, not gone through) */
const imports = new Map();
for (const e of entries) {
  const seen = new Set([e]);
  const todo = [e];
  while (todo.length) {
    const f = todo.pop();
    if (f !== e && HUBS.has(f)) continue;
    for (const g of edges.get(f) ?? []) if (!seen.has(g)) { seen.add(g); todo.push(g); }
  }
  imports.set(e, seen);
}
const importers = (file) => entries.filter((e) => imports.get(e)?.has(file));
const bundledBy = (file) => entries.filter((e) => bundled.get(e)?.has(file));

// ---- the Monty games' planners -------------------------------------------------------------------------------------------------------------------------------
const planners = fs.readdirSync(path.join(root, 'games')).map((g) => `games/${g}/test/affected.ts`).filter((f) => fs.existsSync(path.join(root, f)));
const list = [...changes].map(([file, c]) => ({ file, lines: c.lines, whole: c.whole }));
const tmp = path.join(os.tmpdir(), `runstop64-changes-${process.pid}.json`);
fs.writeFileSync(tmp, JSON.stringify(list));
const plans = [];
for (const planner of planners) {
  const r = spawnSync('nice', ['-n', '15', process.execPath, 'tools/test.mjs', planner, tmp], { cwd: root, encoding: 'utf8' });
  const line = (r.stdout ?? '').split('\n').find((l) => l.startsWith('PLAN '));
  if (r.status !== 0 || !line) { console.error(`${planner} failed:\n${r.stdout}${r.stderr}`); process.exit(1); }
  plans.push(JSON.parse(line.slice(5)));
}
fs.rmSync(tmp, { force: true });

// ---- the plan -----------------------------------------------------------------------------------------------------------------------------------------------
// what changes how every test is built or what it runs on: all of them. The runner and the planner (test-all, tests, affected, timings,
// wait-turn) change no test's outcome, so they run none (a broken runner shows on its next use).
const NEEDS_ALL = /^(tools\/(test|gen)\.mjs|tools\/re\/|package(-lock)?\.json|tsconfig(\.test)?\.json|types\/)/;
const RUNNER = /^tools\/(test-all|tests|affected|timings)\.mjs$|^tools\/wait-turn\.sh$/;
const runs = []; // { file, args, why }
const whole = new Map(); // test file -> why (run whole, fast and slow)
let everything = null; // why every test must run
const notes = [];
const claimedBy = new Map();
for (const p of plans) for (const f of p.claimed) claimedBy.set(f, p);
for (const [file] of changes) {
  const p = claimedBy.get(file);
  if (p) continue;
  if (file.endsWith('.md')) { notes.push(`${file}: prose, nothing to test`); continue; }
  if (RUNNER.test(file)) { notes.push(`${file}: the test runner or planner, no test (the typecheck only)`); continue; }
  // a recorded route file is read by its test at run time, not imported: routes/<region>-<mode>.json is the region's bot, routes/<test>.json a mechanisms test's
  const route = /^(games\/[^/]+\/test)\/routes\/(.+?)(-original|-enhanced)?\.json$/.exec(file);
  if (route) {
    const test = `${route[1]}/${route[2]}.ts`;
    if (fs.existsSync(path.join(root, test))) { if (!whole.has(test)) whole.set(test, `its recorded routes changed (${file})`); continue; }
  }
  const by = importers(file);
  if (by.length === 0 && !NEEDS_ALL.test(file) && bundledBy(file).length) { notes.push(`${file}: reached only through a hub (${[...HUBS].filter((h) => bundledBy(file).length && entries.some((e) => imports.get(e)?.has(h))).join(', ')}), no test of its own: the end-of-batch verify covers it`); continue; }
  if (NEEDS_ALL.test(file) || (by.length === 0 && /\.(m?[jt]s|json)$/.test(file))) { everything ??= `${file} is not imported by a test (a tool, a config): every test`; continue; }
  if (by.length === 0) { notes.push(`${file}: no test reads it`); continue; }
  // a test that changed is run itself; any other file runs the tests importing it
  for (const t of by) if (!whole.has(t)) whole.set(t, t === file ? 'changed' : `imports ${file}`);
}
for (const p of plans) {
  for (const n of p.notes) notes.push(`${p.game}: ${n}`);
  if (p.full) {
    // the full suites for the claimed files: every test that imports them, whole
    for (const f of p.claimed) for (const t of importers(f)) if (!whole.has(t)) whole.set(t, `${p.full}`);
    continue;
  }
  for (const r of p.runs) runs.push(r); // (a test also run whole is run whole; a slow one left out of the whole runs keeps its scoped run)
  // a test that imports a claimed file and that the planner does not name: run whole (never left out silently)
  if (p.claimed.length) {
    const named = new Set(p.covered);
    for (const f of p.claimed) for (const t of importers(f)) if (!named.has(t) && !whole.has(t)) whole.set(t, `imports ${f} and ${p.game}'s planner does not name it`);
  }
}

/** The tests.mjs entries for a file (its arguments, set and time limit), for the runs. */
const entriesOf = (file) => TESTS.filter((t) => t.file === file);
const planned = [];
if (everything) {
  console.log(`full suites: ${everything}`);
} else {
  for (const [file, why] of whole) for (const t of entriesOf(file).length ? entriesOf(file) : [{ file, set: 'fast' }]) {
    if (t.set === 'slow' && !flags.has('--slow') && why !== 'changed' && !why.startsWith('its recorded routes')) {
      const scoped = runs.some((r) => r.file === file);
      notes.push(`slow, ${scoped ? 'run room-scoped only' : 'not run'} without --slow: ${file} ${(t.args ?? []).join(' ')} (${why})`);
      continue;
    }
    planned.push({ ...t, name: `${[file, ...(t.args ?? [])].join(' ')} (${why})` });
  }
  for (const r of runs) {
    if (planned.some((p) => p.file === r.file && (p.args ?? []).join(' ') === r.args.filter((a) => !a.startsWith('--room')).join(' '))) continue;
    const t = entriesOf(r.file).find((e) => (e.args ?? []).join(' ') === r.args.filter((a) => !a.startsWith('--room')).join(' '));
    planned.push({ file: r.file, args: r.args, set: t?.set ?? 'fast', limitSeconds: t?.limitSeconds, name: `${[r.file, ...r.args].join(' ')} (${r.why})` });
  }
}

console.log(`changes since ${base} (${since.slice(0, 8)}): ${changes.size} file(s)`);
for (const p of plans) if (p.rooms.length) console.log(`  ${p.game}: rooms ${p.rooms.join(', ')} (${p.regions.join(', ')})${p.full ? `; FULL: ${p.full}` : ''}`);
for (const n of notes) console.log(`  ${n}`);
if (flags.has('--list')) process.exit(0);
console.log(everything ? '\nrun: npm run typecheck && npm run check:strict && node tools/test-all.mjs --slow' : `\nrun: npm run typecheck, npm run check:strict, then ${planned.length} test run(s):`);
const timings = readTimings();
for (const t of planned) { const s = secondsOf(timings, t); console.log(`  node tools/test.mjs ${[t.file, ...(t.args ?? [])].join(' ')}   ~${Math.round(s)}s${keyOf(t) in timings ? '' : ' (not timed yet)'}`); }
const jobsN = Math.max(1, Number(process.env.JOBS ?? 2) || 2);
const estimateMin = everything ? Infinity : planned.reduce((n, t) => n + secondsOf(timings, t), 0) / jobsN / 60;
console.log(everything ? '\nestimate: the full suites (well over the budget)' : `\nestimate: ~${estimateMin.toFixed(1)} min of tests at ${jobsN} at a time, plus the typecheck (budget ${BUDGET_MIN} min)`);
if (flags.has('--run') && estimateMin > BUDGET_MIN && !flags.has('--over-budget')) {
  console.log(`affected: over the ${BUDGET_MIN}-minute budget, not run. Run the one or two tests that exercise the change by hand (node tools/test.mjs <file> [--room ...]),\n` +
    'or narrow the change; --over-budget only when a full run is really due (shared engine/kit code, or once before a deploy).');
  process.exit(2);
}

if (!flags.has('--run')) { console.log('\n(node tools/affected.mjs --run runs it)'); process.exit(0); }
const step = (cmd, args, env = {}) => {
  console.log(`\n$ ${[cmd, ...args].join(' ')}`);
  const r = spawnSync(cmd, args, { cwd: root, stdio: 'inherit', env: { ...process.env, ...env } });
  if (r.status !== 0) { console.log(`affected: ${[cmd, ...args].join(' ')} failed`); process.exit(r.status ?? 1); }
};
step('nice', ['-n', '15', 'npm', 'run', '--silent', 'typecheck']);
step('nice', ['-n', '15', 'npm', 'run', '--silent', 'check:strict']);
// (two tests at once by default, as a verify takes: JOBS=n to change it; the turn is waited for that many slots)
const jobs = String(Math.max(1, Number(process.env.JOBS ?? 2) || 2));
step('tools/wait-turn.sh', [jobs]);
if (everything) step('nice', ['-n', '15', process.execPath, 'tools/test-all.mjs', '--slow'], { JOBS: jobs });
else if (planned.length) {
  const planFile = path.join(os.tmpdir(), `runstop64-plan-${process.pid}.json`);
  fs.writeFileSync(planFile, JSON.stringify(planned));
  step('nice', ['-n', '15', process.execPath, 'tools/test-all.mjs', `--plan=${planFile}`], { JOBS: jobs });
  fs.rmSync(planFile, { force: true });
}
console.log('\naffected: all passed');
