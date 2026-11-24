/**
 * Room-scoped testing for a Monty game (Chris, 2026-11-23: "we really need these tests to be able to analyze individual rooms if that's all it
 * concerns"). `node tools/test.mjs <test> --room <id|name>[,<id|name>...]` (tools/test.mjs turns the flag into `MONTY_ROOMS`, so a test's own
 * positional arguments are untouched) makes every room-level test check only those rooms: the joins of those rooms (with the neighbour across
 * each), their climbs, stands, edges, creatures, crushers, backdrops, layout; the region bots only the legs that start in, end in or pass through
 * them (legs.ts); the mechanism tests only the sections tagged with one of them (`section`). No `--room`: everything, as before.
 *
 * A name is a room's region and key (`siberia.coal`), its key alone where only one region has it (`coal`), or its id (`11`). A name that
 * is no room is an error, never a filter that quietly checks nothing; a test that has nothing in the rooms says so and passes.
 */

/** The environment variable the room filter travels in (tools/test.mjs sets it from `--room`). */
export const ROOMS_ENV = 'MONTY_ROOMS';

/** A game's rooms and their names: every room id, and the names they go by (lower case). */
export interface RoomNames {
  readonly ids: ReadonlySet<number>;
  readonly names: ReadonlyMap<string, number>;
  /** The rooms of each region, by the region's name (`affected.ts` widens a change outside any room to its region). */
  readonly regions: ReadonlyMap<string, readonly number[]>;
}

/** A region's rooms by key, as a game declares them (`{ name: 'siberia', rooms: SIB }`). */
export interface RegionRooms { readonly name: string; readonly rooms: Readonly<Record<string, number>> }

/** The names of a game's rooms from its regions' room tables: `region.key`, and `key` where no other region has that key. */
export function roomNames(regions: readonly RegionRooms[]): RoomNames {
  const names = new Map<string, number>();
  const ids = new Set<number>();
  const keys = new Map<string, number[]>();
  const byRegion = new Map<string, number[]>();
  for (const r of regions) {
    const mine: number[] = [];
    for (const [key, id] of Object.entries(r.rooms)) {
      ids.add(id);
      mine.push(id);
      names.set(`${r.name}.${key}`.toLowerCase(), id);
      keys.set(key.toLowerCase(), [...(keys.get(key.toLowerCase()) ?? []), id]);
    }
    byRegion.set(r.name, [...new Set(mine)].sort((a, b) => a - b));
  }
  for (const [key, list] of keys) if (new Set(list).size === 1 && list[0] !== undefined && !names.has(key)) names.set(key, list[0]);
  return { ids, names, regions: byRegion };
}

/** The rooms a filter's text names (`12,siberia.coal,mine`; a region's name stands for all its rooms). Throws on a name that is no room. */
export function parseRooms(text: string, known: RoomNames): Set<number> {
  const out = new Set<number>();
  for (const raw of text.split(/[,\s]+/)) {
    const name = raw.trim().toLowerCase();
    if (name === '') continue;
    const region = known.regions.get(name);
    if (region) { for (const id of region) out.add(id); continue; }
    const id = /^\d+$/.test(name) ? Number(name) : known.names.get(name);
    if (id === undefined || !known.ids.has(id)) {
      throw new Error(`--room ${raw}: no such room (a room is an id, region.key or a key: ${[...known.names.keys()].filter((n) => n.includes('.')).slice(0, 12).join(', ')}...)`);
    }
    out.add(id);
  }
  if (out.size === 0) throw new Error(`--room "${text}" names no room`);
  return out;
}

/** What a test checks under the filter. */
export interface RoomScope {
  /** No filter: everything is checked, as without this kit. */
  readonly all: boolean;
  /** The rooms named (empty when `all`). */
  readonly rooms: ReadonlySet<number>;
  /** Whether a room is checked. */
  has(room: number): boolean;
  /** Whether any of these rooms is checked (a join, a mechanism that spans rooms). */
  any(rooms: Iterable<number>): boolean;
  /** The items of a list whose room is checked. */
  pick<T>(list: readonly T[], room: (t: T) => number): T[];
  /** The room ids of a list that are checked. */
  keep(ids: readonly number[]): number[];
  /** A part of a test about some rooms: run when one of them is checked, else skipped (and counted). A part about no room in particular: `rooms` empty, always run. */
  section(rooms: readonly number[], what: string, body: () => void): void;
  /** One line for the end of a test: what the filter let through. Empty when `all`. */
  summary(): string;
  /** Print the summary (nothing when `all`): a test that uses `section` calls it before `finish()`. */
  report(): void;
}

/** The scope from the environment (`MONTY_ROOMS`, set by `--room`): every room when it is not set. */
export function roomScope(known: RoomNames, text: string | undefined = process.env[ROOMS_ENV]): RoomScope {
  const all = text === undefined || text.trim() === '';
  const rooms: ReadonlySet<number> = all ? new Set() : parseRooms(text, known);
  let ran = 0, skipped = 0;
  const has = (room: number) => all || rooms.has(room);
  const any = (list: Iterable<number>) => { if (all) return true; for (const r of list) if (rooms.has(r)) return true; return false; };
  if (!all) console.log(`room filter: rooms ${[...rooms].sort((a, b) => a - b).join(', ')} (${ROOMS_ENV})`);
  return {
    all, rooms, has, any,
    pick: (list, room) => list.filter((t) => has(room(t))),
    keep: (ids) => ids.filter(has),
    section(of, what, body) {
      if (of.length === 0 || any(of)) { ran++; body(); return; }
      skipped++;
      if (process.env.VERBOSE) console.log(`skip ${what} (rooms ${of.join(', ')}: not in the filter)`);
    },
    summary: () => (all ? '' : `room filter ${[...rooms].join(',')}: ${ran} section(s) checked, ${skipped} about other rooms skipped`),
    report() { if (!all) console.log(this.summary()); },
  };
}
