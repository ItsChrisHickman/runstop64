/**
 * The C64 budget of the decorations (docs/dosvidaniya-c64.md, section 5; LESSONS.md: it must still fit a real C64), over the tables the engine reads:
 * each region's decoration list (`decorSets`, loaded as the region is entered) fits the room table's one byte (`MAX_DECOR_KINDS`), every room's kinds index
 * its own region's list, and in every room every kind placed gets its characters in the decoration pool ($9B-$FE, `decorPool`: a kind that does not fit is
 * left undrawn, as in the original). Monty on the Run's one list is held to the byte too. Reported: each region's kinds, its fullest room, the world's
 * kinds in all, and the library's pieces no room places.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/budget.ts
 */
import { check, finish } from '../../shared/test/check';
import { MAX_DECOR_KINDS, roomDecorTypes } from '../../shared/monty/rooms';
import { DECOR_POOL_END, decorPool, FIRST_DECOR_CHR } from '../../montyotr/src/decor-chars';
import type { MontyData } from '../../montyotr/src/montydata';
import { MOTR } from '../../montyotr/src/motr';
import { WORLD_DECOR } from '../src/art/world';
import { WORLD } from '../src/data';
import { WORLD_REGIONS } from '../src/regions';

const POOL = DECOR_POOL_END - FIRST_DECOR_CHR;
const hex = (id: number) => `$${id.toString(16)}`;

/** A room's decorations as its table lists them: the kinds placed (each once, its region's numbers) and the characters they ask for. */
function placedIn(data: MontyData, room: number): { kinds: number[]; chars: number } {
  const kinds: number[] = [], types = roomDecorTypes(data, room);
  for (let i = 0; i + 3 < data.decorRooms.length; i += 4) {
    const kind = data.decorRooms[i + 3] ?? 0;
    if (data.decorRooms[i] === room && !kinds.includes(kind)) kinds.push(kind);
  }
  return { kinds, chars: kinds.reduce((n, k) => n + (types[k]?.w ?? 0) * (types[k]?.h ?? 0), 0) };
}

/** The rooms of a game's exit grid. */
const roomsOf = (data: MontyData) => [...new Set(data.exitGrid.image)].filter((id) => id !== 0xff).sort((a, b) => a - b);

/** Every placement names a kind of its room's region's list. */
const kindsKnown = (data: MontyData) => Array.from({ length: data.decorRooms.length / 4 }, (_, i) => i * 4)
  .every((i) => (data.decorRooms[i + 3] ?? 0) < roomDecorTypes(data, data.decorRooms[i] ?? 0).length);

// ---- the kinds: the room table's byte, a region at a time ----
const sizes = WORLD.decorSets.map((set) => set.length);
check(`each of Do Svidaniya Monty's regions has a decoration list of its own (${WORLD.decorSets.length} lists for ${WORLD_REGIONS.length} regions)`, WORLD.decorSets.length <= WORLD_REGIONS.length && WORLD.decorSets.length > 1);
WORLD_REGIONS.forEach((region, g) => {
  const n = sizes[g] ?? 0;
  check(`${region.label}'s decoration kinds fit the room table's byte (${n} of ${MAX_DECOR_KINDS})`, n <= MAX_DECOR_KINDS);
});
check('every room of the world indexes its own region\'s list: every placement names one of its kinds', kindsKnown(WORLD));
check('a room\'s region is the map\'s region its cell is in', roomsOf(WORLD).every((room) => {
  const cell = WORLD.exitGrid.image.indexOf(room), row = Math.floor(cell / WORLD.exitGrid.cols), col = cell % WORLD.exitGrid.cols;
  const g = WORLD.decorSetIdx[room] ?? -1, region = WORLD_REGIONS[g];
  return region !== undefined && col >= region.from && col <= region.to && row >= region.rows.from && row <= region.rows.to;
}));
check(`Monty on the Run's one decoration list fits the byte too (${MOTR.decorSets[0]?.length ?? 0} of ${MAX_DECOR_KINDS}), every placement one of its kinds`,
  MOTR.decorSets.length === 1 && (MOTR.decorSets[0]?.length ?? 0) <= MAX_DECOR_KINDS && kindsKnown(MOTR));

// ---- the pool: every room's kinds drawn ----
const over: string[] = [];
for (const room of roomsOf(WORLD)) {
  const { kinds, chars } = placedIn(WORLD, room);
  const first = decorPool(WORLD, room).first;
  const undrawn = kinds.filter((k) => !first[k]);
  if (chars > POOL || undrawn.length) over.push(`${hex(room)}: ${chars} characters, kinds ${undrawn.join(', ')} undrawn`);
}
check(`every room's decorations fit the decoration pool (${POOL} characters from ${hex(FIRST_DECOR_CHR)}): every kind it places is drawn${over.length ? ` (over: ${over.join('; ')})` : ''}`, over.length === 0);

// ---- the report ----
const names = Object.keys(WORLD_DECOR);
const used = new Set<number>();
WORLD_REGIONS.forEach((region, g) => {
  let fullest = { id: -1, chars: 0 };
  for (const room of roomsOf(WORLD).filter((r) => WORLD.decorSetIdx[r] === g)) {
    const p = placedIn(WORLD, room);
    if (p.chars > fullest.chars) fullest = { id: room, chars: p.chars };
  }
  names.forEach((_, k) => { for (const room of roomsOf(WORLD)) if (WORLD.decorSetIdx[room] === g && WORLD.decorKindIn(room, k) !== undefined) used.add(k); });
  console.log(`   ${region.label}: ${sizes[g] ?? 0} decoration kinds in its list; the fullest room ${hex(fullest.id)}, ${fullest.chars} of ${POOL} characters`);
});
const unplaced = names.filter((_, k) => !used.has(k));
console.log(`   the world: ${sizes.reduce((a, b) => a + b, 0)} kinds in its regions' lists (${used.size} pieces of the library's ${names.length}); ${unplaced.length ? `placed by no room: ${unplaced.join(', ')}` : 'every piece placed by a room'}`);
finish();
