import { X2_ORIGIN, Y_ORIGIN } from '../../shared/monty/body';
import { PLAY_COL, PLAY_ROW } from '../../shared/monty/screen';
import type { Game } from './game';

/**
 * Where a room's cells are in sprite pixels, and whether Monty is over some of them: what the mechanisms that put a danger in cells
 * (the tunnel mouths, the timed strikes) and those that move sprites (the icicles, the dragon) measure by.
 */

/** The sprite pixel of a playfield column's left edge. */
export const pixelX = (col: number) => 2 * X2_ORIGIN + (col + PLAY_COL) * 8;
/** The sprite pixel of a playfield row's top. */
export const pixelY = (row: number) => Y_ORIGIN + (row + PLAY_ROW) * 8;

/** Whether Monty (16 pixels wide, each side trimmed by `trim`) is across the sprite pixels from `x` for `w`: the one horizontal test every mechanism uses. */
export function montyAcross(g: Game, x: number, w: number, trim: number): boolean {
  const mx = g.x2 * 2;
  return mx + 16 - trim > x && x + w > mx + trim;
}

/** Whether Monty's 16 by 16 box (the sides trimmed by `trim`) meets the box of `w` by `h` sprite pixels at (`x`, `y`): the one box test of the icicles and the dragon. */
export function montyMeets(g: Game, x: number, y: number, w: number, h: number, trim: number): boolean {
  return montyAcross(g, x, w, trim) && g.y + 16 > y && y + h > g.y;
}

/** How much of his box's sides Monty gives to the box test of the things that kill by it (the dragon, the boulders). */
const MONTY_TRIM = 2;

/** Whether Monty meets a sprite's picture of `w` by `h` sprite pixels at (`x`, `y`) with its box trimmed by `trim` all round (the box test of the dragon and the boulders: a thin or round picture touches less than its box). */
export function meetsMonty(g: Game, x: number, y: number, w: number, h: number, trim: number): boolean {
  return montyMeets(g, x + trim, y + trim, w - 2 * trim, h - 2 * trim, MONTY_TRIM);
}

/** Whether Monty (his box, the sides trimmed a little) is in the playfield cells from column `left` for `cols` columns, from row `top` to row `bottom`. */
export function montyOver(g: Game, left: number, cols: number, top: number, bottom: number): boolean {
  return montyMeets(g, pixelX(left), pixelY(top), cols * 8, (bottom - top + 1) * 8, 2);
}
