/**
 * The world's regions and the columns and rows of the exit grid each one holds (first and last, inclusive): the one table the map (data.ts `regions`)
 * and the music (music/regions.ts: which version of the tune a column plays) are both made from, so a region's columns cannot differ between them.
 * A new region is one more entry here (its columns follow the last's) and its pieces in the files that name it.
 */
export type RegionName = 'moscow' | 'siberia' | 'china' | 'japan' | 'pacific' | 'andes' | 'rio';
export const WORLD_REGIONS: readonly { readonly name: RegionName; readonly from: number; readonly to: number; readonly rows: { readonly from: number; readonly to: number } }[] = [
  { name: 'moscow', from: 0, to: 3, rows: { from: 0, to: 2 } }, // the first four columns (its block of nine rooms)
  { name: 'siberia', from: 4, to: 7, rows: { from: 0, to: 2 } }, // the next four
  { name: 'china', from: 8, to: 11, rows: { from: 0, to: 2 } }, // and the next
  { name: 'japan', from: 12, to: 16, rows: { from: 0, to: 2 } }, // Japan's block is five wide
  { name: 'pacific', from: 17, to: 29, rows: { from: 0, to: 2 } }, // the Pacific's thirteen
  { name: 'andes', from: 30, to: 33, rows: { from: 2, to: 7 } }, // the Andes and the Amazon's four
  // (Rio's first column, 33, is the Andes' last: its cave (row 5) is the Andes' and its quay and restaurant (rows 6-7) are Rio's. A cell belongs to the smallest region that holds it, whatever the order: games/montyotr/src/regions.ts)
  { name: 'rio', from: 33, to: 38, rows: { from: 6, to: 7 } }, // Rio's six columns of two rows
];
