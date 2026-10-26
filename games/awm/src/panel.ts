/**
 * The panel under the play area, and the character drawing the rest of the screen shares with it: text,
 * the counters, the lives' faces, the progress picture, the carried items' boxes and the room's banner.
 * Each function is one of the original's routines writing into the screen and the colour RAM
 * (re/README.md), on a `Screen` (screen.ts).
 *
 * Text is kept as the game keeps it, ASCII; a character's screen code is its ASCII value plus $60
 * (so letters, digits and the space come out in the $80-$FF half of the character set: $651F).
 */
import { BANNERS, HUD_BAR, HUD_HIGH, HUD_MONEY, HUD_SCORE, PROGRESS_HEX } from './data/awm-data';
import { fromHex, TABLES } from './data';
import { COLOUR_OF } from './room';
import { CHARSET_AT, SCREEN_COLS, type Screen } from './screen';

/** The rows of the panel: the band under the play area is row 19, the banner row 20, and so on. */
const ROW_BAND = 19;
const ROW_BANNER = 20;
const ROW_SCORE = 23;
const ROW_MONEY = 24;
const COL_COUNTER = 6;
const COL_HIGH = 34;
/** The column the banner's chain starts in, and where the country's name ends. */
const COL_BANNER = 4;
const COL_BANNER_END = 36;

/** Colour RAM values the panel uses. */
const Colour = { White: 1, Green: 5, Cyan: 3, Yellow: 7 } as const;

/** $651F: a text at a cell, in a colour: one cell a character, the screen code the ASCII + $60. */
export function printText(screen: Screen, text: string, col: number, row: number, colour: number): void {
  for (let i = 0; i < text.length; i++) screen.put(col + i, row, ((text.charCodeAt(i) & 0x7f) + 0x60) & 0xff, colour);
}

/** The screen as a game starts: every cell blank in white, the band and panel rows filled with $80 ($5C1D, $57E5). */
export function clearScreen(screen: Screen): void {
  screen.ram.fill(0, 0x400, 0x400 + SCREEN_COLS * 25);
  screen.colour.fill(Colour.White);
  for (let row = ROW_BAND; row < 25; row++) for (let col = 0; col < SCREEN_COLS; col++) screen.put(col, row, 0x80, Colour.White);
}

/** $656D: the labels (SCORE:, MONEY:, HIGH) of the panel. */
export function drawLabels(screen: Screen): void {
  printText(screen, HUD_SCORE, 0, ROW_SCORE, Colour.Cyan);
  printText(screen, HUD_MONEY, 0, ROW_MONEY, Colour.Yellow);
  printText(screen, HUD_HIGH, COL_HIGH, ROW_SCORE, Colour.Cyan);
}

/**
 * A counter's digits ($82A3): five, the most significant first, a leading zero left blank. The last digit
 * can have passed 9 (the game never reduces it): it is printed as the character that comes after '9'.
 */
function printDigits(screen: Screen, digits: readonly number[], col: number, row: number, colour: number): void {
  let started = false;
  for (let i = 4; i >= 0; i--) {
    const d = digits[i] ?? 0;
    let ascii = 0x20;
    if (started || d !== 0) {
      started = true;
      ascii = d + 0x30;
    }
    printText(screen, String.fromCharCode(ascii), col + 4 - i, row, colour);
  }
}

export function printScore(screen: Screen, digits: readonly number[]): void {
  printDigits(screen, digits, COL_COUNTER, ROW_SCORE, Colour.White);
}

export function printMoney(screen: Screen, digits: readonly number[]): void {
  printDigits(screen, digits, COL_COUNTER, ROW_MONEY, Colour.Yellow);
}

export function printHigh(screen: Screen, digits: readonly number[]): void {
  printDigits(screen, digits, COL_HIGH, ROW_MONEY, Colour.White);
}

/**
 * $8322: the faces for the lives (the byte at $4061: bit 7 set while playing, the lives below it). Up to six
 * faces, three either side of the panel; a game with more than six lives shows its extra ones first, in
 * the other face.
 */
