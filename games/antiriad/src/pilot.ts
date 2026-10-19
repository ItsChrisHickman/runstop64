import { NO_PAD, type Pad } from './controls';
import type { Game } from './game';
import { V } from './vars';

/**
 * Tal driven by input like a player's: a scene's steps say what is held (the stick, FIRE, JUMP) for how long, or until
 * something is so (Tal has reached a place, the armour has landed), as a player holds the stick until he is there. What comes
 * out is a `Pad` a frame, the same input the keyboard gives, so he runs, jumps, crouches and flies as he does in play.
 */

/** What is held, as letters: `<` `>` `^` `v` the stick, `F` fire, `J` the jump button, `C` the cell button, `.` nothing. */
export type Held = string;

/** What is held: the same all through the step, or looking at the game each frame (a player steering toward something). */
export type Hold = Held | ((g: Game) => Held);

/** One step: `hold` for `frames`, or until `until` is so (at most `max` frames, 600 if not said). */
export type Step =
  | { hold: Hold; frames: number }
  | { hold: Hold; until: (g: Game) => boolean; max?: number };

const MAX = 600;

/** The pad for what is held (`first`: the first frame of the step, when a jump is a fresh press). */
export function padOf(hold: Held, first: boolean): Pad {
  const has = (c: string) => hold.includes(c);
  return { up: has('^'), down: has('v'), left: has('<'), right: has('>'), fire: has('F'), jump: has('J'), jumpTap: has('J') && first, cell: has('C') && first };
}

export class Pilot {
  private i = 0;
  private spent = 0;
  /** The frames the pilot has been asked for. */
  frames = 0;
  constructor(private readonly steps: readonly Step[]) {}

  /** Every step is done. */
  get done() { return this.i >= this.steps.length; }

  /** The step now (null when done). */
  get step(): Step | null { return this.steps[this.i] ?? null; }

  /** The pad for this frame, given the game as it is. */
  next(g: Game): Pad {
    for (;;) {
      const s = this.steps[this.i];
      if (!s) return NO_PAD;
      const over = 'frames' in s ? this.spent >= s.frames : this.spent >= (s.max ?? MAX) || s.until(g);
      if (over) { this.i++; this.spent = 0; continue; }
      const pad = padOf(typeof s.hold === 'string' ? s.hold : s.hold(g), this.spent === 0);
      this.spent++;
      this.frames++;
      return pad;
    }
  }
}

// ---- what a pilot looks at ------------------------------------------------------------------------------

/** Tal's (or the armour's) x across the playfield, in the sprite's own numbers (0 to 511). */
export const talX = (g: Game) => g.ram[0x0200] | ((g.ram[V.spriteXHigh] & 1) << 8);
/** ... and his y (the top of his upper sprite). */
export const talY = (g: Game) => g.ram[0x0201];
export const inArmour = (g: Game) => !!(g.ram[V.inSuit] & 0x80);
/** He is on his feet and the game is giving him the stick (not appearing, dying, in a room change or the air). */
export const ready = (g: Game) => !((g.ram[V.appearing] | g.ram[V.dying] | g.ram[V.jumping]) & 0x80) && !(g.ram[V.roomChange] & 0x80);

/**
 * Fly the armour toward a place (x, y as the sprite has them): up or down, left or right, each only while it is more than a
 * step off, until it is within `near` of it in both. As a player steers.
 */
export function flyTo(x: number, y: number, near = 8, max = 300): Step {
  const hold = (g: Game): Held => {
    const dx = x - talX(g), dy = y - talY(g);
    return `${dx < -near ? '<' : dx > near ? '>' : ''}${dy < -near ? '^' : dy > near ? 'v' : ''}`;
  };
  return { hold, until: (g) => Math.abs(x - talX(g)) <= near && Math.abs(y - talY(g)) <= near, max };
}

/** Fly the armour on to the left or the right at a height (the stick's sideways, and up or down when it is more than a step off), for `frames`. */
export function cruise(way: '<' | '>', height: number | ((g: Game) => number), frames: number): Step {
  const at = (g: Game) => (typeof height === 'number' ? height : height(g));
  return { hold: (g) => `${way}${talY(g) > at(g) + 6 ? '^' : talY(g) < at(g) - 6 ? 'v' : ''}`, frames };
}

/** Where sprite `n` is (x across the playfield as the sprite has it, and y). */
export const spriteAt = (g: Game, n: number) => ({ x: g.ram[0x0200 + n * 2] | (((g.ram[V.spriteXHigh] >> n) & 1) << 8), y: g.ram[0x0201 + n * 2] });

/** Sprite `n` is a creature that is there to be shot: showing, and not blowing up. */
export const alive = (g: Game, n: number) => !!(g.ram[V.anim + n] & 0x80) && !(g.ram[V.dying + n] & 0x80);

/**
 * Chase a creature in the armour and fire the Pulsar Beam at it: keep level with it and a few steps off, facing it (the armour
 * faces the way it last went), firing while it is there to be hit.
 */
export function shootAt(n: number, max = 300): Step {
  const hold = (g: Game): Held => {
    const at = spriteAt(g, n), me = spriteAt(g, 0);
    const dx = at.x - me.x, dy = at.y - me.y;
    const level = Math.abs(dy) <= 12;
    const vertical = dy < -8 ? '^' : dy > 8 ? 'v' : '';
    const sideways = dx > 60 ? '>' : dx < -60 ? '<' : dx > 0 ? '>' : '<';
    return `${sideways}${vertical}${level ? 'F' : ''}`;
  };
  return { hold, until: (g) => !alive(g, n), max };
}
