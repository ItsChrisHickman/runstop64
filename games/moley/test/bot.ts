/**
 * Players that play a room to its end, for the lockstep runs (test/playthrough.ts). They look at the rebuilt game (which is, pass
 * for pass, the original's state), plan, and press keys on the original.
 *
 * - `Distances` maps the room for Monty alone (his own physics, `src/monty.ts`, on the room's tiles as they are now: every place he
 *   can be and what he is doing there) and says how many passes each is from a goal.
 * - `search` plays on copies of the whole game, so the hazards (the walkers, the traffic, the pistons, the timers of the puzzle)
 *   are the game's own and not a model of them: every pass it tries every key, keeps the ways that live, and goes on from those
 *   nearest the goal (waiting, retreating and trying again are all among the moves).
 * - `Walker` follows what it finds, looking again whenever something differs.
 *
 * The copy of the game has its own random numbers; what depends on them (when a vehicle next comes, how long a piston waits) is
 * a guess, and the bot looks again at the real state every pass.
 */
import { press, type Spectrum } from '../../../tools/zx/spectrum';
import { Game, type GameSnapshot } from '../src/game';
import { KEYBOARD_KEYS } from '../src/input';
import { Key, Monty, type Outside } from '../src/monty';
import { SeededRandom } from '../src/random';
import type { Driver } from './lockstep-core';

/** The key combinations a player may press. */
export const MOVES: readonly number[] = [
  0, Key.right, Key.left, Key.up, Key.down, Key.jump, Key.jump | Key.right, Key.jump | Key.left,
  Key.up | Key.right, Key.up | Key.left, Key.down | Key.right, Key.down | Key.left,
];

/** What a player is after: a place for Monty, how the game says it is done, and places he must not go. */
export interface Goal {
  /** the places that count (the distances are measured to these, from the room's tiles alone) */
  region(x: number, y: number, state: number): boolean;
  /** whether the game, after a pass, has got there (when it is not simply Monty in the region: a lane changed, a thing touched) */
  done?(game: Game): boolean;
  /** a place he must not enter (the pit in room 2's floor) */
  forbidden?(x: number, y: number): boolean;
  /** once there, stay (and look after himself) instead of stopping */
  hold?: boolean;
}

/** Monty alone on the room's tiles: the same physics as in the game, nothing else. */
function aloneOn(game: Game): Monty {
  const world: Outside = { tiles: game.tiles, room: game.room, scriptFrame: 0, partnerX: 0, airSteering: false };
  return new Monty(world);
}

const encode = (m: Monty): number => m.x | (m.y << 8) | (m.state << 16) | (m.phase << 19) | (m.jumpKeys << 24);

/** Every place Monty can be (and what he is doing there), reached from where he is, with the passes each is from a goal. */
export class Distances {
  private readonly index = new Map<number, number>();
  private readonly toGoal: Int32Array;

