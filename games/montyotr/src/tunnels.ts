import { PLAY_COL, PLAY_COLS, PLAY_ROW, ROW, SCREEN } from '../../shared/monty/screen';
import { montyMeets, montyOver, pixelX, pixelY } from './cells';
import type { Game } from './game';
import type { TunnelSpec } from './montydata';

/**
 * Tunnel mouths (a game's `tunnels`: Do Svidaniya Monty's Trans-Siberian): a portal of rock, `cols` cells wide and from row `top`
 * to row `bottom` of the playfield, sweeps a room from one end to the other, a cell every `step` frames. It is seen the whole way
 * and warned of: after `rest` frames the cell at its entry flashes for `warn` frames, then it comes on. Anything of Monty inside
 * its cells when it reaches him is death (event 1, as a crusher's head is): on a roof, up a rope. Under the roof (a hatch's rope,
 * the car) is safe. It is drawn in the room's own characters (the tile `code`, 1-8, of the room's palette, a passable one), over
 * whatever is in its cells, which are put back as it moves on. With a `picture` it is that instead of a portal (the bullet train: its nose, windows and band, drawn in the room's characters).
 */

/**
 * A tunnel mouth of the room: its phase, the frames in it, its left column (playfield cells, any of -cols to 32), the screen cells it
 * has drawn on (`over`). What was under them is kept by the game (`Game.tunnelUnder`), once, as it was before any mouth drew: two mouths
 * crossing each other put back the room, not each other's portal. Its `spec` (the data's) is kept with it, so a frame looks nothing up.
 */
export interface TunnelState { spec: TunnelSpec; state: 'rest' | 'warn' | 'sweep' | 'done'; t: number; left: number; over: Set<number> }

/** The columns a mouth runs between (the room's width, or its `span`): the first, and one past the last. */
const lanes = (e: TunnelSpec) => ({ lo: e.span?.from ?? 0, hi: (e.span?.to ?? PLAY_COLS - 1) + 1 });
/** Its left column when it comes in. */
const startOf = (e: TunnelSpec) => (e.from === 'right' ? lanes(e).hi : lanes(e).lo - e.cols);

/** A room is loaded: every mouth at rest, the first after its offset. */
export function tunnelInit(g: Game) {
  g.tunnels = g.data.tunnels.filter((e) => e.room === g.roomId).map((e): TunnelState => ({
    spec: e, state: 'rest', t: -(e.offset ?? 0), left: startOf(e), over: new Set<number>(),
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
  if (col < -PLAY_COL || col >= ROW - PLAY_COL) return; // (the screen's width: the margins either side of the playfield too)
  const at = (row + PLAY_ROW) * ROW + col + PLAY_COL;
  if (!g.tunnelUnder.has(at)) g.tunnelUnder.set(at, [g.mem[SCREEN + at] ?? 0, g.col[at] ?? 0]);
  t.over.add(at);
  g.setRoomChar(at, code ?? 0);
}

/** Whether the cell at a playfield column and row was a wall as the room has it (before any mouth drew on it); a rope or ladder is not one for a mouth that `coversClimbs`. */
function solidCell(g: Game, col: number, row: number, e: TunnelSpec): boolean {
  const at = (row + PLAY_ROW) * ROW + col + PLAY_COL;
  const flag = g.tileFlag(g.tunnelUnder.get(at)?.[0] ?? g.mem[SCREEN + at] ?? 0);
  return flag !== 0 && !(flag === 3 && e.coversClimbs);
}

/** Whether Monty is over a cell the picture is drawn in (the nose's empty cells are not the train). */
function touchesPicture(g: Game, t: TunnelState): boolean {
  const e = t.spec;
  for (let r = e.top; r <= e.bottom; r++) for (let c = Math.max(0, t.left); c < Math.min(PLAY_COLS, t.left + e.cols); c++) {
    if (t.over.has((r + PLAY_ROW) * ROW + c + PLAY_COL) && montyMeets(g, pixelX(c), pixelY(r), 8, 8, 2)) return true;
  }
  return false;
}

/** One frame: each mouth of the room a step on, a death if it has him. */
export function tunnelUpdate(g: Game) {
  for (const t of g.tunnels) {
    const e = t.spec;
    const dir = e.from === 'right' ? -1 : 1;
    const { lo, hi } = lanes(e);
    const margin = e.bleed ? PLAY_COL : 0; // (how far past the playfield a bleeding mouth is drawn, and runs on before it is gone)
    const edge = e.from === 'right' ? hi - 1 : lo;
    const start = startOf(e);
    const wall = e.wall ?? 1;
    t.t++;
    switch (t.state) {
      case 'done':
        break;
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
          if (t.left <= lo - margin - e.cols || t.left > hi + margin) { t.state = e.once ? 'done' : 'rest'; t.t = 0; t.left = start; break; }
          for (let r = e.top; r <= e.bottom; r++) for (let c = Math.max(t.left, lo - margin); c < Math.min(t.left + e.cols, hi + margin); c++) {
            if (e.picture) {
              const code = e.picture[r - e.top]?.[c - t.left] ?? 0;
              if (code && !solidCell(g, c, r, e)) paint(g, t, c, r, code); // (a train goes into the tiled wall as into a tunnel: not drawn over it)
            } else paint(g, t, c, r, r < e.top + wall || c < t.left + wall || c >= t.left + e.cols - wall ? e.code : null);
          }
        }
        // (only where it is drawn: the part of it outside its span, coming in or going out, is not there to be touched)
        if (!e.harmless && !g.actionCounter && Math.min(t.left + e.cols, hi) > Math.max(t.left, lo) && montyOver(g, Math.max(t.left, lo), Math.min(t.left + e.cols, hi) - Math.max(t.left, lo), e.top, e.bottom) && (!e.picture || touchesPicture(g, t))) g.actionCounter = 1;
        break;
    }
  }
}
