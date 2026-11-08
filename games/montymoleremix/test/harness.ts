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

/**
 * Sprite-sprite collisions after a frame, as the VIC reports them: a sprite's bit is set where one of its pixels is on a pixel of another
 * (all the remix's sprites are hires, not expanded). Read from the sprite registers and the bank, a row of 24 pixels at a time; the
 * renderer's own (`collisionsInView`) is slow and the bot plays millions of frames.
 */
export function collisions(g: RemixGame): number {
  const v = g.vic;
  const on = [0, 1, 2, 3, 4, 5, 6, 7].filter((n) => v.enable & (1 << n)).map((n) => {
    const r = v.sprites[n];
    if (r === undefined) throw new Error(`no sprite ${n}`);
    return { n, x: (r.x >= 504 ? r.x - 504 : r.x) - 24, y: r.y - 50, at: (r.ptr & 0xff) * 64 };
  });
  let bits = 0;
  for (let i = 0; i < on.length; i++) {
    const a = on[i];
    if (a === undefined) continue;
    for (let j = i + 1; j < on.length; j++) {
      const b = on[j];
      if (b === undefined || Math.abs(a.x - b.x) >= 24 || Math.abs(a.y - b.y) >= 21) continue;
      const dx = b.x - a.x;
      for (let y = Math.max(a.y, b.y); y < Math.min(a.y, b.y) + 21; y++) {
        const ra = a.at + (y - a.y) * 3, rb = b.at + (y - b.y) * 3;
        const rowA = ((g.mem[ra] ?? 0) << 16) | ((g.mem[ra + 1] ?? 0) << 8) | (g.mem[ra + 2] ?? 0);
        const rowB = ((g.mem[rb] ?? 0) << 16) | ((g.mem[rb + 1] ?? 0) << 8) | (g.mem[rb + 2] ?? 0);
        if (((dx >= 0 ? rowA << dx : rowA >> -dx) & rowB & 0xffffff) !== 0) { bits |= (1 << a.n) | (1 << b.n); break; }
      }
    }
  }
  return bits;
}

/** The same, from the renderer's picture of the sprites (the check of `collisions`). */
export function collisionsInView(g: RemixGame): number {
  const v = g.vic;
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
