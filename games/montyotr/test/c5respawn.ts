/**
 * After a crash on the C5 street, Monty gets a fair start (no death loop), headless on the game
 * itself:
 *
 *  - ENHANCED (assist c5): a crash starts him again in the room he crashed in, where he came
 *    into it, the C5 stopped (mechanisms.ts c5Restart). Before, it came back at the speed it
 *    came in at, and on the return the second room's ($32) first holes are a frame or two from
 *    its edge: a press on its first frame or the same crash again, every life (Chris lost a game
 *    that way). In every room of every pass (15 arrivals: out, the return, out again): a crash
 *    there (the real one, from the arrival with nothing pressed, where the road has a hole ahead;
 *    otherwise the game's event 7), then 300 frames with nothing pressed: no other life lost.
 *  - From the restart in the return's second room ($32), a hop sequence (found by a search over
 *    the game's own frames: right held, fire pressed or not each frame) drives him through into
 *    $31, and played again for real it gets there with no crash.
 *  - ORIGINAL: a crash goes back to the tree in $24 (the section's start, stopped): nothing
 *    pressed there for 300 frames loses nothing either (the original doesn't loop).
 *
 *   nice -n 15 node tools/test.mjs games/montyotr/test/c5respawn.ts
 */
import { Game, type Input as Stick } from '../src/game';
import { c5Arrive, type C5State } from '../src/mechanisms';
import { getProp } from '../../shared/guards';
import { check, finish } from '../../shared/test/check';

const hex = (n: number) => n.toString(16);
const NONE: Stick = { left: false, right: false, up: false, down: false, fire: false };

interface Arrival { room: number; stage: number; x2: number; y: number; c5: C5State }

/** A new game with the C5 brought into a room as the drive brings it (an exit pointed at it). */
function at(a: Arrival, enhanced: boolean) {
  const g = new Game();
  g.assist = { cloud: false, jetpack: false, c5: enhanced, rooms: false, respawn: enhanced };
  g.start();
  const col = [...Array(23).keys()].find((c) => g.roomAt(2, c) === a.room);
  if (col === undefined) throw new Error(`room ${hex(a.room)} isn't on the grid`);
  g.mapRow = 2; g.exitCol = col; g.x2 = a.x2; g.y = a.y;
  c5Arrive(g, a.c5);
  g.roomExit = 1;
  g.frame(0);
  return g;
}
const step = (g: Game, s: Stick) => { g.input = s; g.inputFire = s.fire; g.frame(0); };
/** Frames until the room has come in again after a death (the scripted sequence done). */
const settle = (g: Game) => { for (let n = 0; n < 400 && (g.script || g.freeze); n++) step(g, NONE); };

/** A copy of a game between frames (no scripted sequence running). */
function copy(src: Game): Game {
  const g = new Game();
  for (const k of Object.keys(src)) {
    if (k === 'vic' || k === 'mem' || k === 'col' || k === 'sound' || k === 'onRoomLoaded' || k === 'graceActive' || k === 'script') continue;
    Reflect.set(g, k, structuredClone(getProp(src, k)));
  }
  g.assist = { ...src.assist };
  g.vic.bank.set(src.vic.bank);
  g.vic.colour.set(src.vic.colour);
  return g;
}

// ---- the arrivals: each pass driven (crash check off), each room as the C5 comes into it ----------
const PASSES = [
  { stage: 0, room: 0x24, x2: 0x8f, y: 0x7a, speed: 0, dir: 0x01, right: false },
  { stage: 1, room: 0x33, x2: 0x14, y: 0xa2, speed: 4, dir: 0x01, right: true },
  { stage: 2, room: 0x24, x2: 0x94, y: 0xca, speed: 4, dir: 0x81, right: false },
];
const arrivals: (Arrival & { right: boolean; next: number | null })[] = [];
for (const p of PASSES) {
  const g = at({ room: p.room, stage: p.stage, x2: p.x2, y: p.y, c5: { fallStage: p.stage, speed: p.speed, dir: p.dir, bounce: 0 } }, true);
  g.cheatMode = 0x80;
  const list: Arrival[] = [{ room: g.roomId, stage: p.stage, x2: g.x2, y: g.y, c5: { ...g.c5Arrival } }];
  for (let f = 0; f < 3000 && g.c5.active && g.c5.fallStage === p.stage && !g.c5.fall; f++) {
    const room = g.roomId;
    step(g, { ...NONE, right: p.right, left: !p.right });
    if (g.roomId !== room && g.c5.active && g.c5.fallStage === p.stage) list.push({ room: g.roomId, stage: p.stage, x2: g.savedX, y: g.savedY, c5: { ...g.c5Arrival } });
  }
  list.forEach((a, i) => arrivals.push({ ...a, right: p.right, next: list[i + 1]?.room ?? null }));
}
check(`the street driven: every room of the three passes, ${arrivals.length} arrivals (${arrivals.map((a) => `${a.stage}:${hex(a.room)}`).join(' ')})`, arrivals.length === 15);

