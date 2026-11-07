/**
 * Auf Wiedersehen Monty's lift on arrival. Climbing the ladder up from the start room comes into room $41 right under its lift
 * (it sets the lift growing as he arrives, and its catch knocks him a few steps later if he keeps climbing). ENHANCED: the lift
 * waits at rest, drawing no random number, until he is out from under it (its catch column); walking back under it afterwards
 * still gets him hit. ORIGINAL is the original's own: knocked, a life lost, as the original itself (run beside it) does.
 *
 *   nice -n 15 node tools/test.mjs games/awm/test/lift-entry.ts games/awm/build/play.state
 */
import fs from 'node:fs';
import { unpackState } from 'c64kit';
import { check, finish } from '../../shared/test/check';
import { parseRoute, stickOf } from '../../shared/ending/pilot';
import { stickBits } from '../src/ending';
import { decodeStick } from '../src/input';
import { Lift } from '../src/lifts';
import { RANDOM } from '../src/data';
import { Random } from '../src/rng';
import { START_ROOM } from '../src/program';
import { State } from '../src/tiles';
import { applyOriginal, makeGame, startOriginal, type Moment } from './harness';

const [file = 'games/awm/build/play.state'] = process.argv.slice(2);
const state = unpackState(new Uint8Array(fs.readFileSync(file)));

const IDLE = 68;
const ROUTE = 'J>12 J<8 ^<8 >4 ^27';
const LIFT_ROOM = 0x41;
const joysOf = (route: string): number[] => parseRoute(route).flatMap((r) => Array.from({ length: r.steps }, () => stickBits(stickOf(r.move))));

/** The original, or the port in `enhanced` or not, from the start room, after the idle steps and the route. */
function start() {
  const orig = startOriginal(state, START_ROOM, 128, 104);
  let now: Moment = orig.next(0);
  for (let i = 1; i < IDLE; i++) now = orig.next(0);
  return { orig, now };
}

/** Runs `joys` in the port; for each step the state, position, lives and the lift's phase. */
function port(enhanced: boolean, joys: readonly number[]) {
  const { now } = start();
  const g = makeGame(now.snap.room);
  applyOriginal(g, now);
  g.liftWaits = () => enhanced;
  const log: { room: number; x: number; y: number; state: number; lives: number; phase: number; rng: number }[] = [];
  for (const joy of joys) {
    g.step(decodeStick(joy), false);
    log.push({ room: g.world.room, x: g.monty.x, y: g.monty.y, state: g.monty.state, lives: g.lives, phase: g.lift.phase, rng: g.rng.index });
  }
  return { g, log };
}

function original(joys: readonly number[]) {
  const { orig } = start();
  const log: { room: number; x: number; y: number; state: number; lives: number }[] = [];
  for (const joy of joys) {
    const m = orig.next(joy);
    log.push({ room: m.snap.room, x: m.snap.x, y: m.snap.y, state: m.snap.state, lives: m.snap.lives });
  }
  return log;
}

const into = joysOf(ROUTE);
/** Steps from the one that comes into room $41 (the route's last) on. */
const ARRIVAL = into.length - 1;
const sticks = (route: string): number[] => [...into, ...joysOf(route)];
const KNOCKED: readonly number[] = [State.Knocked, State.Dying, State.Zap, State.Fire];
const first = <T>(xs: readonly T[], pred: (x: T, i: number) => boolean): number => xs.findIndex(pred);

