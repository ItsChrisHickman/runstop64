import type { MontyData } from '../../montyotr/src/montydata';
import type { MontySave } from '../../montyotr/src/save';
import { FORMAT1_COINS, FORMAT1_ITEMS, FORMAT1_ROOMS } from './save-format1';

/**
 * Reading a format 1 save (the game as shipped before the reset) into today's tables. A save's coins and finds are flags by their place in the tables, and the reset cut, moved and added rooms, so each
 * flag is matched to what it was (save-format1.ts) and set where that is now: a coin by its room and cell, a find by its room and picture, a key item by its picture alone (the chullo moved rooms). Coins and
 * snacks of rooms that were cut are gone with them; every key item taken stays taken, so no gate closes again.
 * Where he was: a room that was cut sends him to the kept room the region's plan names (`RETIRED`); a room whose cells changed puts him on the nearest place in it he can stand, so a saved place never leaves
 * him inside a wall; and the cell of the exit grid he is in is today's cell for that room.
 */

/** The rooms the reset cut, and the kept room of the same region a save in one carries on in (docs/dosvidaniya-reset.md). Other regions' rebuilds add theirs here. */
export const RETIRED: Readonly<Record<number, number>> = {
  // the Pacific (docs/dosvidaniya-reset.md): each cut room's save carries on in the kept room of its island or crossing
  39: 38, // BOX CLEVER: the cargo ship
  40: 41, // PIER PRESSURE: Waikiki
  42: 41, // LEI OF THE LAND: Waikiki
  43: 49, // CLAM DOWN: Hana's sea
  44: 49, // MOLE-OKAI: Hana
  45: 49, // KELP WANTED: Hana's sea
  46: 49, // WHALE OF A TIME: Hana (Maui)
  47: 49, // THE ROAD TO HANA: Hana
  48: 49, // THE SEA CAVE: Hana's sea
  50: 49, // FISH OUT OF WATER: Hana's sea
  51: 52, // COFFEE BREAK: Hilo (the Big Island)
  53: 52, // HILO GOODBYE: Hilo
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

/** The nearest place to (col, floor) in a room where he can stand: two cells of air for his body over two that hold him (a wall or a floor), nothing deadly underfoot. */
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
    if (!air || !holds) continue;
    const d = (c - col) ** 2 + (f - floor) ** 2;
    if (!best || d < best.d) best = { col: c, floor: f, d };
  }
  return best ? { col: best.col, floor: best.floor } : null;
}

/** A format 1 save as one of today's. */
export function fromFormat1(data: MontyData, s: MontySave): MontySave {
  const coins = Array.from({ length: data.coinTable.length / 3 }, () => 0);
  for (let i = 0; i * 3 < FORMAT1_COINS.length; i++) {
    if (!s.coins[i]) continue;
    const [room, col, row] = [FORMAT1_COINS[i * 3], FORMAT1_COINS[i * 3 + 1], FORMAT1_COINS[i * 3 + 2]];
    for (let j = 0; j < coins.length; j++) if (data.coinTable[j * 3] === room && data.coinTable[j * 3 + 1] === col && data.coinTable[j * 3 + 2] === row) coins[j] = s.coins[i] ?? 0;
  }
  const items = Array.from({ length: data.specialItems.length / 4 }, () => 0);
  const keyFrames = new Set(data.progress.keyItems.map((k) => data.specialItems[k * 4 + 3]));
  /** Today's place of a format 1 find, or -1 (a snack of a room that was cut). */
  const itemNow = (i: number): number => {
    const room = FORMAT1_ITEMS[i * 4], frame = FORMAT1_ITEMS[i * 4 + 3];
    for (let j = 0; j < items.length; j++) {
      if (data.specialItems[j * 4 + 3] !== frame) continue;
      if (keyFrames.has(frame) || data.specialItems[j * 4] === room) return j;
    }
    return -1;
  };
  for (let i = 0; i * 4 < FORMAT1_ITEMS.length; i++) {
    const j = itemNow(i);
    if (s.items[i] && j >= 0) items[j] = s.items[i] ?? 0;
  }
  const worn = s.worn === undefined ? -1 : itemNow(s.worn);

  // where he was
  const roomId = RETIRED[s.roomId] ?? s.roomId;
  const cell = [...data.exitGrid.image].indexOf(roomId);
  const place = { x2: s.x2, y: s.y, mapRow: s.mapRow, exitCol: s.exitCol };
  if (cell >= 0) {
    place.mapRow = Math.floor(cell / data.exitGrid.cols);
    place.exitCol = cell % data.exitGrid.cols;
    const was = FORMAT1_ROOMS.findIndex((v, k) => k % 2 === 0 && v === s.roomId);
    const changed = roomId !== s.roomId || was < 0 || FORMAT1_ROOMS[was + 1] !== cellsHash(data.roomDef(roomId).cells);
    const spot = changed ? standingPlace(data, roomId, colAt(s.x2), floorAt(s.y)) : null;
    if (spot) { place.x2 = x2At(spot.col); place.y = yAt(spot.floor); }
  }
  const out: MontySave = { ...s, ...place, roomId: cell >= 0 ? roomId : s.roomId, coins, items };
  delete out.worn;
  return worn >= 0 ? { ...out, worn } : out;
}
