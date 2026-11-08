/**
 * A player that plays the whole game, for the lockstep runs (test/playthrough.ts). It plays the rebuilt game on copies of itself (`Game.snapshot`), so every hazard (the
 * enemies' legs and relays, the crushers with their random waits, the floors, the gates, the falls) is the game's own and not a model of it, and finds the keys of every pass;
 * those keys are then pressed on the original, whose every pass is compared (test/lockstep-core.ts).
 *
 * It looks at *decisions*: places where Monty can start something (standing on the ground or a rope, not in a jump or a fall). From each, each of a handful of key sets
 * is tried for a pass (or a wait of several), and then nothing is pressed until the next decision (a jump and a fall are steered by nothing). Two decisions are the same
 * if Monty is in the same place facing the same way with the same flags at the same time modulo `phase` passes. Deaths are not paths.
 *
 * Two searches work together, as in Moley Christmas's bot. `Graph` maps the room for Monty alone (the game's own physics with the crusher and the enemies taken out, and
 * with no time: the first way to each decision) and says how many passes each decision is from a target. `search` then looks for the way in the game as it is, best first
 * by passes so far plus that distance, so that waiting for a crusher or an enemy to be out of the way is part of the path where the map says it must be.
 */
import { Game, type GameSnapshot } from '../src/game';
import { Key, portsFor } from '../src/controls';
import { KEYBOARD } from '../src/input';
import { Flag } from '../src/monty';
import { ROOMS } from '../src/data/rooms-data';
import { piecesOfRoom } from '../src/map';
import { STILL_THERE } from '../src/coal';

/** What is tried at a decision: a key set for one pass, or nothing pressed for so many passes. */
interface Move { readonly keys: number; readonly wait: number }
const MOVES: readonly Move[] = [
  { keys: 0, wait: 1 }, { keys: 0, wait: 8 }, { keys: Key.left, wait: 1 }, { keys: Key.right, wait: 1 }, { keys: Key.up, wait: 1 }, { keys: Key.down, wait: 1 },
  { keys: Key.jump, wait: 1 }, { keys: Key.jump | Key.left, wait: 1 }, { keys: Key.jump | Key.right, wait: 1 },
];

/** What a search wants: some coal pieces (any of them), the tool, the way on out of the room, the ending, or the gift of the opening scene. */
export type Target =
  | { readonly kind: 'pieces'; readonly ids: readonly number[] }
  | { readonly kind: 'tool' }
  | { readonly kind: 'room'; readonly room: number; /** he comes in at this y or higher (the way in at a height) */ readonly above?: number }
  | { readonly kind: 'ending' }
  | { readonly kind: 'gift' };

/** What happened in a pass, as far as a target is concerned. */
interface Events { readonly pieces: readonly number[]; readonly tool: boolean; readonly room: number; readonly y: number; readonly ending: boolean; readonly gift: boolean }

function met(t: Target, e: Events): boolean {
  switch (t.kind) {
    case 'pieces': return e.pieces.some((p) => t.ids.includes(p));
    case 'tool': return e.tool;
    case 'room': return e.room === t.room && e.y >= (t.above ?? 0);
    case 'ending': return e.ending;
    case 'gift': return e.gift;
  }
}

const STEP_CAP = 160;

/** What the game was doing, to say what a pass changed. */
class Watch {
  private flags: number[];
  private tool: boolean;
  private potWaits: number;
  constructor(private readonly g: Game) {
    this.flags = [...g.coal.flags];
    this.tool = (g.monty.flags & Flag.tool) !== 0;
    this.potWaits = g.opening.potWaits;
  }

  events(): Events {
    const g = this.g;
    const pieces: number[] = [];
    g.coal.flags.forEach((f, i) => { if (((this.flags[i] ?? 0) & STILL_THERE) !== 0 && (f & STILL_THERE) === 0) pieces.push(i); });
    this.flags = [...g.coal.flags];
    const tool = !this.tool && (g.monty.flags & Flag.tool) !== 0;
    this.tool = (g.monty.flags & Flag.tool) !== 0;
    const gift = this.potWaits === 1 && g.opening.potWaits === 0;
    this.potWaits = g.opening.potWaits;
    return { pieces, tool, room: g.room, y: g.monty.y, ending: g.outcome === 'ending', gift };
  }
}

/** A place Monty can decide at, as a number (without the time). */
function placeOf(g: Game): number {
  const m = g.monty;
  return m.x | (m.y << 8) | (m.facing << 16) | ((m.flags & (Flag.rope | Flag.tool)) << 17);
}

