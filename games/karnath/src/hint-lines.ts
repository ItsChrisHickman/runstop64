/**
 * What Pendragon says on the status line in ENHANCED's hints (src/guide.ts says which when;
 * games/shared/native/narrate.ts shows it). Every word is here, so the wording can change without touching
 * the logic.
 *
 * The status line's lettering is A-Z, 0-9, a space and a colon (games/shared/pendragon/status.ts): no
 * apostrophe (KARNS), no comma, no full stop. A full stop ends a sentence: sentences that fit the line
 * together (28 letters) are shown together with a gap between, the others one after the other; a longer
 * one is shown in parts, cut at its words.
 *
 * The keys are this port's: 1-9 and 0 pick the spells (BARACATA is the seventh, MENHIR the fifth); on a
 * phone the SPELL button moves on to the next, and the name shows on the panel as the game shows it.
 */

/** A line, or lines said one after the other. */
export type Say = string | readonly string[];

export interface Lines {
  /** The first piece taken: where it goes and how. */
  first: Say;
  /** A later piece taken. */
  later: Say;
  /** A piece laid: `n` of sixteen. */
  laid(n: number): string;
  /** The sixteenth laid: the staff is in its shrine. */
  staff: Say;
  /** Coming into the dungeons or the abode with a piece. */
  dungeons: string;
  abode: string;
  /** The castle's clock at 11 PM: `n` pieces laid. */
  late(n: number): Say;
}

export const LINES: Lines = {
  first: ['IT BELONGS IN KARNS ABODE', 'BELOW: THE DUNGEONS FAR DOOR', 'THE OBELISK STANDS FAR LEFT', 'CAST BARACATA AT IT: KEY 7'],
  later: ['THE OBELISK AGAIN', 'CAST BARACATA: KEY 7'],
  laid: (n) => `${n} OF 16 PIECES LAID`,
  staff: ['THE STAFF IS IN ITS SHRINE', 'CAST MENHIR AT IT: KEY 5', 'ANY OTHER SPELL IS DEATH'],
  dungeons: 'FAR DOOR AT THE RIGHT END',
  abode: 'THE OBELISK IS FAR LEFT',
  late: (n) => ['ONE HOUR TO MIDNIGHT', `${n} OF 16 PIECES LAID`],
};
