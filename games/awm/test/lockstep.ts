/**
 * Monty alone, the original and the rebuild side by side: the same joystick at every logic step, and after
 * each step the same things in both (his place, state, step, room, lives, the cells of the room, the random
 * generator, his picture, the bytes of his animation).
 *
 *   nice -n 15 node tools/test.mjs games/awm/test/lockstep.ts games/awm/build/play.state "R:100,UR:30,F:1"
 *   nice -n 15 node tools/test.mjs games/awm/test/lockstep.ts games/awm/build/play.state rand:2000:7
 *   nice -n 15 node tools/test.mjs games/awm/test/lockstep.ts games/awm/build/play.state sweep:300:1
 *   ROOMS=0-19 nice -n 15 node tools/test.mjs games/awm/test/lockstep.ts games/awm/build/play.state kinds:120:1
 *   nice -n 15 node tools/test.mjs games/awm/test/lockstep.ts games/awm/build/play.state deliver:200:2
 *   ROOMS=0-1 nice -n 15 node tools/test.mjs games/awm/test/lockstep.ts games/awm/build/play.state fly:40:1
 *
 * A plan is `joystick:logic steps` pieces, joystick any of U D L R F or - for nothing. `rand:N:seed` is N steps
 * of a random player. `sweep:N:seed` starts Monty in each of the 80 rooms (on the first free spot with floor
 * under it the room has, picked by the seed) and plays N random steps in each; it reports how many steps match
 * before the two part. `kinds:N:seed` starts next to each kind of tile, item, enemy and lift of every room and at each edge;
 * `deliver:N:seed` walks into the rooms that want an item (or have a script) from every side, carrying what they want;
 * `fly:N:seed` boards the plane of each room that has one (with a ticket, holding the stick four ways, and without), then plays N random steps.
 * ROOM=n or ROOMS=a-b limits the sweep and kinds plans to some rooms (kinds takes about 4 minutes per 25 rooms). At the
 * end of a run the entry points of the stage-3 code that the original reached are listed. RESYNC=1 carries on after a difference (the rebuild is set to the original's state) and
 * counts every one, for finding more than one cause in a run. ROOM=n runs one room of a sweep.
 *
 * Everything is on by default (stage 3): the enemies, the items with score, money and progress, the lifts and
 * the room scripts, compared at every step. NEUTRAL=enemies,items,lifts takes a group out of the data the
 * original reads (the 80 rooms' enemy records become empty ones, every item is marked collected, the lift
 * table points at no room) and out of the rebuild alike, to find which group a difference belongs to. The
 * music and the rest of the main loop run as they do. A step is the main loop's logic step ($54AE-$5510 and
 * the death handling after it), seen at $551A. A step that boards a plane ($758F: the Commodore key, `C` in a plan) is the whole flight
 * and the landing: the stick of that step is held through it (test/flight.ts compares the flight frame by frame).
 *
 * CARRY=11,12 puts those item types into Monty's hands at the start (in both), for the rooms that want them.
 */
import fs from 'node:fs';
import { C64Machine, unpackState } from 'c64kit';
import { DROP, SEQUENCES, WOBBLE } from '../src/enemies';
import { LIFT_SITES } from '../src/lifts';
import { decodeStick } from '../src/input';
import { applyOriginal, CARRY, diffOf, flyThrough, KEY, makeGame, plannedRuns, readPort, startOriginal } from './harness';

const [stateFile, planArg = 'R:100'] = process.argv.slice(2);
if (!stateFile) throw new Error('usage: lockstep.ts <play.state> [plan | rand:N:seed | sweep:N:seed]');
const state = unpackState(new Uint8Array(fs.readFileSync(stateFile)));

// ---- what the original ran: entry points of the stage-3 code, counted over a run -------------------------

