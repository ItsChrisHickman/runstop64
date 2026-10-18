import { Narrator, type StatusLine } from '../../shared/native/narrate';
import { pendragonCode } from '../../shared/pendragon/status';
import { LINES, type Say } from './hint-lines';
import { LAST_HOUR, MODE, PIECES, KEPT, carrying, deposited, hourOn, over, staffUp } from './hints';

/**
 * The hints' story (ENHANCED): Pendragon says on the status line what to do with what he has found, in the
 * game's own lettering and place (games/shared/native/narrate.ts; the words are in src/hint-lines.ts), and
 * the sparkles (src/hints.ts) point. All from what the game keeps (src/hints.ts `KEPT`): a piece taken, a
 * piece laid, the sixteenth, the clock. Nothing here touches what the game does: it reads memory and writes the
 * status line's text.
 */

/**
 * Where the game keeps its own message: row 22 of the panel, 28 characters from $0775 (SEARCHING, PIECE OF
 * PENTACLE FOUND, CARRYING PIECE OF PENTACLE...), drawn once from a table by $6A21: `$3231` is the message to
 * draw (the next frame), `$3232` is 1 while a message of the moment is up (240 frames after a piece is found
 * or laid, $3233 counting them down), and `$3234` the one it goes back to. So the game's own message is
 * never covered while one is to be drawn or up, and `restore` has it drawn again.
 */
export const STATUS: StatusLine = {
  at: 0x0775,
  width: 28,
  busy: (ram) => ram[0x3231] !== 0 || ram[0x3232] === 1 || ram[0x3234] === 6,
  code: pendragonCode,
  blank: 0x20,
  restore: (ram) => { ram[0x3231] = ram[0x3234]; },
};

/** What is noted of the game each frame, to see what changed. */
interface Snap { carrying: boolean; count: number; hour: number; mode: number }

const snapshot = (ram: Uint8Array): Snap => ({ carrying: carrying(ram), count: deposited(ram), hour: hourOn(ram), mode: ram[KEPT.mode] });

export class Guide {
  readonly narrator = new Narrator(STATUS);
  private ram: Uint8Array | null = null;
  private prev: Snap | null = null;
  /** The hour's warning said (until the clock is back before it: a new game). */
  private late = false;

  /** One frame of play (call after the game's frame): `on` while the hints are on and the game is being played. */
  frame(ram: Uint8Array, on: boolean) {
    if (!on || over(ram)) { this.narrator.frame(ram, false); this.prev = null; return; }
    const now = snapshot(ram);
    if (!this.prev || this.ram !== ram) {
      // a new game, a save continued, back to the room start, the map's travel: begin again here
      this.ram = ram;
      this.narrator.reset(ram);
      this.begin(ram, now);
    } else this.changes(ram, this.prev, now);
    this.prev = now;
    this.narrator.frame(ram, true);
  }

  /** Say it while `still` holds (when it comes to the front of what is waiting). */
  private say(texts: Say, still: () => boolean) { this.narrator.say(texts, still); }

  /** Where he is in the story, said as it stands (the first frame seen). */
  private begin(ram: Uint8Array, now: Snap) {
    if (now.hour >= LAST_HOUR) this.warn(ram, now);
    else if (now.hour < LAST_HOUR) this.late = false; // (not NaN: the panel being drawn)
    if (staffUp(ram)) this.say(LINES.staff, () => staffUp(ram));
    else if (now.carrying) this.say(now.count === 0 ? LINES.first : LINES.later, () => carrying(ram));
  }

  private warn(ram: Uint8Array, now: Snap) {
    if (this.late) return;
    this.late = true;
    this.say(LINES.late(Math.min(now.count, PIECES)), () => !over(ram));
  }

  /** What changed since the last frame. */
  private changes(ram: Uint8Array, prev: Snap, now: Snap) {
    if (now.carrying && !prev.carrying) this.say(now.count === 0 ? LINES.first : LINES.later, () => carrying(ram));
    if (now.count > prev.count) {
      if (now.count === PIECES) this.say(LINES.staff, () => staffUp(ram));
      else if (now.count < PIECES) this.say(LINES.laid(now.count), () => !over(ram));
    }
    if (now.mode !== prev.mode && now.carrying) {
      if (now.mode === MODE.dungeons) this.say(LINES.dungeons, () => carrying(ram) && ram[KEPT.mode] === MODE.dungeons);
      if (now.mode === MODE.abode) this.say(LINES.abode, () => carrying(ram) && ram[KEPT.mode] === MODE.abode);
    }
    if (now.hour >= LAST_HOUR && prev.hour < LAST_HOUR) this.warn(ram, now);
  }
}
