/**
 * Japan's creatures for Monty Mole: World Tour (region 4), in Monty on the Run's formats and Moscow's and Siberia's manner: bold
 * cartoon figures that fill their 16 x 16, a solid body in one ink with the detail cut into it as black lines and gaps (eyes, brows,
 * seams), a big face with an expression, an animation that reads. A crab, a sushi roll on legs, a waving lucky cat, a toy robot, a
 * paper-lantern ghost, a sumo wrestler, a spinning paper umbrella, a tanuki, a crane, a koi, a ninja and a samurai guard. No dither.
 * Each is drawn going left (frames 0-3); the mirror goes right (4-7). Every name starts `jp`.
 */
import { capsule, sym } from './creature-kit';
import { creatureBank, mirrored } from './pixels';
import { limb, over, Raster } from './raster';
import type { NewCreature } from './types';

/** A shape on its own raster, laid over `r` with a black moat round it (raster.ts `over`). */
function lay(r: Raster, draw: (s: Raster) => void) {
  const s = new Raster(16, 16);
  draw(s);
  over(r, s);
}

/** The four frames of a creature that goes left, and its mirror for going right. */
function pair(name: string, left: readonly (readonly string[])[], colour: number, copy = false): NewCreature {
  return { frames: creatureBank(name, left, left.map(mirrored)), copy, colour };
}

const four = (frame: (t: number) => string[]) => [0, 1, 2, 3].map(frame);

// ---- the crab: red, claws up and snapping, eyes on stalks, scuttling

function crab(): NewCreature {
  const frame = (t: number) => {
    const r = new Raster(16, 16);
    const snap = t % 2, a = [0, 1, 0, -1][t] ?? 0;
    for (const k of [0, 1, 2]) { // legs: thin, from under the shell
      r.line(3 + k, 11, 0 + k * 1.5 + a, 15); r.line(12 - k, 11, 15 - k * 1.5 - a, 15);
    }
    r.ellipse(7.5, 10, 6.4, 3.6); // the shell
    for (const s of [-1, 1]) { // the arms and the big claws
      const x = s < 0 ? 2.2 : 12.8;
      r.line(s < 0 ? 3 : 12, 9, x, 4 - snap); r.line(s < 0 ? 4 : 11, 9, x + 0.6 * s, 4 - snap);
      r.disc(x, 3 - snap, 2.6);
      r.triangle(x, 0.4 - snap, x + 1.2 * s, 3 - snap, x - 0.2 * s, 3 - snap, false); // the pincers' notch
    }
    r.line(6, 6, 6, 8); r.line(9, 6, 9, 8); // eye stalks
    r.disc(6, 5, 1.6); r.disc(9, 5, 1.6);
    r.set(6, 5, false); r.set(9, 5, false); // pupils
    r.cut(['#.#.#.#.#.#'], 3, 10); r.cut(['#########'], 4, 11); // a toothy grin
    r.set(7, 8, false); r.set(8, 8, false);
    return r.rows();
  };
  return pair('jpCrab', four(frame), 2);
}

// ---- the sushi roll on legs: a maki seen end on, a lit rim, the black band of nori, the rice with its face, trotting

function sushiRoll(): NewCreature {
  const frame = (t: number) => {
    const r = new Raster(16, 16);
    const a = [0, 1, 0, -1][t] ?? 0;
    lay(r, (s) => { limb(s, 5, 12, 4 + a, 15, 2); limb(s, 10, 12, 11 - a, 15, 2); s.rect(3 + a, 15, 5 + a, 15); s.rect(10 - a, 15, 12 - a, 15); }); // legs and feet
    r.disc(7.5, 7, 7.2); // the roll
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) { const d = Math.hypot(x - 7.5, y - 7); if (d > 5.1 && d <= 6.6) r.set(x, y, false); } // the nori: a lit rim, a thick black band, the rice inside
    r.cut(['##', '##'], 4, 4); r.cut(['##', '##'], 9, 4); // the eyes
    r.set(4, 4); r.set(10, 4); // (lit pupils)
    r.cut(['#...#', '.###.'], 5, 7 + (t % 2)); // a grin
    lay(r, (s) => { limb(s, 0, 7, 0, 11 + a, 1); limb(s, 15, 7, 15, 11 - a, 1); }); // arms
    return r.rows();
  };
  return pair('jpSushiRoll', four(frame), 1, true);
}

// ---- the lucky cat: white, a raised paw that waves, a bell at its neck

