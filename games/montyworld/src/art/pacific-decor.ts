/**
 * The Pacific's decorations for Monty Mole: World Tour (region 5), in Monty on the Run's decoration format and Moscow's manner
 * (decorations.ts): solid ink with the detail cut into it as black lines. The ship's funnel, bridge and crane; Honolulu's tower;
 * Waikiki's palms, hotel and surfboards; the luau's torches, totem and roast pig; Molokai's sea cliffs (the backdrop of the reef);
 * the reef's coral and kelp; Maui's waterfall, bamboo and signs; the volcano. Names start `pac`.
 */
import { decor } from './decorations';
import { Raster } from './raster';
import type { NewDecor } from './types';

// ---- the cargo ship

/** The funnel: a tall oval stack with a band round it and a rim, smoke at its mouth. 3 x 4 characters. */
function funnel(): NewDecor {
  const r = new Raster(24, 32);
  r.ellipse(8, 3.5, 4.5, 3); r.ellipse(12, 1.5, 3, 2); // smoke
  r.rect(3, 8, 20, 9); // the rim
  r.rect(4, 10, 19, 31);
  r.rect(4, 17, 19, 22, false); r.rect(4, 19, 19, 20); // the band: black with a bright line across
  r.rect(8, 12, 9, 15, false); // a vent slot
  return decor('pacFunnel', 3, 4, r, ['111', '222', '222', '222']);
}

/** The bridge: a wheelhouse with a row of windows, a flying deck on top, a mast and its radar. 5 x 3 characters. */
function bridge(): NewDecor {
  const r = new Raster(40, 24);
  r.rect(19, 0, 20, 5); r.rect(14, 2, 25, 2); r.rect(14, 1, 14, 1); r.rect(25, 1, 25, 1); // mast and radar
  r.rect(4, 6, 35, 8); // roof
  r.rect(2, 9, 37, 23);
  for (let k = 0; k < 6; k++) r.rect(4 + k * 6, 11, 7 + k * 6, 15, false); // windows
  r.rect(2, 18, 37, 18, false); r.rect(18, 19, 21, 23, false); // a rail and a door
  return decor('pacBridge', 5, 3, r, ['11111', '11111', '11111']);
}

/** A life ring on the rail: a white ring with its red bands. 2 x 2 characters. */
function lifeRing(): NewDecor {
  const r = new Raster(16, 16);
  r.disc(7.5, 7.5, 7); r.disc(7.5, 7.5, 3, ); r.ellipse(7.5, 7.5, 3.2, 3.2, false);
  for (const [x, y] of [[7, 0], [7, 13], [0, 7], [13, 7]] as const) r.rect(x, y, x + 1, y + 1, false);
  return decor('pacLifeRing', 2, 2, r, 1);
}

// ---- Oahu

/** A palm: a leaning trunk ringed with growth, a crown of long drooping fronds, a bunch of coconuts. `w` x `h` characters. */
function palm(w: number, h: number, name: string): NewDecor {
  const r = new Raster(w * 8, h * 8);
  const cx = Math.round(w * 4), top = Math.round(h * 2.2);
  for (let y = top; y < h * 8; y++) {
    const lean = Math.round(((h * 8 - y) / (h * 8 - top)) * (w * 1.2));
    r.rect(cx - 2 - lean + 3, y, cx - lean + 3, y);
    if (y % 4 === 0) r.rect(cx - 2 - lean + 3, y, cx - 2 - lean + 3, y, false);
  }
  const tx = cx + 3 - 0, ty = top;
  const reach = w * 3.6;
  for (const [dx, dy] of [[-reach, 3], [-reach * 0.7, -3], [reach * 0.7, -3], [reach, 3], [0, -8], [-reach * 0.4, 7], [reach * 0.4, 7]] as const) {
    r.line(tx, ty, tx + dx, ty + dy + 4); r.line(tx, ty + 1, tx + dx, ty + dy + 5); r.line(tx, ty - 1, tx + dx, ty + dy + 3);
  }
  r.disc(tx - 1, ty + 4, 1.6); r.disc(tx + 3, ty + 4, 1.6); // coconuts
  r.set(tx - 2, ty + 4, false); r.set(tx + 2, ty + 4, false);
  const rows = Array.from({ length: h }, (_, j) => (j < Math.ceil(h * 0.45) ? '5'.repeat(w) : '9'.repeat(w)));
  return decor(name, w, h, r, rows);
}

