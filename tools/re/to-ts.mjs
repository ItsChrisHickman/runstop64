// 6502 → TypeScript translator, for porting a game's code exactly, routine by routine.
//
//   node tools/re/to-ts.mjs <config.json>
//
// The config names the memory image, the routines to translate (entry points),
// and how to treat special ones. Each routine becomes a TS function over shared
// CPU state (a, x, y and the flags live in `cpu`, so register passing between
// routines works as on the 6502); memory goes through `ram` (plain RAM) or
// `rd`/`wr` (anything that may be I/O or banked). Control flow is rebuilt as
// labelled blocks and loops; flag updates nobody reads are dropped.
//
// Config:
// {
//   "state": "path/to/game.state",      a c64kit .state snapshot to take the memory from (or "image": a 64K RAM dump)
//   "base": "6000", "load": "c200", "len": "700"   (optional) translate a block stored elsewhere as if at base
//   "entries": ["1814", ...],           routines (JSR targets); more are found by following JSRs
//   "stop": ["c17b"],                   JSR targets NOT to translate (external, provided elsewhere)
//   "waits": ["2098"],                  routines that wait for the next frame: `jsr` becomes `yield`
//   "names": {"1814": "mainLoop"},      function names
//   "range": ["0800", "cfff"],          only follow code inside this range
//   "out": "path/to/out.ts",
//   "prefix": "r_",
//   "countCycles": true,                every instruction adds its cycles to cpu.cy (games whose
//                                       main program does its timing by counting: the runtime lets
//                                       that much time pass at the next yield)
//   "waitCycles": {"41bb": "cpu.x * 3332"}, a wait routine that takes this many cycles (a delay)
//   "smcOperand": ["4cc8"],             instructions whose operand the game rewrites: read at run time
//   "smcOpcode": {"c35f": ["ce", "ee"]}, instructions whose opcode the game rewrites: one branch each
//   "callsMayWait": ["6000"],          calls out of the translation (into swapped-in code) whose code may wait for
//                                       frames (some version of it is a generator): `yield* callGen(...)`
//   "hooks": {"65e8": "what happens there"}, instructions that report reaching them (cpu.hk, before
//                                       the instruction runs): moments the front end reacts to (an
//                                       enemy destroyed, the player hurt), for effects and assists
//   "skips": ["51c7"],                  routine entries that may be skipped (cpu.sk: true makes the call return at once, as
//                                       an RTS would): an assist that stops what a routine does (a moment's grace)
// }
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const cfgPath = process.argv[2];
const cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
const rel = (p) => path.resolve(path.dirname(cfgPath), p);
const hex = (s) => parseInt(s, 16);
const h2 = (v) => v.toString(16).padStart(2, '0');
const h4 = (v) => v.toString(16).padStart(4, '0');

