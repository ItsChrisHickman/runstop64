/**
 * A small lab for proving Dragonskulle's rules by running its code (re/README.md, "Rules the game never
 * explains"): a machine to play on, the native port or the original (the 6502 code on c64kit's C64),
 * from the same state, driven by the same inputs and the same pokes; places to stand; a stone thrown
 * at what walks along the far bank.
 *
 * A `Player` is one machine: `step` plays a frame with the joystick directions held, `place` puts
 * Pendragon's sprite where it says (as the game keeps it, $341D/$341E, and in the VIC's registers),
 * `ram` and `vic` are read and written freely (kept alive, parked creatures).
 */
import fs from 'node:fs';
import { C64, unpackState, type MachineState } from '../../../../packages/c64kit/src/c64/machine';
import { NativeHost } from '../../../shared/native/host';
import { must } from '../../../shared/test/must';
import { readRoute } from '../../../shared/test/data';
import { port } from '../../src/native';
import { go, location } from '../../src/travel';
import { BRIDGES, DRAGONS, FRAMES_A_SECOND } from '../../src/rules';

export { FRAMES_A_SECOND };
export const UP = 1, DOWN = 2, LEFT = 4, RIGHT = 8, FIRE = 16;
/** The actions (the hand, $12EB): the shovel, the cloak, pause, the stone, jump. */
export const ACTION = { shovel: 0, cloak: 1, stone: 3, jump: 4 } as const;

export interface Player {
  readonly ram: Uint8Array;
  readonly vic: Uint8Array;
  /** One frame with these joystick directions held (UP, DOWN, LEFT, RIGHT, FIRE), kept alive. */
  step(held: number): void;
  /** Pendragon's sprite at (x, y) (x below 256, or `high`: 256 more). */
  place(x: number, y: number, high?: boolean): void;
  /** The machine as it is (native: at the main loop's wait, as the front end saves it; the original: its snapshot). */
  save(): MachineState;
}

/** Kept alive, as the recorded routes were found: full energy, all five lives, nothing still to take. */
export const alive = (r: Uint8Array) => { r[0x1248] = 0; r[0x123e] = 0x14; r[0x3432] = 0; };

function placeAt(ram: Uint8Array, vic: Uint8Array, x: number, y: number, high: boolean) {
  ram[0x341d] = x; ram[0x341e] = y;
  vic[0x04] = x; vic[0x05] = y; vic[0x10] = high ? vic[0x10] | 4 : vic[0x10] & ~4;
}

export function native(s: MachineState): Player & { readonly host: NativeHost } {
  const host = NativeHost.resume(port, s);
  const { ram, vic } = host.m;
  return {
    host, ram, vic,
    step(held) { host.m.joy1 = host.m.joy2 = 0x1f & ~held; host.m.keys = []; host.tick(); alive(ram); },
    place: (x, y, high = false) => placeAt(ram, vic, x, y, high),
    save: () => must(host.save(), 'a save at the main loop wait'),
  };
}

export function original(s: MachineState): Player {
  const m = new C64();
  m.loadState(s);
  return {
    ram: m.ram, vic: m.vic,
    step(held) { m.joy1 = m.joy2 = 0x1f & ~held; m.keys = []; if (!m.runFrame()) throw new Error('the original stopped'); alive(m.ram); },
    place: (x, y, high = false) => placeAt(m.ram, m.vic, x, y, high),
    save: () => m.saveState(),
  };
}

/** Both machines, from the same state: how a rule is proved (the native port) and checked (the original). */
export const MACHINES = [{ name: 'native', make: native }, { name: 'original', make: original }] as const;

// ---- a state to start from ------------------------------------------------------------------------------
const title = () => unpackState(new Uint8Array(fs.readFileSync('games/dragonskulle/assets/dragonskulle-title.state')));
let deep: MachineState | null = null;
/** A state well into the game (the end of a recorded route, in the caves), standing still. */
function deepState(): MachineState {
  if (deep) return deep;
  const route = readRoute('games/dragonskulle/re/routes.json', 5);
  const g = new NativeHost(port, title());
  for (let i = 0; i < route.length; i += 2) for (let k = 0; k < route[i + 1]; k++) {
    g.m.joy1 = g.m.joy2 = route[i] & 0x1f; g.m.keys = route[i] & 32 ? [[1, 2]] : [];
    g.tick(); alive(g.m.ram);
  }
  for (let k = 0; k < 120; k++) { g.m.joy1 = g.m.joy2 = 0x1f; g.tick(); alive(g.m.ram); }
  deep = must(g.save(), 'the route end');
  return deep;
}

