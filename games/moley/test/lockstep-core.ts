/**
 * The rebuilt game (src/game.ts) against the original running on the headless Spectrum, pass by pass.
 *
 * The original runs; at the start of each logic pass (`$822F`) the harness reads the keys the original will see, and the next
 * time the original gets to `$822F` (or to the ending, `$82DA`, or game over, `$8292`) the pass is over: the harness runs the rebuilt
 * pass with the same keys and compares everything the game keeps: Monty, the whole entity table, the score and high score, lives,
 * gauge, pass counter, the scripts' animation, the items (and the count), the room's map (room 2 rewrites it) and attributes (the
 * items' ink, room 1's lights), every variable the six scripts keep between passes, the picture in the HUD's pocket box, and the
 * beeper effects asked for. The rebuilt game is not touched between passes: it keeps its own state, so one difference that matters
 * shows up as a difference at once and every one after it is a consequence. (After a difference the original's state is put into
 * the rebuilt game so the count of differences is of causes, not of consequences.)
 *
 * The game's random numbers are the Z80's R register: the harness records each byte the original reads (`LD A,R` at `$9ECE` and `$861A`)
 * during a pass and feeds exactly those, in order, to the rebuilt pass; a pass that asks for more or fewer is a difference.
 *
 * `Driver`s press the keys on the original: a random player, or a scripted one that plays a room to its end.
 */
import fs from 'node:fs';
import { readRom } from '../../../tools/zx/boot';
import { rowAddress } from '../../../tools/zx/screen';
import { unpackState } from '../../../tools/zx/snapshot';
import { keyPosition, Spectrum } from '../../../tools/zx/spectrum';
import { BLANK_FRAME, SPRITE_FRAMES } from '../src/data';
import { Game, type Outcome } from '../src/game';
import { bitsOf, KEYBOARD_KEYS, readKeys, SINCLAIR_KEYS } from '../src/input';
import type { Random } from '../src/random';

/** Where the original keeps what the game logic reads and writes (re/README.md). */
export const A = {
  x: 0x8121, y: 0x8122, frame: 0x8123, flags: 0x8124, room: 0x8107, first: 0x8108, lives: 0x810c, gauge: 0x810d, state: 0x811c, phase: 0x811d,
  jumpKeys: 0x811e, ropeUp: 0x810b, ropeDown: 0x811f, prevX: 0x8109, prevY: 0x810a, walkCounter: 0x9124, walkFrame: 0x9125,
  walkToggle: 0x9126, counter: 0xa2a0, scriptToggle: 0x9eca, scriptCounter: 0x9ecb, scriptFrame: 0x9ecc, scriptQuad: 0x9ecd,
  score: 0x8113, highScore: 0x810e, entities: 0x8125, items: 0x86d5, itemsLeft: 0x86f5, kempstonFound: 0x8105, ended: 0xa2a1,
} as const;
export const PASS_START = 0x822f, KEYS_READ = 0x8ceb, ENDING = 0x82da, GAME_OVER = 0x8292, SOUND = 0xa017;
const R_READS: readonly number[] = [0x9ece, 0x861a];
/** The death routines (`$9592`, `$95C8`) jump to the address in HL, which should be one of the six restart routines (`$926E`). */
const DEATHS: readonly number[] = [0x9592, 0x95c8];
const RESTARTS: readonly number[] = [0x936a, 0x935c, 0x9556, 0x96eb, 0x9c1c, 0x9c37];
export const MAP_START = 0x6000, MAP_END = 0x8100, ATTR_START = 0x5800;
const MAP_ROOMS_END = 0x6000 + 6 * 576;
const ROOM_CELLS = 576;
const POCKET_BYTES = [0x13, 0x14] as const;

// ---- the state compared -------------------------------------------------------------------------------

