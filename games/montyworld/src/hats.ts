import type { Worn } from './art/costume';

/**
 * Where the hats' sprites live in the bank. Every hat (a costume's `over`) is a sprite of its own in a colour of its own over Monty, one picture for each of his 36
 * (some shared, so about 25 distinct): the pictures of every hat take the same blocks, and a costume's `blocks` write its own over them when it is put on, so
 * a game with several hats (one a region) needs only one set of blocks.
 */

/** The blocks the hats' pictures take, in order: the bank's free ones the items and the dragon do not (china-pointers.ts has those). */
export const HAT_BLOCKS: readonly number[] = [
  ...Array.from({ length: 9 }, (_, i) => 0xd7 + i), // $D7-$DF
  ...Array.from({ length: 16 }, (_, i) => 0xeb + i), // $EB-$FA
];

/** A hat's pictures placed in the pool: the distinct ones with their pointers, and for each of Monty's pictures where its hat is (pointer and offset). */
export interface HatSprites {
  readonly blocks: readonly { ptr: number; block: Uint8Array }[];
  readonly frames: ReadonlyMap<number, { ptr: number; dx: number; dy: number }>;
}

/** The hat of a `Worn` laid out in the pool (the same picture under several of his pictures shares a block). */
export function placeHat(worn: Worn): HatSprites {
  const blocks: { ptr: number; block: Uint8Array }[] = [];
  const frames = new Map<number, { ptr: number; dx: number; dy: number }>();
  for (const h of worn.hat) {
    let at = blocks.find((b) => b.block.every((v, i) => v === h.block[i]));
    if (!at) {
      const ptr = HAT_BLOCKS[blocks.length];
      if (ptr === undefined) throw new Error(`a hat needs more than the ${HAT_BLOCKS.length} blocks the pool has`);
      at = { ptr, block: h.block };
      blocks.push(at);
    }
    frames.set(h.ptr, { ptr: at.ptr, dx: h.dx, dy: h.dy });
  }
  return { blocks, frames };
}
