/**
 * Decoding a Pendragon game's room pictures into rooms of pieces (c64kit's pendragon/room.ts), once,
 * by each game's re/pictures.ts: where every piece of the room stands, from the picture's own floor
 * (the characters the engine's floor check stands him on), as the engines draw rooms obliquely.
 *
 * - The floor: one level floor, at the height of what's under its front (the floor's front edge, the
 *   picture's last row, or `front`: an upright face of its own, and what's drawn under it with it).
 *   Where a game draws the tops of things in the floor's characters (`raised`), each such stretch of
 *   floor joined is a floor piece of its own, at the height of the face holding it up; and the floor
 *   drawn over a back wall's top (`beyond`) is the room beyond it, at the ground's height.
 * - Its back edge, column by column (the floor's first row down each column, `back`): where it steps
 *   back (or forward) a character a column for three columns or more, a side wall stands along it (a
 *   plane going back at an angle); where it runs level, the back wall stands on it: the deepest level
 *   run is the wall's foot, and the same wall stands the whole width of the room, across posts and
 *   everything in front of it (a run as deep, or deeper: a wall of its own depth). A column whose floor
 *   starts nearer than the wall's foot has something standing in front of the wall there; one whose
 *   floor never starts is drawn down to the front edge: a face standing at the front.
 * - Things: what's upright at or below the foot of the wall behind it (it stands on the floor in front
 *   of the wall: a barrel, a table's legs, a cannon), joined together, and on up through what's drawn
 *   over them that isn't the walls' own drawing (the characters seen in walls where nothing stands in
 *   front of them); each stands at its front: the floor under its lowest pixel.
 *   A thing is what its own pixels make: parts standing on the floor apart from each other (side by
 *   side, joined only through what shows between them) are things of their own, and so are parts whose
 *   foot jumps two rows from one column to the next (each on its own foot); a pit drawn blank in the
 *   floor is the floor's.
 * - Pixel by pixel: where a thing's characters show the wall behind it (between a chair's legs, round a
 *   barrel), pixels drawn exactly as the wall's own character draws them there, joined to the wall
 *   itself, are the wall's; and so are the floor's where a thing's or a side wall's lowest characters
 *   show the floor in front of their foot. These are a picture's `parts`.
 *
 * Pixels are the multicolour pixels the pictures are drawn in (two wide).
 */
import type { RoomPicture, RoomPiece } from '../../../packages/c64kit/src/pendragon/room';

/** A picture as kept in the game: its characters (cols × rows, the last row the floor's front edge), and the character set it's drawn in (`set`: its name). */
export interface PictureSource {
  id: number; variant: number; cols: number; rows: number; codes: Uint8Array; charset: Uint8Array; set: string;
  /** The row the floor's front edge starts at, where it isn't the last (Karnath's upper floor: the rows under it are what's kept beyond): the rows from it down are one face. */
  front?: number;
}

/** What a game's characters are to its rooms (its floor check's floor; what's seen past the room, by character set; how it draws tops and what's beyond a wall). */
export interface DecodeRules {
  /** Characters the engine stands him on. */
  floor: number[];
  /** Characters that are holes in the floor (drawn black: at the floor's level, nothing on it). */
  holes?: number[];
  /** By character set: characters that are what's seen past the room (a sky): no piece of their own (the wall of their column). */
  open?: Record<string, number[]>;
  /**
   * The floor drawn above the back wall's top is the room beyond it, seen over the wall (Karnath's lower
   * floor: the top rows of its rooms are floor): not the floor's back edge, which is where the floor
   * starts again below the wall.
   */
  beyond?: boolean;
  /**
   * Floor drawn over something standing on the floor is its top, a level of its own above the ground (a box
   * with a door in it, a table: Karnath draws the tops of what stands in the planks' characters): each
   * such stretch of floor is a floor piece at the height of what holds it up (the rows of upright face
   * between it and the floor below, and each row is 8 pixels). Without it all the floor is one level.
   */
  raised?: boolean;
  /**
   * Each floor cell's height from the face under its own column (Entombed: its tiers are joined by stairs and
   * ramps drawn in floor characters, so tiers aren't stretches apart), instead of from the stretch it's joined to:
   * `raised` and `beyond` are then not asked. The back wall above a top stands on the top's back edge (the row it would
   * be on at the ground's height), not the ground's. Unset, nothing changes.
   */
  stacked?: boolean;
  /**
   * Holes (`holes`) count as the floor's void only under something drawn in their column: the blank over a room's top,
   * drawn in the same character (Entombed's $20, also what's beyond a side wall's foot), is no hole.
   */
  skyAbove?: boolean;
}

