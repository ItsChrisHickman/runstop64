/**
 * A route through the mansion as a person might play it, for the map's tests (test/route.ts):
 * Go-Explore on the native port (play at random from a place reached, keep every new place
 * with the input that got there, go on from the least tried), with input the way a player
 * gives it: always walking left or right, or jumping (straight up, or along), held for a
 * while; never standing about on purpose. Then the place whose route has passed through
 * the most rooms is written out: the joystick for every frame from the title (the start
 * press included) as runs of [joystick, frames] (active low, as $DC00 reads it), in
 * re/routes.json, with the rooms it passes through in order.
 *
 *   nice -n 15 node tools/test.mjs games/jsw2/re/route.ts [iterations] [seed]
 *
 * (re/routes.json: 12000 iterations, seed 5, about six minutes: 12 rooms, 18 arrivals.)
 */
import fs from 'node:fs';
import { unpackState, type MachineState } from '../../../packages/c64kit/src/c64/machine';
import { NativeHost } from '../../shared/native/host';
import { port } from '../src/native';
import { MANSION } from '../src/mansion';

const [itersArg = '400', seedArg = '1'] = process.argv.slice(2);
let seed = Number(seedArg);
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);

const IDLE = 0x1f, LEFT = 0x1f & ~4, RIGHT = 0x1f & ~8, FIRE = 0x1f & ~16;
/** What a player does: walk, or jump (up, or along). */
const MOVES = [LEFT, RIGHT, LEFT & FIRE, RIGHT & FIRE, FIRE];

/** The start (as the front end's test plays it): the title for 80 frames, fire for 3, then nothing till play's under way. */
const START: number[] = [...Array<number>(80).fill(IDLE), ...Array<number>(3).fill(FIRE), ...Array<number>(200).fill(IDLE)];

const title = new Uint8Array(fs.readFileSync('games/jsw2/assets/jsw2-title.state'));
let g = new NativeHost(port, unpackState(title));
/**
 * A frame with this joystick. Places are kept as saved at the main loop's wait (`save`, mid-frame):
 * a place's inputs run to the end of the frame it was saved in, and going on from it starts with
 * the rest of that frame (with the same joystick), so a route replays exactly.
 */
let saved: MachineState | null = null;
const frame = (joy: number) => {
  saved = null;
  g.onWait = () => { saved = g.save(); };
  g.m.joy1 = IDLE; g.m.joy2 = joy;
  g.tick();
  g.m.ram[0x8096] = 0xff; // (lives kept full, as a test does)
};
for (const j of START) frame(j);
const room = () => g.m.ram[0x13];

interface Cell { state: MachineState; inputs: number[]; rooms: number[]; visits: number }
/** Rooms a route has been in. */
const distinct = (rooms: number[]) => new Set(rooms).size;
const archive = new Map<string, Cell>();
const key = () => { const r = g.m.ram; return `${room()}/${(r[0x8062] >> 4) | ((r[0x8072] & 1) << 4)}/${r[0x8063] >> 4}`; };
const consider = (inputs: number[], rooms: number[]) => {
  if (!MANSION[room()]) return;
  const k = key(), was = archive.get(k);
  if (was && (distinct(was.rooms) > distinct(rooms) || (distinct(was.rooms) === distinct(rooms) && was.inputs.length <= inputs.length))) return;
  const state = saved;
  if (!state) return;
  archive.set(k, { state, inputs: inputs.slice(), rooms: rooms.slice(), visits: was?.visits ?? 0 });
};
consider([], [room()]);
if (!archive.size) throw new Error('no place to start from');

const t0 = performance.now();
for (let it = 1; it <= Number(itersArg); it++) {
  const cells = [...archive.values()];
  const most = Math.max(...cells.map((c) => distinct(c.rooms)));
  // the least tried, in the rooms least explored, and those whose route has come through the most rooms
  const inRoom = new Map<number, number>();
  for (const c of cells) { const r = c.rooms[c.rooms.length - 1]; inRoom.set(r, (inRoom.get(r) ?? 0) + 1); }
  const w = cells.map((c) => (distinct(c.rooms) >= most ? 10 : distinct(c.rooms) >= most - 1 ? 3 : 1) / Math.sqrt((c.visits + 1) * (inRoom.get(c.rooms[c.rooms.length - 1]) ?? 1)));
  let pick = rnd() * w.reduce((s, x) => s + x, 0), cell = cells[0];
  for (let i = 0; i < cells.length; i++) { pick -= w[i]; if (pick <= 0) { cell = cells[i]; break; } }
  cell.visits++;
  g = NativeHost.resume(port, cell.state);
  const inputs = cell.inputs.slice(), rooms = cell.rooms.slice();
  frame(inputs[inputs.length - 1] ?? IDLE); // (the rest of the frame it was saved in)
  let joy = MOVES[0], hold = 0;
  for (let f = 0; f < 100; f++) {
    if (hold-- <= 0) { joy = MOVES[Math.floor(rnd() * MOVES.length)]; hold = 10 + Math.floor(rnd() * 50); }
    frame(joy);
    inputs.push(joy);
    if (rooms[rooms.length - 1] !== room()) rooms.push(room());
    if (f % 5 === 4) consider(inputs, rooms);
  }
  if (it % 50 === 0) console.log(`iteration ${it}: ${archive.size} places, ${new Set(cells.flatMap((c) => c.rooms)).size} rooms, best route through ${most} rooms (${((performance.now() - t0) / 1000).toFixed(0)}s)`);
}

const best = [...archive.values()].sort((a, b) => distinct(b.rooms) - distinct(a.rooms) || a.inputs.length - b.inputs.length)[0];
const all = [...START, ...best.inputs], runs: number[] = [];
for (const j of all) {
  if (runs.length && runs[runs.length - 2] === j) runs[runs.length - 1]++;
  else runs.push(j, 1);
}
fs.writeFileSync('games/jsw2/re/routes.json', JSON.stringify({ rooms: best.rooms, joystick: runs }) + '\n');
console.log(`route: ${all.length} frames through ${new Set(best.rooms).size} rooms (${best.rooms.length} arrivals): ${best.rooms.join(' ')}`);
