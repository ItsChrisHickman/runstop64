/**
 * The Z80 core (tools/zx/z80.ts) against things known: T-states of instructions, flags (documented and the
 * undocumented X and Y), the interrupt rules, and that the disassembler (tools/zx/disasm.ts) agrees with the CPU
 * on how long every opcode is. The exerciser suites zexdoc and zexall (zex.ts) are the exhaustive check of the ALU;
 * this runs in seconds and needs no file.
 *
 *   nice -n 15 node tools/test.mjs tools/zx/test/cpu.ts
 */
import { check, finish } from '../../../games/shared/test/check';
import { disassembleOne } from '../disasm';
import { Z80, type Bus } from '../z80';

/** A flat 64K machine; `reads` lists every address read (for instruction lengths); ports answer `inValue`. */
class Flat implements Bus {
  readonly mem = new Uint8Array(65536);
  reads: number[] = [];
  outs: { port: number; value: number; t: number }[] = [];
  inValue = 0xff;
  read(a: number) { this.reads.push(a); return this.mem[a]; }
  write(a: number, v: number) { this.mem[a] = v; }
  in() { return this.inValue; }
  out(port: number, value: number, t: number) { this.outs.push({ port, value, t }); }
}

function machine(code: readonly number[], at = 0x8000) {
  const bus = new Flat();
  const cpu = new Z80(bus);
  cpu.reset();
  cpu.sp = 0xf000;
  cpu.pc = at;
  code.forEach((b, i) => { bus.mem[at + i] = b; });
  return { bus, cpu };
}

const [A, F] = [7, 6];
const [S, Z, Y, H, X, P, N, C] = [0x80, 0x40, 0x20, 0x10, 0x08, 0x04, 0x02, 0x01];

// ---- T-states ------------------------------------------------------------------------------------------

