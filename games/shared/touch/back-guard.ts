/**
 * The backstop for the phone's back gesture. A page can't block the OS gesture when it begins at the screen edge
 * (the touch layer keeps its controls clear of both side edges, `EDGE_GUARD`), so when a back navigation still happens
 * during play it must not throw the player out of the game: the first tap or key of play pushes a guard history entry
 * (Chrome only counts entries made after a user gesture), and going back from it lands here. Back once opens the pause
 * screen (the guard goes in again); back again, from the pause screen, leaves for the directory. Pure decisions, so they
 * can be tested headless; the shell carries them out.
 */

/** The state of the history entry pushed when play starts. */
export const PLAY_ENTRY = { runstop64: 'play' } as const;

export function isPlayEntry(state: unknown): boolean {
  return typeof state === 'object' && state !== null && 'runstop64' in state && state.runstop64 === PLAY_ENTRY.runstop64;
}

export type BackAction =
  /** Not in a game (or the address was edited to another page): restart cleanly, as RUN/STOP + RESTORE does. */
  | 'reload'
  /** Forward onto the guard entry again: nothing to do. */
  | 'ignore'
  /** "Back to the menu?" is asked: close it, stay in the game. */
  | 'close-ask'
  /** Open the pause screen and put the guard back (if the game can't pause now, leave). */
  | 'pause'
  /** Already paused: leave for the directory. */
  | 'leave';

export interface BackState {
  /** The running game's id, or null on the directory and the saved games. */
  game: string | null;
  /** The entry landed on: its state, and its hash without the `#`. */
  state: unknown;
  hash: string;
  asking: boolean;
  paused: boolean;
}

export function decideBack(s: BackState): BackAction {
  if (s.game === null || s.hash !== s.game) return 'reload';
  if (isPlayEntry(s.state)) return 'ignore';
  if (s.asking) return 'close-ask';
  return s.paused ? 'leave' : 'pause';
}
