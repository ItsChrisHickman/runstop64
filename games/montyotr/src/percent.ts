import type { MontyData } from './montydata';
import { cellOf } from './montydata';
import { regionAt } from './regions';

/**
 * A game's % complete (Do Svidaniya Monty's `complete`; Chris, 2026-11-25: "I love when games have a % complete -- and I love the idea of there being a best
 * ending for 100% complete"), the one owner of what counts and how it is summed: every room of the exit grid visited (but the ending's, runstop64's and the flight
 * rooms, which he passes through without choosing: the parachute's drop and the plane's legs), every coin, every snack and key item, each bonus room's challenge
 * (done once every coin of the room is his: the coins are where its challenge ends) and each of the pursuers' chases escaped (their `until` finds). Each is
 * one part, and the % is of the parts: 100 only when every part is done. Each part belongs to the region of its room's cell, for the passport's stamps.
 *
 * What it reads is a game's progress (`Progress`): the game's, or a save's, so the pause screen, THE END and the finale count the same.
 */

/** What the % is counted from: the rooms visited (flags by room id), the coins taken and the special items taken (flags by their place in the tables). */
export interface Progress {
  readonly visited: ArrayLike<number>;
  readonly coins: ArrayLike<number>;
  readonly items: ArrayLike<number>;
}

/** Parts done of parts there are. */
export interface Tally { readonly got: number; readonly all: number }

/** A region's tally (the data's `regions`, by name), for its stamp. */
export interface RegionTally extends Tally { readonly name: string }

/** The parts of a game, each with the index of the region it belongs to (-1: none). */
interface Parts {
  readonly rooms: readonly { readonly id: number; readonly region: number }[];
  readonly coins: readonly { readonly index: number; readonly region: number }[];
  readonly items: readonly { readonly index: number; readonly region: number }[];
  readonly bonus: readonly { readonly coins: readonly number[]; readonly region: number }[];
  readonly regions: readonly string[];
}

const made = new WeakMap<MontyData, Parts | null>();

/** The rooms a game passes him through without his choosing (the parachute's drop, the plane's legs): not counted. */
export const flightRooms = (data: MontyData): number[] => [...data.flights.map((f) => f.room), ...data.planes.map((p) => p.room)];

/** A game's parts, worked out once; null for a game with no % (Monty on the Run's). */
function partsOf(data: MontyData): Parts | null {
  const known = made.get(data);
  if (known !== undefined) return known;
  const spec = data.complete;
  if (!spec) { made.set(data, null); return null; }
  const named = data.regions.filter((r) => r.name !== undefined);
  const regions = named.map((r) => r.name ?? '');
  const regionOf = (room: number): number => {
    const cell = cellOf(data, room);
    const r = cell ? regionAt(named, cell.row, cell.col) : undefined;
    return r ? named.indexOf(r) : -1;
  };
  const skip = new Set([...data.untravellable, ...flightRooms(data)]);
  const rooms = [...new Set(data.exitGrid.image)].filter((id) => id !== 0xff && !skip.has(id) && !data.isExtensionRoom(id)).map((id) => ({ id, region: regionOf(id) }));
  const coins = Array.from({ length: data.coinTable.length / 3 }, (_, index) => ({ index, region: regionOf(data.coinTable[index * 3] ?? 0xff) }));
  const chases = [...new Set(data.pursuers.map((p) => p.until))];
  const counted = [...new Set([...data.progress.keyItems, ...data.progress.cakes, ...chases])];
  // (a find no room shows, a chase's, belongs to its pursuer's room)
  const roomOfItem = (i: number) => data.pursuers.find((p) => p.until === i)?.room ?? data.specialItems[i * 4] ?? 0xff;
  const items = counted.map((index) => ({ index, region: regionOf(roomOfItem(index)) }));
  const bonus = spec.bonus.map((room) => {
    const mine = coins.filter((c) => data.coinTable[c.index * 3] === room).map((c) => c.index);
    if (!mine.length) throw new Error(`bonus room ${room} has no coins to end its challenge`);
    return { coins: mine, region: regionOf(room) };
  });
  const parts: Parts = { rooms, coins, items, bonus, regions };
  made.set(data, parts);
  return parts;
}

