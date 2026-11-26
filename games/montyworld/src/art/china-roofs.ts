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

/** A conical roof tier of the Temple of Heaven, its eaves at `base`, from x0 to x1: the cone sags from the top to the eaves, the glazed tiles ribbed down it, a gold-less black line along the eave. */
function tier(r: Raster, x0: number, x1: number, top: number, base: number) {
  const mid = (x0 + x1) / 2, half = (x1 - x0) / 2;
  for (let x = x0; x <= x1; x++) {
    const t = Math.abs(x - mid) / half;
    const y = Math.round(top + (base - top) * t ** 1.6);
    r.rect(x, y, x, base);
    if (Math.abs(x - mid) > 1 && Math.round(x - mid) % 3 === 0) r.rect(x, Math.min(base - 1, y + 2), x, base - 2, false); // the ribs of tiles
  }
  r.rect(x0 + 1, base - 1, x1 - 1, base - 1, false); // the eave's edge
}

/**
 * The Temple of Heaven's Hall of Prayer for Good Harvests over the city: three round blue roofs one over another under a gold finial, a red drum of lattice windows
 * under each, the round hall of red columns with its door, on its three white marble terraces. Each row of characters is one part, so a row is one ink. 9 x 9 characters.
 */
function templeHeaven(): NewDecor {
  const r = new Raster(72, 72);
  r.rect(35, 0, 36, 7); r.disc(35.5, 3, 2.2); // the finial
  tier(r, 24, 47, 8, 15); // the top roof
  r.rect(27, 16, 44, 23); for (let x = 29; x < 43; x += 3) r.rect(x, 17, x, 22, false); // its drum, the lattice
  tier(r, 15, 56, 24, 31); // the middle roof
  r.rect(19, 32, 52, 39); for (let x = 21; x < 51; x += 3) r.rect(x, 33, x, 38, false);
  tier(r, 6, 65, 40, 47); // the bottom roof
  r.rect(10, 48, 61, 63); for (let x = 12; x < 60; x += 5) r.rect(x + 2, 50, x + 3, 63, false); r.rect(30, 52, 41, 63, false); r.rect(31, 53, 40, 63); r.rect(35, 53, 36, 63, false); // the hall's red columns and its double door
  r.rect(4, 64, 67, 65); r.rect(2, 67, 69, 68); r.rect(0, 70, 71, 71); // the three terraces
  for (let x = 6; x < 66; x += 4) r.set(x, 64, false); for (let x = 4; x < 68; x += 4) r.set(x, 67, false); for (let x = 2; x < 70; x += 4) r.set(x, 70, false); // their balustrades
  return decor('templeHeaven', 9, 9, r, ['777777777', 'EEEEEEEEE', '222222222', 'EEEEEEEEE', '222222222', 'EEEEEEEEE', '222222222', '222222222', '111111111']);
}

export const ROOF_DECOR = { duskBand: duskBand(), duskGlow: duskGlow(), eaveTip: eaveTip(), ridgeBeasts: ridgeBeasts(), templeHeaven: templeHeaven() } as const satisfies Record<string, NewDecor>;
