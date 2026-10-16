/**
 * c64probe — boot a C64 game image far enough to study it (see README.md).
 *
 * Usage:
 *   node probe.mjs <file.prg> <outdir> [--disk game.d64] [--frames N] [--snap F,..]
 *     [--fire F,..] [--hold dir@from-to,..] [--save-state frame:file] [--dump-at pc:file]
 */
import fs from 'node:fs';
import path from 'node:path';
import { C64, packState, unpackState } from '../../packages/c64kit/src/c64/machine';
import { isRecord, isString } from '../../games/shared/guards';
import { renderPng } from './render';
import { C64_KEYS } from '../../packages/c64kit/src/c64/keyboard';

const args = process.argv.slice(2);
const [prgPath, outDir] = args;
const opt = (name: string, def: string) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : def;
};
const FRAMES = Number(opt('frames', '600'));
const FIRE = opt('fire', '').split(',').filter(Boolean).map(Number);
const SNAPS = opt('snap', '').split(',').filter(Boolean).map(Number);
const DISK = opt('disk', '');
const SAVE = opt('save-state', '');
/** JSON {"7611": "TEXT" | {"hex": "a9 00"}}: memory patches applied when the game starts (at RESET/RUN). */
const PATCH = opt('patch', '');
/** Apply the patches at this frame instead (when the game unpacks itself after RUN). */
const PATCH_FRAME = Number(opt('patch-frame', '-1'));
/** Count executed PCs from this frame on, and list the hottest in the report. */
const HOT_FROM = Number(opt('hot', '-1'));
let HOT = false;
const HOLDS = opt('hold', '').split(',').filter(Boolean).map((h) => {
  const [dir, range] = h.split('@');
  const [a, b] = range.split('-').map(Number);
  return { dir, a, b };
});
fs.mkdirSync(outDir, { recursive: true });

const m = new C64();
const { ram, cpu } = m;
const log: string[] = [];
// Ring buffer of recent PCs, dumped when the CPU stops (to see how it got there).
const trail = new Uint16Array(64);
let trailAt = 0;
const step = cpu.step.bind(cpu);
cpu.step = () => { if (firstRange && firstFound < 0 && frameNow >= Number(firstFrame) && cpu.pc >= firstLo && cpu.pc <= firstHi) { firstFound = cpu.pc; log.push(`first in range: $${cpu.pc.toString(16)} (frame ${frameNow}, sp $${cpu.sp.toString(16)})`); } if (dumpAtFile && cpu.pc === dumpAtPc) { fs.writeFileSync(dumpAtFile, ram); log.push(`RAM at $${cpu.pc.toString(16)} (frame ${frameNow}) -> ${dumpAtFile}`); dumpAtFile = ''; } trail[trailAt++ & 63] = cpu.pc; if (SMC) executed[cpu.pc] = 1; if (HOT) hot.set(cpu.pc, (hot.get(cpu.pc) ?? 0) + 1); return step(); };
const hot = new Map<number, number>();
// --dump-at pc:file writes the 64K RAM the first time the CPU reaches pc (e.g. a game's entry, once it has unpacked itself).
const [dumpAtHex, dumpAtTo] = opt('dump-at', ':').split(':');
const dumpAtPc = parseInt(dumpAtHex || '-1', 16);
let dumpAtFile = dumpAtTo;
// --smc file: every write into code that ran (self-modifying code), as {writer pc: [addresses]}.
const SMC = opt('smc', '');
const executed = new Uint8Array(0x10000);
const writesTo = new Map<number, Set<number>>(); // address -> writer pcs
if (SMC) {
  const w = cpu.write.bind(cpu);
  // (only writes into code that has already run: copying a program into place isn't self-modification)
  cpu.write = (a: number, v: number) => {
    a &= 0xffff;
    if (executed[a] || executed[(a - 1) & 0xffff] || executed[(a - 2) & 0xffff]) { const pcs = writesTo.get(a) ?? new Set<number>(); writesTo.set(a, pcs); pcs.add(cpu.pc); }
    return w(a, v);
  };
}
// --first lo-hi@frame: report the first instruction run in lo..hi from that frame on (e.g. a game's entry after unpacking)
const [firstRange, firstFrame] = opt('first', '').split('@');
const [firstLo, firstHi] = (firstRange || '0-0').split('-').map((x) => parseInt(x, 16));
let firstFound = -1, frameNow = 0;
const lastPcs = () => Array.from({ length: 64 }, (_, i) => trail[(trailAt + i) & 63].toString(16)).join(' ');

