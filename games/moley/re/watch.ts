/**
 * Watches addresses: each time the CPU is about to run one of them, prints the frame, the registers and the bytes
 * of the watched variables. Starts from a snapshot, or from a tape (typing LOAD "" first).
 *
 *   nice -n 15 node tools/test.mjs games/moley/re/watch.ts <state|tap> <frames> <pc,pc,...> [KEYS@A-B ...] [--mem addr:len,...] [--max N]
 *
 * Frames are counted from the start of the run (a snapshot's own frame is added to the printed frame).
 */
import fs from 'node:fs';
import { bootedSpectrum, readRom, readTape, typeLoad } from '../../../tools/zx/boot';
import { unpackState } from '../../../tools/zx/snapshot';
import { press, Spectrum } from '../../../tools/zx/spectrum';

const args = process.argv.slice(2);
const flag = (name: string) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : undefined; };
const [file, framesArg, pcsArg, ...rest] = args;
if (!file || !framesArg || !pcsArg) throw new Error('usage: watch.ts <state|tap> <frames> <pc,...> [KEYS@A-B] [--mem a:n,...] [--max N]');
const watch = new Set(pcsArg.split(',').map((s) => parseInt(s, 16)));
const mems = (flag('--mem') ?? '').split(',').filter(Boolean).map((s) => { const [a, n] = s.split(':'); return { a: parseInt(a, 16), n: Number(n ?? 1) }; });
const max = Number(flag('--max') ?? 200);
const holds = rest.filter((a) => /@\d+-\d+$/.test(a)).map((a) => {
  const g = /^(.+)@(\d+)-(\d+)$/.exec(a);
  if (!g) throw new Error(a);
  return { keys: g[1].split('+'), from: Number(g[2]), to: Number(g[3]) };
});

const hex = (n: number, w = 4) => n.toString(16).padStart(w, '0');
let hits = 0;
function watcher(m: Spectrum) {
  m.onStep = (pc) => {
    if (!watch.has(pc) || hits >= max) return;
    hits++;
    const c = m.cpu;
    const bytes = mems.map(({ a, n }) => `${hex(a)}=${[...m.mem.subarray(a, a + n)].map((b) => hex(b, 2)).join(' ')}`).join('  ');
    console.log(`f${m.frame}+${c.t} pc=${hex(pc)} A=${hex(c.regs[7], 2)} BC=${hex(c.bc)} DE=${hex(c.de)} HL=${hex(c.hl)} IX=${hex(c.ix)} SP=${hex(c.sp)} ${bytes}`);
  };
}

let m: Spectrum;
if (file.endsWith('.state')) {
  m = new Spectrum(readRom());
  unpackState(m, new Uint8Array(fs.readFileSync(file)));
  watcher(m);
} else {
  m = bootedSpectrum();
  watcher(m);
  m.tape = readTape(file);
  typeLoad(m);
}
const start = m.frame;
for (let f = 0; f < Number(framesArg); f++) {
  m.releaseAll();
  for (const h of holds) if (f + start >= h.from && f + start <= h.to) for (const k of h.keys) press(m, k, true);
  m.runFrame();
}
console.log(`${hits} hits; frame ${m.frame}`);
