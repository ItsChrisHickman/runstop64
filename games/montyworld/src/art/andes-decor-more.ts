/**
 * The Andes' decorations of the 2026-11-22 pass (Chris on the first build: the market "looks unfinished", the llamas wanted more to do, the landing and the river wanted signposts): the village market's church
 * tower, women, hat stall, potatoes and corn; the llama a platform carries (the herd's ride); the flag of Peru; the launch that takes him down to Rio. Monty on the Run's decoration format and the earlier
 * pieces' manner: solid ink with the detail cut in as black lines, no dither.
 */
import { decor } from './decorations';
import { Raster } from './raster';
import type { NewDecor } from './types';

/** A white-washed church's bell tower: stepped storeys, an arched belfry with its bell, a tiled cap and a cross. 4 x 6 characters. */
function churchTower(): NewDecor {
  const r = new Raster(32, 48);
  r.triangle(16, 3, 6, 16, 26, 16); // the tiled cap
  for (const y of [8, 12]) r.rect(8, y, 24, y, false);
  r.rect(15, 0, 16, 5); r.rect(13, 1, 18, 2); // the cross
  r.rect(6, 17, 25, 47); // the tower
  r.rect(10, 20, 21, 31, false); r.rect(11, 20, 20, 21); r.rect(12, 21, 19, 22); // the belfry's arch, a dark mouth
  r.rect(14, 24, 17, 30); r.rect(15, 31, 16, 31); // the bell
  r.rect(6, 34, 25, 34, false); r.rect(6, 40, 25, 40, false); // the storeys
  r.rect(13, 42, 18, 47, false); r.rect(14, 41, 17, 41, false); // the door
  r.rect(8, 36, 9, 38, false); r.rect(22, 36, 23, 38, false); // the windows
  return decor('churchTower', 4, 6, r, ['2222', '2222', '7777', '7777', '7777', '7777']);
}

/** A woman of the market: a bowler hat, a wide layered skirt and a bundle on her back. 2 x 3 characters. */
function villager(): NewDecor {
  const r = new Raster(16, 24);
  r.ellipse(8, 2.5, 3.8, 2.4); r.rect(4, 3, 11, 4); // the bowler hat
  r.rect(5, 4, 10, 4, false);
  r.disc(8, 7, 2.6); r.cut(['#', '#'], 7, 6); r.cut(['#', '#'], 9, 6); // the face, its eyes
  r.rect(5, 9, 10, 12); // the body
  r.rect(11, 8, 15, 13); r.rect(12, 8, 14, 8, false); // the bundle
  r.rect(4, 13, 11, 14); r.rect(2, 15, 13, 17); r.rect(0, 18, 15, 23); // the skirt in tiers
  r.rect(2, 16, 13, 16, false); r.rect(0, 19, 15, 19, false); r.rect(0, 22, 15, 22, false);
  r.rect(6, 12, 9, 12, false);
  return decor('villager', 2, 3, r, ['99', '22', '22']);
}

/** The hat seller's stall: a striped awning, chullos hanging on a line, a bench. 5 x 4 characters. */
function hatStall(): NewDecor {
  const r = new Raster(40, 32);
  r.rect(0, 0, 39, 6);
  for (let x = 3; x < 40; x += 8) r.triangle(x - 3, 7, x + 3, 7, x, 10);
  for (let x = 4; x < 40; x += 8) r.rect(x, 0, x, 6, false);
  r.rect(1, 7, 2, 31); r.rect(37, 7, 38, 31); // the posts
  r.rect(4, 12, 36, 12); // the line
  for (const x of [8, 15, 22, 29]) { r.triangle(x, 13, x + 6, 13, x + 3, 18); r.rect(x, 13, x + 1, 20); r.rect(x + 5, 13, x + 6, 20); r.set(x + 3, 19); r.set(x + 3, 20); } // the chullos with their flaps and tassels
  r.rect(0, 25, 39, 31); r.rect(2, 28, 37, 28, false);
  return decor('hatStall', 5, 4, r, ['22222', '77777', '77777', '99999']);
}

