/**
 * What a room script can see and do: the entity table, the room's tiles and attributes, Monty, the scripts' animation, the
 * random numbers, and the few things a script ends a pass with (a death, leaving for another room). The scripts (rooms.ts) and the
 * primitives they share (primitives.ts) are written against this; `Game` (game.ts) implements it.
 */
import { BLANK_FRAME } from './data';
import type { ScriptClock } from './cycle';
import type { Monty } from './monty';
import type { Random } from './random';
import type { Tiles } from './walking';

/** One record of the entity table (`$8121 + 4 * n`): a 16 x 16 picture at x, y; flags bit 7 = faces left. */
export interface Sprite {
  x: number;
  y: number;
  frame: number;
  flags: number;
}

/** How many records the table has: Monty is entity 0, the room's own things are 1-7. */
export const ENTITY_COUNT = 8;

/** A record as the room entry leaves it (`$8521`): nowhere (x 7, y 0), no picture, flags $80. */
export class Entity implements Sprite {
  x = 7;
  y = 0;
  frame = BLANK_FRAME;
  flags = 0x80;

  reset(): void {
    this.x = 7;
    this.y = 0;
    this.frame = BLANK_FRAME;
    this.flags = 0x80;
  }
}

/** The room's tile map in the original's memory layout; room 2's script writes to it. */
export interface WritableTiles extends Tiles {
  /** the maps then the attribute tables ($6000-$80FF) */
  readonly memory: Uint8Array;
  /** where the current room's map starts in `memory` */
  readonly base: number;
}

/** The kinds of death (`$9592`, `$95C8`): the full one with Monty's three death pictures and sound 0, and the short one, sound 1 only. */
export type Death = 'normal' | 'short';

/**
 * A pass ends early: the script died or left the room, and the rest of it does not run. The original resets the stack and jumps
 * to the room's restart routine; the rebuild throws this, and `Game` catches it and starts the room it names.
 */
export class Abandon {
  constructor(readonly room: number, readonly death: Death | null) {}
}

export interface Stage {
  /** the room was just entered: scripts set themselves up (`$8108`) */
  readonly first: boolean;
  readonly monty: Monty;
  /** entities 0-7; 0 is Monty */
  readonly entities: readonly Sprite[];
  readonly clock: ScriptClock;
  readonly tiles: WritableTiles;
  /** the 576 attribute bytes of the room as shown (rows 0-17), which scripts and items change */
  readonly attrs: Uint8Array;
  readonly rng: Random;
  /** items still lying in the room (`$86F5`) */
  readonly itemsLeft: number;
  /** a beeper effect (`$A017`) */
  sound(effect: number): void;
  /** one step of the gauge down (`$8542`) */
  drain(): void;
  addScore(points: number): void;
  /** Monty's `state` and phase (`$8D6F`): 3 and 4 are driven by scripts */
  setMontyState(state: number): void;
  /** the picture in the HUD's pocket box: a sprite frame, `BLANK_FRAME` for empty (`$878A`) */
  setPocket(frame: number): void;
  /** Monty dies; the pass ends and the room starts again */
  die(kind: Death): never;
  /** Monty leaves for `room` (the exit paid its score already); the pass ends */
  leave(room: number): never;
  /** the game is won: the ending follows this pass (`$A2A1`) */
  finish(): void;
}
