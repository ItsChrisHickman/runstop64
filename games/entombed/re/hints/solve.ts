/**
 * Do a chamber's activators by playing (see activators.ts): from the chamber's state (entered
 * as the game does, with the flags of things done elsewhere set first), Go-Explore until each
 * step's goal is reached (its bytes have their done values), then on from there to the next
 * step. For each step it keeps the inputs that got there from the chamber's state and where
 * Pendragon was when it happened: the hint's spot (and check.ts replays it).
 *
 *   npx tsx games/entombed/re/hints/solve.ts <chamber> <out.json> [iterations per step] [seed]
 */
import fs from 'node:fs';
import type { MachineState } from '../../../../packages/c64kit/src/c64/machine';
import { NativeHost } from '../../../shared/native/host';
import { port } from '../../src/native';
import { ACTIVATORS, type Step } from './activators';
import { chamberState } from './chambers';
import { INPUTS, replay, step, where, CORRIDORS } from './play';
import { must } from '../../../shared/test/must';

type Path = [number, number][];
const [chamberArg, outFile, itersArg = '6000', seedArg = '1'] = process.argv.slice(2);
const n = Number(chamberArg), spec = ACTIVATORS[n];
if (!spec) throw new Error(`chamber ${n}: no activators`);
let seed = Number(seedArg);
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const MAX_CELLS = 6000;
const inChamber = (ram: Uint8Array, block: number) => (ram[0x6001] | (ram[0x6002] << 8)) === block && ram[0x321c] === n;
const met = (ram: Uint8Array, goal: [number, number][]) => goal.every(([a, v]) => ram[a] === v);

/** Go-Explore from `from` until the step's goal holds; the path (from the chamber's state) and where he was. */
function solve(from: { state: MachineState; path: Path }, st: Step, block: number) {
  interface Cell { state: MachineState; path: Path; visits: number; x: number; y: number; progress: number }
  const archive = new Map<string, Cell>();
  const watch = [...new Set([...st.goal.map(([a]) => a), ...(st.watch ?? [])])];
  // (a watched $D0xx is the VIC-II's register: which sprites are shown, say)
  const byte = (g: NativeHost, a: number) => (a >= 0xd000 && a < 0xd040 ? g.m.vic[a - 0xd000] : g.m.ram[a]);
  const progressOf = (g: NativeHost) => (st.watch ?? []).filter((a) => a < 0xd000).reduce((t, a) => t + g.m.ram[a], 0);
  // (and where a monster in the way is, roughly: to get past it, it matters when)
  const keyOf = (g: NativeHost) => { const p = where(g); return `${p.x >> 3},${p.y >> 2}:${watch.map((a) => byte(g, a)).join(',')}/${(st.phase ?? []).map(([a, s]) => byte(g, a) >> s).join(',')}`; };
  const remember = (g: NativeHost, path: Path) => {
    if (g.lastWait !== port.mainLoopWait || !inChamber(g.m.ram, block) || archive.size >= MAX_CELLS) return;
    const k = keyOf(g);
    if (archive.has(k)) return;
    const s = g.save();
    if (s) archive.set(k, { state: s, path: path.map(([i, t]): [number, number] => [i, t]), visits: 0, ...where(g), progress: progressOf(g) });
  };
  { const g = NativeHost.resume(port, from.state); archive.set(keyOf(g), { state: from.state, path: from.path, visits: 0, ...where(g), progress: progressOf(g) }); }
  for (let it = 0; it < Number(itersArg); it++) {
    const cells = [...archive.values()];
    // (nearer the step's target, if it has one, is picked more; and the furthest on, by its
    // watched bytes: they count up to the goal)
    const sum = (c: Cell) => c.progress;
    const top = Math.max(...cells.map(sum));
    const w = cells.map((c) => (1 / Math.sqrt(c.visits + 1)) * (st.near ? 0.05 + Math.exp(-Math.hypot(c.x - st.near[0], (c.y - st.near[1]) * 2) / 40) : 1) * Math.pow(2, (sum(c) - top) / 4));
    let pick = rnd() * w.reduce((s, v) => s + v, 0), cell = cells[0];
    for (let i = 0; i < cells.length; i++) { pick -= w[i]; if (pick <= 0) { cell = cells[i]; break; } }
    cell.visits++;
    const g = NativeHost.resume(port, cell.state);
    const path: Path = cell.path.map(([i, t]): [number, number] => [i, t]);
    let input = 0, hold = 0;
    for (let f = 0; f < 150; f++) {
      if (hold-- <= 0) { input = usable[Math.floor(rnd() * usable.length)]; hold = 4 + Math.floor(rnd() * 30); path.push([input, 0]); }
      const p = where(g);
      step(g, INPUTS[input], path[path.length - 1][1] === 0);
      path[path.length - 1][1]++;
      // (done, even if that's leaving: the way out; but not by the chamber's block going)
      const here = inChamber(g.m.ram, block);
      if ((here || st.goal.every(([a]) => a < 0x6000 || a >= 0x6700)) && met(g.m.ram, st.goal)) return { path, x: p.x, y: p.y, input: INPUTS[input].name, iterations: it + 1, cells: archive.size };
      if (!here) break;
      if (f % 5 === 4) remember(g, path);
    }
  }
  // (not found: what it reached, to look into)
  const values = watch.map((a) => `$${a.toString(16)}: ${[...new Set([...archive.keys()].map((k) => k.split(':')[1].split('/')[0].split(',')[watch.indexOf(a)]))].join(' ')}`);
  console.log(`  ${archive.size} cells; ${values.join('; ')}`);
  if (process.env.COVER) fs.writeFileSync(process.env.COVER, JSON.stringify({ at: [...archive.values()].map((c) => [c.x, c.y]) }));
  return null;
}

const start = chamberState(n, spec.given ?? {});
// (the whip and torch only once he has them: without, trying one stops him a while, $17D9)
const usable = INPUTS.map((q, i) => [q, i] as const).filter(([q]) => (q.action !== 2 || start.ram[0x322e] === 1) && (q.action !== 3 || start.ram[0x322f] === 1)).map(([, i]) => i);
const block = start.ram[0x6001] | (start.ram[0x6002] << 8);
let from: { state: MachineState; path: Path } = { state: must(replay(start, [[0, 3]]).save(), 'a save after the first frames'), path: [[0, 3]] };
const out: unknown[] = [];
for (const st of spec.steps) {
  const t0 = Date.now();
  const r = solve(from, st, block);
  console.log(`chamber ${n} ${st.name}: ${r ? `at ${r.x},${r.y} (${r.input}) after ${r.iterations} tries, ${r.cells} cells` : 'NOT FOUND'} (${Math.round((Date.now() - t0) / 1000)}s)`);
  if (!r) break;
  out.push({ name: st.name, at: [r.x, r.y], input: r.input, path: r.path });
  // on from there (a few frames on, to a state that can be saved)
  const path: Path = [...r.path, [0, 10]];
  from = { state: must(replay(start, path).save(), 'a save after the step'), path };
}
fs.writeFileSync(outFile, JSON.stringify({ chamber: n, given: spec.given ?? {}, steps: out }));
void CORRIDORS;
