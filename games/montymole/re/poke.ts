/**
 * Try something on the original: load a saved state, poke memory, jump somewhere, hold keys, run frames, and report
 * memory and take pictures.
 *
 *   nice -n 15 node tools/test.mjs games/montymole/re/poke.ts <state> <frames> [options]
 *
 *   --poke ADDR=VALUE[,ADDR=VALUE...]   bytes written first (hex; ADDR:W=VALUE writes a little-endian word)
 *   --pc ADDR                           start running at ADDR (the saved state's stack is kept)
 *   --jump FRAME:ADDR                   at that frame, jump to ADDR (e.g. 3:946e: die once the room is up)
 *   --hold KEYS@A-B                     keys (Q+SPACE...) held from frame A to B, counted from the start
 *   --show ADDR:LEN[,ADDR:LEN...]       memory printed every --every frames and at the end
 *   --every N                           how often to print --show (default: only at the end)
 *   --snap F[,F...]                     a PNG of the screen at those frames (into --out)
 *   --out DIR                           where the PNGs go (default /tmp/montymole-poke)
 *   --save FILE                         a state saved at the end
 *   --count ADDR[,ADDR...]              count how often the program counter reaches these addresses (printed at the end)
 *   --watch ADDR[,ADDR...]              say when a byte at these addresses changes, with the PC that wrote it
 */
import fs from 'node:fs';
import path from 'node:path';
import { screenPng } from '../../../tools/zx/screen';
import { packState } from '../../../tools/zx/snapshot';
import { press } from '../../../tools/zx/spectrum';
import { machineFrom } from '../test/original';

const args = process.argv.slice(2);
const [stateFile, framesArg] = args;
if (!stateFile || !framesArg) throw new Error('usage: poke.ts <state> <frames> [options]');

function option(name: string): string | null {
  const at = args.indexOf(`--${name}`);
  return at >= 0 ? (args[at + 1] ?? null) : null;
}
function all(name: string): string[] {
  return args.flatMap((a, i) => (a === `--${name}` ? [args[i + 1] ?? ''] : []));
}

const m = machineFrom(stateFile);
m.cpu.iff1 = true; // the original runs with its interrupt on
m.cpu.iff2 = true;

for (const spec of all('poke').flatMap((s) => s.split(','))) {
  const g = /^([0-9a-f]+)(:w)?=([0-9a-f]+)$/i.exec(spec);
  if (!g) throw new Error(`${spec}: expected ADDR=VALUE`);
  const addr = parseInt(g[1], 16), value = parseInt(g[3], 16);
  m.mem[addr] = value & 255;
  if (g[2]) m.mem[addr + 1] = value >> 8;
}
const pc = option('pc');
if (pc) { m.cpu.pc = parseInt(pc, 16); m.cpu.halted = false; }

const holds = all('hold').map((h) => {
  const g = /^(.+)@(\d+)-(\d+)$/.exec(h);
  if (!g) throw new Error(`${h}: expected KEYS@A-B`);
  return { keys: g[1].split('+'), from: Number(g[2]), to: Number(g[3]) };
});
const shows = all('show').flatMap((s) => s.split(',')).map((s) => {
  const [a, l] = s.split(':');
  return { addr: parseInt(a, 16), len: Number(l ?? '1') };
});
const snaps = (option('snap') ?? '').split(',').filter(Boolean).map(Number);
const out = option('out') ?? '/tmp/montymole-poke';
const every = Number(option('every') ?? '0');
const watched = new Map<number, number>((option('watch') ?? '').split(',').filter(Boolean).map((a) => [parseInt(a, 16), 0]));
for (const a of watched.keys()) watched.set(a, m.mem[a]);
const counted = new Map<number, number>((option('count') ?? '').split(',').filter(Boolean).map((a) => [parseInt(a, 16), 0]));
const jumps = all('jump').map((j) => { const [f, a] = j.split(':'); return { frame: Number(f), addr: parseInt(a ?? '', 16) }; });
let frameNo = 0;

const hex = (a: number, n: number) => Array.from(m.mem.subarray(a, a + n), (v) => v.toString(16).padStart(2, '0')).join(' ');
const report = (label: string) => console.log(`${label}: ${shows.map((s) => `${s.addr.toString(16)}[${hex(s.addr, s.len)}]`).join(' ')}`);

if (watched.size > 0 || counted.size > 0) {
  m.onStep = (at) => {
    const hits = counted.get(at);
    if (hits !== undefined) counted.set(at, hits + 1);
    for (const [a, old] of watched) {
      if (m.mem[a] !== old) {
        console.log(`frame ${frameNo}: $${a.toString(16)} ${old.toString(16)} -> ${m.mem[a].toString(16)} (written by the instruction before $${at.toString(16)})`);
        watched.set(a, m.mem[a]);
      }
    }
  };
}
if (snaps.length > 0) fs.mkdirSync(out, { recursive: true });
report('start');
for (frameNo = 0; frameNo < Number(framesArg); frameNo++) {
  m.releaseAll();
  for (const j of jumps) if (j.frame === frameNo) { m.cpu.pc = j.addr; m.cpu.halted = false; }
  for (const h of holds) if (frameNo >= h.from && frameNo <= h.to) for (const k of h.keys) press(m, k, true);
  m.runFrame();
  if (snaps.includes(frameNo + 1)) screenPng(path.join(out, `f${String(frameNo + 1).padStart(5, '0')}.png`), m.mem, m.border, m.flashPhase);
  if (every > 0 && (frameNo + 1) % every === 0) report(`frame ${frameNo + 1}`);
}
report(`end (frame ${frameNo}, PC $${m.cpu.pc.toString(16)})`);
for (const [a, n] of counted) console.log(`$${a.toString(16)} reached ${n} times in ${frameNo} frames`);
const save = option('save');
if (save) fs.writeFileSync(save, packState(m));
