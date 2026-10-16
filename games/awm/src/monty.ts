/**
 * Monty alone: his walking, jumping, falling, the tiles that do something to him, the room exits and
 * his deaths, as the original's logic step does them ($46AD, run 25 times a second).
 *
 * This is the 6502's logic written as the game plays it, in the order it does things, with its
 * addresses in the comments so re/README.md and the listing can be followed side by side. It is not a
 * translation: the state is typed, the probes are functions, and what the 6502 passes in registers and
 * zero-page bytes is passed as arguments. Where the original is odd (a test that can never be true, a
 * flag read after a call has overwritten it) the rebuild is odd the same way, and says so, because the
 * lockstep test (test/lockstep.ts) compares it with the original at every step.
 *
 * Positions are pixels of the 256 x 144 play area (x 0-255, y 0-$8E); Monty's sprite is 16 x 16 with
 * (x, y) its top left. Everything the physics asks about the room goes through `World.look` ($4F38).
 */
import { ARCS } from './data';
import { Dir } from './input';
import { Random } from './rng';
import { BURNABLE, BURNING_CODE, classOfName, isCeiling, isDeadlyCode, isOneWayFloor, sideContact, State } from './tiles';
import type { SoundLog } from './soundlog';
import type { World } from './world';

const add = (a: number, b: number): number => (a + b) & 0xff;

/** The frames of a jump ($51DF): the picture of each of the 24 steps. */
const JUMP_FRAMES = [0xc6, 0xc6, 0xc6, 0xc6, 0xc7, 0xc7, 0xc7, 0xc7, 0xc7, 0xc7, 0xc7, 0xc7, 0xc7, 0xc7, 0xc7, 0xc7, 0xc6, 0xc6, 0xc6, 0xc9, 0xc9, 0xc9, 0x01, 0x01] as const;

/** The pictures of the walk-in (state $11), one for every two steps ($53A3). */
export const INTRO_FRAMES = [
  0x00, 0xc6, 0xc6, 0x00, 0x00, 0xc6, 0xc6, 0xc6, 0x00, 0x00, 0xc6, 0xc6, 0x00, 0xc6, 0xc6, 0xc6, 0x00, 0xc6, 0xc6, 0xc6, 0xca, 0xcb, 0xcc, 0xcd, 0xce, 0xcf, 0xca, 0xcb,
  0xcc, 0xcd, 0xce, 0xcf, 0xca, 0xcb, 0xcc, 0xcd, 0xce, 0xcf, 0x00, 0x01, 0x02, 0x01, 0x00, 0x01, 0x02, 0x01, 0x00, 0x01, 0x02, 0x01, 0x00, 0x01, 0x02, 0x00, 0x00, 0x01,
  0x02, 0x01, 0x00, 0x01, 0x02, 0x01, 0x00, 0x01, 0x02, 0x01, 0x00, 0x01, 0x02, 0x00, 0xca, 0xcb, 0xcc, 0xcd, 0xce, 0xcf, 0xca, 0xcb, 0xcc, 0xcd, 0xce, 0xcf, 0xca, 0xcb,
  0xcc, 0xcd, 0xce, 0xcf, 0x0a, 0x0b, 0x0c, 0x0c, 0x0b, 0x0a, 0x0b, 0x0c, 0xca, 0xcb, 0xcc, 0xcd, 0xce, 0xcf, 0x0b, 0x0a, 0xc6, 0xc6, 0xc6, 0xc6, 0x00,
] as const;

/** What Monty needs of the game round him: the rooms he goes into and the states the scripts drive. */
export interface MontyHost {
  /** He went through an exit into `room`; the game loads it ($5581). */
  enterRoom(room: number): void;
  /** One step of state $10, $11 or $13, which move enemies, rooms and flags as well as him. */
  scripted(): void;
  /** What he asks of the sound drivers. */
  readonly sound: SoundLog;
}

/** Raised to leave the rest of a logic step at once (the original restores the stack: $48FD). */
class LeaveStep {}

/** Where the room exits take him: what the game does when he is past an edge ($4E66). */
type Edge = 'left' | 'right' | 'up' | 'down';

