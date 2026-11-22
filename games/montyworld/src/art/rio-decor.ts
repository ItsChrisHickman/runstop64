/**
 * Rio's decorations for Monty Mole: World Tour (region 7), in Monty on the Run's decoration format and the earlier regions' manner:
 * solid ink with the detail cut into it as black lines. The finale's pieces (Christ the Redeemer on Corcovado, Sugarloaf, a beach palm,
 * a parasol, a deckchair), Sugarloaf's cable station and pylon, Lapa's arches, the favela's houses, church, dish and washing, the quay's
 * lamp, bunting, fishing boat and coconut stand, the churrascaria's tables, salad bar, rotisserie and curtains, and the carnival's three
 * floats, stands, drum and banner.
 */
import { decor } from './decorations';
import { Raster } from './raster';
import type { NewDecor } from './types';

/**
 * Christ the Redeemer on Corcovado: the statue standing on its pedestal on the green peak, arms stretched out wide (the picture is 8 x 7
 * characters: the statue above, the peak below). Light grey; the finale floodlights it white (a colour change of its characters, rows 0-4).
 */
function christ(): NewDecor {
  const r = new Raster(64, 56);
  r.ellipse(32, 62, 31, 22); // the peak
  r.rect(25, 32, 38, 41); r.rect(23, 38, 40, 41); // the pedestal
  r.rect(25, 36, 38, 36, false); r.rect(31, 32, 31, 35, false); // its courses
  r.rect(27, 12, 36, 31); // the robe
  r.triangle(27, 31, 24, 31, 27, 24); r.triangle(36, 31, 39, 31, 36, 24); // the skirts of the robe
  r.rect(2, 13, 61, 18); // the arms, stretched out
  r.triangle(0, 13, 8, 13, 2, 23); r.triangle(63, 13, 55, 13, 61, 23); // the sleeves hanging
  r.line(6, 19, 3, 22, false); r.line(57, 19, 60, 22, false); // a fold in each
  r.rect(30, 12, 33, 13, false); r.rect(28, 20, 28, 30, false); r.rect(35, 20, 35, 30, false); // robe folds
  r.disc(31.5, 7, 4.2); r.rect(30, 10, 33, 12); // the head and neck
  r.rect(30, 6, 30, 7, false); r.rect(33, 6, 33, 7, false);
  r.cut(['#'], 31, 9);
  const colours = Array.from({ length: 7 }, (_, i) => (i < 5 ? 'F'.repeat(8) : '5'.repeat(8)));
  return decor('christ', 8, 7, r, colours);
}

/** Sugarloaf (Pao de Acucar): the great granite dome rising from the bay, its streaks and fissures, a sheer right face. 6 x 3 characters. */
function sugarloaf(): NewDecor {
  const r = new Raster(48, 24);
  r.ellipse(24, 26, 24, 24); r.rect(0, 22, 47, 23);
  r.line(14, 4, 11, 22, false); r.line(27, 2, 31, 22, false); r.line(36, 7, 40, 20, false); r.line(20, 9, 18, 14, false);
  r.rect(41, 12, 47, 21, false); r.rect(41, 12, 41, 12);
  return decor('sugarloaf', 6, 3, r, 12);
}

/** The cable car's station: a boxy building with a sloping roof, windows in a row and the cable arriving. 4 x 3 characters. */
function cableStation(): NewDecor {
  const r = new Raster(32, 24);
  r.triangle(0, 8, 31, 0, 31, 8); r.rect(0, 8, 31, 8);
  r.rect(2, 9, 29, 23);
  for (const x of [5, 12, 19]) r.rect(x, 12, x + 4, 17, false);
  r.rect(23, 14, 27, 23, false); r.rect(25, 14, 25, 23);
  return decor('cableStation', 4, 3, r, 15);
}

/** A pylon of the cable: a lattice tower of two legs and crossed braces under a crossarm. 2 x 4 characters. */
function pylon(): NewDecor {
  const r = new Raster(16, 32);
  r.rect(2, 0, 13, 2);
  r.line(3, 3, 0, 31); r.line(4, 3, 1, 31); r.line(12, 3, 15, 31); r.line(11, 3, 14, 31);
  for (let y = 6; y < 30; y += 6) { r.rect(3 - (y * 3) / 28, y, 12 + (y * 3) / 28, y); r.line(3, y, 12, y + 6); r.line(12, y, 3, y + 6); }
  return decor('pylon', 2, 4, r, 12);
}

