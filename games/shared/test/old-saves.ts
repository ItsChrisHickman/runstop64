/**
 * Players' saves from before the save envelope still load, with their progress. The fixtures
 * (games/shared/test/fixtures/saves/<game>.json) are what the browser's storage held (every
 * `<game>.*` key) and the debug export held, written by the code at main 7229670 (before the
 * envelope: each slot `{ v: 2, data, at, summary, rooms }`, the bytes never versioned), by playing
 * each kind of game into a save, a new game over it, and a second save:
 *
 *   entombed   a machine save (MACHINE_CODEC)
 *   montyotr   its own JSON save
 *   awm        its own JSON save
 *   starquake  its own save (the game's fields as JSON, then the screen's memory)
 *
 * For each: the slots read as format 1 of the game (the previous one with what had been found),
 * the game launched on the fixture goes straight back into play from it, and the saves are
 * written in the envelope (`v: 3`, game, format) the next time they're written, bytes untouched.
 * Also: the save before the history (`<game>.save.v1`, the bytes alone), Monty's save from before
 * the shared front end (plain JSON), and the old export file; a save of a format nobody here
 * reads, or of another game, is refused and not guessed at; and a codec that has moved on to a
 * new format reads the old one by `unpack`'s migration.
 *
 *   nice -n 15 node tools/test.mjs games/shared/test/old-saves.ts
 */
import fs from 'node:fs';
import { Input, PixelRenderer } from 'c64kit';
import { MACHINE_CODEC, packSlot, readsFormat, unpackSlot, type SaveCodec } from '../continue';
import { isRecord, readJson, S } from '../guards';
import { exportSaves, fromBase64, parseExport, putSaves, readSaves, restorePrevious, toBase64, writeCurrent, type SaveSlot } from '../saves';
import { run as runAwm } from '../../awm/src/main';
import { FRESH_SKY } from '../../awm/src/flight';
import { CODEC as AWM_CODEC } from '../../awm/src/save';
import { run as runEntombed } from '../../entombed/src/main';
import { run as runMonty } from '../../montyotr/src/main';
import { CODEC as MONTY_CODEC, migrateOldSave, type MontySave } from '../../montyotr/src/save';
import { run as runStarquake } from '../../starquake/src/main';
import { CODEC as STARQUAKE_CODEC } from '../../starquake/src/save';
import { nowhere, stubFetch, useMemoryStorage } from './browser';
import { check, finish } from './check';
import { must } from './must';
import { loadSave, readExport } from './load-save';

const FIXTURES = 'games/shared/test/fixtures/saves';
const Fixture = S.object({ id: S.string, storage: S.record(S.string), export: S.string });

/** A fixture: the keys the browser held, and the export file's text. */
function fixture(id: string) {
  const v = readJson(fs.readFileSync(`${FIXTURES}/${id}.json`, 'utf8'));
  if (!Fixture(v)) throw new Error(`${id}: not a save fixture`);
  return v;
}
const same = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);
/** A fresh storage with these keys in it. */
function storageWith(keys: Record<string, string>) {
  const store = useMemoryStorage();
  for (const [k, v] of Object.entries(keys)) store.set(k, v);
  return store;
}

/** A fixture's slots read through the storage module (in its own storage). */
function readSaves0(f: { id: string; storage: Record<string, string> }) {
  storageWith(f.storage);
  return readSaves(f.id);
}

stubFetch(new Uint8Array(fs.readFileSync('games/entombed/assets/entombed-title.state')));

/** What each kind of game needs here: launch it (a page load), say whether it is in play and in which room, and read the room out of a save's bytes. */
interface Kind {
  id: string;
  launch(): { tick(): void; playing(): boolean; room(): number };
  /** The room a save's bytes are of. */
  roomOf(bytes: Uint8Array): number;
  /** The save's bytes unpack by the game's own codec (or checks for a machine save). */
  reads(bytes: Uint8Array, format: number): boolean;
  /** The export file's current save, loaded as test helpers do (`loadSave`). */
  loads(file: string): boolean;
}
function boot<P extends { tick(): void; render(a: number): void }>(make: (input: Input) => P) {
  const input = new Input(nowhere);
  const p = make(input);
  return { p, tick() { input.poll(); p.tick(); p.render(0); } };
}

