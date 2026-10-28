/**
 * Better layouts, and what they cannot beat, for re/layout.ts's problem: rooms on places, each exit (left, right, up, down) drawn
 * if the room it leads to is one step that way. `improve` is a simulated annealing over the places; `lowerBound` is a count of
 * loops of exits that cannot all be drawn. Nothing here knows the game: it is exits in, places out.
 */
import { random, STEP, type Exits, type Place } from './layout';

/** The exits as constraints: [from, direction, to, what leaving it undrawn costs]: a way there and back three, times `weight`. */
export function constraints(rooms: ReadonlyMap<number, Exits>, weight: (a: number, b: number) => number): [number, number, number, number][] {
  const out: [number, number, number, number][] = [];
  for (const [a, exits] of [...rooms].sort(([p], [q]) => p - q)) {
    exits.forEach((b, k) => {
      if (b === a || !rooms.has(b)) return;
      out.push([a, k, b, (rooms.get(b)?.[[1, 0, 3, 2][k]] === a ? 3 : 1) * weight(a, b)]);
    });
  }
  return out;
}

export interface Improved {
  at: Map<number, Place>;
  links: [number, number, number][];
  size: { w: number; h: number };
  cost: number;
}

/** What a move that breaks an exit among the held rooms costs: more than all the rest together. */
const HELD = 100000;
/** What each cell of the sheet costs, so that of two layouts as cheap the smaller wins. */
const AREA = 0.02;

/**
 * Simulated annealing over the places. It starts from `from` (a layout) and moves a room, or that room with the rooms joined to
 * it by drawn exits (cut at some of them), to where one of its exits asks to put it (a step from the room it leads to, or from
 * the room that leads to it). A move is kept if the links cost less, or a little more while the search is warm. The sheet stays
 * within `maxW` x `maxH`. Exits among rooms `held` says so of (the start area) are never given up.
 */
