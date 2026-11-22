import { meetsMonty } from './cells';
import type { Game } from './game';
import type { RollerSpec } from './montydata';
import { pathCache, pointAt, polyline } from './paths';

/**
 * Rolling boulders (a game's `rollers`: Do Svidaniya Monty's Machu Picchu): a boulder on a sprite of its own rolls down a path of the room (the terraces: along a step, a fall over its edge, along the next), a
 * pixel a frame or what the data says, comes to the end of it and is gone until its turn comes round again, `every` frames after it started. Each boulder of a room is the same path a third of a period apart, so a
 * terrace has one passing now and then. It is seen from the top of the path and all the way; it kills what of Monty it touches (event 1), the box test of the dragon and the icicles (the hardware's bits are left out:
 * `rollerSprites`). The time counts from the room's loading, so a room is the same each time he comes in.
 */

/** The picture is 16 by 16 (an item's size); it kills when the boxes meet, each trimmed a little (a boulder is round). */
const SIZE = 16, TRIM = 3;

/** The measured paths of the data's boulders, once. */
const pathOf = pathCache(({ path }: RollerSpec) => polyline(path));

/** Where a boulder is (sprite pixels, its top left) `t` frames into the room's time, or null while it is not on the path. */
export function rollerAt(spec: RollerSpec, t: number): { x: number; y: number; along: number } | null {
  const p = pathOf(spec);
  const along = (((t - spec.start) % spec.every) + spec.every) % spec.every * spec.speed;
  if (t < spec.start || along > p.length) return null;
  const [x, y] = pointAt(p, along);
  return { x, y, along };
}

/** A boulder of the room: its place in the data's list (a copy of the game copies numbers, not the data) and the frames since the room's loading. */
export interface RollerState { index: number; t: number }

export function rollerInit(g: Game) {
  g.rollers = g.data.rollers.flatMap((e, index): RollerState[] => (e.room === g.roomId ? [{ index, t: 0 }] : []));
}

/** The sprites the boulders are on, as the collision check's mask (the box test is the one rule by which a boulder kills). */
export function rollerSprites(g: Game): number {
  let mask = 0;
  for (const r of g.rollers) mask |= 1 << (g.data.rollers[r.index]?.sprite ?? 0);
  return mask;
}

/** One frame (after Monty's move): each boulder a step on, placed, shown or hidden, a death if it has him. */
export function rollerUpdate(g: Game) {
  for (const r of g.rollers) {
    const e = g.data.rollers[r.index];
    if (!e) continue;
    r.t++;
    const n = e.sprite, at = rollerAt(e, r.t);
    if (!at) { g.enable &= ~(1 << n) & 0xff; continue; }
    g.sx[n] = Math.max(0, Math.min(255, Math.round(at.x / 2)));
    g.sy[n] = Math.max(0, Math.min(255, Math.round(at.y)));
    g.scol[n] = e.colour;
    g.sptr[n] = e.frames[Math.floor(at.along / 8) % e.frames.length] ?? 0;
    g.enable |= 1 << n;
    if (!g.actionCounter && meetsMonty(g, at.x, at.y, SIZE, SIZE, TRIM)) g.actionCounter = 1;
  }
}
