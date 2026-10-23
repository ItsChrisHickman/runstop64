/**
 * What the lockstep (lockstep.ts) and the picture compare (picture.ts) share: the original running from a
 * snapshot with the data it reads taken out (or not), what is read from it at the end of a logic step, the rebuild
 * put where the original is, and the plans (scripted and random joysticks, the places a run starts from).
 */
import { C64Machine, type MachineState } from 'c64kit';
import { ENEMY_ROOMS, NO_ROOM, ROOMS, TABLES, WORLD_GRID } from '../src/data';
import { Enemies, PLANE_FRAMES } from '../src/enemies';
import { Game } from '../src/game';
import { isRemoved } from '../src/items';
import { LIFT_SITES, Lift } from '../src/lifts';
import { Stick, decodeStick } from '../src/input';
import type { SkyState } from '../src/flight';
import { BOXES } from '../src/panel';
import { Picture } from '../src/picture';
import { COLS, ROWS } from '../src/room';
import { FIRST_COL } from '../src/screen';
import { callText } from '../src/soundlog';
import { World } from '../src/world';

// ---- the original ----------------------------------------------------------------------------

/** Everything compared: the original's bytes and the rebuild's fields in one shape. */
export interface Snap {
  room: number; gridIndex: number; lives: number;
  x: number; y: number; state: number; step: number; blocked: number; jumpDir: number; input: number;
  prevX: number; prevY: number; entryX: number; entryY: number; entryState: number; entryStep: number;
  burn: number; dead: number; frame: number; faceLeft: number;
  walkPhase: number; walkFrame: number; walkToggle: number; climbPhase: number; slowToggle: number;
  rngIndex: number; rngSum: number;
  cells: string; burnPicture: string;
  // stage 3
  enemies: string; clock: string; lift: string; hands: string; collected: string; score: string; money: string; flags: string;
  // stage 5: what he asked of the sound drivers in the step, and the room tune playing
  sounds: string; tune: number;
  // the flight: what it leaves in the machine
  sky: string;
}
export const KEYS: readonly (keyof Snap)[] = [
  'room', 'x', 'y', 'state', 'step', 'lives', 'gridIndex', 'blocked', 'jumpDir', 'input', 'prevX', 'prevY',
  'entryX', 'entryY', 'entryState', 'entryStep', 'burn', 'dead', 'frame', 'faceLeft',
  'walkPhase', 'walkFrame', 'walkToggle', 'climbPhase', 'slowToggle', 'rngIndex', 'rngSum', 'cells', 'burnPicture',
  'enemies', 'clock', 'lift', 'hands', 'collected', 'score', 'money', 'flags', 'sounds', 'tune', 'sky',
];

/** What the flights leave in the machine, from the original's bytes ($784D-$785F, $3B, $7860-$7861, $809C-$809E, $4063, $4065, $C3FA-$C3FD). */
export function readSky(ram: Uint8Array): SkyState {
  const r = (a: number): number => ram[a] ?? 0;
  return {
    clouds: [0x784d, 0x784f, 0x7851, 0x7853, 0x7855, 0x7857, 0x7859, 0x785b].map((a) => r(a) | (r(a + 1) << 8)),
    slow: [r(0x785d), r(0x785e)], tick: r(0x785f), scrollB: r(0x3b), enemy: [r(0x7860), r(0x7861)], player: [r(0x809c), r(0x809d)],
    lean: r(0x809e), explosion: r(0x4063), hit: r(0x4065), pointers: [0xc3fa, 0xc3fb, 0xc3fc, 0xc3fd].map(r),
  };
}
const skyText = (s: SkyState): string => JSON.stringify(s);

export const hex = (b: ArrayLike<number>): string => Array.from({ length: b.length }, (_, i) => (b[i] ?? 0).toString(16).padStart(2, '0')).join('');
export const CELLS = 576;

export const ITEMS = TABLES.items.length;

/** The original's list with what the port removed (the shield leaf: items.ts) taken, as a game of ours has it: its rooms then show what ours do. */
export function withoutRemovedItems(ram: Uint8Array): void {
  TABLES.items.forEach((e, i) => { if (isRemoved(e.type)) ram[0x6d7b + 3 * i] = (ram[0x6d7b + 3 * i] ?? 0) | 0x80; });
}
const bits = (flags: readonly boolean[]): string => flags.map((f) => (f ? '1' : '0')).join('');

