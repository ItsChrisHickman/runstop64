/**
 * The six things a room has that move (`$8751`, every pass): the flying pickets, hairsprays, fish, drills and bricks, and the invisible ones
 * that time the others. A record is 20 bytes (`$C596`, copied from the room when it is entered):
 *
 *   +0 state   0 patrols, 1 chases, 3 is none; anything else (the data uses 2) is a relay, below
 *   +1 +2, +3 +4, +5 +6, +7 +8   the frame sets for direction 0, 1, 2, 3 (each four frames of 32 bytes), as addresses
 *   +9 colour of its cells   +A its link: the record a relay wakes, and a chaser's strength   +B direction (0 up, 1 down, 2 left, 3 right)
 *   +C +D x, y   +E the length of its leg in passes   +F the animation counter   +10 passes left in the leg   +11 its step in pixels
 *
 * A patrol goes `+E` passes one way, turns and goes `+E` back (0 and 1 are a pair, 2 and 3 the other), changing its frame set. A relay does the
 * same from its start, and on the last pass of its leg it goes (state 3, its steps and place put back where they began) and wakes the record
 * it links to (state 2): the chains of the data time the pickets and the falling things. A chaser aims at Monty when a random byte is above its
 * strength and turns round at a wall. A thing is drawn (`$EBE0`) and, if it patrols, paints the colour attributes of its cells (and puts the
 * room's blank colour `$47` on the cells it has left). It is a touch with Monty (src/monty.ts `touched`) that kills him, or kills it if he has a tool.
 * Nothing is erased: the pictures have a margin.
 */
import { imageAt } from './data';
import type { Field } from './field';
import type { Random } from './random';
import { screenOffset } from './data';
import { blit } from './sprite';
import type { StateReader, StateWriter, Stateful } from '../../shared/state';

export const ENEMY_COUNT = 6;
export const RECORD_SIZE = 20;
/** The colour the cells a patrol has left get (the room's blank tile). */
const BLANK_COLOUR = 0x47;
/** The picture of a taken enemy: the blank frame. */
export const BLANK = 0x7780;

export const EnemyState = { patrol: 0, chase: 1, relay: 2, none: 3 } as const;

const wrap = (n: number): number => n & 0xff;

export class Enemy {
  state = 3;
  /** the frame sets for directions 0-3 (+1 to +8) */
  readonly sets = [0, 0, 0, 0];
  colour = 0;
  link = 0;
  dir = 0;
  x = 0;
  y = 0;
  legs = 0;
  counter = 0;
  left = 0;
  step = 0;
  /** +12, +13: never used */
  readonly spare = [0, 0];

  /** Read the 20 bytes of a record. */
  fromBytes(b: readonly number[], at = 0): void {
    const w = (i: number): number => (b[at + i] ?? 0) | ((b[at + i + 1] ?? 0) << 8);
    this.state = b[at] ?? 0;
    for (let k = 0; k < 4; k++) this.sets[k] = w(1 + 2 * k);
    this.colour = b[at + 9] ?? 0; this.link = b[at + 10] ?? 0; this.dir = b[at + 11] ?? 0;
    this.x = b[at + 12] ?? 0; this.y = b[at + 13] ?? 0; this.legs = b[at + 14] ?? 0; this.counter = b[at + 15] ?? 0;
    this.left = b[at + 16] ?? 0; this.step = b[at + 17] ?? 0;
    this.spare[0] = b[at + 18] ?? 0; this.spare[1] = b[at + 19] ?? 0;
  }

  /** The record as the original's bytes. */
  toBytes(): number[] {
    const out = [this.state];
    for (const s of this.sets) out.push(s & 255, s >> 8);
    out.push(this.colour, this.link, this.dir, this.x, this.y, this.legs, this.counter, this.left, this.step, ...this.spare);
    return out;
  }
}

/** What the enemies need of the rest of the game. */
export interface Target {
  readonly x: number;
  readonly y: number;
}

export class Enemies implements Stateful {
  readonly list: Enemy[] = Array.from({ length: ENEMY_COUNT }, () => new Enemy());
  /** Set when a chaser looked at a row off the screen: the original reads memory past its row table there (the data's enemies never chase, so none has gone so far). */
  outside = false;

  /** A new copy of the room's six records (`$94C3`). */
  enter(records: readonly (readonly number[])[]): void {
    this.list.forEach((e, i) => e.fromBytes(records[i] ?? []));
  }

  /** `$8751`: every record once. */
  pass(field: Field, monty: Target, random: Random): void {
    for (const e of this.list) this.one(e, field, monty, random);
  }

  private one(e: Enemy, field: Field, monty: Target, random: Random): void {
    if (e.state === EnemyState.patrol) { this.move(e, field); return; }
    if (e.state === EnemyState.chase) { this.chase(e, field, monty, random); return; }
    if (e.state === EnemyState.none) return; // $8964
    // a relay (`$8969`): on the last pass of its leg it goes and wakes the next
    if (wrap(e.left - 1) !== 0) { this.move(e, field); return; }
    e.left = e.legs;
    e.state = EnemyState.none;
    const next = this.list[e.link];
    if (next !== undefined) next.state = EnemyState.relay; // (the link is a record number; a larger one would write over what follows the records)
    const back = wrap(e.step * wrap(e.legs - 1)); // $8998: the distance its leg took it (the `DJNZ` runs 256 times for a leg of 1: B = 0, then 255 more, and `E - 1` is the byte)
    if (e.dir === 0) e.y = wrap(e.y - back);
    else if (e.dir === 1) e.y = wrap(e.y + back);
    else if (e.dir === 2) e.x = wrap(e.x + back);
    else if (e.dir === 3) e.x = wrap(e.x - back);
  }

