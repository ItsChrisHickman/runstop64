/**
 * The ways between the factory's screens, found by playing: Go-Explore (keep an archive of
 * distinct cells, go on from rarely visited ones with random joystick input) from every screen's
 * two ends at once. Each screen is entered by the game's own way in (src/travel.ts `enter`), with
 * the oil topped up and every switch on (so the lift runs and the tubes lift: the most the
 * factory opens up); from there it's all walking, jumping and riding. A way is noted when Thing
 * comes into another screen: from which screen, to which, at which end ("L": its left end, walking
 * right), with the inputs that did it from the start's state, so it can be replayed.
 *
 * With ENHANCED=1, the same with ENHANCED on (to see it still gets everywhere the original does).
 *
 *   nice -n 15 node tools/test.mjs games/thingonaspring/re/ways.ts <out.json> [iterations] [seed] [episode frames]
 */
import fs from 'node:fs';
import { packState } from '../../../packages/c64kit/src/c64/machine';
import { makeEnhanced } from '../src/assists';
import { allOn, inputIndex, INPUTS, makeStarts, pathOf, resumeSnap, snapper, step, type Snap } from './play';

const [out, itersArg = '3000', seedArg = '1', epArg = '300'] = process.argv.slice(2);
let seed = Number(seedArg);
const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff);
const GOING = (['left', 'right', 'fire+left', 'fire+right'] as const).map(inputIndex);

/** A start: a screen entered at one end (the game's way in), settled. */
interface Start { id: string; snap: Snap }
interface Cell { key: string; start: string; snap: Snap; inputs: number[]; visits: number; screen: string }
const screenKey = (ram: Uint8Array) => `${ram[0x5f]}.${ram[0x5e]}`;
const cellKey = (ram: Uint8Array) => `${screenKey(ram)}|${(ram[0x19] * 4 + ram[0x1d]) >> 4}|${ram[0x1e] >> 4}`;
const archive = new Map<string, Cell>();
const starts = new Map<string, Start>();
const ways = new Map<string, { start: string; path: [number, number][] }>();

// ---- the starts: every screen from both ends ----
const t0 = performance.now();
for (const [id, snap] of makeStarts()) {
  starts.set(id, { id, snap });
  archive.set(`${id}|start`, { key: `${id}|start`, start: id, snap, inputs: [0], visits: 0, screen: screenKey(snap.state.ram) });
}
console.log(`${starts.size} starts`);

for (let it = 1; it <= Number(itersArg); it++) {
  const groups = new Map<string, Cell[]>();
  for (const c of archive.values()) groups.set(c.screen, [...(groups.get(c.screen) ?? []), c]);
  const choose = <T>(xs: T[], weight: (x: T) => number) => {
    const w = xs.map(weight);
    let pick = rnd() * w.reduce((a, b) => a + b, 0);
    for (let i = 0; i < xs.length; i++) { pick -= w[i]; if (pick <= 0) return xs[i]; }
    return xs[xs.length - 1];
  };
  const group = choose([...groups.values()], (g) => 1 / Math.sqrt(g.reduce((a, c) => a + c.visits, 0) + 1));
  const cell = choose(group, (c) => 1 / Math.sqrt(c.visits + 1));
  cell.visits++;
  const log = cell.inputs.slice();
  const g = resumeSnap(cell.snap, INPUTS[log[log.length - 1]].joy);
  // (ENHANCED=1: with the ENHANCED set on, from each episode's start)
  const enhanced = process.env.ENHANCED ? makeEnhanced() : null;
  if (enhanced) g.onHook = (pc) => enhanced.hook(pc, g.m.ram, () => true);
  allOn(g.m.ram);
  const latest = snapper(g, () => log.length - 1);
  let input = 0, hold = 0, taken: Snap | null = null;
  let last = cell.screen;
  for (let f = 0; f < Number(epArg); f++) {
    // (mostly going somewhere: left or right, walking or jumping; now and then anything)
    if (hold-- <= 0) { input = rnd() < 0.7 ? GOING[Math.floor(rnd() * GOING.length)] : Math.floor(rnd() * INPUTS.length); hold = 3 + Math.floor(rnd() * 50); }
    log.push(input);
    try { step(g, INPUTS[input].joy); } catch { break; } // (a way the game never goes: off the far end of the last level)
    enhanced?.afterFrame(g.m.ram, () => true);
    allOn(g.m.ram);
    if (g.m.ram[0x1c]) break;
    const snap = latest();
    if (!snap || snap === taken) continue;
    taken = snap;
    const ram = snap.state.ram, now = screenKey(ram);
    if (now !== last) {
      const way = `${last}>${now}:${ram[0x19] === 0 ? 'L' : 'R'}`;
      if (!ways.has(way)) { ways.set(way, { start: cell.start, path: pathOf(log.slice(0, snap.frame + 1)) }); console.log(`way ${way} (iteration ${it})`); }
      last = now;
    }
    const key = cellKey(ram);
    if (!archive.has(key)) archive.set(key, { key, start: cell.start, snap, inputs: log.slice(0, snap.frame + 1), visits: 0, screen: now });
  }
}
const byScreen: Record<string, number> = {};
for (const c of archive.values()) byScreen[c.screen] = (byScreen[c.screen] ?? 0) + 1;
fs.writeFileSync(out, JSON.stringify({ ways: Object.fromEntries(ways), cells: byScreen }, null, 1));
if (process.env.STARTS) for (const [id, s] of starts) fs.writeFileSync(`${process.env.STARTS}/${id}.state`, packState(s.snap.state));
console.log(`${archive.size} cells, ${ways.size} ways in ${((performance.now() - t0) / 1000).toFixed(0)}s`);
