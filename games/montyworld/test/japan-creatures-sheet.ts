/**
 * Japan's creatures at 4x beside Monty on the Run's enemies (frames 0-3 of each, in the colour the original gives it): to judge the set against the original's manner
 * (one solid ink, chunky shapes, big faces, black-line detail). A picture only.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/japan-creatures-sheet.ts <out-dir>
 */
import fs from 'node:fs';
import path from 'node:path';
import { enemyBank, enemyColours, enemyRecords } from '../../montyotr/src/data';
import { JAPAN_CREATURES } from '../src/art/japan-creatures';
import { Canvas, label } from './preview-kit';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: japan-creatures-sheet.ts <out-dir>');
fs.mkdirSync(out, { recursive: true });

/** The colour each of Monty on the Run's enemy types is shown in: the first room record that uses it. */
const motrColour = new Map<number, number>();
for (let id = 0; id < 0x40; id++) {
  let rec: Uint8Array;
  try { rec = enemyRecords(id); } catch { break; } // (past the last of the original's rooms)
  for (let i = 0; i + 6 < rec.length && rec[i] !== 0xff; i += 7) {
    const type = rec[i + 4] ?? 8;
    if (!motrColour.has(type)) motrColour.set(type, enemyColours[(rec[i] ?? 0) & 15] ?? 1);
  }
}

const japan = Object.entries(JAPAN_CREATURES);
const cell = 4 * 17 + 6, rowH = 21;
const motrTypes = Array.from({ length: 27 }, (_, i) => i + 8);
const perColumn = 13;
const cols = Math.ceil(japan.length / perColumn) + Math.ceil(motrTypes.length / perColumn);
const cv = new Canvas(cols * cell + 4, perColumn * rowH + 10);
japan.forEach(([name, c], i) => {
  const x = 2 + Math.floor(i / perColumn) * cell, y = 8 + (i % perColumn) * rowH;
  label(cv, name.slice(2), x, y - 6, 11);
  for (let f = 0; f < 4; f++) cv.enemyFrame(c.frames, f * 32, x + f * 17, y, c.colour);
});
const jcols = Math.ceil(japan.length / perColumn);
motrTypes.forEach((type, i) => {
  const x = 2 + (jcols + Math.floor(i / perColumn)) * cell, y = 8 + (i % perColumn) * rowH;
  label(cv, `MOTR ${type}`, x, y - 6, 11);
  for (let f = 0; f < 4; f++) cv.enemyFrame(enemyBank(type), f * 32, x + f * 17, y, motrColour.get(type) ?? 1);
});
cv.png(path.join(out, 'creatures-vs-motr.png'), 4);
