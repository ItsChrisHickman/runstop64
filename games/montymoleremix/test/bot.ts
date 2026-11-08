/**
 * The passability bot of Wanted: Monty Mole Remix (docs/montymole-remix-plan.md, "Tests"): from each way into a room to each way out of
 * it, to every piece of coal and to the tool, on the remix's own physics and the remix's own frames.
 *
 * Two searches work together (as the faithful game's bot does). `RoomGraph` maps the room for Monty alone: the shared physics (the very
 * calls `RemixGame.moveMonty` makes) on the room's cells with the gates open and the retractable floor wherever it ever is, no creatures
 * and no crusher, no time; every state he can be in, the moves between them (a key held a few frames, then whatever the jump or the fall
 * does on its own), and the coal, the tool and the exits those moves touch. From that, how many frames each state is from a goal.
 * `search` then looks for the way in the game as it is, A* over copies of the game (the creatures' legs and relays, the crusher with its
 * random waits, the floor, the gates are the game's own), by frames so far plus that distance, so waiting for a creature or the crusher
 * to be out of the way is part of the path where the map says it must be.
 */
import { ROOMS } from '../../montymole/src/data/rooms-data';
import { GATES } from '../../montymole/src/gates';
import { ROOM_COLS, ROOM_ROWS } from '../../montymole/src/room';
import { jumpArc } from '../../montyotr/src/data';
import type { MontyBody, MontyInput, MontyWorld } from '../../shared/monty/body';
import { montyCol, montyRow } from '../../shared/monty/body';
import { applyMonty, decideMonty } from '../../shared/monty/physics';
import { PLAY_COL, PLAY_ROW } from '../../shared/monty/screen';
import { cellRow, coalCells, wantedMonty } from '../src/coords';
import { HOME_COL, HOME_ROW, PIT_ROOM, PIT_Y, RemixGame } from '../src/game';
import { STILL_THERE } from '../../montymole/src/coal-rules';
import { portsFor } from '../../montymole/src/controls';
import { Game as Faithful } from '../../montymole/src/game';
import { Flag } from '../../montymole/src/monty';
import { Graph as FaithfulGraph, type Target as FaithfulTarget } from '../../montymole/test/bot';
import { copyPlay } from './bot-copy';
import { type Play, NONE, step } from './harness';

// ---- the moves ------------------------------------------------------------------------------------------------------------

/** A move: keys held for some frames (fire on the first), then nothing pressed while he is in the air (a jump and a fall are steered by nothing). */
export interface Move { readonly name: string; readonly stick: MontyInput; readonly frames: number; readonly fire: boolean }
const hold = (name: string, keys: Partial<MontyInput>, frames: number, fire = false): Move => ({ name, stick: { ...NONE, ...keys }, frames, fire });
export const MOVES: readonly Move[] = [
  hold('<4', { left: true }, 4), hold('<1', { left: true }, 1), hold('>4', { right: true }, 4), hold('>1', { right: true }, 1),
  hold('^4', { up: true }, 4), hold('^1', { up: true }, 1), hold('v4', { down: true }, 4), hold('v1', { down: true }, 1),
  hold('.4', {}, 4), hold('.1', {}, 1),
  // (long ones: riding a ferry the length of a lake, or waiting for a creature, in a few moves)
  hold('<16', { left: true }, 16), hold('>16', { right: true }, 16), hold('>64', { right: true }, 64), hold('.16', {}, 16), hold('.64', {}, 64),
  hold('J<', { left: true }, 1, true), hold('J>', { right: true }, 1, true), hold('J', {}, 1, true),
];
const AIR_CAP = 150;
/** What a state the map does not know costs over the state it came from, in frames of distance. */
const UNKNOWN = 8;
/** How much the map's distance counts against the frames so far (a way is a way: not the shortest in frames, the sooner found the better). */
const WEIGHTS: readonly (readonly [number, number])[] = [[3, 0.15], [1.5, 0.35], [1, 0.5]];

/** What runs a move: Monty alone, or the whole game. */
interface Runner {
  frame(stick: MontyInput): void;
  airborne(): boolean;
  /** dead, or out of the room */
  halted(): boolean;
}

/** The frames a move takes; it stops early where the runner is halted. */
function runMove(r: Runner, m: Move): number {
  let n = 0;
  for (let i = 0; i < m.frames && !r.halted(); i++) {
    r.frame(i === 0 && m.fire ? { ...m.stick, fire: true } : m.stick);
    n++;
  }
  for (let i = 0; i < AIR_CAP && !r.halted() && r.airborne(); i++) { r.frame(NONE); n++; }
  return n;
}