/** A number the game keeps, in the original (`addr`, `size` bytes, little endian) and in the rebuilt game. */
interface Scalar {
  readonly name: string;
  readonly addr: number;
  readonly size: 1 | 2 | 4;
  get(g: Game): number;
  set(g: Game, v: number): void;
}

const byteOf = (v: boolean): number => (v ? 0xff : 0);
const SCALARS: Scalar[] = [];
function scalar(name: string, addr: number, size: 1 | 2 | 4, get: (g: Game) => number, set: (g: Game, v: number) => void): void {
  SCALARS.push({ name, addr, size, get, set });
}
const b1 = (name: string, addr: number, get: (g: Game) => number, set: (g: Game, v: number) => void): void => scalar(name, addr, 1, get, set);

b1('x', A.x, (g) => g.monty.x, (g, v) => { g.monty.x = v; });
b1('y', A.y, (g) => g.monty.y, (g, v) => { g.monty.y = v; });
b1('frame', A.frame, (g) => g.monty.frame, (g, v) => { g.monty.frame = v; });
b1('flags', A.flags, (g) => g.monty.flags, (g, v) => { g.monty.flags = v; });
b1('state', A.state, (g) => g.monty.state, (g, v) => { g.monty.state = v; });
b1('phase', A.phase, (g) => g.monty.phase, (g, v) => { g.monty.phase = v; });
b1('jumpKeys', A.jumpKeys, (g) => g.monty.jumpKeys, (g, v) => { g.monty.jumpKeys = v; });
b1('ropeUp', A.ropeUp, (g) => g.monty.ropeUp, (g, v) => { g.monty.ropeUp = v; });
b1('ropeDown', A.ropeDown, (g) => g.monty.ropeDown, (g, v) => { g.monty.ropeDown = v; });
b1('prevX', A.prevX, (g) => g.monty.prevX, (g, v) => { g.monty.prevX = v; });
b1('prevY', A.prevY, (g) => g.monty.prevY, (g, v) => { g.monty.prevY = v; });
b1('walkCounter', A.walkCounter, (g) => g.monty.walk.counter, (g, v) => { g.monty.walk.counter = v; });
b1('walkFrame', A.walkFrame, (g) => g.monty.walk.frame, (g, v) => { g.monty.walk.frame = v; });
b1('walkToggle', A.walkToggle, (g) => byteOf(g.monty.walk.toggle), (g, v) => { g.monty.walk.toggle = v !== 0; });
b1('room', A.room, (g) => g.room, (g, v) => { g.setRoom(v); });
b1('first', A.first, (g) => byteOf(g.first), (g, v) => { g.first = v !== 0; });
b1('lives', A.lives, (g) => g.lives & 0xff, (g, v) => { g.lives = (v << 24) >> 24; });
b1('gauge', A.gauge, (g) => g.gauge.value, (g, v) => { g.gauge.value = v; });
b1('counter', A.counter, (g) => g.counter, (g, v) => { g.counter = v; });
b1('scriptToggle', A.scriptToggle, (g) => byteOf(g.clock.cycle.toggle), (g, v) => { g.clock.cycle.toggle = v !== 0; });
b1('scriptCounter', A.scriptCounter, (g) => g.clock.cycle.counter, (g, v) => { g.clock.cycle.counter = v; });
b1('scriptFrame', A.scriptFrame, (g) => g.clock.cycle.frame, (g, v) => { g.clock.cycle.frame = v; });
b1('scriptQuad', A.scriptQuad, (g) => g.clock.quad, (g, v) => { g.clock.quad = v; });
scalar('score', A.score, 4, (g) => g.score, (g, v) => { g.score = v; });
scalar('highScore', A.highScore, 4, (g) => g.highScore, (g, v) => { g.highScore = v; });
b1('itemsLeft', A.itemsLeft, (g) => g.items.left, (g, v) => { g.items.left = v; });
b1('won', A.ended, (g) => byteOf(g.ended), (g, v) => { g.ended = v !== 0; });
// room 0
b1('room0.drift', 0x9377, (g) => g.rooms.r0.drift, (g, v) => { g.rooms.r0.drift = v; });
b1('room0.bobber', 0x9e19, (g) => g.rooms.r0.bobber.state, (g, v) => { g.rooms.r0.bobber.state = v; });
// room 1
b1('room1.stage', 0x94de, (g) => g.rooms.r1.stage, (g, v) => { g.rooms.r1.stage = v; });
b1('room1.a', 0x94df, (g) => g.rooms.r1.a, (g, v) => { g.rooms.r1.a = v; });
b1('room1.b', 0x94e0, (g) => g.rooms.r1.b, (g, v) => { g.rooms.r1.b = v; });
b1('room1.c', 0x94e1, (g) => g.rooms.r1.c, (g, v) => { g.rooms.r1.c = v; });
b1('room1.d', 0x94e2, (g) => g.rooms.r1.d, (g, v) => { g.rooms.r1.d = v; });
b1('room1.e', 0x94e3, (g) => g.rooms.r1.e, (g, v) => { g.rooms.r1.e = v; });
b1('room1.f', 0x94e4, (g) => g.rooms.r1.f, (g, v) => { g.rooms.r1.f = v; });
// room 2 (the pointers are addresses in the original: the map starts at $6000)
b1('room2.direction', 0x98fe, (g) => g.rooms.r2.direction, (g, v) => { g.rooms.r2.direction = v; });
b1('room2.wait', 0x98ff, (g) => g.rooms.r2.wait, (g, v) => { g.rooms.r2.wait = v; });
scalar('room2.head1', 0x9900, 2, (g) => g.rooms.r2.head1 + MAP_START, (g, v) => { g.rooms.r2.head1 = v - MAP_START; });
scalar('room2.head2', 0x9902, 2, (g) => g.rooms.r2.head2 + MAP_START, (g, v) => { g.rooms.r2.head2 = v - MAP_START; });
b1('room2.puzzle', 0x9904, (g) => g.rooms.r2.puzzle, (g, v) => { g.rooms.r2.puzzle = v; });
b1('room2.cassette', 0x9905, (g) => g.rooms.r2.cassette, (g, v) => { g.rooms.r2.cassette = v; });
b1('room2.growing', 0x97b4, (g) => g.rooms.r2.growing, (g, v) => { g.rooms.r2.growing = v; });
// room 3
b1('room3.lorry', 0x9b1c, (g) => g.rooms.r3.lorry, (g, v) => { g.rooms.r3.lorry = v; });
b1('room3.car1', 0x9b1d, (g) => g.rooms.r3.car1, (g, v) => { g.rooms.r3.car1 = v; });
b1('room3.car2', 0x9b1e, (g) => g.rooms.r3.car2, (g, v) => { g.rooms.r3.car2 = v; });
b1('room3.lampWait', 0x9b1f, (g) => g.rooms.r3.lampWait, (g, v) => { g.rooms.r3.lampWait = v; });
b1('room3.lamp', 0x9b20, (g) => g.rooms.r3.lamp, (g, v) => { g.rooms.r3.lamp = v; });
b1('room3.trapped', 0x9b21, (g) => g.rooms.r3.trapped, (g, v) => { g.rooms.r3.trapped = v; });
// room 4
b1('room4.open', 0x9c1a, (g) => g.rooms.r4.open, (g, v) => { g.rooms.r4.open = v; });
b1('room4.pause', 0x9c1b, (g) => g.rooms.r4.pause, (g, v) => { g.rooms.r4.pause = v; });
// room 5
b1('room5.carrying', 0x9df2, (g) => g.rooms.r5.carrying, (g, v) => { g.rooms.r5.carrying = v; });
g5Slots();
function g5Slots(): void {
  for (let i = 0; i < 5; i++) {
    const at = 0x9ddc + i * 4;
    b1(`room5.slot${i}.lane`, at + 1, (g) => g.rooms.r5.slots[i].lane, (g, v) => { g.rooms.r5.slots[i].lane = v; });
    b1(`room5.slot${i}.base`, at + 2, (g) => g.rooms.r5.slots[i].base, (g, v) => { g.rooms.r5.slots[i].base = v; });
    b1(`room5.slot${i}.wait`, at + 3, (g) => g.rooms.r5.slots[i].wait, (g, v) => { g.rooms.r5.slots[i].wait = v; });
  }
}

