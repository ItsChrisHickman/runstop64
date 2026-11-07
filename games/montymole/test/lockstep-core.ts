/**
 * The rebuilt game (src/game.ts: Monty alone in the room loop) against the original running on the headless Spectrum, pass by pass.
 *
 * The original runs with its world emptied (`neutralise`): no enemy, crusher, retractable floor, object or coal in any room, and the
 * interrupt routine (which only moves those) replaced by one that returns; the death tune is cut to one short note. What is left is
 * what Monty alone does. At the start of each pass (`$943D`, the instruction after the main loop's `HALT`: the model leaves a halted program counter on it and the interrupt returns to it, so
 * only its first sighting before `$9440` counts) the harness compares
 * everything the rebuilt game keeps with the original's memory, then lets a driver press keys for the pass about to begin; the
 * next time the original gets to `$943D` (or to game over, `$F817`, the ending, `$F858`, or the opening scene, `$CD41`) the pass is
 * over: the rebuilt pass runs with the same ports and is compared. The rebuilt game is not touched between passes: it keeps its
 * own state, so one difference that matters shows up as a difference at once and every one after it is a consequence. (After a
 * difference the original's state is put into the rebuilt game, so the count of differences is of causes, not consequences.)
 *
 * Compared: Monty (his place, the input byte, picture, walk frame, jump direction, arc, count and pitch, facing, both flag bytes,
 * the four cell classes, the fall counter, where the pass began), the room, lives, arrival place and score, the screen's bitmap and
 * attributes, the picture buffer and the attribute buffer; the footstep beeps; the input byte as `$82A6` made it; and the outcome.
 */
import fs from 'node:fs';
import { readRom } from '../../../tools/zx/boot';
import { unpackState } from '../../../tools/zx/snapshot';
import { Spectrum } from '../../../tools/zx/spectrum';
import { Game, type Beep, type Outcome } from '../src/game';
import type { Control, Ports } from '../src/input';
import { ROOM_COUNT, ROOM_SIZE, ROOM_TABLE } from '../re/rooms-parse';

/** Where the original keeps what the game logic reads and writes (re/README.md). */
export const A = {
  x: 0x5c7b, y: 0x5c7c, input: 0x832e, control: 0x82a3, frameAddr: 0x848c, walkFrame: 0x848e, jumpDir: 0x848f, arc: 0x8492, pitch: 0x8494, jumpCount: 0x8498,
  facing: 0x849b, flags: 0x8d52, flags2: 0x8d53, cells: 0x8d54, fallen: 0x8d58, prevX: 0x8d7d, prevY: 0x8d7e, room: 0x9649, lives: 0x964a, arrival: 0x964b,
  score: 0x9217, coal: 0x964d, object: 0xc524, crusher: 0xc527, floor: 0xc622, gates: 0xf7d1, gateStep: 0xf7d4, gateCount: 0xf7d5, ring: 0x910b, enemies: 0xc596, seed: 0x5c76, screen: 0x4000, attrs: 0x5800, picture: 0xd260, attrBuffer: 0xcf54, current: 0xc42a,
} as const;
export const PASS_START = 0x943d, PASS_AFTER = 0x9440, ROOM_ENTRY = 0x940c, GAME_OVER = 0xf817, ENDING = 0xf858, OPENING = 0xcd41, INPUT_READ = 0x944c, BEEPER = 0x03b6;
/** The calls of BEEPER the rebuilt game makes beeps for, by where they return to: the footstep (`$8B06`), the touch with a tool (`$92F4`), coal (`$93D5`), an object (`$956E`). The death tune's (`$8DB2`) is not modelled yet. */
const MODELLED_BEEPS: readonly number[] = [0x8b09, 0x92f7, 0x93d8, 0x9571, 0x8e2b];
const ARC_START = 0x869c;
const ENEMY_FIELDS = ['state', 'p0lo', 'p0hi', 'p1lo', 'p1hi', 'p2lo', 'p2hi', 'p3lo', 'p3hi', 'colour', 'link', 'dir', 'x', 'y', 'legs', 'counter', 'left', 'step', 'spare0', 'spare1'];
/** An interrupt routine that does nothing (`EI`, `RET`) in the code's unused bytes, and where the room loop's start loads the routine's address. */
const STUB = 0xfe98, LOOP_HANDLER = 0x9424, VECTOR = 0x5b5c;
const OUTCOMES: Record<number, Outcome> = { [GAME_OVER]: 'gameOver', [ENDING]: 'ending', [OPENING]: 'opening' };