export function readOriginal(ram: Uint8Array): Snap {
  const r = (a: number): number => ram[a] ?? 0;
  const list = (a: number, n: number): string => Array.from({ length: n }, (_, i) => r(a + i)).join(',');
  const entry = (i: number): number => {
    const addr = r(0x693f + 2 * i) | (r(0x6940 + 2 * i) << 8);
    return addr === 0 ? -1 : (addr - 0x6d7b) / 3;
  };
  return {
    room: r(0x402b), gridIndex: (r(0x07) | (r(0x08) << 8)) - 0x45ad, lives: r(0x4061),
    x: r(0x5c3f), y: r(0x5c40), state: r(0x4f87), step: r(0x4f88), blocked: r(0x4f86), jumpDir: r(0x403e), input: r(0x4033),
    prevX: r(0x4045), prevY: r(0x4046), entryX: r(0x4040), entryY: r(0x4041), entryState: r(0x4043), entryStep: r(0x4044),
    burn: r(0x4047), dead: r(0x4048), frame: r(0x5c46), faceLeft: r(0x5c48) & 0x80 ? 1 : 0,
    walkPhase: r(0x51da), walkFrame: r(0x51db), walkToggle: r(0x51dc), climbPhase: r(0x51dd), slowToggle: r(0x51de),
    rngIndex: r(0x5224), rngSum: r(0x5225),
    cells: hex(ram.subarray(0x0800, 0x0800 + CELLS)), burnPicture: hex(ram.subarray(0x39f8, 0x3a00)),
    enemies: hex(ram.subarray(0x5c4c, 0x5c4c + 52)), clock: list(0x5eca, 3) + ',' + r(0x5ecf),
    lift: `${r(0x8385)},${r(0x8386)},${r(0x3f) | (r(0x40) << 8)}`,
    hands: `${list(0x6947, 4)}|${list(0x693b, 4)}|${[0, 1, 2, 3].map(entry).join(',')}`,
    collected: bits(Array.from({ length: ITEMS }, (_, i) => (r(0x6d7b + 3 * i) & 0x80) !== 0)),
    score: list(0x404a, 5), money: list(0x4051, 5),
    sounds: '', tune: r(0x4064), sky: skyText(readSky(ram)),
    flags: list(0x405d, 1) + ',' + [0x402d, 0x405b, 0x405c, 0x4062, 0x4060, 0x405f, 0x402a, 0x5df6].map(r).join(','),
  };
}

export function readPort(g: Game): Snap {
  const m = g.monty, c = m.counters, e = g.enemies.clock, it = g.items;
  return {
    room: g.world.room, gridIndex: g.world.gridIndex, lives: g.lives,
    x: m.x, y: m.y, state: m.state, step: m.step, blocked: m.blocked, jumpDir: m.jumpDir, input: m.input,
    prevX: m.prevX, prevY: m.prevY, entryX: m.entryX, entryY: m.entryY, entryState: m.entryState, entryStep: m.entryStep,
    burn: m.burn, dead: m.dead, frame: m.frame, faceLeft: m.faceLeft ? 1 : 0,
    walkPhase: c.walkPhase, walkFrame: c.walkFrame, walkToggle: c.walkToggle, climbPhase: c.climbPhase, slowToggle: c.slowToggle,
    rngIndex: g.rng.index, rngSum: g.rng.sum,
    cells: hex(g.world.cells), burnPicture: hex(m.burnPicture),
    enemies: hex(g.enemies.bytes), clock: `${e.phase},${e.frame},${e.flip},${e.toggle}`,
    lift: `${g.lift.phase},${g.lift.delay},${g.lift.pointer}`,
    hands: `${it.carried.join(',')}|${it.slotType.join(',')}|${it.slotEntry.join(',')}`,
    collected: bits(it.collected),
    score: g.score.digits.join(','), money: g.money.digits.join(','),
    sounds: g.sound.take().map(callText).join(','), tune: g.tune, sky: skyText(g.sky),
    flags: [g.progress, g.progressSeen, g.bonus, g.bonusFlag, g.helped, g.quest, g.monty.slide, g.ended ? 1 : 0, g.contact80 ? 1 : 0].join(','),
  };
}

/** The original at the end of a logic step: the compared fields, and the RAM they were read from. */
export interface Moment { readonly snap: Snap; readonly ram: Uint8Array }

