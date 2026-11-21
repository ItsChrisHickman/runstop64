/**
 * China's items for Monty Mole: World Tour (region 3): the tower key, the rice hat and the bamboo (the key items), the dumplings (the food in place of the
 * cupcake) as hires sprite blocks as Moscow's and Siberia's items are, drawn in the same manner: a solid shape with the detail cut into it.
 */
import { itemBlock } from './pixels';
import { limb, Raster } from './raster';
import type { NewItem } from './types';

/** An iron key as long as a hand: a round bow with a hole and a lozenge cut in it, a long shaft, a bit of two teeth. */
function towerKey(): NewItem {
  const r = new Raster(16, 16);
  r.disc(3.5, 7.5, 3.6); r.ellipse(3.5, 7.5, 1.6, 1.6, false); r.rect(3, 7, 4, 8, false); // the bow, its hole
  r.rect(6, 6, 15, 9); r.rect(7, 7, 12, 7, false); // the shaft, a groove in it
  r.rect(12, 10, 13, 13); r.rect(15, 10, 15, 12); // the bit's teeth
  r.rect(9, 6, 9, 9, false); // a collar
  return { block: itemBlock('towerKey', r.rows()), colour: 7 };
}

/** The rice hat as an item: a wide cone woven in rings, a chin strap hanging from its brim. */
function riceHatItem(): NewItem {
  const r = new Raster(16, 16);
  r.triangle(7.5, 1, 0, 11, 15, 11); r.rect(0, 11, 15, 12);
  for (const [y, a, b] of [[5, 5, 10], [8, 3, 12]] as const) r.rect(a, y, b, y, false); // the rings of weave
  r.rect(7, 2, 8, 3, false); // (the tip's knot)
  r.rect(1, 11, 14, 11, false);
  r.rect(2, 13, 2, 15); r.rect(13, 13, 13, 15); // the straps
  r.rect(2, 15, 13, 15);
  return { block: itemBlock('riceHat', r.rows()), colour: 7 };
}

/** A length of bamboo: a thick cane laid across the picture with its joints cut in it, a few leaves at the end. */
function bamboo(): NewItem {
  const r = new Raster(16, 16);
  limb(r, 1, 14, 12, 3, 3);
  for (const t of [0.2, 0.45, 0.7]) { const x = 1 + 11 * t, y = 14 - 11 * t; r.cut(['##'], x - 0.5, y - 0.5); r.cut(['#'], x + 1, y - 1); r.cut(['#'], x - 1, y + 1); } // the joints
  r.triangle(11, 4, 15, 4, 13, 0); r.triangle(11, 4, 15, 8, 13, 5); r.triangle(11, 3, 8, 0, 11, 0); // the leaves
  return { block: itemBlock('bamboo', r.rows()), colour: 5 };
}

/** Dumplings in their steamer: a round bamboo basket with its lid tilted, three plump pleated crescents peeping over the rim, steam rising. */
function dumplings(): NewItem {
  const r = new Raster(16, 16);
  r.rect(2, 9, 13, 14); r.rect(2, 11, 13, 11, false); r.rect(2, 13, 13, 13, false); // the basket and its bands
  r.ellipse(7.5, 14.5, 6.5, 1.5); // its base
  for (const [x, y] of [[3.5, 7], [7.5, 6], [11.5, 7.5]] as const) { // the dumplings
    r.ellipse(x, y, 2.6, 2.3); r.rect(Math.round(x) - 2, Math.round(y) - 1, Math.round(x) + 2, Math.round(y) - 1, false); r.set(x - 1, y - 2); r.set(x + 1, y - 2);
  }
  r.rect(2, 9, 13, 9, false); r.rect(3, 9, 12, 9);
  for (const [x, y] of [[4, 1], [8, 0], [12, 2]] as const) { r.set(x, y); r.set(x + 1, y + 1); r.set(x, y + 2); r.set(x + 1, y + 3); } // the steam
  return { block: itemBlock('dumplings', r.rows()), colour: 13 };
}

export const CHINA_ITEMS = {
  towerKey: towerKey(),
  riceHat: riceHatItem(),
  bamboo: bamboo(),
  dumplings: dumplings(),
} as const satisfies Record<string, NewItem>;
