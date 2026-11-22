/**
 * THE CROSSING's own pieces for Monty Mole: World Tour (region 4): the pedestrian signal (a red standing man over a green walking man on a pole: the room's `charAnims` light one and
 * put the other out on the traffic's cycle) and the station's front. Every name starts `jp`.
 */
import { decor } from './decorations';
import { characters } from './pixels';
import { Raster } from './raster';
import type { NewDecor } from './types';

/** A lamp's picture: the box, and the little man lit inside it (standing: red; walking: green) or the box dark. */
function lamp(man: 'standing' | 'walking' | null): Raster {
  const r = new Raster(8, 8);
  r.frame(0, 0, 7, 7);
  if (man === 'standing') { r.disc(3.5, 1.8, 1.1); r.rect(2, 3, 5, 5); r.rect(2, 6, 2, 6); r.rect(5, 6, 5, 6); }
  if (man === 'walking') { r.disc(3.5, 1.8, 1.1); r.rect(3, 3, 4, 5); r.line(3, 3, 1, 5); r.line(4, 3, 6, 4); r.line(3, 5, 1, 6); r.line(4, 5, 6, 6); }
  return r;
}

/** The signal on its pole: the red lamp, the green lamp, three characters of pole. 1 x 5 characters. */
function signal(): NewDecor {
  const r = new Raster(8, 40);
  const stamp = (lit: 'standing' | 'walking' | null, y: number) => lamp(lit).rows().forEach((row, j) => [...row].forEach((ch, i) => { if (ch === '#') r.set(i, y + j); }));
  stamp('standing', 0); stamp(null, 8);
  r.rect(3, 16, 4, 39); r.rect(1, 38, 6, 39);
  return decor('jpWalkSignal', 1, 5, r, ['2', '5', 'c', 'c', 'c']);
}

/** The two lamps' pictures (2 x 8 bytes) in the cycle: the red man lit (the traffic's turn) or the green man lit (the crowd's). */
export const SIGNAL_RED = characters('signal red', [...lamp('standing').rows(), ...lamp(null).rows()], 1, 2);
export const SIGNAL_GREEN = characters('signal green', [...lamp(null).rows(), ...lamp('walking').rows()], 1, 2);

/** The station's front: a roof's overhang and sign band, a clock, arched windows and the doors. 6 x 5 characters. */
function station(): NewDecor {
  const r = new Raster(48, 40);
  r.rect(0, 0, 47, 4); r.rect(4, 1, 43, 2, false); // the overhang and its sign band
  r.rect(2, 5, 45, 39); r.disc(23.5, 13, 5); r.rect(23, 9, 23, 13, false); r.rect(23, 13, 26, 13, false); // the body and its clock
  for (const x of [5, 12, 30, 37]) { r.rect(x, 22, x + 4, 33, false); r.rect(x + 1, 21, x + 3, 21, false); } // the arched windows
  r.rect(18, 25, 29, 39, false); r.rect(23, 25, 24, 39); // the doors
  return decor('jpStation', 6, 5, r, ['888888', '444444', '444444', '444444', '444444']);
}

export const JAPAN_CROSSING = {
  jpWalkSignal: signal(),
  jpStation: station(),
} as const satisfies Record<string, NewDecor>;
