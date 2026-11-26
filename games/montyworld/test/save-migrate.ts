/**
 * Saves of format 1 (the game as shipped before the reset) read into today's tables (save-migrate.ts): every coin and find of a room the reset kept as it was is still taken, every key item taken is still
 * taken wherever its room went (the chullo moved rooms), the costume worn is still worn, a save in a room that was cut carries on in the room the plan names, and a save in a room whose cells changed puts
 * him somewhere he can stand, in the exit grid's cell that room has now. Saves of format 2 (the reset's tables, until the daruma moved to BULLET POINT and the parlour's prize shelf took a coin) read the
 * same way from format 2's tables. Today's saves (format 3) read as they are, but one made in a room cut since (the cargo plane's hold) carries on in the room that took its place (Hilo's apron).
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
import { FORMAT2_COINS, FORMAT2_ITEMS } from '../src/save-format2';
import { JP } from '../src/japan';
import { RETIRED } from '../src/save-migrate';
import { dead } from './mech-kit';
import { coinIndex, itemIndex } from './route';
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

check('today\'s saves are format 3, and formats 1 and 2 are read too', CODEC.format === 3);
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
  const chullo = itemIndex(g, AND.terraces, CHULLO), panpipes = itemIndex(g, AND.picchu, 0), machete = itemIndex(g, AND.kapok, 0);
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
// today's format reads as it is
const now = snapshot(b.g);
const again = CODEC.unpack(CODEC.pack(now), CODEC.format);
check(`a format ${CODEC.format} save reads as it was written`, JSON.stringify(again) === JSON.stringify(now));
// format 2 (until 2026-11-25: the daruma was the parlour's, before the fish food in the finds; the parlour had two coins): a save with the daruma and a coin of every room after the parlour taken
{
  const p = newGame(WORLD, true);
  const at2 = (room: number, col: number, row: number) => {
    for (let i = 0; i * 3 < FORMAT2_COINS.length; i++) if (FORMAT2_COINS[i * 3] === room && FORMAT2_COINS[i * 3 + 1] === col && FORMAT2_COINS[i * 3 + 2] === row) return i;
    throw new Error(`no format 2 coin at ${room} ${col},${row}`);
  };
  const daruma2 = FORMAT2_ITEMS.findIndex((v, k) => k % 4 === 0 && v === JP.parlour) / 4, fish2 = FORMAT2_ITEMS.findIndex((v, k) => k % 4 === 0 && v === JP.crossing) / 4;
  const taken2 = [at2(JP.parlour, 25, 3), at2(JP.crossing, 16, 5), at2(PAC.hilo, 25, 4)];
  const old2 = { ...snapshot(p.g), roomId: JP.platform, x2: 0x0c + (14 + 4) * 4, y: 0x32 + 17 * 8, mapRow: 2, exitCol: 14,
    coins: Array.from({ length: FORMAT2_COINS.length / 3 }, (_, i) => (taken2.includes(i) ? 0xff : 0)), items: Array.from({ length: FORMAT2_ITEMS.length / 4 }, (_, i) => (i === daruma2 ? 0x81 : 0)) };
  const t = CODEC.unpack(CODEC.pack(old2), 2);
  const daruma = itemIndex(p.g, JP.platform, 0), fish = itemIndex(p.g, JP.crossing, 0);
  const takenNow = [coinIndex(p.g, JP.parlour, 25, 3), coinIndex(p.g, JP.crossing, 16, 5), coinIndex(p.g, PAC.hilo, 25, 4)];
  check(`a format 2 save reads into today's tables: the daruma (format 2's find ${daruma2}, today's ${daruma}) still taken, the fish food (${fish2}, today's ${fish}) not; its coins taken where they are now and no other (the prize shelf's new one not)`,
    daruma2 >= 0 && fish2 === daruma2 + 1 && t.items[daruma] === 0x81 && t.items[fish] === 0 && t.items.filter((v) => v !== 0).length === 1 && takenNow.every((i) => t.coins[i] === 0xff) && t.coins.filter((v) => v !== 0).length === 3
      && t.coins.length === WORLD.coinTable.length / 3 && t.items.length === WORLD.specialItems.length / 4);
}
// a save made in the cargo plane's hold (cut 2026-11-24: room 54 at [2,19]), its coin and the parachute taken: on Hilo's apron by the biplane, both still taken (they kept their table places in Hilo)
{
  const p = newGame(WORLD, true);
  const parachute = itemIndex(p.g, PAC.hilo, 0), coin = coinIndex(p.g, PAC.hilo, 25, 4);
  const held = { ...snapshot(p.g), roomId: 54, x2: 0x0c + (20 + 4) * 4, y: 0x32 + 17 * 8, mapRow: 2, exitCol: 19 };
  held.coins = held.coins.map((v, i) => (i === coin ? 0xff : v));
  held.items = held.items.map((v, i) => (i === parachute ? 0x81 : v));
  const t = CODEC.unpack(CODEC.pack(held), CODEC.format);
  restore(p.g, t);
  for (let f = 0; f < 120; f++) frame(p, NONE);
  check(`a save in the cut hold carries on on Hilo's apron (room ${p.g.roomId} at [${p.g.mapRow},${p.g.exitCol}], floor ${p.g.montyRow - 3 + 2}, column ${p.g.montyCol - 4}), alive, the hold's coin and the parachute still taken`,
    RETIRED[54] === PAC.hilo && p.g.roomId === PAC.hilo && p.g.mapRow === 3 && p.g.exitCol === 19 && p.g.montyRow - 3 + 2 === 5 && p.g.montyCol - 4 >= 15 && p.g.montyCol - 4 <= 17 && !dead(p.g) && t.coins[coin] === 0xff && t.items[parachute] === 0x81);
}
finish();
