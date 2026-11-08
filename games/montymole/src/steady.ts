import { Game, type Outcome } from './game';
import type { Ports } from './input';
import { Random } from './random';

/**
 * A game whose random numbers are a function of the pass (a counter the game's own state keeps: the generator's seed, which a snapshot and a save carry) and of how many
 * were asked for in it, not of how many were asked for before: the same state with the same keys plays the same pass whenever it is played, whichever way it got there.
 * The reward show's routes are found by a search that tries moves on copies of the game (the only thing here that asks for a number is the crusher's wait), and a route
 * is played again by the show; with the original's generator (one stream, spent by every try) a plan found on a copy is not what the game then does; with this, it is.
 * (The numbers repeat every 65536 passes, 44 minutes: nothing in the game notices.)
 */
class SteadyRandom extends Random {
  private asked = 0;
  constructor(private readonly key: number) { super(0); }

  /** A pass begins: the counter (the `seed`, which a snapshot keeps) moves on and the numbers asked for in it start again. */
  startPass(): void {
    this.seed = (this.seed + 1) & 0xffff;
    this.asked = 0;
  }

  override byte(): number {
    let t = (Math.imul(this.key, 0x9e3779b1) + Math.imul(this.seed + 1, 0x85ebca6b) + Math.imul(++this.asked, 0xc2b2ae35)) >>> 0;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) >>> 24;
  }
}

export class SteadyGame extends Game {
  private readonly steady: SteadyRandom;

  /** `key` tells one game's numbers from another's. */
  constructor(key: number) {
    const steady = new SteadyRandom(key);
    super(steady);
    this.steady = steady;
  }

  override pass(ports: Ports): Outcome {
    this.steady.startPass();
    return super.pass(ports);
  }
}
