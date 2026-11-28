import type { CharAnim } from '../../montyotr/src/montydata';
import type { WorldDecor } from './art/world';
import { decorIndex, pieceCells } from './layout';

/**
 * Where a gate shows what it wants (LESSONS.md: "A gate shows what it wants before he has it"; the picture and its blink are art/wanted.ts): the room, the 2 x 2 picture and its top left cell. A region
 * lists its gates' spots (japan.ts and andes.ts `WANTED`), places each with `wantedDecor`, blinks them with `wantedAnims`, and the gate's room effect (data.ts) clears `wantedCells` with `late: true`
 * as he uses the item there, so a gate kept done loads without it.
 */
export interface WantedSpot<P extends WorldDecor = WorldDecor> { readonly room: number; readonly piece: P; readonly col: number; readonly row: number }

/** The spot's decoration entry, for the room's `decor`. */
export const wantedDecor = <P extends WorldDecor>(w: WantedSpot<P>) => [w.piece, w.col, w.row] as const;
/** The playfield cells the picture covers (what the gate's room effect clears). */
export const wantedCells = (w: WantedSpot) => pieceCells(w.piece, w.col, w.row);
/** The pictures' blinks, each the cycle of its piece's frames. */
export const wantedAnims = <P extends WorldDecor>(spots: readonly WantedSpot<P>[], frames: Readonly<Record<P, readonly Uint8Array[]>>): CharAnim[] => spots.map((w): CharAnim => ({
  kind: 'cycle', room: w.room, chars: [0, 1, 2, 3].map((cell) => ({ decor: decorIndex(w.piece), cell })), frames: frames[w.piece], every: 10,
}));
