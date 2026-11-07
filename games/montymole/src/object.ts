/**
 * The room's object (at most one a room; most rooms have one): a tool, in the game's sense. It is drawn when the room is entered
 * (`$952F`: the picture `$7A00 + 32 * (frame - 1)` at its place, kept in the picture buffer). Standing exactly on it (his x and y equal
 * its own, `$927E`) takes it: bit 3 of Monty's flags is set (he carries a tool), the pick-up beep sounds, and the object is erased
 * (`$9568`: 16 rows of two bytes cleared in the picture buffer, a blank frame blitted over the screen). The record is the room's copy
 * (`$C524`-`$C526`): taking it clears the copy's frame, and entering the room again makes a new copy, so the object is there again;
 * leaving the room by an edge puts the tool down (bit 3 cleared, `$94DD`).
 */
import { SPRITE_BYTES, imageAt, screenOffset } from './data';
import type { Field } from './field';
import type { RoomData } from './room';
import { blit } from './sprite';
import type { StateReader, StateWriter, Stateful } from '../../shared/state';

/** The blank frame the original draws over a taken object (`$7780`). */
export const BLANK_FRAME = 0x7780;
/** Where the objects' pictures begin (`$7A00`). */
export const OBJECT_FRAMES = 0x7a00;

export class RoomObject implements Stateful {
  x = 0;
  y = 0;
  /** the sprite frame number, 1 on (`$C526`); 0 is none */
  frame = 0;

  /** A new copy of the room's record (`$94C3`). */
  enter(room: RoomData): void {
    this.x = room.object.x;
    this.y = room.object.y;
    this.frame = room.object.sprite;
  }

  /** `$952F`: draw it on the screen and keep the screen as the picture. */
  draw(field: Field): void {
    if (this.frame === 0) return;
    blit(field.screen, field.picture, imageAt(OBJECT_FRAMES + SPRITE_BYTES * (this.frame - 1)), this.x, this.y);
    field.picture.set(field.screen);
  }

  /** `$927E`: standing exactly on it. */
  isAt(x: number, y: number): boolean {
    return this.frame !== 0 && this.x === x && this.y === y;
  }

  /** `$9568` (after the beep): erased from the picture buffer and from the screen, and gone from the copy. */
  take(field: Field): void {
    const column = ((this.x >> 3) | ((this.x & 7) << 5)) & 0xff; // (`RRCA` three times: an x that is not a multiple of 8 would add its low bits as a row offset)
    for (const top of [this.y, this.y - 8]) {
      const at = screenOffset(top & 0xff) + column;
      for (let k = 0; k < 8; k++) {
        field.picture[at + k * 256] = 0;
        field.picture[at + k * 256 + 1] = 0;
      }
    }
    blit(field.screen, field.picture, imageAt(BLANK_FRAME), this.x, this.y);
    this.frame = 0;
  }

  save(w: StateWriter): void { w.put(this.x, this.y, this.frame); }

  load(r: StateReader): void { this.x = r.get(); this.y = r.get(); this.frame = r.get(); }
}
