/**
 * The lifts: platforms that grow up out of the floor and sink back again, and kill Monty if they
 * catch him as they grow. Eleven rooms have one (table $852C, 4 bytes each: room, height in
 * characters, and the position of its foot as a cell number in two bytes).
 *
 * The lift is not part of the room's cells: the main loop draws it into the screen ($83EE, in both its
 * phases, so twice a logic step) and Monty never stands on it; it only matters here as the thing that
 * moves ($83EE's counters) and the rule that kills ($8558). What it looks like is the picture's (stage 4).
 */
import type { Random } from './rng';

/** One entry of the table at $852C. */
export interface LiftSite {
  readonly room: number;
  /** Characters tall when fully out ($8389). */
  readonly height: number;
  /** The cell the foot stands in, column in the low 5 bits ($8387, $8388). */
  readonly cell: number;
}

/** The eleven lifts, in the table's order. */
export const LIFT_SITES: readonly LiftSite[] = [
  { room: 0x41, height: 0x0a, cell: 0x150 }, { room: 0x3b, height: 0x0c, cell: 0x036 }, { room: 0x34, height: 0x1e, cell: 0x02b },
  { room: 0x1e, height: 0x0a, cell: 0x03a }, { room: 0x10, height: 0x0a, cell: 0x0fa }, { room: 0x03, height: 0x0c, cell: 0x0f4 },
  { room: 0x0e, height: 0x12, cell: 0x04c }, { room: 0x07, height: 0x08, cell: 0x18f }, { room: 0x40, height: 0x06, cell: 0x031 },
  { room: 0x37, height: 0x08, cell: 0x10c }, { room: 0x3d, height: 0x0c, cell: 0x0ba },
];

/** What `hit` needs from Monty: the lift is the one thing that can put him in the state an enemy would. */
export interface LiftTarget {
  x: number;
  y: number;
}

export class Lift {
  constructor(private readonly sites: readonly LiftSite[] = LIFT_SITES) {}

  /** The site of the room, or null (the pointer at $3F/$40 is zero). */
  site: LiftSite | null = null;
  /** $8385: how far out it is; bit 7 set while it sinks back. */
  phase = 0;
  /** $8386: counts frames down to the next move (1 = every frame). */
  delay = 1;
  /** $3F/$40: where the foot is in the screen (the screen's address; kept to compare, nothing uses it but the drawing). */
  pointer = 0;

  /** $838A: set up the lift of the room Monty comes into, if it has one. */
  enter(room: number): void {
    this.pointer = 0;
    const site = this.sites.find((s) => s.room === room);
    this.site = site ?? null;
    if (!site) return;
    this.phase = 0;
    this.delay = 1;
    // the foot's address in the screen: $0400 + 40 x row + column + 4 ($83A7-$83EB, done with the 6502's carries)
    const lo = site.cell & 0xff, hi = site.cell >> 8;
    let a = lo & 0xe0, z25 = hi, carry = 0;
    for (let i = 0; i < 2; i++) {
      carry = z25 & 1;
      z25 >>= 1;
      const out = a & 1;
      a = (a >> 1) | (carry << 7);
      carry = out;
    }
    let sum = a + (lo & 0xe0) + carry;
    z25 = sum & 0xff;
    carry = sum >> 8;
    sum = 4 + hi + carry;
    const z26 = sum & 0xff;
    carry = sum >> 8;
    sum = (lo & 0x1f) + z25 + carry;
    carry = sum >> 8;
    sum = (sum & 0xff) + 4 + carry;
    const low = sum & 0xff;
    carry = sum >> 8;
    this.pointer = low | (((z26 + carry) & 0xff) << 8);
  }

  /**
   * $83EE, run in each of the main loop's two phases: the lift grows a step, waits, sinks and waits.
   * Returns whether it moved this time (the original then draws it again; while it waits it does not).
   */
  tick(rng: Random): boolean {
    const site = this.site;
    if (!site || this.pointer === 0) return false;
    this.delay = (this.delay - 1) & 0xff;
    if (this.delay !== 0) return false;
    this.delay = 1;
    if ((this.phase & 0x80) === 0) {
      this.phase = (this.phase + 1) & 0xff;
      if (site.height < this.phase) this.phase |= 0x80;
      return true;
    }
    this.phase = (this.phase - 1) & 0xff;
    if ((this.phase & 0x80) === 0) {
      // it is down: rest for a while
      this.phase = 0;
      this.delay = ((rng.next() & 0x7f) + 1) & 0xff;
    }
    return true;
  }

  /** How many half characters long the lift is drawn after a move ($1F at $8495): its phase, 1 once it has just come down. */
  get drawnLength(): number {
    return this.phase === 0 ? 1 : this.phase & 0x7f;
  }

  /** $8558: does the growing lift catch Monty? Only while it grows (bit 7 clear). */
  catches(t: LiftTarget): boolean {
    const site = this.site;
    if (!site || (this.phase & 0x80) !== 0 || this.pointer === 0) return false;
    const dx = (((site.cell & 0x1f) << 3) - t.x + 0x12) & 0xff;
    if (dx >= 0x1e) return false;
    // (the foot's y is the cell number / 4: the row x 8 plus the column / 4)
    const foot = (site.cell >> 2) & 0xff;
    let reach = this.phase;
    if (reach !== 0 && reach !== 1) reach -= 2;
    const dy = (((reach << 2) & 0xff) + foot - t.y + 2) & 0xff;
    return dy < 0x0c;
  }
}