export function improve(
  rooms: ReadonlyMap<number, Exits>, from: ReadonlyMap<number, Place>, weight: (a: number, b: number) => number,
  opts: { seed: number; steps: number; maxW: number; maxH: number; held: (a: number, b: number) => boolean },
): Improved {
  const ids = [...rooms.keys()].sort((p, q) => p - q), index = new Map(ids.map((n, i) => [n, i] as const));
  const n = ids.length, rnd = random(opts.seed);
  const px = new Int32Array(n), py = new Int32Array(n);
  ids.forEach((id, i) => {
    const p = from.get(id);
    if (!p) throw new Error(`room ${id} has no place`);
    px[i] = p[0]; py[i] = p[1];
  });
  const slot = (id: number) => {
    const i = index.get(id);
    if (i === undefined) throw new Error(`room ${id} unknown`);
    return i;
  };
  const edges = constraints(rooms, weight).map(([a, k, b, c]) => ({ a: slot(a), k, b: slot(b), c: opts.held(a, b) ? c + HELD : c }));
  const incident: number[][] = ids.map(() => []);
  edges.forEach((e, i) => { incident[e.a].push(i); incident[e.b].push(i); });
  const OFF = 512, cellKey = (x: number, y: number) => (x + OFF) * 1024 + (y + OFF);
  const occupied = new Map<number, number>();
  for (let i = 0; i < n; i++) occupied.set(cellKey(px[i], py[i]), i);
  const met = (i: number) => { const e = edges[i]; return px[e.b] === px[e.a] + STEP[e.k][0] && py[e.b] === py[e.a] + STEP[e.k][1]; };
  let cost = 0;
  edges.forEach((e, i) => { if (!met(i)) cost += e.c; });
  const bounds = () => {
    let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
    for (let i = 0; i < n; i++) { x0 = Math.min(x0, px[i]); x1 = Math.max(x1, px[i]); y0 = Math.min(y0, py[i]); y1 = Math.max(y1, py[i]); }
    return { w: x1 - x0 + 1, h: y1 - y0 + 1, x0, y0 };
  };
  const energy = (c: number, s: { w: number; h: number }) => c + AREA * s.w * s.h;
  let size = bounds();
  let best = { cost, size, x: Int32Array.from(px), y: Int32Array.from(py) };
  const inSet = new Int32Array(n).fill(-1), set: number[] = [], touched = new Set<number>();
  for (let step = 0; step < opts.steps; step++) {
    const T = 1.6 * Math.pow(0.02 / 1.6, step / opts.steps); // warm to cold
    const r = Math.floor(rnd() * n), inc = incident[r];
    let dx: number, dy: number, other = -1;
    if (inc.length) {
      const e = edges[inc[Math.floor(rnd() * inc.length)]];
      other = e.a === r ? e.b : e.a;
      if (other === r) continue;
      dx = (e.a === r ? px[e.b] - STEP[e.k][0] : px[e.a] + STEP[e.k][0]) - px[r];
      dy = (e.a === r ? py[e.b] - STEP[e.k][1] : py[e.a] + STEP[e.k][1]) - py[r];
    } else { // a room no exit holds (none counted) goes anywhere on the sheet
      dx = size.x0 + Math.floor(rnd() * size.w) - px[r];
      dy = size.y0 + Math.floor(rnd() * size.h) - py[r];
    }
    if (!dx && !dy) continue;
    // the rooms that move: r, and those joined to it by drawn exits, cut at some of them
    set.length = 0; set.push(r); inSet[r] = step;
    const keep = rnd() < 0.5 ? 0 : rnd() < 0.5 ? 0.7 : 1; // the chance of following a drawn exit
    let blocked = false;
    for (let h = 0; h < set.length && !blocked; h++) {
      for (const ei of incident[set[h]]) {
        if (!met(ei) || rnd() >= keep) continue;
        const m = edges[ei].a === set[h] ? edges[ei].b : edges[ei].a;
        if (inSet[m] === step) continue;
        if (m === other) { blocked = true; break; }
        inSet[m] = step; set.push(m);
      }
    }
    if (blocked) continue;
    if (set.some((m) => { const o = occupied.get(cellKey(px[m] + dx, py[m] + dy)); return o !== undefined && inSet[o] !== step; })) continue;
    touched.clear();
    for (const m of set) for (const ei of incident[m]) touched.add(ei);
    let before = 0;
    for (const ei of touched) if (!met(ei)) before += edges[ei].c;
    for (const m of set) occupied.delete(cellKey(px[m], py[m]));
    for (const m of set) { px[m] += dx; py[m] += dy; }
    let after = 0;
    for (const ei of touched) if (!met(ei)) after += edges[ei].c;
    const next = bounds(), small = next.w <= opts.maxW && next.h <= opts.maxH;
    const dE = energy(cost - before + after, next) - energy(cost, size);
    if (small && (dE <= 0 || rnd() < Math.exp(-dE / T))) {
      for (const m of set) occupied.set(cellKey(px[m], py[m]), m);
      cost += after - before; size = next;
      if (energy(cost, size) < energy(best.cost, best.size)) best = { cost, size, x: Int32Array.from(px), y: Int32Array.from(py) };
    } else {
      for (const m of set) { px[m] -= dx; py[m] -= dy; }
      for (const m of set) occupied.set(cellKey(px[m], py[m]), m);
    }
  }
  const x0 = Math.min(...best.x), y0 = Math.min(...best.y);
  const at = new Map<number, Place>(ids.map((id, i): [number, Place] => [id, [best.x[i] - x0, best.y[i] - y0]]));
  const links: [number, number, number][] = [];
  let total = 0;
  for (const [a, k, b, c] of constraints(rooms, weight)) {
    const pa = at.get(a), pb = at.get(b);
    if (!pa || !pb || pb[0] !== pa[0] + STEP[k][0] || pb[1] !== pa[1] + STEP[k][1]) { links.push([a, k, b]); total += c; }
  }
  return { at, links, size: { w: best.size.w, h: best.size.h }, cost: total };
}

/** Exits of which at least one cannot be drawn: following them from room to room, with or against their way, does not come back to the same place. */
export interface Cycle { exits: [number, number, number][]; cost: number }

/** The exits that are the same step between the same two rooms (a way there and back) as one constraint, costing what its exits cost together. */
interface Merged { a: number; b: number; dx: number; dy: number; cost: number; exits: [number, number, number][] }

