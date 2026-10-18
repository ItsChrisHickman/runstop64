/**
 * Where a hint's sparkle goes on the C64's picture (320 x 200 pixels), worked out from the game's
 * own memory and the VIC-II's registers: the middle of a sprite's drawn pixels, the middle of a
 * run of text-mode cells. Presentation only: reads, never writes. Shared by the games' hint modules
 * (Blackwyche's GUIDED, The Staff of Karnath's hints).
 */

export interface Spot { x: number; y: number }

/** Where the sprite pointers are (the last eight bytes of the default screen). */
const SPRITE_PTRS = 0x07f8;

/** The middle of a sprite's opaque pixels, in screen pixels (null: not shown, empty, or not on the screen). */
export function spriteSpot(ram: Uint8Array, vic: Uint8Array, n: number): Spot | null {
  const bit = 1 << n;
  if (!(vic[0x15] & bit)) return null;
  const sx = vic[0x1d] & bit ? 2 : 1, sy = vic[0x17] & bit ? 2 : 1, multi = (vic[0x1c] & bit) !== 0;
  const at = ram[SPRITE_PTRS + n] * 64;
  let x0 = 24, x1 = -1, y0 = 21, y1 = -1;
  for (let y = 0; y < 21; y++) for (let x = 0; x < 24; x++) {
    const byte = ram[at + y * 3 + (x >> 3)];
    const on = multi ? ((byte >> (6 - (x & 6))) & 3) !== 0 : (byte & (0x80 >> (x & 7))) !== 0;
    if (!on) continue;
    if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
  }
  if (x1 < 0) return null;
  const left = (vic[n * 2] | (vic[0x10] & bit ? 256 : 0)) - 24, top = vic[n * 2 + 1] - 50;
  const x = left + ((x0 + x1 + 1) / 2) * sx, y = top + ((y0 + y1 + 1) / 2) * sy;
  return x >= 0 && x < 320 && y >= 0 && y < 200 ? { x: Math.round(x), y: Math.round(y) } : null;
}

/** Whether sprite `n`'s 63 picture bytes are the same as the 63 bytes at `at` (a picture the game keeps to copy into its sprites). */
export function spriteShows(ram: Uint8Array, n: number, at: number): boolean {
  const mine = ram[SPRITE_PTRS + n] * 64;
  for (let i = 0; i < 63; i++) if (ram[mine + i] !== ram[at + i]) return false;
  return true;
}

/**
 * The middle of the cells (a screen of text-mode characters, `columns` wide from `screen`) whose
 * code is in `codes`, a run of neighbouring ones together (a thing drawn with two characters has one
 * spot), on the screen's pixels: a cell is 8 pixels, shifted right by the fine scroll (`xscroll`, 0-7).
 * Only rows `rows[0]` to `rows[1]` (the play area, not the panel under it).
 */
export function cellSpots(ram: Uint8Array, screen: number, columns: number, rows: [number, number], codes: readonly number[], xscroll: number): Spot[] {
  const out: Spot[] = [];
  for (let r = rows[0]; r <= rows[1]; r++) {
    let from = -1;
    for (let c = 0; c <= columns; c++) {
      // (a cell wholly under the 38-column screen's right border, from pixel 311, isn't there)
      const hit = c < columns && c * 8 + xscroll <= 310 && codes.includes(ram[screen + r * columns + c]);
      if (hit && from < 0) from = c;
      if (!hit && from >= 0) {
        const x = Math.round(((from + c) / 2) * 8 + xscroll), y = r * 8 + 4;
        out.push({ x, y });
        from = -1;
      }
    }
  }
  return out;
}
