import { PLAY_COL, PLAY_ROW, ROW, SCREEN } from '../../shared/monty/screen';
import { pixelX } from './cells';
import { coverable } from './decor-chars';
import type { Game } from './game';
import type { VineSpec } from './montydata';

/**
 * Swinging vines (a game's `vines`: Do Svidaniya Monty's piranha river): a vine is a hanging line of rope cells (the room's character `code`, a rope tile, so Monty takes hold of it as of any rope) that swings like a
 * pendulum, its cells moving over the empty cells of the room, which they put back as they pass. While he hangs on it (on a rope, not in a jump, over one of its cells, no stick held sideways) he is carried with it:
 * his place follows the vine's own line at his height, smoothly, a cell is only where it is drawn. He lets go by jumping, and goes the way the vine is swinging when he holds no direction. The swing counts from the
 * room's loading (`phase` frames into it), so a room is the same each time he comes in.
 */

/** A vine of the room: its place in the data's list (a copy of the game copies numbers, not the data), the frames since the room's loading, the cells it has drawn (screen cell, what it covered). */
export interface VineState { index: number; t: number; cells: readonly (readonly [at: number, chr: number, colour: number])[] }

export function vineInit(g: Game) {
  g.vines = g.data.vines.flatMap((e, index): VineState[] => (e.room === g.roomId ? [{ index, t: 0, cells: [] }] : []));
}

/** How far a vine's line is from straight down at `depth` cells below its top, in cells, `t` frames into the swing (fractions: the cells are where it rounds to). */
export function vineOffset(e: VineSpec, depth: number, t: number): number {
  return e.amplitude * (depth / e.length) * Math.sin((2 * Math.PI * (t + e.phase)) / e.period);
}

/** The column (playfield, whole) the vine's cell in a row of its depth is drawn in. */
export const vineCol = (e: VineSpec, depth: number, t: number): number => e.col + Math.round(vineOffset(e, depth, t));

/** The sprite pixel the vine's line is at (its middle) at `depth` cells down, `t` frames into the swing: where he hangs on it. */
const lineX = (e: VineSpec, depth: number, t: number): number => pixelX(e.col) + 4 + vineOffset(e, depth, t) * 8;


/** The way a vine is moving at `t` (-1 left, 0 at an end, 1 right). */
export function vineWay(e: VineSpec, t: number): number {
  const a = vineOffset(e, e.length, t), b = vineOffset(e, e.length, t + 2);
  return Math.abs(b - a) < 0.02 ? 0 : b > a ? 1 : -1;
}

/** The vine Monty is hanging on (his body over one of its cells, on a rope and not in a jump), with the depth of the cell at his middle. */
export function vineHeld(g: Game): { state: VineState; spec: VineSpec; depth: number } | null {
  if (!g.vines.length || !g.onRope || g.montyAction || g.gameMode) return null;
  const mid = g.montyRow + 1 - PLAY_ROW;
  for (const state of g.vines) {
    const spec = g.data.vines[state.index];
    if (!spec) continue;
    const depth = mid - spec.top;
    if (depth < 0 || depth >= spec.length) continue;
    if (Math.abs(lineX(spec, depth, state.t) - (g.x2 * 2 + 8)) < 12) return { state, spec, depth };
  }
  return null;
}

/** One frame (after Monty's move): each vine a step on and redrawn where its cells moved, and Monty carried on the one he hangs on. */
export function vineUpdate(g: Game) {
  for (const v of g.vines) {
    const e = g.data.vines[v.index];
    if (!e) continue;
    v.t++;
    const now = Array.from({ length: e.length }, (_, d) => (e.top + d + PLAY_ROW) * ROW + vineCol(e, d, v.t) + PLAY_COL);
    const same = v.cells.length === now.length && v.cells.every(([at], i) => at === now[i]);
    if (same) continue;
    for (const [at, chr, colour] of v.cells) { g.mem[SCREEN + at] = chr; g.col[at] = colour; }
    const drawn: [number, number, number][] = [];
    for (const at of now) {
      const chr = g.mem[SCREEN + at] ?? 0;
      if (!coverable(chr)) continue;
      drawn.push([at, chr, g.col[at] ?? 0]);
      g.setRoomChar(at, e.code);
    }
    v.cells = drawn;
  }
  const held = vineHeld(g);
  if (held && !g.input.left && !g.input.right) {
    // his body's middle over the vine's line at his height: x2 is in two-pixel units
    const dx = Math.max(-2, Math.min(2, Math.round((lineX(held.spec, held.depth, held.state.t) - 8) / 2) - g.x2));
    g.x2 = (g.x2 + dx) & 0xff;
  }
}

/** The way a vine he hangs on is swinging, for the jump he makes from it (0 when he is not on one or it is at an end of its swing). */
export function vineCarry(g: Game): number {
  const held = vineHeld(g);
  return held ? vineWay(held.spec, held.state.t) : 0;
}
