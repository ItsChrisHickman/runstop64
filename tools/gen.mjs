#!/usr/bin/env node
// Generates the translated games' code (games/*/src/gen/), which is not committed.
//
//   nice -n 15 node tools/gen.mjs          generate what is out of date
//   nice -n 15 node tools/gen.mjs --force  generate everything again
//
// Every games/<game>/re/*.json that names an "out" is a config for tools/re/to-ts.mjs. A game's configs that
// import another's output ("extern": the engine) run after it. Inputs are the configs, the .state snapshots
// they name and the translator itself; a game is skipped while a stamp (src/gen/.stamp, inside the ignored
// folder) matches the hash of those and every output is still there. `npm run typecheck`, `build`,
// `check:strict`, `test` and `node tools/test.mjs` run this first, so a fresh clone needs no manual step.
// Also importable: `ensureGen()`.

import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const translator = path.join(root, 'tools/re/to-ts.mjs');

const isRecord = (v) => typeof v === 'object' && v !== null && !Array.isArray(v);
const str = (v) => (typeof v === 'string' ? v : undefined);

/** The translator configs of one game: { file, out, inputs, extern }. */
function configsOf(gameDir) {
  const reDir = path.join(gameDir, 're');
  if (!fs.existsSync(reDir)) return [];
  const found = [];
  for (const name of fs.readdirSync(reDir).sort()) {
    if (!name.endsWith('.json')) continue;
    const file = path.join(reDir, name);
    let cfg;
    try { cfg = JSON.parse(fs.readFileSync(file, 'utf8')); } catch { continue; }
    if (!isRecord(cfg)) continue;
    const out = str(cfg.out);
    if (out === undefined) continue;
    const inputs = [str(cfg.state), str(cfg.image)].filter((p) => p !== undefined).map((p) => path.resolve(reDir, p));
    found.push({ file, out: path.resolve(reDir, out), inputs, extern: isRecord(cfg.extern) });
  }
  // engines first: the rooms read their output
  return found.sort((a, b) => Number(a.extern) - Number(b.extern) || a.file.localeCompare(b.file));
}

function hashOf(configs) {
  const h = createHash('sha256');
  const add = (file) => { h.update(path.relative(root, file)); h.update('\0'); h.update(fs.readFileSync(file)); h.update('\0'); };
  add(translator);
  for (const c of configs) { add(c.file); for (const i of c.inputs) add(i); }
  return h.digest('hex');
}

/** @returns {number} how many games were generated */
export function ensureGen({ force = false, quiet = false } = {}) {
  const gamesDir = path.join(root, 'games');
  let generated = 0;
  for (const game of fs.readdirSync(gamesDir).sort()) {
    const gameDir = path.join(gamesDir, game);
    if (!fs.statSync(gameDir).isDirectory()) continue;
    const configs = configsOf(gameDir);
    if (configs.length === 0) continue;
    const genDir = path.join(gameDir, 'src/gen');
    const stampFile = path.join(genDir, '.stamp');
    const hash = hashOf(configs);
    const current = !force && fs.existsSync(stampFile) && fs.readFileSync(stampFile, 'utf8') === hash && configs.every((c) => fs.existsSync(c.out));
    if (current) continue;
    if (!quiet) console.log(`gen: ${game} (${configs.length} translations)`);
    fs.rmSync(stampFile, { force: true });
    for (const c of configs) {
      fs.mkdirSync(path.dirname(c.out), { recursive: true });
      const r = spawnSync(process.execPath, [translator, c.file], { encoding: 'utf8' });
      if (r.status !== 0) throw new Error(`gen: ${path.relative(root, c.file)} failed (exit ${r.status})\n${r.stderr}${r.stdout}`);
    }
    fs.writeFileSync(stampFile, hash);
    generated++;
  }
  return generated;
}

if (process.argv[1] !== undefined && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const n = ensureGen({ force: process.argv.includes('--force') });
    if (n === 0) console.log('gen: up to date');
  } catch (e) {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  }
}
