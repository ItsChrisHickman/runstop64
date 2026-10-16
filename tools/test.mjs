#!/usr/bin/env node
// Runs a headless check written in TypeScript: bundles it with esbuild (c64kit
// stood in by games/shared/test/kit.ts, `?url` asset imports stubbed), then runs
// it with the rest of the arguments. On the live server: nice -n 15.
//
//   nice -n 15 node tools/test.mjs games/montyotr/test/frontend.ts [args]
//   nice -n 15 node tools/test.mjs games/starquake/test/frontend.ts /tmp/shots

import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { build } from 'esbuild';
import { ensureGen } from './gen.mjs';

const [, , entry, ...args] = process.argv;
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
      b.onResolve({ filter: /\?url$/ }, (a) => ({ path: a.path, namespace: 'url-stub' }));
      b.onLoad({ filter: /.*/, namespace: 'url-stub' }, () => ({ contents: 'export default ""', loader: 'js' }));
    },
  }],
});
process.argv = [process.argv[0], out, ...args];
await import(pathToFileURL(out).href);