/** Put the rebuild where the original is (the start, or after a difference when resynchronising). */
export function applyOriginal(g: Game, { snap: s, ram }: Moment): void {
  const m = g.monty, c = m.counters;
  const r = (a: number): number => ram[a] ?? 0;
  g.world.enter(s.room);
  g.world.cells.set(ram.subarray(0x0800, 0x0800 + CELLS));
  g.world.gridIndex = s.gridIndex;
  g.lives = s.lives;
  m.x = s.x; m.y = s.y; m.state = s.state; m.step = s.step; m.blocked = s.blocked; m.jumpDir = s.jumpDir; m.input = s.input;
  m.prevX = s.prevX; m.prevY = s.prevY; m.entryX = s.entryX; m.entryY = s.entryY; m.entryState = s.entryState; m.entryStep = s.entryStep;
  m.burn = s.burn; m.dead = s.dead; m.frame = s.frame; m.faceLeft = s.faceLeft === 1;
  c.walkPhase = s.walkPhase; c.walkFrame = s.walkFrame; c.walkToggle = s.walkToggle; c.climbPhase = s.climbPhase; c.slowToggle = s.slowToggle;
  g.rng.index = s.rngIndex; g.rng.sum = s.rngSum;
  m.burnPicture.set(ram.subarray(0x39f8, 0x3a00));
  // stage 3
  g.enemies.bytes.set(ram.subarray(0x5c4c, 0x5c4c + 52));
  const clock = g.enemies.clock;
  clock.phase = r(0x5eca); clock.frame = r(0x5ecb); clock.flip = r(0x5ecc); clock.toggle = r(0x5ecf);
  g.lift.enter(s.room);
  g.lift.phase = r(0x8385); g.lift.delay = r(0x8386);
  for (let i = 0; i < ITEMS; i++) g.items.collected[i] = (r(0x6d7b + 3 * i) & 0x80) !== 0;
  for (let i = 0; i < 4; i++) {
    g.items.carried[i] = r(0x6947 + i);
    g.items.slotType[i] = r(0x693b + i);
    const addr = r(0x693f + 2 * i) | (r(0x6940 + 2 * i) << 8);
    g.items.slotEntry[i] = addr === 0 ? -1 : (addr - 0x6d7b) / 3;
  }
  for (let i = 0; i < 5; i++) { g.score.digits[i] = r(0x404a + i); g.money.digits[i] = r(0x4051 + i); }
  g.tune = r(0x4064); g.soundFlag = r(0x4066);
  g.progress = r(0x405d); g.progressSeen = r(0x402d); g.bonus = r(0x405b); g.bonusFlag = r(0x405c);
  Object.assign(g.sky, readSky(ram));
  g.helped = r(0x4062); g.quest = r(0x4060); g.monty.slide = r(0x405f); g.ended = r(0x402a) !== 0; g.contact80 = r(0x5df6) !== 0;
}

/**
 * The rebuild's picture put where the original's is (the game already is: `applyOriginal`): the room's cells and animated tiles,
 * the boxes, the parts of the way out and the colours an item taken leaves, which a picture made now never saw happen.
 */
export function makePicture(g: Game, { ram }: Moment, o: C64Machine): Picture {
  const pic = new Picture(g);
  pic.resume(ram[0x4037] ?? 0);
  // (the animated tiles have turned or scrolled for as many steps as the original has been in its room: the rebuild takes up where they are)
  pic.ram.set(ram.subarray(0x3808, 0x3880), 0x3808);
  // (the boxes of what he carried when the snapshot was taken, or picked up while the original drew its first frames: as they are)
  pic.ram.set(ram.subarray(0x3880, 0x3900), 0x3880);
  for (const [col, row] of BOXES) {
    for (const [dc, dr] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
      const at = (row + dr) * 40 + col + dc;
      pic.screen.put(col + dc, row + dr, ram[0x400 + at] ?? 0, o.colour[at] ?? 0);
    }
  }
  // (what the steps before the snapshot left that the rebuild's picture never saw, as the original has it: the parts of the way out it
  // drew for the progress it made (a progress poked in drew none), and the colour an item taken leaves in its cells, which the cells of
  // a room drawn afterwards do not have)
  for (let row = 21; row < 24; row++) {
    for (let col = 10; col < 30; col++) pic.screen.put(col, row, ram[0x400 + row * 40 + col] ?? 0, o.colour[row * 40 + col] ?? 0);
  }
  for (let row = 0; row < ROWS; row++) {
    for (let col = FIRST_COL; col < FIRST_COL + COLS; col++) {
      const at = row * 40 + col;
      if ((ram[0x400 + at] ?? 0) === 0) pic.screen.colour[at] = o.colour[at] ?? 0;
    }
  }
  return pic;
}