/** [name, code, T-states, setup of F (so a condition is taken or not)] */
const TIMES: [string, number[], number, number?][] = [
  ['NOP', [0x00], 4], ['LD A,n', [0x3e, 1], 7], ['LD (HL),n', [0x36, 1], 10], ['LD A,(IX+5)', [0xdd, 0x7e, 5], 19],
  ['LD (IX+5),n', [0xdd, 0x36, 5, 1], 19], ['LD (IX+5),B', [0xdd, 0x70, 5], 19], ['LD IXH,n', [0xdd, 0x26, 1], 11], ['LD B,IXH', [0xdd, 0x44], 8],
  ['ADD HL,BC', [0x09], 11], ['ADD IX,BC', [0xdd, 0x09], 15], ['INC HL', [0x23], 6], ['INC IX', [0xdd, 0x23], 10],
  ['INC (HL)', [0x34], 11], ['INC (IX+d)', [0xdd, 0x34, 1], 23], ['ADD A,(HL)', [0x86], 7], ['ADD A,(IY+d)', [0xfd, 0x86, 1], 19],
  ['PUSH BC', [0xc5], 11], ['PUSH IX', [0xdd, 0xe5], 15], ['POP BC', [0xc1], 10], ['POP IX', [0xdd, 0xe1], 14],
  ['CALL nn', [0xcd, 0, 0x90], 17], ['CALL NZ taken', [0xc4, 0, 0x90], 17, 0], ['CALL NZ not taken', [0xc4, 0, 0x90], 10, Z],
  ['RET', [0xc9], 10], ['RET NZ taken', [0xc0], 11, 0], ['RET NZ not taken', [0xc0], 5, Z],
  ['JP nn', [0xc3, 0, 0x90], 10], ['JP Z not taken', [0xca, 0, 0x90], 10, 0], ['JP (HL)', [0xe9], 4], ['JP (IX)', [0xdd, 0xe9], 8],
  ['JR taken', [0x18, 5], 12], ['JR NZ taken', [0x20, 5], 12, 0], ['JR NZ not taken', [0x20, 5], 7, Z], ['DJNZ taken', [0x10, 5], 13], ['DJNZ not taken', [0x10, 5], 8],
  ['LD (nn),HL', [0x22, 0, 0x30], 16], ['LD HL,(nn)', [0x2a, 0, 0x30], 16], ['LD (nn),A', [0x32, 0, 0x30], 13], ['LD (nn),BC', [0xed, 0x43, 0, 0x30], 20],
  ['LD SP,HL', [0xf9], 6], ['LD SP,IX', [0xdd, 0xf9], 10], ['EX (SP),HL', [0xe3], 19], ['EX (SP),IX', [0xdd, 0xe3], 23], ['EX DE,HL', [0xeb], 4], ['EXX', [0xd9], 4],
  ['RLC B', [0xcb, 0x00], 8], ['RLC (HL)', [0xcb, 0x06], 15], ['BIT 0,B', [0xcb, 0x40], 8], ['BIT 0,(HL)', [0xcb, 0x46], 12], ['SET 1,(HL)', [0xcb, 0xce], 15],
  ['RLC (IX+d)', [0xdd, 0xcb, 1, 0x06], 23], ['BIT 0,(IX+d)', [0xdd, 0xcb, 1, 0x46], 20], ['SET 0,(IX+d),B', [0xdd, 0xcb, 1, 0xc0], 23],
  ['NEG', [0xed, 0x44], 8], ['RRD', [0xed, 0x67], 18], ['IN A,(n)', [0xdb, 0xfe], 11], ['OUT (n),A', [0xd3, 0xfe], 11],
  ['IN B,(C)', [0xed, 0x40], 12], ['OUT (C),B', [0xed, 0x41], 12], ['RST 38', [0xff], 11], ['HALT', [0x76], 4], ['EI', [0xfb], 4], ['DI', [0xf3], 4],
  ['IM 1', [0xed, 0x56], 8], ['LD A,I', [0xed, 0x57], 9], ['LD I,A', [0xed, 0x47], 9], ['RETN', [0xed, 0x45], 14], ['SBC HL,BC', [0xed, 0x42], 15],
  ['LDI', [0xed, 0xa0], 16], ['LDIR repeating', [0xed, 0xb0], 21], ['CPI', [0xed, 0xa1], 16], ['INI', [0xed, 0xa2], 16], ['OUTI', [0xed, 0xa3], 16],
  ['DAA', [0x27], 4], ['SCF', [0x37], 4], ['LD (BC),A', [0x02], 7], ['LD A,(nn)', [0x3a, 0, 0x30], 13], ['DEC (HL)', [0x35], 11],
  ['DD DD NOP-ish (LD A,B twice-prefixed)', [0xdd, 0xdd, 0x78], 12], ['ED NOP', [0xed, 0x00], 8],
];
for (const [name, code, t, f] of TIMES) {
  const { cpu } = machine(code);
  cpu.bc = 0x0200; cpu.hl = 0x2000; cpu.ix = 0x2100; cpu.iy = 0x2200; cpu.de = 0x2300;
  if (name === 'LDIR repeating' || name === 'CPI') cpu.bc = 0x0010;
  if (name === 'DJNZ not taken') cpu.regs[0] = 1;
  if (name === 'LDIR repeating') cpu.bc = 2;
  if (f !== undefined) cpu.regs[F] = f;
  const got = cpu.step();
  check(`${name}: ${t} T-states`, got === t, true);
  if (got !== t) console.log(`   (took ${got})`);
}

// ---- flags ---------------------------------------------------------------------------------------------

