/**
 * Monty alone: walking, the 32-pass jump, falling, ropes, the cell classes under him, and what he draws, as the original's Monty
 * routine does them (`$89D4`, once a pass, 25 a second).
 *
 * This is the Z80's logic written as the game plays it, in the order it does things, with the original's addresses in the comments
 * so re/README.md and a listing can be followed side by side. It is not a translation: the state is typed, the probes are
 * functions, and what the Z80 leaves in memory for later (the input byte, the walk frame, the arc pointer, the jump pitch) is a
 * field. Where the original is odd the rebuild is odd the same way and says so, because test/lockstep.ts compares it with the
 * original on every pass, together with the screen it leaves.
 *
 * Positions are pixels: x 0-255 left to right; **y counts up from the bottom of the screen** and is the top row of his 16 x 16 sprite
 * (his rows are y down to y - 15). Everything the physics asks of the room goes through `Terrain`: the screen's attributes (what a
 * cell *is* is its colour: the room's four class colours, `$C51A`) and the screen's bytes under his feet (anything drawn there holds him up).
 */
import { imageAt, JUMP_ARC, JUMP_PASSES, MONTY_BASE, screenOffset, STEP_PITCH_START } from './data';
import { Direction, JUMP_BIT } from './input';
import { blit, restoreRows } from './sprite';
import type { StateReader, StateWriter, Stateful } from '../../shared/state';

/** The state flags (`$8D52`): 1 falling, 2 jumping, 4 on a rope, 8 carries a tool, and the four edges of his box whose cells are floor: right column 16, left column 32, bottom row 64, top row 128. */
export const Flag = { falling: 0x01, jumping: 0x02, rope: 0x04, tool: 0x08, right: 0x10, left: 0x20, down: 0x40, up: 0x80 } as const;
/** The second flag byte (`$8D53`): bit 7 says he has been in the air since he last stood (the next solid ground is a landing); bit 0 keeps the interrupt routine off; bit 1 is the death shake. */
export const InAir = 0x80;

/** What a cell's colour matched, in the room's list of four (`$8D54`-`$8D57`): 0 floor, 1 deadly, 2 rope, 3 floor too, 4 none. */
const MATCH_FLOOR = 0, MATCH_DEADLY = 1, MATCH_ROPE = 2, MATCH_NONE = 4;

/** The fall's limit (`$8C1E`: `CP $20`): landing with the counter at 32 or more is fatal. */
export const FATAL_FALL = 0x20;

/** The part of the world his physics reads. */
export interface Terrain {
  /** the screen's attribute bytes, `$5800` */
  readonly attrs: Uint8Array;
  /** the screen's bitmap, `$4000` (his own sprite is on it) */
  readonly screen: Uint8Array;
  /** the picture buffer, `$D260` */
  readonly picture: Uint8Array;
  /** the room's four class colours: floor, deadly, rope, and a fourth (`$C51A`) */
  readonly classes: readonly number[];
  /** where the room keeps the frames he climbs with (`$C51E`) */
  readonly climbBase: number;
}

/** The six points of the touch test, as sums with his place (`$9298`). */
const TOUCH_POINTS: readonly number[] = [0x0000, 0x010a, 0xf100, 0xf8ff, 0xf810, 0xf10f];

/** How a pass ended. */
export type Ending = 'alive' | 'dead';

const wrap = (n: number): number => n & 0xff;

/** The address of a frame of Monty (`$8395`): 32 bytes a frame, 128 for each direction (the input's low two bits). */
export function frameAddress(frame: number, base: number, input: number): number {
  return (frame * 32 + base + ((input & 3) << 7)) & 0xffff;
}

export class Monty implements Stateful {
  /** his place (`$5C7B`, `$5C7C`) */
  x = 0;
  y = 0;
  /** the input byte (`$832E`): the direction and the jump */
  input: number = Direction.none;
  /** where his picture is (`$848C`) */
  frameAddr = MONTY_BASE;
  /** the walk frame, 0-7 (`$848E`); the picture is its half */
  walkFrame = 3;
  /** the jump's direction + 1 (`$848F`: 0 none; 1 up, 2 down, 3 left, 4 right, 5 straight up) */
  jumpDir = 0;
  /** where he is in the jump arc, 0-32 (`$8492`, as an index) and how many passes the jump has taken, 0-31 (`$8498`) */
  arc = 0;
  jumpCount = 0;
  /** the footstep's pitch (`$8494`) */
  pitch = STEP_PITCH_START;
  /** which way he faces, the last direction he moved (`$849B`) */
  facing = 1;
  flags = 0;
  flags2 = 0;
  /** what each of his four edges is over (`$8D54`-`$8D57`: top row, bottom row, left column, right column) */
  readonly cells = [0, 0, 0, 0];
  /**
   * Set when a jump has gone on past its table's 32 steps, which the original does after the room 16 scene clears the jump's count and leaves its
   * place in the table: it reads the code that follows as steps and crashes. The rebuilt game ends the jump (and its owner says so).
   */
  overrun = false;
  /** how far he has fallen (`$8D58`) */
  fallen = 0;
  /** where the pass began (`$8D7D`, `$8D7E`) */
  prevX = 0;
  prevY = 0;

