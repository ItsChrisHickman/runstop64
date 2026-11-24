/**
 * A bot that plays Do Svidaniya Monty: a breadth first search over the game's own frames (the stick held a few frames at a time:
 * walk, climb, jump, wait; the game copied at each step, its creatures, crushers, icicles and escalators part of where it is) from
 * where Monty is to a goal, and the route it finds played back on the game. Used by every region's test.
 *
 * The game's random numbers (the crushers' delays) come from Math.random; here they are a function of the game's own generator
 * state, so a game and its copy go on the same way and a route found on a copy is the route that plays.
 */
import { Game, type Input as Stick } from '../../../montyotr/src/game';
import { copy, frame, NONE, settled, type State } from '../../../montyotr/test/play';

/** Frames the stick is held for at a time. */
export const STEP = 4;

const move = (left: boolean, right: boolean, up: boolean, down: boolean, fire: boolean): Stick => ({ left, right, up, down, fire });
export const ACTIONS: readonly (readonly [string, Stick])[] = [
  ['<', move(true, false, false, false, false)], ['>', move(false, true, false, false, false)],
  ['^', move(false, false, true, false, false)], ['v', move(false, false, false, true, false)],
  ['.', NONE], ['J<', move(true, false, false, false, true)], ['J>', move(false, true, false, false, true)], ['J', move(false, false, false, false, true)],
];
const REST = ACTIONS[4] ?? ['.', NONE];

/** What happened in a few frames of play. */
export type Held = { dead: true } | { dead: false; room: number | null };

/** The treasure's event (6), pending or dispatched (6 - 1 | 0x80): the end of the game, the one event that is not a death. */
const TREASURE = [6, 5 | 0x80] as const;
/**
 * Whether a frame set a death going: the action counter went from nothing to an event other than the treasure's. The game dispatches an event at the end of the
 * frame that set it (1-7 becomes 0x80-0x86 in the same frame), so a pending event is never seen between frames: the change from 0 is what tells.
 */
export const diedIn = (before: number, after: number): boolean => before === 0 && after !== 0 && !TREASURE.some((t) => t === after);

/** Hold a stick for some frames. `room`: the room he has come into (settled there), if he has; dead: a death was set going. */
export function hold(s: State, stick: Stick, frames: number): Held {
  const prng = s.g.prng;
  Math.random = () => (((prng[0] ?? 0) * 7 + (prng[1] ?? 0) * 13 + (prng[2] ?? 0) * 31 + (prng[3] ?? 0) * 57 + 11) & 255) / 256;
  const room = s.g.roomId;
  for (let f = 0; f < frames; f++) {
    const before = s.g.actionCounter;
    frame(s, stick);
    if (diedIn(before, s.g.actionCounter) || (s.g.actionCounter && !(s.g.actionCounter & 0x80))) return { dead: true };
    if (s.g.roomId !== room) {
      for (let n = 0; n < 200 && !settled(s.g); n++) frame(s, NONE);
      return { dead: false, room: s.g.roomId };
    }
  }
  return { dead: false, room: null };
}

/** In open water (a swim room) places a few pixels apart count as one: a swimmer has too many ways for the search to tell every pixel (across, 8; up and down, 2: a stroke is 2 pixels, and a coarser key let the first stroke's place stand for the second's, so the search never went deeper). */
const swimBits = (g: Game): number => (g.data.swimRooms.includes(g.roomId) ? 2 : 0);

/** In a flight room a creature's place counts to 8 pixels (he cannot wait where he is: a creature's phase is what a path through it is made of). */
const flying = (g: Game): boolean => g.data.flights.some((f) => f.room === g.roomId);

/** Where he is and how, and roughly where the room's creatures, icicles and crushers are, for the search. */
export const keyOf = (g: Game): string => [
  g.roomId, g.x2 >> swimBits(g), g.y >> (swimBits(g) >> 1), g.onRope, g.montyAction, g.arcIdx, g.falling, g.facing >> 7, g.gameMode, g.esc.index, g.esc.t >> 3,
  ...g.enemies.map((e) => (flying(g) ? `${e.x >> 2}/${e.y >> 3}/${e.flags >> 7}` : `${e.x >> 4}/${e.y >> 4}/${e.flags >> 7}`)), g.pd.state, g.pd.index, g.pd.position >> 3, g.swimTick % 6, ...g.lavas.map((l) => l.t >> 3),
  ...g.ice.map((i) => `${i.state}${i.t >> 4}`), ...g.tunnels.filter((t) => !t.spec.harmless).map((t) => `${t.state}${t.left}${t.t >> 3}`), ...g.cracks.map((c) => `${c.stage}${c.t >> 3}`), ...g.pulses.filter((p, i, all) => all.findIndex((q) => q.t === p.t) === i).map((p) => `p${p.t >> 3}`), ...g.dragons.map((d) => `d${d.t >> 3}/${d.pos >> 3}/${d.dir}${d.mode}${d.left >> 3}${d.charging > 0 ? 'c' : ''}`), ...g.floats.flatMap((f) => { const e = g.data.floats[f.index]; return e?.bounce ? [`f${(f.t % (2 * (e.span.to - e.span.from + 1 - e.w + e.bounce.hold) * e.step)) >> 3}`] : []; }), g.flightTick % 2, g.flightResting, ...g.rollers.map((r) => `r${(r.t % (g.data.rollers[r.index]?.every ?? 360)) >> 3}`), ...g.vines.slice(0, 1).map((v) => `v${(v.t % 96) >> 3}`), g.lift.y, ...g.pursuers.map((p) => `a${p.awake ? 1 : 0}${p.gone}${p.x2 >> 1},${p.y >> 2}`), g.hold.pull, g.hold.warn >> 2, g.hold.watch, g.leverLatch ? 1 : 0, g.siCollected.join(''), g.coinCollected.join(''),
].join(',');

