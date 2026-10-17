/**
 * The energy gauge (`$810D`): a time limit for the room. Full is $7F on entering a room; it loses one on some passes (the
 * room's mask on the pass counter, `$A2A2 + room`: every 8th pass; room 2 every 2nd unless its script holds it, `$9904`) and when
 * a hazard drains it (`$956D`). Below zero the game kills Monty. Eight pictures: `value AND $F0`.
 */
export const GAUGE_FULL = 0x7f;

/** The mask of the pass counter for rooms 0-5: the gauge drains when the counter ANDed with it is 0 (`$A2A2`). */
const MASKS = [7, 7, 0x1f, 7, 7, 7] as const;

export class Gauge {
  value = GAUGE_FULL;

  refill(): void { this.value = GAUGE_FULL; }

  /** One step down (`$8542`); the byte wraps, so 0 goes to $FF, which is negative. */
  drain(): void { this.value = (this.value - 1) & 0xff; }

  /** Gone below zero: time is up. */
  get empty(): boolean { return (this.value & 0x80) !== 0; }

  /** Which of the 8 pictures to show, 0 (empty) to 7 (full). */
  get level(): number { return (this.value & 0xf0) >> 4; }
}

/**
 * Whether this pass drains the gauge (`$822C`-`$8251`): `counter` is the pass counter after its increment (`$A2A0`, a byte).
 * Room 2 looks at the counter's low bit and a flag its script keeps; the others at the room's mask.
 */
export function drainsOnPass(room: number, counter: number, room2Hold: boolean): boolean {
  if (room === 2) return (counter & 1) === 0 && !room2Hold;
  const mask = MASKS[room];
  if (mask === undefined) throw new Error(`room ${room} has no gauge mask`);
  return (counter & mask) === 0;
}
