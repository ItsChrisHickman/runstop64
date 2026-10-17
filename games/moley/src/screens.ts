/**
 * The screens that are not a room: the credits page and its scroller, GAME OVER, the Christmas card and its scroller. Each is the
 * Spectrum's screen memory (a 256 x 192 bitmap in the ULA's layout and an attribute byte for each 8 x 8 cell, as display.ts has it)
 * changed by the same steps as the original's routines, so that what is on it frame after frame is what the original has on its
 * screen (test/flow.ts compares them).
 *
 * What the original does, and so this does (re/README.md, "Title, game over and ending"):
 * - the credits page (`$A0CE`) clears the screen and unpacks the Gremlin picture (`$A500`), sets the three last attributes of the
 *   bottom row to black (`$A0DA`), looks for a Kempston joystick for about 43 frames (65,536 reads of port `$1F`, `$A0E9`), and then
 *   scrolls its text along the bottom row one pixel a frame (`$A277`, `$8367`) until a jump key is read;
 * - GAME OVER (`$8292`) writes "GAME OVER !!" over the room, in the cells at row 9, column 10, in a paper-red attribute whose ink
 *   goes round the 8 colours, one step a frame for 100 frames;
 * - the Christmas card (`$82DA`) is room 6 on a cleared screen; its scroller (`$8391`) runs along row 8 and 7 cells' attributes take
 *   a random step of paper every frame (`$835C`), until a key is pressed.
 * A scroller draws the next character of its text at the right edge every 8th frame (`$A280`, `$8306`) and shifts the row one pixel
 * left every frame; the text goes round (`$A287`: the terminator is read as the text's first character and the pointer goes on from
 * the second, which is the text again).
 */
import { CREDITS_PICTURE, CREDITS_TEXT, ENDING_ROOM, ENDING_TEXT, GAME_OVER_TEXT, GLYPHS, MAP_COLUMNS } from './data';
import { BITMAP_BYTES, cellOffset, rowOffset, type Shot } from './display';
import { PICTURE_HEIGHT, roomPicture } from './picture';
import type { Random } from './random';

const ATTR_CELLS = 768;

/** The credits page's scroller runs along cell row 23, the card's along cell row 8; both draw at the right-hand column. */
export const CREDITS_ROW = 23, CARD_ROW = 8;
/** GAME OVER is written at cell row 9, column 10; it lasts 100 frames, in a paper-red attribute whose ink goes round (`$8295`-`$82A6`). */
export const OVER_ROW = 9, OVER_COLUMN = 10, OVER_FRAMES = 100;
/** The attribute GAME OVER starts with: paper red, ink black (`$10`); the ink is the low three bits and counts up (`$829E`-`$82A4`). */
const OVER_ATTR = 0x10;
/** The cells of the card whose paper twinkles (`$59CF`, `$5A0F`, `$5A2E`, `$5A6F`, `$5A70`, `$5A8E`, `$5AB1`, as attribute offsets) and the one set to black (`$591F`). */
const TWINKLE_CELLS = [0x1cf, 0x20f, 0x22e, 0x26f, 0x270, 0x28e, 0x2b1] as const;
const CARD_BLACK_CELL = 0x11f;
/** The credits page's last three attributes are black (`$A0DA`). */
const CREDITS_BLACK_CELLS = [0x2fd, 0x2fe, 0x2ff] as const;

/** A screen: the bitmap in the ULA's layout and the 24 rows of attributes. */
export class Screen {
  readonly bits = new Uint8Array(BITMAP_BYTES);
  readonly attrs = new Uint8Array(ATTR_CELLS);

  /** A screen made from the bits and attributes of another (copies). */
  static from(bits: Uint8Array, attrs: Uint8Array): Screen {
    const screen = new Screen();
    screen.bits.set(bits);
    screen.attrs.set(attrs);
    return screen;
  }

  /** A picture to hold for `frames` frames (display.ts's `Shot`: no sprites, so the look draws it as it is). */
  shot(frames: number): Shot {
    const bits = this.bits.slice();
    return { bits, attrs: this.attrs.slice(), plain: bits, sprites: [], frames };
  }

