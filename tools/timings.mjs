// How long each test took when it last ran (tools/test-all.mjs records them; tools/affected.mjs estimates a plan with them, Chris 2026-11-24:
// "every change took 30 to 60 minutes"). Kept outside the repo in the machine's temp folder, shared by every checkout and worktree.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const FILE = path.join(os.tmpdir(), 'runstop64-timings.json');
/** A test not timed yet is guessed at this (seconds). */
export const UNKNOWN_SECONDS = 60;

/** The key a run is timed by: its file (or command) and its arguments, a room scope included. */
export const keyOf = (t) => [t.file ?? (t.cmd ?? []).join(' '), ...(t.args ?? [])].join(' ');

/** key -> seconds, from the last run of each. */
export function readTimings() {
  try {
    const v = JSON.parse(fs.readFileSync(FILE, 'utf8'));
    return v && typeof v === 'object' ? v : {};
  } catch { return {}; }
}

/** Keep the times of the runs that finished (a failed run's time says little). */
export function recordTimings(runs) {
  const all = readTimings();
  for (const r of runs) if (r.ok) all[r.key] = Math.round(r.seconds * 10) / 10;
  try { fs.writeFileSync(FILE, JSON.stringify(all, null, 1)); } catch { /* a temp folder that cannot be written: no estimate next time */ }
}

/** The estimate for a run: its last time, or the guess. */
export const secondsOf = (timings, t) => timings[keyOf(t)] ?? UNKNOWN_SECONDS;

const PEAKS = path.join(os.tmpdir(), 'runstop64-peaks.json');
/** key -> the peak memory (MB) of its last run: what tools/tests.mjs's `memoryMB` is set from. */
export function readPeaks() {
  try {
    const v = JSON.parse(fs.readFileSync(PEAKS, 'utf8'));
    return v && typeof v === 'object' ? v : {};
  } catch { return {}; }
}