function readScalar(mem: Uint8Array, addr: number, size: number): number {
  let v = 0;
  for (let i = size - 1; i >= 0; i--) v = v * 256 + mem[addr + i];
  return v;
}

/** The entity table (entities 1-7) as the original's bytes. */
function entityBytes(g: Game, out: Uint8Array): void {
  for (let i = 1; i < 8; i++) {
    const e = g.entities[i];
    const at = (i - 1) * 4;
    out[at] = e.x; out[at + 1] = e.y; out[at + 2] = e.frame; out[at + 3] = e.flags;
  }
}

/** The item records as the original's bytes: x, y, and the attribute address (0 once taken). */
function itemBytes(g: Game, out: Uint8Array): void {
  g.items.records.forEach((r, i) => {
    const address = r.cell < 0 ? 0 : ATTR_START + r.cell;
    out[i * 4] = r.x; out[i * 4 + 1] = r.y; out[i * 4 + 2] = address & 0xff; out[i * 4 + 3] = address >> 8;
  });
}

/** Whether the pocket box on the screen shows the sprite frame `frame` (it is drawn by `$878A` from the frame's 32 bytes). */
function pocketShows(mem: Uint8Array, frame: number): boolean {
  for (let r = 0; r < 16; r++) {
    const row = rowAddress(168 + r);
    for (let c = 0; c < 2; c++) {
      if (mem[row + POCKET_BYTES[c]] !== SPRITE_FRAMES[frame * 32 + c * 16 + r]) return false;
    }
  }
  return true;
}

