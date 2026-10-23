/**
 * The ways for the ending, found by playing (src/ending.ts uses them; src/ending-ways.ts is what this writes).
 *
 * For each room asked for: the places near its items where Willy can stand and live, then Go-Explore from each on the machine the show makes (`placed`, the same frames, the same joystick), with input as a player gives it (walking left
 * or right, jumping straight up or along, held for a while): keep a cell per (place, items taken) with the inputs that reached it, go on
 * from the rarely tried and the best, never past a death (`$51C7`) or out of the room, for the frames the show gives a scene. The way
 * written is the best of those (the most items, then the most of the room run over, then the fewest changes of input), from the spot it
 * began at (the show puts him there once the room is there: `stand`).
 *
 *   nice -n 15 node tools/test.mjs games/jsw2/re/ending/route.ts <iterations> <seed> [spots=4] [narrow=iterations] [frames=560] <room | room@x,y;x,y ...>
 *
 * A room given as `room@x,y` is searched from that spot (sprite coordinates) instead of from the landing's. It keeps what is in
 * src/ending-ways.ts for other rooms and replaces the rooms named.
 */
import fs from 'node:fs';
import { unpackState, type MachineState } from '../../../../packages/c64kit/src/c64/machine';
import { IDLE, bootGame, joy, placed } from '../../../shared/ending/machine-reel';
import { NativeHost } from '../../../shared/native/host';
import { must } from '../../../shared/test/must';
import { ITEM_COUNTS } from '../../src/itemcounts';
import { itemSpots } from '../../src/easy';
import { itemsLeft } from '../../src/items';
import { jsw2Ending, room as enterRoom, stand } from '../../src/ending';
import { WAYS, type Input, type Way } from '../../src/ending-ways';
import { port } from '../../src/native';

const [itersArg = '300', seedArg = '1', ...rest] = process.argv.slice(2);
const options = new Map(rest.filter((a) => a.includes('=')).map((a): [string, number] => { const [k, v] = a.split('='); return [k, Number(v)]; }));
const roomArgs = rest.filter((a) => !a.includes('='));
const option = (name: string, otherwise: number) => options.get(name) ?? otherwise;
let seed = Number(seedArg);
const rnd = () => ((seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff) / 0x7fffffff);

/** The joystick bits (low is pressed) for each input. */
const BITS: Record<Input, number> = { none: IDLE, left: IDLE & ~4, right: IDLE & ~8, fire: IDLE & ~16, 'fire+left': IDLE & ~20, 'fire+right': IDLE & ~24 };
const INPUTS = Object.keys(BITS).filter((k): k is Input => k in BITS);
const GOING: readonly Input[] = ['left', 'right', 'fire+left', 'fire+right', 'fire'];
/** The frames the way must last (the scene's length: its credit lines' slots, 120 a line, or more). */
const MAX_FRAMES = option('frames', 560);

const title = unpackState(new Uint8Array(fs.readFileSync('games/jsw2/assets/jsw2-title.state')));
const base = must(bootGame(port, title, jsw2Ending), 'a new game');

const place = (ram: Uint8Array) => [ram[0x8062] + 256 * (ram[0x8072] & 1), ram[0x8063]] as const;
const standing = (ram: Uint8Array) => !ram[0x82e4] && !ram[0x8292] && !ram[0x835d] && !ram[0x82d7];

type Spot = readonly [number, number, number];

interface Cell { snap: MachineState; log: Input[]; items: number; cover: Set<number>; visits: number; near: number; at: Spot; standing: boolean }

/**
 * Go-Explore in room `n` from `spot`, `iters` episodes, no cell's way longer than `frames`: the archive of cells. A cell's weight is drawn
 * to the items taken and to how near Willy has been to the nearest one still there.
 */
