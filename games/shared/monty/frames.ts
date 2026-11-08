/**
 * Monty's sprite pictures (pointers into the sprite bank, $40 a picture) as Monty on the Run
 * has them. The pictures themselves are the game's bank (montyotr's data/motr.json); this names where they are.
 */
export const FRAME = {
  /** four frames of the walk to the left */
  walkLeft: 0x50,
  /** ... and to the right */
  walkRight: 0x54,
  /** four frames on a rope */
  rope: 0x58,
  /** twelve frames of the somersault, left and right */
  jumpLeft: 0x5c,
  jumpRight: 0x68,
  /** the picture that dissolves when he dies (the buffer at $2700) */
  dissolve: 0x9c,
} as const;

