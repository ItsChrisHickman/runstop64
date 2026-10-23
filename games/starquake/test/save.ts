/**
 * Starquake's save, explicit (src/save.ts `StarquakeSave`) against the reflective one it replaced
 * (test/legacy-save.ts, the oracle), so players' saves load as they did:
 *
 * - the saves in the fixtures (what the browser held before the change: fixtures/saves/starquake.json,
 *   made by the old code) restored by the old code and by the new: the whole game state is the same
 *   (every field of the game, the screen memory), and the new code writes the very same bytes back;
 * - the same for a game played on (rooms entered, enemies met, items taken: the saves the autosave takes
 *   along the way), snapshot by both: same bytes, restored by both: same game;
 * - a save that lacks some fields (made by a game with fewer) restores the same, the rest as a new game;
 * - what is not a save is refused: another format, truncated, a field of the wrong kind.
 *
 *   nice -n 15 node tools/test.mjs games/starquake/test/save.ts
 */
import fs from 'node:fs';
import { Input, PixelRenderer } from 'c64kit';
import { fromBase64, readSaves } from '../../shared/saves';
import { isRecord, readJson, S } from '../../shared/guards';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';
import { must } from '../../shared/test/must';
import { Game } from '../src/game';
import { run } from '../src/main';
import { CODEC, describeSave, restore, snapshot } from '../src/save';
import { installSprites } from '../src/screen';
import { legacyDescribeSave, legacyRestore, legacySnapshot } from './legacy-save';

const same = (a: Uint8Array, b: Uint8Array) => a.length === b.length && a.every((x, i) => x === b[i]);

/** Every own field of a game (and its screen memory) as one comparable value: typed arrays as lists, functions left out. */
function everything(v: unknown): unknown {
  if (v instanceof Uint8Array || v instanceof Uint16Array) return Array.from(v);
  if (Array.isArray(v)) return v.map(everything);
  if (v !== null && typeof v === 'object') return Object.fromEntries(Object.entries(v).filter(([, x]) => typeof x !== 'function').map(([k, x]) => [k, everything(x)]));
  return v;
}
const state = (g: Game) => JSON.stringify(everything(g));

/** A save's bytes with the sprite pictures in the bank, as the new code writes it back. */
function withSprites(bytes: Uint8Array) {
  const out = bytes.slice();
  const n = new DataView(out.buffer).getUint32(0, true);
  installSprites(out.subarray(4 + n, 4 + n + 0x4000), true);
  return out;
}

/** A game restored by the old code and one by the new, from the same bytes. */
function bothWays(bytes: Uint8Array) {
  const old = new Game();
  legacyRestore(old, bytes);
  installSprites(old.scr.bank, true); // (the one thing the new code does that the old did not: a save without the sprite pictures gets them)
  const now = new Game();
  restore(now, CODEC.unpack(bytes, 1));
  return { old, now };
}

// ---- the saves players have ---------------------------------------------------------------------------------------

const Fixture = S.object({ storage: S.record(S.string) });
const fixture = readJson(fs.readFileSync('games/shared/test/fixtures/saves/starquake.json', 'utf8'));
if (!Fixture(fixture)) throw new Error('not a fixture');
const store = useMemoryStorage();
for (const [k, v] of Object.entries(fixture.storage)) store.set(k, v);
const saves = readSaves('starquake');
for (const which of ['current', 'previous'] as const) {
  const slot = must(saves[which], `the ${which} save`);
  const bytes = fromBase64(slot.data);
  const { old, now } = bothWays(bytes);
  check(`${which}: restored by the old code and the new, the whole game is the same (${state(now).length} characters of state)`, state(old) === state(now));
  check(`${which}: the new code writes the very bytes back (the old format, field for field), the sprite pictures put in`, same(CODEC.pack(snapshot(now)), withSprites(bytes)));
  check(`${which}: ...and so does the old code's snapshot of the restored game`, same(legacySnapshot(old), withSprites(bytes)));
  check(`${which}: described the same (${describeSave(CODEC.unpack(bytes, 1)).join(' / ')})`, describeSave(CODEC.unpack(bytes, 1)).join('|') === legacyDescribeSave(bytes).join('|'));
}

// ---- a game played on: the saves the autosave takes ----------------------------------------------------------------

