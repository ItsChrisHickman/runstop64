import type { MapRegion } from './montydata';

/**
 * The region of a cell of the exit grid, for the map and the music alike: of the regions (columns, and rows if it names them) that hold the cell, the smallest, so a region cut into a corner of a bigger one's
 * rectangle (Rio's quay and restaurant in the Andes' last column) owns its cells whatever order they are listed in.
 */
export function regionAt<R extends MapRegion>(regions: readonly R[], row: number, col: number): R | undefined {
  const area = (r: R) => (r.to - r.from + 1) * (r.rows ? r.rows.to - r.rows.from + 1 : Number.MAX_SAFE_INTEGER);
  let best: R | undefined;
  for (const r of regions) {
    if (col < r.from || col > r.to || (r.rows && (row < r.rows.from || row > r.rows.to))) continue;
    if (!best || area(r) < area(best)) best = r;
  }
  return best;
}
