/**
 * The walking cycle (`$90A3`, and the scripts' own at `$9EA0`): a toggle that flips on every step, and a counter that advances on
 * every second step, 0 1 2 1 0 1 2 1 ... as `frame`: the picture of a figure that moves one stride in two passes.
 */
export class FrameCycle {
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
}
