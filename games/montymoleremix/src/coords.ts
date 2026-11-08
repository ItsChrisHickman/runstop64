/**
 * Wanted's pixels and Monty on the Run's: Wanted counts x from the left of the 256-pixel room and y *up* from the bottom of the 192-line
 * Spectrum screen (a thing's y is its top line, a 16 x 16 thing's lines are y down to y - 15); Monty on the Run counts the VIC's sprite
 * x (half-pixels, `x2`) and y from the top. The room is the same 32 x 20 cells in both (Wanted from screen row 2, ours from row 3).
 */
import { ROOM_COLS, ROOM_ROWS } from '../../montymole/src/room';
import { PLAY_COL, PLAY_ROW } from '../../shared/monty/screen';

/** The VIC x of the room's left edge, and the VIC y of its top. */
export const VIC_LEFT = 24 + PLAY_COL * 8;
export const VIC_TOP = 0x32 + PLAY_ROW * 8;
/** Wanted's y of a thing whose top line is the room's top line. */
export const WANTED_TOP = 175;

/** The VIC sprite x of a Wanted x. */
export const vicX = (x: number): number => VIC_LEFT + x;
/** The VIC sprite y of a Wanted y. */
export const vicY = (y: number): number => VIC_TOP + WANTED_TOP - y;
/** The pixel row, from the room's top, of the top line of a thing at a Wanted y. */
export const rowTop = (y: number): number => WANTED_TOP - y;

/** A Wanted pixel's cell column and row in the room (a y is the line of the pixel, counted up from the screen's bottom). */
export const cellCol = (x: number): number => x >> 3;
export const cellRow = (lineY: number): number => ((191 - lineY) >> 3) - 2;

export const inRoom = (col: number, row: number): boolean => col >= 0 && col < ROOM_COLS && row >= 0 && row < ROOM_ROWS;

/** Monty's place in Wanted's pixels (x from the left, y up), from his sprite's x2 (half-pixels), step gate and y. */
export function wantedMonty(x2: number, stepGate: number, y: number): { x: number; y: number } {
  return { x: x2 * 2 + stepGate - VIC_LEFT, y: VIC_TOP + WANTED_TOP - y };
}
