/**
 * Four of Japan's creatures redrawn in Monty on the Run's bold manner (Chris: the sumo, the koi, the ninja and the samurai were the weak ones): one bright ink, a big face that fills the
 * sprite, a silhouette that reads at once, detail cut in as black lines. Each is drawn going left (frames 0-3); the mirror goes right (4-7). Every name starts `jp`.
 */
import { lay, pair, sym } from './creature-kit';
import { limb, Raster } from './raster';
import type { NewCreature } from './types';

export const four = (frame: (t: number) => string[]) => [0, 1, 2, 3].map(frame);

// ---- the sumo: a wrestler as wide as the sprite, a great round belly, a bald head with its topknot and a scowl, a black belt, stamping

export function sumo(): NewCreature {
  const frame = (t: number) => {
    const r = new Raster(16, 16);
    const a = [0, 2, 0, 0][t] ?? 0, b = [0, 0, 0, 2][t] ?? 0; // the foot that is lifted
    lay(r, (s) => { limb(s, 4, 12, 3, 15 - a, 4); limb(s, 12, 12, 13, 15 - b, 4); s.rect(1, 15 - a, 5, 15 - a); s.rect(11, 15 - b, 15, 15 - b); }); // the legs stamping
    r.ellipse(8, 10.4, 8, 5.6); // the belly, edge to edge
    r.ellipse(8, 4.6, 4.6, 4.2); r.rect(7, 0, 8, 0); r.rect(6, 1, 9, 1); // the round head and the topknot
    r.rect(3, 3, 6, 3, false); r.rect(9, 3, 12, 3, false); // the heavy brows
    r.rect(5, 4, 6, 5); r.rect(9, 4, 10, 5); r.rect(5, 4, 5, 4, false); r.rect(10, 4, 10, 4, false); // the glaring eyes
    r.rect(6, 7, 9, 7, false); // the scowling mouth
    r.rect(0, 11, 15, 12, false); r.rect(6, 10, 9, 14); r.rect(7, 12, 8, 14, false); // the black belt, the knot and apron in front
    r.rect(7, 9, 8, 9, false); // the navel
    lay(r, (s) => { limb(s, 1, 8, 0, 12 - a, 3); limb(s, 14, 8, 15, 12 - b, 3); }); // the fists at his sides
    return r.rows();
  };
  return pair('jpSumo', four(frame), 7);
}

// ---- the koi: an orange carp seen from the side, as Monty on the Run's fish are (it leaps straight up the pond): a round head with a big eye and an open mouth, a scaled body, fins, a forked tail beating

export function koi(): NewCreature {
  const frame = (t: number) => {
    const r = new Raster(16, 16);
    const s = [0, 2, 0, -2][t] ?? 0;
    r.ellipse(6, 8, 6, 4.6); // the body, head left
    r.triangle(10, 8, 15.5, 2.5 + s, 15.5, 13.5 + s); r.triangle(15.5, 8 + s / 2, 12.5, 5 + s, 12.5, 11 + s, false); // the tail, a fork cut in it
    r.triangle(4, 4, 9, 0, 10.5, 4.5); r.triangle(5, 12, 9, 15.5, 10, 11.5); // the dorsal fin and the belly fin
    r.ellipse(4, 6.2, 2.2, 2.2, false); r.rect(3, 6, 4, 7); // the big eye with its lit pupil
    r.triangle(0, 8, 3.6, 9, 0, 11, false); // the open mouth
    for (const [x, y] of [[7, 7], [9, 9], [7, 10], [10, 6]] as const) r.rect(x, y, x + 1, y, false); // the scales
    return r.rows();
  };
  return pair('jpKoi', four(frame), 10);
}

// ---- the ninja: a big masked head with a slit of lit eyes, a headband's tails streaming, a sword over his shoulder, running low

export function ninja(): NewCreature {
  const frame = (t: number) => {
    const r = new Raster(16, 16);
    const a = [2, 0, -2, 0][t] ?? 0, bob = [0, 1, 0, 1][t] ?? 0;
    lay(r, (s) => { limb(s, 6, 12, 4 + a, 15, 3); limb(s, 10, 12, 11 - a, 15, 3); s.rect(2 + a, 15, 6 + a, 15); s.rect(9 - a, 15, 13 - a, 15); }); // the long strides
    r.ellipse(8, 10 + bob, 5, 3.6); r.rect(3, 10 + bob, 12, 10 + bob, false); // the body and its sash
    r.disc(8, 4.4 + bob, 5.2); // the big masked head
    r.rect(3, 3 + bob, 12, 6 + bob, false); r.rect(4, 4 + bob, 6, 5 + bob); r.rect(9, 4 + bob, 11, 5 + bob); r.rect(5, 4 + bob, 5, 4 + bob, false); r.rect(10, 4 + bob, 10, 4 + bob, false); // the dark slit and the lit eyes
    r.rect(3, 2 + bob, 12, 2 + bob, false); // the headband
    lay(r, (s) => { s.line(12, 2 + bob, 15, 0 + (t % 2)); s.line(12, 3 + bob, 15, 3 + (t % 2)); s.line(11, 0 + bob, 13, -1 + bob); }); // its tails flying
    lay(r, (s) => { limb(s, 3, 9 + bob, 1, 12, 2); limb(s, 12, 9 + bob, 14, 11 + a / 2, 2); s.line(13, 11, 15, 1); s.line(14, 11, 15, 2); }); // an arm out, the sword up behind him
    return r.rows();
  };
  return pair('jpNinja', four(frame), 10);
}

// ---- the samurai guard: a great helmet with horns and a crest over a fierce lit face (slanted black eyes, a moustache), broad laced shoulder plates, a skirt of plates, marching

const SAMURAI = sym([
  '#......#',
  '##....##',
  '.##..###',
  '..######',
  '.#######',
  '########',
  '.#######',
  '.##..###',
  '.###..##',
  '.#######',
  '.#..####',
  '########',
  '###.####',
  '.#######',
]);
/** The legs' two rows in each of the four frames: apart, together, apart the other way, together. */
const SAMURAI_LEGS: readonly (readonly [string, string])[] = [
  ['...###....###...', '..###......###..'], ['...###....###...', '...###....###...'], ['...###....###...', '.###........###.'], ['...###....###...', '...###....###...'],
];

export function samurai(): NewCreature {
  const frame = (t: number) => [...SAMURAI, ...(SAMURAI_LEGS[t] ?? SAMURAI_LEGS[0] ?? ['', ''])];
  return pair('jpSamurai', four(frame), 10);
}
