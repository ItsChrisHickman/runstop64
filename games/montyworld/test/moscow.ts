/**
 * Moscow, played by a bot from the title's first room to the end of the Trans-Siberian's carriage (docs/dosvidaniya-moscow.md): the
 * bot (bot.ts) searches the game's own frames for a way to each goal in route.ts (every coin, both pirozhki, the token, the
 * ushanka, then out along the roof), plays it, and the game must be where the goal says, alive, in ORIGINAL and in ENHANCED.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/moscow.ts [original|enhanced] [--room <rooms>]
 */
import { check, finish } from '../../shared/test/check';
import { WORLD } from '../src/data';
import { newGame } from '../../shared/monty/test/bot';
import { readArgs, runLegs } from '../../shared/monty/test/legs';
import { prints, SCOPE } from './scope';
import { ROUTES } from './routes-dir';
import { ROOM } from '../src/moscow';
import { LEGS } from './route';

const args = readArgs();
const only = args.only;

/** Whether every entry of a table (a stride of bytes each, the room first) that is in one of Moscow's nine rooms (ids 0-8) is taken. */
const moscow = (table: Uint8Array, stride: number, taken: Uint8Array) => taken.every((c, i) => (table[i * stride] ?? 9) > 8 || c !== 0);

/** What the kept leg states are checked against (read once). */
const PRINTS = prints();

for (const mode of ['original', 'enhanced'] as const) {
  if (only !== undefined && only !== mode) continue;
  const { live, frames, nodes, complete } = runLegs({ dir: ROUTES, region: 'moscow', mode, legs: LEGS, start: newGame(WORLD, mode === 'enhanced'), args, scope: SCOPE, prints: PRINTS, plan: [[400000, 1.5]] });
  const g = live.g;
  if (complete) check(`${mode}: at the end every one of the 14 coins, both pirozhki and both items are taken (every room has one), ${g.score} points (14 x 50 + 4 x 200 = 1500), the roof's end (room ${g.roomId} is the station)`,
    moscow(g.data.coinTable, 3, g.coinCollected) && moscow(g.data.specialItems, 4, g.siCollected) && g.score === 1500 && g.roomId === ROOM.station);
  console.log(`${mode}: ${frames} frames played, ${nodes} states searched`);
}
finish();
