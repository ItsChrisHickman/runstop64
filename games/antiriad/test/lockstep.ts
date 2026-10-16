/**
 * The original (its 6502 code on c64kit's C64 model) and the port, from the same moment, with
 * the same joystick, frame by frame: their pictures (every pixel of the frame, sprites and
 * all), and their memory where the game keeps its state.
 *
 *   node tools/test.mjs games/antiriad/test/lockstep.ts games/antiriad/test/original.state "R:100,-:20,UR:30,..."
 *   node tools/test.mjs games/antiriad/test/lockstep.ts games/antiriad/test/original.state rand:3000:7          (a random player, seed 7)
 *
 * Plans: joystick:frames, joystick = any of U D L R F, or - for nothing.
 *
 * Timing: while a room is drawn the original runs no logic (its interrupt skips the frame) and so has
 * no memory to compare: the frames the port also runs no logic in are left out of its list too, or
 * the two lists would part by the frames a room took, and every frame after the first room change
 * would be compared with the wrong one. The original's frame of logic (in its $FA interrupt) takes as long as it takes,
 * often past the frame's end; the port's takes no time. So memory is compared where both have
 * done a frame's logic (the original's memory as its main loop takes over again), allowing a
 * frame either way; and a room takes the original 5-14 frames to draw, which the port matches
 * to within a frame, so after a room change the two can be a frame apart from then on: the
 * check then follows the original's pictures to see the port's are the same, a frame later
 * or earlier. The rooms' animated characters (lights, water) step whenever the original's main
 * loop gets round to them after their timer runs out, which wanders by a frame or two (so do the
 * panel's energy bars, also the main loop's): sprites and the screen's characters are counted
 * apart from whole pictures.
 */
import fs from 'node:fs';
import crypto from 'node:crypto';
import { C64Machine, unpackState } from 'c64kit';
import { renderPixels } from '../../../tools/probe/render';
import { Game } from '../src/game';

const [stateFile, plan = 'R:100'] = process.argv.slice(2);
const load = () => { const m = new C64Machine(); m.loadState(unpackState(new Uint8Array(fs.readFileSync(stateFile)))); m.collisionsPerLine = true; return m; };
const o = load();
const g = new Game(load(), true);
const nm = g.m;

function steps(p: string) {
  if (!p.startsWith('rand')) return p.split(',').filter(Boolean).map((s) => { const [j, n] = s.split(':'); return { j: j === '-' ? '' : j, n: Number(n) }; });
  const [, n, seed] = p.split(':').map(Number);
  let r = seed || 1;
  const rnd = () => { r = (r * 1103515245 + 12345) & 0x7fffffff; return r / 0x7fffffff; };
  const J = ['', 'L', 'R', 'U', 'D', 'F', 'LF', 'RF', 'UL', 'UR', 'R', 'L', 'R', 'L'];
  const out: { j: string; n: number }[] = [];
  for (let t = 0; t < n;) { const k = 10 + Math.floor(rnd() * 80); out.push({ j: J[Math.floor(rnd() * J.length)], n: k }); t += k; }
  return out;
}
const joy = (j: string) => 0x1f & ~((j.includes('U') ? 1 : 0) | (j.includes('D') ? 2 : 0) | (j.includes('L') ? 4 : 0) | (j.includes('R') ? 8 : 0) | (j.includes('F') ? 16 : 0));

// The game's state (not the temporaries its routines use, nor the music driver's own, which runs on its timers).
const SKIP = new Set<number>();
const skip = (a: number, b: number) => { for (let i = a; i <= b; i++) SKIP.add(i); };
skip(0x00, 0x37); skip(0x3a, 0x3f); skip(0x42, 0x45); SKIP.add(0x53); skip(0x57, 0x5a); skip(0x5c, 0x65); skip(0x71, 0x73);
skip(0x83, 0x86); skip(0x94, 0x9f); skip(0xa1, 0xa6); skip(0xa8, 0xaa); SKIP.add(0xab); SKIP.add(0xad); skip(0xb2, 0xb4); skip(0x100, 0x1ff);
// $6f is the collisions the interrupt latched while its handler runs ($A44C, taking the original's time): the original's snapshots are of the main loop, never inside it
SKIP.add(0x6f);
skip(0x022f, 0x0247); skip(0x0310, 0x0360);
const REGIONS: [number, number][] = [[0, 0xff], [0x0200, 0x0aff], [0x4000, 0x7fff], [0xc000, 0xcfff]];

