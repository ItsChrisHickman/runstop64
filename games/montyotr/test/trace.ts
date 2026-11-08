/**
 * Monty on the Run pinned frame by frame: random players (holding a direction, jumping, climbing) play every room the game
 * has, with deaths forced at random (every event: an enemy, the lift, the crusher, the water, the C5's crash), and a hash of
 * the whole state is taken every frame and folded into one digest per room and player. The digests are in trace-golden.ts,
 * taken before Monty's movement, animation and death scripts moved to games/shared/monty/; the test requires them equal, so
 * that move (and any later one) changes nothing of how the game plays.
 *
 *   nice -n 15 node tools/test.mjs games/montyotr/test/trace.ts            checks against trace-golden.ts
 *   nice -n 15 node tools/test.mjs games/montyotr/test/trace.ts --print    prints the digests (to make trace-golden.ts)
 */
import { exitGridImage, extensionGrid } from '../src/data';
import { Game, type Input as Stick } from '../src/game';
import { enterRoom } from '../src/ending';
import { frame, NONE, type State } from './play';
import { check, finish } from '../../shared/test/check';
import { GOLDEN } from './trace-golden';

// the same run each time (the game's random numbers come from Math.random)
let seed = 20241106;
const rnd = () => { seed = (Math.imul(seed, 1103515245) + 12345) & 0x7fffffff; return seed / 0x80000000; };
Math.random = rnd;

const FRAMES = 2400; // a room, a player
const print = process.argv.includes('--print');

/** FNV-1a over numbers. */
class Hash {
  h = 0x811c9dc5;
  add(n: number): void { this.h = Math.imul(this.h ^ (n & 0xffffffff), 0x01000193) >>> 0; }
  bytes(b: ArrayLike<number>, from = 0, to = b.length): void { for (let i = from; i < to; i++) this.add(b[i] ?? 0); }
}

/** Everything of the game a frame can change that the picture or the play depends on. */
function hashState(g: Game, h: Hash, full: boolean): void {
  const flags = (...bs: boolean[]) => bs.reduce((n, b) => (n << 1) | (b ? 1 : 0), 0);
  [g.x2, g.y, g.facing, g.frameIndex, g.stepGate, g.savedX, g.savedY, g.montyAction, g.falling, g.arcIdx, g.onRope,
    flags(g.savedLeft, g.savedRight, g.isMoving, g.dirLeft, g.dirRight, g.dirUp, g.dirDown, g.inputFire),
    g.upSteps, g.downSteps, g.animTimer, g.ticker, g.stateCur, g.statePrev, g.showJetpack, g.jetpackActive,
    g.roomId, g.mapRow, g.exitCol, g.lives, g.score, g.hiScore, g.actionCounter, g.gameMode, g.freeze, g.roomExit,
    g.dissolvePending, g.completionActive, g.gameOverActive, g.frameToggle, g.enable, g.expandX, g.expandY, g.multicolour,
    g.priority, g.collisionStore, g.siActiveIdx, g.cheatMode, g.feetFrames, g.roomFlags, g.script ? 1 : 0,
    g.finished === null ? 0 : g.finished === 'won' ? 1 : 2].forEach((n) => h.add(n));
  h.bytes(g.sx); h.bytes(g.sy); h.bytes(g.sptr); h.bytes(g.scol); h.bytes(g.enemyParity); h.bytes(g.enemyAnim);
  for (const e of g.enemies) [e.x, e.y, e.colour, e.type, e.flags, e.range, e.step, e.speed].forEach((n) => h.add(n));
  Object.values(g.c5).forEach((n) => h.add(n));
  for (const v of Object.values(g.pd)) { if (typeof v === 'number') h.add(v); else v.forEach((n) => h.add(n)); }
  Object.values(g.lift).forEach((n) => h.add(n));
  Object.values(g.tele).forEach((n) => h.add(n));
  for (const r of g.vic.sprites) { h.add(r.x); h.add(r.y); h.add(r.ptr); h.add(r.colour); }
  h.add(g.vic.enable); h.add(g.vic.mc1); h.add(g.vic.mc2);
  h.bytes(g.prng);
  // the screen every frame, the character set and sprite data less often
  h.bytes(g.mem, 0x800, 0xc00);
  if (full) { h.bytes(g.mem, 0, 0x800); h.bytes(g.mem, 0xc00, 0x2000); h.bytes(g.mem, 0x2700, 0x3100); h.bytes(g.col); }
}

