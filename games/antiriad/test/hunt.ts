/**
 * Go-Explore for a stuck Tal: play (ENHANCED's two buttons, or ORIGINAL=1), with travel by the map
 * and back-to-room-start/continue (the autosave packed, unpacked and repaired as main.ts does)
 * mixed in, archiving new places and starting again from rarely visited ones. Flags:
 *   BAD      a state the game never makes itself (in the armour with Tal's jump on, or not in an
 *            armour frame, or fading; on foot without his walking speed), with the state before it
 *   TRAPPED  in the armour with energy, no plan (holds, a hold then another, a turn let go and a
 *            step out) gets out of it, out of the room or 24 pixels across
 * ROOMS=2,8,... also starts from the armour put (by travel) in those rooms.
 * (It found travel leaving the armour standing in the air: games/antiriad/test/travel.ts.)
 *
 *   nice -n 19 node tools/test.mjs games/antiriad/test/hunt.ts [iterations] [seed] [outDir]
 */
import fs from 'node:fs';
import { C64Machine, packState, unpackState, type MachineState } from 'c64kit';
import type { AntiriadFound } from '../src/map';
import { Game } from '../src/game';
import { repairSave } from '../src/main';
import { antiriadMap, entriesOf } from '../src/map';
import { V } from '../src/vars';

const TWO = process.env.ORIGINAL !== '1';
const iters = Number(process.argv[2] ?? 300);
let seed = Number(process.argv[3] ?? 1) || 1;
const out = process.argv[4] ?? '/tmp/antiriad-hunt';
fs.mkdirSync(out, { recursive: true });
const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
const pick = <T>(a: T[]) => a[Math.floor(rnd() * a.length)];

interface Snap { s: MachineState; found: AntiriadFound; auto: MachineState | null; jump: number; how: string }
const clone = (f: AntiriadFound): AntiriadFound => structuredClone(f);

function load(s: MachineState, repair: boolean) {
  const m = new C64Machine();
  m.loadState(s);
  const g = new Game(m, true);
  if (repair) repairSave(g);
  g.enhanced = TWO;
  return g;
}
const quiet = (g: Game) => g.playing && !(g.ram[V.roomChange] & 0x80) && !g.travelTo;
const take = (g: Game) => { g.flushShapes(); return g.m.saveState(); };

const stick = (s: string) => 0x1f & ~((s.includes('U') ? 1 : 0) | (s.includes('D') ? 2 : 0) | (s.includes('L') ? 4 : 0) | (s.includes('R') ? 8 : 0) | (s.includes('F') ? 16 : 0));
/** One frame with input s (J: jump held; first: it was just pressed). */
function frame(g: Game, s: string, first: boolean) {
  g.m.joy1 = 0x1f; g.m.joy2 = stick(s);
  g.jumpButton = s.includes('J') ? 1 | (g.jumpButton & 2) | (first ? 2 : 0) : g.jumpButton & 2;
  g.tick();
}

const cellOf = (g: Game) => {
  const r = g.ram;
  return [r[V.room], r[V.inSuit] >> 7, r[V.anim].toString(16), r[V.flySpeedX], r[V.flySpeedY], r[V.dir] & 15, r[V.jumping] >> 7, r[V.suitEnergy] ? 1 : 0, r[0x0201] >> 4, (r[0x0200] + ((r[V.spriteXHigh] & 1) << 8)) >> 5].join(',');
};
const desc = (r: Uint8Array) =>
  `room ${r[V.room].toString(16)} x ${r[0x0200] + ((r[V.spriteXHigh] & 1) << 8)} y ${r[0x0201]} inSuit ${r[V.inSuit].toString(16)} anim ${r[V.anim].toString(16)} dir ${r[V.dir]} speed ${r[V.speedX]},${r[V.speedY]} fly ${r[V.flySpeedX]},${r[V.flySpeedY]} jumping ${r[V.jumping].toString(16)} jumpStep ${r[V.jumpStep]} energy ${r[V.suitEnergy]} dying ${r[V.dying].toString(16)} appearing ${r[V.appearing].toString(16)} 93 ${r[0x93]} b1 ${r[0xb1]} gameOver ${r[V.gameOver]}`;

/**
 * Trapped: no plan gets Tal out of the armour, out of the room, or 24 pixels across: holds, one hold
 * then another, and a turn held k frames, let go (to land, upright), then a step out either way.
 */
