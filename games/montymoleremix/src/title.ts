import { hexBytes } from 'c64kit';
import raw from '../../montyotr/src/data/motr.json';
import { Title, type TitleGame, type TitlePage } from '../../montyotr/src/title';
import { COAL_FLAGS } from '../../montymole/src/data';
import { ROOMS } from '../../montymole/src/data/rooms-data';
import { COAL_TOTAL } from '../../montymole/src/coal-rules';
import { ROW, SCREEN } from '../../shared/monty/screen';
import { C64_OF } from './retile';
import { POSTER_PICTURE, type PictureChar } from './title-picture';

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

/**
 * What the title has of Wanted's own where Monty on the Run's has its freedom kit and a page of its box: the loot. Under the table, where the kit
 * stood, a row of Wanted's own piece of coal (the lump of room 0, one of Monty on the Run's characters redefined as it) flickering through
 * the colours as it does in the rooms; and a page after the scores in the box, the poster: WANTED: MONTY MOLE, what for, and how much (the
 * inlay's own words for the raid, and the game's own numbers: 21 rooms, 64 pieces, their worth added up).
 */
const COAL_CHAR = 0x02;
/** The coal's row (23: under the table, between its pillars, columns 11 to 29 every other one). */
const COAL_ROW = 23, COAL_FROM = 11, COAL_COUNT = 10;
const COAL_WORTH = COAL_FLAGS.reduce((n, f) => n + (f & 0x7f), 0);
const codeOf = (c: string): number => (c === ' ' ? 0x60 : (c.charCodeAt(0) & 0x3f) | 0x40);
/**
 * The poster (28 columns, six rows): the words at the left, twelve letters wide, and Wanted at the right, a picture of sixteen characters by six (title-picture.ts: the pit
 * head, the shed, Monty and a bucket with two lumps of coal). The picture's characters are the free ones of Monty on the Run's set (`PICTURE_CHARS`), each in its own colour.
 */
const WORDS = 12;
const WORDS_OF = [
  { text: 'WANTED:', colour: 7 },
  { text: 'MONTY MOLE', colour: 7 },
  { text: 'A COAL RAID', colour: 1 },
  { text: `${ROOMS.length} ROOMS`, colour: 3 },
  { text: `${COAL_TOTAL} PIECES`, colour: 5 },
  { text: `${COAL_WORTH} POINTS`, colour: 7 },
] as const;
/** The characters the picture draws with: blank in Monty on the Run's set, and none of them the scroller's ($F0 and over). */
const PICTURE_CHARS: readonly number[] = Array.from({ length: 0xcc - 0x9b + 1 }, (_, i) => 0x9b + i);
/** The picture's different characters, by the look they have, and the code of each (made once). */
const keyOf = (cell: PictureChar): string => `${cell.colour}:${cell.rows.join(',')}`;
const PICTURE_CODES = new Map<string, { code: number; cell: PictureChar }>();
for (const cell of POSTER_PICTURE.flat()) {
  if (cell === 'coal' || PICTURE_CODES.has(keyOf(cell))) continue;
  const code = PICTURE_CHARS[PICTURE_CODES.size];
  if (code === undefined) throw new Error('the poster picture needs more characters than Monty on the Run leaves free');
  PICTURE_CODES.set(keyOf(cell), { code, cell });
}
const codeOfCell = (cell: PictureChar): number => {
  const made = PICTURE_CODES.get(keyOf(cell));
  if (made === undefined) throw new Error('a character of the poster picture was not made');
  return made.code;
};
const POSTER: TitlePage = {
  rows: WORDS_OF.map((w, r) => {
    const picture = POSTER_PICTURE[r] ?? [];
    const codes = [...w.text.padEnd(WORDS)].map(codeOf).concat(picture.map((cell) => (cell === 'coal' ? COAL_CHAR : codeOfCell(cell))));
    const colours = [...Array<number>(WORDS).fill(w.colour), ...picture.map((cell) => (cell === 'coal' ? 7 : cell.colour))];
    return { codes, colour: w.colour, colours };
  }),
};

/** Monty on the Run's title with Wanted's loot in it (above). */
class RemixTitle extends Title {
  private tick = 0;

  constructor(private readonly screen: TitleGame, sound: RemixTitleSound) {
    super(screen, sound, { kit: [], message: REMIX_MESSAGE, page: POSTER });
  }

  override start(): void {
    super.start();
    const nugget = ROOMS[0]?.nugget ?? [];
    this.screen.mem.set(nugget, COAL_CHAR * 8);
    for (const { code, cell } of PICTURE_CODES.values()) this.screen.mem.set(cell.rows, code * 8);
    for (let i = 0; i < COAL_COUNT; i++) this.screen.mem[SCREEN + COAL_ROW * ROW + COAL_FROM + 2 * i] = COAL_CHAR;
    this.tick = 0;
    this.flicker();
  }

  override frame(input: { up: boolean; fire: boolean }): 'start' | null {
    this.tick++;
    this.flicker();
    return super.frame(input);
  }

  /** The coal through the colours as in the rooms (`$95E8`: one step a pass, 25 a second), each piece a step on from the one before. */
  private flicker(): void {
    const { mem, col } = this.screen;
    for (let i = 0; i < COAL_COUNT; i++) col[COAL_ROW * ROW + COAL_FROM + 2 * i] = C64_OF[((this.tick >> 1) + i) & 7] ?? 1;
    // (the poster's coal, in the box, the same)
    for (let r = 10; r < 16; r++) for (let x = 0; x < 28; x++) if (mem[SCREEN + r * ROW + 6 + x] === COAL_CHAR) col[r * ROW + 6 + x] = C64_OF[((this.tick >> 1) + x) & 7] ?? 1;
  }
}

/** Monty on the Run's title with the remix's logo and Wanted's loot. */
export function remixTitle(g: TitleGame, sound: RemixTitleSound): Title {
  return new RemixTitle(g, sound);
}