function luckyCat(): NewCreature {
  const frame = (t: number) => {
    const r = new Raster(16, 16);
    const w = [0, 2, 0, 2][t] ?? 0;
    r.rect(4, 9, 11, 15); // the body
    r.rect(5, 15, 6, 15, false); r.rect(9, 15, 10, 15, false);
    r.ellipse(7.5, 5.5, 5.6, 4.6); // the head
    r.triangle(2, 4, 2, 0, 6, 2); r.triangle(13, 4, 13, 0, 9, 2); // the ears
    r.cut(['##'], 4, 5); r.cut(['##'], 10, 5); // the slanted eyes, cut
    r.cut(['.#.'], 7, 7); r.cut(['#.#'], 6, 8); // nose and a cat's mouth
    r.cut(['########'], 4, 10); r.rect(7, 11, 8, 12, false); // the collar and its bell
    const paw = new Raster(16, 16); // the raised paw, waving
    paw.rect(1, 6 - w, 3, 12); paw.disc(2, 5 - w, 2.2);
    over(r, paw);
    return r.rows();
  };
  return pair('jpLuckyCat', four(frame), 1, true);
}

// ---- the toy robot: a tin man with a square head, an aerial, a dial on his chest, marching

function robot(): NewCreature {
  const frame = (t: number) => {
    const r = new Raster(16, 16);
    const a = [1, 0, -1, 0][t] ?? 0;
    lay(r, (s) => { s.rect(4 + a, 12, 6 + a, 15); s.rect(9 - a, 12, 11 - a, 15); }); // the legs
    r.rect(3, 7, 12, 12); // the body
    r.rect(2, 0, 13, 6); // the head
    r.rect(7, 0, 8, 0, false); r.rect(0, 0, 0, 0); // (the aerial's gap)
    lay(r, (s) => { s.rect(7, 0, 8, 0); }); r.rect(7, 0, 8, 0);
    r.cut(['###', '###'], 3, 2); r.cut(['###', '###'], 10, 2); r.rect(4, 3, 4, 3); r.rect(11, 3, 11, 3); // the eyes
    r.cut(['#.#.#.#.#'], 4, 5); // the mouth's grille
    r.cut(['.##.', '#..#', '#..#', '.##.'], 5, 8); r.rect(7, 9, 7, 9); // the dial
    lay(r, (s) => { limb(s, 2, 8, 0, 6 + a, 2); limb(s, 13, 8, 15, 6 - a, 2); }); // arms
    return r.rows();
  };
  return pair('jpRobot', four(frame), 14, true);
}

// ---- the paper-lantern ghost: one big eye, a long tongue, a wobbling tail, floating

function lanternGhost(): NewCreature {
  const frame = (t: number) => {
    const r = new Raster(16, 16);
    const b = [0, 1, 0, -1][t] ?? 0;
    r.ellipse(8, 6.5, 6.4, 5.6); r.rect(4, 0, 11, 1); r.rect(5, 11, 10, 12); // the paper body with its caps
    r.rect(0, 3, 15, 3, false); r.rect(0, 10, 15, 10, false); // the ribs cut through
    r.ellipse(8, 6.5, 3.7, 3.7, false); r.ellipse(8, 6.5, 2.5, 2.5); r.rect(7, 5, 8, 7, false); // the one great eye
    const leg = new Raster(16, 16); // one leg and its geta, hopping
    leg.rect(7 + b, 13, 8 + b, 14); leg.rect(5 + b, 15, 10 + b, 15);
    over(r, leg);
    const tongue = new Raster(16, 16);
    tongue.rect(11, 10, 12, 13 + (t % 2));
    over(r, tongue);
    return r.rows();
  };
  return pair('jpLanternGhost', four(frame), 7, true);
}

// ---- the sumo wrestler: big round belly, a topknot, a belt, stamping

function sumo(): NewCreature {
  const frame = (t: number) => {
    const r = new Raster(16, 16);
    const a = [0, 1, 0, 0][t] ?? 0, b = [0, 0, 0, 1][t] ?? 0;
    lay(r, (s) => { limb(s, 5, 12, 4, 15 - a, 3); limb(s, 11, 12, 12, 15 - b, 3); }); // the stamping legs
    r.ellipse(8, 10, 7, 5.2); // the belly
    r.disc(8, 4.6, 3.6); r.rect(7, 0, 9, 1); // the head, the topknot
    r.rect(6, 4, 6, 4, false); r.rect(10, 4, 10, 4, false); r.rect(5, 3, 7, 3, false); r.rect(9, 3, 11, 3, false); // eyes and frowning brows
    r.cut(['.###.'], 6, 6); // the stern mouth
    r.cut(['################'], 0, 11); r.cut(['########'], 4, 12); r.rect(6, 11, 9, 13); // the black belt: a band with the front apron
    r.cut(['.'], 0, 0); r.rect(7, 9, 8, 9, false); // the navel
    lay(r, (s) => { limb(s, 1, 8, 0, 12 - a, 2); limb(s, 14, 8, 15, 12 - b, 2); }); // arms at his sides
    return r.rows();
  };
  return pair('jpSumo', four(frame), 10);
}

