import { MANSION } from './mansion';
import { ITEM_COUNTS } from './itemcounts';

/**
 * Jet Set Willy II's items. Each room keeps 16 bits of what is still there, bit 0 for its first item
 * (the order of the room's item table at $8108) up to bit 14, a clear bit being an item taken. In
 * the room Willy is in they are the bytes $8104 (bits 0-7) and $8105 (8-15), and the game puts them
 * back into its table on leaving ($5117, all $FF at the start): $0A00 + 2 * room for rooms under
 * 128 (the high byte first), $0B00 + 2 * (room - 128) for the others (the low byte first).
 * The count of items taken is BCD at $8131 (hundreds) and $8132 (the rest); the ending (the
 * Masters Bedroom, $7315) wants NEED of them.
 */
export const NEED = 160;
export const TOTAL = Object.values(ITEM_COUNTS).reduce((a, b) => a + b, 0);
export const BEDROOM = 34;

if (MANSION[BEDROOM]?.name !== 'MASTERS BEDROOM') throw new Error('the Masters Bedroom has moved');

const bcd = (b: number) => (b >> 4) * 10 + (b & 15);
/** Items taken so far, the game's own count. */
export const itemsFound = (ram: Uint8Array) => bcd(ram[0x8131]) * 100 + bcd(ram[0x8132]);

/** What a room kept, as its 16 bits (the room Willy is in: the live bytes, which the table gets on leaving). */
export function itemBits(ram: Uint8Array, room: number): number {
  if (room === ram[0x13]) return ram[0x8104] | (ram[0x8105] << 8);
  const x = (room * 2) & 0xff;
  return room < 128 ? ram[0x0a01 + x] | (ram[0x0a00 + x] << 8) : ram[0x0b00 + x] | (ram[0x0b01 + x] << 8);
}

/** How many items a room still has. */
export function itemsLeft(ram: Uint8Array, room: number): number {
  let n = 0;
  for (let bits = itemBits(ram, room) & ((1 << (ITEM_COUNTS[room] ?? 0)) - 1); bits; bits >>= 1) n += bits & 1;
  return n;
}
