import { PLAY_COL, PLAY_COLS, PLAY_ROW, ROW, SCREEN } from '../../shared/monty/screen';
import { montyOver } from './cells';
import type { Game } from './game';
import type { TunnelSpec } from './montydata';

/**
 * Tunnel mouths (a game's `tunnels`: Do Svidaniya Monty's Trans-Siberian): a portal of rock, `cols` cells wide and from row `top`
 * to row `bottom` of the playfield, sweeps a room from one end to the other, a cell every `step` frames. It is seen the whole way
 * and warned of: after `rest` frames the cell at its entry flashes for `warn` frames, then it comes on. Anything of Monty inside
 * its cells when it reaches him is death (event 1, as a crusher's head is): on a roof, up a rope. Under the roof (a hatch's rope,
 * the car) is safe. It is drawn in the room's own characters (the tile `code`, 1-8, of the room's palette, a passable one), over
 * whatever is in its cells, which are put back as it moves on.
 */

/**
 * A tunnel mouth of the room: its phase, the frames in it, its left column (playfield cells, any of -cols to 32), the screen cells it
 * has drawn on (`over`). What was under them is kept by the game (`Game.tunnelUnder`), once, as it was before any mouth drew: two mouths
 * crossing each other put back the room, not each other's portal. Its `spec` (the data's) is kept with it, so a frame looks nothing up.
 */
export interface TunnelState { spec: TunnelSpec; state: 'rest' | 'warn' | 'sweep'; t: number; left: number; over: Set<number> }

/** A room is loaded: every mouth at rest, the first after its offset. */
export function tunnelInit(g: Game) {
  g.tunnels = g.data.tunnels.filter((e) => e.room === g.roomId).map((e): TunnelState => ({
    spec: e, state: 'rest', t: -(e.offset ?? 0), left: e.from === 'right' ? PLAY_COLS : -e.cols, over: new Set<number>(),
  }));
  g.tunnelUnder = new Map();
}

/** Put back what the portal covers. */
function uncover(g: Game, t: TunnelState) {
  for (const at of t.over) {
    if (g.tunnels.some((o) => o !== t && o.over.has(at))) continue; // (another mouth is still over it)
    const was = g.tunnelUnder.get(at);
    if (was) { g.mem[SCREEN + at] = was[0]; g.col[at] = was[1]; g.tunnelUnder.delete(at); }
  }
  t.over.clear();
}

/** Draw `code` on a cell of the playfield (`null`: leave it empty), keeping what was there. */
function paint(g: Game, t: TunnelState, col: number, row: number, code: number | null) {
  if (col < 0 || col >= PLAY_COLS) return;
  const at = (row + PLAY_ROW) * ROW + col + PLAY_COL;
  if (!g.tunnelUnder.has(at)) g.tunnelUnder.set(at, [g.mem[SCREEN + at] ?? 0, g.col[at] ?? 0]);
  t.over.add(at);
  g.setRoomChar(at, code ?? 0);
}

/** One frame: each mouth of the room a step on, a death if it has him. */
export function tunnelUpdate(g: Game) {
  for (const t of g.tunnels) {
    const e = t.spec;
    const dir = e.from === 'right' ? -1 : 1;
    const edge = e.from === 'right' ? PLAY_COLS - 1 : 0;
    const start = e.from === 'right' ? PLAY_COLS : -e.cols;
    const wall = e.wall ?? 1;
    t.t++;
    switch (t.state) {
      case 'rest':
        if (t.t >= e.rest) { t.state = 'warn'; t.t = 0; }
        break;
      case 'warn':
        uncover(g, t);
        if (t.t >= e.warn) { t.state = 'sweep'; t.t = 0; t.left = start; break; }
        if (t.t & 8) for (let r = e.top; r <= e.bottom; r++) paint(g, t, edge, r, e.code);
        break;
      case 'sweep':
        if (t.t % e.step === 0) {
          t.left += dir;
          uncover(g, t);
          if (t.left <= -e.cols || t.left > PLAY_COLS) { t.state = 'rest'; t.t = 0; t.left = start; break; }
          for (let r = e.top; r <= e.bottom; r++) for (let c = t.left; c < t.left + e.cols; c++) {
            paint(g, t, c, r, r < e.top + wall || c < t.left + wall || c >= t.left + e.cols - wall ? e.code : null);
          }
        }
        if (!g.actionCounter && montyOver(g, t.left, e.cols, e.top, e.bottom)) g.actionCounter = 1;
        break;
    }
  }
}
