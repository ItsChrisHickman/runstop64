/**
 * A narrator for a game's status line: lines of text put on the line the game keeps for its own
 * messages, in the game's own lettering (its screen codes), one part at a time, each shown long
 * enough to read. Games declare the line (`StatusLine`) and what to say; this does the rest:
 *
 *  - text is cleaned to what the game's lettering has (`StatusLine.code`: a letter it has no
 *    glyph for is left out), a full stop ends a sentence (the lettering has none: a sentence
 *    that doesn't fit with the next one starts a new part), a comma is left out;
 *  - a text longer than the line is shown in parts (`partsOf`), cut at words and balanced;
 *  - the game's own message is never covered (`StatusLine.busy`): what's queued waits for it to
 *    go, then goes on (a part that was showing when the game's message came is shown again);
 *  - when nothing is left to say, the game's own line is put back (`StatusLine.restore`).
 *
 * Presentation only: the text goes into screen memory, never anywhere the game reads back.
 */

/** The game's status line, as far as a narrator needs to know. */
export interface StatusLine {
  /** Where the text starts in screen memory, and how many characters fit. */
  at: number;
  width: number;
  /** The game's own message is on the line (or about to be): never covered. */
  busy(ram: Uint8Array): boolean;
  /** The game's screen code for a letter (null: its lettering has none). */
  code(ch: string): number | null;
  /** The code the game fills the rest of the line with. */
  blank: number;
  /** The game puts its own line back. */
  restore(ram: Uint8Array): void;
}

/** How long a part is shown (frames at the game's 50 a second): a moment to start, then the time to read it. */
const holdFrames = (text: string) => 90 + 4 * text.length;

/** Text as a status line can show it: upper case, one space between words, nothing the lettering lacks. */
export function clean(text: string, line: Pick<StatusLine, 'code'>) {
  let t = '';
  for (const ch of text.toUpperCase()) t += ch === ' ' || line.code(ch) !== null ? ch : ' ';
  return t.replace(/\s+/g, ' ').trim();
}

/** The sentences of a text (cut at full stops, question and exclamation marks; commas left out). */
export function sentences(text: string, line: Pick<StatusLine, 'code'>) {
  return text.replace(/,/g, '').split(/[.!?]+/).map((s) => clean(s, line)).filter((s) => s.length > 0);
}

/** One text cut into `n` lines of at most `width` characters at its spaces, as even as it can be (null: a word won't fit). */
function balanced(words: string[], width: number, n: number): string[] | null {
  const len = (a: number, b: number) => words.slice(a, b).join(' ').length;
  const target = len(0, words.length) / n;
  const best: { cost: number; cuts: number[] }[][] = Array.from({ length: n + 1 }, () => []);
  best[0][0] = { cost: 0, cuts: [] };
  for (let k = 1; k <= n; k++) for (let b = 1; b <= words.length; b++) {
    let top: { cost: number; cuts: number[] } | undefined;
    for (let a = k - 1; a < b; a++) {
      const prev = best[k - 1][a];
      if (!prev || len(a, b) > width) continue;
      const off = len(a, b) - target, cost = prev.cost + off * off;
      if (!top || cost < top.cost) top = { cost, cuts: [...prev.cuts, a] };
    }
    if (top) best[k][b] = top;
  }
  const done = best[n][words.length];
  if (!done) return null;
  return done.cuts.map((a, i) => words.slice(a, done.cuts[i + 1] ?? words.length).join(' '));
}

/** A sentence in as few even lines as fit the width (a word longer than the line is cut). */
export function wrap(sentence: string, width: number): string[] {
  if (sentence.length <= width) return [sentence];
  const words = sentence.split(' ').flatMap((w) => (w.length <= width ? [w] : (w.match(new RegExp(`.{1,${width}}`, 'g')) ?? [w])));
  for (let n = Math.ceil(sentence.length / width); n <= words.length; n++) {
    const lines = balanced(words, width, n);
    if (lines) return lines;
  }
  return words;
}

