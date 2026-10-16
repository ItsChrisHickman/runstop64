/**
 * The four enemies of a room: their records, how each type moves and animates, and the random numbers
 * they use ($5E03 loads them on entering a room, $5ED0 moves them every logic step through the handler
 * of their type, table $5F24).
 *
 * An enemy is a 13-byte record at $5C4C + 13 x slot, of which the game reads these:
 *
 *   +0 x, +1 y (pixels of the play area), +2 colour, +7 the sprite frame shown, +8 the type (0 = nothing
 *   happens, but the frame still shows: it is the frame that says what touching it does), +9 the signed
 *   speed, +10 a counter, +11 a control byte (bits 6-7: how the frame is animated; the low bits: a reload
 *   or the number of a frame sequence), +12 the base frame the animation adds to.
 *
 * (+3 to +6 are never used.) Types 1-9 are what the room tables hold; 10-17 are the states some of them
 * go through (a type 7 "shooter" becomes 14, then runs a frame sequence; the record after it is its
 * projectile). A shooter or the record a projectile is made in is always the *next* record, so a
 * shooter in the last slot would write into the code that follows the table: no room has one, and
 * `next` throws if one ever did.
 */
import { ENEMY_COLOURS, ENEMY_ROOMS } from './data';
import type { Random } from './rng';

export const SLOTS = 4;
const REC = 13;

/** Offsets in a record. */
const X = 0, Y = 1, COLOUR = 2, FRAME = 7, TYPE = 8, SPEED = 9, COUNTER = 10, CONTROL = 11, BASE = 12;

/** The type of an enemy while it does something else: the types a room table cannot hold. */
export const Kind = {
  Patrol: 1, Climb: 2, Bob: 3, Wave: 4, Walk: 5, Return: 6, Shooter: 7, Thrower: 8, Idle: 9,
  Sequence: 10, Fall: 11, Missile: 12, Walked: 13, Shot: 14, Threw: 15, Dropping: 16, Back: 17,
} as const;

/** The vertical wobble of type 3 and the sideways wobble of type 4 ($5FBB). */
export const WOBBLE = [0xf9, 0xfb, 0xfc, 0xfd, 0xfe, 0xfe, 0xff, 0x00, 0x00, 0x01, 0x02, 0x02, 0x03, 0x04, 0x05, 0x07] as const;
/** What a falling projectile (type 11 then 16) adds to y each step ($60E8). */
export const DROP = [0x00, 0x00, 0x01, 0x02, 0x02, 0x03, 0x07, 0x0a, 0x0f, 0xf7, 0xfe, 0xff, 0x01, 0x02, 0x09, 0x00] as const;
/**
 * The frame sequences of type 10 ($615E: 16 pointers into $617E-$61C0). `0xFE` goes back to the start,
 * `0xDF` hides the enemy (type 0, frame $DF); the last ten are just the hiding frame.
 */
export const SEQUENCES: readonly (readonly number[])[] = [
  [0x6f, 0x70, 0x71, 0x72, 0x73, 0x74, 0x75, 0x76, 0xfe],
  [0x46, 0x47, 0x48, 0x49, 0x49, 0x49, 0x49, 0x49, 0x49, 0x4b, 0x4a, 0x49, 0x48, 0x47, 0x46, 0xdf],
  [0x62, 0x62, 0x62, 0x62, 0x63, 0x63, 0x63, 0x63, 0x63, 0x63, 0x63, 0xdf],
  [0x64, 0x64, 0x64, 0x64, 0x64, 0x64, 0x65, 0x66, 0x67, 0x67, 0x67, 0x67, 0x67, 0xdf],
  [0x37, 0x38, 0x39, 0x38, 0xfe],
  [0xdf], [0xdf], [0xdf], [0xdf], [0xdf], [0xdf], [0xdf], [0xdf], [0xdf], [0xdf], [0xdf],
];

/** A frame that is hidden: touching it does nothing. */
export const HIDDEN = 0xdf;

const add = (a: number, b: number): number => (a + b) & 0xff;
const neg = (a: number): number => (-a) & 0xff;

