/**
 * The score as the game keeps it: five decimal digits, units first (`$9217-$921B`), added to a point at a time by `$919D`. Only coal
 * scores, and the most the whole game gives is 3392 (the sum of the 64 values), so the wrap at 100000 is never met; it is here because the
 * routine has it (`$91E2`). A value of 0 would add 256: the routine counts down from its argument with `DJNZ`.
 */
import type { StateReader, StateWriter, Stateful } from '../../shared/state';

export const SCORE_DIGITS = 5;

export class Score implements Stateful {
  /** the digits, units first */
  readonly digits: number[] = [0, 0, 0, 0, 0];

  /** `$919D`: add `points` (1-255; 0 is 256, as the routine counts). */
  add(points: number): void {
    let left = points === 0 ? 256 : points;
    while (left-- > 0) {
      let d = 0;
      for (; d < SCORE_DIGITS; d++) {
        this.digits[d] = (this.digits[d] ?? 0) + 1;
        if (this.digits[d] !== 10) break;
        this.digits[d] = 0;
      }
    }
  }

  /** The score as a number. */
  get value(): number {
    return this.digits.reduceRight((n, d) => n * 10 + d, 0);
  }

  reset(): void { this.digits.fill(0); }

  save(w: StateWriter): void { w.put(...this.digits); }

  load(r: StateReader): void {
    for (let i = 0; i < SCORE_DIGITS; i++) this.digits[i] = r.get();
  }
}
