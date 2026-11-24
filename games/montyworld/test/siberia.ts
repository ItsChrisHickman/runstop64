/**
 * Siberia, played by a bot from Moscow's platform, through the train, to the village's barrier (docs/dosvidaniya-siberia.md): the bot (bot.ts) searches
 * the game's own frames for a way to each goal in siberia-route.ts (every coin, both pelmeni, the ticket, the lamp, tunnel mouths and cracking
 * ice and all), plays it, and the game must be where the goal says, alive, in ORIGINAL and in ENHANCED. It starts where a player does after
 * Moscow: on the platform where the Kremlin's gorge drops him (the train is boarded and climbed, the first leg), with Moscow's four finds and the hat on. (The way back west, the gangways, the loop and the no-trap checks are in siberia-mechanisms.ts.)
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/siberia.ts [original|enhanced] [--room <rooms>]
 */
import { enterRoom } from '../../montyotr/src/ending';
import { wear } from '../../montyotr/src/items';
import { frame, NONE } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { WORLD } from '../src/data';
import { ROOM } from '../src/moscow';
import { SIB } from '../src/siberia';
import { newGame } from '../../shared/monty/test/bot';
import { readArgs, runLegs } from '../../shared/monty/test/legs';
import { prints, SCOPE } from './scope';
import { ROUTES } from './routes-dir';
import { itemIndex, standY } from './route';
import { SIBERIA_LEGS } from './siberia-route';

const args = readArgs();
const only = args.only;

/** The rooms and finds of Siberia in the tables: the rooms from the dining car to the village. */
const siberian = (room: number) => room >= SIB.gravy && room <= SIB.border;

/** What the kept leg states are checked against (read once). */
const PRINTS = prints();

for (const mode of ['original', 'enhanced'] as const) {
  if (only !== undefined && only !== mode) continue;
  const live0 = newGame(WORLD, mode === 'enhanced');
  // Moscow done: the token, the ushanka (worn) and the two pirozhki are his
  for (let i = 0; i < 4; i++) live0.g.siCollected[i] = 0x81;
  wear(live0.g, itemIndex(live0.g, ROOM.platform, 1));
  enterRoom(live0.g, ROOM.station, 0x0c + (16 + 4) * 4, standY(17));
  for (let n = 0; n < 200 && (live0.g.freeze || live0.g.script); n++) frame(live0, NONE);

  const { live, frames, nodes, complete } = runLegs({ dir: ROUTES, region: 'siberia', mode, legs: SIBERIA_LEGS, start: live0, args, scope: SCOPE, prints: PRINTS, plan: [[600000, 1.5]] });
  const g = live.g;
  const coins = g.data.coinTable.length / 3;
  const mine = (i: number) => siberian(g.data.coinTable[i * 3] ?? 0);
  const coinsLeft = Array.from({ length: coins }, (_, i) => i).filter((i) => mine(i) && !g.coinCollected[i]).length;
  const found = Array.from({ length: g.data.specialItems.length / 4 }, (_, i) => i).filter((i) => siberian(g.data.specialItems[i * 4] ?? 0));
  const itemsLeft = found.filter((i) => !g.siCollected[i]).length;
  const sibCoins = Array.from({ length: coins }, (_, i) => i).filter(mine).length;
  if (complete) check(`${mode}: at the end all ${sibCoins} coins, both pelmeni, the ticket and the lamp of Siberia are taken (${coinsLeft} coins, ${itemsLeft} items left), ${g.score} points (${sibCoins} x 50 + ${found.length} x 200), he is in the village (room ${g.roomId})`,
    coinsLeft === 0 && itemsLeft === 0 && found.length === 4 && g.score === sibCoins * 50 + found.length * 200 && g.roomId === SIB.border);
  console.log(`${mode}: ${frames} frames played, ${nodes} states searched`);
}
finish();