type Plan = [string, number][];
const PLANS: Plan[] = [
  ...['L', 'R', 'U', 'D', 'J', 'F', 'UL', 'UR', 'DL', 'DR', 'LJ', 'RJ'].map((i): Plan => [[i, 450]]),
  ...['L', 'R', 'U', 'D', 'J'].flatMap((a) => ['L', 'R', 'U', 'D', 'J'].filter((b) => b !== a).map((b): Plan => [[a, 150], [b, 300]])),
  ...['L', 'R', 'UL', 'UR', 'DL', 'DR'].flatMap((a) => [7, 14, 21, 28, 35, 42].flatMap((k) => ['L', 'R'].map((b): Plan => [[a, k], ['', 120], [b, 120]]))),
];
const xOf = (r: Uint8Array) => r[0x0200] + ((r[V.spriteXHigh] & 1) << 8);
function trapped(s: MachineState, jump: number) {
  for (const plan of PLANS) {
    const g = load(s, false);
    g.jumpButton = jump;
    const room = g.ram[V.room], x0 = xOf(g.ram);
    for (const [i, n] of plan) {
      for (let f = 0; f < n; f++) {
        frame(g, i, f === 0);
        const r = g.ram;
        if (!g.playing || !(r[V.inSuit] & 0x80) || r[V.room] !== room || Math.abs(xOf(r) - x0) >= 24 || !r[V.suitEnergy]) return null; // (out of energy: the original's own trap)
      }
    }
  }
  return 'trapped';
}

/** What the game itself never makes: in the armour, a jump or an animation not the armour's; on foot, a walking speed but 2. */
const SUIT_ANIMS = [0xac, 0xae, 0xb0, 0xb2, 0xb4, 0xb6];
const flagged = new Set<string>();
function invariant(g: Game) {
  const r = g.ram;
  if (!g.playing || r[V.roomChange] & 0x80) return null;
  if (r[V.inSuit] & 0x80) {
    if (r[V.jumping] & 0x80) return `suit-jumping: jumping ${r[V.jumping].toString(16)}`;
    if (!SUIT_ANIMS.includes(r[V.anim])) return `suit-anim-${r[V.anim].toString(16)}: anim`;
    if ((r[V.dying] | r[V.appearing]) & 0x80) return 'suit-fading: dying/appearing';
  } else if (r[V.speedX] !== 2 && !(r[V.dying] & 0x80)) return `foot-speed-${r[V.speedX]}: speedX`;
  return null;
}

// ---- the archive ----
const archive = new Map<string, { snap: Snap; visits: number; room: number }>();
const seeds: Snap[] = [];
for (const [file, how] of [['games/antiriad/test/armour.state', 'armour'], ['games/antiriad/test/original.state', 'foot']]) {
  const s = unpackState(new Uint8Array(fs.readFileSync(file)));
  seeds.push({ s, found: antiriadMap.found.empty(), auto: s, jump: 0, how });
}
// the armour without energy too (hits drain it; the power centre does)
{
  const g = load(seeds[0].s, false); g.ram[V.suitEnergy] = 0;
  seeds.push({ s: take(g), found: antiriadMap.found.empty(), auto: null, jump: 0, how: 'armour, no energy' });
}
// the armour placed in other rooms (as travel puts it), with and without energy
if (process.env.ROOMS) {
  for (const room of process.env.ROOMS.split(',').map((h) => parseInt(h, 16))) {
    for (const [x, y] of [[160, 0x60], [80, 0x50], [240, 0x40]]) {
      for (const energy of [0x1f]) {
        const g = load(seeds[0].s, false);
        g.travelTo = { room, x, y, high: 0 };
        for (let f = 0; f < 40; f++) frame(g, '', false);
        g.ram[V.suitEnergy] = energy;
        seeds.push({ s: take(g), found: antiriadMap.found.empty(), auto: null, jump: 0, how: `placed ${room.toString(16)} ${x},${y} energy ${energy}` });
      }
    }
  }
}
for (const sn of seeds) archive.set(`seed ${sn.how}`, { snap: sn, visits: 0, room: -1 - seeds.indexOf(sn) });

