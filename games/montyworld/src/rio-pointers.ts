/**
 * Where Rio's sprites are in the bank (the blocks of $40 bytes numbered by pointer). Rio's come from the blocks of Monty on the Run's own that a game with no C5, no flag and no boat never shows ($A0-$AE: the Union
 * Jack's four and the C5's sixteen; the game-over letters at $B6-$BC and the lift's death at $BD-$BE stay), and the block after them ($AF) for the acai bowl, which is the game's treasure (`itemSprites.treasure`): touching it ends the game. A leaf module: the rooms and the data both name these.
 */

/** The crank, the headdress, the churrasco skewer (the food) and the acai bowl (the treasure's pointer). */
export const RIO_SPRITE = { crank: 0xa0, headdress: 0xa1, skewer: 0xa2, bowl: 0xaf } as const;

/** The cable car's roof and floor. */
export const CAR_POINTERS = { roof: 0xa5, floor: 0xa6 } as const;

/**
 * Viktor's four-way split in the Sambadrome (viktor.ts `VIKTOR_SPLIT`, sixteen pictures): put in while the room is loaded (`roomBlocks`), in blocks it never shows: the fourth creature slot's ($48-$4F: the
 * room has three) and the cable car's and the left skewer's ($A3-$AA: the finale's sunset had $A3 and $A4; the others are Sugar Rush's and the churrascaria's, put back as the bank has them elsewhere).
 */
export const SPLIT_POINTERS: readonly number[] = [0x48, 0x49, 0x4a, 0x4b, 0x4c, 0x4d, 0x4e, 0x4f, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa];

/** The gaucho's skewer in its four poses (down, forward and low, straight out, up), facing left and facing right. */
export const SKEWER_POINTERS = { left: [0xa7, 0xa8, 0xa9, 0xaa], right: [0xab, 0xac, 0xad, 0xae] } as const;
