/**
 * Travel check (the pause map's "go back to a place"), headless, against walking.
 *
 * Plays the game from its title along recorded routes (joystick and keys per frame, found
 * by automatic play: re/routes.json), with the map noting places as the front end does
 * (`observe` at each main loop wait), and keeps the state at the moment each place was
 * noted (he'd just walked in). Then, from states along the routes, it travels to every
 * place noted (`go` at the main loop's wait, registers kept, as play.ts does) and checks:
 *
 * - where he is: the place bytes, after a frame, are the walked arrival's (and so is the
 *   colour RAM of the playfield, and his sprite, the scroll and the screen mode in the VIC);
 * - the screen: the playfield is drawn from the map as it is now; where it differs from the
 *   walked arrival's, the maps differ there (something taken or opened), or the walked
 *   screen wasn't the map (what the game leaves on screen while it scrolls);
 * - progress isn't undone: the game's progress bytes (energy, clock, spells, pieces...) are
 *   the source's, and the whole map (in one layout: blocks swapped back the game's own way)
 *   is the source's, byte for byte; code and graphics are too, apart from bytes that change
 *   in play anyway;
 * - pieces of the pentacle (Karnath) taken before travelling stay taken where the walked
 *   arrival still showed them;
 * - round trips (there and on to another place) hold up the same way;
 * - the game keeps running: frames of random play after, with no 6502 fallbacks, no hang.
 *
 *   nice -n 15 node tools/test.mjs games/shared/native/test/travel.ts karnath
 */
import fs from 'node:fs';
import { unpackState, type MachineState } from '../../../../packages/c64kit/src/c64/machine';
import { cpu } from '../cpu';
import { NativeHost } from '../host';
import { isNumbers, isRecordOf, type Found, type PauseMap } from '../pause';
import { GAMES, setJoy } from './games';
import { karnathMap, travelPlaces as karnathPlaces } from '../../../karnath/src/map';
import { LOCATION as KARNATH_LOCATION, toMode as karnathToMode } from '../../../karnath/src/travel';
import * as castle_6000 from '../../../karnath/src/gen/rooms/castle-6000';
import * as castle_c000 from '../../../karnath/src/gen/rooms/castle-c000';
import * as castle_d800 from '../../../karnath/src/gen/rooms/castle-d800';
import * as castle_e100 from '../../../karnath/src/gen/rooms/castle-e100';
import * as castle_f100 from '../../../karnath/src/gen/rooms/castle-f100';
import * as castle_f900 from '../../../karnath/src/gen/rooms/castle-f900';
import { blackwycheMap, travelPlaces as blackwychePlaces } from '../../../blackwyche/src/map';
import { DECK as BLACKWYCHE_DECK, canTravel as blackwycheCanTravel, placeId as blackwychePlaceId, toDeck as blackwycheToDeck, where as blackwycheWhere } from '../../../blackwyche/src/travel';
import { ROOMS as BLACKWYCHE_ROOMS } from '../../../blackwyche/src/rooms';
import * as blackwycheEngine from '../../../blackwyche/src/gen/engine';
import { cellKey as dragonskulleKey, dragonskulleMap } from '../../../dragonskulle/src/map';
import { LOCATION as DRAGONSKULLE_LOCATION, playing as dragonskullePlaying } from '../../../dragonskulle/src/travel';
import { ROOMS as DRAGONSKULLE_ROOMS } from '../../../dragonskulle/src/rooms';
import * as dragonskulleEngine from '../../../dragonskulle/src/gen/engine';

