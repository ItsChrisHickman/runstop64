/**
 * Study: every picture Pendragon (sprite 2) takes in play, in the four translated Pendragon games, with what he is doing when it shows.
 * Plays the recorded routes (re/routes.json) from the title, then random bursts (joystick, fire, the game's actions) from states along
 * them, with energy kept up (and some bursts with it low, for deaths). Writes <out>/<game>.json (one entry per distinct picture: pointer,
 * colours, multicolour, expand, 63 bytes, how often, the movement states it showed in) and <out>/<game>/room-<n>.bin (the first frame
 * each picture showed: 320x200 colour indexes without sprite 2, then x, y, ptr as 16-bit values) for the preview sheets.
 *
 *   nice -n 15 node tools/test.mjs games/shared/pendragon/study/collect.ts <game> <out> [bursts] [frames per burst]
 */
import fs from 'node:fs';
import { unpackState, type MachineState } from '../../../../packages/c64kit/src/c64/machine';
import { renderPixels } from '../../../../tools/probe/render';
import { NativeHost } from '../../native/host';
import { GAMES, setJoy } from '../../native/test/games';
import { readRoutes } from '../../test/data';
import { must } from '../../test/must';
import { entombedStates } from './states';

/** Where a game keeps what he is doing: the way he faces, flags worth telling poses apart by, and how to keep him alive or put him in danger. */
interface Where {
  facing: number;
  flags: number[];
  keep(ram: Uint8Array): void;
  low(ram: Uint8Array): void;
  arm(ram: Uint8Array, rnd: () => number): void;
}
const WHERE: Record<string, Where> = {
  karnath: {
    facing: 0x25c1, flags: [0x3216, 0x3231, 0x3232, 0x3234],
    keep: (r) => { r[0x6ffe] = 100; }, low: (r) => { r[0x6ffe] = 2; },
    arm: (r, rnd) => { if (rnd() < 0.05) r[0x322c] = 1 + Math.floor(rnd() * 10); },
  },
  entombed: {
    facing: 0x2365, flags: [0x20cf, 0x3227, 0x3230, 0x3231, 0x20cb, 0x17dd],
    keep: (r) => { r[0x37f6] = 0; r[0x323e] = 0; r[0x323d] = 0; r[0x322e] = 1; r[0x322f] = 1; }, low: (r) => { r[0x323d] = 4; },
    arm: (r, rnd) => { if (rnd() < 0.05) r[0x3215] = 1 + Math.floor(rnd() * 3); },
  },
  blackwyche: {
    facing: 0x216f, flags: [0x1ed0, 0x3427, 0x1ec7, 0x342a],
    keep: (r) => { r[0x9d77] = 100; r[0x342b] = 1; }, low: (r) => { r[0x9d77] = 2; },
    arm: (r, rnd) => { if (rnd() < 0.05) r[0x3415] = rnd() < 0.7 ? 2 : 1; },
  },
  dragonskulle: {
    facing: 0x2292, flags: [0x1fef, 0x3425, 0x3428, 0x229c],
    keep: (r) => { r[0x1248] = 0; r[0x123e] = 0x14; r[0x3432] = 0; r[0x342f] = 1; r[0x3430] = 0; }, low: (r) => { r[0x1248] = 6; },
    arm: (r, rnd) => { if (rnd() < 0.05) { const a = [4, 4, 3, 3, 0, 1][Math.floor(rnd() * 6)]; if (a > 1 || r[0x342f + a]) r[0x12eb] = a; } },
  },
};

interface Pose {
  ptr: number; multicolour: boolean; expandX: boolean; expandY: boolean; colours: Map<string, number>; ptrs: Set<number>; sources: number[];
  data: string; count: number; first: number; contexts: Map<string, number>; room: number;
}

const [gameId = '', outDir = '', burstsArg = '40', framesArg = '500'] = process.argv.slice(2);
const game = must(GAMES[gameId], 'game');
const where = must(WHERE[gameId], 'where');
fs.mkdirSync(`${outDir}/${gameId}`, { recursive: true });
const title = unpackState(new Uint8Array(fs.readFileSync(game.title)));
const poses = new Map<string, Pose>();
/** Where else in memory the sprite's 63 bytes lie (the table the game copies it from into its sprite block), up to four places. */
function findSource(ram: Uint8Array, data: Uint8Array): number[] {
  const out: number[] = [];
  const first = data[0], at = ram.length - 63;
  for (let a = 0; a < at && out.length < 4; a++) {
    if (ram[a] !== first || (a >= 0x0880 && a < 0x08c0)) continue;
    let i = 1;
    while (i < 63 && ram[a + i] === data[i]) i++;
    if (i === 63) out.push(a);
  }
  return out;
}
let frameNo = 0, rooms = 0;
/** What he was doing (the way he faces, the game's flags that are set, moving or not) and which pictures showed then (by the picture's number here: `room`). */
const roles = new Map<string, Map<number, number>>();
let last: { x: number; y: number } | null = null;