/** The animation counters of his walking pictures ($51DA-$51DD) and the toggle of the Slow state ($51DE). */
export interface Counters {
  /** $51DA: 0-3, the walk cycle's phase. */
  walkPhase: number;
  /** $51DB: the frame of the walk cycle (0, 1, 2, 1). */
  walkFrame: number;
  /** $51DC: flips each time the cycle is asked to move; it moves on every second ask. */
  walkToggle: number;
  /** $51DD: counts down 11..0 for the spring and rope pictures. */
  climbPhase: number;
  /** $51DE: flips every step in the Slow state; he only moves when it is set. */
  slowToggle: number;
}

/** Everything of Monty's the lockstep compares (and a save would keep). */
export interface MontyData {
  x: number;
  y: number;
  state: number;
  step: number;
  /** $4F86: what the sideways probe found at his feet (bit 0 at the feet, bit 1 below them, bit 2 at his head). */
  blocked: number;
  /** $403E: the directions a jump was started with. */
  jumpDir: number;
  /** $4033: the input of this step, or 0 once the walking code has used it. */
  input: number;
  /** $4045/$4046: where he was before this step (a blocked move goes back). */
  prevX: number;
  prevY: number;
  /** $4040, $4041, $4043, $4044: where, and in what state, he came into the room; he starts again here after a death. */
  entryX: number;
  entryY: number;
  entryState: number;
  entryStep: number;
  /** $4047: steps left of a burn. */
  burn: number;
  /** $4048: set when a death is over; the main loop then takes a life. */
  dead: number;
  /** $5C46 and $5C48 bit 7: the picture and whether he faces left. */
  frame: number;
  faceLeft: boolean;
  counters: Counters;
}

export class Monty implements MontyData {
  x = 0x80;
  y = 0x68;
  state: number = State.Free;
  step = 0;
  blocked = 0;
  jumpDir = 0;
  input = 0;
  prevX = 0x80;
  prevY = 0x68;
  entryX = 0x80;
  entryY = 0x68;
  entryState = 0;
  entryStep = 0;
  burn = 0;
  dead = 0;
  frame = 0;
  faceLeft = false;
  counters: Counters = { walkPhase: 0, walkFrame: 0, walkToggle: 0, climbPhase: 5, slowToggle: 0 };
  /** The 8 bytes of character $3F while a tile burns ($39F8): the burnt tile's picture, eaten away by the random numbers. */
  readonly burnPicture = new Uint8Array(8);
  /** What the last look at a cell left in $23: the cell's code when it was $10 or more, else 0. */
  private code = 0;
  /** $405F: the steps of the slide (state $10) once it has reached the floor; the picture changes while it runs. */
  slide = 0;
  /** Set when he went through an exit this step: the room he came into. */
  entered: number | null = null;

  constructor(readonly world: World, readonly rng: Random, private readonly tileGfx: Uint8Array, private readonly host: MontyHost) {}

  /** A look at the room that remembers the cell's code ($4F38 leaves it in $23); returns the name. */
  private look(x: number, y: number): number {
    const l = this.world.look(x, y);
    this.code = l.code;
    return l.name;
  }

  // ---- one logic step ($46AD) -------------------------------------------------------------------

  /** One logic step with the controls in `input` (`Dir` bits). Returns the room he entered, or null. */
  advance(input: number): number | null {
    this.entered = null;
    this.prevX = this.x;
    this.prevY = this.y;
    this.input = input;
    try {
      if (this.state === State.Free) {
        this.step = 0;
        this.walk(input);
      } else this.handler(input);
    } catch (e) {
      if (!(e instanceof LeaveStep)) throw e;
    }
    this.updateFrame();
    this.hazards();
    this.burning();
    this.exits();
    return this.entered;
  }