interface TravelSpec {
  map: PauseMap;
  routes: string;
  /** The place he's in, as the map names its places. */
  room(ram: Uint8Array): string;
  /** The places noted in what's been found (by name: where he first stood there). */
  noted(found: Found): Record<string, number[]>;
  /** Keeps him alive along the routes (as when they were found). */
  cheat(ram: Uint8Array): void;
  /** Whether a frame is play (the map is noted then). */
  playing(ram: Uint8Array, frame: number): boolean;
  /** Puts memory in one layout (the game's own swaps), in place, on a host bound to it. */
  canon(ram: Uint8Array): void;
  /** Where the map (and anything else taken or opened) lives, in that layout. */
  mapRegions: [number, number][];
  /** The swapped code blocks: each translation's code bytes, and how far from where it runs they're kept in that layout. */
  blocks: { code: Record<string, [number, string][]>; shift: number; end: number }[];
  /** Graphics the game swaps (in that layout: compared with the source's, less bytes that change in play anyway). */
  graphics: [number, number][];
  /** Progress the game keeps outside the map, carried as it is. */
  progress: number[];
  /** Where he is (equal to the walked arrival's after a frame). */
  location: number[];
  /** (if it depends on the place) */
  locationFor?(key: string): number[] | undefined;
  /** Playfield rows (screen and colour RAM compared): the first, and how many. */
  firstRow: number;
  rows: number;
  /** What the playfield shows drawn from the map (row-major, `rows` x 40); without one, the playfield must be the walked arrival's. */
  screenFromMap?(ram: Uint8Array): Uint8Array;
  /** Map bytes behind a screen cell (for explaining a difference). */
  mapAt?(ram: Uint8Array, row: number, col: number): number;
  /** Whether travel is offered from here (else `go` must refuse, and leave everything as it was). */
  canGoFrom(ram: Uint8Array): boolean;
  /** Places noted along one route are good in another (they don't depend on what happened on the way). */
  shareRecords?: boolean;
  /** How many of each route's arrivals to travel from (and wander on from); all if not set. */
  sources?: number;
  /**
   * Sprites the screen's own setup puts there on the way in (its creatures, what's to be found): a frame
   * after arriving, each as walking in put it (shown or not, where, its image and how it's drawn); the
   * screen's sprite pointers are at `pointers`.
   */
  sprites?: { n: number[]; pointers: number };
  /** Pieces taken: map addresses (in the canonical layout) of things to take, and what's left when taken. */
  pieces?: { at: number[]; taken: number; chars: number[] };
}

const range = (lo: number, hi: number) => Array.from({ length: hi - lo + 1 }, (_, i) => lo + i);

const karnathMapAddr = (ram: Uint8Array, row: number, col: number) => {
  const off = ram[0x7fe6] + col, page = off >= 40 ? ram[0x7fe7] : (ram[0x7fe7] - 4) & 0xff;
  return (page << 8) + row * 40 + (off % 40);
};
const karnath: TravelSpec = {
  map: karnathMap,
  routes: 'games/karnath/re/routes.json',
  room: (ram) => String(ram[0x3235]),
  noted: karnathPlaces,
  cheat: (ram) => { ram[0x6ffe] = 100; ram[0x322e] = 0; },
  playing: (ram, frame) => frame > 200 && ram[0x3235] >= 1 && ram[0x3235] <= 0x19,
  canon: (ram) => karnathToMode(ram, 0),
  mapRegions: [[0x7000, 0x7fdf], [0x8000, 0xb3df], [0xb400, 0xb7c9], [0xb7ee, 0xb7ff]],
  // in mode 0 the lower half's blocks run at $6000 and $C000; the upper half's are kept at $D800 and $E100, the dungeons' at $F100, the abode's at $F900
  // (as much of each as the game swaps: 9 pages of the upper half's low block, 16 of its high, 8 of the dungeons', 7 of the abode's)
  blocks: [
    { code: castle_6000.CODE, shift: 0, end: 0x68ff }, { code: castle_c000.CODE, shift: 0, end: 0xcfff },
    { code: castle_d800.CODE, shift: 0xd800 - 0x6000, end: 0x68ff }, { code: castle_e100.CODE, shift: 0xe100 - 0xc000, end: 0xcfff },
    { code: castle_f100.CODE, shift: 0xf100 - 0x6000, end: 0x67ff }, { code: castle_f900.CODE, shift: 0xf900 - 0x6000, end: 0x66ff },
  ],
  graphics: [[0x3800, 0x3fff], [0x5000, 0x5fff], [0xb800, 0xbfff], [0xd000, 0xd7ff]],
  progress: [0x6ffe, 0x6ffd, 0x6fff, 0x322c, ...range(0x321c, 0x3223), 0x322f, 0x3214, 0x3215, 0x3236, 0x3237, 0x3239, 0x323a, ...range(0x07c5, 0x07c9), ...range(0x07dc, 0x07de)],
  location: KARNATH_LOCATION,
  firstRow: 0,
  rows: 20,
  canGoFrom: (ram) => ram[0x6ffd] === 0 && ram[0x6fff] !== 0x11 && ram[0x6fff] !== 0x12,
  screenFromMap: (ram) => { const s = new Uint8Array(20 * 40); for (let r = 0; r < 20; r++) for (let c = 0; c < 40; c++) s[r * 40 + c] = ram[karnathMapAddr(ram, r, c)]; return s; },
  mapAt: karnathMapAddr,
  // the pieces of the pentacle lying in the castle (as the game's restart puts them back, $6CB6)
  pieces: { at: [0x79e2, 0x72df, 0x864c, 0x8df3, 0x91fd, 0x9641, 0x7089, 0x9d70, 0xa196, 0xaeb7], taken: 0x4f, chars: [0xd4, 0xd5] },
};