/** A player: holds a direction (or none) for a while, jumps, climbs. */
interface Plan extends Stick { until: number }
function newPlan(t: number): Plan {
  const kind = rnd();
  const dir = rnd();
  return {
    left: dir < 0.4, right: dir >= 0.4 && dir < 0.8,
    up: kind < 0.25, down: kind >= 0.25 && kind < 0.4,
    fire: kind >= 0.4 && kind < 0.7,
    until: t + 4 + Math.floor(rnd() * 40),
  };
}

/** What the players got to do (to see the pin covers the movement, and the sequences). */
const seen = { jumping: 0, falling: 0, rope: 0, walking: 0, dying: 0, c5: 0, jetpack: 0, deaths: 0, exits: 0 };

const EVENTS = [1, 2, 3, 4, 5, 7]; // (6 is the treasure: the ending, played in test/ending.ts)

function playRoom(room: number, variant: number): string {
  const g = new Game();
  g.assist = { lives: variant % 5 === 4, cloud: variant % 2 === 0, jetpack: variant % 3 === 0, c5: variant % 2 === 1, rooms: true, respawn: variant % 3 === 1 };
  g.start();
  const s: State = { g, col: 0 };
  const h = new Hash();
  const enter = () => {
    // (runstop64's rooms are on the extension grid; enterRoom reads the original's)
    const ext = extensionGrid.indexOf(room);
    if (ext >= 0) {
      g.mapRow = Math.floor(ext / 23); g.exitCol = ext % 23;
      g.x2 = 0x20 + Math.floor(rnd() * 0x78); g.y = 0x50 + Math.floor(rnd() * 0x88); g.facing = rnd() < 0.5 ? 0x01 : 0x81;
      g.dissolvePending = 0; g.roomExit = 1; g.freeze = 1;
      for (let n = 0; n < 20 && (n === 0 || g.freeze || g.script); n++) g.frame(0);
    } else enterRoom(g, room, 0x20 + Math.floor(rnd() * 0x78), 0x50 + Math.floor(rnd() * 0x88), rnd() < 0.5 ? 0x01 : 0x81);
  };
  enter();
  let plan = newPlan(0);
  let stick: Stick = NONE;
  for (let t = 0; t < FRAMES; t++) {
    if (t >= plan.until) plan = newPlan(t);
    stick = plan;
    if (!g.script && !g.freeze && rnd() < 1 / 1000) g.actionCounter = EVENTS[Math.floor(rnd() * EVENTS.length)] ?? 2;
    if (g.actionCounter === 7 && !g.c5.active) g.actionCounter = 2; // (the C5's crash is only in its rooms)
    frame(s, stick);
    hashState(g, h, t % 16 === 0);
    if (g.montyAction) seen.jumping++;
    if (g.falling) seen.falling++;
    if (g.onRope) seen.rope++;
    if (g.isMoving) seen.walking++;
    if (g.script) seen.dying++;
    if (g.c5.active) seen.c5++;
    if (g.showJetpack) seen.jetpack++;
    if (g.roomExit) seen.exits++;
    if (g.actionCounter & 0x80) seen.deaths++;
    if (g.finished) { // game over: a new game, in the room again
      g.start();
      s.col = 0;
      enter();
    }
  }
  return h.h.toString(16).padStart(8, '0');
}

const rooms: number[] = [];
for (let i = 0; i < exitGridImage.length; i++) {
  const id = exitGridImage[i];
  if (id !== undefined && id !== 0xff && id !== 0x30 && !rooms.includes(id)) rooms.push(id);
  const ext = extensionGrid[i];
  if (ext !== undefined && ext !== 0xff && !rooms.includes(ext)) rooms.push(ext);
}
rooms.sort((a, b) => a - b);

const out: Record<string, string> = {};
rooms.forEach((room, n) => {
  // two players in each room, with the assists mixed
  for (let v = 0; v < 2; v++) out[`${room}:${v}`] = playRoom(room, n + v);
});

console.log(`played: ${JSON.stringify(seen)}`);
if (print) {
  console.log('export const GOLDEN: Readonly<Record<string, string>> = {');
  for (const [k, v] of Object.entries(out)) console.log(`  '${k}': '${v}',`);
  console.log('};');
  process.exit(0);
}
let bad = 0;
for (const [k, v] of Object.entries(out)) if (GOLDEN[k] !== v) { bad++; console.log(`FAIL room:player ${k}: ${v}, pinned ${GOLDEN[k]}`); }
check(`${rooms.length} rooms x 2 players x ${FRAMES} frames (${rooms.length * 2 * FRAMES} frames): every digest equals the pinned one`, bad === 0 && Object.keys(GOLDEN).length === Object.keys(out).length);
finish();
