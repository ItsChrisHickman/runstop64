/**
 * The port's leaving-Japan scenery for Monty Mole: World Tour (region 4), SAYONARA SAILOR: a sunset sky in bands of colour, the sea behind the quay, a small Fuji and the red sun
 * going down over it, paper lanterns on posts and flags on the quay, the gangway's rails. Every name starts `jp`.
 */
import { decor } from './decorations';
import { Raster } from './raster';
import type { NewDecor } from './types';

/** A one character decoration of horizontal lines (the rows `lines` lit all across): a band of the sunset sky or the sea. */
function bars(name: string, lines: readonly number[], colour: number): NewDecor {
  const r = new Raster(8, 8);
  for (const y of lines) r.rect(0, y, 7, y);
  return decor(name, 1, 1, r, colour);
}

/** The sea behind the quay: dashes of waves in rows. */
function seaLines(): NewDecor {
  const r = new Raster(8, 8);
  r.rect(1, 2, 4, 2); r.rect(5, 6, 7, 6); r.rect(0, 6, 1, 6);
  return decor('jpSeaLines', 1, 1, r, 14);
}

/** Mount Fuji small in the far distance, on the horizon: a white cap, the blue cone under it. 6 x 2 characters. */
function fujiFar(): NewDecor {
  const r = new Raster(48, 16);
  r.triangle(24, 0, 0, 15, 47, 15); r.rect(21, 0, 26, 1);
  r.rect(0, 15, 47, 15, false);
  return decor('jpFujiFar', 6, 2, r, ['111111', '666666']);
}

/** The sun going down over the sea: the top half of a great red disc. 4 x 2 characters. */
function sunHalf(): NewDecor {
  const r = new Raster(32, 16);
  r.disc(15.5, 15.5, 15); r.rect(0, 15, 31, 15, false); r.rect(4, 11, 27, 11, false); r.rect(8, 7, 23, 7, false);
  return decor('jpSunHalf', 4, 2, r, 2);
}

/** A paper lantern on a post at the quay's edge: a red lantern with its ribs and caps over a wooden post. 2 x 4 characters. */
function lanternPost(): NewDecor {
  const r = new Raster(16, 32);
  r.rect(6, 0, 9, 1); r.ellipse(7.5, 7, 6, 6); r.rect(1, 6, 14, 6, false); r.rect(2, 3, 13, 3, false); r.rect(2, 9, 13, 9, false); // the lantern and its ribs
  r.rect(5, 13, 10, 14); r.rect(7, 14, 8, 14, false); // its foot
  r.rect(6, 15, 9, 31); r.rect(4, 29, 11, 31); // the post and its base
  return decor('jpLanternPost', 2, 4, r, ['22', '22', '99', '99']);
}

/** A flag on a pole: a white field with a red disc, the rising sun of Japan. 4 x 3 characters (the pole at the left). */
function flag(): NewDecor {
  const r = new Raster(32, 24);
  r.rect(2, 0, 3, 23); r.rect(0, 22, 5, 23);
  r.frame(9, 1, 31, 15);
  r.disc(20, 8, 4.4);
  return decor('jpFlagHinomaru', 4, 3, r, ['c121', 'c121', 'c000']);
}

/** The gangway's rails: a handrail on two posts running up from the plank to the deck. 2 x 3 characters. */
function gangwayRail(): NewDecor {
  const r = new Raster(16, 24);
  r.line(0, 17, 15, 3); r.line(0, 18, 15, 4);
  r.rect(2, 17, 3, 23); r.rect(8, 11, 9, 23); r.rect(14, 3, 15, 23);
  return decor('jpGangwayRail', 2, 3, r, 7);
}

export const JAPAN_PORT = {
  jpSkyA: bars('jpSkyA', [3], 4),
  jpSkyB: bars('jpSkyB', [1, 5], 10),
  jpSkyC: bars('jpSkyC', [0, 3, 6], 8),
  jpSkyD: bars('jpSkyD', [0, 1, 4, 5], 7),
  jpSeaLines: seaLines(),
  jpFujiFar: fujiFar(),
  jpSunHalf: sunHalf(),
  jpLanternPost: lanternPost(),
  jpFlagHinomaru: flag(),
  jpGangwayRail: gangwayRail(),
} as const satisfies Record<string, NewDecor>;
