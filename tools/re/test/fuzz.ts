/**
 * Instruction-level check of tools/re/to-ts.mjs: every documented opcode, in
 * every addressing mode, translated as a one-instruction routine and run
 * against c64kit's 6502 core from thousands of random states (registers,
 * flags, memory). Registers, flags, memory and the cycles taken must match.
 *
 *   node tools/re/test/run-fuzz.mjs        (generates the routines, bundles them with this, runs it)
 */
import { Cpu6502 } from '../../../packages/c64kit/src/sid/cpu6502';
import { bind, cpu, flags, setFlags } from '../../../games/shared/native/cpu';

/** What run-fuzz.mjs generates: the translated routines (by name), which is which, and the memory image. */
export interface FuzzCases {
  CASES: { addr: number; name: string }[];
  DESC: Record<string, string>;
  IMAGE: Uint8Array;
  ROUTINES: Record<string, () => void>;
}

export function fuzz({ CASES: cases, DESC: desc, IMAGE: image, ROUTINES: fns }: FuzzCases) {
  let seed = 12345;
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) >>> 16) & 0xff;
  let failures = 0;
  for (const { addr, name } of cases) {
    for (let trial = 0; trial < 2000; trial++) {
      const mem = image.slice();
      for (let a = 0x80; a < 0x100; a++) mem[a] = rnd();
      for (let a = 0x3000; a < 0x3200; a++) mem[a] = rnd();
      mem[0x80] = 0x00; mem[0x81] = 0x30; // ($80),y → $3000+y
      mem[0x90] = 0x40; mem[0x91] = 0x30; // ($8x,x) pointers land in $30xx
      for (let a = 0x82; a < 0x100; a += 2) if (a !== 0x90) { mem[a] = rnd(); mem[a + 1] = 0x30; }
      const regs = { a: rnd(), x: rnd(), y: rnd(), p: rnd() & 0xcf }; // decimal mode included
      // reference: the 6502
      const c = new Cpu6502();
      c.mem.set(mem);
      Object.assign(c, { a: regs.a, x: regs.x, y: regs.y, p: regs.p | 0x20, sp: 0xfd, pc: addr });
      const c0 = c.cycles;
      for (let n = 0; n < 6 && c.pc !== 0xfff0; n++) c.step();
      // translated
      const ram = mem.slice();
      bind({ ram, read: (a) => ram[a & 0xffff], write: (a, v) => { ram[a & 0xffff] = v; }, call: () => { throw new Error('call'); } });
      Object.assign(cpu, { a: regs.a, x: regs.x, y: regs.y, sp: 0xfd, cy: 0 });
      setFlags(regs.p);
      fns[name]();
      const diffs: string[] = [];
      for (const r of ['a', 'x', 'y'] as const) if (cpu[r] !== c[r]) diffs.push(`${r} ${cpu[r]} vs ${c[r]}`);
      if (cpu.cy !== c.cycles - c0) diffs.push(`cycles ${cpu.cy} vs ${c.cycles - c0}`);
      if ((flags() & 0xcb) !== (c.p & 0xcb)) diffs.push(`flags ${(flags() & 0xcb).toString(2)} vs ${(c.p & 0xcb).toString(2)}`);
      for (let a = 0; a < 0x10000; a++) if (a < 0x100 || a >= 0x200) if (ram[a] !== c.mem[a]) { diffs.push(`$${a.toString(16)} ${ram[a]} vs ${c.mem[a]}`); break; }
      if (diffs.length) {
        failures++;
        console.log(`${name} (${desc[name]}): ${diffs.join(', ')} [a=${regs.a} x=${regs.x} y=${regs.y} p=${regs.p.toString(2)}]`);
        break;
      }
    }
  }
  console.log(`${cases.length} instruction forms, ${failures} failing`);
  return failures;
}
