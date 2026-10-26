/**
 * Travel (the pause map's "go back to a screen"), the game's own way.
 *
 * Thing goes from screen to screen through the doorways in them (characters $32/$33): walking
 * right through one ($4AC6 finds it) sets $92 = 1, $5D = 1 and $63 = 1 (play stops); walking
 * left ($4B40), $92 = 0. The main loop ($4371) sees $5D, steps $5E on (or back) by one, clears
 * the screen and builds the next one from the level's data ($43A8-$4447: the strip, its
 * creatures and things, colours), and puts Thing at its left end (if he was facing right, $60
 * positive) or its right end ($4C1F). The lift is screen 0, where the main loop goes off into
 * the lift's own loop ($6D82) until Thing walks out of it onto the next level's first corridor.
 *
 * So going to a screen is that path, pointed at it: the level ($5F) set, $5E one short of the
 * screen (or one past it), $92 and $60 the way he'd be walking, $5D and $63 as a doorway sets
 * them. Whatever he was doing (a jump, a fall, a tube, a spring) is over: he walks in on his
 * feet. Everything the game keeps (the oil, the score, pieces, oil cans and switches taken, the
 * lift) is left as it is.
 */

/** The bytes of what Thing is doing (the scroll under way, a jump, a fall, a tube...), all clear when he walks in on his feet. */
const MOVING = [0x1a, 0x53, 0x55, 0x56, 0x57, 0x58, 0x59, 0x5a, 0x5b, 0x5c, 0x62, 0x72, 0x76, 0x7a, 0x82, 0x83, 0x87, 0x88, 0x8a];

/** Whether travel is offered from here: in play, on a screen (not in the lift), not between screens, not at the end. */
export const canTravel = (ram: Uint8Array) =>
  ram[0x0d] !== 2 && ram[0x5e] >= 1 && ram[0x5e] <= 9 && ram[0x5f] <= 3 && !ram[0x63] && !ram[0x5d] && !ram[0x1c] && !ram[0x87] && !ram[0x83];

/**
 * Into a screen by the game's own way in (in the main loop, between frames: the main loop
 * builds it next), at its left end (`side` 'L', as if walking right) or right end ('R').
 */
export function enter(ram: Uint8Array, level: number, screen: number, side: 'L' | 'R') {
  for (const a of MOVING) ram[a] = 0;
  ram[0x5f] = level;
  ram[0x5e] = side === 'L' ? screen - 1 : screen + 1;
  ram[0x92] = side === 'L' ? 1 : 0;
  ram[0x60] = side === 'L' ? 0x01 : 0x81;
  ram[0x5d] = 1; ram[0x63] = 1;
}

/** Go to a screen (picked on the map). False if it can't from here (and nothing is changed). */
export function go(ram: Uint8Array, level: number, screen: number, side: 'L' | 'R'): boolean {
  if (!canTravel(ram) || level > 3 || screen < 1 || screen > 8) return false;
  enter(ram, level, screen, side);
  return true;
}