function explore(n: number, spot: Spot, frames: number, iters: number): Map<string, Cell> {
  const total = ITEM_COUNTS[n] ?? 0;
  let g = must(placed(port, base, jsw2Ending, enterRoom(n), stand(n, spot)), 'the room');
  const kept: { snap: MachineState | null } = { snap: null };
  let died = false;
  const arm = (h: NativeHost) => {
    h.onSkip = () => { died = true; return true; };
    h.onWait = () => { kept.snap = h.save(); };
  };
  /** One frame with this input; the snapshot taken at the wait is what a cell keeps. */
  const frame = (input: Input) => {
    kept.snap = null;
    joy(g.m, 2, BITS[input]); jsw2Ending.keepAlive(g.m.ram); g.tick(); jsw2Ending.tidy?.(g.m.ram);
  };
  const taken = () => total - itemsLeft(g.m.ram, n);
  /** How near Willy is to the nearest item still there (picture pixels; his sprite is drawn at x - 24, y - 50). */
  const nearest = () => {
    const [x, y] = place(g.m.ram);
    return Math.min(999, ...itemSpots(g.m.ram).map((s) => Math.abs(x - 24 + 8 - s.x) + Math.abs(y - 50 + 8 - s.y)));
  };
  const here = (): Spot => { const [x, y] = place(g.m.ram); return [x & 0xff, x >> 8, y]; };
  const cellKey = () => { const [x, y] = place(g.m.ram); return `${x >> 3}/${y >> 3}/${taken()}/${standing(g.m.ram) ? 1 : 0}`; };
  arm(g);
  const archive = new Map<string, Cell>();
  // (a pass of the main loop takes more than a frame, so not every frame has a wait to save at)
  const lead: Input[] = [];
  do { frame('none'); lead.push('none'); } while (!kept.snap && lead.length < 30);
  archive.set(cellKey(), { snap: must(kept.snap, 'a start'), log: lead, items: 0, cover: new Set(), visits: 0, near: nearest(), at: here(), standing: standing(g.m.ram) });
  for (let it = 0; it < iters; it++) {
    const cells = [...archive.values()].filter((c) => c.log.length < frames - 20);
    const best = Math.max(...cells.map((c) => c.items));
    const w = cells.map((c) => (c.items >= best ? 6 : c.items >= best - 1 ? 2 : 1) * (1 + 8 / (1 + c.near / 12)) / Math.sqrt(c.visits + 1));
    let pick = rnd() * w.reduce((a, b) => a + b, 0), cell = cells[0];
    for (let i = 0; i < cells.length; i++) { pick -= w[i]; if (pick <= 0) { cell = cells[i]; break; } }
    cell.visits++;
    g = NativeHost.resume(port, cell.snap);
    died = false;
    arm(g);
    const log = cell.log.slice(), cover = new Set(cell.cover);
    let near = cell.near;
    // (the rest of the frame it was saved in: the input of its last frame)
    let input: Input = log[log.length - 1] ?? 'none', hold = 0;
    frame(input);
    for (let f = 0; f < 200 && log.length < frames; f++) {
      if (hold-- <= 0) { input = rnd() < 0.8 ? GOING[Math.floor(rnd() * GOING.length)] : INPUTS[Math.floor(rnd() * INPUTS.length)]; hold = 2 + Math.floor(rnd() * rnd() * 160); }
      frame(input);
      log.push(input);
      if (died || g.m.ram[0x13] !== n) break;
      const [x, y] = place(g.m.ram);
      cover.add((x >> 4) * 64 + (y >> 4));
      const snap = kept.snap;
      if (!snap) continue;
      near = Math.min(near, nearest());
      const key = cellKey(), was = archive.get(key), items = taken();
      if (!was || was.log.length > log.length + 40 || near < was.near - 8) archive.set(key, { snap, log: log.slice(), items, cover: new Set(cover), visits: was?.visits ?? 0, near, at: here(), standing: standing(g.m.ram) });
    }
  }
  return archive;
}