const word = (mem: Uint8Array, at: number): number => (mem[at] ?? 0) | ((mem[at + 1] ?? 0) << 8);
const put = (mem: Uint8Array, at: number, v: number): void => { mem[at] = v & 255; mem[at + 1] = v >> 8; };

/**
 * Empty the original's world of everything but Monty: in every room's record (and the copy the game is using) the six enemies get
 * state 3 (none), the crusher, the retractable floor and the object are zeroed; the coal flags lose bit 7 (no piece is drawn); the
 * interrupt routine becomes a return; the death tune is one note of one cycle.
 */
/**
 * What of the world stays in the original: the coal flags (bit 7 set: pieces there), each room's object and enemies, and the parts of the interrupt
 * routine: the crusher and the retractable floor (their records), the conveyors, room 17's animation and the gates that open with the coal (code: the
 * rest of the routine is patched out). The routine runs only when one of them is kept, and then twice a pass at the points the rebuilt game runs it (below).
 */
export interface Keep {
  readonly coal?: boolean; readonly object?: boolean; readonly enemies?: boolean;
  readonly crusher?: boolean; readonly floor?: boolean; readonly conveyors?: boolean; readonly room17?: boolean; readonly gate?: boolean;
}

/** Whether the interrupt routine has anything to do with what is kept. */
const interruptsOf = (keep: Keep): boolean => keep.crusher === true || keep.floor === true || keep.conveyors === true || keep.room17 === true || keep.gate === true;

export function neutralise(mem: Uint8Array, keep: Keep = {}): void {
  const bases: number[] = [A.current];
  for (let room = 0; room < ROOM_COUNT; room++) bases.push(ROOM_TABLE + room * ROOM_SIZE);
  for (const base of bases) {
    if (keep.enemies !== true) for (let e = 0; e < 6; e++) mem[base + 0x16c + e * 20] = 3;
    if (keep.object !== true) mem.fill(0, base + 0xfa, base + 0xfd); // the object
    if (keep.crusher !== true) mem.fill(0, base + 0xfd, base + 0x103); // the crusher
    if (keep.floor !== true) mem.fill(0, base + 0x1f8, base + 0x1ff); // the retractable floor
  }
  if (keep.coal === true) for (let i = 0; i < 64; i++) mem[A.coal + i] = (mem[A.coal + i] ?? 0) | 0x80;
  else for (let i = 0; i < 64; i++) mem[A.coal + i] = (mem[A.coal + i] ?? 0) & 0x7f;
  // the interrupt routine's parts that are not kept: no-ops in its code (`$8FC4` the crusher, `$8FC7` the conveyors, `$8FAC` room 17, `$F7C7` the floor, `$F7CA` the gates)
  if (keep.crusher !== true) mem.fill(0, 0x8fc4, 0x8fc7);
  if (keep.conveyors !== true) { mem[0x8fc7] = 0xc3; put(mem, 0x8fc8, 0x9048); }
  if (keep.room17 !== true) mem.fill(0, 0x8fac, 0x8faf);
  if (keep.floor !== true) mem.fill(0, 0xf7c7, 0xf7ca);
  if (keep.gate !== true) mem.fill(0, 0xf7ca, 0xf7d0);
  mem[STUB] = 0xfb;
  mem[STUB + 1] = 0xc9;
  put(mem, LOOP_HANDLER, STUB);
  put(mem, VECTOR, STUB);
  put(mem, 0x5c7d, 1); // the first note of the death tune, one cycle,
  mem[0x5c81] = 0; // and no second
}

/** The rebuilt game's ports over the model's: what an `IN` gives right now. */
export function portsOf(m: Spectrum): Ports {
  return { halfRow: (high) => m.in((high << 8) | 0xfe) & 0x1f, kempston: () => m.in(0x1f) };
}

