/**
 * Japan's items for Monty Mole: World Tour (region 4): the fish food and the daruma (the key items that open the way), the sushi (the food
 * in place of the cupcake) and the ninja hood as it lies on its shrine. Hires sprite blocks as Moscow's and Siberia's items are: a solid
 * shape with the detail cut into it.
 */
import { itemBlock } from './pixels';
import { over, Raster } from './raster';
import type { NewItem } from './types';

/** A paper sack of fish food: a folded top tied with string, a fish printed on its front, pellets spilling at its foot. */
function fishFood(): NewItem {
  const r = new Raster(16, 16);
  r.rect(3, 4, 12, 14); // the sack
  r.rect(5, 1, 10, 3); r.rect(4, 2, 4, 3); r.rect(11, 2, 11, 3); // the folded top
  r.rect(4, 4, 11, 4, false); // the string's line
  r.ellipse(7.5, 9.5, 3.4, 2.4, false); r.triangle(10.5, 9.5, 13, 7, 13, 12, false); // the fish printed: cut out of the sack
  r.rect(5, 9, 5, 9); // its eye
  for (const x of [2, 5, 8, 11, 13]) r.rect(x, 15, x + 1, 15); // pellets
  return { block: itemBlock('jpFishFood', r.rows()), colour: 13 };
}

/** A daruma: the round red wishing doll, a pale face with one eye painted in, brows and beard, a band across the belly. */
function daruma(): NewItem {
  const r = new Raster(16, 16);
  r.ellipse(7.5, 8, 7.2, 7.4); // the round body
  r.ellipse(7.5, 6, 5, 3.6, false); // the face's opening
  r.rect(4, 4, 6, 5); r.rect(5, 4, 5, 5, false); // the left eye painted in: a pupil
  r.rect(9, 4, 11, 5); // the right eye blank
  r.rect(3, 2, 6, 2, false); r.rect(9, 2, 12, 2, false); // the brows
  r.cut(['#.#.#.#'], 5, 7); r.cut(['.#####.'], 4, 9); // the beard's lines
  r.cut(['########'], 4, 11); r.rect(7, 11, 8, 11); // the band
  return { block: itemBlock('jpDaruma', r.rows()), colour: 2 };
}

/** Sushi: two pieces of nigiri on a geta board, the fish draped over its rice, a band of nori round one. */
function sushi(): NewItem {
  const r = new Raster(16, 16);
  r.rect(0, 12, 15, 15); r.rect(2, 13, 4, 13, false); r.rect(11, 13, 13, 13, false); r.rect(1, 15, 3, 15, false); r.rect(12, 15, 14, 15, false); // the board and its feet
  const nigiri = (x: number, w: number) => {
    const n = new Raster(16, 16);
    n.rect(x, 8, x + w - 1, 11); // the rice
    n.ellipse(x + (w - 1) / 2, 7, w / 2 + 0.6, 3.2); // the fish draped over it
    n.rect(x + 2, 6, x + w - 3, 6, false); n.rect(x + 1, 8, x + w - 2, 8, false);
    return n;
  };
  over(r, nigiri(0, 8)); over(r, nigiri(8, 8));
  r.rect(11, 4, 12, 10, false); r.rect(11, 5, 12, 9); r.rect(11, 7, 12, 7, false); // a nori band round the second
  return { block: itemBlock('jpSushi', r.rows()), colour: 10 };
}

/** The ninja hood folded on its shrine's cushion: a cloth with the eye slit showing, a knot and two tails. */
function hoodItem(): NewItem {
  const r = new Raster(16, 16);
  r.rect(0, 13, 15, 15); r.rect(1, 14, 14, 14, false); // the cushion
  r.ellipse(7.5, 8, 6.2, 5.8); r.rect(1, 8, 14, 12); // the folded cloth
  r.rect(2, 7, 13, 9, false); r.rect(3, 7, 12, 7); r.rect(4, 8, 5, 8); r.rect(9, 8, 10, 8); // the slit with its two lit eyes
  r.rect(5, 1, 10, 2); r.rect(7, 1, 8, 1, false); // the knot on top
  const tails = new Raster(16, 16);
  tails.triangle(12, 3, 15, 5, 13, 7); tails.triangle(3, 3, 0, 5, 2, 7);
  over(r, tails);
  return { block: itemBlock('jpHood', r.rows()), colour: 6 };
}

export const JAPAN_ITEMS = {
  jpFishFood: fishFood(),
  jpDaruma: daruma(),
  jpSushi: sushi(),
  jpHood: hoodItem(),
} as const satisfies Record<string, NewItem>;

export type JapanItem = keyof typeof JAPAN_ITEMS;