  constructor(private readonly world: Terrain, private readonly beep: (de: number, hl: number) => void) {}

  // ---- one pass ($89D4) ----------------------------------------------------------------------------------------

  /** One pass of Monty's routine: moves, classifies the cells, draws. `dead` where the original would jump to its death routine. */
  pass(): Ending {
    this.prevX = this.x;
    this.prevY = this.y;
    if (this.flags & Flag.falling) this.fall(); // $89DE -> $8B1F
    else if (this.jumpDir !== 0) return this.jump(); // $89E5 -> $8A63
    else if (this.input & JUMP_BIT) { // $89EC
      this.facing = this.input & 0x7f;
      this.jumpDir = this.facing + 1;
      this.flags |= Flag.jumping;
      return this.jump();
    } else if (this.flags & Flag.rope) this.onRope(); // $8A03 -> $917A
    else this.walk(); // $8A0A
    return this.settle();
  }

  /** Walking (`$8A0A`): a new direction turns him on the spot, the same direction moves two pixels; up and down do nothing off a rope. */
  private walk(): void {
    const dir = this.input & 7;
    if (dir === Direction.none) return; // $8A11 -> $8B34
    if (this.facing !== dir) { this.turn(); return; } // $8A5B
    if (dir === Direction.left) {
      this.x = wrap(this.x - 2);
      this.step(1);
    } else if (dir === Direction.right) {
      this.x = wrap(this.x + 2);
      this.step(-1);
    }
  }

  /** Changing direction (`$8A5B`): he faces the new way and the walk animation moves on, he does not. */
  private turn(): void {
    this.facing = this.input;
    this.step(1);
  }

  /** The walk animation (`$8A27`, `$8A2B`): the frame counter one on (or back) and the picture, from the room's rope set on a rope. */
  private step(by: number): void {
    this.walkFrame = wrap(this.walkFrame + by) & 7;
    const base = this.flags & Flag.rope ? this.world.climbBase : MONTY_BASE;
    this.frameAddr = frameAddress(this.walkFrame >> 1, base, this.input);
  }

  /** On a rope (`$917A`): a new direction turns him, up climbs two pixels, down descends two, anything else is walking off it. */
  private onRope(): void {
    if (this.input !== this.facing) { this.turn(); return; }
    if (this.input === Direction.up) { this.y = wrap(this.y + 2); this.step(1); } else if (this.input === Direction.down) { this.y = wrap(this.y - 2); this.step(1); } else this.walk();
  }

  // ---- the jump ($8A63) ---------------------------------------------------------------------------------------------

  /**
   * One pass of the jump: a pixel sideways the way it started (not for straight up), the arc's next step in y, the footstep and the
   * picture, then what ends every pass (`settle`), then the jump's count (`$8A9A`: after 32 passes the jump is over), then what ends
   * every pass again. (The original *calls* the picture routine, `$8A97`, and that routine ends by jumping to the end of the pass, so
   * the end of the pass returns to the count, which jumps there a second time: the cells are looked at, and he is drawn, twice.)
   * The jump cannot be steered and does not end on landing: he lands on the cell classes (a floor under his feet stops the arc's
   * descent, below).
   */
  private jump(): Ending {
    const dir = this.jumpDir;
    if (dir === 3) this.x = wrap(this.x - 1);
    else if (dir === 4) this.x = wrap(this.x + 1);
    if (this.arc >= JUMP_PASSES) { this.overrun = true; this.endJump(); return this.settle(); }
    const stepY = JUMP_ARC[this.arc] ?? 0;
    this.y = wrap(this.y + stepY);
    if (stepY >= 0) this.pitch = (this.pitch & 0xff00) | wrap(this.pitch + 1); // INC E
    else {
      this.pitch = (this.pitch & 0xff00) | wrap(this.pitch - 1); // DEC E
      this.flags2 |= InAir; // $8A8B
    }
    this.arc++;
    this.jumpFrame(); // $8AD3
    if (this.settle() === 'dead') return 'dead'; // $8B34, returning to $8A9A
    this.jumpCount = (this.jumpCount + 1) & 0x1f;
    if (this.jumpCount === 0) {
      this.jumpDir = 0; // $8AA7: the jump is over
      this.fallen = 0;
      this.arc = 0;
      this.pitch = STEP_PITCH_START;
      this.flags &= ~Flag.jumping;
      this.flags2 &= ~InAir;
    }
    return this.settle(); // $8B34 again
  }

