/**
 * What the rebuild takes from the original, and where the notes (re/README.md) say it is: the pristine 64K image of the tape's
 * game block, the game in play for what only running shows (the beeper's toggles). Shared by the generator (re/extract.ts) and
 * the test that proves the generated data (test/data.ts).
 */
import { FRAME_T, Spectrum } from '../../../tools/zx/spectrum';
import { unpackState } from '../../../tools/zx/snapshot';
import { parseTap } from '../../../tools/zx/tape';

/** The tape's game block (the headerless block, flag $71) as the game's 64K image: 49152 bytes from $4000, zeros below. */
export function imageFromTape(tap: Uint8Array): Uint8Array {
  const image = new Uint8Array(65536);
  const block = parseTap(tap).find((b) => b.kind === 'standard' && b.bytes[0] === 0x71);
  if (block === undefined || block.kind !== 'standard') throw new Error('the tape has no game block (flag $71)');
  image.set(block.bytes.subarray(1, 1 + 49152), 0x4000);
  return image;
}

/** A named span of the image: where the original keeps it. */
export interface Span { readonly name: string; readonly at: number; readonly length: number }

/** Every block of data the rebuild uses, with its place in the original. */
export const SPANS = {
  sprites: { name: 'the 256 sprite frames, 16 x 16, 32 bytes each (enemies, objects, the castle set of Monty at $7800, the bucket at $7780)', at: 0x6000, length: 256 * 32 },
  monty: { name: 'Monty: 16 frames of 32 bytes, four each for up, down, left and right (rope, rope, walk, walk)', at: 0x849c, length: 16 * 32 },
  deathSprite: { name: 'the picture drawn where Monty dies (a 16 x 16 frame at the top of memory)', at: 0xffe0, length: 32 },
  title: { name: 'the title picture: the screen as the tape loads it, 6144 bytes of bitmap then 768 of attributes', at: 0x4000, length: 6912 },
  font: { name: 'the font: glyphs 0 to 37 (space, A-Z with 17 an apostrophe, 0-9, colon), 8 bytes each', at: 0x813b, length: 38 * 8 },
  jumpArc: { name: 'the jump arc: 32 signed steps of y', at: 0x869c, length: 32 },
  coal: { name: 'the 64 coal flags (the programmer\'s assembler source: what each piece scores, as its low 7 bits)', at: 0x964d, length: 64 },
  titleTune: { name: 'the title tune: 273 records of 4 bytes (duration DE, pitch HL; pitch 0 rests for E frames), to the first record whose second byte is $FF', at: 0xd5b9, length: 273 * 4 },
  deathTune: { name: 'the death tune: 24 notes of 4 bytes', at: 0x5c7d, length: 24 * 4 },
  crusher: { name: 'the crusher: 9 rows of 3 bytes for the way up (from $8E80) and 9 for the way down (from $8E7A)', at: 0x8e7a, length: 33 },
  chain: { name: 'room 17\'s animation: two pictures of 8 rows of 2 bytes, a ring of 32 bytes that turns by 2 each step, and (after it) the byte that remembers the object', at: 0x910b, length: 33 },
  rowTable: { name: 'the row table: 192 words, the screen address of each pixel row y (y up from the bottom)', at: 0xea60, length: 192 * 2 },
} as const satisfies Record<string, Span>;

export function bytesOf(image: Uint8Array, span: Span): Uint8Array {
  return image.slice(span.at, span.at + span.length);
}

/** The place and words of a line of text the game prints in a fixed place: five bytes of a record, and a string of glyph codes whose last has bit 7 set. */
export interface TextSpot { readonly record: number; readonly text: number }

/** The options menu: five records ($8122: column, pixel row, length, colour, attribute row) and their strings ($826B on). */
export const MENU: readonly TextSpot[] = [
  { record: 0x8122, text: 0x826b }, { record: 0x8127, text: 0x826b + 7 }, { record: 0x812c, text: 0x826b + 7 + 12 },
  { record: 0x8131, text: 0x826b + 7 + 24 }, { record: 0x8136, text: 0x826b + 7 + 36 },
];
/** SCORE: and LIVES: (the digits are patched in; the string's last glyph has bit 7). */
export const SCORE_SPOT: TextSpot = { record: 0x9212, text: 0x921c };
export const LIVES_SPOT: TextSpot = { record: 0x94b6, text: 0x94bb };
/** The verses: the lines of glyph codes, $FF ends a line and $FE the text. */
export const GAME_OVER_AT = 0xf04b;
export const ENDING_AT = 0x5ce1;

/** A text record read from the image. */
export interface TextRecord { readonly column: number; readonly pixelRow: number; readonly length: number; readonly colour: number; readonly attrRow: number; readonly codes: number[] }

/** A record and its glyph codes (bit 7 cleared), `length` of them. */
export function textRecord(image: Uint8Array, spot: TextSpot): TextRecord {
  const [column, pixelRow, length, colour, attrRow] = Array.from(image.subarray(spot.record, spot.record + 5));
  if (column === undefined || pixelRow === undefined || length === undefined || colour === undefined || attrRow === undefined) throw new Error('short record');
  const codes = Array.from(image.subarray(spot.text, spot.text + length), (c) => c & 0x7f);
  return { column, pixelRow, length, colour, attrRow, codes };
}

/** The verse at `at`: lines of glyph codes up to the $FE that ends the text. */
export function verse(image: Uint8Array, at: number): number[][] {
  const lines: number[][] = [[]];
  for (let a = at; ; a++) {
    const c = image[a];
    if (c === undefined) throw new Error('the verse runs off the image');
    if (c === 0xfe) break;
    if (c === 0xff) lines.push([]);
    else lines[lines.length - 1]?.push(c);
  }
  return lines;
}

// ---- the beeper ---------------------------------------------------------------------------------------------------

/** One beeper sound as the speaker did it: T-states before the first flip, between flips, and from the last flip to the end. */
export interface Recorded { readonly lead: number; readonly gaps: number[]; readonly tail: number }

/** Where the game's main loop waits (`HALT`): a routine called with this return address stops there. */
const HALT_AT = 0xff5b;

/** The ROM's BEEPER with DE and HL, run on the model from the game in play, and the speaker's flips it makes. */
export function recordBeeper(rom: Uint8Array, state: Uint8Array, de: number, hl: number): Recorded {
  const m = new Spectrum(rom);
  unpackState(m, state);
  const cpu = m.cpu;
  cpu.sp = (cpu.sp - 2) & 0xffff;
  m.mem[cpu.sp] = HALT_AT & 255;
  m.mem[cpu.sp + 1] = HALT_AT >> 8;
  cpu.de = de;
  cpu.hl = hl;
  cpu.pc = 0x03b5;
  cpu.halted = false;
  cpu.iff1 = false;
  cpu.iff2 = false;
  const start = m.frame * FRAME_T + cpu.t;
  let end = -1;
  m.onStep = (pc) => { if (pc === HALT_AT && end < 0) end = m.frame * FRAME_T + cpu.t; };
  m.beeper.length = 0;
  for (let f = 0; f < 400 && end < 0; f++) m.runFrame();
  if (end < 0) throw new Error(`BEEPER ${de},${hl} did not return`);
  const times = m.beeper.map((b) => b.frame * FRAME_T + b.t);
  const first = times[0];
  const last = times[times.length - 1];
  if (first === undefined || last === undefined) throw new Error(`BEEPER ${de},${hl} made no sound`);
  return { lead: first - start, gaps: times.slice(1).map((t, i) => t - (times[i] ?? 0)), tail: end - last };
}