const POINTS: ReadonlyMap<number, string> = new Map([
  [0x5f46, 'enemy type 1'], [0x5f6c, 'enemy type 2'], [0x5f7c, 'enemy type 3'], [0x5fcb, 'enemy type 4'], [0x6012, 'enemy type 5'],
  [0x6056, 'enemy type 6'], [0x608b, 'enemy type 7'], [0x60f8, 'enemy type 8'], [0x601d, 'enemy type 10'], [0x60c3, 'enemy type 11'],
  [0x6144, 'enemy type 12'], [0x6060, 'enemy type 13'], [0x609a, 'enemy type 14'], [0x6107, 'enemy type 15'], [0x60cd, 'enemy type 16'],
  [0x607b, 'enemy type 17'], [0x60b3, 'shooter fires'], [0x612c, 'thrower throws'], [0x611c, 'thrower turns'],
  [0x5d86, 'Monty hit by enemy or lift'], [0x85a3, 'lift catches him'], [0x5d8f, 'touches frame $80'], [0x5da7, 'room 5 quest done'],
  [0x5dd0, 'frames $55-$57 paid'], [0x5ddf, 'toll paid'], [0x5df0, 'toll refused (forced walk)'],
  [0x6af1, 'item: points'], [0x6b03, 'item: money by type'], [0x6b13, 'item: score by type'], [0x6b22, 'item: shield'],
  [0x6b2d, 'item: type 21'], [0x6b42, 'item: bonus'], [0x6b64, 'item: lucky'], [0x6b86, 'item: enemy picture'],
  [0x6b8c, 'item: walk-in'], [0x6b9f, 'item: life'], [0x6baa, 'item: carry'], [0x6bd7, 'item: carried'],
  [0x55cd, 'delivery room 16'], [0x55e3, 'delivery room 2C'], [0x5601, 'delivery room 3E'], [0x5613, 'delivery room 0B'],
  [0x54f2, 'progress bar grows'], [0x7698, 'room 1B push'], [0x76d8, 'room 1C slide'], [0x76fb, 'room 1D lands'],
  [0x4aaf, 'state E'], [0x4b91, 'state F'], [0x4ba5, 'state 10'], [0x4aca, 'state 11'], [0x4a68, 'state 12'], [0x4a6f, 'state 13'],
  [0x4bc7, 'state 10 ends (room 1B)'], [0x5594, 'room 4D ending entered'], [0x846a, 'lift rests'], [0x8477, 'lift sinks'], [0x847e, 'lift grows'],
  [0x61e5, 'controls scrambled'],
  [0x75d0, 'flight boarded'], [0x7f11, 'flight: his nose at the other plane'], [0x7f55, 'flight: the other plane at his tail'],
  [0x7f19, 'flight: the other plane shot down'], [0x7f5d, 'flight: shot down'], [0x7610, 'lands at the plane'],
]);

/** Entry points reached in the original over all the runs of this process. */
const COVER = new Map<number, number>();
function reportCover(): void {
  const hit = Array.from(POINTS).filter(([pc]) => COVER.has(pc)).map(([pc, name]) => `${name} ${COVER.get(pc)}`);
  const miss = Array.from(POINTS).filter(([pc]) => !COVER.has(pc)).map(([, name]) => name);
  console.log(`reached in the original: ${hit.join(', ')}`);
  console.log(`not reached: ${miss.join(', ') || 'none'}`);
}

// ---- one run ---------------------------------------------------------------------------------

interface Result {
  steps: number; matched: number; parted: number; first: string; roomsSeen: number; deaths: number; byField: Map<string, number>; states: Map<number, number>; hits: Map<number, number>;
}


function run(room: number, x: number, y: number, joys: readonly number[], resync: boolean, verbose: boolean, progress = 0, carry: readonly number[] = CARRY): Result {
  const orig = startOriginal(state, room, x, y, { progress, carry, points: POINTS });
  // (the room takes the original some frames to draw; its first logic steps run with the stick idle and are not compared)
  let now = orig.next(0);
  for (let i = 0; i < 20; i++) now = orig.next(0);
  const game = makeGame(now.snap.room);
  applyOriginal(game, now);
  const result: Result = { steps: 0, matched: 0, parted: 0, first: '', roomsSeen: 1, deaths: 0, byField: new Map(), states: new Map(), hits: orig.hits };
  const seen = new Set<number>([now.snap.room]);
  let lastLives = now.snap.lives;
  for (const joy of joys) {
    // the step that ends the game (the ending's 256th) never reaches the end of the main loop: nothing to compare
    if (now.snap.state === 0x13 && now.snap.step === 0xff) break;
    now = orig.next(joy);
    const theirs = now.snap;
    game.step(decodeStick(joy), (joy & KEY) !== 0);
    if (game.flying) flyThrough(game, joy);
    result.steps++;
    const diffs = diffOf(theirs, readPort(game));
    if (diffs.length === 0) {
      if (result.parted === 0) result.matched++;
    } else {
      if (result.parted === 0) result.first = `step ${result.steps}: ${diffs.slice(0, 6).join('; ')}`;
      result.parted++;
      for (const d of diffs) { const k = d.split(' ')[0]?.split('@')[0] ?? d; result.byField.set(k, (result.byField.get(k) ?? 0) + 1); }
      if (verbose) console.log(`  step ${result.steps} (joy ${joy}): ${diffs.slice(0, 6).join('; ')}`);
      if (!resync) break;
      applyOriginal(game, now);
    }
    seen.add(theirs.room);
    result.states.set(theirs.state, (result.states.get(theirs.state) ?? 0) + 1);
    if (theirs.lives < lastLives) result.deaths++;
    lastLives = theirs.lives;
    if (now.ram[0x402a]) break; // the ending: its routine takes the machine for its own picture
    if ((theirs.lives & 0x80) === 0) break; // game over: its routine takes the machine for its own picture
    if ((theirs.lives & 0x7f) <= 1) { orig.o.ram[0x4061] = 0x86; game.lives = 0x86; lastLives = 0x86; }
  }
  result.roomsSeen = seen.size;
  for (const [pc, n] of orig.hits) COVER.set(pc, (COVER.get(pc) ?? 0) + n);
  return result;
}