/** A way played again from the spot, straight through (no snapshots): the items taken, and whether he lived and stayed in the room. */
function replay(n: number, spot: Spot, log: readonly Input[]): { items: number; clean: boolean } {
  const g = must(placed(port, base, jsw2Ending, enterRoom(n), stand(n, spot)), 'the room');
  let died = false;
  g.onSkip = () => { died = true; return true; };
  const total = ITEM_COUNTS[n] ?? 0;
  for (const input of log) {
    joy(g.m, 2, BITS[input]); jsw2Ending.keepAlive(g.m.ram); g.tick(); jsw2Ending.tidy?.(g.m.ram);
    if (died || g.m.ram[0x13] !== n) return { items: total - itemsLeft(g.m.ram, n), clean: false };
  }
  return { items: total - itemsLeft(g.m.ram, n), clean: true };
}

const changes = (l: Input[]) => l.reduce((c, x, i) => c + (i > 0 && l[i - 1] !== x ? 1 : 0), 0);
/** The best of an archive that plays again as found (`replay`): the most items taken, then the most of the room run over, then the fewest changes of input. */
function bestOf(n: number, spot: Spot, archive: Map<string, Cell>): Cell | undefined {
  const sorted = [...archive.values()].sort((a, b) => b.items - a.items || b.cover.size - a.cover.size || b.log.length - a.log.length || changes(a.log) - changes(b.log));
  let tried = 0;
  for (const cell of sorted) {
    // (a way that lasts the scene: Willy standing still at the end of a shorter one is not safe)
    if (cell.log.length < MAX_FRAMES - 12) continue;
    if (tried++ >= option('verify', 40)) break;
    const r = replay(n, spot, cell.log);
    if (r.clean && r.items >= cell.items) return cell;
  }
  return undefined;
}

/**
 * Places Willy can stand and live near the room's items: a grid round the first, middle and last item's cell, each tried by putting him
 * there (as the show does) and waiting 40 frames (no life lost, still on that spot, on his feet). One for each floor below the items
 * (the nearest to an item), the highest floor first.
 */
function nearItems(n: number): Spot[] {
  const probe = must(placed(port, base, jsw2Ending, enterRoom(n)), 'the room');
  const cells = itemSpots(probe.m.ram);
  if (cells.length === 0) return [];
  const picked = [cells[0], cells[Math.floor(cells.length / 2)], cells[cells.length - 1]];
  // (Willy's feet below the item's cell: his sprite is drawn at x - 24, y - 50, 21 lines tall)
  const lowest = Math.min(...cells.map((c) => c.y)) + 50 + 4;
  const found: { spot: Spot; near: number }[] = [];
  const tried = new Set<string>();
  for (const c of picked) for (let dx = -48; dx <= 48; dx += 8) for (let dy = -10; dy <= 64; dy += 2) {
    const sx = c.x + 24 - 8 + dx, sy = c.y + 50 - 8 + dy;
    if (sx < 24 || sx > 330 || sy < 54 || sy > 200 || tried.has(`${sx}/${sy}`)) continue;
    tried.add(`${sx}/${sy}`);
    const spot: Spot = [sx & 0xff, sx >> 8, sy];
    const g = must(placed(port, base, jsw2Ending, enterRoom(n), stand(n, spot)), 'the room');
    let died = false;
    g.onSkip = () => { died = true; return true; };
    for (let f = 0; f < 40 && !died; f++) { joy(g.m, 2, IDLE); jsw2Ending.keepAlive(g.m.ram); g.tick(); }
    if (died || g.m.ram[0x13] !== n || !standing(g.m.ram)) continue;
    // (on his own two feet, not embedded in a wall: he walks a way when asked)
    const [x, y] = place(g.m.ram);
    let walks = false;
    for (const input of [BITS.left, BITS.right]) {
      const from = place(g.m.ram)[0];
      for (let f = 0; f < 30; f++) { joy(g.m, 2, input); jsw2Ending.keepAlive(g.m.ram); g.tick(); }
      if (Math.abs(place(g.m.ram)[0] - from) >= 6) walks = true;
    }
    if (died || !walks) continue;
    found.push({ spot: [x & 0xff, x >> 8, y], near: Math.min(...cells.map((k) => Math.abs(x - 24 + 8 - k.x) + Math.abs(y - 50 + 8 - k.y))) });
  }
  if (process.env.SHOW_SPOTS) console.log(found.map((f) => `${f.spot[0] + 256 * f.spot[1]},${f.spot[2]}`).join(' '));
  // one place for each floor below the items (the nearest of that floor), the floors nearest first: he takes them from below, rising
  const floors = new Map<number, { spot: Spot; near: number }>();
  for (const f of found) {
    if (f.spot[2] < lowest) continue;
    const floor = f.spot[2] >> 3, was = floors.get(floor);
    if (!was || f.near < was.near) floors.set(floor, f);
  }
  return [...floors.values()].sort((a, b) => a.spot[2] - b.spot[2]).map((f) => f.spot);
}

