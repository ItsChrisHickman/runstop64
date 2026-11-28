import type { Scene } from '../../montyotr/src/ending-scenes';
import type { MontyEnding } from '../../montyotr/src/montydata';
import { WORLD_CREATURES, type WorldCreature } from './art/world';
import { VIKTOR_NAME, VIKTOR_SPLIT } from './art/viktor';
import { WORLD_REGIONS } from './regions';
import { CLOSING, PLACES, placeFrames } from './ending-places';
import { ROUTES } from './ending-routes';
import { FIRST_CREATURE } from './layout';

/**
 * Do Svidaniya Monty's reward show (both modes): the places (ending-places.ts) with where each starts him, the route that does what it says there and the encore that keeps him going till the place ends (ending-routes.ts, found by `re/routes.ts`), and the creatures of the
 * whole world marching by after the last credit in a procession, a troupe from each region, Monty last.
 */

export const SCENES: readonly Scene[] = PLACES.map((p, i): Scene => {
  const found = ROUTES[i];
  if (!found || found.room !== p.room) throw new Error(`ending-routes.ts is not the places': run re/routes.ts (place ${i})`);
  return {
    room: p.room, spot: found.spot, prepare: p.prepare, take: p.take, credits: p.credits,
    // (what he does there, then his encore: on the go till the place ends, so no creature of the room walks through him standing still)
    route: found.encore ? `${found.route} ${found.encore}` : found.route,
    frames: placeFrames(p),
    ...(p.creditRow !== undefined ? { creditRow: p.creditRow } : {}),
  };
});

/**
 * The procession after the last credit (shared/ending/procession.ts): a troupe from each region in the order of the journey, under the region's name as the pause screen's map has it (regions.ts), each creature by
 * the key of its art (the enemy type it has in the tables is its place in the art's list) and the name it goes by in the procession: what the art draws, in plain words (the art's own description). The world has
 * ninety creatures; each region sends the four it is known by. Then Monty, dancing.
 */
const TROUPES: readonly (readonly (readonly [WorldCreature, string])[])[] = [
  [['matryoshka', 'MATRYOSHKA DOLL'], ['guard', 'KREMLIN GUARD'], ['babushka', 'BABUSHKA'], ['cossack', 'COSSACK DANCER']],
  [['inspector', 'TICKET INSPECTOR'], ['bat', 'BAT'], ['miner', 'MINER'], ['reindeer', 'REINDEER']],
  [['panda', 'PANDA'], ['warrior', 'TERRACOTTA WARRIOR'], ['lion', 'STONE LION'], ['kite', 'KITE']],
  [['jpSumo', 'SUMO WRESTLER'], ['jpNinja', 'NINJA'], ['jpLuckyCat', 'LUCKY CAT'], ['jpKoi', 'KOI']],
  [['pacHula', 'HULA DANCER'], ['pacNene', 'NENE'], ['pacTurtle', 'GREEN TURTLE'], ['pacRooster', 'ROOSTER']],
  [['llama', 'LLAMA'], ['condor', 'CONDOR'], ['andVizcacha', 'VISCACHA'], ['cuy', 'GUINEA PIG']],
  [['jaguar', 'JAGUAR'], ['toucan', 'TOUCAN'], ['sloth', 'SLOTH'], ['anaconda', 'ANACONDA']],
  [['dancer', 'SAMBA DANCER'], ['gaucho', 'GAUCHO WAITER'], ['drummer', 'SAMBA DRUMMER']],
];
/** The regions' names as the pause screen's map heads them (regions.ts `label`), the sky left off (no troupe flies). */
const REGIONS = WORLD_REGIONS.filter((r) => !r.flown).map((r) => r.label);
if (REGIONS.length !== TROUPES.length) throw new Error(`a troupe for each region: ${REGIONS.length} regions, ${TROUPES.length} troupes`);
const KEYS = Object.keys(WORLD_CREATURES);
/** A creature's enemy type: its place in the art's list. */
function typeOf(key: WorldCreature): number {
  const at = KEYS.indexOf(key);
  if (at < 0) throw new Error(`no creature ${key}`);
  return FIRST_CREATURE + at;
}
const CAST: MontyEnding['cast'] = TROUPES.flat().map(([key, name]) => ({ types: [typeOf(key)], name }));
/** Where a creature of Rio's troupe is in the cast (the finale's samba troupe leads the parade and dances with Monty at the side). */
const castOf = (key: WorldCreature): number => {
  const at = TROUPES.flat().findIndex(([k]) => k === key);
  if (at < 0) throw new Error(`${key} is not in the cast`);
  return at;
};

/**
 * The sixteen pictures of a four-way split (as Monty's are, the bank's $7E-$8D: going back, on, up and down, four pictures each, a small wobble) made from a creature's first frame: the stand-in for Viktor's
 * own split pictures until they are drawn.
 */
/**
 * Viktor Vole, the agent who followed Monty round the world, at the parade's tail: his walk is the agent creature's (art/rio-creatures.ts `agent`, his own pictures), his split under the crusher and his
 * name art/viktor.ts's, the one place his pictures are.
 */
export const VIKTOR = { name: VIKTOR_NAME, creature: 'agent', split: VIKTOR_SPLIT } as const satisfies { name: string; creature: WorldCreature; split: readonly Uint8Array[] };

/**
 * The beach's plain sand under the parade: one colour, nothing of the picture behind it. Moonlit sand, dark grey: the one colour no marcher is drawn in (orange would hide the terracotta warrior and
 * the gaucho, brown the reindeer, yellow six of them).
 */
export const PARADE_SAND = 11;

/**
 * The procession after the last credit: Rio's carnival parade across the beach at night (shared/ending/procession.ts `PARADE`). The beach's close-up stands behind (the sky, the sea, Sugarloaf, the Redeemer, the
 * umbrella) with fireworks bursting over it; from the sea down the sand is one plain colour. The finale's samba troupe (a dancer and a drummer) leads, then each region's creatures behind a banner with its name,
 * bouncing on the beat, each named under them as it passes the middle; Monty and the troupe dance at the side, behind the column, watching; Viktor sneaks after him at the tail, and a Mole Crusher gets him.
 */
const PROCESSION: NonNullable<MontyEnding['procession']> = {
  troupes: TROUPES.map((t, i) => ({ title: REGIONS[i] ?? '', size: t.length })),
  hero: { title: '', name: 'MONTY MOLE' },
  ground: { top: 128, feet: 176, line: PARADE_SAND, colour: PARADE_SAND },
  titleRow: 147,
  nameRows: [183, 192],
  parade: {
    leaders: [castOf('drummer'), castOf('dancer')],
    watchers: [castOf('dancer'), castOf('drummer')],
    watch: { x: [228, 254, 280], feet: 150 },
    banner: { cloth: [2, 6, 5, 4, 2, 6, 5], ink: 1, pole: 1 },
    ink: 7,
    fireworks: [[56, 44], [120, 34], [250, 40], [150, 60]],
    sparks: [7, 10, 13, 3, 1],
    gag: { name: VIKTOR.name, types: [typeOf(VIKTOR.creature)], split: VIKTOR.split },
  },
};

export const WORLD_ENDING: MontyEnding = {
  title: 'DO SVIDANIYA MONTY',
  scenes: SCENES,
  cast: CAST,
  castRooms: Array.from({ length: 0xff }, (_, i) => i), // (every id: the rooms that came back after the flight's are numbered past Rio's, Mauna Kea's nene among them)
  closing: CLOSING,
  procession: PROCESSION,
  seeded: true,
};
