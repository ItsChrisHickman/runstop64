/**
 * The Andes and the Amazon, played by a bot from the cargo plane's hold to the kapok's crown branch, the way out to Rio (docs/dosvidaniya-reset.md): the bot (bot.ts) searches the game's own frames for a way to each goal in andes-route.ts
 * (every coin, the three empanadas, the chullo, the panpipes and the machete; the two flight rooms and their condors and updrafts, the llamas and the cuy, the boulders, the spitting llama, the lattice, the toucan and the sloth, the rotten logs, the
 * vines, the piranhas and the river, the anaconda and the jaguar all in the way), plays it, and the game must be where the goal says, alive, in ORIGINAL and in ENHANCED. It starts where a player does after the Pacific: in the plane's hold with Moscow's, Siberia's, China's, Japan's and the Pacific's finds and the lei on, the rear door open.
 * (The gates' proofs, the loops and the no-trap checks are in andes-mechanisms.ts.)
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/andes.ts [original|enhanced] [first leg] [last leg]
 */
import { enterRoom } from '../../montyotr/src/ending';
import { wear } from '../../montyotr/src/items';
import { frame, NONE } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { WORLD } from '../src/data';
import { AND } from '../src/andes';
import { PAC } from '../src/pacific';
import { newGame } from '../../shared/monty/test/bot';
import { readArgs, runLegs } from '../../shared/monty/test/legs';
import { ROUTES } from './routes-dir';
import { ANDES_LEGS, CHULLO } from './andes-route';
import { itemIndex, standY } from './route';

const args = readArgs();
const only = args.only;

const andes = (room: number) => (Object.values<number>(AND)).includes(room);

for (const mode of ['original', 'enhanced'] as const) {
  if (only !== undefined && only !== 'all' && only !== mode) continue;
  const live0 = newGame(WORLD, mode === 'enhanced');
  // Moscow, Siberia, China, Japan and the Pacific done: every find of theirs is his, the lei worn
  for (let i = 0; i < live0.g.siCollected.length; i++) if (!andes(live0.g.data.specialItems[i * 4] ?? 0)) live0.g.siCollected[i] = 0x81;
  wear(live0.g, itemIndex(live0.g, PAC.waikiki, 1));
  enterRoom(live0.g, PAC.plane, 0x0c + (26 + 4) * 4, standY(16));
  for (let n = 0; n < 200 && (live0.g.freeze || live0.g.script); n++) frame(live0, NONE);

  const { live, frames, nodes } = runLegs({ dir: ROUTES, region: 'andes', mode, legs: ANDES_LEGS, start: live0, args, plan: [[60000, 1.5], [600000, 3]] });
  if (args.first === 0 && (args.last ?? ANDES_LEGS.length) >= ANDES_LEGS.length) {
    const g = live.g;
    const coins = g.data.coinTable.length / 3;
    const mineCoins = Array.from({ length: coins }, (_, i) => i).filter((i) => andes(g.data.coinTable[i * 3] ?? 0));
    const coinsLeft = mineCoins.filter((i) => !g.coinCollected[i]).length;
    const found = Array.from({ length: g.data.specialItems.length / 4 }, (_, i) => i).filter((i) => andes(g.data.specialItems[i * 4] ?? 0));
    const itemsLeft = found.filter((i) => !g.siCollected[i]).length;
    check(`${mode}: at the end all ${mineCoins.length} coins, the chullo, the panpipes, the machete and the three empanadas of the Andes are taken (${coinsLeft} coins, ${itemsLeft} items left), ${g.score} points (${mineCoins.length} x 50 + ${found.length} x 200), he is on the kapok's branch, the way out to Rio (room ${g.roomId}), in the chullo`,
      coinsLeft === 0 && itemsLeft === 0 && mineCoins.length === 9 && found.length === 6 && g.score === mineCoins.length * 50 + found.length * 200 && g.roomId === AND.kapok && g.worn === itemIndex(g, AND.terraces, CHULLO));
  }
  console.log(`${mode}: ${frames} frames played, ${nodes} states searched`);
}
finish();