// ---- KERNAL / BASIC stand-ins ----------------------------------------------------------

const cint = () => {
  const v = m.vic;
  v[0x11] = 0x1b; v[0x16] = 0x08; v[0x18] = 0x15; v[0x20] = 0x0e; v[0x21] = 0x06;
  ram.fill(0x20, 0x0400, 0x07e8); m.colour.fill(0x0e);
  log.push('CINT');
};
const ioinit = () => {
  m.cia2.pra = 0x97;
  m.cia1.pra = 0x7f; // as the KERNAL keyboard scan leaves it
  Object.assign(m.cia1, { latch: 0x4025, ta: 0x4025, cra: 0x11, mask: 0x01 });
  log.push('IOINIT');
};
const restor = () => { ram[0x314] = 0x31; ram[0x315] = 0xea; ram[0x318] = 0x43; ram[0x319] = 0xfe; log.push('RESTOR'); };
for (const a of [0xff81, 0xff5b]) m.hooks.set(a, cint);
for (const a of [0xff84, 0xfda3]) m.hooks.set(a, ioinit);
for (const a of [0xff8a, 0xfd15]) m.hooks.set(a, restor);
for (const a of [0xff87, 0xfd50]) m.hooks.set(a, () => { log.push('RAMTAS'); });

// Virtual disk drive: OPEN/TALK/ACPTR and LOAD served from a .d64.
const disk = DISK ? readD64(DISK) : new Map<string, Buffer>();
let fileName = '';
let stream: Buffer | null = null;
let streamPos = 0;
const findFile = (pattern: string) => {
  for (const [name, data] of disk) if (pattern.endsWith('*') ? name.startsWith(pattern.slice(0, -1)) : name === pattern) return { name, data };
  return null;
};
m.hooks.set(0xffbd, () => { const at = cpu.x | (cpu.y << 8); fileName = Buffer.from(ram.subarray(at, at + cpu.a)).toString('latin1'); });
m.hooks.set(0xffc0, () => { const f = findFile(fileName); stream = f?.data ?? null; streamPos = 0; log.push(`OPEN "${fileName}" -> ${f ? f.name : 'not found'}`); cpu.p &= ~1; });
const acptr = () => { if (!stream) { cpu.a = 0; ram[0x90] |= 0x42; return; } cpu.a = stream[streamPos++] ?? 0; ram[0x90] = streamPos >= stream.length ? 0x40 : 0; };
m.hooks.set(0xee13, acptr);
m.hooks.set(0xffa5, acptr);
m.hooks.set(0xffd5, () => {
  const f = findFile(fileName);
  log.push(`LOAD "${fileName}" -> ${f ? f.name : 'not found'}`);
  if (!f) { cpu.p |= 1; return; }
  const addr = f.data[0] | (f.data[1] << 8);
  ram.set(f.data.subarray(2), addr);
  cpu.x = (addr + f.data.length - 2) & 0xff; cpu.y = (addr + f.data.length - 2) >> 8; cpu.p &= ~1;
});
const applyPatches = (now = false) => {
  if (!PATCH || (PATCH_FRAME >= 0 && !now)) return;
  const p: unknown = JSON.parse(fs.readFileSync(PATCH, 'utf8'));
  if (!isRecord(p)) throw new Error(`${PATCH}: not a patch (address: text, or { hex })`);
  for (const [addr, v] of Object.entries(p)) {
    const bytes = isString(v) ? Buffer.from(v, 'latin1') : isRecord(v) && isString(v.hex) ? Buffer.from(v.hex.replace(/\s+/g, ''), 'hex') : null;
    if (!bytes) throw new Error(`${PATCH}: $${addr} is neither text nor { hex }`);
    ram.set(bytes, parseInt(addr, 16));
    log.push(`patched $${addr} (${bytes.length} bytes)`);
  }
};
// RESET: start a cartridge if its signature is in RAM at $8000.
m.hooks.set(0xfce2, () => {
  const sig = Buffer.from(ram.subarray(0x8004, 0x8009)).toString('latin1');
  log.push(`RESET, $8004="${sig}"`);
  if (sig === '\xc3\xc2\xcd80') { applyPatches(); cpu.sp = 0xff; ram[1] = 0x37; cpu.p |= 0x04; cpu.pc = ram[0x8000] | (ram[0x8001] << 8); return 'continue'; }
});
// BASIC: CLR-style calls return; RUN starts the program's SYS.
const run = () => {
  const m2 = Buffer.from(ram.subarray(0x0801, 0x0a00)).toString('latin1').match(/\x9e\s*\(?\s*(\d+)/);
  log.push(`BASIC RUN -> ${m2 ? 'SYS ' + m2[1] : 'no SYS'}`);
  if (m2) { applyPatches(); cpu.sp = 0xf6; cpu.pc = Number(m2[1]); return 'continue' as const; }
};
for (const a of [0xa7ae, 0xa871, 0xa7e4]) m.hooks.set(a, run);
for (const a of [0xa659, 0xa660, 0xa68e]) m.hooks.set(a, () => {});

// SCNKEY/GETIN: a newly pressed key comes back as PETSCII.
const PETSCII: Record<string, number> = { F1: 0x85, F3: 0x86, F5: 0x87, F7: 0x88, Space: 0x20, Enter: 0x0d };
let typed: string[] = [];
let wasHeld = new Set<string>();
m.hooks.set(0xff9f, () => {});
m.hooks.set(0xffe4, () => {
  const k = typed.shift();
  cpu.a = k ? PETSCII[k] ?? (k.startsWith('Key') ? k.charCodeAt(3) : k.startsWith('Digit') ? k.charCodeAt(5) : 0) : 0;
  cpu.p = cpu.a ? cpu.p & ~2 : cpu.p | 2;
});

// ---- load and run ------------------------------------------------------------------------

const prg = fs.readFileSync(prgPath);
const fromState = prgPath.endsWith('.state');
const load = fromState ? 0 : prg[0] | (prg[1] << 8);
if (fromState) m.loadState(unpackState(new Uint8Array(prg)));
else ram.set(prg.subarray(2), load);
let start = fromState ? cpu.pc : load;
if (load === 0x0801) {
  const sys = Buffer.from(ram.subarray(0x0801, 0x0900)).toString('latin1').match(/\x9e\s*\(?\s*(\d+)/);
  if (sys) start = Number(sys[1]);
}
if (!fromState) {
  // The machine as the KERNAL leaves it after power-on, before the program runs.
  cint(); ioinit(); restor();
  log.length = 0;
  cpu.pc = start;
  cpu.sp = 0xf6;
}

const KEYS: Record<string, [number, number]> = { left: [1, 4], right: [2, 7], up: [6, 2], down: [6, 7], fire: [7, 4] };
const JOY: Record<string, number> = { up: 1, down: 2, left: 4, right: 8, fire: 16 };
const [saveFrame, saveFile] = SAVE ? SAVE.split(':') : ['', ''];
/** --dump F:file writes the 64K RAM at frame F (for disassembly). */
const [dumpFrame, dumpFile] = opt('dump', ':').split(':');
for (let frame = 0; frame < FRAMES; frame++) {
  m.joy1 = m.joy2 = 0x1f;
  m.keys = [];
  const held = HOLDS.filter((h) => frame >= h.a && frame < h.b).map((h) => h.dir);
  if (FIRE.some((f) => frame >= f && frame < f + 4)) held.push('fire');
  for (const d of held) if (!wasHeld.has(d)) typed.push(d);
  wasHeld = new Set(held);
  // Joystick directions also press the usual keys; any other name is a C64 key (F5, KeyR, Space...).
  for (const d of held) {
    if (JOY[d]) { m.joy1 &= ~JOY[d]; m.joy2 &= ~JOY[d]; m.keys.push(KEYS[d]); } else if (C64_KEYS[d]) m.keys.push(C64_KEYS[d]);
  }
  frameNow = frame;
  if (frame === PATCH_FRAME) applyPatches(true);
  HOT = HOT_FROM >= 0 && frame >= HOT_FROM;
  if (!m.runFrame()) { log.push(`CPU stopped at frame ${frame}; last PCs: ${lastPcs()}`); break; }
  if (SNAPS.includes(frame)) renderPng(m, path.join(outDir, `frame${frame}-screen.png`));
  if (dumpFile && frame === Number(dumpFrame)) fs.writeFileSync(dumpFile, ram);
  if (SAVE && frame === Number(saveFrame)) { fs.writeFileSync(saveFile, packState(m.saveState())); log.push(`state saved at frame ${frame} -> ${saveFile}`); }
}
renderPng(m, path.join(outDir, 'final-screen.png'));
if (SMC) {
  // a write into an instruction's opcode or operand (instruction starts we saw executed; operands up to 2 after)
  const found: Record<string, string[]> = {};
  for (const [a, pcs] of writesTo) {
    const owner = executed[a] ? a : executed[a - 1] ? a - 1 : executed[a - 2] ? a - 2 : -1;
    if (owner < 0 || (a >= 0x100 && a < 0x200)) continue;
    for (const pc of pcs) (found[pc.toString(16)] ??= []).push(`${a.toString(16)} (in instruction at ${owner.toString(16)})`);
  }
  fs.writeFileSync(SMC, JSON.stringify(found, null, 1));
  log.push(`self-modifying writes: ${Object.keys(found).length} writers`);
}
const v = m.vic;
const hex = (n: number) => n.toString(16).padStart(2, '0');
const report = [
  `loaded $${load.toString(16)}-$${(load + prg.length - 3).toString(16)}, start $${start.toString(16)}; pc now $${cpu.pc.toString(16)}, $01=${hex(ram[1])}`,
  `vectors: $0314=$${(ram[0x314] | (ram[0x315] << 8)).toString(16)} $FFFE=$${(ram[0xfffe] | (ram[0xffff] << 8)).toString(16)}`,
  `VIC: D011=${hex(v[0x11])} D016=${hex(v[0x16])} D018=${hex(v[0x18])} DD00=${hex(m.cia2.pra)} D015=${hex(v[0x15])} D01C=${hex(v[0x1c])} raster IRQ ${m.rasterCompare}`,
  `log: ${log.join(' | ')}`,
  ...(hot.size ? [`hot: ${[...hot].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([pc, n]) => `${pc.toString(16)}:${n}`).join(' ')}`] : []),
];
fs.writeFileSync(path.join(outDir, 'report.txt'), report.join('\n') + '\n');
console.log(report.join('\n'));

function readD64(file: string) {
  const d = fs.readFileSync(file);
  const spt = (t: number) => (t <= 17 ? 21 : t <= 24 ? 19 : t <= 30 ? 18 : 17);
  const off = (t: number, s: number) => { let o = 0; for (let i = 1; i < t; i++) o += spt(i); return (o + s) * 256; };
  const sec = (t: number, s: number) => d.subarray(off(t, s), off(t, s) + 256);
  const files = new Map<string, Buffer>();
  let [t, s] = [18, 1];
  const seen = new Set<string>();
  while (t && !seen.has(`${t}/${s}`)) {
    seen.add(`${t}/${s}`);
    const dir = sec(t, s);
    for (let e = 0; e < 8; e++) {
      const en = dir.subarray(e * 32, e * 32 + 32);
      if (!(en[2] & 0x80)) continue;
      const name = Buffer.from(en.subarray(5, 21)).toString('latin1').replace(/\xa0+$/, '');
      const chunks: Buffer[] = [];
      let [ft, fs_] = [en[3], en[4]];
      const g = new Set<string>();
      while (ft && !g.has(`${ft}/${fs_}`)) {
        g.add(`${ft}/${fs_}`);
        const b = sec(ft, fs_);
        if (b[0] === 0) { chunks.push(b.subarray(2, b[1] + 1)); break; }
        chunks.push(b.subarray(2));
        [ft, fs_] = [b[0], b[1]];
      }
      files.set(name, Buffer.concat(chunks));
    }
    [t, s] = [dir[0], dir[1]];
  }
  return files;
}