  // ---- a chaser ($887D) ----------------------------------------------------------------------------------------------------

  private chase(e: Enemy, field: Field, monty: Target, random: Random): void {
    const byte = random.byte(); // $FD9B: C is its low byte
    if (e.link < byte) { // $8885: CP C, JR NC: a strength at least the byte leaves it as it was
      let dx: number;
      if (monty.x >= e.x) { dx = monty.x - e.x; e.dir = 3; } else { dx = e.x - monty.x; e.dir = 2; }
      let dy: number, vertical: number;
      if (monty.y >= e.y) { dy = monty.y - e.y; vertical = 0; } else { dy = e.y - monty.y; vertical = 1; }
      e.counter = vertical; // ($0F is the animation counter: the code keeps the vertical direction there)
      if (dy >= dx) e.dir = vertical;
    }
    if (this.blocked(e, field)) { // $88D0: the way ahead; a wall turns it round
      e.dir = e.dir === 0 ? 1 : e.dir === 1 ? 0 : e.dir === 2 ? 3 : 2;
    }
    this.move(e, field);
  }

  /** `$88F4`: whether the picture buffer has anything on the column or the two bytes just beyond the way it is going. */
  private blocked(e: Enemy, field: Field): boolean {
    if (e.dir === 2 || e.dir === 3) {
      let hl = (e.y << 8) | e.x;
      hl = e.dir === 2 ? (hl - 1) & 0xffff : (hl + 0x10) & 0xffff; // DEC HL; or ADD HL,DE with DE = $10
      for (let rows = 0; rows < 16; rows++) {
        const x = hl & 255, y = (hl >> 8) & 255;
        if (y > 191) this.outside = true;
        if ((field.picture[screenOffset(y) + (x >> 3)] ?? 0) !== 0) return true;
        hl = (hl - 0x100) & 0xffff; // DEC H
      }
      return false;
    }
    const y = e.dir === 0 ? wrap(e.y + 1) : wrap(e.y - 16);
    if (y > 191) this.outside = true;
    const at = screenOffset(y) + (e.x >> 3);
    return (field.picture[at] ?? 0) !== 0 || (field.picture[at + 1] ?? 0) !== 0;
  }

  // ---- a step, its picture and its colour ($8762) -------------------------------------------------------------------------------

  private move(e: Enemy, field: Field): void {
    const oldX = e.x, oldY = e.y;
    let set: number, left: number;
    switch (e.dir) {
      case 0:
        e.y = wrap(e.y + e.step);
        set = e.sets[0] ?? 0;
        left = wrap(e.left - 1);
        if (left === 0) { set = e.sets[1] ?? 0; e.dir = 1; left = e.legs; }
        break;
      case 1:
        e.y = wrap(e.y - e.step);
        set = e.sets[1] ?? 0;
        left = wrap(e.left - 1);
        if (left === 0) { set = e.sets[0] ?? 0; e.dir = 0; left = e.legs; }
        break;
      case 2:
        e.x = wrap(e.x - e.step);
        set = e.sets[2] ?? 0;
        left = wrap(e.left - 1);
        if (left === 0) { set = e.sets[3] ?? 0; e.dir = 3; left = e.legs; }
        break;
      default:
        e.x = wrap(e.x + e.step);
        set = e.sets[3] ?? 0;
        left = wrap(e.left - 1);
        if (left === 0) { set = e.sets[2] ?? 0; e.dir = 2; left = e.legs; }
    }
    e.left = left;
    e.counter = (e.counter + 1) & 7;
    // $8827: the frame of the set (the counter's second and third bits), at his place
    blit(field.screen, field.picture, imageAt(set + 32 * ((e.counter >> 1) & 3)), e.x, e.y);
    if (e.state === EnemyState.patrol) {
      this.paint(e, field, oldX, oldY, BLANK_COLOUR);
      this.paint(e, field, e.x, e.y, e.colour);
    }
  }

  /**
   * `$886F`: the colour `colour` on the attribute cells of a thing at (x, y): a block of 2 x 2 when `x AND y AND 7` is 0 (the test
   * the code makes for "on a row and column of cells"), else 3 rows of 2 for a thing that goes up or down and 2 rows of 3 for one that goes left or right.
   */
  private paint(e: Enemy, field: Field, x: number, y: number, colour: number): void {
    const row = wrap(0x17 - (y >> 3)); // `$FC18`: the cell of (x, y)
    const at = row * 32 + (x >> 3);
    const block = (x & y & 7) === 0 ? [2, 2] : e.dir < 2 ? [3, 2] : [2, 3];
    const [rows, columns] = block;
    for (let r = 0; r < (rows ?? 0); r++) {
      for (let c = 0; c < (columns ?? 0); c++) field.attrs[at + r * 32 + c] = colour;
    }
  }

  save(w: StateWriter): void {
    for (const e of this.list) w.put(...e.toBytes());
  }

  load(r: StateReader): void {
    for (const e of this.list) {
      const bytes: number[] = [];
      for (let i = 0; i < RECORD_SIZE; i++) bytes.push(r.get());
      e.fromBytes(bytes);
    }
  }
}