function merge(rooms: ReadonlyMap<number, Exits>, weight: (a: number, b: number) => number): Merged[] {
  const merged = new Map<string, Merged>();
  for (const [a, k, b, c] of constraints(rooms, weight)) {
    const flip = a > b, sg = flip ? -1 : 1, lo = flip ? b : a, hi = flip ? a : b;
    const dx = sg * STEP[k][0], dy = sg * STEP[k][1], id = `${lo},${hi},${dx},${dy}`, m = merged.get(id);
    if (m) { m.cost += c; m.exits.push([a, k, b]); } else merged.set(id, { a: lo, b: hi, dx, dy, cost: c, exits: [[a, k, b]] });
  }
  return [...merged.values()];
}

/**
 * A packing of loops whose steps do not sum to zero (going from room to room by exits, with or against their way, must come
 * back to the same place, or one exit of the loop is a link). Loops are taken one at a time, each charged its cheapest
 * constraint's remaining cost, which the loops that share the constraint then use up. The sum is a lower bound on the links'
 * cost, whatever the order (`tries` random orders, the best kept). `dead` constraints are gone; `kept` ones cannot be given up
 * (a loop of kept ones alone is impossible: the bound is infinite).
 */
function packing(list: readonly Merged[], dead: readonly boolean[], kept: readonly boolean[], tries: number): { bound: number; cycles: Cycle[] } {
  let best: { bound: number; cycles: Cycle[] } = { bound: -1, cycles: [] };
  for (let t = 0; t < tries; t++) {
    const rnd = random(t + 1), left = list.map((m, i) => (kept[i] ? Infinity : m.cost)), gone = [...dead];
    const cycles: Cycle[] = [];
    let bound = 0;
    for (;;) {
      const loop = oneLoop(list, gone, rnd);
      if (!loop) break;
      const take = Math.min(...loop.map((i) => left[i]));
      if (take === Infinity) return { bound: Infinity, cycles };
      bound += take;
      cycles.push({ exits: loop.map((i) => list[i].exits[0]), cost: take });
      for (const i of loop) { left[i] -= take; if (left[i] <= 0) gone[i] = true; }
    }
    if (bound > best.bound) best = { bound, cycles };
  }
  return best;
}

/** A lower bound on what the links must cost, from `tries` packings of loops (see `packing`), and the loops of the best. */
export function lowerBound(rooms: ReadonlyMap<number, Exits>, weight: (a: number, b: number) => number, tries = 200) {
  const list = merge(rooms, weight);
  return packing(list, list.map(() => false), list.map(() => false), tries);
}

/**
 * What the links must cost at least, exactly, if rooms may share a place: the cheapest set of constraints to give up so that
 * the rest are consistent (every loop sums to zero). Each biconnected piece of the constraints is its own problem (a loop
 * lies in one piece); each is a branch and bound: take a loop that does not sum to zero, one of its constraints must go, try each
 * (in order, those tried stay), pruning by the packing bound. `nodes` bounds the work per piece; `complete` says it was not hit.
 * Rooms sharing a place only makes the true best dearer, so this is a lower bound on any layout.
 */
export function exactMinimum(rooms: ReadonlyMap<number, Exits>, weight: (a: number, b: number) => number, nodes = 200000): { cost: number; complete: boolean; pieces: { size: number; cost: number; complete: boolean; broken: [number, number, number][] }[] } {
  const list = merge(rooms, weight);
  const pieces = biconnected(list);
  const result: { size: number; cost: number; complete: boolean; broken: [number, number, number][] }[] = [];
  for (const piece of pieces) {
    const inPiece = new Set(piece), dead = list.map((_, i) => !inPiece.has(i)), kept = list.map(() => false);
    if (!oneLoop(list, dead, random(1))) continue; // balanced as it is
    let best = Infinity, budget = nodes, complete = true, broken: [number, number, number][] = [];
    const gone: number[] = [];
    const rnd = random(7);
    const search = (spent: number) => {
      if (budget-- <= 0) { complete = false; return; }
      const loop = oneLoop(list, dead, rnd);
      if (!loop) { if (spent < best) { best = spent; broken = gone.flatMap((i) => list[i].exits); } return; }
      if (spent + packing(list, dead, kept, 2).bound >= best) return;
      const options = loop.filter((i) => !kept[i]).sort((p, q) => list[p].cost - list[q].cost);
      const tried: number[] = [];
      for (const i of options) {
        dead[i] = true; gone.push(i);
        search(spent + list[i].cost);
        dead[i] = false; gone.pop();
        kept[i] = true; tried.push(i);
        if (spent + packing(list, dead, kept, 1).bound >= best) break;
      }
      for (const i of tried) kept[i] = false;
    };
    search(0);
    result.push({ size: piece.length, cost: best, complete, broken });
  }
  return { cost: result.reduce((n, p) => n + p.cost, 0), complete: result.every((p) => p.complete), pieces: result };
}