// the original's memory once each frame's logic is done (its main loop going again)
const snaps: Uint8Array[] = [];
let phase = 0;
const step = o.cpu.step.bind(o.cpu);
o.cpu.step = () => {
  const pc = o.cpu.pc;
  if (pc === 0xaf63 && o.ram[0xab] === 0x80) phase = 1;
  else if (pc === 0x8053 && phase && ++phase === 2) { snaps.push(o.ram.slice()); phase = 0; }
  return step();
};

const hash = (m: C64Machine) => crypto.createHash('md5').update(renderPixels(m)).digest('hex');
/** What the VIC drew this frame: every sprite (place, shape, colours), and the text rows (characters, colours, registers). */
const spritesOf = (m: C64Machine) => crypto.createHash('md5').update(m.capture.sprites.map((t) => `${t.n}@${t.x},${t.y}c${t.colour}m${+t.multicolour}${t.mc1},${t.mc2}x${+t.expandX}${+t.expandY}b${+t.behind}:${Buffer.from(t.data).toString('hex')}`).join(' ')).digest('hex');
const rowsOf = (m: C64Machine) => crypto.createHash('md5').update(m.capture.rows.map((r) => (r ? `${Buffer.from(r.codes).toString('hex')}${Buffer.from(r.colours).toString('hex')}${r.d011},${r.d016},${r.d018},${r.bank},${r.bg}` : '-')).join('|')).digest('hex');
const seq: Record<'o' | 'n', { pic: string[]; spr: string[]; rows: string[] }> = { o: { pic: [], spr: [], rows: [] }, n: { pic: [], spr: [], rows: [] } };
const natRam: Uint8Array[] = [];
const sprDump: Record<'o' | 'n', string[]> = { o: [], n: [] };
let frames = 0;
// (the original runs a frame of logic only when it isn't drawing a room, and so takes a memory snapshot only then: the port's are taken in the same frames)
let logicRan = false;
g.afterLogic = () => { logicRan = true; };
const startRoom = o.ram[0x5b];
/** The video frame the first room change shows in (either side): the pictures are compared up to it (they part there: below). */
let firstRoomShown = -1, lastRooms = [-1, -1];
// (ONE_ROOM=1: stop at the first room change, before the two can be a frame apart)
run: for (const s of steps(plan)) for (let i = 0; i < s.n; i++, frames++) {
  if (process.env.ONE_ROOM && (o.ram[0x5b] !== startRoom || o.ram[0x6b] & 0x80 || nm.ram[0x6b] & 0x80)) break run;
  o.joy2 = nm.joy2 = joy(s.j); o.joy1 = nm.joy1 = 0x1f;
  logicRan = false;
  o.runFrame(); g.tick();
  for (const [k, m] of [['o', o], ['n', nm]] as const) { seq[k].pic.push(hash(m)); seq[k].spr.push(spritesOf(m)); seq[k].rows.push(rowsOf(m)); if (process.env.WHY) sprDump[k].push(m.capture.sprites.map((t) => `${t.n}@${t.x},${t.y}c${t.colour}m${+t.multicolour}${t.mc1},${t.mc2}x${+t.expandX}${+t.expandY}b${+t.behind}:${crypto.createHash('md5').update(t.data).digest('hex').slice(0, 4)}`).join(' ')); }
  if (logicRan) natRam.push(nm.ram.slice());
  if (firstRoomShown < 0 && seq.n.rows.length > 1 && (o.ram[0x5b] !== lastRooms[0] || nm.ram[0x5b] !== lastRooms[1])) firstRoomShown = seq.n.rows.length - 1;
  lastRooms = [o.ram[0x5b], nm.ram[0x5b]];
}

