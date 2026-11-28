import type { Condition, MontyData } from '../../montyotr/src/montydata';
import type { MontySave } from '../../montyotr/src/save';
import { colAt, floorAt, standingPlace, standX2, standY } from '../../montyotr/src/way-in';
import { FORMAT1_COINS, FORMAT1_ITEMS, FORMAT1_ROOMS } from './save-format1';
import { FORMAT2_COINS, FORMAT2_ITEMS, FORMAT2_ROOMS } from './save-format2';
import { FORMAT3_COINS, FORMAT3_ITEMS, FORMAT3_ROOMS } from './save-format3';

/** The formats before today's that a save may be in. */
type Older = 1 | 2 | 3;

/**
 * Reading a save of an earlier format into today's tables: format 1 (the game as shipped before the reset), format 3 (2026-11-25/26, before the Andes' rebuild, the bonus rooms off the path and Rio's carnival: save-format3.ts) and format 2 (after the reset, before Hawaii's island hopping came back, the parlour's prize shelf took a coin and the daruma moved to BULLET POINT's platform, 2026-11-25). A save's coins
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
  60: 59, // MARKET FORCES: Machu Picchu
  61: 59, // MIST OPPORTUNITY: Machu Picchu
  78: 58, // LLAMA DRAMA (never shipped, but a test build had it): the terraces
  // Rio
  67: 71, // QUAY TO THE CITY: Rio starts at Corcovado (OPEN ARMS)
  72: 71, // MONKEY BUSINESS: merged into OPEN ARMS (Tijuca at its foot)
  69: 68, // Sugarloaf and its cable car (cut 2026-11-25): Lapa, the room before it on the street
  // (70 and 76 are rooms again: BEAT THE DRUM and FLOAT YOUR BOAT, the carnival, 2026-11-25; a format 1 save in SUGARLOAF SUMMIT's 70 carries on in BEAT THE DRUM)
};

/**
 * A room whose id took a different place in a format: where a save made in it then carries on (before `RETIRED`). Format 1's HANA BANANA (49) is HANA now (87: 49 is the swim to the Big Island), its CLOUD NINE and VINE AND DANDY 84 and 85; format 2's
 * HILO (52) was the lava and the airport in one: a save on its apron (floor 5 and above) carries on in Hilo by the biplane (53), one in the crater on Mauna Loa (52, the lava's room now).
 */
/**
 * Format 1's rooms whose ids other rooms took: HANA BANANA (49) is HANA (87); CLOUD NINE (62), VINE AND DANDY (65) and THE RIVER ENDS (66) came back as 84, 85 and 94 (62 is the canopy's now, 65 the
 * roots', 66 the creek's). Their coins and snacks are matched in the room they are in now, and so is where he was.
 */
