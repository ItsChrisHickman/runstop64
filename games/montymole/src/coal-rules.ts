/**
 * The coal's pieces apart from how they are drawn: 64 in the whole game (five a room at most), each with a flag byte (`$964D + id`): bit 7 says the
 * piece is still there, the low 7 bits are what it scores (the bytes are leftovers of the programmer's assembler source, which is why some are worth 65
 * and 90). How many have been taken is what the four gates read. src/coal.ts draws them on the Spectrum's screen; the remix (games/montymoleremix) draws
 * them as coins.
 */
import { COAL_COUNT, COAL_FLAGS } from './data';
import { ROOMS } from './data/rooms-data';
import type { StateReader, StateWriter, Stateful } from '../../shared/state';

export const STILL_THERE = 0x80;

export class CoalTally implements Stateful {
  /** the flag bytes: a new game starts them as the tape has them with every bit 7 set (what the opening scene does) */
  readonly flags: number[] = Array.from(COAL_FLAGS, (f) => f | STILL_THERE);

  /** A new game: every piece there. */
  reset(): void { this.flags.splice(0, this.flags.length, ...Array.from(COAL_FLAGS, (f) => f | STILL_THERE)); }

  /** How many pieces have been taken (the flags with bit 7 clear). */
  get taken(): number { return this.flags.filter((f) => (f & STILL_THERE) === 0).length; }

  /** Whether a piece is still there. */
  isThere(id: number): boolean { return ((this.flags[id] ?? 0) & STILL_THERE) !== 0; }

  /** A piece is taken: what it scores. */
  take(id: number): number {
    this.flags[id] = (this.flags[id] ?? 0) & ~STILL_THERE;
    return (this.flags[id] ?? 0) & 0x7f;
  }

  save(w: StateWriter): void { w.put(...this.flags); }

  load(r: StateReader): void {
    for (let i = 0; i < COAL_COUNT; i++) this.flags[i] = r.get();
  }
}

/** The ids of the coal pieces a room has (the one owner of that list: the map, the bot, the reward and the remix use it). */
export function piecesOfRoom(room: number): readonly number[] {
  return (ROOMS[room]?.coal ?? []).filter((c) => c.col !== 0 || c.row !== 0).map((c) => c.id);
}
export const COAL_IN: readonly number[] = ROOMS.map((_, room) => piecesOfRoom(room).length);
export const COAL_TOTAL = COAL_IN.reduce((a, b) => a + b, 0);