/** Lapa's arches: two storeys of arches of white stone, the big arch under and three small ones over it. 4 x 4 characters. */
function lapaArches(): NewDecor {
  const r = new Raster(32, 32);
  r.rect(0, 0, 31, 31);
  for (const x0 of [3, 13, 23]) { r.rect(x0, 5, x0 + 5, 11, false); r.rect(x0 + 1, 3, x0 + 4, 4, false); } // the upper arches
  r.rect(4, 17, 27, 31, false); r.rect(6, 15, 25, 16, false); r.rect(9, 13, 22, 14, false); // the great arch
  r.rect(0, 12, 31, 12, false); // the course between
  return decor('lapaArches', 4, 4, r, 1);
}

/** A favela house: a flat plaster front, two windows with shutters, a door, a flat roof with a water tank. 3 x 3 characters. */
function house(): NewDecor {
  const r = new Raster(24, 24);
  r.rect(0, 4, 23, 23); r.rect(7, 0, 14, 3); // the front and the water tank
  r.rect(8, 1, 13, 1, false);
  r.rect(3, 8, 8, 13, false); r.rect(15, 8, 20, 13, false); r.rect(5, 8, 6, 13); r.rect(17, 8, 18, 13); // windows with their bars
  r.rect(10, 15, 14, 23, false);
  return decor('house', 3, 3, r, 14);
}

/** A church tower of the hill: a square tower with a belfry opening and a cross on a little roof. 3 x 4 characters. */
function church(): NewDecor {
  const r = new Raster(24, 32);
  r.rect(11, 0, 12, 5); r.rect(9, 2, 14, 3); // the cross
  r.triangle(12, 5, 2, 12, 21, 12); r.rect(3, 12, 20, 31); // the roof and the tower
  r.rect(8, 15, 15, 23, false); r.rect(10, 13, 13, 14, false); r.rect(11, 16, 12, 22);
  r.rect(9, 27, 14, 31, false);
  return decor('church', 3, 4, r, 1);
}

/** A satellite dish on its bracket. 1 x 1 characters. */
function dish(): NewDecor {
  const r = new Raster(8, 8);
  r.ellipse(3.5, 3, 3.5, 2.8); r.ellipse(3.5, 3.6, 2.6, 2, false); r.rect(3, 5, 4, 7); r.rect(1, 7, 6, 7);
  return decor('dish', 1, 1, r, 1);
}

/** A washing line with clothes hung out: shirts and towels in colours. 3 x 1 characters. */
function washing(): NewDecor {
  const r = new Raster(24, 8);
  r.rect(0, 0, 23, 0);
  for (const x of [2, 9, 16]) { r.rect(x, 1, x + 4, 6); r.rect(x + 1, 1, x + 3, 1, false); }
  return decor('washing', 3, 1, r, ['257']);
}

/** A harbour lamp post: a post with a hooked arm and a lamp. 1 x 3 characters. */
function lampPost(): NewDecor {
  const r = new Raster(8, 24);
  r.rect(3, 4, 4, 23); r.rect(1, 22, 6, 23); r.rect(3, 3, 7, 3); r.rect(5, 4, 7, 6); r.rect(6, 5, 6, 5, false);
  return decor('lampPost', 1, 3, r, 7);
}

/** Bunting strung across: a rope hung with little flags in turn. 4 x 1 characters. */
function bunting(): NewDecor {
  const r = new Raster(32, 8);
  r.rect(0, 0, 31, 0);
  for (let x = 1; x < 32; x += 6) r.triangle(x, 1, x + 4, 1, x + 2, 6);
  return decor('bunting', 4, 1, r, ['2751']);
}

/** A fishing boat at the quay: a hull with a wheelhouse, a mast and a net heaped aft. 5 x 3 characters. */
function fishingBoat(): NewDecor {
  const r = new Raster(40, 24);
  r.triangle(0, 12, 39, 12, 33, 23); r.rect(0, 12, 39, 14); r.rect(6, 15, 33, 20); r.rect(0, 12, 39, 12);
  r.rect(8, 16, 31, 16, false);
  r.rect(22, 2, 33, 11); r.rect(24, 4, 31, 7, false); r.rect(11, 0, 12, 11); r.line(12, 1, 20, 11); // wheelhouse, mast, stay
  r.ellipse(5, 11, 4, 2.4);
  return decor('fishingBoat', 5, 3, r, 6);
}

/** A coconut seller's stand: a striped umbrella over a cart heaped with coconuts. 3 x 3 characters. */
function coconutStand(): NewDecor {
  const r = new Raster(24, 24);
  r.triangle(12, 0, 0, 8, 23, 8); r.rect(0, 8, 23, 9);
  for (let x = 3; x < 23; x += 6) r.line(12, 0, x, 8, false);
  r.rect(11, 9, 12, 23);
  r.rect(2, 15, 21, 18); r.rect(4, 19, 19, 19, false); r.rect(4, 20, 19, 21); r.rect(3, 22, 6, 23); r.rect(17, 22, 20, 23);
  for (const x of [5, 9, 13, 17]) r.ellipse(x, 13, 2.4, 2.2);
  return decor('coconutStand', 3, 3, r, ['222', '777', '999']);
}

