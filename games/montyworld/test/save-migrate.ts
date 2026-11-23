/**
 * Saves of format 1 (the game as shipped before the reset) read into today's tables (save-migrate.ts): every coin and find of a room the reset kept as it was is still taken, every key item taken is still
 * taken wherever its room went (the chullo moved rooms), the costume worn is still worn, a save in a room that was cut carries on in the room the plan names, and a save in a room whose cells changed puts
 * him somewhere he can stand, in the exit grid's cell that room has now. Today's saves (format 2) read as they are.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/save-migrate.ts
 */
import { restore, snapshot } from '../../montyotr/src/save';
import { frame, NONE } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { newGame } from '../../shared/monty/test/bot';
import { AND } from '../src/andes';
import { PAC } from '../src/pacific';
import { WORLD } from '../src/data';
import { CODEC } from '../src/main';
import { FORMAT1_COINS, FORMAT1_ITEMS } from '../src/save-format1';
import { RETIRED } from '../src/save-migrate';
import { dead } from './mech-kit';
import { itemIndex } from './route';
import { CHULLO } from './andes-route';

/** The place of a format 1 find in its table: the n-th of a room's. */
const oldItem = (room: number, nth = 0) => {
  let n = 0;
  for (let i = 0; i * 4 < FORMAT1_ITEMS.length; i++) if (FORMAT1_ITEMS[i * 4] === room && n++ === nth) return i;
  throw new Error(`no format 1 find ${nth} in room ${room}`);
};
/** A format 1 save: flags at format 1's places, in a room. */
function format1(room: number, x2: number, y: number, mapRow: number, exitCol: number, coins: readonly number[], items: readonly number[], worn?: number) {
  const s = snapshot(newGame(WORLD, true).g);
  return {
    ...s, roomId: room, x2, y, mapRow, exitCol,
    coins: Array.from({ length: FORMAT1_COINS.length / 3 }, (_, i) => (coins.includes(i) ? 0xff : 0)),
    items: Array.from({ length: FORMAT1_ITEMS.length / 4 }, (_, i) => (items.includes(i) ? 0x81 : 0)),
    ...(worn === undefined ? {} : { worn }),
  };
}

check('today\'s saves are format 2, and format 1 is read too', CODEC.format === 2);
// format 1's Pacific: the snorkel was in SURF AND TURF (41), the lei in LEI OF THE LAND (42), the parachute in HOLD YOUR HORSES (54); a save in KELP WANTED (45, cut) carries on in Hana's sea
const old = format1(45, 0x0c + (10 + 4) * 4, 0x32 + 10 * 8, 2, 23, [0, 1], [0, 1, oldItem(41), oldItem(42)], oldItem(42));
const s = CODEC.unpack(CODEC.pack(old), 1);
const g = newGame(WORLD, true).g;
const snorkel = itemIndex(g, PAC.waikiki, 0), lei = itemIndex(g, PAC.waikiki, 1);
check(`Moscow's coins and finds keep their places (coins ${s.coins.slice(0, 2).join()}, finds ${s.items.slice(0, 2).join()})`, s.coins[0] === 0xff && s.coins[1] === 0xff && s.items[0] === 0x81 && s.items[1] === 0x81);
check('the key items taken are taken where they are now: the snorkel and the lei (both at Waikiki now), and the lei is still worn', s.items[snorkel] === 0x81 && s.items[lei] === 0x81 && s.worn === lei);
check(`the arrays are today's lengths (${s.coins.length} coins, ${s.items.length} finds)`, s.coins.length === WORLD.coinTable.length / 3 && s.items.length === WORLD.specialItems.length / 4);
check(`a save in KELP WANTED (cut) carries on in Hana, at its cell [3,18] (room ${s.roomId} at [${s.mapRow},${s.exitCol}])`, s.roomId === RETIRED[45] && s.roomId === PAC.hana && s.mapRow === 3 && s.exitCol === 18);
const b = newGame(WORLD, true);
restore(b.g, s);
for (let f = 0; f < 120; f++) frame(b, NONE);
check(`and loads there, alive (room ${b.g.roomId}, dead ${dead(b.g)})`, b.g.roomId === PAC.hana && !dead(b.g));
// format 1's Andes: the chullo was in MARKET FORCES (60), the panpipes in MIST OPPORTUNITY (61), the machete in THE INCA TUNNEL (63); a save in MIST OPPORTUNITY (cut) carries on in Machu Picchu
{
  const old = format1(61, 0x0c + (20 + 4) * 4, 0x32 + 15 * 8, 5, 33, [0, 1], [0, 1, oldItem(60), oldItem(61), oldItem(63)], oldItem(60));
  const s = CODEC.unpack(CODEC.pack(old), 1);
  const g = newGame(WORLD, true).g;
  const chullo = itemIndex(g, AND.terraces, CHULLO), panpipes = itemIndex(g, AND.picchu, 0), machete = itemIndex(g, AND.roots, 0);
  check('the Andes\' key items taken are taken where they are now: the chullo (moved to the terraces), the panpipes, the machete; and the chullo is still worn', s.items[chullo] === 0x81 && s.items[panpipes] === 0x81 && s.items[machete] === 0x81 && s.worn === chullo);
  const cell = [...WORLD.exitGrid.image].indexOf(AND.picchu);
  check(`a save in MIST OPPORTUNITY (cut) carries on in Machu Picchu, at its cell (room ${s.roomId} at [${s.mapRow},${s.exitCol}])`, s.roomId === RETIRED[61] && s.roomId === AND.picchu && s.mapRow * WORLD.exitGrid.cols + s.exitCol === cell);
  const b = newGame(WORLD, true);
  restore(b.g, s);
  for (let f = 0; f < 120; f++) frame(b, NONE);
  check(`and loads there standing, alive (room ${b.g.roomId}, falling ${b.g.falling}, dead ${dead(b.g)})`, b.g.roomId === AND.picchu && !dead(b.g) && !b.g.falling);
}
// every retired room carries on somewhere he can stand
for (const [from, to] of Object.entries(RETIRED)) {
  // (a save in one of the old sea rooms was made with the snorkel: the sea was shut without it)
  const t = CODEC.unpack(CODEC.pack(format1(Number(from), 0x40, 0x32 + 10 * 8, 0, 0, [], WORLD.swimRooms.includes(to) ? [oldItem(41)] : [])), 1);
  const p = newGame(WORLD, true);
  restore(p.g, t);
  for (let f = 0; f < 120; f++) frame(p, NONE);
  check(`a save in cut room ${from} loads in room ${to}, alive (in ${p.g.roomId})`, p.g.roomId === to && !dead(p.g));
}
// a room kept with the same cells keeps his place exactly
const moscow = format1(0, 0x50, 0xc2, 1, 0, [], []);
const m = CODEC.unpack(CODEC.pack(moscow), 1);
check('a save in a room the reset did not change keeps its place exactly (Moscow\'s first room)', m.roomId === 0 && m.x2 === 0x50 && m.y === 0xc2 && m.mapRow === 1 && m.exitCol === 0);
// format 2 reads as it is
const now = snapshot(b.g);
const again = CODEC.unpack(CODEC.pack(now), 2);
check('a format 2 save reads as it was written', JSON.stringify(again) === JSON.stringify(now));
finish();
