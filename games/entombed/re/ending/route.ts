/**
 * Finds the steps Pendragon takes through a chamber for the ending (src/ending.ts): a search over what the show's own Director can do
 * (hold a way, leap with a way held, whip facing a way), each tried on the game itself from the state the last left it in (he is let
 * to land and come to rest after each, so the route is made of clear moves, not a flail), the cheapest in frames first, until the goal
 * (a byte of the game's memory, or where he stands) is reached. The steps it prints are pasted into the scene; the show replays them
 * exactly, as the game and the Director are deterministic. The tasks are at the foot of the file.
 *
 *   nice -n 15 node tools/test.mjs games/entombed/re/ending/route.ts <task> [out-dir]
 *
 * With an out-dir: a PNG of the state the route ends in.
 */
import fs from 'node:fs';
import { unpackState, type MachineState } from 'c64kit';
import { Director, bootGame, joy, placed, type EndingStep, type Way } from '../../../shared/ending/machine-reel';
import { NativeHost } from '../../../shared/native/host';
import { renderPng } from '../../../../tools/probe/render';
import { ACTION } from '../../src/actions';
import { enterChamber } from '../../src/chambers';
import { entombedEnding } from '../../src/ending';
import { port } from '../../src/native';

const spec = entombedEnding;
const title = unpackState(new Uint8Array(fs.readFileSync('games/entombed/assets/entombed-title.state')));
const base = bootGame(port, title, spec);
if (!base) throw new Error('no new game');

interface Task {
  chamber: number;
  /** Bytes set before he goes in (what he carries). */
  given?: Record<number, number>;
  /** Reached (checked once he is at rest after a move). */
  goal(ram: Uint8Array, hero: { x: number; y: number } | null): boolean;
  /** Bytes that tell states apart besides where he stands (a counter on the way). */
  watch?: number[];
  /** Where he is heading (his sprite's place): the states nearer it are tried first. */
  target?: [number, number];
  /** Leaps are among the moves; whip strokes facing a way. */
  jump?: boolean;
  whip?: boolean;
  /** Frames a walk lasts, and a leap's way is held after the take-off. */
  walks?: number[];
  leaps?: number[];
  /** Steps already found (the way here): the search starts where they end. */
  prefix?: EndingStep[];
  /** Give up after this many states. */
  max?: number;
}

const WAYS: Way[] = ['up', 'down', 'left', 'right'];

/** The moves he may make: each a few steps (the show's own kinds). */
function moves(t: Task): EndingStep[][] {
  const m: EndingStep[][] = [];
  for (const w of WAYS) for (const f of t.walks ?? [4, 12, 30]) m.push([{ press: [w], frames: f }]);
  if (t.jump) {
    for (const f of t.leaps ?? [8, 20]) {
      m.push([{ press: [], frames: 2, fire: true, action: ACTION.jump }, { press: [], frames: f }]);
      for (const w of WAYS) m.push([{ press: [w], frames: 2, fire: true, action: ACTION.jump }, { press: [w], frames: f }]);
    }
  }
  if (t.whip) for (const w of WAYS) m.push([{ use: ACTION.whip, face: w, times: 1, gap: 20 }]);
  return m;
}

