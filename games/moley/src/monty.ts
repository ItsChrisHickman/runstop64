/**
 * Monty alone: his input, walking, the 24-step jump, falling, ropes, room 5's flying and the choice of his picture, as the
 * original's logic pass does them (`$8CDD`, once every second frame, 25 a second).
 *
 * This is the Z80's logic written as the game plays it, in the order it does things, with the original's addresses in the
 * comments so games/moley/re/README.md and a listing can be followed side by side. It is not a translation: the state is
 * typed, the probes are functions, and what the Z80 passes in registers (E = the keys, the Z and carry flags) is passed as
 * arguments and results. Where the original is odd the rebuild is odd the same way and says so, because the lockstep test
 * (test/lockstep.ts) compares it with the original on every pass.
 *
 * Positions are pixels of the 256 x 144 play area; Monty's sprite is 16 x 16 and (x, y) is its top left. Everything the
 * physics asks of the room goes through `Tiles.at(x, y)` (`$8FCC`).
 */
import { BLANK_FRAME, JUMP_FRAMES, JUMP_STEPS } from './data';
import { FrameCycle } from './cycle';
import { stepLeft, stepRight, type Tiles } from './walking';
import type { StateReader, StateWriter, Stateful } from './state';

export type { Tiles };

/** The keys of a pass: the same bits whatever the device (`$915F`). */
export const Key = { right: 1, left: 2, down: 4, up: 8, jump: 16 } as const;

/** Monty's `state` (`$811C`): 3 and 4 are driven by room scripts (a forced pose, and out of sight). */
export const State = { walking: 0, falling: 1, jumping: 2, posed: 3, hidden: 4 } as const;

/** The tiles the physics knows by number (the rest are scenery). Read from the code at the addresses given. */
const FLOORS: readonly number[] = [0x01, 0x05, 0x06, 0x07, 0x3f, 0x13, 0x18, 0x19, 0x1a, 0x40, 0x41, 0x42, 0x55, 0x7b, 0x73, 0x9b]; // $8F79
const CONVEYORS: readonly number[] = [0x55, 0x7b]; // a floor that carries him to the right ($8F47)
/** Whether a tile is a floor (`$8F79`): a thing is standing on it. */
export const isFloor = (tile: number): boolean => FLOORS.includes(tile);
const ROPES: readonly number[] = [0x08, 0x45]; // $8EBF
const CEILINGS: readonly number[] = [0x01, 0x3f]; // end a move up ($8DDA)

/** What a pass takes from outside Monty (room scripts and the animation they share). */
export interface Outside {
  readonly tiles: Tiles;
  /** the room, 0-6 (room 5 flies) */
  readonly room: number;
  /** the scripts' animation frame (`$9ECC`), for the pose of state 3 */
  readonly scriptFrame: number;
  /** entity 2's x (`$8129`), which the pose of state 3 faces */
  readonly partnerX: number;
}

const wrap = (n: number): number => n & 0xff;

export class Monty implements Stateful {
  x = 0;
  y = 0;
  /** the sprite frame (`$8123`) and the flags (`$8124`; bit 7: faces left) */
  frame = 0; // (the original's memory is zero until the first pass picks a picture)
  flags = 0;
  state: number = State.walking;
  /** how far the jump is, 0-23 (`$811D`), and the keys held when it started (`$811E`) */
  phase = 0;
  jumpKeys = 0;
  /** on a rope (`$810B`; room 5: flying up) and room 5: flying down (`$811F`): they choose the climbing pictures */
  ropeUp = 0;
  ropeDown = 0;
  /** where the pass began (`$8109`): a move that is refused puts him back, and the picture and facing follow what changed */
  prevX = 0;
  prevY = 0;
  /** the walking picture (`$9124`-`$9126`) */
  readonly walk = new FrameCycle();

  /** `world` is shared and kept up to date by its owner (the room changes, the scripts move). */
  constructor(private readonly world: Outside) {}

  // ---- one pass ---------------------------------------------------------------------------------

