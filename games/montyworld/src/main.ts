import type { Host } from 'c64kit';
import { runMonty } from '../../montyotr/src/session';
import { WORLD } from './data';

/**
 * Monty Mole: World Tour: Monty on the Run's engine (games/montyotr/src, `runMonty`) on this game's data (data.ts): the music,
 * the shared pause screen with the map and travel, ENHANCED's assists, autosave and continue (games/shared). Not listed in the
 * directory yet (games/registry.ts): it loads at #montyworld while it is built (docs/worldtour-plan.md).
 */
export { info } from './info';

export function run(host: Host) {
  return runMonty(host, WORLD);
}
