/**
 * The Pacific's items for Monty Mole: World Tour (region 5): the bolt cutters (the engine room's, for the chain on the dock ramp), the
 * snorkel and mask (which open Hawaii's water), the lei (the region's key item and its costume: pacific-lei.ts has how he wears it),
 * the parachute pack (snagged on Mauna Kea's big dome: no flying without it), the sack of coffee (Hilo's farm: too sleepy to fly without it) and the Spam musubi (the food in place of the cupcake). Hires sprite blocks as
 * Moscow's and Siberia's items are, a solid shape with the detail cut into it.
 */
import { itemBlock } from './pixels';
import { over, Raster } from './raster';
import type { NewItem } from './types';

/** A diving mask with a snorkel: a round glass in a thick frame, a strap, a tube standing up at the side with its mouthpiece. */
function snorkel(): NewItem {
  const r = new Raster(16, 16);
  r.rect(1, 5, 11, 13); r.rect(3, 14, 9, 14); // the frame
  r.rect(3, 7, 9, 11, false); r.rect(6, 7, 6, 11); // the glass, a nose bridge
  r.rect(4, 8, 5, 8); // a glint
  r.rect(12, 8, 15, 9); // the strap's end
  r.rect(13, 0, 14, 7); r.rect(12, 0, 14, 0); r.rect(13, 1, 13, 5, false); // the tube
  r.rect(11, 6, 14, 6);
  return { block: itemBlock('pacSnorkel', r.rows()), colour: 14 };
}

/** A lei: a ring of flowers, a bloom every few pixels, the ends tied with a bow at the bottom. */
function lei(): NewItem {
  const r = new Raster(16, 16);
  for (let k = 0; k < 9; k++) {
    const a = Math.PI * (k / 8); // from the left, over the foot, to the right
    const b = new Raster(16, 16);
    b.disc(7.5 - Math.cos(a) * 6.2, 3 + Math.sin(a) * 8, 2.3);
    over(r, b);
    r.set(Math.round(7.5 - Math.cos(a) * 6.2), Math.round(3 + Math.sin(a) * 8), false);
  }
  r.rect(7, 13, 8, 14); r.triangle(7.5, 13, 3, 15, 7.5, 15); r.triangle(7.5, 13, 12, 15, 7.5, 15); // the bow
  return { block: itemBlock('pacLei', r.rows()), colour: 10 };
}

/** The parachute pack: a canvas pack with its straps crossing, a pull ring, buckles at the foot. */
function parachute(): NewItem {
  const r = new Raster(16, 16);
  r.rect(2, 1, 13, 14); r.rect(1, 3, 14, 12);
  r.rect(4, 0, 11, 0);
  r.line(3, 2, 12, 13, false); r.line(12, 2, 3, 13, false); // straps crossing
  r.rect(7, 1, 8, 14, false); // the flap's seam
  r.rect(5, 5, 10, 10, false); r.rect(6, 6, 9, 9); r.rect(7, 7, 8, 8, false); // the pull ring
  r.rect(2, 14, 5, 15); r.rect(10, 14, 13, 15);
  return { block: itemBlock('pacParachute', r.rows()), colour: 5 };
}

/** A Spam musubi: a block of rice, a slab of pink spam on it, a band of dark seaweed wrapped round. */
function musubi(): NewItem {
  const r = new Raster(16, 16);
  r.rect(1, 9, 14, 14); r.rect(0, 11, 0, 13); r.rect(15, 11, 15, 13); // the rice
  r.rect(2, 11, 4, 11, false); r.rect(10, 12, 12, 12, false); // grains
  r.rect(1, 5, 14, 8); r.rect(2, 6, 13, 7, false); r.rect(4, 6, 4, 7); r.rect(7, 6, 7, 7); r.rect(10, 6, 10, 7); // the spam, its cuts
  r.rect(4, 2, 11, 15, false); // a black edge round the band
  r.rect(5, 3, 10, 14); // the seaweed band
  r.rect(7, 6, 8, 11, false); // its fold
  return { block: itemBlock('pacMusubi', r.rows()), colour: 10 };
}

/** A sack of Hilo's coffee: a fat burlap sack tied at the neck, its weave in lines, beans spilling at its foot. */
function coffee(): NewItem {
  const r = new Raster(16, 16);
  r.ellipse(7.5, 10, 6.5, 5.5); r.rect(5, 2, 10, 6); r.rect(4, 1, 11, 2); // the sack, its neck and the top
  r.rect(4, 4, 11, 4, false); // the tie
  r.rect(3, 8, 12, 8, false); r.rect(2, 11, 13, 11, false); // the weave
  r.rect(7, 6, 8, 15, false); // the seam
  r.set(0, 15); r.set(2, 15); r.set(14, 15); r.set(15, 14); // beans
  return { block: itemBlock('pacCoffee', r.rows()), colour: 9 };
}

/** The moon rock: the shooting star that fell into Mauna Loa's crater, a lump of grey rock pitted with craters, still glinting. */
function moonRock(): NewItem {
  const r = new Raster(16, 16);
  r.ellipse(7.5, 10, 7, 5.5); r.ellipse(6, 6.5, 4.5, 3.5); // the lump
  r.ellipse(4, 10, 1.6, 1.6, false); r.ellipse(10, 8, 1.4, 1.4, false); r.ellipse(9, 13, 1.2, 1.2, false); r.set(6, 6, false); // its craters
  r.set(4, 10); r.set(10, 8); // (their floors catch the light)
  r.rect(13, 0, 13, 4); r.rect(11, 2, 15, 2); // the glint
  return { block: itemBlock('pacMoonRock', r.rows()), colour: 15 };
}

export const PACIFIC_ITEMS = {
  pacSnorkel: snorkel(),
  pacLei: lei(),
  pacParachute: parachute(),
  pacMusubi: musubi(),
  pacCoffee: coffee(),
  pacMoonRock: moonRock(),
} as const satisfies Record<string, NewItem>;

export type PacificItem = keyof typeof PACIFIC_ITEMS;