/** Put the original's state into the rebuilt game (the start of a run, and after a difference). */
export function take(g: Game, mem: Uint8Array): void {
  const m = g.monty;
  m.x = mem[A.x] ?? 0; m.y = mem[A.y] ?? 0; m.input = mem[A.input] ?? 0; m.frameAddr = word(mem, A.frameAddr); m.walkFrame = mem[A.walkFrame] ?? 0;
  m.jumpDir = mem[A.jumpDir] ?? 0; m.arc = word(mem, A.arc) - ARC_START; m.jumpCount = mem[A.jumpCount] ?? 0; m.pitch = word(mem, A.pitch);
  m.facing = mem[A.facing] ?? 0; m.flags = mem[A.flags] ?? 0; m.flags2 = mem[A.flags2] ?? 0; m.fallen = mem[A.fallen] ?? 0;
  m.prevX = mem[A.prevX] ?? 0; m.prevY = mem[A.prevY] ?? 0;
  for (let i = 0; i < 4; i++) m.cells[i] = mem[A.cells + i] ?? 0;
  g.adopt(mem[A.room] ?? 0);
  g.lives = mem[A.lives] ?? 0;
  g.arrivalX = mem[A.arrival] ?? 0; g.arrivalY = mem[A.arrival + 1] ?? 0;
  for (let i = 0; i < 5; i++) g.score.digits[i] = mem[A.score + i] ?? 0;
  for (let i = 0; i < 64; i++) g.coal.flags[i] = mem[A.coal + i] ?? 0;
  for (let r = 0; r < ROOM_COUNT; r++) g.enemySource[r]?.forEach((rec, e) => rec.splice(0, 20, ...mem.subarray(ROOM_TABLE + r * ROOM_SIZE + 0x16c + e * 20, ROOM_TABLE + r * ROOM_SIZE + 0x16c + e * 20 + 20)));
  g.enemies.list.forEach((e, i) => e.fromBytes(Array.from(mem.subarray(A.enemies + i * 20, A.enemies + i * 20 + 20))));
  g.random.seed = word(mem, A.seed);
  g.crusher.fromBytes(Array.from(mem.subarray(A.crusher, A.crusher + 6)));
  g.floor.fromBytes(Array.from(mem.subarray(A.floor, A.floor + 7)));
  g.gates.flags = mem[A.gates] ?? 0; g.gates.step = mem[A.gateStep] ?? 0; g.gates.counted = mem[A.gateCount] ?? 0;
  for (let i = 0; i < 32; i++) g.chain.ring[i] = mem[A.ring + i] ?? 0;
  g.chain.seen = mem[A.ring + 32] ?? 0;
  g.object.x = mem[A.object] ?? 0; g.object.y = mem[A.object + 1] ?? 0; g.object.frame = mem[A.object + 2] ?? 0;
  g.control = mem[A.control] ?? 1;
  g.outcome = 'playing';
  g.field.screen.set(mem.subarray(A.screen, A.screen + 6144));
  g.field.attrs.set(mem.subarray(A.attrs, A.attrs + 768));
  g.field.picture.set(mem.subarray(A.picture, A.picture + 6144));
  g.field.coalMask.set(mem.subarray(A.attrBuffer, A.attrBuffer + 768));
}