/** Which groups are taken out of both (NEUTRAL=enemies,items,lifts). */
export const NEUTRAL = new Set((process.env.NEUTRAL ?? '').split(',').filter(Boolean));
/** The enemy table with every record empty (what the neutralised original reads). */
export const EMPTY_ENEMIES = new Uint8Array(ENEMY_ROOMS.length).map((_, i) => (i % 4 === 3 ? 0xdf : 0));

/** A rebuild of the game in `room`, with the same groups taken out as the original has. */
export function makeGame(room: number): Game {
  const g = new Game(room, {
    enemies: NEUTRAL.has('enemies') ? new Enemies(EMPTY_ENEMIES) : undefined,
    lift: NEUTRAL.has('lifts') ? new Lift([]) : undefined,
  });
  if (NEUTRAL.has('items')) g.items.collected.fill(true);
  return g;
}

/** Item types put into his hands at the start (CARRY=11,12). */
export const CARRY = (process.env.CARRY ?? '').split(',').filter(Boolean).map(Number);

/** What `startOriginal` can be asked for beyond the place: the progress and hands to start with, the entry points to count, a look at every frame. */
export interface StartOptions {
  progress?: number;
  carry?: readonly number[];
  /** Entry points of the original's code to count (the lockstep's list of what it reached). */
  points?: ReadonlyMap<number, string>;
  /** Called after every frame the original runs, with what its main loop did in it. */
  onFrame?: (o: C64Machine, marks: readonly Mark[]) => void;
}

/** The Commodore key in the keyboard matrix: [CIA1 port A bit, port B bit] ($6319 reads it as $26). */
const COMMODORE: [number, number] = [7, 5];

/** Something the original's main loop did in a frame, and on which raster line: the drawing phase began ($5473), the logic phase ($54AE), a logic step ended ($551A), a room was entered ($5581). */
export interface Mark { readonly at: 'draw' | 'logic' | 'end' | 'room'; readonly line: number }
const MARKS: ReadonlyMap<number, Mark['at']> = new Map([[0x5473, 'draw'], [0x54ae, 'logic'], [0x551a, 'end'], [0x5581, 'room']]);

/** Takes the enemies, items and lifts out of the data the original reads, then draws `room` with Monty at (x, y). */
export function startOriginal(state: MachineState, room: number, x: number, y: number, opts: StartOptions = {}): { o: C64Machine; hits: Map<number, number>; next(joy: number): Moment } {
  const { progress = 0, carry = CARRY, points, onFrame } = opts;
  const o = new C64Machine();
  o.loadState(state);
  const ram = o.ram;
  if (NEUTRAL.has('enemies')) for (let r = 0; r < 80; r++) ram.set([0, 0, 0, 0xdf, 0, 0, 0, 0xdf, 0, 0, 0, 0xdf, 0, 0, 0, 0xdf], 0x703f + 16 * r);
  if (NEUTRAL.has('items')) for (let i = 0; i < 236; i++) ram[0x6d7b + 3 * i] = (ram[0x6d7b + 3 * i] ?? 0) | 0x80;
  else for (let i = 0; i < 236; i++) ram[0x6d7b + 3 * i] = (ram[0x6d7b + 3 * i] ?? 0) & 0x7f;
  if (NEUTRAL.has('lifts')) for (let i = 0; i < 11; i++) ram[0x852c + 4 * i] = 0xff;
  ram[0x4061] = 0x86;
  ram[0x4066] = process.env.SOUND ? 1 : 0; // SOUND=1: the title's other choice, the tunes of the rooms and the effects
  const regs = { ...o.cpu };
  ram[0x402b] = room;
  o.call(0x5b1f);
  ram.set([x, y], 0x5c3f);
  ram[0x4f87] = 0; ram[0x4f88] = 0; ram[0x4f86] = 0; ram[0x4048] = 0;
  ram.set([x, y, 0, 0], 0x4040);
  ram.set([x, y], 0x4045);
  o.call(0x5581);
  Object.assign(o.cpu, regs);
  carry.forEach((t, i) => { ram[0x6947 + i] = t; });
  if (progress) { ram[0x405d] = progress; ram[0x402d] = progress; }

  let inLogic = false, done: Moment | null = null;
  // (a flight takes the original some 2000 frames, in the middle of a logic step: they do not count towards the limit below)
  let flying = false;
  let sounds: string[] = [];
  let lastPc = 0;
  const marks: Mark[] = [];
  const step = o.cpu.step.bind(o.cpu);
  const hits = new Map<number, number>();
  o.cpu.step = () => {
    const pc = o.cpu.pc;
    const mark = onFrame ? MARKS.get(pc) : undefined;
    if (mark) marks.push({ at: mark, line: o.line });
    if (inLogic && points?.has(pc)) hits.set(pc, (hits.get(pc) ?? 0) + 1);
    if (inLogic && lastPc !== 0xe4b8) {
      // (the music's own end-of-tune stop, $E4B8, comes from the interrupt: not the game's)
      if (pc === 0x85a6) sounds.push(`e${o.cpu.a.toString(16)}`);
      else if (pc === 0xe409) sounds.push(`t${o.cpu.a.toString(16)}`);
      else if (pc === 0xe40c) sounds.push('s');
      else if (pc === 0xc7e3) sounds.push(`v${o.cpu.a.toString(16)}`);
    }
    lastPc = pc;
    if (pc === 0x77e3) flying = true;
    else if (pc === 0x7610) flying = false;
    if (pc === 0x54ae) { inLogic = true; sounds = []; }
    else if (pc === 0x551a && inLogic) { inLogic = false; done = { snap: { ...readOriginal(o.ram), sounds: sounds.join(',') }, ram: o.ram.slice() }; }
    return step();
  };
  const next = (joy: number): Moment => {
    o.keys = joy & KEY ? [COMMODORE] : [];
    done = null;
    for (let f = 0; f < 600 && !done; f += flying ? 0 : 1) {
      o.joy1 = o.joy2 = 0x1f & ~(flying ? flightStick(joy, readSky(o.ram)) : joy);
      marks.length = 0;
      if (!o.runFrame()) throw new Error('the CPU stopped');
      onFrame?.(o, marks);
    }
    if (!done) throw new Error('the original ran 600 frames without finishing a logic step');
    return done;
  };
  return { o, hits, next };
}


