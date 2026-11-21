import { wearing, type Worn } from './costume';

/**
 * The ushanka as Monty wears it, a sprite of its own in fur brown over him (costume.ts): a crown, a fur brim across his forehead
 * (the brim's ragged row) and the ear flaps hanging at the sides of his face. Its top middle sits HAT_RISE rows above his head.
 */
export const USHANKA_HAT: readonly string[] = [
  '.....######.....',
  '...##########...',
  '..#.########.#..',
  '..############..',
  '.##.########.##.',
  '################',
  '####.#.##.#.####',
  '###..........###',
  '###..........###',
  '.##..........##.',
];

/** How far the crown stands above the top of his head, in pixels. */
export const HAT_RISE = 5;

/** The colour it is drawn in: fur (brown). */
export const HAT_COLOUR = 9;

/** Monty's pictures in the ushanka, and the hat as a sprite, for each of his sprite pointers. */
export const ushankaWorn = (bank: Uint8Array): Worn => wearing(bank, USHANKA_HAT, HAT_RISE);
