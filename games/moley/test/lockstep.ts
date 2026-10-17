/**
 * The whole game, rebuilt (src/game.ts: Monty, the six room scripts, items, score, lives, gauge), against the original running on
 * the headless Spectrum, every pass (test/lockstep-core.ts says what is compared and how). Random players here; the rooms played to
 * their ends are in test/playthrough.ts.
 *
 * Players: random ones (keys held for a few frames: the keyboard, a Kempston joystick, Sinclair Interface 2, mixed, contradictory
 * presses) in every room from the saved state of the room; the same with the scripts' own state shaken first (each room's
 * counters and things put somewhere else in their sequence, so the later parts of the scripts are met too); and, for each kind of
 * tile in each room, Monty placed round cells of that kind in walking, jumping and falling states.
 *
 *   nice -n 15 node tools/test.mjs games/moley/test/lockstep.ts [random-passes-per-room] [placements-per-tile-kind] [pass-limit-per-placement] [shaken-runs-per-room] [passes-per-shaken-run]
 */
import fs from 'node:fs';
import { check, finish } from '../../../games/shared/test/check';
import { readRom } from '../../../tools/zx/boot';
import { unpackState } from '../../../tools/zx/snapshot';
import { Spectrum } from '../../../tools/zx/spectrum';
import { ROOM_SIZE } from '../src/data';
import { A, MAP_START, mulberry, Run, Tally } from './lockstep-core';
import { RandomPlayer } from './random-player';
import { shake, shakeExit } from './shake';

const [randomArg = '3000', placementsArg = '4', limitArg = '80', shakenArg = '6', shakenPassesArg = '300'] = process.argv.slice(2);
const RANDOM_PASSES = Number(randomArg), PLACEMENTS = Number(placementsArg), PLACEMENT_PASSES = Number(limitArg), SHAKEN = Number(shakenArg), SHAKEN_PASSES = Number(shakenPassesArg);
const STATES = 'games/moley/build';

// ---- the runs -------------------------------------------------------------------------------------------------

const rooms = [0, 1, 2, 3, 4, 5];
const tally = new Tally();
const t0 = Date.now();
const phases: { name: string; passes: number }[] = [];
const phase = (name: string, from: number): void => { phases.push({ name, passes: tally.passes - from }); };

let from = tally.passes;
for (const room of rooms) {
  const file = `${STATES}/room${room}.state`;
  const share = Math.ceil(RANDOM_PASSES / 4);
  for (let part = 0; part < 4; part++) {
    const seed = 1000 * room + part + 1;
    const rnd = mulberry(seed);
    const run = new Run(tally, file, `random room ${room}.${part}`, rnd() < 0.5);
    run.play(new RandomPlayer(rnd), share);
  }
}
phase('random players in rooms 0-5', from);

from = tally.passes;
for (const room of rooms) {
  const file = `${STATES}/room${room}.state`;
  for (let k = 0; k < SHAKEN; k++) {
    const rnd = mulberry(50000 + room * 100 + k);
    const run = new Run(tally, file, `shaken room ${room} #${k}`, rnd() < 0.5, (mem) => { shake(mem, room, rnd); if (rnd() < 0.2) mem[A.lives] = 0; }); // (a last life: the next death is game over)
    run.play(new RandomPlayer(rnd), SHAKEN_PASSES);
  }
}
phase('random players with the scripts shaken', from);

// at the exits
from = tally.passes;
for (const room of rooms) {
  for (let k = 0; k < Math.max(SHAKEN, 8); k++) {
    const rnd = mulberry(90000 + room * 100 + k);
    const run = new Run(tally, `${STATES}/room${room}.state`, `exit of room ${room} #${k}`, rnd() < 0.5, (mem) => shakeExit(mem, room, rnd));
    run.play(new RandomPlayer(rnd), 120);
  }
}
phase('random players at the exits', from);

