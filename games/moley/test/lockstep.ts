/**
 * Monty's logic, rebuilt (src/monty.ts, src/player.ts), against the original running on the headless Spectrum, pass by pass.
 *
 * The original runs the game; at the start of each logic pass (`$822F`) the harness reads Monty's state from the original,
 * runs the rebuilt pass with the keys the original is being given, and at the end of the original's player part (`$925B`,
 * after Monty's update, the scripts' animation step and the time-out check) compares: x, y, frame, flags, state, phase, the
 * jump's keys, the rope flags, the walking cycle, room, lives, gauge, the pass counter, the scripts' animation and where he was
 * at the start of the pass. The keys the original reads (`E` at `$8CEB`) are compared with the rebuilt `readKeys`.
 *
 * What the room scripts do to Monty after `$925B` (forced moves, the exits, a hit, the gauge drained by a hazard) is outside
 * "Monty alone": at the next pass the rebuilt state is compared with the original's before anything is copied over, and each
 * difference is counted as an intervention by name; then the original's values are taken. So every pass compares the logic, and the
 * interventions say how much the scripts did between passes.
 *
 * Players: random ones (keys held for a few frames: the keyboard, a Kempston joystick, Sinclair Interface 2, mixed, and
 * contradictory presses) in every room; and, for each kind of tile in each room, Monty placed round cells of that kind in
 * walking, jumping and falling states, then played at random. The game's random numbers (the R register) are not used by
 * Monty's logic, so none is fed in; stage 3 needs them.
 *
 *   nice -n 15 node tools/test.mjs games/moley/test/lockstep.ts [random-passes-per-room] [placements-per-tile-kind] [pass-limit-per-placement]
 */
import fs from 'node:fs';
import { check, finish } from '../../../games/shared/test/check';
import { readRom } from '../../../tools/zx/boot';
import { unpackState } from '../../../tools/zx/snapshot';
import { keyPosition, press, Spectrum } from '../../../tools/zx/spectrum';
import { ROOM_SIZE } from '../src/data';
import { bitsOf, KEYBOARD_KEYS, readKeys, SINCLAIR_KEYS } from '../src/input';
import { Player } from '../src/player';

const [randomArg = '3000', placementsArg = '4', limitArg = '80'] = process.argv.slice(2);
const RANDOM_PASSES = Number(randomArg), PLACEMENTS = Number(placementsArg), PLACEMENT_PASSES = Number(limitArg);
const rom = readRom();
const STATES = 'games/moley/build';

// where the original keeps what Monty's logic reads and writes (re/README.md)
const A = {
  x: 0x8121, y: 0x8122, frame: 0x8123, flags: 0x8124, room: 0x8107, lives: 0x810c, gauge: 0x810d, state: 0x811c, phase: 0x811d,
  jumpKeys: 0x811e, ropeUp: 0x810b, ropeDown: 0x811f, prevX: 0x8109, prevY: 0x810a, walkCounter: 0x9124, walkFrame: 0x9125,
  walkToggle: 0x9126, counter: 0xa2a0, scriptToggle: 0x9eca, scriptCounter: 0x9ecb, scriptFrame: 0x9ecc, hold: 0x9904,
  partnerX: 0x8129, kempstonFound: 0x8105,
} as const;
const PASS_START = 0x822f, KEYS_READ = 0x8ceb, PLAYER_PART_DONE = 0x925b;
const MAP_START = 0x6000, MAP_END = 0x8100;

/** Everything compared. */
interface Snap {
  x: number; y: number; frame: number; flags: number; state: number; phase: number; jumpKeys: number;
  ropeUp: number; ropeDown: number; prevX: number; prevY: number;
  walkCounter: number; walkFrame: number; walkToggle: boolean;
  room: number; lives: number; gauge: number; counter: number;
  scriptToggle: boolean; scriptCounter: number; scriptFrame: number;
}
type Field = keyof Snap;
const FIELDS = [
  'x', 'y', 'frame', 'flags', 'state', 'phase', 'jumpKeys', 'ropeUp', 'ropeDown', 'prevX', 'prevY', 'walkCounter', 'walkFrame', 'walkToggle',
  'room', 'lives', 'gauge', 'counter', 'scriptToggle', 'scriptCounter', 'scriptFrame',
] as const satisfies readonly Field[];

function original(mem: Uint8Array): Snap {
  const b = (a: number) => mem[a];
  return {
    x: b(A.x), y: b(A.y), frame: b(A.frame), flags: b(A.flags), state: b(A.state), phase: b(A.phase), jumpKeys: b(A.jumpKeys),
    ropeUp: b(A.ropeUp), ropeDown: b(A.ropeDown), prevX: b(A.prevX), prevY: b(A.prevY),
    walkCounter: b(A.walkCounter), walkFrame: b(A.walkFrame), walkToggle: b(A.walkToggle) !== 0,
    room: b(A.room), lives: (b(A.lives) << 24) >> 24, gauge: b(A.gauge), counter: b(A.counter),
    scriptToggle: b(A.scriptToggle) !== 0, scriptCounter: b(A.scriptCounter), scriptFrame: b(A.scriptFrame),
  };
}

