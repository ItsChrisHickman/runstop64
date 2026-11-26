import type { MontyData } from '../../montyotr/src/montydata';
import type { MontySave } from '../../montyotr/src/save';
import { colAt, floorAt, standingPlace, standX2, standY } from '../../montyotr/src/way-in';
import { FORMAT1_COINS, FORMAT1_ITEMS, FORMAT1_ROOMS } from './save-format1';
import { FORMAT2_COINS, FORMAT2_ITEMS, FORMAT2_ROOMS } from './save-format2';

/**
 * Reading a save of an earlier format into today's tables: format 1 (the game as shipped before the reset) and format 2 (after the reset, before Hawaii's island hopping came back, the parlour's prize shelf took a coin and the daruma moved to BULLET POINT's platform, 2026-11-25). A save's coins
 * and finds are flags by their place in the tables, and the reset and Hawaii's return cut, moved and added rooms, so each flag is matched to what it was (save-format1.ts, save-format2.ts) and set where that
 * is now: a coin by its room and cell, a find by its room and picture, a key item by its picture alone (the chullo moved rooms, the snorkel, the lei and the parachute too), a find no room shows by its order
 * among them (Viktor's escapes). Coins and snacks of rooms that were cut are gone with them; every key item taken stays taken, so no gate closes again.
 * Where he was: a room that was cut sends him to the kept room the region's plan names (`RETIRED`), at the nearest place he can stand to its west end, low; a room whose cells changed puts him on the nearest place in it he can stand, so a saved place never leaves
 * him inside a wall; and the cell of the exit grid he is in is today's cell for that room.
 *
 * A room cut after format 2 (the cargo plane's hold, 2026-11-24) is `carryOn`'s too: every save read, of any format, made in a cut room carries on in the kept room, as a format 1 save's does.
 */

/** The rooms the reset cut, and the kept room of the same region a save in one carries on in (docs/dosvidaniya-reset.md). Other regions' rebuilds add theirs here. */
export const RETIRED: Readonly<Record<number, number>> = {
  // Siberia: the forest carries on in the yeti's cave, the dark shaft in the mine, the lake at the border
  12: 13, // PINE TO BE WILD
  15: 14, // SHAFT OF DARKNESS
  16: 17, // BAIKAL TO BASICS
  // the Pacific: the rooms Hawaii's island hopping did not bring back (2026-11-25; the rest are rooms again) carry on in the room of their island or crossing
  39: 38, // BOX CLEVER: the cargo ship
  40: 41, // PIER PRESSURE: Waikiki
  44: 43, // MOLE-OKAI: the swim past Molokai (CHANNEL SURFING)
  50: 49, // FISH OUT OF WATER (format 1's): today's SHELL GAME, the crossing to the Big Island
  54: 53, // THE CARGO PLANE (HOLD YOUR HORSES in format 1): Hilo, by the biplane
  // the Andes and the Amazon
  56: 57, // OUT OF THIN AIR: the gorge (CONDOR COUNTRY)
  60: 59, // MARKET FORCES: Machu Picchu
  61: 59, // MIST OPPORTUNITY: Machu Picchu
  64: 66, // THE RIVER QUEEN: the rainforest's river
  78: 58, // LLAMA DRAMA (never shipped, but a test build had it): the terraces
  // Rio
  67: 71, // QUAY TO THE CITY: Rio starts at Corcovado (OPEN ARMS)
  72: 71, // MONKEY BUSINESS: merged into OPEN ARMS (Tijuca at its foot)
  70: 69, // SUGARLOAF SUMMIT: SUGAR RUSH, the cable car
  76: 75, // FLOAT YOUR BOAT: merged into the Sambadrome (SPY VERSUS MOLE)
};

/**
 * A room whose id took a different place in a format: where a save made in it then carries on (before `RETIRED`). Format 1's HANA BANANA (49) is HANA now (87: 49 is the swim to the Big Island); format 2's
 * HILO (52) was the lava and the airport in one: a save on its apron (floor 5 and above) carries on in Hilo by the biplane (53), one in the crater on Mauna Loa (52, the lava's room now).
 */
const MOVED: Readonly<Record<1 | 2, (s: MontySave) => number>> = {
  1: (s) => (s.roomId === 49 ? 87 : s.roomId),
  2: (s) => (s.roomId === 52 && floorAt(s.y) <= 5 ? 53 : s.roomId),
};

/** West end, low: where a cut room's saves carry on in the kept room unless it is come into elsewhere (`MontyData.waysIn`). */
const WEST_LOW = { col: 0, floor: 19 };
const wayOf = (data: MontyData, room: number) => data.waysIn?.[room] ?? WEST_LOW;

/** FNV-1a over a room's cells (save-format1.ts's hash). */
function cellsHash(cells: Uint8Array): number {
  let h = 0x811c9dc5;
  for (const c of cells) h = Math.imul(h ^ c, 0x01000193) >>> 0;
  return h;
}

