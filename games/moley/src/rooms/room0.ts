/**
 * Room 0, the office (`$9286`): a lamp and a walker that kill, three walkers that drain the gauge (one of them bobbing), and the
 * exit, a cassette that hangs at the top, drifts right, and once past x $D7 falls to the floor; there it is the way out (+200)
 * for four passes before it is gone, and the room kills Monty once it has gone.
 */
import { BLANK_FRAME } from '../data';
import { isFloor } from '../monty';
import { Bobber, drains, kills, place, touching, walker, wrap } from '../primitives';
import type { Stage } from '../stage';
import type { RoomScript } from './script';
import type { StateReader, StateWriter } from '../state';

const ROOM0_EXIT_SCORE = 200;

export class Room0 implements RoomScript {
  readonly bobber = new Bobber();
  /** how many passes the drifting cassette has waited while items are left (`$9377`, counts 0-15) */
  drift = 0;

  run(s: Stage): void {
    const e = s.entities;
    place(s, e[1], 0x54, 0x10, 0x31);
    kills(s, e[1]);
    walker(s, e[2], { flags: 0x00, base: 0x55, x: 0x6e, y: 0x78 });
    drains(s, e[2]);
    walker(s, e[3], { flags: 0xff, base: 0x55, x: 0x87, y: 0x78 });
    drains(s, e[3]);
    walker(s, e[4], { flags: 0xff, base: 0x3a, x: 0x78, y: 0x28 });
    kills(s, e[4]);
    this.bobber.bob(s, e[5]);
    walker(s, e[5], { flags: 0x00, base: 0x2e, x: 0x00, y: 0x48 });
    drains(s, e[5]);
    this.exitObject(s);
  }

  /** The cassette (`$92E0`). */
  private exitObject(s: Stage): void {
    const c = s.entities[6];
    if (s.first) {
      c.frame = 0x1c;
      c.x = 0x64;
      c.y = 0x10;
    }
    if (c.x >= 0xd8) {
      if (c.y === 0x78) { this.onTheFloor(s); return; }
      if (!isFloor(s.tiles.at(c.x, wrap(c.y + 16)))) { c.y = wrap(c.y + 1); return; }
    }
    // $9313: it drifts right, one pixel a pass, or one in 16 while items are left
    if (s.itemsLeft !== 0) {
      this.drift = (this.drift + 1) & 0x0f;
      if (this.drift !== 0) return;
    }
    c.x = wrap(c.x + 1);
  }

  /** On the floor (`$9326`): gone means death, touching is the exit (`$934C`), and it shows four more pictures, then goes. */
  private onTheFloor(s: Stage): void {
    const c = s.entities[6];
    if (c.frame === BLANK_FRAME) s.die('normal');
    if (touching(c, s.monty)) {
      if (s.itemsLeft !== 0) s.die('normal');
      s.addScore(ROOM0_EXIT_SCORE);
      s.leave(1);
    }
    c.frame = wrap(c.frame + 1);
    if (c.frame === 0x1f) c.frame = BLANK_FRAME;
  }

  save(w: StateWriter): void { w.put(this.drift); this.bobber.save(w); }
  load(r: StateReader): void { this.drift = r.get(); this.bobber.load(r); }
}