function ours(p: Player): Snap {
  const m = p.monty;
  return {
    x: m.x, y: m.y, frame: m.frame, flags: m.flags, state: m.state, phase: m.phase, jumpKeys: m.jumpKeys,
    ropeUp: m.ropeUp, ropeDown: m.ropeDown, prevX: m.prevX, prevY: m.prevY,
    walkCounter: m.walk.counter, walkFrame: m.walk.frame, walkToggle: m.walk.toggle,
    room: p.room, lives: p.lives, gauge: p.gauge.value, counter: p.counter,
    scriptToggle: p.scriptCycle.toggle, scriptCounter: p.scriptCycle.counter, scriptFrame: p.scriptCycle.frame,
  };
}

/** Put the original's values into the rebuilt player (and its map, which room 2 rewrites). */
function take(p: Player, s: Snap, mem: Uint8Array): void {
  const m = p.monty;
  p.enterRoom(s.room);
  p.gauge.value = s.gauge;
  p.lives = s.lives;
  p.counter = s.counter;
  p.room2Hold = mem[A.hold] !== 0;
  p.world.partnerX = mem[A.partnerX];
  m.x = s.x; m.y = s.y; m.frame = s.frame; m.flags = s.flags; m.state = s.state; m.phase = s.phase; m.jumpKeys = s.jumpKeys;
  m.ropeUp = s.ropeUp; m.ropeDown = s.ropeDown; m.prevX = s.prevX; m.prevY = s.prevY;
  m.walk.counter = s.walkCounter; m.walk.frame = s.walkFrame; m.walk.toggle = s.walkToggle;
  p.scriptCycle.toggle = s.scriptToggle; p.scriptCycle.counter = s.scriptCounter; p.scriptCycle.frame = s.scriptFrame;
  p.tiles.memory.set(mem.subarray(MAP_START, MAP_END));
}

function differences(a: Snap, b: Snap): Field[] {
  const out: Field[] = [];
  for (const f of FIELDS) if (a[f] !== b[f]) out.push(f);
  return out;
}

// ---- the random player ------------------------------------------------------------------------------