const FLOOR = 1, UP = 2, OPEN = 3;
/** The fewest columns a side wall's foot steps along, and the back wall's foot runs level along. */
const SIDE = 3, LEVEL = 4;
/** The fewest blank cells joined that are a pit in the floor (fewer: a gap in what stands there). */
const PIT = 8;

interface Chain { from: number; to: number; slope: 1 | -1 }
interface Layout {
  src: PictureSource;
  kind: Uint8Array;
  /** Each column's floor's first row down (the front edge's row where there's none). */
  back: Int32Array;
  /** Each column's surface: the foot row of the back wall standing there (>= 0), or a side wall's (-1 - its chain). */
  surface: Int32Array;
  /** Each column's surface's foot row. */
  foot: Int32Array;
  chains: Chain[];
  /** The floor's lowest row. */
  low: number;
  /** Each floor cell's level: 0 the ground (and what's beyond the wall), k a top standing above it, `raised[k - 1]` pixels up (-1: not floor). */
  level: Int32Array;
  raised: number[];
  /** Stacked: upright cells with floor above them in their column (the face holding a top up: standing, not the wall). */
  holds: Uint8Array;
}

/** A picture's layout: its cells' kinds, its floor's back edge, its walls. */
function layout(src: PictureSource, rules: DecodeRules): Layout {
  const { cols: C, rows: R, codes } = src, kind = new Uint8Array(C * R), F = src.front ?? R - 1;
  const floor = new Set(rules.floor), holes = new Set(rules.holes ?? []), open = new Set(rules.open?.[src.set] ?? []);
  for (let i = 0; i < C * R; i++) kind[i] = floor.has(codes[i]) ? FLOOR : open.has(codes[i]) ? OPEN : UP;
  // (the last row is the floor's front edge, whatever it's drawn with)
  for (let i = F * C; i < C * R; i++) kind[i] = UP;
  let low = 0;
  for (let i = 0; i < C * (F); i++) if (kind[i] === FLOOR) low = Math.max(low, Math.floor(i / C));
  // (and counting holes: a side wall's foot can stand along them, the void beyond a room's end)
  // floor stretches (joined cells): the ground touches the floor's lowest row; the room beyond the back wall
  // the picture's top; the rest are tops of what stands on the floor, above it
  const levelOf = new Int32Array(C * R).fill(-1), raised: number[] = [];
  const beyond = new Uint8Array(C * R), comp = new Int32Array(C * R).fill(-1);
  const stretches: { cells: number[]; ground: boolean; top: boolean }[] = [];
  for (let i = 0; i < C * (F); i++) {
    if (kind[i] !== FLOOR || comp[i] >= 0) continue;
    const cells = [i];
    comp[i] = stretches.length;
    for (let k = 0; k < cells.length; k++) {
      const j = cells[k], c = j % C;
      for (const n of [c > 0 ? j - 1 : -1, c < C - 1 ? j + 1 : -1, j - C, j + C]) {
        if (n >= 0 && n < C * (F) && kind[n] === FLOOR && comp[n] < 0) { comp[n] = stretches.length; cells.push(n); }
      }
    }
    stretches.push({ cells, ground: cells.some((j) => Math.floor(j / C) === low), top: cells.some((j) => j < C) });
  }
  // (the height of the ground: the rows of the front edge's face under it)
  const base = (R - 1 - low) * 8, heights: number[] = stretches.map(() => NaN);
  if (rules.stacked) {
    // each floor cell's height from its own column: a run of floor cells down a column stands on the face under it,
    // down to the next floor below (its height and the face's rows of 8 pixels) or the picture's bottom; cells of the
    // ground's height are the ground, the rest tops at their own heights (a stair's steps each a level, a ramp's cells
    // each its own, tiers above tiers: joined floor of different heights is never one level)
    const cellHeight = new Int32Array(C * R).fill(-1);
    for (let c = 0; c < C; c++) for (let r = F - 1; r >= 0; r--) {
      if (kind[r * C + c] !== FLOOR) continue;
      if (r + 1 < F && kind[(r + 1) * C + c] === FLOOR) { cellHeight[r * C + c] = cellHeight[(r + 1) * C + c]; continue; }
      let t = r + 1;
      while (t < F && kind[t * C + c] !== FLOOR) t++;
      cellHeight[r * C + c] = t >= F ? (R - r - 1) * 8 : cellHeight[t * C + c] + (t - r - 1) * 8;
    }
    for (let i = 0; i < C * F; i++) {
      if (kind[i] !== FLOOR) continue;
      if (cellHeight[i] === base) { levelOf[i] = 0; continue; }
      let at = raised.indexOf(cellHeight[i]);
      if (at < 0) { raised.push(cellHeight[i]); at = raised.length - 1; }
      levelOf[i] = at + 1;
    }
  } else {
    stretches.forEach((st, k) => {
      if (st.ground || (rules.beyond && st.top) || !rules.raised) { heights[k] = base; for (const j of st.cells) { levelOf[j] = 0; beyond[j] = !st.ground && rules.beyond && st.top ? 1 : 0; } }
    });
    // what holds a top up: below its cells, the face, rows of what isn't floor, down to the floor (known) or the picture's bottom
    for (let pass = 0; pass < 4; pass++) {
      stretches.forEach((st, k) => {
        if (!isNaN(heights[k])) return;
        const votes = new Map<number, number>();
        for (const j of st.cells) {
          const c = j % C, r = (j - c) / C;
          if (r + 1 < F && comp[j + C] === k) continue;
          let t = r + 1;
          while (t < F && kind[t * C + c] !== FLOOR) t++;
          let h: number;
          if (t >= F) h = (R - r - 1) * 8;
          else if (isNaN(heights[comp[t * C + c]]) || comp[t * C + c] === k) continue;
          else h = heights[comp[t * C + c]] + (t - r - 1) * 8;
          votes.set(h, (votes.get(h) ?? 0) + 1);
        }
        let best = NaN, most = 0;
        for (const [h, v] of votes) if (v > most) { most = v; best = h; }
        if (!isNaN(best)) heights[k] = best;
      });
    }
    stretches.forEach((st, k) => {
      if (!isNaN(heights[k]) && heights[k] === base) for (const j of st.cells) levelOf[j] = 0;
      else if (!isNaN(heights[k])) {
        let at = raised.indexOf(heights[k]);
        if (at < 0) { raised.push(heights[k]); at = raised.length - 1; }
        for (const j of st.cells) levelOf[j] = at + 1;
      } else for (const j of st.cells) levelOf[j] = 0;
    });
  }
  // (the back edge is the ground's: not the room beyond, nor a top)
  const ground = (i: number) => kind[i] === FLOOR && levelOf[i] === 0 && !beyond[i];
  const back = new Int32Array(C), edge = new Int32Array(C), tier = new Int32Array(C).fill(-1);
  // (stacked: a column with ground in it and a top above the ground's back edge: the row that top's back edge is on at the ground's height)
  const tops = new Int32Array(C).fill(-1);
  for (let c = 0; c < C; c++) {
    let r = 0;
    while (r < F && !ground(r * C + c)) r++;
    back[c] = r;
    r = 0;
    // (a hole counts only under something drawn above it, where the game draws holes in the same character as the blank
    // over a room's top: `skyAbove`)
    let drawn = !rules.skyAbove;
    while (r < F && !ground(r * C + c) && !(drawn && holes.has(codes[r * C + c]))) { if (!holes.has(codes[r * C + c])) drawn = true; r++; }
    edge[c] = r;
    // (stacked: a column with no ground, only tops, has its back edge at the deepest of them, a row of the ground's as deep:
    // the row it would be on at the ground's height; `tier` is the screen row of that top's first cell)
    if (rules.stacked) {
      let best = F, row = -1;
      for (let y = 0; y < F; y++) {
        const i = y * C + c;
        if (kind[i] !== FLOOR || levelOf[i] <= 0) continue;
        const e = y + (raised[levelOf[i] - 1] - base) / 8;
        if (e < best) { best = e; row = y; }
      }
      if (row >= 0) { if (back[c] >= F) { back[c] = best; if (edge[c] >= F) edge[c] = best; tier[c] = row; } else if (best < back[c]) { tops[c] = best; tier[c] = row; } }
    }
  }
  // the level runs of the back edge
  const runs: { from: number; to: number; row: number }[] = [];
  for (let c = 0; c < C;) {
    let e = c;
    while (e + 1 < C && back[e + 1] === back[c]) e++;
    runs.push({ from: c, to: e, row: back[c] });
    c = e + 1;
  }
  // the back wall's foot: the deepest row the floor's back edge runs level along for LEVEL columns or
  // more (in runs of two or more: not a gap between things); a deeper run is an alcove
  const level = runs.filter((r) => r.to > r.from && r.row < F), along = new Map<number, number>();
  for (const r of level) along.set(r.row, (along.get(r.row) ?? 0) + r.to - r.from + 1);
  const rows = [...along.entries()].filter(([, n]) => n >= LEVEL).map(([row]) => row);
  const main = rows.length ? Math.min(...rows) : level.length ? Math.min(...level.map((r) => r.row)) : F;
  // the codes the back wall is mostly drawn with (where its foot shows): a side wall's columns don't have them
  const counts = new Map<number, number>();
  for (const r of level) if (r.row === main) for (let c = r.from; c <= r.to; c++) for (let y = 0; y < main; y++) {
    const i = y * C + c;
    if (kind[i] === UP) counts.set(codes[i], (counts.get(codes[i]) ?? 0) + 1);
  }
  const plain = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? -1;
  // side walls: the back edge stepping a row a column, SIDE columns or more, drawn with none of the back wall's own planks
  const chains: Chain[] = [], inChain = new Int32Array(C).fill(-1);
  for (let c = 0; c + 1 < C;) {
    const s = edge[c + 1] - edge[c];
    if (s !== 1 && s !== -1) { c++; continue; }
    let e = c + 1;
    while (e + 1 < C && edge[e + 1] - edge[e] === s) e++;
    // (an end where the back wall runs on level from it, LEVEL columns, is the wall's)
    const level = (k: number, d: number) => { let n = 1; while (k + d * n >= 0 && k + d * n < C && edge[k + d * n] === edge[k]) n++; return n; };
    const from = s === 1 && level(c, -1) >= LEVEL ? c + 1 : c, to = s === -1 && level(e, 1) >= LEVEL ? e - 1 : e;
    // (its ends drawn with the back wall's planks are the back wall's)
    const planks = (k: number) => { for (let y = 0; y < edge[k] - 1; y++) if (codes[y * C + k] === plain) return true; return false; };
    let a = from, b = to;
    while (a <= b && planks(a)) a++;
    while (b >= a && planks(b)) b--;
    let inner = false;
    for (let k = a; k <= b; k++) if (planks(k)) inner = true;
    if (b - a + 1 >= SIDE && !inner) {
      chains.push({ from: a, to: b, slope: s === -1 ? 1 : -1 });
      for (let k = a; k <= b; k++) inChain[k] = chains.length - 1;
    }
    c = e;
  }
  // (UNSET: no surface yet; never a side wall's -1 - chain, whatever the chain: -2 was the second's)
  const UNSET = -0x8000, surface = new Int32Array(C).fill(UNSET), foot = new Int32Array(C);
  for (let c = 0; c < C; c++) {
    if (inChain[c] >= 0) surface[c] = -1 - inChain[c];
    // (the deepest wall, walls as deep or deeper, and faces drawn down to the front edge)
    else if (back[c] === main || back[c] === F || (back[c] < main && level.some((r) => r.from <= c && c <= r.to))) surface[c] = back[c];
  }
  // (a column with something standing in front of the wall: the wall beside it, the deeper side's)
  for (let c = 0; c < C; c++) {
    if (surface[c] !== UNSET) continue;
    let l = c - 1, r = c + 1;
    while (l >= 0 && (surface[l] < 0 || surface[l] === F)) l--;
    while (r < C && (surface[r] < 0 || surface[r] === F)) r++;
    const a = l >= 0 ? surface[l] : Infinity, b = r < C ? surface[r] : Infinity;
    surface[c] = Math.min(a, b, main);
  }
  // (stacked: the wall above a top stands on the top's back edge, not on the ground's, which is in front of it, under the top's face)
  for (let c = 0; c < C; c++) if (tops[c] >= 0 && surface[c] >= 0 && tops[c] < surface[c]) surface[c] = tops[c];
  for (let c = 0; c < C; c++) foot[c] = tier[c] >= 0 ? tier[c] : surface[c] >= 0 ? surface[c] : edge[c];
  // holes in the floor: what's of them in front of the walls is the floor's (drawn black); what's not,
  // nothing standing. So is a pit drawn blank there (characters of nothing but the background, PIT
  // cells or more joined: $A3's open hatch, $1B, stood up as a black slab in front of what's down in
  // it); a few blank cells are a gap in what stands there (under a table's top), kept with it
  const blank = (code: number) => src.charset.subarray(code * 8, code * 8 + 8).every((b) => b === 0);
  const below = (i: number) => i < C * (F) && Math.floor(i / C) >= foot[i % C];
  const pit = new Uint8Array(C * R);
  for (let i = 0; i < C * (F); i++) {
    if (pit[i] || !below(i) || !blank(codes[i]) || holes.has(codes[i])) continue;
    const g = [i];
    pit[i] = 1;
    for (let k = 0; k < g.length; k++) {
      const j = g[k], c = j % C;
      for (const n of [c > 0 ? j - 1 : -1, c < C - 1 ? j + 1 : -1, j - C, j + C]) if (n >= 0 && below(n) && !pit[n] && blank(codes[n]) && !holes.has(codes[n])) { pit[n] = 1; g.push(n); }
    }
    if (g.length < PIT) for (const j of g) pit[j] = 2;
  }
  for (let i = 0; i < C * (F); i++) if ((holes.has(codes[i]) || pit[i] === 1) && below(i)) { kind[i] = FLOOR; levelOf[i] = 0; }
  const holds = new Uint8Array(C * R);
  if (rules.stacked) {
    for (let c = 0; c < C; c++) {
      let floorAbove = false;
      for (let r = 0; r < F; r++) {
        const i = r * C + c;
        if (kind[i] === FLOOR) floorAbove = true;
        else if (floorAbove && kind[i] === UP) holds[i] = 1;
      }
    }
  }
  return { src, kind, back, surface, foot, chains, low, level: levelOf, raised, holds };
}

