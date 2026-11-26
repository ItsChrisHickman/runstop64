/**
 * Hawaii, played by a bot from Japan's cargo ship to Hilo's biplane (docs/dosvidaniya-back-half-plan.md, "Hawaii"): the bot (bot.ts) searches the game's own frames for a way to each goal in
 * pacific-route.ts (every coin, the lei, the snorkel, the three musubi, the parachute and the coffee; the pistons, the torches, the rocks, the surf, the cars, the wave, the moray, the surge, the shark, the
 * lava, the cracking crust, the vent and every creature in the way), plays it, and the game must be where the goal says, alive, in ORIGINAL and in ENHANCED. It starts where a player does after Japan: on the cargo ship's landing with
 * Moscow's, Siberia's, China's and Japan's finds and the ninja hood on. (The gates' proofs and the mechanisms are in pacific-mechanisms.ts.)
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/pacific.ts [original|enhanced] [--room <rooms>] [first leg] [last leg] [--record] [--full]
 */
import { enterRoom } from '../../montyotr/src/ending';
import { wear } from '../../montyotr/src/items';
import { frame, NONE } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { WORLD } from '../src/data';
import { FLY } from '../src/sky';
import { JP } from '../src/japan';
import { PAC } from '../src/pacific';
import { newGame } from '../../shared/monty/test/bot';
import { readArgs, runLegs } from '../../shared/monty/test/legs';
import { prints, SCOPE } from './scope';
import { ROUTES } from './routes-dir';
import { PACIFIC_LEGS } from './pacific-route';
import { itemIndex, standY } from './route';

const args = readArgs();
const only = args.only;

/** The rooms of the Pacific. */
const pacific = (room: number) => Object.values<number>(PAC).includes(room);

/** What the kept leg states are checked against (read once). */
const PRINTS = prints();

for (const mode of ['original', 'enhanced'] as const) {
  if (only !== undefined && only !== 'all' && only !== mode) continue;
  const live0 = newGame(WORLD, mode === 'enhanced');
  // Moscow, Siberia, China and Japan done: every find of theirs is his, the ninja hood worn
  for (let i = 0; i < live0.g.siCollected.length; i++) if ((live0.g.data.specialItems[i * 4] ?? 0xff) < PAC.ship) live0.g.siCollected[i] = 0x81;
  wear(live0.g, itemIndex(live0.g, JP.mole, 0));
  enterRoom(live0.g, PAC.ship, 0x0c + 4 * 4, standY(13));
  for (let n = 0; n < 200 && (live0.g.freeze || live0.g.script); n++) frame(live0, NONE);

  const { live, frames, nodes, complete } = runLegs({ dir: ROUTES, region: 'pacific', mode, legs: PACIFIC_LEGS, start: live0, args, scope: SCOPE, prints: PRINTS, plan: [[60000, 1.5], [400000, 0], [600000, 3]] }); // a breadth-first look second: in the sea a weighted look can keep, for a place, a state that times the surge and the shark badly
  if (complete) {
    const g = live.g;
    const coins = g.data.coinTable.length / 3;
    const mineCoins = Array.from({ length: coins }, (_, i) => i).filter((i) => pacific(g.data.coinTable[i * 3] ?? 0));
    const coinsLeft = mineCoins.filter((i) => !g.coinCollected[i]).length;
    const found = Array.from({ length: g.data.specialItems.length / 4 }, (_, i) => i).filter((i) => pacific(g.data.specialItems[i * 4] ?? 0));
    const itemsLeft = found.filter((i) => !g.siCollected[i]).length;
    check(`${mode}: at the end all ${mineCoins.length} coins of Hawaii, the lei, the snorkel, the three musubi, the parachute and the coffee are taken (${coinsLeft} coins, ${itemsLeft} items left), he is off in the biplane, in the flight's first leg (room ${g.roomId}), in the lei`,
      mineCoins.length >= 25 && coinsLeft === 0 && itemsLeft === 0 && found.length === 7 && g.roomId === FLY.mail && g.worn === itemIndex(g, PAC.luau, 0));
  }
  console.log(`${mode}: ${frames} frames played, ${nodes} states searched`);
}
finish();
