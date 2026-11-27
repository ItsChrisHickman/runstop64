/**
 * Japan, played by a bot from China's junk to the cargo ship's gangway (docs/dosvidaniya-japan.md): the bot (bot.ts) searches the game's own frames for a way to each
 * goal in japan-route.ts (every coin, both sushi, the daruma, the fish food and the hood, the trains, the paper doors, the koi, the guard and all), plays it, and the
 * game must be where the goal says, alive, in ORIGINAL and in ENHANCED. It starts where a player does after China: on the quay at the junk's deck with Moscow's, Siberia's
 * and China's finds and the rice hat on. (The gates' proofs, the loops and the no-trap checks are in japan-mechanisms.ts.)
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/japan.ts [original|enhanced] [--room <rooms>]
 */
import { enterRoom } from '../../montyotr/src/ending';
import { wear } from '../../montyotr/src/items';
import { frame, NONE } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { WORLD } from '../src/data';
import { CHI } from '../src/china';
import { isJapanese, JP } from '../src/japan';
import { newGame } from '../../shared/monty/test/bot';
import { readArgs, runLegs } from '../../shared/monty/test/legs';
import { prints, SCOPE } from './scope';
import { ROUTES } from './routes-dir';
import { JAPAN_LEGS } from './japan-route';
import { itemIndex, standY } from './route';

const args = readArgs();
const only = args.only;

/** The rooms and finds of Japan in the tables: the rooms from the harbour on. */
const japanese = isJapanese; // (the rooms made with Japan and those added after it shipped: SHOOT FOR THE MOON, GONE WITH THE WIND)

/** What the kept leg states are checked against (read once). */
const PRINTS = prints();

for (const mode of ['original', 'enhanced'] as const) {
  if (only !== undefined && only !== mode) continue;
  const live0 = newGame(WORLD, mode === 'enhanced');
  // Moscow, Siberia and China done: every find of theirs is his, the rice hat worn
  for (let i = 0; i < live0.g.siCollected.length; i++) if (!japanese(live0.g.data.specialItems[i * 4] ?? 0)) live0.g.siCollected[i] = 0x81;
  wear(live0.g, itemIndex(live0.g, CHI.top, 0));
  enterRoom(live0.g, JP.harbour, 0x0c + 4 * 4, standY(17));
  for (let n = 0; n < 200 && (live0.g.freeze || live0.g.script); n++) frame(live0, NONE);

  const { live, frames, nodes, complete } = runLegs({ dir: ROUTES, region: 'japan', mode, legs: JAPAN_LEGS, start: live0, args, scope: SCOPE, prints: PRINTS, plan: [[600000, 1.5]] });
  const g = live.g;
  const coins = g.data.coinTable.length / 3;
  const mine = (i: number) => japanese(g.data.coinTable[i * 3] ?? 0);
  const mineCoins = Array.from({ length: coins }, (_, i) => i).filter(mine);
  const coinsLeft = mineCoins.filter((i) => !g.coinCollected[i]).length;
  const found = Array.from({ length: g.data.specialItems.length / 4 }, (_, i) => i).filter((i) => japanese(g.data.specialItems[i * 4] ?? 0));
  const itemsLeft = found.filter((i) => !g.siCollected[i]).length;
  if (complete) check(`${mode}: at the end all ${mineCoins.length} coins, both sushi, the daruma, the fish food and the hood of Japan are taken (${coinsLeft} coins, ${itemsLeft} items left), ${g.score} points (${mineCoins.length} x 50 + ${found.length} x 200), he is on the ship's deck at the port (room ${g.roomId}), in the ninja hood`,
    coinsLeft === 0 && itemsLeft === 0 && found.length === 5 && g.score === mineCoins.length * 50 + found.length * 200 && g.roomId === JP.port && g.worn === itemIndex(g, JP.mole, 0));
  console.log(`${mode}: ${frames} frames played, ${nodes} states searched`);
}
finish();
