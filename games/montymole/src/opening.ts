/**
 * The opening scene's own things (pseudo-room `$2C`, `$CD41`): what the original draws round Monty while he walks from the miner's house towards the pit head, in
 * its two pieces. `animate` is `$CB93`, which `$FF5B` (the loop's `HALT`) runs after every wait: the pot at the left that steams until he has passed it, the wife who
 * then walks out of the house, the bird across the top that drops an acorn at x `$68` (which lands, hatches into pictures and becomes the pot's picture), all of them
 * sprites drawn at once over the picture buffer (`blit`), none erased: each step moves one pixel and the picture is drawn over the old one. `interrupt` is `$CDEF`,
 * the scene's own interrupt routine in place of `$8F9F`: the water turned one bit (`$90A8`) and, every fourth time, the picture in the top right corner (`$EF2E`).
 *
 * The variables live in the code's own bytes (`$CD32-$CD40`, `$CE19`, `$EF77`, `$EF79`) and nothing but the scene's start puts two of them back (the pot and the wife), so
 * a second visit goes on from where the first left off. They start as the tape has them. test/opening.ts compares every one of them with the original on every pass.
 */
import { imageAt, SUN_FRAMES, SUN_ROWS, SUN_WIDTH, screenOffset } from './data';
import { turnRun, type Run } from './conveyors';
import type { Field } from './field';
import { blit } from './sprite';
import type { StateReader, StateWriter, Stateful } from '../../shared/state';

/** The water (`$CDEF`: the run `$90A8` turns, seven bytes on three lines from the row table's entry `$EADE`, y 63, plus 18). */
const WATER: Run = { y: 63, start: 0x12, bytes: 7 };
/** The corner picture's place: its 24 rows from y 167 down, five bytes from column 25 (`$EF2E`). */
const SUN_TOP = 167, SUN_COLUMN = 0x19;
/** The pot's place (`$4F2F`) and the picture's frames (`$6000`), the wife's two halves (`$6080`, `$6100`), the bird's two ways (`$6200` right, `$6280` left), the acorn (`$6300`). */
const POT_X = 0x2f, POT_Y = 0x4f, WIFE_TOP = 0x5f, WIFE_BOTTOM = 0x4f, BIRD_Y = 0xaf, ACORN_X = 0x68, ACORN_LANDS = 0x4f, ACORN_START = 0x9f;
const POT = 0x6000, WIFE_HEAD = 0x6080, WIFE_LEGS = 0x6100, BIRD_RIGHT = 0x6200, BIRD_LEFT = 0x6280, ACORN = 0x6300, FILLED = 0x7780;
/** How far across the bird turns: left at this x it starts the acorn, right at this x it turns back (`$CC9A`, `$CC56`). */
const BIRD_DROPS_AT = 0x70, BIRD_TURNS_AT = 0x80;
const FRAME = 32;
/** The direction byte `$CD38`: `$FF` going left, 1 going right. */
const LEFT = 0xff, RIGHT = 1;

const wrap = (n: number): number => n & 0xff;

export class Opening implements Stateful {
  /** `$CD32`: 1 until Monty has passed x `$40` (the scene's start sets it); while it is, the pot steams and the wife waits */
  potWaits = 1;
  /** `$CD33`, `$CD34`: the pot's countdown to its next picture (3) and the picture (0-3) */
  potTick = 3;
  potFrame = 0;
  /** `$CD35`: the wife's x (the scene's start sets it to 1); `$CD36`, `$CD37`: her picture and the countdown to the next */
  wifeX = 1;
  wifeFrame = 0;
  wifeTick = 3;
  /** `$CD38`: the bird's way; `$CD39`: its x; `$CD3A`, `$CD3B`: the countdown to its next picture and the picture */
  birdWay = LEFT;
  birdX = 0x78;
  birdTick = 3;
  birdFrame = 0;
  /** `$CD3C`: the acorn is falling or lying; `$CD3D`: it has landed (the y it lands at); `$CD3E`: its y; `$CD3F`, `$CD40`: the countdown to its next picture and the picture */
  acornOut = 0;
  acornLanded = 0;
  acornY = ACORN_START;
  acornTick = 3;
  acornFrame = 0;
  /** `$CE19`: the interrupts counted to the fourth; `$EF77`/`$EF79`: which of the corner's four pictures is next */
  sunTick = 3;
  sunFrame = 2;

  /** `$CD41` (`$CD55`, `$CD58`): the scene starts: the pot steams, the wife is at the door. */
  begin(): void {
    this.potWaits = 1;
    this.wifeX = 1;
  }

  /** `$CDEF`: what the scene's interrupt routine does. */
  interrupt(field: Field): void {
    turnRun(field, WATER); // $CE00: $90A8
    this.sunTick = (this.sunTick + 1) & 3;
    if (this.sunTick === 0) this.corner(field); // $CE0C: $EF2E
  }

  /** `$EF2E`: the corner's picture, five bytes on each of 24 rows of the screen (the picture buffer is not written). */
  private corner(field: Field): void {
    for (let row = 0; row < SUN_ROWS; row++) {
      const from = (this.sunFrame * SUN_ROWS + row) * SUN_WIDTH;
      field.screen.set(SUN_FRAMES.subarray(from, from + SUN_WIDTH), screenOffset(SUN_TOP - row) + SUN_COLUMN);
    }
    this.sunFrame = (this.sunFrame + 1) & 3;
  }

