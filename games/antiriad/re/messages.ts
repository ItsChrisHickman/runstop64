import { Game } from '../src/game';

/** The panel's messages as the original's data has them ($C1AA): what the credits and QOL may quote. */

const g = new Game();
// the panel's messages ($C1AA table of addresses), as the game has them
for (let n = 0; n < 0x16; n++) {
  const at = g.word(0xc1aa + n * 2);
  let text = '';
  for (let i = at; g.ram[i] > 1 && i < at + 120; i++) text += String.fromCharCode(g.ram[i]);
  console.log(n.toString(16), text);
}
