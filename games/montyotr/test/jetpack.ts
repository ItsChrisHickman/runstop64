/**
 * The jetpack rooms ("THE ULTIMATE EXPERIENCE"): the squeeze past the up-and-down enemy in
 * the second room ($1E). Its path runs flush with the corridor's right wall, leaving a gap of
 * 16 pixels at the left wall: Monty's body (14 pixels) fits at one column only (x2 = $6C,
 * against the wall), and only facing right, because his jetpack hangs on the side he faces
 * away from (9 units left of him facing right, 5 units right of him facing left), and the
 * jetpack touching an enemy kills him as surely as he does. Steering left up to the wall
 * turns him left and swings the jetpack into the enemy.
 *
 * Monty flies up out of room $1D into $1E (the game's own way: leaving through the exit at
 * the top), hovers at the bottom for k frames (k = 0, 2, ..., 158: every phase of the
 * enemies), then climbs to the corridor and up it, as a player would: steer to the corridor's
 * column, then straight up (holding left against the wall once in it). Approached from the
 * left he arrives facing right; from the right, facing left. Counted: the ks he gets past the
 * corridor (up to row 10) alive, and what hit him otherwise.
 *
 *   ORIGINAL: from the left he gets through whenever the low enemy (slot 1) lets him; from
 *             the right the up-and-down enemy (slot 3) gets him nearly every time.
 *   ENHANCED: only Monty himself is hit (Game.uncounted leaves the jetpack out of the
 *             collision check): from the right as often as from the left.
 *
 * With the original program (tools/motr-prg.mjs), the same approaches are flown on it too and
 * must end the same way (ORIGINAL is the original):
 *
 *   node tools/motr-prg.mjs /tmp/motr /tmp/motr.prg
 *   nice -n 15 node tools/test.mjs games/montyotr/test/jetpack.ts [/tmp/motr.prg]
 */
import fs from 'node:fs';
import { PixelRenderer, VicView } from 'c64kit';
import { C64 } from '../../../packages/c64kit/src/c64/machine';
import { Game, type Input } from '../src/game';
import { check, finish } from '../../shared/test/check';

const prgPath = process.argv[2];
/** The corridor's column (x2 of Monty against its left wall) and the row it starts (y below it). */
const COLUMN = 0x6c, BELOW_CORRIDOR = 0xb0, PAST = 0x82;
const ROOM = 0x1e;
const FROM = { left: 0x5c, right: 0x74 } as const;
type Side = keyof typeof FROM;
/** Slots of the room's enemies, by the sprite bit they collide with. */
const enemyHit = (bits: number) => bits & 0x80 ? '3' : bits & 0x40 ? '2' : bits & 0x20 ? '1' : bits & 0x10 ? '0' : '?';

/** The player: thrust; hover for k frames once in the room; then to the column and up it. */
function stick(inRoom: boolean, t: number, k: number, x2: number, y: number): Input {
  const none = { left: false, right: false, up: true, down: false, fire: false };
  if (!inRoom) return none;
  if (t < k) return { ...none, up: t % 2 === 0 };
  return { ...none, left: x2 > COLUMN || (x2 === COLUMN && y < BELOW_CORRIDOR), right: x2 < COLUMN };
}

/** 'O' through, an enemy slot's digit if one got him, 'x' anything else. */
type Outcome = string;

function port(side: Side, k: number, enhanced: boolean): Outcome {
  const g = new Game();
  g.assist = { cloud: false, jetpack: enhanced, c5: false, rooms: false, respawn: false };
  const view = new VicView(new PixelRenderer(), g.vic);
  g.start();
  // into $1D near its top (its exit up leads to $1E), the way the game enters a room
  g.mapRow = 5; g.exitCol = 9; g.x2 = FROM[side]; g.y = 0x50; g.roomExit = 1;
  let col = 0, entered = -1;
  for (let f = 0; f < 1000; f++) {
    const inRoom = g.roomId === ROOM && !g.freeze;
    if (inRoom && entered < 0) entered = f;
    g.input = stick(inRoom, f - entered, k, g.x2, g.y);
    g.frame(col);
    view.update();
    col = view.collisions(g.uncounted);
    if (g.actionCounter) return enemyHit(g.collisionStore);
    if (g.roomId === ROOM && g.y <= PAST) return 'O';
    if (entered >= 0 && g.roomId !== ROOM) return 'x';
  }
  return 'x';
}