function mulberry(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MOVES: readonly (readonly string[])[] = [
  [], [], ['right'], ['right'], ['left'], ['left'], ['jump'], ['right', 'jump'], ['right', 'jump'], ['left', 'jump'], ['left', 'jump'],
  ['up'], ['up'], ['down'], ['down'], ['up', 'right'], ['up', 'left'], ['down', 'right'], ['down', 'left'], ['up', 'jump'],
  ['left', 'right'], ['up', 'down'], ['left', 'right', 'jump'],
];
const DEVICES = ['keyboard', 'keyboard', 'keyboard', 'keyboard', 'keyboard', 'kempston', 'sinclair', 'mixed'] as const;
const KEMPSTON_NAMES = { right: 'KEMPSTON:right', left: 'KEMPSTON:left', down: 'KEMPSTON:down', up: 'KEMPSTON:up', jump: 'KEMPSTON:fire' } as const;

type Direction = 'left' | 'right' | 'up' | 'down' | 'jump';
function isDirection(s: string): s is Direction { return s === 'left' || s === 'right' || s === 'up' || s === 'down' || s === 'jump'; }

class RandomPlayer {
  private left = 0;
  private held: string[] = [];
  constructor(private readonly m: Spectrum, private readonly rnd: () => number) {}

  private release(): void {
    for (const k of this.held) press(this.m, k, false);
    this.held = [];
  }

  tick(): void {
    if (this.left-- > 0) return;
    this.release();
    this.left = 1 + Math.floor(this.rnd() * (this.rnd() < 0.2 ? 60 : 14));
    const move = MOVES[Math.floor(this.rnd() * MOVES.length)];
    const device = DEVICES[Math.floor(this.rnd() * DEVICES.length)];
    for (const name of move) {
      if (!isDirection(name)) continue;
      const use = device === 'mixed' ? (this.rnd() < 0.5 ? 'keyboard' : 'sinclair') : device;
      const key = use === 'keyboard' ? KEYBOARD_KEYS[name] : use === 'sinclair' ? SINCLAIR_KEYS[name] : KEMPSTON_NAMES[name];
      press(this.m, key, true);
      this.held.push(key);
    }
  }
}

function keyDown(m: Spectrum, name: string): boolean {
  const pos = keyPosition(name);
  if (!pos) throw new Error(`no key ${name}`);
  return (m.keys[pos.row] & (1 << pos.bit)) === 0;
}

// ---- one run ----------------------------------------------------------------------------------------------

interface Tally {
  passes: number;
  keyMismatches: number;
  /** passes where the player part differed, by field, with the first few described */
  mismatches: Map<Field, number>;
  firstMismatches: string[];
  /** differences between the rebuilt state after a pass and the original's at the next (the scripts' doing) */
  interventions: Map<Field, number>;
  deaths: number;
  roomChanges: number;
  /** how often each situation was compared, so a pass of the test says what it covered */
  seen: Map<string, number>;
}
function newTally(): Tally {
  return { passes: 0, keyMismatches: 0, mismatches: new Map(), firstMismatches: [], interventions: new Map(), deaths: 0, roomChanges: 0, seen: new Map() };
}
const bump = (map: Map<Field, number>, f: Field) => map.set(f, (map.get(f) ?? 0) + 1);

interface Placement { x: number; y: number; state: number; phase: number; jumpKeys: number; gauge: number }

/** Run the original from a state with a random player, comparing every pass, until `limit` passes. */
function run(tally: Tally, stateFile: string, seed: number, limit: number, label: string, place?: Placement): void {
  const m = new Spectrum(rom);
  unpackState(m, new Uint8Array(fs.readFileSync(stateFile)));
  const rnd = mulberry(seed);
  const player = new RandomPlayer(m, rnd);
  const kempstonFound = rnd() < 0.5;
  m.mem[A.kempstonFound] = kempstonFound ? 1 : 0;
  m.kempstonPlugged = kempstonFound;
  const p = new Player();
  let placed = place === undefined;
  let pending: { keys: number; before: Snap } | null = null;
  let previous: Snap | null = null; // the rebuilt state after the last pass
  let passes = 0;

  const sources = () => ({
    keyboard: bitsOf(KEYBOARD_KEYS, (k) => keyDown(m, k)),
    kempston: m.mem[A.kempstonFound] !== 0 ? (m.kempston | (m.kempstonPlugged ? 0 : 0x1f)) & 0x1f : null,
    sinclair: bitsOf(SINCLAIR_KEYS, (k) => keyDown(m, k)),
  });
  let wantKeys = 0;

  m.onStep = (pc) => {
    if (pc === PASS_START) {
      if (place !== undefined && !placed) { // put him somewhere the tile kind is, in the state asked
        const mem = m.mem;
        mem[A.x] = place.x; mem[A.y] = place.y; mem[A.state] = place.state; mem[A.phase] = place.phase; mem[A.jumpKeys] = place.jumpKeys; mem[A.gauge] = place.gauge;
        placed = true;
      }
      const now = original(m.mem);
      if (previous !== null) {
        for (const f of differences(previous, now)) bump(tally.interventions, f);
        if (previous.lives !== now.lives) tally.deaths++;
        if (previous.room !== now.room) tally.roomChanges++;
      }
      take(p, now, m.mem);
      wantKeys = readKeys(sources());
      pending = { keys: wantKeys, before: now };
      p.pass(wantKeys);
      previous = null;
    } else if (pc === KEYS_READ && pending !== null) {
      if (m.cpu.regs[3] !== pending.keys) {
        tally.keyMismatches++;
        if (tally.firstMismatches.length < 8) tally.firstMismatches.push(`${label}: keys original ${m.cpu.regs[3].toString(2)} rebuilt ${pending.keys.toString(2)}`);
      }
    } else if (pc === PLAYER_PART_DONE && pending !== null) {
      const want = original(m.mem), got = ours(p);
      const bad = differences(want, got);
      tally.passes++;
      passes++;
      for (const f of bad) bump(tally.mismatches, f);
      if (bad.length > 0 && tally.firstMismatches.length < 8) {
        tally.firstMismatches.push(`${label} pass ${passes} room ${pending.before.room} keys ${pending.keys.toString(2).padStart(5, '0')} from x ${pending.before.x} y ${pending.before.y} state ${pending.before.state} phase ${pending.before.phase}: ${bad.map((f) => `${f} original ${String(want[f])} rebuilt ${String(got[f])}`).join(', ')}`);
      }
      const b = pending.before;
      const see = (what: string) => tally.seen.set(what, (tally.seen.get(what) ?? 0) + 1);
      see(['walking', 'falling', 'jumping', 'posed', 'hidden'][b.state] ?? `state ${b.state}`);
      if (b.room === 5) see('room 5 flying');
      if (got.ropeUp !== 0 && b.room !== 5) see('on a rope');
      if (b.state === 2 && got.state === 2 && got.phase === 23 - b.phase) see('ceiling hit');
      if (b.state === 2 && got.state === 0) see('landed from a jump');
      if (b.state === 1 && got.state === 0) see('landed from a fall');
      if (b.state === 0 && got.state === 1) see('walked off an edge');
      if (b.state === 2 && got.state === 1) see('jump ended in a fall');
      if ((pending.keys & 16) !== 0 && b.state === 0 && got.state === 2) see('jump started');
      if (b.lives !== got.lives) see('died (time ran out)');
      if (p.tiles.at(b.x + 4, b.y + 16) === 0x55 || p.tiles.at(b.x + 4, b.y + 16) === 0x7b) see('conveyor under his feet');
      if (b.x !== got.x && (pending.keys & 3) !== 0) see('moved sideways');
      if ((pending.keys & 3) !== 0 && b.x === got.x && b.state === 0) see('walk blocked');
      previous = got;
      pending = null;
    }
  };

  const frameLimit = limit * 6 + 600;
  for (let f = 0; f < frameLimit && passes < limit; f++) {
    player.tick();
    m.runFrame();
  }
}

// ---- the runs -----------------------------------------------------------------------------------------------

const rooms = [0, 1, 2, 3, 4, 5];
const tally = newTally();
const t0 = Date.now();
let segment = 0;

// random players, in every room
for (const room of rooms) {
  const file = `${STATES}/room${room}.state`;
  const share = Math.ceil(RANDOM_PASSES / 4);
  for (let part = 0; part < 4; part++) run(tally, file, 1000 * room + part + 1, share, `random room ${room}.${part}`);
}
const randomPasses = tally.passes;

// each kind of tile in each room
let tileKinds = 0;
for (const room of rooms) {
  const file = `${STATES}/room${room}.state`;
  const mem = new Spectrum(rom);
  unpackState(mem, new Uint8Array(fs.readFileSync(file)));
  const map = mem.mem.subarray(MAP_START + room * ROOM_SIZE, MAP_START + room * ROOM_SIZE + ROOM_SIZE);
  const cells = new Map<number, number[]>();
  map.forEach((t, i) => { const list = cells.get(t) ?? []; list.push(i); cells.set(t, list); });
  const rnd = mulberry(7000 + room);
  for (const [tile, list] of [...cells].sort((a, b) => a[0] - b[0])) {
    tileKinds++;
    for (let k = 0; k < PLACEMENTS; k++) {
      const cell = list[Math.floor(rnd() * list.length)];
      const col = cell & 31, row = cell >> 5;
      const kind = rnd();
      const place: Placement = {
        x: Math.max(2, Math.min(0xee, col * 8 + Math.floor(rnd() * 24) - 16)),
        y: Math.max(0, Math.min(0x78, row * 8 + Math.floor(rnd() * 32) - 24)),
        state: kind < 0.6 ? 0 : kind < 0.82 ? 2 : kind < 0.94 ? 1 : kind < 0.98 ? 3 : 4,
        phase: Math.floor(rnd() * 24),
        jumpKeys: [0, 1, 2, 16, 17, 18][Math.floor(rnd() * 6)],
        gauge: rnd() < 0.2 ? Math.floor(rnd() * 3) : 0x7f, // (a gauge about to run out: the time-out death)
      };
      run(tally, file, 100000 + room * 1000 + tile * 7 + k, PLACEMENT_PASSES, `room ${room} tile $${tile.toString(16)} #${k}`, place);
      segment++;
    }
  }
}
const tilePasses = tally.passes - randomPasses;

const seconds = ((Date.now() - t0) / 1000).toFixed(0);
console.log(`   ${tally.passes} passes compared (${randomPasses} random players in rooms 0-5, ${tilePasses} in ${segment} placements round ${tileKinds} kinds of tile) in ${seconds} s`);
console.log(`   the original's script phase changed Monty between passes ${[...tally.interventions].map(([f, n]) => `${f} ${n}`).join(', ') || 'never'}; ${tally.deaths} deaths, ${tally.roomChanges} room changes`);
console.log(`   covered: ${[...tally.seen].map(([k, n]) => `${k} ${n}`).join(', ')}`);
for (const line of tally.firstMismatches) console.log(`   ${line}`);
check(`keys: the rebuilt readKeys equals the original's E on every pass (${tally.keyMismatches} differ)`, tally.keyMismatches === 0);
for (const f of ['x', 'y', 'frame', 'flags', 'state', 'phase', 'room', 'lives', 'gauge'] as const) {
  check(`${f}: the rebuilt pass equals the original's on every pass (${tally.mismatches.get(f) ?? 0} of ${tally.passes} differ)`, (tally.mismatches.get(f) ?? 0) === 0);
}
const others = [...tally.mismatches].filter(([f]) => !['x', 'y', 'frame', 'flags', 'state', 'phase', 'room', 'lives', 'gauge'].includes(f));
check(`the rest of the state (jump keys, ropes, walking cycle, counter, scripts' animation, start of pass) equals too (${others.map(([f, n]) => `${f} ${n}`).join(', ') || '0'} differ)`, others.length === 0);
finish();