  /** The per-state handlers ($4A2F table, entered through $4A57). */
  private handler(input: number): void {
    switch (this.state) {
      case State.Jump: return this.jump(this.jumpDir);
      case State.Bounce: // $4BF6
        this.host.sound.effect(0x43);
        this.jumpDir = this.input ^ 3;
        this.state = State.Jump;
        return this.jump(this.jumpDir);
      case State.Spring: return this.spring();
      case State.Zap: // $4D28
        if (this.step === 0) this.host.sound.effect(0x45);
        this.step = add(this.step, 1);
        if (this.step === 0x17) this.dead = this.step;
        return;
      case State.Fire: // $4CED
        if (this.step === 0) this.host.sound.effect(0x47);
        this.step = add(this.step, 1);
        if (this.step === 1) this.putOutFire();
        if (this.step === 0x29) this.dead = this.step;
        return;
      case State.Burn: return this.startBurn();
      case State.Dying: // $4D0E
        if (this.step === 0) this.host.sound.effect(0x42);
        this.step = add(this.step, 1);
        if (this.step === 0x0e) this.dead = this.step;
        return;
      case State.Fall: // $48D9
        this.y = add(this.y, 3);
        if (this.onGround()) {
          this.state = State.Free;
          this.snapAfterLanding();
        }
        return;
      case State.Slip: return this.slip(input);
      case State.Slow: // $4D6A
        this.counters.slowToggle ^= 0xff;
        if (this.counters.slowToggle === 0) return;
        if (this.classBelow() !== State.Slow) this.state = State.Free;
        return this.walk(this.input);
      case State.Stuck: return this.stuck(input);
      case State.Tube: return this.tube(input);
      case State.Kick: // $4D42
        if (this.rng.next() >= 0xe6) {
          this.state = State.Jump;
          this.jumpDir = input;
          return;
        }
        if (this.classBelow() !== State.Kick) this.state = State.Free;
        return this.walk(this.input);
      case State.Knocked: // $4AAF
        if (this.step === 0) this.host.sound.effect(0x47);
        this.step = add(this.step, 1);
        if (this.step >= 0x18) this.dead = 1;
        return;
      case State.Pushed: // $4B91
        this.step = add(this.step, 1);
        if (this.step & 1) this.y = add(this.y, -1);
        this.x = add(this.x, 2);
        return;
      case State.Forced: return this.walk(Dir.Left); // $4A68
      case State.Script10: // $4BA5, $4ACA, $4A6F: the room scripts' and the ending's, which need more than Monty
      case State.Intro:
      case State.Ending: return this.host.scripted();
      default:
        throw new Error(`state $${this.state.toString(16)} is driven by enemies and room scripts (stage 3, 5)`);
    }
  }

  // ---- walking and standing --------------------------------------------------------------------

  /** The controls acted on when he is free on the ground ($46DF). */
  private walk(input: number): void {
    // ($46E6-$46F5 meant to ignore up and down together too, but test the wrong byte: only left and right together do.)
    if (input === 0 || (input & 3) === 3) return this.stand();
    this.input = 0;
    if (input & Dir.Right) this.moveRight();
    if (input & Dir.Left) this.moveLeft();
    this.blocked = 0;
    if (input & Dir.Down) this.moveDown();
    if (input & Dir.Up) this.moveUp();
    if (input & Dir.Fire) this.startJump(input);
  }

  /** No direction: look at what is round him and settle ($481F). */
  private stand(): void {
    const around = this.sideMask();
    if ((around & 3) !== 0) this.blocked = around;
    this.setStateFromClass();
    if (this.blocked === 0) this.snapToRow();
    this.onGround();
  }

  /** $4873. */
  private moveRight(): void {
    this.setStateFromClass();
    if (this.state === State.Free && this.blocked === 0) this.snapToRow();
    this.rightFrom488c();
  }

  /** The part of $4873 the rope walk uses: two pixels right, then the wall and floor probes. */
  private rightFrom488c(): void {
    this.x = add(this.x, 2);
    this.afterSideStep(add(this.x, 0x0c), this.y);
  }

  /** $4847. */
  private moveLeft(): void {
    this.setStateFromClass();
    if (this.state === State.Free && this.blocked === 0) this.snapToRow();
    this.leftFrom4860();
  }

  private leftFrom4860(): void {
    this.x = add(this.x, -2);
    this.afterSideStep(add(this.x, 4), this.y);
  }

  /** A step sideways is undone when a wall is in the way; else the floor is checked ($489C). */
  private afterSideStep(probeX: number, probeY: number): void {
    if (this.probeSide(probeX, probeY).blocked) {
      this.x = this.prevX;
      return;
    }
    this.onGround();
  }

