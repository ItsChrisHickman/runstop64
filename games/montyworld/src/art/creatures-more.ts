/**
 * More of Moscow's creatures (creatures.ts has the first five): a babushka sweeping with a broom, a Cossack dancing the squat
 * dance, a samovar on legs, a Faberge egg bouncing, a metro train's face, a balalaika on legs. In the same
 * manner: bold, solid in one ink, the detail cut into them as black lines, a face with an expression, an animation that reads.
 */
import { creatureBank, mirrored } from './pixels';
import { limb, over, Raster } from './raster';
import type { NewCreature } from './types';

/** A babushka: a headscarf round a dark face, a wide body with an apron, a broom she sweeps from side to side. */
export function babushka(): NewCreature {
  const frame = (sweep: number, step: number) => {
    const r = new Raster(16, 16);
    r.ellipse(8.5, 11, 5.6, 4.8); // the body, wide in her skirt
    r.rect(3, 14, 13, 15); // the hem
    r.disc(8.5, 3.8, 3.7); // the scarf over the head
    r.ellipse(8.5, 4.6, 2.2, 2.4, false); // the face, dark
    r.rect(7, 4, 7, 4); r.rect(10, 4, 10, 4); // the eyes, lit
    r.rect(8, 6, 9, 6); // the mouth
    r.cut(['##', '##', '##'], 7, 9); // the apron's dark panel
    r.set(8, 2); r.set(9, 2); // the knot of the scarf
    r.cut(['.#.', '###'], 8, 12); // her hands folded
    const broom = new Raster(16, 16);
    limb(broom, 3 + sweep, 6, 1 + sweep * 2, 14, 1); // the handle
    broom.rect(sweep * 2 - 1 + 0, 13, sweep * 2 + 2, 15); // the bristles
    broom.rect(sweep * 2 - 2, 15, sweep * 2 + 3, 15);
    over(r, broom);
    if (step & 1) r.cut(['#.#'], 6, 15);
    return r.rows();
  };
  const left = [-2, 0, 2, 0].map((s, i) => frame(s, i));
  return { frames: creatureBank('babushka', left, left.map(mirrored)), copy: false, colour: 13 };
}

/** A Cossack: a tall shapka, arms folded, squatting and kicking one leg out and the other, in turn. */
export function cossack(): NewCreature {
  const frame = (pose: 'squatL' | 'up' | 'squatR') => {
    const r = new Raster(16, 16);
    const drop = pose === 'up' ? 0 : 3;
    r.rect(4, 0 + drop, 11, 3 + drop); // the shapka
    r.rect(5, 0 + drop, 5, 0 + drop, false); r.rect(8, 0 + drop, 8, 0 + drop, false); r.rect(10, 0 + drop, 10, 0 + drop, false);
    r.ellipse(7.5, 6 + drop, 3.2, 2.2); // the face
    r.cut(['#.#'], 6, 5 + drop); // eyes
    r.cut(['###'], 6, 7 + drop); // the moustache
    r.rect(5, 8 + drop, 10, 11 + drop); // the coat
    r.cut(['######', '.#..#.'], 5, 9 + drop); // arms folded across it
    const legs = new Raster(16, 16);
    if (pose === 'up') {
      limb(legs, 6, 12, 5, 15, 2); limb(legs, 9, 12, 10, 15, 2);
    } else if (pose === 'squatL') {
      limb(legs, 6, 12 + drop - 1, 0, 14, 2); limb(legs, 9, 12 + drop - 1, 9, 15, 2);
      legs.rect(0, 14, 2, 15);
    } else {
      limb(legs, 9, 12 + drop - 1, 15, 14, 2); limb(legs, 6, 12 + drop - 1, 6, 15, 2);
      legs.rect(13, 14, 15, 15);
    }
    over(r, legs);
    return r.rows();
  };
  const frames = [frame('squatL'), frame('up'), frame('squatR'), frame('up')];
  return { frames: creatureBank('cossack', frames, frames), copy: true, colour: 10 };
}

/** A samovar on legs: a knob and lid, a round brass body with a face, a tap for a nose, steam, and two legs walking. */
export function samovarWalker(): NewCreature {
  const frame = (step: number) => {
    const r = new Raster(16, 16);
    const bob = step & 1;
    r.rect(7, 0 + bob, 8, 1 + bob); // the knob
    r.rect(4, 2 + bob, 11, 3 + bob); // the lid
    r.ellipse(7.5, 8 + bob, 6.2, 4.6); // the body
    r.rect(13, 7 + bob, 15, 8 + bob); // the tap, a nose
    r.cut(['#.#'], 5, 6 + bob); // the eyes
    r.cut(['.##.'], 6, 9 + bob); // a mouth
    r.rect(1, 8 + bob, 14, 8 + bob, false); // a band round it
    r.rect(1, 12 + bob, 14, 12 + bob, false);
    const legs = new Raster(16, 16);
    const a = step < 2 ? 0 : 2;
    limb(legs, 5, 12 + bob, 4 - a + 1, 15, 2); limb(legs, 10, 12 + bob, 11 + a - 1, 15, 2);
    over(r, legs);
    if (step === 1 || step === 3) { r.set(4, 0); r.set(11, 0); } // steam
    return r.rows();
  };
  const left = [0, 1, 2, 3].map(frame);
  return { frames: creatureBank('samovar', left, left.map(mirrored)), copy: false, colour: 8 };
}

