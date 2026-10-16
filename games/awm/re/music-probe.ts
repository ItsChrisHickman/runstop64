import fs from 'node:fs';
import { C64Machine, unpackState } from 'c64kit';
/**
 * Which tune the original starts when a room is entered ($5581), with the effects flag $4066 as given:
 *
 *   nice -n 15 node tools/test.mjs games/awm/re/music-probe.ts games/awm/build/play.state 0
 */
const [stateFile = '', flagArg = '0'] = process.argv.slice(2);
const out: string[] = [];
for (let room = 0; room < 80; room++) {
  const o = new C64Machine();
  o.loadState(unpackState(new Uint8Array(fs.readFileSync(stateFile))));
  o.ram[0x4066] = Number(flagArg);
  o.ram[0x402b] = room;
  const started: number[] = [];
  const step = o.cpu.step.bind(o.cpu);
  o.cpu.step = () => { if (o.cpu.pc === 0xe409) started.push(o.cpu.a); return step(); };
  const regs = { ...o.cpu };
  o.call(0x5581);
  Object.assign(o.cpu, regs);
  out.push(`${room}:${started.join('/') || '-'}`);
}
console.log(out.join(' '));
