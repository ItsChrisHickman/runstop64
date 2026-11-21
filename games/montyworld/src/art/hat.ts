import { wearing } from './costume';

/**
 * The ushanka as Monty wears it: a fur crown with a ragged top, a black seam, the fur band wider than the crown and the ear flaps
 * hanging at the sides. Its top middle sits on the top of his head (costume.ts).
 */
export const USHANKA_HAT: readonly string[] = [
  '..#.####.#..',
  '.##########.',
  '############',
  '............',
  '############',
  '###......###',
  '.##......##.',
];

/** Monty's pictures in the ushanka, for each of his sprite pointers. */
export const ushankaFrames = (bank: Uint8Array) => wearing(bank, USHANKA_HAT);
