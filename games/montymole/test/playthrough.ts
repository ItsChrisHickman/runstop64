/**
 * The whole game played from the opening scene to the ending, in lockstep with the original: a bot (test/bot.ts) plays the rebuilt game on copies of itself, the keys it
 * finds are pressed on the original, and every pass of the rebuilt game is compared with it (test/lockstep-core.ts, the opening's layout and then the room loop's, with the
 * original's state from `build/opening.state`). The game is the rebuild of a fixed original, so the keys stay good and are kept in test/demos/game.keys (one base-32 digit
 * a pass); `plan` makes them again (the search is most of what it costs). The run is the whole game: the opening's pot and its way out, every one of the 64 pieces of coal
 * (so the four gates open: 16, 32, 48, 64), the tools the guarded pieces need, the pit and the castle, and the ending.
 *
 *   nice -n 15 node tools/test.mjs games/montymole/test/playthrough.ts [plan]
 */
import fs from 'node:fs';
import { unpackState } from '../../../tools/zx/snapshot';
import { Spectrum, press } from '../../../tools/zx/spectrum';
import { readRom } from '../../../tools/zx/boot';
import { check, finish } from '../../../games/shared/test/check';
import { Game } from '../src/game';
import { ROOMS } from '../src/data/rooms-data';
import { KEY_NAMES } from '../src/controls';
import { Goals, NEXT_ROOM, piecesLeft, Planner, type Target } from './bot';
import { A, OPENING_LAYOUT, Run, Tally, type Driver, type Keep } from './lockstep-core';

const STATE = 'games/montymole/build/opening.state';
const DEMO = 'games/montymole/test/demos/game.keys';
const KEEP: Keep = { opening: true, coal: true, object: true, enemies: true, crusher: true, floor: true, conveyors: true, room17: true, gate: true };

/** The original's seed (`$5C76`) when the scene begins: the rebuilt game's generator starts from it, as the lockstep's does. */
function startSeed(): number {
  const m = new Spectrum(readRom('games/montymole/build/48.rom'));
  unpackState(m, new Uint8Array(fs.readFileSync(STATE)));
  return (m.mem[A.seed] ?? 0) | ((m.mem[A.seed + 1] ?? 0) << 8);
}

/** The keys of the whole game, found by playing it: each target, in order, the nearest way to it. */
function plan(): number[] {
  const game = new Game();
  game.random.seed = startSeed();
  const goals = new Goals(new Planner(game), (message) => console.log(`   ${message}`));
  const must = (what: string, target: Target): void => goals.must(what, target);
  game.newGame();
  must('pass the pot (x $40)', { kind: 'gift' });
  must('leave the scene for room 0', { kind: 'room', room: 0 });
  for (const room of ROOMS) {
    for (;;) {
      const left = piecesLeft(game, room.id);
      if (left.length === 0) break;
      must(`room ${room.id}: a piece of coal (${left.join(', ')} left)`, { kind: 'pieces', ids: left });
    }
    const next = NEXT_ROOM[room.id] ?? 21;
    must(`room ${room.id}: the way on`, next === 21 ? { kind: 'ending' } : { kind: 'room', room: next });
  }
  return goals.keys;
}

const readDemo = (): number[] => [...fs.readFileSync(DEMO, 'utf8').trim()].map((c) => parseInt(c, 32));

/** Presses a recorded game's keys, a pass at a time on the original. */
class Replay implements Driver {
  at = 0;
  constructor(private readonly keys: readonly number[]) {}
  choose(m: Spectrum): void {
    const keys = this.keys[this.at++] ?? 0;
    for (const [bit, name] of KEY_NAMES) press(m, name, (keys & bit) !== 0);
  }
}

if (process.argv.slice(2).includes('plan')) {
  const keys = plan();
  fs.mkdirSync('games/montymole/test/demos', { recursive: true });
  fs.writeFileSync(DEMO, `${keys.map((k) => k.toString(32)).join('')}\n`);
  console.log(`   recorded the game: ${keys.length} passes`);
  process.exit(0);
}

const keys = readDemo();
const tally = new Tally();
const run = new Run(tally, STATE, 'the whole game', 1, false, undefined, KEEP, OPENING_LAYOUT);
run.intoRooms = true;
const replay = new Replay(keys);
let furthest = 0;
run.hooks.passEnd = () => { furthest = Math.max(furthest, run.game.room === 0x2c ? 0 : run.game.room); };
run.play(replay, keys.length + 50);
console.log(`   ${tally.passes} passes compared, ${tally.deaths} deaths, ${tally.roomChanges} room changes, the last room ${run.game.room}, score ${run.game.score.value}, coal taken ${run.game.coal.taken}`);
for (const f of tally.first) console.log(`   ${f.label} pass ${f.pass} room ${f.room}: ${f.what.join('; ')}`);
check(`the whole game from the opening scene to the ending, ${keys.length} passes, every pass equal to the original (${tally.mismatches} differ)`, tally.mismatches === 0);
check(`it ends in the ending with all 64 pieces of coal taken and the most there is scored (${run.game.score.value})`, run.last === 'ending' && run.game.coal.taken === 64 && tally.mismatches === 0);
finish();
