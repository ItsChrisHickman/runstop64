/**
 * What a tile's name (its header byte, the `name` of re/README.md) means to Monty. The physics never
 * looks at a tile's picture, only at this byte, and the game reads it in four different ways, each a
 * different probe:
 *
 *   under his feet ($47BE `classBelow`)        names 1-$1E and $70 and $DC+ pick a state for him (below);
 *   beside and above him ($494F, $4902)        names $64-$70 are special (they set a state when touched
 *                                              from the side), $71-$B3 are solid walls;
 *   walking through a wall's rows ($49D8)      names $B4-$D1 are one-way floors (up through, down through);
 *   any cell at all ($48A8 `onGround`)         anything that is not empty is ground to stand on. The
 *                                              exceptions are names $B0-$B3, which count as empty, and the
 *                                              cells of items and animated tiles (codes $10 and up), which
 *                                              are not tiles at all (below).
 *
 * A cell of the room is a tile number 1-15 (its name is in the room's header), 0 for empty, or a code
 * of $10 and up that is not a tile: $2F-$3E the items, $6D-$75 the animated tiles (name - $65), and
 * $77 a burning $70 cell. For those the lookup ($4F38) gives name 0 (empty to every probe above) and the
 * code itself, which only the deadly check ($5005) and the sideways probe read.
 */

/** Monty's states (`$4F87`). The ones the tile under him picks are marked. */
export const State = {
  /** Free on the ground: stand, walk, start a jump, climb through floors. */
  Free: 0x00,
  /** A jump: the 24-step arc at index $2B of the arcs; he steers with the direction he jumped in. */
  Jump: 0x01,
  /** A bounce: he touched a name $64-$68 from the side; he is thrown into a jump the other way. */
  Bounce: 0x02,
  /** A spring (names 6-$F under him when he jumps): the arcs from index 0, higher and higher while he keeps landing. */
  Spring: 0x03,
  /** Names $69-$6E touched from the side: a short death (sound $45), 23 steps. */
  Zap: 0x04,
  /** Name $6F touched from the side: a death after 41 steps unless he is out of it after the first. */
  Fire: 0x05,
  /** Name $70 (under his feet or from the side): it burns away (cell $77, then empty) and he goes on. */
  Burn: 0x06,
  /** Dying: a hit, or an animated tile ($6D-$75). 14 steps, then he loses a life. */
  Dying: 0x07,
  /** Falling, 3 pixels a step, until something is under his feet. */
  Fall: 0x08,
  /** Names 1-5 under him: now and then (11 in 256) he is thrown sideways for 24 steps. */
  Slip: 0x09,
  /** Names $10-$15 under him: he moves on every other step only. */
  Slow: 0x0a,
  /** Names $16-$17 under him: now and then (10 in 256) he is stuck for 32 steps. */
  Stuck: 0x0b,
  /** Names $18-$1B at his head: he is carried up the tube; left and right steer, fire lets go. */
  Tube: 0x0c,
  /** Names $1C-$1E under him: now and then (25 in 256) he is thrown into a jump. */
  Kick: 0x0d,
  /** Knocked by an enemy: 24 steps, then he loses a life (stage 3). */
  Knocked: 0x0e,
  /** Pushed along by a script (room $1C; stage 3). */
  Pushed: 0x0f,
  /** Stage 3: set by room scripts and enemies. */
  Script10: 0x10,
  /** The title's walk-in (stage 5). */
  Intro: 0x11,
  /** Walks left on its own (an enemy type's effect; stage 3). */
  Forced: 0x12,
  /** Set by room $4D at the end of the game (stage 3). */
  Ending: 0x13,
} as const;

/**
 * The state the name of the cell under Monty's feet puts him in ($47BE), or 0 for a name that does nothing.
 * Names that are none of these (the plain solid walls and floors, $1F-$6F and $71-$DB) read as empty here
 * and only count as ground for the feet probe.
 */
export function classOfName(name: number): number {
  if (name === 0) return 0;
  if (name < 0x06) return State.Slip;
  if (name < 0x10) return State.Spring;
  if (name < 0x16) return State.Slow;
  if (name < 0x18) return State.Stuck;
  if (name < 0x1c) return State.Tube;
  if (name < 0x1f) return State.Kick;
  if (name >= 0xdc) return State.Dying;
  if (name === 0x70) return State.Burn;
  return 0;
}

/**
 * What touching a name from the side does ($4983, after $494F's subtraction of $64): names $64-$68
 * bounce him, $69-$6E zap him, $6F is the fire, $70 burns away, and $71-$B3 are walls (no state).
 * Returns the state, 0 for a plain wall, or -1 for a name that is not one of these.
 */
export function sideContact(name: number): number {
  const d = (name - 0x64) & 0xff;
  if (d >= 0x50) return -1;
  if (d >= 0x0d) return 0;
  if (d < 5) return State.Bounce;
  if (d < 0x0b) return State.Zap;
  if (d === 0x0b) return State.Fire;
  return State.Burn;
}

/** Names $B4-$D1: floors Monty can climb up through and drop down through ($49D8). */
export function isOneWayFloor(name: number): boolean {
  return name >= 0xb4 && name < 0xd2;
}

/** Names $64-$B3: what stops his head ($4902) and, from $64, what the sideways probe reacts to. */
export function isCeiling(name: number): boolean {
  return ((name - 0x64) & 0xff) < 0x50;
}

/** Cell codes $6D-$76 (animated tiles) kill him when he touches them ($5005). */
export function isDeadlyCode(code: number): boolean {
  return code >= 0x6d && code < 0x77;
}

/** The cell code a burning $70 tile is given while it burns (cleared when the burn is over). */
export const BURNING_CODE = 0x77;
/** The name of the burnable tile. */
export const BURNABLE = 0x70;
