import { PLAY_COL, PLAY_ROW, ROW } from '../../shared/monty/screen';
import { montyOver } from './cells';
import type { Game } from './game';
import type { PulseSpec } from './montydata';

/**
 * Timed strikes (a game's `pulses`: Do Svidaniya Monty's firecrackers and reaching arms): cells that are harmless at rest, flicker for `warn` frames
 * (the warning), are deadly for `live` frames (event 1, as a crusher's head: what of Monty is in the cells), then show their `spent` look until the
 * period comes round and they are as they were. The period counts from the room's loading, so a room is the same each time he comes in. Each is
 * drawn in the room's own characters. The timing to learn is the data's: how long a group is live, how long it is spent, which groups follow which.
 */

/** A group's phases, in the order of a period. */
export type PulsePhase = 'idle' | 'warn' | 'live' | 'spent';

/** A group of the room: its place in the data's list (a copy of the game copies numbers, not the data), the frames into its period, and the character it has drawn (-1: none yet). */
export interface PulseState { index: number; t: number; drawn: number }

/** A room is loaded: every group at the start of its period (or its `offset` into it). */
export function pulseInit(g: Game) {
  g.pulses = g.data.pulses.flatMap((e, index): PulseState[] => (e.room === g.roomId ? [{ index, t: e.offset ?? 0, drawn: -1 }] : []));
}

/** Which phase a group is in at `t` frames into its period. */
export function pulsePhase(e: PulseSpec, t: number): PulsePhase {
  if (t < e.start) return 'idle';
  if (t < e.start + e.warn) return 'warn';
  if (t < e.start + e.warn + e.live) return 'live';
  return 'spent';
}

/** The character a group shows at `t` frames into its period (the warning flickers between the idle one and its own). */
export function pulseCode(e: PulseSpec, t: number): number {
  switch (pulsePhase(e, t)) {
    case 'idle': return e.idle;
    case 'warn': return t & 4 ? e.warnCode : e.idle;
    case 'live': return e.liveCode;
    case 'spent': return e.spent;
  }
}

/** One frame (after Monty's move): each group a step on, drawn when its character changes, a death if it is live over him. */
export function pulseUpdate(g: Game) {
  for (const p of g.pulses) {
    const e = g.data.pulses[p.index];
    if (!e) continue;
    p.t = (p.t + 1) % e.period;
    const code = pulseCode(e, p.t);
    if (code !== p.drawn) {
      p.drawn = code;
      for (let r = e.row; r < e.row + e.rows; r++) for (let c = e.col; c < e.col + e.cols; c++) g.setRoomChar((r + PLAY_ROW) * ROW + c + PLAY_COL, code);
    }
    if (!g.actionCounter && pulsePhase(e, p.t) === 'live' && montyOver(g, e.col, e.cols, e.row, e.row + e.rows - 1)) g.actionCounter = 1;
  }
}
