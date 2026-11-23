/**
 * The world's totals, in one place (docs/dosvidaniya-reset.md: the regions' own tests check their own rooms; the sums over every region are this test's, so rebuilding a region touches no other
 * region's test): every region's rooms are on the exit grid once and nothing else is; the coins, snacks and key items the tables hold are the regions' own summed; the room budget (MOTR has 52,
 * the reset aims at about 54) and the coins per room (Monty on the Run's: at most three) are reported region by region.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/world.ts
 */
import { check, finish } from '../../shared/test/check';
import type { RoomSpec } from '../../shared/monty/rooms';
import { WORLD } from '../src/data';
import { MOSCOW_ROOMS } from '../src/moscow';
import { SIBERIA_ROOMS } from '../src/siberia';
import { CHINA_ROOMS } from '../src/china';
import { JAPAN_ROOMS } from '../src/japan';
import { PACIFIC_ROOMS } from '../src/pacific';
import { ANDES_ROOMS } from '../src/andes';
import { RIO_ROOMS } from '../src/rio';

const REGIONS: readonly (readonly [string, readonly RoomSpec[]])[] = [
  ['Moscow', MOSCOW_ROOMS], ['Siberia', SIBERIA_ROOMS], ['China', CHINA_ROOMS], ['Japan', JAPAN_ROOMS], ['the Pacific', PACIFIC_ROOMS], ['the Andes and the Amazon', ANDES_ROOMS], ['Rio', RIO_ROOMS],
];
const all = REGIONS.flatMap(([, rooms]) => rooms);
const onGrid = [...WORLD.exitGrid.image].filter((c) => c !== 0xff);
const coinsOf = (rooms: readonly RoomSpec[]) => rooms.reduce((n, r) => n + (r.coins?.length ?? 0), 0);
const findsOf = (rooms: readonly RoomSpec[]) => rooms.reduce((n, r) => n + (r.cake ? 1 : 0) + (r.item ? 1 : 0) + (r.item2 ? 1 : 0), 0);

for (const [name, rooms] of REGIONS) console.log(`   ${name}: ${rooms.length} rooms, ${coinsOf(rooms)} coins (${(coinsOf(rooms) / rooms.length).toFixed(1)} a room, at most ${Math.max(...rooms.map((r) => r.coins?.length ?? 0))}), ${findsOf(rooms)} finds`);
console.log(`   the world: ${all.length} rooms (Monty on the Run has 52), ${coinsOf(all)} coins (it has 64)`);

check(`every region's rooms are on the exit grid once, and only they are (${all.length} rooms, ${onGrid.length} cells)`, new Set(all.map((r) => r.id)).size === all.length && onGrid.length === all.length && all.every((r) => onGrid.includes(r.id)));
check(`the coin table is the regions' coins (${WORLD.coinTable.length / 3} = ${coinsOf(all)}), the finds table their finds (${WORLD.specialItems.length / 4} = ${findsOf(all)})`, WORLD.coinTable.length / 3 === coinsOf(all) && WORLD.specialItems.length / 4 === findsOf(all));
check(`the pause screen counts every find: ${WORLD.progress.keyItems.length} key items and ${WORLD.progress.cakes.length} snacks, ${WORLD.progress.keyItems.length + WORLD.progress.cakes.length} in all, the finds less the ending's treasure`,
  WORLD.progress.keyItems.length + WORLD.progress.cakes.length === findsOf(all) - WORLD.uncountedItems.length && new Set([...WORLD.progress.keyItems, ...WORLD.progress.cakes]).size === findsOf(all) - WORLD.uncountedItems.length);
finish();
