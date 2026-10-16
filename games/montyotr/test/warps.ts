/**
 * runstop64's warps land Monty somewhere safe, and no death loops (ENHANCED), headless on the
 * game itself (c64kit stood in by games/shared/test/kit.ts).
 *
 * Chris warped to The Ultimate Experience, stepped right by accident and lost every life in the
 * Sewage Works. The root cause: the warp lands him in $1D as walking in from $1C does, but the
 * only way into $1D is across $1C, whose floor is only there once the joystick ($1B, item 5) is
 * found (ApplyItemRoomEffects): warped in without it, a step right went into $1C over no floor,
 * down into the sewage; and a death starts him again where he came into the room, which was that
 * step, over the same hole: every life went the same way. Fixed twice over:
 *
 *  - the warp lands him with what its destination's only way in has taken (runstop64-rooms.ts
 *    teleporter.found: the joystick), so $1C's floor is there as walking in leaves it;
 *  - ENHANCED (assist respawn): a death before he's had a moment on his feet since coming into
 *    a room (2 seconds: game.ts SAFE_FRAMES) starts him where he last came into a room and had
 *    that moment, not at this one's way in. (The same loop was waiting a step right of Pie Are
 *    Square: $09's way in from $08 is on an enemy's path, which killed him there every couple of
 *    seconds, nothing pressed.)
 *
 * For each warp (the jetpack's $37 -> $1D, the C5's $38 -> $24, Pie Are Square's $39 -> $08),
 * taken by walking into its beam, and for travel there by the pause screen's map: nothing pressed
 * for 200 frames, he's alive; right held for 100 frames, then nothing for 300: at most one life
 * lost, and none in the last 200 (no loop); the same with left. Then the guard on its own: $1C
 * without the joystick, walked into from $1D: ENHANCED loses one life and starts him in $1D;
 * without the guard (the original's rule) every life goes (the loop it prevents).
 * (Each game has had a moment in the room it starts in, as a player has before a warp.)
 *
 *   nice -n 15 node tools/test.mjs games/montyotr/test/warps.ts
 */
import { Game, type Input as Stick } from '../src/game';
import { montyMap, noteRoom } from '../src/map';
import { PixelRenderer, VicView } from 'c64kit';
import type { Found } from '../../shared/native/pause';
import { getProp } from '../../shared/guards';
import { check, finish } from '../../shared/test/check';

// the same run each time (the crushers and teleporters take g.random(), which takes Math.random)
{
  let seed = 4242;
  Math.random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
}

const hex = (n: number) => `$${n.toString(16).padStart(2, '0')}`;
const NONE: Stick = { left: false, right: false, up: false, down: false, fire: false };

/** A game with the front end's collisions (VicView) each frame, as it's played. */
interface Play { g: Game; col: number }
function step(s: Play, stick: Stick) {
  s.g.input = stick;
  s.g.inputFire = stick.fire;
  s.g.frame(s.col);
  const view = new VicView(new PixelRenderer(), s.g.vic);
  view.update();
  s.col = view.collisions(s.g.uncounted);
}
const run = (s: Play, stick: Stick, n: number) => { for (let i = 0; i < n; i++) step(s, stick); };
const settled = (g: Game) => !g.freeze && !g.script;

function copy(src: Play): Play {
  const g = new Game();
  for (const k of Object.keys(src.g)) {
    if (k === 'vic' || k === 'mem' || k === 'col' || k === 'sound' || k === 'onRoomLoaded' || k === 'graceActive' || k === 'script') continue;
    Reflect.set(g, k, structuredClone(getProp(src.g, k)));
  }
  g.assist = { ...src.g.assist };
  g.vic.bank.set(src.g.vic.bank);
  g.vic.colour.set(src.g.vic.colour);
  for (const k of Object.keys(src.g.vic)) if (k !== 'bank' && k !== 'colour') Reflect.set(g.vic, k, structuredClone(getProp(src.g.vic, k)));
  return { g, col: src.col };
}

/** A new game, ENHANCED (or with the respawn guard off), Monty brought into a room (an exit pointed at it). */
function into(cell: { mapRow: number; exitCol: number; x2: number; y: number }, respawn = true): Play {
  const g = new Game();
  g.assist = { cloud: true, jetpack: true, c5: true, rooms: true, respawn };
  g.start();
  Object.assign(g, cell);
  g.roomExit = 1;
  const s = { g, col: 0 };
  // (a moment on his feet there, as a player has before taking a warp: its way in is a place to start again from)
  run(s, NONE, 120);
  return s;
}

