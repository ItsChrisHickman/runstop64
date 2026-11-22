import { wear } from '../../montyotr/src/items';
import type { Game } from '../../montyotr/src/game';
import { TOP_ROW, type Scene } from '../../montyotr/src/ending-scenes';
import { AND, ANDES_ROOMS } from './andes';
import { CHI, CHINA_ROOMS } from './china';
import { JAPAN_ROOMS, JP } from './japan';
import { MOSCOW_ROOMS, ROOM } from './moscow';
import { PAC, PACIFIC_ROOMS } from './pacific';
import { RIO_ROOM, RIO_ROOMS } from './rio';
import { SIB } from './siberia';

/**
 * The places of the reward show (ENHANCED), one or two from every region in the order of the journey, with what he has by then and what he does there: the part of a scene that is not its route (ending-routes.ts: found by
 * `re/routes.ts`, a search over the game's own frames) or the place it starts him at. The credits' lines are Monty on the Run's makers' (games/montyotr/re/credits.md: each is sourced there), spread over the places, and then this
 * game's own (`CLOSING`).
 */

/** The first room of each region (what he has by a place is every find of the rooms before it) and the room his hat was taken in. */
const FIRST = { moscow: 0, siberia: SIB.gravy, china: CHI.wall, japan: JP.harbour, pacific: PAC.stern, andes: AND.jump, rio: RIO_ROOM.quay } as const;
/** The room an item of the game's rooms (by its name) is in. */
const roomOf = (name: string): number => {
  const room = [...MOSCOW_ROOMS, ...CHINA_ROOMS, ...JAPAN_ROOMS, ...PACIFIC_ROOMS, ...ANDES_ROOMS, ...RIO_ROOMS].find((r) => r.item?.name === name);
  if (!room) throw new Error(`no item ${name}`);
  return room.id;
};
/** The hats in the order they are found: the room each was taken in (Moscow's ushanka, China's rice hat, Japan's hood, the Pacific's lei, the Andes' chullo, Rio's headdress). */
const HATS: readonly number[] = ['ushanka', 'rice hat', 'hood', 'lei', 'chullo', 'headdress'].map(roomOf);

/** The index of the n-th special item of a room. */
export function itemOfRoom(g: Game, room: number, nth = 0): number {
  const t = g.data.specialItems;
  let n = 0;
  for (let i = 0; i * 4 < t.length; i++) if (t[i * 4] === room && n++ === nth) return i;
  throw new Error(`no item ${nth} in room ${room}`);
}

/** What he has on arriving in a region: every find of the regions before it, and the hat of the last of them (`hat` the number of hats found, 0 none). */
export function arrivedIn(first: number, hats: number) {
  return (g: Game) => {
    const t = g.data.specialItems;
    for (let i = 0; i * 4 < t.length; i++) if ((t[i * 4] ?? 0) < first) g.siCollected[i] = 0x81;
    const hat = HATS[hats - 1];
    if (hat !== undefined) wear(g, itemOfRoom(g, hat));
  };
}

/** A place of the show without its route and its start: the room, what he has, what he does there (coins: the first of the room's that he can take), and the credits over it. */
export interface Place { room: number; prepare: Scene['prepare']; take: Scene['take']; frames?: number; creditRow?: number; credits: readonly string[] }

export const PLACES: readonly Place[] = [
  // Moscow: Red Square, St Basil's domes behind
  { room: ROOM.square, prepare: arrivedIn(FIRST.moscow, 0), take: { coins: 1 }, credits: ['A GREMLIN GRAPHICS GAME, 1985', 'ORIGINAL GAME BY PETER HARRAP'] },
  // Siberia: the Trans-Siberian's roof, a tunnel mouth coming
  { room: SIB.gravy, prepare: arrivedIn(FIRST.siberia, 1), take: { coins: 1 }, credits: ['C64 VERSION BY MICRO PROJECTS LTD', 'ANTHONY CLARKE AND JASON PERKINS', 'GRAPHICS BY MARK RODGERS'] },
  // China: the Great Wall and its watchtower
  { room: CHI.wall, prepare: arrivedIn(FIRST.china, 1), take: { coins: 1 }, credits: ['MUSIC BY ROB HUBBARD', 'THE THIRD MONTY MOLE GAME'] },
  // Japan: the temple garden
  { room: JP.garden, prepare: arrivedIn(FIRST.japan, 2), take: { coins: 1 }, credits: ['PETER HARRAP WROTE THE FIRST GAME,', 'WANTED: MONTY MOLE, AT 19 IN 1984,'] },
  // the Pacific: the luau's torches, and the lava climb
  { room: PAC.lei, prepare: arrivedIn(FIRST.pacific, 3), take: { coins: 1 }, credits: ['AS A REACTION TO THE BRITISH', 'MINERS STRIKE: A MOLE STEALING COAL', 'TO KEEP HIS FAMILY WARM'] },
  { room: PAC.mauna, prepare: arrivedIn(FIRST.pacific, 3), take: { coins: 1 }, credits: ['MONTY ESCAPES FROM HIS HOUSE FOR THE', 'ENGLISH CHANNEL AND FREEDOM'] },
  // the Andes: the terraces' top path below the drop, Machu Picchu's boulders, the vines
  { room: AND.llama, prepare: arrivedIn(FIRST.andes, 4), take: { coins: 1 }, credits: ['THE MOLE CRUSHERS CAME OVER FROM', 'WANTED: MONTY MOLE, SAID ZZAP!64', 'PETER HARRAP: I LIKE A BIT OF A SHOCK'] },
  { room: AND.rock, prepare: arrivedIn(FIRST.andes, 4), take: { coins: 1 }, credits: ['ROB HUBBARD SAID THE MAIN TUNE WAS', 'INSPIRED BY DEVILS GALOP, THE DICK', 'BARTON RADIO SERIAL THEME'] },
  { room: AND.river, prepare: arrivedIn(FIRST.andes, 5), take: { coins: 1 }, credits: ['HARDCORE GAMING 101 READERS RATED IT', 'NUMBER 2 IN WESTERN GAME MUSIC, 2011'] },
  // Rio: the cable car, the churrascaria, the floats, the beach
  { room: RIO_ROOM.sugar, prepare: arrivedIn(FIRST.rio, 5), take: { coins: 1 }, credits: ['ZZAP!64 GAVE IT 90 PER CENT IN 1985:', 'MOLING ABOUT HAS NEVER BEEN SUCH FUN'] },
  { room: RIO_ROOM.steak, prepare: arrivedIn(FIRST.rio, 5), take: { coins: 1 }, credits: ['MONTY BOARDS A FERRY TO FRANCE'] },
  { room: RIO_ROOM.float, prepare: arrivedIn(FIRST.rio, 6), take: { coins: 1 }, credits: [] },
  { room: RIO_ROOM.bust, prepare: arrivedIn(FIRST.rio, 6), take: { treasure: true }, frames: 1000, creditRow: TOP_ROW, credits: [] },
];

/** The lines under the last place's: this game's own, in the plan's words (a new game, after Peter Harrap's; no port line: it is not a port). */
export const CLOSING: readonly string[] = ['A NEW GAME BY CHRISTOPHER HICKMAN', 'WITH CLAUDE, AFTER PETER HARRAPS', 'MONTY ON THE RUN, GREMLIN GRAPHICS', 'RUNSTOP64'];
