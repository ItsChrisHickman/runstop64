import type { C64 as C64Machine } from '../../../packages/c64kit/src/c64/machine';
import { bind, cpu, flags, setFlags } from './cpu';
import type { Routine } from './host';

/**
 * Patch translated routines into a running original (c64kit's C64 machine):
 * when the CPU reaches one, the native function runs instead. Registers move
 * between the emulated CPU and `cpu` at the boundaries, so emulated and native
 * routines can call each other.
 */
export function patchInto(m: C64Machine, routines: Record<string, Routine>, only?: (addr: number) => boolean) {
  const enter = () => {
    const c = m.cpu;
    cpu.a = c.a; cpu.x = c.x; cpu.y = c.y; cpu.sp = c.sp;
    setFlags(c.p);
  };
  const leave = () => {
    const c = m.cpu;
    c.a = cpu.a; c.x = cpu.x; c.y = cpu.y; c.sp = cpu.sp;
    c.p = (c.p & 0x3c) | (flags() & 0xc3);
  };
  bind({
    ram: m.ram,
    read: (a) => m.cpu.read(a),
    write: (a, v) => m.cpu.write(a, v),
    call: (a) => { leave(); m.call(a); enter(); },
  });
  let n = 0;
  for (const [name, fn] of Object.entries(routines)) {
    const addr = name.match(/^r_([0-9a-f]{4})$/)?.[1];
    if (!addr || fn.constructor.name === 'GeneratorFunction') continue;
    const a = parseInt(addr, 16);
    if (only && !only(a)) continue;
    m.patches.set(a, () => { enter(); fn(); leave(); });
    n++;
  }
  return n;
}

/**
 * Differential check of translated routines: each time the CPU reaches one, the
 * native version runs on the current state, then the state is rolled back and
 * the original runs. Any difference in memory, colour RAM, VIC registers or
 * registers is reported; the original's result is kept, so the game carries on.
 *
 * With `generators`, routines that wait are checked too: run to the end with
 * their waits taking no time, against the original with interrupts held off. One
 * that waits for an interrupt never ends that way: past a limit it's skipped
 * (and the original runs as usual).
 */