// Blackwyche's room blocks, each kept where the table at $9D7A says (the decks' own runs at $6000), found by their code
const title0 = unpackState(new Uint8Array(fs.readFileSync('games/blackwyche/assets/blackwyche-title.state'))).ram;
const blackwycheHomes = [...new Set(Array.from({ length: 0x24 }, (_, i) => title0[0x9d7a + 2 * i] | (title0[0x9d7b + 2 * i] << 8)))];
const blackwycheBlocks = BLACKWYCHE_ROOMS.map((v, i) => {
  const runs = Object.values(v.code).flat();
  const home = i === 0 ? 0x6000 : blackwycheHomes.find((h) => h !== 0x6000 && runs.every(([a, hex]) => { for (let k = 0; k < hex.length; k += 2) if (title0[h + a - 0x6000 + k / 2] !== parseInt(hex.slice(k, k + 2), 16)) return false; return true; }));
  return { code: v.code, shift: (home ?? 0x6000) - 0x6000, end: 0x66ff };
});
const blackwyche: TravelSpec = {
  map: blackwycheMap,
  routes: 'games/blackwyche/re/routes.json',
  room: (ram) => { const p = blackwycheWhere(ram); return p ? blackwychePlaceId(p) : '-'; },
  noted: blackwychePlaces,
  cheat: (ram) => { ram[0x9d77] = 100; ram[0x3417] = 0; },
  playing: (_ram, frame) => frame > 200,
  // the decks' own block in, the cabins and halls left as the game leaves them; deck 1's pictures ($131F swaps them for the other decks')
  canon: (ram) => { blackwycheToDeck(ram); if (ram[0x9d78] !== 1) blackwycheEngine.r_131f(); },
  mapRegions: [],
  blocks: blackwycheBlocks,
  graphics: [[0x3800, 0x3fff], [0xb800, 0xbfff]],
  progress: [...range(0x9d60, 0x9d77), 0x9d79, 0x3415, ...range(0x0770, 0x07e7)], // ($9D78 is the deck)
  location: [...BLACKWYCHE_DECK, 0x341c, 0x342e, 0x9d78, 0x1ecd, 0x1ecf, 0x1ee5, ...range(0x1f8c, 0x1f9b)],
  // (out on deck and in the halls, $341C, $1ECF and $1EE5 keep the last cabin's room, picture and door, as the game leaves them;
  // a hall's strip is its four panels, $1504 or $150A, copied with the twelve bytes after them)
  locationFor: (key) => (key.startsWith('D') ? [...BLACKWYCHE_DECK, 0x342e, 0x9d78, 0x1ecd, ...range(0x1f8c, 0x1f9b)]
    : key.startsWith('H') ? [...BLACKWYCHE_DECK, 0x341c, 0x342e, 0x9d78, 0x1ecd, ...range(0x1f8c, 0x1f8f)] : undefined),
  // (rows 3-20: row 21's last column is left as it was by the game, which clears 39 of its 40, $0D77/$274D)
  firstRow: 3,
  rows: 18,
  canGoFrom: (ram) => blackwycheCanTravel(ram),
  shareRecords: true,
  sources: 5,
};
// Dragonskulle's room blocks, each kept where the table at $9C02 says (the one at $6000 to begin with is
// rooms 3 and 4's), as much of each as the game swaps ($9C2C pages); place 0's first page is kept at $FF00
const DRAGONSKULLE_HOMES: [number, number][] = [[0x6000, 0xc00], [0xff00, 0x100], [0xc000, 0x400], [0xc400, 0xa00], [0xcd50, 0xc00], [0xd870, 0x900],
  [0xe010, 0x500], [0xe460, 0x500], [0xe900, 0x700], [0xef20, 0x400], [0xf220, 0x300], [0xf470, 0x300], [0xf6e0, 0x900]];
