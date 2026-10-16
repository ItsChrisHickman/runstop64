/**
 * The press that started (or continued) a game, or closed a screen, must not also be the game's own
 * fire (a jump, a shot): it is ignored until it is let go. `hold()` when such a press has been
 * spent; `filter(fire)` gives the fire the game should see.
 */
export class FireLatch {
  private over: boolean;

  /** `over`: a press is already spent at the start (a launch straight into play). */
  constructor(over = false) { this.over = over; }

  /** A press has been spent: its fire is ignored until it is let go. */
  hold() { this.over = true; }

  /** `fire` as the game gets it: let go of, the latch is free again; held, it is ignored while the latch holds. */
  filter(fire: boolean): boolean {
    if (this.over && !fire) this.over = false;
    return fire && !this.over;
  }
}
