/**
 * Saves of format 1 (the game as shipped before the reset) read into today's tables (save-migrate.ts): every coin and find of a room the reset kept as it was is still taken, every key item taken is still
 * taken wherever its room went (the chullo moved rooms), the costume worn is still worn, a save in a room that was cut carries on in the room the plan names, and a save in a room whose cells changed puts
 * him somewhere he can stand, in the exit grid's cell that room has now. Saves of format 2 (the reset's, before Hawaii's island hopping came back) are read the same way (the snorkel, the lei and the
 * parachute moved rooms; Viktor's escapes are matched by their order), one on the old Hilo's apron carries on by the biplane, one made in the cut cargo plane's hold at Hilo. Saves of format 3 (live 2026-11-25/26,
 * before the Andes' rebuild, the bonus rooms off the path and Rio's carnival) too: one made in Sugarloaf's cut room carries on in Lapa with its coin as Lapa's third, the crank (moved to the floats' stage) still
 * taken. Today's (format 4) read as they are, those written before GONE WITH THE WIND (the ice cave under MOUNT FUJI, added last: its two coins at the table's end) too, the cave's coins not yet taken.
 * (Format 3 also moved the daruma to BULLET POINT's platform and gave the parlour's prize shelf a coin: a format 2 save's Japan is matched the same way.)
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/save-migrate.ts
 */
import { restore, snapshot } from '../../montyotr/src/save';
import { frame, NONE } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { newGame } from '../../shared/monty/test/bot';
import { AND } from '../src/andes';
import { PAC } from '../src/pacific';
import { ROUNDS, WORLD } from '../src/data';
import { CODEC } from '../src/main';
import { FORMAT1_COINS, FORMAT1_ITEMS } from '../src/save-format1';
import { FORMAT2_COINS, FORMAT2_ITEMS } from '../src/save-format2';
import { FORMAT3_COINS, FORMAT3_ITEMS } from '../src/save-format3';
import { CHI } from '../src/china';
import { RIO_ROOM } from '../src/rio';
import { RIO_SPRITE } from '../src/rio-pointers';
import { ANDES_SPRITE } from '../src/andes-pointers';
import { FUJI, JP } from '../src/japan';
import { enterRoom } from '../../montyotr/src/ending';
import { RETIRED } from '../src/save-migrate';
import { dead } from './mech-kit';
import { coinIndex, itemIndex, standY } from './route';
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

