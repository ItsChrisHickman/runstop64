/**
 * The small helpers the Andes' and Rio's creatures are drawn with (Siberia's creatures have their own copies of `lay` and `pair`; a
 * later pass may point them here): a shape laid over a body with a black moat round it, and a creature made from four frames facing left.
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