const KINDS: Kind[] = [
  {
    id: 'entombed',
    launch() {
      const b = boot((input) => runEntombed({ renderer: new PixelRenderer(), input, canvas: nowhere }));
      return { tick: b.tick, playing: () => b.p.state.playing, room: () => 0 };
    },
    roomOf: () => 0,
    reads: (bytes, format) => { try { MACHINE_CODEC.unpack(bytes, format); return true; } catch { return false; } },
    loads: (file) => same(MACHINE_CODEC.pack(loadSave(file, MACHINE_CODEC)), fromBase64(must(readExport(file).current, 'current').data)),
  },
  {
    id: 'montyotr',
    launch() {
      const b = boot((input) => runMonty({ renderer: new PixelRenderer(), input, canvas: nowhere }));
      return { tick: b.tick, playing: () => b.p.state.mode === 'play', room: () => b.p.game.roomId };
    },
    roomOf: (bytes) => MONTY_CODEC.unpack(bytes, 1).roomId,
    reads: (bytes, format) => { try { MONTY_CODEC.unpack(bytes, format); return true; } catch { return false; } },
    loads: (file) => loadSave(file, MONTY_CODEC).roomId === MONTY_CODEC.unpack(fromBase64(must(readExport(file).current, 'current').data), 1).roomId,
  },
  {
    id: 'awm',
    launch() {
      const b = boot((input) => runAwm({ renderer: new PixelRenderer(), input, canvas: nowhere }));
      return { tick: b.tick, playing: () => b.p.state.kind === 'play', room: () => b.p.program.game?.world.room ?? -1 };
    },
    roomOf: (bytes) => AWM_CODEC.unpack(bytes, 1).room,
    reads: (bytes, format) => { try { AWM_CODEC.unpack(bytes, format); return true; } catch { return false; } },
    loads: (file) => loadSave(file, AWM_CODEC).room === AWM_CODEC.unpack(fromBase64(must(readExport(file).current, 'current').data), 1).room,
  },
  {
    id: 'starquake',
    launch() {
      const b = boot((input) => runStarquake({ renderer: new PixelRenderer(), input, canvas: nowhere }));
      return { tick: b.tick, playing: () => b.p.state.mode === 'play', room: () => b.p.game.room };
    },
    roomOf: (bytes) => STARQUAKE_CODEC.unpack(bytes, 1).fields.room ?? -1,
    reads: (bytes, format) => { try { STARQUAKE_CODEC.unpack(bytes, format); return true; } catch { return false; } },
    loads: (file) => loadSave(file, STARQUAKE_CODEC).fields.room === STARQUAKE_CODEC.unpack(fromBase64(must(readExport(file).current, 'current').data), 1).fields.room,
  },
];

/** Launch on what is in storage and run until it is in play (or give up). */
async function launched(kind: Kind) {
  const g = kind.launch();
  await new Promise((done) => setTimeout(done, 0)); // (a game loads its title snapshot with fetch)
  for (let n = 0; n < 400 && !g.playing(); n++) g.tick();
  for (let n = 0; n < 20; n++) g.tick();
  return g;
}