export function verifyInto(m: C64Machine, routines: Record<string, Routine>, report: (addr: number, diffs: string[]) => void, only?: (addr: number) => boolean, beforeRun?: () => void, generators = false, cycles = false) {
  const GEN_YIELDS = 50_000, GEN_CYCLES = 600_000;
  const enter = () => {
    const c = m.cpu;
    cpu.a = c.a; cpu.x = c.x; cpu.y = c.y; cpu.sp = c.sp;
    setFlags(c.p);
  };
  let nested = 0;
  bind({
    ram: m.ram,
    read: (a) => m.cpu.read(a),
    write: (a, v) => m.cpu.write(a, v),
    call: (a) => {
      // native code calling untranslated code: run it on the emulator with no patches
      const c = m.cpu;
      c.a = cpu.a; c.x = cpu.x; c.y = cpu.y; c.sp = cpu.sp;
      c.p = (c.p & 0x3c) | (flags() & 0xc3);
      const irqMasked = c.p & 0x04;
      c.p |= 0x04;
      nested++; m.call(a); nested--;
      c.p = (c.p & ~0x04) | irqMasked;
      enter();
    },
  });
  const counts = new Map<number, number>();
  const skipped = new Set<number>();
  for (const [name, fn] of Object.entries(routines)) {
    const addr = name.match(/^r_([0-9a-f]{4})$/)?.[1];
    const isGen = fn.constructor.name === 'GeneratorFunction';
    if (!addr || (isGen && !generators)) continue;
    const a = parseInt(addr, 16);
    if (only && !only(a)) continue;
    const runOriginal = (limit = Infinity) => {
      nested++;
      m.patches.delete(a);
      try { m.call(a, limit); } finally { m.patches.set(a, self); nested--; }
    };
    const self = (): void | 'continue' => {
      if (nested) { runOriginal(); return; }
      if (skipped.has(a)) return 'continue';
      counts.set(a, (counts.get(a) ?? 0) + 1);
      const c = m.cpu;
      const before = { ram: m.ram.slice(), colour: m.colour.slice(), vic: m.vic.slice(), sid: m.sid.slice(), coll: m.collisions.slice(), a: c.a, x: c.x, y: c.y, sp: c.sp, p: c.p, writes: m.sidWrites.length };
      const rollBack = () => {
        m.ram.set(before.ram); m.colour.set(before.colour); m.vic.set(before.vic); m.sid.set(before.sid);
        m.collisions[0] = before.coll[0]; m.collisions[1] = before.coll[1];
        Object.assign(c, { a: before.a, x: before.x, y: before.y, sp: before.sp, p: before.p });
        m.sidWrites.length = before.writes;
      };
      // native
      beforeRun?.();
      enter();
      cpu.cy = 0;
      let err = '';
      let tooLong = false;
      try {
        if (isGen) {
          const g = fn();
          if (g) for (let n = 0; !g.next().done; n++) if (n > GEN_YIELDS) { tooLong = true; break; }
        } else fn();
      } catch (e) { err = String(e); }
      const natCycles = cpu.cy;
      cpu.cy = 0;
      const nat = { ram: m.ram.slice(), colour: m.colour.slice(), vic: m.vic.slice(), a: cpu.a, x: cpu.x, y: cpu.y, p: flags() & 0xc3 };
      rollBack();
      // the original, from the same state (interrupts held off, as the native version took no
      // time for one to arrive in); then the machine's RTS after this patch returns as usual
      beforeRun?.();
      const irqMasked = c.p & 0x04;
      c.p |= 0x04;
      let ok = !tooLong;
      const cy0 = c.cycles;
      if (ok) {
        try { runOriginal(isGen ? GEN_CYCLES : Infinity); } catch (e) { if (!isGen) throw e; ok = false; }
      }
      c.p = (c.p & ~0x04) | irqMasked;
      if (!ok) {
        // it waits for an interrupt: not comparable this way; let the original run as usual
        skipped.add(a);
        rollBack();
        return 'continue';
      }
      const diffs: string[] = [];
      if (err) diffs.push(`native threw: ${err}`);
      // (cycle-counted games: the time taken, with no interrupts)
      if (cycles && natCycles !== c.cycles - cy0) diffs.push(`cycles: native ${natCycles} original ${c.cycles - cy0}`);
      for (let k = 0; k < 0x10000; k++) if (nat.ram[k] !== m.ram[k] && (k < 0x100 || k >= 0x200)) diffs.push(`$${k.toString(16).padStart(4, '0')}: native ${nat.ram[k].toString(16)} original ${m.ram[k].toString(16)}`);
      for (let k = 0; k < 0x400; k++) if (nat.colour[k] !== m.colour[k]) diffs.push(`colour $${k.toString(16)}: native ${nat.colour[k]} original ${m.colour[k]}`);
      for (let k = 0; k < 0x2f; k++) if (k !== 0x19 && nat.vic[k] !== m.vic[k]) diffs.push(`$d0${k.toString(16).padStart(2, '0')}: native ${nat.vic[k].toString(16)} original ${m.vic[k].toString(16)}`);
      for (const r of ['a', 'x', 'y'] as const) if (nat[r] !== c[r]) diffs.push(`${r}: native ${nat[r].toString(16)} original ${c[r].toString(16)}`);
      if (nat.p !== (c.p & 0xc3)) diffs.push(`flags: native ${nat.p.toString(16)} original ${(c.p & 0xc3).toString(16)}`);
      if (diffs.length) report(a, diffs);
    };
    m.patches.set(a, self);
  }
  return Object.assign(counts, { skipped });
}