/** The first `frames` of a recorded route, from the title: the state there. */
export function routeState(index: number, frames: number): MachineState {
  const route = readRoute('games/dragonskulle/re/routes.json', index);
  const g = new NativeHost(port, title());
  let frame = 0;
  for (let i = 0; i < route.length; i += 2) for (let k = 0; k < route[i + 1]; k++) {
    if (frame >= frames) return must(g.save(), 'a save');
    g.m.joy1 = g.m.joy2 = route[i] & 0x1f; g.m.keys = route[i] & 32 ? [[1, 2]] : [];
    g.tick(); alive(g.m.ram); frame++;
  }
  return must(g.save(), 'a save');
}

/**
 * The island's screen (x, y) as the game comes onto it, by its own change of screen (travel, as the
 * map does it: src/travel.ts), his sprite where the game puts him on coming in from below: a state to
 * play from, a few frames in.
 */
export function enter(cx: number, cy: number, from: MachineState = deepState()): MachineState {
  const p = native(from);
  const at = must(location(p.ram, p.vic), 'a clean place to leave from');
  at[0] = cx; at[1] = cy; at[3] = 0x70; at[4] = 0x99;
  if (!go(p.ram, at)) throw new Error(`could not go to ${cx},${cy}`);
  for (let k = 0; k < 5; k++) p.step(0);
  return p.save();
}

/** Facing up (two frames of up, then back to where he stood): a stone thrown now goes up and to the right. */
export function faceUp(p: Player, x: number, y: number) {
  for (let i = 0; i < 2; i++) p.step(UP);
  p.place(x, y);
}

/** The sprite n as the VIC has it: on, x (with its high bit), y. */
export function sprite(p: { ram: Uint8Array; vic: Uint8Array }, n: number) {
  const bit = 1 << n;
  return { on: (p.vic[0x15] & bit) !== 0, x: p.vic[n * 2] | (p.vic[0x10] & bit ? 256 : 0), y: p.vic[n * 2 + 1] };
}

export const hex = (n: number, w = 2) => n.toString(16).padStart(w, '0');
export const cellOf = (r: Uint8Array) => `${r[0x20a8]},${r[0x20a9]}`;

// ---- the places the rules are in ------------------------------------------------------------------------
/**
 * A river screen with wizards (the blocks at $6000, rooms 3 and 4, and $CD50, room 5): the hooded
 * figure on the far bank (sprite 5), the skull that floats across the river (sprite 1), the insect (sprite 4),
 * the unseen skull at the bridge's foot (sprite 6). Each block keeps its own variables.
 */
export interface River {
  readonly room: number;
  readonly cell: readonly [number, number];
  /** The kills counted for this bridge, how many open it ($FF once they have), and where the count is kept. */
  readonly counter: number;
  readonly need: number;
  /** The wizard's state (2: struck by a stone), the skull's, the insect's, the foot's hurt flag. */
  readonly wizard: number;
  readonly skull: number;
  readonly insect: number;
  readonly hurt: number;
  /** The wizard's side of the screen: 0 coming from the left, 1 from the right. */
  readonly side: number;
}
const bridge = (room: number) => must(BRIDGES.find((b) => b.room === room), `a bridge in room ${room}`);
export const RIVERS: readonly River[] = [
  { ...bridge(3), cell: [4, 6], wizard: 0x6b69, skull: 0x6b88, insect: 0x6b90, hurt: 0x6b74, side: 0x6b6b },
  { ...bridge(4), cell: [13, 6], wizard: 0x6b69, skull: 0x6b88, insect: 0x6b90, hurt: 0x6b74, side: 0x6b6b },
  { ...bridge(5), cell: [9, 11], wizard: 0x6add, skull: 0x6afa, insect: 0x6b02, hurt: 0x6ae6, side: 0x6adf },
];
/** The four dragons' screens (block $D870, rooms 6-9): the flag that the dragon is dead, kept for good. */
export interface DragonRoom { readonly room: number; readonly cell: readonly [number, number]; readonly flag: number }
const DRAGON_CELLS: Record<number, readonly [number, number]> = { 6: [4, 5], 7: [13, 5], 8: [9, 10], 9: [9, 22] };
export const DRAGON_ROOMS: readonly DragonRoom[] = DRAGONS.map((d) => ({ ...d, cell: must(DRAGON_CELLS[d.room], `a cell for room ${d.room}`) }));