let stuckFound = 0, checks = 0, totalFrames = 0;
const started = Date.now();
const checked = new Set<string>();
for (let it = 0; it < iters && Date.now() - started < 270_000; it++) {
  // pick a room, then a cell in it (rarely visited ones first)
  const all = [...archive.values()];
  const room = pick([...new Set(all.map((c) => c.room))]);
  const cells = all.filter((c) => c.room === room);
  const weights = cells.map((c) => 1 / Math.sqrt(c.visits + 1));
  let w = rnd() * weights.reduce((a, b) => a + b, 0), k = 0;
  while (w > weights[k] && k < cells.length - 1) w -= weights[k++];
  const c = cells[k];
  c.visits++;
  let g = load(c.snap.s, false);
  g.jumpButton = c.snap.jump;
  const found = clone(c.snap.found);
  let auto = c.snap.auto, how = c.snap.how, lastRoomCount = 0, roomCount = 0;
  g.onRoom = () => { roomCount++; };
  for (let a = 0; a < 25; a++) {
    const r = rnd();
    if (r < 0.06 && quiet(g)) {
      // travel by the map to a room he can go to as he is now
      const e = entriesOf(found, !!(g.ram[V.inSuit] & 0x80)), rooms = Object.keys(e);
      if (rooms.length) { const room = pick(rooms); g.travelTo = { room: Number(room), ...e[room] }; how += ` >travel ${Number(room).toString(16)}`; }
    } else if (r < 0.10 && auto) {
      // back to the room's start / continue: the autosave through pack, unpack and the repair
      g = load(unpackState(packState(auto)), true);
      g.onRoom = () => { roomCount++; };
      lastRoomCount = roomCount;
      how += ' >resume';
    }
    const dir = pick(['', '', 'U', 'D', 'L', 'R', 'UL', 'UR', 'DL', 'DR']);
    const input = dir + (rnd() < 0.2 ? 'F' : '') + (rnd() < 0.3 ? 'J' : '');
    const n = rnd() < 0.3 ? 1 + Math.floor(rnd() * 3) : 1 + Math.floor(rnd() * 40);
    for (let f = 0; f < n; f++) {
      const before = take(g), beforeJump = g.jumpButton;
      frame(g, input, f === 0);
      totalFrames++;
      const bad = invariant(g);
      if (bad && !flagged.has(bad.split(':')[0])) {
        flagged.add(bad.split(':')[0]);
        const file = `${out}/bad-${flagged.size}.state`;
        fs.writeFileSync(file, packState(take(g)));
        fs.writeFileSync(file.replace('.state', '-before.state'), packState(before));
        if (auto) fs.writeFileSync(file.replace('.state', '-auto.state'), packState(auto));
        console.log(`  (before: jumpButton ${beforeJump})`);
        console.log(`BAD ${bad} ${file}: ${desc(g.ram)}\n  how: ${how} ${input}:${f + 1}/${n}`);
      }
      if (g.playing && !(g.ram[V.roomChange] & 0x80)) antiriadMap.observe(g, found, new Uint8Array(0));
      if (quiet(g) && roomCount !== lastRoomCount) { auto = take(g); lastRoomCount = roomCount; }
    }
    if (!quiet(g)) continue;
    const key = cellOf(g);
    if (!archive.has(key)) {
      const snap = { s: take(g), found: clone(found), auto, jump: g.jumpButton, how: `${how} ${input}:${n}` };
      archive.set(key, { snap, visits: 0, room: g.ram[V.room] });
      // a new cell in the armour: is Tal stuck here?
      const sig = [g.ram[V.room] < 0x0a ? 'rad' : 'ok', g.ram[V.inSuit] >> 7, g.ram[V.anim], g.ram[V.flySpeedX], g.ram[V.flySpeedY], g.ram[V.dir], g.ram[V.jumping] >> 7, g.ram[V.suitEnergy] ? 1 : 0].join(',');
      if (!checked.has(sig) && g.ram[V.inSuit] & 0x80 && g.ram[V.suitEnergy]) {
        checked.add(sig);
        checks++;
        if (trapped(snap.s, snap.jump)) {
          stuckFound++;
          const file = `${out}/stuck-${stuckFound}.state`;
          fs.writeFileSync(file, packState(snap.s));
          console.log(`TRAPPED ${file}: ${desc(g.ram)}\n  how: ${snap.how}`);
        }
      }
    }
  }
}
console.log('rooms', [...new Set([...archive.values()].map((c) => c.room))].filter((r) => r >= 0).sort((a, b) => a - b).map((r) => r.toString(16)).join(' '));
console.log(`${archive.size} cells, ${checks} checks, ${stuckFound} stuck, ${totalFrames} frames, ${Math.round((Date.now() - started) / 1000)} s`);