/** The animation clock all enemies share ($5ECA-$5ECC, $5ECF); it moves on every second logic step. */
export interface AnimClock {
  /** $5ECA: 0-3. */
  phase: number;
  /** $5ECB: the frame offset of the walk cycle, 1 2 1 0 (phase 3 shows 1). */
  frame: number;
  /** $5ECC: flips each time the clock moves on (frame offset for the two-frame animation). */
  flip: number;
  /** $5ECF: flips every logic step ($FF/$00); the clock moves when it becomes $FF. */
  toggle: number;
}

export class Enemies {
  /** The four records, 13 bytes each, from $5C4C. */
  readonly bytes = new Uint8Array(SLOTS * REC);
  readonly clock: AnimClock = { phase: 0, frame: 0, flip: 0, toggle: 0xff };

  /** The tables are the game's ($703F, $3400); a test may hand in others (emptied, to take the enemies out). */
  constructor(private readonly table: Uint8Array = ENEMY_ROOMS, private readonly colours: Uint8Array = ENEMY_COLOURS) {}

  // ---- the record's fields ---------------------------------------------------------------------

  private get(slot: number, field: number): number {
    return this.bytes[slot * REC + field] ?? 0;
  }

  private put(slot: number, field: number, v: number): void {
    this.bytes[slot * REC + field] = v & 0xff;
  }

  x(slot: number): number { return this.get(slot, X); }
  y(slot: number): number { return this.get(slot, Y); }
  frame(slot: number): number { return this.get(slot, FRAME); }
  kind(slot: number): number { return this.get(slot, TYPE); }
  colour(slot: number): number { return this.get(slot, COLOUR); }
  /** The sign of the speed: the enemy goes left, and its picture is drawn as the frames are ($66CA reads it at $5C48 + 13 x slot; one going right is mirrored). */
  facesLeft(slot: number): boolean { return (this.get(slot, SPEED) & 0x80) !== 0; }
  setX(slot: number, v: number): void { this.put(slot, X, v); }
  setY(slot: number, v: number): void { this.put(slot, Y, v); }
  setFrame(slot: number, v: number): void { this.put(slot, FRAME, v); }
  setKind(slot: number, v: number): void { this.put(slot, TYPE, v); }

  /** The slot after `slot`, where a shooter makes its projectile. */
  private next(slot: number): number {
    if (slot + 1 >= SLOTS) throw new Error('an enemy in the last slot would write past the records (into code)');
    return slot + 1;
  }

  // ---- entering a room ($5E03) ------------------------------------------------------------------

  /** Load the room's four enemies from the tables ($703F, 4 bytes each; colours at $3400). */
  load(room: number): void {
    for (let e = 0; e < SLOTS; e++) {
      const at = room * 16 + e * 4;
      const b0 = this.table[at] ?? 0, b1 = this.table[at + 1] ?? 0, b2 = this.table[at + 2] ?? 0, b3 = this.table[at + 3] ?? 0;
      this.put(e, COUNTER, 0);
      this.put(e, Y, (b0 & 0x0f) << 3);
      this.put(e, X, b0 & 0xf0);
      const kind = b1 & 0x0f;
      this.put(e, TYPE, kind);
      const speed = (b1 & 0x70) >> 4;
      this.put(e, SPEED, b1 & 0x80 ? neg(speed) : speed);
      this.put(e, CONTROL, b2);
      this.put(e, BASE, b3);
      this.put(e, FRAME, b3);
      // the counter a type starts with: types 0-2 the low bits of the control byte, 3 and 4 none, 5-9 thirty,
      // 11 the whole control byte, 10 and 12-15 none
      if (kind < 3) this.put(e, COUNTER, b2 & 0x3f);
      else if (kind >= 5 && kind < 10) this.put(e, COUNTER, 0x1e);
      else if (kind === 11) this.put(e, COUNTER, b2);
      this.put(e, COLOUR, this.colours[room * 4 + e] ?? 0);
    }
  }

  // ---- one logic step ($5ED0) -------------------------------------------------------------------

  step(rng: Random): void {
    const c = this.clock;
    c.toggle ^= 0xff;
    if (c.toggle !== 0) {
      c.phase = (c.phase + 1) & 3;
      c.frame = c.phase === 3 ? 1 : c.phase;
      c.flip ^= 1;
    }
    for (let e = 0; e < SLOTS; e++) {
      const kind = this.kind(e);
      if (kind !== 0) this.handle(e, kind, rng);
    }
  }