/** A beach parasol: a striped canopy on a pole. 3 x 2 characters. */
function parasol(): NewDecor {
  const r = new Raster(24, 16);
  r.ellipse(11.5, 6, 11.5, 6); r.rect(0, 6, 23, 12, false);
  r.rect(0, 5, 23, 6);
  for (const x of [5, 11, 17]) r.line(11.5, 0, x, 6, false);
  r.rect(11, 7, 12, 15);
  return decor('parasol', 3, 2, r, ['212', '111']);
}

/** A deckchair: a striped sling between a frame. 2 x 1 characters. */
function deckchair(): NewDecor {
  const r = new Raster(16, 8);
  r.line(1, 0, 4, 7); r.line(2, 0, 5, 7); r.rect(4, 5, 14, 6); r.line(14, 2, 10, 6);
  r.rect(5, 1, 11, 4); r.rect(6, 2, 6, 4, false); r.rect(9, 2, 9, 4, false);
  return decor('deckchair', 2, 1, r, 10);
}

/** A churrascaria table: a white cloth to the floor's edge, plates and a red coaster, a bottle. 3 x 2 characters. */
function restTable(): NewDecor {
  const r = new Raster(24, 16);
  r.rect(0, 5, 23, 8); r.rect(1, 9, 22, 13); for (let x = 4; x < 22; x += 5) r.rect(x, 10, x, 13, false);
  r.rect(2, 14, 3, 15); r.rect(20, 14, 21, 15);
  r.ellipse(6, 4, 3, 1.2); r.ellipse(16, 4, 3, 1.2); r.rect(11, 0, 12, 4); r.rect(11, 0, 11, 0, false);
  return decor('restTable', 3, 2, r, ['111', '111']);
}

/** The salad bar: a long counter under a glass sneeze guard, bowls of salads along it. 4 x 2 characters. */
function saladBar(): NewDecor {
  const r = new Raster(32, 16);
  r.rect(0, 8, 31, 15); r.rect(1, 12, 30, 12, false);
  for (const x of [4, 12, 20, 28]) { r.ellipse(x, 6, 3.4, 2.2); r.rect(x - 4, 7, x + 3, 8, false); r.rect(x - 4, 8, x + 3, 8); }
  r.rect(0, 0, 31, 0); r.rect(0, 0, 0, 4); r.rect(31, 0, 31, 4);
  return decor('saladBar', 4, 2, r, 5);
}

/** The rotisserie: a fire pit with skewers of meat turning over the flames. 3 x 3 characters. */
function rotisserie(): NewDecor {
  const r = new Raster(24, 24);
  r.rect(0, 20, 23, 23); r.rect(2, 20, 21, 20, false);
  for (const x of [5, 12, 19]) r.triangle(x, 12, x - 4, 20, x + 4, 20);
  for (const x of [5, 12, 19]) r.triangle(x, 15, x - 2, 20, x + 2, 20, false);
  for (const y of [2, 6, 10]) { r.rect(1, y, 22, y); for (const x of [4, 10, 16]) r.ellipse(x + 1, y, 2.2, 2); }
  return decor('rotisserie', 3, 3, r, ['222', '888', '999']);
}

/** A hanging red lamp on its flex. 1 x 2 characters. */
function lampRed(): NewDecor {
  const r = new Raster(8, 16);
  r.rect(3, 0, 4, 4); r.triangle(3.5, 5, 0, 11, 7, 11); r.rect(0, 11, 7, 12); r.rect(2, 13, 5, 14);
  return decor('lampRed', 1, 2, r, 2);
}

/** The kitchen's doorway: a brick arch with its dark inside. 3 x 4 characters. */
function archKitchen(): NewDecor {
  const r = new Raster(24, 32);
  r.rect(0, 0, 23, 31); r.rect(4, 9, 19, 31, false); r.rect(6, 6, 17, 8, false); r.rect(9, 4, 14, 5, false);
  for (let y = 3; y < 32; y += 5) r.rect(0, y, 3, y, false), r.rect(20, y, 23, y, false);
  return decor('archKitchen', 3, 4, r, 2);
}

/** A stage curtain, drawn back to one side in folds. 2 x 3 characters. */
function curtain(): NewDecor {
  const r = new Raster(16, 24);
  r.rect(0, 0, 15, 23);
  for (const x of [3, 7, 11]) r.line(x, 2, x + 1, 23, false);
  r.rect(0, 0, 15, 1); r.rect(0, 2, 15, 2, false);
  return decor('curtain', 2, 3, r, 2);
}