/** Whether a game counts a % complete. */
export const hasPercent = (data: MontyData): boolean => partsOf(data) !== null;

/** The tally of a game's progress, in all and by region (in the data's order); null for a game with no %. */
export function tallyOf(data: MontyData, p: Progress): { total: Tally; regions: RegionTally[] } | null {
  const parts = partsOf(data);
  if (!parts) return null;
  const got = parts.regions.map(() => 0), all = parts.regions.map(() => 0);
  let totalGot = 0, totalAll = 0;
  const add = (region: number, done: boolean) => {
    totalAll++;
    if (done) totalGot++;
    if (region < 0) return;
    all[region] = (all[region] ?? 0) + 1;
    if (done) got[region] = (got[region] ?? 0) + 1;
  };
  for (const r of parts.rooms) add(r.region, !!p.visited[r.id]);
  for (const c of parts.coins) add(c.region, !!p.coins[c.index]);
  for (const i of parts.items) add(i.region, !!p.items[i.index]);
  for (const b of parts.bonus) add(b.region, b.coins.every((c) => !!p.coins[c]));
  return { total: { got: totalGot, all: totalAll }, regions: parts.regions.map((name, i) => ({ name, got: got[i] ?? 0, all: all[i] ?? 0 })) };
}

/**
 * The rooms part of a game's tally (the pause panel's and THE END's ROOMS, so they count the rooms the % counts: the flight rooms left out, the game's own
 * rooms visited, NEW GAME+'s from nothing); null for a game with no % (its ROOMS are the map's).
 */
export function roomsTally(data: MontyData, p: Pick<Progress, 'visited'>): Tally | null {
  const parts = partsOf(data);
  return parts ? { got: parts.rooms.filter((r) => !!p.visited[r.id]).length, all: parts.rooms.length } : null;
}

/** A tally as a whole %: rounded down, so 100 only when every part is done. */
export const percentOf = (t: Tally): number => (t.all ? Math.floor((t.got * 100) / t.all) : 0);

/** Every part done (a tally with parts: one with none is not complete). */
export const isFull = (t: Tally): boolean => t.all > 0 && t.got === t.all;

/** The % of a game's progress as its text (e.g. 64%); null for a game with no %. */
export function percentText(data: MontyData, p: Progress): string | null {
  const t = tallyOf(data, p);
  return t ? `${percentOf(t.total)}%` : null;
}

/** Whether a game's progress is 100% complete (THE FULL MONTY's: Do Svidaniya Monty's best ending). */
export function fullyComplete(data: MontyData, p: Progress): boolean {
  const t = tallyOf(data, p);
  return t !== null && isFull(t.total);
}

// ---- the play time (kept in the save, shown on THE END for speedrunners) ----------------------------------------------------

/** The game's frames a second (PAL). */
export const FRAMES_PER_SECOND = 50;

/** A play time in frames as hours, minutes and seconds: 1:02:03, or 2:03 under an hour. */
export function timeText(frames: number): string {
  const s = Math.floor(Math.max(0, frames) / FRAMES_PER_SECOND);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), sec = s % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h ? `${h}:${two(m)}:${two(sec)}` : `${m}:${two(sec)}`;
}

/** Room ids as flags by id (a save keeps the rooms visited as a list). */
export function visitedFlags(ids: Iterable<number>): Uint8Array {
  const flags = new Uint8Array(256);
  for (const id of ids) if (id >= 0 && id < 256) flags[id] = 1;
  return flags;
}

/** Flags by room id as the list a save keeps. */
export const visitedList = (flags: ArrayLike<number>): number[] => Array.from({ length: flags.length }, (_, id) => id).filter((id) => !!flags[id]);
