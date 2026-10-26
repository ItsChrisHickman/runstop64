import type { Route } from './ending-routes';

/**
 * A route played back: the keys of each pass, in the pace of the montage. A pass is two frames, as in play; but a wait (Monty standing for
 * more than `LONG_WAIT` passes: the traffic of the M1, a piston, the cassette coming down) is run `FAST` passes a frame but for its first
 * and last few, so the picture is not a still one for half a minute. The game plays the same passes either way: only how many go in a
 * frame changes, and the route found for it is the same game.
 */
const FAST = 6;
const LONG_WAIT = 50;
/** The passes at either end of a long wait that are played at the game's own pace. */
const EDGE = 8;

export class Pilot {
  private readonly keys: number[] = [];
  private readonly fast: boolean[] = [];
  private at = 0;
  private half = 0;

  constructor(route: Route) {
    for (const [keys, passes] of route.runs) {
      const long = keys === 0 && passes >= LONG_WAIT;
      for (let p = 0; p < passes; p++) {
        this.keys.push(keys);
        this.fast.push(long && p >= EDGE && p < passes - EDGE);
      }
    }
  }

  get done(): boolean { return this.at >= this.keys.length; }

  /** The passes of this frame (none on the second frame of a pass at the game's pace), and whether they are the montage's quick ones. */
  frame(): { keys: number[]; fast: boolean } {
    if (this.done) return { keys: [], fast: false };
    if (this.fast[this.at]) {
      const keys: number[] = [];
      while (keys.length < FAST && !this.done && this.fast[this.at]) keys.push(this.keys[this.at++]);
      this.half = 0;
      return { keys, fast: true };
    }
    if (this.half === 0) {
      this.half = 1;
      return { keys: [this.keys[this.at++]], fast: false };
    }
    this.half = 0;
    return { keys: [], fast: false };
  }

  /** How many frames the whole route takes. */
  static frames(route: Route): number {
    const p = new Pilot(route);
    let n = 0;
    while (!p.done) { p.frame(); n++; }
    return n;
  }
}
