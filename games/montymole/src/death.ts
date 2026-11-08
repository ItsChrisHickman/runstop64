/**
 * Monty's death as the picture shows it: the death picture where he died (`$8D7F`, kept as part of the screen), and then, while the death tune plays note by note
 * (`$8DA0`), the interrupt routine's death branch (`$8EDD`) raises it: every fourth interrupt Monty's y goes up by 2 and the next of four pictures (`$FF60` on, in turn,
 * the second first) is drawn there over the picture buffer, leaving a trail, until y passes `$BE`, where the blank picture is drawn and the routine says it is done
 * (`$9179` = `$FF`); the tune's loop looks at that after each note and ends there. The game's logic is done in the pass that killed him (src/game.ts `die`); this is the
 * animation that the original shows before the room is entered again, and how many 50 Hz frames it takes. The rest of the interrupt routine is not run while it
 * shakes (the room's crusher, floor and the others wait), which is why nothing else moves.
 */
import { beeperToggles } from './beeper';
import { DEATH_BASE, DEATH_TUNE, imageAt, SPRITE_BYTES } from './data';
import { BLANK } from './enemies';
import type { FieldCopy } from './field';
import { blit } from './sprite';
import { togglesLength } from 'c64kit';

/** The y the death picture rises to (`$8EEF`: it is done when y has passed it). */
const TOP_Y = 0xbe;
/** An interrupt is 1/50 s: 69888 T-states of the 48K machine. */
const FRAME_T = 69888;
/**
 * The interrupt routine runs inside the notes (the beeper's loop does not stop it), which makes each note that much longer than its own count of T-states: measured on the
 * original (test/death.ts), 9.6 % over the whole tune (a death's length is where the first note after the rising ends).
 */
const NOTE_STRETCH = 1.0956;
/** `$9179` after a death is over, and as the tape has it. */
export const SHAKE_DONE = 0xff, SHAKE_FRESH = 0;

/** The T-states from the start of the death tune to the end of each note (the loop looks at `$9179` there). */
const NOTE_ENDS: readonly number[] = (() => {
  let t = 0;
  return DEATH_TUNE.map((n) => (t += togglesLength(beeperToggles(n.de, n.hl)) * NOTE_STRETCH));
})();

/** The interrupt (1-based) at which the rising is over, from y and the counter `$9179`. */
function risingEnd(y: number, counter: number): number {
  for (let frame = 1;; frame++) {
    counter = (counter + 1) & 3;
    if (counter !== 0) continue;
    y = (y + 2) & 0xff;
    if (TOP_Y < y) return frame;
  }
}

export class DeathScene {
  /** the screen as it was when he died (the room with his death picture in it) and its buffers; the screen is drawn on as the picture rises */
  readonly field: FieldCopy;
  /** how many 50 Hz frames the death takes: the tune's loop ends at the end of the first note after the rising is over (or of the tune) */
  readonly frames: number;
  private y: number;
  private picture = 0;
  private counter: number;
  private over = false;

  /** `field`: the buffers as the death left them; (x, y) where he died; `counter`: `$9179` as it was (`SHAKE_FRESH` on the tape, `SHAKE_DONE` after any death). */
  constructor(field: FieldCopy, private readonly x: number, y: number, counter: number) {
    this.field = field;
    this.y = y;
    this.counter = counter;
    const risingEnds = risingEnd(y, counter) * FRAME_T;
    const end = NOTE_ENDS.find((t) => t >= risingEnds) ?? NOTE_ENDS[NOTE_ENDS.length - 1] ?? 0;
    this.frames = Math.max(1, Math.ceil(end / FRAME_T));
  }

  /** The interrupt routine's death branch, once (one frame). */
  interrupt(): void {
    if (this.over) return;
    this.counter = (this.counter + 1) & 3;
    if (this.counter !== 0) return;
    this.y = (this.y + 2) & 0xff;
    if (TOP_Y < this.y) { // $8EF4: the blank picture, and it is over
      blit(this.field.screen, this.field.picture, imageAt(BLANK), this.x, this.y);
      this.over = true;
      return;
    }
    this.picture = (this.picture + 1) & 3; // $8F12: `+ $20`, bit 7 of the low byte cleared: 1, 2, 3, 0
    blit(this.field.screen, this.field.picture, imageAt(DEATH_BASE + SPRITE_BYTES * this.picture), this.x, this.y);
  }
}
