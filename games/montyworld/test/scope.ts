/**
 * Do Svidaniya Monty's room filter (the shared kit: games/shared/monty/test/scope.ts): its rooms by region and key (`siberia.coal`, `coal`, `11`,
 * or a region's name for all its rooms), and the one `SCOPE` every room-level test reads (`--room` on tools/test.mjs).
 */
import type { RoomSpec } from '../../shared/monty/rooms';
import { fingerprints, type Prints } from '../../shared/monty/test/attribute';
import { roomNames, roomScope, type RoomNames } from '../../shared/monty/test/scope';
import { WORLD } from '../src/data';
import type { RegionName } from '../src/regions';
import { AND, ANDES_ALL_ROOMS } from '../src/andes';
import { CHI, CHINA_ROOMS } from '../src/china';
import { JAPAN_ROOMS, JP } from '../src/japan';
import { MOSCOW_ROOMS, ROOM } from '../src/moscow';
import { PAC, PACIFIC_ROOMS } from '../src/pacific';
import { RIO_ROOM, RIO_ROOMS } from '../src/rio';
import { SIB, SIBERIA_ROOMS } from '../src/siberia';
import { FLY, SKY_ROOMS } from '../src/sky';

/** Each region's rooms: its key table (the ids by name) and its room specs. */
export const REGION_ROOMS: readonly { readonly name: RegionName; readonly rooms: Readonly<Record<string, number>>; readonly specs: readonly RoomSpec[] }[] = [
  { name: 'moscow', rooms: ROOM, specs: MOSCOW_ROOMS },
  { name: 'siberia', rooms: SIB, specs: SIBERIA_ROOMS },
  { name: 'china', rooms: CHI, specs: CHINA_ROOMS },
  { name: 'japan', rooms: JP, specs: JAPAN_ROOMS },
  { name: 'pacific', rooms: PAC, specs: PACIFIC_ROOMS },
  { name: 'andes', rooms: { ...AND, ...FLY }, specs: [...ANDES_ALL_ROOMS, ...SKY_ROOMS] }, // (the flight from Hilo is on the Andes' columns: sky.ts)
  { name: 'rio', rooms: RIO_ROOM, specs: RIO_ROOMS },
];

/** Every room of the world, in region order. */
export const ALL_ROOMS: readonly RoomSpec[] = REGION_ROOMS.flatMap((r) => r.specs);

/** The rooms' names: the key tables', and every room spec's id (a room no key names is still reachable by its id). */
export const NAMES: RoomNames = (() => {
  const named = roomNames(REGION_ROOMS);
  const ids = new Set([...named.ids, ...ALL_ROOMS.map((r) => r.id)]);
  return { ...named, ids };
})();

/** What this run checks: every room, or the rooms `--room` names. */
export const SCOPE = roomScope(NAMES);

/** The room specs the filter lets through. */
export const scopedRooms = (rooms: readonly RoomSpec[]): RoomSpec[] => SCOPE.pick(rooms, (r) => r.id);

/** The region files: where a room's spec and its mechanisms' entries are written (`id: SIB.coal`, `room: SIB.lake`), read room by room (attribute.ts). */
export const REGION_FILES: readonly string[] = REGION_ROOMS.map((r) => `games/montyworld/src/${r.name}.ts`);

/**
 * What the region bots' kept leg states depend on (legs.ts): the engine and the code that plays it headless, the game's other sources, each
 * region file outside its rooms, and the tables' layout (which room each coin's and find's slot is: a coin added moves the slots after it).
 * Read when a bot asks (the files as they are on disk then).
 */
export const prints = (): Prints => fingerprints({
  engine: ['games/montyotr/src', 'games/shared', 'packages/c64kit/src', 'games/shared/test/kit.ts', 'games/montyotr/test/play.ts', 'games/shared/monty/test/bot.ts', 'games/montyworld/src'],
  regions: REGION_FILES,
  // what only draws, sounds or runs the front end (attribute.ts PrintSources): never read by a game frame
  presentation: [
    'games/montyotr/src/map.ts', 'games/montyotr/src/title.ts', 'games/montyotr/src/info.ts', 'games/montyotr/src/ending.ts', 'games/montyotr/src/ending-scenes.ts',
    'games/montyworld/src/title.ts', 'games/montyworld/src/title-art.ts', 'games/montyworld/src/title-chase.ts', 'games/montyworld/src/title-scroll.ts',
    'games/montyworld/src/title-viktor.ts', 'games/montyworld/src/info.ts', 'games/montyworld/src/ending-scenes.ts', 'games/montyworld/src/ending-places.ts',
    'games/montyworld/src/ending-routes.ts', 'games/montyworld/src/music',
    'games/shared/frontend.ts', 'games/shared/native', 'games/shared/pendragon', 'games/shared/spectrum.ts', 'games/shared/spectrum-font.ts', 'games/shared/touch',
    'games/shared/ending', 'games/shared/audio.ts', 'games/shared/carrying.ts', 'games/shared/letters.ts',
    'packages/c64kit/src/renderer.ts', 'packages/c64kit/src/layout.ts', 'packages/c64kit/src/overlay.ts', 'packages/c64kit/src/effects.ts',
    'packages/c64kit/src/effects-layer.ts', 'packages/c64kit/src/sid', 'packages/c64kit/src/ay', 'packages/c64kit/src/beeper.ts',
  ],
  also: JSON.stringify([
    Array.from({ length: WORLD.coinTable.length / 3 }, (_, i) => WORLD.coinTable[i * 3]),
    Array.from({ length: WORLD.specialItems.length / 4 }, (_, i) => WORLD.specialItems[i * 4]),
    Array.from(WORLD.exitGrid.image), WORLD.exitGrid.cols,
  ]),
});
