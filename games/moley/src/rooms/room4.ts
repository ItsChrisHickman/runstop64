/**
 * Room 4, the office with the staircase (`$9B22`): three walkers drain the gauge, a fourth thing stands still, and a staircase of
 * cassettes collapses in steps (`$9BCE`: the top one's pictures, a ghost's, the exit's). When the last cassette is gone the exit is
 * open for 100 passes and then Monty is killed for dawdling (`$9B92`); touched with no items left it is the way out (+600).
 */
import { BLANK_FRAME } from '../data';
import { drains, place, touching, walker, walkerQuad } from '../primitives';
import type { Stage } from '../stage';
import type { RoomScript } from './script';
import type { StateReader, StateWriter } from '../state';

const ROOM4_EXIT_SCORE = 600;

export class Room4 implements RoomScript {
  /** `$9C1A`: the passes the exit has been open (counts down from 100; 0 = not open yet) */
  open = 0;
  /** `$9C1B`: the wait between steps of the collapse */
  pause = 0;

  run(s: Stage): void {
    const e = s.entities;
    if (s.first) {
      this.open = 0;
      this.pause = 0x64;
      e[1].x = 0x98; e[1].y = 0x20; e[1].frame = 0x24;
      e[2].x = 0xa8; e[2].y = 0x20; e[2].frame = 0x0a;
      e[3].x = 0xb8; e[3].y = 0x30; e[3].frame = BLANK_FRAME;
    }
    place(s, e[4], 0x88, 0x20, 0x29);
    walkerQuad(s, e[5], { flags: 0x00, base: 0x43, x: 0x30, y: 0x28 });
    drains(s, e[5]);
    walker(s, e[6], { flags: 0x80, base: 0x3d, x: 0x82, y: 0x78 });
    drains(s, e[6]);
    walker(s, e[7], { flags: 0x80, base: 0x4c, x: 0xe0, y: 0x30 });
    drains(s, e[7]);
    if (this.open !== 0) { this.exitOpen(s); return; }
    this.pause--;
    if (this.pause < 0) { this.pause = 0; this.collapse(s); } // (the counter is a byte: it was 0 and goes to $FF, which is negative)
  }

  /** The exit is open (`$9B92`). */
  private exitOpen(s: Stage): void {
    this.open--;
    if (this.open === 0) s.die('normal');
    if (!touching(s.monty, s.entities[3])) return;
    if (s.itemsLeft !== 0) s.die('normal');
    s.addScore(ROOM4_EXIT_SCORE);
    s.leave(5);
  }

  /** One step of the collapse (`$9BCE`), when the wait is over. */
  private collapse(s: Stage): void {
    const [, top, ghost, exit] = s.entities;
    if (ghost.frame === 0x0a) {
      if (top.frame === 0x21) top.frame = 0xc0;
      top.frame = (top.frame - 1) & 0xff;
    }
    ghost.frame = (ghost.frame + 1) & 0xff;
    if (ghost.frame === 0x0e) {
      if (exit.frame === BLANK_FRAME) exit.frame = 0x24;
      exit.frame = (exit.frame + 1) & 0xff;
    }
    if (ghost.frame !== 0x12) return;
    ghost.frame = 0x0a;
    this.pause = 0x28;
    if (top.frame === BLANK_FRAME) this.open = 0x64;
  }

  save(w: StateWriter): void { w.put(this.open, this.pause); }
  load(r: StateReader): void { this.open = r.get(); this.pause = r.get(); }
}
