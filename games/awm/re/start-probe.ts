import fs from 'node:fs';
import { C64Machine, unpackState } from 'c64kit';
/**
 * The original from a snapshot of the title, with fire held from frame `fireAt` for `hold` frames (and F1/F7 pressed at `keyAt`):
 * every frame, the title's and the game's variables, so that the start of a game can be read.
 *
 *   nice -n 15 node tools/test.mjs games/awm/re/start-probe.ts games/awm/build/t807.state frames fireAt hold [every]
 */
const [stateFile = '', framesArg = '300', fireArg = '100', holdArg = '5', everyArg = '1'] = process.argv.slice(2);
const o = new C64Machine();
o.loadState(unpackState(new Uint8Array(fs.readFileSync(stateFile))));
const r = o.ram;
for (let f = 0; f < Number(framesArg); f++) {
  const fire = f >= Number(fireArg) && f < Number(fireArg) + Number(holdArg);
  o.joy1 = o.joy2 = fire ? 0x0f : 0x1f;
  o.runFrame();
  if (f % Number(everyArg) === 0 || fire) {
    console.log(`f${f} pc $${o.cpu.pc.toString(16)} room $${r[0x402b].toString(16)} state $${r[0x4f87].toString(16)} step ${r[0x4f88]} lives $${r[0x4061].toString(16)} x ${r[0x5c3f]} y ${r[0x5c40]} d011 $${o.vic[0x11].toString(16)} d015 $${o.vic[0x15].toString(16)} 4049 $${r[0x4049].toString(16)} 4007 ${r[0x4007]} 4009 ${r[0x4009]} 400a ${r[0x400a]} 4037 ${r[0x4037]} 4066 ${r[0x4066]} 651e ${r[0x651e]}`);
  }
}
