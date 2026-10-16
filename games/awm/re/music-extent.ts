import fs from 'node:fs';
import { C64Machine, unpackState } from 'c64kit';
/**
 * Which addresses the original's music and effect drivers read (the code is $E400-$E9xx and $C7E3-$CAEB), over every
 * tune (A of $E409 = 0-12) for some seconds each: the extent of what the .sid must carry.
 *
 *   nice -n 15 node tools/test.mjs games/awm/re/music-extent.ts games/awm/build/play.state 1500
 */
const [stateFile = '', framesArg = '1500'] = process.argv.slice(2);
const lo = new Map<string, number>();
let min = 0xffff, max = 0;
for (let track = 0; track < 13; track++) {
  const o = new C64Machine();
  o.loadState(unpackState(new Uint8Array(fs.readFileSync(stateFile))));
  const read = o.cpu.read.bind(o.cpu);
  o.cpu.read = (a: number) => {
    const pc = o.cpu.pc;
    const addr = a & 0xffff;
    if (((pc >= 0xe400 && pc < 0xea00) || (pc >= 0xc7e0 && pc < 0xcb00)) && addr >= 0xc000 && addr < 0xfff0 && !(addr >= 0xd000 && addr < 0xe000)) {
      if (addr < min) min = addr;
      if (addr > max) max = addr;
    }
    return read(a);
  };
  const regs = { ...o.cpu };
  o.cpu.a = track;
  o.call(0xe409);
  Object.assign(o.cpu, regs);
  for (let f = 0; f < Number(framesArg); f++) o.runFrame();
  lo.set(`track ${track}`, o.ram[0xea49] ?? 0);
}
console.log(`read $${min.toString(16)}-$${max.toString(16)}`, [...lo].map(([k, v]) => `${k}:ea49=${v.toString(16)}`).join(' '));