// ---- ENHANCED: a crash in each room, then nothing pressed ------------------------------------------
let return32: Game | null = null;
for (const a of arrivals) {
  // the real crash, where there's a hole ahead of the way in (nothing pressed: the C5 drives on
  // at the speed it came in at); otherwise the game's event 7 there, a frame in
  let g = at(a, true);
  const lives = g.lives;
  let n = 0;
  while (g.lives === lives && g.roomId === a.room && n++ < 120) step(g, NONE);
  const real = g.lives < lives && g.roomId === a.room;
  if (!real) {
    g = at(a, true);
    g.actionCounter = 7;
    while (g.lives === lives && n++ < 400) step(g, NONE);
  }
  settle(g);
  const after = g.lives;
  for (let f = 0; f < 300; f++) step(g, NONE);
  check(`ENHANCED, pass ${a.stage} ${hex(a.room)} (came in at speed ${a.c5.speed}): ${real ? 'crashed' : 'a crash'}, back in ${hex(g.roomId)} stopped (speed ${g.c5.speed}, x2 ${hex(g.x2)}); 300 frames idle: ${after - g.lives} more lost`,
    after === lives - 1 && g.roomId === a.room && g.c5.active === 1 && g.c5.speed === 0 && g.lives === after);
  if (a.stage === 1 && a.room === 0x32) {
    return32 = at(a, true);
    const l = return32.lives;
    while (return32.lives === l) step(return32, NONE);
    settle(return32);
  }
}

// ---- the return's second room: a hop sequence through it after the restart -------------------------
{
  const start = return32;
  check('the return\'s second room ($32): crashed and restarted', !!start && start.roomId === 0x32);
  if (start) {
    // breadth first over frames: right held, fire or not; the first way into $31
    let level: { g: Game; path: boolean[] }[] = [{ g: start, path: [] }];
    const seen = new Set<string>();
    let found: boolean[] | null = null;
    for (let f = 0; f < 400 && level.length && !found; f++) {
      const next: typeof level = [];
      for (const { g: s, path } of level) {
        for (const fire of [false, true]) {
          const g = copy(s);
          step(g, { ...NONE, right: true, fire });
          if (g.actionCounter) continue;
          if (g.roomId === 0x31) { found = [...path, fire]; break; }
          const k = [g.x2, g.y, g.c5.speed, g.c5.bounce, g.frameToggle, g.stepGate, g.c5.rate].join();
          if (seen.has(k)) continue;
          seen.add(k);
          next.push({ g, path: [...path, fire] });
        }
        if (found) break;
      }
      level = next;
    }
    const presses = found ? found.flatMap((f, i) => (f && !found?.[i - 1] ? [i] : [])) : [];
    check(`a hop sequence through $32 from the restart: right held, fire at frames ${presses.join(', ')} (${found ? found.length : 0} frames)`, !!found);
    if (found) {
      const g = copy(start), lives = g.lives;
      for (const fire of found) step(g, { ...NONE, right: true, fire });
      for (let f = 0; f < 5; f++) step(g, { ...NONE, right: true });
      check(`... played for real: into $31 (${hex(g.roomId)}), no life lost`, g.roomId === 0x31 && g.lives === lives);
    }
  }
}

// ---- ORIGINAL: back to the tree ---------------------------------------------------------------------
{
  const a = arrivals.find((x) => x.stage === 1 && x.room === 0x32);
  if (a) {
    const g = at(a, false), lives = g.lives;
    while (g.lives === lives) step(g, NONE);
    settle(g);
    const after = g.lives;
    for (let f = 0; f < 300; f++) step(g, NONE);
    check(`ORIGINAL: the crash in $32 (the return) goes back to the tree (${hex(g.roomId)} x2 ${hex(g.x2)}, the C5 stopped: ${g.c5.speed}); 300 frames idle: ${after - g.lives} more lost`,
      g.roomId === 0x24 && g.c5.fallStage === 0 && g.c5.speed === 0 && g.lives === after);
  }
}

finish();