/** The flight he boarded in the step just run, flown to the end with the stick as `flightStick` has it (the original's lockstep holds the same through the flight), and landed from. */
export function flyThrough(g: Game, joy: number): void {
  const flight = g.startFlight(new Uint8Array(0x4000));
  while (!flight.over) flight.step(g.scramble(decodeStick(flightStick(joy, g.sky))));
  g.land(flight);
}

export function diffOf(a: Snap, b: Snap): string[] {
  return KEYS.filter((k) => a[k] !== b[k]).map((k) => {
    if (k === 'cells' || k === 'burnPicture') {
      const sa = String(a[k]), sb = String(b[k]);
      let at = 0;
      while (at < sa.length && sa[at] === sb[at]) at++;
      return `${k}@${k === 'cells' ? at >> 1 : at >> 1} original ${sa.slice(at - (at & 1), at - (at & 1) + 2)} rebuild ${sb.slice(at - (at & 1), at - (at & 1) + 2)}`;
    }
    return `${k} original ${a[k]} rebuild ${b[k]}`;
  });
}

// ---- plans -----------------------------------------------------------------------------------

/**
 * Beside the joystick's five bits, a plan's step can hold the Commodore key (C), the key that boards a plane, and say how the stick
 * is held through the flight it starts: as it is, or (K) steered to shoot the other plane down, or (X) to be shot down by it.
 */
export const KEY = 32;
export const KILL = 64;
export const CRASH = 128;
export const STICK: Record<string, number> = { U: Stick.Up, D: Stick.Down, L: Stick.Left, R: Stick.Right, F: Stick.Fire, C: KEY, K: KILL, X: CRASH };

/** The stick for one frame of a flight (`Stick` bits): `joy` as held, unless the step says to chase (from where the planes are). */
export function flightStick(joy: number, sky: SkyState): number {
  const [px = 0, py = 0] = sky.player, [ex = 0, ey = 0] = sky.enemy;
  const nose = joy & KILL ? px + 0x1e : joy & CRASH ? px : null;
  if (nose === null) return joy & 0x1f;
  // (his nose onto the other's, or his tail under its nose: where the game counts a hit)
  const toX = joy & KILL ? ex : ex + 0x1e;
  let stick = 0;
  if (nose + 2 < toX) stick |= Stick.Right; else if (nose > toX + 2) stick |= Stick.Left;
  if (py + 2 < ey) stick |= Stick.Down; else if (py > ey + 2) stick |= Stick.Up;
  return stick;
}
export const stickOf = (j: string): number => Array.from(j).reduce((m, c) => m | (STICK[c] ?? 0), 0);

