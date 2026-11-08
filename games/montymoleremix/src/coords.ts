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

/**
 * The cells of the room that Monty takes coal from, in the order Wanted looks (Wanted's own `Coal.collect`, `$935C`): eight points of his box, his
 * top corners and middle, the middle of each side, and three on the row below his feet, so that a piece in the cell he stands on is his too. (Not
 * the two by two cells of Monty on the Run's coins: a piece on the very floor he walks along is in reach.) Cells as `row * ROOM_COLS + col`.
 */
export function coalCells(m: { x: number; y: number }): number[] {
  const feet = m.y - 16;
  const points: readonly (readonly [number, number])[] = [
    [m.x, m.y], [m.x + 7, m.y], [m.x + 15, m.y], [m.x, m.y - 8], [m.x + 15, m.y - 8], [m.x, feet], [m.x + 8, feet], [m.x + 15, feet],
  ];
  const cells: number[] = [];
  for (const [px, py] of points) {
    const col = cellCol(px), row = cellRow(py);
    if (inRoom(col, row)) cells.push(row * ROOM_COLS + col);
  }
  return cells;
}
