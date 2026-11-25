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
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

// A heap ceiling for every test (2026-11-24: the box froze twice when tests, agents and the sites outgrew its 7.6 GB and it thrashed swap):
// a test that needs more fails with an out-of-memory error instead of starving the server. Re-runs itself with the flag if started without it.
const HEAP_MB = 2048;
if (!process.execArgv.some((a) => a.startsWith('--max-old-space-size'))) {
  const r = spawnSync(process.execPath, [`--max-old-space-size=${HEAP_MB}`, ...process.execArgv, ...process.argv.slice(1)], { stdio: 'inherit' });
  process.exit(r.status ?? 1);
}
import { build } from 'esbuild';
import { ensureGen } from './gen.mjs';

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
process.argv = [process.argv[0], out, ...args];
await import(pathToFileURL(out).href);
