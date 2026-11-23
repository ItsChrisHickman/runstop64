/**
 * Where the Andes' sprites are in the bank (the blocks of $40 bytes numbered by pointer). The free blocks of the earlier regions ($C0-$FE: the hats' pool ends at $FA, China's are $FB-$FD, Japan's $FE) are taken but for $FF, which the empanada has; the rest are blocks of Monty on the Run's own
 * that a game with no jetpack, no treasure and no Union Jack never shows (the jetpack's $76-$79, the original's item blocks $95-$97 and $98-$9B: the Pacific's items took $8F-$91, $93 and $94, and $8E, $92
 * and $9B belong to the first aid kit, the smoke stack and the treasure, which no room of this game holds). A leaf module: the rooms and the data both name these.
 */

/** The three key items (the chullo, the panpipes, the machete); the empanada has the last free block of the hats' pool's neighbour. */
export const ANDES_SPRITE = { chullo: 0x95, panpipes: 0x96, machete: 0x97, empanada: 0xff } as const;

/** The parachute's canopy over Monty: leaning left, level, leaning right (the jetpack's blocks). */
export const CANOPY_POINTERS = { left: 0x76, level: 0x77, right: 0x78 } as const;

/** The boulder's four pictures, one a quarter turn on from the last. */
export const BOULDER_POINTERS = [0x98, 0x99, 0x9a, 0x9b] as const;

/**
 * The leaping piranha's three pictures (nose up, level at the top, nose down): the blocks of Monty on the Run's own that a game with no jetpack flame and no first aid kit or smoke stack never shows
 * (the jetpack's fourth block $79, the first aid kit's $8E and the smoke stack's $92).
 */
export const LEAP_POINTERS = [0x79, 0x8e, 0x92] as const;