function flagsOf(code: number[], setup: (c: Z80, b: Flat) => void = () => undefined) {
  const { cpu, bus } = machine(code);
  cpu.hl = 0x4000;
  setup(cpu, bus);
  cpu.step();
  return cpu;
}
check('ADD A,B 7F+1: S H P(overflow)', flagsOf([0x80], (c) => { c.regs[A] = 0x7f; c.regs[0] = 1; c.regs[F] = 0; }).regs[F] === (S | H | P));
check('SUB B 00-01: S Y H X N C', flagsOf([0x90], (c) => { c.regs[A] = 0; c.regs[0] = 1; }).regs[F] === (S | Y | H | X | N | C));
check('CP B takes X and Y from the operand', (() => {
  const c = flagsOf([0xb8], (cc) => { cc.regs[A] = 0x10; cc.regs[0] = 0x28; });
  return (c.regs[F] & (X | Y)) === (X | Y);
})());
check('DAA after 15+27', (() => {
  const c = flagsOf([0x80, 0x27], (cc) => { cc.regs[A] = 0x15; cc.regs[0] = 0x27; cc.regs[F] = 0; });
  c.step();
  return c.regs[A] === 0x42 && c.regs[F] === (H | P);
})());
check('INC A 7F: S H P', flagsOf([0x3c], (c) => { c.regs[A] = 0x7f; c.regs[F] = 0; }).regs[F] === (S | H | P));
check('DEC A 80: H P N Y?', (() => {
  const c = flagsOf([0x3d], (cc) => { cc.regs[A] = 0x80; cc.regs[F] = 0; });
  return c.regs[A] === 0x7f && c.regs[F] === (H | P | N | Y | X);
})());
check('NEG of 80: P N C S? (result 80)', (() => {
  const c = flagsOf([0xed, 0x44], (cc) => { cc.regs[A] = 0x80; });
  return c.regs[A] === 0x80 && c.regs[F] === (S | P | N | C);
})());
check('SLL (undocumented) shifts in a 1', (() => {
  const c = flagsOf([0xcb, 0x30], (cc) => { cc.regs[0] = 0x80; });
  return c.regs[0] === 1 && (c.regs[F] & C) === C;
})());
check('LD B,IXH and LD IXL,n', (() => {
  const { cpu } = machine([0xdd, 0x44, 0xdd, 0x2e, 0x7e]);
  cpu.ix = 0x1234;
  cpu.step(); cpu.step();
  return cpu.regs[0] === 0x12 && cpu.ix === 0x127e;
})());
check('BIT 0,(HL) takes X and Y from WZ (set by LD A,(nn))', (() => {
  const { cpu, bus } = machine([0x3a, 0x00, 0x28, 0xcb, 0x46]);
  cpu.hl = 0x4000; bus.mem[0x4000] = 0; cpu.regs[F] = 0;
  cpu.step(); cpu.step();
  return cpu.regs[F] === (H | Z | P | Y | X);
})());
check('BIT 7,B sets S', flagsOf([0xcb, 0x78], (c) => { c.regs[0] = 0x80; c.regs[F] = 0; }).regs[F] === (H | S));
check('LD A,I copies IFF2 into P', (() => {
  const { cpu } = machine([0xed, 0x57]);
  cpu.i = 0x3f; cpu.iff2 = true;
  cpu.step();
  return cpu.regs[A] === 0x3f && (cpu.regs[F] & P) === P;
})());
check('SCF after an instruction that wrote F: X and Y from A', (() => {
  const { cpu } = machine([0xaf, 0x37]); // XOR A (writes F) ; SCF
  cpu.regs[A] = 0xff;
  cpu.step(); cpu.regs[A] = 0x28; // (as if A held 28 at the SCF)
  cpu.step();
  return (cpu.regs[F] & (X | Y)) === (X | Y) && (cpu.regs[F] & C) === C;
})());
check('LDIR copies and ends with BC = 0, P clear', (() => {
  const { cpu, bus } = machine([0xed, 0xb0]);
  cpu.hl = 0x4000; cpu.de = 0x5000; cpu.bc = 3;
  [1, 2, 3].forEach((v, i) => { bus.mem[0x4000 + i] = v; });
  for (let i = 0; i < 3; i++) cpu.step();
  return bus.mem[0x5000] === 1 && bus.mem[0x5002] === 3 && cpu.bc === 0 && (cpu.regs[F] & P) === 0 && cpu.pc === 0x8002;
})());
check('CPIR finds the byte', (() => {
  const { cpu, bus } = machine([0xed, 0xb1]);
  cpu.hl = 0x4000; cpu.bc = 10; cpu.regs[A] = 7;
  bus.mem[0x4003] = 7;
  for (let i = 0; i < 4; i++) cpu.step();
  return cpu.hl === 0x4004 && cpu.bc === 6 && (cpu.regs[F] & Z) === Z && cpu.pc === 0x8002;
})());
check('OUT (n),A reports the port and the T-state', (() => {
  const { cpu, bus } = machine([0x3e, 0x10, 0xd3, 0xfe]);
  cpu.step();
  const t0 = cpu.t;
  cpu.step();
  return bus.outs.length === 1 && bus.outs[0].port === 0x10fe && bus.outs[0].value === 0x10 && bus.outs[0].t === t0 + 7;
})());
check('R counts one per fetched opcode byte, bit 7 kept', (() => {
  const { cpu } = machine([0x00, 0xdd, 0x00, 0xcb, 0x00, 0xed, 0x44, 0xdd, 0xcb, 1, 0x06]);
  cpu.r = 0x80;
  cpu.step(); // 1
  cpu.step(); // DD 00: 2
  cpu.step(); // CB 00: 2
  cpu.step(); // ED 44: 2
  cpu.step(); // DD CB d op: 2
  return cpu.r === (0x80 | 9);
})());

// ---- interrupts ----------------------------------------------------------------------------------------