/** Where he stands to throw (a stone thrown facing up flies up and to the right from beside him). */
export const STAND = { x: 0x40, y: 0xa3 };

/**
 * One throw at a time at the wizard walking along the far bank (sprite 5, y $60), from STAND, facing up: a
 * stone takes 47 frames to reach his height ($6A) from the throw, 2 pixels a frame sideways from 74 pixels
 * right of him, and the wizard walks a pixel a frame (turning round now and then, at random), so a throw
 * is made when he is as far left or right of that place as the throw's time. Returns the frames played
 * until the counter next changes (or `limit`): 0 if it did not.
 */
export function kill(p: Player, river: River, limit = 4000, extra: (r: Uint8Array) => void = () => {}): number {
  const r = p.ram, before = r[river.counter];
  let prev = -1, dir = 1;
  for (let f = 0; f < limit; f++) {
    r[0x12eb] = ACTION.stone;
    r[river.skull] = 0; r[river.insect] = 0; r[river.hurt] = 0;
    extra(r);
    p.place(STAND.x, STAND.y);
    const w = sprite(p, 5);
    if (w.on && prev >= 0 && w.x !== prev) dir = Math.sign(w.x - prev);
    const fire = w.on && w.y < 120 && r[0x1fef] === 0 && Math.abs(w.x + dir * 47 - (STAND.x + 74)) <= 6;
    prev = w.on ? w.x : -1;
    p.step(fire ? FIRE : 0);
    if (r[river.counter] !== before) return f + 1;
  }
  return 0;
}

/**
 * A way to a place, found by playing: best-first over where he stands (his sprite, the way he faces,
 * the screen), the stick held `hold` frames a move, `every` run before each frame (parking what would
 * hurt him), the places nearer the goal by `score` (lower) tried first. `path` is the moves, or null; `exhausted` says
 * the search ran out of places (there is none), rather than out of `maxNodes` moves.
 */
export interface Walk { path: number[] | null; exhausted: boolean; nodes: number }
export function walkTo(start: MachineState, goal: (r: Uint8Array) => boolean, every: (p: Player) => void, o: { hold?: number; maxNodes?: number; stay?: (r: Uint8Array) => boolean; score?: (r: Uint8Array) => number } = {}): Walk {
  const hold = o.hold ?? 3, maxNodes = o.maxNodes ?? 40000, score = o.score ?? (() => 0);
  const moves = [UP, DOWN, LEFT, RIGHT];
  const key = (r: Uint8Array) => `${r[0x341d]},${r[0x341e] >> 1},${r[0x2292]},${r[0x20a8]},${r[0x20a9]}`;
  const first = native(start);
  const seen = new Set<string>([key(first.ram)]);
  const open: { state: MachineState; path: number[]; score: number }[] = [{ state: start, path: [], score: score(first.ram) }];
  let nodes = 0;
  while (open.length && nodes < maxNodes) {
    // the best place so far (a linear scan: the lists are short next to the moves' cost)
    let best = 0;
    for (let i = 1; i < open.length; i++) if (open[i].score < open[best].score) best = i;
    const n = open.splice(best, 1)[0];
    for (const m of moves) {
      const p = native(n.state);
      for (let i = 0; i < hold; i++) { every(p); p.step(m); }
      nodes++;
      if (goal(p.ram)) return { path: [...n.path, m], exhausted: false, nodes };
      if (o.stay && !o.stay(p.ram)) continue;
      const k = key(p.ram);
      if (seen.has(k)) continue;
      seen.add(k);
      open.push({ state: p.save(), path: [...n.path, m], score: score(p.ram) });
    }
  }
  return { path: null, exhausted: open.length === 0, nodes };
}

/** The title snapshot's machine state (the game as it starts). */
export function titleState(): MachineState {
  return title();
}