function observe(g: NativeHost) {
  frameNo++;
  const m = g.m, s = m.capture.sprites.find((x) => x.n === 2);
  if (!s) { last = null; return; }
  const screen = m.bank + ((m.vic[0x18] >> 4) & 15) * 0x400;
  const ptr = m.ram[screen + 0x3f8 + 2];
  const data = Buffer.from(s.data.subarray(0, 63)).toString('hex');
  const key = `${s.multicolour ? 1 : 0}/${s.expandX ? 1 : 0}${s.expandY ? 1 : 0}/${data}`;
  const dx = last ? Math.sign(s.x - last.x) : 0, dy = last ? Math.sign(s.y - last.y) : 0;
  last = { x: s.x, y: s.y };
  const ctx = `face${m.ram[where.facing]} ${where.flags.map((a) => m.ram[a].toString(16)).join('.')} mv${dx},${dy}${m.capture.sprites.some((x) => x.n === 3) ? ' s3' : ''}`;
  let p = poses.get(key);
  if (!p) {
    p = { ptr, ptrs: new Set(), sources: findSource(m.ram, s.data), colours: new Map(), multicolour: s.multicolour, expandX: s.expandX, expandY: s.expandY, data, count: 0, first: frameNo, contexts: new Map(), room: rooms++ };
    poses.set(key, p);
    // the room as it shows, without him
    const all = m.capture.sprites.slice();
    m.capture.sprites.splice(0, m.capture.sprites.length, ...all.filter((x) => x.n !== 2));
    const px = renderPixels(m);
    m.capture.sprites.splice(0, m.capture.sprites.length, ...all);
    const out = new Uint8Array(64000 + 6);
    out.set(px, 0);
    const v = new DataView(out.buffer);
    v.setUint16(64000, s.x); v.setUint16(64002, s.y); v.setUint16(64004, ptr);
    fs.writeFileSync(`${outDir}/${gameId}/room-${p.room}.bin`, out);
  }
  p.count++;
  const role = `face${m.ram[where.facing]} ${where.flags.map((a) => (m.ram[a] ? `$${a.toString(16)}=${m.ram[a]}` : '')).filter(Boolean).join(' ')} ${dx || dy ? 'moving' : 'still'}`.replace('  ', ' ');
  const seen = roles.get(role) ?? new Map<number, number>();
  seen.set(p.room, (seen.get(p.room) ?? 0) + 1);
  roles.set(role, seen);
  p.ptrs.add(ptr);
  const col = `${s.colour}/${s.mc1}/${s.mc2}`;
  p.colours.set(col, (p.colours.get(col) ?? 0) + 1);
  p.contexts.set(ctx, (p.contexts.get(ctx) ?? 0) + 1);
}

const hasRoutes = fs.existsSync(`games/${gameId}/re/routes.json`);
const routes = hasRoutes ? readRoutes(`games/${gameId}/re/routes.json`) : [];
const states: MachineState[] = gameId === 'entombed' ? entombedStates() : [];
const total = routes.reduce((n, r) => n + r.filter((_, i) => i % 2).reduce((a, b) => a + b, 0), 0);
const every = Math.max(200, Math.floor(total / Number(burstsArg)));
const t0 = performance.now();
for (const route of routes) {
  const g = new NativeHost(game.port, title);
  let f = 0;
  for (let i = 0; i < route.length; i += 2) for (let k = 0; k < route[i + 1]; k++) {
    setJoy(g.m, game, route[i] & 0x1f); g.m.keys = route[i] & 32 ? [[1, 2]] : [];
    g.tick(); where.keep(g.m.ram); observe(g); f++;
    if (f > 200 && f % every === 0) { const s = g.save(); if (s) states.push(s); }
  }
}
console.log(`routes: ${total} frames, ${poses.size} pictures, ${states.length} states, ${((performance.now() - t0) / 1000).toFixed(0)}s`);
let seed = 7;
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
states.forEach((st, si) => {
  const g = NativeHost.resume(game.port, st);
  const mortal = si % 4 === 3;
  if (mortal) where.low(g.m.ram);
  let joy = 0x1f;
  last = null;
  for (let f = 0; f < Number(framesArg); f++) {
    if (f % 14 === 0) { joy = 0x1f & ~[0, 1, 2, 4, 8, 5, 9, 6, 10][Math.floor(rnd() * 9)]; if (rnd() < 0.5) joy &= ~16; }
    where.arm(g.m.ram, rnd);
    setJoy(g.m, game, joy); g.m.keys = [];
    g.tick(); if (!mortal) where.keep(g.m.ram);
    observe(g);
  }
});
const list = [...poses.values()].sort((a, b) => a.room - b.room).map((p) => ({
  ptrs: [...p.ptrs], sources: p.sources, multicolour: p.multicolour, expandX: p.expandX, expandY: p.expandY,
  colours: [...p.colours].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([c, n]) => `${c} x${n}`),
  data: p.data, count: p.count, room: p.room,
  contexts: [...p.contexts].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c, n]) => `${c} x${n}`),
}));
fs.writeFileSync(`${outDir}/${gameId}.json`, JSON.stringify(list, null, 1));
fs.writeFileSync(`${outDir}/${gameId}.roles.json`, JSON.stringify([...roles].map(([role, m]) => [role, [...m]]), null, 0));
console.log(`${gameId}: ${list.length} pictures in ${frameNo} frames, ${((performance.now() - t0) / 1000).toFixed(0)}s`);