  /** One logic pass (`$8CDD`) with the keys `keys` (already combined by `readKeys`). */
  pass(keys: number): void {
    this.prevX = this.x;
    this.prevY = this.y;
    // $8FD2: a state other than walking runs its own routine and the pass ends there, with no new picture
    switch (this.state) {
      case State.walking: break;
      case State.falling: this.fall(); return;
      case State.jumping: this.jump(); return;
      case State.posed: this.pose(); return;
      case State.hidden: this.frame = BLANK_FRAME; return;
      default: throw new Error(`Monty's state ${this.state} has no routine`); // ($8FD2 would jump into the table that follows it)
    }
    if (this.world.room === 5) { this.fly(keys); this.choosePicture(); return; } // $8CF1
    if (keys & Key.left) this.walkLeft();
    if (keys & Key.right) this.walkRight();
    this.climb(keys);
    this.descend(keys);
    this.underFoot();
    if (keys & Key.jump) this.startJump(keys); // $8D66
    this.choosePicture();
  }

  // ---- walking ($8E62, $8E79) ----------------------------------------------------------------------

  /** Two pixels left, unless a wall is there or he is at the left edge (`$8E65`, shared with the walkers: walking.ts). */
  private walkLeft(): void { stepLeft(this.world.tiles, this); }

  /** Two pixels right (`$8E7C`). */
  private walkRight(): void { stepRight(this.world.tiles, this); }

  // ---- ropes ($8E99, $8EE3) ------------------------------------------------------------------------

  /** A rope tile at either of two points 4 and 8 pixels in from his left, on the row `py` (`$8EC5`). */
  private ropeAt(py: number): boolean {
    return ROPES.includes(this.world.tiles.at(wrap(this.x + 4), py)) || ROPES.includes(this.world.tiles.at(wrap(this.x + 8), py));
  }

  /** On a rope at his feet: mark it, and climb 2 pixels with up (`$8E99`). */
  private climb(keys: number): void {
    this.ropeUp = 0;
    if (!this.ropeAt(wrap(this.y + 15))) return;
    if (this.underFoot() !== 'floor') this.ropeUp = 1;
    if (!(keys & Key.up)) return;
    if (this.y === 0) return;
    this.y = wrap(this.y - 1);
    if (this.y === 0) return;
    this.y = wrap(this.y - 1);
  }

  /** Down a rope: 2 pixels while the rope is under him and he is above y $7E (`$8EE3`). */
  private descend(keys: number): void {
    if (!(keys & Key.down)) return;
    if (!this.ropeAt(wrap(this.y + 16))) return;
    const next = wrap(this.y + 2);
    if (next >= 0x80) return;
    this.y = next;
  }

  // ---- what is under his feet ($8F26) ----------------------------------------------------------------

  /**
   * Floor, rope or air under him. Floor: two points at his feet (4 and 10 pixels in, 16 down) are looked at; a conveyor
   * pushes him right 2 pixels; he lands (y to a multiple of 8, unless a rope is at his top). Rope: no floor, but a rope at his
   * top or his feet. Air: neither; he falls (state 1).
   */
  private underFoot(): 'floor' | 'rope' | 'air' {
    const feet = wrap(this.y + 16);
    for (let probe = 0; probe < 2; probe++) {
      const tile = this.world.tiles.at(wrap(this.x + 4 + probe * 6), feet);
      if (!isFloor(tile)) continue;
      if (CONVEYORS.includes(tile)) this.walkRight();
      this.land();
      return 'floor';
    }
    if (this.ropeAt(this.y)) return 'rope';
    if (this.ropeAt(wrap(this.y + 15))) return 'rope';
    this.state = State.falling;
    return 'air';
  }

  /** Landing (`$8FA9`): y to a multiple of 8 unless a rope is at his top. */
  private land(): void {
    if (this.ropeAt(this.y)) return;
    this.y &= 0xf8;
  }

  // ---- falling ($8FBA), jumping ($8D66, $8D77) -------------------------------------------------------------

  /** Falling: 3 pixels a pass until floor or a rope. */
  private fall(): void {
    this.y = wrap(this.y + 3);
    if (this.underFoot() !== 'air') this.state = State.walking;
  }

  private startJump(keys: number): void {
    this.jumpKeys = keys;
    this.state = State.jumping;
    this.phase = 0;
  }

