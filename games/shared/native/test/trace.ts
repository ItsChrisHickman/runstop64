/**
 * Instruction-level check of a cycle-counted port's main program against the
 * original (for games that time themselves, where lockstep can't line passes up:
 * an interrupt starts natively on its raster line, on a 6502 after the instruction
 * in flight). Both run from the title, fire pressed to start; from the first pass
 * of the main loop, each main-program instruction's address and the cycles the
 * main program has taken (interrupts' time left out) must match. Interrupt
 * handlers are checked by irqcycles.ts.
 *
 *   TRACE=1 node tools/re/to-ts.mjs games/<game>/re/engine.json   (then translate again without)
 *   nice -n 15 node tools/test.mjs games/shared/native/test/trace.ts <game> [frames]
 */
import fs from 'node:fs';
import { C64, unpackState } from '../../../../packages/c64kit/src/c64/machine';
import { cpu } from '../cpu';
import { NativeHost } from '../host';
import { GAMES, setJoy } from './games';
const gameId = process.argv[2];
const game = GAMES[gameId];
const FRAMES = Number(process.argv[3] ?? 200);
const start = unpackState(new Uint8Array(fs.readFileSync(game.title)));
const S = game.start ?? [30, 34];
const at = game.port.mainLoopWait;
// A
const A = new C64(); A.loadState(start);
const AT: number[][] = [];
let base = -1, irqTotal = 0, inIrq: { pc: number; sp: number; c0: number } | null = null;
const irq = A.cpu.irq.bind(A.cpu);
A.cpu.irq = () => { const pc = A.cpu.pc, sp = A.cpu.sp, c0 = A.cpu.cycles; const t = irq(); if (t && !inIrq) inIrq = { pc, sp, c0 }; return t; };
const step = A.cpu.step.bind(A.cpu);
A.cpu.step = () => {
  if (inIrq && A.cpu.pc === inIrq.pc && A.cpu.sp === inIrq.sp) { irqTotal += A.cpu.cycles - inIrq.c0; inIrq = null; }
  if (!inIrq) {
    if (base < 0 && A.cpu.pc === at) base = A.cpu.cycles - irqTotal;
    if (base >= 0 && A.cpu.pc < 0xe000 && AT.length < 3e6) AT.push([A.cpu.pc, A.cpu.cycles - irqTotal - base]);
  }
  return step();
};
for (let f = 1; f <= FRAMES; f++) { setJoy(A, game, f >= S[0] && f < S[1] ? 0x0f : 0x1f); A.runFrame(); }
// B
const B = new NativeHost(game.port, start);
const BT: number[][] = [];
let accum = 0; let wrapped: unknown = null;
const wrap = () => {
  const main = B.mainProgram;
  if (wrapped !== main && main) {
    wrapped = main;
    const g = main, next = g.next.bind(g);
    g.next = () => { const r = next(); accum += cpu.cy; return r; };
  }
};
wrap();
cpu.tr = (pc) => {
  if (!B.inHandler && BT.length < 3e6) BT.push([pc, accum + cpu.cy]);
};
for (let f = 1; f <= FRAMES; f++) { setJoy(B.m, game, f >= S[0] && f < S[1] ? 0x0f : 0x1f); B.tick(); }
cpu.tr = undefined;
if (!BT.length) { console.log('no trace: translate the engine with TRACE=1 first'); process.exit(1); }
const b0 = BT.findIndex((t) => t[0] === at); const bb = BT[b0][1];
const bt = BT.slice(b0).map(([p, c]) => [p, c - bb]);
console.log(`original ${AT.length} instructions, native ${bt.length}`);
// (native returns straight through a branch to an RTS: the original's RTS has no counterpart)
let i = 0, j = 0;
for (; i < AT.length && j < bt.length; i++, j++) {
  if (AT[i][0] !== bt[j][0] && A.ram[AT[i][0]] === 0x60 && AT[i + 1]?.[0] === bt[j][0]) i++;
  if (AT[i][0] !== bt[j][0] || AT[i][1] !== bt[j][1]) break;
}
const f = (t?: number[]) => (t ? `$${t[0].toString(16)}@${t[1]}` : '-');
if (i >= AT.length || j >= bt.length) console.log(`identical: ${i} instructions`);
else {
  console.log(`first difference at instruction ${i} / ${j}:`);
  for (let d = -8; d <= 4; d++) console.log(`  original ${f(AT[i + d])}  native ${f(bt[j + d])}`);
  process.exit(1);
}
