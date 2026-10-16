/**
 * runstop64's rooms (ENHANCED: data/runstop64-rooms.ts), headless (c64kit stood in by
 * games/shared/test/kit.ts):
 *
 *  1. ENHANCED through the front end: a new game, hold right: Monty walks out of the start
 *     room into the dev room ($34).
 *  2. Every new room reached and left by real play: a search (breadth first over the game's own
 *     frames, the inputs held 8 frames at a time: walk, climb, jump, wait; the game copied at
 *     each step, its enemies and crushers part of where it is) from walking into the dev room,
 *     room by room: from each way into each room, a way out through every one of its exits,
 *     the way he came in included (nobody is trapped). The rooms' crushers and teleporters run as they do (g.random,
 *     from a seeded Math.random: the same run each time).
 *  3. The warps, taken in that play, land as walking in does (the same place and state):
 *     The Ultimate Experience ($1D, from $1C) with the jetpack on, flying up when up is held;
 *     the C5 street ($24, from $20: the tree, the C5 as it starts) and the C5 drives on into
 *     $25; Pie Are Square ($08, from $09), standing.
 *  4. The map: the rooms are on it in their own colour (RUNSTOP64 in the legend), not in the
 *     original's count; travel to one goes there.
 *  5. Saves: a save in the dev room continues there with ENHANCED, and with ORIGINAL (the rooms
 *     aren't there) from the start room, the rest of the save as it was.
 *  6. ORIGINAL: the start room's right is closed (as the original's: no room in that cell), and
 *     every table the original's rooms read is the original's, byte for byte.
 *
 * With an output folder, pictures: every new room (Monty where the search came in), a contact
 * sheet of them, and the pause screen's map.
 *
 *   nice -n 15 node tools/test.mjs games/montyotr/test/runstop64-rooms.ts [out-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { hexBytes, Input, PixelRenderer, VicView } from 'c64kit';
import raw from '../src/data/motr.json';
import { ROOMS } from '../src/data/runstop64-rooms';
import {
  coinTable, decorRooms, decorTypes, enemyRecords, exitGridImage, isExtensionRoom, piledriverCfg, roomDef, roomMeta,
  sectorName, specialItems, teleporterCfg, teleporterDests,
} from '../src/data';
import { Game, type Input as Stick } from '../src/game';
import { run } from '../src/main';
import { montyMap, noteRoom } from '../src/map';
import { indicesToRgb, rgbPng } from '../../../tools/probe/render';
import { MAP_BOX } from '../../shared/native/pause';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { must } from '../../shared/test/must';
import { getProp } from '../../shared/guards';
import { check, finish } from '../../shared/test/check';

// the same run each time (the crushers and teleporters take g.random(), which takes Math.random)
{
  let seed = 12345;
  Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
}

const outDir = process.argv[2];
const hex = (n: number) => `$${n.toString(16).padStart(2, '0')}`;

function picture(file: string, px: Uint8Array, W = 320, H = 200) {
  if (!outDir) return;
  fs.mkdirSync(outDir, { recursive: true });
  rgbPng(path.join(outDir, file), indicesToRgb(px), W, H, 2);
}

/** The exits each new room has (the rooms they lead to; the teleporters' too). */
const EXITS = new Map<number, number[]>([
  [0x34, [0x00, 0x35]], [0x35, [0x34, 0x36]], [0x36, [0x35, 0x37, 0x3a]],
  [0x37, [0x36, 0x38, 0x1d]], [0x38, [0x37, 0x39, 0x24]], [0x39, [0x38, 0x3d, 0x08]],
  [0x3a, [0x36, 0x3b]], [0x3b, [0x3a, 0x3c]], [0x3c, [0x3b, 0x3d]], [0x3d, [0x3c, 0x39]],
]);
const WARPS = new Map([[0x37, 0x1d], [0x38, 0x24], [0x39, 0x08]]);

// ---- the game, played and copied ----------------------------------------------------------------

/** ENHANCED's assists, all on (as the switch has them). */
const ENHANCED = { cloud: true, jetpack: true, c5: true, rooms: true, respawn: true };