/** The places Dragonskulle's map notes (found.at, by "x,y"). */
const dragonskullePlaces = (found: Found): Record<string, number[]> => {
  const v = found.at;
  if (isRecordOf(v, isNumbers)) return v;
  const at: Record<string, number[]> = {};
  found.at = at;
  return at;
};
const dragonskulle: TravelSpec = {
  map: dragonskulleMap,
  routes: 'games/dragonskulle/re/routes.json',
  room: dragonskulleKey,
  noted: dragonskullePlaces,
  cheat: (ram) => { ram[0x1248] = 0; ram[0x123e] = 0x14; ram[0x3432] = 0; },
  playing: (_ram, frame) => frame > 300,
  // the block in swapped back out, as every change of screen does first ($0DAB maps the RAM in, $1137 swaps)
  canon: () => { dragonskulleEngine.r_0dab(); dragonskulleEngine.r_1137(); },
  mapRegions: [[0x6e20, 0x6fb7], [0x72b0, 0x72bf]],
  blocks: DRAGONSKULLE_ROOMS.map((v, i) => ({ code: v.code, shift: DRAGONSKULLE_HOMES[i][0] - 0x6000, end: 0x6000 + DRAGONSKULLE_HOMES[i][1] - 1 })),
  graphics: [],
  progress: [0x342f, 0x3430, 0x3431, 0x1248, 0x125f, ...range(0x077d, 0x0782)],
  // ($3441: the way on, which some rooms' setups shut until a dragon is killed)
  location: [...DRAGONSKULLE_LOCATION, 0x341c, 0x3441],
  firstRow: 4,
  rows: 18,
  canGoFrom: dragonskullePlaying,
  // the screen's own sprites (all but his, 2, and the stone, 3): its creatures, the starfish and the mound
  // on the beach, the shovel (sprite 6 in its room, block $EF20), the dragons; pointers at $07F8
  sprites: { n: [0, 1, 4, 5, 6, 7], pointers: 0x07f8 },
  // (where he comes onto a screen depends on the way he came: each route keeps its own)
};
const SPECS: Record<string, TravelSpec> = { karnath, blackwyche, dragonskulle };

const gameId = process.argv[2] ?? 'karnath';
const game = GAMES[gameId], spec = SPECS[gameId];
const port = game?.port;
if (!game || !port || !spec) throw new Error(`no travel test for ${gameId}`);
const routes: number[][] = JSON.parse(fs.readFileSync(spec.routes, 'utf8'));
const title = unpackState(new Uint8Array(fs.readFileSync(game.title)));
// ROUTES=1,3: travel only from those routes' states (all are walked, for the places and arrivals)
const only = process.env.ROUTES ? process.env.ROUTES.split(',').map(Number) : null;
let failures = 0;
const kinds = new Map<string, number>();
const fail = (msg: string) => {
  failures++;
  const kind = msg.replace(/^[^:]*: /, '').replace(/[$0-9a-f]{2,}.*$/, '').trim();
  const n = (kinds.get(kind) ?? 0) + 1;
  kinds.set(kind, n);
  if (n <= (process.env.SHOW ? 1e9 : 3)) console.log('FAIL', msg);
};
const hex = (n: number) => n.toString(16);
const inRegions = (a: number, rs: [number, number][]) => rs.some(([lo, hi]) => a >= lo && a <= hi);
const clone = (x: Found): Found => JSON.parse(JSON.stringify(x));
const saved = (g: NativeHost): MachineState => { const s = g.save(); if (!s) throw new Error('not at the main loop wait'); return s; };

