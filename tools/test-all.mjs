#!/usr/bin/env node
// One entry point for the repo's headless tests, on node:test (built in, nothing to install).
// The manifest (tools/tests.mjs) lists each test script with the arguments it needs; every one is
// run as its own child process (`nice -n 15 node tools/test.mjs <file> [args]`), two at a time
// (JOBS=n to change it: the box has 4 cores shared with the live sites and CaptureM360's tests, and three at once made each
// test about 1.7x slower), and passes when it exits 0.
//
//   node tools/test-all.mjs                 the fast set (a few minutes)
//   node tools/test-all.mjs --slow          the fast set, then the slow one
//   node tools/test-all.mjs --only-slow     just the slow set
//   node tools/test-all.mjs --list          what would run (and what is skipped, and why)
//   node tools/test-all.mjs <text> ...      only tests whose name contains the text (e.g. `entombed`)
//   --plan=<file.json>                      the runs a JSON file lists (tools/affected.mjs writes one: `[{ file, args, set, limitSeconds, name }]`)
//   --verbose                               show each test's own output, not only when it fails
//
// A test whose inputs are not on this machine (the originals of Auf Wiedersehen Monty are gitignored:
// games/awm/build/README.md) is skipped with a message saying what it needs, never failed.
// `npm run verify` runs this after the typecheck and the strict check.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, suite, test } from 'node:test';
import { TESTS } from './tests.mjs';
import { BUDGET_MB as SHARED_MB } from './mem-budget.mjs';
import { keyOf, recordPeaks, recordTimings } from './timings.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const filters = argv.filter((a) => !a.startsWith('--'));
const verbose = flags.has('--verbose');
const sets = flags.has('--only-slow') ? ['slow'] : flags.has('--slow') ? ['fast', 'slow'] : ['fast'];

/** The name a test is listed by: its file without the folder prefix noise, and its arguments. */
const nameOf = (t) => t.name ?? [t.file ?? t.cmd.join(' '), ...(t.args ?? [])].join(' ');
const missing = (t) => (t.needs ?? []).filter((f) => !fs.existsSync(path.resolve(root, f)));
const planFile = argv.find((a) => a.startsWith('--plan='))?.slice('--plan='.length);
const chosen = planFile
  ? JSON.parse(fs.readFileSync(planFile, 'utf8')).filter((t) => filters.length === 0 || filters.some((f) => nameOf(t).includes(f)))
  : TESTS
    .filter((t) => sets.includes(t.set))
    .filter((t) => filters.length === 0 || filters.some((f) => nameOf(t).includes(f)));

if (flags.has('--list')) {
  for (const t of chosen) {
    const lack = missing(t);
    console.log(`${t.set.padEnd(5)} ${nameOf(t)}${lack.length ? `   SKIPPED: needs ${lack.join(', ')}` : ''}`);
  }
  process.exit(0);
}

/** The process groups of the tests running now: killed when the runner stops, so no test outlives it (each is a group of its own, below). */
const live = new Set();
const killAll = () => { for (const pid of live) try { process.kill(-pid, 'SIGKILL'); } catch { /* gone */ } };
process.on('exit', killAll);
for (const sig of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sig, () => { killAll(); process.exit(130); });

/** Runs a command to its end (killed if it takes longer than `limit` ms) and gives its exit code and output. */
function run(cmd, limit, env) {
  return new Promise((resolve) => {
    // `nice -n 15`: on the live server nothing here may compete with the sites.
    // (a process group of its own, killed whole: a test is nice > tools/test.mjs > the test in its scope, and killing only the first left the
    // test running past its limit, holding its memory: 2026-11-27, siberia-mechanisms.ts ran on to 829 s after its 600 s limit)
    const child = spawn('nice', ['-n', '15', ...cmd], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'], env: { ...process.env, ...env }, detached: true });
    live.add(child.pid);
    const chunks = [];
    child.stdout.on('data', (c) => chunks.push(c));
    child.stderr.on('data', (c) => chunks.push(c));
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
    }, limit);
    child.on('close', (code) => {
      live.delete(child.pid);
      clearTimeout(timer);
      resolve({ code: timedOut ? null : code, timedOut, output: Buffer.concat(chunks).toString('utf8') });
    });
  });
}

/**
 * Memory, not a count, decides what runs together (2026-11-27: two tests at a 2 GB heap each, and Claude Code, were more than claude.slice's
 * 3.5 GB MemoryHigh, and the slice throttled to a standstill twice). Each test holds its cap (`memoryMB` in tests.mjs, else tools/test.mjs's
 * default, TEST_MEMORY_MB) while it runs, the kernel kills it past that, and tests start only while the caps held add up to `TEST_BUDGET_MB`.
 */
