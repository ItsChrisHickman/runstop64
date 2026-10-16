/**
 * The original C64 Starquake as a reference, for checking the port: a c64kit
 * machine resumed from a snapshot the probe took (see ../build/README.md),
 * with the KERNAL keyboard scan the game calls (SCNKEY) stood in for.
 */
import fs from 'node:fs';
import { C64, unpackState } from '../../../packages/c64kit/src/c64/machine';

export function reference(stateFile: string) {
  const m = new C64();
  m.loadState(unpackState(new Uint8Array(fs.readFileSync(stateFile))));
  m.hooks.set(0xff9f, () => { m.scnkey(); });
  return m;
}

/**
 * Call one of the original's routines (as a JSR) and run it to its RTS, with
 * interrupts held off. The CPU's registers are restored afterwards; memory isn't.
 */
export function call(m: C64, addr: number, regs: { a?: number; x?: number; y?: number } = {}, limit = 20_000_000) {
  const cpu = m.cpu;
  const saved = { pc: cpu.pc, sp: cpu.sp, p: cpu.p, a: cpu.a, x: cpu.x, y: cpu.y };
  // Return address $FFFE: the routine's RTS lands on $FFFF, where we stop.
  m.ram[0x100 | cpu.sp] = 0xff;
  m.ram[0x100 | ((cpu.sp - 1) & 0xff)] = 0xfe;
  cpu.sp = (cpu.sp - 2) & 0xff;
  if (regs.a !== undefined) cpu.a = regs.a;
  if (regs.x !== undefined) cpu.x = regs.x;
  if (regs.y !== undefined) cpu.y = regs.y;
  cpu.p |= 0x04;
  cpu.pc = addr;
  let n = 0;
  while (cpu.pc !== 0xffff) {
    if (++n > limit) throw new Error(`call $${addr.toString(16)} did not return (pc $${cpu.pc.toString(16)})`);
    const hook = cpu.pc >= 0xa000 ? m.hooks.get(cpu.pc) : undefined;
    if (hook && m.kernalVisible) { if (hook(m) !== 'continue') { m.rts(); continue; } }
    cpu.step();
  }
  Object.assign(cpu, saved);
  return n;
}
