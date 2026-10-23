/**
 * What every game's ending says and keeps, written once: the credit lines' timing constants, the port's own lines, and the
 * flag that a game has been won (kept apart from the saves, so a new game never wipes it).
 */

/**
 * The frames each credit line is given (it types on a letter a frame, is held, and goes a moment before the next), the row it stands at
 * by default, its colour, the column it starts at and the letters it can have.
 */
export const CREDIT = { slot: 90, gap: 10, row: 166, colour: 7, x: 8, letters: 38 } as const;

/** The port's own credit lines, the same in every game (his name as he gives it): a game's last scenes spread these. */
export const PORT_CREDITS: readonly string[] = ['REBUILT FOR THE BROWSER BY', 'CHRISTOPHER HICKMAN', 'WITH CLAUDE (ANTHROPIC)', 'RUNSTOP64'];

// ---- won: kept apart from the saves (a new game never wipes it) --------------------------------

const wonKey = (id: string) => `${id}.won`;

/** Whether this game has been won here before. */
export function readWon(id: string): boolean {
  try { return localStorage.getItem(wonKey(id)) === '1'; } catch { return false; }
}

/** The game has been won: kept. */
export function keepWon(id: string) {
  try { localStorage.setItem(wonKey(id), '1'); } catch { /* not kept: the ending is still shown this time */ }
}

/** `?ending` on the page: the ending at once (for review). */
export function wantsEnding(): boolean {
  try { return new URLSearchParams(location.search).has('ending'); } catch { return false; }
}