  /** The jump is over now (a scene took him out of it): no direction, the start of the arc, the first pitch. */
  endJump(): void {
    this.jumpDir = 0;
    this.jumpCount = 0;
    this.arc = 0;
    this.pitch = STEP_PITCH_START;
    this.flags &= ~Flag.jumping;
  }

  /** The jump's picture and sound (`$8AD3`): the walk frame on, his sprite from the jump's direction, the rows the move uncovered put back, the tick. */
  private jumpFrame(): void {
    this.walkFrame = (this.walkFrame + 1) & 7;
    this.input = this.jumpDir - 1; // ($832E is set to the jump's direction so the frame address takes its group from it)
    this.frameAddr = frameAddress(this.walkFrame >> 1, MONTY_BASE, this.input);
    restoreRows(this.world.screen, this.world.picture, this.x, wrap(this.y + 2));
    restoreRows(this.world.screen, this.world.picture, this.x, wrap(this.y - 16));
    this.beep(1, this.pitch);
  }

  // ---- falling ($8B1F) ---------------------------------------------------------------------------------------------------

  /** Falling: two pixels a pass, the counter two, and the two rows he has left put back. */
  private fall(): void {
    this.y = wrap(this.y - 2);
    this.fallen = wrap(this.fallen + 2);
    restoreRows(this.world.screen, this.world.picture, this.x, wrap(this.y + 2));
  }

  // ---- the end of every pass ($8B34): cells, landing, limits, drawing -----------------------------------------------------

  private settle(): Ending {
    if (!this.classify()) return 'dead'; // ($8B90: a deadly cell is `JP $946E`)
    if (!(this.flags & Flag.jumping)) { // $8B3A: walking he keeps to odd rows and even columns
      this.y |= 1;
      this.x &= 0xfe;
    }
    // $8B46: what is solid stops the move: a floor (a class 0 or 3 cell) along his top, bottom, left or right edge
    if (this.flags & Flag.up && this.prevY < this.y) this.y = this.prevY;
    else if (this.flags & Flag.down && this.prevY >= this.y) this.y = this.prevY;
    if (this.flags & Flag.left && this.prevX >= this.x) this.x = this.prevX;
    else if (this.flags & Flag.right && this.prevX < this.x) this.x = this.prevX;
    // $8B7B: drawn where he is, and the input byte put back to none
    blit(this.world.screen, this.world.picture, imageAt(this.frameAddr), this.x, this.y);
    this.input = Direction.none;
    return 'alive';
  }

  /**
   * The cells under him (`$8B90`, `$8C3D`): the attribute of the cells along each edge of his box, looked up in the room's four colours
   * (`$8D0F`, `$8D2E`), what is under his feet in the picture, and what that makes him: dead on a deadly cell, landed or falling or neither.
   * Returns false when he is dead.
   */
  private classify(): boolean {
    this.matchCells();
    this.flags &= Flag.jumping | Flag.tool; // ($8B9E: AND $0A)
    const [top, bottom, left, right] = this.cells;
    if (top === MATCH_FLOOR) this.flags |= Flag.up;
    if (bottom === MATCH_FLOOR) this.flags |= Flag.down;
    if (left === MATCH_FLOOR) this.flags |= Flag.left;
    if (right === MATCH_FLOOR) this.flags |= Flag.right;
    if (this.cells.includes(MATCH_DEADLY)) return false;
    if (this.onRopeCell()) this.flags |= Flag.rope;
    // $8BF2: the bytes of the screen in the row below his feet; nothing there and he is not held up
    const columns = (this.x & 7) !== 0 ? 3 : 2;
    const below = this.screenBelow(columns);
    if (below === 0) { // $8B0C
      if (this.flags & (Flag.jumping | Flag.rope)) return true;
      this.flags |= Flag.falling;
      this.flags2 |= InAir;
      return true;
    }
    if (!(this.flags2 & InAir)) return true; // $8C0D
    this.flags2 &= ~InAir; // landing
    this.flags &= ~(Flag.falling | Flag.jumping);
    if (this.fallen >= FATAL_FALL) return false; // $8C1E
    this.fallen = 0;
    this.jumpDir = 0;
    this.jumpCount = 0;
    this.arc = 0;
    this.pitch = STEP_PITCH_START;
    return true;
  }

  /** The room's list index of an attribute, or 4 when it is not in it (`$8D0F`: the first of the four it equals). */
  private matchOf(attr: number): number {
    return this.world.classes.indexOf(attr) >= 0 ? this.world.classes.indexOf(attr) : MATCH_NONE;
  }

  /** The attribute of the cell at a column and a row (counted from the top of the screen), `$5800`. */
  private attrAt(column: number, row: number): number {
    return this.world.attrs[row * 32 + column] ?? 0;
  }