const FORMAT1_MOVED: Readonly<Record<number, number>> = { 49: 87, 62: 84, 65: 85, 66: 94 };
/** A room of a format's tables as today's id: the room that came back under a new id (coins and finds; where he was is `MOVED`). */
/** Formats 2's and 3's Sugarloaf room (69, cut with its cable car 2026-11-25): its coin is Lapa's third now (the steps up from the carnival's street), so its coins are Lapa's. */
const SUGARLOAF_MOVED: Readonly<Record<number, number>> = { 69: 68 };
const ROOM_NOW: Readonly<Record<Older, (id: number) => number>> = { 1: (id) => FORMAT1_MOVED[id] ?? id, 2: (id) => SUGARLOAF_MOVED[id] ?? id, 3: (id) => SUGARLOAF_MOVED[id] ?? id };
const MOVED: Readonly<Record<Older, (s: MontySave) => number>> = {
  1: (s) => FORMAT1_MOVED[s.roomId] ?? s.roomId,
  2: (s) => (s.roomId === 52 && floorAt(s.y) <= 5 ? 53 : s.roomId),
  3: (s) => s.roomId,
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

/**
 * A gate used on the spot and kept (`RoomEffect.at.keep`) that a save made before the keeping (2026-11-27: China's trapdoor, city gate and raft opened as the room loaded) has passed: kept as it is read, so
 * it never loads with the gate shut behind him (the trapdoor under MIND THE BATTLEMENTS, a dead end, its rope out of reach from above). Passed: the item held (the effect's `taken` conditions hold) and the
 * save made in a room `beyond` it or having been in one. A save before the gate is as it is: he carries the item up to it and sees it give way.
 */
export function gatesPassed(data: MontyData, s: MontySave): MontySave {
  const been = new Set([s.roomId, ...(s.visited ?? [])]);
  const holds = (c: Condition) => ('taken' in c ? !!s.items[c.taken] : 'notTaken' in c ? !s.items[c.notTaken] : false);
  const passed = data.roomEffects.flatMap((e) => {
    const keep = e.at?.keep, beyond = e.at?.beyond ?? [];
    return keep !== undefined && !s.items[keep] && (e.when ?? []).every(holds) && beyond.some((r) => been.has(r)) ? [keep] : [];
  });
  if (!passed.length) return s;
  const items = Array.from({ length: Math.max(s.items.length, ...passed.map((k) => k + 1)) }, (_, i) => s.items[i] ?? 0);
  for (const k of passed) items[k] = 0x81;
  return { ...s, items };
}

/** A save of any format made in a room cut since: carried on in the kept room that takes its saves, where that room is come into (`MontyData.waysIn`, else its west end, low), at today's cell; and every gate it has passed kept (`gatesPassed`). Any other save as it is. */
export function carryOn(data: MontyData, saved: MontySave): MontySave {
  const s = gatesPassed(data, saved);
  const kept = RETIRED[s.roomId];
  const cell = kept === undefined ? -1 : [...data.exitGrid.image].indexOf(kept);
  if (kept === undefined || cell < 0) return s;
  const way = wayOf(data, kept);
  const spot = standingPlace(data, kept, way.col, way.floor);
  return { ...s, roomId: kept, mapRow: Math.floor(cell / data.exitGrid.cols), exitCol: cell % data.exitGrid.cols, ...(spot ? { x2: standX2(spot.col), y: standY(spot.floor) } : {}) };
}

/** The tables a format's saves were written against: its coins (room, column, row), finds (room, x, y, picture) and rooms (id, hash of the cells). */
interface Tables { readonly coins: readonly number[]; readonly items: readonly number[]; readonly rooms: readonly number[] }
const FORMATS: Readonly<Record<Older, Tables>> = {
  1: { coins: FORMAT1_COINS, items: FORMAT1_ITEMS, rooms: FORMAT1_ROOMS },
  2: { coins: FORMAT2_COINS, items: FORMAT2_ITEMS, rooms: FORMAT2_ROOMS },
  3: { coins: FORMAT3_COINS, items: FORMAT3_ITEMS, rooms: FORMAT3_ROOMS },
};

/**
 * Each coin of a format's table and today's place of it: the coin at the same cell of the room it is in now; and where a room's coins moved (Rio's and the Andes' rebuilds), the ones left unmatched in
 * their order, when as many are left then as now (the room kept its count, so a room whose coins were all taken still has them all taken). A coin with neither is gone with its room or its cell.
 */
function coinsNow(data: MontyData, then: readonly number[], roomNow: (id: number) => number): [then: number, now: number][] {
  const byRoom = (table: ArrayLike<number>, room: (id: number) => number) => {
    const out = new Map<number, number[]>();
    for (let i = 0; i * 3 < table.length; i++) {
      const r = room(table[i * 3] ?? 0xff), list = out.get(r) ?? [];
      list.push(i);
      out.set(r, list);
    }
    return out;
  };
  const nowByRoom = byRoom(data.coinTable, (id) => id), pairs: [number, number][] = [];
  for (const [room, olds] of byRoom(then, roomNow)) {
    const news = nowByRoom.get(room) ?? [], used = new Set<number>(), left: number[] = [];
    for (const i of olds) {
      const j = news.find((k) => !used.has(k) && data.coinTable[k * 3 + 1] === then[i * 3 + 1] && data.coinTable[k * 3 + 2] === then[i * 3 + 2]);
      if (j === undefined) left.push(i);
      else { used.add(j); pairs.push([i, j]); }
    }
    const free = news.filter((k) => !used.has(k));
    if (left.length === free.length) left.forEach((i, n) => pairs.push([i, free[n] ?? -1]));
  }
  return pairs.filter(([, j]) => j >= 0);
}

/** A save of format `format` as one of today's. */
export function fromFormat(data: MontyData, s: MontySave, format: Older): MontySave {
  const then = FORMATS[format];
  const coins = Array.from({ length: data.coinTable.length / 3 }, () => 0);
  for (const [i, j] of coinsNow(data, then.coins, ROOM_NOW[format])) coins[j] = s.coins[i] ?? 0;
  const items = Array.from({ length: data.specialItems.length / 4 }, () => 0);
  const keyFrames = new Set(data.progress.keyItems.map((k) => data.specialItems[k * 4 + 3]));
  /** The finds no room shows (room $FF), in their order, then and now. */
  const hidden = (table: ArrayLike<number>) => Array.from({ length: table.length / 4 }, (_, i) => i).filter((i) => table[i * 4] === 0xff);
  const hiddenThen = hidden(then.items), hiddenNow = hidden(data.specialItems);
  /** Today's place of a find of that format, or -1 (a snack of a room that was cut). */
  const itemNow = (i: number): number => {
    const room = then.items[i * 4] ?? 0xff, frame = then.items[i * 4 + 3];
    if (room === 0xff) return hiddenNow[hiddenThen.indexOf(i)] ?? -1;
    const roomNow = ROOM_NOW[format](room);
    for (let j = 0; j < items.length; j++) {
      if (data.specialItems[j * 4 + 3] !== frame) continue;
      if (keyFrames.has(frame) || data.specialItems[j * 4] === roomNow) return j;
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
/** A format 3 save (the Andes before their rebuild, no bonus rooms, Rio with Sugarloaf) as one of today's. */
export const fromFormat3 = (data: MontyData, s: MontySave): MontySave => fromFormat(data, s, 3);
