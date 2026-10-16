import { roomOf } from './factory';
import { shown } from './map';

/**
 * The hints assist: sparkles on what moves the game on, in the room Thing is in. Each room shows
 * one thing at a time, as sprite 7 ($5875 picks it: the room's jigsaw piece if it has one and it's
 * not taken, else its oil can, else its switch; in room 15, once all nine pieces are taken, the
 * goblin's stop). The pieces, the switches and the goblin are what the game needs done (taking
 * them: $5981, by the sprite's collision with Thing); an oil can only keeps him going, so it gets
 * no sparkle. When the thing is along the room out of sight, a sparkle at the screen's edge
 * says which way it is.
 */
export function hintSpots(ram: Uint8Array, vic: Uint8Array): { x: number; y: number }[] {
  if (ram[0x63] || ram[0x5d] || ram[0x1c] || ram[0x0d] !== 0) return [];
  const room = roomOf(ram[0x5f], ram[0x5e]);
  if (room === null) return [];
  const t = shown(ram, room);
  if (!t || t.kind === 'oil') return [];
  // on screen: on the sprite (the game draws it where it is, while it's within the picture)
  if (vic[0x15] & 0x80) {
    const sx = vic[14] | (vic[0x10] & 0x80 ? 256 : 0), sy = vic[15];
    return [{ x: sx - 24 + 12, y: sy - 50 + 10 }];
  }
  // along the room: at the edge it's beyond
  const off = t.col - ram[0x19];
  const y = Math.max(8, Math.min(190, t.y - 50 + 10));
  return [{ x: off < 0 ? 6 : 314, y }];
}