/** A Faberge egg: gold bands, a crown, a jewel, a face in the band; it squashes and stretches as it bounces. */
export function egg(): NewCreature {
  const frame = (sy: number, sx: number) => {
    const r = new Raster(16, 16);
    const cy = 15.5 - 7.4 * sy; // sits on its bottom edge
    r.ellipse(7.5, cy, 6.4 * sx, 7.4 * sy);
    // bands cut across it
    const band = (y: number) => r.rect(Math.round(8 - 7 * sx), Math.round(y), Math.round(7 + 7 * sx), Math.round(y), false);
    band(cy - 3.2 * sy); band(cy + 3.6 * sy);
    // the face: eyes and a grin in the middle band
    r.cut(['#..#'], 6, Math.round(cy - 1.2 * sy));
    r.cut(['.##.', '#..#'], 6, Math.round(cy + 0.6 * sy) + 0);
    // the jewel on the crown, a dark diamond
    r.cut(['.#.', '###', '.#.'], 6, Math.round(cy - 5.4 * sy));
    return r.rows();
  };
  const frames = [frame(0.78, 1.25), frame(1.05, 0.95), frame(1.0, 1.0), frame(1.05, 0.95)];
  return { frames: creatureBank('egg', frames, frames), copy: true, colour: 7 };
}

/** A metro train's face: the rounded front with two big headlamps for eyes, a windscreen, a grille for teeth; the lamps blink. */
export function tram(): NewCreature {
  const frame = (blink: boolean, bob: number) => {
    const r = new Raster(16, 16);
    r.rect(1, 1 + bob, 14, 13 + bob);
    r.rect(0, 3 + bob, 15, 11 + bob);
    r.rect(3, 3 + bob, 12, 6 + bob, false); // the windscreen, dark
    r.rect(4, 4 + bob, 5, 5 + bob); r.rect(10, 4 + bob, 11, 5 + bob); // lit panes
    r.rect(7, 3 + bob, 8, 6 + bob); // the pillar between
    r.disc(3.5, 9 + bob, 2.2, ); // headlamps
    r.disc(11.5, 9 + bob, 2.2);
    if (!blink) { r.rect(3, 9 + bob, 4, 10 + bob, false); r.rect(11, 9 + bob, 12, 10 + bob, false); }
    r.cut(['#.#.#.#'], 4, 12 + bob); // the grille
    r.rect(1, 14, 3, 15); r.rect(12, 14, 14, 15); // wheels
    r.rect(5, 14, 10, 14); // the coupling
    return r.rows();
  };
  const frames = [frame(false, 0), frame(true, 0), frame(false, 1), frame(true, 1)];
  return { frames: creatureBank('tram', frames, frames), copy: true, colour: 3 };
}

/** A balalaika on two legs: a triangular body with a round sound hole for a mouth, a long neck, strings, plucking as it walks. */
export function balalaika(): NewCreature {
  const frame = (step: number) => {
    const r = new Raster(16, 16);
    const bob = step & 1;
    r.triangle(8, 5 + bob, 15, 12 + bob, 1, 12 + bob); // the body
    r.rect(1, 11 + bob, 14, 12 + bob);
    r.rect(7, 0 + bob, 8, 5 + bob); // the neck
    r.rect(6, 0 + bob, 9, 1 + bob); // the head of the neck
    r.rect(8, 2 + bob, 8, 5 + bob, false); // a string down the neck
    r.cut(['.##.', '####', '.##.'], 6, 8 + bob); // the sound hole, a dark mouth
    r.rect(7, 9 + bob, 8, 9 + bob); // a lit tooth in it
    const legs = new Raster(16, 16);
    const a = step < 2 ? 1 : -1;
    limb(legs, 4, 12 + bob, 3 - a, 15, 2); limb(legs, 11, 12 + bob, 12 + a, 15, 2);
    over(r, legs);
    return r.rows();
  };
  const left = [0, 1, 2, 3].map(frame);
  return { frames: creatureBank('balalaika', left, left.map(mirrored)), copy: false, colour: 9 };
}
