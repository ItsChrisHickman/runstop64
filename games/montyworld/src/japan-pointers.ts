/**
 * Where Japan's sprites are in the bank (the blocks of $40 bytes numbered by pointer; the bank's free ones are $C0, $C6-$CF and $FB-$FF: China's items and the dragon
 * take $C0, $C6-$CC and $FB-$FD, the hats' pictures $D7-$DF and $EB-$FA, hats.ts). A leaf module: the rooms and the data both name these.
 */

/** The items: the fish food, the daruma, the sushi and the ninja hood on its shrine. */
export const JAPAN_SPRITE = { fishFood: 0xcd, daruma: 0xce, sushi: 0xcf, hood: 0xfe } as const;

/**
 * Mount Fuji's snowball, four rolling pictures (japan.ts `FUJI_SNOWBALLS`): put in while the mountain is loaded (`roomBlocks`), in the fourth creature slot's blocks ($48-$4B), which no room's creatures
 * show (the mountain has none; a worn hat is drawn from blocks of its own).
 */
export const SNOWBALL_POINTERS = [0x48, 0x49, 0x4a, 0x4b] as const;

/** NINJA HIDEOUT's shuriken, four spinning pictures (japan.ts `HIDEOUT_SHURIKEN`): put in while the hideout is loaded, in the same unused fourth creature slot's blocks as the snowball's (another room). */
export const SHURIKEN_POINTERS = [0x48, 0x49, 0x4a, 0x4b] as const;