/** What differs between the original's memory and the rebuilt game: the names of the things, and the first few bytes of arrays. */
export function differences(g: Game, mem: Uint8Array): string[] {
  const out: string[] = [];
  const m = g.monty;
  const num = (name: string, want: number, got: number): void => { if (want !== got) out.push(`${name} original ${want} rebuilt ${got}`); };
  num('x', mem[A.x] ?? 0, m.x); num('y', mem[A.y] ?? 0, m.y); num('input', mem[A.input] ?? 0, m.input);
  num('frame', word(mem, A.frameAddr), m.frameAddr); num('walkFrame', mem[A.walkFrame] ?? 0, m.walkFrame);
  num('jumpDir', mem[A.jumpDir] ?? 0, m.jumpDir); num('arc', word(mem, A.arc) - ARC_START, m.arc); num('jumpCount', mem[A.jumpCount] ?? 0, m.jumpCount);
  num('pitch', word(mem, A.pitch), m.pitch); num('facing', mem[A.facing] ?? 0, m.facing);
  num('flags', mem[A.flags] ?? 0, m.flags); num('flags2', mem[A.flags2] ?? 0, m.flags2); num('fallen', mem[A.fallen] ?? 0, m.fallen);
  num('prevX', mem[A.prevX] ?? 0, m.prevX); num('prevY', mem[A.prevY] ?? 0, m.prevY);
  for (let i = 0; i < 4; i++) num(`cell${i}`, mem[A.cells + i] ?? 0, m.cells[i] ?? -1);
  num('room', mem[A.room] ?? 0, g.room); num('lives', mem[A.lives] ?? 0, g.lives);
  num('arrivalX', mem[A.arrival] ?? 0, g.arrivalX); num('arrivalY', mem[A.arrival + 1] ?? 0, g.arrivalY);
  for (let i = 0; i < 5; i++) num(`score${i}`, mem[A.score + i] ?? 0, g.score.digits[i] ?? -1);
  for (let i = 0; i < 64; i++) num(`coal${i}`, mem[A.coal + i] ?? 0, g.coal.flags[i] ?? -1);
  num('objectX', mem[A.object] ?? 0, g.object.x); num('objectY', mem[A.object + 1] ?? 0, g.object.y); num('objectFrame', mem[A.object + 2] ?? 0, g.object.frame);
  num('tool', (mem[A.flags] ?? 0) & 8, m.flags & 8);
  num('seed', word(mem, A.seed), g.random.seed);
  g.floor.toBytes().forEach((v, i) => num(`floor.${i}`, mem[A.floor + i] ?? 0, v));
  num('gates', mem[A.gates] ?? 0, g.gates.flags); num('gateStep', mem[A.gateStep] ?? 0, g.gates.step); num('gateCount', mem[A.gateCount] ?? 0, g.gates.counted);
  g.chain.ring.forEach((v, i) => num(`ring${i}`, mem[A.ring + i] ?? 0, v)); num('ringSeen', mem[A.ring + 32] ?? 0, g.chain.seen);
  g.crusher.toBytes().forEach((v, i) => num(`crusher.${['column', 'y', 'lowest', 'wait', 'direction', 'highest'][i]}`, mem[A.crusher + i] ?? 0, v));
  g.enemies.list.forEach((e, i) => e.toBytes().forEach((v, k) => num(`enemy${i}.${ENEMY_FIELDS[k] ?? k}`, mem[A.enemies + i * 20 + k] ?? 0, v)));
  const arrays: [string, number, Uint8Array][] = [
    ['screen', A.screen, g.field.screen], ['attrs', A.attrs, g.field.attrs], ['picture', A.picture, g.field.picture], ['coalMask', A.attrBuffer, g.field.coalMask],
  ];
  for (const [name, at, got] of arrays) {
    let n = 0;
    for (let i = 0; i < got.length; i++) if (mem[at + i] !== got[i]) { if (n++ < 2) out.push(`${name} byte ${i} original ${mem[at + i]} rebuilt ${got[i]}`); }
    if (n > 2) out.push(`${name}: ${n} bytes differ`);
  }
  return out;
}

/**
 * A scripted or random player for the original. It chooses at the start of every pass, when the rebuilt game has just caught up
 * with the original, and presses or releases keys on the original `m`; the keys stay as they are until the next pass.
 */
export interface Driver {
  choose(m: Spectrum, g: Game): void;
}

/** One thing seen going wrong, for the report. */
interface Mismatch {
  readonly label: string;
  readonly pass: number;
  readonly room: number;
  readonly what: string[];
}

/** What the runs saw. */
export class Tally {
  passes = 0;
  mismatches = 0;
  inputMismatches = 0;
  /** differences by the first word of their name, over all passes */
  readonly byField = new Map<string, number>();
  readonly first: Mismatch[] = [];
  deaths = 0;
  roomChanges = 0;
  gameOvers = 0;
  beeps = 0;
  /** how often each situation was compared */
  readonly seen = new Map<string, number>();
  maxFirst = 8;
  /** runs that ended where the rebuilt game parts from the original on purpose */
  readonly diverged = new Set<string>();

