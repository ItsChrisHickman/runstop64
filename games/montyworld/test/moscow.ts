/**
 * Moscow, played by a bot from the title's first room to the end of the Trans-Siberian's carriage (docs/dosvidaniya-moscow.md): the
 * bot (bot.ts) searches the game's own frames for a way to each goal in route.ts (every coin, both pirozhki, the token, the
 * ushanka, then out along the roof), plays it, and the game must be where the goal says, alive, in ORIGINAL and in ENHANCED.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/moscow.ts [original|enhanced]
 */
import { check, finish } from '../../shared/test/check';
import { WORLD } from '../src/data';
import { newGame, play, search } from './bot';
import { LEGS } from './route';

const only = process.argv[2];

for (const mode of ['original', 'enhanced'] as const) {
  if (only !== undefined && only !== mode) continue;
  let live = newGame(WORLD, mode === 'enhanced');
  let frames = 0, nodes = 0;
  for (const leg of LEGS) {
    const t0 = Date.now();
    const found = search(live, leg.goal, leg.aim);
    if (!found) { check(`${mode}: ${leg.name}: a way`, false); break; }
    const next = play(live, found.route);
    const ok = next !== null && leg.goal(next.g);
    frames += found.route.reduce((n, [, f]) => n + f, 0);
    nodes += found.nodes;
    check(`${mode}: ${leg.name} (${found.route.reduce((n, [, f]) => n + f, 0)} frames, ${found.nodes} states, ${((Date.now() - t0) / 1000).toFixed(1)}s)`, ok);
    if (!next || !ok) break;
    live = next;
  }
  console.log(`${mode}: ${frames} frames played, ${nodes} states searched`);
}
finish();
