import type { TuneVersion } from '../../../montyotr/src/montydata';
import { MOSCOW } from './moscow';
import { SIBERIA } from './siberia';
import { retune, type RegionTune } from './region-tune';

/**
 * Which version of Monty on the Run's tune each part of the world plays: a region is a run of columns of the exit grid (the world
 * runs west to east), a version a `RegionTune` (moscow.ts). A region with none plays Hubbard's tune as it is. A later region is one
 * more entry here and a `RegionTune` of its own (its scale and its instruments).
 */
const REGIONS: readonly { readonly from: number; readonly to: number; readonly tune: RegionTune }[] = [
  { from: 0, to: 4, tune: MOSCOW }, // Moscow: the first four columns (its block of nine rooms)
  { from: 4, to: 8, tune: SIBERIA }, // Siberia: the next four
];

/** A tune as the engine takes it (`MontyData.music.tuneFor`): the version's id, and how to make its .sid from the original's. */
function version(tune: RegionTune): TuneVersion {
  return { id: tune.id, make: (original) => retune(original, tune) };
}
const VERSIONS = REGIONS.map((r) => ({ ...r, version: version(r.tune) }));

/** The version of the tune a room plays: its column's region's, or null for the original's. */
export function tuneForRoom(grid: { readonly image: Uint8Array; readonly cols: number }, roomId: number): TuneVersion | null {
  const cell = grid.image.indexOf(roomId);
  if (cell < 0) return null;
  const col = cell % grid.cols;
  return VERSIONS.find((r) => col >= r.from && col < r.to)?.version ?? null;
}
