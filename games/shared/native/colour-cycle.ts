import type { SpriteCapture } from '../../../packages/c64kit/src/c64/machine';

/**
 * A colour cycle over sprites, in the C64's way of showing a hit: for a few frames the creature's
 * colours step through a run of palette colours (the game's own palette cycling is the same trick),
 * then it is as it was.
 *
 * It acts on the frame's capture (`m.capture.sprites`, what the VIC drew: the picture shown), never on
 * the machine: the game's colour registers and memory are not touched, so there is nothing to put
 * back, a save holds the colours the game set, and the next frame's capture is the game's own again.
 * `apply` is called once for each frame the game runs, after it.
 *
 * A multicolour sprite is drawn with its own colour and the two it shares (the VIC's $D025/$D026, kept
 * in each capture entry): the cycle takes over all three, except black (an outline stays one).
 */
export interface Cycle {
  /** The colours the sprites step through, one a frame (C64 colour indices); the run then ends. */
  readonly colours: readonly number[];
}

/** A blow that doesn't destroy: white, yellow, light red, white, yellow. */
export const HIT_CYCLE: Cycle = { colours: [1, 1, 7, 7, 10, 10, 1, 7] };

const BLACK = 0;

export class ColourCycle {
  private sprites: readonly number[] = [];
  private cycle: Cycle = HIT_CYCLE;
  private at = 0;

  /** Frames of the run still to show. */
  get left(): number { return this.at < this.cycle.colours.length ? this.cycle.colours.length - this.at : 0; }

  /** Start a run on these sprites (the creature is drawn with one or several). A bigger run replaces a smaller one. */
  start(sprites: readonly number[], cycle: Cycle) {
    if (this.left > 0 && cycle.colours.length < this.left) return;
    this.sprites = sprites;
    this.cycle = cycle;
    this.at = 0;
  }

  /** Show this frame of the run on the frame's sprites. Returns whether anything was recoloured. */
  apply(drawn: readonly SpriteCapture[]): boolean {
    if (this.left === 0) return false;
    const c = this.cycle.colours[this.at++];
    let any = false;
    for (const s of drawn) {
      if (!this.sprites.includes(s.n)) continue;
      s.colour = c;
      if (s.multicolour) {
        if (s.mc1 !== BLACK) s.mc1 = c;
        if (s.mc2 !== BLACK) s.mc2 = c;
      }
      any = true;
    }
    return any;
  }

  /** Forget a run (a new game, a resumed save, travel). */
  reset() { this.at = this.cycle.colours.length; }
}
