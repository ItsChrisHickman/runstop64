/**
 * The Emperor's rooftops' scenery: a dusk sky in bands (blue overhead, a red glow toward the halls), the tips of an eave's tiles and a row of the beasts that march along a
 * golden ridge. The platforms Monty runs on are tiles (china-tiles.ts: roofRidge, roofBody, roofTile); these are what stands on and behind them. Solid ink with the detail
 * cut into it as black lines, never a dither.
 */
import { decor } from './decorations';
import { Raster } from './raster';
import type { NewDecor } from './types';

/** A band of the dusk sky: two thin lines across the character, stamped cell by cell over the sky. Blue overhead. 1 x 1 characters. */
function duskBand(): NewDecor {
  const r = new Raster(8, 8);
  r.rect(0, 1, 7, 1); r.rect(0, 5, 7, 5);
  return decor('duskBand', 1, 1, r, 6);
}

/** The same lower in the sky, where the sun has gone: red. 1 x 1 characters. */
function duskGlow(): NewDecor {
  const r = new Raster(8, 8);
  r.rect(0, 2, 7, 3); r.rect(0, 6, 7, 6);
  return decor('duskGlow', 1, 1, r, 2);
}

/** The curl of an eave's end: the last tile lifting into a point, a ball on it. Stood over the end cell of a roof's eave. 1 x 1 characters. */
function eaveTip(): NewDecor {
  const r = new Raster(8, 8);
  r.rect(3, 0, 4, 1); r.rect(2, 2, 5, 4); r.rect(1, 5, 6, 7); r.rect(3, 3, 4, 3, false);
  return decor('eaveTip', 1, 1, r, 7);
}

/** The beasts on a hall's ridge: a row of small seated figures, a hen, a dragon, a lion and a horse, the last the biggest, as the rules of the palace give them. 4 x 1 characters. */
function ridgeBeasts(): NewDecor {
  const r = new Raster(32, 8);
  r.rect(1, 3, 4, 7); r.rect(2, 0, 3, 3); r.set(4, 1); r.rect(2, 1, 2, 1, false); // a hen
  r.rect(8, 4, 13, 7); r.rect(9, 1, 11, 4); r.rect(12, 2, 14, 3); r.rect(9, 2, 9, 2, false); // a dragon, its head up
  r.rect(17, 3, 22, 7); r.disc(20, 2, 2.4); r.rect(18, 1, 18, 1, false); r.rect(21, 1, 21, 1, false); // a lion with its mane
  r.rect(25, 3, 30, 7); r.rect(28, 0, 30, 3); r.rect(29, 1, 29, 1, false); r.rect(26, 5, 26, 7, false); // a horse
  return decor('ridgeBeasts', 4, 1, r, 13);
}

export const ROOF_DECOR = { duskBand: duskBand(), duskGlow: duskGlow(), eaveTip: eaveTip(), ridgeBeasts: ridgeBeasts() } as const satisfies Record<string, NewDecor>;
