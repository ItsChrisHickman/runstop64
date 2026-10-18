/**
 * The mansion's map, laid out from the rooms' exits (left, right, up, down): a constraint layout. An exit says where the room it
 * leads to belongs (one step left, right, up or down), but the mansion is not a consistent grid (leaving a room's top may lead to
 * a room that is not above it by the rest of the map's reckoning), so the layout grows blocks of rooms that agree and joins them
 * wherever they do.
 *
 * Rooms start as blocks of one; the exits are taken in order (those a room and the room it leads to both say, then the ones
 * only one of them says) and an exit joins its two blocks if the places it asks for are free, the blocks moved to meet.
 * What no join can satisfy without two rooms on one place stays apart: a room (or block) that is left is drawn as a connector from
 * the room to where it leads. Blocks that never joined are set out side by side, in rows, on one sheet. Nothing here knows
 * the game: it is exits in, places out.
 */

/** left, right, up, down. */
export const STEP = [[-1, 0], [1, 0], [0, -1], [0, 1]] as const;
export type Exits = readonly [number, number, number, number];
export type Place = readonly [number, number];

export interface Layout {
  /** Where each room is on the sheet (cells). */
  at: Map<number, Place>;
  /** The exits that are not drawn as two rooms side by side in the way they lead: [from, direction 0-3, to]. */
  links: [number, number, number][];
  /** The sheet's size in cells. */
  size: { w: number; h: number };
  /** The blocks (rooms that agree), as rooms, before they are set out. */
  blocks: number[][];
}

interface Block { rooms: Map<number, Place>; cells: Set<string> }
const key = (x: number, y: number) => `${x},${y}`;

/** Every exit that leads somewhere else, in the order the layout takes them: those both rooms say first. */
function ordered(rooms: ReadonlyMap<number, Exits>): [number, number, number, 0 | 1][] {
  const mutual: [number, number, number, 0 | 1][] = [], single: [number, number, number, 0 | 1][] = [];
  for (const [a, exits] of [...rooms].sort(([p], [q]) => p - q)) {
    exits.forEach((b, k) => {
      if (b === a || !rooms.has(b)) return;
      const back = rooms.get(b)?.[[1, 0, 3, 2][k]];
      (back === a ? mutual : single).push([a, k, b, back === a ? 1 : 0]);
    });
  }
  return [...mutual, ...single];
}

/**
 * What a layout's unsatisfied exits cost: one each, and a room and the one it leads to both saying so (a way there and back) three;
 * times `weight` of the exit (the rooms the player passes first count for more).
 */
export function cost(rooms: ReadonlyMap<number, Exits>, links: readonly [number, number, number][], weight: (a: number, b: number) => number = () => 1): number {
  return links.reduce((sum, [a, k, b]) => sum + (rooms.get(b)?.[[1, 0, 3, 2][k]] === a ? 3 : 1) * weight(a, b), 0);
}

/** A shuffle by `seed` (a small deterministic generator), the exits in the order the layout takes them. */
function shuffled<T>(items: T[], seed: number): T[] {
  let s = (seed * 2654435761) >>> 0 || 1;
  const rnd = () => { s ^= s << 13; s >>>= 0; s ^= s >>> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [out[i], out[j]] = [out[j], out[i]]; }
  return out;
}

