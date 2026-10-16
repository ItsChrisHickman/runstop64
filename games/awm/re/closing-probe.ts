import fs from 'node:fs';
import { C64Machine, unpackState } from 'c64kit';
/**
 * The closing screen's busy loop ($35E8, the colours of the big letters stepped by 29 cycles an iteration): how many
 * iterations the original makes in each frame, and where in the frame the first and last are, from a snapshot with
 * pokes (4048=1,4061=80 is game over; 402a=1 the ending).
 *
 *   nice -n 15 node tools/test.mjs games/awm/re/closing-probe.ts games/awm/build/play.state frames 4048=1,4061=80
 */
const [stateFile = '', framesArg = '60', pokes = ''] = process.argv.slice(2);
const o = new C64Machine();
o.loadState(unpackState(new Uint8Array(fs.readFileSync(stateFile))));
for (const p of pokes.split(',').filter(Boolean)) {
  const [a = '', v = ''] = p.split('=');
  o.ram[parseInt(a, 16)] = parseInt(v, 16);
}
let iterations = 0, firstLine = -1, lastLine = -1, pcs = new Map<number, number>();
const step = o.cpu.step.bind(o.cpu);
o.cpu.step = () => {
  const pc = o.cpu.pc;
  if (pc === 0x35e8) {
    iterations++;
    if (firstLine < 0) firstLine = o.line;
    lastLine = o.line;
  }
  if (pc >= 0x3540 && pc < 0x3600) pcs.set(pc, (pcs.get(pc) ?? 0) + 1);
  return step();
};
const r = o.ram;
for (let f = 0; f < Number(framesArg); f++) {
  iterations = 0; firstLine = lastLine = -1;
  o.runFrame();
  console.log(`frame ${f}: ${iterations} iterations (lines ${firstLine}-${lastLine}), colours $${[0x27, 0x28, 0x29, 0x2a].map((n) => (o.vic[n] ?? 0).toString(16)).join(' ')}, $4029 $${(r[0x4029] ?? 0).toString(16)} ptr $${(r[0x7f8] ?? 0).toString(16)} pc $${o.cpu.pc.toString(16)} d015 $${(o.vic[0x15] ?? 0).toString(16)} d01c $${(o.vic[0x1c] ?? 0).toString(16)} d017 $${(o.vic[0x17] ?? 0).toString(16)} d01d $${(o.vic[0x1d] ?? 0).toString(16)}`);
}
