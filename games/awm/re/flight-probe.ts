import fs from 'node:fs';
import { unpackState } from 'c64kit';
import { indicesPng, renderPixels } from '../../../tools/probe/render';
import { startOriginal } from '../test/harness';

/**
 * The flight ($758F, which the first notes took for a shop) on the original, for study: Monty starts in `room` at (x, y) carrying `carry` (item types, comma
 * separated), the Commodore key held; the joystick follows `joys` (`UDLRF` letters, `:frames` after each, comma
 * separated). Each frame's flight variables go into `out/log.txt`, and every `every` frames a picture into `out`.
 *
 *   nice -n 15 node tools/test.mjs games/awm/re/flight-probe.ts games/awm/build/play.state out room x y carry frames every joys
 */
const [stateFile = '', out = '.', roomArg = '0', xArg = '0xb8', yArg = '0x68', carryArg = '0', framesArg = '300', everyArg = '10', joysArg = ''] = process.argv.slice(2);
const state = unpackState(new Uint8Array(fs.readFileSync(stateFile)));
const carry = carryArg.split(',').filter(Boolean).map(Number);
const { o } = startOriginal(state, Number(roomArg), Number(xArg), Number(yArg), { carry });
fs.mkdirSync(out, { recursive: true });
const seen = new Set<number>();
const step = o.cpu.step.bind(o.cpu);
const watch = new Map<number, string>([[0x758f, 'boarding'], [0x75c9, 'banner'], [0x75d0, 'screen'], [0x77e3, 'set up'], [0x7f11, 'hit 1'], [0x7f55, 'hit 2'], [0x75f5, 'after'], [0x7610, 'back']]);
let frame = 0;
const lines: string[] = [];
o.cpu.step = () => {
  const label = watch.get(o.cpu.pc);
  if (label && !seen.has(o.cpu.pc)) { seen.add(o.cpu.pc); lines.push(`frame ${frame}: ${label} ($${o.cpu.pc.toString(16)})`); }
  return step();
};
o.keys = [[7, 5]];
const stick: number[] = [];
for (const part of joysArg.split(',').filter(Boolean)) {
  const [j = '', n = '1'] = part.split(':');
  let m = 0;
  for (const c of j) m |= { U: 1, D: 2, L: 4, R: 8, F: 16 }[c] ?? 0;
  for (let i = 0; i < Number(n); i++) stick.push(m);
}
const hex = (a: number, n = 1): string => Array.from({ length: n }, (_, i) => (o.ram[a + i] ?? 0).toString(16).padStart(2, '0')).join('');
for (; frame < Number(framesArg); frame++) {
  o.joy1 = o.joy2 = 0x1f & ~(stick[frame] ?? 0);
  if (!o.runFrame()) throw new Error('the CPU stopped');
  lines.push(`f${frame} pl ${hex(0x809c)},${hex(0x809d)} en ${hex(0x7860)},${hex(0x7861)} hp ${hex(0x7862)}/${hex(0x7863)} dead ${hex(0x7864)} ex ${hex(0x4063)} end ${hex(0x809f)} time ${hex(0x80a1)}${hex(0x80a0)} path ${hex(0x8071, 4)} sc ${hex(0x3a)},${hex(0x3b)} cl ${hex(0x784d, 8)} ${hex(0x785d, 8)} 4065 ${hex(0x4065)} pc ${o.cpu.pc.toString(16)}`);
  if (frame % Number(everyArg) === 0) indicesPng(`${out}/f${String(frame).padStart(4, '0')}.png`, renderPixels(o), 320, 200, 1);
}
fs.writeFileSync(`${out}/log.txt`, lines.join('\n') + '\n');
