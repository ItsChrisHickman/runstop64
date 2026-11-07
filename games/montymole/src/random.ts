/**
 * The game's random numbers: `$FD9B`, a multiplicative generator on the 16-bit seed the ROM keeps in its system variable `SEED`
 * (`$5C76`): the new seed is the result of three 16-bit subtractions with carry (`seed * 253 + ...` in disguise), and its low
 * byte is the random byte (`C`). Only the enemies that chase use it (`$8882`: a byte against the enemy's strength, `+$0A`).
 * test/data.ts proves `next` against the original's routine; the lockstep feeds the original's seed.
 */
import type { StateReader, StateWriter, Stateful } from '../../shared/state';

/** The seed after `$FD9B`, from the seed before. */
export function nextSeed(seed: number): number {
  const d = (seed >> 8) & 255, e = seed & 255;
  let hl = (e << 8) | 0xfd; // LD H,E; LD L,$FD
  let a = d; // LD A,D; OR A (carry clear)
  let carry = 0;
  const sbcHL = (de: number): void => {
    const r = hl - de - carry;
    carry = r < 0 ? 1 : 0;
    hl = r & 0xffff;
  };
  const sbcA = (): void => { // SBC A,B with B = 0
    const r = a - carry;
    carry = r < 0 ? 1 : 0;
    a = r & 255;
  };
  sbcHL(seed); sbcA();
  sbcHL(seed); sbcA();
  sbcHL(a); // LD E,A; LD D,B: DE = A
  if (carry !== 0) hl = (hl + 1) & 0xffff; // JR NC skips the INC
  return hl;
}

export class Random implements Stateful {
  seed: number;
  constructor(seed = 0) { this.seed = seed & 0xffff; }

  /** The next random byte (`$FD9B`): the seed moves on, its low byte is the number. */
  byte(): number {
    this.seed = nextSeed(this.seed);
    return this.seed & 255;
  }

  save(w: StateWriter): void { w.put(this.seed); }

  load(r: StateReader): void { this.seed = r.get(); }
}
