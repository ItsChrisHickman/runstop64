/**
 * The game's logic against the original's, frame of logic by frame of logic: Tal (and the
 * armour) moving, bumping walls, ceilings and floors, in the original (its 6502 code on c64kit's
 * C64 model) and the port, each frame's logic fed the joystick the original's read.
 *
 * lockstep.ts compares the two frame by frame as they're shown, which also measures timing: the
 * original's frame of logic often ends in the next frame, and a room takes it 14-17 frames to
 * draw, which the port matches only to within a frame or two, so after a room change the same
 * joystick reaches the two at different moments and they part (in the armour, at 3 pixels a
 * frame, by tens of pixels: it can look like one went through a wall). This check takes timing
 * out: the original's logic frames are numbered (from its $FA interrupt's work, $AF45-$AF63) with
 * the joystick each one read, and the port's logic frames get the same, in turn. Then the hero's
 * place, direction, animation and speeds must be the same after every frame of logic.
 *
 *   nice -n 15 node tools/test.mjs games/antiriad/test/logic.ts            (the checks; each room one of its two plans, two of the wall plans left to `all`)
 *   nice -n 15 node tools/test.mjs games/antiriad/test/logic.ts all        (the checks, both plans in every room: the slow set)
 *   nice -n 15 node tools/test.mjs games/antiriad/test/logic.ts armour "U:40,R:300,L:300" [room]
 *
 * Plans: joystick:frames (U D L R F, - for nothing), or rand:frames:seed. A room (hex) puts the
 * hero there first (in both, the original's own room drawing, $852C, at four places in turn).
 */
import fs from 'node:fs';
import { C64Machine, unpackState } from 'c64kit';
import { Game } from '../src/game';
import { V } from '../src/vars';

const STATES: Record<string, string> = { foot: 'games/antiriad/test/original.state', armour: 'games/antiriad/test/armour.state' };
const load = (state: string) => {
  const m = new C64Machine();
  m.loadState(unpackState(new Uint8Array(fs.readFileSync(STATES[state]))));
  m.collisionsPerLine = true;
  return m;
};
const stick = (j: string) => 0x1f & ~((j.includes('U') ? 1 : 0) | (j.includes('D') ? 2 : 0) | (j.includes('L') ? 4 : 0) | (j.includes('R') ? 8 : 0) | (j.includes('F') ? 16 : 0));
function steps(plan: string) {
  if (!plan.startsWith('rand')) return plan.split(',').filter(Boolean).map((s) => { const [j, n] = s.split(':'); return { j: j === '-' ? '' : j, n: Number(n) }; });
  const [, n, seed] = plan.split(':').map(Number);
  let r = seed || 1;
  const rnd = () => { r = (r * 1103515245 + 12345) & 0x7fffffff; return r / 0x7fffffff; };
  const J = ['U', 'UL', 'UR', 'L', 'R', 'D', 'DL', 'DR', 'F', 'LF', 'RF', 'UL', 'UR', ''];
  const out: { j: string; n: number }[] = [];
  for (let t = 0; t < n;) { const k = 10 + Math.floor(rnd() * 80); out.push({ j: J[Math.floor(rnd() * J.length)], n: k }); t += k; }
  return out;
}
/** The hero's state after a frame of logic. */
const hero = (r: Uint8Array) =>
  `room ${r[V.room].toString(16)} x ${r[0x0200] + ((r[V.spriteXHigh] & 1) << 8)} y ${r[0x0201]} dir ${r[V.dir]} anim ${r[V.anim].toString(16)} speed ${r[V.speedX]},${r[V.speedY]} flying ${r[V.flySpeedX]},${r[V.flySpeedY]} jump ${r[V.jumpStep]}`;
/**
 * What hits did to him: the armour's energy and Tal's life. Hits are found by the VIC's
 * collisions as it draws, and the original's moment for them depends on how far its interrupt
 * and main loop have got (lockstep.ts allows a frame either way): once a hit lands a frame apart
 * the two can part (out of energy, the armour drops), so a run is compared up to then.
 */
const hits = (r: Uint8Array) => ({ energy: r[V.suitEnergy], life: r[V.life] });
type Hits = ReturnType<typeof hits>;
/**
 * (The energy also counts up a step a frame as the panel powers up or the recharge cell fills
 * it, in the original's $B2 interrupt, which can land inside its frame of logic: while it
 * counts up, or a step apart, isn't a hit; hits and the drain take 2 or more.)
 */
const rising = (h: Hits[], i: number) => i > 0 && (h[i].energy > h[i - 1].energy || (i > 1 && h[i - 1].energy > h[i - 2].energy));
const apart = (a: Hits[], b: Hits[], i: number) =>
  a[i].life !== b[i].life || (Math.abs(a[i].energy - b[i].energy) > 1 && !rising(a, i) && !rising(b, i));

/** Put the hero in a room at a place (the original's own drawing of it, $852C), keeping what he is. */
function place(m: C64Machine, room: number, x: number, y: number) {
  const r = m.ram, { a, x: rx, y: ry, sp, p, pc } = m.cpu;
  const keep = [V.spriteEnable, V.inSuit, V.suitEnergy, V.suitBar, V.panelOn, V.powerUp, V.powerUpCount, V.anim, V.anim + 1, V.flySpeedX, V.flySpeedY, V.dir, V.dir + 1].map((k) => [k, r[k]]);
  r[V.room] = room;
  m.cpu.p |= 4; m.call(0x852c); Object.assign(m.cpu, { a, x: rx, y: ry, sp, p, pc });
  for (const [k, v] of keep) r[k] = v;
  r[0x0200] = r[0x0202] = x & 0xff; r[V.spriteXHigh] = (r[V.spriteXHigh] & 0xfc) | (x > 0xff ? 3 : 0);
  r[0x0201] = y; r[0x0203] = (y + 0x15) & 0xff;
}

