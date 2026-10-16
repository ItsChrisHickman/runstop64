/**
 * Find what in a chamber does something, by playing it: Go-Explore from the chamber's state
 * (chambers.ts), with air and ankhs kept topped up. All of memory is watched (RAM and colour
 * RAM, less the stack and the bytes that change by themselves when he's left alone): for each
 * byte, the values it takes, how often it changes, whether it ever goes back to how the chamber
 * started, and the first few times it takes a new value: where Pendragon was, what he was doing,
 * and the inputs that got there from the chamber's state (so the moment can be replayed, see
 * check.ts). Bytes that take only a few values are the chamber's state: the archive's cells are
 * told apart by them (and where he is), so the exploration goes on from each step of a puzzle.
 *
 *   npx tsx games/entombed/re/hints/find.ts <chamber.state> <out.json> [iterations] [seed]
 */
import fs from 'node:fs';
import { unpackState, type MachineState } from '../../../../packages/c64kit/src/c64/machine';
import { NativeHost } from '../../../shared/native/host';
import { port } from '../../src/native';
import { INPUTS, keep, where, step, replay, CORRIDORS } from './play';

const [stateFile, outFile, itersArg = '1500', seedArg = '1'] = process.argv.slice(2);
const start = unpackState(new Uint8Array(fs.readFileSync(stateFile)));
let seed = Number(seedArg);
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const N = 0x10400; // RAM, then colour RAM (low nybbles)
const MAX_CELLS = Number(process.env.MAX_CELLS ?? 3000), FEW = 6;
const chamber = start.ram[0x321c], block = start.ram[0x6001] | (start.ram[0x6002] << 8);
const inChamber = (ram: Uint8Array) => (ram[0x6001] | (ram[0x6002] << 8)) === block && ram[0x321c] === chamber;
const read = (g: NativeHost, out: Uint8Array) => { out.set(g.m.ram); for (let i = 0; i < 0x400; i++) out[0x10000 + i] = g.m.colour[i] & 15; };

// The bytes that change by themselves (left alone for a while), and the stack: not watched.
const ignore = new Uint8Array(N);
ignore.fill(1, 0x100, 0x200);
const startMem = new Uint8Array(N);
{
  const g = NativeHost.resume(port, start);
  read(g, startMem);
  const now = new Uint8Array(N);
  for (let f = 0; f < 1500; f++) { g.m.joy1 = g.m.joy2 = 0x1f; g.tick(); keep(g); read(g, now); for (let a = 0; a < N; a++) if (now[a] !== startMem[a]) ignore[a] = 1; }
}

// Per byte: the values seen (a bitset), how many changes, whether it went back to its start value.
const seen = new Uint8Array(N * 32), distinct = new Uint16Array(N), changes = new Uint32Array(N), reverted = new Uint8Array(N);
for (let a = 0; a < N; a++) { seen[a * 32 + (startMem[a] >> 3)] |= 1 << (startMem[a] & 7); distinct[a] = 1; }
type Path = [number, number][]; // [input, frames]
interface Event { to: number; from: number; x: number; y: number; input: string; path: Path }
const events = new Map<number, Event[]>();
/**
 * The chamber's state, for telling the archive's cells apart: bytes with a few values that
 * change rarely (not a monster's step or an animation), recounted as the exploration goes.
 * Not the screen or its colours (what's drawn changes with what passes in front of it).
 */
let stateBytes: number[] = [];
let frames = 0;
const recount = () => { stateBytes = []; for (let a = 0; a < 0x10000; a++) if ((a < 0x400 || a >= 0x800) && distinct[a] >= 2 && distinct[a] <= 4 && changes[a] <= Math.max(4, frames / 500)) stateBytes.push(a); };