function statesOf(r: Result): string {
  return Array.from(r.states).sort((a, b) => a[0] - b[0]).map(([k, v]) => `$${k.toString(16)}:${v}`).join(' ');
}

// ---- main ------------------------------------------------------------------------------------

// The input table: $6283 for the 32 joysticks against the rule in src/input.ts
{
  const probe = new C64Machine();
  probe.loadState(state);
  let bad = 0;
  for (let i = 0; i < 32; i++) if ((probe.ram[0x6283 + i] ?? 0) !== decodeStick(i)) bad++;
  console.log(`input table $6283: ${32 - bad} of 32 joysticks decode as src/input.ts does`);
  if (bad) process.exit(1);
}

// The tables of stage 3 against the original's bytes
{
  const probe = new C64Machine();
  probe.loadState(state);
  const ram = probe.ram;
  const same = (what: string, mine: readonly number[], at: number): void => {
    const bad = mine.filter((b, i) => b !== ram[at + i]).length;
    checked += mine.length - bad;
    totalBytes += mine.length;
    if (bad) { console.log(`${what}: ${bad} of ${mine.length} bytes differ`); process.exit(1); }
  };
  let checked = 0, totalBytes = 0;
  same('enemy wobble $5FBB', WOBBLE, 0x5fbb);
  same('projectile drop $60E8', DROP, 0x60e8);
  const pointers = SEQUENCES.map((_, i) => (ram[0x615e + 2 * i] ?? 0) | ((ram[0x615f + 2 * i] ?? 0) << 8));
  SEQUENCES.forEach((seq, i) => same(`frame sequence ${i} ($${(pointers[i] ?? 0).toString(16)})`, seq, pointers[i] ?? 0));
  const lifts = LIFT_SITES.flatMap((l) => [l.room, l.height, l.cell & 0xff, l.cell >> 8]);
  same('lift table $852C', lifts, 0x852c);
  if (ram[0x143] !== 0x85) { console.log('the byte at $0143 is not the shield value'); process.exit(1); }
  console.log(`stage 3 tables (wobble, drop, ${SEQUENCES.length} frame sequences, lift table, shield): ${checked} of ${totalBytes} bytes as the original has them`);
}

const resync = !!process.env.RESYNC;
const verbose = !!process.env.VERBOSE;

// The runs of the plan: a scripted or random player from the snapshot's own place, or the sweep, kinds and deliver plans (harness.ts)
const probe = new C64Machine();
probe.loadState(state);
const start = { room: probe.ram[0x402b] ?? 0, x: probe.ram[0x5c3f] ?? 0x80, y: probe.ram[0x5c40] ?? 0x68 };
const single = !/^(sweep|kinds|deliver|fly)/.test(planArg);
let all = 0, total = 0, runs = 0, clean = 0;
const states = new Map<number, number>();
const fields = new Map<string, number>();
const kindsRun = new Map<string, number>();
for (const p of plannedRuns(planArg, start)) {
  const r = run(p.room, p.x, p.y, p.joys, resync, verbose || single, p.progress, p.carry);
  runs++; all += r.matched; total += r.steps; if (r.parted === 0) clean++;
  kindsRun.set(p.kind, (kindsRun.get(p.kind) ?? 0) + 1);
  for (const [k, v] of r.states) states.set(k, (states.get(k) ?? 0) + v);
  for (const [k, v] of r.byField) fields.set(k, (fields.get(k) ?? 0) + v);
  if (r.parted || verbose || planArg.startsWith('sweep') || single) {
    console.log(`${p.label}: ${r.matched}/${r.steps} steps match${r.parted ? `, parts: ${r.first}${resync ? ` (${r.parted} steps differ)` : ''}` : ''}; ${r.roomsSeen} rooms seen, ${r.deaths} deaths; states ${statesOf(r)}`);
  }
}
console.log(`${planArg}: ${clean} of ${runs} runs without a difference; ${all} of ${total} steps matched before parting`);
if (kindsRun.size > 1) console.log(`runs by kind: ${Array.from(kindsRun).map(([k, v]) => `${k} ${v}`).join(', ')}`);
console.log(`steps in each state: ${Array.from(states).sort((a, b) => a[0] - b[0]).map(([k, v]) => `$${k.toString(16)}:${v}`).join(' ')}`);
if (fields.size) console.log('differences by field: ' + Array.from(fields).map(([k, v]) => `${k} ${v}`).join(', '));
reportCover();
if (clean !== runs) process.exit(1);
