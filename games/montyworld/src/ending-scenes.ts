import { CREDIT } from '../../shared/ending/credits';
import type { Scene } from '../../montyotr/src/ending-scenes';
import type { MontyEnding } from '../../montyotr/src/montydata';
import { WORLD_CREATURES, type WorldCreature } from './art/world';
import { STOPS } from './title-art';
import { CLOSING, PLACES } from './ending-places';
import { ROUTES } from './ending-routes';
import { FIRST_CREATURE } from './layout';
import { RIO_ROOM } from './rio';

/**
 * Do Svidaniya Monty's reward show (ENHANCED): the places (ending-places.ts) with where each starts him and the route that does what it says there (ending-routes.ts, found by `re/routes.ts`), and the creatures of the
 * whole world marching by after the last credit in a procession, a troupe from each region, Monty last.
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

/**
 * The procession after the last credit (shared/ending/procession.ts): a troupe from each region in the order of the journey, under the region's name as the title's map has it (title-art.ts `STOPS`), each creature by
 * the key of its art (the enemy type it has in the tables is its place in the art's list) and the name it goes by in the procession: what the art draws, in plain words (the art's own description). The world has
 * ninety creatures; each region sends the four it is known by. Then Monty, dancing.
 */
const TROUPES: readonly (readonly (readonly [WorldCreature, string])[])[] = [
  [['matryoshka', 'MATRYOSHKA DOLL'], ['guard', 'KREMLIN GUARD'], ['babushka', 'BABUSHKA'], ['cossack', 'COSSACK DANCER']],
  [['inspector', 'TICKET INSPECTOR'], ['yeti', 'YETI'], ['miner', 'MINER'], ['reindeer', 'REINDEER']],
  [['panda', 'PANDA'], ['warrior', 'TERRACOTTA WARRIOR'], ['lion', 'STONE LION'], ['kite', 'KITE']],
  [['jpSumo', 'SUMO WRESTLER'], ['jpNinja', 'NINJA'], ['jpLuckyCat', 'LUCKY CAT'], ['jpKoi', 'KOI']],
  [['pacHula', 'HULA DANCER'], ['pacNene', 'NENE'], ['pacTurtle', 'GREEN TURTLE'], ['pacRooster', 'ROOSTER']],
  [['llama', 'LLAMA'], ['condor', 'CONDOR'], ['jaguar', 'JAGUAR'], ['toucan', 'TOUCAN']],
  [['dancer', 'SAMBA DANCER'], ['gaucho', 'GAUCHO WAITER'], ['drummer', 'SAMBA DRUMMER'], ['agent', 'CUSTOMS OFFICER']],
];
/** The regions' names, Montos (where he sets out from) left off. */
const REGIONS = STOPS.slice(1).map((s) => s.name);
if (REGIONS.length !== TROUPES.length) throw new Error(`a troupe for each region: ${REGIONS.length} regions, ${TROUPES.length} troupes`);
const KEYS = Object.keys(WORLD_CREATURES);
const CAST: MontyEnding['cast'] = TROUPES.flat().map(([key, name]) => {
  const at = KEYS.indexOf(key);
  if (at < 0) throw new Error(`no creature ${key}`);
  return { types: [FIRST_CREATURE + at], name };
});

/**
 * The ground the procession marches on: a plain black band over the beach's sand and the promenade (rows 144 to the foot), the sky, the sea and the Redeemer above it; the region's name at its top, the
 * marchers' feet on a line under them, and their names in the two rows under it.
 */
const PROCESSION: NonNullable<MontyEnding['procession']> = {
  troupes: TROUPES.map((t, i) => ({ title: REGIONS[i] ?? '', size: t.length })),
  hero: { title: '', name: 'MONTY MOLE' },
  ground: { top: 144, feet: 179, line: 6 },
  titleRow: 147,
  nameRows: [183, 192],
};

export const WORLD_ENDING: MontyEnding = {
  title: 'DO SVIDANIYA MONTY',
  scenes: SCENES,
  cast: CAST,
  castRooms: Array.from({ length: RIO_ROOM.bust + 1 }, (_, i) => i),
  closing: CLOSING,
  procession: PROCESSION,
};
