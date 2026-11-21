/**
 * The metro's escalators drawn as escalators: a diagonal band at 45 degrees (a cell across for every cell down), its treads a
 * chain of steps that run along it, a handrail in a line above it with the dashes of the moving belt. A band crosses cells on a
 * slant, so it is three kinds of tile laid on three diagonals: the handrail's (the diagonal above the line his feet follow), the
 * tread's (the diagonal on the line) and the body's (the diagonal under it). Each is drawn from one rule on the plane (below), once for
 * each of the 16 places the steps can be, which the engine turns through (an escalator's `treads`: the characters and the
 * pictures they take), so the steps and the belt slide along the band, in the direction it goes, as fast as Monty is carried.
 *
 * On the plane, `d` is the distance under the line his feet follow (measured down, so the band is d from 0 to 12) and `s` the
 * distance along it. The "down" band (down to the right) is drawn first; the "up" band is its mirror image with the steps going
 * the other way.
 */
import { characters } from './pixels';
import type { NewTile } from './types';

/** The places the steps can be: the band repeats every 16 along it. */
export const TREAD_PHASES = 16;

/** Which of its three tiles a cell is, by the diagonal it is on: above the line (the handrail), on it (the tread), under it (the body). */
export type BandPart = 'rail' | 'tread' | 'body';
const PART_OFFSET: Readonly<Record<BandPart, number>> = { rail: -1, tread: 0, body: 1 };

/** Whether the pixel (distance d under the line, s along it) is lit with the steps at `phase`. */
function lit(d: number, s: number, phase: number): boolean {
  const along = (((s - phase) % 16) + 16) % 16;
  if (d === -9 || d === -8) return along < 11; // the handrail, with the gap that goes round with the belt
  if (d < -4 || d > 10) return false;
  const tooth = -Math.floor((along % 8) / 2); // the steps: a sawtooth along the top of the band, 0 to -3
  if (d < tooth) return false;
  return d <= 2 || d >= 7 || along % 16 >= 10; // the steps and the body's under side, a thin dark seam between them broken by the posts
}

/** The 8 x 8 picture of a tile of the "down" band: row v, column u of the cell on the diagonal `part`, the steps at `phase`. */
function downRows(part: BandPart, phase: number): string[] {
  const m = PART_OFFSET[part];
  return Array.from({ length: 8 }, (_, v) => Array.from({ length: 8 }, (_, u) => (lit(8 * m + v - u, 8 * m + u + v, phase) ? '#' : '.')).join(''));
}

/** Its mirror image for the "up" band, with the steps going the other way. */
function upRows(part: BandPart, phase: number): string[] {
  return downRows(part, -phase).map((row) => [...row].reverse().join(''));
}

/** A tile's rows of the band going `way` ('down' to the right, 'up' to the right) at `phase`. */
export const bandRows = (way: 'down' | 'up', part: BandPart, phase: number): string[] => (way === 'down' ? downRows(part, phase) : upRows(part, phase));

/** The three tiles of a band, drawn with the steps at their first place. All of them passable: he is carried over them. */
export function bandTiles(way: 'down' | 'up'): Readonly<Record<BandPart, NewTile>> {
  const tile = (part: BandPart, colour: number): NewTile => ({ chr: characters(`escalator ${way} ${part}`, bandRows(way, part, 0), 1, 1), cls: 0, colour });
  return { rail: tile('rail', 7), tread: tile('tread', 15), body: tile('body', 15) };
}

/** The characters (the codes 1-8 of the room) of the band, in the order the pictures give them: the tread's, the body's, the handrail's. */
export const BAND_ORDER = ['tread', 'body', 'rail'] as const satisfies readonly BandPart[];

/** The pictures the three characters take for each place of the steps (8 bytes of each, in `BAND_ORDER`). */
export function bandFrames(way: 'down' | 'up'): readonly Uint8Array[] {
  return Array.from({ length: TREAD_PHASES }, (_, phase) => {
    const out = new Uint8Array(BAND_ORDER.length * 8);
    BAND_ORDER.forEach((part, i) => {
      bandRows(way, part, phase).forEach((row, v) => {
        out[i * 8 + v] = [...row].reduce((byte, c, u) => (c === '#' ? byte | (0x80 >> u) : byte), 0);
      });
    });
    return out;
  });
}
