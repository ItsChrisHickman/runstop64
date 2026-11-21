/**
 * Japan, played by a bot from China's junk to the cargo ship's gangway (docs/dosvidaniya-japan.md): the bot (bot.ts) searches the game's own frames for a way to each
 * goal in japan-route.ts (every coin, both sushi, the daruma, the fish food and the hood, the trains, the paper doors, the koi, the guard and all), plays it, and the
 * game must be where the goal says, alive, in ORIGINAL and in ENHANCED. It starts where a player does after China: on the quay at the junk's deck with Moscow's, Siberia's
 * and China's finds and the rice hat on. (The gates' proofs, the loops and the no-trap checks are in japan-mechanisms.ts.)
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/japan.ts [original|enhanced]
 */
import { enterRoom } from '../../montyotr/src/ending';
import { wear } from '../../montyotr/src/items';
import { frame, NONE } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { WORLD } from '../src/data';
import { CHI } from '../src/china';
import { JP } from '../src/japan';
import { newGame, play, search } from './bot';
import { JAPAN_LEGS } from './japan-route';
import { itemIndex, standY } from './route';

const only = process.argv[2];

/** The rooms and finds of Japan in the tables: the rooms from the harbour on. */
const japanese = (room: number) => room >= JP.harbour;

for (const mode of ['original', 'enhanced'] as const) {
  if (only !== undefined && only !== mode) continue;
  let live = newGame(WORLD, mode === 'enhanced');
  // Moscow, Siberia and China done: every find of theirs is his, the rice hat worn
  for (let i = 0; i < live.g.siCollected.length; i++) if (!japanese(live.g.data.specialItems[i * 4] ?? 0)) live.g.siCollected[i] = 0x81;
  wear(live.g, itemIndex(live.g, CHI.top, 0));
  enterRoom(live.g, JP.harbour, 0x0c + 4 * 4, standY(17));
  for (let n = 0; n < 200 && (live.g.freeze || live.g.script); n++) frame(live, NONE);

  let frames = 0, nodes = 0;
  for (const leg of JAPAN_LEGS) {
    const t0 = Date.now();
    const stats = { exhausted: false };
    const found = search(live, leg.goal, leg.aim, 600000, 1.5, stats);
    if (!found) { check(`${mode}: ${leg.name}: a way (${stats.exhausted ? 'every state looked at' : 'the search limit'})`, false); break; }
    const next = play(live, found.route);
    const ok = next !== null && leg.goal(next.g);
    frames += found.route.reduce((n, [, f]) => n + f, 0);
    nodes += found.nodes;
    check(`${mode}: ${leg.name} (${found.route.reduce((n, [, f]) => n + f, 0)} frames, ${found.nodes} states, ${((Date.now() - t0) / 1000).toFixed(1)}s)`, ok);
    if (next) console.log(`   now in room ${next.g.roomId} at ${next.g.montyCol - 4},${next.g.montyRow - 3} y ${next.g.y} falling ${next.g.falling} action ${next.g.montyAction} arc ${next.g.arcIdx} rope ${next.g.onRope} counter ${next.g.actionCounter} script ${next.g.script ? 'yes' : 'no'}`);
    if (!next || !ok) break;
    live = next;
  }
  const g = live.g;
  const coins = g.data.coinTable.length / 3;
  const mine = (i: number) => japanese(g.data.coinTable[i * 3] ?? 0);
  const mineCoins = Array.from({ length: coins }, (_, i) => i).filter(mine);
  const coinsLeft = mineCoins.filter((i) => !g.coinCollected[i]).length;
  const found = Array.from({ length: g.data.specialItems.length / 4 }, (_, i) => i).filter((i) => japanese(g.data.specialItems[i * 4] ?? 0));
  const itemsLeft = found.filter((i) => !g.siCollected[i]).length;
  check(`${mode}: at the end all ${mineCoins.length} coins, both sushi, the daruma, the fish food and the hood of Japan are taken (${coinsLeft} coins, ${itemsLeft} items left), ${g.score} points (${mineCoins.length} x 50 + ${found.length} x 200), he is on the ship's deck at the port (room ${g.roomId}), in the ninja hood`,
    coinsLeft === 0 && itemsLeft === 0 && found.length === 5 && g.score === mineCoins.length * 50 + found.length * 200 && g.roomId === JP.port && g.worn === itemIndex(g, JP.mole, 0));
  console.log(`${mode}: ${frames} frames played, ${nodes} states searched`);
}
finish();
