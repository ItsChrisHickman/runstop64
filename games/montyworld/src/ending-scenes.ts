import type { Scene } from '../../montyotr/src/ending-scenes';
import type { MontyEnding } from '../../montyotr/src/montydata';
import { WORLD_CREATURES } from './art/world';
import { CLOSING, PLACES } from './ending-places';
import { ROUTES } from './ending-routes';
import { FIRST_CREATURE } from './layout';
import { RIO_ROOM } from './rio';

/**
 * Do Svidaniya Monty's reward show (ENHANCED): the places (ending-places.ts) with where each starts him and the route that does what it says there (ending-routes.ts, found by `re/routes.ts`), and the creatures of the
 * whole world parading one at a time under their names after the last credit.
 */

export const SCENES: readonly Scene[] = PLACES.map((p, i): Scene => {
  const found = ROUTES[i];
  if (!found || found.room !== p.room) throw new Error(`ending-routes.ts is not the places': run re/routes.ts (place ${i})`);
  return {
    room: p.room, spot: found.spot, prepare: p.prepare, take: p.take, route: found.route, credits: p.credits,
    ...(p.frames !== undefined ? { frames: p.frames } : {}), ...(p.creditRow !== undefined ? { creditRow: p.creditRow } : {}),
  };
});

/** What a creature's name is on the parade: its key, in capitals and in words (a Japanese kind's `jp` left off). */
const nameOf = (key: string): string => key.replace(/^jp(?=[A-Z])/, '').replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase();

/** Every creature of the world, in the order its kind was made (Moscow's first, Rio's last), by the enemy type it has in the tables. */
const CAST: MontyEnding['cast'] = Object.keys(WORLD_CREATURES).map((key, i) => ({ types: [FIRST_CREATURE + i], name: nameOf(key) }));

export const WORLD_ENDING: MontyEnding = {
  title: 'DO SVIDANIYA MONTY',
  scenes: SCENES,
  cast: CAST,
  castRooms: Array.from({ length: RIO_ROOM.bust + 1 }, (_, i) => i),
  closing: CLOSING,
};
