/**
 * The game played headless and copied, for the tests and the route finder that go through its rooms: a copy of a
 * game between frames, one frame of play as the front end runs it (the sprite collisions read from the picture), the
 * sticks a player holds, and a settled arrival in a room.
 */
import { PixelRenderer, VicView } from 'c64kit';
import { Game, type Input as Stick } from '../src/game';
import { copyGame } from '../src/game-copy';

export { copyGame as copy };

/** Sprite-sprite collisions after a frame, as the front end reads them (VicView), looked at only when two sprites' boxes meet. */
export function collisions(g: Game) {
  const v = g.vic, box = (n: number) => {
    const r = v.sprites[n];
    return { x: (r.x >= 504 ? r.x - 504 : r.x) - 24, y: r.y - 50, w: v.expandX & (1 << n) ? 48 : 24, h: v.expandY & (1 << n) ? 42 : 21 };
  };
  const on = [0, 1, 2, 3, 4, 5, 6, 7].filter((n) => v.enable & (1 << n)).map(box);
  const meet = on.some((a, i) => on.slice(i + 1).some((b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h));
  if (!meet) return 0;
  const view = new VicView(new PixelRenderer(), v);
  view.update();
  return view.collisions(g.uncounted);
}

/** A game and the collisions its last frame left. */
export interface State { g: Game; col: number }

export const NONE: Stick = { left: false, right: false, up: false, down: false, fire: false };

/** One frame of play, as the front end runs it. */
export function frame(s: State, stick: Stick) {
  s.g.input = stick;
  s.g.inputFire = stick.fire;
  s.g.frame(s.col);
  s.col = collisions(s.g);
}

/** In a room, the transition done (a dissolve included). */
export const settled = (g: Game) => !g.freeze && !g.script;

export { enterRoom as arrive } from '../src/ending';
