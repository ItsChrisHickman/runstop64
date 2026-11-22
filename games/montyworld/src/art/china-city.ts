/**
 * Beijing's and the Forbidden City's scenery: a hutong's gatehouse (grey tiled roof with curling eaves over red doors with their studs), the noodle stall under its
 * striped awning with a steaming pot, the palace's golden roofs (swept eaves curling up at the corners, a red band of brackets under them) and the distant halls on
 * their white terraces. Solid ink with the detail cut into it as black lines, never a dither.
 */
import { decor } from './decorations';
import { Raster } from './raster';
import type { NewDecor } from './types';

/**
 * A swept Chinese roof, seen from the side: the profile sags in a curve from the ridge to the eaves, whose corners curl up, the tiles ribbed. Columns x0 to x1,
 * the ridge at `top` and the eaves' line at `base`, the corners lifted by `lift`.
 */
export function swept(r: Raster, x0: number, x1: number, top: number, base: number, lift: number, ribs = true) {
  const mid = (x0 + x1) / 2, half = (x1 - x0) / 2;
  for (let x = x0; x <= x1; x++) {
    const t = Math.abs(x - mid) / half;
    let y = top + (base - top) * (1 - (1 - t) ** 2.4); // steep from the ridge, flattening toward the eaves
    if (t > 0.74) y -= (lift * (t - 0.74)) / 0.26;
    const yi = Math.round(y);
    r.rect(x, yi, x, base);
    if (ribs && (x - x0) % 3 === 1) r.rect(x, yi + 2, x, base - 1, false);
  }
  r.rect(x0, base, x1, base + 1);
}

/** A hutong's gatehouse: a grey tiled roof with curling eaves, a red lintel, two red doors with their rows of studs, a worn stone step. 4 x 4 characters. */
function hutongGate(): NewDecor {
  const r = new Raster(32, 32);
  swept(r, 0, 31, 0, 9, 3);
  r.rect(2, 11, 29, 14); r.rect(4, 12, 27, 12, false); // the lintel, a line of lettering under it
  r.rect(3, 15, 28, 31); r.rect(15, 15, 16, 31, false); // the doors and their seam
  for (const y of [18, 22, 26]) for (const x of [6, 9, 12, 19, 22, 25]) r.rect(x, y, x + 1, y + 1, false); // the studs
  r.rect(6, 30, 25, 31, false); r.rect(0, 31, 31, 31); // the step
  return decor('hutongGate', 4, 4, r, ['FFFF', '2222', '2222', '2222']);
}

/** A noodle stall: a striped awning over a counter with a great steaming pot, bowls and a ladle, posts at each side. 5 x 3 characters. */
function noodleStall(): NewDecor {
  const r = new Raster(40, 24);
  r.rect(0, 0, 39, 5); for (let x = 2; x < 40; x += 6) r.rect(x, 0, x + 2, 5, false); // the awning's stripes
  for (let x = 0; x < 40; x += 4) r.rect(x, 6, x + 2, 7); // its scalloped valance
  r.rect(1, 8, 2, 23); r.rect(37, 8, 38, 23); // the posts
  r.ellipse(12, 14, 6.5, 3.6); r.rect(6, 12, 18, 16); r.rect(7, 13, 17, 13, false); r.rect(8, 9, 16, 10); // the pot, its band, its lid
  for (const x of [9, 12, 15]) { r.line(x, 8, x + 1, 5, false); r.set(x + 1, 3, false); } // steam, curling up through the awning's gaps
  for (const x of [24, 29, 34]) { r.rect(x, 13, x + 3, 15); r.rect(x + 1, 16, x + 2, 16); r.rect(x, 12, x + 3, 12); } // bowls
  r.line(21, 9, 22, 15); r.rect(20, 8, 22, 8); // the ladle
  r.rect(0, 17, 39, 19); r.rect(3, 20, 36, 23); r.rect(5, 21, 34, 23, false); r.rect(19, 21, 20, 23); r.rect(5, 20, 34, 20, false); // the counter and its front
  return decor('noodleStall', 5, 3, r, ['22222', '11111', '99999']);
}

