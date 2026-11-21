import { X2_ORIGIN } from '../../shared/monty/body';
import { PLAY_COL, PLAY_ROW } from '../../shared/monty/screen';
import { FRAME } from '../../shared/monty/frames';
import type { EscalatorSpec } from './montydata';
import type { Game } from './game';

/**
 * Escalators (a game's `escalators`: Do Svidaniya Monty's metro): a ride Monty cannot leave, made as the lift's and the crusher
 * head's are (gameMode 1: the stick does nothing, he is carried). Stepping on the foot starts it; from there a fixed pace
 * carries him along the slope and sets him down at its far end, standing on the landing. The other way round, walking onto the
 * landing's far side against the way it goes, the treads carry him back (he walks in place, as in life, while they push him on to the
 * landing and a cell beyond it): an escalator is never ignored from either end. The treads turn by the escalator's `treads`
 * (`animateTreads`, a step every other frame).
 */

/** The ride under way: which escalator (an index into the data's), the frame of it, where it began, and for a push back where it ends. */
export interface EscalatorRide { index: number; t: number; x2: number; y: number; back: boolean; to: number }

/** No ride. */
export const NO_RIDE: EscalatorRide = { index: -1, t: 0, x2: 0, y: 0, back: false, to: 0 };

/** The foot is two cells wide. */
const FOOT_WIDTH = 2;
/** The cells before the landing, on its row, where walking against the escalator is turned back. */
const PLATE = 2;
/** How many of the 16 places of the steps the belt moves in a turn of the treads (every other frame): 2 and two thirds, as fast as Monty is carried. */
const TREAD_STEP = 8 / 3;

/** A room is loaded: no ride. */
export function escalatorInit(g: Game) {
  g.esc = { ...NO_RIDE };
}

/** Whether he is standing on his feet in a room on its floor `row`: his left cell (the playfield's), or null (cracks.ts asks too). */
export function standingCell(g: Game, row: number): number | null {
  if (g.gameMode || g.falling || g.montyAction || g.onRope) return null;
  return g.montyRow + 2 === row + PLAY_ROW ? g.montyCol - PLAY_COL : null;
}

/** The escalator of this room whose foot Monty stands on (on its floor row, over one of its two cells, on his feet), or -1. */
function footUnder(g: Game): number {
  return g.data.escalators.findIndex((e) => {
    const cell = standingCell(g, e.row);
    return e.room === g.roomId && cell !== null && cell + 1 >= e.col && cell < e.col + FOOT_WIDTH;
  });
}

/** The landing's cell of an escalator, and its floor row. */
const landing = (e: EscalatorSpec) => ({ col: e.col + e.dx * e.cols, row: e.row + e.dy * e.rows });

/** The escalator of this room whose landing he is walking off the far side of (against the way it goes), or -1. */
function backUnder(g: Game): number {
  return g.data.escalators.findIndex((e) => {
    const end = landing(e), cell = standingCell(g, end.row);
    if (e.room !== g.roomId || cell === null) return false;
    const behind = (end.col - cell) * e.dx; // cells the landing is ahead of him along the way it goes
    return behind >= 1 && behind <= PLATE;
  });
}

/** One frame (after Monty's move): start a ride from the foot (or a push back from the landing's far side), or carry him on. */
export function escalatorUpdate(g: Game) {
  const r = g.esc;
  if (r.index < 0) {
    const at = footUnder(g);
    const e = g.data.escalators[at];
    if (e) {
      g.gameMode = 1;
      g.x2 = (X2_ORIGIN + (e.col + PLAY_COL) * 4) & 0xff; // (on the foot's first cell: every ride starts, and so ends, in the same place)
      g.esc = { index: at, t: 0, x2: g.x2, y: g.y, back: false, to: 0 };
      g.facing = e.dx > 0 ? 0x01 : 0x81;
      g.frameIndex = e.dx > 0 ? FRAME.walkRight : FRAME.walkLeft;
      return;
    }
    const back = backUnder(g);
    const b = g.data.escalators[back];
    if (!b) return;
    g.gameMode = 1;
    g.esc = { index: back, t: 0, x2: g.x2, y: g.y, back: true, to: (X2_ORIGIN + (landing(b).col + b.dx + PLAY_COL) * 4) & 0xff };
    g.facing = b.dx > 0 ? 0x81 : 0x01; // (he faces up the slope: he is walking against it)
    return;
  }
  const e = g.data.escalators[r.index];
  if (!e) {
    g.esc = { ...NO_RIDE };
    return;
  }
  r.t++;
  if (r.back) {
    // two thirds of a pixel a frame (as the belt goes), walking in place against it
    const length = (r.to - r.x2) * e.dx, done = Math.min(length, Math.floor(r.t / 3));
    g.x2 = (r.x2 + e.dx * done) & 0xff;
    g.frameIndex = (e.dx > 0 ? FRAME.walkLeft : FRAME.walkRight) + ((r.t >> 2) & 3);
    if (done < length) return;
  } else {
    const along = (total: number) => Math.round((total * r.t) / e.frames);
    g.x2 = (r.x2 + e.dx * along(e.cols * 4)) & 0xff;
    g.y = (r.y + e.dy * along(e.rows * 8)) & 0xff;
    if (r.t < e.frames) return;
  }
  g.esc = { ...NO_RIDE };
  g.gameMode = 0;
  g.montyAction = 0;
  g.falling = 0;
}

/** Every other frame: the treads' characters take the pictures of the next place of the steps (the room's own escalator, if it has one). */
export function animateTreads(g: Game) {
  const e = g.data.escalators.find((s) => s.room === g.roomId && s.treads);
  if (!e?.treads) return;
  g.treadTick++;
  const frames = e.treads.frames, frame = frames[Math.floor(g.treadTick * TREAD_STEP) % frames.length];
  if (frame) e.treads.chars.forEach((chr, i) => g.mem.set(frame.subarray(i * 8, i * 8 + 8), chr * 8));
}