export function random(seed: number): () => number {
  let r = seed || 1;
  return () => { r = (r * 1103515245 + 12345) & 0x7fffffff; return r / 0x7fffffff; };
}

export const MOVES = ['', 'L', 'R', 'U', 'D', 'F', 'LF', 'RF', 'UL', 'UR', 'DL', 'DR', 'R', 'L', 'R', 'L', 'UF', 'DF', 'LF', 'RF', 'ULF', 'URF'];

/** The rooms with a plane in them ($D0 and $D1 enemy records), and where the first stands. */
export function airports(): { room: number; x: number; y: number }[] {
  const out: { room: number; x: number; y: number }[] = [];
  for (let room = 0; room < ROOMS.length; room++) {
    for (let e = 0; e < 4; e++) {
      if ((ENEMY_ROOMS[room * 16 + e * 4 + 3] ?? 0) !== PLANE_FRAMES[0]) continue;
      const at = ENEMY_ROOMS[room * 16 + e * 4] ?? 0;
      out.push({ room, x: at & 0xf0, y: (at & 15) << 3 });
    }
  }
  return out;
}

/** A plan as one joystick per logic step. */
export function expand(plan: string, seed = 1, count = 0): number[] {
  const out: number[] = [];
  if (plan === 'rand') {
    const rnd = random(seed);
    while (out.length < count) {
      const k = 3 + Math.floor(rnd() * 40), j = stickOf(MOVES[Math.floor(rnd() * MOVES.length)] ?? '');
      for (let i = 0; i < k && out.length < count; i++) out.push(j);
    }
    return out;
  }
  for (const part of plan.split(',').filter(Boolean)) {
    const [j = '-', n = '1'] = part.split(':');
    for (let i = 0; i < Number(n); i++) out.push(j === '-' ? 0 : stickOf(j));
  }
  return out;
}


/** Places in the room with room for his 16 x 16 box and floor under his feet. */
export function freeSpots(w: World): { x: number; y: number }[] {
  const spots: { x: number; y: number }[] = [];
  for (let y = 8; y <= 0x70; y += 8) {
    for (let x = 16; x <= 224; x += 8) {
      let free = true;
      for (let dy = 0; dy < 16 && free; dy += 8) for (let dx = 0; dx < 16 && free; dx += 8) {
        const l = w.look(x + dx, y + dy);
        if (l.name !== 0 || l.code !== 0) free = false;
      }
      const floor = w.look(x + 4, y + 16).name !== 0 && w.look(x + 10, y + 16).name !== 0;
      if (free && floor) spots.push({ x, y });
    }
  }
  return spots;
}

export function freeSpot(room: number, seed: number): { x: number; y: number } {
  const spots = freeSpots(new World(ROOMS, WORLD_GRID, NO_ROOM, room));
  const rnd = random(seed * 977 + room);
  return spots[Math.floor(rnd() * spots.length)] ?? { x: 0x80, y: 0x68 };
}

/** What a tile name does to him, for finding places near each kind. */
export function kindOf(name: number, code: number): string | null {
  if (code >= 0x6d && code < 0x76) return 'animated';
  if (name === 0) return null;
  if (name < 6) return 'slip';
  if (name < 0x10) return 'spring';
  if (name < 0x16) return 'slow';
  if (name < 0x18) return 'stuck';
  if (name < 0x1c) return 'tube';
  if (name < 0x1f) return 'kick';
  if (name >= 0x64 && name < 0x69) return 'bounce';
  if (name >= 0x69 && name < 0x6f) return 'zap';
  if (name === 0x6f) return 'fire';
  if (name === 0x70) return 'burn';
  if (name >= 0xb4 && name < 0xd2) return 'oneway';
  if (name >= 0xdc) return 'deadly';
  return null;
}

export interface Target { kind: string; x: number; y: number; hold?: string }

