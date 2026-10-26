/**
 * The pieces the six room scripts share, each the original's own routine: the touch test (`$87A7`), the two kinds of harm
 * (`$9586` kills, `$956D` takes one step off the gauge), placing a thing and choosing its picture (`$9E84`-`$9E98`), the two
 * walkers (`$9E5B`, `$9E32`) and the bobber (`$9DF3`).
 */
import { JUMP_STEPS } from './data';
import { stepLeft, stepRight } from './walking';
import type { Sprite, Stage } from './stage';
import type { StateReader, StateWriter, Stateful } from './state';

export const wrap = (n: number): number => n & 0xff;

/** Two things touch when they are less than 16 pixels apart both ways (`$87A7`). */
export function touching(a: Sprite, b: Sprite): boolean {
  return Math.abs(a.x - b.x) < 16 && Math.abs(a.y - b.y) < 16;
}

/** Touching Monty kills (`$9586`). */
export function kills(s: Stage, e: Sprite): void {
  if (touching(e, s.monty)) s.die('normal');
}

/** Touching Monty costs one step of the gauge and sounds effect 3 (`$956D`). */
export function drains(s: Stage, e: Sprite): void {
  if (!touching(e, s.monty)) return;
  s.sound(3);
  s.drain();
}

/** The picture is `base` plus the cycle 0 1 2 1 (`$9ECC`, `$9E8A`). */
export function pictureFromCycle(s: Stage, e: Sprite, base: number): void {
  e.frame = wrap(s.clock.cycle.frame + base);
}

/** The picture is `base` plus the counter 0 1 2 3 (`$9ECD`, `$9E98`). */
export function pictureFromQuad(s: Stage, e: Sprite, base: number): void {
  e.frame = wrap(s.clock.quad + base);
}

/** Put a thing at x, y with a picture from the cycle (`$9E84`). */
export function place(s: Stage, e: Sprite, x: number, y: number, base: number): void {
  e.x = x;
  e.y = y;
  pictureFromCycle(s, e, base);
}

/** Put a thing at x, y with a picture from the counter (`$9E92`). */
export function placeQuad(s: Stage, e: Sprite, x: number, y: number, base: number): void {
  e.x = x;
  e.y = y;
  pictureFromQuad(s, e, base);
}

/** How a walker picks its picture. */
type Picture = 'cycle' | 'quad';

/** Where a walker starts: its flags (bit 7 = walking left), the base of its picture and its place. */
interface WalkerStart {
  readonly flags: number;
  readonly base: number;
  readonly x: number;
  readonly y: number;
}

/**
 * A walker (`$9E5B`, `$9E32`): on the room's first pass it is put at its start; every pass it steps 2 pixels the way its flags
 * say and turns round when the step is refused (a wall, or the edge), then takes the picture `base` plus the animation. Walkers
 * of the first kind take their pictures from the cycle 0 1 2 1, those of the second from the counter 0 1 2 3.
 */
function walk(s: Stage, e: Sprite, start: WalkerStart, picture: Picture): void {
  if (s.first) {
    e.flags = start.flags;
    if (picture === 'cycle') place(s, e, start.x, start.y, start.base);
    else placeQuad(s, e, start.x, start.y, start.base);
  }
  if ((e.flags & 0x80) !== 0) {
    if (!stepLeft(s.tiles, e)) e.flags &= 0x7f;
  } else if (!stepRight(s.tiles, e)) {
    e.flags |= 0x80;
  }
  if (picture === 'cycle') pictureFromCycle(s, e, start.base);
  else pictureFromQuad(s, e, start.base);
}

export const walker = (s: Stage, e: Sprite, start: WalkerStart): void => walk(s, e, start, 'cycle');
export const walkerQuad = (s: Stage, e: Sprite, start: WalkerStart): void => walk(s, e, start, 'quad');

/**
 * The bobber (`$9DF3`): moves a thing up and down by the same 24 steps as Monty's jump, one a pass, from a counter that is one
 * for the whole game (so a second bobber in a room would share it). The counter starts again on the room's first pass.
 */
export class Bobber implements Stateful {
  private counter = 0;

  get state(): number { return this.counter; }
  set state(v: number) { this.counter = v & 0xff; }

  bob(s: Stage, e: Sprite): void {
    if (s.first) this.counter = 0;
    const old = this.counter;
    this.counter = wrap(this.counter + 1);
    if (old === 0x17) this.counter = 0;
    e.y = wrap(e.y + JUMP_STEPS[this.counter]);
  }

  save(w: StateWriter): void { w.put(this.counter); }
  load(r: StateReader): void { this.counter = r.get(); }
}
