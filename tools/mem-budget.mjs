// One memory budget for everything runstop64 runs in claude.slice, whoever starts it (the coordinating session's runner, an agent's
// test in its worktree, a typecheck): before a heavy process starts it reserves its cap here and waits while the reservations held
// add up to more than the budget. 2026-11-27: two runners (the session's gate and an agent's tests) each kept within their own
// budget, together passed the slice's 4 GB MemoryMax, and the kernel's OOM killer took Claude Code itself.
//
// A reservation is a file per process in os.tmpdir()/runstop64-mem/ (`<pid>.json`: { mb, what, at, state }); one whose process is gone
// is stale and removed. A process goes in when the reservations queued before its own (by `at`, then pid), running or waiting, leave
// room: a queue, so two starting at once do not both go in over the budget and a big run is not overtaken for ever. (`at` is kept in
// the file, not taken from its mtime: the file is rewritten when it starts running, and a rewritten mtime would move a running
// reservation behind the ones waiting, which would then stop counting it.)
//
// A test reserves what it was last measured to need (`sizeFor`: its recorded peak and a margin, never more than its cap), not its cap:
// with every test at the 1400 MB default cap only one ran at a time while most peak under 500 MB (tools/timings.mjs's peaks). The cap
// stays the kernel's hard limit; a test that grows past its reservation is measured again on that run.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DIR = path.join(os.tmpdir(), 'runstop64-mem');
/** What everything runstop64 runs may hold at once (MB): the slice's 4 GB less Claude Code and its agents (~0.5 GB each) and page cache. */
export const BUDGET_MB = Math.max(512, Number(process.env.RUNSTOP64_MEM_BUDGET_MB ?? 2600) || 2600);

const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e?.code === 'EPERM'; } };
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** The reservations held now: [pid, mb, queued at, running], stale ones removed. */
function held() {
  let names = [];
  try { names = fs.readdirSync(DIR); } catch { return []; }
  const out = [];
  for (const n of names) {
    const pid = Number(n.replace(/\.json$/, ''));
    const file = path.join(DIR, n);
    if (!Number.isInteger(pid) || !alive(pid)) { fs.rmSync(file, { force: true }); continue; }
    try {
      const r = JSON.parse(fs.readFileSync(file, 'utf8'));
      out.push([pid, Number(r.mb) || 0, Number(r.at) || fs.statSync(file).mtimeMs, r.state === 'running']);
    } catch { /* being written */ }
  }
  return out;
}

/**
 * Waits (synchronously, printing once) until `mb` fits beside the reservations made before this one, and holds it until `release()` or
 * the process ends. `pid` is the process the reservation is for (the one whose end releases it).
 */
export function reserve(mb, what, pid = process.pid) {
  const want = Math.min(mb, BUDGET_MB);
  fs.mkdirSync(DIR, { recursive: true });
  const mine = path.join(DIR, `${pid}.json`);
  const at = Date.now() + (pid % 1000) / 1000; // (the pid breaks a tie within a millisecond)
  const write = (state) => {
    const tmp = `${mine}.${state}`;
    fs.writeFileSync(tmp, JSON.stringify({ mb: want, what, at, state }));
    fs.renameSync(tmp, mine); // (atomic: a reader never sees half a file and drops it from the count)
    fs.utimesSync(mine, at / 1000, at / 1000); // (and its time stays `at`: older copies of this file, in agents' worktrees, queue by mtime)
  };
  // (the file stays while it waits: a queue, first come first served, so a big run is not overtaken for ever by small ones)
  write('waiting');
  let told = false;
  for (;;) {
    const ahead = held().filter(([p, , t]) => p !== pid && (t < at || (t === at && p < pid)));
    const before = ahead.reduce((s, [, m]) => s + m, 0);
    if (before + want <= BUDGET_MB) break;
    if (!told) {
      const running = ahead.filter(([, , , r]) => r).reduce((s, [, m]) => s + m, 0);
      console.error(`[mem-budget] waiting: ${what} needs ${want} MB of ${BUDGET_MB}; ${running} MB running, ${before - running} MB queued ahead`);
      told = true;
    }
    sleep(1500 + (pid % 7) * 100);
  }
  write('running');
  const release = () => fs.rmSync(mine, { force: true });
  process.on('exit', release);
  return release;
}

const PEAKS = path.join(os.tmpdir(), 'runstop64-peaks.json');
/** What a run last measured to need (MB): its recorded peak plus a quarter and 100 MB, never more than `cap`; `cap` if never measured. */
export function sizeFor(key, cap) {
  let peak = NaN;
  try { peak = Number(JSON.parse(fs.readFileSync(PEAKS, 'utf8'))[key]); } catch { /* none yet */ }
  return Number.isFinite(peak) && peak > 0 ? Math.min(cap, Math.round(peak * 1.25) + 100) : cap;
}
/** Keeps a run's measured peak (MB) for `sizeFor` (and the runner's report: tools/timings.mjs readPeaks). */
export function recordPeak(key, mb) {
  let all = {};
  try { all = JSON.parse(fs.readFileSync(PEAKS, 'utf8')) ?? {}; } catch { /* none yet */ }
  all[key] = mb;
  const tmp = `${PEAKS}.${process.pid}`;
  try { fs.writeFileSync(tmp, JSON.stringify(all, null, 1)); fs.renameSync(tmp, PEAKS); } catch { /* a tmp dir we cannot write: no record */ }
}