function isDecision(g: Game): boolean {
  const m = g.monty;
  return (m.flags & (Flag.falling | Flag.jumping)) === 0 && m.jumpDir === 0;
}

/** A path found: its keys and the game at its end. */
export interface Found {
  readonly keys: number[];
  readonly end: GameSnapshot;
}

/** One pass with `keys`, and whether it was lived through (no life lost, no end, nothing the original does differently). */
function live(g: Game, keys: number, lives: number): boolean {
  const outcome = g.pass(portsFor(keys));
  return g.lives === lives && (outcome === 'playing' || outcome === 'ending') && g.divergence === null;
}

/** A macro from the game as it is: the keys of its passes, the events on the way, and whether it ended at a decision or by leaving the room (not by death). */
interface Macro { readonly keys: number[]; readonly events: Events[]; /** at a decision (alive) */ readonly landed: boolean; /** he was in another room at some point */ readonly left: boolean }

function macro(g: Game, move: Move, room: number, lives: number): Macro {
  const watch = new Watch(g);
  const keys: number[] = [];
  const events: Events[] = [];
  let left = false;
  for (let i = 0; i < move.wait; i++) {
    const key = i === 0 ? move.keys : 0;
    keys.push(key);
    if (!live(g, key, lives)) return { keys, events, landed: false, left };
    events.push(watch.events());
    if (g.room !== room) left = true;
    if (i > 0 && !isDecision(g)) break;
  }
  while (!isDecision(g) && keys.length < STEP_CAP) { // (to the next decision, in the room he has come to if he has left)
    keys.push(0);
    if (!live(g, 0, lives)) return { keys, events, landed: false, left };
    events.push(watch.events());
    if (g.room !== room) left = true;
  }
  return { keys, events, landed: isDecision(g), left };
}

const hit = (target: Target, events: readonly Events[]): number => events.findIndex((e) => met(target, e));

/** The map of a room for Monty alone, and the passes from each of its decisions to a target. */
export class Graph {
  private readonly index = new Map<number, number>();
  private readonly edges: { from: number; to: number; cost: number; events: Events[] }[] = [];
  /** the decisions' places, in order of discovery */
  readonly places: number[] = [];

  constructor(start: GameSnapshot, limit: number) {
    const g = new Game();
    g.restore(start);
    for (const e of g.enemies.list) e.state = 3;
    g.crusher.fromBytes([0, 0, 0, 0, 1, 0]);
    g.field.screen.set(g.field.picture); // (what the enemies left on the screen is not there)
    const room = g.room, lives = g.lives;
    this.index.set(placeOf(g), 0);
    this.places.push(placeOf(g));
    const buckets: { at: number; snap: GameSnapshot }[][] = [[{ at: 0, snap: g.snapshot() }]];
    for (let cost = 0; cost < buckets.length && this.places.length < limit; cost++) {
      for (const item of buckets[cost] ?? []) {
        for (const move of MOVES) {
          g.restore(item.snap);
          g.divergence = null;
          const m = macro(g, move, room, lives);
          let to = -1;
          if (m.landed && !m.left) {
            const place = placeOf(g);
            const known = this.index.get(place);
            if (known !== undefined) to = known;
            else {
              to = this.places.length;
              this.index.set(place, to);
              this.places.push(place);
              const slot = cost + m.keys.length;
              while (buckets.length <= slot) buckets.push([]);
              buckets[slot]?.push({ at: to, snap: g.snapshot() });
            }
          }
          this.edges.push({ from: item.at, to, cost: m.keys.length, events: m.events });
        }
      }
      buckets[cost] = [];
    }
  }

  /** The passes from each decision to the target (Infinity where there is no way), by place. */
  distances(target: Target): Map<number, number> {
    const n = this.places.length;
    const dist = new Float64Array(n).fill(Infinity);
    const reverse: { from: number; cost: number }[][] = Array.from({ length: n }, () => []);
    for (const e of this.edges) {
      const at = hit(target, e.events);
      if (at >= 0) dist[e.from] = Math.min(dist[e.from] ?? Infinity, at + 1);
      if (e.to >= 0) reverse[e.to]?.push({ from: e.from, cost: e.cost });
    }
    // Dijkstra backwards, with the same heap the search uses
    const heap = new Heap();
    for (let i = 0; i < n; i++) if ((dist[i] ?? Infinity) < Infinity) heap.push({ f: dist[i] ?? 0, cost: 0, at: i, snap: null });
    while (heap.size > 0) {
      const top = heap.pop();
      if (top === undefined) break;
      if (top.f > (dist[top.at] ?? Infinity)) continue;
      for (const { from, cost } of reverse[top.at] ?? []) {
        const d = top.f + cost;
        if (d < (dist[from] ?? Infinity)) { dist[from] = d; heap.push({ f: d, cost: 0, at: from, snap: null }); }
      }
    }
    const out = new Map<number, number>();
    this.places.forEach((p, i) => { out.set(p, dist[i] ?? Infinity); });
    return out;
  }
}