/** A way for room `n`: from each of the places to start (the given ones, or those near the items), a search within `frames` for taking the items; the best of them. */
function search(n: number, given: readonly Spot[]): Way | null {
  const total = ITEM_COUNTS[n] ?? 0;
  const spots = given.length > 0 ? given : nearItems(n).slice(0, option('spots', 4));
  console.log(`room ${n}: from ${spots.map((s) => `${s[0] + 256 * s[1]},${s[2]}`).join(' ')}`);
  let top: { cell: Cell; spot: Spot } | null = null;
  for (const spot of spots) {
    const cell = bestOf(n, spot, explore(n, spot, MAX_FRAMES, option('narrow', Number(itersArg))));
    if (!cell) continue;
    console.log(`  from ${spot[0] + 256 * spot[1]},${spot[2]}: ${cell.items} of ${total} items, ${cell.cover.size} places run over, ${cell.log.length} frames`);
    if (!top || cell.items > top.cell.items || (cell.items === top.cell.items && cell.cover.size > top.cell.cover.size)) top = { cell, spot };
  }
  if (!top) return null;
  const path: [Input, number][] = [];
  for (const i of top.cell.log) { const last = path[path.length - 1]; if (last && last[0] === i) last[1]++; else path.push([i, 1]); }
  return { spot: top.spot, path };
}

/**
 * Rooms are named `room`, or `room@x,y;x,y` (spots to start from, given), or `room@x,y#input:frames,input:frames...` (a way written by hand,
 * for a room where the search finds none that lasts: it is played again to see that it is clean, and kept if it is).
 */
const parse = (a: string): [number, Spot[], [Input, number][] | null] => {
  const [head, hand] = a.split('#');
  const [r, at] = head.split('@');
  const spots = at ? at.split(';').map((p): Spot => { const [x, y] = p.split(',').map(Number); return [x & 0xff, x >> 8, y]; }) : [];
  const path = hand ? hand.split(',').map((p): [Input, number] => { const [i, f] = p.split(':'); const input = INPUTS.find((k) => k === i); if (!input) throw new Error(`no input ${i}`); return [input, Number(f)]; }) : null;
  return [Number(r), spots, path];
};

const ways: Record<number, Way> = { ...WAYS };
for (const a of roomArgs) {
  const [n, given, hand] = parse(a);
  if (hand) {
    const log = hand.flatMap(([i, f]) => Array<Input>(f).fill(i));
    const r = replay(n, given[0], log);
    console.log(`room ${n}: a way by hand, ${log.length} frames, ${r.items} items, ${r.clean ? 'clean' : 'NOT CLEAN (a life lost or out of the room)'}`);
    if (r.clean) ways[n] = { spot: given[0], path: hand };
    continue;
  }
  const w = search(n, given);
  if (w) ways[n] = w;
}
const body = Object.keys(ways).map(Number).sort((a, b) => a - b).map((n) => `  ${n}: { spot: [${ways[n].spot.join(', ')}], path: [${ways[n].path.map(([i, f]) => `['${i}', ${f}]`).join(', ')}] },`).join('\n');
const head = fs.readFileSync('games/jsw2/src/ending-ways.ts', 'utf8').split('export const WAYS')[0];
fs.writeFileSync('games/jsw2/src/ending-ways.ts', `${head}export const WAYS: Record<number, Way> = {\n${body}\n};\n`);
