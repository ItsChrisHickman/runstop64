/**
 * Room 2, the duplicating deck (`$95E4`): two pistons built out of tiles by rewriting the room's map, a puzzle that starts when
 * Monty stands on one exact spot, and the prize at the end of it.
 *
 * - **Piston 1** (`$97FC`) is a column of tiles that grows down from under the ledge at the left, one row a pass, until it meets
 *   something, then shrinks back up to the ledge and waits a random time. It kills Monty if he stands in its columns on the row of
 *   its head or one above it. Its state is kept across lives (it is not set up again when the room is entered).
 * - **The puzzle** starts when Monty is at x $2E, y $38 (the ledge, next to the black square): a reel appears at the ledge and
 *   the gauge stops running (`$9904`). Every 110 or so passes a cassette rises from the floor and carries across to the right
 *   (`$9730`); each time it arrives one step of the prize's animation moves on (`$976D`), and when both halves of the prize have shown
 *   their last picture a second piston, at the right (`$97B5`), starts to grow and kills Monty when it meets the floor.
 *   Between the cassettes, in passes 10 to 59 of each round, two reels spin and kill (`$9706`).
 * - **The prize** (`$965C`): its halves kill while they are showing their first three pictures; when the second half shows its
 *   last, touching either half is the way out (+400).
 * - Two walkers patrol the floor (`$969D`), and the gap in the floor between x $5E and $A7 kills.
 */
import { BLANK_FRAME } from '../data';
import { kills, pictureFromQuad, touching, walker } from '../primitives';
import type { Sprite, Stage } from '../stage';
import type { RoomScript } from './script';
import type { StateReader, StateWriter } from '../state';

export const ROOM2_EXIT_SCORE = 400;
/** The tile numbers a piston is made of: the shaft (`$F4`-`$F6`) and the head (`$F7`-`$F9`). */
const SHAFT = [0xf4, 0xf5, 0xf6] as const;
const HEAD = [0xf7, 0xf8, 0xf9] as const;
const ROW = 32;
/** The cells drawn again every pass: 9 along row 16 from column 22 (`$8CB2`), and, when the room is set up, rows 10-15 (`$8BDC`). */
const DECK_CELL = 16 * 32 + 22, DECK_CELLS = 9, PISTON2_AREA = 10 * 32, PISTON2_AREA_CELLS = 192;

/** The head of piston 1 starts under the ledge, at row 10, column 4 of the room's map ($65C4); piston 2 at row 10, column 27 ($65DB). */
const PISTON1_START = 0x65c4 - 0x6000;
const PISTON2_START = 0x65db - 0x6000;
/** Where the first piston is looked at: its position in the room's map as row and column (`$9808`). */
const MAP_ORIGIN = 0x6480 - 0x6000;

export class Room2 implements RoomScript {
  /** `$98FE` (0 growing, $FF shrinking) and `$98FF` (the wait before growing; the byte counts through $FF) */
  direction = 0;
  wait = 0;
  /** `$9900`, `$9902`: the heads of the two pistons, as places in the map memory */
  head1 = PISTON1_START;
  head2 = PISTON2_START;
  /** `$9904`: the puzzle has started; the gauge is held (`holdsGauge`) */
  puzzle = 0;
  /** `$9905`: the cassette is on its way */
  cassette = 0;
  /** `$97B4`: the second piston is growing */
  growing = 0;

  /** Whether the gauge is held (`$822F`: room 2 drains on every second pass unless the puzzle has started). */
  get holdsGauge(): boolean { return this.puzzle !== 0; }

  run(s: Stage): void {
    const e = s.entities;
    this.piston1(s);
    s.redraw(DECK_CELL, DECK_CELLS); // (`$95EC`)
    if (s.monty.x >= 0x5e && s.monty.x < 0xa8 && s.monty.y >= 0x70) s.die('normal');
    if (s.first) {
      this.puzzle = 0;
      e[2].x = 0xb8; e[2].y = 0x39; e[2].frame = 0x6f;
      this.setUpPiston2(s);
      this.cassette = 0;
    }
    this.growPiston2(s);
    if (this.puzzle !== 0) this.round(s);
    else if (s.monty.x === 0x2e && s.monty.y === 0x38) {
      e[1].x = 0x38; e[1].y = 0x38; e[1].frame = 0x6f;
      this.puzzle++;
      s.setPocket(BLANK_FRAME);
      this.round(s);
    }
    this.prize(s);
    this.patrols(s);
  }

  // ---- the pistons ------------------------------------------------------------------------------

  private put(s: Stage, at: number, tiles: readonly number[]): void {
    tiles.forEach((t, i) => { s.tiles.memory[at + i] = t; });
  }

  /** A piston grows one row: the old head row becomes shaft, the row below the head. */
  private extend(s: Stage, head: number): number {
    const next = head + ROW;
    this.put(s, next, HEAD);
    this.put(s, head, SHAFT);
    this.redrawRows(s, head); // (`$9868`, `$97E1`)
    return next;
  }

  /** The two rows of cells a piston has just changed, from the cell `head` (an offset in the map memory) down, are drawn again. */
  private redrawRows(s: Stage, head: number): void {
    const cell = head - s.tiles.base;
    s.redraw(cell, 3);
    s.redraw(cell + ROW, 3);
  }