for (const kind of KINDS) {
  const { id } = kind;
  const f = fixture(id);

  // ---- the slots as stored today ------------------------------------------------------------------------
  const store = storageWith(f.storage);
  const rawCurrent = must(store.get(`${id}.save.v2`), 'the fixture has a current save');
  const raw: unknown = readJson(rawCurrent);
  check(`${id}: the fixture is the stored form from before the envelope (v 2, no game or format)`, isRecord(raw) && raw.v === 2 && !('game' in raw) && !('format' in raw));
  const saves = readSaves(id);
  const current = must(saves.current, `${id}: the current save reads`);
  const previous = must(saves.previous, `${id}: the previous save reads`);
  check(`${id}: both slots read, as format 1 of ${id} (the bytes were never versioned)`, current.game === id && current.format === 1 && previous.game === id && previous.format === 1 && current.image === undefined);
  check(`${id}: the previous save keeps what had been found with it`, isRecord(previous.found));
  check(`${id}: its summary, date and rooms come through`, current.summary.length > 0 && current.at > 0 && current.rooms > 0);
  check(`${id}: reading changed nothing in storage`, store.get(`${id}.save.v2`) === rawCurrent);
  const bytes = fromBase64(current.data);
  check(`${id}: the bytes unpack in format 1 (the game's own check)`, kind.reads(bytes, 1));
  check(`${id}: ...and are refused as a format nobody here reads (not guessed at)`, !kind.reads(bytes, 99));

  // ---- the game launched on them goes straight back into play ------------------------------------------
  const g = await launched(kind);
  check(`${id}: launched on the fixture, straight back into play`, g.playing());
  if (id !== 'entombed') check(`${id}: in the saved room (${kind.roomOf(bytes)})`, g.room() === kind.roomOf(bytes));

  // ---- written again, it is in the envelope, with the same bytes ---------------------------------------------
  const kept = storageWith(f.storage);
  check(`${id}: restoring the previous save (the save manager swaps the two) works on them`, restorePrevious(id));
  const swapped = readSaves(id);
  const nowCurrent: unknown = readJson(must(kept.get(`${id}.save.v2`), 'current written'));
  const nowPrevious: unknown = readJson(must(kept.get(`${id}.save.v2.previous`), 'previous written'));
  check(`${id}: ...and both are written in the envelope (v 3, game, format 1), the bytes as they were`,
    isRecord(nowCurrent) && nowCurrent.v === 3 && nowCurrent.game === id && nowCurrent.format === 1 && isRecord(nowPrevious) && nowPrevious.v === 3 && nowPrevious.game === id && nowPrevious.format === 1
    && swapped.current?.data === previous.data && swapped.previous?.data === current.data);
  check(`${id}: ...the previous one with what had been found by then`, isRecord(nowPrevious) && isRecord(nowPrevious.found));

  // ---- the old export file --------------------------------------------------------------------------------
  const dir = `/tmp/runstop64-old-saves`;
  fs.mkdirSync(dir, { recursive: true });
  const file = `${dir}/${id}.json`;
  fs.writeFileSync(file, f.export);
  const e = readExport(file);
  check(`${id}: the old export reads (as the current version), both slots migrated`, e.game === id && e.v === 3 && e.current?.format === 1 && e.previous?.format === 1 && e.current.data === current.data);
  check(`${id}: loadSave (what the tests use on a file Chris sends) gives the save the slot holds`, kind.loads(file));
  storageWith({});
  putSaves(e);
  const put = readSaves(id);
  check(`${id}: put in storage (as the tests do), it reads back the same`, put.current?.data === current.data && put.previous?.data === previous.data && put.current.format === 1);

  // ---- the save from before the history: the bytes alone -----------------------------------------------------
  const lone = storageWith({ [`${id}.save.v1`]: current.data });
  const migrated = readSaves(id);
  check(`${id}: <game>.save.v1 (the bytes alone) becomes the current save, format 1, its key gone`,
    migrated.current?.data === current.data && migrated.current.format === 1 && migrated.current.game === id && !lone.has(`${id}.save.v1`));
  const g1 = await launched(kind);
  check(`${id}: ...and the game goes back into play from it`, g1.playing());
}

// ---- Monty's save from before the shared front end: plain JSON under the save.v1 key --------------------------------
{
  const f = fixture('montyotr');
  const s: MontySave = MONTY_CODEC.unpack(fromBase64(must(readSaves0(f).current, 'current').data), 1);
  const plain = JSON.stringify({ ...s, visited: [[s.roomId, { x2: s.x2, y: s.y, mapRow: s.mapRow, exitCol: s.exitCol }], [3, { x2: 1, y: 2, mapRow: 3, exitCol: 4 }]] });
  const store = storageWith({ 'montyotr.save.v1': plain });
  migrateOldSave();
  const slot = must(readSaves('montyotr').current, 'the old plain save became the current one');
  check('monty: the plain-JSON save becomes the current save (format 1), the rooms visited its map', slot.format === 1 && !store.has('montyotr.save.v1') && isRecord(readJson(must(store.get('montyotr.found.v1'), 'found'))));
  const back = MONTY_CODEC.unpack(fromBase64(slot.data), 1);
  check('monty: its bytes are the save alone (the rooms visited went to the map)', JSON.stringify(back) === JSON.stringify(s));
  const g = await launched(KINDS[1]);
  check('monty: the game goes back into play from it, in its room', g.playing() && g.room() === s.roomId);
}

// ---- refused, not guessed at ----------------------------------------------------------------------------------------------
{
  const f = fixture('awm');
  const old = f.storage['awm.save.v2'];
  const stored = readJson(must(old, 'the stored slot'));
  const keys = (extra: Record<string, unknown>) => ({ ...f.storage, 'awm.save.v2': JSON.stringify({ ...(isRecord(stored) ? stored : {}), ...extra }) });
  storageWith(keys({ v: 3, game: 'awm', format: 1 }));
  check('awm: a v 3 slot with its envelope reads', readSaves('awm').current?.format === 1);
  storageWith(keys({ v: 3, game: 'montyotr', format: 1 }));
  check('awm: a slot that says it is another game\'s is not read', readSaves('awm').current === null);
  storageWith(keys({ v: 3 }));
  check('awm: a v 3 slot without game or format is not read', readSaves('awm').current === null);
  storageWith(keys({ v: 4, game: 'awm', format: 1 }));
  check('awm: a slot of a newer envelope is not read', readSaves('awm').current === null);
  storageWith(keys({ v: 3, game: 'awm', format: 9 }));
  const s = readSaves('awm').current;
  check('awm: a slot of a format the game does not read comes through as it says...', s?.format === 9);
  const g = await launched(KINDS[2]);
  check('awm: ...and the game does not resume from it (the title, no save), nor fail', !g.playing());
}

