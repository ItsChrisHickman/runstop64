import type { Host } from 'c64kit';
import { MOTR } from './motr';
import { migrateOldSave } from './save';
import { montyFont as fontOf, runMonty } from './session';

/**
 * Monty on the Run: the runstop64 front end for the ported game, run by the Monty engine (session.ts) on this game's data
 * (motr.ts): Game is the game, Title its title screen, the music, and the shared pause screen with the map and travel, the assist,
 * autosave and continue (games/shared).
 */
export { info } from './info';
export { STRIP_Y } from './session';

export function run(host: Host) {
  return runMonty(host, MOTR, { migrate: migrateOldSave });
}

/** The game's own lettering (screen codes $40-$7F of its charset), topped up with the kit's. */
export function montyFont() {
  return fontOf(MOTR);
}
