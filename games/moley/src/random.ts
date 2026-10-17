/**
 * The game's random numbers. The original has no generator: it reads the Z80's refresh register (`LD A,R`, `$9ECE` and `$861A`), a
 * counter of instruction fetches, so what it gets depends on the exact timing of everything before. Every use takes the low bits
 * of the byte (`AND $07`, `AND $1F`, `AND $7F`), so the rebuild asks for a byte and masks it the same way.
 *
 * The shipped game uses `SeededRandom`; the lockstep test feeds in the bytes the original read (test/lockstep.ts), so the rebuild
 * can be compared with it pass by pass.
 */
export interface Random {
  /** a byte, 0-255 (what `LD A,R` would give) */
  byte(): number;
}

/** A small seeded generator (mulberry32): the same seed plays the same game. */
export class SeededRandom implements Random {
  private state: number;
  constructor(seed: number) { this.state = seed >>> 0; }

  byte(): number {
    this.state = (this.state + 0x6d2b79f5) >>> 0;
    let t = this.state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) >>> 24;
  }
}
