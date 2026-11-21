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

/** Whether Monty (his box, the sides trimmed a little) is in the playfield cells from column `left` for `cols` columns, from row `top` to row `bottom`. */
export function montyOver(g: Game, left: number, cols: number, top: number, bottom: number): boolean {
  const mx = g.x2 * 2;
  return mx + 14 > pixelX(left) && pixelX(left + cols) > mx + 2 && g.y < pixelY(bottom + 1) && pixelY(top) < g.y + 16;
}