  /**
   * `$8C3D`: for the four edges of his box (rows from `191 - y`, 2 cells high or 3 when he is not on a row of cells; 2 wide or 3), the
   * first cell along the edge, in the order the code scans it, whose colour is one of the room's four. A cell with the third colour
   * counts as floor.
   */
  private matchCells(): void {
    const top = wrap(0xbf - this.y);
    const rows = (top & 7) !== 0 ? 3 : 2;
    const columns = (this.x & 7) !== 0 ? 3 : 2;
    const row0 = top >> 3, col0 = this.x >> 3;
    const along = (count: number, at: (i: number) => number): number => {
      for (let i = 0; i < count; i++) {
        const m = this.matchOf(at(i));
        if (m !== MATCH_NONE) return m;
      }
      return MATCH_NONE;
    };
    this.cells[0] = along(columns, (i) => this.attrAt(col0 + i, row0)); // the top row, left to right ($8D0F)
    this.cells[1] = along(columns, (i) => this.attrAt(col0 + i, row0 + rows - 1)); // the bottom row
    this.cells[2] = along(rows, (i) => this.attrAt(col0, row0 + i)); // the left column, top to bottom ($8D2E)
    this.cells[3] = along(rows, (i) => this.attrAt(col0 + columns - 1, row0 + i)); // the right column
    for (let i = 0; i < 4; i++) if (this.cells[i] === 3) this.cells[i] = MATCH_FLOOR;
  }

  /**
   * `$FEA2`: the rope's colour (the room's third) at the cell 8 pixels in and one pixel below his top (the 8-bit sum `y + 1`, `x + 8`), or at
   * the cell the 16-bit sum `(y, x) + $F108` gives: a row above his bottom (and a carry from the column goes into the row).
   */
  private onRopeCell(): boolean {
    const rope = this.world.classes[MATCH_ROPE];
    const at = (x: number, y: number): number => this.attrAt(x >> 3, 23 - (y >> 3));
    if (at(wrap(this.x + 8), wrap(this.y + 1)) === rope) return true;
    const sum = ((this.y << 8) | this.x) + 0xf108;
    return at(sum & 0xff, (sum >> 8) & 0xff) === rope;
  }

  /** The OR of the screen's bytes in the pixel row below his feet (`$8D5F`: row `y - 16`, from his column). */
  private screenBelow(columns: number): number {
    const at = screenOffset(wrap(this.y - 16)) + (this.x >> 3);
    let bits = 0;
    for (let i = 0; i < columns; i++) bits |= this.world.screen[at + i] ?? 0;
    return bits;
  }

  // ---- touching a sprite ($9298) ---------------------------------------------------------------------------------------------

  /**
   * The check that decides whether he has touched a moving thing: six pixels, each looked at on the screen and in the picture buffer
   * (`$9228`); where they differ, something has been drawn that is not the room. The points are his top left corner, a point above his
   * head, the bottom left and bottom right corners, and one to the left and one to the right of his middle: 16-bit sums of his
   * place with `$0000`, `$010A`, `$F100`, `$F8FF`, `$F810` and `$F10F` (the carry from x goes into y). His own picture must not reach
   * them (a pixel of it left on the screen would kill him), which test/lockstep.ts proves along with everything else.
   */
  touched(): boolean {
    for (const offset of TOUCH_POINTS) {
      const sum = ((this.y << 8) | this.x) + offset;
      if (this.pixelDiffers(sum & 0xff, (sum >> 8) & 0xff)) return true;
    }
    return false;
  }

  /** `$9228`: whether pixel (x, y) differs between the screen and the picture buffer. */
  private pixelDiffers(x: number, y: number): boolean {
    const at = screenOffset(y) + (x >> 3);
    const bit = 0x80 >> (x & 7);
    return ((this.world.screen[at] ?? 0) & bit) !== ((this.world.picture[at] ?? 0) & bit);
  }

  // ---- state ----------------------------------------------------------------------------------------------------------------

  save(w: StateWriter): void {
    w.put(this.x, this.y, this.input, this.frameAddr, this.walkFrame, this.jumpDir, this.arc, this.jumpCount, this.pitch, this.facing, this.flags, this.flags2, this.fallen, this.prevX, this.prevY, ...this.cells);
  }

  load(r: StateReader): void {
    this.x = r.get(); this.y = r.get(); this.input = r.get(); this.frameAddr = r.get(); this.walkFrame = r.get(); this.jumpDir = r.get(); this.arc = r.get();
    this.jumpCount = r.get(); this.pitch = r.get(); this.facing = r.get(); this.flags = r.get(); this.flags2 = r.get(); this.fallen = r.get(); this.prevX = r.get(); this.prevY = r.get();
    for (let i = 0; i < 4; i++) this.cells[i] = r.get();
  }
}