const show = (s: EndingStep) => JSON.stringify(s).replace(/"(\w+)":/g, '$1: ').replace(/"/g, "'").replace(/,(?=\S)/g, ', ').replace(/\{/g, '{ ').replace(/\}/g, ' }');
const corridors = (ram: Uint8Array) => (ram[0x6001] | (ram[0x6002] << 8)) === 0x60f8;
const heroOf = (g: NativeHost) => { const s = g.m.capture.sprites.find((x) => x.n === 2); return s ? { x: s.x, y: s.y } : null; };
const enter = (t: Task) => (ram: Uint8Array) => { for (const [a, v] of Object.entries(t.given ?? {})) ram[Number(a)] = v; return enterChamber(ram, t.chamber); };

/** Run steps on a game; the frames that took. */
function play(g: NativeHost, steps: readonly EndingStep[]): number {
  const d = new Director(spec, steps);
  let frames = 0;
  while (!d.done && frames < 2000) { joy(g.m, spec.joyPort, d.frame(g)); spec.keepAlive(g.m.ram); g.tick(); frames++; }
  return frames;
}

/** Idle until he is at rest (landed, nothing moving him), at most 60 frames: how many. */
function settle(g: NativeHost): number {
  let still = 0, last = '', n = 0;
  while (still < 6 && n < 60) {
    joy(g.m, spec.joyPort, 0x1f); spec.keepAlive(g.m.ram); g.tick(); n++;
    const h = heroOf(g), k = h ? `${h.x},${h.y}` : '-';
    still = k === last ? still + 1 : 0;
    last = k;
  }
  return n;
}

/** The steps played through from the start as the show plays them (one Director): whether the goal holds where he comes to rest. */
function reaches(from: MachineState, t: Task, steps: readonly EndingStep[]): boolean {
  const g = placed(port, from, spec, enter(t));
  if (!g) return false;
  play(g, [...(t.prefix ?? []), ...steps]);
  return !corridors(g.m.ram) && g.m.ram[0x321c] === t.chamber && t.goal(g.m.ram, heroOf(g));
}

/** The rests between moves taken out where he need not stop (still reaching the goal). */
function unrest(from: MachineState, t: Task, steps: EndingStep[]): EndingStep[] {
  let best = steps;
  for (let i = 0; i < best.length; i++) {
    const s = best[i];
    if ('wait' in s && s.wait <= 8) {
      const without = [...best.slice(0, i), ...best.slice(i + 1)];
      if (reaches(from, t, without)) { best = without; i--; }
    }
  }
  return best;
}

/** Runs of one way joined (the same moves, fewer steps) while the goal is still reached. */
function join(from: MachineState, t: Task, steps: EndingStep[]): EndingStep[] {
  let best = steps;
  for (let i = 0; i + 1 < best.length; i++) {
    const a = best[i], b = best[i + 1];
    if ('press' in a && 'press' in b && !a.fire && !b.fire && a.press.join() === b.press.join() && a.action === undefined && b.action === undefined) {
      const joined = [...best.slice(0, i), { press: a.press, frames: a.frames + b.frames }, ...best.slice(i + 2)];
      if (reaches(from, t, joined)) { best = joined; i--; }
    }
  }
  return best;
}

function find(from: MachineState, name: string, t: Task, out: string | undefined): EndingStep[] | null {
  const start = placed(port, from, spec, enter(t));
  if (!start) throw new Error(`${name}: cannot enter chamber ${t.chamber}`);
  if (t.prefix) play(start, t.prefix);
  const first = start.save();
  if (!first) throw new Error(`${name}: not at the wait`);
  const key = (g: NativeHost) => { const h = heroOf(g); return `${h ? `${h.x >> 1},${h.y >> 1}` : '-'}|${(t.watch ?? []).map((a) => g.m.ram[a]).join(',')}`; };
  interface Node { state: MachineState; frames: number; steps: EndingStep[] }
  const queue: { node: Node; cost: number }[] = [];
  const push = (node: Node, away: number) => {
    const cost = node.frames + away * 0.5;
    let lo = 0, hi = queue.length;
    while (lo < hi) { const mid = (lo + hi) >> 1; if (queue[mid].cost <= cost) lo = mid + 1; else hi = mid; }
    queue.splice(lo, 0, { node, cost });
  };
  const seen = new Set<string>([key(start)]);
  push({ state: first, frames: 0, steps: [] }, 0);
  const all = moves(t);
  let expanded = 0, best = 1e9;
  while (queue.length) {
    const top = queue.shift();
    if (!top) break;
    if (++expanded > (t.max ?? 4000)) { console.log(`${name}: gave up after ${expanded} states (nearest ${best})`); return null; }
    for (const move of all) {
      const g = NativeHost.resume(port, top.node.state);
      let frames = top.node.frames + play(g, move);
      // (he must not leave: the way out is a door or the stairs, and the corridors' block is at $6000 then)
      if (g.m.ram[0x321c] !== t.chamber || corridors(g.m.ram)) continue;
      const rest = settle(g);
      frames += rest;
      const steps = [...top.node.steps, ...move, ...(rest > 0 ? [{ wait: rest }] : [])];
      const me = heroOf(g);
      if (t.goal(g.m.ram, me)) {
        console.log(`${name}: reached after ${frames} frames, ${steps.length} steps (${expanded} states)`);
        const small = join(from, t, unrest(from, t, steps));
        console.log(`${name}: ${small.length} steps, goal ${reaches(from, t, small) ? 'reached' : 'NOT reached'} on a replay`);
        for (const s of small) console.log(`  ${show(s)},`);
        if (out) { fs.mkdirSync(out, { recursive: true }); renderPng(g.m, `${out}/route-${name}.png`); }
        return small;
      }
      const next = g.save();
      if (!next) continue;
      const k = key(g);
      if (seen.has(k)) continue;
      seen.add(k);
      const away = me && t.target ? Math.abs(me.x - t.target[0]) + Math.abs(me.y - t.target[1]) : 0;
      if (me && away < best) { best = away; }
      push({ state: next, frames, steps }, away);
    }
  }
  console.log(`${name}: not found (${expanded} states, nearest ${best})`);
  return null;
}

// ---- the tasks

const bell = (n: number, x: number, y: number): Stage => ({ goal: (ram) => ram[0x6329] === n, target: [x, y] });
/** What differs from stage to stage of a chain: the goal and where he is heading. */
type Stage = Pick<Task, 'goal' | 'target'>;
const WHIP = { 0x322e: 1 };
const TASKS: Record<string, Task> = {
  // the statue in front of the stairs' gate: whipped from its left until it moves ($37FC counts to $20: a few strokes show it giving)
  statue: { chamber: 17, given: WHIP, whip: true, goal: (ram) => ram[0x37fc] >= 6, watch: [0x37fc], target: [136, 124], max: 3000 },
  // the stone at the back on the left: jumped on, it moves a little each time ($37FD counts to $29)
  stone: { chamber: 5, jump: true, goal: (ram) => ram[0x37fd] >= 4, watch: [0x37fd], target: [72, 80], max: 3000 },
  // the bowl of fruit in 9 brings the two creatures: where they meet the book of the dead is his
  book: { chamber: 9, given: { 0x322a: 1 }, goal: (ram) => ram[0x322c] === 1, target: [215, 112], max: 3000 },
  // the cobra in its casket, touched with the book in hand
  cobra: { chamber: 12, given: { 0x322c: 1 }, goal: (ram) => ram[0x37ff] === 1, target: [125, 84], max: 3000 },
  // the right pot, whipped
  pot: { chamber: 8, given: WHIP, whip: true, goal: (ram) => ram[0x6291] === 0x1a, watch: [0x6291], target: [260, 142], max: 3000 },
  // the spot at the back on the left where the stone is jumped on (the jumps are the scene's)
  stone2: { chamber: 5, jump: true, goal: (_ram, hero) => !!hero && hero.x <= 78 && hero.y <= 86, target: [72, 82], max: 3000 },
  // the ball on the walk in 14, whipped until it drops (the lift he stands on goes down)
  ball: { chamber: 14, given: WHIP, whip: true, goal: (ram) => ram[0x640f] === 1, watch: [0x640f, 0x6410], target: [72, 80], max: 3000 },
  // scroll 3 in chamber 6
  scroll: { chamber: 6, jump: true, goal: (ram) => ram[0x3237] === 1, target: [176, 130], max: 3000 },
  // a stone caught as it falls in 11 (the bird drops them)
  catch: { chamber: 11, jump: true, goal: (ram) => ram[0x63b4] === 1, watch: [0x63b4], max: 3000 },
  // the way out, walked up to and not through (the game ends there): the mummy that barred it is gone
  out: { chamber: 1, given: { 0x3230: 1, 0x1609: 0x79 }, goal: (_ram, hero) => !!hero && hero.x <= 70 && hero.y <= 146, target: [66, 144], max: 2000 },
  // the magic whip in its chest on the top tier: he must stand at its back (his y under $50)
  whip: { chamber: 2, jump: true, walks: [3, 8, 20], leaps: [6, 12, 20], max: 8000, goal: (ram) => ram[0x322e] === 1, target: [160, 76] },
};

/** Stages one after the other: each found from where the last ended (a bell after a bell). */
const pool = (n: number, x: number, y: number): Stage => ({ goal: (ram) => ram[0x62c6] === n, target: [x, y] });
const CHAINS: Record<string, { first: Task; then: Stage[] }> = {
  // the pools of chamber 7 in order, left, middle, right (each counted in $62C6; out of order he is hurt)
  pools: { first: { chamber: 7, jump: true, watch: [0x62c6], max: 3000, ...pool(1, 90, 95) }, then: [pool(2, 200, 100), pool(3, 261, 156)] },
  // the five bells of chamber 16, whipped in order: the torch comes down
  bells: { first: { chamber: 16, given: { 0x322e: 1 }, whip: true, walks: [4, 12, 30], ...bell(1, 75, 127), watch: [0x6329], max: 3000 }, then: [bell(2, 257, 127), bell(3, 129, 150), bell(4, 290, 127), bell(5, 217, 140)] },
};

const name = process.argv[2] ?? 'whip';
const chain = CHAINS[name];
if (chain) {
  let prefix: EndingStep[] = [];
  let stage = 0;
  for (const t of [chain.first, ...chain.then.map((x) => ({ ...chain.first, ...x }))]) {
    const steps = find(base, `${name}-${++stage}`, { ...t, prefix }, process.argv[3]);
    if (!steps) break;
    prefix = [...prefix, ...steps];
  }
  // (the rests between moves taken out where he need not stop, runs of a way joined)
  const last = { ...chain.first, ...chain.then[chain.then.length - 1] };
  let all = unrest(base, last, prefix);
  all = join(base, last, all);
  console.log(`${name}: all ${all.length} steps (${prefix.length} before tidying), goal ${reaches(base, last, all) ? 'reached' : 'NOT reached'}`);
  for (const s of all) console.log(`  ${show(s)},`);
} else {
  const task = TASKS[name];
  if (!task) throw new Error(`no task ${name}`);
  find(base, name, task, process.argv[3]);
}