// ---- the paper umbrella: a red wagasa that twirls, a face on its canopy, a hopping handle

function umbrella(): NewCreature {
  const frame = (t: number) => {
    const r = new Raster(16, 16);
    const w = [6.8, 5, 3.2, 5][t] ?? 5, tilt = [0, 1, 0, -1][t] ?? 0;
    r.ellipse(8, 6, 7.4, 5.6); r.rect(0, 7, 15, 12, false); // the canopy: half a dome
    r.triangle(0.5, 8, 15.5, 8, 8, 0.4, false); r.triangle(0.5, 8, 15.5, 8, 8, 0.4); // (the dome's rim)
    r.rect(0, 7, 15, 8); // the rim's scallops
    for (let x = 1; x < 15; x += 2) r.set(x, 9, true);
    for (const x of [-1, 1]) r.rect(Math.round(8 + x * w * 0.55), 1, Math.round(8 + x * w * 0.55), 6, false); // ribs turning round
    r.rect(Math.round(8 - w * 0.0), 1, Math.round(8), 6, false);
    r.cut(['##', '##'], 4, 3); r.cut(['##', '##'], 9, 3); r.set(4, 3); r.set(10, 3); // the eyes
    r.cut(['#...#', '.###.'], 5, 6); // the smile
    lay(r, (s) => { limb(s, 8, 9, 8 + tilt, 12, 1); limb(s, 8 + tilt, 12, 6 + tilt, 14, 1); limb(s, 6 + tilt, 14, 5 + tilt, 15, 1); limb(s, 8 + tilt, 12, 10 - tilt, 15, 1); }); // the handle and its two feet
    return r.rows();
  };
  return pair('jpUmbrella', four(frame), 2, true);
}

// ---- the tanuki: brown, a round belly, dark eye patches, a leaf on his head, a sake bottle

function tanuki(): NewCreature {
  const frame = (t: number) => {
    const r = new Raster(16, 16);
    const a = [1, 0, -1, 0][t] ?? 0;
    lay(r, (s) => { limb(s, 5, 12, 4 + a, 15, 2); limb(s, 10, 12, 10 - a, 15, 2); }); // legs
    r.ellipse(8, 10.5, 6.2, 4.8); // the belly
    r.cut(['.####.', '######', '######', '.####.'], 5, 8); // the belly's patch: black
    r.rect(6, 9, 9, 10); // a smaller lit navel patch
    r.ellipse(8, 4.5, 5, 4); r.triangle(3, 2.5, 3, 0, 5.4, 1.6); r.triangle(13, 2.5, 13, 0, 10.6, 1.6); // head and ears
    r.cut(['###', '###'], 3, 3); r.cut(['###', '###'], 10, 3); r.set(4, 4); r.set(11, 4); // the dark eye patches with lit eyes
    r.cut(['##'], 7, 5); r.cut(['#..#'], 6, 6); // the nose, a grin
    lay(r, (s) => { s.triangle(6, 1, 10, 1, 8, -2); s.rect(6, 0, 10, 1); }); // the leaf on his head
    lay(r, (s) => { limb(s, 14, 9, 15, 5 + a, 2); s.rect(14, 3 + a, 15, 4 + a); }); // the arm and the sake bottle
    lay(r, (s) => { s.ellipse(14.5, 13, 1.5, 2); }); // the tail
    return r.rows();
  };
  return pair('jpTanuki', four(frame), 9);
}

// ---- the crane: white, standing on long thin legs, an S of neck and a long beak, a dark crown, wings beating

function crane(): NewCreature {
  const frame = (t: number) => {
    const r = new Raster(16, 16);
    const s = [0, 1, 0, -1][t] ?? 0, tip = [2, 5, 11, 6][t] ?? 5;
    r.line(8, 11, 7 + s, 15); r.line(11, 11, 12 - s, 15); // the long thin legs
    r.rect(5 + s, 15, 7 + s, 15); r.rect(12 - s, 15, 14 - s, 15); // the feet
    r.ellipse(9.5, 8.5, 5.4, 3.3); // the body
    r.triangle(13, 7, 15.5, 3, 15.5, 9); // the tail plumes, up
    r.line(6, 7, 5, 5); r.line(7, 7, 6, 5); r.line(5, 5, 4, 3); r.line(6, 5, 5, 3); // the neck's S
    r.disc(4.5, 2.5, 2.2); // the head
    r.triangle(2.5, 2, 2.5, 4, 0, 3.4); // the beak
    r.set(4, 1, false); r.set(5, 1, false); r.set(3, 2, false); r.set(5, 2, false); // the dark crown and the eye
    const w = new Raster(16, 16);
    w.triangle(5, 8, 14, 8, 13, tip); w.triangle(5, 8, 13, tip, 9, tip + (tip < 8 ? 2 : -2)); // the wing, beating
    over(r, w);
    return r.rows();
  };
  return pair('jpCrane', four(frame), 1);
}

