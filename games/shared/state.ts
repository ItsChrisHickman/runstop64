/**
 * A game's state as plain numbers: what `Game.snapshot()` writes and `Game.restore()` reads (a save, the lockstep test's planners,
 * which try moves ahead on a copy). Every part writes its fields in a fixed order and reads them back in the same order.
 */
export class StateWriter {
  readonly numbers: number[] = [];

  put(...values: number[]): void { this.numbers.push(...values); }
  flag(value: boolean): void { this.numbers.push(value ? 1 : 0); }
}

export class StateReader {
  private at = 0;
  constructor(private readonly numbers: readonly number[]) {}

  get(): number {
    const v = this.numbers[this.at++];
    if (v === undefined) throw new Error('the saved state is too short');
    return v;
  }

  flag(): boolean { return this.get() !== 0; }
}

/** A part of the game that can be saved. */
export interface Stateful {
  save(w: StateWriter): void;
  load(r: StateReader): void;
}
