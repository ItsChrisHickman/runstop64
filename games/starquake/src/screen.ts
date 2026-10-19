/**
 * The C64 screen as Starquake uses it: a hi-res bitmap (320×200) with a
 * colour byte per 8×8 cell (ink in the high nibble, paper in the low), and
 * per cell an attribute nibble (the original keeps it in colour RAM, which
 * the bitmap mode doesn't show): what the cell is for BLOB (solid, deadly...).
 * Plus the eight hardware sprites. Everything at the original's layout so the
 * game code reads like the original: cell = row × 40 + column.
 */
import { ROM } from './data';

export const COLS = 40;
export const ROWS = 25;


export class Screen {
  /** VIC bank 1 ($4000-$7FFF): sprite graphics at $1000-$1BFF, cell colours at $1C00, bitmap at $2000. */
  constructor(readonly bank = new Uint8Array(0x4000)) {}
  /** Colour RAM ($D800): cell attributes. */
  readonly attr = new Uint8Array(0x400);

  static readonly COLOURS = 0x1c00;
  static readonly BITMAP = 0x2000;
  static readonly POINTERS = 0x1ff8;

  get colours() { return this.bank.subarray(0x1c00, 0x1c00 + 1000); }
  get bitmap() { return this.bank.subarray(0x2000, 0x2000 + 8000); }

  /** Cell colour byte (screen RAM $5C00 + cell). */
  colour(cell: number) { return this.bank[0x1c00 + cell]; }
  setColour(cell: number, v: number) { this.bank[0x1c00 + (cell & 0x3ff)] = v & 0xff; }
  /** Bank offset of a cell's 8 bitmap bytes. */
  static bitmapAt(cell: number) { return (0x2000 + cell * 8) & 0x3fff; }
}

/**
 * The sprite graphics the original keeps with its program ($5000-$5BFF, in the VIC's bank 1: sprite pointers $40-$6F): BLOB's
 * body and eyes, the hover pad, the things the game draws its creatures over. The VIC's bank has them from the start; a save made
 * without them (before this was done) gets them back where it has none (`onlyEmpty`: a picture the game has drawn itself since, such
 * as the pad's turning flame, is kept).
 */
export function installSprites(bank: Uint8Array, onlyEmpty = false) {
  for (let ptr = 0x40; ptr < 0x70; ptr++) {
    const at = ptr * 64;
    if (onlyEmpty && bank.subarray(at, at + 64).some((b) => b !== 0)) continue;
    bank.set(ROM.subarray(0x4000 + at, 0x4000 + at + 64), at);
  }
}

/** The original's row table (×40), as $42BA: cell index of a column and row. */
export const cellAt = (col: number, row: number) => (row * 40 + col) & 0xffff;
