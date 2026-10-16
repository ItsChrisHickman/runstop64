import { C64Machine } from 'c64kit';

/**
 * The machine the port runs on: c64kit's model of the C64's chips (VIC-II with
 * its raster splits and collisions, CIA timers, SID), with no 6502 doing the
 * game's work. The game's state lives in its memory at the original's
 * addresses (names in vars.ts), so the port can be checked against the original
 * byte for byte, and a save is a machine snapshot.
 */
export class Core {
  readonly m: C64Machine;
  readonly ram: Uint8Array;

  constructor(m = new C64Machine()) {
    this.m = m;
    this.ram = m.ram;
  }

  /** Read with the C64's memory map (VIC-II, CIA, colour RAM when I/O is in). */
  r(a: number) { return this.m.cpu.read(a & 0xffff); }
  /** Write with the C64's memory map. */
  w(a: number, v: number) { this.m.cpu.write(a & 0xffff, v & 0xff); }
  /** A little-endian word in memory. */
  word(a: number) { return this.ram[a] | (this.ram[a + 1] << 8); }
  /** Set bits in a byte of memory. */
  or(a: number, v: number) { this.ram[a] |= v; }
  /** Clear the bits not in `v`. */
  and(a: number, v: number) { this.ram[a] &= v; }
  /** Count a timer down to 0 (DEC unless zero). */
  countDown(a: number) { if (this.ram[a]) this.ram[a]--; }
}