/** Which frame the pocket box shows, if it shows one. */
function pocketFrame(mem: Uint8Array): number {
  for (const f of [BLANK_FRAME, 0x6f, 0x24, 0x25]) if (pocketShows(mem, f)) return f;
  return BLANK_FRAME;
}

/** Put the original's state into the rebuilt game (the start of a run, and after a difference). */
export function take(g: Game, mem: Uint8Array): void {
  for (const s of SCALARS) s.set(g, readScalar(mem, s.addr, s.size));
  for (let i = 1; i < 8; i++) {
    const e = g.entities[i], at = A.entities + (i - 1) * 4;
    e.x = mem[at]; e.y = mem[at + 1]; e.frame = mem[at + 2]; e.flags = mem[at + 3];
  }
  g.items.records.forEach((r, i) => {
    const at = A.items + i * 4;
    const address = mem[at + 2] | (mem[at + 3] << 8);
    r.x = mem[at]; r.y = mem[at + 1]; r.cell = address === 0 ? -1 : address - ATTR_START;
  });
  g.attrs.set(mem.subarray(ATTR_START, ATTR_START + ROOM_CELLS));
  g.tiles.memory.set(mem.subarray(MAP_START, MAP_END));
  g.pocket = pocketFrame(mem);
}

/** What differs between the original's memory and the rebuilt game: the names of the things, and the first few cells of arrays. */
export function differences(g: Game, mem: Uint8Array): string[] {
  const out: string[] = [];
  for (const s of SCALARS) {
    const want = readScalar(mem, s.addr, s.size), got = s.get(g) >>> 0;
    if (want !== got) out.push(`${s.name} original ${want} rebuilt ${got}`);
  }
  const want = new Uint8Array(28), got = new Uint8Array(28);
  want.set(mem.subarray(A.entities, A.entities + 28));
  entityBytes(g, got);
  for (let i = 0; i < 28; i++) if (want[i] !== got[i]) out.push(`entity ${(i >> 2) + 1} ${['x', 'y', 'frame', 'flags'][i & 3]} original ${want[i]} rebuilt ${got[i]}`);
  const wantItems = mem.subarray(A.items, A.items + 32), gotItems = new Uint8Array(32);
  itemBytes(g, gotItems);
  for (let i = 0; i < 32; i++) if (wantItems[i] !== gotItems[i]) out.push(`item record ${i >> 2} byte ${i & 3} original ${wantItems[i]} rebuilt ${gotItems[i]}`);
  let attrs = 0;
  for (let i = 0; i < ROOM_CELLS; i++) if (mem[ATTR_START + i] !== g.attrs[i]) { if (attrs++ < 3) out.push(`attribute ${i} original ${mem[ATTR_START + i]} rebuilt ${g.attrs[i]}`); }
  if (attrs > 3) out.push(`... ${attrs} attributes differ`);
  let tiles = 0;
  for (let i = 0; i < MAP_ROOMS_END - MAP_START; i++) if (mem[MAP_START + i] !== g.tiles.memory[i]) { if (tiles++ < 3) out.push(`map cell ${i} original ${mem[MAP_START + i]} rebuilt ${g.tiles.memory[i]}`); }
  if (tiles > 3) out.push(`... ${tiles} map cells differ`);
  if (!pocketShows(mem, g.pocket)) out.push(`pocket: the original does not show frame ${g.pocket}`);
  return out;
}