interface Cell { state: MachineState; path: Path; visits: number; hash: string; x: number; y: number }
const archive = new Map<string, Cell>();
const perState = new Map<string, number>(); // cells in each state of the chamber
const stateHash = (g: NativeHost) => {
  const ram = g.m.ram;
  let h = 2166136261;
  for (const a of stateBytes) h = Math.imul(h ^ (a < 0x10000 ? ram[a] : g.m.colour[a - 0x10000] & 15), 16777619) >>> 0;
  return h.toString(16);
};
function remember(g: NativeHost, path: Path) {
  if (g.lastWait !== port.mainLoopWait || !inChamber(g.m.ram)) return;
  const p = where(g), hash = stateHash(g), key = `${hash}/${p.x >> 4},${p.y >> 3}`;
  if (archive.has(key) || archive.size >= MAX_CELLS) return;
  const s = g.save();
  if (s) { archive.set(key, { state: s, path: path.map(([i, t]): [number, number] => [i, t]), visits: 0, hash, ...p }); perState.set(hash, (perState.get(hash) ?? 0) + 1); }
}
{ const g = replay(start, [[0, 3]]); remember(g, [[0, 3]]); }

const exits = new Map<string, { x: number; y: number; to: number }>();
const prev = new Uint8Array(N), now = new Uint8Array(N);
const t0 = Date.now();
for (let it = 0; it < Number(itersArg); it++) {
  if (it % 20 === 0) recount();
  // (cells in a rarely reached state of the chamber are picked more: the next step of a puzzle)
  const cells = [...archive.values()];
  const w = cells.map((c) => 1 / Math.sqrt(c.visits + 1) / Math.sqrt(perState.get(c.hash) ?? 1));
  let pick = rnd() * w.reduce((s, v) => s + v, 0), cell = cells[0];
  for (let i = 0; i < cells.length; i++) { pick -= w[i]; if (pick <= 0) { cell = cells[i]; break; } }
  cell.visits++;
  const g = NativeHost.resume(port, cell.state);
  const path: Path = cell.path.map(([i, t]): [number, number] => [i, t]);
  read(g, prev);
  let input = 0, hold = 0;
  for (let f = 0; f < 150; f++) {
    if (hold-- <= 0) { input = Math.floor(rnd() * INPUTS.length); hold = 4 + Math.floor(rnd() * 30); path.push([input, 0]); }
    const p = where(g);
    step(g, INPUTS[input], path[path.length - 1][1] === 0);
    path[path.length - 1][1]++;
    if (!inChamber(g.m.ram)) {
      const k = `${p.x >> 3},${p.y >> 2}`;
      if (!exits.has(k)) exits.set(k, { ...p, to: (g.m.ram[0x6001] | (g.m.ram[0x6002] << 8)) === CORRIDORS ? 0 : g.m.ram[0x321c] });
      break;
    }
    read(g, now);
    frames++;
    for (let a = 0; a < N; a++) {
      const v = now[a];
      if (v === prev[a] || ignore[a]) continue;
      changes[a]++;
      if (v === startMem[a]) reverted[a] = 1;
      const bit = 1 << (v & 7), at = a * 32 + (v >> 3);
      if (!(seen[at] & bit)) {
        seen[at] |= bit; distinct[a]++;
        let list = events.get(a);
        if (!list) events.set(a, (list = []));
        if (list.length < 12) list.push({ to: v, from: prev[a], x: p.x, y: p.y, input: INPUTS[input].name, path: path.map(([i, t]): [number, number] => [i, t]) });
      }
    }
    prev.set(now);
    if (f % 5 === 4) remember(g, path);
  }
}
// The candidates: bytes that took only a few values (with every first time each was taken).
const out = [];
for (const [a, list] of events) {
  if (distinct[a] > FEW) continue;
  out.push({ addr: a, start: startMem[a], distinct: distinct[a], changes: changes[a], reverted: !!reverted[a], events: list });
}
out.sort((p, q) => p.changes - q.changes);
fs.writeFileSync(outFile, JSON.stringify({ chamber, cells: archive.size, seconds: Math.round((Date.now() - t0) / 1000), ignored: [...ignore].reduce((s, v) => s + v, 0), exits: [...exits.values()], at: [...archive.values()].map((c) => [c.x, c.y]), bytes: out }));
recount();
console.log(`chamber ${chamber}: ${archive.size} cells in ${perState.size} states (${stateBytes.length} state bytes: ${stateBytes.slice(0, 40).map((a) => a.toString(16)).join(' ')}), ${out.length} candidate bytes, ${Math.round((Date.now() - t0) / 1000)}s`);
