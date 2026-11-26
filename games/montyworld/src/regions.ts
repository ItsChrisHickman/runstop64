/**
 * The world's regions and the columns and rows of the exit grid each one holds (first and last, inclusive): the one table the map (data.ts `regions`)
 * and the music (music/regions.ts: which version of the tune a column plays) are both made from, so a region's columns cannot differ between them.
 * A new region is one more entry here (its columns follow the last's) and its pieces in the files that name it. `label` is its name on the pause
 * screen's map heading (the title screen's map's place names); `flown`: he gets there by plane, so the pause map leaves a gap before it (Chris, 2026-11-25:
 * "technically you take a plane to get there and it's not one room over").
 */
export type RegionName = 'moscow' | 'siberia' | 'china' | 'japan' | 'pacific' | 'sky' | 'andes' | 'rio';
export const WORLD_REGIONS: readonly { readonly name: RegionName; readonly label: string; readonly from: number; readonly to: number; readonly rows: { readonly from: number; readonly to: number }; readonly except?: readonly { readonly row: number; readonly col: number }[]; readonly flown?: true }[] = [
  { name: 'moscow', label: 'MOSCOW', from: 0, to: 3, rows: { from: 0, to: 2 } }, // the first four columns (its block of nine rooms)
  { name: 'siberia', label: 'SIBERIA', from: 4, to: 7, rows: { from: 0, to: 2 } }, // the next four
  { name: 'china', label: 'CHINA', from: 8, to: 11, rows: { from: 0, to: 2 } }, // and the next
  { name: 'japan', label: 'JAPAN', from: 12, to: 16, rows: { from: 0, to: 2 } }, // Japan's block is five wide
  { name: 'pacific', label: 'HAWAII', from: 17, to: 19, rows: { from: 2, to: 3 } }, // the Pacific's U of four rooms, three columns and two rows
  { name: 'sky', label: 'THE SKY', from: 20, to: 22, rows: { from: 0, to: 0 }, flown: true }, // the flight from Hilo, three legs on the top row over the Andes' columns (sky.ts)
  { name: 'andes', label: 'ANDES', from: 20, to: 22, rows: { from: 2, to: 6 } }, // the Andes and the Amazon: the drop, Machu Picchu and the Amazon's block of four, east of Hilo
  { name: 'rio', label: 'RIO', from: 23, to: 28, rows: { from: 4, to: 5 } }, // Rio's six columns of two rows, entered from the kapok's crown (the Amazon's [5,22]) into OPEN ARMS at [5,23]
];
