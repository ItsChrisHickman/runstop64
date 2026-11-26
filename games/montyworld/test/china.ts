/**
 * China, played by a bot from Siberia's border village to the junk's deck (docs/dosvidaniya-china.md): the bot (bot.ts) searches the game's own frames for a way
 * to each goal in china-route.ts (every coin, both dumplings, the key, the rice hat and the bamboo, the firecrackers, the figures' arms, the dragon and all),
 * plays it, and the game must be where the goal says, alive, in ORIGINAL and in ENHANCED. It starts where a player does after Siberia: in the village with the
 * barrier lifted, with Moscow's and Siberia's finds and the ushanka on. (The gates' proofs, the loops and the no-trap checks are in china-mechanisms.ts.)
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/china.ts [original|enhanced] [--room <rooms>]
 */
import { enterRoom } from '../../montyotr/src/ending';
import { wear } from '../../montyotr/src/items';
import { frame, NONE } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { WORLD } from '../src/data';
import { CHI } from '../src/china';
import { ROOM } from '../src/moscow';
import { SIB } from '../src/siberia';
import { newGame } from '../../shared/monty/test/bot';
import { readArgs, runLegs } from '../../shared/monty/test/legs';
import { prints, SCOPE } from './scope';
import { ROUTES } from './routes-dir';
import { CHINA_LEGS } from './china-route';
import { itemIndex, standY } from './route';

const args = readArgs();
const only = args.only;

/** The rooms and finds of China in the tables: the rooms from the wall's foot on. */
const chinese = (room: number) => (room >= CHI.wall && room <= CHI.junk) || room === CHI.heaven || room === CHI.houhai; // (HEAVEN CAN WAIT and DON'T ROCK THE BOAT were added after the flight: ids 82 and 95)

/** What the kept leg states are checked against (read once). */
const PRINTS = prints();

for (const mode of ['original', 'enhanced'] as const) {
  if (only !== undefined && only !== mode) continue;
  const live0 = newGame(WORLD, mode === 'enhanced');
  // Moscow and Siberia done: every find of theirs is his (the ticket lifts the barrier), the ushanka worn
  for (let i = 0; i < live0.g.siCollected.length; i++) if (!chinese(live0.g.data.specialItems[i * 4] ?? 0)) live0.g.siCollected[i] = 0x81;
  wear(live0.g, itemIndex(live0.g, ROOM.platform, 1));
  enterRoom(live0.g, SIB.border, 0x0c + (27 + 4) * 4, standY(17));
  for (let n = 0; n < 200 && (live0.g.freeze || live0.g.script); n++) frame(live0, NONE);

  const { live, frames, nodes, complete } = runLegs({ dir: ROUTES, region: 'china', mode, legs: CHINA_LEGS, start: live0, args, scope: SCOPE, prints: PRINTS, plan: [[600000, 1.5]] });
  const g = live.g;
  const coins = g.data.coinTable.length / 3;
  const mine = (i: number) => chinese(g.data.coinTable[i * 3] ?? 0);
  const coinsLeft = Array.from({ length: coins }, (_, i) => i).filter((i) => mine(i) && !g.coinCollected[i]).length;
  const found = Array.from({ length: g.data.specialItems.length / 4 }, (_, i) => i).filter((i) => chinese(g.data.specialItems[i * 4] ?? 0));
  const itemsLeft = found.filter((i) => !g.siCollected[i]).length;
  const chinaCoins = Array.from({ length: coins }, (_, i) => i).filter(mine).length;
  if (complete) check(`${mode}: at the end all ${chinaCoins} coins, both dumplings, the key, the rice hat and the bamboo of China are taken (${coinsLeft} coins, ${itemsLeft} items left), ${g.score} points (${chinaCoins} x 50 + ${found.length} x 200), he is on the junk's deck (room ${g.roomId}), in the rice hat`,
    coinsLeft === 0 && itemsLeft === 0 && found.length === 5 && g.score === chinaCoins * 50 + found.length * 200 && g.roomId === CHI.junk && g.worn === itemIndex(g, CHI.top, 0));
  console.log(`${mode}: ${frames} frames played, ${nodes} states searched`);
}
finish();
