import fs from 'node:fs';
import { C64Machine, unpackState } from 'c64kit';
/**
 * The writes to the VIC ($D000-$D02E), the VIC's bank ($DD00) and the colour of the border and background in
 * `frames` consecutive frames of the original from a snapshot, with the raster line each was made on and the
 * instruction that made it: how the interrupts chop a frame up.
 *
 *   nice -n 15 node tools/test.mjs games/awm/re/raster.ts games/awm/build/title.state 1 [skip]
 */
const [stateFile = '', framesArg = '1', skipArg = '0'] = process.argv.slice(2);
const o = new C64Machine();
o.loadState(unpackState(new Uint8Array(fs.readFileSync(stateFile))));
for (let f = 0; f < Number(skipArg); f++) o.runFrame();
const write = o.cpu.write.bind(o.cpu);
let frame = 0;
o.cpu.write = (a: number, v: number) => {
  const addr = a & 0xffff;
  if ((addr >= 0xd000 && addr <= 0xd02e && addr !== 0xd019 && addr !== 0xd012) || addr === 0xdd00) {
    console.log(`frame ${frame} line ${o.line} cycle ${o.cycleInFrame}: $${addr.toString(16)} = $${v.toString(16)} (pc $${o.cpu.pc.toString(16)})`);
  }
  return write(a, v);
};
for (; frame < Number(framesArg); frame++) o.runFrame();