/** `seed` 0: the exits in room order (both-say first); another seed: each kind in a shuffled order. */
export function layout(rooms: ReadonlyMap<number, Exits>, seed = 0): Layout {
  const blocks = new Map<number, Block>(), blockOf = new Map<number, number>();
  for (const n of rooms.keys()) { blocks.set(n, { rooms: new Map([[n, [0, 0]]]), cells: new Set([key(0, 0)]) }); blockOf.set(n, n); }
  const edges = ordered(rooms);
  const order = seed ? [...shuffled(edges.filter((e) => e[3] === 1), seed), ...shuffled(edges.filter((e) => e[3] === 0), seed + 1)] : edges;
  for (const [a, k, b] of order) {
    const ia = blockOf.get(a), ib = blockOf.get(b);
    if (ia === undefined || ib === undefined || ia === ib) continue;
    const A = blocks.get(ia), B = blocks.get(ib);
    if (!A || !B) continue;
    const pa = A.rooms.get(a), pb = B.rooms.get(b);
    if (!pa || !pb) continue;
    // B moved so that b is a step from a, the way the exit leads
    const dx = pa[0] + STEP[k][0] - pb[0], dy = pa[1] + STEP[k][1] - pb[1];
    let free = true;
    for (const [, [x, y]] of B.rooms) if (A.cells.has(key(x + dx, y + dy))) { free = false; break; }
    if (!free) continue;
    for (const [n, [x, y]] of B.rooms) { A.rooms.set(n, [x + dx, y + dy]); A.cells.add(key(x + dx, y + dy)); blockOf.set(n, ia); }
    blocks.delete(ib);
  }
  // the blocks, the biggest first: the biggest as it is, the others each where it fits (a free cell all round) with its
  // exits to rooms already placed shortest, the sheet growing as little as it can
  const list = [...blocks.values()].sort((p, q) => q.rooms.size - p.rooms.size);
  const at = new Map<number, Place>(), taken = new Set<string>();
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity];
  const put = (n: number, x: number, y: number) => { at.set(n, [x, y]); taken.add(key(x, y)); x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y); };
  const alone = (x: number, y: number) => { for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) if (taken.has(key(x + i, y + j))) return false; return true; };
  list.forEach((b, i) => {
    const mine = [...b.rooms];
    if (i === 0) { for (const [n, [x, y]] of mine) put(n, x, y); return; }
    const w = Math.max(...mine.map(([, [x]]) => x)) - Math.min(...mine.map(([, [x]]) => x)) + 1, h = Math.max(...mine.map(([, [, y]]) => y)) - Math.min(...mine.map(([, [, y]]) => y)) + 1;
    const bx = Math.min(...mine.map(([, [x]]) => x)), by = Math.min(...mine.map(([, [, y]]) => y));
    let best: { dx: number; dy: number; cost: number } | null = null;
    for (let dy = y0 - h - 1; dy <= y1 + 2; dy++) for (let dx = x0 - w - 1; dx <= x1 + 2; dx++) {
      if (!mine.every(([, [x, y]]) => alone(dx + x - bx, dy + y - by))) continue;
      let grown = (Math.max(x1, dx + w - 1) - Math.min(x0, dx) + 1) * (Math.max(y1, dy + h - 1) - Math.min(y0, dy) + 1);
      grown -= (x1 - x0 + 1) * (y1 - y0 + 1);
      let far = 0;
      for (const [n, [x, y]] of mine) rooms.get(n)?.forEach((m) => { const p = at.get(m); if (p && m !== n) far += Math.abs(p[0] - (dx + x - bx)) + Math.abs(p[1] - (dy + y - by)); });
      const cost = grown * 8 + far;
      if (!best || cost < best.cost) best = { dx, dy, cost };
    }
    if (!best) throw new Error('no place for a block on the map');
    for (const [n, [x, y]] of mine) put(n, best.dx + x - bx, best.dy + y - by);
  });
  for (const [n, [x, y]] of [...at]) at.set(n, [x - x0, y - y0]);
  const links: [number, number, number][] = [];
  for (const [a, exits] of rooms) exits.forEach((b, k) => {
    if (b === a || !rooms.has(b)) return;
    const pa = at.get(a), pb = at.get(b);
    if (!pa || !pb || pb[0] !== pa[0] + STEP[k][0] || pb[1] !== pa[1] + STEP[k][1]) links.push([a, k, b]);
  });
  return { at, links, size: { w: x1 - x0 + 1, h: y1 - y0 + 1 }, blocks: list.map((b) => [...b.rooms.keys()]) };
}
