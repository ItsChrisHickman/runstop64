/**
 * The crusher of Wanted: Monty Mole Remix is the original's: in each of the nine rooms that have one, frame by frame (the crusher goes
 * every frame, as the original's interrupt does) its record equals the faithful game's own crusher's, every line the original has drawn
 * of it (the shaft it leaves, the head, the wiping rows) is a line of the picture the remix shows, in the three columns and nowhere
 * else, and where it has a pixel on a cell's top row it holds Monty from above.
 *
 *   nice -n 15 node tools/test.mjs games/montymoleremix/test/crusher.ts
 */
import { Crusher } from '../../montymole/src/crusher';
import { ROOMS } from '../../montymole/src/data/rooms-data';
import { Field } from '../../montymole/src/field';
import { Random } from '../../montymole/src/random';
import { bitmapRow } from '../../montymole/src/room';
import { check, finish } from '../../shared/test/check';
import { PLAY_COL, PLAY_ROW, ROW, SCREEN } from '../../shared/monty/screen';
import { cellRow, WANTED_TOP } from '../src/coords';
import { retile } from '../src/retile';
import { newGame, NONE, place, standingSpot, step } from './harness';
import { must } from '../../shared/test/must';

let rooms = 0, frames = 0, wrongRecord = 0, wrongLine = 0, strayCell = 0, linesSeen = 0, held = 0, heldWrong = 0;
for (const data of ROOMS) {
  const [column = 0, top = 0] = data.crusher;
  if (column === 0 && top === 0) continue;
  rooms++;
  const p = newGame();
  const g = p.g;
  const away = must(standingSpot(retile(data), column < 16 ? 27 : 3, 10), `a place in room ${data.id}`);
  const at = place(away.col, away.row);
  g.enterAt(data.id, at.x2, at.y);
  g.graceActive = () => true;
  // the faithful game's crusher, run beside it: the same record, the same generator
  const field = new Field();
  field.drawRoom(data);
  const original = new Crusher();
  original.enter(data);
  const random = new Random(0x2c5a);
  // (entering the room took a few frames of the remix's crusher: bring the original to the same step)
  const remixSteps = g.crusherSteps;
  for (let i = 0; i < remixSteps; i++) original.step(field, random);
  for (let i = 0; i < 2500; i++) {
    step(p, NONE);
    original.step(field, random);
    frames++;
    if (g.crusher.toBytes().join() !== original.toBytes().join()) { wrongRecord++; break; }
    for (let line = 0; line < 192; line++) {
      for (let c = 0; c < 3; c++) {
        const mine = g.crusherPicture.written(line, c);
        if (mine < 0) continue;
        const row = cellRow(line);
        if (row < 0 || row >= 20) continue;
        linesSeen++;
        const theirs = field.picture[bitmapRow(191 - line) + column + c] ?? 0;
        if (mine !== theirs) wrongLine++;
        // and it is on the screen the remix shows
        const code = g.mem[SCREEN + (row + PLAY_ROW) * ROW + PLAY_COL + column + c] ?? 0;
        const shown = g.mem[code * 8 + (((WANTED_TOP - line) % 8) + 8) % 8] ?? 0;
        if (shown !== mine) wrongLine++;
      }
    }
    // nothing of it outside its three columns
    for (let row = 0; row < 20; row++) {
      for (let col = 0; col < 32; col++) {
        const code = g.mem[SCREEN + (row + PLAY_ROW) * ROW + PLAY_COL + col] ?? 0;
        if (code >= 0x10 && code < 0x30 && (col < column || col >= column + 3)) strayCell++;
      }
    }
    // it holds him from above where its picture has a pixel on the top row of a cell
    for (let row = 0; row < 20; row++) {
      for (let c = 0; c < 3; c++) {
        const code = g.mem[SCREEN + (row + PLAY_ROW) * ROW + PLAY_COL + column + c] ?? 0;
        if (code < 0x10 || code >= 0x30) continue;
        const flag = g.flagAt(PLAY_ROW + row, PLAY_COL + column + c);
        const top = (g.mem[code * 8] ?? 0) !== 0;
        if (top) held++;
        if (top && flag === 0) heldWrong++;
      }
    }
  }
}
check(`${rooms} rooms have a crusher`, rooms === 9);
check(`its record equals the faithful crusher's, every frame (${frames} frames, ${wrongRecord} rooms differ)`, wrongRecord === 0 && frames > 20000);
check(`every line the original has drawn is on the remix's screen and equals the original's picture (${linesSeen} lines, ${wrongLine} wrong)`, wrongLine === 0 && linesSeen > 100000);
check(`none of its cells is outside its three columns (${strayCell})`, strayCell === 0);
check(`it holds him from above where it has a pixel on a cell's top row (${held} cells, ${heldWrong} not)`, heldWrong === 0 && held > 1000);
finish();