// each kind of tile in each room
from = tally.passes;
let tileKinds = 0, segments = 0;
for (const room of rooms) {
  const file = `${STATES}/room${room}.state`;
  const original = new Spectrum(readRom());
  unpackState(original, new Uint8Array(fs.readFileSync(file)));
  const map = original.mem.slice(MAP_START + room * ROOM_SIZE, MAP_START + room * ROOM_SIZE + ROOM_SIZE);
  const cells = new Map<number, number[]>();
  map.forEach((t, i) => { const list = cells.get(t) ?? []; list.push(i); cells.set(t, list); });
  const rnd = mulberry(7000 + room);
  for (const [tile, list] of [...cells].sort((a, b) => a[0] - b[0])) {
    tileKinds++;
    for (let k = 0; k < PLACEMENTS; k++) {
      const cell = list[Math.floor(rnd() * list.length)];
      const col = cell & 31, row = cell >> 5;
      const kind = rnd();
      const place = {
        x: Math.max(2, Math.min(0xee, col * 8 + Math.floor(rnd() * 24) - 16)),
        y: Math.max(0, Math.min(0x78, row * 8 + Math.floor(rnd() * 32) - 24)),
        state: kind < 0.6 ? 0 : kind < 0.82 ? 2 : kind < 0.94 ? 1 : kind < 0.98 ? 3 : 4,
        phase: Math.floor(rnd() * 24),
        jumpKeys: [0, 1, 2, 16, 17, 18][Math.floor(rnd() * 6)],
        gauge: rnd() < 0.2 ? Math.floor(rnd() * 3) : 0x7f, // (a gauge about to run out: the time-out death)
      };
      const seed = 100000 + room * 1000 + tile * 7 + k;
      const prng = mulberry(seed);
      const run = new Run(tally, file, `room ${room} tile $${tile.toString(16)} #${k}`, prng() < 0.5, (mem) => {
        mem[A.x] = place.x; mem[A.y] = place.y; mem[A.state] = place.state; mem[A.phase] = place.phase; mem[A.jumpKeys] = place.jumpKeys; mem[A.gauge] = place.gauge;
      });
      run.play(new RandomPlayer(prng), PLACEMENT_PASSES);
      segments++;
    }
  }
}
phase(`${segments} placements round ${tileKinds} kinds of tile`, from);

const seconds = ((Date.now() - t0) / 1000).toFixed(0);
console.log(`   ${tally.passes} passes compared (${phases.map((p) => `${p.passes} ${p.name}`).join(', ')}) in ${seconds} s`);
console.log(`   ${tally.deaths} deaths, ${tally.roomChanges} room changes, ${tally.endings} endings, ${tally.gameOvers} game overs, ${tally.randoms} random numbers fed`);
console.log(`   effects: ${[...tally.sounds].sort((a, b) => a[0] - b[0]).map(([k, n]) => `${k} x${n}`).join(', ')}`);
console.log(`   covered: ${[...tally.seen].sort().map(([k, n]) => `${k} ${n}`).join(', ')}`);
if (tally.strayRestarts.length > 0) console.log(`   ${tally.strayRestarts.length} deaths jumped to an address that is not a restart routine: ${tally.strayRestarts.slice(0, 5).join('; ')}`);
for (const f of tally.first) console.log(`   ${f.label} pass ${f.pass} room ${f.room} keys ${f.keys.toString(2).padStart(5, '0')}: ${f.what.join('; ')}`);
if (tally.byField.size > 0) console.log(`   differing: ${[...tally.byField].map(([k, n]) => `${k} ${n}`).join(', ')}`);
check(`keys: the rebuilt readKeys equals the original's on every pass (${tally.keyMismatches} differ)`, tally.keyMismatches === 0);
check(`every pass: Monty, the entity table, score, lives, gauge, items, map, attributes, the scripts' variables, the pocket and the effects equal (${tally.mismatches} of ${tally.passes} passes differ)`, tally.mismatches === 0);
const exits = [0, 1, 2, 3, 4].filter((r) => (tally.seen.get(`left room ${r} for ${r + 1}`) ?? 0) === 0);
check(`every way out was taken in some run (rooms 0-4 into the next room, room 5 into the ending: ${tally.endings}) and a last life lost ended a game (${tally.gameOvers})${exits.length > 0 ? `; not taken: rooms ${exits.join(', ')}` : ''}`, exits.length === 0 && tally.endings > 0 && tally.gameOvers > 0);
check(`the random numbers: the rebuilt game asks for exactly the bytes the original read (${tally.randomMismatches} passes differ)`, tally.randomMismatches === 0);
finish();