  /** Down: through a one-way floor if one is under him, else just the floor check ($4738). */
  private moveDown(): void {
    const around = this.sideMask();
    if ((around & 2) === 0) {
      this.onGround();
      return;
    }
    this.blocked = around;
    this.y = add(this.y, 2);
    this.state = State.Free;
  }

  /** Up: climb through a one-way floor, if his head is free ($4755). */
  private moveUp(): void {
    this.y = add(this.y, -2);
    const free = this.headFree();
    this.y = this.prevY;
    if (!free) return;
    const around = this.sideMask();
    if (around === 2) return;
    if ((around & 4) === 0 && (around & 1) === 0) return;
    this.blocked = around;
    this.y = add(this.y, -2);
    this.state = State.Free;
  }

  /** Fire: a jump, if his head is free ($4793). On a spring tile it is the spring's jump. */
  private startJump(input: number): void {
    this.y = add(this.y, -2);
    const free = this.headFree();
    this.y = add(this.y, 2);
    if (!free) return;
    this.jumpDir = input;
    this.state = State.Jump;
    this.blocked = 0;
    if (this.classBelow() === State.Spring) this.state = State.Spring;
  }

  /** A row-aligned y when he is on the level ($4880: not in the top row). */
  private snapToRow(): void {
    if (this.y >= 8) this.y &= 0xf8;
  }

  /** After landing: y to a whole row, from the pixels he sank in ($48ED). */
  private snapAfterLanding(): void {
    if (this.y >= 8) this.y = add(this.y, 5) & 0xf8;
  }

  // ---- the probes ------------------------------------------------------------------------------

  /** The state the tile under his feet gives him, 0 for none ($47BE): the cells below his feet at x + 4 and x + 10. */
  private classBelow(): number {
    return this.classAt(this.x, add(this.y, 0x10));
  }

  /** $47C8: the first of the cells at x + 4 and x + 10 on row y that has a class. */
  private classAt(x: number, y: number): number {
    let px = add(x, 4);
    for (let n = 0; n < 2; n++) {
      const c = classOfName(this.look(px, y));
      if (c !== 0) return c;
      px = add(px, 6);
    }
    return 0;
  }

  /** $4A04: the tile under him may put him in a state (not the spring: that waits for the jump). */
  private setStateFromClass(): void {
    const c = this.classBelow();
    if (c !== 0 && c !== State.Spring) this.state = c;
  }

  /** Ground under his feet at x + 4 and x + 10? Falls if not ($48A8). Anything but an empty cell is ground. */
  private onGround(): boolean {
    const y = add(this.y, 0x10);
    let px = add(this.x, 4);
    for (let n = 0; n < 2; n++) {
      if (this.look(px, y) >= 1) return true;
      px = add(px, 6);
    }
    this.state = State.Fall;
    return false;
  }

  /**
   * His head free of a ceiling ($4902)? True when free. A tube tile ($18-$1B) at his head takes him into the
   * tube state instead and ends the step ($48FD).
   */
  private headFree(): boolean {
    if (this.classAt(this.x, this.y) === State.Tube) {
      this.state = State.Tube;
      this.step = State.Tube;
      this.y = add(this.y, 2);
      throw new LeaveStep();
    }
    let px = add(this.x, 4);
    for (let n = 0; n < 2; n++) {
      if (isCeiling(this.look(px, this.y))) return false;
      px = add(px, 6);
    }
    return true;
  }

  /**
   * The sideways probe ($494F): the rows of his body at one x. True when a wall stops him. Names $64-$70
   * also put him in a state; the return carries the register Y the original leaves behind (the state when
   * one was set, else the row where it stopped), which $5226 reads.
   */
  private probeSide(x: number, y: number): { blocked: boolean; y: number } {
    let py = y;
    let rows = (py & 7) !== 0 ? 3 : 2;
    for (;;) {
      const contact = sideContact(this.look(x, py));
      if (contact >= 0) {
        if (contact === 0) return { blocked: true, y: py };
        this.state = contact;
        return { blocked: true, y: contact };
      }
      // ($4966: a cell with code $77, a burning tile, stops him too)
      if (this.code === BURNING_CODE) return { blocked: true, y: py };
      py = add(py, 8);
      if (--rows === 0) return { blocked: false, y: py };
    }
  }

