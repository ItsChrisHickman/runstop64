import { hexBytes } from 'c64kit';
import raw from './data/motr.json';
import { ROW, SCREEN } from '../../shared/monty/screen';

/**
 * The title's big scroller, as the original's (Scroller.ScrollerUpdate and the rest): each letter of the message, in the game's
 * lettering, drawn as 32 pixels tall from quarter-cell patterns (characters $F0-$FF), scrolled a pixel column at a time. The
 * message is a stream of letters and control codes ($FE colour, $FD direction, $FC speed, $FB/$FA a row up or down, $F9 a pause,
 * $FF back to the start). Monty on the Run's title (title.ts) runs it in the screen's top rows; another game's title runs it
 * where its own picture has room (`ScrollerLayout`).
 */
const T = raw.title;
const ATTRACT_CHR = hexBytes(T.chr);
const BITMASK = hexBytes(T.bitmask);
const NYBBLE = hexBytes(T.nybbleMask);

/** The sixteen quarter patterns ($F0-$FF, 8 bytes each): the last of the title's characters. A title that sets its own characters up copies them to $F0. */
export const QUARTER_CHARS: Uint8Array = ATTRACT_CHR.subarray(ATTRACT_CHR.length - 128);

/** Where the scroller is on the screen: its first row, how many rows it covers, and the quarter row its letters start on. */
export interface ScrollerLayout {
  readonly top: number;
  readonly rows: number;
  /** The quarter-cell row (two to a character row) the top of a letter is drawn on. */
  readonly glyphTop: number;
}

/** Monty on the Run's: six rows from the top of the screen, letters starting a character row down (two quarter rows). */
export const ORIGINAL_LAYOUT: ScrollerLayout = { top: 0, rows: 6, glyphTop: 2 };

/** A piece of the scroller's stream: text, or its control codes (colour: $FE n). */
export type ScrollerPiece = string | number[];

/** A stream of a game's own: a colour, speed and direction to begin with and the pieces after them, then back to the start. */
export function storyMessage(pieces: readonly ScrollerPiece[]): Uint8Array {
  const bytes = pieces.flatMap((c) => (typeof c === 'string' ? [...c].map((ch) => ch.charCodeAt(0)) : c));
  return Uint8Array.from([0x20, 0xfe, 1, 0xfc, 3, 0xfd, 0, ...bytes, 0xff]);
}

/** What the scroller draws into: the game's screen and colour memory. */
interface Surfaces { readonly mem: Uint8Array; readonly col: Uint8Array }

export class Scroller {
  // ($DA-$E9)
  private sPtr = 0; private sBit = 0; private sDir = 0; private sColour = 0; private pixL = 0; private pixR = 0;
  private sSpeed = 0; private sPhase = 0; private colDone = 0; private pause = 0; private rowsUp = 0; private rowsDown = 0;
  private readonly base: number;

  constructor(private readonly g: Surfaces, private readonly message: Uint8Array, private readonly layout: ScrollerLayout = ORIGINAL_LAYOUT) {
    this.base = layout.top * ROW;
  }

  /** The fine scroll of the scroller's rows ($D016 bits 0-2; 38 columns there). */
  get phase() { return this.sPhase; }

  /** From the beginning of the message. */
  reset() {
    Object.assign(this, { sPtr: 0, sBit: 0, sDir: 0, sColour: 0, pixL: 0, pixR: 0, sSpeed: 0, sPhase: 0, colDone: 0, pause: 0, rowsUp: 0, rowsDown: 0 });
  }

  /** The state InitCarousel leaves the scroller in (the screen cleared under it). */
  afterClear() { this.sBit = 6; this.sDir = 0; this.sPtr = 0; }

  private at(row: number, col: number) { return SCREEN + this.base + row * ROW + col; }

  /** One frame of the raster interrupt's work. */
  update() {
    if (this.pause) { this.pause--; return; }
    if (this.rowsUp) { this.scrollUp(); return; }
    if (this.rowsDown) { this.scrollDown(); return; }
    this.colDone = 0;
    if (this.sDir & 0x80) this.advanceLeft(); else this.advanceRight();
    if (this.sSpeed && !this.colDone) return;
    if (!(this.sDir & 0x80)) {
      this.sBit = (this.sBit + 2) & 0xff;
      if (this.sBit !== 8) { this.renderSlice(); return; }
      this.sBit = 0;
    } else {
      this.sBit = (this.sBit - 2) & 0xff;
      if (this.sBit !== 0xfe) { this.renderSlice(); return; }
      this.sBit = 6;
    }
    this.nextByte();
  }

