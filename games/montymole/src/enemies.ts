/**
 * The six things a room has that move (`$8751`, every pass), as the Spectrum's screen shows them: the flying pickets, hairsprays, fish, drills and bricks,
 * and the invisible ones that time the others. Their records and what a pass does with them (the legs, the relays, a chaser) are src/enemy-rules.ts, which
 * the remix runs too; this draws a step (`$EBE0`) and, if it patrols, paints the colour attributes of its cells (and puts the room's blank colour `$47` on
 * the cells it has left), and says what is in a chaser's way (`$88F4`). It is a touch with Monty (src/monty.ts `touched`) that kills him, or kills it if he
 * has a tool. Nothing is erased: the pictures have a margin.
 */
import { imageAt, screenOffset } from './data';
import { Enemy, ENEMY_COUNT, EnemyState, passEnemies, RECORD_SIZE, type Target } from './enemy-rules';
import type { Field } from './field';
import type { Random } from './random';
import { blit } from './sprite';
import type { StateReader, StateWriter, Stateful } from '../../shared/state';

export { Enemy, ENEMY_COUNT, EnemyState, RECORD_SIZE, type Target } from './enemy-rules';

/** The colour the cells a patrol has left get (the room's blank tile). */
const BLANK_COLOUR = 0x47;
/** The picture of a taken enemy: the blank frame. */
export const BLANK = 0x7780;

const wrap = (n: number): number => n & 0xff;

export class Enemies implements Stateful {
  readonly list: Enemy[] = Array.from({ length: ENEMY_COUNT }, () => new Enemy());
  /** Set when a chaser looked at a row off the screen: the original reads memory past its row table there (the data's enemies never chase, so none has gone so far). */
  outside = false;

  /** A new copy of the room's six records (`$94C3`). */
  enter(records: readonly (readonly number[])[]): void {
    this.list.forEach((e, i) => e.fromBytes(records[i] ?? []));
  }

  /** `$8751`: every record once (src/enemy-rules.ts: the rules; here what a step draws). */
  pass(field: Field, monty: Target, random: Random): void {
    passEnemies(this.list, {
      target: monty,
      random,
      blocked: (e) => this.blocked(e, field),
      moved: (e, oldX, oldY) => this.draw(e, field, oldX, oldY),
    });
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

  // ---- a step's picture and its colour ($8827) -------------------------------------------------------------------------------

  /** `$8827`: the frame of the set (the counter's second and third bits), at its place, and a patrol's cells' colours. */
  private draw(e: Enemy, field: Field, oldX: number, oldY: number): void {
    blit(field.screen, field.picture, imageAt((e.sets[e.dir] ?? 0) + 32 * ((e.counter >> 1) & 3)), e.x, e.y);
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
