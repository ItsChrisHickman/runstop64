import { X2_ORIGIN } from '../../shared/monty/body';
import { PLAY_COL, PLAY_ROW } from '../../shared/monty/screen';
import { FRAME } from '../../shared/monty/frames';
import type { Game } from './game';

/**
 * Escalators (a game's `escalators`: Do Svidaniya Monty's metro): a ride Monty cannot leave, made as the lift's and the crusher
 * head's are (gameMode 1: the stick does nothing, he is carried). Stepping on the foot starts it; from there a fixed pace
 * carries him along the slope and sets him down at its far end, standing on the landing. The treads turn by the room's theme
 * character (the room's metadata), which is the picture's own business.
 */

/** The ride under way: which escalator (an index into the data's), the frame of it, and where it began. */
export interface EscalatorRide { index: number; t: number; x2: number; y: number }

/** No ride. */
export const NO_RIDE: EscalatorRide = { index: -1, t: 0, x2: 0, y: 0 };

/** The foot is two cells wide. */
const FOOT_WIDTH = 2;

/** A room is loaded: no ride. */
export function escalatorInit(g: Game) {
  g.esc = { ...NO_RIDE };
}

/** The escalator of this room whose foot Monty stands on (on its floor row, over one of its two cells, on his feet), or -1. */
function footUnder(g: Game): number {
  if (g.gameMode || g.falling || g.montyAction || g.onRope) return -1;
  const cell = g.montyCol - PLAY_COL;
  return g.data.escalators.findIndex((e) => e.room === g.roomId && g.montyRow + 2 === e.row + PLAY_ROW && cell + 1 >= e.col && cell < e.col + FOOT_WIDTH);
}

/** One frame (after Monty's move): start a ride from the foot, or carry him on along it. */
export function escalatorUpdate(g: Game) {
  const r = g.esc;
  if (r.index < 0) {
    const at = footUnder(g);
    const e = g.data.escalators[at];
    if (!e) return;
    g.gameMode = 1;
    g.x2 = (X2_ORIGIN + (e.col + PLAY_COL) * 4) & 0xff; // (on the foot's first cell: every ride starts, and so ends, in the same place)
    g.esc = { index: at, t: 0, x2: g.x2, y: g.y };
    g.facing = e.dx > 0 ? 0x01 : 0x81;
    g.frameIndex = e.dx > 0 ? FRAME.walkRight : FRAME.walkLeft;
    return;
  }
  const e = g.data.escalators[r.index];
  if (!e) {
    g.esc = { ...NO_RIDE };
    return;
  }
  r.t++;
  const along = (total: number) => Math.round((total * r.t) / e.frames);
  g.x2 = (r.x2 + e.dx * along(e.cols * 4)) & 0xff;
  g.y = (r.y + e.dy * along(e.rows * 8)) & 0xff;
  if (r.t < e.frames) return;
  g.esc = { ...NO_RIDE };
  g.gameMode = 0;
  g.montyAction = 0;
  g.falling = 0;
}
