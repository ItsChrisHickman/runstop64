/**
 * Run the original and the port side by side from the same moment (the main
 * loop about to draw a room, $0C73), with the same controls, and compare them
 * at every pass of the main loop (each frame wait, $4C2D): BLOB, the room, the
 * screen, the panel.
 *
 *   node lockstep.mjs game.state "frames:dirs,..." [passes] [--no-enemies]
 *
 * Plan: "0:right,120:left+up,300:" holds right from pass 0, left and up from
 * pass 120, nothing from 300 (dirs: up down left right fire).
 *
 * Parts not yet ported are switched off in the original by patching their
 * entry to return (the enemies, the laser, picking up).
 */
import { C64_KEYS } from '../../../packages/c64kit/src/c64/keyboard';
import { reference } from './ref';
import { syncFrom } from './sync';
import { Game } from '../src/game';
import { play, type Hooks } from '../src/flow';
import { drawRoom } from '../src/room';

const args = process.argv.slice(2);
const [stateFile, plan = '0:right', passesArg = '600'] = args.filter((a) => !a.startsWith('--'));
const passes = Number(passesArg);
const m = reference(stateFile);
const P = (addr: number, bytes: number[]) => m.ram.set(bytes, addr);
const off = new Set((process.env.OFF ?? '').split(','));
if (off.has('enemies')) { P(0x1212, [0x60]); P(0x1437, [0x60]); P(0x16f0, [0x60]); }
if (off.has('laser')) P(0x2500, [0x60]);
if (off.has('pickup')) P(0x2cf0, [0xa9, 0x00, 0xa6, 0x34, 0xa4, 0x35, 0x60]);

const JOY: Record<string, number> = { up: 1, down: 2, left: 4, right: 8, fire: 16 };
let steps = plan.split(',').filter(Boolean).map((s) => { const [f, d] = s.split(':'); return { f: Number(f), d: d ?? '' }; });
if (plan.startsWith('random')) {
  // random:SEED: a new direction (often with down, to climb) every 10-80 passes
  let seed = Number(plan.split(':')[1] ?? 1);
  const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
  const dirs = ['left', 'right', 'left+down', 'right+down', 'down', '', 'up', 'left+up', 'right+up', 'left+fire', 'right+fire', 'fire', 'down+fire'];
  steps = [];
  for (let f = 0; f < 100000; f += 10 + Math.floor(rnd() * 70)) steps.push({ f, d: dirs[Math.floor(rnd() * dirs.length)] });
}
const joyAt = (pass: number) => {
  const st = [...steps].reverse().find((s) => s.f <= pass);
  let j = 0x1f;
  if (st) for (const d of st.d.split('+')) j &= ~(JOY[d] ?? 0);
  return j;
};
/** Keys in the plan (KeyS, Enter, Digit1...): held on the C64's keyboard. */
const keysAt = (pass: number) => {
  const st = [...steps].reverse().find((s) => s.f <= pass);
  return st ? st.d.split('+').filter((d) => C64_KEYS[d]).map((d) => C64_KEYS[d]) : [];
};

// The original: record its state at each frame wait, and what it read from the controls.
const snaps: Uint8Array[] = [];
const keys: number[] = [];
const colours: Uint8Array[] = [];
const inputs: number[] = [];
const step = m.cpu.step.bind(m.cpu);
if (process.env.WATCHW) {
  const wa = parseInt(process.env.WATCHW, 16), w0 = m.cpu.write.bind(m.cpu);
  m.cpu.write = (a: number, v: number) => { if ((a & 0xffff) === wa) console.log(`  orig writes $${wa.toString(16)}=${v.toString(16)} at pc $${m.cpu.pc.toString(16)} pass ${snaps.length}`); return w0(a, v); };
}
m.cpu.step = () => {
  const pc = m.cpu.pc;
  // every frame wait (in play, $4C2D calls it; screens call it themselves)
  if (pc === 0x30bc) { snaps.push(m.ram.slice()); colours.push(m.colour.slice()); }
  // the key held after the wait's keyboard scan (what the screens read next)
  if (pc === 0x30c8) keys[snaps.length - 1] = m.ram[0xc5];
  if (pc === 0x4497) inputs.push(m.cpu.a);
  if (process.env.WATCH && pc === parseInt(process.env.WATCH, 16)) console.log(`  orig at $${process.env.WATCH} pass ${snaps.length} a=${m.cpu.a.toString(16)} x=${m.cpu.x.toString(16)} y=${m.cpu.y.toString(16)} stack ${m.ram[0x101 + m.cpu.sp].toString(16)}${m.ram[0x102 + m.cpu.sp].toString(16)} $33=${m.ram[0x33].toString(16)} $34=${m.ram[0x34].toString(16)} $35=${m.ram[0x35].toString(16)}`);
  return step();
};

