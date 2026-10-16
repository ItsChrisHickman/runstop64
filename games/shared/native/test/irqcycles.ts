/**
 * Cycle check of a cycle-counted port's interrupt handlers: while the original
 * plays, each interrupt it takes is also run natively (the port's irq, on a copy
 * of the machine as it was) and the cycles must match, from the interrupt to its RTI.
 *
 *   npx tsx games/shared/native/test/irqcycles.ts <game> [frames]
 *   (with the engine translated with TRACE=1: the first difference, instruction by instruction)
 */
import fs from 'node:fs';
import { C64, unpackState } from '../../../../packages/c64kit/src/c64/machine';
import { bind, cpu, setFlags } from '../cpu';
import { GAMES, setJoy } from './games';

const [gameId, framesArg = '600'] = process.argv.slice(2);
const game = GAMES[gameId];
const port = game.port;
const m = new C64();
m.loadState(unpackState(new Uint8Array(fs.readFileSync(game.title))));
const START = game.start ?? [30, 34];

let measuring: { sp: number; pc: number; c0: number; native: number; at: string; trace: number[][] } | null = null;
/** The last interrupt's native trace (pc, cycles), to compare with the original's. */
let lastNatTrace: number[][] = [];
let traced = false;
const bad = new Map<string, string>();
let checked = 0;
const irq = m.cpu.irq.bind(m.cpu);
m.cpu.irq = () => {
  if (measuring || (m.cpu.p & 0x04)) return irq();
  // natively, from a copy of the machine as it is now
  const copy = new C64();
  copy.loadState(m.saveState());
  bind({ ram: copy.ram, read: (a) => copy.cpu.read(a), write: (a, v) => copy.cpu.write(a, v), call: (a) => { const k = port.kernal?.[a]; if (!k) throw new Error(`call $${a.toString(16)}`); k(copy); } });
  Object.assign(cpu, { a: m.cpu.a, x: m.cpu.x, y: m.cpu.y, sp: m.cpu.sp, cy: 0 });
  setFlags(m.cpu.p);
  let native = -1;
  const natTrace: number[][] = [];
  let total = 0;
  cpu.tr = (pc) => natTrace.push([pc, total + cpu.cy]);
  const at = `$${(m.ram[0x314] | (m.ram[0x315] << 8)).toString(16)}/$${(m.ram[0xfffe] | (m.ram[0xffff] << 8)).toString(16)}`;
  try {
    const g = port.irq(copy);
    if (g) for (let n = 0; ; n++) { const r = g.next(); total += cpu.cy + ((r.value ?? 0) >>> 16); cpu.cy = 0; if (r.done) break; if (n > 10000) throw new Error('runs on'); }
    else total = cpu.cy;
    native = total;
  } catch (e) { bad.set(at, String(e)); }
  cpu.tr = undefined;
  lastNatTrace = natTrace;
  const sp = m.cpu.sp, pc = m.cpu.pc, c0 = m.cpu.cycles;
  const taken = irq();
  if (taken) measuring = { sp, pc, c0, native, at, trace: [] };
  return taken;
};
const step = m.cpu.step.bind(m.cpu);
m.cpu.step = () => {
  if (measuring && m.cpu.pc < 0xe000) measuring.trace.push([m.cpu.pc, m.cpu.cycles - measuring.c0]);
  const r = step();
  if (measuring && m.cpu.pc === measuring.pc && m.cpu.sp === measuring.sp) {
    const orig = m.cpu.cycles - measuring.c0;
    checked++;
    if (measuring.native >= 0 && orig !== measuring.native && !bad.has(measuring.at)) {
      bad.set(measuring.at, `native ${measuring.native} original ${orig} (frame ${frame})`);
      const nat = lastNatTrace, ori = measuring.trace;
      if (nat.length && !traced) {
        traced = true;
        const k = ori.findIndex((o, i) => !nat[i] || nat[i][0] !== o[0] || nat[i][1] !== o[1]);
        const f = (t?: number[]) => (t ? `$${t[0].toString(16)}@${t[1]}` : '-');
        console.log(`first difference at instruction ${k}:`);
        for (let i = Math.max(0, k - 6); i <= k + 3; i++) console.log(`  original ${f(ori[i])}  native ${f(nat[i])}`);
      }
    }
    measuring = null;
  }
  return r;
};
let frame = 0;
for (; frame < Number(framesArg); frame++) {
  setJoy(m, game, frame >= START[0] && frame < START[1] ? 0x0f : 0x1f);
  if (!m.runFrame()) { console.log('CPU stopped at frame', frame); break; }
}
console.log(`${gameId}: ${checked} interrupts checked, ${bad.size} handlers differ`);
for (const [at, d] of bad) console.log(`  ${at}: ${d}`);
if (bad.size) process.exit(1);
