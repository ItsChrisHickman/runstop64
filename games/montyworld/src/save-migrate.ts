import type { MontyData } from '../../montyotr/src/montydata';
import type { MontySave } from '../../montyotr/src/save';
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
  60: 59, // MARKET FORCES: Machu Picchu
  61: 59, // MIST OPPORTUNITY: Machu Picchu
  78: 58, // LLAMA DRAMA (never shipped, but a test build had it): the terraces
  // Rio
  67: 71, // QUAY TO THE CITY: Rio starts at Corcovado (OPEN ARMS)
  72: 71, // MONKEY BUSINESS: merged into OPEN ARMS (Tijuca at its foot)
  70: 69, // SUGARLOAF SUMMIT: SUGAR RUSH, the cable car
  76: 75, // FLOAT YOUR BOAT: merged into the Sambadrome (SPY VERSUS MOLE)
};

/** Where a kept room that takes the saves of cut rooms is come into, when that is not its west end, low (Rio's OPEN ARMS: high on the canopy, entered from the Amazon; its forest floor is the marmoset's). */
const WAY_IN: Readonly<Record<number, { col: number; floor: number }>> = {
  71: { col: 1, floor: 8 },
  53: { col: 22, floor: 19 }, // Hilo: the street east of the biplane
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
const ROOM_NOW: Readonly<Record<1 | 2, (id: number) => number>> = { 1: (id) => FORMAT1_MOVED[id] ?? id, 2: (id) => id };
const MOVED: Readonly<Record<1 | 2, (s: MontySave) => number>> = {
  1: (s) => FORMAT1_MOVED[s.roomId] ?? s.roomId,
  2: (s) => (s.roomId === 52 && floorAt(s.y) <= 5 ? 53 : s.roomId),
};

const PLAY_COL = 4, COLS = 32, ROWS = 20;
/** Monty's x (halved) and y standing at a playfield column on a floor row, as the engine places him. */
const x2At = (col: number) => 0x0c + (col + PLAY_COL) * 4;
const yAt = (floor: number) => 0x32 + (floor + 1) * 8;
const colAt = (x2: number) => Math.round((x2 - 0x0c) / 4) - PLAY_COL;
const floorAt = (y: number) => Math.round((y - 0x32) / 8) - 1;

/** FNV-1a over a room's cells (save-format1.ts's hash). */
function cellsHash(cells: Uint8Array): number {
  let h = 0x811c9dc5;
  for (const c of cells) h = Math.imul(h ^ c, 0x01000193) >>> 0;
  return h;
}

/** The nearest place to (col, floor) in a room where he can stand: two cells of air for his body over two that hold him (a wall or a floor), nothing deadly underfoot, no timed strike where he stands. */
export function standingPlace(data: MontyData, room: number, col: number, floor: number): { col: number; floor: number } | null {
  const def = data.roomDef(room);
  const flag = (c: number, r: number) => {
    const code = def.cells[r * COLS + c] ?? 0;
    return code === 0 ? 0 : data.tileProperty(def.tiles[code - 1] ?? 0);
  };
  let best: { col: number; floor: number; d: number } | null = null;
  for (let f = 2; f < ROWS; f++) for (let c = 0; c < COLS - 1; c++) {
    const air = [f - 2, f - 1].every((r) => [c, c + 1].every((cc) => flag(cc, r) === 0 || flag(cc, r) === 3));
    const holds = [c, c + 1].every((cc) => flag(cc, f) === 1 || flag(cc, f) === 2);
    // (nor where a timed strike of the room comes: a torch, a vent, a moray)
    const struck = data.pulses.some((p) => p.room === room && p.live > 0 && p.col <= c + 1 && p.col + p.cols > c && p.row <= f - 1 && p.row + p.rows > f - 2);
    if (!air || !holds || struck) continue;
    const d = (c - col) ** 2 + (f - floor) ** 2;
    if (!best || d < best.d) best = { col: c, floor: f, d };
  }
  return best ? { col: best.col, floor: best.floor } : null;
}

/** A save of any format made in a room cut since: carried on in the kept room that takes its saves, where that room is come into (`WAY_IN`, else its west end, low), at today's cell. Any other save as it is. */
export function carryOn(data: MontyData, s: MontySave): MontySave {
  const kept = RETIRED[s.roomId];
  const cell = kept === undefined ? -1 : [...data.exitGrid.image].indexOf(kept);
  if (kept === undefined || cell < 0) return s;
  const way = WAY_IN[kept] ?? { col: 0, floor: ROWS - 1 };
  const spot = standingPlace(data, kept, way.col, way.floor);
  return { ...s, roomId: kept, mapRow: Math.floor(cell / data.exitGrid.cols), exitCol: cell % data.exitGrid.cols, ...(spot ? { x2: x2At(spot.col), y: yAt(spot.floor) } : {}) };
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
    const [room, col, row] = [ROOM_NOW[format](then.coins[i * 3] ?? 0xff), then.coins[i * 3 + 1], then.coins[i * 3 + 2]];
    for (let j = 0; j < coins.length; j++) if (data.coinTable[j * 3] === room && data.coinTable[j * 3 + 1] === col && data.coinTable[j * 3 + 2] === row) coins[j] = s.coins[i] ?? 0;
  }
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
    // (a cut room's place means nothing in the kept one: he carries on where the kept room is come into (`WAY_IN`), else at its west end, low, where a way in usually is; a changed room's, as near his place as he can stand)
    const cut = was !== s.roomId || RETIRED[was] !== undefined;
    const way = WAY_IN[roomId] ?? { col: 0, floor: ROWS - 1 };
    const spot = changed ? standingPlace(data, roomId, cut ? way.col : colAt(s.x2), cut ? way.floor : floorAt(s.y)) : null;
    if (spot) { place.x2 = x2At(spot.col); place.y = yAt(spot.floor); }
  }
  const out: MontySave = { ...s, ...place, roomId: cell >= 0 ? roomId : s.roomId, coins, items };
  delete out.worn;
  return worn >= 0 ? { ...out, worn } : out;
}

/** A format 1 save as one of today's. */
export const fromFormat1 = (data: MontyData, s: MontySave): MontySave => fromFormat(data, s, 1);
/** A format 2 save as one of today's. */
export const fromFormat2 = (data: MontyData, s: MontySave): MontySave => fromFormat(data, s, 2);
