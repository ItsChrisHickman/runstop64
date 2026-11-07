/**
 * Room 17's animation (`$90BD`, from the interrupt routine): a 16 x 16 picture at the top left of the room (the chain the tool, object 15, is for) made of two
 * pictures of 8 rows of 2 bytes, kept as a ring of 32 bytes that turns two bytes a step: each step is drawn into the screen and the picture buffer.
 * It remembers (`$912B`) which object frame the room had when it last looked: when the room's object is not what it remembered (it has just come, or the tool has
 * been taken), it draws the blank picture over the chain and remembers; with nothing there (frame 0) and nothing remembered it does nothing.
 */
import { CHAIN, imageAt } from './data';
import type { Field } from './field';
import { BLANK_FRAME } from './object';
import type { StateReader, StateWriter, Stateful } from '../../shared/state';

/** Where the two pictures go: the first on the screen at `$4841` and the second at `$4861` (offsets from `$4000`). */
const FIRST = 0x841, SECOND = 0x861;

export class Chain implements Stateful {
  /** the ring (`$910B`-`$912A`) and the object frame it last saw (`$912B`) */
  readonly ring = Array.from(CHAIN.subarray(0, 32));
  seen = CHAIN[32] ?? 0;

  /** `$90BD`: `object` is the room's object frame (`$C526`). */
  step(field: Field, object: number): void {
    if (object !== this.seen) { // $912C
      this.seen = object;
      const blank = Array.from(imageAt(BLANK_FRAME).subarray(0, 16));
      this.draw(field, FIRST, blank);
      this.draw(field, SECOND, blank);
      return;
    }
    if (object === 0) return;
    const a = this.ring[30] ?? 0, b = this.ring[31] ?? 0;
    for (let i = 31; i >= 2; i--) this.ring[i] = this.ring[i - 2] ?? 0; // LDDR: $910B-$9128 up by two
    this.ring[0] = a;
    this.ring[1] = b;
    this.draw(field, FIRST, this.ring.slice(0, 16));
    this.draw(field, SECOND, this.ring.slice(16, 32));
  }

  /** `$90F2`: 8 rows of 2 bytes at the screen offset `at`, into the screen and the picture buffer. */
  private draw(field: Field, at: number, rows: readonly number[]): void {
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 2; c++) {
        field.screen[at + r * 256 + c] = rows[r * 2 + c] ?? 0;
        field.picture[at + r * 256 + c] = rows[r * 2 + c] ?? 0;
      }
    }
  }

  save(w: StateWriter): void { w.put(...this.ring, this.seen); }

  load(r: StateReader): void {
    for (let i = 0; i < 32; i++) this.ring[i] = r.get();
    this.seen = r.get();
  }
}
