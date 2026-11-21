/**
 * Monty's 36 pictures (the walk, the rope, the somersault, both ways) on one sheet with a ruler, for drawing a costume on them.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/monty-sheet.ts <out-dir>
 */
import fs from 'node:fs';
import path from 'node:path';
import { bankImage } from '../../montyotr/src/data';
import { Canvas, label } from './preview-kit';
import { WORLD } from '../src/data';

const out = process.argv[2];
if (out === undefined) throw new Error('usage: monty-sheet.ts <out-dir>');
fs.mkdirSync(out, { recursive: true });

for (const [name, bank] of [['plain', bankImage], ['hat', WORLD.bankImage]] as const) {
  const cv = new Canvas(6 * 28, 6 * 26 + 8);
  for (let i = 0; i < 36; i++) {
    const ptr = 0x50 + i, x = (i % 6) * 28 + 2, y = Math.floor(i / 6) * 26 + 8;
    cv.spriteBlock(bank.subarray(ptr * 64, ptr * 64 + 63), x, y, i % 2 ? 1 : 7);
    label(cv, ptr.toString(16), x, y - 6, 11);
    for (let k = 0; k < 24; k += 4) cv.set(x + k, y + 22, 6);
  }
  cv.png(path.join(out, `monty-${name}.png`), 4);
}