/**
 * The parts a text is shown in: sentences that fit together on a line (a gap of two spaces between
 * them, where the full stop was) share one part, the others each take parts of their own.
 */
export function partsOf(text: string, line: Pick<StatusLine, 'code' | 'width'>): string[] {
  const parts: string[] = [];
  let open = '';
  for (const s of sentences(text, line)) {
    if (open && open.length + 2 + s.length <= line.width) { open += `  ${s}`; continue; }
    if (open) parts.push(open);
    const lines = wrap(s, line.width);
    parts.push(...lines.slice(0, -1));
    open = lines[lines.length - 1];
  }
  if (open) parts.push(open);
  return parts;
}

/** A thing to say: its parts, and a test that it is still worth saying when its turn comes. */
interface Item { parts: string[]; until?: () => boolean }

/** The most that waits: the oldest go when more come (the story moves on faster than it can be told). */
const QUEUE = 4;

export class Narrator {
  private queue: Item[] = [];
  private current: { part: string; left: number; item: Item } | null = null;
  /** What's on the line now (drawn by us), for tests and stills. */
  private drawn: string | null = null;
  /** Frames since something was last said or queued. */
  idle = 0;

  constructor(private readonly line: StatusLine) {}

  /** Say it: the text (or texts, one after the other), after what's being said. `until`: not wanted any more when it comes to the front (he's gone from the room it was about). */
  say(texts: string | readonly string[], until?: () => boolean) {
    for (const text of typeof texts === 'string' ? [texts] : texts) {
      const parts = partsOf(text, this.line);
      if (!parts.length) continue;
      this.queue.push({ parts, until });
      this.idle = 0;
    }
    while (this.queue.length > QUEUE) this.queue.shift();
  }

  /** Say it now: what was waiting is no longer worth saying (the story has moved on), and what's up is replaced. */
  sayNow(texts: string | readonly string[]) {
    this.queue = []; this.current = null;
    this.say(texts);
  }

  /** What the line shows now of ours (null: the game's own). */
  get showing() { return this.drawn; }
  /** Whether there's something being said or waiting to be. */
  get busy() { return this.current !== null || this.queue.length > 0; }

  /** Forget everything (a new game, or the game changed under us). */
  reset(ram?: Uint8Array) {
    if (ram && this.drawn !== null) this.line.restore(ram);
    this.queue = []; this.current = null; this.drawn = null; this.idle = 0;
  }

  /** One frame of play (`on`: narrating); call after the game's frame, before the next. */
  frame(ram: Uint8Array, on: boolean) {
    if (!on) { if (this.busy || this.drawn !== null) this.reset(ram); return; }
    this.idle++;
    if (this.line.busy(ram)) {
      // the game's own message: ours waits (a part it covered that had been up half its time counts as read; else it starts again)
      if (this.current && this.drawn !== null) {
        const hold = holdFrames(this.current.part);
        if (this.current.left <= hold / 2) this.current = null; else this.current.left = hold;
      }
      this.drawn = null;
      return;
    }
    if (!this.current) {
      let next: Item | undefined;
      while ((next = this.queue[0]) !== undefined) {
        if (next.until && !next.until()) { this.queue.shift(); continue; }
        break;
      }
      const part = next?.parts.shift();
      if (next && part !== undefined) {
        if (next.parts.length === 0) this.queue.shift();
        // (the rest of its parts stay at the front of the queue as one item)
        this.current = { part, left: holdFrames(part), item: next };
        this.idle = 0;
      }
    }
    if (!this.current) return;
    this.draw(ram, this.current.part);
    this.idle = 0;
    if (--this.current.left > 0) return;
    this.current = null;
    if (!this.busy) { this.line.restore(ram); this.drawn = null; }
  }

  /** Our text on the line (only where it isn't already). */
  private draw(ram: Uint8Array, text: string) {
    const { at, width, code, blank } = this.line;
    for (let i = 0; i < width; i++) {
      const ch = text[i];
      const c = ch === undefined || ch === ' ' ? blank : code(ch) ?? blank;
      if (ram[at + i] !== c) ram[at + i] = c;
    }
    this.drawn = text;
  }
}