interface Open {
  readonly f: number;
  readonly cost: number;
  readonly at: number;
  readonly snap: GameSnapshot | null;
}

/** A binary heap of open decisions, the smallest `f` first. */
class Heap {
  private readonly items: Open[] = [];
  get size(): number { return this.items.length; }
  push(item: Open): void {
    const a = this.items;
    a.push(item);
    for (let i = a.length - 1; i > 0;) {
      const up = (i - 1) >> 1;
      const parent = a[up];
      if (parent === undefined || parent.f <= item.f) break;
      a[i] = parent; a[up] = item; i = up;
    }
  }
  pop(): Open | undefined {
    const a = this.items;
    const top = a[0];
    const last = a.pop();
    if (top === undefined || last === undefined || a.length === 0) return top;
    a[0] = last;
    for (let i = 0;;) {
      const l = 2 * i + 1, r = l + 1;
      let m = i;
      if (l < a.length && (a[l]?.f ?? Infinity) < (a[m]?.f ?? Infinity)) m = l;
      if (r < a.length && (a[r]?.f ?? Infinity) < (a[m]?.f ?? Infinity)) m = r;
      if (m === i) break;
      const t = a[i], u = a[m];
      if (t === undefined || u === undefined) break;
      a[i] = u; a[m] = t; i = m;
    }
    return top;
  }
}

interface Node { readonly parent: number; readonly keys: readonly number[]; readonly time: number }

export class Planner {
  /** the time (in passes) a decision is placed at, modulo this, tells two apart */
  phase = 64;
  /** how many decisions a search may expand before it gives up; how many the map may have */
  limit = 60000;
  graphLimit = 40000;
  expanded = 0;
  private graph: { room: number; gates: number; graph: Graph } | null = null;

  /** `sim`: the game it plays on (a `SteadyGame` for the show's routes, so what is found on a copy is what the game does; the whole game's, with the original's seed). */
  constructor(readonly sim: Game) {
    this.sim.control = KEYBOARD;
  }

  private graphOf(): Graph {
    const g = this.sim;
    if (this.graph === null || this.graph.room !== g.room || this.graph.gates !== g.gates.flags) {
      const now = g.snapshot();
      const flags = g.gates.flags;
      const opening = (g.gates.flags & 1) !== 0;
      for (let i = 0; opening && i < 24; i++) g.pass(portsFor(0)); // (a gate opening: the map is of the room with it open)
      this.graph = { room: g.room, gates: flags, graph: new Graph(g.snapshot(), this.graphLimit) };
      g.restore(now);
    }
    return this.graph.graph;
  }

  /** The cheapest keys, from the game as it is, to the target (null when there are none within the limit). */
  find(target: Target): Found | null {
    let dist = this.graphOf().distances(target);
    if ((dist.get(placeOf(this.sim)) ?? Infinity) === Infinity && isDecision(this.sim)) {
      this.graph = null; // (the map was made for another place: make it again from here)
      dist = this.graphOf().distances(target);
    }
    return this.search(target, dist);
  }

  private search(target: Target, dist: ReadonlyMap<number, number>): Found | null {
    const g = this.sim;
    const start = g.snapshot();
    const nodes: Node[] = [{ parent: -1, keys: [], time: 0 }];
    const seen = new Set<number>();
    const open = new Heap();
    const h = (): number => dist.get(placeOf(g)) ?? 3000;
    open.push({ f: h(), cost: 0, at: 0, snap: start });
    const room = g.room, lives = g.lives;
    this.expanded = 0;
    for (let item = open.pop(); item !== undefined; item = open.pop()) {
      if (++this.expanded > this.limit) break;
      const parent = nodes[item.at];
      if (parent === undefined || item.snap === null) continue;
      for (const move of MOVES) {
        g.restore(item.snap);
        g.divergence = null; // (it is never part of a snapshot: a path that ended in one did not make the next one)
        const m = macro(g, move, room, lives);
        const reached = hit(target, m.events);
        if (reached >= 0 && m.landed) {
          const end = g.snapshot();
          if (this.survives(end, room, lives, 3)) return { keys: this.pathTo(nodes, item.at).concat(m.keys), end }; // (a goal he cannot live on from is no goal)
          continue;
        }
        if (!m.landed || m.left) continue;
        const time = parent.time + m.keys.length;
        const key = placeOf(g) + (time % this.phase) * 0x100000000;
        if (seen.has(key)) continue;
        seen.add(key);
        nodes.push({ parent: item.at, keys: m.keys, time });
        open.push({ f: item.cost + m.keys.length + h(), cost: item.cost + m.keys.length, at: nodes.length - 1, snap: g.snapshot() });
      }
    }
    g.restore(start);
    return null;
  }