// ROOM=n EXIT=hex: start in another room, come in by another way (e.g. 3d: by its teleport); CARRY=hex,..: things carried
if (process.env.ROOM) { const n = Number(process.env.ROOM); m.ram[0xb9] = n & 0xff; m.ram[0xba] = n >> 8; }
if (process.env.EXIT) m.ram[0x33] = parseInt(process.env.EXIT, 16);
if (process.env.CORE) process.env.CORE.split(",").forEach((h, i) => { m.ram[0x08f4 + i] = parseInt(h, 16); });
if (process.env.COL) { m.ram[0x34] = Number(process.env.COL); m.ram[0x35] = Number(process.env.ROW); }
if (process.env.CARRY) process.env.CARRY.split(",").forEach((h, i) => { m.ram[0xd9 + i] = parseInt(h, 16); });
const g = new Game();
syncFrom(m, g);
if (process.env.FIND) {
  // which rooms (drawn from this start) show a thing with this graphic (e.g. 19: a Cheops pyramid), and where
  const want = parseInt(process.env.FIND, 16);
  for (let room = 0; room < 512; room++) {
    const t = new Game(); syncFrom(m, t); t.room = room; drawRoom(t);
    for (const s of t.shown) if (s.graphic === want) console.log(`room ${room}: at ${s.col},${s.row}`);
  }
  process.exit(0);
}
const hooks: Hooks = { noEnemies: off.has('enemies'), noLaser: off.has('laser'), noPickup: off.has('pickup') };
// The port reads the same controls the original read, read for read (leaving a
// room, BLOB has two frames in one pass of the loop).
let read = 0;
Object.defineProperty(g, 'joy', { get: () => inputs[read++] ?? 0x7f, set: () => {} });
const script = play(g, hooks);

