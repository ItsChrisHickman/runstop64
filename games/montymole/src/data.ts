/**
 * The game's data as typed tables, from the generated hex (data/*.ts, made by re/extract.ts and re/rooms.ts from the original;
 * test/data.ts proves it against the original running). The rooms are `ROOMS` in data/rooms-data.ts (src/room.ts).
 */
import { hexBytes } from 'c64kit';
import { COAL_HEX, FONT_HEX, JUMP_ARC_HEX } from './data/tables-data';
import { CHAIN_HEX, CRUSHER_HEX } from './data/interrupt-data';
import { DEATH_SPRITE_HEX, MONTY_HEX, SPRITES_HEX, TITLE_HEX } from './data/graphics-data';
import { OPENING_GLYPHS_HEX, OPENING_SCENE_HEX, SUN_HEX } from './data/opening-data';
import { bitmapRow } from './room';
import { DEATH_TUNE_HEX, TITLE_TUNE_HEX } from './data/music-data';
export { ENDING_VERSE, GAME_OVER_VERSE, LIVES_LINE, MENU_LINES, SCORE_LINE, type TextLine } from './data/texts-data';
export { PICKUP, STEP_CYCLES, STEP_PITCH_START, THUD } from './data/sounds-data';

/** The 256 sprite frames, `$6000` on: 16 x 16 pixels, 32 bytes each: 2 bytes a row, top row first (left byte, right byte). */
export const SPRITE_FRAMES = hexBytes(SPRITES_HEX);
export const SPRITE_COUNT = 256;
export const SPRITE_BYTES = 32;
export const SPRITE_BASE = 0x6000;

/**
 * Monty's 16 frames, `$849C` on (the original keeps them next to its code): four each for up, down, left and right, in that
 * order, `$8395` picks `base + 32 * frame + 128 * direction`. The castle rooms keep their own set (`spriteBase` of a room: `$7800`).
 */
export const MONTY_FRAMES = hexBytes(MONTY_HEX);
export const MONTY_BASE = 0x849c;

/** The pictures of his death (`$FF60`-`$FFFF`): five frames; the last is drawn where he dies (`$FFE0`), the first four are the ones that rise (`$8F12`). */
export const DEATH_FRAMES = hexBytes(DEATH_SPRITE_HEX);
export const DEATH_BASE = 0xff60;
export const DEATH_SPRITE_BASE = 0xffe0;
export const DEATH_SPRITE = DEATH_FRAMES.subarray(DEATH_SPRITE_BASE - DEATH_BASE, DEATH_SPRITE_BASE - DEATH_BASE + 32);

/** The title picture: 6144 bytes of bitmap, then 768 of attributes: the screen as the tape loads it. */
export const TITLE_PICTURE = hexBytes(TITLE_HEX);

/**
 * The crusher's two pictures (`$8E7A`, `$8E80`): 9 rows of 3 bytes each. The one drawn while it comes down starts at `$8E7A`, the one while it goes up at `$8E80`
 * (they overlap in the code: the first rows differ, the rest are shared). 33 bytes from `$8E7A`.
 */
export const CRUSHER_PICTURES = hexBytes(CRUSHER_HEX);
export const CRUSHER_DOWN = 0, CRUSHER_UP = 6;

/** Room 17's animation as the tape has it: the ring of 32 bytes (`$910B`) and the byte after it (`$912B`). */
export const CHAIN = hexBytes(CHAIN_HEX);

/** The font: 38 glyphs of 8 bytes (font.ts). */
export const FONT = hexBytes(FONT_HEX);

/** The jump arc: the 32 steps of y (signed bytes; y counts up, so positive is up). */
export const JUMP_ARC: readonly number[] = Array.from(hexBytes(JUMP_ARC_HEX), (b) => (b < 128 ? b : b - 256));
export const JUMP_PASSES = 32;

/** The 64 coal flags as the tape has them: bit 7 is set while the piece is there (the opening scene sets it), the low 7 bits are its points. */
export const COAL_FLAGS = hexBytes(COAL_HEX);
export const COAL_COUNT = 64;

/** A note of a tune as the original calls BEEPER with it: DE cycles (less one) at pitch HL; a pitch of 0 is a rest of E frames. */
export interface Note { readonly de: number; readonly hl: number }

function notes(hex: string): readonly Note[] {
  const b = hexBytes(hex);
  const out: Note[] = [];
  for (let i = 0; i + 3 < b.length; i += 4) out.push({ de: (b[i] ?? 0) | ((b[i + 1] ?? 0) << 8), hl: (b[i + 2] ?? 0) | ((b[i + 3] ?? 0) << 8) });
  return out;
}
/** The title tune (273 records, 56 of them rests) and the death tune (24 notes: "Abide with Me"). */
export const TITLE_TUNE = notes(TITLE_TUNE_HEX);
export const DEATH_TUNE = notes(DEATH_TUNE_HEX);

/** The row table (`$EA60`): where pixel row `y` (counted up from the bottom, 0-191) is in the screen, as an offset from $4000. */
export function screenOffset(y: number): number {
  return bitmapRow(191 - y); // (the screen's own row counts down from the top)
}

/**
 * The picture of the frame at an address of the original's memory: a sprite from `$6000-$7FFF` or one of Monty's from
 * `$849C-$869B` or the death picture at `$FFE0` (the game addresses images by where they are). Returns the 32 bytes.
 */
export function imageAt(address: number): Uint8Array {
  if (address >= SPRITE_BASE && address + SPRITE_BYTES <= SPRITE_BASE + SPRITE_FRAMES.length) return SPRITE_FRAMES.subarray(address - SPRITE_BASE, address - SPRITE_BASE + SPRITE_BYTES);
  if (address >= MONTY_BASE && address + SPRITE_BYTES <= MONTY_BASE + MONTY_FRAMES.length) return MONTY_FRAMES.subarray(address - MONTY_BASE, address - MONTY_BASE + SPRITE_BYTES);
  if (address >= DEATH_BASE && address + SPRITE_BYTES <= DEATH_BASE + DEATH_FRAMES.length) return DEATH_FRAMES.subarray(address - DEATH_BASE, address - DEATH_BASE + SPRITE_BYTES);
  throw new Error(`no picture at $${address.toString(16)}`);
}

/**
 * The opening scene's picture (`$F14B`): a pointer to its glyphs (`$7C00`), 20 rows of 28 character codes, and the colour attribute of each of the 560 cells. It is drawn
 * into columns 2-29 of rows 2-21 (`$EF7E`); a code is `$80` + the glyph's number, the glyphs are 8 bytes each.
 */
const OPENING_SCENE = hexBytes(OPENING_SCENE_HEX);
export const OPENING_COLS = 28;
export const OPENING_ROWS = 20;
export const OPENING_MAP = OPENING_SCENE.subarray(2, 2 + OPENING_COLS * OPENING_ROWS);
export const OPENING_ATTRS = OPENING_SCENE.subarray(2 + OPENING_COLS * OPENING_ROWS, 2 + 2 * OPENING_COLS * OPENING_ROWS);
export const OPENING_GLYPHS = hexBytes(OPENING_GLYPHS_HEX);
/** The animation in the opening's top right corner (`$ED4E`): four pictures of 24 rows of 5 bytes. */
export const SUN_FRAMES = hexBytes(SUN_HEX);
export const SUN_ROWS = 24;
export const SUN_WIDTH = 5;
