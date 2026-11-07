/**
 * The crusher (`$8DCD`, from the interrupt routine, 50 times a second): a 24 x 9 thing that goes up the room's column and down it again.
 * The room's record (`$C527`) is six bytes: the column (a cell, not a pixel), the row it is at (y, counted up: 2 a step), the lowest and the
 * highest y, a wait, and a direction (bit 0 set: going down). A column and a y that are both 0 are no crusher. While it waits the wait counts
 * down. Going up it moves 2 and is drawn until it passes its highest y; then it turns, waiting a random 1 to 128 steps. Going down it first looks
 * at the row under its base (`$9148`: three bytes of the screen against the picture buffer: Monty's pixels there are a death), then moves 2 and is
 * drawn until it reaches its lowest y; there it turns, with a thud. It is drawn into the picture buffer as well as the screen (a part of the room:
 * Monty stands on it), and its three cells' bright bits are set and cleared.
 */
import { CRUSHER_DOWN, CRUSHER_PICTURES, CRUSHER_UP, screenOffset } from './data';
import type { Field } from './field';
import type { Random } from './random';
import type { RoomData } from './room';
import type { StateReader, StateWriter, Stateful } from '../../shared/state';

const wrap = (n: number): number => n & 0xff;

/** What a step did, for the sound and the death. */
export interface CrusherStep {
  readonly dead: boolean;
  readonly thud: boolean;
}

export class Crusher implements Stateful {
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

  /** The six bytes of the record. */
  fromBytes(b: readonly number[]): void {
    this.column = b[0] ?? 0; this.y = b[1] ?? 0; this.lowest = b[2] ?? 0; this.wait = b[3] ?? 0; this.direction = b[4] ?? 0; this.highest = b[5] ?? 0;
  }

  toBytes(): number[] {
    return [this.column, this.y, this.lowest, this.wait, this.direction, this.highest];
  }

  /** `$8DCD`. */
  step(field: Field, random: Random): CrusherStep {
    if ((this.column | this.y) === 0) return { dead: false, thud: false };
    if (this.wait !== 0) { this.wait = wrap(this.wait - 1); return { dead: false, thud: false }; }
    const down = (this.direction & 1) !== 0;
    if (down && this.touches(field)) return { dead: true, thud: false };
    if (!down) {
      this.y = wrap(this.y + 2);
      if (this.highest >= this.y) this.draw(field);
      else { // the top: turn, and wait a random while (`$8E01`: the byte with bit 7 cleared, plus one)
        this.direction = 1;
        this.wait = wrap((random.byte() & 0x7f) + 1);
      }
      return { dead: false, thud: false };
    }
    this.y = wrap(this.y - 2);
    if (this.lowest < this.y) { this.draw(field); return { dead: false, thud: false }; }
    this.direction = 0; // the bottom: turn
    return { dead: false, thud: true };
  }

  /** `$9148`: whether anything is on the screen, but not in the picture, in the three bytes of the row under the base (`y - 9`). */
  private touches(field: Field): boolean {
    const at = screenOffset(wrap(this.y - 9)) + this.column;
    let bits = 0;
    for (let i = 0; i < 3; i++) bits |= (field.screen[at + i] ?? 0) ^ (field.picture[at + i] ?? 0);
    return bits !== 0;
  }

  /** `$8E2C`: its 9 rows into the picture buffer and the screen, from row y down, and the bright bits (`$8E9B`). */
  private draw(field: Field): void {
    const from = (this.direction & 1) !== 0 ? CRUSHER_DOWN : CRUSHER_UP;
    for (let row = 0; row < 9; row++) {
      const at = screenOffset(wrap(this.y - row)) + this.column;
      for (let i = 0; i < 3; i++) {
        const byte = CRUSHER_PICTURES[from + row * 3 + i] ?? 0;
        field.picture[at + i] = byte;
        field.screen[at + i] = byte;
      }
    }
    // `$8E9B`: the cell row of the pixel row y - 8; going down the first cell is made bright and the next two not, going up the three cells below are made bright
    const cell = (23 - (wrap(this.y - 8) >> 3)) * 32 + this.column;
    if ((this.direction & 1) !== 0) {
      field.attrs[cell] = (field.attrs[cell] ?? 0) | 0x40;
      field.attrs[cell + 1] = (field.attrs[cell + 1] ?? 0) & 0xbf;
      field.attrs[cell + 2] = (field.attrs[cell + 2] ?? 0) & 0xbf;
    } else {
      for (let i = 0; i < 3; i++) field.attrs[cell + 32 + i] = (field.attrs[cell + 32 + i] ?? 0) | 0x40;
    }
  }

  save(w: StateWriter): void { w.put(this.column, this.y, this.lowest, this.wait, this.direction, this.highest); }

  load(r: StateReader): void {
    this.column = r.get(); this.y = r.get(); this.lowest = r.get(); this.wait = r.get(); this.direction = r.get(); this.highest = r.get();
  }
}
