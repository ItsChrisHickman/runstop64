import { wearing, type Worn } from './costume';

/**
 * The lei as Monty wears it, a sprite of its own in pink over him (costume.ts, as the ushanka is, hat.ts): the haku lei, a crown of flowers on his head (a hat, as every region's costume is):
 * blooms standing up all round, a band of them across his brow. `wearing` sets the picture's row `LEI_RISE` on the top of his head.
 */
export const LEI: readonly string[] = [
  '.#..##..#.',
  '###.##.###',
  '.#.####.#.',
  '##########',
  '#.#.##.#.#',
  '##......##',
];

/** The picture's row that lies on the top of his head (the lower rows are his hair: the band sits on his brow). */
export const LEI_RISE = 3;

/** The colour it is drawn in: light red (pink). */
export const LEI_COLOUR = 10;

/** Monty's pictures with the lei on, and the lei as a sprite, for each of his sprite pointers. */
export const leiWorn = (bank: Uint8Array): Worn => wearing(bank, LEI, 'head', LEI_RISE);
