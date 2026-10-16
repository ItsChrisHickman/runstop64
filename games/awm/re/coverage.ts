import fs from 'node:fs';
import { C64Machine, unpackState } from 'c64kit';
/**
 * Which instructions run: the original played at random (a few frames of joystick at a time) in
 * every room, entered by poking $402B and calling the room routine $5581. Writes a 64K map of
 * executed addresses (1 = an instruction started there) for tools/re/disasm.mjs --cov.
 *
 *   nice -n 15 node tools/test.mjs games/awm/re/coverage.ts games/awm/build/play.state cov.bin 600
 */
const [stateFile, out, per] = process.argv.slice(2);
const state = unpackState(new Uint8Array(fs.readFileSync(stateFile)));
const cov = new Uint8Array(65536);
let seed = 12345;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed >> 8; };
for (let room = 0; room < 80; room++) {
  const m = new C64Machine();
  m.loadState(state);
  const step = m.cpu.step.bind(m.cpu);
  m.cpu.step = () => { cov[m.cpu.pc] = 1; return step(); };
  m.ram[0x402b] = room;
  const regs = { ...m.cpu };
  m.call(0x5581);
  Object.assign(m.cpu, regs);
  let j = 0;
  for (let f = 0; f < Number(per); f++) {
    if (f % 8 === 0) { const r = rnd() % 10; j = [0, 8, 4, 1, 9, 5, 16, 24, 20, 2][r]; }
    m.joy1 = m.joy2 = 0x1f & ~j;
    if (!m.runFrame()) { console.log('stopped', room, f, m.cpu.pc.toString(16)); break; }
  }
}
fs.writeFileSync(out, cov);
let n = 0;
for (const v of cov) n += v;
console.log('instructions covered', n);