/** Run a host's next main loop wait with `act` (registers kept, as play.ts does), then `frames` more frames. */
function host(state: MachineState, act?: (ram: Uint8Array) => void) {
  const g = NativeHost.resume(port, state);
  let done = !act;
  g.onWait = (site) => {
    if (done || site !== port.mainLoopWait || !act) return;
    done = true;
    const regs = { ...cpu };
    act(g.m.ram);
    Object.assign(cpu, regs);
  };
  return g;
}
const tick = (g: NativeHost, joy = 0x1f) => { setJoy(g.m, game, joy); g.m.keys = []; g.tick(); spec.cheat(g.m.ram); };
/** A copy of a state's memory in the canonical layout. */
function canonical(s: MachineState) { const g = NativeHost.resume(port, s); spec.canon(g.m.ram); return g.m.ram.slice(); }

// ---- 1. walk the routes ----
interface Arrival { route: number; key: string; state: MachineState; after: MachineState }
const arrivals: Arrival[] = [];
const ends: { state: MachineState; found: Found }[] = [];
const t0 = performance.now();
routes.forEach((route, ri) => {
  const g = new NativeHost(port, title);
  const found: Found = {};
  let frame = 0;
  for (let i = 0; i < route.length; i += 2) for (let k = 0; k < route[i + 1]; k++) {
    const v = route[i];
    setJoy(g.m, game, v & 0x1f);
    g.m.keys = v & 32 ? [[1, 2]] : [];
    g.tick(); spec.cheat(g.m.ram); frame++;
    if (g.lastWait !== port.mainLoopWait || !spec.playing(g.m.ram, frame)) continue;
    const before = new Set(Object.keys(spec.noted(found)));
    spec.map.observe(g.m.ram, found, g.m.vic);
    for (const key of Object.keys(spec.noted(found))) {
      if (before.has(key)) continue;
      const state = saved(g);
      const a = host(state); tick(a); // (a frame of play from there, standing still)
      arrivals.push({ route: ri, key, state, after: saved(a) });
    }
  }
  ends.push({ state: saved(g), found: clone(found) });
  console.log(`route ${ri + 1}: ${frame} frames, places noted ${Object.keys(spec.noted(found)).join(' ')}`);
});
console.log(`${arrivals.length} arrivals in ${((performance.now() - t0) / 1000).toFixed(1)}s`);

// Bytes that change in play anyway (in the canonical layout): from every arrival, against the first
const canonOk = (s: MachineState) => spec.canGoFrom(s.ram);
const variable = new Set<number>();
{
  const canon = arrivals.filter((a) => canonOk(a.state)).map((a) => canonical(a.state));
  for (const c of canon) for (let a = 0; a < 0x10000; a++) if (c[a] !== canon[0][a]) variable.add(a);
}

// ---- 2. travel ----
const arrivalOf = new Map<string, Arrival>();
for (const a of arrivals) {
  const k = spec.shareRecords ? a.key : `${a.route}:${a.key}`;
  if (!arrivalOf.has(k)) arrivalOf.set(k, a);
}
const arrivalFor = (ri: number, key: string) => arrivalOf.get(spec.shareRecords ? key : `${ri}:${key}`);
let spritesSame = 0, followSame = 0, followDiffer = 0, codeBytes = 0, travels = 0, refused = 0, piecesKept = 0, roundTrips = 0, explained = 0, framesPlayed = 0;
const row0 = 0x400 + spec.firstRow * 40, cells = spec.rows * 40;

