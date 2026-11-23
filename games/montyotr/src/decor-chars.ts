import type { MontyData } from './montydata';

/** The first character of the decoration pool (`$9B`): the characters from here up are decorations', not tiles', coins' or items'. */
export const FIRST_DECOR_CHR = 0x9b;

/** A cell a thing drawn over the room (a vine, the lava) may cover: empty, or a decoration's character. */
export const coverable = (chr: number): boolean => chr === 0 || chr >= FIRST_DECOR_CHR;

/**
 * Decor.CalculateRoom's characters: each decoration type in a room takes the next characters from $9B
 * up (w × h of them) the first time it's placed; a type that doesn't fit in the pool (to $FF) isn't
 * drawn, as in the original. By type: its first character, or 0.
 */
export const decorChars = (data: MontyData, roomId: number): Int16Array => decorPool(data, roomId).first;

/** `decorChars` and the first character after the pool (the characters from there up to $FF are free for the room's own use: a coin over a backdrop). */
export function decorPool(data: MontyData, roomId: number): { first: Int16Array; end: number } {
  const { decorRooms, decorTypes } = data;
  const first = new Int16Array(decorTypes.length).fill(0);
  let alloc = FIRST_DECOR_CHR;
  for (let i = 0; i + 3 < decorRooms.length; i += 4) {
    if (decorRooms[i] !== roomId) continue;
    const type = decorRooms[i + 3], t = decorTypes[type];
    if (!t || first[type]) continue;
    if (alloc + t.w * t.h > 0xff) continue; // pool exhausted: the original skips it too
    first[type] = alloc;
    alloc += t.w * t.h;
  }
  return { first, end: alloc };
}
