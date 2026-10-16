/**
 * The core of heroes against the original: for a range of scores, where each
 * would go ($3534) and the table after typing initials ($3574-$35CB), and the
 * table's screen ($35CD), compared byte for byte.
 *
 *   node heroes.mjs room0.state
 */
import { reference, call } from './ref';
import { syncFrom } from './sync';
import { Game } from '../src/game';
import * as Heroes from '../src/heroes';

const [stateFile] = process.argv.slice(2);
let bad = 0, n = 0;
for (const score of ['000000', '001940', '001941', '001999', '002005', '002111', '002112', '009999', '012345']) {
  const m = reference(stateFile);
  const g = new Game();
  syncFrom(m, g);
  const adventure = ' 37%';
  // the original: the score and adventure score as game over leaves them; typing done ('ABCDE')
  for (let i = 0; i < 6; i++) m.ram[0x3f7c + i] = score.charCodeAt(i);
  for (let i = 0; i < 4; i++) m.ram[0x3f86 + i] = adventure.charCodeAt(i);
  m.ram[0x3f8a] = 0;
  const initials = [0x41, 0x42, 0x43, 0x44, 0x45];
  m.ram.set(initials, 0x91);
  m.ram.set([0x60], 0x38d0); // (the typing: already done)
  m.ram.set([0x60], 0x0c09); // (the music's wait)
  call(m, 0x3534);
  const table = Heroes.freshTable();
  const at = Heroes.place(table, score);
  if (at >= 0) Heroes.insert(table, at, initials, score, adventure);
  let diff = 0;
  for (let i = 0; i < table.length; i++) if (table[i] !== m.ram[0x3db4 + i]) diff++;
  // the table's screen
  Heroes.show(g, table);
  for (let i = 0; i < 8000; i++) if (m.ram[0x6000 + i] !== g.scr.bank[0x2000 + i]) diff++;
  for (let i = 0; i < 1000; i++) if (m.ram[0x5c00 + i] !== g.scr.bank[0x1c00 + i]) diff++;
  n++;
  console.log(`score ${score}: ${at < 0 ? 'not a hero' : `rank ${at / 25 + 1}`}; ${diff ? `${diff} bytes differ` : 'table and screen identical'}`);
  if (diff) bad++;
}
console.log(bad ? `${bad} of ${n} differ` : `all ${n} identical`);
process.exit(bad ? 1 : 0);
