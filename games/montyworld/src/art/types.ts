/**
 * The shapes of the art for Monty Mole: World Tour, in Monty on the Run's own formats (see pixels.ts for how each is made). Every
 * piece of it is new, made for this game in Monty on the Run's style: its 8 x 8 hires characters (one colour a character, on
 * black), its 16 x 16 hires creatures and its decorations.
 */

/**
 * A tile's collision class, as Monty on the Run's `tileProperty` gives them:
 * 0 nothing (he passes through), 1 solid (a wall, a floor and a ceiling: it blocks him on every side), 2 a floor (he stands on it
 * and passes through it from below), 3 a rope or ladder (he climbs it, and stands on it), 4 deadly (two of them under his feet
 * kill him).
 */
export type TileClass = 0 | 1 | 2 | 3 | 4;

/** A C64 colour number (0-15). */
export type Colour = number;

/** A character for a room's code 1-8: its 8 bytes (a row a byte), its class, and the colour it is meant to be shown in. */
export interface NewTile {
  readonly chr: Uint8Array;
  readonly cls: TileClass;
  readonly colour: Colour;
}

/** A decoration as Monty on the Run's decoration types have them: w x h characters, row by row, one colour or one a character. */
export interface NewDecor {
  readonly w: number;
  readonly h: number;
  readonly chr: Uint8Array;
  readonly colour: Colour | Uint8Array;
}

/**
 * A creature as the enemy bank has it: 8 frames of 32 bytes (frames 0-3 as it goes back, 4-7 as it goes on), and whether the
 * bank's `copy` flag is set (frames 0-3 stand for 4-7, as for a creature that looks the same both ways). `colour` is the colour
 * it is meant to be shown in (the room's record picks one of the game's 16 by index).
 */
export interface NewCreature {
  readonly frames: Uint8Array;
  readonly copy: boolean;
  readonly colour: Colour;
}

/** An item: one 63-byte sprite block (24 x 21, hires; the 16 x 16 picture in its top left) and its colour. */
export interface NewItem {
  readonly block: Uint8Array;
  readonly colour: Colour;
}

/** Monty's pictures with something worn drawn on: a 63-byte sprite block for each of his sprite pointers. */
export type CostumeBlocks = readonly { readonly ptr: number; readonly block: Uint8Array }[];
