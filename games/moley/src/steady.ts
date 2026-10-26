import { Game, type Outcome } from './game';
import type { Random } from './random';

/**
 * A game whose random numbers are a function of the pass (its counter, a byte) and of how many were asked for in it, not of how many were
 * asked for before: the same state with the same keys plays the same pass whenever it is played, whichever way it got there. The
 * ending's routes are found by a search that tries moves on copies of the game, and a route is played again by the show: with the
 * generator of `SeededRandom` (one stream, spent by every try) a plan found on a copy is not what the game then does; with this, it is.
 * (The numbers repeat every 256 passes, ten seconds: nothing in the game notices.)
 */
class SteadyRandom implements Random {
  private pass = 0;
  private asked = 0;
  constructor(private readonly seed: number) {}

  /** A pass begins: the numbers asked for in it start again. */
  startPass(pass: number): void {
    this.pass = pass;
    this.asked = 0;
  }

  byte(): number {
    let t = (Math.imul(this.seed, 0x9e3779b1) + Math.imul(this.pass + 1, 0x85ebca6b) + Math.imul(++this.asked, 0xc2b2ae35)) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) >>> 24;
  }
}

export class SteadyGame extends Game {
  private readonly steady: SteadyRandom;

  constructor(seed: number, steady: SteadyRandom = new SteadyRandom(seed)) {
    super(steady);
    this.steady = steady;
  }

  override pass(keys: number): Outcome {
    this.steady.startPass((this.counter + 1) & 0xff);
    return super.pass(keys);
  }
}