check('IM 1: pushes PC, jumps to $0038 in 13 T-states, only with IFF set', (() => {
  const { cpu, bus } = machine([0xfb, 0x00, 0x00]);
  cpu.im = 1;
  const refused = !cpu.interrupt();
  cpu.step(); // EI
  const heldOff = !cpu.interrupt(); // (not accepted right after EI)
  cpu.step();
  const t0 = cpu.t;
  const taken = cpu.interrupt();
  return refused && heldOff && taken && cpu.pc === 0x38 && cpu.t - t0 === 13 && bus.mem[0xeffe] === 0x02 && bus.mem[0xefff] === 0x80 && !cpu.iff1;
})());
check('IM 2: vector from I and the data bus byte $FF, 19 T-states', (() => {
  const { cpu, bus } = machine([0x00]);
  cpu.im = 2; cpu.iff1 = cpu.iff2 = true; cpu.i = 0xd0;
  bus.mem[0xd0ff] = 0x34; bus.mem[0xd100] = 0x12;
  const t0 = cpu.t;
  return cpu.interrupt() && cpu.pc === 0x1234 && cpu.t - t0 === 19;
})());
check('HALT waits, an interrupt wakes it and returns after the HALT', (() => {
  const { cpu, bus } = machine([0x76, 0x00]);
  cpu.im = 1; cpu.iff1 = cpu.iff2 = true;
  cpu.step(); cpu.step(); cpu.step();
  const stillHalted = cpu.halted && cpu.pc === 0x8001;
  cpu.interrupt();
  return stillHalted && !cpu.halted && bus.mem[0xeffe] === 0x01 && bus.mem[0xefff] === 0x80;
})());

// ---- the disassembler agrees with the CPU on instruction lengths ---------------------------------------

/** Run `code` (operands filled with $11 $22 ...) and report how many bytes of it the CPU fetched. */
function fetchedLength(code: number[]) {
  const { cpu, bus } = machine([...code, 0x11, 0x22, 0x33]);
  // all registers point well away from the code so only fetches read [$8000, $8008)
  cpu.bc = 0x2000; cpu.de = 0x2400; cpu.hl = 0x2800; cpu.ix = 0x2c00; cpu.iy = 0x3000; cpu.sp = 0x3400;
  cpu.step();
  let top = 0;
  for (const a of bus.reads) if (a >= 0x8000 && a < 0x8008) top = Math.max(top, a - 0x8000 + 1);
  return top;
}
let lengthBad = 0, lengthTried = 0;
const prefixes: number[][] = [[], [0xdd], [0xfd], [0xed], [0xcb], [0xdd, 0xcb], [0xfd, 0xcb]];
for (const prefix of prefixes) {
  for (let op = 0; op < 256; op++) {
    // (DD CB d op and a prefix before a prefix are special: op sits after the displacement)
    const code = prefix.length === 2 && prefix[1] === 0xcb ? [...prefix, 0x05, op] : [...prefix, op];
    const first = code[0] === 0xdd || code[0] === 0xfd ? code[1] : code[0];
    if (!(prefix.length === 0) && (first === 0xdd || first === 0xfd || first === 0xed)) continue;
    if (code.length === 1 && (op === 0xdd || op === 0xfd || op === 0xed || op === 0xcb || op === 0x76)) continue;
    if (op === 0x76 && prefix.length > 0) continue; // HALT does not fetch past itself
    const full = [...code, 0x11, 0x22, 0x33];
    const read = (a: number) => full[a - 0x8000] ?? 0;
    const want = disassembleOne(read, 0x8000).length;
    const got = fetchedLength(code);
    lengthTried++;
    if (want !== got) { lengthBad++; if (lengthBad < 8) console.log(`   length of ${code.map((b) => b.toString(16)).join(' ')}: disassembler ${want}, CPU ${got} (${disassembleOne(read, 0x8000).text})`); }
  }
}
check(`the disassembler and the CPU agree on the length of all ${lengthTried} opcodes tried`, lengthBad === 0);
check('disassembly reads well', (() => {
  const text = (bytes: number[]) => disassembleOne((a) => bytes[a - 0x8000] ?? 0, 0x8000).text;
  return text([0xdd, 0x7e, 0xfb]) === 'LD A,(IX-$05)' && text([0xed, 0xb0]) === 'LDIR' && text([0xcb, 0xfe]) === 'SET 7,(HL)'
    && text([0x20, 0xfe]) === 'JR NZ,$8000' && text([0xdd, 0xcb, 0x01, 0x06]) === 'RLC (IX+$01)' && text([0x3e, 0x7f]) === 'LD A,$7F';
})());

finish();