  constructor(game: Game, goal: Goal, limit = 600000) {
    const m = aloneOn(game);
    const fly = game.room === 5;
    const start = game.monty;
    const codes: number[] = [];
    const states: { x: number; y: number; state: number; phase: number; jumpKeys: number }[] = [];
    const edges: number[] = []; // for state i and move k: the state reached (or -1), at i * MOVES.length + k
    const put = (n: { x: number; y: number; state: number; phase: number; jumpKeys: number }): void => {
      m.x = n.x; m.y = n.y; m.state = n.state; m.phase = n.phase; m.jumpKeys = n.jumpKeys;
      m.ropeUp = 0; m.ropeDown = 0;
    };
    const add = (): number => {
      const code = encode(m);
      const found = this.index.get(code);
      if (found !== undefined) return found;
      this.index.set(code, codes.length);
      codes.push(code);
      states.push({ x: m.x, y: m.y, state: m.state, phase: m.phase, jumpKeys: m.jumpKeys });
      return codes.length - 1;
    };
    put({ x: start.x, y: start.y, state: start.state, phase: start.phase, jumpKeys: start.jumpKeys });
    add();
    for (let at = 0; at < states.length && states.length < limit; at++) {
      const n = states[at];
      for (let k = 0; k < MOVES.length; k++) {
        const keys = MOVES[k];
        let to = -1;
        const allowed = fly ? (keys & Key.jump) === 0 : !((keys & (Key.up | Key.down)) !== 0 && (keys & (Key.left | Key.right)) !== 0);
        if (allowed) {
          put(n);
          m.pass(keys);
          if (goal.forbidden?.(m.x, m.y) !== true) to = add();
        }
        edges[at * MOVES.length + k] = to;
      }
    }
    // the passes from each place to a goal: backwards from the goals over the edges
    const count = states.length;
    const reverse: number[][] = Array.from({ length: count }, () => []);
    for (let i = 0; i < count; i++) for (let k = 0; k < MOVES.length; k++) { const to = edges[i * MOVES.length + k]; if (to !== undefined && to >= 0) reverse[to].push(i); }
    this.toGoal = new Int32Array(count).fill(-1);
    const queue: number[] = [];
    states.forEach((n, i) => { if (goal.region(n.x, n.y, n.state)) { this.toGoal[i] = 0; queue.push(i); } });
    for (let q = 0; q < queue.length; q++) {
      const i = queue[q];
      for (const from of reverse[i]) if (this.toGoal[from] < 0) { this.toGoal[from] = this.toGoal[i] + 1; queue.push(from); }
    }
  }

  /** The passes from Monty as he is to a goal, or Infinity (a place not reached from the start, or from which no goal can be). */
  from(m: Monty): number {
    const i = this.index.get(encode(m));
    if (i === undefined) return Infinity;
    const d = this.toGoal[i];
    return d < 0 ? Infinity : d;
  }
}

/** A game to try moves on: its own random numbers (see above). */
export function makeSim(seed = 1): Game { return new Game(new SeededRandom(seed)); }

/** One pass on the copy: whether Monty is alive and (unless he may leave) still in the room. */
function step(sim: Game, key: number, lives: number, room: number, mayLeave: boolean): boolean {
  const outcome = sim.pass(key);
  if (sim.lives < lives) return false;
  if (outcome !== 'playing') return mayLeave || outcome === 'ended';
  return sim.room === room || mayLeave;
}

/** Whether Monty lives through `keys`, starting from `from` on the copy `sim`. */
export function survives(sim: Game, from: GameSnapshot, keys: readonly number[], mayLeave = false): boolean {
  sim.restore(from);
  const lives = sim.lives, room = sim.room;
  return keys.every((k) => step(sim, k, lives, room, mayLeave));
}

interface Candidate { readonly parent: number; readonly key: number; readonly h: number; readonly code: number }
interface Branch { readonly snap: GameSnapshot; readonly keys: readonly number[] }

/**
 * Looking ahead on copies of the game: from `from`, for up to `horizon` passes, try every key from every branch alive, keep the
 * `beam` whose places are nearest a goal (a place is kept once a pass), and stop at a branch that reaches one. Returns the keys of
 * the branch that got nearest, or null if every key from the start is fatal.
 */
export function search(sim: Game, from: GameSnapshot, goal: Goal, dist: Distances, horizon: number, beam: number, mayLeave: boolean): number[] | null {
  sim.restore(from);
  const lives = sim.lives, room = sim.room;
  const fly = room === 5;
  let layer: Branch[] = [{ snap: from, keys: [] }];
  let best: Branch = layer[0];
  for (let t = 0; t < horizon; t++) {
    const found = new Map<number, Candidate>();
    for (let parent = 0; parent < layer.length; parent++) {
      for (const key of MOVES) {
        if (fly && (key & Key.jump) !== 0) continue;
        sim.restore(layer[parent].snap);
        if (!step(sim, key, lives, room, mayLeave)) continue;
        const m = sim.monty;
        if (sim.room !== room || (goal.done !== undefined ? goal.done(sim) : goal.region(m.x, m.y, m.state))) return [...layer[parent].keys, key];
        const code = encode(m);
        if (found.has(code)) continue;
        found.set(code, { parent, key, h: dist.from(m), code });
      }
    }
    if (found.size === 0) break;
    const chosen = [...found.values()].sort((p, q) => p.h - q.h).slice(0, beam);
    layer = chosen.map((c) => {
      sim.restore(layer[c.parent].snap);
      step(sim, c.key, lives, room, mayLeave);
      return { snap: sim.snapshot(), keys: [...layer[c.parent].keys, c.key] };
    });
    best = layer[0];
  }
  return best.keys.length === 0 ? null : [...best.keys];
}