  /** Is a one-way floor ($B4-$D1) in the way at x + 4 or x + 10 on this row ($49D8)? */
  private floorAt(x: number, y: number): boolean {
    let px = add(x, 4);
    for (let n = 0; n < 2; n++) {
      if (isOneWayFloor(this.look(px, y))) return true;
      px = add(px, 6);
    }
    return false;
  }

  /** What one-way floors are at his head (4), his feet (1) and below them (2) ($499A). */
  private sideMask(): number {
    let m = 0;
    if (this.floorAt(this.x, this.y)) m |= 4;
    const feet = add(this.y, 0x0f);
    if (this.floorAt(this.x, feet)) m += 1;
    if (this.floorAt(this.x, add(feet, 2))) m += 2;
    return m;
  }

  // ---- the states ------------------------------------------------------------------------------

  /** A jump: the 24-step arc, with the direction he started it in ($4B26). Also the bounce, which is a jump the other way. */
  private jump(dir: number): void {
    if (dir & Dir.Right) this.moveRight();
    if (dir & Dir.Left) this.moveLeft();
    if (this.state === State.Fall) this.state = State.Jump;
    const dy = ARC_JUMP(this.step);
    this.y = add(this.y, dy);
    if ((dy & 0x80) === 0) {
      this.onGround();
      if (this.state !== State.Fall) {
        this.state = State.Free;
        this.snapAfterLanding();
        return;
      }
    } else if (!this.headFree()) {
      this.step = (0x17 - this.step) & 0xff;
    }
    this.state = State.Jump;
    this.step = add(this.step, 1);
    if (this.step === 0x18) this.state = State.Fall;
  }

  /** The spring ($4C0B): arcs of growing height from index 0 of the arcs; landing on another arc's start goes on. */
  private spring(): void {
    const dy = ARC(this.step);
    const next = ARC(this.step + 1);
    this.y = add(this.y, dy);
    if ((dy & 0x80) === 0) {
      this.onGround();
      // ($4C2D: on the floor it sounds, and when the next of the arc's steps isn't up the voice is cut: $4C36)
      if (this.state !== State.Fall) this.host.sound.effect(0x43);
      if (this.state !== State.Fall && (next & 0x80) === 0) {
        this.host.sound.silence(1);
        this.state = State.Free;
        this.snapToRow();
        return;
      }
    } else if (!this.headFree()) {
      this.state = State.Fall;
      return;
    }
    this.state = State.Spring;
    this.step = add(this.step, 1);
    if (this.step === 0x7b) this.state = State.Free;
  }

  /** Names 1-5: now and then he is thrown sideways for 24 steps ($4D8A). */
  private slip(input: number): void {
    let n = this.step;
    if (n === 0) {
      if (this.rng.next() < 0xf5 || input === 0) {
        this.state = State.Free;
        return this.walk(input);
      }
      this.jumpDir = input;
      this.host.sound.effect(0x4b);
    }
    n = add(n, 1);
    this.step = n;
    // ($4DB2: the original loads the direction into $23, and the move on the right overwrites it with the last
    // cell code it looked at, which is what decides whether the move on the left happens too)
    this.code = this.jumpDir;
    if (this.code & 1) this.rightFrom488c();
    if (this.code & 2) this.leftFrom4860();
    if (this.state === State.Fall) this.step = 0;
    else if (this.step === 0x18) this.step = 0;
  }

  /** Names $16-$17: now and then he is stuck for 32 steps ($4DE1). */
  private stuck(input: number): void {
    let n = this.step;
    if (n === 0 && this.rng.next() < 0xf5) {
      this.state = State.Free;
      return this.walk(input);
    }
    n = add(n, 1);
    this.step = n;
    if (n & 0x20) this.state = State.Free;
  }