/** A route: what was held, in order. */
export type Route = readonly (readonly [name: string, frames: number])[];

interface Node { s: State; up: Node | null; step: readonly [string, number]; depth: number }

/** Whether the game has reached what is wanted. */
export type Goal = (g: Game) => boolean;

/** Where the search should head (playfield cell, in a room): it only guides the search, the goal says what counts. */
export interface Aim { room: number; col: number; row: number }

/** A binary heap of nodes by priority. */
class Heap {
  private readonly items: { f: number; node: Node }[] = [];
  get size() { return this.items.length; }
  push(f: number, node: Node) {
    const a = this.items;
    a.push({ f, node });
    for (let i = a.length - 1; i > 0;) {
      const p = (i - 1) >> 1;
      const up = a[p], me = a[i];
      if (!up || !me || up.f <= me.f) break;
      a[p] = me; a[i] = up; i = p;
    }
  }
  pop(): Node | null {
    const a = this.items, top = a[0], last = a.pop();
    if (!top || !last) return null;
    if (a.length) {
      a[0] = last;
      for (let i = 0; ;) {
        const l = 2 * i + 1, r = l + 1;
        let m = i;
        if (a[l] && a[l].f < (a[m]?.f ?? Infinity)) m = l;
        if (a[r] && a[r].f < (a[m]?.f ?? Infinity)) m = r;
        if (m === i) break;
        const x = a[i], y = a[m];
        if (!x || !y) break;
        a[i] = y; a[m] = x; i = m;
      }
    }
    return top.node;
  }
}

/** Whether some move keeps him alive for the next few frames (a goal reached in the jaws of a creature is not one reached). */
export function livesOn(s: State): boolean {
  return ACTIONS.some(([, stick]) => !hold({ g: copy(s.g), col: s.col }, stick, 3 * STEP).dead);
}

/** Steps (of STEP frames) it would take to get from where he is to the aim, at a pixel a frame: a guess that guides the search. */
function toAim(g: Game, aims: readonly Aim[]): number {
  const aim = aims.find((a) => a.room === g.roomId);
  if (!aim) return 60;
  const dx = Math.abs(g.x2 * 2 - (0x0c + (aim.col + 4) * 4) * 2), dy = Math.abs(g.y - (0x32 + (aim.row + 3) * 8));
  return (dx + dy) / STEP;
}

/**
 * A route (in steps of STEP frames) from `start` to a state where `goal` holds, or null within `limit` states. With an `aim` it
 * is a weighted A*: states nearer the aim are looked at first, so the route found is a good one, not always the shortest.
 * `stats.exhausted` says whether a null came from having looked at every state there is (so there is no way) or from the limit.
 */
export function search(start: State, goal: Goal, aim?: readonly Aim[], limit = 400000, weight = 1.5, stats?: { exhausted: boolean }): { route: Route; end: State; nodes: number } | null {
  const seen = new Set([keyOf(start.g)]);
  const heap = new Heap();
  heap.push(0, { s: start, up: null, step: ['', 0], depth: 0 });
  let nodes = 0;
  if (stats) stats.exhausted = false;
  for (let node = heap.pop(); node && nodes < limit; node = heap.pop()) {
    const acts = node.s.g.montyAction || node.s.g.falling || node.s.g.gameMode ? [REST] : ACTIONS;
    for (const [name, stick] of acts) {
      const t: State = { g: copy(node.s.g), col: node.s.col };
      const r = hold(t, stick, STEP);
      nodes++;
      if (r.dead) continue;
      const here: Node = { s: t, up: node, step: [name, STEP], depth: node.depth + 1 };
      if (goal(t.g) && livesOn(t)) {
        const route: [string, number][] = [];
        for (let n: Node | null = here; n && n.up; n = n.up) route.unshift([n.step[0], n.step[1]]);
        return { route, end: t, nodes };
      }
      const k = keyOf(t.g);
      if (seen.has(k)) continue;
      seen.add(k);
      heap.push(here.depth + (aim ? weight * toAim(t.g, aim) : 0), here);
    }
  }
  if (stats) stats.exhausted = heap.size === 0 && nodes < limit;
  return null;
}

/** Play a route on a game (copied: the game is not touched): the state it ends in, or null if he died on the way. */
export function play(start: State, route: Route): State | null {
  const s: State = { g: copy(start.g), col: start.col };
  for (const [name, frames] of route) {
    const stick = ACTIONS.find(([n]) => n === name)?.[1] ?? NONE;
    if (hold(s, stick, frames).dead) return null;
  }
  return s;
}

/** A new game as the front end starts one, settled in its first room. */
export function newGame(data: Game['data'], enhanced: boolean): State {
  const g = new Game(data);
  g.assist = { lives: enhanced, cloud: false, jetpack: false, c5: false, rooms: false, respawn: enhanced, hints: enhanced };
  g.start();
  const s: State = { g, col: 0 };
  for (let n = 0; n < 200 && (g.freeze || g.script); n++) frame(s, NONE);
  return s;
}
