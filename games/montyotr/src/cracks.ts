import { PLAY_COL, PLAY_ROW, ROW, SCREEN } from '../../shared/monty/screen';
import { standingCell } from './escalators';
import type { Game } from './game';

/**
 * Cracking ice (a game's `cracks`: Do Svidaniya Monty's Lake Baikal): a patch of floor, `cols` cells wide on playfield row `row`,
 * that counts the frames Monty stands on it (a jump is not standing). After `crack` frames it shows lines (`codes[1]`), after
 * `wide` wider ones (`codes[2]`) and after `gone` it is gone, whatever is under it taking him, for `away` frames, then it is back
 * whole. Off it the count dies away a frame a frame, so crossing is safe and waiting is not.
 */

/** A patch's count of the frames stood on, its stage (0 whole, 1 lines, 2 wide, 3 gone) and the frames it has been gone. */
export interface CrackState { t: number; stage: 0 | 1 | 2 | 3; away: number }

/** A room is loaded: every patch whole. */
export function crackInit(g: Game) {
  g.cracks = g.data.cracks.filter((e) => e.room === g.roomId).map((): CrackState => ({ t: 0, stage: 0, away: 0 }));
}

/** One frame (after Monty's move): each patch of the room counted and shown. */
export function crackUpdate(g: Game) {
  const specs = g.data.cracks.filter((e) => e.room === g.roomId);
  g.cracks.forEach((c, i) => {
    const e = specs[i];
    if (!e) return;
    const before = c.stage;
    if (c.stage === 3) {
      if (++c.away >= e.away) { c.stage = 0; c.t = 0; }
    } else {
      const cell = standingCell(g, e.row);
      const on = cell !== null && cell + 1 >= e.col && cell < e.col + e.cols;
      c.t = on ? c.t + 1 : Math.max(0, c.t - 1);
      c.stage = c.t >= e.gone ? 3 : c.t >= e.wide ? 2 : c.t >= e.crack ? 1 : 0;
      if (c.stage === 3) c.away = 0;
    }
    if (c.stage === before) return;
    const code = c.stage === 3 ? 0 : e.codes[c.stage];
    for (let col = e.col; col < e.col + e.cols; col++) {
      const at = (e.row + PLAY_ROW) * ROW + col + PLAY_COL;
      g.mem[SCREEN + at] = code;
      if (code) g.col[at] = g.roomColours[code - 1] ?? 1;
    }
  });
}