/** Of the frames, how many the port's matches the original's exactly, or the original's a frame before or after. */
function tally(what: 'pic' | 'spr' | 'rows', upTo: number) {
  const a = seq.o[what], b = seq.n[what].slice(0, upTo);
  let same = 0, near = 0, first = -1;
  for (let i = 0; i < b.length; i++) {
    if (b[i] === a[i]) same++;
    else if (b[i] === a[i - 1] || b[i] === a[i + 1]) near++;
    else if (first < 0) first = i;
  }
  return { same, near, differ: b.length - same - near, first };
}
const fmt = (t: ReturnType<typeof tally>) => `${t.same} same, ${t.near} a frame apart, ${t.differ} different${t.first >= 0 ? ` (first at ${t.first})` : ''}`;

// memory, where both have done the frame's logic (a frame either way; the animated characters' timers, which the main loop
// reloads when it gets round to them, up to three)
const WANDER = new Set<number>([0x91]);
for (let i = 0x248; i <= 0x24f; i++) WANDER.add(i);
const grace = (x: number) => (WANDER.has(x) ? 3 : 1);
const matches = (k: number, x: number) => {
  const v = natRam[k][x];
  if (v === natRam[k - 1][x]) return true;
  // (a timer at 0 is waiting for the main loop to reload it, which one of the two gets round to a frame before the other)
  if (v === 0 && WANDER.has(x)) return true;
  for (let d = -grace(x); d <= grace(x); d++) if (snaps[k + d] && (snaps[k + d][x] === v || (WANDER.has(x) && snaps[k + d][x] === 0))) return true;
  return false;
};
let memFrames = 0, parted = -1, roomChanged = -1;
const memFirst: string[] = [];
const upTo = Math.min(snaps.length, natRam.length) - 3;
for (let k = 3; k < upTo; k++) {
  if (roomChanged < 0 && (snaps[k][0x5b] !== snaps[k - 1][0x5b] || natRam[k][0x5b] !== natRam[k - 1][0x5b])) roomChanged = k;
  const bad: string[] = [];
  for (const [lo, hi] of REGIONS) for (let x = lo; x <= hi; x++) if (!SKIP.has(x) && !matches(k, x)) bad.push(`$${x.toString(16)}`);
  if (bad.length) { parted = k; memFirst.push(`frame ${k}: ${bad.slice(0, 8).join(' ')}`); break; }
  memFrames++;
}
const total = upTo - 3;
// Once the two part, nothing after is a comparison of like with like: a room takes them different frames to draw (the original's
// logic a frame later than the port's, and the joystick, read every 7th frame of logic, then lands a different frame of the game
// on), so they are somewhere else soon. Parting before any room change is a real difference.
const early = parted >= 0 && (roomChanged < 0 || parted < roomChanged);
// the pictures likewise, up to the room change when they part at it
const shown = parted >= 0 && !early && firstRoomShown >= 0 ? firstRoomShown : seq.n.pic.length;
const pic = tally('pic', shown), spr = tally('spr', shown), rows = tally('rows', shown);
if (process.env.WHY && spr.first >= 0) for (let i = Math.max(0, spr.first - 4); i < spr.first + 4; i++) console.log(i, '\n', sprDump.o[i].slice(0, 80), '\n', sprDump.n[i].slice(0, 80));
console.log(`${frames} frames (pictures compared: ${shown}). Sprites: ${fmt(spr)}. Characters on screen: ${fmt(rows)}. Whole pictures: ${fmt(pic)}.`);
console.log(`Memory: ${memFrames}/${total} frames the same${parted >= 0 ? `, then they part (${memFirst[0]}; the first room change at frame ${roomChanged}${early ? ': BEFORE it, a real difference' : ': the room change'}); the ${total - memFrames} after it aren't compared` : ''}. Room ${o.ram[0x5b].toString(16)}/${nm.ram[0x5b].toString(16)}, Tal at ${o.ram[0x200]},${o.ram[0x201]} / ${nm.ram[0x200]},${nm.ram[0x201]}.`);
// (a few frames apart are expected: see the timing note above)
process.exit(early || spr.differ > shown * 0.03 || rows.differ > shown * 0.03 ? 1 : 0);
