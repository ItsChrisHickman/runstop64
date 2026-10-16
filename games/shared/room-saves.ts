import type { ContinueFlow, GameStatus } from './continue';

/**
 * The room-save bookkeeping of a port that saves each room's start: the save of the room the
 * player came into, and a number that is new for each room (ContinueFlow autosaves when it
 * changes). `enter` when a room begins; `clear` when a new game does (nothing is saved of it
 * yet); `status` for the flow; `backToRoomStart` for the pause screen's B.
 */
export class RoomSaves<S> {
  /** The start of the room the player is in, as a save. */
  private save: S | null = null;
  /** A number that is new for each room entered. */
  count = 0;

  /** A room has begun (`save`: its start; none where the game takes its saves when asked, as Antiriad's). */
  enter(save?: S) {
    if (save !== undefined) this.save = save;
    this.count++;
  }

  /** A new game: nothing of it is saved yet. */
  clear() { this.save = null; }

  /** The flow's view of the game: a room to save once there is one, and no save point while a screen holds the game (`inPlay` false). */
  status(onTitle: boolean, inPlay: boolean): GameStatus<S> {
    return { onTitle, room: inPlay && this.save ? this.count : null, save: () => this.save };
  }

  /** Back to how things were on coming into this room (out of a trap the game has no way out of): `resume` carries the game on from the save. */
  backToRoomStart(flow: ContinueFlow<S>, playing: boolean, resume: (s: S) => void) {
    const s = flow.saved();
    if (!s || !playing) return;
    resume(s);
    flow.resumed(s, this.count);
  }
}
