import { wearing, type Worn } from './costume';

/**
 * The ushanka as Monty wears it, a sprite of its own in fur brown over him (costume.ts): a crown, a fur brim across his forehead
 * (the brim's ragged row) and the ear flaps hanging at the sides of his face. Its top middle sits HAT_RISE rows above his head.
 */
export const USHANKA_HAT: readonly string[] = [
  '...####...',
  '..######..',
  '.########.',
  '##########',
  '#.######.#',
  '##......##',
];

/** How far the crown stands above the top of his head, in pixels. */
export const HAT_RISE = 3;

/** The colour it is drawn in: fur (brown). */
export const HAT_COLOUR = 9;

/** Monty's pictures in the ushanka, and the hat as a sprite, for each of his sprite pointers. */
export const ushankaWorn = (bank: Uint8Array): Worn => wearing(bank, USHANKA_HAT, 'head', HAT_RISE);

/**
 * China's rice hat as Monty wears it (the costume that takes the ushanka's place), a sprite of its own in straw yellow over him: a wide cone, a black
 * ring of weave in it, a brim across his forehead and a chin strap hanging at each side.
 */
export const RICE_HAT: readonly string[] = [
  '....##....',
  '...####...',
  '..######..',
  '.########.',
  '##########',
  '#........#',
];

/** How far the cone's tip stands above the top of his head (the brim comes down on his forehead, as the fur hat's does). */
export const RICE_HAT_RISE = 4;

/** The rice hat's colour: straw. */
export const RICE_HAT_COLOUR = 7;

/** Monty's pictures in the rice hat, and the hat as a sprite, for each of his sprite pointers. */
export const riceHatWorn = (bank: Uint8Array): Worn => wearing(bank, RICE_HAT, 'head', RICE_HAT_RISE);
