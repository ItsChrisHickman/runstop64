import { meetsMonty } from './cells';
import type { Game } from './game';
import type { RollerSpec } from './montydata';
import { pathCache, pointAt, polyline } from './paths';

/**
 * Rolling boulders (a game's `rollers`: Do Svidaniya Monty's Machu Picchu): a boulder on a sprite of its own rolls down a path of the room (the terraces: along a step, a fall over its edge, along the next), a
 * pixel a frame or what the data says, comes to the end of it and is gone until its turn comes round again, `every` frames after it started. Several on one path are one spec on several sprites, apart by the data's
 * starts (`rollerTrain`), so a terrace has one passing now and then. It is seen from the top of the path and all the way; it kills what of Monty it touches (event 1), the box test of the dragon and the icicles (the hardware's bits are left out:
 * `rollerSprites`). The time counts from the room's loading, so a room is the same each time he comes in.
 */

/** The picture is 16 by 16 (an item's size) unless the spec gives its `size`; it kills when the boxes meet, each trimmed a little (a boulder is round). */
const SIZE = 16, TRIM = 3;

/** The measured paths of the data's boulders, once. */
const pathOf = pathCache(({ path }: RollerSpec) => polyline(path));

/** Where a boulder is (sprite pixels, its top left) `t` frames into the room's time, or null while it is not on the path. */
export function rollerAt(spec: RollerSpec, t: number): { x: number; y: number; along: number } | null {
  const p = pathOf(spec);
  const along = (((t - spec.start) % spec.every) + spec.every) % spec.every * spec.speed;
  if (t < spec.start || along > p.length || (spec.passes !== undefined && t - spec.start >= spec.passes * spec.every)) return null;
  const [x, y] = pointAt(p, along);
  return { x, y, along };
}

/**
 * Several on one path at once (Machu Picchu's boulders; Mount Fuji's snowballs, Chris: "needs more snowballs at a time", the Donkey Kong barrels): the one roller on each sprite of `on` (the room's free
 * ones: two things on paths never share a sprite in a room), each `start` its own frames into the room's time, so the gaps between them are the data's to set (even, or a pair close together then a wait).
 */
export function rollerTrain(spec: Omit<RollerSpec, 'sprite' | 'start'>, on: readonly { readonly sprite: number; readonly start: number }[]): RollerSpec[] {
  return on.map(({ sprite, start }) => ({ ...spec, sprite, start }));
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

/** One frame (after Monty's move): each boulder a step on, placed, shown or hidden, a death if it has him. Rollers may share a sprite at different times (a flight's birds): a sprite is hidden only when none of its rollers is on its path. */
export function rollerUpdate(g: Game) {
  let shown = 0, mine = 0;
  for (const r of g.rollers) {
    const e = g.data.rollers[r.index];
    if (!e) continue;
    r.t++;
    const n = e.sprite, at = rollerAt(e, r.t);
    mine |= 1 << n;
    if (!at) continue;
    if (at.along === 0 && e.sound !== undefined) g.sfx(e.sound);
    shown |= 1 << n;
    g.sx[n] = Math.max(0, Math.min(255, Math.round(at.x / 2)));
    g.sy[n] = Math.max(0, Math.min(255, Math.round(at.y)));
    g.scol[n] = e.colour;
    const step = e.spread ? Math.min(e.frames.length - 1, Math.floor((at.along / Math.max(1, pathOf(e).length)) * e.frames.length)) : Math.floor(at.along / 8) % e.frames.length;
    g.sptr[n] = e.frames[step] ?? 0;
    g.enable |= 1 << n;
    if (!g.actionCounter && meetsMonty(g, at.x, at.y, e.size?.w ?? SIZE, e.size?.h ?? SIZE, TRIM)) g.actionCounter = 1;
  }
  g.enable &= ~(mine & ~shown) & 0xff;
}

/** Whether a roller of the room is on its path with its picture over a box of sprite pixels (a pursuer flying into a flock: pursuers.ts). */
export function rollerMeets(g: Game, x: number, y: number, w: number, h: number): boolean {
  return g.rollers.some((r) => {
    const e = g.data.rollers[r.index], at = e ? rollerAt(e, r.t) : null;
    return !!at && !!e && at.x + (e.size?.w ?? SIZE) - TRIM > x && x + w > at.x + TRIM && at.y + (e.size?.h ?? SIZE) - TRIM > y && y + h > at.y + TRIM;
  });
}