{
  const input = new Input(nowhere);
  const p = run({ renderer: new PixelRenderer(), input, canvas: nowhere });
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
  const tap = (code: string) => { input.keyDown(code); tick(2); input.keyUp(code); tick(2); };
  useMemoryStorage();
  tick(60 + 6 * 50);
  tap('Space'); tick(32); tap('Space'); tick(5);
  const g = p.game;
  g.lives = [0, 9];
  let seen = 0, equal = 0, bytesEqual = 0, caches = 0;
  const rooms = new Set<number>();
  const keys: string[] = ['ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowUp', 'ArrowLeft'];
  for (let step = 0; step < 30; step++) {
    const key = keys[step % keys.length];
    input.keyDown(key);
    if (step % 4 === 0) input.keyDown('Space');
    tick(70);
    input.keyUp(key); input.keyUp('Space');
    const was = legacySnapshot(g);
    const packed = CODEC.pack(snapshot(g));
    seen++;
    if (same(was, packed)) bytesEqual++;
    rooms.add(g.room);
    if (g.cache.some((c) => c !== null)) caches++;
    const { old, now } = bothWays(was);
    if (state(old) === state(now)) equal++;
  }
  check(`played on (${rooms.size} rooms, enemies remembered in ${caches} of the saves): the new snapshot is the old one's bytes (${bytesEqual}/${seen})`, bytesEqual === seen);
  check(`...and restored by both, the same game (${equal}/${seen})`, equal === seen);
  // fields the walk above leaves alone: a screen asking for letters, a won game, things carried and taken
  Object.assign(g, { asking: 'code', codeAt: { col: 3, row: 4 }, won: true, inScreen: true, carriedCount: 3, cheopsOffer: 9, pendingScore: 77 });
  g.carried[1] = 5; g.coreSlots[2] = 7; g.core[4] = 0x85; g.items[3] = { col: 9, row: 8, roomLo: 7, roomHi: 1, graphic: 0x44 }; g.score[2] = 6; g.lo[100] = 0xa5; g.scr.attr[17] = 3;
  g.sprites.x[2] = 200; g.vic.msb = 4; g.rng.s2 = 0x99; g.spawnSpots[5] = { cell: 5, x: 6, y: 7 }; g.platforms[3].saved = [4, 5];
  {
    const was = legacySnapshot(g);
    check('and with those set (asking for a code, won, items and the core touched): the same bytes, the same game restored', same(CODEC.pack(snapshot(g)), was) && state(bothWays(was).old) === state(bothWays(was).now));
    check('...and the game restored is the game that was saved', state(bothWays(was).now) === state(g));
  }
  check('a snapshot is a copy: the game going on does not change it', (() => {
    const s = snapshot(g);
    const before = JSON.stringify(s.fields);
    tick(120);
    return JSON.stringify(s.fields) === before;
  })());
}

// ---- a save from a game with fewer fields ---------------------------------------------------------------------------------

{
  const bytes = fromBase64(must(saves.current, 'current').data);
  const n = new DataView(bytes.buffer, bytes.byteOffset).getUint32(0, true);
  const fields = readJson(new TextDecoder().decode(bytes.subarray(4, 4 + n)));
  if (!isRecord(fields)) throw new Error('fields');
  const dropped = Object.fromEntries(Object.entries(fields).filter(([k]) => !['pendingScore', 'cache', 'won', 'inScreen', 'padShown', 'shot'].includes(k)));
  const json = new TextEncoder().encode(JSON.stringify(dropped));
  const rest = bytes.subarray(4 + n);
  const out = new Uint8Array(4 + json.length + rest.length);
  new DataView(out.buffer).setUint32(0, json.length, true);
  out.set(json, 4);
  out.set(rest, 4 + json.length);
  const { old, now } = bothWays(out);
  check('a save without some of the fields (pendingScore, cache, won, inScreen, padShown, shot): the same game by both, the rest as a new game has it', state(old) === state(now) && now.pendingScore === 0 && now.cache[0] === null);
}

// ---- not saves -------------------------------------------------------------------------------------------------------------

{
  const bytes = fromBase64(must(saves.current, 'current').data);
  const refused = (what: string, b: Uint8Array, format = 1) => {
    let threw = false;
    try { CODEC.unpack(b, format); } catch { threw = true; }
    check(`${what}: refused`, threw);
  };
  refused('another format', bytes, 2);
  refused('truncated', bytes.subarray(0, bytes.length - 1));
  refused('too short', new Uint8Array(2));
  const n = new DataView(bytes.buffer, bytes.byteOffset).getUint32(0, true);
  const text = new TextDecoder().decode(bytes.subarray(4, 4 + n));
  const swap = (from: string, to: string) => {
    const json = new TextEncoder().encode(text.replace(from, to));
    const out = new Uint8Array(4 + json.length + (bytes.length - 4 - n));
    new DataView(out.buffer).setUint32(0, json.length, true);
    out.set(json, 4);
    out.set(bytes.subarray(4 + n), 4 + json.length);
    return out;
  };
  refused('a field of the wrong kind (room a string)', swap(/"room":\d+/.exec(text)?.[0] ?? '', '"room":"x"'));
  refused('not JSON', swap('{', '['));
}

finish();
