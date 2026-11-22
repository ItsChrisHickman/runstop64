/**
 * NEON STREET's own pieces for Monty Mole: World Tour (region 4): the ramen stall (a red awning, the white noren curtains with steaming bowls on its counter), and a girder of the
 * railway that runs over the street (the train on it is drawn in the room's own characters, see `STREET_TRAIN` in japan.ts). Every name starts `jp`.
 */
import { decor } from './decorations';
import { Raster } from './raster';
import type { NewDecor } from './types';

/** A ramen stall: a striped awning, the noren curtains hanging in front, a counter with its bowls and their steam. 5 x 3 characters. */
function ramenStall(): NewDecor {
  const r = new Raster(40, 24);
  r.rect(0, 0, 39, 6); for (let x = 3; x < 40; x += 8) r.rect(x, 0, x + 3, 6, false); // the awning and its stripes
  for (let k = 0; k < 4; k++) { // the noren curtains, each with its mark
    r.rect(3 + 9 * k, 8, 9 + 9 * k, 15);
    r.rect(5 + 9 * k, 10, 7 + 9 * k, 12, false);
  }
  r.rect(0, 18, 39, 23); r.rect(2, 20, 37, 21, false); // the counter
  for (const x of [6, 17, 28]) { r.ellipse(x + 3.5, 16, 4.5, 2.4); r.rect(x, 14, x + 7, 14, false); } // the bowls
  for (const x of [8, 19, 30]) { r.set(x, 12, true); r.set(x + 1, 11, true); } // their steam
  return decor('jpRamenStall', 5, 3, r, ['22222', '11111', '99999']);
}

/** A girder of the elevated railway: a flange along the top, the lattice under it, a rail's line. One character. */
function viaduct(): NewDecor {
  const r = new Raster(8, 8);
  r.rect(0, 0, 7, 1); r.rect(0, 5, 7, 5); r.rect(0, 7, 7, 7);
  r.line(0, 6, 3, 2); r.line(3, 2, 6, 6); r.set(7, 5);
  return decor('jpViaduct', 1, 1, r, 12);
}

export const JAPAN_STREET = {
  jpRamenStall: ramenStall(),
  jpViaduct: viaduct(),
} as const satisfies Record<string, NewDecor>;
