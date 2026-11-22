/**
 * Where Rio's sprites are in the bank (the blocks of $40 bytes numbered by pointer). Rio's come from the blocks of Monty on the Run's own that a game with no C5, no flag and no boat never shows ($A0-$AE: the Union
 * Jack's four and the C5's sixteen; the game-over letters at $B6-$BC and the lift's death at $BD-$BE stay), and the block after them ($AF) for the acai bowl, which is the game's treasure (`itemSprites.treasure`): touching it ends the game. A leaf module: the rooms and the data both name these.
 */

/** The key to the city, the headdress, the churrasco skewer (the food) and the acai bowl (the treasure's pointer). */
export const RIO_SPRITE = { key: 0xa0, headdress: 0xa1, skewer: 0xa2, bowl: 0xaf } as const;

/** The setting sun of the finale, the black block that is the sea below the horizon (the sun sets behind it), and the cable car's roof and floor. */
export const SUN_POINTER = 0xa4;
export const SUN_MASK_POINTER = 0xa3;
export const CAR_POINTERS = { roof: 0xa5, floor: 0xa6 } as const;

/** The gaucho's skewer in its four poses (down, forward and low, straight out, up), facing left and facing right. */
export const SKEWER_POINTERS = { left: [0xa7, 0xa8, 0xa9, 0xaa], right: [0xab, 0xac, 0xad, 0xae] } as const;