export function drawLives(screen: Screen, lives: number): void {
  for (let i = 0; i < 6; i++) {
    for (const col of [i, 34 + i]) { screen.put(col, 21, 0); screen.put(col, 22, 0); }
  }
  if ((lives & 0x80) === 0) return;
  let left = lives & 0x7f;
  if (left === 0) return;
  const faces = Math.min(left, 6);
  let at = 0;
  for (let i = 0; i < faces; i++) {
    let code = left >= 7 ? 0xf8 : 0xf0;
    if (at >= 0x22) code += 4;
    screen.put(at, 21, code);
    screen.put(at + 1, 21, code + 1);
    screen.put(at, 22, code + 2);
    screen.put(at + 1, 22, code + 3);
    at += 2;
    if (at === 6) at = 0x22;
    left--;
  }
}

const PROGRESS = fromHex(PROGRESS_HEX);
/** Where the three parts of the progress picture start: a cell offset from row 21 column 10, the offset in the table, the length ($6618). */
const PROGRESS_PARTS = [
  { offset: 0, from: 0, length: 20 },
  { offset: 0x28, from: 0x14, length: 20 },
  { offset: 0x51, from: 0x28, length: 18 },
] as const;

/** $6618: a part of the progress picture (0 the top, 2 the bottom: the game draws the bottom one first). */
export function drawProgress(screen: Screen, part: number): void {
  const p = PROGRESS_PARTS[part];
  if (!p) throw new Error(`no part ${part} of the progress picture`);
  for (let i = 0; i < p.length; i++) {
    const at = 21 * SCREEN_COLS + 10 + p.offset + i;
    screen.ram[0x400 + at] = PROGRESS[p.from + i] ?? 0;
    screen.colour[at] = PROGRESS[58 + p.from + i] ?? 0;
  }
}

/** $65A3: the banner of a room on its row: the chain, then the place at the left and the country ending at the right. */
export function drawBanner(screen: Screen, room: number): void {
  const [country = '', place = ''] = (BANNERS[room] ?? '').split('|');
  printText(screen, HUD_BAR, COL_BANNER, ROW_BANNER, Colour.Green);
  printText(screen, place, COL_BANNER, ROW_BANNER, Colour.White);
  printText(screen, country, COL_BANNER_END - country.length, ROW_BANNER, Colour.White);
}

/** The four boxes of the things Monty carries: their top left cells ($6D2A: $0401, $0425, $04C9, $04ED). */
export const BOXES: readonly (readonly [number, number])[] = [[1, 0], [37, 0], [1, 5], [37, 5]];
/** The first of a box's four characters ($10 + 4 x the box). */
const BOX_CHARS = 0x10;

/** An item's 32 bytes of graphics as four characters: top left, bottom left, top right, bottom right (8 bytes each; $6A09). */
export function itemGlyphs(type: number): Uint8Array {
  const out = new Uint8Array(32);
  for (let k = 0; k < 16; k++) {
    out[k] = TABLES.itemGfx[type * 32 + k * 2] ?? 0;
    out[16 + k] = TABLES.itemGfx[type * 32 + k * 2 + 1] ?? 0;
  }
  return out;
}

/** $6C0E: a carried item into its box: the four characters, their colours (the item's four, through $579A) and the graphics. */
export function drawBox(screen: Screen, box: number, type: number, colours: ArrayLike<number>): void {
  const at = BOXES[box];
  if (!at) throw new Error(`no box ${box}`);
  const [col, row] = at;
  const c = BOX_CHARS + 4 * box;
  screen.put(col, row, c, COLOUR_OF[(colours[0] ?? 0) & 7]);
  screen.put(col + 1, row, c + 2, COLOUR_OF[(colours[2] ?? 0) & 7]);
  screen.put(col, row + 1, c + 1, COLOUR_OF[(colours[1] ?? 0) & 7]);
  screen.put(col + 1, row + 1, c + 3, COLOUR_OF[(colours[3] ?? 0) & 7]);
  screen.ram.set(itemGlyphs(type), CHARSET_AT + c * 8);
}

/** $6CDD: a box emptied (the characters go; the colours stay). */
export function clearBox(screen: Screen, box: number): void {
  const at = BOXES[box];
  if (!at) throw new Error(`no box ${box}`);
  const [col, row] = at;
  for (const [dc, dr] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) screen.put(col + dc, row + dr, 0);
}