/** The gate tower's double roof: a small swept roof over a larger, gold, curling at the corners, the red brackets under. 8 x 3 characters. */
function gateRoof(): NewDecor {
  const r = new Raster(64, 24);
  swept(r, 18, 45, 0, 6, 2);
  swept(r, 0, 63, 8, 18, 4);
  r.rect(2, 20, 61, 23); for (let x = 4; x < 61; x += 5) r.rect(x, 21, x + 1, 23, false); // the red band of brackets
  r.rect(14, 8, 49, 9, false); r.rect(14, 8, 14, 9); r.rect(49, 8, 49, 9);
  return decor('gateRoof', 8, 3, r, ['77777777', '77777777', '22222222']);
}

/** A hall of the palace in the distance: a golden double roof over red walls and pillars, standing on a white marble terrace. 8 x 4 characters. */
function palaceHall(): NewDecor {
  const r = new Raster(64, 32);
  swept(r, 14, 49, 0, 5, 2);
  swept(r, 0, 63, 6, 14, 4);
  r.rect(4, 16, 59, 23); for (let x = 7; x < 59; x += 8) r.rect(x, 17, x + 4, 23, false); for (let x = 7; x < 59; x += 8) r.rect(x + 1, 19, x + 3, 23); // the red walls, a door between each pair of pillars
  r.rect(0, 24, 63, 31); r.rect(0, 26, 63, 26, false); r.rect(0, 29, 63, 29, false); for (let x = 3; x < 64; x += 8) r.rect(x, 27, x, 28, false); // the terrace and its balustrade
  return decor('palaceHall', 8, 4, r, ['77777777', '77777777', '22222222', '11111111']);
}

/** A glazed gold roof's end with its rows of tiles curling up: used for a rooftop's far eave. 4 x 2 characters. */
function roofEnd(): NewDecor {
  const r = new Raster(32, 16);
  swept(r, 0, 31, 2, 10, 4);
  r.rect(1, 12, 30, 15); for (let x = 3; x < 30; x += 4) r.rect(x, 13, x + 1, 15, false);
  return decor('roofEnd', 4, 2, r, ['7777', '2222']);
}

/** A block of a back wall, one character, stamped cell by cell behind him: dark grey brick. 1 x 1 characters. */
function backCell(): NewDecor {
  const r = new Raster(8, 8);
  r.rect(0, 3, 7, 3); r.rect(0, 7, 7, 7); r.rect(6, 0, 6, 2); r.rect(2, 4, 2, 6); // the mortar lines only: the bricks stay dark
  return decor('backCell', 1, 1, r, 11);
}

/** A run of grey roof tiles along a wall's top, curved with their ribs. 1 x 1 characters. */
function slateCell(): NewDecor {
  const r = new Raster(8, 8);
  r.rect(0, 0, 7, 5); r.rect(1, 1, 1, 3, false); r.rect(4, 1, 4, 3, false); r.rect(7, 1, 7, 3, false); r.rect(0, 5, 7, 5, false); r.rect(0, 6, 7, 7);
  return decor('slateCell', 1, 1, r, 15);
}

/** The city beyond the market, far off in a blue haze: tiled roofs of three heights, a pagoda between them, solid with the tiles' lines cut in. 8 x 3 characters. */
function cityRoofs(): NewDecor {
  const r = new Raster(64, 24);
  swept(r, 0, 23, 10, 17, 3); r.rect(3, 18, 20, 23); // a low roof on its wall
  r.rect(29, 0, 30, 3); r.disc(29.5, 4.5, 1.5); // the pagoda's spire
  swept(r, 25, 34, 5, 9, 2); r.rect(27, 10, 32, 15); swept(r, 23, 36, 14, 18, 2); r.rect(25, 19, 34, 23); // its two tiers
  swept(r, 39, 63, 12, 19, 3); r.rect(42, 20, 60, 23); // a broad roof
  for (const x of [6, 12, 18, 44, 51, 57]) r.rect(x, 20, x, 23, false); // the walls' doorways
  return decor('cityRoofs', 8, 3, r, 6);
}

export const CITY_DECOR = { backCell: backCell(), slateCell: slateCell(),  hutongGate: hutongGate(), noodleStall: noodleStall(), gateRoof: gateRoof(), palaceHall: palaceHall(), roofEnd: roofEnd(), cityRoofs: cityRoofs() } as const satisfies Record<string, NewDecor>;
