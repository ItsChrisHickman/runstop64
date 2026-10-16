/**
 * A decimal counter as the game keeps it: five digits, the least significant first, with an amount
 * (0-255) added by $8231 and its two callers ($81FA for the score at $404A, $820A for the money at $4051).
 */
export class Digits {
  /** The five digits, ones first ($404A-$404E, $4051-$4055). The last one is never reduced: it can pass 9. */
  readonly digits: number[] = [0, 0, 0, 0, 0];

  add(amount: number): void {
    const a = amount & 0xff;
    const hundreds = Math.floor(a / 100), tens = Math.floor((a % 100) / 10), ones = a % 10;
    let carry = 0;
    const d = this.digits;
    const step = (i: number, n: number, reduce: boolean): void => {
      let sum = n + (d[i] ?? 0) + carry;
      carry = 0;
      if (reduce && sum >= 10) {
        sum -= 10;
        carry = 1;
      }
      d[i] = sum;
    };
    step(0, ones, true);
    step(1, tens, true);
    step(2, hundreds, true);
    step(3, 0, true);
    step(4, 0, false);
  }

  /** The value as a number (for tests and the high score). */
  get value(): number {
    return this.digits.reduce((sum, d, i) => sum + d * 10 ** i, 0);
  }
}
