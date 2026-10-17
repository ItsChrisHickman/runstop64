/**
 * The rebuilt game on its own (no original needed): a played game's snapshot brings the game back exactly, the seeded random numbers
 * are a function of the seed, and the rooms' tables are what the notes say.
 *
 *   nice -n 15 node tools/test.mjs games/moley/test/game.ts
 */
import { check, finish } from '../../../games/shared/test/check';
import { Game, ARRIVALS } from '../src/game';
import { Key } from '../src/monty';
import { type Random, SeededRandom } from '../src/random';
import { mulberry } from './lockstep-core';

/** Random numbers that can be taken back: a position in a fixed sequence. */
class Replayable implements Random {
  at = 0;
  private readonly values: number[];
  constructor(seed: number) {
    const rnd = mulberry(seed);
    this.values = Array.from({ length: 4096 }, () => Math.floor(rnd() * 256));
  }
  byte(): number { return this.values[this.at++ % this.values.length]; }
}

const KEYS = [0, 0, Key.right, Key.right, Key.left, Key.jump, Key.jump | Key.right, Key.jump | Key.left, Key.up, Key.down, Key.up | Key.right];

/** The state of a game as something comparable. */
function summary(g: Game): string {
  const s = g.snapshot();
  return `${s.numbers.join(',')}|${s.map.join(',')}|${s.attrs.join(',')}`;
}

let mismatched = 0, replays = 0;
for (let room = 0; room < 6; room++) {
  const rng = new Replayable(room + 1);
  const g = new Game(rng);
  g.enterRoom(room);
  const rnd = mulberry(100 + room);
  let keys = 0;
  for (let pass = 0; pass < 3000; pass++) {
    if (pass % 7 === 0) keys = KEYS[Math.floor(rnd() * KEYS.length)];
    if (pass % 250 === 100) { // go back: snapshot, play 60 passes, restore, play the same 60 again
      const snap = g.snapshot();
      const at = rng.at;
      const first: string[] = [];
      for (let k = 0; k < 60; k++) { g.pass(KEYS[(k * 5 + pass) % KEYS.length]); first.push(summary(g)); }
      g.restore(snap);
      rng.at = at;
      if (summary(g) !== `${snap.numbers.join(',')}|${snap.map.join(',')}|${snap.attrs.join(',')}`) mismatched++;
      for (let k = 0; k < 60; k++) { g.pass(KEYS[(k * 5 + pass) % KEYS.length]); if (summary(g) !== first[k]) mismatched++; }
      replays++;
    }
    if (g.pass(keys) !== 'playing') break;
  }
}
check(`a snapshot brings the game back exactly: ${replays} snapshots in the six rooms, each followed by 60 passes played twice (${mismatched} differences)`, replays > 30 && mismatched === 0);

const a = new SeededRandom(7), b = new SeededRandom(7), c = new SeededRandom(8);
const seqA = Array.from({ length: 100 }, () => a.byte()), seqB = Array.from({ length: 100 }, () => b.byte()), seqC = Array.from({ length: 100 }, () => c.byte());
check('the seeded generator gives the same bytes for the same seed, other bytes for another, and uses the whole range', seqA.join() === seqB.join() && seqA.join() !== seqC.join() && Math.max(...seqA) > 200 && Math.min(...seqA) < 50);

check('every room has an arrival (where Monty goes after a death or by an exit) and the first is where the original starts a game', ARRIVALS.length === 6 && ARRIVALS[0].x === 4 && ARRIVALS[0].y === 0x78);
finish();
