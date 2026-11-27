// A test's pass, remembered with everything it depended on, so the same test on the same inputs is not run again (AGENTS.md rule 6,
// made exact: Chris 2026-11-27, "testing needs to be smarter and more deliberate"). What a run depends on: its bundle (every source
// it imports, generated code included), its arguments and room scope, the Node version, and every file it read, folder it listed and
// path it checked while it ran (recorded by wrapping node:fs: routes, fixtures, ROMs and states are read at run time, not imported).
// A pass is kept per key in os.tmpdir()/runstop64-passes/ (a file each: two tests at once never write the same file) and holds while
// each of those reads still gives the same answer. Used only under tools/test-all.mjs (TEST_CACHE=1): a test run by hand always runs,
// since it may be run for the pictures it writes. TEST_FRESH=1 runs everything regardless.
import crypto from 'node:crypto';
import fs from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import os from 'node:os';
import path from 'node:path';

const DIR = path.join(os.tmpdir(), 'runstop64-passes');
/** node:fs as it is before recordReads wraps it (what the cache itself reads is not the test's). */
const real = { statSync: fs.statSync, readdirSync: fs.readdirSync, readFileSync: fs.readFileSync };
const sha = (data) => crypto.createHash('sha256').update(data).digest('hex');

/** What a path gives now, as one string: a file's hash, a folder's sorted listing's hash, or missing. */
function stateOf(p) {
  try {
    const st = real.statSync(p);
    if (st.isDirectory()) return `dir:${sha(real.readdirSync(p).sort().join('\n'))}`;
    return `file:${sha(real.readFileSync(p))}`;
  } catch { return 'missing'; }
}

/** The key of a run: its bundle, arguments, room scope and Node version. */
export function runKey(bundle, args) {
  return sha([sha(fs.readFileSync(bundle)), JSON.stringify(args), process.env.MONTY_ROOMS ?? '', process.version].join('\0'));
}

/** Whether this run passed before on the same inputs (and when), or null. */
export function cachedPass(key) {
  if (process.env.TEST_FRESH) return null;
  let rec;
  try { rec = JSON.parse(fs.readFileSync(path.join(DIR, `${key}.json`), 'utf8')); } catch { return null; }
  if (!rec || typeof rec !== 'object' || typeof rec.reads !== 'object') return null;
  for (const [p, was] of Object.entries(rec.reads)) if (stateOf(p) !== was) return null;
  return typeof rec.at === 'string' ? rec.at : '?';
}

/**
 * Starts recording what the run reads (wraps node:fs's synchronous reads and the promise readFile); `ignore` (absolute paths or
 * prefixes: the bundle, our own caches in the temp folder) is left out. Returns a function that keeps the pass under `key`.
 */
export function recordReads(key, ignore) {
  const reads = new Set();
  const note = (p) => {
    if (typeof p !== 'string' && !(p instanceof URL)) return;
    const abs = path.resolve(p instanceof URL ? p.pathname : p);
    if (!ignore.some((i) => abs.startsWith(i))) reads.add(abs);
  };
  for (const name of ['readFileSync', 'readdirSync', 'existsSync', 'statSync', 'lstatSync', 'openSync']) {
    const orig = fs[name];
    fs[name] = function (p, ...rest) { note(p); return orig.call(this, p, ...rest); };
  }
  const realRead = fs.promises.readFile;
  fs.promises.readFile = function (p, ...rest) { note(p); return realRead.call(this, p, ...rest); };
  syncBuiltinESMExports(); // (named imports of node:fs see the wrapped functions too)
  return () => {
    const states = {};
    for (const p of reads) states[p] = stateOf(p);
    fs.mkdirSync(DIR, { recursive: true });
    fs.writeFileSync(path.join(DIR, `${key}.json`), JSON.stringify({ at: new Date().toISOString(), reads: states }));
  };
}
