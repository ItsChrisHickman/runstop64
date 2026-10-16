import fs from 'node:fs';
import { C64Machine, unpackState } from 'c64kit';
/**
 * Every SID write the original makes after a sound is asked for ($85A6), with the instruction that wrote it
 * (the effect driver's voice offset is Y).
 *
 *   nice -n 15 node tools/test.mjs games/awm/re/sound-trace.ts games/awm/build/play.state 65 4
 */
const [stateFile = '', soundArg = '65', framesArg = '4'] = process.argv.slice(2);
const o = new C64Machine();
o.loadState(unpackState(new Uint8Array(fs.readFileSync(stateFile))));
{
  const regs = { ...o.cpu };
  o.ram[0x4066] = 1;
  o.call(0xe40c);
  o.call(0xc7e3);
  Object.assign(o.cpu, regs);
}
for (let f = 0; f < 8; f++) o.runFrame();
{
  const regs = { ...o.cpu };
  o.cpu.a = Number(soundArg);
  o.call(0x85a6);
  Object.assign(o.cpu, regs);
}
const stepper = o.cpu.step.bind(o.cpu);
o.cpu.step = () => { if (o.cpu.pc >= 0xc800 && o.cpu.pc < 0xc9ff && process.env.PCS) console.log(`  pc $${o.cpu.pc.toString(16)} a=${o.cpu.a.toString(16)} x=${o.cpu.x.toString(16)} y=${o.cpu.y.toString(16)}`); return stepper(); };
const write = o.cpu.write.bind(o.cpu);
let frame = 0;
console.log([...o.ram.subarray(0xc893, 0xc8a2)].map((b) => b.toString(16)).join(" "));
o.cpu.write = (a: number, v: number) => {
  const addr = a & 0xffff;
  if (addr >= 0xd400 && addr < 0xd420) console.log(`frame ${frame} pc $${o.cpu.pc.toString(16)} y=$${o.cpu.y.toString(16)} x=$${o.cpu.x.toString(16)} $${addr.toString(16)} = $${v.toString(16)}`);
  return write(a, v);
};
for (; frame < Number(framesArg); frame++) { o.runFrame(); console.log(`  sidWrites ${o.sidWrites.map((w) => `${w.reg.toString(16)}=${w.value.toString(16)}`).join(" ")}`); }
