import { meetsMonty, pixelX, pixelY } from './cells';
import type { Game } from './game';
import type { DragonMoods, DragonSpec } from './montydata';
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
export interface DragonState {
  index: number; t: number;
  /** A dragon with `moods` (the yeti): where it is along its path (pixels of arc), the way it goes (1 or -1), what it is doing and for how many more frames, what comes after a roar, its pace (a fraction of its speed) and how long a charge has left. */
  pos: number; dir: 1 | -1; mode: 'go' | 'roar' | 'rest'; left: number; then: 'carry' | 'rest' | 'back' | 'charge'; pace: number; charging: number;
}

/** A room is loaded: every dragon at the start of its path. */
export function dragonInit(g: Game) {
  g.dragons = g.data.dragons.flatMap((e, index): DragonState[] => (e.room === g.roomId ? [{ index, t: 0, pos: 0, dir: 1, mode: 'go', left: 0, then: 'carry', pace: 1, charging: 0 }] : []));
}

/** How many frames a lap takes: the state's `t` goes round in this. */
export const lapFrames = (spec: DragonSpec) => Math.ceil(pathOf(spec).length / spec.speed);

/**
 * Where piece `i` is (sprite pixels, the top left of its 24 by 21) `t` frames into the lap: `gap` pixels of the path behind the one in front, or, for a rigid piece (the
 * yeti's four sprites: one body), the leader's place and its own offset from it.
 */
export const piecePlace = (spec: DragonSpec, i: number, t: number): readonly [number, number] => placeAt(spec, i, t * spec.speed);

/** The same, `s` pixels along the path (a dragon with moods does not go at a steady pace, so its place is not a function of the time). */
export function placeAt(spec: DragonSpec, i: number, s: number): readonly [number, number] {
  const piece = spec.pieces[i];
  if (piece?.rigid) {
    const [x, y] = pointAt(pathOf(spec), s);
    return [x + piece.rigid[0], y + piece.rigid[1]];
  }
  return pointAt(pathOf(spec), s - i * spec.gap);
}

/** The arc length at which each corner of the path lies (the spline's samples are `SAMPLES` to a corner). */
const cornerArc = (spec: DragonSpec, corner: number): number => pathOf(spec).arc[corner * SAMPLES] ?? 0;

/** Whether the arc position `to`, reached from `from` going `dir` (both inside one step, round a closed path of `length`), is past the position `at`. */
function crossed(from: number, to: number, at: number, dir: 1 | -1, length: number): boolean {
  const a = dir === 1 ? from : to, b = dir === 1 ? to : from;
  const lo = ((a % length) + length) % length, hi = lo + (b - a);
  return (at >= lo && at < hi) || (at + length >= lo && at + length < hi);
}

/** At a corner it may stop at: choose, from the game's random source, what the dragon does next (see DragonMoods). */
function choose(g: Game, d: DragonState, m: DragonMoods) {
  const r = g.random(), w = m.weights;
  d.pace = 1 + ((g.random() / 255) * 2 - 1) * m.pace;
  d.charging = 0;
  if (r < w.pause) d.then = 'rest';
  else if (r < w.pause + w.back) d.then = 'back';
  else if (r < w.pause + w.back + w.charge) d.then = 'charge';
  else { d.then = 'carry'; return; }
  d.mode = 'roar'; d.left = m.roar;
}

/** One frame of a dragon with moods: it stands roaring, rests, or goes a step (and at one of its stops chooses what next). */
function moodStep(g: Game, d: DragonState, e: DragonSpec, m: DragonMoods) {
  if (d.mode === 'roar') {
    if (--d.left > 0) return;
    if (d.then === 'back') { d.dir = d.dir === 1 ? -1 : 1; d.mode = 'go'; }
    else if (d.then === 'charge') { d.mode = 'go'; d.charging = m.charge.frames; }
    else if (d.then === 'rest') { d.mode = 'rest'; d.left = Math.round(m.rest + (g.random() * m.rest) / 255); }
    else d.mode = 'go';
    return;
  }
  if (d.mode === 'rest') { if (--d.left <= 0) d.mode = 'go'; return; }
  const length = pathOf(e).length, step = e.speed * d.pace * (d.charging > 0 ? m.charge.speed : 1);
  const from = d.pos;
  d.pos = ((d.pos + d.dir * step) % length + length) % length;
  if (d.charging > 0) d.charging--;
  for (const stop of m.stops) {
    if (crossed(from, from + d.dir * step, cornerArc(e, stop), d.dir, length)) { choose(g, d, m); break; }
  }
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
    if (e.moods) moodStep(g, d, e, e.moods);
    const roaring = e.moods !== undefined && d.mode === 'roar';
    e.pieces.forEach((piece, i) => {
      const s0 = e.moods ? d.pos : d.t * e.speed;
      const [px, y] = placeAt(e, i, s0);
      const x = roaring ? px + (d.left & 2 ? 3 : -3) : px; // (a roar: the body shakes where it stands)
      const t0 = s0;
      const n = piece.sprite;
      g.sx[n] = Math.max(0, Math.min(255, Math.round(x / 2)));
      g.sy[n] = Math.max(0, Math.min(255, Math.round(y)));
      g.scol[n] = piece.colour;
      // its picture: the frames are those of going left, then those of going right, and the pieces turn with the path
      const half = piece.frames.length >> 1, ahead = pointAt(pathOf(e), t0 + d.dir * 6 - (piece.rigid ? 0 : i * e.gap));
      const beat = roaring ? d.left >> 1 : d.charging > 0 ? d.t >> 2 : d.t >> 4; // (the stance changes quicker in a roar and a charge)
      g.sptr[n] = (piece.facing === 'front' ? piece.frames[beat % piece.frames.length] : piece.frames[(ahead[0] < x ? 0 : half) + (beat % half)]) ?? 0;
      g.enable |= 1 << n;
      if (!g.actionCounter && meetsMonty(g, x, y, WIDTH, HEIGHT, TRIM)) g.actionCounter = 1;
    });
  }
}
