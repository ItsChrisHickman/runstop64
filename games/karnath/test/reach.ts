/**
 * Karnath: where can Pendragon go? (re/README.md, "Reach"). The castle is walked from a new game by the game's own code (the
 * port, lockstep-checked against the original): a plan inside each level from its map (test/reach-model.ts: the floor check, the
 * doors), carried out with the joystick, and every way to another place (a stair, a tower door, a sign down, a door between
 * rooms) taken to see where the game puts him and what its room count ($3235) says there. What it comes to:
 *
 *  - the room count at the places the walk finds is every number the game names but two: THE LAUNDRY ROOM ($07) and THE CRYPT ($17).
 *    The laundry room is the lower floor's second level's right chamber (columns 96-119, a piece of the pentacle lies there), behind
 *    the first level's right tower door, where a guard (sprite 1, a green figure) stands in the doorway: touching it throws him back
 *    down to the floor ($62A8, $6735) as often as he tries, and no spell moves it. The crypt is no chamber at all: no stair, door
 *    or tower door leads to a 23rd place, and the count is not 23 in any frame of the walk (nor in 1.3 million frames of random
 *    play from every place found: `WANDER=24`);
 *  - the count is not a place: doors move it as they close ($1CA4, $1DC0, $1E4D: by the key held, and not only when he crosses), so
 *    play can put either name on the status line (the recorded route 0 shows 7 in level 2): neither is a room to be found;
 *  - the east tower is the one chamber at the right end of the third level of each floor, reached by the tower doors up the
 *    upper floor (rooms 18, 22) and by $2E33/$2EF6 between the floors (11, 22): EAST TOWER UPPER and LOWER;
 *  - the pause map's no way in (`closed` in src/strips.ts): columns 88-95 of the upper floor's second level (a wall and a staircase
 *    picture) and the laundry room's chamber.
 *
 *   nice -n 15 node tools/test.mjs games/karnath/test/reach.ts          (EDGES=1 lists every way taken; WANDER=n adds n random walks from each place)
 */
import fs from 'node:fs';
import { unpackState, type MachineState } from '../../../packages/c64kit/src/c64/machine';
import { NativeHost } from '../../shared/native/host';
import { GAMES, setJoy } from '../../shared/native/test/games';
import { check, finish } from '../../shared/test/check';
import { must } from '../../shared/test/must';
import { routeWalker } from '../../shared/test/route-walker';
import { KEPT } from '../src/hints';
import { CRYPT, NO_WAY } from '../src/map';
import { STRIPS } from '../src/strips';
import { toMode } from '../src/travel';
import { DX, DY, H, TAKEN, W, distances, floors, type Cluster, type Floor } from './reach-model';

const game = must(GAMES.karnath, 'karnath in games.ts');
const titleBytes = new Uint8Array(fs.readFileSync(game.title));
const title = unpackState(titleBytes);
const alive = (ram: Uint8Array) => { ram[0x6ffe] = 100; ram[0x322e] = 0; };

/** The game's memory as each mode has it (the maps are swapped in by the game's own change of floor), taken from a new game. */
const memories = new Map<number, Uint8Array>();
{
  const g = new NativeHost(game.port, unpackState(titleBytes));
  g.m.ram[0x3219] = 0;
  for (const mode of [1, 0, 0xff, 0xfe]) { toMode(g.m.ram, mode); memories.set(mode, g.m.ram.slice()); }
}
const ALL = floors((mode) => must(memories.get(mode), 'memory of the mode'));
/** The floor he is on: the castle's by mode and level, the dungeons and the abode by mode ($B3E1 is $18 there). */
const floorFor = (mode: number, level: number) => ALL.find((f) => f.strip.mode === mode && (f.strip.level === level || f.strip.level < 0));
const floorLabelled = (label: string) => must(ALL.find((f) => f.strip.label === label), `the floor ${label}`);

/** The joystick for each step: left, right, up, down. */
const JOY = [0x1f & ~4, 0x1f & ~8, 0x1f & ~1, 0x1f & ~2];
const NONE = 0x1f, FIRE = 0x1f & ~16;
/** The game's flag for the step he faces ($25C1: 1 right, 2 left, 3 up, 4 down) and its "blocked" flag for the step ($25C8-$25CB). */
const FACING = [2, 1, 3, 4], BLOCKED = [0x25c9, 0x25cb, 0x25ca, 0x25c8];