/**
 * A scripted or random player for the original. It chooses at the start of every pass, when the rebuilt game has just caught up
 * with the original (so `g` is the game as the pass about to begin finds it), and presses or releases keys on the original `m`;
 * the keys stay as they are until the next pass, which is what the original reads.
 */
export interface Driver {
  choose(m: Spectrum, g: Game): void;
}

export function keyDown(m: Spectrum, name: string): boolean {
  const pos = keyPosition(name);
  if (!pos) throw new Error(`no key ${name}`);
  return (m.keys[pos.row] & (1 << pos.bit)) === 0;
}

/** The random numbers of one pass, as the original read them. */
class Fed implements Random {
  readonly queue: number[] = [];
  private next = 0;
  /** how many were asked for beyond what the original read */
  over = 0;

  start(): void { this.queue.length = 0; this.next = 0; this.over = 0; }
  byte(): number {
    const v = this.queue[this.next++];
    if (v === undefined) { this.over++; return 0; }
    return v;
  }
  get unused(): number { return this.queue.length - Math.min(this.next, this.queue.length); }
}

/** One thing seen going wrong, for the report. */
export interface Mismatch {
  readonly label: string;
  readonly pass: number;
  readonly room: number;
  readonly keys: number;
  readonly what: string[];
}

/** What a run saw. */
export class Tally {
  passes = 0;
  keyMismatches = 0;
  mismatches = 0;
  /** differences by the first word of their name, over all passes */
  byField = new Map<string, number>();
  readonly first: Mismatch[] = [];
  deaths = 0;
  roomChanges = 0;
  endings = 0;
  gameOvers = 0;
  /** how often each situation was compared */
  readonly seen = new Map<string, number>();
  /** random bytes read by the original, passes where the rebuilt game asked for a different number */
  randoms = 0;
  randomMismatches = 0;
  sounds = new Map<number, number>();
  maxFirst = 8;
  /** deaths whose restart address is not a restart routine (the original jumps somewhere else) */
  readonly strayRestarts: string[] = [];

  see(what: string): void { this.seen.set(what, (this.seen.get(what) ?? 0) + 1); }
  /** `what` names a field: the part of the name before the first space, array index or `original` counts */
  note(m: Mismatch): void {
    this.mismatches++;
    for (const w of m.what) {
      const key = w.split(' original')[0];
      this.byField.set(key, (this.byField.get(key) ?? 0) + 1);
    }
    if (this.first.length < this.maxFirst) this.first.push(m);
  }
}