  /** Draw the sprite at `address` with its top left at (x, y) over the picture. */
  private draw(field: Field, address: number, x: number, y: number): void {
    blit(field.screen, field.picture, imageAt(address), x, y);
  }

  /** `$CB93`: one step of the pot, the wife, the bird and the acorn. */
  animate(field: Field): void {
    if (this.potWaits !== 0) { // $CB93
      this.potTick = wrap(this.potTick - 1);
      if (this.potTick === 0) {
        this.potTick = 3;
        this.potFrame = (this.potFrame + 1) & 3;
        this.draw(field, POT + this.potFrame * FRAME, POT_X, POT_Y);
      }
    } else { // $CBC9
      this.wifeX = wrap(this.wifeX + 1);
      this.draw(field, WIFE_HEAD + this.wifeFrame * FRAME, this.wifeX, WIFE_TOP);
      this.draw(field, WIFE_LEGS + this.wifeFrame * FRAME, this.wifeX, WIFE_BOTTOM);
      this.wifeTick = wrap(this.wifeTick - 1);
      if (this.wifeTick === 0) {
        this.wifeTick = 3;
        this.wifeFrame = (this.wifeFrame + 1) & 3;
      }
    }
    this.bird(field); // $CC13
    this.acorn(field); // $CCA9
  }

  /** `$CC13`-`$CCA8`: the bird goes left from x `$78` to `$70`, where the acorn starts to fall, then right to `$80` and stays about there until the acorn is done. */
  private bird(field: Field): void {
    if (this.birdWay === LEFT) { // $CC6E
      this.birdX = wrap(this.birdX - 1);
      this.birdTick = wrap(this.birdTick - 1);
      if (this.birdTick === 0) {
        this.birdTick = 3;
        this.birdFrame = (this.birdFrame + 1) & 3;
      }
      if (this.birdX === BIRD_DROPS_AT) { // $CC9C
        this.birdWay = RIGHT;
        this.acornOut = RIGHT;
      }
      this.draw(field, BIRD_LEFT + this.birdFrame * FRAME, this.birdX, BIRD_Y);
    } else { // $CC1A
      this.birdX = wrap(this.birdX + 1);
      this.birdTick = wrap(this.birdTick - 1);
      if (this.birdTick === 0) {
        this.birdTick = 3;
        this.birdFrame = (this.birdFrame + 1) & 3;
      }
      this.draw(field, BIRD_RIGHT + this.birdFrame * FRAME, this.birdX, BIRD_Y);
    }
    if (this.birdX === BIRD_TURNS_AT) { // $CC53
      this.birdX = BIRD_TURNS_AT - 1;
      if (this.acornOut === 0) this.birdWay = wrap(-this.birdWay);
    }
  }

  /** `$CCA9`: the acorn falls a pixel a step from y `$9F` to `$4F`, lies there for four pictures of three steps, and is then the pot's picture, drawn where it lay. */
  private acorn(field: Field): void {
    if (this.acornOut === 0) return;
    if (this.acornLanded === 0) { // $CCB4
      this.acornY = wrap(this.acornY - 1);
      this.draw(field, ACORN, ACORN_X, this.acornY);
      if (this.acornY === ACORN_LANDS) this.acornLanded = ACORN_LANDS;
      return;
    }
    this.acornTick = wrap(this.acornTick - 1); // $CCD6
    if (this.acornTick !== 0) return;
    this.acornTick = 3;
    this.acornFrame = (this.acornFrame + 1) & 3;
    if (this.acornFrame === 0) { // $CD0A
      this.acornOut = 0;
      this.acornLanded = 0;
      this.draw(field, FILLED, ACORN_X, ACORN_LANDS);
      this.acornY = ACORN_START;
      return;
    }
    this.draw(field, ACORN + this.acornFrame * FRAME, ACORN_X, this.acornY);
  }

  /** `$CDC4` (from `$CDDF`): Monty has passed the pot: it is drawn filled, in its place, and does not steam again until the scene starts again. Returns whether this was the time. */
  passed(field: Field): boolean {
    if (this.potWaits === 0) return false;
    this.potWaits = 0;
    this.draw(field, FILLED, POT_X, POT_Y);
    return true;
  }

  save(w: StateWriter): void {
    w.put(this.potWaits, this.potTick, this.potFrame, this.wifeX, this.wifeFrame, this.wifeTick, this.birdWay, this.birdX, this.birdTick, this.birdFrame,
      this.acornOut, this.acornLanded, this.acornY, this.acornTick, this.acornFrame, this.sunTick, this.sunFrame);
  }

  load(r: StateReader): void {
    this.potWaits = r.get(); this.potTick = r.get(); this.potFrame = r.get(); this.wifeX = r.get(); this.wifeFrame = r.get(); this.wifeTick = r.get();
    this.birdWay = r.get(); this.birdX = r.get(); this.birdTick = r.get(); this.birdFrame = r.get();
    this.acornOut = r.get(); this.acornLanded = r.get(); this.acornY = r.get(); this.acornTick = r.get(); this.acornFrame = r.get();
    this.sunTick = r.get(); this.sunFrame = r.get();
  }
}
