/**
 * Where the Pacific's borrowed sprite blocks are: the bank is full, so a swim room (while it is loaded: `roomBlocks`) puts its pictures in the blocks Rio's gauchos' skewers use in Rio
 * ($A7-$AE), and the sea serpent's room puts its pieces in the blocks China's dragon uses in China ($C6-$CC). A leaf module: the art, the rooms and the data all name these.
 */

/** Monty swimming: the glide, the pull and the push going left, then going right, and the lei's crown over each way. */
export const SWIM_POINTERS = { left: [0xa7, 0xa8, 0xa9], right: [0xaa, 0xab, 0xac], crownLeft: 0xad, crownRight: 0xae } as const;

/** The stroke's cycle (glide, pull, glide, push) as pointers, each way. */
export const SWIM_CYCLE = { left: [0xa7, 0xa8, 0xa7, 0xa9], right: [0xaa, 0xab, 0xaa, 0xac] } as const;
