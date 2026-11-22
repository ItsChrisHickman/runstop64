import { CREDIT } from '../../shared/ending/credits';
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
    // (a place is shown long enough for its credits to be typed on, held and gone, and for its route)
    frames: Math.max(p.frames ?? 0, 400, p.credits.length * (CREDIT.slot + CREDIT.gap) + 60),
    ...(p.creditRow !== undefined ? { creditRow: p.creditRow } : {}),
  };
});

/** What a creature's name is on the parade: its key, in capitals and in words (a Japanese kind's `jp` left off). */
const nameOf = (key: string): string => key.replace(/^jp(?=[A-Z])/, '').replace(/([a-z])([A-Z])/g, '$1 $2').toUpperCase();

/**
 * The creatures that parade, in the order of the journey: the world has ninety (a parade of them all is four minutes by itself), so each region gives the ones it is known by, two dozen in all, each seen once under its name.
 * By the key of the art (the enemy type it has in the tables is its place in the art's list).
 */
const PARADE = [
  'matryoshka', 'guard', 'babushka', 'cossack', 'wolf', 'reindeer', 'yeti', 'panda', 'lion', 'kite', 'jpSumo', 'jpNinja', 'jpLuckyCat', 'pacTurtle', 'pacManta', 'pacHula',
  'condor', 'llama', 'toucan', 'gaucho', 'steward', 'vulture', 'bonde', 'dancer',
] as const;
const KEYS = Object.keys(WORLD_CREATURES);
const CAST: MontyEnding['cast'] = PARADE.map((key) => {
  const at = KEYS.indexOf(key);
  if (at < 0) throw new Error(`no creature ${key}`);
  return { types: [FIRST_CREATURE + at], name: nameOf(key) };
});

export const WORLD_ENDING: MontyEnding = {
  title: 'DO SVIDANIYA MONTY',
  scenes: SCENES,
  cast: CAST,
  castRooms: Array.from({ length: RIO_ROOM.bust + 1 }, (_, i) => i),
  closing: CLOSING,
};
