import type { TuneVersion } from '../../../montyotr/src/montydata';
import { AWM_SID_URL, SOUND } from '../../../awm/src/sound';
import { ANDES } from './andes';
import { CHINA } from './china';
import { JAPAN } from './japan';
import { MOSCOW } from './moscow';
import { PACIFIC } from './pacific';
import { RIO } from './rio';
import { SIBERIA } from './siberia';
import { regionAt } from '../../../montyotr/src/regions';
import { WORLD_REGIONS, type RegionName } from '../regions';
import { retune, type RegionTune } from './region-tune';

/**
 * What each part of the world plays: a region is a run of columns of the exit grid (regions.ts; the world runs west to east), and
 * each plays a version of Monty on the Run's tune, a `RegionTune` (moscow.ts: its scale and its instruments). A later region is one
 * more entry here and a `RegionTune` of its own.
 *
 * The one exception is the sky (Chris, 2026-11-24): THE FLIGHT plays Auf Wiedersehen Monty's main theme (tune 0, Hubbard and
 * Daglish), a nod to the third game, from that game's own .sid (the one asset both games share). It starts from its beginning on
 * taking off; the Andes after it go back to Hubbard's song, a clean change (games/shared/monty/LESSONS.md, music).
 */
const TUNES: Readonly<Record<Exclude<RegionName, 'sky'>, RegionTune>> = { moscow: MOSCOW, siberia: SIBERIA, china: CHINA, japan: JAPAN, pacific: PACIFIC, andes: ANDES, rio: RIO };

/** Auf Wiedersehen Monty's theme, as the sky plays it. */
export const AWM_THEME: TuneVersion = { id: 'awm-theme', file: { url: AWM_SID_URL, song: SOUND.themeSong } };

/** A tune as the engine takes it (`MontyData.music.tuneFor`): the version's id, and how to make its .sid from the original's. */
function version(tune: RegionTune): TuneVersion {
  return { id: tune.id, make: (original) => retune(original, tune) };
}
const VERSIONS = WORLD_REGIONS.map((r) => ({ from: r.from, to: r.to, rows: r.rows, except: r.except, version: r.name === 'sky' ? AWM_THEME : version(TUNES[r.name]) }));

/** What a room plays: its region's version of the tune (the sky: Auf Wiedersehen Monty's theme), or null for the original's. */
export function tuneForRoom(grid: { readonly image: Uint8Array; readonly cols: number }, roomId: number): TuneVersion | null {
  const cell = grid.image.indexOf(roomId);
  if (cell < 0) return null;
  const col = cell % grid.cols;
  const row = Math.floor(cell / grid.cols);
  return regionAt(VERSIONS, row, col)?.version ?? null;
}