/** Travel from a state to a place (by the map, with what was found); memory just before and after `go`, the state after its frame, and the host a frame later. */
function travel(from: MachineState, key: string, found: Found) {
  const went: { ok: boolean | void; now: Uint8Array; before: Uint8Array } = { ok: undefined, now: new Uint8Array(0), before: new Uint8Array(0) }; // (set as it goes)
  const g = host(from, (ram) => { went.before = ram.slice(); went.ok = spec.map.go?.(key, ram, found); went.now = ram.slice(); });
  tick(g); // (the frame in which it goes, at its end)
  const at = saved(g);
  tick(g); // a frame there
  const { ok, now, before } = went;
  return { ok: ok !== false && now.length > 0, now, before, at, g };
}

function check(label: string, T: ReturnType<typeof travel>, A: Arrival, cS: Uint8Array) {
  // (a frame on from the source he may be somewhere that moves him on at once, a trapdoor: then refused, memory untouched)
  if (!T.ok && T.before.length && !spec.canGoFrom(T.before)) { if (T.before.some((v, i) => v !== T.now[i])) fail(`${label}: refused but changed memory`); else refused++; return; }
  travels++;
  if (!T.ok) { fail(`${label}: go refused`); return; }
  const t = T.g.m, a = A.after;
  // progress: as it was
  for (const x of spec.progress) if (T.now[x] !== T.before[x]) fail(`${label}: progress $${hex(x)} ${T.now[x]} (was ${T.before[x]})`);
  // where he is
  for (const x of spec.locationFor?.(A.key) ?? spec.location) if (t.ram[x] !== a.ram[x]) fail(`${label}: place $${hex(x)} ${hex(t.ram[x])} (walked ${hex(a.ram[x])})`);
  for (const r of [0x04, 0x05, 0x11, 0x16, 0x18, 0x20, 0x21, 0x22, 0x23, 0x25, 0x26]) if (t.vic[r] !== a.vic[r]) fail(`${label}: VIC $d0${hex(r)} ${hex(t.vic[r])} (walked ${hex(a.vic[r])})`);
  if ((t.vic[0x10] & 4) !== (a.vic[0x10] & 4) || (t.vic[0x15] & 4) !== (a.vic[0x15] & 4)) fail(`${label}: his sprite's high x or enable bit`);
  const sp = spec.sprites;
  if (sp) for (const n of sp.n) {
    // (shown: on, and inside the picture's border, where a sprite can be seen)
    // (where: within a few pixels, as a creature may have moved on a step in the walked arrival's frame)
    const bit = 1 << n, at = (m: { vic: Uint8Array }) => ({ x: m.vic[2 * n] + (m.vic[0x10] & bit ? 256 : 0), y: m.vic[2 * n + 1] });
    const look = (m: { ram: Uint8Array; vic: Uint8Array }) => {
      const { x, y } = at(m);
      if (!(m.vic[0x15] & bit) || x === 0 || x >= 344 || y < 30 || y >= 250) return 'not shown';
      return `shown, image ${m.ram[sp.pointers + n].toString(16)} drawn ${[0x1c, 0x17, 0x1d, 0x1b].map((r) => (m.vic[r] & bit ? 1 : 0)).join('')}`;
    };
    const lt = look(t), la = look(a), pt = at(t), pa = at(a);
    if (lt !== la || (la !== 'not shown' && (Math.abs(pt.x - pa.x) > 4 || Math.abs(pt.y - pa.y) > 4))) fail(`${label}: sprite ${n} ${lt} at ${pt.x},${pt.y} (walked ${la} at ${pa.x},${pa.y})`);
    else spritesSame++;
  }
  for (let i = 0; i < cells; i++) if (t.colour[row0 - 0x400 + i] !== a.colour[row0 - 0x400 + i]) { fail(`${label}: colour RAM ${i}`); break; }
  // the screen: drawn from the map; differences from the walked arrival explained by the maps (or none, without a map)
  const drawn = spec.screenFromMap?.(t.ram), walkedMap = spec.screenFromMap?.(a.ram);
  for (let i = 0; i < cells; i++) {
    const r = Math.floor(i / 40), c = i % 40;
    if (drawn && t.ram[row0 + i] !== drawn[i]) { fail(`${label}: screen ${r},${c} isn't the map's`); break; }
    if (t.ram[row0 + i] === a.ram[row0 + i]) continue;
    const at = spec.mapAt;
    if (at && walkedMap && (at(t.ram, r, c) !== at(a.ram, r, c) || t.ram[at(t.ram, r, c)] !== a.ram[at(a.ram, r, c)] || a.ram[row0 + i] !== walkedMap[i])) explained++;
    else { fail(`${label}: screen ${r},${c} ${hex(t.ram[row0 + i])} (walked ${hex(a.ram[row0 + i])}) unexplained`); break; }
  }
  // the map and code, in one layout: the source's
  const cT = canonical(T.at);
  for (let x = 0; x < 0x10000; x++) {
    if (inRegions(x, spec.mapRegions) && cT[x] !== cS[x]) { fail(`${label}: map $${hex(x)} ${hex(cT[x])} (source ${hex(cS[x])})`); break; }
    if (inRegions(x, spec.graphics) && !variable.has(x) && cT[x] !== cS[x]) { fail(`${label}: graphics $${hex(x)} ${hex(cT[x])} (source ${hex(cS[x])})`); break; }
  }
  code: for (const b of spec.blocks) for (const runs of Object.values(b.code)) for (const [at, bytes] of runs) for (let i = 0; i < bytes.length; i += 2) {
    if (at + i / 2 > b.end || at + i / 2 + b.shift > 0xffff) continue;
    if (cT[at + b.shift + i / 2] !== parseInt(bytes.slice(i, i + 2), 16)) { fail(`${label}: code $${hex(at + b.shift + i / 2)} isn't the block's`); break code; }
    codeBytes++;
  }
  // pieces taken before stay taken (where the walked arrival showed them)
  if (spec.pieces && spec.mapAt) for (let i = 0; i < cells; i++) {
    const r = Math.floor(i / 40), c = i % 40;
    if (spec.pieces.chars.includes(a.ram[row0 + i]) && t.ram[spec.mapAt(t.ram, r, c)] === spec.pieces.taken) {
      if (spec.pieces.chars.includes(t.ram[row0 + i])) fail(`${label}: a piece taken is back on screen`);
      else piecesKept++;
    }
  }
}

