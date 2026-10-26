import { cpu } from '../../shared/native/cpu';
import { r_6269 } from './gen/rooms/room-ef20';

/**
 * The shovel (re/README.md, "The shovel"). It lies at the back of its room (block $EF20) as sprite 6,
 * between two ants (sprites 4 and 5). In the original only a stone takes it: thrown facing up, from
 * below and to its left, so that it meets the shovel within 8 pixels across and high enough ($6235),
 * and before the ants have closed in on it (a stone touching an ant as it meets the shovel doesn't
 * count, $6257): about 9 seconds after coming in. Walking up to it, touching it, does nothing.
 *
 * ENHANCED: touching it takes it. Each frame the room's code reads the collisions ($D01E, kept at
 * $3414) and checks them ($61EA: an ant on him, then the stone on the shovel); there, if he (sprite 2)
 * is touching the shovel (sprite 6) and it isn't his yet, the game's own taking of it runs: the code
 * after its stone check passes ($6269: the shovel gone, the SHOVEL icon his, $342F, and its flash and
 * sound), as if the stone had met it. Ants or not: whatever's on him still does what it does after.
 */
const SHOVEL_CHECK = 0x61ea;

/** At the room's check of the collisions (hook $61EA): in ENHANCED, the shovel taken on touching it. */
export function shovelByHand(pc: number, ram: Uint8Array) {
  if (pc !== SHOVEL_CHECK || ram[0x342f] === 1 || (ram[0x3414] & 0x44) !== 0x44) return;
  const regs = { ...cpu };
  r_6269();
  Object.assign(cpu, regs);
}