  /** The handler of a type ($5F24). */
  private handle(e: number, kind: number, rng: Random): void {
    switch (kind) {
      case Kind.Patrol: // $5F46: along x, turning when the counter runs out
        this.animate(e);
        this.setX(e, add(this.x(e), this.get(e, SPEED)));
        return this.turn(e);
      case Kind.Climb: // $5F6C: along y
        this.animate(e);
        this.setY(e, add(this.y(e), this.get(e, SPEED)));
        return this.turn(e);
      case Kind.Bob: { // $5F7C: along x, turning when the counter reaches the control byte (all of it), bobbing in y
        this.put(e, X, this.x(e) + this.get(e, SPEED));
        this.put(e, COUNTER, this.get(e, COUNTER) + 1);
        if (this.get(e, COUNTER) === this.get(e, CONTROL)) {
          this.reverse(e);
          this.put(e, COUNTER, 0);
        }
        let a = this.get(e, COUNTER);
        if (this.get(e, CONTROL) < 0x20) a += 8;
        this.setY(e, add(this.y(e), WOBBLE[a & 15] ?? 0));
        return this.showCycle(e);
      }
      case Kind.Wave: { // $5FCB: along y, wobbling in x on a 16-step beat (the counter's low nibble)
        this.setY(e, add(this.y(e), this.get(e, SPEED)));
        this.put(e, COUNTER, this.get(e, COUNTER) + 1);
        const beat = this.get(e, COUNTER) & 0x0f;
        if (beat === 0) this.reverse(e);
        const wobble = WOBBLE[beat] ?? 0;
        this.setX(e, this.get(e, SPEED) & 0x80 ? add(this.x(e), -wobble) : add(this.x(e), wobble));
        return this.showCycle(e);
      }
      case Kind.Walk: // $6012: walks until the counter runs out, then plays frame sequence
        if (this.move(e)) this.setKind(e, Kind.Sequence);
        return;
      case Kind.Return: // $6056: walks, then a sequence, then back the other way
        if (!this.move(e)) return;
        this.setKind(e, Kind.Walked);
        this.sequence(e);
        if (this.kind(e) !== 0) return;
        return this.walkBack(e);
      case Kind.Shooter: // $608B: walks; its projectile record stays hidden
        this.setFrame(this.next(e), HIDDEN);
        if (!this.move(e)) return;
        this.setKind(e, Kind.Shot);
        return this.shoot(e, rng);
      case Kind.Thrower: // $60F8: walks, then throws
        this.setFrame(this.next(e), HIDDEN);
        if (!this.move(e)) return;
        this.setKind(e, Kind.Threw);
        return this.throwIt(e, rng);
      case Kind.Idle: return; // $615D: an rts
      case Kind.Sequence: return this.sequence(e);
      case Kind.Fall: // $60C3: waits for its counter, then falls
        this.put(e, COUNTER, this.get(e, COUNTER) - 1);
        if (this.get(e, COUNTER) !== 0) return;
        this.setKind(e, Kind.Dropping);
        return this.drop(e);
      case Kind.Missile: // $6144: flies on until it is off the right edge (or the left: x wraps past $F0)
        this.setX(e, this.x(e) + this.get(e, SPEED));
        if (this.x(e) >= 0xf0) {
          this.setKind(e, 0);
          this.setFrame(e, HIDDEN);
        }
        return;
      case Kind.Walked: // $6060: the sequence after a walk, then back
        this.sequence(e);
        if (this.kind(e) !== 0) return;
        return this.walkBack(e);
      case Kind.Shot: // $609A
        return this.shoot(e, rng);
      case Kind.Threw: // $6107
        return this.throwIt(e, rng);
      case Kind.Dropping: return this.drop(e); // $60CD
      case Kind.Back: // $607B: walks back, then gone
        if (this.move(e)) {
          this.setKind(e, 0);
          this.setFrame(e, HIDDEN);
        }
        return;
      default:
        throw new Error(`enemy type ${kind}`);
    }
  }

