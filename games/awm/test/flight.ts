/**
 * The flight (src/flight.ts) against the original running it: Monty at a plane with a ticket and the Commodore key down boards in
 * the original ($758F), the rebuild's game boards at the same step, and the flight is flown frame by frame in both with the same
 * joystick. Each frame the original shows is compared, as the 320 x 200 picture (tools/probe's `renderPixels`), with the rebuild's
 * (the sky from flight.ts over the panel as the play screen's picture has it, a plane shot down printed in the score), and so are
 * the variables the interrupts keep (the clouds, the scrolls, the planes, the paths, the clock, the pointers, the sky's rows) and
 * the sound requests. The flights after the first start from what the one before left in the machine.
 *
 *   nice -n 15 node tools/test.mjs games/awm/test/flight.ts games/awm/build/play.state rand:600:1 [out-dir]
 *
 * Plans (`kind:frames:seed`; a flight ends by itself after about 2000 frames): `idle` (the stick left alone, to the end of the flight), `rand`
 * (random sticks), `kill` (the player steers his nose onto the other plane's, to shoot it down), `crash` (he stays at its tail until
 * it brings him down), `mix` (the three in turn). FLIGHTS=n flies n flights one after another (a plan then flies each to its end);
 * ROOM=n starts in that room (default 0: a plane at $C0, $68); SOUND=1 chooses the effects, so the hits are heard and the voices cut.
 *
 * The first frame of a flight (stage 0 alone) and the ones either end of it (the original takes frames to set up and to draw
 * the room it lands in; the rebuild goes straight on) are not compared. One line of the border, the 7 and 9 pixels either side of
 * the narrower screen on picture line 146, is the sky's colour or black by a cycle of the interrupt's timing, and is counted apart.
 */
import fs from 'node:fs';
import path from 'node:path';
import { C64Machine, unpackState } from 'c64kit';
import { indicesPng, renderPixels } from '../../../tools/probe/render';
import { airports, applyOriginal, CRASH, flightStick, KILL, makeGame, makePicture, random as seeded, readSky, startOriginal, stickOf } from './harness';
import { decodeStick } from '../src/input';
import type { SkyState } from '../src/flight';
import { callText } from '../src/soundlog';

const [stateFile, planArg = 'rand:600:1', outDir] = process.argv.slice(2);
if (!stateFile) throw new Error('usage: flight.ts <play.state> [plan] [out-dir]');
const state = unpackState(new Uint8Array(fs.readFileSync(stateFile)));
const W = 320, H = 200;
const FLIGHTS = Number(process.env.FLIGHTS ?? 1);
const ROOM = Number(process.env.ROOM ?? 0);
/** The Commodore key in the keyboard matrix: [CIA1 port A bit, port B bit]. */
const COMMODORE: [number, number] = [7, 5];
/** The picture line whose border is the sky's or black by the cycle stage 6 comes in on (the sky's 7 pixels left and 9 right). */
const BORDER_LINE = 146;

const [kind = 'rand', framesArg = '600', seedArg = '1'] = planArg.split(':');
const FRAMES = Number(framesArg), SEED = Number(seedArg);

// ---- the original's variables -------------------------------------------------------------------------------------

const byte = (o: C64Machine, a: number): number => o.ram[a] ?? 0;
const word = (o: C64Machine, a: number): number => byte(o, a) | (byte(o, a + 1) << 8);

/** The rest of what the interrupts keep. */
function variables(o: C64Machine): Record<string, number> {
  return {
    scrollA: byte(o, 0x3a), life: byte(o, 0x7862), enemyLife: byte(o, 0x7863), crashed: byte(o, 0x7864), over: byte(o, 0x809f),
    clock: word(o, 0x80a0), path: byte(o, 0x8074) ? (byte(o, 0x8071) << 16) | (byte(o, 0x8072) << 8) | byte(o, 0x8073) : 0,
  };
}

const text = (v: unknown): string => JSON.stringify(v);

// ---- plans: the stick for a frame ---------------------------------------------------------------------------------------

/** The stick (`Stick` bits) for flight frame `n`, from where the planes are. */
type Plan = (sky: SkyState, n: number) => number;

const MOVES = ['', 'L', 'R', 'U', 'D', 'LU', 'RU', 'LD', 'RD', 'F'];
function randomPlan(seed: number): Plan {
  const rnd = seeded(seed);
  let held = 0, left = 0;
  return () => {
    if (left-- <= 0) { held = stickOf(MOVES[Math.floor(rnd() * MOVES.length)] ?? ''); left = 3 + Math.floor(rnd() * 25); }
    return held;
  };
}
function planFor(seed: number): Plan {
  const rand = randomPlan(seed);
  switch (kind) {
    case 'idle': return () => 0;
    case 'kill': return (sky) => flightStick(KILL, sky);
    case 'crash': return (sky) => flightStick(CRASH, sky);
    case 'mix': return (sky, n) => (n % 600 < 200 ? flightStick(KILL, sky) : n % 600 < 400 ? flightStick(CRASH, sky) : rand(sky, n));
    default: return rand;
  }
}

// ---- the run ------------------------------------------------------------------------------------------------------

let frames = 0, same = 0, torn = 0;
const problems: string[] = [];
let saved = 0;

const airport = airports().find((a) => a.room === ROOM);
if (!airport) throw new Error(`room ${ROOM} has no plane`);
const orig = startOriginal(state, ROOM, airport.x, airport.y, { carry: [0] });
const o = orig.o;

