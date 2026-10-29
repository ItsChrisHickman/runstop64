import type { C64Machine } from 'c64kit';
import type { Gen } from '../../shared/native/cpu';
import type { AirJumpSpec } from '../../shared/native/features';
import * as engine from './gen/engine';
import { ITEM_CELLS } from './itemcounts';
import { BEDROOM, itemBits, itemsFound, NEED } from './items';

/**
 * Jet Set Willy II's ENHANCED, the part that makes the game a lot easier (QOL.md): a second jump in the
 * air, ropes that hold, a gentler touch, sparkles on the items left. Each is the game's own code and
 * bytes put to a new use, so rooms, collisions and falls work as ever.
 */

// ---- a second jump in the air ------------------------------------------------------------------------

/** The jump: $8292 is non-zero while he rises, $8293 the step of the rise's table ($8277, 19 steps), $82E4 non-zero while he falls ($82D7 counts the fall), $8666 the sound's pitch. */
const RISING = 0x8292, RISE_STEP = 0x8293, FALLING = 0x82e4, FALL = 0x82d7, PITCH = 0x8666, ROPE = 0x835d;
/** Which way he goes: 1 left, $FF right, 0 straight up ($82AE); the game's own turns are $56AB (left) and $56E9 (right), which also set his facing. */
const WAY = 0x82ae;

/** A translated routine run to its end between frames (its own waits are the frame's, not ours). */
function finish(routine: Gen) { while (!routine.next().done) { /* nothing: it does not wait for anything here */ } }

/**
 * The second jump: the jump begun again where he is, as the game begins one ($5552: the rise's flag set,
 * the step of its table back to the first, no fall). With left or right held he turns that way first, as
 * the game does at the start of a jump ($550A, $552F); with neither he goes on the way he was going.
 */
export const AIR_JUMP: AirJumpSpec = {
  airborne: (ram) => (ram[RISING] !== 0 || ram[FALLING] !== 0) && ram[ROPE] === 0,
  restart(ram, stick) {
    const left = (stick & 4) !== 0, right = (stick & 8) !== 0;
    if (left && !right && ram[WAY] !== 1) finish(engine.r_56ab());
    else if (right && !left && ram[WAY] !== 0xff) finish(engine.r_56e9());
    ram[RISING] = 0xff; ram[RISE_STEP] = 0; ram[FALLING] = 0; ram[FALL] = 0; ram[PITCH] = 0x0f;
  },
};

// ---- ropes ----------------------------------------------------------------------------------------------

/**
 * Ropes, the game's own: Willy takes hold when his cells meet a rope's ($5E14 calls $6233 for a cell of type
 * 9 or more) and the VIC reports his sprite touching the picture ($8305, bit 0: $D01F read every other pass),
 * which a rope's one dotted pixel makes a matter of luck; he lets go when that report is missing three steps
 * running ($53E1), and the jump off a rope wants him on its lower part ($54E1: `cmp #$0e` against how far
 * along it he is, $835C). ENHANCED has him always touching what his cells meet (the report set, and the VIC's
 * latch it is read from), so he takes hold at once and does not fall off, and the jump off works from
 * anywhere on the rope, in the direction held: the game's own jump off ($54E8, then $550A and $552F). For a
 * moment after he lets go (`ROPE_LET_GO`) the report is left to the VIC, or the jump off would take him
 * straight back.
 */
const ROPE_TOUCH = 0x8305;
const ROPE_JUMP_FROM = { address: 0x54e2, original: 0x0e, enhanced: 0x00 } as const;
/** Frames after he lets go of a rope (jumps off, falls) in which he is not drawn back to it: the jump off must get him away. */
const ROPE_LET_GO = 45;

export class RopeGrip {
  private onRope = false;
  private quiet = 0;

  /** After each frame of play (`on`: ENHANCED's rope grip and a game in play). */
  apply(ram: Uint8Array, on: boolean, m: C64Machine) {
    ram[ROPE_JUMP_FROM.address] = on ? ROPE_JUMP_FROM.enhanced : ROPE_JUMP_FROM.original;
    const rope = ram[ROPE] !== 0;
    if (!on) { this.onRope = false; this.quiet = 0; return; }
    if (this.onRope && !rope) this.quiet = ROPE_LET_GO;
    this.onRope = rope;
    if (this.quiet > 0 && !rope) { this.quiet--; return; }
    ram[ROPE_TOUCH] |= 1;
    m.collisions[1] |= 1;
  }
}

// ---- a gentler touch -----------------------------------------------------------------------------------

/**
 * Guardians and nasties are the VIC's sprite collisions: one shared pixel kills. ENHANCED asks for a
 * substantial overlap instead (the model's `spriteOverlap`: opaque pixels two sprites share). Willy's sprite
 * is about 60 pixels; 14 is a hand's breadth of him. Ropes (sprite and picture) are unchanged.
 */
export const OVERLAP = 14;

export function gentleTouch(m: C64Machine, on: boolean) {
  m.spriteOverlap = on ? OVERLAP : 1;
}

// ---- sparkles on the items left ------------------------------------------------------------------------

/** The cells in the room he is in that still hold an item, as places on the picture (C64 pixels: a cell is 8 by 8). */
export function itemSpots(ram: Uint8Array): { x: number; y: number }[] {
  const room = ram[0x13], cells = ITEM_CELLS[room];
  if (!cells) return [];
  const bits = itemBits(ram, room);
  return cells.filter((_, i) => (bits & (1 << i)) !== 0).map(([row, col]) => ({ x: col * 8 + 4, y: row * 8 + 4 }));
}

/** The bed (re/README.md, "The ending"): cells 2 to 5 of row 12 in the Masters Bedroom, a conveyor; $7EC4 is non-zero once the game's own end is under way. */
const BED = { row: 12, first: 2, last: 5 } as const, END_UNDER_WAY = 0x7ec4;

/**
 * The sparkles (ENHANCED): on the items still in the room and, once the game's own count has the NEED items, on the bed in the Masters
 * Bedroom until he is on it and the end begins (nothing in the game says to jump on the bed).
 */
export function hintSpots(ram: Uint8Array): { x: number; y: number }[] {
  const spots = itemSpots(ram);
  if (ram[0x13] === BEDROOM && itemsFound(ram) >= NEED && ram[END_UNDER_WAY] === 0) {
    spots.push({ x: ((BED.first + BED.last + 1) * 8) / 2, y: BED.row * 8 + 4 });
  }
  return spots;
}