// ---- Monty alone ----------------------------------------------------------------------------------------------------------

/** What a goal is, as a bit of the tags a move touches: a piece of the room's coal (0-4), the tool (5), a way out (6 + up, down, left, right). */
const TOOL_BIT = 5, EXIT_BIT = 6;
/** The way out into room 16 low enough to be lifted into the castle (the pit): a tag of its own, so that the map leads to it and not to the room's other ways out. */
const LIFT_BIT = 10;
const DIRECTIONS = ['up', 'down', 'left', 'right'] as const;
export type Direction = (typeof DIRECTIONS)[number];
const TOOL_REACH = 12;

export interface RoomFacts {
  readonly room: number;
  /** the class of each of the 32 x 20 cells as the physics reads them, gates open, the floor wherever it is */
  readonly props: Uint8Array;
  /** the same with what moves and holds him up (the retractable floor, the ferries, the crusher) wherever it ever is, in a room that has any */
  readonly withMovers: Uint8Array | null;
  /** where the room's coal is (cell, in the room's own rows), by piece number */
  readonly pieces: readonly { readonly id: number; readonly col: number; readonly row: number }[];
  readonly tool: { readonly x: number; readonly y: number } | null;
}

/** Monty alone in a room: the physics' body and world, the tags he touches. */
class Walker implements MontyBody, MontyWorld {
  input: MontyInput = { ...NONE };
  inputFire = false;
  x2 = 0; y = 0; facing = 1; frameIndex = 0; stepGate = 0; montyAction = 0; falling = 0; arcIdx = 0;
  savedLeft = false; savedRight = false; onRope = 0; isMoving = false;
  dirLeft = false; dirRight = false; dirUp = false; dirDown = false;
  upSteps = 0; downSteps = 0; animTimer = 1; ticker = 0xff; stateCur = 0; statePrev = 0;
  gameMode = 0; actionCounter = 0; mapRow = HOME_ROW; exitCol = HOME_COL; roomExit = 0;
  /** the tags touched in the move so far, and whether he died */
  tags = 0;
  private readonly rooms: RemixGame;

  constructor(private readonly facts: RoomFacts) {
    this.rooms = new RemixGame();
    this.rooms.roomId = facts.room;
  }

  flagAt(row: number, col: number): number {
    const r = row - PLAY_ROW;
    if (r < 0 || r >= ROOM_ROWS || col < 2 || col > 37) return 0;
    const c = Math.min(ROOM_COLS - 1, Math.max(0, col - PLAY_COL));
    return this.facts.props[r * ROOM_COLS + c] ?? 0;
  }

  roomAt(row: number, col: number): number { return this.rooms.roomAt(row, col); }

  frame(stick: MontyInput): void {
    this.input = stick;
    this.inputFire = stick.fire;
    decideMonty(this, this, { arc: jumpArc, canJump: true, onJump() {} });
    applyMonty(this, this);
    this.touch();
  }

  airborne(): boolean { return this.falling !== 0 || this.montyAction !== 0; }
  halted(): boolean { return this.actionCounter !== 0 || this.roomExit !== 0; }
  get dead(): boolean { return this.actionCounter !== 0; }

  /** The coal and the tool he is touching, as the game takes them (`coalCells`, `takeTool`'s 12 pixels), and the way out he has taken. */
  private touch(): void {
    const m = wantedMonty(this.x2, this.stepGate, this.y);
    const cells = coalCells(m);
    this.facts.pieces.forEach((p, i) => { if (cells.includes(p.row * ROOM_COLS + p.col)) this.tags |= 1 << i; });
    if (this.facts.tool !== null) {
      if (Math.abs(m.x - this.facts.tool.x) < TOOL_REACH && Math.abs(m.y - this.facts.tool.y) < TOOL_REACH) this.tags |= 1 << TOOL_BIT;
    }
    if (this.roomExit !== 0) {
      const dr = this.mapRow - HOME_ROW, dc = this.exitCol - HOME_COL;
      this.tags |= 1 << (EXIT_BIT + (dr < 0 ? 0 : dr > 0 ? 1 : dc < 0 ? 2 : 3));
      if (this.rooms.roomAt(this.mapRow, this.exitCol) === PIT_ROOM && m.y < PIT_Y) this.tags |= 1 << LIFT_BIT;
    }
  }

