/**
 * Fixed-tick game loop with interpolated rendering.
 *
 * Game logic runs at a fixed rate (50 Hz by default, the C64's PAL frame
 * rate, so original timing tables work unchanged). Rendering runs at the
 * display's refresh rate and receives `alpha` (0..1), how far we are between
 * the previous tick and the next, so movement can be drawn smoothly at
 * 60/120/144 Hz.
 */
export interface LoopHandlers {
  tick(): void;
  render(alpha: number): void;
}

export class FixedLoop {
  private acc = 0;
  private last = 0;
  private raf = 0;
  private running = false;
  readonly step: number;

  constructor(private handlers: LoopHandlers, readonly hz = 50) {
    this.step = 1000 / hz;
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    const frame = (now: number) => {
      if (!this.running) return;
      // Clamp long gaps (tab switch, debugger) so we don't spiral.
      this.acc += Math.min(now - this.last, 250);
      this.last = now;
      while (this.acc >= this.step) {
        this.handlers.tick();
        this.acc -= this.step;
      }
      this.handlers.render(this.acc / this.step);
      this.raf = requestAnimationFrame(frame);
    };
    this.raf = requestAnimationFrame(frame);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }
}

/**
 * Smooth display position for something that moves in game ticks.
 *
 * Draws between the averages of consecutive tick positions, which turns
 * "2px every other tick" style movement (common on the C64) into an even
 * glide, at the cost of ~1 tick of display latency. `reset` after teleports.
 */
export class Smoothed {
  private xs = [0, 0, 0];
  private ys = [0, 0, 0];

  reset(x: number, y: number) {
    this.xs.fill(x);
    this.ys.fill(y);
  }

  push(x: number, y: number) {
    this.xs.shift(); this.xs.push(x);
    this.ys.shift(); this.ys.push(y);
  }

  /** Position at `alpha` (0..1) between ticks; `snap` returns the latest tick position. */
  at(alpha: number, snap = false) {
    const [x0, x1, x2] = this.xs, [y0, y1, y2] = this.ys;
    if (snap) return { x: x2, y: y2 };
    const ax = (x0 + x1) / 2, bx = (x1 + x2) / 2, ay = (y0 + y1) / 2, by = (y1 + y2) / 2;
    return { x: ax + (bx - ax) * alpha, y: ay + (by - ay) * alpha };
  }
}
