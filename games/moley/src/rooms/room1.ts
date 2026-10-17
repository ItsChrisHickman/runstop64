/**
 * Room 1, the recording studio (`$9378`): a reel that walks to and fro and kills, and the machines (`$93C2`-`$94A5`), which light
 * up in a sequence (their attribute cells cycle) and, in two of the steps, are deadly to stand in front of. When the sequence is
 * done two reels spin at the top for 100 passes, and then the exit object comes in from the left along the top (`$9516`), sinks
 * (it kills at y $50) and, touched with no items left, is the way out (+300).
 */
import { kills, pictureFromQuad, placeQuad, touching, walkerQuad } from '../primitives';
import type { Sprite, Stage } from '../stage';
import type { RoomScript } from './script';
import type { StateReader, StateWriter } from '../state';

export const ROOM1_EXIT_SCORE = 300;
/** The conveyor along row 5 from column 19: 10 cells (`$8B4F`). */
const CONVEYOR_CELL = 5 * 32 + 19, CONVEYOR_CELLS = 10;

/** The attribute cell at a screen address ($5800 + n) is cycled through the 8 inks, bright (`$94D6`). */
function cycleLight(s: Stage, address: number): void {
  const i = address - 0x5800;
  s.attrs[i] = ((s.attrs[i] + 1) & 7) | 0x40;
}

/** A block of cells, `rows` by `columns`, from `address` (`$94C3` and the loop at `$93D2`). */
function cycleBlock(s: Stage, address: number, rows: number, columns: number): void {
  for (let r = 0; r < rows; r++) for (let c = 0; c < columns; c++) cycleLight(s, address + r * 32 + c);
}

/** Whether Monty stands where a machine's flash reaches: x from `x0` up to but not including `x1`, y from $3B up to $49 (`$9418`). */
function inFlash(m: Sprite, x0: number, x1: number): boolean {
  return m.x >= x0 && m.x < x1 && m.y >= 0x3b && m.y < 0x49;
}

export class Room1 implements RoomScript {
  /** `$94DE`: 0 while the machines run, 1 once they are done (counts the 100 passes of the spinning reels after) */
  stage = 0;
  /** `$94DF`-`$94E4`: how far each step of the sequence has got */
  a = 0;
  b = 0;
  c = 0;
  d = 0;
  e = 0;
  f = 0;

  run(s: Stage): void {
    const e = s.entities;
    s.redraw(CONVEYOR_CELL, CONVEYOR_CELLS); // the conveyor tiles turn, so their cells are drawn again every pass (`$937D`)
    // the reel: flags are kept the other way round from how it walks (`$938B`, `$9396`)
    e[1].flags ^= 0x80;
    walkerQuad(s, e[1], { flags: 0x80, base: 0x6f, x: 0xb4, y: 0x78 });
    e[1].flags ^= 0x80;
    kills(s, e[1]);
    if (s.first) this.stage = this.a = this.b = this.c = this.d = this.e = this.f = 0;
    if (this.stage !== 0) { this.reelsAndExit(s); return; }
    this.machines(s);
    // $94A5: the two reels at the top stand in their places
    e[2].x = 0x70; e[2].y = 0x18; e[2].frame = 0x6f;
    e[3].x = 0x80; e[3].y = 0x18; e[3].frame = 0x6f;
  }

  /** The steps of the sequence, one a pass: each runs to its count before the next starts (`$93C9`-`$949B`). */
  private machines(s: Stage): void {
    if (this.a !== 0x68) { // the first machine's block
      this.a++;
      cycleBlock(s, 0x59a1, 2, 3);
    } else if (this.b !== 0x18) {
      this.b++;
      cycleLight(s, 0x5983);
      cycleLight(s, 0x5945);
    } else if (this.e !== 0x58) { // the second: deadly in front of it once it is well lit
      const before = this.e++;
      cycleBlock(s, 0x5926, 2, 4);
      if (before >= 7 && inFlash(s.monty, 0x23, 0x50)) s.die('normal');
    } else if (this.c !== 0x18) {
      this.c++;
      cycleLight(s, 0x594a);
      cycleLight(s, 0x594b);
    } else if (this.f !== 0x58) { // the third
      const before = this.f++;
      cycleBlock(s, 0x592c, 2, 4);
      if (before >= 7 && inFlash(s.monty, 0x52, 0x7e)) s.die('normal');
    } else if (this.d !== 0x28) {
      this.d++;
      cycleLight(s, 0x58ac);
      cycleLight(s, 0x58ec);
      cycleLight(s, 0x590c);
    } else {
      this.stage = 1;
      s.sound(5);
    }
  }

  /** The sequence is done (`$94E5`): two spinning reels for 100 passes, then the exit object. */
  private reelsAndExit(s: Stage): void {
    const e = s.entities;
    if (this.stage === 0x64) { this.exitObject(s); return; }
    const before = this.stage++;
    placeQuad(s, e[2], 0x80, 0x18, 0x6f);
    if (before >= 5) kills(s, e[2]);
    placeQuad(s, e[3], 0x70, 0x18, 0x6f);
    if (this.stage >= 4) kills(s, e[3]);
  }

  /** `$9516`: in along the top 2 pixels a pass, then down 2 a pass; kills at y $50; touched from y $38 down it is the exit. */
  private exitObject(s: Stage): void {
    const o = s.entities[2];
    if (o.x < 0xec) {
      o.x = (o.x + 2) & 0xff;
      pictureFromQuad(s, o, 0x6f);
      return;
    }
    if (o.y >= 0x50) s.die('normal');
    const before = o.y;
    o.y = (o.y + 2) & 0xff;
    if (before < 0x38) return;
    if (!touching(o, s.monty)) return;
    if (s.itemsLeft !== 0) s.die('normal');
    s.addScore(ROOM1_EXIT_SCORE);
    s.leave(2);
  }

  save(w: StateWriter): void { w.put(this.stage, this.a, this.b, this.c, this.d, this.e, this.f); }
  load(r: StateReader): void { this.stage = r.get(); this.a = r.get(); this.b = r.get(); this.c = r.get(); this.d = r.get(); this.e = r.get(); this.f = r.get(); }
}
