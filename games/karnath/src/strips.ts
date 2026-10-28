/**
 * A level's strip of rooms: mode ($3219), level ($B3E1), and the page its first block of the char map starts at (three blocks of 40
 * columns, $400 apart), and the cells of eight columns (the map's) no way leads into: a wall and a staircase picture, or a chamber
 * behind a guarded door (re/README.md "Reach"; test/reach.ts walks the castle from a new game and finds these and no more).
 */
export interface Strip { label: string; mode: number; level: number; base: number; closed: readonly number[] }

/** Upper floor, second level: columns 88-95, between the left part (its floor ends at column 77, a walkway at 82) and the right chamber (from column 96). */
const U2_CLOSED = [11];
/** Lower floor, second level: the right chamber, columns 96-119, behind the tower door at the right end of the first level, where a guard stands. */
const L2_CLOSED = [12, 13, 14];

/**
 * The castle's eight strips (re/README.md, "Travel back"): the upper floor's three levels from $9400, the
 * lower floor's from $7000, the dungeons and Karn's abode swapped in over the first of the lower floor's.
 */
export const STRIPS: Strip[] = [
  ...[3, 2, 1].map((t) => ({ label: `U${t}`, mode: 1, level: t, base: 0x94 + 0x0c * (t - 1), closed: t === 2 ? U2_CLOSED : [] })),
  ...[3, 2, 1].map((t) => ({ label: `L${t}`, mode: 0, level: t, base: 0x70 + 0x0c * (t - 1), closed: t === 2 ? L2_CLOSED : [] })),
  { label: 'DN', mode: 0xff, level: -1, base: 0x70, closed: [] },
  { label: 'AB', mode: 0xfe, level: -1, base: 0x70, closed: [] },
];
