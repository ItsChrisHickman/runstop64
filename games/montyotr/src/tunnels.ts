import { X2_ORIGIN, Y_ORIGIN } from '../../shared/monty/body';
import { PLAY_COL, PLAY_COLS, PLAY_ROW, ROW, SCREEN } from '../../shared/monty/screen';
import type { Game } from './game';

/**
 * Tunnel mouths (a game's `tunnels`: Do Svidaniya Monty's Trans-Siberian): a portal of rock, `cols` cells wide and from row `top`
 * to row `bottom` of the playfield, sweeps a room from one end to the other, a cell every `step` frames. It is seen the whole way
 * and warned of: after `rest` frames the cell at its entry flashes for `warn` frames, then it comes on. Anything of Monty inside
 * its cells when it reaches him is death (event 1, as a crusher's head is): on a roof, up a rope. Under the roof (a hatch's rope,
 * the car) is safe. It is drawn in the room's own characters (the tile `code`, 1-8, of the room's palette, a passable one), over
 * whatever is in its cells, which are put back as it moves on.
 */

/** A cell of the screen as it was before the portal was drawn over it: its character and its colour. */
type Saved = readonly [chr: number, colour: number];

/** A tunnel mouth of the room: its phase, the frames in it, its left column (playfield cells, any of -cols to 32), what it covers. */
export interface TunnelState { state: 'rest' | 'warn' | 'sweep'; t: number; left: number; under: Map<number, Saved> }

/** A room is loaded: every mouth at rest, the first after its offset. */
export function tunnelInit(g: Game) {
  g.tunnels = g.data.tunnels.filter((e) => e.room === g.roomId).map((e) => ({
    state: 'rest' as const, t: -(e.offset ?? 0), left: e.from === 'right' ? PLAY_COLS : -e.cols, under: new Map(),
  }));
}

/** Put back what the portal covers. */
function uncover(g: Game, t: TunnelState) {
  for (const [at, [chr, colour]] of t.under) { g.mem[SCREEN + at] = chr; g.col[at] = colour; }
  t.under.clear();
}

/** Draw `code` on a cell of the playfield (`null`: leave it empty), keeping what was there. */
function paint(g: Game, t: TunnelState, col: number, row: number, code: number | null) {
  if (col < 0 || col >= PLAY_COLS) return;
  const at = (row + PLAY_ROW) * ROW + col + PLAY_COL;
  if (!t.under.has(at)) t.under.set(at, [g.mem[SCREEN + at] ?? 0, g.col[at] ?? 0]);
  g.mem[SCREEN + at] = code ?? 0;
  if (code !== null) g.col[at] = g.roomColours[code - 1] ?? 1;
}

/** The sprite pixels of a playfield column's left edge and a row's top, as the icicles measure them. */
const pixelX = (col: number) => 2 * X2_ORIGIN + (col + PLAY_COL) * 8;
const pixelY = (row: number) => Y_ORIGIN + (row + PLAY_ROW) * 8;

/** Whether Monty (his box, the sides trimmed a little) is in the portal's cells. */
function inside(g: Game, left: number, cols: number, top: number, bottom: number): boolean {
  const mx = g.x2 * 2;
  return mx + 14 > pixelX(left) && pixelX(left + cols) > mx + 2 && g.y < pixelY(bottom + 1) && pixelY(top) < g.y + 16;
}

/** One frame: each mouth of the room a step on, a death if it has him. */
export function tunnelUpdate(g: Game) {
  const specs = g.data.tunnels.filter((e) => e.room === g.roomId);
  g.tunnels.forEach((t, i) => {
    const e = specs[i];
    if (!e) return;
    const dir = e.from === 'right' ? -1 : 1;
    const edge = e.from === 'right' ? PLAY_COLS - 1 : 0;
    const start = e.from === 'right' ? PLAY_COLS : -e.cols;
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
            paint(g, t, c, r, r === e.top || c === t.left || c === t.left + e.cols - 1 ? e.code : null);
          }
        }
        if (!g.actionCounter && inside(g, t.left, e.cols, e.top, e.bottom)) g.actionCounter = 1;
        break;
    }
  });
}