  /** The physics' state (what the next frame depends on), as a number. */
  key(): number {
    let k = this.x2 * 2 + this.stepGate;
    k = k * 256 + this.y;
    k = k * 256 + this.montyAction;
    k = k * 2 + (this.falling !== 0 ? 1 : 0);
    k = k * 256 + this.arcIdx;
    k = k * 4 + (this.savedLeft ? 1 : 0) + (this.savedRight ? 2 : 0);
    return k * 2 + this.onRope;
  }

  save(): number[] {
    return [this.x2, this.stepGate, this.y, this.montyAction, this.falling, this.arcIdx, this.savedLeft ? 1 : 0, this.savedRight ? 1 : 0, this.onRope, this.facing];
  }

  load(b: readonly number[]): void {
    [this.x2, this.stepGate, this.y, this.montyAction, this.falling, this.arcIdx] = [b[0] ?? 0, b[1] ?? 0, b[2] ?? 0, b[3] ?? 0, b[4] ?? 0, b[5] ?? 0];
    this.savedLeft = b[6] === 1;
    this.savedRight = b[7] === 1;
    this.onRope = b[8] ?? 0;
    this.facing = b[9] ?? 1;
    this.actionCounter = 0;
    this.roomExit = 0;
    this.mapRow = HOME_ROW;
    this.exitCol = HOME_COL;
    this.tags = 0;
  }

  /** Monty as a game has him. */
  static of(facts: RoomFacts, g: RemixGame): Walker {
    const w = new Walker(facts);
    w.load([g.x2, g.stepGate, g.y, g.montyAction, g.falling, g.arcIdx, g.savedLeft ? 1 : 0, g.savedRight ? 1 : 0, g.onRope, g.facing]);
    return w;
  }
}

/** A binary heap of numbers with payloads, smallest first. */
class Heap<T> {
  private readonly items: { p: number; v: T }[] = [];
  get size(): number { return this.items.length; }
  push(p: number, v: T): void {
    const a = this.items;
    a.push({ p, v });
    let i = a.length - 1;
    while (i > 0) {
      const up = (i - 1) >> 1;
      const x = a[i], y = a[up];
      if (x === undefined || y === undefined || y.p <= x.p) break;
      a[i] = y; a[up] = x; i = up;
    }
  }
  pop(): { p: number; v: T } | undefined {
    const a = this.items;
    const top = a[0], last = a.pop();
    if (top === undefined || last === undefined) return top;
    if (a.length > 0) {
      a[0] = last;
      let i = 0;
      for (;;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        const cur = a[m], lc = a[l], rc = a[r];
        if (lc !== undefined && cur !== undefined && lc.p < cur.p) m = l;
        const best = a[m];
        if (rc !== undefined && best !== undefined && rc.p < best.p) m = r;
        if (m === i) break;
        const x = a[i], y = a[m];
        if (x === undefined || y === undefined) break;
        a[i] = y; a[m] = x; i = m;
      }
    }
    return top;
  }
}

/** The map of a room for Monty alone: his states, the moves between them, the goals those touch, and the frames each state is from a goal. */
export class RoomGraph {
  private readonly ids = new Map<number, number>();
  private readonly bodies: (readonly number[])[] = [];
  /** per state: flat triples (to or -1, frames, tags) */
  private readonly edges: number[][] = [];
  private readonly queue: number[] = [];
  private readonly walker: Walker;
  private readonly cache = new Map<number, Int32Array>();
  constructor(readonly facts: RoomFacts) { this.walker = new Walker(facts); }

  get size(): number { return this.bodies.length; }

  /** A state the search may begin at (an arrival); explored with the rest. */
  addStart(g: RemixGame): void {
    const w = Walker.of(this.facts, g);
    this.add(w.key(), w.save());
  }

  private add(key: number, body: readonly number[]): number {
    const known = this.ids.get(key);
    if (known !== undefined) return known;
    const id = this.bodies.length;
    this.ids.set(key, id);
    this.bodies.push(body);
    this.edges.push([]);
    this.queue.push(id);
    this.cache.clear();
    return id;
  }

  /** Every state he can come to from the starts (up to `cap` states). */
  explore(cap = 600000): void {
    const w = this.walker;
    while (this.queue.length > 0 && this.bodies.length < cap) {
      const id = this.queue.pop();
      if (id === undefined) break;
      const body = this.bodies[id];
      if (body === undefined) continue;
      for (const m of MOVES) {
        w.load(body);
        const frames = runMove(w, m);
        if (w.dead) continue;
        const out = this.edges[id];
        if (w.roomExit !== 0) { out?.push(-1, frames, w.tags); continue; }
        const to = this.add(w.key(), w.save());
        if (to === id && w.tags === 0) continue;
        out?.push(to, frames, w.tags);
      }
    }
  }

