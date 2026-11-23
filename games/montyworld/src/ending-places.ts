import { wear } from '../../montyotr/src/items';
import type { Game } from '../../montyotr/src/game';
import { TOP_ROW, type Scene } from '../../montyotr/src/ending-scenes';
import { AND, ANDES_ALL_ROOMS } from './andes';
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
/** The room an item of the game's rooms (by its name) is in, and its place among the room's finds (a room's cake comes first). */
const placeOf = (name: string): { room: number; nth: number } => {
  const room = [...MOSCOW_ROOMS, ...CHINA_ROOMS, ...JAPAN_ROOMS, ...PACIFIC_ROOMS, ...ANDES_ALL_ROOMS, ...RIO_ROOMS].find((r) => r.item?.name === name);
  if (!room) throw new Error(`no item ${name}`);
  return { room: room.id, nth: room.cake ? 1 : 0 };
};
/** The hats in the order they are found: where each was taken (Moscow's ushanka, China's rice hat, Japan's hood, the Pacific's lei, the Andes' chullo, Rio's headdress). */
const HATS: readonly { room: number; nth: number }[] = ['ushanka', 'rice hat', 'hood', 'lei', 'chullo', 'headdress'].map(placeOf);

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
    if (hat !== undefined) wear(g, itemOfRoom(g, hat.room, hat.nth));
  };
}

/** What he has by Rio's cable car: the earlier regions' finds, the chullo and the key to the city (the show's cable car scene is a ride: the gate is open). */
function withCityKey(g: Game) {
  arrivedIn(FIRST.rio, 5)(g);
  g.siCollected[itemOfRoom(g, RIO_ROOM.lap, 0)] = 0x81;
}

/** A place of the show without its route and its start: the room, what he has, what he does there (coins: the first of the room's that he can take), and the credits over it. */
export interface Place { room: number; prepare: Scene['prepare']; take: Scene['take']; frames?: number; creditRow?: number; credits: readonly string[] }

export const PLACES: readonly Place[] = [
  // Moscow: Red Square, St Basil's domes behind
  { room: ROOM.square, prepare: arrivedIn(FIRST.moscow, 0), take: { coins: 1 }, credits: ['A NEW GAME BY CHRISTOPHER HICKMAN', 'WITH CLAUDE, AFTER MONTY ON THE RUN', 'BY PETER HARRAP, GREMLIN GRAPHICS'] },
  // Siberia: the Trans-Siberian's roof, a tunnel mouth coming
  { room: SIB.gravy, prepare: arrivedIn(FIRST.siberia, 1), take: { coins: 1 }, credits: ['THE TRANS-SIBERIAN RUNS 9289 KM', 'FROM MOSCOW TO VLADIVOSTOK'] },
  // China: the Great Wall and its watchtower
  { room: CHI.wall, prepare: arrivedIn(FIRST.china, 1), take: { coins: 1 }, credits: ['THE GREAT WALL RUNS 21196 KM', 'IN ALL, BRANCHES AND SPURS TOO'] },
  // Japan: the temple garden
  { room: JP.garden, prepare: arrivedIn(FIRST.japan, 2), take: { coins: 1 }, credits: ['THE SHINKANSEN RUNS UP TO', '320 KM AN HOUR'] },
  // the Pacific: the luau's torches, and the lava climb
  { room: PAC.lei, prepare: arrivedIn(FIRST.pacific, 3), take: { coins: 1 }, credits: ['HAWAII HAS EIGHT MAIN ISLANDS'] },
  { room: PAC.mauna, prepare: arrivedIn(FIRST.pacific, 3), take: { coins: 1 }, credits: ['MAUNA KEA STANDS 4207 M HIGH'] },
  // the Andes: the terraces under the drop, Machu Picchu's boulders, the Amazon's vines
  { room: AND.terraces, prepare: arrivedIn(FIRST.andes, 4), take: { coins: 1 }, credits: ['MACHU PICCHU WAS BUILT IN THE', '15TH CENTURY, 2430 M UP'] },
  { room: AND.picchu, prepare: arrivedIn(FIRST.andes, 4), take: { coins: 1 }, credits: ['MUSIC BY ROB HUBBARD,', 'AFTER HIS MONTY ON THE RUN TUNE', 'C64 VERSION BY MICRO PROJECTS'] },
  { room: AND.roots, prepare: arrivedIn(FIRST.andes, 5), take: { coins: 1 }, credits: ['THE AMAZON IS OVER 6000 KM LONG'] },
  // Rio: the cable car, the churrascaria, the floats, the beach
  { room: RIO_ROOM.sugar, prepare: withCityKey, take: { coins: 1 }, credits: ['SUGARLOAF CABLE CAR OPENED IN 1912,', 'THE FIRST IN BRAZIL'] },
  { room: RIO_ROOM.steak, prepare: arrivedIn(FIRST.rio, 5), take: { coins: 1 }, credits: ['CHRIST THE REDEEMER IS 30 M TALL', 'ON A 8 M PEDESTAL, OPENED 1931'] },
  { room: RIO_ROOM.float, prepare: arrivedIn(FIRST.rio, 6), take: { coins: 1 }, credits: ['RIO CARNIVAL FILLS THE STREETS', 'WITH ABOUT TWO MILLION A DAY'] },
  { room: RIO_ROOM.bust, prepare: arrivedIn(FIRST.rio, 6), take: { treasure: true }, frames: 1000, creditRow: TOP_ROW, credits: ['THANK YOU FOR PLAYING'] },
];

/** The lines under the last place's: this game's own, in the plan's words (a new game, after Peter Harrap's; no port line: it is not a port). */
export const CLOSING: readonly string[] = ['A NEW GAME BY CHRISTOPHER HICKMAN', 'WITH CLAUDE, AFTER PETER HARRAPS', 'MONTY ON THE RUN, GREMLIN GRAPHICS', 'RUNSTOP64'];
