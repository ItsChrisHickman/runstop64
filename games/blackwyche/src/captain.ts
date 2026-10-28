/**
 * THE CAPTAIN'S BLOW COUNTS ONCE (an ENHANCED assist). The captain's soul (room $0C, block $FB20,
 * sprite 4 in the skull's eye) is freed by one blow of the sword: $622B stores 1 in $633B (the
 * end's state: 1 the soul flashes and a note rises, 2 it floats up, 3 it is gone, then $342C = 2).
 * But the block checks the sword's contact every frame ($620C) and stores that 1 again whatever
 * state the end is in: a sword still out as state 1 gives way to 2 puts it back to 1, and state 1
 * only leaves for 2 on its note's counter ($633E) being exactly $20, which the extra frames of
 * contact have already passed, so it counts on, the note climbing to its highest ($D40F = $FF, a
 * piercing 3.8 kHz) before the counter comes round to $20 again, some half a minute on, with the
 * next swing putting it back again. Keep swinging, as anyone does at something that doesn't fall,
 * and it never ends.
 *
 * In ENHANCED the store is made a no-op once the end has begun (at the hook, as the other
 * ENHANCED rules of the game's code are made: games/dragonskulle/src/shovel.ts): the first blow
 * counts, the end runs its course (the note rises $07 to $20 and stops), and the rest is as it was.
 */
import { cpu } from '../../shared/native/cpu';

/** The store of the blow's 1 in $633B (hook in re/room-fb20.json), and the end's state. */
export const BLOW_STORE = 0x622b;
export const END_STATE = 0x633b;

/** At the hook: the blow is already counted, so the store puts back what is there. */
export function captainsBlow(pc: number, ram: Uint8Array) {
  if (pc === BLOW_STORE && ram[END_STATE] !== 0) cpu.a = ram[END_STATE];
}