let frame = 0;
let bad = 0;
for (let pass = 0; pass < passes; pass++) {
  while (snaps.length <= pass && frame < passes * 3) {
    m.joy2 = joyAt(snaps.length);
    m.keys = keysAt(snaps.length);
    m.runFrame();
    frame++;
  }
  if (snaps.length <= pass) { console.log(`the original stopped reaching its frame wait at pass ${pass}`); break; }
  g.key = pass ? keys[pass - 1] ?? 64 : 64;
  script.next();
  if (process.env.OBJECTS && pass === 0) console.log("objects", JSON.stringify(g.objects.slice(0, g.objectCount)), "barriers", JSON.stringify(g.barriers), "barrier cell", g.barrierCell, "blob", g.col, g.row);
  const r = snaps[pass];
  const out: string[] = [];
  const v = (name: string, a: number, b: number) => { if (a !== b) out.push(`${name} orig ${a.toString(16)} port ${b.toString(16)}`); };
  v('room', r[0xb9] | (r[0xba] << 8), g.room);
  if (!g.inScreen) {
  v('col', r[0x71], g.col); v('row', r[0x72], g.row); v('sub', r[0x6a], g.sub);
  v('x', r[0x9b], g.sprites.x[0]); v('y', r[0x9c], g.sprites.y[0]); v('msb', r[0xab], g.sprites.msb); v('enable', r[0xac], g.sprites.enable);
  v('frame', r[0x5ff8], g.sprites.ptr[0]); v('eyes', r[0x5ffa], g.sprites.ptr[2]);
  v('riding', r[0x70], g.riding); v('falling', r[0x9a], g.falling); v('fall height', r[0x78], g.fallHeight);
  }
  v('rng', r[0x67] | (r[0x68] << 8), g.rng.a | (g.rng.b << 8));
  v('energy', r[0xd3], g.energy); v('platforms', r[0xd4], g.platformsLeft);
  for (let i = 4; i < 8; i++) { v(`s${i} x`, r[0x9b + 2 * i], g.sprites.x[i]); v(`s${i} y`, r[0x9c + 2 * i], g.sprites.y[i]); v(`s${i} ptr`, r[0x5ff8 + i], g.sprites.ptr[i]); }
  v('score roll', r[0xcc], g.scoreRoll); v('score speed', r[0x54], g.scoreSpeed); v('score timer', r[0x55], g.scoreTimer); v('pending', r[0xcd], g.pendingScore); v('frames', (r[0x8b] + 1) & 0xff, g.frames);
  v('lives', r[0xd1] * 16 + r[0xd2], g.lives[0] * 16 + g.lives[1]); v('score', Number(Array.from(r.subarray(0xbb, 0xc1)).join('')), Number(g.score.join('')));
  let screen = 0;
  for (let i = 0; i < 8000; i++) if (r[0x6000 + i] !== g.scr.bank[0x2000 + i]) screen++;
  for (let i = 0; i < 1000; i++) if (r[0x5c00 + i] !== g.scr.bank[0x1c00 + i]) screen++;
  for (let i = 0; i < 1000; i++) if ((colours[pass][i] & 15) !== (g.scr.attr[i] & 15)) screen++;
  for (let i = 0; i < 0xc00; i++) if (r[0x5000 + i] !== g.scr.bank[0x1000 + i]) screen++;
  if (screen) {
    const at: string[] = [];
    for (let i = 0; i < 8000 && at.length < 4; i++) if (r[0x6000 + i] !== g.scr.bank[0x2000 + i]) at.push(`bitmap $${(0x6000 + i).toString(16)} ${r[0x6000 + i].toString(16)}/${g.scr.bank[0x2000 + i].toString(16)}`);
    for (let i = 0; i < 1000 && at.length < 6; i++) if (r[0x5c00 + i] !== g.scr.bank[0x1c00 + i]) at.push(`colour $${(0x5c00 + i).toString(16)}`);
    out.push(`${screen} screen bytes differ (${at.join(", ")})`);
  }
  const [showA, showB] = (process.env.SHOW ?? "-1").split("-").map(Number);
  if (process.env.SHOW && pass >= (showB === undefined ? showA - 4 : showA) && pass <= (showB ?? showA + 2)) {
    console.log(`  pass ${pass}: score ${Array.from(r.subarray(0xbb, 0xc1)).join("")}/${g.score.join("")} cd ${r[0xcd]}/${g.pendingScore} in ${inputs[pass]?.toString(16)} $76 ${r[0x76].toString(16)}/${g.input.toString(16)} $79 ${r[0x79].toString(16)}/${g.inputPlatform.toString(16)} row ${r[0x72]}/${g.row} sub ${r[0x6a]}/${g.sub} x ${r[0x9b]}/${g.sprites.x[0]} dead ${r[0x3e]}/${g.dead} beside ${r[0x77]}/${g.beside} exit ${r[0x33].toString(16)}/${g.exit.toString(16)} off ${g.offRow}/${g.offCol} cell ${(((r[0x7a] | (r[0x7b] << 8)) - 0xd800) & 0xffff)}/${g.cell} attrs ${[0x29, 0x2a, 0x2b, 0x51, 0x52, 0x53, 0x79, 0x7a, 0x7b].map((o) => `${colours[pass][g.cell + o] & 15}/${g.scr.attr[g.cell + o]}`).join(' ')}`);
  }
  if (out.length) {
    bad++;
    if (bad <= 5) console.log(`pass ${pass} (input ${(inputs[pass] ?? 0).toString(16)}): ${out.join(', ')}`);
  }
}
const visitedRooms = new Set(snaps.map((r) => r[0xb9] | (r[0xba] << 8)));
console.log(`${passes} passes, ${bad} differing; ${frame} frames of the original; ${visitedRooms.size} rooms visited (${[...visitedRooms].join(" ")})`);