  /** ScrollAdvanceRight: the phase steps down; past a whole character the rows move left one. */
  private advanceRight() {
    const y = (this.sPhase - this.sSpeed) & 0xff;
    this.sPhase = y & 7;
    if (!(y & 8)) return;
    const m = this.g.mem, col = this.g.col, size = this.layout.rows * ROW;
    for (let r = 0; r < this.layout.rows; r++) col[this.base + r * ROW + 39] = this.sColour;
    for (let x = 0; x < size; x++) { m[SCREEN + this.base + x] = m[SCREEN + this.base + x + 1]; col[this.base + x] = col[this.base + x + 1]; }
    for (let r = 0; r < this.layout.rows - 1; r++) m[this.at(r, 39)] = 0;
    this.colDone = 1;
  }

  /** ScrollAdvanceLeft: the other way (the colour still goes into column 39, as the original's does). */
  private advanceLeft() {
    const y = this.sPhase + this.sSpeed;
    this.sPhase = y & 7;
    if (!(y & 8)) return;
    const m = this.g.mem, col = this.g.col, size = this.layout.rows * ROW;
    for (let r = 0; r < this.layout.rows; r++) col[this.base + r * ROW + 39] = this.sColour;
    for (let x = size - 1; x >= 0; x--) { m[SCREEN + this.base + x + 1] = m[SCREEN + this.base + x]; col[this.base + x + 1] = col[this.base + x]; }
    for (let r = 0; r < this.layout.rows; r++) m[this.at(r, 0)] = 0;
    this.colDone = 1;
  }

  private scrollUp() {
    this.rowsUp--;
    const m = this.g.mem;
    for (let x = 0; x < 40; x++) for (let r = 0; r < this.layout.rows - 1; r++) m[this.at(r, x)] = m[this.at(r + 1, x)];
  }

  private scrollDown() {
    this.rowsDown--;
    const m = this.g.mem;
    for (let x = 39; x >= 0; x--) for (let r = this.layout.rows - 1; r > 0; r--) m[this.at(r, x)] = m[this.at(r - 1, x)];
  }

  private msg(i: number) { return this.message[i] ?? 0xff; }

  /** ScrollNextByte: the next character, after any control codes. */
  private nextByte() {
    for (;;) {
      this.sPtr++;
      const b = this.msg(this.sPtr), op = this.msg(this.sPtr + 1);
      if (b === 0xfe) this.sColour = op;
      else if (b === 0xfd) {
        this.sDir = op;
        if (op & 0x80) { this.sBit = 6; this.pixL = 0; this.pixR = 1; } else { this.sBit = 0; this.pixL = 0x4e; this.pixR = 0x4f; }
      } else if (b === 0xfc) this.sSpeed = op;
      else if (b === 0xfb) { this.rowsUp = 9; continue; }
      else if (b === 0xfa) { this.rowsDown = 9; continue; }
      else if (b === 0xf9) this.pause = op;
      else {
        if (b === 0xff) this.sPtr = 0; // back to the start (its first character drawn now)
        break;
      }
      this.sPtr++; // (the operand)
    }
    this.renderSlice();
  }

  /** ScrollRenderSlice: two columns of the character's pixels, each a quarter of a character cell. */
  private renderSlice() {
    const m = this.g.mem;
    const glyph = ((this.msg(this.sPtr) & 0x3f) | 0x40) * 8;
    for (let y = 7; y >= 0; y--) {
      if (m[glyph + y] & BITMASK[this.sBit]) this.plot(this.pixL, y + this.layout.glyphTop);
      if (m[glyph + y] & BITMASK[this.sBit + 1]) this.plot(this.pixR, y + this.layout.glyphTop);
    }
  }

  /** ScrollPlotPixel: the quarter (col, row) lit in its character ($F0-$FF are the sixteen quarter patterns). */
  private plot(col: number, row: number) {
    const a = this.at(row >> 1, col >> 1);
    this.g.mem[a] = (this.g.mem[a] & 0x0f) | NYBBLE[((row & 1) << 1) | (col & 1)];
  }
}
