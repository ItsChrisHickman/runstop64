// One memory budget for everything runstop64 runs in claude.slice, whoever starts it (the coordinating session's runner, an agent's
// test in its worktree, a typecheck): before a heavy process starts it reserves its cap here and waits while the reservations held
// add up to more than the budget. 2026-11-27: two runners (the session's gate and an agent's tests) each kept within their own
// budget, together passed the slice's 4 GB MemoryMax, and the kernel's OOM killer took Claude Code itself.
//
// A reservation is a file per process in os.tmpdir()/runstop64-mem/ (`<pid>.json`: { mb, what }); one whose process is gone is stale
// and removed. A process goes in when the reservations made before its own (by file time, then pid), running or waiting, leave room:
// a queue, so two starting at once do not both go in over the budget and a big run is not overtaken for ever.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DIR = path.join(os.tmpdir(), 'runstop64-mem');
/** What everything runstop64 runs may hold at once (MB): the slice's 4 GB less Claude Code and its agents (~0.5 GB each) and page cache. */
export const BUDGET_MB = Math.max(512, Number(process.env.RUNSTOP64_MEM_BUDGET_MB ?? 2600) || 2600);

const alive = (pid) => { try { process.kill(pid, 0); return true; } catch (e) { return e?.code === 'EPERM'; } };
const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

/** The reservations held now: [pid, mb, time], stale ones removed. */
function held() {
  let names = [];
  try { names = fs.readdirSync(DIR); } catch { return []; }
  const out = [];
  for (const n of names) {
    const pid = Number(n.replace(/\.json$/, ''));
    const file = path.join(DIR, n);
    if (!Number.isInteger(pid) || !alive(pid)) { fs.rmSync(file, { force: true }); continue; }
    try { out.push([pid, Number(JSON.parse(fs.readFileSync(file, 'utf8')).mb) || 0, fs.statSync(file).mtimeMs]); } catch { /* being written */ }
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
  // (the file stays while it waits: a queue, first come first served, so a big run is not overtaken for ever by small ones)
  fs.writeFileSync(mine, JSON.stringify({ mb: want, what }));
  const me = fs.statSync(mine).mtimeMs;
  let told = false;
  for (;;) {
    const before = held().filter(([p, , t]) => p !== pid && (t < me || (t === me && p < pid))).reduce((s, [, m]) => s + m, 0);
    if (before + want <= BUDGET_MB) break;
    if (!told) { console.error(`[mem-budget] waiting: ${what} needs ${want} MB, ${before} MB of ${BUDGET_MB} held by other runs`); told = true; }
    sleep(1500 + (pid % 7) * 100);
  }
  const release = () => fs.rmSync(mine, { force: true });
  process.on('exit', release);
  return release;
}