// ---- memory image -----------------------------------------------------------------------
let mem;
if (cfg.image) mem = new Uint8Array(fs.readFileSync(rel(cfg.image)));
else if (cfg.state) {
  // a c64kit .state snapshot: [u32 json length][json][64K RAM]...
  const b = fs.readFileSync(rel(cfg.state));
  const n = b.readUInt32LE(0);
  mem = new Uint8Array(b.subarray(4 + n, 4 + n + 0x10000));
}
if (cfg.load) {
  const img = new Uint8Array(65536);
  img.set(mem);
  img.set(mem.subarray(hex(cfg.load), hex(cfg.load) + hex(cfg.len ?? '700')), hex(cfg.base));
  // `patch`: pages the game keeps elsewhere and swaps in with the block, laid out as they are while it runs
  // ([{ from, to, len }]: bytes of the snapshot's memory, as it was, copied to where they sit then)
  for (const p of cfg.patch ?? []) img.set(mem.subarray(hex(p.from), hex(p.from) + hex(p.len)), hex(p.to));
  mem = img;
}
const [RLO, RHI] = (cfg.range ?? ['0000', 'ffff']).map(hex);
const constVectors = Object.fromEntries(Object.entries(cfg.constVectors ?? {}).map(([k, v]) => [hex(k), hex(v)]));
const stop = new Set((cfg.stop ?? []).map(hex));
const waits = new Set((cfg.waits ?? []).map(hex));
// RAM the interrupt handler updates (keyboard scan, jiffy clock): a loop polling it is a wait too.
const volatile = new Set((cfg.volatile ?? []).map(hex));
const touchesMemory = (j) => !['imp', 'acc', 'imm', 'rel'].includes(j.mode) || j.call !== undefined;
const readsHardware = (j) => !j.m.startsWith('st') && ((['abs', 'abx', 'aby'].includes(j.mode) && j.w >= 0xd000 && j.w < 0xe000) || (['zp', 'abs'].includes(j.mode) && volatile.has(j.mode === 'zp' ? j.b1 : j.w)));
// What a wait routine leaves in the registers (code after it may rely on them), e.g. "cpu.a = 0xd7; cpu.y = 4;".
const waitEffects = Object.fromEntries(Object.entries(cfg.waitEffects ?? {}).map(([k, v]) => [hex(k), v]));
const waitCycles = Object.fromEntries(Object.entries(cfg.waitCycles ?? {}).map(([k, v]) => [hex(k), v]));
const waitStmt = (a, pc) => `${waitCycles[a] ? `cpu.cy += ${waitCycles[a]}; ` : ''}yield 0x${h4(pc)};${waitEffects[a] ? ' ' + waitEffects[a] : ''}`;
const countCycles = !!cfg.countCycles;
// TRACE=1 (for debugging, never committed): each instruction reports its address to cpu.tr, to compare with the 6502.
const TRACE = !!process.env.TRACE;
// Hooks: these instructions report their address to cpu.hk (if set) before they run.
const HOOKS = new Set(Object.keys(cfg.hooks ?? {}).map(hex));
// Skips: a routine's entry asks cpu.sk (if set) whether to return at once.
const SKIPS = new Set((cfg.skips ?? []).map(hex));
const skipStmt = (pc) => `if (cpu.sk?.(0x${h4(pc)})) { ${countCycles ? 'cpu.cy += 6; ' : ''}return; }`;
const smcOperand = new Set((cfg.smcOperand ?? []).map(hex));
// Markers: a yield at this instruction (a clean point for the runtime, e.g. the top of a main loop to save at).
const markers = new Set((cfg.markers ?? []).map(hex));
const smcOpcode = new Map(Object.entries(cfg.smcOpcode ?? {}).map(([k, v]) => [hex(k), v.map(hex)]));
// Calls out of the translation to code that may wait (an overlay entry with a version that waits).
const mayWaitCalls = new Set((cfg.callsMayWait ?? []).map(hex));
const names = Object.fromEntries(Object.entries(cfg.names ?? {}).map(([k, v]) => [hex(k), v]));
const prefix = cfg.prefix ?? 'r_';
// Routines translated in another module (e.g. the engine, for room code): called by name.
const externs = new Map(); // addr -> { gen }
if (cfg.extern) {
  const src = fs.readFileSync(rel(cfg.extern.file), 'utf8');
  for (const m of src.matchAll(/export function(\*?) r_([0-9a-f]{4})\(/g)) externs.set(parseInt(m[2], 16), { gen: m[1] === '*' });
}
const externUsed = new Set();
const missingExterns = new Set();
const fname = (a) => names[a] ?? `${prefix}${h4(a)}`;

// ---- opcodes ----------------------------------------------------------------------------
const OPS = {};
const def = (s) => { for (const e of s.trim().split(/\s+/)) { const [o, m, n] = e.split(':'); OPS[parseInt(o, 16)] = [m, n]; } };
def(`00:brk:imp 01:ora:izx 05:ora:zp 06:asl:zp 08:php:imp 09:ora:imm 0a:asl:acc 0d:ora:abs 0e:asl:abs 10:bpl:rel 11:ora:izy 15:ora:zpx 16:asl:zpx 18:clc:imp 19:ora:aby 1d:ora:abx 1e:asl:abx
20:jsr:abs 21:and:izx 24:bit:zp 25:and:zp 26:rol:zp 28:plp:imp 29:and:imm 2a:rol:acc 2c:bit:abs 2d:and:abs 2e:rol:abs 30:bmi:rel 31:and:izy 35:and:zpx 36:rol:zpx 38:sec:imp 39:and:aby 3d:and:abx 3e:rol:abx
40:rti:imp 41:eor:izx 45:eor:zp 46:lsr:zp 48:pha:imp 49:eor:imm 4a:lsr:acc 4c:jmp:abs 4d:eor:abs 4e:lsr:abs 50:bvc:rel 51:eor:izy 55:eor:zpx 56:lsr:zpx 58:cli:imp 59:eor:aby 5d:eor:abx 5e:lsr:abx
60:rts:imp 61:adc:izx 65:adc:zp 66:ror:zp 68:pla:imp 69:adc:imm 6a:ror:acc 6c:jmp:ind 6d:adc:abs 6e:ror:abs 70:bvs:rel 71:adc:izy 75:adc:zpx 76:ror:zpx 78:sei:imp 79:adc:aby 7d:adc:abx 7e:ror:abx
81:sta:izx 84:sty:zp 85:sta:zp 86:stx:zp 88:dey:imp 8a:txa:imp 8c:sty:abs 8d:sta:abs 8e:stx:abs 90:bcc:rel 91:sta:izy 94:sty:zpx 95:sta:zpx 96:stx:zpy 98:tya:imp 99:sta:aby 9a:txs:imp 9d:sta:abx
a0:ldy:imm a1:lda:izx a2:ldx:imm a4:ldy:zp a5:lda:zp a6:ldx:zp a8:tay:imp a9:lda:imm aa:tax:imp ac:ldy:abs ad:lda:abs ae:ldx:abs b0:bcs:rel b1:lda:izy b4:ldy:zpx b5:lda:zpx b6:ldx:zpy b8:clv:imp b9:lda:aby ba:tsx:imp bc:ldy:abx bd:lda:abx be:ldx:aby
c0:cpy:imm c1:cmp:izx c4:cpy:zp c5:cmp:zp c6:dec:zp c8:iny:imp c9:cmp:imm ca:dex:imp cc:cpy:abs cd:cmp:abs ce:dec:abs d0:bne:rel d1:cmp:izy d5:cmp:zpx d6:dec:zpx d8:cld:imp d9:cmp:aby dd:cmp:abx de:dec:abx
e0:cpx:imm e1:sbc:izx e4:cpx:zp e5:sbc:zp e6:inc:zp e8:inx:imp e9:sbc:imm ea:nop:imp ec:cpx:abs ed:sbc:abs ee:inc:abs f0:beq:rel f1:sbc:izy f5:sbc:zpx f6:inc:zpx f8:sed:imp f9:sbc:aby fd:sbc:abx fe:inc:abx`);
const LEN = { imp: 1, acc: 1, imm: 2, zp: 2, zpx: 2, zpy: 2, izx: 2, izy: 2, rel: 2, abs: 3, abx: 3, aby: 3, ind: 3 };

function decode(pc) {
  const op = OPS[mem[pc]];
  // Not a documented opcode (data a branch can't really reach, or an undocumented one):
  // that spot is handed to the 6502 (the runtime's safety net).
  if (!op) return { pc, m: 'bad', mode: 'imp', len: 1, b1: 0, w: 0, next: (pc + 1) & 0xffff, ends: true };
  const [m, mode] = op;
  const b1 = mem[(pc + 1) & 0xffff], w = b1 | (mem[(pc + 2) & 0xffff] << 8);
  const ins = { pc, m, mode, len: LEN[mode], b1, w, next: (pc + LEN[mode]) & 0xffff };
  if (mode === 'rel') ins.target = (pc + 2 + ((b1 << 24) >> 24)) & 0xffff;
  if (m === 'jmp' && mode === 'abs') ins.target = w;
  // JMP (vector) through a vector that never changes in practice: a direct jump (checked at run time)
  if (m === 'jmp' && mode === 'ind' && constVectors[w] !== undefined) { ins.target = constVectors[w]; ins.guard = w; }
  if (m === 'jsr') ins.call = w;
  ins.ends = m === 'rts' || m === 'rti' || m === 'jmp' || m === 'brk';
  return ins;
}

// ---- find routines and their bodies -------------------------------------------------------
const entries = new Set((cfg.entries ?? []).map(hex));
const EXCLUDE = (cfg.exclude ?? []).map(([a, b]) => [hex(a), hex(b)]);
const inRange = (a) => a >= RLO && a <= RHI && !EXCLUDE.some(([p, q]) => a >= p && a <= q);
function body(entry, owners) {
  const seen = new Map();
  const work = [entry];
  while (work.length) {
    const pc = work.pop();
    if (seen.has(pc) || !inRange(pc)) continue;
    if (pc !== entry && entries.has(pc)) continue; // another routine: a tail call
    const ins = decode(pc);
    if (ins.m === 'bad') badOpcodes.push(`$${h4(pc)} ($${h2(mem[pc])}) in $${h4(entry)}`);
    seen.set(pc, ins);
    if (ins.call !== undefined && !stop.has(ins.call) && !waits.has(ins.call) && inRange(ins.call)) entries.add(ins.call), newEntries = true;
    if (ins.target !== undefined) work.push(ins.target);
    if (!ins.ends) work.push(ins.next);
  }
  return seen;
}
let newEntries = true;
const badOpcodes = [];
let bodies = new Map();
for (let guard = 0; guard < 50 && newEntries; guard++) {
  newEntries = false;
  bodies = new Map();
  for (const e of [...entries]) if (!stop.has(e) && !waits.has(e)) bodies.set(e, body(e));
  // Code shared between routines is translated into each of them (jumps stay inside a
  // routine, so loops stay loops); only JSR targets and configured entries are routines.
}

// Decimal mode: if any routine sets it, ADC/SBC everywhere check the D flag.
const decimal = [...bodies.values()].some((b) => [...b.values()].some((i) => i.m === 'sed'));

// ---- returning through more than one call ---------------------------------------------------
// PLA PLA RTS: the PLAs discard the return address, so the RTS returns to the caller's caller.
// Natively a JSR pushes nothing: such pops (found by the stack depth since the routine's entry)
// take nothing off the stack, and the RTS sets cpu.unwind to how many more calls to return
// through; calls to routines that can do that check it.
const popsReturn = new Set(), unwindRts = new Map(); // `${entry}:${pc}` (→ calls to return through)
const keyOf = (e, pc) => `${e}:${pc}`;
function stackDepths(entry, b) {
  const depth = new Map([[entry, 0]]), work = [entry];
  while (work.length) {
    const pc = work.pop(), ins = b.get(pc);
    if (ins.m === 'txs') return null; // sets the stack pointer: not followed
    const d = depth.get(pc) + (['pha', 'php'].includes(ins.m) ? 1 : ['pla', 'plp'].includes(ins.m) ? -1 : 0);
    for (const n of [ins.target, ins.ends ? undefined : ins.next]) {
      if (n === undefined || !b.has(n) || (n !== entry && entries.has(n))) continue;
      if (!depth.has(n)) { depth.set(n, d); work.push(n); } else if (depth.get(n) !== d) return null;
    }
  }
  return depth;
}
for (const [e, b] of bodies) {
  const depth = stackDepths(e, b);
  if (!depth) continue;
  // (only in routines that do return through: other pops past the frame stay real pops)
  const rts = [...b].filter(([pc, ins]) => ins.m === 'rts' && depth.get(pc) < 0);
  if (!rts.length) continue;
  for (const [pc] of rts) {
    const d = depth.get(pc);
    if (d % 2) throw new Error(`$${h4(pc)} in $${h4(e)}: RTS with half a return address popped`);
    unwindRts.set(keyOf(e, pc), -d / 2);
  }
  for (const [pc, ins] of b) if (['pla', 'plp'].includes(ins.m) && depth.get(pc) <= 0) popsReturn.add(keyOf(e, pc));
}
// Routines that can return through more than one call: those RTSes, or jumping on into such a routine.
const mayUnwind = new Set([...unwindRts.keys()].map((k) => Number(k.split(':')[0])));
for (let more = true; more;) {
  more = false;
  for (const [e, b] of bodies) {
    if (mayUnwind.has(e)) continue;
    const onward = [...b.values()].flatMap((i) => [i.ends && i.m === 'jmp' ? i.target : undefined, i.target !== undefined && entries.has(i.target) ? i.target : undefined, !i.ends && entries.has(i.next) ? i.next : undefined]);
    if (onward.some((t) => t !== e && mayUnwind.has(t))) { mayUnwind.add(e); more = true; }
  }
}
const unwindCheck = (a) => (mayUnwind.has(a) ? ' if (cpu.unwind) { cpu.unwind--; return; }' : '');

// ---- generators: routines that (transitively) wait -------------------------------------------
const isGen = new Set();
let changed = true;
const callsOf = (b) => [...b.values()].flatMap((i) => [i.call, i.ends && i.m === 'jmp' ? i.target : undefined, i.target !== undefined && entries.has(i.target) ? i.target : undefined, !i.ends && entries.has(i.next) ? i.next : undefined]).filter((v) => v !== undefined);
const pollsIO = new Set(); // routines with I/O polling loops get yields inside the loop
while (changed) {
  changed = false;
  for (const [e, b] of bodies) {
    if (isGen.has(e)) continue;
    const g = [...b.values()].some((i) => waits.has(i.call) || markers.has(i.pc) || (i.m === 'jmp' && waits.has(i.target))) || callsOf(b).some((t) => isGen.has(t) || externs.get(t)?.gen || mayWaitCalls.has(t)) || hasPollLoop(b);
    if (g) { isGen.add(e); changed = true; }
  }
}
function hasPollLoop(b) {
  // cycle-counted games: any loop gives interrupts a chance (see gotoStmt)
  if (countCycles && [...b.values()].some((i) => i.target !== undefined && i.target <= i.pc && b.has(i.target))) return true;
  // a backward branch whose loop body reads I/O ($D000-$DFFF) and writes nothing: busy-wait on hardware
  for (const i of b.values()) {
    if (i.target === undefined || i.target > i.pc) continue;
    const loop = [...b.values()].filter((j) => j.pc >= i.target && j.pc <= i.pc);
    const writes = loop.some((j) => j.m.startsWith('st') || ['inc', 'dec', 'asl', 'lsr', 'rol', 'ror'].includes(j.m) && j.mode !== 'acc' || j.call !== undefined);
    // (cycle-counted games: any loop that writes nothing lets time pass as it goes; it may be
    // waiting for the interrupt to change something)
    if ((loop.some(readsHardware) && !writes) || (countCycles && !writes)) return true;
  }
  return false;
}

// ---- memory access expressions ----------------------------------------------------------------
const PLAIN_LO = 0x0002, PLAIN_HI = 0x9fff; // RAM whatever the banking: direct array access
const plain = (lo, hi) => lo >= PLAIN_LO && hi <= PLAIN_HI;
function addr(i) {
  const { mode, b1, w } = i;
  if (smcOperand.has(i.pc)) {
    // the game rewrites this operand: take it from memory each time
    const W = `(ram[0x${h4(i.pc + 1)}] | (ram[0x${h4(i.pc + 2)}] << 8))`, B = `ram[0x${h4(i.pc + 1)}]`;
    switch (mode) {
      case 'zp': return { expr: B, plain: false };
      case 'abs': return { expr: W, plain: false };
      case 'abx': return { expr: `(${W} + cpu.x) & 0xffff`, plain: false };
      case 'aby': return { expr: `(${W} + cpu.y) & 0xffff`, plain: false };
      case 'izy': return { expr: `(ptr(${B}) + cpu.y) & 0xffff`, plain: false };
    }
  }
  switch (mode) {
    case 'zp': return { expr: `0x${h2(b1)}`, plain: plain(b1, b1) };
    case 'zpx': return { expr: `(0x${h2(b1)} + cpu.x) & 0xff`, plain: plain(b1, b1 + 0xff) && b1 >= 2 ? false : false, zpIdx: true };
    case 'zpy': return { expr: `(0x${h2(b1)} + cpu.y) & 0xff`, plain: false, zpIdx: true };
    case 'abs': return { expr: `0x${h4(w)}`, plain: plain(w, w) };
    case 'abx': return { expr: `0x${h4(w)} + cpu.x`, plain: plain(w, w + 0xff) };
    case 'aby': return { expr: `0x${h4(w)} + cpu.y`, plain: plain(w, w + 0xff) };
    case 'izx': return { expr: `ptr((0x${h2(b1)} + cpu.x) & 0xff)`, plain: false };
    case 'izy': return { expr: `(ptr(0x${h2(b1)}) + cpu.y) & 0xffff`, plain: false };
  }
  throw new Error(mode);
}
const load = (i) => { const a = addr(i); return a.plain ? `ram[${a.expr}]` : `rd(${a.expr})`; };
const store = (i, v) => { const a = addr(i); return a.plain ? `ram[${a.expr}] = ${v};` : `wr(${a.expr}, ${v});`; };
const operand = (i) => (i.mode === 'imm' ? (smcOperand.has(i.pc) ? `ram[0x${h4(i.pc + 1)}]` : `0x${h2(i.b1)}`) : load(i));
/** 6502 cycles for an instruction (page crossings and taken branches aside). */
// A taken branch: one more cycle, and one more again if it lands on another page.
// A branch or jump straight to an RTS returns: the RTS's cycles still count.
// (n: calls to return through as well, see unwindRts)
const toRtsStmt = (n = 0) => (countCycles || n ? `{ ${countCycles ? 'cpu.cy += 6; ' : ''}${n ? `cpu.unwind = ${n}; ` : ''}return; }` : 'return;');
const rtsStmt = (entry, pc) => (unwindRts.has(keyOf(entry, pc)) ? `cpu.unwind = ${unwindRts.get(keyOf(entry, pc))}; return;` : 'return;');
const unwindAt = (entry, ins) => unwindRts.get(keyOf(entry, ins.target)) ?? 0;
const takenCycles = (i) => 1 + (((i.pc + 2) & 0xff00) !== (i.target & 0xff00) ? 1 : 0);
const condCounted = (i) => (countCycles ? `(${COND[i.m][1]}) && (cpu.cy += ${takenCycles(i)}, true)` : COND[i.m][1]);
// An indexed read whose address crosses a page: one more cycle (stores and read-modify-writes always take it).
function pageCycles(i) {
  if (i.m.startsWith('st') || ['asl', 'lsr', 'rol', 'ror', 'inc', 'dec', 'jmp'].includes(i.m)) return '';
  const lo = smcOperand.has(i.pc) ? `ram[0x${h4(i.pc + 1)}]` : `0x${h2(i.b1)}`;
  if (i.mode === 'abx' || i.mode === 'aby') return ` cpu.cy += (${lo} + cpu.${i.mode === 'abx' ? 'x' : 'y'}) >> 8;`;
  if (i.mode === 'izy') return ` cpu.cy += (ram[0x${h2(i.b1)}] + cpu.y) >> 8;`;
  return '';
}
function insCycles(i) {
  const RMW = ['asl', 'lsr', 'rol', 'ror', 'inc', 'dec'];
  const store = i.m.startsWith('st');
  if (i.m === 'jsr' || i.m === 'rts' || i.m === 'rti') return 6;
  if (i.m === 'jmp') return i.mode === 'ind' ? 5 : 3;
  if (['pha', 'php'].includes(i.m)) return 3;
  if (['pla', 'plp'].includes(i.m)) return 4;
  if (RMW.includes(i.m) && i.mode !== 'acc') return { zp: 5, zpx: 6, abs: 6, abx: 7 }[i.mode];
  return { imp: 2, acc: 2, imm: 2, zp: 3, zpx: 4, zpy: 4, abs: 4, abx: store ? 5 : 4, aby: store ? 5 : 4, izx: 6, izy: store ? 6 : 5, rel: 2, ind: 5 }[i.mode] ?? 2;
}

// ---- per-instruction semantics: statements, and which flags they read/write -------------------------
// Flags: nz (result byte for Z and N), c (0/1), v (0/1). Reads/writes sets drive liveness.
function sem(i) {
  const R = []; let reads = [], writes = [];
  const NZ = (v) => { R.push(`cpu.nz = ${v};`); writes.push('nz'); };
  switch (i.m) {
    case 'lda': R.push(`cpu.a = ${operand(i)};`); NZ('cpu.a'); break;
    case 'ldx': R.push(`cpu.x = ${operand(i)};`); NZ('cpu.x'); break;
    case 'ldy': R.push(`cpu.y = ${operand(i)};`); NZ('cpu.y'); break;
    case 'sta': R.push(store(i, 'cpu.a')); break;
    case 'stx': R.push(store(i, 'cpu.x')); break;
    case 'sty': R.push(store(i, 'cpu.y')); break;
    case 'tax': R.push('cpu.x = cpu.a;'); NZ('cpu.x'); break;
    case 'tay': R.push('cpu.y = cpu.a;'); NZ('cpu.y'); break;
    case 'txa': R.push('cpu.a = cpu.x;'); NZ('cpu.a'); break;
    case 'tya': R.push('cpu.a = cpu.y;'); NZ('cpu.a'); break;
    case 'tsx': R.push('cpu.x = cpu.sp;'); NZ('cpu.x'); break;
    case 'txs': R.push('cpu.sp = cpu.x;'); break;
    case 'inx': R.push('cpu.x = (cpu.x + 1) & 0xff;'); NZ('cpu.x'); break;
    case 'iny': R.push('cpu.y = (cpu.y + 1) & 0xff;'); NZ('cpu.y'); break;
    case 'dex': R.push('cpu.x = (cpu.x - 1) & 0xff;'); NZ('cpu.x'); break;
    case 'dey': R.push('cpu.y = (cpu.y - 1) & 0xff;'); NZ('cpu.y'); break;
    case 'and': R.push(`cpu.a &= ${operand(i)};`); NZ('cpu.a'); break;
    case 'ora': R.push(`cpu.a |= ${operand(i)};`); NZ('cpu.a'); break;
    case 'eor': R.push(`cpu.a ^= ${operand(i)};`); NZ('cpu.a'); break;
    case 'cmp': case 'cpx': case 'cpy': {
      const r = { cmp: 'cpu.a', cpx: 'cpu.x', cpy: 'cpu.y' }[i.m];
      R.push(`t = ${operand(i)};`, `cpu.c = ${r} >= t ? 1 : 0;`, `cpu.nz = (${r} - t) & 0xff;`); writes.push('c', 'nz'); break;
    }
    // N from bit 7 of memory, Z from A AND memory: both can be set (nz = 0x100, see cpu.ts)
    case 'bit': R.push(`t = ${operand(i)};`, 'cpu.v = (t >> 6) & 1;', 'cpu.nz = cpu.a & t ? (t & 0x80) | 1 : (t & 0x80) << 1;'); writes.push('v', 'nz'); break;
    case 'adc':
      if (decimal) { R.push(`t = ${operand(i)};`, 'if (cpu.d) adcD(t); else { r = cpu.a + t + cpu.c; cpu.v = (~(cpu.a ^ t) & (cpu.a ^ r) & 0x80) ? 1 : 0; cpu.c = r > 0xff ? 1 : 0; cpu.a = r & 0xff; cpu.nz = cpu.a; }'); reads.push('c'); writes.push('c', 'v', 'nz'); break; }
      R.push(`t = ${operand(i)};`, 'r = cpu.a + t + cpu.c;', 'cpu.v = (~(cpu.a ^ t) & (cpu.a ^ r) & 0x80) ? 1 : 0;', 'cpu.c = r > 0xff ? 1 : 0;', 'cpu.a = r & 0xff;'); reads.push('c'); writes.push('c', 'v'); NZ('cpu.a'); break;
    case 'sbc':
      if (decimal) { R.push(`t = ${operand(i)};`, 'if (cpu.d) sbcD(t); else { r = cpu.a - t - (1 - cpu.c); cpu.v = ((cpu.a ^ t) & (cpu.a ^ r) & 0x80) ? 1 : 0; cpu.c = r >= 0 ? 1 : 0; cpu.a = r & 0xff; cpu.nz = cpu.a; }'); reads.push('c'); writes.push('c', 'v', 'nz'); break; }
      R.push(`t = ${operand(i)};`, 'r = cpu.a - t - (1 - cpu.c);', 'cpu.v = ((cpu.a ^ t) & (cpu.a ^ r) & 0x80) ? 1 : 0;', 'cpu.c = r >= 0 ? 1 : 0;', 'cpu.a = r & 0xff;'); reads.push('c'); writes.push('c', 'v'); NZ('cpu.a'); break;
    case 'clc': R.push('cpu.c = 0;'); writes.push('c'); break;
    case 'sec': R.push('cpu.c = 1;'); writes.push('c'); break;
    case 'clv': R.push('cpu.v = 0;'); writes.push('v'); break;
    // the interrupt-disable flag (a cycle-timed host holds interrupts while it's set)
    case 'sei': R.push('cpu.i = 1;'); break;
    case 'cli': R.push('cpu.i = 0;'); break;
    case 'nop': break;
    case 'cld': if (decimal) R.push('cpu.d = 0;'); break;
    case 'sed': R.push('cpu.d = 1;'); break;
    case 'inc': case 'dec': {
      const d = i.m === 'inc' ? '+ 1' : '- 1', a = addr(i);
      if (a.plain) { R.push(`t = ram[${a.expr}] = (ram[${a.expr}] ${d}) & 0xff;`); }
      else R.push(`t = (rd(u = ${a.expr}) ${d}) & 0xff;`, `wr(u, t);`);
      NZ('t'); break;
    }
    case 'asl': case 'lsr': case 'rol': case 'ror': {
      const f = {
        asl: ['cpu.c = (v >> 7) & 1;', 'v = (v << 1) & 0xff;'],
        lsr: ['cpu.c = v & 1;', 'v = v >> 1;'],
        rol: ['t = cpu.c; cpu.c = (v >> 7) & 1;', 'v = ((v << 1) | t) & 0xff;'],
        ror: ['t = cpu.c; cpu.c = v & 1;', 'v = (v >> 1) | (t << 7);'],
      }[i.m];
      if (i.m === 'rol' || i.m === 'ror') reads.push('c');
      writes.push('c');
      if (i.mode === 'acc') { R.push(...f.map((s) => s.replace(/\bv\b/g, 'cpu.a'))); NZ('cpu.a'); }
      else {
        const a = addr(i);
        R.push(`u = ${a.expr};`, `r = ${a.plain ? 'ram[u]' : 'rd(u)'};`, ...f.map((s) => s.replace(/\bv\b/g, 'r')), a.plain ? 'ram[u] = r;' : 'wr(u, r);');
        NZ('r');
      }
      break;
    }
    case 'pha': R.push('push(cpu.a);'); break;
    case 'pla': R.push('cpu.a = pop();'); NZ('cpu.a'); break;
    case 'php': R.push('push(flags());'); reads.push('nz', 'c', 'v'); break;
    case 'plp': R.push('t = pop(); setFlags(t); cpu.i = (t >> 2) & 1;'); writes.push('nz', 'c', 'v'); break;
    case 'brk': R.push('throw new Error("BRK");'); break;
    // JMP (vector): wherever the vector points now (the runtime finds the translation, or runs it on the 6502)
    case 'jmp': if (i.mode === 'ind' && i.guard === undefined) R.push(`${'$GEN$'}jump(ram[0x${h4(i.w)}] | (ram[0x${h4((i.w & 0xff00) | ((i.w + 1) & 0xff))}] << 8)); return;`); break;
    case 'bad': R.push(`call(0x${h4(i.pc)}); return; // not a documented opcode: run on the 6502`); break;
    case 'rti': R.push('return; // rti'); reads.push('nz', 'c', 'v'); break;
  }
  if (i.m === 'jsr') writes = ['nz', 'c', 'v'];
  return { stmts: R, reads, writes };
}
const COND = {
  bne: ['nz', '(cpu.nz & 0xff) !== 0'], beq: ['nz', '(cpu.nz & 0xff) === 0'],
  bpl: ['nz', '!(cpu.nz & 0x180)'], bmi: ['nz', '(cpu.nz & 0x180) !== 0'],
  bcc: ['c', 'cpu.c === 0'], bcs: ['c', 'cpu.c !== 0'],
  bvc: ['v', 'cpu.v === 0'], bvs: ['v', 'cpu.v !== 0'],
};

// ---- translate one routine ----------------------------------------------------------------------
function translate(entry, b) {
  const list = [...b.values()].sort((p, q) => p.pc - q.pc);
  const index = new Map(list.map((ins, k) => [ins.pc, k]));
  // A jump to the next instruction laid out (a branch: only when that's also where it falls through,
  // not when the code after it is another routine's).
  const toNext = (ins, k) => ins.target !== undefined && index.get(ins.target) === k + 1 && (ins.ends || ins.target === ins.next);
  const gen = isGen.has(entry);
  // Jump threading: a branch or jmp to a `jmp X` goes straight to X; one to an `rts` returns.
  // (Not through a JMP in cycle-counted games: it takes time.)
  for (const ins of list) {
    if (ins.target === undefined) continue;
    let t = ins.target;
    for (let n = 0; n < 8 && !countCycles && b.has(t) && b.get(t).m === 'jmp' && b.get(t).mode === 'abs' && !(entries.has(t) && t !== entry); n++) t = b.get(t).target;
    ins.target = t;
    if (b.has(t) && b.get(t).m === 'rts' && !(entries.has(t) && t !== entry)) ins.toRts = true;
  }
  // Successors of each instruction (inside this routine).
  const succ = list.map((ins) => {
    const s = [];
    if (ins.target !== undefined && !ins.toRts && index.has(ins.target) && !(ins.target !== entry && entries.has(ins.target))) s.push(index.get(ins.target));
    if (!ins.ends && index.has(ins.next) && !(entries.has(ins.next) && ins.next !== entry)) s.push(index.get(ins.next));
    return s;
  });
  // Flag liveness (backwards dataflow). At exits (rts, tail calls) everything is live.
  const S = list.map((ins) => (popsReturn.has(keyOf(entry, ins.pc))
    ? { stmts: ['/* pops the return address (natively, not on the stack) */'], reads: [], writes: [] }
    : sem(ins)));
  const ALL = ['nz', 'c', 'v'];
  const liveIn = list.map(() => new Set());
  const liveOut = list.map(() => new Set());
  let again = true;
  while (again) {
    again = false;
    for (let k = list.length - 1; k >= 0; k--) {
      const ins = list[k];
      const out = new Set();
      const exits = ins.m === 'rts' || ins.m === 'rti' || ins.toRts ||
        (ins.target !== undefined && !succ[k].includes(index.get(ins.target))) ||
        (!ins.ends && !succ[k].includes(index.get(ins.next)));
      if (exits) ALL.forEach((f) => out.add(f));
      for (const s of succ[k]) for (const f of liveIn[s]) out.add(f);
      const inn = new Set(out);
      for (const f of S[k].writes) inn.delete(f);
      for (const f of S[k].reads) inn.add(f);
      if (COND[ins.m]) inn.add(COND[ins.m][0]);
      // A called routine may branch on the flags it was called with (JSR leaves them alone),
      // so they're live into every call.
      if (ins.call !== undefined) ALL.forEach((f) => inn.add(f));
      if (inn.size !== liveIn[k].size || [...inn].some((f) => !liveIn[k].has(f))) { liveIn[k] = inn; again = true; }
      liveOut[k] = out;
    }
  }
  // Gotos: forward → labelled block, backward → labelled loop.
  const jumps = []; // {from, to}
  list.forEach((ins, k) => {
    if (ins.target !== undefined && index.has(ins.target) && succ[k].includes(index.get(ins.target)) && !toNext(ins, k)) jumps.push({ from: k, to: index.get(ins.target) });
    if (!ins.ends && succ[k].includes(index.get(ins.next)) && index.get(ins.next) !== k + 1) jumps.push({ from: k, to: index.get(ins.next) });
  });
  const blocks = new Map(), loops = new Map(); // to -> start / end
  const entryAt = index.get(entry);
  if (entryAt !== 0) blocks.set(entryAt, 0); // code laid out before the entry point: jump over it
  for (const { from, to } of jumps) {
    if (to > from) blocks.set(to, Math.min(blocks.get(to) ?? from, from));
    else loops.set(to, Math.max(loops.get(to) ?? from, from));
  }
  // Make them nest.
  for (let it = 0; it < 200; it++) {
    let fixed = false;
    const B = [...blocks].map(([to, s]) => ({ s, e: to - 1, to, kind: 'b' }));
    const L = [...loops].map(([to, e]) => ({ s: to, e, to, kind: 'l' }));
    for (const p of [...B, ...L]) for (const q of [...B, ...L]) {
      if (p === q) continue;
      if (!(p.s < q.s && q.s <= p.e && p.e < q.e)) continue; // p starts first, they overlap, q ends later
      // fix: blocks can start earlier, loops can end later
      if (q.kind === 'b') { blocks.set(q.to, p.s); fixed = true; } // q now encloses p
      else if (p.kind === 'l') { loops.set(p.to, q.e); fixed = true; } // p now encloses q
      else return translateSwitch(entry, list, index, succ, liveOut, S, gen);
    }
    if (!fixed) break;
  }
  // Emit.
  const out = [];
  const opens = new Map(), closes = new Map(); // index -> [{label, kind, len}]
  for (const [to, s] of blocks) { (opens.get(s) ?? opens.set(s, []).get(s)).push({ label: `b${h4(list[to].pc)}`, kind: 'b', end: to - 1 }); }
  for (const [to, e] of loops) { (opens.get(to) ?? opens.set(to, []).get(to)).push({ label: `l${h4(list[to].pc)}`, kind: 'l', end: e }); }
  for (const [k, os] of opens) os.sort((p, q) => q.end - p.end || (p.kind === 'b' ? -1 : 1));
  const used = new Set();
  let depth = 1;
  const emit = (s) => out.push('  '.repeat(depth) + s);
  const stack = [];
  const gotoStmt = (from, to) => {
    if (to > from) { used.add(`b${h4(list[to].pc)}`); return `break b${h4(list[to].pc)};`; }
    used.add(`l${h4(list[to].pc)}`);
    // A loop that busy-waits on hardware gives the frame back while it waits.
    // (the yield says where, and how many cycles one pass of the loop takes: the runtime lets that much time pass)
    // Cycle-counted games: going round a loop, let time pass once a raster line's worth has
    // run (an interrupt may be due, and the loop may be waiting for it).
    if (gen && countCycles) return `{ if (cpu.cy >= 63) yield 0x${h4(list[from].pc)}; continue l${h4(list[to].pc)}; }`;
    if (gen && pollLoop(to, from)) return `{ yield 0x${h4(list[from].pc)} | ${loopCycles(list.slice(to, from + 1))} << 16; continue l${h4(list[to].pc)}; }`;
    return `continue l${h4(list[to].pc)};`;
  };
  const pollLoop = (s, e) => {
    const loop = list.slice(s, e + 1);
    const writes = loop.some((j) => j.m.startsWith('st') || (['inc', 'dec', 'asl', 'lsr', 'rol', 'ror'].includes(j.m) && j.mode !== 'acc') || j.call !== undefined);
    return (loop.some(readsHardware) && !writes) || (countCycles && !writes);
  };
  const callStmt = (a, pc) => {
    if (waits.has(a)) return gen ? waitStmt(a, pc) : (waitCycles[a] ? `cpu.cy += ${waitCycles[a]};` : '/* frame wait */');
    if (externs.has(a)) { externUsed.add(a); return externs.get(a).gen ? `yield* ${fname(a)}();` : `${fname(a)}();`; }
    if (mayWaitCalls.has(a) && gen) return `yield* callGen(0x${h4(a)});`;
    if (stop.has(a) || !inRange(a)) { if (cfg.extern) missingExterns.add(a); return `call(0x${h4(a)});`; }
    return (isGen.has(a) ? `yield* ${fname(a)}();` : `${fname(a)}();`) + unwindCheck(a);
  };
  list.forEach((ins, k) => {
    for (const o of opens.get(k) ?? []) {
      emit(o.kind === 'b' ? `${o.label}: {` : `${o.label}: for (;;) {`);
      stack.push(o); depth++;
    }
    // Code laid out before the entry: jump over it on the way in (only then: a loop may
    // start here too, and going round it must run that code).
    if (markers.has(ins.pc) && gen) emit(`yield 0x${h4(ins.pc)}; // a marker: the runtime's clean point here`);
    if (k === 0 && entryAt !== 0) { emit(`if (entering) { entering = false; break b${h4(entry)}; }`); used.add(`b${h4(entry)}`); }
    const c = `// ${h4(ins.pc)} ${ins.m}${ins.mode === 'imp' ? '' : ' ' + fmtArg(ins)}`;
    const keep = (st) => {
      // drop dead flag writes
      if (/^cpu\.nz = /.test(st) && !liveOut[k].has('nz')) return false;
      if (/^cpu\.c = (?!.*cpu\.c)/.test(st) && !liveOut[k].has('c') && !st.includes('t = cpu.c')) return false;
      if (/^cpu\.v = /.test(st) && !liveOut[k].has('v')) return false;
      return true;
    };
    let stmts = S[k].stmts.filter(keep).map((st) => st.replace('$GEN$jump', gen ? 'yield* jumpGen' : 'jump'));
    if (smcOpcode.has(ins.pc)) {
      // the game rewrites this opcode: one branch per form it takes (flags kept: liveness can't see through)
      const alts = smcOpcode.get(ins.pc).map((op) => {
        const save = mem[ins.pc]; mem[ins.pc] = op; const alt = decode(ins.pc); mem[ins.pc] = save;
        return `if (ram[0x${h4(ins.pc)}] === 0x${h2(op)}) { ${sem(alt).stmts.join(' ')} }`;
      });
      stmts = [alts.join(' else ') + ` else { call(0x${h4(ins.pc)}); return; }`];
    }
    if (countCycles) stmts.unshift(`cpu.cy += ${insCycles(ins)};${pageCycles(ins)}`);
    // cmp-like whose flags are all dead: drop the temp too
    if (['cmp', 'cpx', 'cpy', 'bit'].includes(ins.m) && stmts.length === 1 && stmts[0].startsWith('t = ') && !/rd\(/.test(stmts[0])) stmts = [];
    if (HOOKS.has(ins.pc)) stmts = stmts.length ? [`cpu.hk?.(0x${h4(ins.pc)}); ${stmts[0]}`, ...stmts.slice(1)] : [`cpu.hk?.(0x${h4(ins.pc)});`];
    if (SKIPS.has(ins.pc)) stmts.unshift(skipStmt(ins.pc));
    if (TRACE) stmts.unshift(`cpu.tr?.(0x${h4(ins.pc)});`);
    if (stmts.length) { emit(`${stmts[0]}${' '.repeat(Math.max(1, 44 - stmts[0].length))}${c}`); stmts.slice(1).forEach(emit); }
    // control flow
    if (ins.call !== undefined) emit(`${callStmt(ins.call, ins.pc)}${' '.repeat(Math.max(1, 44 - callStmt(ins.call, ins.pc).length))}${c}`);
    if (COND[ins.m]) {
      const cond = condCounted(ins);
      const t = ins.target;
      let then;
      if (ins.toRts) then = toRtsStmt(unwindAt(entry, ins));
      else if (index.has(t) && succ[k].includes(index.get(t))) then = gotoStmt(k, index.get(t));
      else then = `{ ${tail(t)} }`;
      if (!ins.toRts && toNext(ins, k)) emit(countCycles ? `if (${COND[ins.m][1]}) cpu.cy += ${takenCycles(ins)}; // ${h4(ins.pc)} ${ins.m} (to next)` : `// ${h4(ins.pc)} ${ins.m} (to next)`);
      else emit(`if (${cond}) ${then}${' '.repeat(Math.max(1, 40 - cond.length - then.length))}${c}`);
    }
    if (ins.guard !== undefined) emit(`if ((ram[0x${h4(ins.guard)}] | (ram[0x${h4(ins.guard + 1)}] << 8)) !== 0x${h4(ins.target)}) { ${gen ? 'yield* jumpGen' : 'jump'}(ram[0x${h4(ins.guard)}] | (ram[0x${h4(ins.guard + 1)}] << 8)); return; } // (the vector, if it ever differs)`);
    if (ins.m === 'jmp' && (ins.mode !== 'ind' || ins.guard !== undefined)) {
      const t = ins.target;
      if (ins.toRts) emit(`${toRtsStmt(unwindAt(entry, ins))}${' '.repeat(Math.max(1, 44 - toRtsStmt(unwindAt(entry, ins)).length))}${c}`);
      else if (index.has(t) && succ[k].includes(index.get(t))) { if (index.get(t) !== k + 1) emit(`${gotoStmt(k, index.get(t))}${' '.repeat(30)}${c}`); }
      else emit(`${tail(t)}${' '.repeat(10)}${c}`);
    }
    if (ins.m === 'rts') emit(`${rtsStmt(entry, ins.pc)}${' '.repeat(Math.max(1, 44 - rtsStmt(entry, ins.pc).length))}${c}`);
    if (!ins.ends && !(index.has(ins.next) && succ[k].includes(index.get(ins.next)))) emit(`${tail(ins.next)}  // falls into $${h4(ins.next)}`);
    else if (!ins.ends && index.get(ins.next) !== k + 1) emit(gotoStmt(k, index.get(ins.next)));
    // close
    while (stack.length && stack.at(-1).end === k) {
      const o = stack.pop(); depth--;
      if (o.kind === 'l') { out.push('  '.repeat(depth + 1) + `break ${o.label};`); used.add(o.label); }
      emit('}');
    }
  });
  if (stack.length) throw new Error(`unclosed construct in $${h4(entry)}`);
  // Drop labels nobody uses.
  const text = out.map((l) => l.replace(/^(\s*)([bl][0-9a-f]{4}): (\{|for)/, (all, sp, lab, rest) => (used.has(lab) ? all : `${sp}${rest === '{' ? '{' : 'for'}`)));
  function tail(t) {
    if (waits.has(t)) return gen ? `${waitStmt(t, list.find((i) => i.target === t)?.pc ?? t)} return;` : 'return;';
    if (externs.has(t)) { externUsed.add(t); return externs.get(t).gen ? `yield* ${fname(t)}(); return;` : `return ${fname(t)}();`; }
    if (mayWaitCalls.has(t) && gen) return `yield* callGen(0x${h4(t)}); return;`;
    if (stop.has(t) || !inRange(t)) { if (cfg.extern) missingExterns.add(t); return `call(0x${h4(t)}); return;`; }
    return `${isGen.has(t) ? 'yield* ' : 'return '}${fname(t)}();${isGen.has(t) ? ' return;' : ''}`;
  }
  return `export function${gen ? '*' : ''} ${fname(entry)}()${gen ? ': Gen' : ''} {\n${entryAt !== 0 ? '  let entering = true;\n' : ''}${text.join('\n')}\n}\n`;
}
// Fallback for flow that won't nest: a state machine over the jump targets.
function translateSwitch(entry, list, index, succ, liveOut, S, gen) {
  const targets = new Set([entry, list[0].pc]);
  list.forEach((ins, k) => {
    if (ins.target !== undefined && !ins.toRts && succ[k].includes(index.get(ins.target))) targets.add(ins.target);
    if (!ins.ends && succ[k].includes(index.get(ins.next)) && index.get(ins.next) !== k + 1) targets.add(ins.next);
  });
  const out = [];
  const emit = (st) => out.push('      ' + st);
  let here = 0;
  const go = (t) => (gen && countCycles && t <= here
    ? `{ if (cpu.cy >= 63) yield 0x${h4(here)}; pc = 0x${h4(t)}; continue; }` // round a loop: time may pass (see gotoStmt)
    : `{ pc = 0x${h4(t)}; continue; }`);
  list.forEach((ins, k) => {
    here = ins.pc;
    if (targets.has(ins.pc)) out.push(`    case 0x${h4(ins.pc)}:`);
    const c = `// ${h4(ins.pc)} ${ins.m}${ins.mode === 'imp' ? '' : ' ' + fmtArg(ins)}`;
    let stmts = S[k].stmts.map((st) => st.replace('$GEN$jump', gen ? 'yield* jumpGen' : 'jump')).filter((st) => !(/^cpu\.nz = /.test(st) && !liveOut[k].has('nz')) && !(/^cpu\.c = (?!.*cpu\.c)/.test(st) && !liveOut[k].has('c')) && !(/^cpu\.v = /.test(st) && !liveOut[k].has('v')));
    if (smcOpcode.has(ins.pc)) {
      const alts = smcOpcode.get(ins.pc).map((op) => {
        const save = mem[ins.pc]; mem[ins.pc] = op; const alt = decode(ins.pc); mem[ins.pc] = save;
        return `if (ram[0x${h4(ins.pc)}] === 0x${h2(op)}) { ${sem(alt).stmts.join(' ')} }`;
      });
      stmts = [alts.join(' else ') + ` else { call(0x${h4(ins.pc)}); return; }`];
    }
    if (countCycles) stmts.unshift(`cpu.cy += ${insCycles(ins)};${pageCycles(ins)}`);
    if (HOOKS.has(ins.pc)) stmts = stmts.length ? [`cpu.hk?.(0x${h4(ins.pc)}); ${stmts[0]}`, ...stmts.slice(1)] : [`cpu.hk?.(0x${h4(ins.pc)});`];
    if (SKIPS.has(ins.pc)) stmts.unshift(skipStmt(ins.pc));
    if (TRACE) stmts.unshift(`cpu.tr?.(0x${h4(ins.pc)});`);
    if (stmts.length) { emit(`${stmts[0]}  ${c}`); stmts.slice(1).forEach(emit); } else emit(c);
    if (ins.call !== undefined) emit(callStmtFor(ins.call, gen, ins.pc));
    if (COND[ins.m]) emit(`if (${condCounted(ins)}) ${ins.toRts ? toRtsStmt(unwindAt(entry, ins)) : succ[k].includes(index.get(ins.target)) ? go(ins.target) : `{ ${tailFor(ins.target)} }`}`);
    if (ins.guard !== undefined) emit(`if ((ram[0x${h4(ins.guard)}] | (ram[0x${h4(ins.guard + 1)}] << 8)) !== 0x${h4(ins.target)}) { ${gen ? 'yield* jumpGen' : 'jump'}(ram[0x${h4(ins.guard)}] | (ram[0x${h4(ins.guard + 1)}] << 8)); return; }`);
    if (ins.m === 'jmp' && (ins.mode !== 'ind' || ins.guard !== undefined)) emit(ins.toRts ? toRtsStmt(unwindAt(entry, ins)) : succ[k].includes(index.get(ins.target)) ? go(ins.target) : tailFor(ins.target));
    if (ins.m === 'rts') emit(rtsStmt(entry, ins.pc));
    if (!ins.ends && !succ[k].includes(index.get(ins.next))) emit(tailFor(ins.next));
    else if (!ins.ends && index.get(ins.next) !== k + 1) emit(go(ins.next));
  });
  return `export function${gen ? '*' : ''} ${fname(entry)}()${gen ? ': Gen' : ''} {\n  let pc: number = 0x${h4(entry)};\n  for (;;) {\n    switch (pc) {\n${out.join('\n')}\n    }\n    return;\n  }\n}\n`;
}
function callStmtFor(a, gen, pc) {
  if (waits.has(a)) return gen ? waitStmt(a, pc) : (waitCycles[a] ? `cpu.cy += ${waitCycles[a]};` : '/* frame wait */');
  if (externs.has(a)) { externUsed.add(a); return externs.get(a).gen ? `yield* ${fname(a)}();` : `${fname(a)}();`; }
  if (mayWaitCalls.has(a) && gen) return `yield* callGen(0x${h4(a)});`;
  if (stop.has(a) || !inRange(a)) return `call(0x${h4(a)});`;
  return (isGen.has(a) ? `yield* ${fname(a)}();` : `${fname(a)}();`) + unwindCheck(a);
}
function tailFor(t) {
  if (waits.has(t)) return `${waitStmt(t, t)} return;`;
  if (externs.has(t)) { externUsed.add(t); return externs.get(t).gen ? `yield* ${fname(t)}(); return;` : `return ${fname(t)}();`; }
  if (mayWaitCalls.has(t)) return `yield* callGen(0x${h4(t)}); return;`;
  if (stop.has(t) || !inRange(t)) return `call(0x${h4(t)}); return;`;
  return isGen.has(t) ? `yield* ${fname(t)}(); return;` : `return ${fname(t)}();`;
}
/** Cycles for one pass through a loop body (the straight path, branch taken at the end). */
function loopCycles(body) {
  const RMW = ['asl', 'lsr', 'rol', 'ror', 'inc', 'dec'];
  let n = 0;
  for (const i of body) {
    const store = i.m.startsWith('st');
    n += RMW.includes(i.m) && i.mode !== 'acc'
      ? { zp: 5, zpx: 6, abs: 6, abx: 7 }[i.mode]
      : { imp: 2, acc: 2, imm: 2, zp: 3, zpx: 4, zpy: 4, abs: 4, abx: store ? 5 : 4, aby: store ? 5 : 4, izx: 6, izy: store ? 6 : 5, rel: 2, ind: 5 }[i.mode];
    if (i.m === 'jsr' || i.m === 'rts') n += 2;
  }
  return n + 1; // the branch back is taken
}
function fmtArg(i) {
  const { mode, b1, w } = i;
  if (mode === 'rel') return `$${h4(i.target)}`;
  return { acc: 'a', imm: `#$${h2(b1)}`, zp: `$${h2(b1)}`, zpx: `$${h2(b1)},x`, zpy: `$${h2(b1)},y`, izx: `($${h2(b1)},x)`, izy: `($${h2(b1)}),y`, abs: `$${h4(w)}`, abx: `$${h4(w)},x`, aby: `$${h4(w)},y`, ind: `($${h4(w)})` }[mode];
}

// ---- output -------------------------------------------------------------------------------------
const parts = [];
const failed = [];
for (const [e, b] of [...bodies].sort((p, q) => p[0] - q[0])) {
  try { parts.push(translate(e, b)); } catch (err) { if (process.env.DEBUG) console.error(err.stack); failed.push(`$${h4(e)}: ${err.message}`); parts.push(`// $${h4(e)}: NOT TRANSLATED: ${err.message}\n`); }
}
// For overlays: the code bytes each routine was translated from, so the runtime can tell
// which version is loaded (contiguous [address, hex] runs).
if (cfg.emitCode) {
  const code = {};
  for (const [e, b] of [...bodies].sort((p, q) => p[0] - q[0])) {
    const addrs = [...b.values()].flatMap((i) => Array.from({ length: i.len }, (_, k) => i.pc + k)).sort((p, q) => p - q);
    const runs = [];
    for (const a of addrs) {
      const last = runs.at(-1);
      if (last && last[0] + last[1].length / 2 === a) last[1] += h2(mem[a]);
      else runs.push([a, h2(mem[a])]);
    }
    code[fname(e)] = runs;
  }
  parts.push(`/** The code bytes each routine was translated from (to recognise this version when it's loaded). */\nexport const CODE: Record<string, [number, string][]> = ${JSON.stringify(code)};\n`);
}
const bodyText = parts.join('\n');
const used = ['cpu', 'ram', 'rd', 'wr', 'ptr', 'push', 'pop', 'flags', 'setFlags', 'call', 'callGen', 'jump', 'jumpGen', 'adcD', 'sbcD'].filter((n) => new RegExp(`\\b${n}\\(|\\b${n}[.\\[]`).test(bodyText));
if (/: Gen\b/.test(bodyText)) used.push('type Gen');
const temps = ['t', 'r', 'u'].filter((n) => new RegExp(`\\b${n} = `).test(bodyText));
const header = `// Generated by tools/re/to-ts.mjs from ${path.basename(cfgPath)}: do not edit by hand.\n` +
  `import { ${used.join(', ')} } from '${cfg.runtime ?? './cpu'}';\n` +
  (externUsed.size ? `import { ${[...externUsed].sort((p, q) => p - q).map(fname).join(', ')} } from '${cfg.extern.module}';\n` : '') +
  (temps.length ? `let ${temps.map((n) => `${n} = 0`).join(', ')};\n` : '') + '\n';
fs.writeFileSync(rel(cfg.out), header + bodyText);
if (badOpcodes.length) console.error(`undocumented opcodes (handed to the 6502): ${[...new Set(badOpcodes)].join(', ')}`);
if (missingExterns.size) console.error(`calls to untranslated code: ${[...missingExterns].map((a) => '$' + h4(a)).join(' ')}`);
console.error(`${bodies.size} routines (${isGen.size} wait for frames), ${failed.length} failed${failed.length ? ':\n  ' + failed.join('\n  ') : ''}`);