  // ---- pieces the handlers share ----------------------------------------------------------------

  /** $5F60: turn round (the speed's sign flips). */
  private reverse(e: number): void {
    this.put(e, SPEED, neg(this.get(e, SPEED)));
  }

  /** $5F53: count down; at zero reload from the control byte's low bits and turn. */
  private turn(e: number): void {
    this.put(e, COUNTER, this.get(e, COUNTER) - 1);
    if (this.get(e, COUNTER) !== 0) return;
    this.put(e, COUNTER, this.get(e, CONTROL) & 0x3f);
    this.reverse(e);
  }

  /** $5FB0: the frame is the base plus the walk cycle's offset. */
  private showCycle(e: number): void {
    this.setFrame(e, this.clock.frame + this.get(e, BASE));
  }

  /** $61C1: the control byte's bits 6-7 pick an animation: none, the two-frame flip, or the walk cycle. */
  private animate(e: number): void {
    const mode = this.get(e, CONTROL) & 0xc0;
    if (mode === 0) return;
    this.setFrame(e, (mode === 0x40 ? this.clock.flip : this.clock.frame) + this.get(e, BASE));
  }

  /** $6001: step along x, show the walk cycle, count down; true when the counter reached zero. */
  private move(e: number): boolean {
    this.setX(e, this.x(e) + this.get(e, SPEED));
    this.showCycle(e);
    this.put(e, COUNTER, this.get(e, COUNTER) - 1);
    return this.get(e, COUNTER) === 0;
  }

  /** $601D: play the frame sequence the control byte's low nibble names, one frame on every second step. */
  private sequence(e: number): void {
    for (;;) {
      if (this.clock.toggle === 0) return;
      const seq = SEQUENCES[this.get(e, CONTROL) & 0x0f] ?? [HIDDEN];
      const at = this.get(e, COUNTER);
      this.put(e, COUNTER, at + 1);
      const frame = seq[at] ?? 0;
      this.setFrame(e, frame);
      if (frame === 0xfe) {
        this.put(e, COUNTER, 0);
        continue;
      }
      if (frame === HIDDEN) this.setKind(e, 0);
      return;
    }
  }

  /** $6068: after a sequence, turn round and walk 30 steps back as type 17. */
  private walkBack(e: number): void {
    this.setFrame(e, this.get(e, BASE));
    this.reverse(e);
    this.put(e, COUNTER, 0x1e);
    this.setKind(e, Kind.Back);
    if (this.move(e)) {
      this.setKind(e, 0);
      this.setFrame(e, HIDDEN);
    }
  }

  /** $609A: a shooter plays its sequence, then its next record becomes a falling projectile at the left or right edge. */
  private shoot(e: number, rng: Random): void {
    this.sequence(e);
    if (this.kind(e) !== 0) return;
    this.setFrame(e, this.get(e, BASE));
    const n = this.next(e);
    this.setX(n, rng.next() & 1 ? 0xc8 : 0x28);
    this.setKind(n, Kind.Fall);
    this.setFrame(n, this.get(n, BASE));
  }

  /** $6107: a thrower plays its sequence, then either plays another one or throws a missile from where it stands. */
  private throwIt(e: number, rng: Random): void {
    this.sequence(e);
    if (this.kind(e) !== 0) return;
    this.setFrame(e, this.get(e, BASE));
    if (rng.next() & 1) {
      this.setKind(e, Kind.Sequence);
      this.put(e, CONTROL, 3);
      this.put(e, COUNTER, 0);
      return;
    }
    const n = this.next(e);
    this.setKind(n, Kind.Missile);
    this.setFrame(n, this.get(n, BASE));
    this.setX(n, this.x(e));
    this.setY(n, this.y(e));
  }

  /** $60CD: a falling projectile; the counter counts the steps along `DROP`; at 16 it is gone. */
  private drop(e: number): void {
    this.put(e, COUNTER, this.get(e, COUNTER) + 1);
    let at = this.get(e, COUNTER);
    if (at === 0x10) {
      this.setKind(e, 0);
      at = 0; // (the accumulator is zero here: the entry at $60E8 is what is added)
    }
    this.setY(e, this.y(e) + (DROP[at] ?? 0));
  }
}
