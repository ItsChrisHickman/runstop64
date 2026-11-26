import type { RoomSpec, Sector } from '../../shared/monty/rooms';

/**
 * Rooms added to a region after it shipped (HEAVEN CAN WAIT, 2026-11-24; the bonus rooms off the path, 2026-11-25): one owner for how they join the tables, so no
 * save's places move. Their ids come after every region's, and a room's sector is its id: the sector list runs on from the one after the flight's (`LATER_FROM`,
 * 82) to the highest such id, a blank name in every place no room of this kind has (ids other work keeps for rooms coming back: docs/dosvidaniya-back-half-plan.md).
 * Their rooms go last in the tables, in the order they were added (`ADDED`), so their coins and finds take new places at the ends.
 * A region lists its own as `{ [id]: { name, colour } }` (the name in the game's style, the map's colour); data.ts gathers every region's.
 */
export interface LaterRoom { readonly name: string; readonly colour: number }
export type LaterRooms = Readonly<Record<number, LaterRoom>>;

/** The first sector (and room id) of a room added later: the one after the flight's. */
export const LATER_FROM = 82;

const centred = (text: string): Sector => ({ col: Math.floor((32 - text.length) / 2), text });

/** The sectors from `LATER_FROM` to the highest id of `rooms`, and their map colours (blank and 0 where no room of these has the id). */
export function laterSectors(rooms: LaterRooms): { sectors: Sector[]; colours: number[] } {
  const ids = Object.keys(rooms).map(Number);
  if (ids.some((id) => !Number.isInteger(id) || id < LATER_FROM || id > 0xfe)) throw new Error(`a room added later has an id outside ${LATER_FROM}-254: ${ids.join(' ')}`);
  const places = Array.from({ length: Math.max(LATER_FROM - 1, ...ids) - LATER_FROM + 1 }, (_, i) => LATER_FROM + i);
  return { sectors: places.map((id) => centred(rooms[id]?.name ?? '')), colours: places.map((id) => rooms[id]?.colour ?? 0) };
}

/** Every room in the order of the tables: the regions' as they were made, then the ones added later in the order they were added (`added`, ids). */
export function inTableOrder(regions: readonly RoomSpec[], added: readonly number[]): RoomSpec[] {
  const later = added.map((id) => {
    const r = regions.find((x) => x.id === id);
    if (!r) throw new Error(`room ${id} is listed as added later but no region has it`);
    return r;
  });
  return [...regions.filter((r) => !added.includes(r.id)), ...later];
}
