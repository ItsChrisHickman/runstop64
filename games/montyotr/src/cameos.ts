import type { Game } from './game';
import type { CameoMove, CameoSpec, CellBox } from './montydata';

/**
 * Cameos (a game's `cameos`: Do Svidaniya Monty's Viktor Vole arriving too late at each border, and his shadow against the moon in Japan): a figure that walks on, holds a pose facing Monty and walks
 * off, or (a chase stopped short) runs on after Monty, is stopped at a brink and shakes his fist and stays (gone, should Monty come back within its `clear` of him), on a sprite of its own, touching nothing (its sprite is no part of the collision check: `cameoSprites`). It plays when Monty comes into its room from one of the rooms it names (so a death, which
 * starts the room again, does not play it again), once he has left the box he came in by or, with `after`, once a find is taken; with `once` it plays only once in the game. The walk-on itself
 * (`walkOn`) is the pursuer's intro too (pursuers.ts).
 */

/** A creature's eight 16 x 16 pictures (the enemy bank's: 32 bytes each, two bytes a row in two halves) as sprite blocks (three bytes a row, 21 rows): as the room's creatures are put in the bank (game.ts `setupEnemies`). */
export function creatureBlocks(bank: Uint8Array): Uint8Array[] {
  return Array.from({ length: 8 }, (_, f) => {
    const src = bank.subarray(f * 32, f * 32 + 32), dst = new Uint8Array(64);
    for (let r = 0; r < 8; r++) {
      dst[r * 3] = src[r] ?? 0;
      dst[r * 3 + 1] = src[8 + r] ?? 0;
      dst[(8 + r) * 3] = src[16 + r] ?? 0;
      dst[(8 + r) * 3 + 1] = src[24 + r] ?? 0;
    }
    return dst;
  });
}

/** The pace of a walk-on: x2 units (two pixels) a frame, Monty's own walking pace. */
export const CAMEO_PACE = 1;

/** A playfield column's x2 (the engine's sprite x, two pixels a unit: the playfield starts at screen column 4). Columns off the picture (-3, 33) are in the border, out of sight. */
export const colX2 = (col: number): number => (0x0c + (col + 4) * 4) & 0xff;
/** The sprite y of a figure standing on floor row `row` (Monty's own y there, plus one, as a creature's). */
export const floorY = (row: number): number => (0x32 + (row + 1) * 8 + 1) & 0xff;

/** Whether the cell of Monty's top left is inside a box of playfield cells (his column and row as the engine counts them, less the playfield's margin). */
export const inBox = (g: Game, b: CellBox): boolean => {
  const col = g.montyCol - 4, row = g.montyRow - 3;
  return col >= b.col0 && col <= b.col1 && row >= b.row0 && row <= b.row1;
};

/** The pace of a chase stopped short (`CameoStop`): twice Monty's, so he is plainly running after him. */
export const CAMEO_RUN = 2;
/** Frames a fist shake holds each of its two pictures (the hand at the brim, the fist above the hat). */
const SHAKE = 6;

/**
 * Where a walk-on is `t` frames in, and which of its eight pictures it shows (0-3 going left: two steps, the look, the fist; 4-7 the same going right); null once it has walked off. A chase stopped short
 * (no `to`) is never null: he runs in, shakes his fist, and stays at the brink looking after Monty.
 */
export function walkOn(m: CameoMove, t: number, montyX2: number): { x2: number; y: number; picture: number } | null {
  const pace = m.pose === 'fist' ? CAMEO_RUN : CAMEO_PACE;
  const from = colX2(m.from), at = colX2(m.at.col), y = floorY(m.at.row);
  const inFrames = Math.abs(at - from) / pace;
  const facing = (montyX2 < at ? 0 : 4);
  if (t < inFrames) return { x2: from + Math.sign(at - from) * t * pace, y, picture: (at < from ? 0 : 4) + ((t >> (m.pose === 'fist' ? 2 : 3)) & 1) };
  if (m.pose === 'fist') return { x2: at, y, picture: facing + (t < inFrames + m.hold && Math.floor((t - inFrames) / SHAKE) % 2 === 0 ? 3 : 2) };
  if (t < inFrames + m.hold) return { x2: at, y, picture: facing + 2 };
  const to = colX2(m.to), u = t - inFrames - m.hold;
  if (u < Math.abs(to - at) / pace) return { x2: at + Math.sign(to - at) * u * pace, y, picture: (to < at ? 0 : 4) + ((t >> 3) & 1) };
  return null;
}

/** Cells between a cameo's figure at (`x2`, `y`) and Monty, the larger of across and down, both by their top left cell as the engine counts Monty's. */
export const cellsApart = (g: Game, x2: number, y: number): number =>
  Math.max(Math.abs((((x2 - 0x0c) & 0xff) >> 2) - 4 - (g.montyCol - 4)), Math.abs((((y - 0x32) & 0xff) >> 3) - 3 - (g.montyRow - 3)));

/** A cameo of the room: its place in the data's list, whether it has begun (it counts its wait from then) and the frames since, and whether it is done. */
export interface CameoState { index: number; begun: boolean; t: number; done: boolean }

/** A room is loaded (`from`: the room before it): its cameos waiting, those that are not for this way in or have played once left out. */
export function cameoInit(g: Game, from: number) {
  g.cameos = g.data.cameos.flatMap((e, index): CameoState[] => {
    if (e.room !== g.roomId || (e.once !== undefined && g.siCollected[e.once]) || (e.from && !e.from.includes(from))) return [];
    g.enable &= ~(1 << e.sprite) & 0xff;
    return [{ index, begun: false, t: 0, done: false }];
  });
}

const specOf = (g: Game, c: CameoState): CameoSpec | undefined => g.data.cameos[c.index];

/** One frame (after Monty's move): each cameo waits for its start, counts its wait, and walks on, holds and walks off. */
export function cameoUpdate(g: Game) {
  if (g.actionCounter || g.freeze) return;
  for (const c of g.cameos) {
    const e = specOf(g, c);
    if (!e || c.done) continue;
    if (!c.begun) {
      c.begun = e.after !== undefined ? !!g.siCollected[e.after] : !inBox(g, e.when);
      if (!c.begun) continue;
      if (e.once !== undefined) g.siCollected[e.once] = 0x81; // (seen: never again, a save keeps it)
    }
    c.t++;
    const at = c.t > e.wait ? walkOn(e.move, c.t - e.wait, g.x2) : null;
    const tooNear = at !== null && e.move.pose === 'fist' && cellsApart(g, at.x2, at.y) < e.move.clear; // (a stopped chase Monty comes back to: he is gone)
    if ((c.t > e.wait && !at) || tooNear) { c.done = true; g.enable &= ~(1 << e.sprite) & 0xff; continue; }
    if (!at) continue;
    g.sx[e.sprite] = at.x2; g.sy[e.sprite] = at.y; g.sptr[e.sprite] = e.first + at.picture; g.scol[e.sprite] = e.colour;
    g.enable |= 1 << e.sprite;
  }
}

/** Whether a cameo of the room is on its way or on show (the HUD's face lights). */
export const cameoDue = (g: Game): boolean => g.cameos.some((c) => !c.done);

/** The cameos' sprites, as the collision check's mask (they are no part of what kills him or what he picks up). */
export function cameoSprites(g: Game): number {
  let mask = 0;
  for (const c of g.cameos) { const e = specOf(g, c); if (e) mask |= 1 << e.sprite; }
  return mask;
}
