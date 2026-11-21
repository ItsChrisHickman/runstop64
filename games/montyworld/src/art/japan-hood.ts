import { wearing, type Worn } from './costume';

/**
 * The ninja hood as Monty wears it, a sprite of its own in dark blue over him (costume.ts, as the ushanka's, hat.ts): a rounded
 * crown, a headband across the brow, a cloth over his nose and chin with a slit left open for the eyes (the gap shows his dark face
 * and two pinpoints of light), and the cowl hanging at the sides of his neck. Its top middle sits HOOD_RISE rows above his head.
 */
export const JAPAN_HOOD: readonly string[] = [
  '.....######.....',
  '...##########...',
  '..############..',
  '.##############.',
  '.##############.',
  '################',
  '####........####',
  '####.##..##.####',
  '####........####',
  '################',
  '.##############.',
  '..############..',
];

/** How far the crown stands above the top of his head, in pixels. */
export const HOOD_RISE = 3;

/** The colour it is drawn in: blue. */
export const HOOD_COLOUR = 6;

/** Monty's pictures in the hood, and the hood as a sprite, for each of his sprite pointers. */
export const hoodWorn = (bank: Uint8Array): Worn => wearing(bank, JAPAN_HOOD, HOOD_RISE);
