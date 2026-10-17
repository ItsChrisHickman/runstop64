/**
 * What the game runs: from a snapshot, run frames (with keys held) and report the code that executed (as address
 * ranges: instruction starts and the bytes they cover), the ports read and written, and the hottest 64-byte blocks.
 *
 *   nice -n 15 node tools/test.mjs games/moley/re/profile.ts games/moley/build/play.state 500 [KEYS@A-B ...]
 *
 * MAP=file merges what ran into a coverage map (65536 bytes: 2 = an instruction started here, 1 = inside one) that
 * zxdis.ts --map reads to list only the code that ran. KEYS are `+`-joined key names (O+SPACE) or KEMPSTON:left; A-B are frames counted from the snapshot.
 */
import fs from 'node:fs';
import { readRom } from '../../../tools/zx/boot';
import { disassembleOne } from '../../../tools/zx/disasm';
import { unpackState } from '../../../tools/zx/snapshot';
import { press, Spectrum } from '../../../tools/zx/spectrum';

const [stateFile, framesArg = '300', ...holdArgs] = process.argv.slice(2);
if (!stateFile) throw new Error('usage: profile.ts <state> [frames] [KEYS@A-B ...]');

const m = new Spectrum(readRom());
unpackState(m, new Uint8Array(fs.readFileSync(stateFile)));
const start = m.frame;
const holds = holdArgs.map((a) => {
  const g = /^(.+)@(\d+)-(\d+)$/.exec(a);
  if (!g) throw new Error(`${a}: expected KEYS@A-B`);
  return { keys: g[1].split('+'), from: Number(g[2]), to: Number(g[3]) };
});

const mapFile = process.env.MAP;
const executed = mapFile && fs.existsSync(mapFile) ? new Uint8Array(fs.readFileSync(mapFile)) : new Uint8Array(65536);
const known = executed.slice();
const heat = new Uint32Array(1024);
const portsIn = new Map<number, number>();
const portsOut = new Map<number, number>();
const realIn = m.in.bind(m), realOut = m.out.bind(m);
m.in = (p) => { portsIn.set(p, (portsIn.get(p) ?? 0) + 1); return realIn(p); };
m.out = (p, v, t) => { const k = (p & 0xff) | (v << 8); portsOut.set(k, (portsOut.get(k) ?? 0) + 1); realOut(p, v, t); };
const read = (a: number) => m.mem[a & 0xffff];
m.onStep = (pc) => {
  if (executed[pc] !== 2) {
    const len = disassembleOne(read, pc).length;
    for (let i = 0; i < len; i++) executed[(pc + i) & 0xffff] = 1;
    executed[pc] = 2;
  }
  heat[pc >> 6]++;
};

const total = Number(framesArg);
let seed = Number(process.env.RANDOM ?? 0);
const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
const choices = ['Z', 'X', 'O', 'K', 'SPACE'];
let chosen: string[] = [];
for (let f = 0; f < total; f++) {
  m.releaseAll();
  if (process.env.RANDOM) {
    if (f % 10 === 0) chosen = choices.filter(() => random() < 0.3);
    for (const k of chosen) press(m, k, true);
  }
  for (const h of holds) if (f >= h.from && f <= h.to) for (const k of h.keys) press(m, k, true);
  m.runFrame();
}

if (mapFile) fs.writeFileSync(mapFile, executed);
let fresh = 0;
for (let a = 0; a < 65536; a++) if (executed[a] === 2 && known[a] !== 2) fresh++;
console.log(`${fresh} new instruction addresses`);
const ranges: string[] = [];
for (let a = 0; a < 65536; a++) {
  if (!executed[a]) continue;
  let b = a;
  while (b + 1 < 65536 && executed[b + 1]) b++;
  ranges.push(`${a.toString(16)}-${b.toString(16)}`);
  a = b;
}
console.log(`frames ${start}..${m.frame}; code ran at ${ranges.length} ranges:`);
console.log(ranges.join(' '));
console.log('ports read (port: count):', [...portsIn].map(([p, c]) => `${p.toString(16)}:${c}`).join(' '));
console.log('ports written (port|value<<8: count):', [...portsOut].map(([p, c]) => `${(p & 255).toString(16)}=${(p >> 8).toString(16)}:${c}`).join(' '));
const hot = [...heat.entries()].filter(([, c]) => c > 0).sort((x, y) => y[1] - x[1]).slice(0, 24);
console.log('hottest 64-byte blocks:', hot.map(([b, c]) => `${(b << 6).toString(16)}:${c}`).join(' '));
