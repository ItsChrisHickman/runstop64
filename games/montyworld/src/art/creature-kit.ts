/**
 * The small helpers the regions' creatures are drawn with (Siberia's, China's, the Andes', Rio's): a shape laid over a body with a black
 * moat round it, and a creature made from four frames facing left.
 */
import { creatureBank, mirrored } from './pixels';
import { over, Raster } from './raster';
import type { NewCreature } from './types';

/** A shape on its own raster, laid over `r` with a black moat round it (raster.ts `over`). */
export function lay(r: Raster, draw: (s: Raster) => void) {
  const s = new Raster(16, 16);
  draw(s);
  over(r, s);
}

/** The four frames of a creature that goes left, and their mirrors for going right. */
export function pair(name: string, left: readonly (readonly string[])[], colour: number, copy = false): NewCreature {
  return { frames: creatureBank(name, left, left.map(mirrored)), copy, colour };
}

/** A picture drawn as its left half (8 wide) and mirrored to a whole 16: for things seen from the front. */
export const sym = (half: readonly string[]): string[] => half.map((row) => row + [...row].reverse().join(''));

/** Discs along a path, each (x, y, radius): a body that bends (a dolphin, a snake). */
export function capsule(r: Raster, pts: readonly (readonly [number, number, number])[]) {
  for (let i = 0; i + 1 < pts.length; i++) {
    const a = pts[i], b = pts[i + 1];
    if (!a || !b) continue;
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) * 2));
    for (let k = 0; k <= n; k++) {
      const t = k / n;
      r.disc(a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t);
    }
  }
}
