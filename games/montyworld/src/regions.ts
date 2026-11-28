/**
 * The world's regions and the columns and rows of the exit grid each one holds (first and last, inclusive): the one table the map (data.ts `regions`)
 * and the music (music/regions.ts: which version of the tune a column plays) are both made from, so a region's columns cannot differ between them.
 * A new region is one more entry here (its columns follow the last's) and its pieces in the files that name it. `label` is its name on the pause
 * screen's map heading (the title screen's map's place names); `flown`: he gets there by plane, so the pause map leaves a gap before it (Chris, 2026-11-25:
 * "technically you take a plane to get there and it's not one room over"). `colour`: its rooms' colour on the map and its passport stamp's ink, one colour
 * a region (Chris, 2026-11-27, of the map's rooms in a colour each: "Different colors representing each unique region would make more sense").
 *
 * The Andes and the Amazon are two regions (Chris, 2026-11-27: "really two areas"), their rooms both in andes.ts: the mountains (the drop's two lines, Machu
 * Picchu, the Inca bridge) on rows 2-5, the jungle and the river (the canopy, the cloud forest, the creek, the roots, the kapok, the boat, the last bank) on rows 6-7.
 */
export type RegionName = 'moscow' | 'siberia' | 'china' | 'japan' | 'pacific' | 'sky' | 'andes' | 'amazon' | 'rio';
export interface WorldRegion {
  readonly name: RegionName; readonly label: string; readonly colour: number; readonly from: number; readonly to: number; readonly rows: { readonly from: number; readonly to: number };
  readonly except?: readonly { readonly row: number; readonly col: number }[]; readonly flown?: true;
}
export const WORLD_REGIONS: readonly WorldRegion[] = [
  { name: 'moscow', label: 'MOSCOW', colour: 2, from: 0, to: 3, rows: { from: 0, to: 2 } }, // the first four columns (its block of nine rooms); red
  { name: 'siberia', label: 'SIBERIA', colour: 14, from: 4, to: 7, rows: { from: 0, to: 2 } }, // the next four; ice blue
  { name: 'china', label: 'CHINA', colour: 8, from: 8, to: 11, rows: { from: 0, to: 2 } }, // and the next; orange
  { name: 'japan', label: 'JAPAN', colour: 10, from: 12, to: 16, rows: { from: 0, to: 3 } }, // Japan's block is five wide, three rows and the ice cave under MOUNT FUJI at [3,15]; pink
  { name: 'pacific', label: 'HAWAII', colour: 13, from: 17, to: 23, rows: { from: 0, to: 4 } }, // Hawaii's island hopping: Oahu, the swims, Maui and the Big Island's fork (pacific.ts); light green
  { name: 'sky', label: 'THE SKY', colour: 15, from: 25, to: 27, rows: { from: 0, to: 0 }, flown: true }, // the flight from Hilo, three legs on the top row over the Andes' columns (sky.ts), column 24 left empty: a flight, not one room over (Chris); the clouds' light grey
  { name: 'andes', label: 'ANDES', colour: 4, from: 25, to: 27, rows: { from: 2, to: 5 } }, // the parachute drop's two lines down columns 25 and 26, Machu Picchu and the Inca bridge, east of Hilo past the gap; purple
  { name: 'amazon', label: 'AMAZON', colour: 5, from: 25, to: 29, rows: { from: 6, to: 7 }, except: [{ row: 6, col: 28 }, { row: 6, col: 29 }] }, // the U under the Andes (the canopy and the cloud forest west, the creek and the roots, the kapok), the riverboat at [7,28] and the last bank at [7,29]; Rio's OPEN ARMS and the hillside over them ([6,28], [6,29]) not its; green
  { name: 'rio', label: 'RIO', colour: 3, from: 28, to: 34, rows: { from: 5, to: 6 } }, // Rio's seven columns of two rows (the carnival's two rooms between Lapa and the Sambadrome; Sugarloaf's room cut), entered from BRANCHING OUT's crown (the Amazon's [6,27]) into OPEN ARMS at [6,28]; the sea's cyan (not yellow: the map's key gives yellow to ALL FOUND)
];

/** A region's colour by its label (the passport's stamps are by label). */
export function regionColour(label: string): number {
  const region = WORLD_REGIONS.find((r) => r.label === label);
  if (!region) throw new Error(`no region ${label}`);
  return region.colour;
}