/** The game, played a frame at a time. */
class Run {
  readonly host: NativeHost;
  frames = 0;
  /** Frames the room count was the crypt's. */
  crypt = 0;
  constructor(snap: MachineState) { this.host = NativeHost.resume(game.port, snap); }
  get ram() { return this.host.m.ram; }
  get vic() { return this.host.m.vic; }
  step(joy: number) {
    const m = this.host.m;
    setJoy(m, game, joy); m.keys = []; this.host.tick(); alive(m.ram);
    m.ram[KEPT.carrying] = 0; // (a piece of the pentacle taken on the way is not kept: carried, it would be a wall to the next, and he is here to walk)
    this.frames++;
    if (m.ram[0x3235] === CRYPT) this.crypt++;
  }
  /** Let go of the stick and wait for a clean moment to save at. */
  settle(): MachineState | null {
    for (let i = 0; i < 90; i++) this.step(NONE);
    for (let i = 0; i < 30; i++) { const s = this.host.save(); if (s) return s; this.step(NONE); }
    return null;
  }
}

/** Where he is on a floor, in pixels along the strip (the screen's cells from the view's left edge, and his sprite) and down the screen. */
interface Place { floor: Floor; x: number; y: number; at: number }
function whereIs(ram: Uint8Array, vic: Uint8Array): Place | null {
  const floor = floorFor(ram[0x3219], ram[0xb3e1]);
  if (!floor) return null;
  const viewLeft = ((ram[0x7fe7] - 4 - floor.strip.base) >> 2) * 40 + ram[0x7fe6];
  const x = 8 * viewLeft + (vic[4] | ((vic[0x10] & 4) << 6)) - 24, y = ram[0x3238];
  return x < 0 || x >= W || y < 0 || y >= H ? null : { floor, x, y, at: y * W + x };
}

/** A part of a floor he can walk about in, as near a place as there is one. */
interface Spot { floor: Floor; region: number; at: number }
function spotNear(floor: Floor, x: number, y: number, only?: number): Spot | null {
  for (let r = 0; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    const px = x + dx, py = y + dy;
    if (px < 0 || px >= W || py < 0 || py >= H) continue;
    const region = floor.region[py * W + px];
    if (region >= 0 && (only === undefined || region === only)) return { floor, region, at: py * W + px };
  }
  return null;
}

interface Walk {
  how: 'arrived' | 'changed' | 'failed';
  /** Times he was thrown back down the screen (a jump of more than 15 rows in a frame). */
  thrown: number;
  /** Steps the game's own blocked flag said he could not make where the plan said he could (of `checked`). */
  disagreed: number;
  checked: number;
}

/** Walk to the nearest of `targets` in the floor by the plan; `changed`: the game took him elsewhere on the way (the walk passed a stair). */
function walkTo(run: Run, floor: Floor, targets: readonly number[], limit: number): Walk {
  const dist = distances(floor, targets);
  const mode = run.ram[0x3219], level = run.ram[0xb3e1];
  const walk: Walk = { how: 'failed', thrown: 0, disagreed: 0, checked: 0 };
  let stuck = 0, last = -1, lastY = -1, shakes = 0, seed = 12345;
  const rand = () => (seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let f = 0; f < limit; f++) {
    if (run.ram[0x3219] !== mode || run.ram[0xb3e1] !== level) { walk.how = 'changed'; return walk; }
    const p = whereIs(run.ram, run.vic);
    if (!p || p.floor !== floor) return walk;
    if (lastY >= 0 && Math.abs(p.y - lastY) > 15) walk.thrown++;
    lastY = p.y;
    const here = dist[p.at];
    if (here < 0) return walk;
    if (here === 0) { walk.how = 'arrived'; return walk; }
    let best = -1;
    for (let step = 0; step < 4 && best < 0; step++) {
      if (!floor.free(step, p.x, p.y)) continue;
      const nx = p.x + DX[step], ny = p.y + DY[step];
      if (nx >= 0 && nx < W && ny >= 0 && ny < H && dist[ny * W + nx] === here - 1) best = step;
    }
    if (best < 0) return walk;
    run.step(JOY[best]);
    if (run.ram[0x25c1] === FACING[best]) { walk.checked++; if (run.ram[BLOCKED[best]] === 1) walk.disagreed++; }
    if (p.at === last) stuck++; else { stuck = 0; last = p.at; }
    if (stuck > 40) {
      // (where the plan and the game disagree, a doorway the game has half drawn: shaken loose with a few steps at random, a few times)
      if (++shakes > 6) return walk;
      for (let k = 0; k < 30; k++) run.step(JOY[Math.floor(rand() * 4)]);
      stuck = 0; last = -1;
    }
  }
  return walk;
}