/** Per room: the free spot nearest to a cell of each kind it has (a few cells of the kind, one of the nearest spots each), and one at each edge, holding the way out. */
export function targets(room: number, seed: number): Target[] {
  const w = new World(ROOMS, WORLD_GRID, NO_ROOM, room);
  const spots = freeSpots(w);
  const out: Target[] = [];
  if (spots.length === 0) return out;
  const rnd = random(seed * 7919 + room);
  const byKind = new Map<string, { x: number; y: number }[]>();
  for (let cy = 0; cy < 18; cy++) for (let cx = 0; cx < 32; cx++) {
    const l = w.look(cx * 8, cy * 8);
    const k = kindOf(l.name, l.code);
    if (k) byKind.set(k, [...(byKind.get(k) ?? []), { x: cx * 8, y: cy * 8 }]);
  }
  const nearest = (cells: { x: number; y: number }[]): { x: number; y: number } => {
    const c = cells[Math.floor(rnd() * cells.length)] ?? { x: 0, y: 0 };
    const sorted = [...spots].sort((a, b) => Math.abs(a.x - c.x) + Math.abs(a.y - c.y) - (Math.abs(b.x - c.x) + Math.abs(b.y - c.y)));
    return sorted[Math.floor(rnd() * Math.min(3, sorted.length))] ?? spots[0] ?? { x: 0x80, y: 0x68 };
  };
  // stage 3: next to each item, each enemy the room has, and the lift
  const at = (cell: number): { x: number; y: number } => ({ x: (cell % 32) * 8, y: Math.floor(cell / 32) * 8 });
  for (const it of TABLES.items) if (it.room === room) byKind.set('item', [...(byKind.get('item') ?? []), at(it.cell)]);
  for (let e = 0; e < 4; e++) {
    const b0 = ENEMY_ROOMS[room * 16 + e * 4] ?? 0, b1 = ENEMY_ROOMS[room * 16 + e * 4 + 1] ?? 0, b3 = ENEMY_ROOMS[room * 16 + e * 4 + 3] ?? 0;
    if ((b1 & 15) === 0 && b3 === 0xdf) continue;
    const k = `enemy${b1 & 15}`;
    byKind.set(k, [...(byKind.get(k) ?? []), { x: b0 & 0xf0, y: (b0 & 15) << 3 }]);
  }
  for (const l of LIFT_SITES) if (l.room === room) byKind.set('lift', [at(l.cell)]);
  for (const [kind, cells] of byKind) for (let i = 0; i < 2; i++) out.push({ kind, ...nearest(cells) });
  const edge = (kind: string, hold: string, key: (p: { x: number; y: number }) => number): void => {
    const best = [...spots].sort((a, b) => key(a) - key(b))[0];
    if (best) out.push({ kind, ...best, hold });
  };
  edge('edge-left', 'L', (p) => p.x); edge('edge-right', 'R', (p) => -p.x);
  edge('edge-up', 'UL', (p) => p.y); edge('edge-down', 'D', (p) => -p.y);
  return out;
}


// ---- the runs of a plan -----------------------------------------------------------------------

/** ROOM=n runs one room, ROOMS=a-b a range (of the sweep and kinds plans). */
export function roomRange(): { from: number; to: number } {
  if (process.env.ROOM !== undefined) return { from: Number(process.env.ROOM), to: Number(process.env.ROOM) };
  const [a, b] = (process.env.ROOMS ?? '').split('-').map(Number);
  return { from: a ?? 0, to: b ?? ROOMS.length - 1 };
}

/** One run of a plan: where Monty starts, what the stick does, what he carries and how far he has got. */
export interface PlannedRun {
  readonly label: string;
  /** What the run is for (a kind of tile, a delivery), for counting. */
  readonly kind: string;
  readonly room: number;
  readonly x: number;
  readonly y: number;
  readonly joys: readonly number[];
  readonly progress: number;
  readonly carry: readonly number[];
}

/** The rooms that want an item, with what they want and the progress they need (the `deliver` plan). */
const WANTED: readonly { room: number; carry: number[]; progress: number }[] = [
  { room: 0x16, carry: [0x0b], progress: 0 }, { room: 0x2c, carry: [0x0c], progress: 0 }, { room: 0x3e, carry: [7], progress: 0 },
  { room: 0x0b, carry: [4], progress: 0 }, { room: 0x4d, carry: [], progress: 0xc3 }, { room: 0x4d, carry: [], progress: 0x41 },
  { room: 0x1b, carry: [5], progress: 0 }, { room: 0x1c, carry: [5, 3], progress: 0 }, { room: 0x1d, carry: [5], progress: 0 },
  { room: 5, carry: [0x0a, 0x13], progress: 0 }, { room: 0x25, carry: [3, 0x13, 0x0a], progress: 0x40 },
];

/**
 * The runs of a plan: `sweep:N:seed` (one random player in each room), `kinds:N:seed` (next to every kind of tile,
 * item, enemy and lift, and at each edge), `deliver:N:seed` (into the rooms that want an item, from every side),
 * `rand:N:seed` (N random steps from `start`), `fly:N:seed[:a-b]` (each plane's room, boarding it in eight ways), or a scripted `joystick:steps` list from `start`.
 */
