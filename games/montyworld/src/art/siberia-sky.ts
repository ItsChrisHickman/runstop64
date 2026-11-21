/**
 * The Siberian night above the train, in Monty on the Run's decoration format (decorations.ts): a moon, a star or two, smoke from the
 * locomotive, telegraph wires on their poles, and the landscape on the horizon, snowy mountains over a band of pines. All of it is
 * scenery: no collision, Monty walks in front. The pieces that move are pictures that join up with themselves at their edges (a period
 * of 2 to 4 characters), placed side by side along the room, so the game can slide them past for ever (`charAnims`, train.ts): the
 * mountains slowest, the pines next, the poles and the smoke at the pace of the windows' scenery. Few colours: white moon and snow,
 * blue mountains, dark pines, grey smoke and wires.
 */
import { decor } from './decorations';
import { Raster } from './raster';
import type { NewDecor } from './types';

/** Draw `shape` at the picture's width either side as well, so what leaves one edge comes in at the other (a ring of characters joins up). */
function wrapped(w: number, shape: (dx: number) => void) {
  for (const dx of [-w, 0, w]) shape(dx);
}

/**
 * The horizon: 2 x 3 characters, a period of 16 pixels. Two rows of mountains (a tall peak and a lesser one a half period on, the snow
 * above the line in the first row, the blue rock in the second) over a row of pines, a tall one and a short one. Rows are separate rings:
 * the mountains slide slower than the pines in front.
 */
function horizon(): NewDecor {
  const r = new Raster(16, 24);
  wrapped(16, (dx) => {
    r.triangle(5 + dx, 0, -3 + dx, 15, 13 + dx, 15); // the tall peak
    r.triangle(13 + dx, 6, 8 + dx, 15, 18 + dx, 15); // the lesser one
  });
  wrapped(16, (dx) => { r.line(6 + dx, 3, 12 + dx, 14, false); r.line(14 + dx, 9, 17 + dx, 14, false); }); // the shadow side of each
  r.rect(0, 15, 15, 15, false); // (black between the mountains and the trees)
  wrapped(16, (dx) => {
    r.triangle(4 + dx, 16, 0 + dx, 22, 8 + dx, 22); r.rect(3 + dx, 23, 4 + dx, 23); // a tall pine
    r.triangle(12 + dx, 18, 9 + dx, 22, 15 + dx, 22); r.rect(11 + dx, 23, 12 + dx, 23); // and a short one
  });
  return decor('horizon', 2, 3, r, ['11', '66', '55']);
}

/**
 * Telegraph poles and their wires: 4 x 2 characters, a period of 32 pixels. A pole with a cross-arm at x 16, and two wires from its arm that
 * sag to the next pole (which is this one, a period on).
 */
function wires(): NewDecor {
  const r = new Raster(32, 16);
  r.rect(16, 2, 17, 15); r.rect(12, 2, 21, 3);
  for (const [from, to, sag] of [[13, 45, 6], [20, 44, 4]] as const) {
    for (let x = from; x <= to; x++) {
      const t = (x - from) / (to - from);
      const y = 3 + Math.round(sag * Math.sin(Math.PI * t));
      r.set(x % 32, y);
    }
  }
  return decor('wires', 4, 2, r, ['CCCC', 'CCCC']);
}

/** Smoke trailing back from the locomotive: 4 x 2 characters, a period of 32 pixels, a wavy ribbon that swells and thins in puffs, joining up with the next copy. */
function smoke(): NewDecor {
  const r = new Raster(32, 16);
  wrapped(32, (dx) => {
    for (let x = 0; x < 32; x += 0.5) {
      const y = 8 + 2.5 * Math.sin((2 * Math.PI * x) / 32);
      const radius = 0.5 + 2.7 * (0.5 + 0.5 * Math.sin((2 * Math.PI * x) / 16 + 1));
      r.disc(x + dx, y, radius);
    }
  });
  return decor('smoke', 4, 2, r, ['BBBB', 'BBBB']);
}

/** The locomotive's chimney, flared at the top: 2 x 2 characters. */
function chimney(): NewDecor {
  const r = new Raster(16, 16);
  r.rect(1, 0, 14, 3); r.rect(4, 4, 11, 15); r.rect(2, 4, 3, 5); r.rect(12, 4, 13, 5);
  r.rect(6, 6, 6, 14, false);
  return decor('chimney', 2, 2, r, 11);
}

/** The moon, a fat crescent: 2 x 2 characters. */
function moon(): NewDecor {
  const r = new Raster(16, 16);
  r.disc(7.5, 8, 6.5);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (Math.hypot(x - 10.5, y - 6.5) <= 5.8) r.set(x, y, false);
  return decor('moon', 2, 2, r, 7);
}

/** A star: a pip with a tiny cross. 1 x 1 character. */
function star(): NewDecor {
  const r = new Raster(8, 8);
  r.rect(3, 3, 4, 4); r.set(3, 1); r.set(3, 6); r.set(1, 4); r.set(6, 3);
  return decor('star', 1, 1, r, 1);
}

/** A dim star, a single pip. 1 x 1 character. */
function starDim(): NewDecor {
  const r = new Raster(8, 8);
  r.set(4, 3);
  return decor('starDim', 1, 1, r, 15);
}

export const SIBERIA_SKY = { horizon: horizon(), wires: wires(), smoke: smoke(), chimney: chimney(), moon: moon(), star: star(), starDim: starDim() } as const satisfies Record<string, NewDecor>;
