/**
 * How the art is written: pictures as rows of text, '#' a lit pixel and '.' a dark one, turned into the bytes Monty on the Run
 * keeps them in. The art is written the way it is seen and checked when it is read (a row of the wrong length throws, naming the
 * picture), so the data files hold pictures, not hex.
 *
 * Monty on the Run's pieces, and what they become here:
 * - a tile is 8 characters of 8 bits (one byte a row, the left pixel the high bit), 8 bytes in all;
 * - a decoration is w x h characters, row by row (character after character, 8 bytes each), with a colour or one colour a
 *   character;
 * - a creature is a hires sprite 16 x 16 as the enemy bank keeps it: 32 bytes a frame, the four 8 x 8 quarters in the order top
 *   left, top right, bottom left, bottom right (each 8 bytes, a row a byte), 8 frames in all;
 * - an item is a hires sprite block, 3 bytes a row, 21 rows, 63 bytes (the picture 16 pixels wide, in the left two bytes).
 */

/** Check a picture's rows (all of one width, a multiple of 8 for characters) and return them. */
export function picture(name: string, rows: readonly string[], width: number, height: number): readonly string[] {
  if (rows.length !== height) throw new Error(`${name}: ${rows.length} rows, not ${height}`);
  rows.forEach((row, i) => {
    if (row.length !== width) throw new Error(`${name}: row ${i} is ${row.length} wide, not ${width}`);
    if (/[^#.]/.test(row)) throw new Error(`${name}: row ${i} has a character that is not # or .`);
  });
  return rows;
}

/** One row of up to 8 pixels, as a byte (the left pixel the high bit). */
function rowByte(row: string, from: number): number {
  let byte = 0;
  for (let b = 0; b < 8; b++) if (row[from + b] === '#') byte |= 0x80 >> b;
  return byte;
}

/** A picture w x h characters (8 pixels each) as bytes: the characters row by row, each its 8 rows. */
export function characters(name: string, rows: readonly string[], w: number, h: number): Uint8Array {
  const rs = picture(name, rows, w * 8, h * 8);
  const out = new Uint8Array(w * h * 8);
  for (let cr = 0; cr < h; cr++) for (let cc = 0; cc < w; cc++) for (let r = 0; r < 8; r++) {
    out[(cr * w + cc) * 8 + r] = rowByte(rs[cr * 8 + r] ?? '', cc * 8);
  }
  return out;
}

/** A colour for each character of a decoration, written as hex digits (one C64 colour each), a row of text a row of characters. */
export function colours(name: string, rows: readonly string[], w: number, h: number): Uint8Array {
  if (rows.length !== h) throw new Error(`${name}: ${rows.length} colour rows, not ${h}`);
  const out = new Uint8Array(w * h);
  rows.forEach((row, r) => {
    if (row.length !== w) throw new Error(`${name}: colour row ${r} is ${row.length} wide, not ${w}`);
    for (let c = 0; c < w; c++) {
      const v = parseInt(row[c] ?? '', 16);
      if (Number.isNaN(v)) throw new Error(`${name}: colour row ${r} has '${row[c]}'`);
      out[r * w + c] = v;
    }
  });
  return out;
}

/** A creature's frame (16 rows of 16) in the enemy bank's 32 bytes. */
export function creatureFrame(name: string, rows: readonly string[]): Uint8Array {
  const rs = picture(name, rows, 16, 16);
  const out = new Uint8Array(32);
  for (let r = 0; r < 8; r++) {
    out[r] = rowByte(rs[r] ?? '', 0);
    out[8 + r] = rowByte(rs[r] ?? '', 8);
    out[16 + r] = rowByte(rs[8 + r] ?? '', 0);
    out[24 + r] = rowByte(rs[8 + r] ?? '', 8);
  }
  return out;
}

/** A picture turned to face the other way. */
export function mirrored(rows: readonly string[]): readonly string[] {
  return rows.map((row) => [...row].reverse().join(''));
}

/** A picture moved down (or up, with a negative dy) inside its square, what leaves is cut off and the rest is dark. */
export function shifted(rows: readonly string[], dy: number): readonly string[] {
  const blank = '.'.repeat(rows[0]?.length ?? 0);
  return rows.map((_, i) => rows[i - dy] ?? blank);
}

/** The eight frames of a creature type from four facing left (frames 0-3, going back) and four facing right (4-7). */
export function creatureBank(name: string, left: readonly (readonly string[])[], right: readonly (readonly string[])[]): Uint8Array {
  if (left.length !== 4 || right.length !== 4) throw new Error(`${name}: a creature has 4 frames each way`);
  const out = new Uint8Array(256);
  [...left, ...right].forEach((rows, f) => out.set(creatureFrame(`${name} frame ${f}`, rows), f * 32));
  return out;
}

/** An item's sprite block: a 16 x 16 picture in the top left of the 24 x 21 block (the left two of three bytes a row). */
export function itemBlock(name: string, rows: readonly string[]): Uint8Array {
  const rs = picture(name, rows, 16, 16);
  const out = new Uint8Array(63);
  for (let r = 0; r < 16; r++) {
    out[r * 3] = rowByte(rs[r] ?? '', 0);
    out[r * 3 + 1] = rowByte(rs[r] ?? '', 8);
  }
  return out;
}