/** A copy of a game (between frames, with no scripted sequence running): what goes on from it is what would go on from the original. */
function copy(src: Game): Game {
  const g = new Game();
  for (const k of Object.keys(src)) {
    if (k === 'vic' || k === 'mem' || k === 'col' || k === 'sound' || k === 'onRoomLoaded' || k === 'graceActive' || k === 'script') continue;
    Reflect.set(g, k, structuredClone(getProp(src, k)));
  }
  g.assist = { ...src.assist };
  g.vic.bank.set(src.vic.bank);
  g.vic.colour.set(src.vic.colour);
  for (const k of Object.keys(src.vic)) {
    if (k === 'bank' || k === 'colour') continue;
    Reflect.set(g.vic, k, structuredClone(getProp(src.vic, k)));
  }
  return g;
}

/** Sprite-sprite collisions after a frame, as the front end reads them (VicView), looked at only when two sprites' boxes meet. */
function collisions(g: Game) {
  const v = g.vic, box = (n: number) => {
    const r = v.sprites[n];
    return { x: (r.x >= 504 ? r.x - 504 : r.x) - 24, y: r.y - 50, w: v.expandX & (1 << n) ? 48 : 24, h: v.expandY & (1 << n) ? 42 : 21 };
  };
  const on = [0, 1, 2, 3, 4, 5, 6, 7].filter((n) => v.enable & (1 << n)).map(box);
  const meet = on.some((a, i) => on.slice(i + 1).some((b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h));
  if (!meet) return 0;
  const view = new VicView(new PixelRenderer(), v);
  view.update();
  return view.collisions(g.uncounted);
}

interface State { g: Game; col: number }
const STEP = 8;
const NONE: Stick = { left: false, right: false, up: false, down: false, fire: false };
const ACTIONS: [string, Stick][] = [
  ['<', { ...NONE, left: true }], ['>', { ...NONE, right: true }], ['^', { ...NONE, up: true }], ['v', { ...NONE, down: true }],
  ['.', NONE], ['J<', { ...NONE, left: true, fire: true }], ['J>', { ...NONE, right: true, fire: true }], ['J', { ...NONE, fire: true }],
];

/** One frame of play, as the front end runs it. */
function frame(s: State, stick: Stick) {
  s.g.input = stick;
  s.g.inputFire = stick.fire;
  s.g.frame(s.col);
  s.col = collisions(s.g);
}

/** In a room, the transition done (a dissolve included). */
const settled = (g: Game) => !g.freeze && !g.script;

type Step = { to: number } | { dead: true } | null;
/** Hold a stick for some frames: into another room (settled there), dead, or still here. */
function hold(s: State, stick: Stick, frames: number): Step {
  const room = s.g.roomId;
  for (let f = 0; f < frames; f++) {
    frame(s, stick);
    if (s.g.roomId !== room) { // (a teleporter's dissolve holds the game a while: action_counter $80)
      for (let n = 0; n < 200 && !settled(s.g); n++) frame(s, NONE);
      return { to: s.g.roomId };
    }
    if (s.g.actionCounter) return { dead: true };
  }
  return null;
}

/** Where Monty is and how, and roughly where the room's enemies and crushers are, for the search. */
const key = (g: Game) => [
  g.x2, g.y, g.onRope, g.montyAction, g.arcIdx, g.falling, g.facing >> 7, g.frameToggle,
  ...g.enemies.map((e) => `${e.x >> 3}/${e.y >> 3}/${e.flags >> 7}`), g.pd.state, g.pd.index, g.pd.position >> 3,
].join(',');

interface Way { to: number; path: string[]; arrival: State }
/** Breadth first from an arrival in a room: the first way out to each room its exits lead to. */
function search(start: State, limit = 250000): Map<number, Way> {
  const ways = new Map<number, Way>();
  const want = EXITS.get(start.g.roomId) ?? [];
  const seen = new Set([key(start.g)]);
  let level: { s: State; path: string[] }[] = [{ s: start, path: [] }];
  let nodes = 0;
  while (level.length && ways.size < want.length && nodes < limit) {
    const next: typeof level = [];
    for (const { s, path } of level) {
      // (in the air the stick does nothing: the jump or the fall goes on as it started)
      const acts = s.g.montyAction || s.g.falling ? [ACTIONS[4]] : ACTIONS;
      for (const [name, stick] of acts) {
        const t: State = { g: copy(s.g), col: s.col };
        const r = hold(t, stick, STEP);
        nodes++;
        if (r && 'dead' in r) continue;
        if (r) {
          if (!ways.has(r.to)) ways.set(r.to, { to: r.to, path: [...path, name], arrival: t });
          continue;
        }
        const k = key(t.g);
        if (seen.has(k)) continue;
        seen.add(k);
        next.push({ s: t, path: [...path, name] });
      }
    }
    level = next;
  }
  return ways;
}

/** A route as written: runs of the same input, e.g. "> x12, J> x5". */
const route = (p: string[]) => p.reduce<[string, number][]>((a, n) => {
  const last = a[a.length - 1];
  if (last && last[0] === n) last[1]++; else a.push([n, 1]);
  return a;
}, []).map(([n, k]) => `${n}${k > 1 ? ` x${k}` : ''}`).join(' ');

// ---- 1. ENHANCED, the front end: right from the start, into the dev room --------------------------

const store = useMemoryStorage();
function boot(enhanced: boolean, keep = false) {
  if (!keep) store.clear();
  store.set('montyotr.assist', JSON.stringify({ enhanced }));
  const input = new Input(nowhere);
  const renderer = new PixelRenderer();
  const p = run({ renderer, input, canvas: nowhere });
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
  const tap = (code: string) => { input.keyDown(code); tick(2); input.keyUp(code); tick(2); };
  const until = (cond: () => boolean, max: number) => { let n = 0; while (!cond() && n++ < max) tick(); return cond(); };
  return { p, g: p.game, input, renderer, tick, tap, until };
}

{
  const b = boot(true);
  b.tick(400);
  b.tap('Space');
  b.tick(20);
  check(`ENHANCED: a new game in the start room (${hex(b.g.roomId)}), the rooms assist on`, b.g.roomId === 0x00 && b.g.assist.rooms);
  b.input.keyDown('ArrowRight');
  const walked = b.until(() => b.g.roomId === 0x34 && settled(b.g), 600);
  b.input.keyUp('ArrowRight');
  check(`ENHANCED: holding right walks Monty out of the start room into the dev room (${hex(b.g.roomId)}, "${sectorName(b.g.roomId).text}")`, walked);
  b.tick(10);
  picture('enhanced-walk-in.png', b.renderer.picture());

  // ---- 5. saves: made in the dev room ---------------------------------------------------------------
  b.tick(5);
  const saved = { x2: b.g.x2, y: b.g.y, score: b.g.score };
  const again = boot(true, true);
  again.tick(5);
  check(`a save in the dev room, the game launched again (ENHANCED): carries on there (${hex(again.g.roomId)}, x2 ${hex(again.g.x2)})`,
    again.until(() => again.p.state.mode === 'play' && settled(again.g), 400) && again.g.roomId === 0x34 && again.g.x2 === saved.x2);
  const orig = boot(false, true);
  check(`the same save with ORIGINAL (the rooms not there): carries on from the start room (${hex(orig.g.roomId)}), as a new game starts him`,
    orig.until(() => orig.p.state.mode === 'play' && settled(orig.g), 400) && orig.g.roomId === 0x00 && orig.g.x2 === 0x86 && orig.g.score === saved.score);
  orig.input.keyDown('ArrowRight');
  orig.until(() => orig.g.roomId !== 0x00, 400);
  orig.input.keyUp('ArrowRight');
  check(`... and plays on in the original's rooms: his right stays closed (${hex(orig.g.roomId)})`, orig.g.roomId === 0x00);
}

// ---- 6. ORIGINAL: the start room's right closed ------------------------------------------------------

{
  const b = boot(false);
  b.tick(400);
  b.tap('Space');
  b.tick(20);
  b.input.keyDown('ArrowRight');
  b.tick(400);
  b.input.keyUp('ArrowRight');
  check(`ORIGINAL: holding right, Monty stays in the start room at its right edge (room ${hex(b.g.roomId)}, x2 ${hex(b.g.x2)})`, b.g.roomId === 0x00 && b.g.x2 >= 0x9b && !b.g.assist.rooms);
  check('ORIGINAL: the exit grid has no room right of the start, nor in any of the new rooms\' cells', ROOMS.every((r) => b.g.roomAt(r.row, r.col) === 0xff));
  // every table the original's rooms read is the original's (data.ts merges the new rooms in after it, by room id)
  const same = (a: ArrayLike<number>, o: ArrayLike<number>) => Array.from(a).join() === Array.from(o).join();
  const coins = hexBytes(raw.coins), decor = hexBytes(raw.decorRooms), pd = hexBytes(raw.piledrivers), tc = hexBytes(raw.teleporters), td = hexBytes(raw.teleporterDests);
  const meta = hexBytes(raw.roomMeta), sectors = hexBytes(raw.sectorIdx);
  let rooms = true;
  for (let id = 0; id < raw.rooms; id++) {
    const d = roomDef(id);
    const cells: number[] = [];
    for (const byte of hexBytes(raw.tilemaps[id])) for (let i = 0; i <= byte >> 4 && cells.length < 640; i++) cells.push(byte & 15);
    const def = hexBytes(raw.roomDefs).subarray(id * 16, id * 16 + 16);
    rooms &&= same(d.cells, cells) && same([...d.tiles, ...d.colours], def) && same(enemyRecords(id), hexBytes(raw.enemies[id]))
      && roomMeta[id] === meta[id] && sectorName(id).text === raw.sectorNames[sectors[id]].text;
  }
  check(`ORIGINAL's data: its 52 rooms' maps, tiles, enemies, themes and names as the original's`, rooms);
  check('ORIGINAL\'s data: the coin, decoration, crusher and teleporter tables start with the original\'s, unchanged',
    same(coinTable.subarray(0, coins.length), coins) && same(decorRooms.subarray(0, decor.length), decor) && same(piledriverCfg.subarray(0, pd.length), pd)
    && same(teleporterCfg.subarray(0, tc.length), tc) && same(teleporterDests.subarray(0, td.length), td) && same(exitGridImage, hexBytes(raw.exitGrid))
    && decorTypes.slice(0, raw.decorTypes.length).every((t, i) => t.w === raw.decorTypes[i].w && t.h === raw.decorTypes[i].h));
  check('ORIGINAL\'s data: what\'s added is only for the new rooms (ids from $34)',
    Array.from({ length: (coinTable.length - coins.length) / 3 }, (_, i) => coinTable[coins.length + i * 3]).every(isExtensionRoom)
    && Array.from({ length: (decorRooms.length - decor.length) / 4 }, (_, i) => decorRooms[decor.length + i * 4]).every(isExtensionRoom)
    && Array.from({ length: (piledriverCfg.length - pd.length) / 5 }, (_, i) => piledriverCfg[pd.length + i * 5]).every(isExtensionRoom)
    && Array.from({ length: (teleporterCfg.length - tc.length) / 5 }, (_, i) => teleporterCfg[tc.length + i * 5]).every(isExtensionRoom)
    && ROOMS.every((r) => r.id >= 0x34));
}

// ---- 2. every room reached and left by real play -------------------------------------------------------

const g0 = new Game();
g0.assist = { ...ENHANCED };
g0.start();
const start: State = { g: g0, col: 0 };
hold(start, NONE, 30);
let walkIn: Step = null;
for (let n = 0; n < 60 && !walkIn; n++) walkIn = hold(start, { ...NONE, right: true }, STEP);
check(`play: walking right from the start reaches the dev room (${walkIn && 'to' in walkIn ? hex(walkIn.to) : 'no'})`, !!walkIn && 'to' in walkIn && walkIn.to === 0x34);

/** Arrivals to search from: each new room as entered from each room next to it (the first time play found it). */
const arrivals: { room: number; from: number; s: State }[] = [{ room: 0x34, from: 0x00, s: start }];
const found = new Map<number, Map<number, Way>>(); // room -> exits found (from any of its arrivals)
const warpArrivals = new Map<number, State>();
const shots = new Map<number, Uint8Array>();
for (let i = 0; i < arrivals.length; i++) {
  const a = arrivals[i];
  if (!shots.has(a.room)) {
    const t = { g: copy(a.s.g), col: a.s.col };
    hold(t, NONE, 2);
    const r = new PixelRenderer(), view = new VicView(r, t.g.vic);
    view.update(); view.render(0);
    shots.set(a.room, r.picture());
  }
  const t0 = Date.now();
  const ways = search(a.s);
  const exits = found.get(a.room) ?? new Map<number, Way>();
  found.set(a.room, exits);
  for (const w of ways.values()) {
    if (!exits.has(w.to)) exits.set(w.to, w);
    if (EXITS.has(w.to) && !arrivals.some((b) => b.room === w.to && b.from === a.room)) arrivals.push({ room: w.to, from: a.room, s: w.arrival });
    if (WARPS.get(a.room) === w.to) warpArrivals.set(w.to, w.arrival);
  }
  const back = ways.get(a.from);
  console.log(`     ${hex(a.room)} from ${hex(a.from)}: out to ${[...ways.keys()].map(hex).join(' ')} (${((Date.now() - t0) / 1000).toFixed(1)} s)${back ? `; back: ${route(back.path)}` : ''}`);
  const want = EXITS.get(a.room) ?? [];
  check(`play: ${hex(a.room)} (${sectorName(a.room).text}), come in from ${hex(a.from)}: left the way he came, and by every other exit (${want.map(hex).join(' ')})`,
    !!back && want.every((to) => ways.has(to)));
}
for (const [room, want] of EXITS) {
  const exits = found.get(room);
  check(`play: ${hex(room)} reached, and every exit taken (${want.map(hex).join(' ')})`, !!exits && want.every((to) => exits.has(to)));
}

// ---- 2b. coins and cake: at most two coins a room, and every one of them can be had ----------------------

{
  const coinsIn = (id: number) => Array.from({ length: coinTable.length / 3 }, (_, i) => i).filter((i) => coinTable[i * 3] === id);
  const cakesIn = (id: number) => Array.from({ length: specialItems.length / 4 }, (_, i) => i).filter((i) => specialItems[i * 4] === id);
  check(`coins: at most two in each of runstop64's rooms (${ROOMS.map((r) => `${hex(r.id)} ${coinsIn(r.id).length}`).join(', ')})`,
    ROOMS.every((r) => coinsIn(r.id).length <= 2 && (r.coins ?? []).length <= 2));
  check(`cake: the original's cupcake (pointer $91) in ${ROOMS.filter((r) => r.cake).map((r) => hex(r.id)).join(' ')}, none in the others`,
    ROOMS.every((r) => cakesIn(r.id).length === (r.cake ? 1 : 0) && cakesIn(r.id).every((i) => ((specialItems[i * 4 + 3] + 0x8e) & 0xff) === 0x91)));
  // each one had by play: breadth first from the room's first way in, as the exits are found (enemies, crushers
  // and all: the copy of the game is the game), until it's taken with no life lost
  for (const r of ROOMS) {
    const a = arrivals.find((x) => x.room === r.id);
    if (!a) { check(`${hex(r.id)}: reached`, false); continue; }
    const goals = [...coinsIn(r.id).map((i) => ({ what: `coin (${coinTable[i * 3 + 1]}, ${coinTable[i * 3 + 2]})`, got: (g: Game) => g.coinCollected[i] !== 0 })),
      ...cakesIn(r.id).map((i) => ({ what: 'cake', got: (g: Game) => g.siCollected[i] !== 0 }))];
    for (const goal of goals) {
      const t0 = Date.now();
      const way = collect(a.s, goal.got);
      check(`${hex(r.id)} (${sectorName(r.id).text}): its ${goal.what} taken by play, no life lost${way ? `: ${route(way)}` : ''} (${((Date.now() - t0) / 1000).toFixed(1)} s)`, !!way);
    }
  }
  // a cake taken: 200 points and the item sound, as the original's (HandleSICollision)
  const r = ROOMS.find((x) => x.cake), a = r && arrivals.find((x) => x.room === r.id), i = r ? cakesIn(r.id)[0] : -1;
  if (a && i >= 0) {
    const t = { g: copy(a.s.g), col: a.s.col }, score = t.g.score;
    const way = collect(a.s, (g) => g.siCollected[i] !== 0);
    for (const n of way ?? []) hold(t, must(ACTIONS.find(([k]) => k === n), n)[1], STEP);
    check(`a cake taken (${hex(a.room)}): 200 points as the original's cupcakes (score ${score} -> ${t.g.score}, coins ${t.g.coinCollected.filter((c) => c).length}), the sprite gone`,
      t.g.siCollected[i] !== 0 && (t.g.score - score - 200) % 50 === 0 && t.g.score - score >= 200 && !(t.g.enable & 1));
  }
}

/** Breadth first from an arrival (as `search`): the inputs that take something (`got`) with no life lost, or null. */
function collect(start: State, got: (g: Game) => boolean, limit = 150000): string[] | null {
  const seen = new Set([key(start.g)]);
  let level: { s: State; path: string[] }[] = [{ s: start, path: [] }];
  let nodes = 0;
  while (level.length && nodes < limit) {
    const next: typeof level = [];
    for (const { s, path } of level) {
      const acts = s.g.montyAction || s.g.falling ? [ACTIONS[4]] : ACTIONS;
      for (const [name, stick] of acts) {
        const t: State = { g: copy(s.g), col: s.col };
        const room = t.g.roomId;
        let dead = false, done = false;
        for (let f = 0; f < STEP && !dead && !done; f++) {
          frame(t, stick);
          if (t.g.actionCounter && !(t.g.actionCounter & 0x80)) dead = true;
          else if (got(t.g)) done = true;
        }
        nodes++;
        if (done) return [...path, name];
        if (dead || t.g.roomId !== room) continue;
        const k = key(t.g);
        if (seen.has(k)) continue;
        seen.add(k);
        next.push({ s: t, path: [...path, name] });
      }
    }
    level = next;
  }
  return null;
}

// ---- 3. the warps land as walking in does -------------------------------------------------------------

/** Walk in by play: Monty brought into a room next to it as the game brings him in, then the stick held till the room changes. */
function walkInto(from: { mapRow: number; exitCol: number; x2: number; y: number }, stick: Stick, set: (g: Game) => void = () => {}) {
  const g = new Game();
  g.assist = { ...ENHANCED };
  g.start();
  set(g);
  Object.assign(g, from);
  g.roomExit = 1;
  const s: State = { g, col: 0 };
  hold(s, NONE, 10);
  let r: Step = null;
  for (let n = 0; n < 100 && !r; n++) r = hold(s, stick, STEP);
  return s;
}
const where = (g: Game) => ({ room: g.roomId, x2: g.x2, y: g.y, mapRow: g.mapRow, exitCol: g.exitCol });
const sameWhere = (a: Game, b: Game) => JSON.stringify(where(a)) === JSON.stringify(where(b));
const showWhere = (g: Game) => `${hex(g.roomId)} x2 ${hex(g.x2)} y ${hex(g.y)}`;

{
  const w = warpArrivals.get(0x1d);
  // (into $1C as the game brings him, its floor there with the joystick found, then left into $1D)
  const walked = walkInto({ mapRow: 5, exitCol: 10, x2: 0x20, y: 0xb2 }, { ...NONE, left: true }, (g) => { g.siCollected[5] = 0x81; });
  check(`warp to The Ultimate Experience: lands as walking in from $1C does (${w ? showWhere(w.g) : 'no warp'}; walked: ${showWhere(walked.g)})`,
    !!w && sameWhere(w.g, walked.g) && w.g.showJetpack === 1 && walked.g.showJetpack === 1);
  if (w) {
    const t = { g: copy(w.g), col: w.col }, y0 = t.g.y, u = { g: copy(walked.g), col: walked.col };
    const r = hold(t, { ...NONE, up: true }, 40);
    hold(u, { ...NONE, up: true }, 40);
    check(`... the jetpack on: holding up, he flies up as he does having walked in (y ${hex(y0)} to ${hex(t.g.y)}; walked in: ${hex(u.g.y)}; thrust ${t.g.jetpackActive})`,
      r === null && t.g.y <= y0 - 12 && t.g.y === u.g.y && t.g.jetpackActive === 1);
    picture('warp-jetpack.png', pictureOf(t.g));
  }
}
{
  const w = warpArrivals.get(0x24);
  const walked = walkInto({ mapRow: 2, exitCol: 9, x2: 0x20, y: 0xba }, { ...NONE, left: true });
  const c5 = (g: Game) => JSON.stringify({ ...where(g), c5: g.c5, arrival: g.c5Arrival, ramp: [g.sx[1], g.sy[1]], expandX: g.expandX });
  check(`warp to the C5 street: lands as walking in from $20 does, by the tree, the C5 as it starts (${w ? showWhere(w.g) : 'no warp'}; walked: ${showWhere(walked.g)})`,
    !!w && c5(w.g) === c5(walked.g) && w.g.c5.active === 1);
  if (w) {
    // (from the frame parity the drive came in on: test/c5.ts)
    let drove: { wait: number; t: State } | null = null;
    for (let wait = 0; wait < 120 && !drove; wait++) {
      const t = { g: copy(w.g), col: w.col };
      if (hold(t, NONE, wait)) continue;
      const r = hold(t, { ...NONE, left: true }, 100);
      if (r && 'to' in r && r.to === 0x25 && t.g.c5.active === 1) drove = { wait, t };
    }
    check(`... and the C5 drives on into the next room ($25, left held at once or a frame later, as test/c5.ts drives from the tree${drove ? `: after ${drove.wait}` : ': never'})`, !!drove && drove.wait <= 1);
    if (drove) picture('warp-c5.png', pictureOf(drove.t.g));
  }
}
{
  const w = warpArrivals.get(0x08);
  const walked = walkInto({ mapRow: 1, exitCol: 20, x2: 0x20, y: 0xca }, { ...NONE, left: true });
  check(`warp to Pie Are Square: lands as walking in from $09 does (${w ? showWhere(w.g) : 'no warp'}; walked: ${showWhere(walked.g)})`, !!w && sameWhere(w.g, walked.g));
  if (w) {
    const t = { g: copy(w.g), col: w.col }, x0 = t.g.x2;
    const r = hold(t, { ...NONE, left: true }, 24);
    check(`... standing, and he walks on (x2 ${hex(x0)} to ${hex(t.g.x2)}; ${JSON.stringify(r)} freeze ${t.g.freeze} mode ${t.g.gameMode} ac ${t.g.actionCounter} room ${hex(t.g.roomId)})`, r === null && t.g.x2 < x0 && !t.g.falling);
    picture('warp-pie.png', pictureOf(t.g));
  }
}

function pictureOf(g: Game) {
  const r = new PixelRenderer(), view = new VicView(r, g.vic);
  view.update(); view.render(0);
  return r.picture();
}

// ---- 4. the map ------------------------------------------------------------------------------------

{
  const b = boot(true);
  b.tick(400);
  b.tap('Space');
  b.tick(20);
  b.input.keyDown('ArrowRight');
  b.until(() => b.g.roomId === 0x34 && settled(b.g), 600);
  b.input.keyUp('ArrowRight');
  b.tick(10);
  b.tap('KeyP');
  b.tick(4);
  const s = b.renderer.screen;
  const at = (row: number, col: number) => {
    const box = MAP_BOX, ox = box.x + Math.floor((box.w - 23 * 8) / 2);
    return s.pixels[(box.y + 2 + row * 8 + 3) * 320 + ox + col * 8 + 3];
  };
  const info = montyMap.info(b.g, b.p.state.found);
  const legend = typeof montyMap.legend === 'function' ? montyMap.legend(b.g) : [];
  check(`map: the dev room is on it, Monty's room (flashing: ${at(2, 22)}), the rest of the new rooms not seen yet (dark grey: ${ROOMS.filter((r) => r.id !== 0x34).map((r) => at(r.row, r.col)).join(',')})`,
    [1, 7].includes(at(2, 22)) && ROOMS.filter((r) => r.id !== 0x34).every((r) => at(r.row, r.col) === 11));
  check(`map: RUNSTOP64 in the legend (${legend.map((l) => l.text).join(', ')}), the rooms count only the original's (${info[1]})`,
    legend.some((l) => l.text === 'RUNSTOP64' && l.colour === 6) && /\/51$/.test(info[1]));
  picture('map-dev-room.png', b.renderer.picture());
  b.tap('KeyP');
  // to the start room and back by travel: the dev room is offered, and travel goes there
  b.input.keyDown('ArrowLeft');
  b.until(() => b.g.roomId === 0x00 && settled(b.g), 600);
  b.input.keyUp('ArrowLeft');
  b.tick(10);
  const place = (montyMap.places?.(MAP_BOX, b.g, b.p.state.found) ?? []).find((q) => q.id === String(0x34));
  check('map: from the start room, travel offers the dev room', !!place);
  b.tap('KeyP');
  b.input.touch = true;
  const q = must(place, 'the dev room on the map');
  b.input.point(q.x, q.y); b.tick(2);
  b.input.point(q.x, q.y); b.tick(1);
  b.input.touch = false;
  if (b.p.state.paused) b.tap('KeyP');
  const went = b.until(() => b.g.roomId === 0x34 && settled(b.g), 300);
  check(`map: travel to the dev room goes there (${hex(b.g.roomId)})`, went);
  b.input.keyDown('ArrowLeft');
  b.until(() => b.g.roomId === 0x00 && settled(b.g), 600);
  b.input.keyUp('ArrowLeft');
  b.tick(10);
  b.tap('KeyP');
  b.tick(4);
  check(`map: from the start room, the dev room in runstop64's colour (blue: ${at(2, 22)})`, at(2, 22) === 6);
  b.tap('KeyP');
  // every new room as play came into it (the search above): all on the map in runstop64's colour, travel offered to each
  for (const a of arrivals) noteRoom(a.s.g, b.p.state.found);
  b.tap('KeyP');
  b.tick(4);
  const offered = new Set((montyMap.places?.(MAP_BOX, b.g, b.p.state.found) ?? []).map((q) => Number(q.id)));
  check(`map: every new room seen, in runstop64's colour (${ROOMS.map((r) => at(r.row, r.col)).join(',')}), travel offered to each, still ${montyMap.info(b.g, b.p.state.found)[1].trim()}`,
    ROOMS.every((r) => at(r.row, r.col) === 6 && offered.has(r.id)) && /\/51$/.test(montyMap.info(b.g, b.p.state.found)[1]));
  picture('map.png', b.renderer.picture());
}

// ---- pictures ---------------------------------------------------------------------------------------

if (outDir) {
  for (const [room, px] of shots) picture(`room-${room.toString(16)}.png`, px);
  const list = ROOMS.map((r) => must(shots.get(r.id), `a picture of ${hex(r.id)}`));
  const cols = 4, W = cols * 324, H = Math.ceil(list.length / cols) * 204, sheet = new Uint8Array(W * H).fill(11);
  list.forEach((px, i) => {
    const ox = (i % cols) * 324 + 2, oy = Math.floor(i / cols) * 204 + 2;
    for (let y = 0; y < 200; y++) sheet.set(px.subarray(y * 320, y * 320 + 320), (oy + y) * W + ox);
  });
  picture('rooms.png', sheet, W, H);
}

finish();
