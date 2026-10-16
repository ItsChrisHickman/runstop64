/**
 * Automatic exploration of an original game (Go-Explore style), for native
 * ports: reach as many places as possible, and record every version of code
 * that runs in the game's overlay regions (blocks it swaps in).
 *
 * Keeps an archive of distinct cells (the game config says what a cell is),
 * restarts from rarely visited ones with random joystick input, keeps any new
 * cell's machine state (taken at the main loop's wait, a clean point for
 * native tests to start from), and writes:
 *   <out>/cells/<cell>.state   one state per distinct "place" (config.place)
 *   <out>/overlays.json        overlay versions: entries, executed code, where they're stored
 *
 *   node /tmp/explore.mjs <game> <out> [iterations] [seed]
 */
import fs from 'node:fs';
import path from 'node:path';
import { C64, packState, unpackState, type MachineState } from '../../../../packages/c64kit/src/c64/machine';
import { GAMES, type GameTest } from './games';

// (starts: states to explore from as well, e.g. a native save past a puzzle random play rarely solves)
const [gameId, outDir, itersArg = '200', seedArg = '1', startsArg = ''] = process.argv.slice(2);
const game: GameTest = GAMES[gameId];
fs.mkdirSync(path.join(outDir, 'cells'), { recursive: true });
let seed = Number(seedArg);
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

const m = new C64();
const title = fs.readFileSync(game.title);
m.loadState(unpackState(new Uint8Array(title)));
const titleRam = m.ram.slice();

// ---- overlay versions ----
/** 6502 instruction length from its opcode (documented opcodes). */
const insLen = (op: number) => {
  const low = op & 0x1f;
  if (op === 0x20 || [0x0c, 0x0d, 0x0e, 0x0f, 0x19, 0x1b, 0x1c, 0x1d, 0x1e, 0x1f].includes(low)) return 3;
  if ((op & 0x0f) === 0x08 || (op & 0x0f) === 0x0a || op === 0x00 || op === 0x40 || op === 0x60) return 1;
  return 2;
};
interface Version { sig: string; region: number; entries: Set<number>; executed: Set<number>; snapshot: Uint8Array; visits: number }
const versions = new Map<string, Version>();
const sigOf = (lo: number) => Array.from(m.ram.subarray(lo, lo + 16), (b) => b.toString(16).padStart(2, '0')).join('');
let prevPc = 0;
const step = m.cpu.step.bind(m.cpu);
m.cpu.step = () => {
  const pc = m.cpu.pc;
  for (let r = 0; r < game.overlays.length; r++) {
    const [lo, hi] = game.overlays[r];
    if (pc < lo || pc > hi) continue;
    const key = `${r}:${sigOf(lo)}`;
    let v = versions.get(key);
    if (!v) { v = { sig: key, region: r, entries: new Set(), executed: new Set(), snapshot: m.ram.slice(lo, hi + 1), visits: 0 }; versions.set(key, v); }
    const op = m.ram[prevPc];
    if ((prevPc < lo || prevPc > hi) && (op === 0x20 || op === 0x4c) && (m.ram[prevPc + 1] | (m.ram[prevPc + 2] << 8)) === pc) { v.entries.add(pc); v.visits++; }
    for (let k = 0; k < insLen(m.ram[pc]); k++) v.executed.add(pc + k);
    break;
  }
  prevPc = pc;
  return step();
};

// ---- exploration ----
for (let f = 0; f < 120; f++) { m.joy1 = m.joy2 = f >= 30 && f < 34 ? 0x0f : 0x1f; m.runFrame(); game.cheat?.(m); }
const inWait = () => {
  const sp = m.cpu.sp, ret = m.ram[0x100 | ((sp + 1) & 0xff)] | (m.ram[0x100 | ((sp + 2) & 0xff)] << 8);
  return m.cpu.pc >= game.waitRoutine[0] && m.cpu.pc <= game.waitRoutine[1] && ret === game.mainLoopReturn;
};
interface Cell { state: MachineState; visits: number }
const archive = new Map<string, Cell>();
const places = new Set<string>();
const remember = (it: number) => {
  if (!inWait() || (game.valid && !game.valid(m))) return;
  const c = game.cell(m);
  if (archive.has(c)) return;
  archive.set(c, { state: m.saveState(), visits: 0 });
  const place = game.place(m);
  if (!places.has(place)) {
    places.add(place);
    fs.writeFileSync(path.join(outDir, 'cells', `${place}.state`), packState(m.saveState()));
    console.log(`iteration ${it}: ${place} (${archive.size} cells, ${versions.size} overlay versions)`);
  }
};
for (let f = 0; f < 600 && !archive.size; f++) { m.joy1 = m.joy2 = 0x1f; m.runFrame(); game.cheat?.(m); remember(0); }
for (const p of startsArg.split(',').filter(Boolean)) {
  m.loadState(unpackState(new Uint8Array(fs.readFileSync(p))));
  for (let f = 0, n = archive.size; f < 50 && archive.size === n; f++) { m.joy1 = m.joy2 = 0x1f; m.runFrame(); game.cheat?.(m); remember(0); }
}
const t0 = performance.now();
for (let it = 1; it <= Number(itersArg); it++) {
  const cells = [...archive.values()];
  const w = cells.map((c) => 1 / Math.sqrt(c.visits + 1));
  let pick = rnd() * w.reduce((s, x) => s + x, 0), cell = cells[0];
  for (let i = 0; i < cells.length; i++) { pick -= w[i]; if (pick <= 0) { cell = cells[i]; break; } }
  cell.visits++;
  m.loadState(cell.state);
  let joy = 0x1f, hold = 0;
  for (let f = 0; f < 250; f++) {
    if (hold-- <= 0) {
      joy = 0x1f;
      const d = Math.floor(rnd() * 9); // one or two directions, or none; sometimes fire
      if (d < 4) joy &= ~[1, 2, 4, 8][d];
      else if (d < 8) joy &= ~[5, 9, 6, 10][d - 4];
      if (rnd() < 0.15) joy &= ~16;
      hold = 5 + Math.floor(rnd() * 60);
      game.act?.(m, rnd());
    }
    m.joy1 = m.joy2 = joy;
    m.keys = rnd() < 0.003 ? [[1, 2]] : [];
    if (!m.runFrame()) break;
    game.cheat?.(m);
    if (f % 5 === 4) remember(it);
  }
}

// ---- overlay report ----
const out = [...versions.values()].map((v) => {
  const [lo, hi] = game.overlays[v.region];
  // where in the title image this version's executed code is stored
  const offs = [...v.executed].filter((a) => a <= hi).map((a) => a - lo);
  let source = -1;
  for (let s = 0; s + (hi - lo) < 0x10000 && source < 0; s++) {
    let ok = true;
    for (const o of offs) if (titleRam[s + o] !== v.snapshot[o]) { ok = false; break; }
    if (ok) source = s;
  }
  return {
    region: [lo, hi].map((a) => a.toString(16)), sig: v.sig.split(':')[1], visits: v.visits,
    entries: [...v.entries].sort((a, b) => a - b).map((a) => a.toString(16)),
    source: source >= 0 ? source.toString(16) : null,
    bytes: source >= 0 ? undefined : Buffer.from(v.snapshot).toString('hex'),
  };
});
fs.writeFileSync(path.join(outDir, 'overlays.json'), JSON.stringify(out, null, 1));
console.log(`${archive.size} cells, ${places.size} places, ${versions.size} overlay versions (${out.filter((o) => o.source === null).length} not found in the image) in ${((performance.now() - t0) / 1000).toFixed(0)}s`);