function original(side: Side, k: number): Outcome {
  const m = new C64();
  m.ram.set(fs.readFileSync(prgPath).subarray(2), 0x801);
  m.vic[0x11] = 0x1b; m.vic[0x16] = 0x08; m.vic[0x18] = 0x15;
  m.cia2.pra = 0x97; m.cia1.pra = 0x7f;
  Object.assign(m.cia1, { latch: 0x4025, ta: 0x4025, cra: 0x11, mask: 0x01 });
  m.ram[0x314] = 0x31; m.ram[0x315] = 0xea;
  m.cpu.pc = 0x810; m.cpu.sp = 0xf6;
  const joy = (j: Input) => {
    m.joy1 = m.joy2 = 0x1f & ~((j.up ? 1 : 0) | (j.down ? 2 : 0) | (j.left ? 4 : 0) | (j.right ? 8 : 0) | (j.fire ? 16 : 0));
    m.keys = [];
  };
  // fire on the title starts a game
  for (let f = 0; f < 400; f++) { joy({ left: false, right: false, up: false, down: false, fire: f >= 300 && f < 310 }); m.runFrame(); }
  // the port's kit (the jet pack among the five: fk_room_item_active), then into $1D as above
  m.ram.fill(0xff, 0x31d, 0x322);
  m.ram[0x0f] = 1; m.ram[0x81] = 5; m.ram[0x82] = 9; m.ram[0x35] = FROM[side]; m.ram[0x36] = 0x50; m.ram[0x83] = 1;
  let entered = -1;
  for (let f = 0; f < 1000; f++) {
    const inRoom = m.ram[0x46] === ROOM && !m.ram[0x0f];
    if (inRoom && entered < 0) entered = f;
    joy(stick(inRoom, f - entered, k, m.ram[0x35], m.ram[0x36]));
    if (!m.runFrame()) throw new Error('the original stopped');
    const ac = m.ram[0xb7];
    if (ac && ac !== 0xff) return enemyHit(m.ram[0x48]);
    if (m.ram[0x46] === ROOM && m.ram[0x36] <= PAST) return 'O';
    if (entered >= 0 && m.ram[0x46] !== ROOM) return 'x';
  }
  return 'x';
}

const KS = Array.from({ length: 80 }, (_, i) => i * 2);
const runs = (f: (k: number) => Outcome) => KS.map(f).join('');
const through = (s: string) => [...s].filter((c) => c === 'O').length;

const o = { left: runs((k) => port('left', k, false)), right: runs((k) => port('right', k, false)) };
const e = { left: runs((k) => port('left', k, true)), right: runs((k) => port('right', k, true)) };
for (const [mode, r] of [['ORIGINAL', o], ['ENHANCED', e]] as const) {
  for (const side of ['left', 'right'] as const) console.log(`     ${mode} from the ${side.padEnd(5)} ${String(through(r[side])).padStart(2)}/80  ${r[side]}`);
}
const slot3 = (s: string) => [...s].filter((c) => c === '3').length;
check(`ORIGINAL from the left gets through often (${through(o.left)}/80), never hit by the up-and-down enemy`, through(o.left) >= 40 && slot3(o.left) === 0);
check(`ORIGINAL from the right: the up-and-down enemy gets him nearly every time it's in the way (${slot3(o.right)}, through ${through(o.right)}/80)`, slot3(o.right) >= 15 && through(o.right) <= 20);
check(`ENHANCED from the right gets through as often as from the left (${through(e.right)}/80, ${through(e.left)}/80), never hit by it`,
  through(e.right) >= 40 && Math.abs(through(e.right) - through(e.left)) <= 2 && slot3(e.right) === 0);
check('ENHANCED changes nothing when the jetpack isn\'t in the way (from the left: the same as ORIGINAL)', e.left === o.left);
// what's left in ENHANCED is the low enemy's timing, as in ORIGINAL: only Monty's own touch
check('ENHANCED: every hit is the low enemy (slot 1), on Monty himself', [...e.left, ...e.right].every((c) => c === 'O' || c === '1'));

if (prgPath) {
  // the original, every other k (each run starts a game on the C64 model)
  const sample = KS.filter((_, i) => i % 2 === 0);
  for (const side of ['left', 'right'] as const) {
    const orig = sample.map((k) => original(side, k)).join('');
    const ours = sample.map((k) => o[side][KS.indexOf(k)]).join('');
    const differ = [...orig].filter((c, i) => c !== ours[i]).length;
    console.log(`     the original from the ${side.padEnd(5)} ${orig}\n     the port's ORIGINAL      ${ours}`);
    check(`ORIGINAL from the ${side} ends as the original does (${sample.length - differ}/${sample.length} the same, at most 2 at a window's edge differing)`, differ <= 2);
  }
}
finish();
