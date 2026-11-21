import { X2_ORIGIN, Y_ORIGIN } from '../../shared/monty/body';
import { PLAY_COL, PLAY_ROW } from '../../shared/monty/screen';
import type { Game } from './game';

/**
 * Icicles (a game's `icicles`: Do Svidaniya Monty's eaves): seen all the time, hanging. When Monty's width is over one's
 * column it shivers for `WARN` frames (it flickers and shakes: the warning), then falls `FALL` pixels a frame to the floor,
 * breaks (`SHATTER` frames) and grows back (`GROW` frames, not armed while it does). Running straight under one is safe: his box
 * is over the column for about 24 frames and the icicle does not begin to fall until it has shivered for 24, by when he has
 * gone by. Stopping or turning back under one is not; it kills as a crusher's head does (event 1). Each is a sprite (1 and 2,
 * the lift's and the cloud's, which these rooms have no use for: a room has two at most).
 */

export const WARN = 24;
export const FALL = 4;
export const SHATTER = 8;
export const GROW = 60;


/** An icicle of the room: its state, the frames it has been in it, and where its top is (sprite y). */
export interface IcicleState { state: 'hang' | 'shiver' | 'fall' | 'shatter' | 'grow'; t: number; y: number }

/** The icicles' frames and Monty's box are in sprite pixels: 8 wide and 16 tall; Monty's 16 by 16, his sides trimmed. */
const WIDTH = 8, HEIGHT = 16, TRIM = 2;

/** A room is loaded: its icicles hanging. */
export function icicleInit(g: Game) {
  g.ice = g.data.icicles.filter((e) => e.room === g.roomId).map((e) => ({ state: 'hang' as const, t: 0, y: top(e.row) }));
}

const top = (row: number) => Y_ORIGIN + (row + PLAY_ROW) * 8;
/** Sprite x of the icicle's column (the sprite's x halved, as `sx` has it: a cell is 4). */
const halfX = (col: number) => X2_ORIGIN + (col + PLAY_COL) * 4;

/** Whether Monty's box is over (armed) or touches (`hit`) the icicle's. */
function overlaps(g: Game, col: number, y: number, trim: number, deep: boolean): boolean {
  const ix = halfX(col) * 2, mx = g.x2 * 2;
  if (mx + 16 - trim <= ix || ix + WIDTH <= mx + trim) return false;
  // armed: he is not above it; hit: their boxes meet
  return deep ? g.y < y + HEIGHT && y < g.y + 16 : g.y + 16 > y;
}

/** One frame: each icicle of the room one step (after Monty's move), its sprite set, a death if it falls on him. */
export function icicleUpdate(g: Game) {
  const specs = g.data.icicles.filter((e) => e.room === g.roomId);
  const { iceSprites } = g.data;
  g.ice.forEach((ic, i) => {
    const e = specs[i];
    if (!e) return;
    const rest = top(e.row);
    const landed = top(e.floor) - HEIGHT;
    ic.t++;
    switch (ic.state) {
      case 'hang':
        if (overlaps(g, e.col, ic.y, 0, false)) { ic.state = 'shiver'; ic.t = 0; }
        break;
      case 'shiver':
        if (ic.t >= WARN) { ic.state = 'fall'; ic.t = 0; }
        break;
      case 'fall':
        ic.y = Math.min(landed, ic.y + FALL);
        if (!g.actionCounter && overlaps(g, e.col, ic.y, TRIM, true)) g.actionCounter = 1;
        if (ic.y >= landed) { ic.state = 'shatter'; ic.t = 0; }
        break;
      case 'shatter':
        if (ic.t >= SHATTER) { ic.state = 'grow'; ic.t = 0; ic.y = rest; }
        break;
      case 'grow':
        if (ic.t >= GROW - SHATTER) { ic.state = 'hang'; ic.t = 0; }
        break;
    }
    const n = 1 + i;
    const shake = ic.state === 'shiver' ? (ic.t & 2 ? 1 : -1) : 0;
    g.sx[n] = halfX(e.col) + shake;
    g.sy[n] = ic.y;
    g.scol[n] = ic.state === 'shiver' && ic.t & 4 ? 1 : 3;
    switch (ic.state) {
      case 'shatter': g.sptr[n] = iceSprites.shards; break;
      case 'grow': g.sptr[n] = ic.t < (GROW - SHATTER) / 2 ? iceSprites.small : iceSprites.half; break;
      default: g.sptr[n] = iceSprites.full;
    }
    g.enable |= 1 << n;
  });
}
