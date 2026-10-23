/**
 * A new game's setup for many seeds: the items are scattered in different rooms, the core's pieces in
 * different places, and the setup always ends. (A seed in about 500 leaves the random numbers in a short
 * cycle, and the scattering's "draw until a free one" loops, as the original has them, would never end:
 * the full `npm run verify` hung on it once in a while, as the game could in the browser.)
 *
 *   nice -n 15 node tools/test.mjs games/starquake/test/newgame-seeds.ts
 */
import { Game } from '../src/game';
import { newGame } from '../src/flow';
import * as Items from '../src/items';
import { check, finish } from '../../shared/test/check';

/** Seeds found by a sweep whose random numbers cycle through 11 or 16 values. */
const STUCK_SEEDS = [0x41959824, 0x30781882, 0x523dbf7c, 0x3e64e7f5, 0xe0068a09];

/** Seed the generators as a new game does, without setting up. */
function seeded(seed: number): Game {
  const g = new Game();
  const R = g.rng;
  R.a = seed & 0xff; R.b = (seed >> 8) & 0xff; R.c = (seed >> 16) & 0xff; R.d = (seed >> 24) & 0xff;
  R.s1 = R.both();
  R.s2 = R.both();
  return g;
}

const stuck = STUCK_SEEDS.filter((seed) => {
  try { Items.newGame(seeded(seed)); return false; } catch (e) { return e instanceof Items.StuckScatter; }
});
check(`the ${STUCK_SEEDS.length} short-cycle seeds really do stop the scattering (stuck: ${stuck.length})`, stuck.length === STUCK_SEEDS.length);

/** Whether all of a list are different. */
const distinct = (xs: readonly number[]) => new Set(xs).size === xs.length;

for (const s of STUCK_SEEDS) {
  const g = new Game();
  let ok = true;
  try { newGame(g, s); } catch { ok = false; }
  check(`seed ${s.toString(16)} (a short cycle): a new game still starts`, ok);
}

let bad = 0;
const SEEDS = 20000;
let seed = 0x9e3779b9;
for (let i = 0; i < SEEDS; i++) {
  seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; // (a fixed sweep: the same seeds each run)
  const g = new Game();
  try { newGame(g, seed); } catch { bad++; continue; }
  const rooms = g.items.map((it) => it.roomLo | (it.roomHi << 8));
  if (!(distinct(rooms) && distinct([...g.coreSlots]) && distinct(g.items.slice(16, 20).map((it) => it.graphic)))) bad++;
}
check(`${SEEDS} seeds: every new game sets up, with different rooms, core places and graphics (bad: ${bad})`, bad === 0);
finish();
