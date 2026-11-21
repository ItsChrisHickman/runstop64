import { wearing, type Worn } from './costume';

/**
 * The lei as Monty wears it, a sprite of its own in pink over him (costume.ts, as the ushanka is, hat.ts): a garland of blooms hung in a
 * U round his neck, the ends tied at the front with a bow. `wearing` sets the picture's top middle `LEI_RISE` rows above the top of his head
 * (a negative number here: below it, at his neck), and clears his own picture under it with a black line round it.
 */
export const LEI: readonly string[] = [
  '###..........###',
  '#.#.#......#.#.#',
  '###.##....##.###',
  '.#..#.#..#.#..#.',
  '.##.#.####.#.##.',
  '..##..#..#..##..',
  '...###.##.###...',
  '.....##..##.....',
  '......####......',
];

/** How far the garland's top sits above the top of his head, in pixels: a negative number, below it. */
export const LEI_RISE = -7;

/** The colour it is drawn in: light red (pink). */
export const LEI_COLOUR = 10;

/** Monty's pictures with the lei on, and the lei as a sprite, for each of his sprite pointers. */
export const leiWorn = (bank: Uint8Array): Worn => wearing(bank, LEI, LEI_RISE);