  /** Every state's body (for looking at the map). */
  eachBody(f: (b: readonly number[]) => void): void { this.bodies.forEach((b) => { f(b); }); }

  /** Every state reachable from the state with this key. */
  reachableFrom(key: number, f: (b: readonly number[]) => void): void {
    const start = this.ids.get(key);
    if (start === undefined) return;
    const seen = new Set<number>([start]);
    const stack = [start];
    for (let at = stack.pop(); at !== undefined; at = stack.pop()) {
      const body = this.bodies[at];
      if (body !== undefined) f(body);
      const out = this.edges[at] ?? [];
      for (let i = 0; i < out.length; i += 3) {
        const to = out[i] ?? -1;
        if (to >= 0 && !seen.has(to)) { seen.add(to); stack.push(to); }
      }
    }
  }

  /** The id of the state a key is, or -1. */
  idOf(key: number): number { return this.ids.get(key) ?? -1; }

  /** For each state, the frames to touch the goal bit (a large number where he cannot). */
  distances(bit: number): Int32Array {
    const cached = this.cache.get(bit);
    if (cached !== undefined) return cached;
    const INF = 1 << 29;
    const dist = new Int32Array(this.bodies.length).fill(INF);
    const back: number[][] = this.bodies.map(() => []);
    const heap = new Heap<number>();
    this.edges.forEach((out, from) => {
      for (let i = 0; i < out.length; i += 3) {
        const to = out[i] ?? -1, cost = out[i + 1] ?? 0, tags = out[i + 2] ?? 0;
        if (to >= 0) back[to]?.push(from, cost);
        if ((tags & (1 << bit)) !== 0 && cost < (dist[from] ?? INF)) { dist[from] = cost; heap.push(cost, from); }
      }
    });
    for (let top = heap.pop(); top !== undefined; top = heap.pop()) {
      if (top.p > (dist[top.v] ?? INF)) continue;
      const preds = back[top.v] ?? [];
      for (let i = 0; i < preds.length; i += 2) {
        const from = preds[i] ?? 0, cost = preds[i + 1] ?? 0;
        if (top.p + cost < (dist[from] ?? INF)) { dist[from] = top.p + cost; heap.push(top.p + cost, from); }
      }
    }
    this.cache.set(bit, dist);
    return dist;
  }

  /** The frames from the state with this key to the goal (null where the map has no way, or does not know the state). */
  from(key: number, bit: number): number | null {
    const id = this.ids.get(key);
    if (id === undefined) return null;
    const d = this.distances(bit)[id] ?? 0;
    return d >= 1 << 29 ? null : d;
  }

  /** Whether the goal can be reached from the state at all. */
  reaches(g: RemixGame, bit: number): boolean { return this.from(Walker.of(this.facts, g).key(), bit) !== null; }
}

// ---- the room as the physics reads it, for the map -------------------------------------------------------------------------

/** What the map of a room is made of: the room's cells with the gates open, with no floor, and with the floor wherever it ever is (a room that has one is mapped both ways). */
export function factsOf(g: RemixGame): RoomFacts {
  const data = ROOMS[g.roomId];
  if (data === undefined) throw new Error(`no room ${g.roomId}`);
  const props = new Uint8Array(ROOM_COLS * ROOM_ROWS);
  g.room.cells.forEach((code, at) => { props[at] = code >= 1 && code <= 8 ? g.tileProps[code - 1] ?? 0 : 0; });
  // the gates open (the pieces that open them are the room's goals too: the map does not wait for them)
  for (const gate of GATES) {
    if (gate.room !== g.roomId) continue;
    const top = cellRow(gate.y);
    for (let k = 0; k < gate.cells; k++) props[(top + k) * ROOM_COLS + gate.column] = 0;
  }
  // what moves and holds him up (the retractable floor, the ferries that fly along the lakes, the crusher's head), wherever it is in a whole cycle
  let withMovers: Uint8Array | null = null;
  const probe = new RemixGame();
  probe.copyFrom(g);
  probe.graceActive = () => true;
  const floorRow = g.floor.present ? cellRow(g.floor.b[1] ?? 0) : -1;
  const floorTile = g.room.floorCode !== 0 ? g.tileProps[g.room.floorCode - 1] ?? 2 : 2;
  const union = props.slice();
  let more = false;
  for (let i = 0; i < 6000; i++) {
    probe.tickWorld();
    if (floorRow >= 0 && g.room.floorCode !== 0) {
      for (let c = 0; c < ROOM_COLS; c++) if (probe.cells[floorRow * ROOM_COLS + c] === g.room.floorCode && union[floorRow * ROOM_COLS + c] === 0) { union[floorRow * ROOM_COLS + c] = floorTile; more = true; }
    }
    for (const held of [probe.creatureProp, probe.crusherProp]) held.forEach((p, at) => { if (p !== 0 && union[at] === 0) { union[at] = p; more = true; } });
  }
  if (more) withMovers = union;
  const pieces = g.room.coal;
  const tool = data.object.sprite !== 0 ? { x: data.object.x, y: data.object.y } : null;
  return { room: g.roomId, props, withMovers, pieces, tool };
}

