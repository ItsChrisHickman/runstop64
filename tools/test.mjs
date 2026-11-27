#!/usr/bin/env node
// Runs a headless check written in TypeScript: bundles it with esbuild (c64kit
// stood in by games/shared/test/kit.ts, `?url` asset imports stubbed), then runs
// it with the rest of the arguments. On the live server: nice -n 15.
//
//   nice -n 15 node tools/test.mjs games/montyotr/test/frontend.ts [args]
//   nice -n 15 node tools/test.mjs games/awm/test/frontend.ts /tmp/shots
//
// `--room <id|name>[,...]` (or `--room=...`) is taken off the arguments and handed to the test as MONTY_ROOMS: a Monty game's
// room-level tests then check only those rooms (games/shared/monty/test/scope.ts), its region bots only the legs through them.

import { spawnSync } from 'node:child_process';
import { reserve } from './mem-budget.mjs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// Memory (2026-11-24: the box froze twice when tests, agents and the sites outgrew its 7.6 GB and it thrashed swap; 2026-11-27 it locked up
// twice more, the slice that holds Claude Code and its tests throttled at its MemoryHigh, every process in it stopped at 0% CPU): every test
// runs in a systemd scope of its own inside claude.slice with a hard cap and no swap (`TEST_MEMORY_MB`, 1400 by default; tools/tests.mjs gives
// the few that need more a `memoryMB`), so a test that outgrows it is killed at once, alone, instead of stalling the slice. The heap ceiling
// sits under the cap: typed arrays (a game's VIC bank) live outside the heap and count toward the cap only. Two tests at the default cap
// and Claude Code (about 0.5 GB) stay under the slice's 3.5 GB MemoryHigh. Without systemd-run (another machine) the heap ceiling alone.
export const MEMORY_MB = Math.max(256, Number(process.env.TEST_MEMORY_MB ?? 1400) || 1400);
const HEAP_MB = Math.max(192, Math.round(MEMORY_MB * 0.8));
if (!process.execArgv.some((a) => a.startsWith('--max-old-space-size'))) {
  const node = [process.execPath, `--max-old-space-size=${HEAP_MB}`, ...process.execArgv, ...process.argv.slice(1)];
  // (if the slice is ever at its cap, the kernel kills this, never Claude Code: 2026-11-27 it killed the session; a scope takes no OOMScoreAdjust, so /proc)
  const KILL_FIRST = ['sh', '-c', 'echo 900 > /proc/self/oom_score_adj; exec "$@"', 'sh'];
  const scoped = process.platform === 'linux' && process.getuid?.() === 0 && spawnSync('systemd-run', ['--version'], { stdio: 'ignore' }).status === 0;
  const cmd = scoped ? ['systemd-run', '--scope', '--quiet', '--collect', '--slice=claude.slice', '-p', `MemoryMax=${MEMORY_MB}M`, '-p', 'MemorySwapMax=0', ...KILL_FIRST, ...node] : node;
  // one budget for every test and typecheck in the slice, whichever session or agent started it (tools/mem-budget.mjs)
  reserve(MEMORY_MB, `test ${process.argv[2] ?? ''}`);
  const [bin = process.execPath, ...rest] = cmd;
  const r = spawnSync(bin, rest, { stdio: 'inherit' });
  if (r.signal === 'SIGKILL') console.error(`[test.mjs] killed: over its memory cap of ${MEMORY_MB} MB (TEST_MEMORY_MB; tools/tests.mjs memoryMB) or stopped by the runner`);
  process.exit(r.status ?? 1);
}
// (the peak, for the runner to keep with the test's time: tools/timings.mjs)
process.on('exit', () => { process.stderr.write(`\n[test.mjs] peak ${Math.round(process.resourceUsage().maxRSS / 1024)} MB\n`); });
import { build } from 'esbuild';
import fs from 'node:fs';
import { ensureGen } from './gen.mjs';
import { cachedPass, recordReads, runKey } from './test-cache.mjs';
import { writeCodeDigests } from './code-digests.mjs';

const [, , entry, ...given] = process.argv;
const args = [];
for (let i = 0; i < given.length; i++) {
  const a = given[i];
  if (a === '--room') { process.env.MONTY_ROOMS = given[++i] ?? ''; continue; }
  if (a.startsWith('--room=')) { process.env.MONTY_ROOMS = a.slice('--room='.length); continue; }
  args.push(a);
}
if (!entry) {
  console.error('usage: node tools/test.mjs <test.ts> [args]');
  process.exit(1);
}
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
ensureGen(); // games/*/src/gen/ is not committed
const out = path.join(os.tmpdir(), `runstop64-test-${path.basename(entry, '.ts')}-${process.pid}.mjs`);
await build({
  entryPoints: [entry], bundle: true, platform: 'node', format: 'esm', outfile: out, logLevel: 'warning',
  alias: { c64kit: path.join(root, 'games/shared/test/kit.ts') },
  plugins: [{
    name: 'url-stub',
    setup(b) {
      b.onResolve({ filter: /\?(?:worker&)?url$/ }, (a) => ({ path: a.path, namespace: 'url-stub' }));
      b.onLoad({ filter: /.*/, namespace: 'url-stub' }, () => ({ contents: 'export default ""', loader: 'js' }));
    },
  }],
});
// Under the runner, a test that passed before on the same code and inputs is not run again (tools/test-cache.mjs)
if (process.env.TEST_CACHE === '1') {
  const key = runKey(out, args);
  const at = cachedPass(key);
  if (at) {
    console.log(`[test.mjs] cached pass: the same code and inputs passed at ${at} (TEST_FRESH=1 runs it again)`);
    fs.rmSync(out, { force: true });
    process.exit(0);
  }
  const keep = recordReads(key, [out, path.join(os.tmpdir(), 'runstop64-')]);
  process.on('exit', (code) => { if (code === 0) keep(); });
}
// (the code-only hashes the Monty tests' fingerprints use: tools/code-digests.mjs)
process.env.RUNSTOP64_CODE_DIGESTS = writeCodeDigests(root);
process.argv = [process.argv[0], out, ...args];
await import(pathToFileURL(out).href);
