/**
 * The remix played headless, for the tests and the pictures: a frame as the front end runs it (the sprite collisions read from the
 * picture), the sticks a player holds, a place to stand in a room, and the 320 x 200 picture.
 */
import { PixelRenderer, VicView } from 'c64kit';
import { ROOM_COLS, ROOM_ROWS } from '../../montymole/src/room';
import type { MontyInput } from '../../shared/monty/body';
import { PLAY_COL, PLAY_ROW } from '../../shared/monty/screen';
import { RemixGame } from '../src/game';
import { roleAt, type RemixRoom } from '../src/retile';

export const NONE: MontyInput = { left: false, right: false, up: false, down: false, fire: false };

/** Sprite-sprite collisions after a frame, as the front end reads them (VicView), looked at only when two sprites' boxes meet. */
export function collisions(g: RemixGame): number {
  const v = g.vic;
  const box = (n: number) => {
    const r = v.sprites[n];
    if (r === undefined) throw new Error(`no sprite ${n}`);
    return { x: (r.x >= 504 ? r.x - 504 : r.x) - 24, y: r.y - 50, w: 24, h: 21 };
  };
  const on = [0, 1, 2, 3, 4, 5, 6, 7].filter((n) => v.enable & (1 << n)).map(box);
  const meet = on.some((a, i) => on.slice(i + 1).some((b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h));
  if (!meet) return 0;
  const view = new VicView(new PixelRenderer(), v);
  view.update();
  return view.collisions();
}

/** A game and the collisions its last frame left. */
export interface Play { g: RemixGame; col: number }

/** A new game at the start of room 0, settled. */
export function newGame(): Play {
  const g = new RemixGame();
  g.start();
  const p: Play = { g, col: 0 };
  for (let n = 0; n < 20 && (n === 0 || g.freeze || g.script); n++) g.frame(0);
  return p;
}

/** One frame of play with a stick held, as the front end runs it. */
export function step(p: Play, stick: MontyInput): void {
  p.g.input = stick;
  p.g.inputFire = stick.fire;
  p.g.frame(p.col);
  p.col = collisions(p.g);
}

/** In a room, the transition done. */
export const settled = (g: RemixGame): boolean => !g.freeze && !g.script;

/** The 320 x 200 picture (C64 colour indexes) of a game as the renderer shows it. */
export function picture(g: RemixGame): Uint8Array {
  const r = new PixelRenderer();
  const v = new VicView(r, g.vic);
  v.update();
  v.render(0);
  return r.picture();
}

/** The x2 and y of the cell (col, row) of the room (Monty's top left cell there). */
export const place = (col: number, row: number): { x2: number; y: number } => ({ x2: 0x0c + (PLAY_COL + col) * 4, y: 0x32 + (PLAY_ROW + row) * 8 });

/** A place Monty can stand: his 2 x 2 cells free, something to hold him under them. Nearest to a column and row first. */
export function standingSpot(room: RemixRoom, nearCol: number, nearRow: number): { col: number; row: number } | null {
  const free = (c: number, r: number) => {
    const role = roleAt(room, c, r);
    return role === null || role === 'decor';
  };
  const holds = (c: number, r: number) => {
    const role = roleAt(room, c, r);
    return role === 'solid' || role === 'platform';
  };
  let best: { col: number; row: number } | null = null;
  let bestD = Infinity;
  for (let r = 0; r < ROOM_ROWS - 2; r++) {
    for (let c = 1; c < ROOM_COLS - 3; c++) {
      if (!(free(c, r) && free(c + 1, r) && free(c, r + 1) && free(c + 1, r + 1))) continue;
      if (!(holds(c, r + 2) && holds(c + 1, r + 2))) continue;
      const d = Math.abs(c - nearCol) + Math.abs(r - nearRow) * 3;
      if (d < bestD) { bestD = d; best = { col: c, row: r }; }
    }
  }
  return best;
}
