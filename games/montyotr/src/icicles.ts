import { montyAcross, montyMeets, pixelX, pixelY } from './cells';
import type { Game } from './game';
import type { IcicleSpec } from './montydata';

/**
 * Icicles (a game's `icicles`: Do Svidaniya Monty's eaves): seen all the time, hanging. When Monty's width is over one's
 * column it shivers for `WARN` frames (it flickers and shakes: the warning), then falls `FALL` pixels a frame to the floor,
 * breaks (`SHATTER` frames) and grows back (`GROW` frames, not armed while it does). Running straight under a plain one is safe: his
 * box is over the column for about 24 frames and the icicle does not begin to fall until it has shivered for 24, by when he has
 * gone by. Stopping or turning back under one is not; it kills as a crusher's head does (event 1). So each icicle picks one of two
 * ways to be a puzzle (Chris: they "are never hard unless you stop and wait for them"): `lead`, it arms that many cells ahead of him
 * in the way he faces, so walking on meets the fall and the shake says stop; `period`, it drips on its own clock, a crusher's way. Each is a sprite (1 and 2,
 * the lift's and the cloud's, which these rooms have no use for: a room has two at most).
 */

export const WARN = 24;
export const FALL = 4;
export const SHATTER = 8;
export const GROW = 60;


/** An icicle of the room: its state, the frames it has been in it, where its top is (sprite y), and the frames since the room loaded (a `period` one's clock). */
export interface IcicleState { state: 'hang' | 'shiver' | 'fall' | 'shatter' | 'grow'; t: number; y: number; clock: number }

/** Frames from an icicle's first shiver to hanging again: what a `period` must be at least. */
export const cycleFrames = (e: IcicleSpec): number => WARN + Math.ceil((pixelY(e.floor) - HEIGHT - pixelY(e.row)) / FALL) + GROW + 1;

/** Whether a `period` icicle begins to shiver on frame `clock` of the room. */
export const dripsAt = (e: IcicleSpec, clock: number): boolean => e.period !== undefined && clock >= (e.phase ?? 0) && (clock - (e.phase ?? 0)) % e.period === 0;

/** The icicles' frames and Monty's box are in sprite pixels: 8 wide and 16 tall; Monty's 16 by 16, his sides trimmed. */
const WIDTH = 8, HEIGHT = 16, TRIM = 2;

/** A room is loaded: its icicles hanging. */
export function icicleInit(g: Game) {
  g.ice = g.data.icicles.filter((e) => e.room === g.roomId).map((e) => ({ state: 'hang' as const, t: 0, y: pixelY(e.row), clock: 0 }));
}


/** Whether Monty's box is over (armed) or touches (`hit`) the icicle's. */
function overlaps(g: Game, col: number, y: number, trim: number, deep: boolean): boolean {
  // armed: he is not above it; hit: their boxes meet
  return deep ? montyMeets(g, pixelX(col), y, WIDTH, HEIGHT, trim) : montyAcross(g, pixelX(col), WIDTH, trim) && g.y + 16 > y;
}

/** Whether Monty arms an icicle: under it, or (with `lead`) coming toward it, that many cells short of its column in the way he faces. */
export function arms(g: Game, e: IcicleSpec, y: number): boolean {
  if (overlaps(g, e.col, y, 0, false)) return true;
  if (!e.lead || g.y + 16 <= y) return false;
  const ahead = e.lead * 8, x = pixelX(e.col);
  return g.facing & 0x80 ? montyAcross(g, x, WIDTH + ahead, 0) : montyAcross(g, x - ahead, WIDTH + ahead, 0);
}

/** One frame: each icicle of the room one step (after Monty's move), its sprite set, a death if it falls on him. */
export function icicleUpdate(g: Game) {
  const specs = g.data.icicles.filter((e) => e.room === g.roomId);
  const { iceSprites } = g.data;
  g.ice.forEach((ic, i) => {
    const e = specs[i];
    if (!e) return;
    const rest = pixelY(e.row);
    const landed = pixelY(e.floor) - HEIGHT;
    ic.t++;
    ic.clock++;
    switch (ic.state) {
      case 'hang':
        if (e.period !== undefined ? dripsAt(e, ic.clock) : arms(g, e, ic.y)) { ic.state = 'shiver'; ic.t = 0; }
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
    g.sx[n] = (pixelX(e.col) >> 1) + shake;
    g.sy[n] = ic.y;
    g.scol[n] = ic.state === 'shiver' && ic.t & 4 ? 1 : e.colour ?? 3;
    switch (ic.state) {
      case 'shatter': g.sptr[n] = iceSprites.shards; break;
      case 'grow': g.sptr[n] = ic.t < (GROW - SHATTER) / 2 ? iceSprites.small : iceSprites.half; break;
      default: g.sptr[n] = iceSprites.full;
    }
    g.enable |= 1 << n;
  });
}