  /** Piston 1 (`$97FC`). */
  private piston1(s: Stage): void {
    const mem = s.tiles.memory;
    if ((this.direction & 0x80) !== 0) { this.shrink(s); return; }
    this.wait = (this.wait - 1) & 0xff;
    if ((this.wait & 0x80) === 0) return;
    // where the head is, as the room's row and column (`$9808`)
    const offset = (this.head1 - MAP_ORIGIN) & 0xffff;
    const column = offset & 0x1f;
    const row = (offset >> 5) & 0xff;
    const m = s.monty;
    const near = (m.x >> 3) + 2 - column;
    if (near >= 0 && near < 5) {
      const above = (m.y >> 3) - row;
      if (above === 0 || (above < 0 && -above < 2)) s.die('normal');
    }
    if (mem[this.head1 + ROW] !== 0) { this.direction = 0xff; return; }
    this.head1 = this.extend(s, this.head1);
  }

  /** The head goes back up a row at a time while there is shaft above it (`$9883`), then the wait starts (`$98BF`). */
  private shrink(s: Stage): void {
    const mem = s.tiles.memory;
    const above = this.head1 - ROW;
    if (mem[above] === SHAFT[0]) {
      this.head1 = above;
      this.put(s, above, HEAD);
      this.put(s, above + ROW, [0, 0, 0]);
      this.redrawRows(s, above); // (`$98AA`)
      return;
    }
    this.wait = (s.rng.byte() & 0x7f) | 0x10;
    this.direction = 0;
  }

  /** The room's first pass: the second piston is a head alone at the top of its column, and its column below it is empty (`$98CE`). */
  private setUpPiston2(s: Stage): void {
    this.growing = 0;
    this.head2 = PISTON2_START;
    for (let r = 0; r < 6; r++) this.put(s, this.head2 + r * ROW, [0, 0, 0]);
    this.put(s, this.head2, HEAD);
    s.redraw(PISTON2_AREA, PISTON2_AREA_CELLS); // (`$98F9`: rows 10 to 15 all over)
  }

  /** Piston 2 grows a row a pass once the prize is complete, and kills Monty when it meets something (`$97B5`). */
  private growPiston2(s: Stage): void {
    if (this.growing === 0) return;
    if (s.tiles.memory[this.head2 + ROW] !== 0) s.die('normal');
    this.head2 = this.extend(s, this.head2);
  }

  // ---- the puzzle --------------------------------------------------------------------------------

  /** One pass of the puzzle's round (`$9706`): counts 1 up to $3C; at $3C the cassette goes by. */
  private round(s: Stage): void {
    const e = s.entities;
    if (this.puzzle === 0x3c) { this.cassetteGoesBy(s); return; }
    this.puzzle++;
    if (this.puzzle < 0x0a) return;
    if (this.puzzle === 0x0a) s.sound(5);
    pictureFromQuad(s, e[1], 0x6f);
    kills(s, e[1]);
    pictureFromQuad(s, e[2], 0x6f);
    kills(s, e[2]);
    this.cassette = 0;
  }

  /** The cassette rises from the floor, crosses to the right, and moves the prize's animation on (`$9730`). */
  private cassetteGoesBy(s: Stage): void {
    const e = s.entities;
    const c = e[3];
    if (this.cassette === 0) {
      c.x = 0x9a; c.y = 0x80; c.frame = 0x20;
      this.cassette = 1;
    }
    if (c.y !== 0x70) { c.y = (c.y - 1) & 0xff; return; }
    if (c.x < 0xdc) { c.x = (c.x + 2) & 0xff; return; }
    this.puzzle = 1;
    c.frame = BLANK_FRAME;
    this.prizeNext(e[4], e[5]);
  }

  /** The prize's two halves show pictures $21, $22, $23, $24 one round after another: first one, then the other (`$976D`). */
  private prizeNext(first: Sprite, second: Sprite): void {
    if (first.frame === BLANK_FRAME) {
      first.x = 0xdc; first.y = 0x70; first.frame = 0x21;
      second.x = 0xdc; second.y = 0x60; second.frame = BLANK_FRAME;
      return;
    }
    if (first.frame !== 0x24) { first.frame++; return; }
    if (second.frame === BLANK_FRAME) { second.frame = 0x21; return; }
    if (second.frame === 0x24) { this.growing = 1; return; }
    second.frame++;
  }

  // ---- the prize and the patrols ---------------------------------------------------------------

  /** `$965C`: killing while it shows its first pictures, the way out when the second half shows its last. */
  private prize(s: Stage): void {
    const e = s.entities;
    const half = e[5], other = e[4];
    if (half.frame === 0x24) {
      if (touching(half, s.monty) || touching(other, s.monty)) {
        s.addScore(ROOM2_EXIT_SCORE);
        s.leave(3);
      }
      return;
    }
    if (half.frame !== BLANK_FRAME) kills(s, half);
    if (other.frame !== BLANK_FRAME) kills(s, other);
  }

  /** The two walkers (`$969D`): they kill, and turn round at the ends of their runs. */
  private patrols(s: Stage): void {
    const e = s.entities;
    const a = e[6];
    walker(s, a, { flags: 0x00, base: 0x49, x: 0x18, y: 0x28 });
    walker(s, a, { flags: 0x00, base: 0x49, x: 0x18, y: 0x28 }); // (called twice in a pass, so it moves 4 pixels)
    kills(s, a);
    if (a.x >= 0x52) a.flags ^= 0x80;
    const b = e[7];
    walker(s, b, { flags: 0x00, base: 0x40, x: 0x80, y: 0x70 });
    if (b.x >= 0xcc) b.flags ^= 0x80;
    kills(s, b);
  }

  save(w: StateWriter): void { w.put(this.direction, this.wait, this.head1, this.head2, this.puzzle, this.cassette, this.growing); }
  load(r: StateReader): void {
    this.direction = r.get(); this.wait = r.get(); this.head1 = r.get(); this.head2 = r.get();
    this.puzzle = r.get(); this.cassette = r.get(); this.growing = r.get();
  }
}