  /** Whether there is a way to live on for a good while from `snap`: some move that is lived through to a decision, `depth` times over, or 40 passes of it. */
  private survives(snap: GameSnapshot, room: number, lives: number, depth: number): boolean {
    const g = this.sim;
    if (depth === 0) return true;
    for (const move of MOVES) {
      g.restore(snap);
      g.divergence = null;
      const m = macro(g, move, room, lives);
      if (!m.landed) continue;
      if (m.keys.length >= 40 || this.survives(g.snapshot(), room, lives, depth - 1)) return true;
    }
    return false;
  }

  private pathTo(nodes: readonly Node[], at: number): number[] {
    const out: number[][] = [];
    for (let n = at; n > 0; n = nodes[n]?.parent ?? -1) out.push([...(nodes[n]?.keys ?? [])]);
    return out.reverse().flat();
  }

  /** Make a found path the game's: the game goes to where it ended. */
  take(found: Found): void {
    this.sim.restore(found.end);
  }
}

/** The room each room's way on leads to, in the order the game is played (room 16 goes down into the pit and the castle; room 20's way on is the ending). */
export const NEXT_ROOM: readonly number[] = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21];

/** The coal pieces of room `id` still there in `g`. */
export function piecesLeft(g: Game, id: number): number[] {
  return piecesOfRoom(id).filter((p) => ((g.coal.flags[p] ?? 0) & STILL_THERE) !== 0);
}

/**
 * What a bot does with goals, one after another: the keys of everything it has reached so far (`keys`, the whole path), and what to do when a goal has no way: the room's tool
 * first (it kills what is in the way) and then the goal; or out of the room by another way and back in by one that comes in higher. `say` is told each step.
 */
export class Goals {
  readonly keys: number[] = [];
  constructor(readonly planner: Planner, private readonly say: (message: string) => void = () => {}) {}

  /** The nearest way to the target, taken; false if there is none within the planner's limit. */
  reach(what: string, target: Target): boolean {
    const found = this.planner.find(target);
    if (found === null) return false;
    this.planner.take(found);
    this.keys.push(...found.keys);
    this.say(`${what}: ${found.keys.length} passes (${this.planner.expanded} decisions looked at), ${this.keys.length} in all`);
    return true;
  }

  /** The target, or if there is no way, the room's tool first and then the target, or out of the room and back in higher; none of these: it throws. */
  must(what: string, target: Target): void {
    const sim = this.planner.sim;
    if (this.reach(what, target)) return;
    const tool = sim.object.frame !== 0 && (sim.monty.flags & Flag.tool) === 0;
    if (tool && this.reach(`${what}, with the tool: the tool`, { kind: 'tool' }) && this.reach(what, target)) return;
    // a place the room's own floor does not lead out of (a pit he has fallen into): out by a way into the next room and back in by another
    const here = sim.room;
    const exits = ROOMS[here]?.exits;
    for (const next of exits === undefined ? [] : [exits.left, exits.right, exits.up, exits.down]) {
      if (next === here || next === 0x2c || next > 20) continue;
      // (back in at the highest way in there is, then lower: where he comes in is where the room's upper parts are reached from)
      for (const above of [0xa0, 0x80, 0x60, 0x40, 0]) {
        if (sim.room === here && !this.reach(`${what}, by room ${next}: out`, { kind: 'room', room: next })) break;
        if (this.reach(`${what}, by room ${next}: and back in at y ${above}`, { kind: 'room', room: here, above }) && this.reach(what, target)) return;
      }
      if (sim.room !== here) break; // (out, and no way back: the end of this way)
    }
    throw new Error(`the bot found no way to ${what} in room ${sim.room} at x ${sim.monty.x} y ${sim.monty.y} after ${this.keys.length} passes (${this.planner.expanded} decisions looked at)`);
  }
}