// ---- the search: nodes are a part of a floor and the room count there ----
const nameOf = (n: number) => { let t = ''; for (let i = 0; i < 17; i++) t += String.fromCharCode(title.ram[0x0e2e + 0x11 * (n - 1) + i] & 0x7f); return t.trim().replace(/\s+/g, ' '); };
const label = (c: Cluster) => `${c.kind}@${c.from}-${c.to},${c.row}`;
/** A node's key is the floor, the part of it and the room count: "L1#8584@3". */
const split = (key: string) => { const [at, count] = key.split('@'); const [floor, region] = at.split('#'); return { floor: floorLabelled(floor), region: Number(region), count: Number(count) }; };

const start = routeWalker({ port: game.port, title: titleBytes, routes: 'games/karnath/re/routes.json', route: 0, cheat: alive }).at(60);
const seen = new Map<string, MachineState>();
const queue: string[] = [];
const edges: string[] = [];
const counts = new Set<number>();
let cryptFrames = 0, disagreed = 0, checked = 0, dungeons = false;
const guard = { tried: 0, thrown: 0, arrived: false };

/** The node a state is (null: not on a floor of the castle), noted for the search the first time. */
function addNode(snap: MachineState): string | null {
  const run = new Run(snap);
  run.step(NONE);
  const w = whereIs(run.ram, run.vic);
  const spot = w && spotNear(w.floor, w.x, w.y);
  if (!spot) return null;
  const key = `${spot.floor.strip.label}#${spot.region}@${run.ram[0x3235]}`;
  counts.add(run.ram[0x3235]);
  if (!seen.has(key)) { seen.set(key, snap); queue.push(key); }
  return key;
}
addNode(start);

const t0 = performance.now();
for (let key = queue.shift(); key !== undefined && seen.size < 900; key = queue.shift()) {
  const snap = must(seen.get(key), 'a saved node');
  const { floor, region } = split(key);
  for (const way of floor.regions[region].clusters) {
    const run = new Run(snap);
    const step = TAKEN[way.kind];
    const walk = walkTo(run, floor, way.states, 6000);
    disagreed += walk.disagreed; checked += walk.checked; cryptFrames += run.crypt;
    const name = `${key} -> ${label(way)}`;
    if (floor.strip.label === 'L1' && way.kind === 'T' && way.from > 100) { guard.tried++; guard.thrown += walk.thrown; guard.arrived ||= walk.how !== 'failed'; }
    if (walk.how === 'failed') { edges.push(`${name}: could not walk there (${run.frames} frames, thrown back ${walk.thrown} times)`); continue; }
    const before = whereIs(run.ram, run.vic);
    const mode = run.ram[0x3219], level = run.ram[0xb3e1], room = run.ram[0x3235];
    const door = way.kind === 'R' || way.kind === 'L';
    let changed = walk.how === 'changed';
    for (let f = 0; f < (door ? 200 : 240) && !(changed && !door); f++) {
      run.step(JOY[step]);
      if (door) continue;
      const w = whereIs(run.ram, run.vic);
      if (run.ram[0x3219] !== mode || run.ram[0xb3e1] !== level) changed = true;
      else if (w && before && (Math.abs(w.x - before.x) > 40 || Math.abs(w.y - before.y) > 40)) changed = true;
    }
    cryptFrames += run.crypt;
    if (!changed && !door) { edges.push(`${name}: nothing happened (room ${room})`); continue; }
    const after = run.settle();
    if (!after) { edges.push(`${name}: no clean state after`); continue; }
    const node = addNode(after);
    const there = new Run(after);
    if (there.ram[0x3219] === 0xff) dungeons = true;
    edges.push(`${name}: ${node ?? `mode ${there.ram[0x3219].toString(16)}`} (room ${room} -> ${there.ram[0x3235]} ${nameOf(there.ram[0x3235])})`);
  }
}
if (process.env.EDGES) console.log(edges.join('\n'));

