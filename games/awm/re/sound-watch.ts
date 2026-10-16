import fs from 'node:fs';
import { C64Machine, unpackState } from 'c64kit';
/**
 * Who writes the given addresses (hex) of the original's RAM while it runs `frames` frames from a snapshot.
 *
 *   nice -n 15 node tools/test.mjs games/awm/re/sound-watch.ts games/awm/build/play.state 20 c8a0 c884
 */
const [stateFile = '', framesArg = '20', ...addrs] = process.argv.slice(2);
const o = new C64Machine();
o.loadState(unpackState(new Uint8Array(fs.readFileSync(stateFile))));
const watch = new Set(addrs.map((a) => parseInt(a, 16)));
const write = o.cpu.write.bind(o.cpu);
let frame = 0;

o.cpu.write = (a: number, v: number) => {
  if (watch.has(a & 0xffff)) console.log(`frame ${frame}: $${(a & 0xffff).toString(16)} = $${v.toString(16)} by the instruction before pc $${o.cpu.pc.toString(16)}`);
  return write(a, v);
};
if (process.env.SETUP) { const regs = { ...o.cpu }; o.ram[0x4066] = 1; o.call(0xe40c); o.call(0xc7e3); Object.assign(o.cpu, regs); }
for (; frame < Number(framesArg); frame++) o.runFrame();
