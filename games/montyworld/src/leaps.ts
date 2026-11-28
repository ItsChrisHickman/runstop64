import type { RollerSpec } from '../../montyotr/src/montydata';
import { LEAP_POINTERS } from './andes-pointers';

/** A leap's width: it goes into the water again this many cells on from where it came out. */
const LEAP_W = 3;

/**
 * A fish's leap out of the water (a roller on a sprite of its own, `spread`: nose up, level and nose down as the three pictures follow it along): from under the water at `col` (the surface at row 17) up in an
 * arc to its apex (row `apex`) and down into the water again three cells on, `every` frames, the first `start` in; deadly on touch, and only in the air for part of each period. The Amazon's piranhas
 * (red), China's koi and carp (orange): the one leap, the colour each place's fish is.
 */
export function leap(room: number, sprite: number, col: number, apex: number, every: number, start: number, colour = 2): RollerSpec {
  const path = Array.from({ length: 9 }, (_, i): readonly [number, number] => {
    const t = i / 8;
    return [col + (t - 0.5) * LEAP_W, 17.5 - 4 * (17.5 - apex) * t * (1 - t)];
  });
  return { room, sprite, path, speed: 2, every, start, frames: LEAP_POINTERS, colour, spread: true };
}
