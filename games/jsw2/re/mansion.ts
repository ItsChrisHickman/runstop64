/**
 * Builds games/jsw2/src/mansion.ts: every room of the mansion, its name and exits, and a
 * place on a grid for the pause screen's map. The game's own room loader ($62C5) is run
 * for each room number (in $13) on a copy of the machine; it leaves the room's name at
 * ($73) and its exits (left, right, up, down; the room itself where there's none) in
 * $8169-$816C. The rooms are the ones reachable from the start (the Bathroom) through
 * exits, and from the places the game sends Willy to directly.
 *
 *   npx tsx games/jsw2/re/mansion.ts
 */
import fs from 'node:fs';
import { C64, unpackState, type MachineState } from '../../../packages/c64kit/src/c64/machine';

const START = 0x20;
/** Rooms the game sends Willy to directly (its code stores them in $13). */
const SENT_TO = [0x6e, 0x79, 0x61];

const o = new C64();
o.loadState(unpackState(new Uint8Array(fs.readFileSync(new URL('../assets/jsw2-title.state', import.meta.url)))));
// a play state: the original at the top of its main loop
const got: { play: MachineState | null } = { play: null }; // (taken by the step hook)
let passes = 0;
const step = o.cpu.step.bind(o.cpu);
o.cpu.step = () => { if (!got.play && o.cpu.pc === 0x4bae && ++passes > 30) got.play = o.saveState(); return step(); };
for (let f = 0; f < 400 && !got.play; f++) { o.joy2 = f >= 40 && f < 44 ? 0x0f : 0x1f; o.runFrame(); }
const play = got.play;
if (!play) throw new Error('the game never started');

const nameAt = (r: Uint8Array) => {
  const p = r[0x73] | (r[0x74] << 8);
  let s = '';
  for (let y = 1; y < 40; y++) {
    const c = r[p + y] & 0x7f;
    // screen codes: 1-26 lower case, $41-$5A upper case (shown in capitals here), $20-$3F as ASCII
    s += c >= 1 && c <= 26 ? String.fromCharCode(64 + c) : c >= 0x41 && c <= 0x5a ? String.fromCharCode(c) : c >= 0x20 && c <= 0x3f ? String.fromCharCode(c) : ' ';
    if (r[p + y] & 0x80) break;
  }
  return s.replace(/\s+/g, ' ').trim();
};
interface Room { name: string; exits: [number, number, number, number] }
const load = (n: number): Room | null => {
  const m = new C64();
  m.loadState(play);
  m.ram[0x13] = n;
  m.cpu.sp = 0xdf;
  try { m.call(0x62c5, 2_000_000); } catch { return null; }
  return { name: nameAt(m.ram), exits: [m.ram[0x8169], m.ram[0x816a], m.ram[0x816b], m.ram[0x816c]] };
};

const rooms = new Map<number, Room>();
const work = [START, ...SENT_TO];
for (let n = work.shift(); n !== undefined; n = work.shift()) {
  if (rooms.has(n)) continue;
  const r = load(n);
  if (!r) throw new Error(`room ${n} didn't load`);
  rooms.set(n, r);
  for (const e of r.exits) if (e !== n && !rooms.has(e)) work.push(e);
}

