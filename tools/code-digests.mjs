// Each source file's code alone, as a hash: comments, types and whitespace left out by esbuild's own parser. For the Monty tests'
// fingerprints (games/shared/monty/test/attribute.ts, proofs.ts: kept bot states and recorded "no way" proofs hold while the code they
// depend on is the same), so a change to a comment no longer throws them all away (2026-11-27: nine recorded "no way" searches, 11
// minutes of a gate, were searched again after edits that were mostly comments). Written by tools/test.mjs before a test runs (the tests
// are bundled and cannot run esbuild themselves); a fingerprint uses a file's code hash only while its raw hash matches the file it reads.
// Cached by each file's raw hash, so only files that changed are parsed again.
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { transformSync } from 'esbuild';

/** The folders whose sources the fingerprints read (engine, shared code, the game's sources and the test side). */
const FOLDERS = ['games/montyotr', 'games/montyworld', 'games/shared', 'packages/c64kit/src'];
const FILE = path.join(os.tmpdir(), 'runstop64-code-digests.json');
/** The same hash as states.ts `digest` (sha1, 16 hex digits). */
const digest = (data) => crypto.createHash('sha1').update(data).digest('hex').slice(0, 16);

/** Brings the digests up to date for the sources under `root` and returns the file they are in ({ path: { raw, code } }). */
export function writeCodeDigests(root) {
  let known = {};
  try { known = JSON.parse(fs.readFileSync(FILE, 'utf8')); } catch { /* none yet */ }
  const out = {};
  let changed = false;
  for (const folder of FOLDERS) {
    let names = [];
    try { names = fs.readdirSync(path.join(root, folder), { recursive: true }); } catch { continue; }
    for (const name of names) {
      if (!name.endsWith('.ts') || name.includes('node_modules')) continue;
      const rel = path.join(folder, name);
      const text = fs.readFileSync(path.join(root, rel), 'utf8');
      const raw = digest(text);
      const was = known[rel];
      if (was && was.raw === raw) { out[rel] = was; continue; }
      let code;
      try { code = digest(transformSync(text, { loader: 'ts', minifyWhitespace: true, legalComments: 'none' }).code); } catch { code = raw; }
      out[rel] = { raw, code };
      changed = true;
    }
  }
  if (changed || Object.keys(out).length !== Object.keys(known).length) {
    const tmp = `${FILE}.${process.pid}`;
    fs.writeFileSync(tmp, JSON.stringify(out));
    fs.renameSync(tmp, FILE); // (atomic: two tests at once never read half a file)
  }
  return FILE;
}