  /** A tube: carried along, steered left and right, fire lets go ($4E08). */
  private tube(input: number): void {
    if (this.step === 0) {
      this.step = 1;
      this.y = add(this.y, 0x16);
    }
    const probeY = add(this.y, -2);
    this.y = (probeY & 0xf8) | 6;
    if (this.classAt(this.x, probeY) !== State.Tube) {
      this.state = State.Fall;
      this.step = 0;
      return;
    }
    if (input & Dir.Left) this.x = add(this.x, -2);
    if (input & Dir.Right) this.x = add(this.x, 2);
    if (input & Dir.Fire) {
      this.state = State.Fall;
      this.step = 0;
    }
  }

  /** The burnable tile: his feet set it alight (cell $77, picture in character $3F) and he goes on ($4C83). */
  private startBurn(): void {
    if (this.burn !== 0) {
      this.state = State.Free;
      this.step = 0;
      return this.walk(this.input);
    }
    this.burn = 0x14;
    this.burnPicture.set(this.tileGfx.subarray(BURNABLE * 8, BURNABLE * 8 + 8));
    let px = this.x;
    for (let cols = (this.x & 7) !== 0 ? 3 : 2; cols > 0; cols--) {
      let py = this.y;
      for (let rows = 0; rows < 3; rows++) {
        if (this.look(px, py) === BURNABLE) this.world.put(px, py, BURNING_CODE);
        py = add(py, 8);
      }
      px = add(px, 8);
    }
    this.state = State.Free;
  }

  /**
   * Touching name $6F ($5226, on the first step of the state): he is out of it again unless the tile is still
   * at his side. It then clears the $6F tiles of the leftmost column round the row it ended on (the register
   * it clears at is 0, not his x: the original does that).
   */
  private putOutFire(): void {
    this.state = State.Free;
    let r = this.probeSide(add(this.x, 2), this.y);
    if (this.state !== State.Fire) r = this.probeSide(add(this.x, 0x0e), this.y);
    const start = r.y;
    this.world.put(0, start, 0);
    for (let py = add(start, -8); this.look(0, py) === 0x6f; py = add(py, -8)) this.world.put(0, py, 0);
    for (let py = add(start, 8); this.look(0, py) === 0x6f; py = add(py, 8)) this.world.put(0, py, 0);
  }

  // ---- what happens whatever state he is in ----------------------------------------------------

  /** Animated tiles kill: any of his four corners in one ($5005). Not while dying, not in the lower half of the byte range. */
  private hazards(): void {
    if (this.y & 0x80 || this.state === State.Dying) return;
    const x = this.x, y = this.y;
    const corners: readonly (readonly [number, number])[] = [[x, y], [x, add(y, 0x0f)], [add(x, 0x0f), add(y, 0x0f)], [add(x, 0x0f), y]];
    for (const [cx, cy] of corners) {
      this.look(cx, cy);
      // (a code of $6D or more ends the checks, whether it kills or not: $77, a burning tile, doesn't)
      if (this.code >= 0x6d) {
        if (isDeadlyCode(this.code)) {
          this.state = State.Dying;
          this.step = 0;
        }
        return;
      }
    }
  }

  /** The burn runs down: the burnt picture crumbles; at the end every burning cell goes ($5312). */
  private burning(): void {
    if (this.burn === 0) return;
    for (let i = 7; i >= 0; i--) {
      const a = this.rng.next();
      const b = this.rng.next();
      this.burnPicture[i] = (this.burnPicture[i] ?? 0) & (a | b);
    }
    this.burn = add(this.burn, -1);
    if (this.burn !== 0) return;
    const cells = this.world.cells;
    for (let i = 0; i < cells.length; i++) if (cells[i] === BURNING_CODE) cells[i] = 0;
  }

  /** Past an edge of the room he goes into the room next to it, if there is one ($4E66). */
  private exits(): void {
    if (this.x < 4) this.leave('left');
    else if (this.x >= 0xec) this.leave('right');
    else if (this.y < 4 || this.y >= 0xf0) this.leave('up');
    else if (this.y >= 0x7e) this.leave('down');
  }

