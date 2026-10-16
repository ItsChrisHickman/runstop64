/**
 * The title's scroller: eight big sprites (expanded, multicolour) 50 pixels apart that move left two pixels a
 * frame along the bottom of the picture, each showing one letter of the credits and bobbing up and down on a wave.
 * A sprite that leaves at the left comes back at the right with the next letter. All of it is the first raster
 * stage's job in the original ($4319-$43A5 steps it, $4478 sets the VIC's registers from it), once a frame.
 *
 * It keeps its place between visits to the title: the original does not start it again when a game ends.
 */
import { ARCS, fromHex } from './data';
import { BIG_LETTERS_HEX, SCROLL_START_HEX, SCROLL_TEXT_HEX } from './data/title-data';

export const SCROLLER_SPRITES = 8;
/** The wave: 24 signed steps ($4FB5: the jump's arc table is read from here), a sprite's own y moving by twice the step. */
const WAVE_AT = 0x2b;
const WAVE_LENGTH = 24;
/** Where a sprite that has gone off at the left starts again ($0190 less the lower byte's $90 is all the game sets: the high bit stays). */
const WRAP_LOW = 0x90;

const TEXT = fromHex(SCROLL_TEXT_HEX);
const START = fromHex(SCROLL_START_HEX);
const LETTERS = fromHex(BIG_LETTERS_HEX);

/** The big letters' sprite pointers: a character's picture is at pointer = character + $A4 in the VIC's bank 3; $E2 is the first kept ($3E, '>'). */
const POINTER_OFFSET = 0xa4;
const FIRST_POINTER = 0xe2;
const SPRITE_BYTES = 64;

/** The 64 bytes of the big letter a sprite pointer shows (blank for one outside the alphabet kept). */
export function bigLetter(pointer: number): Uint8Array {
  const at = (pointer - FIRST_POINTER) * SPRITE_BYTES;
  return at >= 0 && at + SPRITE_BYTES <= LETTERS.length ? LETTERS.subarray(at, at + SPRITE_BYTES) : new Uint8Array(SPRITE_BYTES);
}

/** What the VIC's registers hold for the scroller's sprites after $4478: each one's X (nine bits) and Y. */
export interface ScrollerRegisters {
  readonly x: readonly number[];
  readonly y: readonly number[];
}

export class Scroller {
  /** $4457: which step of the wave the first sprite is at (0-23). */
  private counter = START[0] ?? 0;
  /** $4458 +: each sprite's position as 16 bits (the sprites 50 apart), and $4468 +: its y. */
  private readonly position: number[] = [];
  private readonly y: number[] = [];
  /** $45AC: the next letter of the text. */
  private textAt = 0;
  /** $DFF8 +: each sprite's picture, the pointers of the VIC's bank 3 screen. */
  readonly pointers: number[] = new Array<number>(SCROLLER_SPRITES).fill(FIRST_POINTER);

  /** $4074-$4088: every visit to the title starts the text again and all eight sprites showing the first of the alphabet; the positions go on where they were. */
  restart(): void {
    this.textAt = 0;
    this.pointers.fill(FIRST_POINTER);
  }

  constructor() {
    for (let k = 0; k < SCROLLER_SPRITES; k++) {
      this.position.push((START[1 + 2 * k] ?? 0) | ((START[2 + 2 * k] ?? 0) << 8));
      this.y.push(START[17 + 2 * k] ?? 0);
    }
  }

  /** $4319 on: one frame's step: every sprite two pixels left (a new letter for one that wraps), its y on by the wave. */
  step(): void {
    this.counter = (this.counter + 1) % WAVE_LENGTH;
    let at = this.counter;
    for (let k = SCROLLER_SPRITES - 1; k >= 0; k--) {
      const old = this.position[k] ?? 0;
      const moved = (old & 0xff) - 2;
      let low = moved & 0xff, high = old >> 8;
      if (moved < 0) {
        high = (high - 1) & 1;
        if (high !== 0) {
          // (went off at the left: it starts again at the right, with the next letter of the text)
          low = WRAP_LOW;
          let letter = TEXT[this.textAt] ?? 0;
          if (letter === 0) {
            this.textAt = 0;
            letter = TEXT[0] ?? 0;
          }
          this.textAt++;
          this.pointers[k] = (letter + POINTER_OFFSET) & 0xff;
        }
      }
      const position = (high << 8) | low;
      this.position[k] = position;
      const wave = ARCS[WAVE_AT + at] ?? 0;
      this.y[k] = ((this.y[k] ?? 0) + 2 * wave) & 0xff;
      at += 3;
      if (at >= WAVE_LENGTH) at -= WAVE_LENGTH;
    }
  }

  /** $4478: the registers: X is 16 less than the position (the part past 127 on the right of the 9-bit range is eight less again), Y as it is. */
  registers(): ScrollerRegisters {
    const x: number[] = [], y: number[] = [];
    for (let k = 0; k < SCROLLER_SPRITES; k++) {
      const position = this.position[k] ?? 0;
      let low = ((position & 0xff) - 0x10) & 0xff;
      const borrow = (position & 0xff) < 0x10 ? 1 : 0;
      const high = (((position >> 8) & 1) - borrow) & 1;
      if (high !== 0 && low >= 0x80) low -= 8;
      x.push(low | (high << 8));
      y.push(this.y[k] ?? 0);
    }
    return { x, y };
  }
}
