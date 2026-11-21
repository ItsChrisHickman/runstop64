import type { Host } from 'c64kit';
import { montyCodec } from '../../montyotr/src/save';
import { runMonty } from '../../montyotr/src/session';
import { WORLD } from './data';

/**
 * Do Svidaniya Monty: Monty on the Run's engine (games/montyotr/src, `runMonty`) on this game's data (data.ts): the music,
 * the shared pause screen with the map and travel, ENHANCED's assists, autosave and continue (games/shared). Not listed in the
 * directory yet (games/registry.ts): it loads at #montyworld while it is built (docs/dosvidaniya-plan.md).
 */
export { info } from './info';

/** Its own save codec (the save envelope's `game` is its id, `format` this): the shape is Monty's, with what he wears. */
export const CODEC = montyCodec('Do Svidaniya Monty');

export function run(host: Host) {
  return runMonty(host, WORLD, { codec: CODEC });
}
