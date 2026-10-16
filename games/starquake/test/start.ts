/**
 * From the title snapshot, start a game in the original (Space on the title,
 * Space on the intro) and save the machine when the game first reaches an
 * address: by default $0C73, the main loop about to draw the first room.
 *
 *   node start.mjs title.state game.state [hex address]
 */
import fs from 'node:fs';
import { packState } from '../../../packages/c64kit/src/c64/machine';
import { C64_KEYS } from '../../../packages/c64kit/src/c64/keyboard';
import { reference } from './ref';

const [titleFile, outFile, at = '0c73'] = process.argv.slice(2);
const pc = parseInt(at, 16);
const m = reference(titleFile);
const step = m.cpu.step.bind(m.cpu);
let saved = false;
m.cpu.step = () => {
  if (m.cpu.pc === pc && !saved) {
    fs.writeFileSync(outFile, packState(m.saveState()));
    saved = true;
  }
  return step();
};
for (let f = 0; f < 3000 && !saved; f++) {
  // Space for a few frames now and then: past the title, then the intro.
  m.keys = f % 200 >= 100 && f % 200 < 104 ? [C64_KEYS.Space] : [];
  m.runFrame();
}
console.log(saved ? `saved ${outFile}` : 'never got there');