/** One run: the logic frames the same before the first that differs (or all), and that one. */
export function compare(state: string, plan: string, at?: { room: number; x: number; y: number }) {
  const o = load(state), pm = load(state);
  if (at) { place(o, at.room, at.x, at.y); place(pm, at.room, at.x, at.y); }
  const g = new Game(pm, true);
  const A: string[] = [], B: string[] = [], AH: Hits[] = [], BH: Hits[] = [], read: number[] = [];
  let busy = false;
  const step = o.cpu.step.bind(o.cpu);
  o.cpu.step = () => {
    const pc = o.cpu.pc;
    if (pc === 0xaf45) { busy = true; read.push(o.joy2); } // the frame's logic starts ($9076 next) ...
    else if (pc === 0xaf63 && busy) { busy = false; A.push(hero(o.ram)); AH.push(hits(o.ram)); } // ... and is done
    return step();
  };
  let frames = 0;
  for (const s of steps(plan)) for (let i = 0; i < s.n; i++, frames++) { o.joy1 = 0x1f; o.joy2 = stick(s.j); o.runFrame(); }
  g.beforeLogic = () => { g.m.joy2 = read[B.length] ?? 0x1f; };
  g.afterLogic = () => { B.push(hero(g.ram)); BH.push(hits(g.ram)); };
  for (let f = 0; f < frames + 60 && B.length < A.length; f++) { g.m.joy1 = 0x1f; g.tick(); }
  let n = Math.min(A.length, B.length), hit: string | null = null;
  let first = -1;
  for (let i = 0; i < n; i++) {
    if (A[i] !== B[i]) { first = i; break; }
    if (apart(AH, BH, i)) { n = i; hit = `energy ${AH[i].energy}, life ${AH[i].life} / energy ${BH[i].energy}, life ${BH[i].life}`; break; }
  }
  return { frames: n, hit, same: first < 0 ? n : first, first: first < 0 ? null : { at: first, original: A[first], port: B[first], before: A[first - 1] ?? '' } };
}

const everything = process.argv[2] === 'all';
const args = process.argv.slice(2).filter((a) => a !== 'all');

// Scripted: flying into walls left and right (and the plans a playtest's "through a wall" report
// was checked with), on foot, and in rooms of every level.
const CASES: { state: string; plan: string; room?: number; x?: number; y?: number; slow?: boolean }[] = [
  { state: 'armour', plan: 'U:40,R:300,L:300' },
  { state: 'armour', plan: 'U:20,RU:200,LU:200,R:200' },
  { state: 'armour', plan: 'U:60,R:120,-:30,R:200,L:400', slow: true },
  { state: 'armour', plan: 'U:30,L:250,R:250,L:250', slow: true },
  { state: 'armour', plan: 'U:25,LU:120,RD:120,LD:120,RU:120,L:150' },
  { state: 'foot', plan: 'L:300,R:300,LF:60,RF:60,U:40' },
  { state: 'foot', plan: 'R:200,UR:60,L:200,UL:60' },
  ...[0x0c, 0x15, 0x20, 0x2b, 0x30, 0x39].flatMap((room, i) => [
    { state: 'armour', plan: 'U:20,L:200,R:200,UL:80,DR:80', room, x: 160, y: 0x60 },
    { state: 'armour', plan: 'U:20,R:200,L:200,UR:80,DL:80', room, x: 240, y: 0x40 },
  ].filter((_, k) => everything || k === i % 2)), // (the fast set: each room one of its two plans, alternating; `all` plays both)
];

const [stateArg, planArg, roomArg] = args;
if (stateArg) {
  // one plan, from a state (in a room, at four places)
  const ats = roomArg ? [[80, 0x50], [160, 0x60], [240, 0x40], [300, 0x70]].map(([x, y]) => ({ room: parseInt(roomArg, 16), x, y })) : [undefined];
  for (const at of ats) {
    const r = compare(stateArg, planArg ?? 'R:100', at);
    console.log(`${at ? `room ${at.room.toString(16)} at ${at.x},${at.y}: ` : ''}${r.same}/${r.frames} frames of logic the same${r.hit ? ` (to a hit landing a frame apart: ${r.hit})` : ''}${r.first ? `; then\n  original: ${r.first.original}\n  port:     ${r.first.port}\n  (before:  ${r.first.before})` : ''}`);
  }
} else {
  let failures = 0, total = 0, same = 0;
  for (const c of CASES.filter((k) => everything || !k.slow)) {
    const r = compare(c.state, c.plan, c.room === undefined ? undefined : { room: c.room, x: c.x ?? 160, y: c.y ?? 0x60 });
    total += r.frames; same += r.same;
    const ok = !r.first && r.frames > 150;
    if (!ok) failures++;
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${c.state}${c.room === undefined ? '' : ` in room ${c.room.toString(16)}`} ${c.plan}: ${r.same}/${r.frames} frames of logic the same${r.hit ? ` (to a hit landing a frame apart: ${r.hit})` : ''}${r.first ? ` (then original ${r.first.original} / port ${r.first.port})` : ''}`);
  }
  console.log(`${same}/${total} frames of logic the same; ${failures ? `${failures} failed` : 'all passed'}`);
  process.exit(failures ? 1 : 0);
}