/** The map of a room: one graph, or two where the room has a retractable floor (the floor is there and it is not: the map has the ways of both). */
export class RoomMap {
  private readonly graphs: RoomGraph[];
  constructor(readonly facts: RoomFacts) {
    this.graphs = [new RoomGraph(facts)];
    if (facts.withMovers !== null) this.graphs.push(new RoomGraph({ ...facts, props: facts.withMovers }));
  }
  get size(): number { return this.graphs.reduce((n, m) => n + m.size, 0); }
  addStart(g: RemixGame): void { for (const m of this.graphs) m.addStart(g); }
  explore(): void { for (const m of this.graphs) m.explore(); }
  /** The frames from where a game is to the goal bit, the fewest of the maps (null: none of them has a way). */
  from(g: RemixGame, bit: number): number | null {
    const key = Walker.of(this.facts, g).key();
    let best: number | null = null;
    for (const m of this.graphs) {
      const d = m.from(key, bit);
      if (d !== null && (best === null || d < best)) best = d;
    }
    return best;
  }
  reaches(g: RemixGame, bit: number): boolean { return this.from(g, bit) !== null; }
  /** How many states he can come to from where a game is (the room's whole map is `size`). */
  reachableSize(g: RemixGame): number {
    let n = 0;
    this.eachBodyFrom(g, () => { n++; });
    return n;
  }
  eachBody(f: (b: readonly number[]) => void): void { for (const m of this.graphs) m.eachBody(f); }
  /** The states reachable from where a game is. */
  eachBodyFrom(g: RemixGame, f: (b: readonly number[]) => void): void { for (const m of this.graphs) m.reachableFrom(Walker.of(this.facts, g).key(), f); }
}

// ---- the game, played and copied --------------------------------------------------------------------------------------------

/** What a search is after. */
export type Goal =
  | { readonly kind: 'piece'; readonly id: number }
  | { readonly kind: 'tool' }
  | { readonly kind: 'exit'; readonly direction: Direction; /** into the castle by the pit: room 16 entered low (`PIT_Y`) */ readonly lift?: true };

export const goalName = (goal: Goal): string => goal.kind === 'piece' ? `coal ${goal.id}` : goal.kind === 'tool' ? 'the tool' : `out ${goal.direction}${goal.lift === true ? ' low (the pit)' : ''}`;

/** The bit of the map's tags a goal is. */
export function bitOf(facts: RoomFacts, goal: Goal): number {
  if (goal.kind === 'tool') return TOOL_BIT;
  if (goal.kind === 'exit') return goal.lift === true ? LIFT_BIT : EXIT_BIT + DIRECTIONS.indexOf(goal.direction);
  return facts.pieces.findIndex((p) => p.id === goal.id);
}

/** A game running the frames of a play: for `runMove`. */
class Running implements Runner {
  loads: number;
  readonly lives: number;
  constructor(readonly p: Play) { this.loads = p.g.roomLoads; this.lives = p.g.lives; }
  frame(stick: MontyInput): void { step(this.p, stick); }
  airborne(): boolean { return this.p.g.falling !== 0 || this.p.g.montyAction !== 0; }
  halted(): boolean { return this.p.g.actionCounter !== 0 || this.p.g.roomLoads !== this.loads || this.p.g.lives < this.lives || this.p.g.finished !== null; }
}

/** The state of the world as a string: the creatures, the crusher, the floor and the generator (everything but Monty that the next frame depends on). */
function worldKey(g: RemixGame): string {
  const parts: number[] = [g.frameToggle, g.crusher.y, g.crusher.wait, g.crusher.direction, g.wanted.seed, g.coal.taken, g.carrying ? 1 : 0, g.entities.length];
  for (const e of g.creatures) parts.push(e.state, e.x, e.y, e.dir, e.counter, e.legs, e.left, e.step);
  parts.push(...g.floor.b);
  return parts.join(',');
}

