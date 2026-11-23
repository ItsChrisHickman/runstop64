/**
 * Where the Pacific's borrowed sprite blocks are: the bank is full, so a swim room (while it is loaded: `roomBlocks`) puts its pictures in the blocks Rio's gauchos' skewers use in Rio
 * ($A7-$AE) and the Andes' canopy uses in the Andes' flights ($76, $77), and the sea serpent's room puts its pieces in the blocks China's dragon uses in China ($C6-$CC). A leaf module.
 */

/** Monty swimming: the four pictures of the crawl going left, then going right, and the lei's crown over each way. */
export const SWIM_POINTERS = { left: [0xa7, 0xa8, 0xa9, 0xaa], right: [0xab, 0xac, 0xad, 0xae], crownLeft: 0x76, crownRight: 0x77 } as const;

/** The stroke's cycle as pointers, each way. */
export const SWIM_CYCLE = { left: SWIM_POINTERS.left, right: SWIM_POINTERS.right } as const;