const t1 = performance.now();
let seed = 7;
const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff);
const allNoted: Record<string, number[]> = {};
// (the first route's record of each place, as its walked arrival is the first route's)
if (spec.shareRecords) for (const e of ends) for (const [k, v] of Object.entries(spec.noted(e.found))) allNoted[k] ??= v;
for (let ri = 0; ri < routes.length; ri++) {
  if (only && !only.includes(ri + 1)) continue;
  const found = clone(ends[ri].found);
  if (spec.shareRecords) Object.assign(spec.noted(found), allNoted);
  const keys = Object.keys(spec.noted(found));
  // sources: where the route ends, each place's arrival along it, and a few seconds' wandering on from each
  // (with `sources` set, that many of the arrivals, spread along the route)
  const all = arrivals.filter((a) => a.route === ri).map((a) => a.state), n = spec.sources ?? all.length;
  const mine = all.filter((_, i) => all.length <= n || Math.floor((i * n) / all.length) !== Math.floor(((i - 1) * n) / all.length));
  const wandered = mine.flatMap((st) => {
    const g = host(st);
    let joy = 0x1f;
    for (let f = 0; f < 200; f++) { if (f % 25 === 0) { joy = 0x1f; for (const b of [1, 2, 4, 8]) if (rnd() < 0.3) joy &= ~b; } tick(g, joy); }
    const s = g.save();
    return s ? [s] : [];
  });
  const sources = [ends[ri].state, ...mine, ...wandered];
  for (const [si, S] of sources.entries()) {
    const from = `route ${ri + 1} source ${si} (${spec.room(S.ram)})`;
    if (!canonOk(S)) {
      // travel isn't offered from here: go must refuse and change nothing
      for (const key of keys) {
        const T = travel(S, key, clone(found));
        if (T.ok) fail(`${from} -> ${key}: went where travel isn't offered`);
        else if (T.before.some((v, i) => v !== T.now[i])) fail(`${from} -> ${key}: refused but changed memory`);
        else refused++;
      }
      continue;
    }
    const cS = canonical(S);
    for (const key of keys) {
      if (spec.room(S.ram) === key) continue; // (the place he's in: the map doesn't offer it)
      const A = arrivalFor(ri, key);
      if (!A) { fail(`${from} -> ${key}: no walked arrival`); continue; }
      const label = `${from} -> ${key}`;
      const T = travel(S, key, clone(found));
      check(label, T, A, cS);
      if (!T.ok) continue;
      // a round trip: on from there to another place
      if (si % 3 === 0) {
        const other = keys[Math.floor(rnd() * keys.length)], B = arrivalFor(ri, other);
        if (other !== key && B) {
          const T2 = travel(T.at, other, clone(found));
          // (refused where he's arrived somewhere that moves him on at once, a trapdoor: memory untouched)
          check(`${label} -> ${other}`, T2, B, canonical(T.at)); roundTrips++;
        }
      }
      // walking on from there goes as it does from the walked arrival (the same input, standing still first)
      {
        const w = host(A.after), g2 = host(T.at);
        tick(g2);
        const script = (f: number) => (f < 60 ? 0x1f : f < 160 ? 0x1f & ~4 : f < 300 ? 0x1f & ~8 : f < 330 ? 0x1f & ~1 : f < 360 ? 0x1f & ~2 : 0x1f);
        for (let f = 0; f < 400; f++) { tick(w, script(f)); tick(g2, script(f)); }
        const where = spec.locationFor?.(spec.room(w.m.ram)) ?? spec.location;
        const d = where.filter((x) => w.m.ram[x] !== g2.m.ram[x]);
        if (spec.room(w.m.ram) !== spec.room(g2.m.ram) || d.length) {
          followDiffer++;
          if (process.env.SHOW) {
            console.log(`${label}: walking on differs: ${spec.room(g2.m.ram)}/${spec.room(w.m.ram)} ${d.map(hex).join(' ')}`);
            const t0 = T.at, a0 = A.after, v: string[] = [];
            for (const [lo, hi] of [[0x1500, 0x15ff], [0x1e00, 0x1fff], [0x2100, 0x21ff], [0x3400, 0x34ff], [0x9d60, 0x9d7f]]) for (let x = lo; x <= hi; x++) if (t0.ram[x] !== a0.ram[x]) v.push(`${hex(x)}:${hex(t0.ram[x])}/${hex(a0.ram[x])}`);
            console.log('   at arrival, vars differ:', v.join(' '));
          }
        }
        else followSame++;
      }
      // and the game plays on
      if (si === 0) {
        const g = T.g, before = g.fallbacks.size;
        let joy = 0x1f;
        try {
          for (let f = 0; f < 300; f++) { if (f % 20 === 0) { joy = 0x1f; for (const b of [1, 2, 4, 8, 16]) if (rnd() < 0.3) joy &= ~b; } tick(g, joy); framesPlayed++; }
        } catch (e) { fail(`${label}: playing on: ${e instanceof Error ? e.message : String(e)}`); }
        if (g.fallbacks.size > before) fail(`${label}: 6502 fallbacks playing on: ${[...g.fallbacks.keys()].map(hex).join(' ')}`);
        if (g.lastWait !== port.mainLoopWait) fail(`${label}: not back at the main loop after playing on`);
      }
    }
  }
}
console.log(`${codeBytes} code bytes of the blocks checked in place; ${spritesSame} of the screens' own sprites as walking in put them; ${travels} travels (${roundTrips} round trips) in ${((performance.now() - t1) / 1000).toFixed(1)}s; ${refused} refused where travel isn't offered (memory untouched); ${explained} screen cells differ from walking where the map does; pieces taken elsewhere stayed taken in ${piecesKept} cells; ${framesPlayed} frames played on; walking on (400 frames, same input) ended in the same place as from the walked arrival ${followSame} times, elsewhere ${followDiffer}`);
if (failures) console.log(`${failures} FAILURES:`, [...kinds].map(([k, n]) => `${k} x${n}`).join('; '));
else console.log('all good');
process.exit(failures ? 1 : 0);
