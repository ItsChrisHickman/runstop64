/**
 * A backdrop runs edge to edge: in every room, a row of the picture that is filled across its middle (columns 2-29, all of it decoration characters: a sky, a sea, a wall seen behind)
 * is filled (by the picture too, or a tile) at the playfield's first and last columns and in the margin the picture shows either side too (Chris, 2026-11-22: Rio's sky stopped one column short at each side).
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/backdrop-edges.ts
 */
import { check, finish } from '../../shared/test/check';
import { PLAY_COL, PLAY_COLS, PLAY_ROW, PLAY_ROWS, SCREEN, ROW, SCREEN_MARGIN } from '../../shared/monty/screen';
import { WORLD } from '../src/data';
import { inRoom, roomsOf } from './climb-kit';

const gaps: string[] = [];
for (const room of roomsOf(WORLD)) {
  const s = inRoom(WORLD, room);
  if (!s) continue;
  const cell = (col: number, row: number) => s.g.mem[SCREEN + (row + PLAY_ROW) * ROW + col + PLAY_COL] ?? 0;
  for (let row = 0; row < PLAY_ROWS; row++) {
    let middle = true;
    for (let col = 2; col < PLAY_COLS - 2; col++) if (cell(col, row) <= 8) middle = false; // (a picture: a decoration's characters, not a room tile and not empty)
    if (!middle) continue;
    for (let col = -SCREEN_MARGIN; col < PLAY_COLS + SCREEN_MARGIN; col++) if (cell(col, row) === 0) gaps.push(`${room}/${row}/${col < 0 ? 'L' : 'R'}`);
  }
}
check(`every row filled across its middle is filled to the picture's edges (${gaps.length} gaps: ${[...new Set(gaps)].slice(0, 80).join(' ')})`, gaps.length === 0);
finish();