function playKey(g: RemixGame): string {
  return [g.x2 * 2 + g.stepGate, g.y, g.montyAction, g.falling, g.arcIdx, g.savedLeft ? 1 : 0, g.savedRight ? 1 : 0, g.onRope, worldKey(g)].join(',');
}

export interface Found {
  /** the frames of the way, how many states were looked at */
  readonly frames: number;
  readonly expanded: number;
  /** the game just after the goal was met (for a way out: in the next room, as he is put there) */
  readonly play: Play;
}

/** A way into a room that is not wanted (a place already had). */
export type Refuse = (g: RemixGame) => boolean;

export interface Failed { readonly expanded: number; readonly why: 'none' | 'budget'; readonly deaths: number; readonly nearest: number; /** ways out found that he would not stay in */ readonly rejected: number }

/** Whether a game has met a goal (a piece taken, the tool carried, the room left by a way). */
function met(g: RemixGame, goal: Goal, loads: number): boolean {
  switch (goal.kind) {
    case 'piece': return !g.coal.isThere(goal.id);
    case 'tool': return g.carrying;
    case 'exit': return g.roomLoads > loads && g.enteredBy === DIRECTIONS.indexOf(goal.direction) && (goal.lift !== true || g.roomId === PIT_ROOM + 1);
  }
}

/** Games no longer wanted, to be copied into again (a game is 17 KB and a search makes millions of copies). */
const POOL: Play[] = [];
/** A copy of a play. */
const clone = (p: Play): Play => copyPlay(p, POOL.pop());
/** A play the search has done with. */
const release = (p: Play): void => { if (POOL.length < 5000) POOL.push(p); };

/**
 * Whether the way into a room leaves him somewhere to be: a landing he lives through (a jump and a fall are steered by nothing, so a way in
 * over something fatal is no way in) and, from it, a moment of 60 frames in the room with something to hold him that some move or none
 * gets him through alive; not dropped straight back out of it by the way he came. A short search of its own (200 states at most).
 */
function viable(p: Play): boolean {
  const heap: { p: Play; frames: number }[] = [{ p: clone(p), frames: 0 }];
  const loads = p.g.roomLoads, lives = p.g.lives;
  const rest = hold('.20', {}, 20);
  const tries = [...MOVES, rest]; // (the rest last: the last pushed is the first looked at)
  for (let looked = 0; looked < 200; looked++) {
    const top = heap.pop();
    if (top === undefined) return false;
    for (const m of tries) {
      const next = clone(top.p);
      const run = new Running(next);
      const frames = runMove(run, m);
      const g = next.g;
      if (g.actionCounter !== 0 || g.lives < lives || g.finished !== null || g.roomLoads !== loads) continue;
      const total = top.frames + frames;
      if (total >= 60 && !run.airborne()) return true;
      if (total < 200) heap.push({ p: next, frames: total });
    }
  }
  return false;
}

/** A* over copies of the game from `start`, by frames so far plus the map's distance (0 where the map does not know the state). */
export function search(start: Play, graph: RoomMap, goal: Goal, budget = 40000, frameCap = 4000, refuse?: Refuse): Found | Failed {
  // (greedy first: a way is a way; where it is led into a dead end, less greedy, then the shortest in frames)
  let spent = 0, deaths = 0, nearest = Infinity, rejected = 0;
  for (const [weight, share] of WEIGHTS) {
    const r = searchWith(start, graph, goal, Math.floor(budget * share), frameCap, weight, refuse);
    if ('play' in r) return { ...r, expanded: spent + r.expanded };
    spent += r.expanded;
    deaths += r.deaths;
    nearest = Math.min(nearest, r.nearest);
    rejected += r.rejected;
    if (r.why === 'none') return { expanded: spent, why: 'none', deaths, nearest, rejected };
  }
  return { expanded: spent, why: 'budget', deaths, nearest, rejected };
}

