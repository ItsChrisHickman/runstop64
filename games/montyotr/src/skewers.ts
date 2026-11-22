import { meetsMonty } from './cells';
import type { Game } from './game';
import type { SkewerSpec } from './montydata';

/**
 * Swinging skewers (a game's `skewers`: Do Svidaniya Monty's churrascaria): the gaucho's skewer is a sprite that follows the creature in a slot of the room, in his hand, and swings through its poses (down, forward and low,
 * straight out, up) once every `cycle` frames, the pose seen at once (it is a big picture) and the same for each gaucho a fraction of a cycle on from the last, so that a gap always comes. It faces the way he is walking. The
 * poses that are `deadly` kill what of Monty they touch (event 1, the box test of the dragon and the boulders); the sprite is no part of the hardware's collision (`skewerSprites`). The time counts from the room's loading.
 */

/** A skewer of the room: its place in the data's list (a copy of the game copies numbers, not the data), the frames since the room's loading, the way its gaucho goes and where he was. */
export interface SkewerState { index: number; t: number; facing: 'left' | 'right'; last: number }

export function skewerInit(g: Game) {
  g.skewers = g.data.skewers.flatMap((e, index): SkewerState[] => (e.room === g.roomId ? [{ index, t: 0, facing: 'left', last: -1 }] : []));
}

/** The pose a skewer is in `t` frames into the room's time. */
export function skewerPose(e: SkewerSpec, t: number): number {
  const at = (((t + e.offset) % e.cycle) + e.cycle) % e.cycle;
  return Math.floor((at * e.poses.length) / e.cycle);
}

/** The sprites the skewers are on, as the collision check's mask. */
export function skewerSprites(g: Game): number {
  let mask = 0;
  for (const s of g.skewers) mask |= 1 << (g.data.skewers[s.index]?.sprite ?? 0);
  return mask;
}

/** One frame (after Monty's move): each skewer a pose on, placed at its gaucho's hand, and a death if it has him. */
export function skewerUpdate(g: Game) {
  for (const s of g.skewers) {
    const e = g.data.skewers[s.index];
    if (!e) continue;
    const man = g.enemies[e.slot];
    s.t++;
    if (!man) { g.enable &= ~(1 << e.sprite) & 0xff; continue; }
    if (s.last >= 0 && man.x !== s.last) s.facing = man.x < s.last ? 'left' : 'right';
    s.last = man.x;
    const pose = e.poses[skewerPose(e, s.t)];
    if (!pose) continue;
    const side = pose[s.facing];
    const x = man.x * 2 + side.dx, y = man.y + side.dy;
    g.sx[e.sprite] = Math.max(0, Math.min(255, Math.round(x / 2)));
    g.sy[e.sprite] = Math.max(0, Math.min(255, Math.round(y)));
    g.sptr[e.sprite] = side.ptr;
    g.scol[e.sprite] = e.colour;
    g.enable |= 1 << e.sprite;
    if (pose.deadly && !g.actionCounter && meetsMonty(g, x, y, side.w, side.h, 4)) g.actionCounter = 1;
  }
}
