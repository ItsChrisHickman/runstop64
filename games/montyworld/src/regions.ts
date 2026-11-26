/**
 * The world's regions and the columns and rows of the exit grid each one holds (first and last, inclusive): the one table the map (data.ts `regions`)
 * and the music (music/regions.ts: which version of the tune a column plays) are both made from, so a region's columns cannot differ between them.
 * A new region is one more entry here (its columns follow the last's) and its pieces in the files that name it. `label` is its name on the pause
 * screen's map heading (the title screen's map's place names).
 */
export type RegionName = 'moscow' | 'siberia' | 'china' | 'japan' | 'pacific' | 'sky' | 'andes' | 'rio';
export const WORLD_REGIONS: readonly { readonly name: RegionName; readonly label: string; readonly from: number; readonly to: number; readonly rows: { readonly from: number; readonly to: number }; readonly except?: readonly { readonly row: number; readonly col: number }[] }[] = [
  { name: 'moscow', label: 'MOSCOW', from: 0, to: 3, rows: { from: 0, to: 2 } }, // the first four columns (its block of nine rooms)
  { name: 'siberia', label: 'SIBERIA', from: 4, to: 7, rows: { from: 0, to: 2 } }, // the next four
  { name: 'china', label: 'CHINA', from: 8, to: 11, rows: { from: 0, to: 2 } }, // and the next
  { name: 'japan', label: 'JAPAN', from: 12, to: 16, rows: { from: 0, to: 2 } }, // Japan's block is five wide
  { name: 'pacific', label: 'HAWAII', from: 17, to: 23, rows: { from: 0, to: 4 } }, // Hawaii's island hopping: Oahu, the swims, Maui and the Big Island's fork (pacific.ts)
  { name: 'sky', label: 'THE SKY', from: 25, to: 27, rows: { from: 0, to: 0 } }, // the flight from Hilo, three legs on the top row over the Andes' columns (sky.ts), column 24 left empty: a flight, not one room over (Chris)
  { name: 'andes', label: 'ANDES', from: 25, to: 28, rows: { from: 2, to: 7 } }, // the Andes and the Amazon: the three-room drop, Machu Picchu and the Inca bridge, the Amazon's U and the riverboat moored off it at [7,28] under Rio, east of Hilo past the gap
  { name: 'rio', label: 'RIO', from: 28, to: 33, rows: { from: 5, to: 6 } }, // Rio's six columns of two rows, entered from BRANCHING OUT's crown (the Amazon's [6,27]) into OPEN ARMS at [6,28]
];
