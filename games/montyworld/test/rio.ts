/**
 * Rio, played by a bot from the Amazon's last bank to the beach (docs/dosvidaniya-rio.md): the bot (bot.ts) searches the game's own frames for a way to each goal in rio-route.ts (every coin,
 * the six skewers, the key to the city and the headdress; the cable car, the gauchos' skewers, the steward, the floats and the tram all in the way), plays it, and the game
 * must be where the goal says, alive, in ORIGINAL and in ENHANCED. It starts in the quay (enterRoom) with the earlier regions' finds and the Andes' chullo on, as a player arrives off the river: the join with the Andes' last bank is proved in rio-mechanisms.ts, both ways.
 * (The gates' proofs, the loops and the no-trap checks are in rio-mechanisms.ts.)
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/rio.ts [original|enhanced] [first leg] [last leg]
 */
import { enterRoom } from '../../montyotr/src/ending';
import { wear } from '../../montyotr/src/items';
import { frame, NONE } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { WORLD } from '../src/data';
import { AND } from '../src/andes';
import { RIO_ROOM } from '../src/rio';
import { newGame } from '../../shared/monty/test/bot';
import { readArgs, runLegs } from '../../shared/monty/test/legs';
import { ROUTES } from './routes-dir';
import { RIO_LEGS } from './rio-route';
import { itemIndex, standY } from './route';

const args = readArgs();
const only = args.only;

const rio = (room: number) => room >= RIO_ROOM.quay && room <= RIO_ROOM.bust;

for (const mode of ['original', 'enhanced'] as const) {
  if (only !== undefined && only !== 'all' && only !== mode) continue;
  const live0 = newGame(WORLD, mode === 'enhanced');
  // Moscow, Siberia, China, Japan and the Pacific done: every find of theirs is his, the lei worn
  for (let i = 0; i < live0.g.siCollected.length; i++) if (!rio(live0.g.data.specialItems[i * 4] ?? 0)) live0.g.siCollected[i] = 0x81;
  wear(live0.g, itemIndex(live0.g, AND.boat, 0));
  enterRoom(live0.g, RIO_ROOM.quay, 0x0c + (0 + 4) * 4, standY(8));
  for (let n = 0; n < 200 && (live0.g.freeze || live0.g.script); n++) frame(live0, NONE);

  const { live, frames, nodes } = runLegs({ dir: ROUTES, region: 'rio', mode, legs: RIO_LEGS, start: live0, args, plan: [[60000, 1.5], [600000, 3]] });
  if (args.first === 0 && (args.last ?? RIO_LEGS.length) >= RIO_LEGS.length) {
    const g = live.g;
    const coins = g.data.coinTable.length / 3;
    const mineCoins = Array.from({ length: coins }, (_, i) => i).filter((i) => rio(g.data.coinTable[i * 3] ?? 0));
    const coinsLeft = mineCoins.filter((i) => !g.coinCollected[i]).length;
    const found = Array.from({ length: g.data.specialItems.length / 4 }, (_, i) => i).filter((i) => rio(g.data.specialItems[i * 4] ?? 0) && i !== itemIndex(g, RIO_ROOM.bust, 0));
    const itemsLeft = found.filter((i) => !g.siCollected[i]).length;
    check(`${mode}: at the end all ${mineCoins.length} coins, the key to the city, the headdress and the six skewers of Rio are taken (${coinsLeft} coins, ${itemsLeft} items left), ${g.score} points (${mineCoins.length} x 50 + ${found.length} x 200), he is on the beach (room ${g.roomId}), in the headdress`,
      coinsLeft === 0 && itemsLeft === 0 && found.length === 8 && g.score === mineCoins.length * 50 + found.length * 200 && g.roomId === RIO_ROOM.bust && g.worn === itemIndex(g, RIO_ROOM.steak, 0));
  }
  console.log(`${mode}: ${frames} frames played, ${nodes} states searched`);
}
finish();