/** Press the keys of one pass on the original (the keyboard). */
export function pressKeys(m: Spectrum, keys: number): void {
  const names: [number, string][] = [
    [Key.right, KEYBOARD_KEYS.right], [Key.left, KEYBOARD_KEYS.left], [Key.up, KEYBOARD_KEYS.up], [Key.down, KEYBOARD_KEYS.down], [Key.jump, KEYBOARD_KEYS.jump],
  ];
  for (const [bit, key] of names) press(m, key, (keys & bit) !== 0);
}

/** What the bot expects of Monty after the keys it has pressed. */
interface Expect { x: number; y: number; state: number }

/** Follows what `search` finds to a goal, looking again when something differs or the way ahead turns fatal. */
export class Walker implements Driver {
  private queue: number[] = [];
  private expect: Expect | null = null;
  private readonly sim: Game;
  private dist: Distances | null = null;
  private lastGoal: Goal | null = null;
  /** for the report: searches made, passes spent waiting, times no way was found */
  plans = 0;
  waited = 0;
  stuck = 0;

  constructor(
    private readonly goal: () => Goal | null,
    private readonly horizon = 120,
    private readonly mayLeave = false,
    private readonly beam = 120,
    private readonly lookahead = 14,
    /** the copy to try moves on: another kind of game (the ending's, whose random numbers are those of the game it plays: src/steady.ts) makes plans that hold */
    sim: Game = makeSim(),
  ) {
    this.sim = sim;
  }

  /** Already there: stand still if that is safe, otherwise the move that is. */
  private hold(snap: GameSnapshot): number {
    this.queue = [];
    const rest = Array<number>(this.lookahead).fill(0);
    const choices = [0, ...MOVES.filter((k) => k !== 0)];
    this.expect = null;
    for (const key of choices) {
      if (survives(this.sim, snap, [key, ...rest], this.mayLeave)) return key;
    }
    return 0;
  }

  /** The keys of the next pass (`choose` presses them on the original; the ending's route finder plays them on the rebuilt game alone). */
  keys(g: Game): number {
    const goal = this.goal();
    if (goal === null) { this.queue = []; this.expect = null; return 0; }
    const mon = g.monty;
    if (goal !== this.lastGoal) { this.lastGoal = goal; this.dist = null; this.queue = []; }
    if (this.expect !== null && (this.expect.x !== mon.x || this.expect.y !== mon.y || this.expect.state !== mon.state)) this.queue = [];
    const snap = g.snapshot();
    if (this.queue.length > 0 && !survives(this.sim, snap, this.queue.slice(0, this.lookahead), this.mayLeave)) this.queue = [];
    if (goal.hold === true && goal.region(mon.x, mon.y, mon.state)) return this.hold(snap);
    if (this.queue.length === 0) {
      if (this.dist === null || this.dist.from(mon) === Infinity) this.dist = new Distances(g, goal);
      this.plans++;
      const found = search(this.sim, snap, goal, this.dist, this.horizon, this.beam, this.mayLeave);
      if (found === null) { this.stuck++; this.expect = null; return 0; }
      this.queue = found;
    }
    const key = this.queue[0] ?? 0;
    this.queue.shift();
    if (key === 0) this.waited++;
    this.sim.restore(snap);
    this.sim.pass(key);
    this.expect = { x: this.sim.monty.x, y: this.sim.monty.y, state: this.sim.monty.state };
    return key;
  }

  choose(m: Spectrum, g: Game): void { pressKeys(m, this.keys(g)); }
}