export function* plannedRuns(plan: string, start: { room: number; x: number; y: number }): Generator<PlannedRun> {
  const { from, to } = roomRange();
  const [kind, n = '120', seedArg = '1', roomsArg] = plan.split(':');
  const seed = Number(seedArg);
  if (kind === 'sweep') {
    for (let room = from; room <= Math.min(to, ROOMS.length - 1); room++) {
      const spot = freeSpot(room, seed);
      yield { label: `room ${room}`, kind: 'sweep', room, ...spot, joys: expand('rand', seed * 1000 + room, Number(n)), progress: 0, carry: CARRY };
    }
  } else if (kind === 'deliver') {
    let runs = 0;
    for (const w of WANTED) {
      const i = WORLD_GRID.indexOf(w.room);
      const sides: [number, string, (p: { x: number; y: number }) => number][] = [
        [i - 1, 'R', (p) => -p.x], [i + 1, 'L', (p) => p.x], [i - 16, 'D', (p) => -p.y], [i + 16, 'UL', (p) => p.y],
      ];
      for (const [j, hold, key] of sides) {
        const enter = WORLD_GRID[j];
        if (enter === undefined || enter === NO_ROOM) continue;
        const spots = freeSpots(new World(ROOMS, WORLD_GRID, NO_ROOM, enter));
        // (the three spots nearest the edge: a wall or a drop may stop the first; and one right at the edge, wherever that is)
        const edges: Record<string, { x: number; y: number }> = { R: { x: 0xe4, y: 0x60 }, L: { x: 8, y: 0x60 }, D: { x: 0x80, y: 0x78 }, UL: { x: 0x80, y: 8 } };
        for (const spot of [...[...spots].sort((a, b) => key(a) - key(b)).slice(0, 3), edges[hold] ?? { x: 0x80, y: 0x60 }]) {
          const joys = [...expand(`${hold}:${Math.floor(Number(n) / 3)}`), ...expand('rand', seed * 1000 + runs, Number(n))];
          runs++;
          yield { label: `into room ${w.room} from ${enter} (${hold}) carrying ${w.carry.join(',') || 'nothing'}, progress ${w.progress}`, kind: 'deliver', room: enter, ...spot, joys, progress: w.progress, carry: w.carry };
        }
      }
    }
  } else if (kind === 'fly') {
    // each room with a plane: standing at it, the Commodore key down (the stick held in four ways through the flight) with a ticket, and without
    let runs = 0;
    // (`fly:N:seed:a-b` limits it to the rooms a to b, as ROOMS does)
    const [lo = from, hi = to] = roomsArg ? roomsArg.split('-').map(Number) : [];
    for (const a of airports()) {
      if (a.room < lo || a.room > hi) continue;
      for (const [hold, carry] of [['', [0]], ['R', [0]], ['L', [0]], ['U', [0]], ['K', [0]], ['X', [0]], ['', []], ['', [0, 4]]] as const) {
        const joys = [...expand('-:2'), stickOf(`C${hold}`), ...expand('rand', seed * 1000 + runs, Number(n))];
        runs++;
        const how = hold === 'K' ? ' shooting the other plane down' : hold === 'X' ? ' shot down' : hold ? ` holding ${hold}` : '';
        yield { label: `flight from room ${a.room}${how}${carry.length ? ` with ticket${carry.length > 1 ? ' and more' : ''}` : ', no ticket'}`, kind: 'fly', room: a.room, x: a.x, y: a.y, joys, progress: 0, carry };
      }
    }
  } else if (kind === 'kinds') {
    let runs = 0;
    for (let room = from; room <= Math.min(to, ROOMS.length - 1); room++) {
      for (const t of targets(room, seed)) {
        const rnd = expand('rand', seed * 1000 + room * 31 + runs, Number(n));
        const third = Math.floor(Number(n) / 3);
        const joys = t.hold ? [...expand(`${t.hold}:${third}`), ...rnd.slice(third)] : rnd;
        runs++;
        yield { label: `room ${room} ${t.kind} at ${t.x},${t.y}`, kind: t.kind, room, x: t.x, y: t.y, joys, progress: 0, carry: CARRY };
      }
    }
  } else {
    const [, count = '1000', randSeed = '1'] = plan.split(':');
    const joys = kind === 'rand' ? expand('rand', Number(randSeed), Number(count)) : expand(plan);
    yield { label: plan, kind: 'plan', ...start, joys, progress: 0, carry: CARRY };
  }
}
