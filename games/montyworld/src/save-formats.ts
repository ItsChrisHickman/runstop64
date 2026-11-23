import type { MontySave, OlderSaves } from '../../montyotr/src/save';
import { CAR } from './train';
import { SIB } from './siberia';

/**
 * Do Svidaniya Monty's save formats (a save holds the places of the coins and finds in the tables, and the room he is in, so a region whose rooms or finds change
 * moves them):
 *
 * - 1: the game as first built: Siberia of nine rooms, 13 coins and 4 finds (two pelmeni, the ticket, the lamp).
 * - 2: Siberia's reset (docs/dosvidaniya-reset.md): six rooms, 8 coins and 2 finds (the pelmeni, the ticket). A format 1 save keeps Moscow's coins and finds and everything after
 *   Siberia's, moved down to their new places; of Siberia's, the pelmeni and the ticket; a save made in one of Siberia's rooms (whose layouts changed, three of them gone) carries
 *   on from the start of the region, on the dining car's roof.
 */
export const SAVE_FORMAT = 2;

/** Where Siberia's coins and finds are in the tables, in format 1 and now: the first index (after Moscow's) and how many. */
const SIBERIA_V1 = { coins: { first: 14, count: 13 }, items: { first: 4, count: 4 } } as const;
const SIBERIA_V2 = { coins: { first: 14, count: 8 }, items: { first: 4, count: 2 } } as const;
/** Of format 1's four finds (the dining car's pelmeni, the tender's ticket, the cave's pelmeni, the mine's lamp), the two that stay: the pelmeni and the ticket. */
const KEPT_ITEMS = [0, 1] as const;

/** The rooms of Siberia as it was (ids 9 to 17). */
const wasSiberian = (room: number) => room >= SIB.gravy && room <= SIB.border;

/** A table's flags (`coins`, `items`) with a region's stretch replaced: before it as it was, its own as `own`, after it moved down. */
function restretch(flags: readonly number[], was: { first: number; count: number }, own: readonly number[]): number[] {
  return [...flags.slice(0, was.first), ...own, ...flags.slice(was.first + was.count)];
}

function fromFormat1(s: MontySave): MontySave {
  const items = restretch(s.items, SIBERIA_V1.items, KEPT_ITEMS.map((i) => s.items[SIBERIA_V1.items.first + i] ?? 0));
  const coins = restretch(s.coins, SIBERIA_V1.coins, Array.from({ length: SIBERIA_V2.coins.count }, () => 0));
  const shift = (item: number) => (item >= SIBERIA_V1.items.first + SIBERIA_V1.items.count ? item - (SIBERIA_V1.items.count - SIBERIA_V2.items.count) : item);
  const worn = s.worn === undefined ? {} : { worn: shift(s.worn) };
  // (the dining car's roof at its west end, where Moscow's carriage roof brings him: the exit grid's cell, his x2 and y on the roof's walkway)
  const place = wasSiberian(s.roomId) ? { roomId: SIB.gravy, mapRow: 1, exitCol: 4, x2: 0x0c + 4 * 4, y: 0x32 + (CAR.roof + 1) * 8, facing: 1 } : {};
  return { ...s, items, coins, ...worn, ...place };
}

export const OLDER_SAVES: OlderSaves = {
  formats: [1],
  migrate: (s, format) => (format === 1 ? fromFormat1(s) : s),
};