const DEFAULT_MB = Math.max(256, Number(process.env.TEST_MEMORY_MB ?? 1400) || 1400);
// (the runner's share is the one budget every run shares: tools/mem-budget.mjs; tools/test.mjs reserves there too, so agents' tests count)
const BUDGET_MB = Math.max(DEFAULT_MB, Number(process.env.TEST_BUDGET_MB ?? SHARED_MB) || SHARED_MB);
let held = 0;
const waiting = [];
async function hold(mb) {
  const want = Math.min(mb, BUDGET_MB);
  while (held + want > BUDGET_MB) await new Promise((r) => waiting.push(r));
  held += want;
  return () => { held -= want; waiting.splice(0).forEach((r) => r()); };
}
/** How often claude.slice has been throttled at its MemoryHigh (cgroup v2 memory.events `high`), or null off this box. */
function sliceHigh() {
  try { return Number(/^high (\d+)/m.exec(fs.readFileSync('/sys/fs/cgroup/claude.slice/memory.events', 'utf8'))?.[1]); } catch { return null; }
}
const highAtStart = sliceHigh();
const peaks = [];
let cached = 0;

/** How many tests run at once (two by default: 4 cores shared with the sites and CaptureM360; three at once measured 1.7x slower each). */
const JOBS = Math.max(1, Number(process.env.JOBS ?? 2) || 2);
const timings = [];
suite('runstop64', { concurrency: JOBS }, () => {
for (const t of chosen) {
  const lack = missing(t);
  const name = `[${t.set}] ${nameOf(t)}`;
  if (lack.length) {
    test(name, { skip: `needs ${lack.join(', ')} (not on this machine)` }, () => {});
    continue;
  }
  test(name, t.todo ? { todo: t.todo } : {}, async () => {
    const cmd = t.cmd ?? [process.execPath, 'tools/test.mjs', t.file, ...(t.args ?? [])];
    const limit = t.limitSeconds ? t.limitSeconds * 1000 : (t.set === 'fast' ? 300_000 : 580_000);
    const mb = t.memoryMB ?? DEFAULT_MB;
    const release = await hold(mb);
    const started = performance.now();
    const { code, timedOut, output } = await run(cmd, limit, { TEST_MEMORY_MB: String(mb), TEST_CACHE: '1' }).finally(release);
    if (output.includes('[test.mjs] cached pass')) cached++;
    const seconds = (performance.now() - started) / 1000;
    const peak = Number(/\[test\.mjs\] peak (\d+) MB/.exec(output)?.[1] ?? NaN);
    if (Number.isFinite(peak)) peaks.push({ key: keyOf(t), mb: peak });
    timings.push({ set: t.set, name: nameOf(t), key: keyOf(t), seconds, ok: code === 0 && !timedOut });
    if (verbose || code !== 0) process.stdout.write(output.split('\n').map((l) => `    | ${l}`).join('\n') + '\n');
    if (timedOut) throw new Error(`took more than ${limit / 1000}s and was stopped`);
    if (code !== 0) throw new Error(`exited ${code}`);
  });
}
});

after(() => {
  recordTimings(timings);
  recordPeaks(peaks);
  if (cached) console.log(`# ${cached} test(s) not run again: passed before on the same code and inputs (tools/test-cache.mjs; TEST_FRESH=1 runs them)`);
  const high = sliceHigh();
  if (high !== null && highAtStart !== null && high > highAtStart) console.log(`# claude.slice was throttled at its MemoryHigh ${high - highAtStart} times during this run: something outgrew its cap's arithmetic (TEST_BUDGET_MB)`);
  const big = [...peaks].sort((a, b) => b.mb - a.mb).slice(0, 5).map((x) => `${x.key.split(' ')[0].split('/').pop()} ${x.mb} MB`).join('; ');
  if (big) console.log(`# heaviest: ${big}`);
  for (const set of [...new Set(timings.map((x) => x.set))]) {
    const mine = timings.filter((x) => x.set === set);
    if (!mine.length) continue;
    const total = mine.reduce((n, x) => n + x.seconds, 0);
    const slowest = [...mine].sort((a, b) => b.seconds - a.seconds).slice(0, 5).map((x) => `${x.name} ${x.seconds.toFixed(1)}s`).join('; ');
    console.log(`# ${set}: ${mine.length} run, ${total.toFixed(0)}s; slowest: ${slowest}`);
  }
});
