import type { MontyData } from './montydata';

/**
 * Decor.CalculateRoom's characters: each decoration type in a room takes the next characters from $9B
 * up (w × h of them) the first time it's placed; a type that doesn't fit in the pool (to $FF) isn't
 * drawn, as in the original. By type: its first character, or 0.
 */
export function decorChars(data: MontyData, roomId: number): Int16Array {
  const { decorRooms, decorTypes } = data;
  const first = new Int16Array(decorTypes.length).fill(0);
  let alloc = 0x9b;
  for (let i = 0; i + 3 < decorRooms.length; i += 4) {
    if (decorRooms[i] !== roomId) continue;
    const type = decorRooms[i + 3], t = decorTypes[type];
    if (!t || first[type]) continue;
    if (alloc + t.w * t.h > 0xff) continue; // pool exhausted: the original skips it too
    first[type] = alloc;
    alloc += t.w * t.h;
  }
  return first;
}