check('today\'s saves are format 4, and formats 1, 2 and 3 are read too', CODEC.format === 4);
// format 1's Pacific: the snorkel was in SURF AND TURF (41), the lei in LEI OF THE LAND (42); a save in MOLE-OKAI (44, not back) carries on in the swim past Molokai (CLAM DOWN, 43)
const old = format1(44, 0x0c + (10 + 4) * 4, 0x32 + 10 * 8, 2, 22, [0, 1], [0, 1, oldItem(41), oldItem(42)], oldItem(42));
const s = CODEC.unpack(CODEC.pack(old), 1);
const g = newGame(WORLD, true).g;
const snorkel = itemIndex(g, PAC.lookout, 0), lei = itemIndex(g, PAC.luau, 0);
check(`Moscow's coins and finds keep their places (coins ${s.coins.slice(0, 2).join()}, finds ${s.items.slice(0, 2).join()})`, s.coins[0] === 0xff && s.coins[1] === 0xff && s.items[0] === 0x81 && s.items[1] === 0x81);
check('the key items taken are taken where they are now: the snorkel (Diamond Head\'s lookout now) and the lei (the luau), and the lei is still worn', s.items[snorkel] === 0x81 && s.items[lei] === 0x81 && s.worn === lei);
check(`the arrays are today's lengths (${s.coins.length} coins, ${s.items.length} finds)`, s.coins.length === WORLD.coinTable.length / 3 && s.items.length === WORLD.specialItems.length / 4);
check(`a save in MOLE-OKAI (not back) carries on in CHANNEL SURFING, at its cell [3,18] (room ${s.roomId} at [${s.mapRow},${s.exitCol}])`, s.roomId === RETIRED[44] && s.roomId === PAC.clam && s.mapRow === 3 && s.exitCol === 18);
const b = newGame(WORLD, true);
restore(b.g, s);
for (let f = 0; f < 120; f++) frame(b, NONE);
check(`and loads there, alive (room ${b.g.roomId}, dead ${dead(b.g)})`, b.g.roomId === PAC.clam && !dead(b.g));
// format 1's HANA BANANA (49) is HANA (87) now, not the swim room that has its id
{
  const t = CODEC.unpack(CODEC.pack(format1(49, 0x0c + (4 + 4) * 4, standY(8), 1, 25, [], [oldItem(41)])), 1);
  const p = newGame(WORLD, true);
  restore(p.g, t);
  for (let f = 0; f < 120; f++) frame(p, NONE);
  check(`a format 1 save in HANA BANANA carries on in HANA (room ${p.g.roomId}), standing, alive`, p.g.roomId === PAC.hana && !dead(p.g) && !p.g.falling);
}
// format 1's Andes: the chullo was in MARKET FORCES (60), the panpipes in MIST OPPORTUNITY (61), the machete in THE INCA TUNNEL (63); a save in MIST OPPORTUNITY (cut) carries on in Machu Picchu
{
  const old = format1(61, 0x0c + (20 + 4) * 4, 0x32 + 15 * 8, 5, 33, [0, 1], [0, 1, oldItem(60), oldItem(61), oldItem(63)], oldItem(60));
  const s = CODEC.unpack(CODEC.pack(old), 1);
  const g = newGame(WORLD, true).g;
  const chullo = itemIndex(g, AND.terraces, CHULLO), panpipes = itemIndex(g, AND.picchu, 0), machete = itemIndex(g, AND.boat, 0);
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
// format 4 reads as it is
const now = snapshot(b.g);
const again = CODEC.unpack(CODEC.pack(now), 4);
check('a format 4 save reads as it was written', JSON.stringify(again) === JSON.stringify(now));
// a format 4 save from before the ice cave (2026-11-26): two coins short (the cave's, last in the table), made on MOUNT FUJI's entry ledge (the mountain lost its floor, not the ledge he comes in on):
// every coin it had is still taken, the cave's are not, and he carries on standing on the ledge
{
  const s4 = newGame(WORLD, false);
  enterRoom(s4.g, JP.fuji, 0x0c + (FUJI.entry.col0 + 1 + 4) * 4, standY(FUJI.floor));
  for (let f = 0; f < 60; f++) frame(s4, NONE);
  const cave = Array.from({ length: WORLD.coinTable.length / 3 }, (_, i) => i).filter((i) => WORLD.coinTable[i * 3] === JP.cave);
  const before = { ...snapshot(s4.g), coins: Array.from({ length: WORLD.coinTable.length / 3 - cave.length }, () => 0xff) };
  const read = CODEC.unpack(CODEC.pack(before), 4);
  const p4 = newGame(WORLD, false);
  restore(p4.g, read);
  for (let f = 0; f < 120; f++) frame(p4, NONE);
  const had = p4.g.coinCollected.slice(0, before.coins.length).every((v) => v === 0xff), caveOpen = cave.every((i) => p4.g.coinCollected[i] === 0);
  check(`a format 4 save from before the ice cave keeps every coin it had (${had}), the cave's ${cave.length} not yet taken (${caveOpen}), and carries on on MOUNT FUJI's entry ledge (room ${p4.g.roomId}, y ${p4.g.y}), alive`,
    cave.length === 2 && cave.every((i) => i >= before.coins.length) && had && caveOpen && p4.g.roomId === JP.fuji && p4.g.y === standY(FUJI.floor) && !dead(p4.g));
}
// format 2 (the reset's Hawaii: the snorkel and the lei at Waikiki (41), the musubi in the swim room (49), the parachute and three coins in Hilo (52), Viktor overboard a find no room shows)
/** The place of a format 2 find in its table: the n-th of a room's. */
const oldItem2 = (room: number, nth = 0) => {
  let n = 0;
  for (let i = 0; i * 4 < FORMAT2_ITEMS.length; i++) if (FORMAT2_ITEMS[i * 4] === room && n++ === nth) return i;
  throw new Error(`no format 2 find ${nth} in room ${room}`);
};
const oldCoin2 = (room: number, col: number, row: number) => {
  for (let i = 0; i * 3 < FORMAT2_COINS.length; i++) if (FORMAT2_COINS[i * 3] === room && FORMAT2_COINS[i * 3 + 1] === col && FORMAT2_COINS[i * 3 + 2] === row) return i;
  throw new Error(`no format 2 coin at ${col},${row} of room ${room}`);
};
/** A format 2 save: flags at format 2's places, in a room. */
function format2(room: number, col: number, floor: number, mapRow: number, exitCol: number, coins: readonly number[], items: readonly number[], worn?: number) {
  const s0 = snapshot(newGame(WORLD, true).g);
  return {
    ...s0, roomId: room, x2: 0x0c + (col + 4) * 4, y: standY(floor), mapRow, exitCol,
    coins: Array.from({ length: FORMAT2_COINS.length / 3 }, (_, i) => (coins.includes(i) ? 0xff : 0)),
    items: Array.from({ length: FORMAT2_ITEMS.length / 4 }, (_, i) => (items.includes(i) ? 0x81 : 0)),
    ...(worn === undefined ? {} : { worn }),
  };
}
const overboard2 = Array.from({ length: FORMAT2_ITEMS.length / 4 }, (_, i) => i).filter((i) => FORMAT2_ITEMS[i * 4] === 0xff)[2] ?? -1; // (the third of the finds no room shows: crank fitted, agent squashed, viktor overboard)
// format 2 (until 2026-11-25: the daruma was the parlour's, before the fish food in the finds; the parlour had two coins): a save with the daruma and the parlour's and the crossing's coins taken
{
  const p = newGame(WORLD, true);
  const at2 = (room: number, col: number, row: number) => {
    for (let i = 0; i * 3 < FORMAT2_COINS.length; i++) if (FORMAT2_COINS[i * 3] === room && FORMAT2_COINS[i * 3 + 1] === col && FORMAT2_COINS[i * 3 + 2] === row) return i;
    throw new Error(`no format 2 coin at ${room} ${col},${row}`);
  };
  const daruma2 = FORMAT2_ITEMS.findIndex((v, k) => k % 4 === 0 && v === JP.parlour) / 4, fish2 = FORMAT2_ITEMS.findIndex((v, k) => k % 4 === 0 && v === JP.crossing) / 4;
  const taken2 = [at2(JP.parlour, 25, 3), at2(JP.crossing, 16, 5)];
  const old2 = { ...snapshot(p.g), roomId: JP.platform, x2: 0x0c + (14 + 4) * 4, y: 0x32 + 17 * 8, mapRow: 2, exitCol: 14,
    coins: Array.from({ length: FORMAT2_COINS.length / 3 }, (_, i) => (taken2.includes(i) ? 0xff : 0)), items: Array.from({ length: FORMAT2_ITEMS.length / 4 }, (_, i) => (i === daruma2 ? 0x81 : 0)) };
  const t = CODEC.unpack(CODEC.pack(old2), 2);
  const daruma = itemIndex(p.g, JP.platform, 0), fish = itemIndex(p.g, JP.crossing, 0);
  const takenNow = [coinIndex(p.g, JP.parlour, 25, 3), coinIndex(p.g, JP.crossing, 16, 5)];
  check(`a format 2 save reads into today's tables: the daruma (format 2's find ${daruma2}, today's ${daruma}) still taken, the fish food (${fish2}, today's ${fish}) not; its coins taken where they are now and no other (the prize shelf's new one not)`,
    daruma2 >= 0 && fish2 === daruma2 + 1 && t.items[daruma] === 0x81 && t.items[fish] === 0 && t.items.filter((v) => v !== 0).length === 1 && takenNow.every((i) => t.coins[i] === 0xff) && t.coins.filter((v) => v !== 0).length === 2
      && t.coins.length === WORLD.coinTable.length / 3 && t.items.length === WORLD.specialItems.length / 4);
}
// a save made in the cargo plane's hold (cut 2026-11-24: room 54 at [2,19]), its coin and the parachute taken: on Hilo's apron by the biplane, both still taken (they kept their table places in Hilo)
{
  const finds = [oldItem2(41, 0), oldItem2(41, 1), oldItem2(49, 0), oldItem2(52, 0), overboard2];
  const coins = [oldCoin2(38, 9, 3), oldCoin2(52, 25, 4)];
  const t = CODEC.unpack(CODEC.pack(format2(52, 16, 5, 3, 19, coins, finds, oldItem2(41, 1))), 2);
  const p = newGame(WORLD, true);
  const parachute = itemIndex(p.g, PAC.summit, 0), musubi = itemIndex(p.g, PAC.fish, 0);
  check('a format 2 save\'s Hawaii carries over: the snorkel, the lei (worn), the parachute where they are now, the swim room\'s musubi, the ship\'s coin, Viktor overboard (a find no room shows, by its order)',
    t.items[snorkel] === 0x81 && t.items[lei] === 0x81 && t.worn === lei && t.items[parachute] === 0x81 && t.items[musubi] === 0x81 && t.coins[coinIndex(p.g, PAC.ship, 9, 3)] === 0xff && t.items[ROUNDS.ship] === 0x81);
  restore(p.g, t);
  for (let f = 0; f < 120; f++) frame(p, NONE);
  check(`a format 2 save on Hilo's apron (52, floor 5) carries on at Hilo by the biplane (room ${p.g.roomId} at [${p.g.mapRow},${p.g.exitCol}]), alive`, p.g.roomId === PAC.hilo && p.g.mapRow === 3 && p.g.exitCol === 23 && !dead(p.g));
}
{
  const t = CODEC.unpack(CODEC.pack(format2(52, 2, 19, 3, 19, [], [oldItem2(41, 0)])), 2);
  const p = newGame(WORLD, true);
  restore(p.g, t);
  for (let f = 0; f < 60; f++) frame(p, NONE);
  check(`a format 2 save on Hilo's lava shore (52, floor 19) carries on in Mauna Loa, the lava's room now (room ${p.g.roomId}), alive`, p.g.roomId === PAC.loa && !dead(p.g));
}
// a format 2 save made in the cargo plane's hold (cut 2026-11-24: room 54 at [2,19]): at Hilo by the biplane
{
  const t = CODEC.unpack(CODEC.pack(format2(54, 20, 18, 2, 19, [], [oldItem2(52, 0)])), 2);
  const p = newGame(WORLD, true);
  restore(p.g, t);
  for (let f = 0; f < 120; f++) frame(p, NONE);
  check(`a format 2 save in the cut hold carries on at Hilo (room ${p.g.roomId} at [${p.g.mapRow},${p.g.exitCol}]), alive, the parachute still taken`,
    RETIRED[54] === PAC.hilo && p.g.roomId === PAC.hilo && !dead(p.g) && t.items[itemIndex(p.g, PAC.summit, 0)] === 0x81);
}
// format 3 (the live game until the Andes' rebuild, the bonus rooms and Rio's carnival): a save made in Sugarloaf's room (69, cut: [5,31] then) with its coin, Lapa's two, HEAVEN CAN WAIT's and the
// churrascaria's taken, the crank (then in the churrascaria, now on the floats' stage) and the chullo (a key item: by its picture alone) taken
{
  const find3 = (frame: number) => Array.from({ length: FORMAT3_ITEMS.length / 4 }, (_, i) => i).find((i) => FORMAT3_ITEMS[i * 4 + 3] === frame) ?? -1;
  const coins3 = (room: number) => Array.from({ length: FORMAT3_COINS.length / 3 }, (_, i) => i).filter((i) => FORMAT3_COINS[i * 3] === room);
  const crankFrame = RIO_SPRITE.crank - 0x8e, chulloFrame = ANDES_SPRITE.chullo - 0x8e;
  const taken3 = [...coins3(69), ...coins3(RIO_ROOM.lap), ...coins3(CHI.heaven), ...coins3(RIO_ROOM.steak)];
  const s0 = snapshot(newGame(WORLD, true).g);
  const old3 = { ...s0, roomId: 69, x2: 0x0c + (12 + 4) * 4, y: standY(8), mapRow: 5, exitCol: 31,
    coins: Array.from({ length: FORMAT3_COINS.length / 3 }, (_, i) => (taken3.includes(i) ? 0xff : 0)),
    items: Array.from({ length: FORMAT3_ITEMS.length / 4 }, (_, i) => (i === find3(crankFrame) || i === find3(chulloFrame) ? 0x81 : 0)) };
  const t = CODEC.unpack(CODEC.pack(old3), 3);
  const p = newGame(WORLD, true);
  const nowOf = (room: number) => Array.from({ length: WORLD.coinTable.length / 3 }, (_, i) => i).filter((i) => WORLD.coinTable[i * 3] === room);
  const nowFind = (frame: number) => Array.from({ length: WORLD.specialItems.length / 4 }, (_, i) => i).find((i) => WORLD.specialItems[i * 4 + 3] === frame) ?? -1;
  const lapa = nowOf(RIO_ROOM.lap), heaven = nowOf(CHI.heaven), steak = nowOf(RIO_ROOM.steak);
  const wanted = [...lapa, ...heaven, ...steak];
  check(`a format 3 save reads into today's tables: Lapa's ${lapa.length} coins taken (its two and Sugarloaf's, now Lapa's third), HEAVEN CAN WAIT's ${heaven.length} and the churrascaria's ${steak.length}, no other; the crank and the chullo still taken`,
    taken3.length === 1 + 2 + heaven.length + steak.length && lapa.length === 3 && wanted.every((i) => t.coins[i] === 0xff) && t.coins.filter((v) => v !== 0).length === wanted.length
      && t.items[nowFind(crankFrame)] === 0x81 && t.items[nowFind(chulloFrame)] === 0x81 && t.items.filter((v) => v !== 0).length === 2
      && t.coins.length === WORLD.coinTable.length / 3 && t.items.length === WORLD.specialItems.length / 4);
  restore(p.g, t);
  for (let f = 0; f < 120; f++) frame(p, NONE);
  check(`a format 3 save in Sugarloaf's cut room carries on in Lapa (room ${p.g.roomId} at [${p.g.mapRow},${p.g.exitCol}]), alive`, RETIRED[69] === RIO_ROOM.lap && p.g.roomId === RIO_ROOM.lap && p.g.mapRow === 6 && p.g.exitCol === 30 && !dead(p.g));
  // every coin of format 3's rooms that are still rooms: carried to today's table where the room kept its count
  const all3 = { ...old3, roomId: 0, x2: 0x50, y: 0xc2, mapRow: 1, exitCol: 0, coins: Array.from({ length: FORMAT3_COINS.length / 3 }, () => 0xff), items: Array.from({ length: FORMAT3_ITEMS.length / 4 }, () => 0) };
  const a = CODEC.unpack(CODEC.pack(all3), 3);
  const rooms3 = [...new Set(Array.from({ length: FORMAT3_COINS.length / 3 }, (_, i) => FORMAT3_COINS[i * 3] ?? 0xff))].map((r) => (r === 69 ? RIO_ROOM.lap : r));
  const kept = [...new Set(rooms3)].filter((r) => coins3(r).length + (r === RIO_ROOM.lap ? 1 : 0) === nowOf(r).length);
  const lost = [...new Set(rooms3)].filter((r) => !kept.includes(r));
  check(`a format 3 save with every coin taken has every coin taken today in each room that kept its count (${kept.length} rooms; changed: ${lost.join(' ') || 'none'})`, kept.every((r) => nowOf(r).every((i) => a.coins[i] === 0xff)));
}
finish();
