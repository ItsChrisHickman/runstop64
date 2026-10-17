/**
 * The walking cycle (`$90A3`, and the scripts' own at `$9EA0`): a toggle that flips on every step, and a counter that advances on
 * every second step, 0 1 2 1 0 1 2 1 ... as `frame`: the picture of a figure that moves one stride in two passes.
 */
import type { StateReader, StateWriter, Stateful } from './state';

export class FrameCycle implements Stateful {
  /** the toggle (`$9126`, $FF or 0) and the counter (`$9124`) */
  toggle = false;
  counter = 0;
  /** the current picture offset, 0-2 (`$9125`) */
  frame = 0;

  /** One step of the cycle: the offset to use now. */
  step(): number {
    this.toggle = !this.toggle;
    if (!this.toggle) return this.frame;
    this.counter = (this.counter + 1) & 3;
    this.frame = this.counter === 3 ? 1 : this.counter;
    return this.frame;
  }

  save(w: StateWriter): void { w.flag(this.toggle); w.put(this.counter, this.frame); }
  load(r: StateReader): void { this.toggle = r.flag(); this.counter = r.get(); this.frame = r.get(); }
}

/**
 * The room scripts' animation (`$9EA0`, stepped once a pass): the walking cycle above, which the scripts use for most pictures
 * (`$9ECC`), and a plain counter 0 1 2 3 (`$9ECD`) the faster things use (`$9E92`, `$9E98`).
 */
export class ScriptClock implements Stateful {
  readonly cycle = new FrameCycle();
  /** `$9ECD` */
  quad = 0;

  step(): void {
    this.quad = (this.quad + 1) & 3;
    this.cycle.step();
  }

  save(w: StateWriter): void { this.cycle.save(w); w.put(this.quad); }
  load(r: StateReader): void { this.cycle.load(r); this.quad = r.get(); }
}
