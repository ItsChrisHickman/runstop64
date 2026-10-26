/**
 * Room 5, the street (`$9C49`): Monty flies. Five vehicles cross the street in lanes (`$9CF4`), each waiting a random time off
 * the road, then driving across at a speed of 1 to 4 pixels a pass, one way or the other; they kill. At the left is a pile of
 * four newspapers (`$9C8C`): touching it takes one (the pile shrinks and the HUD's pocket shows a paper), and the NEWS shop at the
 * right (`$9CB1`) takes it (its picture grows, `$25` to `$28`). The fourth delivery gives +1000 and ends the game.
 */
import { BLANK_FRAME } from '../data';
import { kills, touching } from '../primitives';
import type { Sprite, Stage } from '../stage';
import type { RoomScript } from './script';
import type { StateReader, StateWriter } from '../state';

const ROOM5_FINAL_SCORE = 1000;
/** The pocket picture of a paper (`$C4A0`). */
const PAPER_FRAME = 0x25;

const wrap = (n: number): number => n & 0xff;

/** One lane slot of the traffic table (`$9DDC`, 4 bytes each; byte 0 is not used). */
export class Slot {
  /** byte 1: the lane (bits 0-1) and the direction (bit 7: drives left) */
  lane = 0;
  /** byte 2: the base of the vehicle's picture */
  base = 0;
  /** byte 3: the wait before it enters (counts down; 0 = on the road) */
  wait = 0;
}

/** The pictures a vehicle may have (`$9DD4`). */
const VEHICLE_BASES = [0x18, 0x52, 0x34, 0x18, 0x18, 0x34, 0x52, 0x18] as const;
const SLOTS = 5;

export class Room5 implements RoomScript {
  readonly slots: readonly Slot[] = Array.from({ length: SLOTS }, () => new Slot());
  /** `$9DF2`: Monty has a paper */
  carrying = 0;

  run(s: Stage): void {
    this.traffic(s);
    const [, , , , , , pile, shop] = s.entities;
    if (s.first) {
      this.carrying = 0;
      pile.x = 0x10; pile.y = 0x70; pile.frame = 0x28;
      shop.x = 0xd0; shop.y = 0x26; shop.frame = BLANK_FRAME;
      return;
    }
    s.setPocket(this.carrying !== 0 ? PAPER_FRAME : BLANK_FRAME);
    if (this.carrying === 0) {
      if (!touching(pile, s.monty)) return;
      this.carrying++;
      if (pile.frame === PAPER_FRAME) pile.frame = BLANK_FRAME;
      else pile.frame--;
      s.sound(2);
      return;
    }
    if (!touching(shop, s.monty)) return;
    this.carrying = 0;
    if (shop.frame === BLANK_FRAME) { shop.frame = PAPER_FRAME; return; }
    shop.frame++;
    if (shop.frame !== 0x28) return;
    s.addScore(ROOM5_FINAL_SCORE);
    s.finish();
  }

  // ---- the traffic -----------------------------------------------------------------------------------

  /** A slot's next appearance: a wait, a picture and a lane, from three random bytes in that order (`$9DAC`). */
  private roll(s: Stage, slot: Slot): void {
    slot.wait = (s.rng.byte() & 0x1f) | 1;
    slot.base = VEHICLE_BASES[s.rng.byte() & 7];
    const r = s.rng.byte() & 7;
    slot.lane = (r >> 1) | ((r & 1) << 7);
  }

  private traffic(s: Stage): void {
    if (s.first) for (const slot of this.slots) this.roll(s, slot);
    this.slots.forEach((slot, i) => this.drive(s, slot, s.entities[1 + i]));
  }

  /** One vehicle (`$9D16`): waiting, entering, or on the road. */
  private drive(s: Stage, slot: Slot, v: Sprite): void {
    if (slot.wait !== 0) {
      slot.wait--;
      if (slot.wait === 0) this.enter(slot, v);
      v.frame = BLANK_FRAME;
      return;
    }
    kills(s, v);
    const lane = slot.lane;
    let x: number;
    if ((wrap(lane + 1) & 0x80) === 0) {
      x = v.x + wrap(lane + 1);
      if (x >= 0xef) { this.leaveRoad(s, slot, v); return; }
    } else {
      const speed = wrap(lane + 1) & 7;
      x = v.x - speed;
      if (x < 0) { this.leaveRoad(s, slot, v); return; }
    }
    v.x = x;
    v.frame = wrap(s.clock.cycle.frame + slot.base);
  }

  /** The wait is over: it stands at the edge it will come from (`$9D22`); it is not drawn yet. */
  private enter(slot: Slot, v: Sprite): void {
    const lane = slot.lane & 3;
    v.flags |= 0x80;
    v.x = 0;
    v.y = lane * 8 + 0x28;
    if ((slot.lane & 0x80) !== 0) {
      v.flags &= 0x7f;
      v.x = 0xee;
      v.y = 0x60 - lane * 8;
    }
  }

  /** Off the far edge: parked at the corner out of sight, and a new wait (`$9D87`). */
  private leaveRoad(s: Stage, slot: Slot, v: Sprite): void {
    this.roll(s, slot);
    v.frame = BLANK_FRAME;
    v.x = 0;
    v.y = 0;
  }

  save(w: StateWriter): void {
    w.put(this.carrying);
    for (const s of this.slots) w.put(s.lane, s.base, s.wait);
  }

  load(r: StateReader): void {
    this.carrying = r.get();
    for (const s of this.slots) { s.lane = r.get(); s.base = r.get(); s.wait = r.get(); }
  }
}
