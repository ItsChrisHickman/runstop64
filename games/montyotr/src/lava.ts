import { PLAY_COL, PLAY_COLS, PLAY_ROW, PLAY_ROWS, ROW, SCREEN } from '../../shared/monty/screen';
import { montyOver } from './cells';
import type { Game } from './game';
import type { LavaSpec } from './montydata';

/**
 * Rising lava (a game's `risingLava`: Do Svidaniya Monty's volcano): a basin of lava whose top rises a row every `stepFrames` from `baseRow` to `topRow`, holds, drains and
 * rises again (see `LavaSpec`). It starts at the bottom each time Monty comes into the room, so the room reads at once and the climb is the one thing to learn: be above it.
 * It is drawn in the room's own characters over the empty cells (and decorations) of its columns, which are put back as it drains; what of Monty is in it dies.
 */

/** The lava of the room: its place in the data's list, the frames into its cycle, the top row it has drawn (`PLAY_ROWS`: none), and what it covered, by screen cell. */
export interface LavaState { index: number; t: number; top: number; under: Map<number, readonly [chr: number, colour: number]> }

/** A room is loaded: the lava at the bottom, nothing drawn yet. */
export function lavaInit(g: Game) {
  g.lavas = g.data.risingLava.flatMap((e, index): LavaState[] => (e.room === g.roomId ? [{ index, t: 0, top: PLAY_ROWS, under: new Map() }] : []));
}

/** The row the lava's top is at, `t` frames into its cycle (`PLAY_ROWS`: below the room's last row, none). */
export function lavaTop(e: LavaSpec, t: number): number {
  const rows = e.baseRow - e.topRow, rise = rows * e.stepFrames, drain = rows * e.drainFrames;
  const at = t % (rise + e.holdFrames + drain);
  if (at < rise) return e.baseRow - Math.floor(at / e.stepFrames);
  if (at < rise + e.holdFrames) return e.topRow;
  return e.topRow + Math.floor((at - rise - e.holdFrames) / e.drainFrames);
}

/** One frame: the lava a step on, drawn where its top moved, a death if it has him. */
export function lavaUpdate(g: Game) {
  for (const l of g.lavas) {
    const e = g.data.risingLava[l.index];
    if (!e || (e.wakenBy !== undefined && !g.siCollected[e.wakenBy])) continue;
    l.t++;
    const top = lavaTop(e, l.t);
    if (top !== l.top) {
      for (let r = 0; r < PLAY_ROWS; r++) for (let c = e.col; c < e.col + e.cols && c < PLAY_COLS; c++) {
        const at = (r + PLAY_ROW) * ROW + c + PLAY_COL;
        const saved = l.under.get(at);
        if (r < top) {
          if (saved) { g.mem[SCREEN + at] = saved[0]; g.col[at] = saved[1]; l.under.delete(at); }
          continue;
        }
        const chr = g.mem[SCREEN + at] ?? 0;
        if (!saved && !g.mayCover(chr)) continue;
        if (!saved) l.under.set(at, [chr, g.col[at] ?? 0]);
        g.setRoomChar(at, r === top ? e.crest : e.code);
      }
      l.top = top;
    }
    // (not on the frame he leaves the room: climbing out of the top puts him at the bottom before the next room loads, in the lava's rows)
    if (!g.actionCounter && !g.roomExit && l.top < PLAY_ROWS && montyOver(g, e.col, e.cols, l.top, PLAY_ROWS - 1)) g.actionCounter = 1;
  }
}
