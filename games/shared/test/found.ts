/**
 * What each game's map keeps of the player's progress (its `found` codec, games/shared/native/pause.ts),
 * against what players already have in their browsers: the shape each map wrote before the codecs
 * (`<id>.found.v1`, and the `found` of the previous save) reads back whole, with every part, and is kept
 * as it was; a part that doesn't check starts empty without taking the rest with it; a new game's is empty
 * and reads back as itself; nothing at all reads back as empty.
 *
 *   nice -n 15 node tools/test.mjs games/shared/test/found.ts
 */
import { antiriadMap } from '../../antiriad/src/map';
import { awmMap } from '../../awm/src/map';
import { blackwycheMap } from '../../blackwyche/src/map';
import { dragonskulleMap } from '../../dragonskulle/src/map';
import { entombedMap } from '../../entombed/src/map';
import { jsw2Map } from '../../jsw2/src/map';
import { karnathMap } from '../../karnath/src/map';
import { montyMap } from '../../montyotr/src/map';
import { starquakeMap } from '../../starquake/src/map';
import { makeMap } from '../../thingonaspring/src/map';
import { isRecord, readJson } from '../guards';
import type { FoundCodec } from '../native/pause';
import { check, finish } from './check';

/** A value as JSON text with its keys in order and its undefineds gone (what is kept, whatever order it was made in). */
function canon(v: unknown): string {
  return JSON.stringify(v, (_key, x: unknown) => (typeof x === 'object' && x !== null && !Array.isArray(x) ? Object.fromEntries(Object.entries(x).sort(([a], [b]) => (a < b ? -1 : 1))) : x));
}
const kept = (v: unknown) => canon(v);
const asRecord = (v: unknown): Record<string, unknown> => {
  if (!isRecord(v)) throw new Error('a record expected');
  return v;
};

/** `stored`: a record as a player's browser holds it, every part of the game's progress in it. */
function codecCase<F>(game: string, codec: FoundCodec<F>, stored: Record<string, unknown>) {
  const read = codec.parse(stored);
  check(`${game}: the stored record reads back whole (every part kept)`, kept(read) === canon(stored));
  check(`${game}: ...and reads back again as it was kept (what the front end writes back)`, kept(codec.parse(readJson(JSON.stringify(read)))) === canon(stored));
  const empty = codec.empty();
  check(`${game}: a new game's record reads back as itself`, kept(codec.parse(readJson(JSON.stringify(empty)))) === kept(empty));
  check(`${game}: a new game's record is a new one each time`, codec.empty() !== codec.empty());
  const junk: [string, unknown][] = [['nothing', undefined], ['null', null], ['a number', 42], ['text', 'rooms'], ['a list', [1, 2]], ['an empty record', {}]];
  for (const [what, v] of junk) check(`${game}: ${what} reads back as empty`, kept(codec.parse(v)) === kept(empty));
  // one part broken: that part starts empty, the others are as kept
  const emptyParts = kept(empty);
  for (const part of Object.keys(stored)) {
    const hurt = kept(codec.parse({ ...stored, [part]: 42 }));
    const want = asRecord(readJson(canon(stored)));
    const fresh = asRecord(readJson(emptyParts));
    const expected = canon({ ...want, [part]: fresh[part] });
    check(`${game}: ${part} broken: it starts empty, the rest is kept`, hurt === expected);
  }
}

codecCase('montyotr', montyMap.found, { rooms: { 3: [1, 2, 3, 4], 51: [1, 2, 3, 4, 0, 1, 2, 3] } });
codecCase('awm', awmMap.found, { rooms: { 72: [1, 2, 3, 4], 73: [5, 6, 7, 8] } });
codecCase('starquake', starquakeMap.found, { entry: { 8: [3, 4], 31: [1, 2] } });
codecCase('antiriad', antiriadMap.found, {
  rooms: [0, 1, 20], entry: { 20: { x: 120, y: 88, high: 0 } }, suitEntry: { 0: { x: 96, y: 64, high: 1 } },
});
codecCase('entombed', entombedMap.found, {
  cells: { 1: ['1,1', '2,1'] }, chambers: { 1: { '2,3': 5 } }, doors: { 1: { 5: [1, 2, 3] } },
  lastPlace: { floor: 1, x: 2.5, y: 3, axis: 1 }, stairs: { 1: { '2,3': 'up' } }, last: { floor: 1, at: '2,3' }, warped: false, chain: [3, 4],
});
codecCase('dragonskulle', dragonskulleMap.found, { cells: ['4,2', '4,1'], at: { '4,2': [1, 2, 3] }, last: '4,2', links: ['4,1|4,2'] });
codecCase('jsw2', jsw2Map.found, {
  rooms: [19, 20], stand: { 19: [10, 0, 50] },
  arrival: { room: 19, at: [10, 0, 50], n: 3, air: false, feet: 2, y: 50, lives: 7, count: 3 }, to: { room: 19, at: [10, 0, 50] },
});
codecCase('karnath', karnathMap.found, { castle: { cells: { A: [1, 2] }, rooms: [1, 2], at: { 1: [1, 2, 3] }, ways: ['0-1-5'], last: [0, 40, 3] } });
codecCase('thingonaspring', makeMap().found, { screens: { '0.1': ['L', 'R'] }, things: { 'piece.3': true }, last: '0.1' });
// (Blackwyche's trapdoors and the map's items and places are parts of its record)
codecCase('blackwyche', blackwycheMap.found, {
  ship: { panels: { '1.0': [1, 2] }, cabins: ['C1.0.2'], at: { 'C1.0.2': [1, 2] }, chain: [1], ways: ['a>b'], last: 'C1.0.2', standing: { key: 'C1.0.2', n: 2 } },
  trapdoors: ['C1.0.2:5'],
});

// Blackwyche's ship, as maps made before the standing counter kept it: the counter starts afresh, the rest is kept
{
  const old = { panels: { '1.0': [1] }, cabins: [], at: {}, chain: [], ways: [], last: '' };
  const read = blackwycheMap.found.parse({ ship: old, trapdoors: ['x'] });
  check('blackwyche: a ship from before the standing counter is kept, the counter new', canon(read.ship) === canon({ ...old, standing: { key: '', n: 0 } }) && read.trapdoors.join() === 'x');
}
// Dragonskulle's lists as they were filtered: a stray non-text in the screens is dropped, the rest kept
{
  const read = dragonskulleMap.found.parse({ cells: ['4,2', 7, '4,1'], at: { a: [1], b: 'x' }, links: [null, 'l'] });
  check('dragonskulle: strays in its lists are dropped, the rest kept', read.cells.join() === '4,2,4,1' && canon(read.at) === canon({ a: [1] }) && read.links.join() === 'l' && read.last === null);
}
// Thing on a Spring: only the ends there are, only the things truly seen
{
  const read = makeMap().found.parse({ screens: { '0.1': ['L', 'X', 'R'] }, things: { 'piece.3': true, 'oil.1': 0 } });
  check('thingonaspring: unknown ends dropped, things not seen dropped', canon(read.screens) === canon({ '0.1': ['L', 'R'] }) && canon(read.things) === canon({ 'piece.3': true }));
}

finish();
