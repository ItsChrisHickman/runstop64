/**
 * Siberia, played by a bot from Moscow's carriage roof to the village's barrier (docs/dosvidaniya-siberia.md): the bot (bot.ts) searches
 * the game's own frames for a way to each goal in siberia-route.ts (every coin, both pelmeni, the ticket, the lamp, tunnel mouths and cracking
 * ice and all), plays it, and the game must be where the goal says, alive, in ORIGINAL and in ENHANCED. It starts where a player does after
 * Moscow: on the station's roof, with Moscow's four finds and the hat on. The way back is checked too: the dining car's roof walks west to Moscow.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/siberia.ts [original|enhanced]
 */
import { enterRoom } from '../../montyotr/src/ending';
import { wear } from '../../montyotr/src/items';
import { frame, NONE } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { WORLD } from '../src/data';
import { ROOM } from '../src/moscow';
import { SIB } from '../src/siberia';
import { newGame, play, search } from './bot';
import { itemIndex, standY } from './route';
import { SIBERIA_LEGS } from './siberia-route';

const only = process.argv[2];

/** The rooms and finds of Siberia in the tables: the rooms from the dining car on. */
const siberian = (room: number) => room >= SIB.gravy;

for (const mode of ['original', 'enhanced'] as const) {
  if (only !== undefined && only !== mode) continue;
  let live = newGame(WORLD, mode === 'enhanced');
  // Moscow done: the token, the ushanka (worn) and the two pirozhki are his
  for (let i = 0; i < 4; i++) live.g.siCollected[i] = 0x81;
  wear(live.g, itemIndex(live.g, ROOM.platform, 1));
  enterRoom(live.g, ROOM.station, 0x0c + (20 + 4) * 4, standY(9));
  for (let n = 0; n < 200 && (live.g.freeze || live.g.script); n++) frame(live, NONE);

  let frames = 0, nodes = 0;
  for (const leg of SIBERIA_LEGS) {
    const t0 = Date.now();
    const stats = { exhausted: false };
    const found = search(live, leg.goal, leg.aim, 600000, 1.5, stats);
    if (!found) { check(`${mode}: ${leg.name}: a way (${stats.exhausted ? 'every state looked at' : 'the search limit'})`, false); break; }
    const next = play(live, found.route);
    const ok = next !== null && leg.goal(next.g);
    frames += found.route.reduce((n, [, f]) => n + f, 0);
    nodes += found.nodes;
    check(`${mode}: ${leg.name} (${found.route.reduce((n, [, f]) => n + f, 0)} frames, ${found.nodes} states, ${((Date.now() - t0) / 1000).toFixed(1)}s)`, ok);
    if (!next || !ok) break;
    live = next;
  }
  const g = live.g;
  const coins = g.data.coinTable.length / 3;
  const mine = (i: number) => siberian(g.data.coinTable[i * 3] ?? 0);
  const coinsLeft = Array.from({ length: coins }, (_, i) => i).filter((i) => mine(i) && !g.coinCollected[i]).length;
  const found = Array.from({ length: g.data.specialItems.length / 4 }, (_, i) => i).filter((i) => siberian(g.data.specialItems[i * 4] ?? 0));
  const itemsLeft = found.filter((i) => !g.siCollected[i]).length;
  const sibCoins = Array.from({ length: coins }, (_, i) => i).filter(mine).length;
  check(`${mode}: at the end all ${sibCoins} coins, both pelmeni, the ticket and the lamp of Siberia are taken (${coinsLeft} coins, ${itemsLeft} items left), ${g.score} points (${sibCoins} x 50 + ${found.length} x 200), he is in the village (room ${g.roomId})`,
    coinsLeft === 0 && itemsLeft === 0 && found.length === 4 && g.score === sibCoins * 50 + found.length * 200 && g.roomId === SIB.border);
  console.log(`${mode}: ${frames} frames played, ${nodes} states searched`);
}
finish();
