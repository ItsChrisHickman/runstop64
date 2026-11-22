/**
 * Japan's creatures for Monty Mole: World Tour (region 4), in Monty on the Run's formats and Moscow's and Siberia's manner: bold
 * cartoon figures that fill their 16 x 16, a solid body in one ink with the detail cut into it as black lines and gaps (eyes, brows,
 * seams), a big face with an expression, an animation that reads, in the bright inks Monty on the Run's creatures use (never a dull grey or brown). A kappa, a sushi
 * roll on legs, a maneki-neko lucky cat, a daruma, a chochin-obake (the lantern ghost), a sumo wrestler, a karakasa (the one-eyed hopping paper umbrella), a
 * tanuki, a crane, a koi, a ninja and a samurai guard. No dither.
 * Each is drawn going left (frames 0-3); the mirror goes right (4-7). Every name starts `jp`.
 */
import { lay, pair } from './creature-kit';
import { four, koi, ninja, samurai, sumo } from './japan-bold';
import { limb, over, Raster } from './raster';
import type { NewCreature } from './types';



// ---- the kappa: a green river imp, a dish of water on his head, big round eyes, a beak and a shell, waddling

function kappa(): NewCreature {
  const frame = (t: number) => {
    const r = new Raster(16, 16);
    const a = [0, 1, 0, -1][t] ?? 0, w = [0, 1, 0, -1][t] ?? 0;
    lay(r, (s) => { limb(s, 5, 12, 4 + a, 15, 3); limb(s, 11, 12, 12 - a, 15, 3); s.rect(2 + a, 15, 6 + a, 15); s.rect(10 - a, 15, 14 - a, 15); }); // legs and webbed feet
    r.ellipse(8, 11.4, 6.8, 4.2); // the shell on his back
    r.cut(['#.#.#.#'], 4, 10); r.cut(['.#.#.#.'], 4, 12); // its plates
    r.ellipse(8, 6.2, 6.8, 4.8); // the head
    r.ellipse(8, 1.6, 4.4, 1.8); r.ellipse(8, 1.7, 3.2, 0.9, false); r.rect(6 + w, 1, 8 + w, 1); // the dish on his head, its water sloshing
    r.ellipse(5.2, 5.4, 2.3, 2.5, false); r.ellipse(10.8, 5.4, 2.3, 2.5, false); // the big round eyes
    r.rect(5, 5, 6, 6); r.rect(11, 5, 12, 6); // lit pupils
    r.ellipse(8, 8.4, 3.2, 1.6, false); r.rect(5, 8, 10, 8); // the beak's cut
    r.set(7, 7, false); r.set(9, 7, false);
    lay(r, (s) => { limb(s, 1, 9, 0, 12 + a, 2); limb(s, 14, 9, 15, 12 - a, 2); }); // arms
    return r.rows();
  };
  return pair('jpKappa', four(frame), 5);
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

// ---- the maneki-neko: a gold lucky cat with a big happy face, a bell on its collar and a raised paw that beckons

function luckyCat(): NewCreature {
  const frame = (t: number) => {
    const r = new Raster(16, 16);
    const w = [0, 2, 0, 2][t] ?? 0;
    r.ellipse(8, 12, 5.4, 4); r.rect(4, 15, 6, 15); r.rect(10, 15, 12, 15); // the round body and its feet
    r.ellipse(8, 6, 6.6, 4.8); // the head
    r.triangle(1.5, 5, 2, -0.5, 6.5, 2); r.triangle(14.5, 5, 14, -0.5, 9.5, 2); r.rect(3, 2, 3, 3, false); r.rect(12, 2, 12, 3, false); // the ears and their hollows
    r.cut(['.##.', '#..#'], 3, 4); r.cut(['.##.', '#..#'], 9, 4); // the happy closed eyes
    r.rect(7, 7, 8, 7, false); r.cut(['#.#', '.#.'], 6, 8); // the nose and a cat's mouth
    r.cut(['######'], 5, 10); r.rect(7, 11, 8, 11, false); // the collar and its bell
    const paw = new Raster(16, 16); // the raised paw, beckoning
    paw.rect(12, 6 - w, 14, 12); paw.disc(13, 4 - w, 2.8); paw.rect(12, 3 - w, 12, 3 - w);
    over(r, paw);
    return r.rows();
  };
  return pair('jpLuckyCat', four(frame), 7, true);
}

// ---- the daruma: the round red wishing doll, a stern bearded face with one eye painted in, rocking from side to side

function daruma(): NewCreature {
  const frame = (t: number) => {
    const r = new Raster(16, 16);
    const s = [0, 1, 0, -1][t] ?? 0;
    r.ellipse(8 + s, 9.4, 6.6, 6.4); // the round body (a squat one: a jump clears it)
    r.ellipse(8 + s, 7.2, 4.6, 3.4, false); // the face's opening
    r.ellipse(6 + s, 6.6, 1.4, 1.4); r.ellipse(10 + s, 6.6, 1.4, 1.4); r.rect(6 + s, 6, 6 + s, 7, false); // the eyes: the left one painted in
    r.rect(4 + s, 4, 7 + s, 4); r.rect(9 + s, 4, 12 + s, 4); // the heavy brows
    r.rect(5 + s, 9, 10 + s, 9); r.rect(6 + s, 10, 9 + s, 10); r.set(8 + s, 8); // the moustache and beard, the nose
    r.rect(4 + s, 12, 11 + s, 14, false); r.rect(6 + s, 13, 9 + s, 13); r.rect(8 + s, 12, 8 + s, 14); // the band across the belly with its mark
    r.rect(5, 15, 10, 15, t % 2 === 0); // the base, tipping
    return r.rows();
  };
  return pair('jpDaruma', four(frame), 10, true);
}

// ---- the chochin-obake: a paper lantern come alive, one great eye, a wide mouth and a long tongue lolling, hopping on its one leg

function lanternGhost(): NewCreature {
  const frame = (t: number) => {
    const r = new Raster(16, 16);
    const hop = [0, 1, 2, 1][t] ?? 0, look = [0, 1, 0, -1][t] ?? 0;
    r.ellipse(8, 6.4, 7.4, 6.2); r.rect(4, 0, 11, 1); r.rect(4, 11, 11, 12); // the paper body with its caps
    r.rect(0, 2, 15, 2, false); r.rect(0, 10, 15, 10, false); // the ribs
    r.ellipse(8, 5, 4, 2.6, false); r.disc(8 + look, 5, 1.7); r.rect(7 + look, 4, 7 + look, 4, false); // the one great eye
    r.ellipse(8, 9, 5, 1.5, false); r.rect(5, 8, 6, 8); r.rect(10, 8, 11, 8); // the wide mouth, teeth above it
    const tongue = new Raster(16, 16); // the tongue lolling out of it
    tongue.rect(9, 9, 11, 12 + (t % 2)); tongue.disc(10, 13 + (t % 2), 1.7);
    over(r, tongue);
    const leg = new Raster(16, 16); // one leg and its geta, hopping
    leg.rect(6, 13 - hop, 7, 14 - hop); leg.rect(4, 15 - hop, 9, 15 - hop);
    over(r, leg);
    return r.rows();
  };
  return pair('jpLanternGhost', four(frame), 3, true);
}

// ---- the karakasa: a paper umbrella come alive, one huge eye, a long tongue, hopping on its single leg in its geta

function karakasa(): NewCreature {
  const frame = (t: number) => {
    const r = new Raster(16, 16);
    const hop = [0, 2, 3, 1][t] ?? 0, look = [0, 1, 0, -1][t] ?? 0;
    r.ellipse(8, 8, 7.6, 7); r.rect(0, 9, 15, 15, false); r.rect(7, 0, 8, 1); // the canopy: half a dome, the handle's tip over it
    for (let x = 0; x < 16; x += 4) { r.rect(x, 9, x + 3, 9); r.rect(x + 1, 10, x + 2, 10, false); } // the scalloped rim
    r.ellipse(8, 5.6, 3.8, 3.2, false); r.disc(8 + look, 5.6, 2); r.rect(7 + look, 4, 7 + look, 4, false); // the single huge eye
    const tongue = new Raster(16, 16);
    tongue.rect(10, 9, 11, 12 + (t % 2)); tongue.disc(10.5, 13 + (t % 2), 1.7);
    over(r, tongue);
    const leg = new Raster(16, 16); // the one leg, the geta under it
    leg.rect(6, 10, 7, 13 - hop); leg.rect(4, 14 - hop, 9, 15 - hop);
    over(r, leg);
    return r.rows();
  };
  return pair('jpKarakasa', four(frame), 4, true);
}

// ---- the tanuki: a round belly, dark eye patches round lit eyes, a leaf on his head, a big grin

function tanuki(): NewCreature {
  const frame = (t: number) => {
    const r = new Raster(16, 16);
    const a = [1, 0, -1, 0][t] ?? 0;
    r.ellipse(8, 11.6, 7, 4.6); // the great round belly
    r.ellipse(8, 12.4, 2.6, 1.8, false); r.rect(8, 12, 8, 12); // the navel
    lay(r, (s) => { limb(s, 5, 14, 4 + a, 15, 3); limb(s, 11, 14, 12 - a, 15, 3); }); // feet
    r.ellipse(8, 6.4, 7.4, 4.8); r.triangle(1.5, 4, 2, 0, 5.6, 2); r.triangle(14.5, 4, 14, 0, 10.4, 2); // head and ears
    r.ellipse(4.8, 6, 2.5, 2.3, false); r.ellipse(11.2, 6, 2.5, 2.3, false); r.rect(4, 5, 5, 6); r.rect(11, 5, 12, 6); // the dark patches, the lit eyes
    r.rect(7, 8, 8, 8, false); r.cut(['#.....#', '.#####.'], 4, 9); // the nose and a broad grin
    lay(r, (s) => { s.ellipse(8, 1, 3.4, 1.5); }); r.rect(8, 1, 8, 1, false); // the leaf on his head, its midrib
    return r.rows();
  };
  return pair('jpTanuki', four(frame), 7);
}

// ---- the crane: white, long legs, a thick S of neck and a long beak, a red crown, great wings beating

function crane(): NewCreature {
  const frame = (t: number) => {
    const r = new Raster(16, 16);
    const s = [0, 1, 0, -1][t] ?? 0, tip = [2, 5, 11, 6][t] ?? 5;
    limb(r, 8, 11, 7 + s, 15, 2); limb(r, 11, 11, 12 - s, 15, 2); // the long legs
    r.rect(5 + s, 15, 8 + s, 15); r.rect(11 - s, 15, 14 - s, 15); // the feet
    r.ellipse(10, 8.6, 6, 3.8); // the body
    r.triangle(14, 6, 15.5, 2, 15.5, 10); // the tail plumes
    limb(r, 6, 8, 5, 5, 3); limb(r, 5, 5, 4, 3, 3); // the neck's S
    r.disc(4, 2.6, 2.6); // the head
    r.triangle(2, 2, 2, 4.4, 0, 3.6); // the beak
    r.set(4, 2, false); r.rect(4, 0, 5, 0, false); // the eye and the red crown
    const w = new Raster(16, 16);
    w.triangle(5, 8, 15, 8, 14, tip); w.triangle(5, 8, 14, tip, 9, tip + (tip < 8 ? 3 : -3)); // the wing, beating
    over(r, w);
    r.rect(7, 8, 10, 8, false);
    return r.rows();
  };
  return pair('jpCrane', four(frame), 2);
}

export const JAPAN_CREATURES = {
  jpKappa: kappa(),
  jpSushiRoll: sushiRoll(),
  jpLuckyCat: luckyCat(),
  jpDaruma: daruma(),
  jpLanternGhost: lanternGhost(),
  jpSumo: sumo(),
  jpKarakasa: karakasa(),
  jpTanuki: tanuki(),
  jpCrane: crane(),
  jpKoi: koi(),
  jpNinja: ninja(),
  jpSamurai: samurai(),
} as const satisfies Record<string, NewCreature>;

export type JapanCreature = keyof typeof JAPAN_CREATURES;