export const mulberry = (seed: number): (() => number) => {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const rom = readRom();

/**
 * What a test can watch of a run without changing it: the first pass's start (after the rebuilt game took the original's state),
 * each frame's end, each pass's end (after the comparison; the pass before the next one starts), and chosen addresses reached.
 */
export interface Hooks {
  start?(mem: Uint8Array): void;
  frame?(mem: Uint8Array): void;
  passEnd?(outcome: Outcome, mem: Uint8Array): void;
  /** the addresses to report (a 64K table: non-zero = report) and the report */
  pcs?: Uint8Array;
  pc?(pc: number, mem: Uint8Array): void;
}

/** One run: the original from a state, the rebuilt game beside it. */
export class Run {
  readonly m = new Spectrum(rom);
  readonly fed = new Fed();
  readonly game = new Game(this.fed);
  private pending: { keys: number; room: number } | null = null;
  private soundsSeen: number[] = [];
  private awaitR = false;
  /** the run is over (the ending or game over came) */
  done = false;
  /** a death this pass jumped to an address that is no restart routine: the rebuilt game restarts the room (README: the stray restart), so the run stops here uncompared */
  private stray = false;
  private driver: Driver | null = null;
  readonly hooks: Hooks = {};
  /** passes compared in this run */
  passes = 0;
  /** the last pass's outcome as the rebuilt game gave it */
  last: Outcome = 'playing';

  constructor(readonly tally: Tally, stateFile: string, readonly label: string, kempston: boolean, private readonly prepare?: (mem: Uint8Array) => void) {
    unpackState(this.m, new Uint8Array(fs.readFileSync(stateFile)));
    this.m.mem[A.kempstonFound] = kempston ? 1 : 0;
    this.m.kempstonPlugged = kempston;
    let started = false;
    this.m.onStep = (pc) => {
      if (this.hooks.pcs !== undefined && this.hooks.pcs[pc] !== 0) this.hooks.pc?.(pc, this.m.mem);
      if (this.awaitR) { this.fed.queue.push(this.m.cpu.regs[7]); this.awaitR = false; }
      if (pc === PASS_START || pc === ENDING || pc === GAME_OVER) {
        if (!started) {
          started = true;
          this.prepare?.(this.m.mem);
          take(this.game, this.m.mem);
          this.hooks.start?.(this.m.mem);
        } else this.finishPass(pc === ENDING ? 'ended' : pc === GAME_OVER ? 'over' : 'playing');
        if (pc === PASS_START && !this.done) {
          this.driver?.choose(this.m, this.game);
          this.beginPass();
        }
      } else if (R_READS.includes(pc)) this.awaitR = true;
      else if (pc === SOUND) this.soundsSeen.push(this.m.cpu.regs[7]);
      else if (DEATHS.includes(pc) && !this.stray && !RESTARTS.includes(this.m.cpu.hl)) { this.tally.strayRestarts.push(`${this.label} pass ${this.passes + 1}: death at $${pc.toString(16)} restarts at $${this.m.cpu.hl.toString(16)}`); this.stray = true; }
      else if (pc === KEYS_READ && this.pending !== null && this.m.cpu.regs[3] !== this.pending.keys) {
        this.tally.keyMismatches++;
        this.report([`keys original ${this.m.cpu.regs[3].toString(2)} rebuilt ${this.pending.keys.toString(2)}`], this.pending.keys, this.pending.room);
      }
    };
  }

  private sources(): { keyboard: number; kempston: number | null; sinclair: number } {
    const m = this.m;
    return {
      keyboard: bitsOf(KEYBOARD_KEYS, (k) => keyDown(m, k)),
      kempston: m.mem[A.kempstonFound] !== 0 ? (m.kempston | (m.kempstonPlugged ? 0 : 0x1f)) & 0x1f : null,
      sinclair: bitsOf(SINCLAIR_KEYS, (k) => keyDown(m, k)),
    };
  }

  private beginPass(): void {
    this.pending = { keys: readKeys(this.sources()), room: this.m.mem[A.room] };
    this.fed.start();
    this.soundsSeen = [];
  }

  private report(what: string[], keys: number, room: number): void {
    this.tally.note({ label: this.label, pass: this.passes, room, keys, what });
  }

  /** The original has finished a pass: run the rebuilt one and compare. */
  private finishPass(outcome: Outcome): void {
    const p = this.pending;
    if (p === null) return;
    if (this.stray) { this.done = true; this.pending = null; return; }
    const g = this.game;
    const before = { room: g.room, lives: g.lives, x: g.monty.x, y: g.monty.y, state: g.monty.state, phase: g.monty.phase };
    const result = g.pass(p.keys);
    this.last = result;
    const mem = this.m.mem;
    const bad = differences(g, mem);
    if (result !== outcome) bad.push(`outcome original ${outcome} rebuilt ${result}`);
    if (g.sounds.join() !== this.soundsSeen.join()) bad.push(`sounds original [${this.soundsSeen.join()}] rebuilt [${g.sounds.join()}]`);
    if (this.fed.over > 0 || this.fed.unused > 0) {
      bad.push(`random numbers original ${this.fed.queue.length} rebuilt asked ${this.fed.queue.length - this.fed.unused + this.fed.over}`);
      this.tally.randomMismatches++;
    }
    this.tally.randoms += this.fed.queue.length;
    for (const s of g.sounds) this.tally.sounds.set(s, (this.tally.sounds.get(s) ?? 0) + 1);
    this.tally.passes++;
    this.passes++;
    this.seen(before, g, p.keys);
    if (bad.length > 0) {
      this.report(bad, p.keys, p.room);
      take(g, mem);
    }
    this.pending = null;
    this.hooks.passEnd?.(result, mem);
    if (outcome !== 'playing') {
      this.done = true;
      if (outcome === 'ended') this.tally.endings++;
      else this.tally.gameOvers++;
    }
  }

  private seen(b: { room: number; lives: number; x: number; y: number; state: number; phase: number }, g: Game, keys: number): void {
    const t = this.tally;
    t.see(`room ${b.room}`);
    t.see(['walking', 'falling', 'jumping', 'posed', 'hidden'][b.state] ?? `state ${b.state}`);
    if (b.room === 5 && b.state === 0) t.see('room 5 flying');
    if (g.monty.ropeUp !== 0 && b.room !== 5) t.see('on a rope');
    if (b.state === 2 && g.monty.state === 2 && g.monty.phase === 23 - b.phase) t.see('ceiling hit');
    if (b.state === 2 && g.monty.state === 0) t.see('landed from a jump');
    if (b.state === 1 && g.monty.state === 0) t.see('landed from a fall');
    if (b.state === 0 && g.monty.state === 1) t.see('walked off an edge');
    if ((keys & 16) !== 0 && b.state === 0 && g.monty.state === 2) t.see('jump started');
    if (g.lives < b.lives) { t.deaths++; t.see('died'); }
    if (g.room !== b.room && g.lives === b.lives) { t.roomChanges++; t.see(`left room ${b.room} for ${g.room}`); }
    if (g.sounds.includes(2)) t.see('picked something up');
  }

  /** Run until `limit` passes, or the run is over, calling the driver before each frame. */
  play(driver: Driver, limit: number, stop: (g: Game) => boolean = () => false): void {
    this.driver = driver;
    const frames = limit * 6 + 600;
    for (let f = 0; f < frames && this.passes < limit && !this.done && (this.passes === 0 || !stop(this.game)); f++) {
      this.m.runFrame();
      this.hooks.frame?.(this.m.mem);
    }
  }
}