/** Decodes a game's room pictures (those drawn in the same character set judged together: what its walls are drawn with). */
export function decodePictures(sources: PictureSource[], rules: DecodeRules): RoomPicture[] {
  const layouts = sources.map((s) => layout(s, rules));
  // the walls' own drawing, by character set: what's upright above the wall's foot in columns where
  // nothing stands in front of it, and side walls
  const wallCodes = new Map<string, Set<number>>();
  for (const l of layouts) {
    const { cols: C, codes, set } = l.src, w = wallCodes.get(set) ?? new Set<number>();
    wallCodes.set(set, w);
    for (let c = 0; c < C; c++) {
      if (l.surface[c] >= 0 && l.back[c] !== l.surface[c]) continue;
      for (let r = 0; r < l.foot[c]; r++) if (l.kind[r * C + c] === UP) w.add(codes[r * C + c]);
    }
  }
  return layouts.map((l) => decode(l, wallCodes.get(l.src.set) ?? new Set(), rules));
}

function decode(l: Layout, wall: Set<number>, rules: DecodeRules): RoomPicture {
  const { src, kind, foot, surface } = l, { cols: C, rows: R, codes } = src, F = src.front ?? R - 1;
  const bottom = R * 8, height = (R - 1 - l.low) * 8;
  const depthAt = (row: number) => bottom - row * 8 - height;
  const pieces: RoomPiece[] = [];
  const add = (p: RoomPiece) => { pieces.push(p); return pieces.length - 1; };
  // the floor, at the height of the front edge under it; the front edge
  const floor = add({ kind: 'floor', height }), front = depthAt(l.low + 1);
  // (and the tops standing above it, each height one floor piece)
  const floors = [floor, ...l.raised.map((h) => add({ kind: 'floor', height: h }))];
  const floorHeight = (p: number) => { const q = pieces[p]; return q.kind === 'floor' ? q.height : height; };
  const isFloor = (p: number) => pieces[p].kind === 'floor';
  const edge = add({ kind: 'wall', depth: front });
  const sides = l.chains.map((ch) => add({ kind: 'side', slope: ch.slope, at: 0 }));
  // (walls by their depth; a face standing on or past the floor's front row, a column with no floor drawn down to the
  // picture's last row, past a smaller room's front: $8E, is the front edge, never in front of it)
  const walls = new Map<number, number>();
  const wallAt = (z: number) => {
    let p = walls.get(z);
    if (p === undefined) { p = z <= front ? edge : add({ kind: 'wall', depth: z }); walls.set(z, p); }
    return p;
  };
  const surfacePiece = (c: number) => {
    const s = surface[c];
    return s < 0 ? sides[-1 - s] : wallAt(depthAt(s));
  };
  const NONE = 255, cells = new Uint8Array(C * R).fill(NONE);
  for (let i = 0; i < C * R; i++) {
    if (i >= (F) * C) cells[i] = edge;
    else if (kind[i] === FLOOR) cells[i] = floors[l.level[i]];
  }
  // stacked: the face holding a top up (upright cells with floor above them in their column) is a wall at its own depth: where
  // the floor under it starts (or, where none is drawn, the front of the top above it), whatever stands behind it
  const faced = new Uint8Array(C * R);
  if (rules.stacked) {
    const levelHeight = (i: number) => (l.level[i] <= 0 ? height : l.raised[l.level[i] - 1]);
    for (let i = 0; i < C * F; i++) {
      if (!l.holds[i]) continue;
      const c = i % C, r = (i - c) / C;
      let z = NaN;
      for (let y = r + 1; y < F && isNaN(z); y++) if (kind[y * C + c] === FLOOR) z = bottom - y * 8 - levelHeight(y * C + c);
      for (let y = r - 1; y >= 0 && isNaN(z); y--) if (kind[y * C + c] === FLOOR) z = bottom - (y + 1) * 8 - levelHeight(y * C + c);
      if (!isNaN(z)) { cells[i] = wallAt(z); faced[i] = 1; }
    }
  }
  // things: upright at or below the foot of what's behind, joined; then up through what isn't the walls' drawing
  const thing = new Int32Array(C * R).fill(-1);
  let things = 0;
  const below = (i: number) => Math.floor(i / C) >= foot[i % C];
  for (let i = 0; i < C * (F); i++) {
    if (kind[i] !== UP || faced[i] || !below(i) || thing[i] >= 0) continue;
    const id = things++, list = [i];
    thing[i] = id;
    for (let k = 0; k < list.length; k++) {
      const j = list[k], jc = j % C, jr = Math.floor(j / C);
      for (const n of [jc > 0 ? j - 1 : -1, jc < C - 1 ? j + 1 : -1, jr > 0 ? j - C : -1, jr < R - 2 ? j + C : -1]) {
        if (n >= 0 && kind[n] === UP && !faced[n] && thing[n] < 0 && below(n)) { thing[n] = id; list.push(n); }
      }
    }
    let lo = C, hi = -1;
    for (const j of list) { lo = Math.min(lo, j % C); hi = Math.max(hi, j % C); }
    // (up: cells not drawn as the walls are, over its columns or one either side)
    for (let k = 0; k < list.length; k++) {
      const j = list[k], jc = j % C;
      for (const n of [j - C, jc > 0 ? j - 1 : -1, jc < C - 1 ? j + 1 : -1]) {
        if (n < 0 || kind[n] !== UP || faced[n] || thing[n] >= 0 || below(n) || wall.has(codes[n]) || n % C < lo - 1 || n % C > hi + 1) continue;
        thing[n] = id; list.push(n);
      }
    }
  }
  // things joined only side by side but standing apart: split where the thing's foot (its lowest cell,
  // column by column) jumps two rows or more from one column to the next, so each part stands on its own
  // foot. (A wardrobe at the back wall joined by its base's corner to a post at the picture's edge whose
  // foot is three rows further forward stood all of it at the post's: Pendragon walking in front of the
  // wardrobe went behind it. A table's legs and its top's underside are a row apart at most: one thing.)
  {
    const lowest = new Int32Array(things * C).fill(-1);
    for (let i = 0; i < C * (F); i++) if (thing[i] >= 0) lowest[thing[i] * C + (i % C)] = Math.max(lowest[thing[i] * C + (i % C)], Math.floor(i / C));
    const part = new Int32Array(things * C).fill(-1);
    let n = 0;
    for (let t = 0; t < things; t++) {
      let last = -1;
      for (let c = 0; c < C; c++) {
        const f = lowest[t * C + c];
        if (f < 0) continue;
        if (last < 0 || Math.abs(f - lowest[t * C + last]) >= 2) n++;
        part[t * C + c] = n - 1;
        last = c;
      }
    }
    for (let i = 0; i < C * (F); i++) if (thing[i] >= 0) thing[i] = part[thing[i] * C + (i % C)];
    things = n;
  }
  const thingPiece = Array.from({ length: things }, () => add({ kind: 'thing', depth: front }));
  for (let i = 0; i < C * R; i++) if (cells[i] === NONE) cells[i] = thing[i] >= 0 ? thingPiece[thing[i]] : surfacePiece(i % C);
  // pixel by pixel (multicolour pixels: 4 to a cell's row)
  const PW = C * 4, PH = R * 8, px = new Uint8Array(PW * PH);
  const pair = (code: number, x: number, y: number) => (src.charset[code * 8 + (y & 7)] >> (6 - (x & 3) * 2)) & 3;
  for (let y = 0; y < PH; y++) for (let x = 0; x < PW; x++) px[y * PW + x] = cells[(y >> 3) * C + (x >> 2)];
  /** The code of the nearest cell along row r from column c that's wholly piece p (or -1). */
  const nearest = (r: number, c: number, p: number) => {
    for (let d = 1; d < C; d++) for (const cc of [c - d, c + d]) if (cc >= 0 && cc < C && cells[r * C + cc] === p && kind[r * C + cc] !== OPEN) return codes[r * C + cc];
    return -1;
  };
  /**
   * Pixels of the cells `from` picks drawn as `p`'s own character beside them draws them there (`like`:
   * the code to compare with, by cell), joined (through such pixels) to `p`'s own pixels, made `p`'s.
   */
  const claim = (p: number, from: (i: number) => boolean, like: (r: number, c: number) => number) => {
    const same = new Uint8Array(PW * PH);
    for (let r = 0; r < F; r++) for (let c = 0; c < C; c++) {
      const i = r * C + c;
      if (!from(i)) continue;
      const code = like(r, c);
      if (code < 0) continue;
      for (let y = r * 8; y < r * 8 + 8; y++) for (let x = c * 4; x < c * 4 + 4; x++) if (pair(codes[i], x, y) === pair(code, x, y)) same[y * PW + x] = 1;
    }
    const near = (i: number) => {
      const x = i % PW;
      return [x > 0 ? i - 1 : -1, x < PW - 1 ? i + 1 : -1, i >= PW ? i - PW : -1, i < PW * (PH - 1) ? i + PW : -1];
    };
    const queue: number[] = [];
    for (let i = 0; i < PW * PH; i++) if (same[i] && near(i).some((n) => n >= 0 && px[n] === p)) queue.push(i);
    for (let k = 0; k < queue.length; k++) {
      const i = queue[k];
      if (px[i] === p) continue;
      px[i] = p;
      for (const n of near(i)) if (n >= 0 && same[n] && px[n] !== p) queue.push(n);
    }
  };
  // the walls behind things (each in the columns it stands behind)
  for (const p of new Set(Array.from({ length: C }, (_, c) => surfacePiece(c)))) claim(p, (i) => thing[i] >= 0 && surfacePiece(i % C) === p, (r, c) => nearest(r, c, p));
  // the floor in front of things' and side walls' feet: their characters with the floor beside or under them
  const floorCode = (r: number, c: number) => {
    for (const j of [(r + 1) * C + c, r * C + c - 1, r * C + c + 1]) if (j >= 0 && j < C * (F) && Math.abs((j % C) - c) <= 1 && kind[j] === FLOOR) return codes[j];
    return -1;
  };
  claim(floor, (i) => kind[i] === UP && i < (F) * C && (thing[i] >= 0 || pieces[cells[i]].kind === 'side'), (r, c) => floorCode(r, c));
  // things are what their own pixels make: joined through cells where the wall (or the floor) shows
  // between them, they're apart (the deck's cannonball pyramids against the bulwark beside a cannon whose
  // wheels are three rows nearer: one thing, they stood at the wheels' depth, and what walked along the
  // back went behind them). Each piece of its pixels (joined corner to corner too) standing on the floor
  // and big enough (STAND pixels), apart from the others side to side, is a thing of its own; the rest
  // stay with the biggest.
  const STAND = 16, comp = new Int32Array(PW * PH).fill(-1);
  for (const p of [...thingPiece]) {
    const groups: number[][] = [];
    for (let s = 0; s < PW * PH; s++) {
      if (px[s] !== p || comp[s] >= 0) continue;
      const g = [s];
      comp[s] = groups.length;
      for (let k = 0; k < g.length; k++) {
        const i = g[k], x = i % PW, y = (i - x) / PW;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const X = x + dx, Y = y + dy, j = Y * PW + X;
          if (X < 0 || Y < 0 || X >= PW || Y >= PH || px[j] !== p || comp[j] >= 0) continue;
          comp[j] = groups.length; g.push(j);
        }
      }
      groups.push(g);
    }
    // (one stands where some pixel of it has the floor right under it: a part with none, a cannon's
    // barrel apart from its carriage, stays with the thing)
    const stands = (g: number[]) => g.some((i) => i + PW < PW * PH && isFloor(px[i + PW]));
    // (and parts one over another are one: a table's legs under its top, whatever shows between them)
    const big = groups.filter((g) => g.length >= STAND && stands(g)).map((g) => {
      let lo = PW, hi = -1;
      for (const i of g) { lo = Math.min(lo, i % PW); hi = Math.max(hi, i % PW); }
      return { g: [...g], lo, hi };
    });
    for (let merged = true; merged;) {
      merged = false;
      for (let a = 0; a < big.length && !merged; a++) for (let b = a + 1; b < big.length && !merged; b++) {
        if (big[a].hi < big[b].lo || big[b].hi < big[a].lo) continue;
        big[a].g.push(...big[b].g); big[a].lo = Math.min(big[a].lo, big[b].lo); big[a].hi = Math.max(big[a].hi, big[b].hi);
        big.splice(b, 1);
        merged = true;
      }
    }
    big.sort((a, b) => b.g.length - a.g.length);
    for (const { g } of big.slice(1)) {
      const q = add({ kind: 'thing', depth: front });
      thingPiece.push(q);
      for (const i of g) px[i] = q;
    }
  }
  // (each thing's cell: the thing most of its pixels are)
  for (let i = 0; i < C * (F); i++) {
    if (pieces[cells[i]].kind !== 'thing') continue;
    const count = new Map<number, number>(), c = i % C, r = (i - c) / C;
    for (let y = r * 8; y < r * 8 + 8; y++) for (let x = c * 4; x < c * 4 + 4; x++) {
      const p = px[y * PW + x];
      if (pieces[p].kind === 'thing') count.set(p, (count.get(p) ?? 0) + 1);
    }
    let best = cells[i], most = 0;
    for (const [p, n] of count) if (n > most) { best = p; most = n; }
    cells[i] = best;
  }
  // where each thing stands: in front of the floor under its lowest pixel (at the front edge if there's none)
  const low = new Int32Array(pieces.length).fill(-1), under = new Int32Array(pieces.length);
  for (let y = 0; y + 1 < PH; y++) for (let x = 0; x < PW; x++) {
    const p = px[y * PW + x], f = px[(y + 1) * PW + x];
    if (pieces[p].kind === 'thing' && isFloor(f) && y + 1 >= low[p]) { low[p] = y + 1; under[p] = f; }
  }
  for (const p of thingPiece) {
    const piece = pieces[p];
    if (piece.kind === 'thing' && low[p] >= 0) piece.depth = Math.max(front, bottom - low[p] - floorHeight(under[p]));
  }
  // each side wall along its foot: the floor's first pixel under it, pixel column by pixel column
  for (const p of sides) {
    const piece = pieces[p];
    if (piece.kind !== 'side') continue;
    let sum = 0, n = 0;
    for (let x = 0; x < PW; x++) for (let y = 1; y < PH; y++) {
      if (px[(y - 1) * PW + x] !== p || !isFloor(px[y * PW + x])) continue;
      // (both of its screen pixels; z = bottom - y - height at the floor's back edge: at = slope × x - z)
      for (const sx of [x * 2 + 0.5, x * 2 + 1.5]) { sum += piece.slope * sx - (bottom - y - floorHeight(px[y * PW + x])); n++; }
    }
    piece.at = n ? Math.round((sum / n) * 2) / 2 : 0;
  }
  // the parts: cells not wholly their own piece's
  const parts: number[] = [];
  for (let i = 0; i < C * R; i++) {
    const c = i % C, r = Math.floor(i / C), masks = new Map<number, number>();
    for (let b = 0; b < 32; b++) {
      const p = px[(r * 8 + (b >> 2)) * PW + c * 4 + (b & 3)];
      if (p !== cells[i]) masks.set(p, ((masks.get(p) ?? 0) | (1 << (31 - b))) >>> 0);
    }
    for (const [p, m] of masks) parts.push(i, p, m);
  }
  // (a cell holds its piece's index in a byte)
  if (pieces.length >= NONE) throw new Error(`picture ${src.id}/${src.variant} has ${pieces.length} pieces: no more than ${NONE - 1} fit a cell`);
  return { id: src.id, variant: src.variant, cols: C, rows: R, codes: codes.slice(), cells, pieces, parts: Uint32Array.from(parts) };
}
