import { wearing, type Worn } from './costume';

/**
 * The ninja hood as Monty wears it, a sprite of its own in red over him (costume.ts, as the ushanka's, hat.ts): small, by the one
 * costume rule (a rounded crown and a headband on the head, above his eyes, so his face shows). Its top middle sits HOOD_RISE rows
 * above his head.
 */
export const JAPAN_HOOD: readonly string[] = [
  '...####...',
  '..######..',
  '##########',
  '##########',
  '##.####.##',
];

/** How far the crown stands above the top of his head, in pixels. */
export const HOOD_RISE = 2;

/** The colour it is drawn in: red (the ushanka is brown, the rice hat straw; Fuji and the tiled walls are blue). */
export const HOOD_COLOUR = 2;

/** Monty's pictures in the hood, and the hood as a sprite, for each of his sprite pointers. */
export const hoodWorn = (bank: Uint8Array): Worn => wearing(bank, JAPAN_HOOD, 'head', HOOD_RISE);
