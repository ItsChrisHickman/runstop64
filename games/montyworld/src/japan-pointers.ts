/**
 * Where Japan's sprites are in the bank (the blocks of $40 bytes numbered by pointer; the bank's free ones are $C0, $C6-$CF and $FB-$FF: China's items and the dragon
 * take $C0, $C6-$CC and $FB-$FD, the hats' pictures $D7-$DF and $EB-$FA, hats.ts). A leaf module: the rooms and the data both name these.
 */

/** The items: the fish food, the daruma, the sushi and the ninja hood on its shrine. */
export const JAPAN_SPRITE = { fishFood: 0xcd, daruma: 0xce, sushi: 0xcf, hood: 0xfe } as const;
