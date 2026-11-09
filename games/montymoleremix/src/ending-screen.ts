import { ENDING_VERSE } from '../../montymole/src/data';
import { ROW, SCREEN } from '../../shared/monty/screen';
import type { RemixGame } from './game';

/**
 * The game's own ending, as Wanted has it (`$CAD1`): the screen cleared, the score left in its row, and the verse typed a letter at a time in the bottom
 * row, the whole text moving up a row after each line (and a blank one after every fourth), in cyan, then a wait for a key. Wanted draws it a pixel line
 * at a time on the Spectrum's bitmap; here it is the C64's characters, a row at a time, in Monty on the Run's lettering.
 */
export const VERSE_ROW = 23, FIRST_ROW = 2, LEFT = 6;
/** Frames a letter takes to come, the pause at the end of a line, a row's scroll, and the wait at the end for a key (Wanted's `$F853`: 255 turns of two `HALT`s). */
export const LETTER_FRAMES = 2, LINE_PAUSE = 10, SCROLL_FRAMES = 6, WAIT_FRAMES = 510;
/** The fewest frames after the verse before a key counts. */
const KEY_AFTER = 60;
const CYAN = 3;

const codeOf = (c: string): number => (c === ' ' ? 0x60 : (c.charCodeAt(0) & 0x3f) | 0x40);

type Phase = 'typing' | 'pause' | 'scroll' | 'wait';

export class EndingScreen {
  private line = 0;
  private column = 0;
  private phase: Phase = 'typing';
  private count = 0;
  private scrolls = 0;
  private waited = 0;

  constructor(private readonly g: RemixGame) {}

  /** The verse as lines (the original's last is an empty one: the text ends). */
  static readonly lines: readonly string[] = ENDING_VERSE.filter((l) => l !== '');

  /** Begin: everything but the score row cleared, no sprite shown. */
  start(): void {
    const g = this.g;
    g.vic.enable = 0;
    g.enable = 0;
    g.mem.fill(0, SCREEN + FIRST_ROW * ROW, SCREEN + 25 * ROW);
    g.col.fill(CYAN, FIRST_ROW * ROW, 25 * ROW);
    this.line = 0; this.column = 0; this.phase = 'typing'; this.count = 0; this.scrolls = 0; this.waited = 0;
  }

  /** The verse as it is on the screen now, a line a string (for the tests). */
  text(): string[] {
    const out: string[] = [];
    for (let r = FIRST_ROW; r <= VERSE_ROW; r++) {
      let s = '';
      for (let c = LEFT; c < 38; c++) {
        const code = this.g.mem[SCREEN + r * ROW + c] ?? 0;
        s += code === 0 || code === 0x60 ? ' ' : String.fromCharCode(((code & 0x3f) >= 0x30 ? code & 0x3f : (code & 0x3f) + 0x40) & 0x7f);
      }
      out.push(s.trimEnd());
    }
    return out;
  }

  /** One frame (50 a second): 'done' when the verse has been typed and a key was pressed (or the wait is over). */
  frame(fire: boolean): 'going' | 'done' {
    switch (this.phase) {
      case 'typing': {
        const text = EndingScreen.lines[this.line] ?? '';
        if (++this.count < LETTER_FRAMES) return 'going';
        this.count = 0;
        if (this.column < text.length) {
          const at = SCREEN + VERSE_ROW * ROW + LEFT + this.column;
          this.g.mem[at] = codeOf(text[this.column] ?? ' ');
          this.g.col[VERSE_ROW * ROW + LEFT + this.column] = CYAN;
          this.column++;
        } else {
          this.phase = this.line + 1 >= EndingScreen.lines.length ? 'wait' : 'pause';
        }
        return 'going';
      }
      case 'pause':
        if (++this.count < LINE_PAUSE) return 'going';
        this.count = 0;
        // (a row up for the line, and one more blank row after every fourth)
        this.scrolls = (this.line + 1) % 4 === 0 ? 2 : 1;
        this.phase = 'scroll';
        return 'going';
      case 'scroll':
        if (++this.count < SCROLL_FRAMES) return 'going';
        this.count = 0;
        this.scrollUp();
        if (--this.scrolls > 0) return 'going';
        this.line++;
        this.column = 0;
        this.phase = 'typing';
        return 'going';
      case 'wait':
        this.waited++;
        return this.waited >= WAIT_FRAMES || (fire && this.waited > KEY_AFTER) ? 'done' : 'going';
    }
  }

  /** The text a row up (characters and colours), the bottom row cleared. */
  private scrollUp(): void {
    const g = this.g;
    const from = SCREEN + (FIRST_ROW + 1) * ROW, to = SCREEN + FIRST_ROW * ROW;
    g.mem.copyWithin(to, from, SCREEN + (VERSE_ROW + 1) * ROW);
    g.mem.fill(0, SCREEN + VERSE_ROW * ROW, SCREEN + (VERSE_ROW + 1) * ROW);
  }
}