// Places. Rooms joined left and right make rows (a link counts from either side); rows are
// then placed by their up and down links, moved further up or down where they'd overlap
// (the mansion doesn't always fit a grid). Any room still on top of another goes to the
// nearest free place.
const room = (n: number) => { const r = rooms.get(n); if (!r) throw new Error(`room ${n} not loaded`); return r; };
const left = (n: number) => room(n).exits[0], right = (n: number) => room(n).exits[1];
const up = (n: number) => room(n).exits[2], down = (n: number) => room(n).exits[3];
const linked = (n: number, k: 0 | 1 | 2 | 3) => {
  const back = ([1, 0, 3, 2] as const)[k];
  const out = new Set<number>();
  const e = room(n).exits[k];
  if (e !== n) out.add(e);
  for (const [m, r] of rooms) if (m !== n && r.exits[back] === n) out.add(m);
  return [...out];
};
void left; void right; void up; void down;
const rowOf = new Map<number, { row: number; dx: number }>();
const rows: number[][] = [];
for (const n of [START, ...[...rooms.keys()].sort((a, b) => a - b)]) {
  if (rowOf.has(n)) continue;
  const row: number[] = [];
  const id = rows.push(row) - 1;
  const q: [number, number][] = [[n, 0]];
  for (let next = q.shift(); next; next = q.shift()) {
    const [m, dx] = next;
    if (rowOf.has(m)) continue;
    rowOf.set(m, { row: id, dx });
    row.push(m);
    for (const l of linked(m, 0)) if (!rowOf.has(l)) q.push([l, dx - 1]);
    for (const r of linked(m, 1)) if (!rowOf.has(r)) q.push([r, dx + 1]);
  }
}
const at = new Map<number, [number, number]>();
const taken = new Map<string, number>();
const rowAt = (m: number) => { const r = rowOf.get(m); if (!r) throw new Error(`room ${m} in no row`); return r; };
const placed = (n: number) => { const p = at.get(n); if (!p) throw new Error(`room ${n} not placed`); return p; };
const fits = (row: number[], x: number, y: number) => row.every((m) => !taken.has(`${x + rowAt(m).dx},${y}`));
const putRow = (row: number[], x: number, y: number) => {
  for (const m of row) {
    let p: [number, number] = [x + rowAt(m).dx, y];
    if (taken.has(`${p[0]},${p[1]}`)) p = free(p[0], p[1]);
    at.set(m, p); taken.set(`${p[0]},${p[1]}`, m);
  }
};
const free = (x: number, y: number): [number, number] => {
  for (let d = 0; d < 20; d++) for (let dy = -d; dy <= d; dy++) for (let dx = -d; dx <= d; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== d) continue;
    if (!taken.has(`${x + dx},${y + dy}`)) return [x + dx, y + dy];
  }
  throw new Error('no room on the map');
};
const placedRows = new Set<number>();
const rowQueue: number[] = [rowAt(START).row];
putRow(rows[rowQueue[0]], 0, 0);
placedRows.add(rowQueue[0]);
const placeFrom = (r: number) => {
  for (const n of rows[r]) for (const [k, dy] of [[2, -1], [3, 1]] as const) for (const m of linked(n, k)) {
    const target = rowAt(m).row;
    if (placedRows.has(target)) continue;
    const [nx, ny] = placed(n);
    const x = nx - rowAt(m).dx;
    let y = ny + dy;
    for (let tries = 0; tries < 12 && !fits(rows[target], x, y); tries++) y += dy;
    putRow(rows[target], x, y);
    placedRows.add(target);
    rowQueue.push(target);
  }
};
for (let i = 0; i < rowQueue.length; i++) placeFrom(rowQueue[i]);
// rows reached only by the game sending Willy there: below the rest
for (let r = 0; r < rows.length; r++) {
  if (placedRows.has(r)) continue;
  const bottom = Math.max(...[...at.values()].map(([, y]) => y)) + 1;
  putRow(rows[r], 0, bottom);
  placedRows.add(r);
  rowQueue.push(r);
  for (let i = rowQueue.length - 1; i < rowQueue.length; i++) placeFrom(rowQueue[i]);
}
const xs = [...at.values()].map(([x]) => x), ys = [...at.values()].map(([, y]) => y);
const x0 = Math.min(...xs), y0 = Math.min(...ys);
const lines = [...rooms].sort(([a], [b]) => a - b).map(([n, r]) => {
  const [x, y] = placed(n);
  return `  ${n}: { name: ${JSON.stringify(r.name)}, x: ${x - x0}, y: ${y - y0}, exits: [${r.exits.join(', ')}] },`;
});
const out = `// Generated by games/jsw2/re/mansion.ts from the game's own room data: do not edit by hand.
/** The mansion: each room's name, place on the map grid, and exits (left, right, up, down; itself where there's none). */
export const MANSION: Record<number, { name: string; x: number; y: number; exits: [number, number, number, number] }> = {
${lines.join('\n')}
};
export const MANSION_SIZE = { w: ${Math.max(...xs) - x0 + 1}, h: ${Math.max(...ys) - y0 + 1} };
`;
fs.writeFileSync(new URL('../src/mansion.ts', import.meta.url), out);
console.log(`${rooms.size} rooms, map ${Math.max(...xs) - x0 + 1}×${Math.max(...ys) - y0 + 1}`);
