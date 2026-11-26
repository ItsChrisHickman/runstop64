/**
 * What the regions' mechanism tests share: a game with Monty standing in a room with its creatures out of the way, the stick held for some frames, whether he is
 * dying, the character at a cell, the text in the name row, the first frame a death happens.
 */
import { enterRoom } from '../../montyotr/src/ending';
import type { Game, Input as Stick } from '../../montyotr/src/game';
import { frame, NONE, type State } from '../../montyotr/test/play';
import { ROW, SCREEN } from '../../shared/monty/screen';
import { WORLD } from '../src/data';
import { cellOf } from '../../montyotr/src/montydata';
import { must } from '../../shared/test/must';
import { newGame } from '../../shared/monty/test/bot';
import { itemIndex, standY } from './route';

/** What the map keeps of a room he has been to, at its cell of today's exit grid: [x2, y, map row, exit column]. */
export function kept(room: number): [number, number, number, number] {
  const c = must(cellOf(WORLD, room), `room ${room} on the exit grid`);
  return [0x40, 0xb2, c.row, c.col];
}

export const LEFT: Stick = { ...NONE, left: true };
export const RIGHT: Stick = { ...NONE, right: true };
export const UP: Stick = { ...NONE, up: true };

/** A game with Monty standing in a room (col, the floor's row), the creatures out of the way, holding the items (`[room, nth]` of the room's items). */
export function at(room: number, col: number, floor: number, holds: readonly (readonly [room: number, nth: number])[] = [], enhanced = false, creatures = false): State {
  const s = newGame(WORLD, enhanced);
  for (const [r, n] of holds) s.g.siCollected[itemIndex(s.g, r, n)] = 0x81;
  enterRoom(s.g, room, 0x0c + (col + 4) * 4, standY(floor));
  if (!creatures) {
    s.g.enemies = [];
    s.g.enable &= 0x0f;
    s.g.vic.enable &= 0x0f;
  }
  return s;
}

export const run = (s: State, stick: Stick, frames: number) => { for (let i = 0; i < frames; i++) frame(s, stick); };
/** Whether a death has begun (an event is pending or the sequence runs). */
export const dead = (g: Game) => g.actionCounter !== 0 || g.script !== null;
/** His column in the playfield. */
export const colOf = (g: Game) => g.montyCol - 4;
/** The place's name row as text. */
export const rowText = (g: Game) => Array.from({ length: 32 }, (_, i) => {
  const v = (g.mem[SCREEN + 24 * ROW + 4 + i] ?? 0) & 0x3f;
  return v >= 1 && v <= 26 ? String.fromCharCode(64 + v) : v === 0 ? ' ' : String.fromCharCode(v);
}).join('').trim();
/** The character at a playfield cell. */
export const cell = (g: Game, col: number, row: number) => g.mem[SCREEN + (row + 3) * ROW + col + 4] ?? 0;
/** The first frame (up to `limit`) a death happens, or -1. */
export function diesAt(s: State, stick: Stick, limit: number): number {
  for (let f = 0; f < limit; f++) { frame(s, stick); if (dead(s.g)) return f; }
  return -1;
}

/**
 * The rooms with more creatures than Monty can meet in a costume: the worn hat is drawn in VIC sprite 7, enemy slot 3's, whose collisions are then ignored, so a fourth creature
 * would be a phantom (never drawn, never touching him). Every room of a region he wears a hat through has at most 3.
 */
export function overCrowded(rooms: readonly { readonly id: number; readonly enemies?: readonly unknown[] }[]): number[] {
  return rooms.filter((r) => (r.enemies?.length ?? 0) > 3).map((r) => r.id);
}

// ---- the world's tables, read by region (so a region's test never hard-codes another region's totals) ----------------------------------------

/** A line of the pause screen's panel: the label and the count of what is taken (`0/n`), right-aligned to the panel's 11 characters. */
export const panelLine = (label: string, of: number, taken = 0) => `${label}${`${taken}/${of}`.padStart(11 - label.length)}`;

const coinRooms = () => Array.from({ length: WORLD.coinTable.length / 3 }, (_, i) => WORLD.coinTable[i * 3] ?? 0);
const itemRooms = () => Array.from({ length: WORLD.specialItems.length / 4 }, (_, i) => WORLD.specialItems[i * 4] ?? 0);
/** How many coins / special items (finds and snacks) lie in rooms `lo` to `hi`. */
export const coinsIn = (lo: number, hi: number) => coinRooms().filter((r) => r >= lo && r <= hi).length;
export const itemsIn = (lo: number, hi: number) => itemRooms().filter((r) => r >= lo && r <= hi).length;
const roomOfItem = (i: number) => WORLD.specialItems[i * 4] ?? -1;
/** The key items / the snacks (the pause screen's ITEMS and SNACKS) in rooms `lo` to `hi`. */
export const keyItemsIn = (lo: number, hi: number) => WORLD.progress.keyItems.filter((i) => roomOfItem(i) >= lo && roomOfItem(i) <= hi).length;
export const snacksIn = (lo: number, hi: number) => WORLD.progress.cakes.filter((i) => roomOfItem(i) >= lo && roomOfItem(i) <= hi).length;

/**
 * What a save from before a region has: the tables hold the earlier regions' entries first, so an old save's arrays are as long as the entries of the rooms before
 * `lo` (the region's lowest room id). `ordered` says the tables really are in that order: the earlier entries, then the region's own (rooms `lo` to `hi`).
 */
export function entriesBefore(lo: number, hi: number): { coins: number; items: number; ordered: boolean } {
  const coins = coinRooms(), items = itemRooms();
  const nCoins = coins.filter((r) => r < lo).length, nItems = items.filter((r) => r < lo).length;
  const own = (rooms: readonly number[], from: number, n: number) => rooms.slice(from, from + n).every((r) => r >= lo && r <= hi);
  return {
    coins: nCoins, items: nItems,
    ordered: coins.slice(0, nCoins).every((r) => r < lo) && items.slice(0, nItems).every((r) => r < lo) && own(coins, nCoins, coinsIn(lo, hi)) && own(items, nItems, itemsIn(lo, hi)),
  };
}
