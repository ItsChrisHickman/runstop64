/**
 * A moment's grace: after OUR front end puts the player back into play (continuing a save, back to
 * room start, arriving from the map, the "no death loops" restart) he can't lose health or a life
 * for a few seconds. Both modes (these resumes are ours, not the original's); no visual cue.
 *
 * One countdown for every game: `ContinueFlow.grace` (started by `resumed`), started by the
 * travel paths too (`start`), counted down once per frame of play (`tick`); a game asks `active`
 * where it would hurt or kill him and doesn't (translated ports through `grace` in `runNative`;
 * Pendragon games' combat cancels the hurt as the invulnerability assist does).
 */

/** 3 seconds of PAL frames. */
export const GRACE_FRAMES = 150;

export class Grace {
  /** Frames left. */
  left = 0;

  start() { this.left = GRACE_FRAMES; }
  /** One frame of play has passed. */
  tick() { if (this.left > 0) this.left--; }
  get active() { return this.left > 0; }
  clear() { this.left = 0; }
}