/** A save of any format made in a room cut since: carried on in the kept room that takes its saves, where that room is come into (`MontyData.waysIn`, else its west end, low), at today's cell. Any other save as it is. */
export function carryOn(data: MontyData, s: MontySave): MontySave {
  const kept = RETIRED[s.roomId];
  const cell = kept === undefined ? -1 : [...data.exitGrid.image].indexOf(kept);
  if (kept === undefined || cell < 0) return s;
  const way = wayOf(data, kept);
  const spot = standingPlace(data, kept, way.col, way.floor);
  return { ...s, roomId: kept, mapRow: Math.floor(cell / data.exitGrid.cols), exitCol: cell % data.exitGrid.cols, ...(spot ? { x2: standX2(spot.col), y: standY(spot.floor) } : {}) };
}

/** The tables a format's saves were written against: its coins (room, column, row), finds (room, x, y, picture) and rooms (id, hash of the cells). */
interface Tables { readonly coins: readonly number[]; readonly items: readonly number[]; readonly rooms: readonly number[] }
const FORMATS: Readonly<Record<1 | 2, Tables>> = {
  1: { coins: FORMAT1_COINS, items: FORMAT1_ITEMS, rooms: FORMAT1_ROOMS },
  2: { coins: FORMAT2_COINS, items: FORMAT2_ITEMS, rooms: FORMAT2_ROOMS },
};

/** A save of format `format` as one of today's. */
export function fromFormat(data: MontyData, s: MontySave, format: 1 | 2): MontySave {
  const then = FORMATS[format];
  const coins = Array.from({ length: data.coinTable.length / 3 }, () => 0);
  for (let i = 0; i * 3 < then.coins.length; i++) {
    if (!s.coins[i]) continue;
    const [room, col, row] = [then.coins[i * 3], then.coins[i * 3 + 1], then.coins[i * 3 + 2]];
    for (let j = 0; j < coins.length; j++) if (data.coinTable[j * 3] === room && data.coinTable[j * 3 + 1] === col && data.coinTable[j * 3 + 2] === row) coins[j] = s.coins[i] ?? 0;
  }
  const items = Array.from({ length: data.specialItems.length / 4 }, () => 0);
  const keyFrames = new Set(data.progress.keyItems.map((k) => data.specialItems[k * 4 + 3]));
  /** The finds no room shows (room $FF), in their order, then and now. */
  const hidden = (table: ArrayLike<number>) => Array.from({ length: table.length / 4 }, (_, i) => i).filter((i) => table[i * 4] === 0xff);
  const hiddenThen = hidden(then.items), hiddenNow = hidden(data.specialItems);
  /** Today's place of a find of that format, or -1 (a snack of a room that was cut). */
  const itemNow = (i: number): number => {
    const room = then.items[i * 4], frame = then.items[i * 4 + 3];
    if (room === 0xff) return hiddenNow[hiddenThen.indexOf(i)] ?? -1;
    for (let j = 0; j < items.length; j++) {
      if (data.specialItems[j * 4 + 3] !== frame) continue;
      if (keyFrames.has(frame) || data.specialItems[j * 4] === room) return j;
    }
    return -1;
  };
  for (let i = 0; i * 4 < then.items.length; i++) {
    const j = itemNow(i);
    if (s.items[i] && j >= 0) items[j] = s.items[i] ?? 0;
  }
  const worn = s.worn === undefined ? -1 : itemNow(s.worn);

  // where he was
  const was = MOVED[format](s);
  const roomId = RETIRED[was] ?? was;
  const cell = [...data.exitGrid.image].indexOf(roomId);
  const place = { x2: s.x2, y: s.y, mapRow: s.mapRow, exitCol: s.exitCol };
  if (cell >= 0) {
    place.mapRow = Math.floor(cell / data.exitGrid.cols);
    place.exitCol = cell % data.exitGrid.cols;
    const k = then.rooms.findIndex((v, n) => n % 2 === 0 && v === s.roomId);
    const changed = roomId !== s.roomId || k < 0 || then.rooms[k + 1] !== cellsHash(data.roomDef(roomId).cells);
    // (a cut room's place means nothing in the kept one: he carries on where the kept room is come into (`MontyData.waysIn`), else at its west end, low, where a way in usually is; a changed room's, as near his place as he can stand)
    const cut = was !== s.roomId || RETIRED[was] !== undefined;
    const way = wayOf(data, roomId);
    const spot = changed ? standingPlace(data, roomId, cut ? way.col : colAt(s.x2), cut ? way.floor : floorAt(s.y)) : null;
    if (spot) { place.x2 = standX2(spot.col); place.y = standY(spot.floor); }
  }
  const out: MontySave = { ...s, ...place, roomId: cell >= 0 ? roomId : s.roomId, coins, items };
  delete out.worn;
  return worn >= 0 ? { ...out, worn } : out;
}

/** A format 1 save as one of today's. */
export const fromFormat1 = (data: MontyData, s: MontySave): MontySave => fromFormat(data, s, 1);
/** A format 2 save as one of today's. */
export const fromFormat2 = (data: MontyData, s: MontySave): MontySave => fromFormat(data, s, 2);
