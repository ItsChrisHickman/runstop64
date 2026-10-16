/**
 * TRAPDOORS STAY OPEN (an ENHANCED assist): a trapdoor that has given way under Pendragon shows
 * as the hole it became each time he comes back to that cabin, so he can see it and go round
 * (or jump over) it. The hole is still a hole: the cabin's block drops him through it as before.
 *
 * Each trapdoor is a sprite of boards in its cabin's block; on giving way the block swaps in the
 * hole's shape ($5280: copied over the boards, or room $0B's sprite pointer set to its copy) and
 * sets $342A. Coming back in, the block draws the boards again; this puts the hole back.
 */
import { isString } from '../../shared/guards';
import { findOverlayRoutine, type OverlayVersion } from '../../shared/native/host';
import * as room_ca60 from './gen/rooms/room-ca60';
import * as room_e570 from './gen/rooms/room-e570';
import * as room_e760 from './gen/rooms/room-e760';
import * as room_ebf0 from './gen/rooms/room-ebf0';
import * as room_f1d0 from './gen/rooms/room-f1d0';

/** The hole's shape, the 64 bytes each block copies over its boards. */
const HOLE = 0x5280;
const SIZE = 64;

interface Trap {
  /** The block with this trapdoor, and its routine that opens it (to know the block is the one loaded). */
  block: OverlayVersion;
  routine: number;
  /** The trapdoor's sprite (for its id). */
  sprite: number;
  isOpen(ram: Uint8Array): boolean;
  open(ram: Uint8Array): void;
}

/** A trapdoor whose boards' shape is at `at`: opening copies the hole's over them. */
const copied = (block: OverlayVersion, routine: number, sprite: number, at: number): Trap => ({
  block, routine, sprite,
  isOpen: (ram) => ram.subarray(at, at + SIZE).every((b, i) => b === ram[HOLE + i]),
  open: (ram) => ram.copyWithin(at, HOLE, HOLE + SIZE),
});
/** Room $0B's three trapdoors: opening points the sprite at the hole's copy ($21: $0840). */
const pointed = (block: OverlayVersion, sprite: number): Trap => ({
  block, routine: 0x611a, sprite,
  isOpen: (ram) => ram[0x07f8 + sprite] === 0x21,
  open: (ram) => { ram[0x07f8 + sprite] = 0x21; },
});

const CA60 = { module: room_ca60, code: room_ca60.CODE }, E570 = { module: room_e570, code: room_e570.CODE };
const E760 = { module: room_e760, code: room_e760.CODE }, EBF0 = { module: room_ebf0, code: room_ebf0.CODE };
const F1D0 = { module: room_f1d0, code: room_f1d0.CODE };

/** The trapdoors, by the room whose block has them ($341C; src/ship.ts WAYS). */
export const TRAPS: Record<number, Trap[]> = {
  0x21: [copied(CA60, 0x6079, 4, 0x0900)],
  0x1d: [copied(E570, 0x6198, 4, 0x0900)],
  0x0a: [copied(E760, 0x61d2, 5, 0x0940)],
  0x08: [copied(F1D0, 0x616d, 6, 0x0980)],
  0x0b: [pointed(EBF0, 4), pointed(EBF0, 5), pointed(EBF0, 6)],
};

/** The cabin he's in, as the map names it ("C deck.part.door"), and its room; null on a deck or in a hall. */
function cabin(ram: Uint8Array) {
  if (!ram[0x342e]) return null;
  return { id: `C${ram[0x9d78]}.${ram[0x1ecd]}.${ram[0x1ee5]}`, room: ram[0x341c] };
}

/**
 * The trapdoors that have given way ("C deck.part.door:sprite"), kept with what's been found
 * (`found.trapdoors`, and so with the saves): read back from what was kept.
 */
export const parseSprung = (kept: unknown): string[] => (Array.isArray(kept) ? kept.filter(isString) : []);

export class TrapDoors {
  private falling = false;

  /** One frame of play (after the game's): `on` while the assist is on and the game is being played; `list`: the trapdoors that have given way (kept with the saves). */
  frame(ram: Uint8Array, on: boolean, list: string[]) {
    const fell = ram[0x342a] !== 0 && !this.falling;
    this.falling = ram[0x342a] !== 0;
    if (!on) return;
    const here = cabin(ram);
    const traps = here ? TRAPS[here.room] : undefined;
    if (!here || !traps) return;
    for (const t of traps) {
      if (!findOverlayRoutine([t.block], ram, t.routine)) continue;
      const id = `${here.id}:${t.sprite}`;
      if (fell && t.isOpen(ram) && !list.includes(id)) list.push(id);
      else if (list.includes(id) && !t.isOpen(ram)) t.open(ram);
    }
  }
}