/** Diamond Head: the crater's long sloping ridge rising to its high rim at the left, ridged with gullies. 8 x 3 characters. */
function diamondHead(): NewDecor {
  const r = new Raster(64, 24);
  for (let x = 0; x < 64; x++) {
    const h = x < 18 ? 22 - x * 0.6 : 11 + (x - 18) * 0.3 - (x > 48 ? (x - 48) * 0.5 : 0);
    const top = Math.max(0, Math.round(24 - h * 1.0));
    r.rect(x, Math.min(23, top), x, 23);
  }
  for (const x of [8, 20, 32, 44]) r.line(x, 10 + (x > 30 ? 4 : 0), x + 3, 23, false); // gullies
  return decor('pacDiamondHead', 8, 3, r, 5);
}

/** The snorkel shop: a thatched roof over a counter, a board with a diving mask and snorkel hung over it. 5 x 4 characters. */
function snorkelShop(): NewDecor {
  const r = new Raster(40, 32);
  r.triangle(20, 0, 0, 12, 39, 12); r.rect(0, 12, 39, 13);
  for (let x = 2; x < 38; x += 4) r.line(x, 12, x - 2, 14); // straw ends
  r.rect(2, 14, 3, 31); r.rect(36, 14, 37, 31); // posts
  r.rect(2, 26, 37, 31); r.rect(5, 28, 34, 28, false); // counter
  r.rect(10, 15, 29, 23); r.ellipse(16, 19, 3, 2.6, false); r.ellipse(23, 19, 3, 2.6, false); r.rect(19, 19, 20, 19, false); // the mask
  r.rect(27, 16, 28, 22, false); r.rect(26, 16, 28, 16, false); // the snorkel
  return decor('pacSnorkelShop', 5, 4, r, ['99999', '99999', '99999', '99999']);
}

// ---- Molokai, the reef and Maui

// ---- the Big Island

// ---- the luau at sunset (LEI OF THE LAND): the sky's bands, the sun on the sea, the lawn, the stage, the feast, the lei's arch

/** A cell of the sea behind the beach: short waves. 1 x 1 character. */
function seaWave(): NewDecor {
  const r = new Raster(8, 8);
  r.stamp(['........', '........', '.##..##.', '#..##..#', '........', '..##....', '.#..#...', '........'], 0, 0);
  return decor('pacSeaWave', 1, 1, r, 6);
}

/** A cell of the lawn behind the lane: grass tufts over mown stripes. 1 x 2 characters (the tufts above the turf). */
function lawn(): NewDecor {
  const r = new Raster(8, 16);
  r.stamp(['........', '.#..#...', '.#.##.#.', '########', '########', '########', '........', '########'], 0, 0);
  r.stamp(['########', '########', '........', '########', '########', '........', '########', '########'], 0, 8);
  return decor('pacLawn', 1, 2, r, ['d', '5']);
}

export const PACIFIC_DECOR = {
  pacFunnel: funnel(),
  pacBridge: bridge(),
  pacLifeRing: lifeRing(),
  pacPalm: palm(4, 6, 'pacPalm'),
  pacDiamondHead: diamondHead(),
  pacSnorkelShop: snorkelShop(),
  pacSeaWave: seaWave(),
  pacLawn: lawn(),
} as const satisfies Record<string, NewDecor>;

export type PacificDecor = keyof typeof PACIFIC_DECOR;