/** One A* over copies of the game, the map's distance counting `weight` times. */
function searchWith(start: Play, graph: RoomMap, goal: Goal, budget: number, frameCap: number, weight: number, refuse?: Refuse): Found | Failed {
  const stays = (p: Play): boolean => goal.kind !== 'exit' || ((refuse === undefined || !refuse(p.g)) && viable(p));
  const facts = graph.facts;
  const bit = bitOf(facts, goal);
  /** The map's distance, or where the map does not know the state (on the crusher, say) as far as where it came from, and a little more. */
  const h = (g: RemixGame, from: number): number => (bit < 0 ? 0 : graph.from(g, bit) ?? from + UNKNOWN);
  const loads = start.g.roomLoads;
  const heap = new Heap<{ p: Play; frames: number; h: number }>();
  const seen = new Set<string>();
  const first = clone(start);
  const h0 = h(first.g, 0);
  heap.push(weight * h0 * 4096, { p: first, frames: 0, h: h0 });
  seen.add(playKey(first.g));
  let expanded = 0, deaths = 0, nearest = Infinity, rejected = 0;
  for (let top = heap.pop(); top !== undefined; top = heap.pop()) {
    if (expanded >= budget) return { expanded, why: 'budget', deaths, nearest, rejected };
    expanded++;
    for (const m of MOVES) {
      const next = clone(top.v.p);
      const run = new Running(next);
      const frames = runMove(run, m);
      const g = next.g;
      if (g.actionCounter !== 0 || g.lives < run.lives || g.finished !== null) {
        deaths++;
        release(next);
        continue;
      }
      if (met(g, goal, loads)) {
        if (stays(next)) return { frames: top.v.frames + frames, expanded, play: next };
        rejected++;
        release(next);
        continue;
      }
      const total = top.v.frames + frames;
      if (g.roomLoads !== loads || total > frameCap) { release(next); continue; } // out of the room by another way, or too long
      const here = h(g, top.v.h);
      nearest = Math.min(nearest, here);
      const key = playKey(g);
      if (seen.has(key)) { release(next); continue; }
      seen.add(key);
      heap.push((total + weight * here) * 4096 - total, { p: next, frames: total, h: here }); // (of equal worth, the deeper first)
    }
    release(top.v.p);
  }
  return { expanded, why: 'none', deaths, nearest, rejected };
}

/** How long Monty stands where he arrived before a search is tried again from there (frames; the world is periodic, and a search that waits for it inside itself cannot tell its time-shifted states apart). */
const PRE_WAITS: readonly number[] = [24, 48, 72, 96, 120, 144, 168, 192, 216, 240, 264, 288];

/**
 * `search`, and where it comes to nothing, again from the same place after Monty has stood there for a while (`PRE_WAITS`), each with a share of the
 * budget. A way that waits for something with a long period (a picket that comes by every 288 frames) is a way the search finds in a few states once
 * the wait is made, and in none within a budget when it has to find the wait among every place he could be at every time.
 */
function searchWaiting(start: Play, graph: RoomMap, goal: Goal, budget = 40000, refuse?: Refuse): Found | Failed {
  const plain = search(start, graph, goal, budget, undefined, refuse);
  // (a search that has been through every state there is, and found none, has nothing to wait for: only one that ran out of budget is tried again)
  if ('play' in plain || plain.why !== 'budget') return plain;
  let spent = plain.expanded, deaths = plain.deaths, rejected = plain.rejected, nearest = plain.nearest;
  for (const wait of PRE_WAITS) {
    const p = clone(start);
    const run = new Running(p);
    for (let i = 0; i < wait && !run.halted(); i++) run.frame(NONE);
    if (run.halted()) { release(p); break; }
    const r = search(p, graph, goal, Math.floor(budget / PRE_WAITS.length), undefined, refuse);
    spent += r.expanded;
    if ('play' in r) return { ...r, frames: r.frames + wait, expanded: spent };
    deaths += r.deaths; rejected += r.rejected; nearest = Math.min(nearest, r.nearest);
    release(p);
  }
  return { expanded: spent, why: plain.why, deaths, nearest, rejected };
}

/** `searchWaiting`, and where the plain way does not come to the goal, by the room's tool first (it lets one touch of a creature kill the creature, so it opens the way past a guard). */
export function find(start: Play, map: RoomMap, goal: Goal, budget?: number, refuse?: Refuse): Found | Failed {
  const plain = searchWaiting(start, map, goal, budget, refuse);
  if ('play' in plain || map.facts.tool === null || goal.kind === 'tool') return plain;
  const tool = search(start, map, { kind: 'tool' }, budget);
  if (!('play' in tool)) return plain;
  const then = searchWaiting(tool.play, map, goal, budget, refuse);
  return 'play' in then ? { ...then, frames: then.frames + tool.frames, expanded: plain.expanded + tool.expanded + then.expanded } : then;
}

// ---- the rooms, one after another --------------------------------------------------------------------------------------------

