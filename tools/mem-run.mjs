#!/usr/bin/env node
// Runs a heavy command (the typecheck, the strict check) inside the one memory budget every runstop64 run shares (tools/mem-budget.mjs):
// it waits for room, then runs in a systemd scope of its own with a hard cap and no swap, killed before Claude Code if the slice is full.
//
//   node tools/mem-run.mjs <mb> -- <command> [args...]
import { spawnSync } from 'node:child_process';
import { reserve } from './mem-budget.mjs';

const [mbArg, sep, ...cmd] = process.argv.slice(2);
const mb = Number(mbArg);
if (!Number.isFinite(mb) || sep !== '--' || cmd.length === 0) {
  console.error('usage: node tools/mem-run.mjs <mb> -- <command> [args...]');
  process.exit(2);
}
reserve(mb, cmd.join(' ').slice(0, 80));
// (if the slice is ever at its cap, the kernel kills this, never Claude Code: 2026-11-27 it killed the session; a scope takes no OOMScoreAdjust, so /proc)
const KILL_FIRST = ['sh', '-c', 'echo 900 > /proc/self/oom_score_adj; exec "$@"', 'sh'];
const scoped = process.platform === 'linux' && process.getuid?.() === 0 && spawnSync('systemd-run', ['--version'], { stdio: 'ignore' }).status === 0;
const full = scoped ? ['systemd-run', '--scope', '--quiet', '--collect', '--slice=claude.slice', '-p', `MemoryMax=${mb}M`, '-p', 'MemorySwapMax=0', ...KILL_FIRST, ...cmd] : cmd;
const [bin = '', ...rest] = full;
// (Node sizes its default heap from the cgroup's limit, half of it: tsc died at 700 MB of heap in a 1400 MB scope; so set it, as tools/test.mjs does)
const heap = `--max-old-space-size=${Math.round(mb * 0.8)}`;
const r = spawnSync(bin, rest, { stdio: 'inherit', env: { ...process.env, NODE_OPTIONS: [process.env.NODE_OPTIONS, heap].filter(Boolean).join(' ') } });
if (r.signal === 'SIGKILL') console.error(`[mem-run] killed: over its memory cap of ${mb} MB`);
process.exit(r.status ?? 1);