if (process.env.WANDER) {
  // random play from every place, to see whether the room count ever takes a value the walk does not find
  let seed = 99;
  const rand = () => (seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff;
  const extra = new Map<number, string>();
  for (const [key, snap] of seen) {
    for (let e = 0; e < Number(process.env.WANDER); e++) {
      const run = new Run(snap);
      let joy = NONE, hold = 0;
      for (let f = 0; f < 2000; f++) {
        if (hold-- <= 0) { joy = rand() < 0.15 ? NONE : JOY[Math.floor(rand() * 4)]; hold = 10 + Math.floor(rand() * 60); }
        run.step(joy);
        const n = run.ram[0x3235];
        if (!counts.has(n) && !extra.has(n)) extra.set(n, `${key} episode ${e} frame ${f}`);
      }
    }
  }
  console.log('random play found counts beyond the walk:', [...extra.entries()].map(([n, w]) => `${n} (${w})`).join('; ') || 'none');
}

// ---- what it found ----
const rooms = [...counts].sort((a, b) => a - b);
const named = Array.from({ length: 25 }, (_, i) => i + 1).filter((n) => !NO_WAY.includes(n));
check(`from a new game the walk reaches ${seen.size} places (a part of a floor, at a room count) in ${((performance.now() - t0) / 1000).toFixed(0)} s, the dungeons (${dungeons}) and the abode`, seen.size > 20 && dungeons && counts.has(25));
check(`the room count at those places is ${rooms.join(' ')}: every room the game names but ${NO_WAY.map((n) => `${nameOf(n)} (${n})`).join(' and ')}`, rooms.join(' ') === named.join(' '));
check(`THE CRYPT (count ${CRYPT}) is not shown in any frame of the whole walk (${cryptFrames} frames)`, cryptFrames === 0);
check(`the plan against the game: its blocked flag disagreed on ${disagreed} of ${checked} steps (${((100 * disagreed) / checked).toFixed(1)} per cent)`, checked > 20000 && disagreed * 50 < checked);

// the cells no place of the walk is in, strip by strip, are `closed` in src/strips.ts
const reached = new Map<string, Set<number>>();
for (const key of seen.keys()) {
  const { floor, region } = split(key);
  const set = reached.get(floor.strip.label) ?? new Set<number>();
  for (const c of floor.regions[region].cells) set.add(c);
  reached.set(floor.strip.label, set);
}
for (const strip of STRIPS) {
  if (strip.mode > 1) continue;
  const got = reached.get(strip.label) ?? new Set<number>();
  const never = Array.from({ length: 15 }, (_, c) => c).filter((c) => !got.has(c));
  check(`${strip.label}: the cells the walk never stands in (${never.join(' ') || 'none'}) are the ones the map shows as no way in (${strip.closed.join(' ') || 'none'})`, never.join(' ') === strip.closed.join(' '));
}

// the guard at the first level's right tower door: the walk is thrown back each time, and no spell moves it
check(`the second level's right chamber is behind the first level's right tower door, where the guard throws him back (tried ${guard.tried} times, thrown back ${guard.thrown}, got there: ${guard.arrived})`, guard.tried >= 1 && guard.thrown >= 3 && !guard.arrived);
{
  const l1 = floorLabelled('L1');
  const node = must([...seen.keys()].find((k) => split(k).floor === l1 && split(k).count === 4), 'a node at the first level\'s right end');
  const from = must(seen.get(node), 'its save');
  const safe = must(spotNear(l1, 845, 114, split(node).region), 'a place near the guard');
  const run = new Run(from);
  const walk = walkTo(run, l1, [safe.at], 6000);
  const there = must(run.settle(), 'a save by the guard');
  const guarded = (r: Run) => (r.vic[0x15] & 2) !== 0 && r.ram[0x7f9] === 0x21;
  let survived = 0, shown = 0, touched = 0;
  for (let spell = 1; spell <= 10; spell++) {
    const r = new Run(there);
    r.ram[0x322c] = spell;
    if (guarded(r)) shown++;
    r.step(JOY[1]);
    let hit = false;
    for (let f = 0; f < 3; f++) r.step(FIRE);
    for (let f = 0; f < 120; f++) { r.step(NONE); hit ||= (r.ram[0x321a] & 0x0a) === 0x0a; }
    if (hit) touched++;
    if (guarded(r)) survived++;
  }
  check(`each of the ten spells cast at the guard from beside it (${walk.how}): the game saw the spell touch it ($321A) ${touched} times and it is still there on the screen afterwards (${survived} of 10; there to begin with ${shown} of 10)`, walk.how === 'arrived' && shown === 10 && touched === 10 && survived === 10);
}

// the count is not a place: the recorded route gets room 7 (THE LAUNDRY ROOM) in the second level, which no place of the walk has
{
  const m = routeWalker({ port: game.port, title: titleBytes, routes: 'games/karnath/re/routes.json', route: 0, cheat: alive }).at(2600);
  check(`the recorded route 0 has the room count at ${m.ram[0x3235]} (${nameOf(7)} is 7) in level ${m.ram[0xb3e1]} of the lower floor at frame 2600, where the walk finds counts 5 and 6`, m.ram[0x3235] === 7 && m.ram[0xb3e1] === 2 && m.ram[KEPT.mode] === 0);
}

finish();
