import { pixelX, pixelY } from './cells';

/**
 * A path of a room measured once, by arc length, for what follows a line through it a pixel a frame (Do Svidaniya Monty's dragon on a closed spline, its boulders on an open polyline): the points in sprite
 * pixels and the length up to each. `closed` says whether it goes round (the last point joins the first) or ends at the last.
 */
export interface MeasuredPath { points: readonly (readonly [number, number])[]; arc: readonly number[]; length: number; closed: boolean }

/** A path through the points (sprite pixels), measured. */
export function measurePath(points: readonly (readonly [number, number])[], closed: boolean): MeasuredPath {
  const arc: number[] = [0];
  const last = closed ? points.length : points.length - 1;
  for (let i = 1; i <= last; i++) {
    const a = points[i - 1] ?? [0, 0], b = points[i % points.length] ?? [0, 0];
    arc.push((arc[i - 1] ?? 0) + Math.hypot(b[0] - a[0], b[1] - a[1]));
  }
  return { points, arc, length: arc[last] ?? 0, closed };
}

/** The open path straight between the room's cells (column, row: a cell's top left, fractions allowed), measured. */
export const polyline = (cells: readonly (readonly [col: number, row: number])[]): MeasuredPath =>
  measurePath(cells.map(([c, r]): [number, number] => [pixelX(c), pixelY(r)]), false);

/** The point of a path `s` pixels along it: a closed one goes round (any number), an open one stops at its ends. */
export function pointAt(p: MeasuredPath, s: number): readonly [number, number] {
  const d = p.closed ? ((s % p.length) + p.length) % p.length : Math.max(0, Math.min(p.length, s));
  const segments = p.closed ? p.points.length : p.points.length - 1;
  let lo = 0, hi = segments;
  while (hi - lo > 1) { const mid = (lo + hi) >> 1; if ((p.arc[mid] ?? 0) <= d) lo = mid; else hi = mid; }
  const a = p.points[lo] ?? [0, 0], b = p.points[(lo + 1) % p.points.length] ?? [0, 0];
  const span = (p.arc[lo + 1] ?? 0) - (p.arc[lo] ?? 0);
  const f = span > 0 ? (d - (p.arc[lo] ?? 0)) / span : 0;
  return [a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f];
}

/** A cache of the measured paths of the data's specs, once each (the game copies numbers, not the data). */
export function pathCache<S extends object>(measure: (spec: S) => MeasuredPath): (spec: S) => MeasuredPath {
  const measured = new WeakMap<S, MeasuredPath>();
  return (spec) => {
    let p = measured.get(spec);
    if (!p) { p = measure(spec); measured.set(spec, p); }
    return p;
  };
}