// ---- climbing straight on: `^<` at once -----------------------------------------------------------------------------------
{
  const joys = sticks('^<8');
  const org = port(false, joys).log, enh = port(true, joys).log, orig = original(joys);
  check(`he comes into room $41 at step ${ARRIVAL} (${org[ARRIVAL]?.x}, ${org[ARRIVAL]?.y})`, org[ARRIVAL]?.room === LIFT_ROOM && org[ARRIVAL]?.x === 128 && org[ARRIVAL]?.y === 120);
  const knockedAt = first(org, (l, i) => i >= ARRIVAL && KNOCKED.includes(l.state));
  check(`ORIGINAL: knocked ${knockedAt - ARRIVAL} steps after he comes in`, knockedAt > ARRIVAL && knockedAt - ARRIVAL <= 6);
  const livesAt = org[ARRIVAL]?.lives ?? 0;
  const longer = port(false, sticks('^<40')).log;
  check('ORIGINAL: a life lost within 40 steps', longer.some((l, i) => i > ARRIVAL && l.lives < livesAt));
  const same = org.every((l, i) => { const o = orig[i]; return o !== undefined && l.room === o.room && l.x === o.x && l.y === o.y && l.state === o.state && l.lives === o.lives; });
  check('ORIGINAL: the rebuild and the original (running beside it) agree at every step: room, place, state, lives', same);
  check('the original is knocked at the same step', first(orig, (l, i) => i >= ARRIVAL && KNOCKED.includes(l.state)) === knockedAt);
  const ledge = enh[ARRIVAL + 5];
  check(`ENHANCED: five steps on he is on the ledge (${ledge?.x}, ${ledge?.y}), standing`, ledge?.room === LIFT_ROOM && ledge.x === 118 && ledge.y === 112 && ledge.state === State.Free);
  check('ENHANCED: never knocked while the lift waits, lives unchanged', enh.slice(ARRIVAL, ARRIVAL + 6).every((l) => !KNOCKED.includes(l.state) && l.lives === livesAt));
  check('ENHANCED: the lift stays at rest and draws no random number while he is under it', enh.slice(ARRIVAL, ARRIVAL + 6).every((l) => l.phase === 0 && l.rng === enh[ARRIVAL]?.rng));
}

// ---- out from under it, then back under -------------------------------------------------------------------------------------
{
  const joys = sticks('J<1 <15 >50');
  const { log } = port(true, joys);
  const livesAt = log[ARRIVAL]?.lives ?? 0;
  const released = first(log, (l, i) => i >= ARRIVAL && l.phase !== 0);
  // (the lift moves before he does in a step: it sees where the step before left him)
  check(`ENHANCED: it is let go the first step after he is out of its column (step ${released - ARRIVAL} after he came in)`,
    released > ARRIVAL && (log[released - 1]?.x ?? 0) <= 116 && log.slice(ARRIVAL, released - 1).every((l) => l.x >= 117));
  const knockedAt = first(log, (l, i) => i > released && KNOCKED.includes(l.state));
  check(`ENHANCED: walking back under it he is knocked (step ${knockedAt - ARRIVAL}), at x ${log[knockedAt]?.x}`, knockedAt > released && (log[knockedAt]?.x ?? 0) >= 117);
  check('ENHANCED: and loses a life', log.slice(knockedAt).some((l) => l.lives < livesAt));
  check('ENHANCED: nothing knocked him before that', log.slice(ARRIVAL, knockedAt).every((l) => !KNOCKED.includes(l.state)));
  // after the death he is back under it: it waits again
  const back = first(log, (l, i) => i > knockedAt && l.lives < livesAt && l.x === 128 && l.y === 120);
  check(`ENHANCED: after the death he is back at the foot of the ladder and the lift rests (phase ${log[back]?.phase}) again`, back > 0 && log[back]?.phase === 0 && log.slice(back, back + 3).every((l) => !KNOCKED.includes(l.state) && l.phase === 0));
}

// ---- the picture: a held lift is drawn retracted, once ----------------------------------------------------------------------
{
  const lift = new Lift();
  lift.under = { x: 128, y: 120 };
  lift.waits = () => true;
  lift.enter(LIFT_ROOM);
  const rng = new Random(RANDOM);
  const drawn = [lift.tick(rng), lift.tick(rng), lift.tick(rng)];
  check('ENHANCED: a held lift is drawn once, at rest (the shortest piece), then not again', drawn[0] === true && drawn[1] === false && drawn[2] === false && lift.drawnLength === 1 && lift.phase === 0);
  check('and draws no random number', rng.index === new Random(RANDOM).index && rng.sum === new Random(RANDOM).sum);
  lift.under = { x: 100, y: 120 };
  check('out from under it, it moves at once', lift.tick(rng) === true && lift.phase === 1);
  const plain = new Lift();
  plain.under = { x: 128, y: 120 };
  plain.enter(LIFT_ROOM);
  check('ORIGINAL: the same lift moves at once, the man under it or not', plain.tick(rng) === true && plain.phase === 1);
}

finish();