/** The constraints (their indexes) grouped by biconnected piece: any loop lies within one. */
function biconnected(list: readonly Merged[]): number[][] {
  const adj = new Map<number, number[]>();
  list.forEach((m, i) => { for (const r of [m.a, m.b]) { const l = adj.get(r); if (l) l.push(i); else adj.set(r, [i]); } });
  const order = new Map<number, number>(), low = new Map<number, number>(), stack: number[] = [], out: number[][] = [];
  let clock = 0;
  const visit = (r: number, via: number) => {
    order.set(r, ++clock); low.set(r, clock);
    for (const i of adj.get(r) ?? []) {
      if (i === via) continue;
      const m = list[i], o = m.a === r ? m.b : m.a, seen = order.get(o);
      if (seen === undefined) {
        stack.push(i);
        visit(o, i);
        low.set(r, Math.min(low.get(r) ?? 0, low.get(o) ?? 0));
        if ((low.get(o) ?? 0) >= (order.get(r) ?? 0)) {
          const piece: number[] = [];
          for (let e = stack.pop(); e !== undefined; e = stack.pop()) { piece.push(e); if (e === i) break; }
          out.push(piece);
        }
      } else if (seen < (order.get(r) ?? 0)) { stack.push(i); low.set(r, Math.min(low.get(r) ?? 0, seen)); }
    }
  };
  for (const r of adj.keys()) if (!order.has(r)) visit(r, -1);
  return out;
}

/**
 * A short loop of the constraints still alive whose steps do not sum to zero: a randomised breadth-first forest puts each room
 * at the place the tree path to it says; a constraint off the tree that disagrees closes the loop (the two tree paths and it).
 */
function oneLoop(list: readonly Merged[], dead: readonly boolean[], rnd: () => number): number[] | null {
  const adj = new Map<number, number[]>();
  list.forEach((m, i) => {
    if (dead[i]) return;
    for (const r of [m.a, m.b]) { const l = adj.get(r); if (l) l.push(i); else adj.set(r, [i]); }
  });
  const pos = new Map<number, { x: number; y: number; via: number; from: number }>();
  let found: number[] | null = null;
  for (const root of [...adj.keys()].sort(() => rnd() - 0.5)) {
    if (pos.has(root)) continue;
    pos.set(root, { x: 0, y: 0, via: -1, from: -1 });
    const queue = [root];
    for (let h = 0; h < queue.length; h++) {
      const r = queue[h], here = pos.get(r);
      if (!here) continue;
      for (const i of [...(adj.get(r) ?? [])].sort(() => rnd() - 0.5)) {
        const m = list[i], o = m.a === r ? m.b : m.a, sg = m.a === r ? 1 : -1, nx = here.x + sg * m.dx, ny = here.y + sg * m.dy, there = pos.get(o);
        if (!there) { pos.set(o, { x: nx, y: ny, via: i, from: r }); queue.push(o); continue; }
        if (i === here.via || there.via === i || (there.x === nx && there.y === ny)) continue;
        const up = (s: number) => {
          const path: number[] = [];
          for (let q = s; q !== root;) { const p = pos.get(q); if (!p || p.via < 0) break; path.push(p.via); q = p.from; }
          return path;
        };
        const pr = up(r), po = up(o);
        while (pr.length && po.length && pr[pr.length - 1] === po[po.length - 1]) { pr.pop(); po.pop(); }
        const loop = [...pr, ...po, i];
        if (!found || loop.length < found.length) found = loop;
      }
    }
    if (found) break;
  }
  return found;
}
