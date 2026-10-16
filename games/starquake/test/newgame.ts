/**
 * A new game's setup ($0C3C-$0C6C: the panel, the items scattered, the core's
 * missing pieces) in the original and the port, from the same random numbers,
 * for several games: the items, the core, the random numbers and the panel
 * compared.
 *
 *   node newgame.mjs title.state [games]
 */
import { C64_KEYS } from '../../../packages/c64kit/src/c64/keyboard';
import { reference } from './ref';
import { syncFrom } from './sync';
import { Game } from '../src/game';
import { setUp } from '../src/flow';

const [titleFile, gamesArg = '5'] = process.argv.slice(2);
let bad = 0;
for (let n = 0; n < Number(gamesArg); n++) {
  const m = reference(titleFile);
  let phase = 0;
  const g = new Game();
  const step = m.cpu.step.bind(m.cpu);
  m.cpu.step = () => {
    if (phase === 0 && m.cpu.pc === 0x0c3c) {
      // vary the game: different seeds each time
      m.ram[0x3b] = (m.ram[0x3b] + n * 37) & 0xff; m.ram[0x3c] = (m.ram[0x3c] + n * 91) & 0xff;
      syncFrom(m, g);
      phase = 1;
    }
    if (phase === 1 && m.cpu.pc === 0x0c66) phase = 2;
    return step();
  };
  for (let f = 0; f < 3000 && phase < 2; f++) {
    m.keys = f % 200 >= 100 && f % 200 < 104 ? [C64_KEYS.Space] : [];
    m.runFrame();
  }
  if (phase < 2) { console.log('the original never started a game'); process.exit(1); }
  setUp(g);
  const r = m.ram, out: string[] = [];
  g.items.forEach((it, i) => {
    const o = [r[0x0890 + i], r[0x08a4 + i], r[0x08b8 + i], r[0x08cc + i], r[0x08e0 + i]].join(',');
    const p = [it.col, it.row, it.roomLo, it.roomHi, it.graphic].join(',');
    if (o !== p) out.push(`item ${i}: orig ${o} port ${p}`);
  });
  for (let i = 0; i < 9; i++) if (r[0x08f4 + i] !== g.core[i]) out.push(`core ${i}: orig ${r[0x08f4 + i]} port ${g.core[i]}`);
  for (let i = 0; i < 5; i++) if (r[0x08fd + i] !== g.coreSlots[i]) out.push(`core slot ${i}`);
  if (r[0x67] !== g.rng.a || r[0x68] !== g.rng.b) out.push('random numbers');
  let panel = 0;
  for (let i = 0; i < 0x780; i++) if (r[0x6000 + i] !== g.scr.bank[0x2000 + i]) panel++;
  for (let i = 0; i < 0xf0; i++) if (r[0x5c00 + i] !== g.scr.bank[0x1c00 + i]) panel++;
  if (panel) out.push(`${panel} panel bytes differ`);
  if (out.length) { bad++; console.log(`game ${n}: ${out.slice(0, 6).join('; ')}`); }
  else console.log(`game ${n}: identical (core missing ${[...g.coreSlots].join(' ')}; items in rooms ${g.items.map((it) => it.roomLo | (it.roomHi << 8)).join(' ')})`);
}
console.log(bad ? `${bad} differ` : 'all identical');
