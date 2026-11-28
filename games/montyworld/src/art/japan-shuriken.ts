/**
 * The shuriken thrown across NINJA HIDEOUT's ground (japan.ts `HIDEOUT_SHURIKEN`, a roller): a four-pointed throwing star, steel with a hole at its middle, an item-sized picture (16 x 16) a quarter
 * turn on from the last, so it spins as it flies.
 */
import { itemBlock } from './pixels';
import { Raster } from './raster';

/** The star, `turn` eighths of a turn on (0 and 2 alike but for its points' bevel: four pictures make one spin of a quarter). */
function shurikenFrame(turn: number): string[] {
  const r = new Raster(16, 16);
  const a = (turn * Math.PI) / 8;
  for (let k = 0; k < 4; k++) {
    const t = a + (k * Math.PI) / 2, s = t + Math.PI / 4, u = t - Math.PI / 4;
    r.triangle(7.5 + Math.cos(t) * 7, 7.5 + Math.sin(t) * 7, 7.5 + Math.cos(s) * 2.5, 7.5 + Math.sin(s) * 2.5, 7.5 + Math.cos(u) * 2.5, 7.5 + Math.sin(u) * 2.5);
  }
  r.disc(7.5, 7.5, 2.6);
  r.rect(7, 7, 8, 8, false); // the hole at its middle
  return r.rows();
}
export const SHURIKEN_FRAMES: readonly Uint8Array[] = [0, 1, 2, 3].map((t) => itemBlock(`shuriken ${t}`, shurikenFrame(t)));
