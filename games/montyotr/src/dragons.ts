import { meetsMonty, pixelX, pixelY } from './cells';
import type { Game } from './game';
import type { DragonSpec } from './montydata';
import { measurePath, pathCache, pointAt, type MeasuredPath } from './paths';

/**
 * A dragon (a game's `dragons`: Do Svidaniya Monty's New Year dragon): pieces on sprites of their own follow one smooth closed path through the room,
 * a pixel a frame (`speed`), each `gap` pixels of the path behind the one in front, so the line of them winds as the path does. It is seen all the
 * time; whatever of it touches Monty is death (event 1). The path is a closed spline through the data's corners, measured once, by arc length; it
 * counts from the room's loading (the head on the first corner), so a room is the same each time he comes in. A piece is a 24 by 21 sprite; its head
 * (the first piece) animates through its `frames`.
 */

/** A piece's pictures are 24 by 21; it touches him when the two boxes meet, each trimmed a little (a dragon's edges are thin). */
const WIDTH = 24, HEIGHT = 21, TRIM = 4;
/** Samples of the spline between two corners. */
const SAMPLES = 24;

/** Catmull-Rom through the corners, closed, as points in sprite pixels. */
export function measure(corners: DragonSpec['path']): MeasuredPath {
  const n = corners.length;
  const px = corners.map(([c, r]): [number, number] => [pixelX(c), pixelY(r)]);
  const at = (i: number) => px[((i % n) + n) % n] ?? [0, 0];
  const points: [number, number][] = [];
  for (let i = 0; i < n; i++) {
    const [p0, p1, p2, p3] = [at(i - 1), at(i), at(i + 1), at(i + 2)];
    for (let k = 0; k < SAMPLES; k++) {
      const t = k / SAMPLES, t2 = t * t, t3 = t2 * t;
      const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
      points.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
    }
  }
  return measurePath(points, true);
}

/** The measured paths of the data's dragons, once. */
const pathOf = pathCache(({ path }: DragonSpec) => measure(path));

/** A dragon of the room: its place in the data's list (a copy of the game copies numbers, not the data) and the frames since the room's loading, going round with the path. */
export interface DragonState { index: number; t: number }

/** A room is loaded: every dragon at the start of its path. */
export function dragonInit(g: Game) {
  g.dragons = g.data.dragons.flatMap((e, index): DragonState[] => (e.room === g.roomId ? [{ index, t: 0 }] : []));
}

/** How many frames a lap takes: the state's `t` goes round in this. */
export const lapFrames = (spec: DragonSpec) => Math.ceil(pathOf(spec).length / spec.speed);

/** Where piece `i` is (sprite pixels, the top left of its 24 by 21) `t` frames into the lap. */
export function piecePlace(spec: DragonSpec, i: number, t: number): readonly [number, number] {
  return pointAt(pathOf(spec), t * spec.speed - i * spec.gap);
}

/**
 * The sprites the dragons' pieces are on, as the collision check's mask: the box test above is the one rule by which the dragon kills (the hardware's bits count
 * any touching pixel, and sprite 0's hits are read as an item), so VicView.collisions leaves them out.
 */
export function dragonSprites(g: Game): number {
  let mask = 0;
  for (const d of g.dragons) for (const piece of g.data.dragons[d.index]?.pieces ?? []) mask |= 1 << piece.sprite;
  return mask;
}

/** One frame (after Monty's move): each dragon a step on, its pieces placed and shown, a death if one touches him. */
export function dragonUpdate(g: Game) {
  for (const d of g.dragons) {
    const e = g.data.dragons[d.index];
    if (!e) continue;
    d.t = (d.t + 1) % lapFrames(e);
    e.pieces.forEach((piece, i) => {
      const [x, y] = piecePlace(e, i, d.t);
      const t0 = d.t * e.speed;
      const n = piece.sprite;
      g.sx[n] = Math.max(0, Math.min(255, Math.round(x / 2)));
      g.sy[n] = Math.max(0, Math.min(255, Math.round(y)));
      g.scol[n] = piece.colour;
      // its picture: the frames are those of going left, then those of going right, and the pieces turn with the path
      const half = piece.frames.length >> 1, ahead = pointAt(pathOf(e), t0 + 6 - i * e.gap);
      g.sptr[n] = piece.frames[(ahead[0] < x ? 0 : half) + ((d.t >> 4) % half)] ?? 0;
      g.enable |= 1 << n;
      if (!g.actionCounter && meetsMonty(g, x, y, WIDTH, HEIGHT, TRIM)) g.actionCounter = 1;
    });
  }
}