// ---- Auf Wiedersehen Monty at format 3 (what the flights keep in the machine; no shield flag) reads the format 1 and 2 saves players have ------------------------
{
  const f = fixture('awm');
  const bytes = fromBase64(must(readSaves0(f).current, 'current').data);
  const old = AWM_CODEC.unpack(bytes, 1);
  check('awm: a format 1 save reads as a game that has not flown (the clouds, the planes as the program file has them)', JSON.stringify(old.flight) === JSON.stringify(FRESH_SKY) && old.v === 3 && !('shield' in old));
  const again = AWM_CODEC.unpack(AWM_CODEC.pack(old), 3);
  check('awm: ...written in format 3 it reads back the same', JSON.stringify(again) === JSON.stringify(old) && AWM_CODEC.format === 3);
  check('awm: a format 2 save without what the flights keep is refused (it is a format 1 body)', (() => { try { AWM_CODEC.unpack(bytes, 2); return false; } catch { return true; } })());
  const flown = { ...old, flight: { ...old.flight, player: [0x20, 0x30], explosion: 2 } };
  check('awm: what the flights left is kept by a save', AWM_CODEC.unpack(AWM_CODEC.pack(flown), 3).flight.player[0] === 0x20);
  check('awm: a state a flight cannot leave is not a save (a cloud off the 504 places of the VIC)', (() => { try { AWM_CODEC.unpack(AWM_CODEC.pack({ ...old, flight: { ...old.flight, clouds: [600, 0, 0, 0, 0, 0, 0, 0] } }), 3); return false; } catch { return true; } })());
}

// ---- a codec that has moved on reads the old format by migration ------------------------------------------------
{
  interface Now { room: number; lives: number; coins: number }
  const NOW: SaveCodec<Now> = {
    format: 2,
    pack: (s) => new TextEncoder().encode(JSON.stringify(s)),
    unpack(b, format) {
      readsFormat('test', format, 1, 2);
      const v: unknown = readJson(new TextDecoder().decode(b));
      if (!isRecord(v) || typeof v.room !== 'number' || typeof v.lives !== 'number') throw new Error('not a test save');
      // format 1 had no coins: they start at none
      return { room: v.room, lives: v.lives, coins: format === 1 ? 0 : typeof v.coins === 'number' ? v.coins : 0 };
    },
  };
  storageWith({});
  const then = new TextEncoder().encode(JSON.stringify({ room: 4, lives: 2 }));
  writeCurrent('migrating', { format: 1, data: toBase64(then), at: 1, summary: [], rooms: 2 });
  const old = must(readSaves('migrating').current, 'the format 1 save');
  const read = unpackSlot(NOW, old);
  check('a codec at format 2 reads a format 1 save by migrating it (coins start at none)', read.room === 4 && read.lives === 2 && read.coins === 0);
  writeCurrent('migrating', packSlot(NOW, { room: 5, lives: 1, coins: 7 }, { at: 2, summary: [], rooms: 3 }));
  const now = must(readSaves('migrating').current, 'the format 2 save');
  check('...and writes format 2', now.format === 2 && unpackSlot(NOW, now).coins === 7);
  check('...which an older codec (format 1 only) refuses', (() => { try { MACHINE_CODEC.unpack(fromBase64(now.data), now.format); return false; } catch { return true; } })());
}

// ---- the image a machine save was made on is stored, when the codec knows it ----------------------------------------------------------
{
  storageWith({});
  const machine: SaveCodec<Uint8Array> = { format: 1, image: () => 'cafe0001', pack: (b) => b, unpack: (b) => b };
  const slot: SaveSlot | null = (writeCurrent('imaged', packSlot(machine, new Uint8Array([1, 2, 3]), { at: 1, summary: [], rooms: 1 })), readSaves('imaged').current);
  check('a codec that names its image: the save carries it', slot?.image === 'cafe0001' && slot.format === 1);
  const text = exportSaves('imaged', 'b').text;
  const back = parseExport(readJson(text));
  check('...through the export too', back?.current?.image === 'cafe0001');
}

finish();
