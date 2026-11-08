import { hexBytes } from 'c64kit';
import raw from '../../montyotr/src/data/motr.json';
import { Title, type TitleGame } from '../../montyotr/src/title';

/**
 * The remix's title: Monty on the Run's own title screen (its scroller in the big lettering, the rolling box of high scores, the
 * purple table: `games/montyotr/src/title.ts`, one owner), with the logo it says now and the credits of both games. No kit stands under the
 * table (there is none here), so the rows over it are free for ENTER CONTINUE as in Monty on the Run.
 *
 * The scroller reads a stream (the original's control codes: `$FE` colour, `$FD` the way it goes (`$81` leftwards, whose text is
 * written backwards), `$FC` how fast, `$FB` and `$FA` the rows wipe up or down, `$F9` a pause, `$FF` the end, back to the start). The
 * logo is four passages: WANTED:, MONTY, MOLE, REMIX, wiped in turn up and down as Monty on the Run's MONTY, ON, THE RUN ! are; then
 * the credits.
 */

const COLOUR = 0xfe, SPEED = 0xfc, WAY = 0xfd, UP = 0xfb, DOWN = 0xfa, PAUSE = 0xf9, END = 0xff;
const LEFT = 0x81;
const codes = (text: string): number[] => [...text].map((c) => c.charCodeAt(0));
const backwards = (text: string): string => [...text].reverse().join('');
const spaces = (n: number): string => ' '.repeat(n);

/** A passage of the logo: the colour, how fast and which way it goes, the word with the spaces that put it in the middle, and how it leaves. */
function passage(colour: number, speed: number, left: boolean, word: string, lead: number, trail: number): number[] {
  const text = left ? spaces(trail) + backwards(word) + spaces(lead) : spaces(lead) + word + spaces(trail);
  return [COLOUR, colour, SPEED, speed, WAY, left ? LEFT : 0, ...codes(text)];
}

/** The credits that follow the logo: both games' makers, as the info sheet has them, and the tribute. */
const CREDITS: (string | number[])[] = [
  [COLOUR, 1], 'WANTED: MONTY MOLE, 1984, ', [COLOUR, 7], 'PETER HARRAP. ',
  [COLOUR, 1], 'MONTY MOLE BY ', [COLOUR, 13], 'IAN STEWART. ',
  [COLOUR, 1], 'MONTY ON THE RUN, 1985, ', [COLOUR, 7], 'PETER HARRAP. ',
  [COLOUR, 1], 'GRAPHICS BY ', [COLOUR, 13], 'MARK RODGERS. ',
  [COLOUR, 1], 'MUSIC BY ', [COLOUR, 14], 'ROB HUBBARD. ',
  [COLOUR, 1], 'A REMIX AND A TRIBUTE: ', [COLOUR, 10], 'RUNSTOP64.          ',
];

/** The scroller's stream. */
export const REMIX_MESSAGE: Uint8Array = (() => {
  const original = hexBytes(raw.title.message);
  // (it begins as Monty on the Run's does: the same lead-in, a screen's worth of spaces before the first word)
  const out: number[] = [
    ...passage(2, 4, false, 'WANTED:', 9, 2), PAUSE, 100, UP, PAUSE, 50,
    ...passage(8, 2, true, 'MONTY', 4, 4), PAUSE, 100, DOWN, PAUSE, 90,
    ...passage(7, 4, false, 'MOLE', 9, 2), PAUSE, 100, UP, PAUSE, 50,
    ...passage(5, 8, false, 'REMIX', 5, 1), PAUSE, 241, SPEED, 3, ...codes(spaces(11)),
    ...CREDITS.flatMap((c) => (typeof c === 'string' ? codes(c) : c)),
    PAUSE, 128, COLOUR, 1, SPEED, 1, WAY, LEFT, ...codes(backwards('GOOD LUCK!')), ...codes(spaces(13)), END,
  ];
  // (the original's own last passage, GOOD LUCK! written backwards, is the model: it is a stream of ours, but check it still has the same shape)
  if (original.length === 0) throw new Error('no title stream in the data');
  return Uint8Array.from(out);
})();

/** The title sound: the music and its switch (the game gives them). */
export interface RemixTitleSound { song(n: number): void; stop(): void; musicOn(): boolean }

/** Monty on the Run's title with the remix's logo and no kit. */
export function remixTitle(g: TitleGame, sound: RemixTitleSound): Title {
  return new Title(g, sound, { kit: [], message: REMIX_MESSAGE });
}
