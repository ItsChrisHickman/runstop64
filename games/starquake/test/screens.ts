/**
 * The original's text screens, drawn by the port and by the original (its own
 * routines called on the reference machine), compared byte for byte: the
 * intro ($344C, without the crack's line), game over ($3464), the end ($3515).
 *
 *   node screens.mjs room0.state [outdir for PNGs]
 */
import path from 'node:path';
import { reference, call } from './ref';
import { syncFrom, screenPng } from './sync';
import { Game } from '../src/game';
import * as Screens from '../src/screens';
import * as Specials from '../src/specials';

const [stateFile, outDir] = process.argv.slice(2);
let bad = 0;
const cases: [string, number, (g: Game) => void][] = [
  ['the end', 0x3515, (g) => Specials.ending(g)],
  ['game over', 0x3464, (g) => Screens.gameOver(g)],
  ['intro', 0x344c, (g) => Screens.intro(g)],
];
for (const [name, addr, draw] of cases) {
  const m = reference(stateFile);
  // make the core look complete but for one place, for something to see
  m.ram.set([0x80, 0x81, 0x9d, 0x83, 0x84, 0x8d, 0x22, 0x8b, 0xa0], 0x08f4);
  const g = new Game();
  syncFrom(m, g);
  // the original: its routine up to its music call ($0C09), which is skipped
  m.ram.set([0x60], 0x0c09);
  m.ram.set([0x60], 0x34fe); // (game over goes on to the high scores: not yet)
  call(m, addr);
  draw(g);
  let diff = 0;
  // (the intro's first line, row 5, is the crack's: the port leaves it out)
  for (let i = 0; i < 8000; i++) if (m.ram[0x6000 + i] !== g.scr.bank[0x2000 + i] && !(name === 'intro' && i >= 5 * 320 && i < 6 * 320)) diff++;
  for (let i = 0; i < 1000; i++) if (m.ram[0x5c00 + i] !== g.scr.bank[0x1c00 + i] && !(name === 'intro' && i >= 200 && i < 240)) diff++;
  console.log(`${name}: ${diff ? `${diff} bytes differ` : 'identical'}`);
  if (diff) bad++;
  if (outDir) {
    screenPng(path.join(outDir, `${name.replace(/ /g, '-')}-orig.png`), m.ram.subarray(0x6000, 0x7f40), m.ram.subarray(0x5c00, 0x5fe8));
    screenPng(path.join(outDir, `${name.replace(/ /g, '-')}-port.png`), g.scr.bank.subarray(0x2000, 0x3f40), g.scr.bank.subarray(0x1c00, 0x1fe8));
  }
}
process.exit(bad ? 1 : 0);
