import fs from 'node:fs';
import { C64Machine, unpackState } from 'c64kit';
/**
 * Writes to the given addresses (hex) while the original enters a room ($402B poked, room routine
 * $5581) and runs three frames: which instruction wrote what.
 *
 *   nice -n 15 node tools/test.mjs games/awm/re/watch.ts games/awm/build/play.state 14 9d0 460
 */
const [stateFile, roomArg, ...addrs] = process.argv.slice(2);
const room = Number(roomArg);
const o = new C64Machine();
o.loadState(unpackState(new Uint8Array(fs.readFileSync(stateFile))));
o.ram[0x5818] = 0x60;
o.ram[0x402b] = room;
const watch = new Set(addrs.map((a) => parseInt(a, 16)));
const w = o.cpu.write.bind(o.cpu);
o.cpu.write = (a: number, v: number) => {
  if (watch.has(a & 0xffff)) console.log(`write $${(a & 0xffff).toString(16)} = $${v.toString(16)} at pc $${o.cpu.pc.toString(16)}`);
  return w(a, v);
};
const regs = { ...o.cpu };
o.call(0x5581);
Object.assign(o.cpu, regs);
for (let f = 0; f < 3; f++) o.runFrame();
