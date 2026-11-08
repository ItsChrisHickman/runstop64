/**
 * The crusher's rules (`$8DCD`, from the interrupt routine, 50 times a second), apart from how it is drawn: a thing that goes up the room's column and
 * down it again. The room's record (`$C527`) is six bytes: the column (a cell, not a pixel), the row it is at (y, counted up: 2 a step), the lowest and the
 * highest y, a wait, and a direction (bit 0 set: going down). A column and a y that are both 0 are no crusher. While it waits the wait counts down. Going
 * up it moves 2 and is drawn until it passes its highest y; then it turns, waiting a random 1 to 128 steps. Going down it first asks whether it has touched
 * Monty (a death), then moves 2 and is drawn until it reaches its lowest y; there it turns, with a thud. src/crusher.ts draws it on the Spectrum's screen
 * (it is a part of the room there: Monty stands on it); the remix (games/montymoleremix) draws it as Monty on the Run's crusher.
 */
import type { Random } from './random';
import type { RoomData } from './room';
import type { StateReader, StateWriter, Stateful } from '../../shared/state';

const wrap = (n: number): number => n & 0xff;

/** What a step did, for the sound and the death. */
export interface CrusherStep {
  readonly dead: boolean;
  readonly thud: boolean;
}

/** What a step asks of the game. */
export interface CrusherHooks {
  readonly random: Random;
  /** `$9148`: going down, whether it has touched Monty. */
  touches(): boolean;
  /** It has moved: draw it where it now is. */
  draw(): void;
}

export class CrusherRule implements Stateful {
  column = 0;
  y = 0;
  lowest = 0;
  wait = 0;
  /** bit 0: going down */
  direction = 0;
  highest = 0;

  /** A new copy of the room's record (`$94C3`). */
  enter(room: RoomData): void {
    this.fromBytes(room.crusher);
  }

  /** Whether the room has one. */
  get present(): boolean { return (this.column | this.y) !== 0; }

  /** The six bytes of the record. */
  fromBytes(b: readonly number[]): void {
    this.column = b[0] ?? 0; this.y = b[1] ?? 0; this.lowest = b[2] ?? 0; this.wait = b[3] ?? 0; this.direction = b[4] ?? 0; this.highest = b[5] ?? 0;
  }

  toBytes(): number[] {
    return [this.column, this.y, this.lowest, this.wait, this.direction, this.highest];
  }

  /** `$8DCD`: a step. */
  advance(hooks: CrusherHooks): CrusherStep {
    if (!this.present) return { dead: false, thud: false };
    if (this.wait !== 0) { this.wait = wrap(this.wait - 1); return { dead: false, thud: false }; }
    const down = (this.direction & 1) !== 0;
    if (down && hooks.touches()) return { dead: true, thud: false };
    if (!down) {
      this.y = wrap(this.y + 2);
      if (this.highest >= this.y) hooks.draw();
      else { // the top: turn, and wait a random while (`$8E01`: the byte with bit 7 cleared, plus one)
        this.direction = 1;
        this.wait = wrap((hooks.random.byte() & 0x7f) + 1);
      }
      return { dead: false, thud: false };
    }
    this.y = wrap(this.y - 2);
    if (this.lowest < this.y) { hooks.draw(); return { dead: false, thud: false }; }
    this.direction = 0; // the bottom: turn
    return { dead: false, thud: true };
  }

  save(w: StateWriter): void { w.put(this.column, this.y, this.lowest, this.wait, this.direction, this.highest); }

  load(r: StateReader): void {
    this.column = r.get(); this.y = r.get(); this.lowest = r.get(); this.wait = r.get(); this.direction = r.get(); this.highest = r.get();
  }
}
