import { ROW, SCREEN, type Rows } from '../../shared/monty/screen';
import type { MontyData, TallySpec } from './montydata';

/**
 * The Spy vs Spy tally (a game's `tally`: Do Svidaniya Monty's; docs/dosvidaniya-flight.md), in the score row's centre where Monty on the Run has his head and the lives, columns 15-21 of the two rows:
 *
 *     [Monty] * * * [Viktor]       Monty's face, a star a round (grey until it is settled, then in the colour of who won it), the villain's face (dark while he is away, lit while he is due);
 *     [ face]  5    [ face ]       under the stars, in HARD, the lives (EASY has none to count).
 *
 * Presentation only: what it shows is read from the finds and the pursuers each frame.
 */

/** The screen offsets: Monty's face (top left), the first star, the villain's face (top left), the lives under the middle star. */
const HERO = 15, STARS = 17, VILLAIN = 20, LIVES = ROW + 18;
/** Monty's head in the charset (the score row's own, Monty on the Run's: four characters from here) and its colour there. */
const HEAD = 0x3d, HEAD_COLOUR = 8;
/** The score row's blank. */
const BLANK = 0x60;

/** Who has won each round so far (null: not settled), in the data's order. */
export function rounds(data: MontyData, found: ArrayLike<number>): ('hero' | 'villain' | null)[] {
  return (data.tally?.rounds ?? []).map((r) => (found[r.find] ? r.winner : null));
}

/** A number for what the tally shows (a bit a settled round, and the villain's face lit): it is drawn again when this changes. Allocation-free, for every frame. */
export function tallyKey(t: TallySpec, found: ArrayLike<number>, due: boolean): number {
  let key = due ? 1 : 0;
  t.rounds.forEach((r, i) => { if (found[r.find]) key |= 2 << i; });
  return key;
}

/** The score so far, hero first. */
export function score(data: MontyData, found: ArrayLike<number>): { hero: number; villain: number } {
  const won = rounds(data, found);
  return { hero: won.filter((w) => w === 'hero').length, villain: won.filter((w) => w === 'villain').length };
}

/** Draw the tally's characters and colours: the faces, the stars as the finds have them, and the lives under them (null: none shown). */
export function drawTally(s: Rows, t: TallySpec, won: readonly ('hero' | 'villain' | null)[], lives: number | null, due: boolean) {
  [HERO, HERO + 1, ROW + HERO, ROW + HERO + 1].forEach((at, i) => { s.mem[SCREEN + at] = HEAD + i; s.col[at] = HEAD_COLOUR; });
  [VILLAIN, VILLAIN + 1, ROW + VILLAIN, ROW + VILLAIN + 1].forEach((at, i) => { s.mem[SCREEN + at] = t.face + i; });
  for (let i = 0; i < 3; i++) {
    const w = won[i] ?? null;
    s.mem[SCREEN + STARS + i] = t.star;
    s.col[STARS + i] = w === 'hero' ? t.colours.hero : w === 'villain' ? t.colours.villain : t.colours.open;
  }
  for (let c = 0; c < 3; c++) s.mem[SCREEN + ROW + STARS + c] = BLANK;
  if (lives !== null) {
    s.mem[SCREEN + LIVES] = ((Math.min(9, Math.max(0, lives)) + 0x30) & 0x3f) | 0x70;
    s.col[LIVES] = HEAD_COLOUR;
  }
  lightFace(s, t, due);
}

/** The villain's face lit (he is due: in this room, or about to be) or dark. */
export function lightFace(s: Rows, t: TallySpec, due: boolean) {
  for (const at of [VILLAIN, VILLAIN + 1, ROW + VILLAIN, ROW + VILLAIN + 1]) s.col[at] = due ? t.colours.villain : t.colours.away;
}
