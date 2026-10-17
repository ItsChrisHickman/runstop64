/**
 * Boots a ZX Spectrum tape on the headless 48K (tools/zx) and drives it, for studying a game: type LOAD "", hold
 * keys over frames, take pictures, save snapshots (and the 64K as a flat dump for the disassembler).
 *
 *   npx esbuild tools/zx/zxprobe.ts --bundle --platform=node --format=esm --outfile=/tmp/zxprobe.mjs
 *   nice -n 15 node /tmp/zxprobe.mjs games/moley/build/moley.tap /tmp/moley --frames 1500 \
 *      --hold ENTER@900-905 --snap 400,1500 --save-state 1500:games/moley/build/title.state
 *
 * Options (frame numbers are the machine's, counted from power-on; the LOAD is typed first):
 *   --rom FILE            the 48K ROM (default games/moley/build/48.rom)
 *   --frames N            run until frame N
 *   --load-state FILE     start from a snapshot instead of booting and loading (the tape is not used)
 *   --hold KEYS@A-B       keys (KEY+KEY) pressed from frame A to B; KEMPSTON:right+fire for the joystick
 *   --snap A,B,...        a PNG of the screen (with its border) at those frames, in the output directory
 *   --save-state N:FILE   a snapshot at frame N;  --dump N:FILE  the 64K of memory at frame N
 *   --beeper FILE         write the beeper log (frame t level) to FILE at the end
 */
import fs from 'node:fs';
import path from 'node:path';
import { bootedSpectrum, readRom, readTape, typeLoad } from './boot';
import { screenPng } from './screen';
import { packState, unpackState } from './snapshot';
import { press, Spectrum } from './spectrum';

interface Hold { readonly keys: readonly string[]; readonly from: number; readonly to: number }

const args = process.argv.slice(2);
const positional = args.filter((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
const [tapeFile, outDir = '/tmp/zxprobe'] = positional;

function option(name: string): string | null {
  const at = args.indexOf(`--${name}`);
  return at >= 0 && at + 1 < args.length ? args[at + 1] : null;
}

function pair(spec: string): { n: number; file: string } {
  const colon = spec.indexOf(':');
  if (colon < 0) throw new Error(`${spec}: expected FRAME:FILE`);
  return { n: Number(spec.slice(0, colon)), file: spec.slice(colon + 1) };
}

function holds(): Hold[] {
  const out: Hold[] = [];
  args.forEach((a, i) => {
    if (a !== '--hold') return;
    const spec = args[i + 1] ?? '';
    const m = /^(.+)@(\d+)-(\d+)$/.exec(spec);
    if (!m) throw new Error(`${spec}: expected KEYS@FROM-TO`);
    out.push({ keys: m[1].split('+'), from: Number(m[2]), to: Number(m[3]) });
  });
  return out;
}

function apply(m: Spectrum, hs: readonly Hold[]) {
  m.releaseAll();
  for (const h of hs) {
    if (m.frame < h.from || m.frame > h.to) continue;
    for (const k of h.keys) press(m, k, true);
  }
}

const framesArg = option('frames');
const stateFile = option('load-state');
if (!stateFile && !tapeFile) throw new Error('usage: zxprobe.ts <tape> [outdir] [--frames N] ...');
const total = Number(framesArg ?? 1000);
fs.mkdirSync(outDir, { recursive: true });

const rom = readRom(option('rom') ?? undefined);
let m: Spectrum;
if (stateFile) {
  m = new Spectrum(rom);
  unpackState(m, new Uint8Array(fs.readFileSync(stateFile)));
} else {
  m = bootedSpectrum(rom);
  m.tape = readTape(tapeFile);
  typeLoad(m);
}
const hs = holds();
const snaps = (option('snap') ?? '').split(',').filter(Boolean).map(Number);
const states = args.flatMap((a, i) => (a === '--save-state' ? [pair(args[i + 1] ?? '')] : []));
const dumps = args.flatMap((a, i) => (a === '--dump' ? [pair(args[i + 1] ?? '')] : []));

function after(machine: Spectrum) {
  if (snaps.includes(machine.frame)) {
    const file = path.join(outDir, `f${String(machine.frame).padStart(5, '0')}.png`);
    screenPng(file, machine.mem, machine.border, machine.flashPhase);
    console.log(`frame ${machine.frame}: ${file}`);
  }
  for (const s of states) if (s.n === machine.frame) { fs.writeFileSync(s.file, packState(machine)); console.log(`frame ${machine.frame}: state ${s.file}`); }
  for (const d of dumps) if (d.n === machine.frame) { fs.writeFileSync(d.file, machine.mem); console.log(`frame ${machine.frame}: dump ${d.file}`); }
}

after(m);
while (m.frame < total) {
  apply(m, hs);
  m.runFrame();
  after(m);
}
console.log(`frame ${m.frame}, PC ${m.cpu.pc.toString(16)}, loaded: ${m.loaded.join('; ') || 'nothing'}`);
const log = option('beeper');
if (log) fs.writeFileSync(log, m.beeper.map((b) => `${b.frame} ${b.t} ${b.level}`).join('\n') + '\n');
