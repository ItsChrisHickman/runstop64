/**
 * The Pacific, played by a bot from Japan's cargo ship to the plane's hold (docs/dosvidaniya-pacific.md): the bot (bot.ts) searches the game's own frames for a way to each goal in pacific-route.ts (every coin, the
 * bolt cutters, the snorkel, the lei, the parachute and the three musubi; the crushers, the torches, the cars, the swimming, the lava, the guard and the loader all in the way), plays it, and the game must be where the
 * goal says, alive, in ORIGINAL and in ENHANCED. It starts where a player does after Japan: on the cargo ship's gangway with Moscow's, Siberia's, China's and Japan's finds and the ninja hood on. (The gates' proofs, the
 * loops and the no-trap checks are in pacific-mechanisms.ts.)
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/pacific.ts [original|enhanced] [first leg] [last leg]
 */
import { enterRoom } from '../../montyotr/src/ending';
import { wear } from '../../montyotr/src/items';
import { frame, NONE } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { WORLD } from '../src/data';
import { JP } from '../src/japan';
import { PAC } from '../src/pacific';
import { newGame } from '../../shared/monty/test/bot';
import { readArgs, runLegs } from '../../shared/monty/test/legs';
import { ROUTES } from './routes-dir';
import { PACIFIC_LEGS } from './pacific-route';
import { itemIndex, standY } from './route';

const args = readArgs();
const only = args.only;

/** The rooms and finds of the Pacific in the tables: the rooms from the stern on. */
const pacific = (room: number) => (room >= PAC.stern && room <= PAC.hold) || room >= PAC.feast;

for (const mode of ['original', 'enhanced'] as const) {
  if (only !== undefined && only !== 'all' && only !== mode) continue;
  const live0 = newGame(WORLD, mode === 'enhanced');
  // Moscow, Siberia, China and Japan done: every find of theirs is his, the ninja hood worn
  for (let i = 0; i < live0.g.siCollected.length; i++) if (!pacific(live0.g.data.specialItems[i * 4] ?? 0)) live0.g.siCollected[i] = 0x81;
  wear(live0.g, itemIndex(live0.g, JP.mole, 0));
  enterRoom(live0.g, PAC.stern, 0x0c + 4 * 4, standY(13));
  for (let n = 0; n < 200 && (live0.g.freeze || live0.g.script); n++) frame(live0, NONE);

  const { live, frames, nodes } = runLegs({ dir: ROUTES, region: 'pacific', mode, legs: PACIFIC_LEGS, start: live0, args, plan: [[60000, 1.5], [600000, 3]] });
  if (args.first === 0 && (args.last ?? PACIFIC_LEGS.length) >= PACIFIC_LEGS.length) {
    const g = live.g;
    const coins = g.data.coinTable.length / 3;
    const mineCoins = Array.from({ length: coins }, (_, i) => i).filter((i) => pacific(g.data.coinTable[i * 3] ?? 0));
    const coinsLeft = mineCoins.filter((i) => !g.coinCollected[i]).length;
    const found = Array.from({ length: g.data.specialItems.length / 4 }, (_, i) => i).filter((i) => pacific(g.data.specialItems[i * 4] ?? 0));
    const itemsLeft = found.filter((i) => !g.siCollected[i]).length;
    check(`${mode}: at the end all ${mineCoins.length} coins, the cutters, the snorkel, the lei, the parachute and the four musubi of the Pacific are taken (${coinsLeft} coins, ${itemsLeft} items left), ${g.score} points (${mineCoins.length} x 50 + ${found.length} x 200), he is in the plane's hold (room ${g.roomId}), in the lei`,
      coinsLeft === 0 && itemsLeft === 0 && found.length === 8 && g.score === mineCoins.length * 50 + found.length * 200 && g.roomId === PAC.hold && g.worn === itemIndex(g, PAC.lei, 0));
  }
  console.log(`${mode}: ${frames} frames played, ${nodes} states searched`);
}
finish();
