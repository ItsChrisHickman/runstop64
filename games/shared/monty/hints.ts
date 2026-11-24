/**
 * Our item hints for the Monty games on Monty on the Run's engine: a line in the row where the place's name stands, in the
 * game's lettering, for a few seconds, then the name is back. A thing picked up that something wants says what it is for; a
 * room that wants a thing he is not carrying says so (after the name has had its moment). Auf Wiedersehen Monty's hints
 * (games/awm/src/hints.ts) say the same on its panel; the engines and the rows differ, so each game has its own clock.
 *
 * The state is plain data (a game is copied by structured clone): the game says what happened (`say`), calls `step` once a
 * frame, and draws `lineOf` (the name when it is null) whenever `step` or `say` says the line changed.
 */

/** How long a hint stays (4 seconds at 50 frames a second). */
export const HINT_FRAMES = 200;
/** How long a room's name has to itself before a hint about the room comes (2 seconds). */
export const NAME_FRAMES = 100;

export interface HintState { text: string | null; wait: number; left: number }

export const noHint = (): HintState => ({ text: null, wait: 0, left: 0 });

/** A line to show after `after` frames. */
export function say(h: HintState, text: string, after = 0): void {
  h.text = text;
  h.wait = after;
  h.left = HINT_FRAMES;
}

/** The line on show now, or null (the name is). */
export const lineOf = (h: HintState): string | null => (h.text !== null && h.wait === 0 ? h.text : null);

/** One frame; true when what `lineOf` gives changed (the row is to be drawn again). */
export function step(h: HintState): boolean {
  if (h.text === null) return false;
  if (h.wait > 0) return --h.wait === 0;
  if (--h.left > 0) return false;
  h.text = null;
  return true;
}