/** Every piece except this room's taken: the gates of the rooms are open where the count reaches them, and this room's coal is all to be had. */
export function normaliseCoal(g: RemixGame, room: number): void {
  const mine = new Set((ROOMS[room]?.coal ?? []).map((k) => k.id));
  g.coal.flags.forEach((f, id) => { g.coal.flags[id] = mine.has(id) ? f | STILL_THERE : f & ~STILL_THERE; });
}

/** The game as he arrives in a room (the way out of the room before took him there, in whatever state he was in: a jump goes on), with the coal as `normaliseCoal` has it and the room loaded again for it. */
export function arrive(p: Play, room: number): Play {
  const q = clone(p);
  normaliseCoal(q.g, room);
  q.g.roomId = room;
  q.g.loadRoom();
  return q;
}

/** The goals a room has, from where a game is in it. */
export function goalsOf(g: RemixGame, facts: RoomFacts): Goal[] {
  const goals: Goal[] = facts.pieces.map((p): Goal => ({ kind: 'piece', id: p.id }));
  if (facts.tool !== null) goals.push({ kind: 'tool' });
  const to: Record<Direction, [number, number]> = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] };
  // (a way that leads back into the same room is a wall of the room as far as the game goes: the original's table has it for the rooms with no way there)
  for (const d of DIRECTIONS) {
    const dest = g.roomAt(HOME_ROW + to[d][0], HOME_COL + to[d][1]);
    if (dest !== 0xff && dest !== facts.room) goals.push({ kind: 'exit', direction: d });
  }
  return goals;
}

/** The room's map as text: `o` where Monty can have his top left cell, `#` solid, `=` a ledge, `|` a rope, `~` hazard, the digits the coal (the piece's number mod 10), for looking at what a map reaches. */
export function ascii(map: RoomMap, from?: RemixGame): string[] {
  const seen = new Set<number>();
  const mark = (b: readonly number[]): void => { const probe = { x2: b[0] ?? 0, y: b[2] ?? 0 }; seen.add((montyRow(probe) - PLAY_ROW) * ROOM_COLS + (montyCol(probe) - PLAY_COL)); };
  if (from === undefined) map.eachBody(mark);
  else map.eachBodyFrom(from, mark);
  const facts = map.facts;
  const lines: string[] = [];
  for (let r = 0; r < ROOM_ROWS; r++) {
    let line = '';
    for (let c = 0; c < ROOM_COLS; c++) {
      const at = r * ROOM_COLS + c;
      const piece = facts.pieces.find((k) => k.row === r && k.col === c);
      const prop = facts.props[at] ?? 0;
      line += piece !== undefined ? String(piece.id % 10) : seen.has(at) ? (prop === 3 ? '!' : 'o') : prop === 1 ? '#' : prop === 2 ? '=' : prop === 3 ? '|' : prop === 4 ? '~' : '.';
    }
    lines.push(line);
  }
  return lines;
}

// ---- the faithful game, for what the remix may not do better ---------------------------------------------------------------

/** Where the faithful game would lead from a goal: the room a way out goes to. */
function faithfulTarget(g: RemixGame, goal: Goal): FaithfulTarget | null {
  if (goal.kind === 'piece') return { kind: 'pieces', ids: [goal.id] };
  if (goal.kind === 'tool') return { kind: 'tool' };
  const to = { up: [-1, 0], down: [1, 0], left: [0, -1], right: [0, 1] }[goal.direction];
  const dest = g.roomAt(HOME_ROW + to[0], HOME_COL + to[1]);
  return dest === 0xff ? null : { kind: 'room', room: dest };
}

/**
 * Whether the faithful game (Wanted as it was, on the Spectrum's physics) can get Monty from where he is in a room to a goal: the
 * same kind of map, the same moves. A way the remix does not have is a failure of the remix only if the original has it.
 */
export function faithfulCan(g: RemixGame, goal: Goal): boolean {
  const m = wantedMonty(g.x2, g.stepGate, g.y);
  const game = new Faithful();
  game.place(g.roomId, Math.min(0xe8, Math.max(4, m.x)), Math.min(0xb0, Math.max(0x23, m.y)));
  // (let him come to rest: the map starts from a place he can decide at)
  for (let i = 0; i < 80 && (game.monty.flags & (Flag.falling | Flag.jumping)) !== 0; i++) game.pass(portsFor(0));
  const target = faithfulTarget(g, goal);
  if (target === null) return false;
  const graph = new FaithfulGraph(game.snapshot(), 80000);
  const start = graph.places[0];
  return start !== undefined && (graph.distances(target).get(start) ?? Infinity) < Infinity;
}
