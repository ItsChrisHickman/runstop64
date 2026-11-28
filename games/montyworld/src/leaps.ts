import type { RollerSpec } from '../../montyotr/src/montydata';
import { LEAP_POINTERS } from './andes-pointers';

/** A leap's width: it goes into the water again this many cells on from where it came out. */
const LEAP_W = 3;

/**
 * A fish's leap out of the water (a roller on a sprite of its own, `spread`: nose up, level and nose down as the three pictures follow it along): from under the water at `col` (the surface at row `shape.surface`, 17 by
 * default) up in an arc to its apex (row `apex`) and down into the water again `shape.width` cells on (three by default), `every` frames, the first `start` in; deadly on touch, and only in the air for part of each
 * period. The Amazon's piranhas (red), China's koi and carp (orange), Lahaina's humpback (a bigger arc, its own pictures and box: `shape`): the one leap, the colour each place's fish is.
 */
export function leap(room: number, sprite: number, col: number, apex: number, every: number, start: number, colour = 2, shape: Partial<LeapShape> = {}): RollerSpec {
  const width = shape.width ?? LEAP_W, surface = shape.surface ?? 17.5;
  const path = Array.from({ length: 9 }, (_, i): readonly [number, number] => {
    const t = i / 8;
    return [col + (t - 0.5) * width, surface - 4 * (surface - apex) * t * (1 - t)];
  });
  return { room, sprite, path, speed: 2, every, start, frames: shape.frames ?? LEAP_POINTERS, colour, spread: true, ...(shape.size ? { size: shape.size } : {}) };
}

/** What a leap other than a fish's changes: how wide and from what surface it arcs, its pictures and the box that kills. */
export interface LeapShape { width: number; surface: number; frames: readonly number[]; size: { readonly w: number; readonly h: number } }
