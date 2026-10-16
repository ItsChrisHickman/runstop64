/**
 * The game's random numbers ($51F7). A 256-byte table ($3300) is read at an index that steps by $29 each
 * call; a second byte ($5225) adds the index in on every call and takes the carry of the index's step, and
 * is read by nothing else, so it only matters as part of the state the lockstep compares.
 */
export class Random {
  /** $5224: where in the table the next number comes from. */
  index: number;
  /** $5225: the running sum (never read back by the game for anything but itself). */
  sum: number;

  constructor(private readonly table: Uint8Array, index = 0, sum = 0) {
    this.index = index;
    this.sum = sum;
  }

  /** The next number: 0-255. */
  next(): number {
    this.sum = (this.sum + this.index) & 0xff;
    const stepped = this.index + 0x29;
    this.index = stepped & 0xff;
    this.sum = (this.sum + (stepped >> 8)) & 0xff;
    return this.table[this.index] ?? 0;
  }
}
