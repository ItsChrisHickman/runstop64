/** A level's strip of rooms: mode ($3219), level ($B3E1), and the page its first block of the char map starts at (three blocks of 40 columns, $400 apart). */
interface Strip { label: string; mode: number; level: number; base: number }
/**
 * The castle's eight strips (re/README.md, "Travel back"): the upper floor's three levels from $9400, the
 * lower floor's from $7000, the dungeons and Karn's abode swapped in over the first of the lower floor's.
 */
export const STRIPS: Strip[] = [
  ...[3, 2, 1].map((t) => ({ label: `U${t}`, mode: 1, level: t, base: 0x94 + 0x0c * (t - 1) })),
  ...[3, 2, 1].map((t) => ({ label: `L${t}`, mode: 0, level: t, base: 0x70 + 0x0c * (t - 1) })),
  { label: 'DN', mode: 0xff, level: -1, base: 0x70 },
  { label: 'AB', mode: 0xfe, level: -1, base: 0x70 },
];
