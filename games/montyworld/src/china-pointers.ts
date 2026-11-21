/**
 * Where China's sprites are in the bank (the blocks of $40 bytes numbered by pointer; the bank's free ones are $C0, $C6-$CF and $FB-$FF, and the hats'
 * pictures take $D7-$DF and $EB-$FA, hats.ts). A leaf module: the rooms and the dragon's data both name these.
 */

/** The items: the tower key, the rice hat, the bamboo and the dumplings. */
export const CHINA_SPRITE = { key: 0xc0, riceHat: 0xfb, bamboo: 0xfc, dumplings: 0xfd } as const;

/** The dragon's pictures: the head going left (mouth open, shut) and right, the body, the tail going left and right. */
export const DRAGON_POINTERS = { headLeftOpen: 0xc6, headLeftShut: 0xc7, headRightOpen: 0xc8, headRightShut: 0xc9, body: 0xca, tailLeft: 0xcb, tailRight: 0xcc } as const;