/** A heap of potatoes: rounds of yellow-brown. 2 x 1 characters. */
function spuds(): NewDecor {
  const r = new Raster(16, 8);
  for (const [x, y] of [[3, 5], [8, 5], [12, 5], [5, 2], [10, 2]] as const) r.ellipse(x, y, 2.6, 2.4);
  r.rect(0, 7, 15, 7);
  for (const [x, y] of [[3, 5], [8, 5], [12, 4]] as const) r.set(x, y, false);
  return decor('spuds', 2, 1, r, 7);
}

/** The ears of corn laid out in a basket. 2 x 1 characters. */
function corn(): NewDecor {
  const r = new Raster(16, 8);
  r.rect(0, 4, 15, 7); r.rect(1, 3, 14, 3);
  for (let x = 2; x < 15; x += 3) r.rect(x, 0, x + 1, 4);
  r.rect(0, 5, 15, 5, false);
  return decor('corn', 2, 1, r, 7);
}

/** A llama in profile standing on a platform's deck, its long neck up and a big grin (Jeff Minter's): the herd's ride. 4 x 2 characters. */
function llamaRide(): NewDecor {
  const r = new Raster(32, 16);
  r.ellipse(19, 8.5, 9, 4.8); // the woolly body
  for (const [x, y] of [[15, 6], [19, 5], [23, 6], [17, 10], [22, 10]] as const) r.set(x, y, false);
  for (const x of [12, 15, 23, 26]) r.rect(x, 11, x + 1, 15); // the legs
  r.rect(28, 6, 30, 8); // the tail
  r.rect(5, 3, 8, 9); r.rect(6, 7, 11, 10); // the neck
  r.ellipse(5, 3, 3.6, 2.6); r.ellipse(2.5, 4.6, 2.4, 1.8); // the head and its muzzle
  r.triangle(5, 1, 5, 0, 7, 1); r.triangle(7, 1, 9, 0, 9, 2); // the ears
  r.cut(['##'], 4, 2); r.set(1, 4, false); r.cut(['####'], 1, 6); // the eye, nostril and grin
  r.rect(0, 15, 31, 15);
  return decor('llamaRide', 4, 2, r, 8);
}

/** The flag of Peru on its pole: red, white, red bands down the cloth. 2 x 3 characters. */
function peruFlag(): NewDecor {
  const r = new Raster(16, 24);
  r.rect(1, 2, 2, 23); r.disc(1.5, 2, 1.5); // the pole
  r.rect(3, 3, 14, 14); r.rect(7, 3, 10, 14, false); r.rect(8, 6, 9, 11); // the cloth: red, white, red, a badge in the white
  return decor('peruFlag', 2, 3, r, ['22', '22', '99']);
}

/** The launch that takes passengers down to the sea: a short hull, a cabin, a tall funnel and a pennant. 6 x 3 characters. */
function launch(): NewDecor {
  const r = new Raster(48, 24);
  r.rect(0, 14, 47, 17); r.triangle(0, 14, 0, 17, 6, 20); r.rect(6, 18, 40, 20); r.triangle(47, 14, 47, 17, 42, 20); // the hull
  r.rect(0, 15, 47, 15, false); for (let x = 5; x < 44; x += 8) r.rect(x, 17, x + 2, 17, false);
  r.rect(10, 6, 30, 13); r.rect(12, 8, 15, 11, false); r.rect(19, 8, 22, 11, false); r.rect(26, 8, 28, 11, false); // the cabin and windows
  r.rect(34, 2, 38, 13); r.rect(33, 0, 39, 1); r.rect(34, 6, 38, 6, false); // the funnel
  r.rect(2, 4, 2, 13); r.rect(3, 4, 8, 6); // the mast and the pennant
  return decor('launch', 6, 3, r, ['222222', '777777', '999999']);
}

export const ANDES_DECOR_MORE = {
  churchTower: churchTower(),
  villager: villager(),
  hatStall: hatStall(),
  spuds: spuds(),
  corn: corn(),
  llamaRide: llamaRide(),
  peruFlag: peruFlag(),
  launch: launch(),
} as const satisfies Record<string, NewDecor>;