/** A carnival float's pirate galleon: a curved hull with its gunports, two masts and billowing sails, a flag. 6 x 3 characters. */
function floatGalleon(): NewDecor {
  const r = new Raster(48, 24);
  r.triangle(0, 14, 47, 14, 42, 23); r.rect(0, 14, 47, 16); r.rect(2, 15, 3, 18); r.rect(44, 15, 45, 18);
  for (let x = 8; x < 42; x += 6) r.rect(x, 18, x + 2, 19, false);
  r.rect(15, 0, 16, 14); r.rect(31, 2, 32, 14);
  r.ellipse(24, 6, 6.5, 6); r.ellipse(40, 8, 5.5, 5); r.rect(14, 8, 36, 14, false); r.rect(15, 0, 16, 14); r.rect(31, 2, 32, 14);
  r.rect(33, 0, 38, 2);
  return decor('floatGalleon', 6, 3, r, ['222222', '111111', '888888']);
}

/** A carnival float's great bird: a fan of tail feathers, a round body, a long neck and beaked head. 6 x 4 characters. */
function floatBird(): NewDecor {
  const r = new Raster(48, 32);
  for (let k = -3; k <= 3; k++) { const a = (k * 20 * Math.PI) / 180; for (let t = 4; t < 22; t++) r.set(34 + Math.sin(a) * t * 0.9, 26 - Math.cos(a) * t, true), r.set(35 + Math.sin(a) * t * 0.9, 26 - Math.cos(a) * t, true); }
  r.ellipse(18, 22, 12, 8);
  r.rect(26, 6, 29, 20); r.ellipse(32, 6, 5, 4); r.triangle(36, 5, 43, 8, 36, 9);
  r.cut(['##'], 31, 5); r.rect(10, 20, 24, 20, false); r.rect(0, 26, 47, 31, false);
  return decor('floatBird', 6, 4, r, ['222222', '777777', '222222', '777777']);
}

/** A carnival float's sun: a round face with a ring of rays. 5 x 3 characters. */
function floatSun(): NewDecor {
  const r = new Raster(40, 24);
  r.disc(19.5, 12, 8);
  for (let k = 0; k < 14; k++) { const a = (k * Math.PI) / 7; r.line(19.5 + Math.cos(a) * 10, 12 + Math.sin(a) * 9, 19.5 + Math.cos(a) * 19, 12 + Math.sin(a) * 11.5); }
  r.cut(['##..##'], 16, 10); r.cut(['#....#', '.####.'], 16, 14);
  return decor('floatSun', 5, 3, r, 7);
}

/** The stands: tiers of the crowd, rows of round heads and shoulders. 4 x 2 characters. */
function stands(): NewDecor {
  const r = new Raster(32, 16);
  for (const y of [3, 11]) for (let x = 3; x < 32; x += 6) { r.disc(x, y, 2.4); r.rect(x - 3, y + 2, x + 3, y + 4); }
  return decor('stands', 4, 2, r, ['4444', 'AAAA']);
}

/** A surdo, the big bass drum on the bateria's riser: a deep barrel with its skin and rope tension. 2 x 2 characters. */
function surdo(): NewDecor {
  const r = new Raster(16, 16);
  r.ellipse(7.5, 8, 7.4, 7.4); r.ellipse(7.5, 8, 5.2, 5.2, false); r.ellipse(7.5, 8, 3.6, 3.6);
  for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; r.set(7.5 + Math.cos(a) * 6.3, 8 + Math.sin(a) * 6.3, false); }
  return decor('surdo', 2, 2, r, 7);
}

export const RIO_DECOR = {
  christ: christ(),
  sugarloaf: sugarloaf(),
  cableStation: cableStation(),
  pylon: pylon(),
  lapaArches: lapaArches(),
  house: house(),
  church: church(),
  dish: dish(),
  washing: washing(),
  lampPost: lampPost(),
  bunting: bunting(),
  fishingBoat: fishingBoat(),
  coconutStand: coconutStand(),
  parasol: parasol(),
  deckchair: deckchair(),
  restTable: restTable(),
  saladBar: saladBar(),
  rotisserie: rotisserie(),
  lampRed: lampRed(),
  archKitchen: archKitchen(),
  curtain: curtain(),
  floatGalleon: floatGalleon(),
  floatBird: floatBird(),
  floatSun: floatSun(),
  stands: stands(),
  surdo: surdo(),
} as const satisfies Record<string, NewDecor>;

export type RioDecor = keyof typeof RIO_DECOR;
