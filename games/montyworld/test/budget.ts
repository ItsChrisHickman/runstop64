/**
 * The C64 budget of the decorations (docs/dosvidaniya-c64.md, section 5; LESSONS.md: it must still fit a real C64), over the tables the engine reads:
 * the world's decoration kinds fit the room table's one byte (`MAX_DECOR_KINDS`), and in every room every kind placed gets its characters in the
 * decoration pool ($9B-$FE, `decorPool`: a kind that does not fit is left undrawn, as in the original). Monty on the Run's own tables are held to the
 * byte too. Reported: the kinds each region places, the fullest room of each region, and any kind of the table no room places.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/budget.ts
 */
import { check, finish } from '../../shared/test/check';
import { MAX_DECOR_KINDS, type RoomSpec } from '../../shared/monty/rooms';
import { DECOR_POOL_END, decorPool, FIRST_DECOR_CHR } from '../../montyotr/src/decor-chars';
import type { MontyData } from '../../montyotr/src/montydata';
import { MOTR } from '../../montyotr/src/motr';
import { WORLD_DECOR } from '../src/art/world';
import { WORLD } from '../src/data';
import { MOSCOW_ROOMS } from '../src/moscow';
import { SIBERIA_ROOMS } from '../src/siberia';
import { CHINA_ROOMS } from '../src/china';
import { JAPAN_ROOMS } from '../src/japan';
import { PACIFIC_ROOMS } from '../src/pacific';
import { ANDES_ROOMS } from '../src/andes';
import { RIO_ROOMS } from '../src/rio';

const REGIONS: readonly (readonly [string, readonly RoomSpec[]])[] = [
  ['Moscow', MOSCOW_ROOMS], ['Siberia', SIBERIA_ROOMS], ['China', CHINA_ROOMS], ['Japan', JAPAN_ROOMS], ['the Pacific', PACIFIC_ROOMS], ['the Andes and the Amazon', ANDES_ROOMS], ['Rio', RIO_ROOMS],
];
const POOL = DECOR_POOL_END - FIRST_DECOR_CHR;
const hex = (id: number) => `$${id.toString(16)}`;

/** A room's decorations as its table lists them: the kinds placed (each once) and the characters they ask for. */
function placedIn(data: MontyData, room: number): { kinds: number[]; chars: number } {
  const kinds: number[] = [];
  for (let i = 0; i + 3 < data.decorRooms.length; i += 4) {
    const kind = data.decorRooms[i + 3] ?? 0;
    if (data.decorRooms[i] === room && !kinds.includes(kind)) kinds.push(kind);
  }
  return { kinds, chars: kinds.reduce((n, k) => n + (data.decorTypes[k]?.w ?? 0) * (data.decorTypes[k]?.h ?? 0), 0) };
}

/** The rooms of a game's exit grid. */
const roomsOf = (data: MontyData) => [...new Set(data.exitGrid.image)].filter((id) => id !== 0xff).sort((a, b) => a - b);

/** Every kind the table lists is one of the game's kinds. */
const kindsKnown = (data: MontyData) => Array.from({ length: data.decorRooms.length / 4 }, (_, i) => data.decorRooms[i * 4 + 3] ?? 0).every((k) => k < data.decorTypes.length);

// ---- the kinds: the room table's byte ----
check(`Do Svidaniya Monty's decoration kinds fit the room table's byte (${WORLD.decorTypes.length} of ${MAX_DECOR_KINDS}), and every placement names one of them`,
  WORLD.decorTypes.length <= MAX_DECOR_KINDS && kindsKnown(WORLD));
check(`Monty on the Run's decoration kinds fit the byte too (${MOTR.decorTypes.length} of ${MAX_DECOR_KINDS}), every placement one of them`, MOTR.decorTypes.length <= MAX_DECOR_KINDS && kindsKnown(MOTR));

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
const used = new Set<number>();
for (const [name, rooms] of REGIONS) {
  const kinds = new Set<number>();
  let fullest = { id: -1, chars: 0 };
  for (const r of rooms) {
    const p = placedIn(WORLD, r.id);
    p.kinds.forEach((k) => { kinds.add(k); used.add(k); });
    if (p.chars > fullest.chars) fullest = { id: r.id, chars: p.chars };
  }
  console.log(`   ${name}: ${kinds.size} decoration kinds placed; the fullest room ${hex(fullest.id)}, ${fullest.chars} of ${POOL} characters`);
}
const unplaced = WORLD.decorTypes.map((_, k) => k).filter((k) => !used.has(k));
console.log(`   the world: ${WORLD.decorTypes.length} kinds, ${unplaced.length ? `placed by no room: ${unplaced.map((k) => Object.keys(WORLD_DECOR)[k] ?? `sign ${k}`).join(', ')}` : 'every one placed by a room'}`);
finish();
