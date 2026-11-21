import { wearing, type Worn } from './costume';

/**
 * The chullo as Monty wears it, the picture it is carried as (an item); worn it is CHULLO_WORN, smaller (costume.ts): a peaked crown with a tassel, a patterned band across his
 * forehead and the long ear flaps hanging at the sides of his face. Its top middle sits CHULLO_RISE rows above his head.
 */
export const CHULLO_HAT: readonly string[] = [
  '.......##.......',
  '......####......',
  '.....######.....',
  '....########....',
  '...##########...',
  '..############..',
  '################',
  '##.##.##.##.##.#',
  '################',
  '###..........###',
  '###..........###',
  '.##..........##.',
  '.##..........##.',
  '.##..........##.',
  '..#..........#..',
];

/** The chullo as Monty wears it: small, a peaked woolly crown with a tassel, a patterned band and an ear flap at each side. */
export const CHULLO_WORN: readonly string[] = [
  '....##....',
  '...####...',
  '.########.',
  '##########',
  '#.##.##.##',
  '##......##',
];

/** How far the crown stands above the top of his head, in pixels. */
export const CHULLO_RISE = 3;

/** The colour it is drawn in: light red (a chullo is red and white). */
export const CHULLO_COLOUR = 10;

/** Monty's pictures in the chullo, and the hat as a sprite, for each of his sprite pointers. */
export const chulloWorn = (bank: Uint8Array): Worn => wearing(bank, CHULLO_WORN, 'head', CHULLO_RISE);
