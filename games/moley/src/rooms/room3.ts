/**
 * Room 3, the M1 (`$9906`): three lanes (y 8, $40 and $78) that wrap into one another, a lorry that takes hold of Monty on the top
 * lane, two cars on the middle lane that drain the gauge, and a street lamp on the bottom lane that kills whoever stands in it.
 * The way out is the right end of the bottom lane (+500).
 *
 * The timers are bytes that count down through zero: a value with bit 7 set means "running" (cars) or "ready" (the lorry), and a
 * car's next start is a random wait of 20 to 127 passes (`R AND $7F OR $14`).
 */
import { BLANK_FRAME } from '../data';
import { drains, pictureFromCycle } from '../primitives';
import type { Stage } from '../stage';
import type { RoomScript } from './script';
import type { StateReader, StateWriter } from '../state';

export const ROOM3_EXIT_SCORE = 500;

const wrap = (n: number): number => n & 0xff;
const running = (timer: number): boolean => (timer & 0x80) !== 0;

export class Room3 implements RoomScript {
  /** `$9B1C`: the wait before the lorry may come (counts down from $40), then $FF; `$7F` after it has gone */
  lorry = 0;
  /** `$9B1D`, `$9B1E`: the cars' waits; running once they are negative */
  car1 = 0;
  car2 = 0;
  /** `$9B1F`: the lamp's wait */
  lampWait = 0;
  /** `$9B20`: how far the lamp's flash has got (0 = idle); `$9B21`: Monty stood in it */
  lamp = 0;
  trapped = 0;

  run(s: Stage): void {
    const e = s.entities;
    if (s.first) {
      e[6].x = 0x91; e[6].y = 0x78; e[6].frame = 0x4f;
      this.lorry = 0x40;
      this.car1 = this.car2 = this.lampWait = this.lamp = this.trapped = 0;
    }
    this.wrapLanes(s);
    this.lorryOnTop(s);
    this.carOnMiddleLane(s);
    this.carOnMiddleLaneBack(s);
    this.lampPost(s);
  }

  /** Leaving a lane at either end (`$9AC7`): the lanes lead into one another, and the bottom lane's right end is the way out. */
  private wrapLanes(s: Stage): void {
    const m = s.monty;
    if (m.x < 4) {
      if (m.y < 9) return;
      m.x = 0xea;
      m.y = m.y < 0x41 ? 8 : 0x40;
      return;
    }
    if (m.x < 0xec) return;
    if (m.y < 9) { m.y = 0x40; m.x = 6; return; }
    if (m.y < 0x41) { m.y = 0x78; m.x = 6; return; }
    s.addScore(ROOM3_EXIT_SCORE);
    s.leave(4);
  }

  /** The lorry (`$9930`): when it may come, it takes hold of Monty if he stands in one of three stretches of the top lane. */
  private lorryOnTop(s: Stage): void {
    const e = s.entities, m = s.monty;
    if (!running(this.lorry)) {
      this.lorry = wrap(this.lorry - 1);
      if (!running(this.lorry)) return; // (still waiting)
    }
    if (m.state !== 3) {
      if (m.state !== 0 || m.y !== 8) return;
      const x = m.x;
      const hit = (x >= 0x38 && x < 0x58) || (x >= 0x90 && x < 0xb0) || x >= 0xc8;
      if (!hit) return;
      s.setMontyState(3);
      e[1].x = 0x00; e[1].y = 8; e[1].frame = 0x15;
      e[2].x = 0x10; e[2].y = 8; e[2].frame = 0x16;
      e[3].x = 0x20; e[3].y = 8; e[3].frame = 0x17;
    }
    for (const part of [e[1], e[2], e[3]]) part.x = wrap(part.x + 1);
    if (e[3].x === 0xe8) {
      for (const part of [e[1], e[2], e[3]]) part.frame = BLANK_FRAME;
      this.lorry = 0x7f;
      s.setMontyState(0);
    }
  }

  /** The car that crosses the middle lane to the right, 4 pixels a pass (`$99B1`). */
  private carOnMiddleLane(s: Stage): void {
    const car = s.entities[4];
    if (!running(this.car1)) {
      this.car1 = wrap(this.car1 - 1);
      if (!running(this.car1)) return;
      car.x = 0; car.y = 0x40; car.flags = 0x80;
    }
    car.x = wrap(car.x + 4);
    if (car.x >= 0xe8) {
      car.frame = BLANK_FRAME;
      this.car1 = (s.rng.byte() & 0x7f) | 0x14;
      return;
    }
    pictureFromCycle(s, car, 0x34);
    drains(s, car);
  }

  /** The car that crosses it to the left, 1 pixel a pass (`$99FB`). */
  private carOnMiddleLaneBack(s: Stage): void {
    const car = s.entities[5];
    if (!running(this.car2)) {
      this.car2 = wrap(this.car2 - 1);
      if (!running(this.car2)) return;
      car.x = 0xe8; car.y = 0x40; car.flags = 0;
    }
    car.x = wrap(car.x - 1);
    if (car.x === 0) {
      car.frame = BLANK_FRAME;
      this.car2 = (s.rng.byte() & 0x7f) | 0x28;
      return;
    }
    pictureFromCycle(s, car, 0x18);
    drains(s, car);
  }

  /** The street lamp (`$9A3E`): it flashes when Monty comes near, and if he is in it when it does, he is held and killed. */
  private lampPost(s: Stage): void {
    const m = s.monty, post = s.entities[6];
    if (this.lampWait !== 0) { this.lampWait = wrap(this.lampWait - 1); return; }
    if (this.lamp === 0) {
      if (m.y >= 0x60 && m.x >= 0x8c && m.x < 0x9c) this.lamp = 1;
      return;
    }
    if (m.x >= 0x92 && m.x < 0x98 && this.trapped === 0) {
      this.trapped = 4;
      s.setMontyState(4);
      post.y = m.y;
    }
    if (post.y !== 0x78) post.y = wrap(post.y + 1);
    const step = this.lamp >> 1;
    if (step < 4) {
      post.frame = step + 0x4f;
      this.lamp++;
      return;
    }
    post.frame = wrap(0x55 - step);
    this.lamp++;
    if (this.lamp !== 0x0e) return;
    if (this.trapped !== 0) s.die('short');
    this.lamp = 0;
    this.lampWait = (s.rng.byte() & 0x7f) | 0x1e;
  }

  save(w: StateWriter): void { w.put(this.lorry, this.car1, this.car2, this.lampWait, this.lamp, this.trapped); }
  load(r: StateReader): void {
    this.lorry = r.get(); this.car1 = r.get(); this.car2 = r.get(); this.lampWait = r.get(); this.lamp = r.get(); this.trapped = r.get();
  }
}