  see(what: string): void { this.seen.set(what, (this.seen.get(what) ?? 0) + 1); }
  note(m: Mismatch): void {
    this.mismatches++;
    for (const w of m.what) {
      const key = (w.split(' original')[0] ?? w).split(' byte')[0]?.split(':')[0] ?? w;
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

const rom = readRom('games/montymole/build/48.rom');

/** What a test can watch of a run without changing it. */
export interface Hooks {
  /** after the rebuilt game has taken the original's state, before the first pass */
  start?(mem: Uint8Array): void;
  /** after each pass's comparison, with the original's memory */
  passEnd?(outcome: Outcome, mem: Uint8Array): void;
}

/** One run: the original from a state, the rebuilt game beside it. */
export class Run {
  readonly m = new Spectrum(rom);
  readonly game = new Game();
  readonly hooks: Hooks = {};
  /** the run is over (game over, the ending or the opening scene came) */
  done = false;
  passes = 0;
  /** the last pass's outcome as the rebuilt game gave it */
  last: Outcome = 'playing';
  private pending = false;
  private driver: Driver | null = null;
  private originalBeeps: Beep[] = [];
  private originalInput = -1;
  private started = false;
  private prepared = false;
  private armed = true;
  private injecting = false;
  /** the address the real interrupt routine, called by the harness, returns to (its return is not a new sighting of that address) */
  private returning = -1;

  /**
   * `prepare` changes the original first (a placement, a room: it may point the program counter at `$940C`, a room's start); `control` is the menu's choice (1 keyboard, 2 Kempston, 3 Sinclair),
   * `kempston` whether a Kempston interface is plugged in.
   */
  constructor(readonly tally: Tally, stateFile: string, readonly label: string, control: Control, kempston: boolean, private readonly prepare?: (m: Spectrum) => void, keep: Keep = {}) {
    unpackState(this.m, new Uint8Array(fs.readFileSync(stateFile)));
    this.m.cpu.iff1 = true; // (the saved state is at the loop's HALT; the original runs with its interrupt on)
    this.m.cpu.iff2 = true;
    this.m.mem[A.control] = control;
    this.m.kempstonPlugged = kempston;
    neutralise(this.m.mem, keep);
    this.injecting = interruptsOf(keep);
    this.m.onStep = (pc) => {
      if (pc === this.returning) { this.returning = -1; return; }
      if (pc === PASS_AFTER || pc === ROOM_ENTRY) this.armed = true; // (the pass has begun, or a death in the interrupt sent it back to enter the room)
      else if (pc === PASS_START) { // (the model leaves a halted program counter here, and the interrupt returns here: only the first sighting counts)
        if (!this.armed) return;
        this.armed = false;
      }
      if (pc === PASS_START || pc === GAME_OVER || pc === ENDING || pc === OPENING) {
        if (!this.prepared) {
          this.prepared = true;
          this.prepare?.(this.m);
          if (this.m.cpu.pc !== pc) return; // (the placement sent the original back to a room's start: take its state at the next pass)
        }
        if (!this.started) {
          this.started = true;
          take(this.game, this.m.mem);
          this.hooks.start?.(this.m.mem);
        } else this.finishPass(OUTCOMES[pc] ?? 'playing');
        if (pc === PASS_START && !this.done) {
          this.driver?.choose(this.m, this.game);
          this.pending = true;
          this.originalBeeps = [];
          this.originalInput = -1;
          this.returning = -1;
          if (this.injecting) this.interrupt(PASS_START); // the interrupt that ends the HALT
        }
      } else if (pc === INPUT_READ) {
        this.originalInput = this.m.mem[A.input] ?? 0;
        if (this.injecting) this.interrupt(INPUT_READ); // the one inside the pass, put before Monty's routine
      }
      else if (pc === BEEPER) {
        const sp = this.m.cpu.sp;
        if (MODELLED_BEEPS.includes(word(this.m.mem, sp))) this.originalBeeps.push({ de: this.m.cpu.de, hl: this.m.cpu.hl });
      }
    };
  }

  /** Call the original's interrupt routine (`$8F9F`) as the interrupt would: from here, returning to here. */
  private interrupt(from: number): void {
    const cpu = this.m.cpu;
    cpu.sp = (cpu.sp - 2) & 0xffff;
    this.m.mem[cpu.sp] = from & 255;
    this.m.mem[cpu.sp + 1] = from >> 8;
    cpu.pc = 0x8f9f;
    cpu.halted = false;
    this.returning = from;
  }

  /** The original has finished a pass: run the rebuilt one and compare. */
  private finishPass(outcome: Outcome): void {
    if (!this.pending) return;
    this.pending = false;
    const g = this.game;
    const before = { room: g.room, lives: g.lives, x: g.monty.x, y: g.monty.y, flags: g.monty.flags, flags2: g.monty.flags2, jumpDir: g.monty.jumpDir, fallen: g.monty.fallen, score: g.score.value, gates: g.gates.flags, gateStep: g.gates.step, floor: g.floor.toBytes().join() };
    const context = `before: x ${before.x} y ${before.y} flags ${before.flags.toString(16)} flags2 ${before.flags2.toString(16)} jumpDir ${before.jumpDir} arc ${g.monty.arc} count ${g.monty.jumpCount} fallen ${before.fallen} input ${g.monty.input}`;
    g.beeps.length = 0;
    const result = g.pass(portsOf(this.m));
    this.last = result;
    if (g.divergence !== null) { // the rebuilt game left the original on purpose: nothing more to compare
      this.tally.diverged.add(g.divergence);
      this.done = true;
      return;
    }
    const mem = this.m.mem;
    const bad = result === 'gameOver' || result === 'ending' || result === 'opening' ? terminal(g, mem) : differences(g, mem);
    if (result !== outcome) bad.push(`outcome original ${outcome} rebuilt ${result}`);
    if (g.inputRead !== this.originalInput) { bad.push(`input read original ${this.originalInput} rebuilt ${g.inputRead}`); this.tally.inputMismatches++; }
    if (JSON.stringify(g.beeps) !== JSON.stringify(this.originalBeeps)) bad.push(`beeps original ${JSON.stringify(this.originalBeeps)} rebuilt ${JSON.stringify(g.beeps)}`);
    this.tally.beeps += g.beeps.length;
    this.tally.passes++;
    this.passes++;
    this.seen(before, g);
    if (bad.length > 0) {
      this.tally.note({ label: this.label, pass: this.passes, room: before.room, what: [context, ...bad] });
      if (outcome === 'playing') take(g, mem);
    }
    this.hooks.passEnd?.(result, mem);
    if (outcome !== 'playing') {
      this.done = true;
      if (outcome === 'gameOver') this.tally.gameOvers++;
    }
  }

  private seen(b: { room: number; lives: number; x: number; y: number; flags: number; flags2: number; jumpDir: number; fallen: number; score: number; gates: number; gateStep: number; floor: string }, g: Game): void {
    const t = this.tally;
    const m = g.monty;
    t.see(`room ${b.room}`);
    if (g.lives < b.lives || g.outcome === 'gameOver') { t.deaths++; t.see('died'); if (b.fallen >= 0x1e || (b.flags & 1) !== 0) t.see('died falling'); }
    if (g.exitedTo !== null) { t.roomChanges++; t.see(`left room ${b.room} for ${g.exitedTo}`); }
    if (g.score.value > b.score) t.see('coal taken');
    if ((m.flags & 8) !== 0 && (b.flags & 8) === 0) t.see('object taken');
    if ((b.flags & 8) !== 0 && (m.flags & 8) === 0 && g.exitedTo === null && g.lives === b.lives) t.see('tool used on an enemy');
    if (g.enemies.list.some((e) => e.state === 1)) t.see('a chaser about');
    if (g.enemies.list.some((e) => e.state === 2)) t.see('a relay about');
    if ((b.flags & 8) !== 0 && (m.flags & 8) === 0) t.see('tool lost');
    if (b.gates !== g.gates.flags && (g.gates.flags & 0x3c) !== (b.gates & 0x3c)) t.see('a gate opened');
    if (b.gateStep !== g.gates.step) t.see('a gate row cleared');
    if (g.room >= 8 && g.room <= 11) t.see('a conveyor');
    if (g.room === 17) t.see('the chain');
    if (g.floor.toBytes().some((v, i) => v !== 0 && i < 6) && b.floor !== g.floor.toBytes().join()) t.see('the floor moved');
    if (g.lives < b.lives && g.lastDeath !== null) t.see(`died: ${g.lastDeath}`);
    if (g.beeps.some((x) => x.de === 2)) t.see('thud');
    if ((b.flags & 1) !== 0) t.see('falling');
    if (b.jumpDir !== 0) t.see('jumping');
    if ((b.flags & 4) !== 0) t.see('on a rope');
    if ((m.flags & 4) !== 0) t.see('rope cell');
    if (b.jumpDir === 0 && m.jumpDir !== 0) t.see('jump started');
    if (b.jumpDir !== 0 && m.jumpDir === 0 && g.room === b.room) t.see('jump ended');
    if ((b.flags2 & 0x80) !== 0 && (m.flags2 & 0x80) === 0 && g.room === b.room && g.lives === b.lives) t.see('landed');
    if ((b.flags & 1) === 0 && (m.flags & 1) !== 0) t.see('walked off an edge');
    if (m.frameAddr >= 0x7800 && m.frameAddr < 0x7a00) t.see('castle frames');
  }

  /** Run until `limit` passes, or the run is over. */
  play(driver: Driver, limit: number): void {
    this.driver = driver;
    const frames = limit * 4 + 600;
    for (let f = 0; f < frames && this.passes < limit && !this.done; f++) this.m.runFrame();
  }
}

/** At game over, the ending or the opening the screen is the scene's: only the room, the lives and Monty's logic need to agree. */
function terminal(g: Game, mem: Uint8Array): string[] {
  const out: string[] = [];
  if ((mem[A.lives] ?? 0) !== g.lives) out.push(`lives original ${mem[A.lives]} rebuilt ${g.lives}`);
  if ((mem[A.room] ?? 0) !== g.room) out.push(`room original ${mem[A.room]} rebuilt ${g.room}`);
  return out;
}
