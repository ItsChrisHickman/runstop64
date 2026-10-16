#!/usr/bin/env node
// One entry point for the repo's headless tests, on node:test (built in, nothing to install).
// The manifest (tools/tests.mjs) lists each test script with the arguments it needs; every one is
// run as its own child process (`nice -n 15 node tools/test.mjs <file> [args]`), one at a time
// (this is a live production server), and passes when it exits 0.
//
//   node tools/test-all.mjs                 the fast set (a few minutes)
//   node tools/test-all.mjs --slow          the fast set, then the slow one
//   node tools/test-all.mjs --only-slow     just the slow set
//   node tools/test-all.mjs --list          what would run (and what is skipped, and why)
//   node tools/test-all.mjs <text> ...      only tests whose name contains the text (e.g. `entombed`)
//   --verbose                               show each test's own output, not only when it fails
//
// A test whose inputs are not on this machine (the originals of Auf Wiedersehen Monty are gitignored:
// games/awm/build/README.md) is skipped with a message saying what it needs, never failed.
// `npm run verify` runs this after the typecheck and the strict check.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { after, test } from 'node:test';
import { TESTS } from './tests.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const argv = process.argv.slice(2);
const flags = new Set(argv.filter((a) => a.startsWith('--')));
const filters = argv.filter((a) => !a.startsWith('--'));
const verbose = flags.has('--verbose');
const sets = flags.has('--only-slow') ? ['slow'] : flags.has('--slow') ? ['fast', 'slow'] : ['fast'];

/** The name a test is listed by: its file without the folder prefix noise, and its arguments. */
const nameOf = (t) => t.name ?? [t.file ?? t.cmd.join(' '), ...(t.args ?? [])].join(' ');
const missing = (t) => (t.needs ?? []).filter((f) => !fs.existsSync(path.resolve(root, f)));
const chosen = TESTS
  .filter((t) => sets.includes(t.set))
  .filter((t) => filters.length === 0 || filters.some((f) => nameOf(t).includes(f)));

if (flags.has('--list')) {
  for (const t of chosen) {
    const lack = missing(t);
    console.log(`${t.set.padEnd(5)} ${nameOf(t)}${lack.length ? `   SKIPPED: needs ${lack.join(', ')}` : ''}`);
  }
  process.exit(0);
}

/** Runs a command to its end (killed if it takes longer than `limit` ms) and gives its exit code and output. */
function run(cmd, limit) {
  return new Promise((resolve) => {
    // `nice -n 15`: on the live server nothing here may compete with the sites.
    const child = spawn('nice', ['-n', '15', ...cmd], { cwd: root, stdio: ['ignore', 'pipe', 'pipe'] });
    const chunks = [];
    child.stdout.on('data', (c) => chunks.push(c));
    child.stderr.on('data', (c) => chunks.push(c));
    let timedOut = false;
    const timer = setTimeout(() => { timedOut = true; child.kill('SIGKILL'); }, limit);
    child.on('close', (code) => {
      clearTimeout(timer);
      resolve({ code: timedOut ? null : code, timedOut, output: Buffer.concat(chunks).toString('utf8') });
    });
  });
}

const timings = [];
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
    const started = performance.now();
    const { code, timedOut, output } = await run(cmd, limit);
    const seconds = (performance.now() - started) / 1000;
    timings.push({ set: t.set, name: nameOf(t), seconds });
    if (verbose || code !== 0) process.stdout.write(output.split('\n').map((l) => `    | ${l}`).join('\n') + '\n');
    if (timedOut) throw new Error(`took more than ${limit / 1000}s and was stopped`);
    if (code !== 0) throw new Error(`exited ${code}`);
  });
}

after(() => {
  for (const set of sets) {
    const mine = timings.filter((x) => x.set === set);
    if (!mine.length) continue;
    const total = mine.reduce((n, x) => n + x.seconds, 0);
    const slowest = [...mine].sort((a, b) => b.seconds - a.seconds).slice(0, 5).map((x) => `${x.name} ${x.seconds.toFixed(1)}s`).join('; ');
    console.log(`# ${set}: ${mine.length} run, ${total.toFixed(0)}s; slowest: ${slowest}`);
  }
});
