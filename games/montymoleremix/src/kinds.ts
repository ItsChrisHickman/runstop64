/**
 * Which of Monty on the Run's creatures stands for each of Wanted's. A Wanted creature is four frames of 16 x 16 at an address
 * (`SPRITE_BASE + 128 * kind`); Monty on the Run has a bank of 27 types of eight frames (frames 0-3 one way, 4-7 the other). The
 * table keeps a room's feel (fish in the water rooms, wasps for what flies, the knight in the castle); a kind it does not name takes
 * a type by its number, so each kind is always the same creature.
 */
import { SPRITE_BASE } from '../../montymole/src/data';

/** The first and last of Monty on the Run's creature types (`enemyBank(type)`). */
export const FIRST_TYPE = 8;
export const TYPE_COUNT = 24; // (the 27th and the two before it are banners: GO LU, MF, DL)

/** Monty on the Run's creature types by what they are (its bank, in order: type = FIRST_TYPE + row of montyotr's bank). */
const T = {
  boot: 8, mound: 9, balloon: 10, knight: 11, mushroom: 12, smiley: 13, clock: 14, tank: 15, lamp: 16, spider: 17, face: 18, dish: 19,
  wasp: 20, bubble: 22, ghost: 24, jelly: 26, kettle: 27, cone: 29, hand: 31, cannon: 33, fish: 31,
} as const;

/** Wanted kinds (a set of four frames, by its address) that the table names. */
const NAMED = new Map<number, number>([
  [0x6f00 + 0x00, T.wasp], [0x6f80, T.wasp], // what flies, the falling things' pickets
  [0x6a00, T.fish], [0x6a80, T.fish], // the water rooms' fish
  [0x6780, T.knight], [0x6700, T.knight], // the castle
  [0x6400, T.ghost], [0x6480, T.ghost],
  [0x6e00, T.boot], [0x6e80, T.boot],
]);

/** The Monty on the Run type that stands for the Wanted creature whose frames are at `set`; null for a frame set that is blank or none. */
export function typeOfSet(set: number): number | null {
  if (set < SPRITE_BASE || set >= 0x7780) return null;
  const named = NAMED.get(set);
  if (named !== undefined) return named;
  const kind = (set - SPRITE_BASE) >> 7;
  return FIRST_TYPE + ((kind * 7 + 3) % TYPE_COUNT);
}
