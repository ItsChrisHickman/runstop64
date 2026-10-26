/**
 * The figure's pictures as bytes and as pixels. A picture is a multicolour sprite, 24 x 21 (12 pixels of two bits a row, 21 rows, 63
 * bytes, padded to 64). Its pixels are written as characters: `.` clear, `f` the sprite's own colour (his face and hands), `1` the first
 * shared colour (his tunic), `c` the second (his cape, his hair and the outline).
 */
export const ROWS = 21;
export const COLS = 12;
const PIXELS = '.1fc';

/** 63 bytes from their hex digits, in a 64-byte picture. */
export function unhex(hex: string): Uint8Array {
  const out = new Uint8Array(64);
  for (let i = 0; i < 63; i++) out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  return out;
}

/** A picture's rows of pixel characters. */
export function toRows(data: ArrayLike<number>): string[] {
  const rows: string[] = [];
  for (let r = 0; r < ROWS; r++) {
    let s = '';
    for (let b = 0; b < 3; b++) for (let pair = 0; pair < 4; pair++) s += PIXELS[(data[r * 3 + b] >> (6 - pair * 2)) & 3];
    rows.push(s);
  }
  return rows;
}

/** A picture from its rows of pixel characters. */
export function fromRows(rows: readonly string[]): Uint8Array {
  const out = new Uint8Array(64);
  rows.forEach((row, r) => {
    for (let i = 0; i < COLS; i++) {
      const v = PIXELS.indexOf(row[i] ?? '.');
      if (v < 0) throw new Error(`figure pixel ${row[i]} is not one of ${PIXELS}`);
      out[r * 3 + (i >> 2)] |= v << (6 - (i & 3) * 2);
    }
  });
  return out;
}
