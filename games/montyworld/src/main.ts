import type { Host } from 'c64kit';
import { montyCodec, type MontySave } from '../../montyotr/src/save';
import type { SaveCodec } from '../../shared/continue';
import { montyFont as fontOf, runMonty } from '../../montyotr/src/session';
import { WORLD } from './data';
import { carryOn, fromFormat1, fromFormat2 } from './save-migrate';

/**
 * Do Svidaniya Monty: Monty on the Run's engine (games/montyotr/src, `runMonty`) on this game's data (data.ts): the music,
 * the shared pause screen with the map and travel, our assists, autosave and continue (games/shared). Not listed in the
 * directory yet (games/registry.ts): it loads at #montyworld while it is built (docs/dosvidaniya-plan.md).
 */
export { info } from './info';

/**
 * Its own save codec (the save envelope's `game` is its id, `format` this): the shape is Monty's, with what he wears. Format 2 was the reset's tables (rooms cut, moved and added: the coins' and finds'
 * places changed), format 3 today's (the parlour's prize shelf took a coin, the daruma moved to BULLET POINT's platform); a save of format 1 or 2 is read into them, and a save of any made in a room cut
 * since carries on in the room that took its place (save-migrate.ts).
 */
const TABLES = montyCodec('Do Svidaniya Monty', 3, { 1: (s) => fromFormat1(WORLD, s), 2: (s) => fromFormat2(WORLD, s) });
export const CODEC: SaveCodec<MontySave> = { ...TABLES, unpack: (bytes, format) => carryOn(WORLD, TABLES.unpack(bytes, format)) };

export function run(host: Host) {
  return runMonty(host, WORLD, { codec: CODEC });
}

/** The game's own lettering (the credits of its reward show are set in it). */
export function montyFont() {
  return fontOf(WORLD);
}
