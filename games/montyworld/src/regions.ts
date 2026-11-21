/**
 * The world's regions and the columns of the exit grid each one holds (first and last, inclusive): the one table the map (data.ts `regions`)
 * and the music (music/regions.ts: which version of the tune a column plays) are both made from, so a region's columns cannot differ between them.
 * A new region is one more entry here (its columns follow the last's) and its pieces in the files that name it.
 */
export type RegionName = 'moscow' | 'siberia' | 'china';
export const WORLD_REGIONS: readonly { readonly name: RegionName; readonly from: number; readonly to: number }[] = [
  { name: 'moscow', from: 0, to: 3 }, // the first four columns (its block of nine rooms)
  { name: 'siberia', from: 4, to: 7 }, // the next four
  { name: 'china', from: 8, to: 11 }, // and the next
];