  /** Whether a ceiling tile is at his top, at x and 8 pixels along (`$8DDA`). */
  private headBlocked(): boolean {
    return CEILINGS.includes(this.world.tiles.at(this.x, this.y)) || CEILINGS.includes(this.world.tiles.at(wrap(this.x + 8), this.y));
  }

  /**
   * One pass of the jump. He moves sideways the way he was pressing at take-off, then up or down by the table. Going down
   * (or level) he lands on a floor or rope; going up, a ceiling stops him: his position goes back to where the pass began
   * and the phase to 23 minus itself, so he starts down.
   */
  private jump(): void {
    if (this.jumpKeys & Key.right) this.walkRight();
    if (this.jumpKeys & Key.left) this.walkLeft();
    if (this.state === State.falling) this.state = State.jumping; // ($8D8A: never true here, a falling state does not come this way)
    const step = JUMP_STEPS[this.phase];
    this.y = wrap(this.y + step);
    if ((step & 0x80) === 0) {
      this.underFoot();
      if (this.state === State.falling) { this.continueJump(); return; } // (no floor: the jump goes on)
      this.state = State.walking;
      this.land();
      return;
    }
    if (this.y !== 0 && this.y < 0x80 && !this.headBlocked()) { this.continueJump(); return; }
    this.x = this.prevX;
    this.y = this.prevY;
    this.phase = 23 - this.phase;
  }

  /** The jump goes on: the next phase, and after the 24th he is falling ($8DFF). */
  private continueJump(): void {
    this.state = State.jumping;
    this.phase++;
    if (this.phase === 24) this.state = State.falling;
  }

  // ---- room 5: flying ($8D0E) --------------------------------------------------------------------

  /** Four directions, 2 pixels a pass, inside x 4-$ED and y $1A-$70; no gravity, no jumping. */
  private fly(keys: number): void {
    this.ropeUp = 0;
    this.ropeDown = 0;
    if (keys & Key.left && this.x >= 4) this.x = wrap(this.x - 2);
    if (keys & Key.right && this.x < 0xee) this.x = wrap(this.x + 2);
    if (keys & Key.up && this.y >= 0x1a) { this.y = wrap(this.y - 2); this.ropeUp = 0xff; }
    if (keys & Key.down && this.y < 0x70) { this.y = wrap(this.y + 2); this.ropeDown = 0xff; }
  }

  // ---- the posed states ($9141) --------------------------------------------------------------------

  /** State 3: a pose from the scripts' animation, turned by where entity 2 is. */
  private pose(): void {
    this.frame = wrap(this.world.scriptFrame + 0x12);
    const diff = this.world.partnerX - this.x;
    this.flags = ((diff < 0 ? 0x80 : 0) | ((wrap(diff)) >> 1)) & 0xff;
  }

  // ---- the picture ($9009) -----------------------------------------------------------------------

  /** Which way he faces, and which frame: jump frames, rope, or the walking cycle that advances only on passes where he moved. */
  private choosePicture(): void {
    if (this.x !== this.prevX) {
      if (this.prevX < this.x) this.flags &= 0x7f;
      else this.flags |= 0x80;
    }
    if (this.state === State.jumping) { this.frame = JUMP_FRAMES[this.phase]; return; }
    let base = 0;
    if (this.ropeUp !== 0) base = 3;
    if (this.ropeDown !== 0) base = 0x37;
    const moved = this.x !== this.prevX || this.y !== this.prevY;
    const step = moved ? this.walk.step() : this.walk.frame;
    this.frame = wrap(base + step);
  }

  save(w: StateWriter): void {
    w.put(this.x, this.y, this.frame, this.flags, this.state, this.phase, this.jumpKeys, this.ropeUp, this.ropeDown, this.prevX, this.prevY);
    this.walk.save(w);
  }

  load(r: StateReader): void {
    this.x = r.get(); this.y = r.get(); this.frame = r.get(); this.flags = r.get(); this.state = r.get(); this.phase = r.get();
    this.jumpKeys = r.get(); this.ropeUp = r.get(); this.ropeDown = r.get(); this.prevX = r.get(); this.prevY = r.get();
    this.walk.load(r);
  }
}
