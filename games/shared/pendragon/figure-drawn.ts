import { DRAGONSKULLE_FRAMES } from './figure-frames';
import { fromRows, toRows, unhex } from './figure-bits';
import type { Dir, FrameId } from './figure';

/**
 * Frames drawn for the poses Dragonskulle has no picture of (Karnath's cast, Entombed's whip), in his style: each is his stand with
 * the arm drawn over it, pixel by pixel in his three colours (`f` face and hands, `1` tunic, `c` cape and outline), so the head, body
 * and legs are his own. Each arm reaches about as far as the game's own picture of the pose, so what is seen is what the game's blow
 * covers (the whip's lash and the spell are sprites of the game's own, drawn where the game puts them).
 *
 * Blackwyche's sword needs none: its pictures are already drawn in this figure (the same body, the same line), so it keeps them and only
 * its tunic changes colour (shared/pendragon/figure.ts).
 */
interface Pixels { row: number; col: number; art: string }

/** The arm as drawn facing right; facing left is its mirror (his stand is drawn the same way round). */
const RIGHT: Record<string, readonly Pixels[]> = {
  // the spell cast: the arm out at the shoulder, the hand open at its end
  cast: [{ row: 8, col: 6, art: '1111f' }, { row: 9, col: 6, art: '111ff' }],
  // the whip: the arm out a little lower (the blow), then drawn in a little (held)
  'whip.0': [{ row: 9, col: 6, art: '1111f' }, { row: 10, col: 6, art: '111ff' }],
  'whip.1': [{ row: 10, col: 6, art: '111f' }, { row: 11, col: 6, art: '11ff' }],
};

/** Facing up the screen: the arm on the right of the back, raised for the cast, out for the whip. */
const UP: Record<string, readonly Pixels[]> = {
  cast: [{ row: 8, col: 8, art: '11' }, { row: 7, col: 9, art: '1' }, { row: 6, col: 9, art: '1' }, { row: 5, col: 10, art: '1' }, { row: 4, col: 10, art: 'f' }],
  'whip.0': [{ row: 9, col: 8, art: '11f' }, { row: 10, col: 8, art: '1f' }],
  'whip.1': [{ row: 10, col: 8, art: '11f' }, { row: 11, col: 8, art: 'f' }],
};

/** Facing down the screen: the arm on the left of the picture. */
const DOWN: Record<string, readonly Pixels[]> = {
  cast: [{ row: 9, col: 0, art: 'ff111' }, { row: 10, col: 1, art: 'ff11' }],
  'whip.0': [{ row: 10, col: 0, art: 'ff1111' }, { row: 11, col: 1, art: 'ff111' }],
  'whip.1': [{ row: 11, col: 0, art: 'ff111' }, { row: 12, col: 1, art: 'ff11' }],
};

const mirrored = (p: Pixels): Pixels => ({ row: p.row, col: 12 - p.col - p.art.length, art: [...p.art].reverse().join('') });

const stand = (dir: Dir): string[] => {
  const hex = DRAGONSKULLE_FRAMES.find(([id]) => id === `stand.${dir}.0`)?.[1];
  if (!hex) throw new Error(`no stand frame for ${dir}`);
  return toRows(unhex(hex));
};

function draw(dir: Dir, arm: readonly Pixels[]): string {
  const rows = stand(dir).map((r) => [...r]);
  for (const { row, col, art } of arm) [...art].forEach((ch, i) => { rows[row][col + i] = ch; });
  return Array.from(fromRows(rows.map((r) => r.join(''))).subarray(0, 63), (b) => b.toString(16).padStart(2, '0')).join('');
}

const out: (readonly [FrameId, string])[] = [];
for (const [pose, key] of [['cast', 'cast'], ['whip', 'whip.0'], ['whip', 'whip.1']] as const) {
  const n = key === 'whip.1' ? 1 : 0;
  out.push([`${pose}.R.${n}`, draw('R', RIGHT[key])], [`${pose}.L.${n}`, draw('L', RIGHT[key].map(mirrored))]);
  out.push([`${pose}.U.${n}`, draw('U', UP[key])], [`${pose}.D.${n}`, draw('D', DOWN[key])]);
}

/** Frames drawn for the poses Dragonskulle has none of (126 hex digits each, as his own in `figure-frames.ts`). */
export const DRAWN_FRAMES: readonly (readonly [FrameId, string])[] = out;