  private leave(edge: Edge): void {
    if (edge === 'down') this.y = 6;
    const room = this.world.neighbour(edge);
    if (this.world.isNoRoom(room)) {
      this.x = this.prevX;
      this.y = this.prevY;
      return;
    }
    this.world.stepGrid(edge);
    if (edge === 'left') this.x = 0xea;
    else if (edge === 'right') this.x = 6;
    else if (edge === 'up') this.y = 0x78;
    this.entryX = this.x;
    this.entryY = this.y;
    this.entryState = this.state;
    this.entryStep = this.step;
    this.host.enterRoom(room);
    this.entered = room;
  }

  /** After a death: back where he came into the room, in the state he came in ($5538). */
  respawn(): void {
    this.x = this.entryX;
    this.y = this.entryY;
    this.state = this.entryState;
    this.step = this.entryStep;
    this.dead = 0;
    this.blocked = 0;
  }

  // ---- his picture ($50D5) ---------------------------------------------------------------------

  private advanceWalk(): number {
    const c = this.counters;
    c.walkToggle ^= 0xff;
    if (c.walkToggle === 0) return c.walkFrame;
    c.walkPhase = (c.walkPhase + 1) & 3;
    c.walkFrame = c.walkPhase === 3 ? 1 : c.walkPhase;
    return c.walkFrame;
  }

  /** The count-down of the spring and rope pictures ($508C: 11, 10 ... 0, 11). */
  private climbFrame(): number {
    const c = this.counters;
    c.climbPhase = (c.climbPhase - 1) & 0xff;
    if (c.climbPhase & 0x80) c.climbPhase = 0x0b;
    return c.climbPhase >> 1;
  }

  /** The sprite frame and which way he faces, from where he moved and the state he is in. */
  private updateFrame(): void {
    if (this.state === State.Intro) return this.setFrame(INTRO_FRAMES[this.step >> 1] ?? 0); // $5394
    if (this.x !== this.prevX) this.faceLeft = this.prevX > this.x;
    let base = 0, part = 0;
    const s = this.step;
    switch (this.state) {
      case State.Jump: part = JUMP_FRAMES[s] ?? 0; break;
      case State.Zap:
        part = (s >> 2) & 7;
        base = 0x4c;
        if (part >= 3) { base = 0; part = 0xdf; }
        break;
      case State.Spring: part = this.climbFrame(); base = 0x0d; break;
      case State.Slip:
        if (s === 0) return this.setFrame(this.idleFrame(0));
        part = this.climbFrame();
        base = 0xca;
        break;
      case State.Stuck:
        if (s === 0) return this.setFrame(this.idleFrame(0));
        part = (s >> 1) & 1;
        base = 0xb3;
        break;
      case State.Dying:
        part = (s >> 1) & 7;
        base = 0xaf;
        if (part >= 4) { base = 0; part = 0xdf; }
        break;
      case State.Knocked:
        if (s >= 8) { base = 0x0c; part = 0; } else { base = 9; part = s >> 1; }
        break;
      case State.Fire: part = 0xae; break;
      case State.Pushed: return;
      case State.Script10: return this.setFrame(this.slide !== 0 ? 0x87 : 0x83 + this.advanceWalk()); // $5379
      case State.Ending: return this.setFrame(0xd2 + this.advanceWalk()); // $506D
      default: {
        let b = 0;
        if (this.state === State.Tube) b = 0x13;
        if (this.state === State.Slow) b = 6;
        if ((this.blocked & 3) === 3) b = 3;
        return this.setFrame(this.idleFrame(b));
      }
    }
    this.setFrame(base + part);
  }

  /** The walking pictures: the cycle moves on when he moved ($5157). */
  private idleFrame(base: number): number {
    const moved = this.x !== this.prevX || this.y !== this.prevY;
    return base + (moved ? this.advanceWalk() : this.counters.walkFrame);
  }

  private setFrame(frame: number): void {
    this.frame = frame & 0xff;
  }
}

/** One entry of the arcs ($4F8A on); the spring looks one past the table's end, at $5005: the first byte ($AD) of the routine that follows. */
const ARC = (i: number): number => ARCS[i] ?? 0xad;
/** The jump's arc starts at index $2B ($4FB5). */
const ARC_JUMP = (step: number): number => ARC(0x2b + step);