/** Runs the original's logic steps with the stick idle (a room being drawn, a landing settling) and gives the rebuild the game and the picture as they stand. */
function settle() {
  let now = orig.next(0);
  for (let i = 0; i < 20; i++) now = orig.next(0);
  const game = makeGame(now.snap.room);
  applyOriginal(game, now);
  return { game, pic: makePicture(game, now, o) };
}

function flyOne(index: number): void {
  o.keys = [];
  const { game, pic } = settle();
  // (a ticket in his hands, in both; the original's panel did not draw its box, which the sky covers anyway)
  o.ram[0x6947] = 0;
  game.items.carried[0] = 0;
  o.keys = [COMMODORE];
  game.step(0, true);
  if (game.boarded === null) throw new Error('the rebuild did not board');
  pic.takeOff();
  const flight = game.startFlight(pic.ram);
  // the original runs till stage 1 first comes, in the flight's second frame: its set-up takes a couple of frames
  let enteredAt = -1;
  const step = o.cpu.step.bind(o.cpu);
  const calls: string[] = [];
  let lastPc = 0;
  o.cpu.step = () => {
    const pc = o.cpu.pc;
    if (pc === 0x7a02 && enteredAt < 0) enteredAt = 1;
    if (enteredAt > 0 && lastPc !== 0xe4b8) {
      if (pc === 0x85a6) calls.push(`e${o.cpu.a.toString(16)}`);
      else if (pc === 0xc7e3) calls.push(`v${o.cpu.a.toString(16)}`);
    }
    lastPc = pc;
    return step();
  };
  game.sound.take();
  const plan = planFor(SEED * 100 + index);
  let n = 0;
  for (let f = 0; f < 4000; f++) {
    const stick = plan(readSky(o.ram), n);
    o.joy1 = o.joy2 = 0x1f & ~stick;
    calls.length = 0;
    if (!o.runFrame()) throw new Error('the CPU stopped');
    if (enteredAt < 0) continue;
    n++;
    flight.step(game.scramble(decodeStick(stick)));
    const mine = renderPixels({ ram: flight.ram, capture: pic.flightCapture(flight) });
    const theirs = renderPixels(o);
    frames++;
    // what the original's variables say now
    const here: string[] = [];
    const a = text(readSky(o.ram)), b = text(game.sky);
    if (a !== b) here.push(`memory original ${a} rebuild ${b}`);
    const va = text(variables(o)), vb = text(flight.variables);
    if (va !== vb) here.push(`variables original ${va} rebuild ${vb}`);
    const ra = Array.from(o.ram.subarray(0xc000, 0xc000 + 720)).join(','), rb = Array.from(flight.ram.subarray(0xc000, 0xc000 + 720)).join(',');
    if (ra !== rb) here.push('sky rows differ');
    const sa = calls.join(','), sb = game.sound.take().map(callText).join(',');
    if (sa !== sb) here.push(`sounds original ${sa} rebuild ${sb}`);
    let diff = 0, x0 = W, x1 = -1, y0 = H, y1 = -1, border = true;
    for (let i = 0; i < W * H; i++) {
      if (theirs[i] === mine[i]) continue;
      const x = i % W, y = Math.floor(i / W);
      diff++;
      x0 = Math.min(x0, x); x1 = Math.max(x1, x); y0 = Math.min(y0, y); y1 = Math.max(y1, y);
      if (y !== BORDER_LINE || (x >= 7 && x < W - 9)) border = false;
    }
    // (stage 6 turns the border black at the end of one raster line or the start of the next, by a cycle of the interrupt's timing)
    const frameTorn = diff > 0 && border && here.length === 0;
    if (frameTorn) torn++;
    else if (diff) here.push(`${diff} pixels differ in ${x0},${y0}-${x1},${y1}`);
    if (!frameTorn && here.length === 0) same++;
    if (here.length > 0) {
      problems.push(`flight ${index + 1} frame ${n}: ${here.join('; ')}`);
      if (outDir && saved < 6 && diff) {
        fs.mkdirSync(outDir, { recursive: true });
        const mask = new Uint8Array(W * H);
        for (let i = 0; i < W * H; i++) if (theirs[i] !== mine[i]) mask[i] = 2;
        const name = `flight${index + 1}-frame${n}`;
        indicesPng(path.join(outDir, `${name}-original.png`), theirs, W, H);
        indicesPng(path.join(outDir, `${name}-rebuild.png`), mine, W, H);
        indicesPng(path.join(outDir, `${name}-diff.png`), mask, W, H);
        saved++;
      }
    }
    if (flight.over) break;
    if (n >= FRAMES && FLIGHTS === 1 && kind !== 'idle') break;
  }
  o.cpu.step = step;
  console.log(`flight ${index + 1}: ${n} frames flown${flight.crashed ? ', shot down' : ''}, score ${game.score.value}`);
  // (the original comes down: its key let go, so it does not board again)
  o.keys = [];
}

for (let i = 0; i < FLIGHTS; i++) flyOne(i);
console.log(`${planArg}: of ${frames} frames ${same} identical, ${torn} with one line of border in the other colour (a cycle of the original's timing), ${frames - same - torn} different`);
for (const p of problems.slice(0, 12)) console.log('  ' + p.slice(0, 400));
if (problems.length > 12) console.log(`  ... and ${problems.length - 12} more`);
if (problems.length) process.exit(1);