// ---- the koi: an orange carp leaping, head up, with its whiskers, scales' arcs and a forked tail beating

function koi(): NewCreature {
  const frame = (t: number) => {
    const r = new Raster(16, 16);
    const s = [0, 2, 0, -2][t] ?? 0;
    capsule(r, [[4.8, 3.6, 3.4], [7.5, 7.4, 3.8], [10, 10.6, 2.4]]); // the body, head up left
    r.triangle(8, 3, 12, 2, 11, 8); // the dorsal fin
    r.triangle(10, 11, 8 + s, 15.5, 11.5, 14); r.triangle(10, 11, 15.5, 14 + s / 2, 12, 12); // the tail's fork
    r.triangle(6, 9, 2, 12, 7, 11.5); // the pectoral fin
    r.cut(['##', '##'], 3, 2); r.set(3, 3); // the eye (a lit pupil)
    r.cut(['#'], 0, 4); // the mouth
    r.cut(['.#.', '#.#'], 7, 6); r.cut(['.#.', '#.#'], 9, 9); r.cut(['.#.', '#.#'], 5, 8); // the scales' arcs
    return r.rows();
  };
  return pair('jpKoi', four(frame), 8);
}

// ---- the ninja: dark, a mask with a lit eye slit, a headband streaming, leaping

function ninja(): NewCreature {
  const frame = (t: number) => {
    const r = new Raster(16, 16);
    const a = [2, 0, -2, 0][t] ?? 0;
    const legs = new Raster(16, 16);
    limb(legs, 6, 11, 3 + a, 15, 3); limb(legs, 10, 11, 12 - a, 15, 3);
    over(r, legs);
    r.rect(4, 7, 11, 12); // the body
    r.cut(['########'], 4, 11); // the sash
    r.disc(8, 4, 4.4); // the hooded head
    r.cut(['#######'], 5, 3); r.cut(['#######'], 5, 4); // the slit
    r.set(6, 3); r.set(6, 4); r.set(10, 3); r.set(10, 4); // the eyes, lit
    const arms = new Raster(16, 16);
    limb(arms, 4, 8, 0, 5 - a, 2); limb(arms, 11, 8, 15, 11 + a, 2);
    arms.line(14, 4, 14, 12);
    over(r, arms);
    const tails = new Raster(16, 16);
    tails.line(12, 3, 15, 1 + (t % 2)); tails.line(12, 4, 15, 4 + (t % 2));
    over(r, tails);
    return r.rows();
  };
  return pair('jpNinja', four(frame), 12);
}

// ---- the samurai guard: red armour, a great helmet with crescent horns and a crest over a fierce face (slanted eyes, a moustache), broad laced shoulder plates, a skirt of plates

const SAMURAI_TOP = sym([
  '#.......',
  '##....##',
  '.##..###',
  '..##.###',
  '...#####',
  '..######',
  '..#.####',
  '..#.#.##',
  '..#.#.##',
  '..#..###',
  '.#######',
  '####.###',
  '####.#.#',
  '.##..###',
]);

function samurai(): NewCreature {
  const frame = (t: number) => {
    const r = new Raster(16, 16);
    const a = [1, 0, -1, 0][t] ?? 0;
    SAMURAI_TOP.forEach((row, y) => [...row].forEach((ch, x) => { if (ch === '#') r.set(x, y); }));
    r.cut(['#', '#'], 5, 7); r.cut(['#', '#'], 10, 7); // the slanted eyes: dark above the nose
    r.cut(['#######'], 4, 9); // the moustache's black bar
    r.cut(['#########', '.........'], 3, 11); // the lacing
    limb(r, 5, 13, 4 + a, 15, 2); limb(r, 10, 13, 11 - a, 15, 2); r.rect(3 + a, 15, 5 + a, 15); r.rect(10 - a, 15, 12 - a, 15); // legs and feet
    return r.rows();
  };
  return pair('jpSamurai', four(frame), 2);
}

export const JAPAN_CREATURES = {
  jpCrab: crab(),
  jpSushiRoll: sushiRoll(),
  jpLuckyCat: luckyCat(),
  jpRobot: robot(),
  jpLanternGhost: lanternGhost(),
  jpSumo: sumo(),
  jpUmbrella: umbrella(),
  jpTanuki: tanuki(),
  jpCrane: crane(),
  jpKoi: koi(),
  jpNinja: ninja(),
  jpSamurai: samurai(),
} as const satisfies Record<string, NewCreature>;

export type JapanCreature = keyof typeof JAPAN_CREATURES;