/** After arriving: idle; then each way held a while and let go. */
function safeHere(what: string, arrived: Play) {
  const room = arrived.g.roomId;
  {
    const s = copy(arrived), lives = s.g.lives;
    run(s, NONE, 200);
    check(`${what}: nothing pressed for 200 frames, alive (lives ${lives} -> ${s.g.lives}, in ${hex(s.g.roomId)})`, s.g.lives === lives);
  }
  for (const dir of ['right', 'left'] as const) {
    const s = copy(arrived), lives = s.g.lives;
    run(s, { ...NONE, [dir]: true }, 100);
    run(s, NONE, 100);
    const mid = s.g.lives;
    run(s, NONE, 200);
    check(`${what}: ${dir} held 100 frames, then let go: ${lives - s.g.lives} lost (at most 1), none in the last 200 frames (in ${hex(s.g.roomId)})`,
      lives - s.g.lives <= 1 && s.g.lives === mid);
  }
  return room;
}

// ---- the warps, by their beams -------------------------------------------------------------------
/** Each warp room's cell, and Monty on the platform under its beam, a few steps left of it. */
const WARPS = [
  { name: 'The Ultimate Experience', from: 0x37, cell: { mapRow: 4, exitCol: 21 }, col: 17, to: 0x1d },
  { name: 'the C5 street', from: 0x38, cell: { mapRow: 4, exitCol: 20 }, col: 14, to: 0x24 },
  { name: 'Pie Are Square', from: 0x39, cell: { mapRow: 4, exitCol: 19 }, col: 10, to: 0x08 },
];
const found: Found = {};
for (const w of WARPS) {
  // (standing on the platform the beam is over: its top at screen row 13, Monty's rows 11-12)
  const s = into({ ...w.cell, x2: w.col * 4 + 0x0c, y: 0x32 + 11 * 8 });
  check(`${w.name}: in the warp room ${hex(w.from)} (${hex(s.g.roomId)}), on the platform`, s.g.roomId === w.from && !s.g.falling);
  const joystick = s.g.siCollected[5];
  let n = 0;
  while (!(s.g.roomId === w.to && settled(s.g)) && n++ < 600) step(s, { ...NONE, right: s.g.roomId === w.from });
  check(`${w.name}: walked into the beam, warped to ${hex(w.to)} (${hex(s.g.roomId)}, x2 ${hex(s.g.x2)} y ${hex(s.g.y)})`, s.g.roomId === w.to && settled(s.g));
  if (w.to === 0x1d) check(`${w.name}: landed with the joystick its only way in has found (was ${joystick}, now ${s.g.siCollected[5]}): $1C's floor is there`, joystick === 0 && s.g.siCollected[5] !== 0);
  noteRoom(s.g, found);
  safeHere(`warp to ${w.name}`, s);
}

// ---- travel there by the map ---------------------------------------------------------------------------
for (const w of WARPS) {
  // (from the warp room, as a player who's been there goes back: the map's own way)
  const s = into({ ...w.cell, x2: w.col * 4 + 0x0c, y: 0x32 + 11 * 8 });
  if (w.to === 0x1d) s.g.siCollected[5] = 0x81; // (been there: the warp found it)
  const went = montyMap.go(String(w.to), s.g, found);
  let n = 0;
  while (!(s.g.roomId === w.to && settled(s.g)) && n++ < 300) step(s, NONE);
  check(`travel to ${w.name} by the map: there (${hex(s.g.roomId)})`, went && s.g.roomId === w.to);
  safeHere(`travel to ${w.name}`, s);
}

// ---- the guard on its own: a fall into a room that kills ----------------------------------------------
for (const guard of [true, false]) {
  // $1D's right edge, standing, no joystick (as the warp left him before the fix), right held into $1C
  const s = into({ mapRow: 5, exitCol: 9, x2: 0x98, y: 0xb2 }, guard);
  s.g.showJetpack = 0;
  const lives = s.g.lives;
  let n = 0;
  while (s.g.lives === lives && n++ < 600) step(s, { ...NONE, right: true });
  const died = s.g.roomId;
  for (let k = 0; k < 400 && (s.g.script || s.g.freeze); k++) step(s, NONE);
  const back = s.g.roomId;
  run(s, NONE, 600);
  if (guard) {
    check(`ENHANCED: into $1C without its floor, a fall into the sewage: one life lost in ${hex(died)}, started again in ${hex(back)} where he last got onto his feet, then no more lost (${lives} -> ${s.g.lives})`,
      died === 0x1c && back === 0x1d && s.g.lives === lives - 1);
  } else {
    check(`without the guard (the original's rule): started again over the hole in ${hex(back)}, every life lost the same way (${lives} -> ${s.g.lives}${s.g.finished ? ', game over' : ''})`,
      back === 0x1c && s.g.lives <= 1);
  }
}

finish();