  /** The ROM glyph of a character at a cell (`$A2B5`: 8 bytes, one for each line). */
  glyph(code: number, row: number, column: number): void {
    const glyph = GLYPHS.get(code);
    if (glyph === undefined) throw new Error(`the game prints no character ${code}`);
    for (let line = 0; line < 8; line++) this.bits[cellOffset(row * MAP_COLUMNS + column) + (line << 8)] = glyph[line];
  }

  /** The 8 lines of a cell row shifted one pixel to the left, a clear pixel coming in at the right (`$8367`). */
  shiftRow(row: number): void {
    for (let line = 0; line < 8; line++) {
      const at = rowOffset(row * 8 + line);
      let carry = 0;
      for (let column = MAP_COLUMNS - 1; column >= 0; column--) {
        const byte = this.bits[at + column];
        this.bits[at + column] = ((byte << 1) | carry) & 0xff;
        carry = byte >> 7;
      }
    }
  }
}

/** The text of a scroller, one character every 8th frame at the right of its row. */
export class Scroller {
  /** the frame counter (`$838E`, a byte): a character is drawn when it wraps to a multiple of 8 */
  private counter = 7;
  private at = 0;

  constructor(private readonly text: string, private readonly row: number) {}

  /** A frame's shift, after the HALT (`$8367`). */
  shift(screen: Screen): void {
    screen.shiftRow(this.row);
  }

  /** Before the HALT: count, and draw the next character when the count comes round (`$A277`, `$82FD`). */
  feed(screen: Screen): void {
    this.counter = (this.counter + 1) & 7;
    if (this.counter !== 0) return;
    screen.glyph(this.text.charCodeAt(this.at), this.row, MAP_COLUMNS - 1);
    this.at = (this.at + 1) % this.text.length;
  }
}

/** The credits page as the original leaves it after unpacking it: the Gremlin picture and its attributes (`$A500`, `$A0DA`). */
export function creditsScreen(): Screen {
  const screen = new Screen();
  let bitmap = ATTR_CELLS;
  for (let cell = 0; cell < ATTR_CELLS; cell++) {
    const attr = CREDITS_PICTURE[cell];
    screen.attrs[cell] = attr & 0x7f;
    if ((attr & 0x80) === 0) continue;
    for (let line = 0; line < 8; line++) screen.bits[cellOffset(cell) + (line << 8)] = CREDITS_PICTURE[bitmap++];
  }
  for (const cell of CREDITS_BLACK_CELLS) screen.attrs[cell] = 0;
  return screen;
}

export function creditsScroller(): Scroller {
  return new Scroller(CREDITS_TEXT, CREDITS_ROW);
}

/** The Christmas card: room 6 over a cleared screen, the one cell the scroller comes out of black (`$82DA`). */
export function cardScreen(): Screen {
  const picture = roomPicture(ENDING_ROOM);
  const screen = new Screen();
  for (let y = 0; y < PICTURE_HEIGHT; y++) screen.bits.set(picture.bits.subarray(y * 32, y * 32 + 32), rowOffset(y));
  screen.attrs.set(picture.attrs);
  screen.attrs[CARD_BLACK_CELL] = 0;
  return screen;
}

export function cardScroller(): Scroller {
  return new Scroller(ENDING_TEXT, CARD_ROW);
}

/** The card's twinkle for a frame (`$835C`): seven cells take a random step of paper and keep bright set; the byte is the Z80's R. */
export function twinkle(screen: Screen, rng: Random): void {
  for (const cell of TWINKLE_CELLS) screen.attrs[cell] = (((rng.byte() & 0x38) + screen.attrs[cell]) & 0x3f) | 0x40;
}

/** GAME OVER on frame `frame` (0-99) of its 100: the text and the attribute whose ink is the frame's step (`$8295`). */
export function writeGameOver(screen: Screen, frame: number): void {
  const attr = OVER_ATTR | (frame & 7);
  for (let i = 0; i < GAME_OVER_TEXT.length; i++) {
    screen.glyph(GAME_OVER_TEXT.charCodeAt(i), OVER_ROW, OVER_COLUMN + i);
    screen.attrs[OVER_ROW * MAP_COLUMNS + OVER_COLUMN + i] = attr;
  }
}
