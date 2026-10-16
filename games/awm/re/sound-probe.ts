import fs from 'node:fs';
import { C64Machine, unpackState } from 'c64kit';
/**
 * What the original's sound does in play with the effects flag $4066 as given: the SID writes per voice before
 * and after a sound is asked for ($85A6, A = number), and $EA49 (the music's state).
 *
 *   nice -n 15 node tools/test.mjs games/awm/re/sound-probe.ts games/awm/build/play.state 1 66
 */
const [stateFile = '', flagArg = '0', soundArg = '66'] = process.argv.slice(2);
const o = new C64Machine();
o.loadState(unpackState(new Uint8Array(fs.readFileSync(stateFile))));
o.ram[0x4066] = Number(flagArg);
const summary = (): string => {
  const per = [0, 0, 0, 0];
  for (const w of o.sidWrites) per[w.reg < 7 ? 0 : w.reg < 14 ? 1 : w.reg < 21 ? 2 : 3]++;
  return `writes v1 ${per[0]} v2 ${per[1]} v3 ${per[2]} other ${per[3]}`;
};
for (let f = 0; f < 200; f++) o.runFrame();
console.log(`flag ${flagArg}: ea49=${o.ram[0xea49]?.toString(16)} 4064=${o.ram[0x4064]} ${summary()}`);
const regs = { ...o.cpu };
o.cpu.a = Number(soundArg);
o.call(0x85a6);
Object.assign(o.cpu, regs);
console.log(`slots ${o.ram[0xc7e0]?.toString(16)} ${o.ram[0xc7e1]?.toString(16)} ${o.ram[0xc7e2]?.toString(16)}`);
for (let f = 0; f < 6; f++) { o.runFrame(); console.log(`after ${f}: ea49=${o.ram[0xea49]?.toString(16)} slots ${o.ram[0xc7e0]?.toString(16)} ${o.ram[0xc7e1]?.toString(16)} ${o.ram[0xc7e2]?.toString(16)} ${summary()}`); }
