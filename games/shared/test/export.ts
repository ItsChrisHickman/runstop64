/**
 * The info sheet's "Export save (debug)", headless: saves written through the save module
 * (games/shared/saves.ts), exported by the code the link runs (`exportSaves`), and read back by
 * the helper tests use (games/shared/test/load-save.ts), come back exactly as they were:
 *
 * - a translated game (Entombed: machine snapshots): the current and previous saves byte for byte,
 *   what had been found with each, and the game resumed from the file running as from the save;
 * - Monty (its own save type): the save as its codec unpacks it, and Monty launched with the file
 *   in storage carrying on from it, as it would have for Chris;
 * - a file that isn't an export (or is another save version) is refused, not half read.
 *
 *   nice -n 15 node tools/test.mjs games/shared/test/export.ts [out-dir]
 */
import fs from 'node:fs';
import { Input, PixelRenderer } from 'c64kit';
import { packState, unpackState } from '../../../packages/c64kit/src/c64/machine';
import { MACHINE_CODEC } from '../continue';
import { isRecord, readJson } from '../guards';
import { NativeHost } from '../native/host';
import { exportSaves, keepFound, parseExport, readFound, readSaves, startNewGame, toBase64, writeCurrent } from '../saves';
import { port } from '../../entombed/src/native';
import { run as runMonty } from '../../montyotr/src/main';
import { CODEC, snapshot } from '../../montyotr/src/save';
import { nowhere, useMemoryStorage } from './browser';
import { loadIntoStorage, loadSave, readExport } from './load-save';
import { must } from './must';
import { check, finish } from './check';

const store = useMemoryStorage();
const outDir = process.argv[2] ?? '/tmp/runstop64-export-test';
fs.mkdirSync(outDir, { recursive: true });
const same = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);
const json = (v: unknown) => JSON.stringify(v);

/** Export a game's saves as the link does, to a file in out-dir; its path. */
function exported(id: string, when: Date) {
  const { name, text } = exportSaves(id, 'test-build', when);
  check(`${id}: the file is named runstop64-${id}-<date>.json (${name})`, name === `runstop64-${id}-2026-10-14.json`);
  const file = `${outDir}/${name}`;
  fs.writeFileSync(file, text);
  return file;
}

// ---- a translated game: Entombed's machine snapshots ------------------------------------------

{
  const title = unpackState(new Uint8Array(fs.readFileSync('games/entombed/assets/entombed-title.state')));
  const g = new NativeHost(port, title);
  const save = () => must(g.save(), 'a save');
  for (let f = 0; f < 200; f++) { g.m.joy1 = g.m.joy2 = f > 50 && f < 60 ? 0x0f : 0x1f; g.tick(); }
  const first = save();
  writeCurrent('entombed', { data: toBase64(MACHINE_CODEC.pack(first)), at: 1, summary: ['FIRST'], rooms: 4 });
  keepFound('entombed', { rooms: [1, 2] });
  startNewGame('entombed', readFound('entombed'));
  for (let f = 0; f < 100; f++) { g.m.joy1 = g.m.joy2 = 0x1b; g.tick(); }
  const second = save();
  writeCurrent('entombed', { data: toBase64(MACHINE_CODEC.pack(second)), at: 2, summary: ['SECOND'], rooms: 2 });
  keepFound('entombed', { rooms: [3] });
  const before = readSaves('entombed');

  const file = exported('entombed', new Date(2026, 9, 14, 12));
  const e = readExport(file);
  check('entombed: game, save version, build', e.game === 'entombed' && e.v === 2 && e.build === 'test-build');
  check('entombed: both slots exactly as stored, and what has been found', json(e.current) === json(before.current) && json(e.previous) === json(before.previous) && json(e.found) === json({ rooms: [3] }));
  const now = loadSave(file, MACHINE_CODEC), then = loadSave(file, MACHINE_CODEC, 'previous');
  check('entombed: the current save, byte for byte', same(packState(now), packState(second)));
  check('entombed: the previous save, byte for byte (and what had been found with it)', same(packState(then), packState(first)) && json(e.previous?.found) === json({ rooms: [1, 2] }));
  // resumed from the file and from the save itself, they run the same
  const a = NativeHost.resume(port, now), b = NativeHost.resume(port, second);
  for (let f = 0; f < 100; f++) { a.m.joy1 = a.m.joy2 = b.m.joy1 = b.m.joy2 = 0x17; a.tick(); b.tick(); }
  check('entombed: resumed from the file, it plays as from the save', same(a.m.ram, b.m.ram));
  // into a fresh browser's storage, it's the same saves again
  useMemoryStorage();
  loadIntoStorage(file);
  check('entombed: put in storage, the saves and what has been found read back the same', json(readSaves('entombed')) === json(before) && json(readFound('entombed')) === json({ rooms: [3] }));
  useMemoryStorage(store);
}

// ---- Monty: its own save type ----------------------------------------------------------------

/** Monty, launched (a page load) with what's in storage now. */
function monty() {
  const input = new Input(nowhere);
  const p = runMonty({ renderer: new PixelRenderer(), input, canvas: nowhere });
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
  return { p, g: p.game, input, tick };
}
{
  store.clear();
  const { g, input, tick } = monty();
  tick(400);
  input.keyDown('Space'); tick(2); input.keyUp('Space'); tick(20);
  g.score = 4321; g.lives = 7; g.coinCollected[5] = 1;
  const s = snapshot(g);
  writeCurrent('montyotr', { data: toBase64(CODEC.pack(s)), at: Date.now(), summary: ['TEST'], rooms: 3 });

  const file = exported('montyotr', new Date(2026, 9, 14, 23, 59));
  const loaded = loadSave(file, CODEC);
  check('monty: the save as its codec unpacks it is the one written', json(loaded) === json(s));
  check('monty: no previous save, none in the file', readExport(file).previous === null);

  useMemoryStorage();
  loadIntoStorage(file);
  const m = monty();
  m.tick(60);
  check(`monty: launched with the file in storage, he carries on from it (room ${m.g.roomId}, score ${m.g.score}, lives ${m.g.lives}, a coin)`,
    m.p.state.mode === 'play' && m.g.roomId === s.roomId && m.g.score === 4321 && m.g.lives === 7 && m.g.coinCollected[5] === 1);
}

// ---- not an export ---------------------------------------------------------------------------

{
  const parsed: unknown = readJson(exportSaves('montyotr', 'b').text);
  const good = isRecord(parsed) ? parsed : {};
  check('an export reads back', parseExport(good) !== null);
  check('another save version is refused', parseExport({ ...good, v: 1 }) === null);
  check('a broken slot is refused', parseExport({ ...good, current: { data: 1 } }) === null);
  check('something else is refused', parseExport({ game: 'montyotr' }) === null && parseExport(null) === null);
}

finish();
