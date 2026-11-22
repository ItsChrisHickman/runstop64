/**
 * Rio's decorations for Monty Mole: World Tour (region 7), in Monty on the Run's decoration format and the earlier regions' manner:
 * solid ink with the detail cut into it as black lines. Rio's own colours: a blue sky and sea, green hills, golden sand, colourful
 * houses. The one Christ the Redeemer (on Corcovado's summit) and his small view across the bay, Sugarloaf the rounded granite peak,
 * the cable car's stations, Lapa's two storeys of arches, the favela's houses and their washing lines, the quay, the churrascaria's
 * tables, diners and grill, the carnival's floats with their dancing samba dancers, stands and balloons.
 */
import { decor } from './decorations';
import { characters } from './pixels';
import { limb, Raster } from './raster';
import type { NewDecor } from './types';

// ---- the sky and the sea behind (one character each, placed a cell at a time over a room)

/** One character of blue sky: sparse flecks at the zenith, dashes lower, lines near the horizon (placed a cell at a time, as the luau's sunset is). */
function skyBand(name: string, rows: readonly string[], colour: number): NewDecor {
  const r = new Raster(8, 8);
  r.stamp(rows, 0, 0);
  return decor(name, 1, 1, r, colour);
}

// ---- the statue: Christ the Redeemer

/** Christ the Redeemer on Corcovado's summit: the soapstone statue on its pedestal, arms stretched out wide, the sleeves hanging in folds, the long robe falling to the pedestal (8 x 6 characters; his head is at the top). */
function christ(): NewDecor {
  const r = new Raster(64, 48);
  // the pedestal: three courses, the narrow top under the robe
  r.rect(20, 44, 43, 47); r.rect(24, 40, 39, 43); r.rect(27, 36, 36, 39);
  r.rect(22, 43, 41, 43, false); r.rect(26, 39, 37, 39, false); r.rect(31, 40, 31, 42, false);
  // the robe: narrow at the waist, flaring to the hem
  for (let y = 14; y <= 35; y++) {
    const hw = y <= 26 ? 6.5 - (y - 14) * 0.17 : 4.5 + (y - 26) * 0.4;
    r.rect(Math.round(31.5 - hw), y, Math.round(31.5 + hw), y);
  }
  // the arms, level, thickening at the shoulders, the hands open at the ends, the long sleeves hanging from the forearms
  r.rect(3, 13, 60, 14); r.rect(22, 12, 41, 15);
  r.rect(0, 11, 3, 16); r.rect(60, 11, 63, 16);
  r.triangle(6, 15, 27, 15, 14, 24); r.triangle(57, 15, 36, 15, 49, 24);
  r.line(14, 17, 14, 22, false); r.line(10, 16, 12, 20, false); r.line(49, 17, 49, 22, false); r.line(53, 16, 51, 20, false);
  // the head and neck, the face
  r.rect(30, 10, 33, 13); r.disc(31.5, 6.5, 4.3);
  r.set(30, 6, false); r.set(33, 6, false); r.rect(31, 8, 32, 8, false);
  // folds of the robe and the line of the front opening
  r.line(31.5, 16, 31.5, 35, false); r.line(28, 18, 26, 34, false); r.line(35, 18, 37, 34, false);
  return decor('christ', 8, 6, r, 1);
}

/** The Redeemer from across the bay: a small figure on the summit's green, arms out, the robe flaring to the pedestal. 4 x 3 characters (the beach's view; the finale floodlights it). */
function christFar(): NewDecor {
  const r = new Raster(32, 24);
  r.rect(10, 20, 21, 23); r.rect(12, 17, 19, 19); // the pedestal
  r.triangle(15.5, 8, 11.5, 17, 19.5, 17); r.rect(13, 8, 18, 12); // the robe
  r.rect(2, 7, 29, 8); r.triangle(2, 9, 12, 9, 7, 13); r.triangle(29, 9, 19, 9, 24, 13); // the arms and the sleeves hanging
  r.rect(0, 6, 2, 9); r.rect(29, 6, 31, 9); // the hands
  r.rect(14, 5, 17, 7); r.disc(15.5, 3.4, 2.4); // the neck and the head
  r.line(15.5, 10, 15.5, 17, false);
  return decor('christFar', 4, 3, r, 15);
}

/** Sugarloaf (Pao de Acucar): the famous bald granite monolith, smooth and rounded, steep on its right, its long dark streaks, the lower hill of Urca at its side, the green forest at its foot. 8 x 5 characters. */
function sugarloaf(): NewDecor {
  const r = new Raster(64, 40);
  r.ellipse(42, 46, 21, 44); // the great peak
  r.ellipse(13, 48, 15, 25); // Urca
  r.rect(0, 36, 63, 39);
  r.line(37, 5, 33, 33, false); r.line(46, 4, 50, 30, false); r.line(41, 12, 40, 26, false); r.line(30, 12, 27, 30, false); r.line(54, 14, 56, 28, false);
  r.line(10, 28, 8, 35, false); r.line(18, 30, 19, 36, false);
  r.rect(0, 30, 63, 30, false); r.set(40, 30, true);
  return decor('sugarloaf', 8, 5, r, ['ffffffff', 'ffffffff', 'ffffffff', 'dddddddd', '55555555']);
}

/** Sugarloaf's crown, seen from its base: the great smooth rounded rock, its left shoulder bulging out and curving down to a sheer face, long dark streaks down it, a fringe of forest at the foot (9 x 7 characters; the room's solid cliff takes it on at the right). */
function peak(): NewDecor {
  const r = new Raster(72, 56);
  for (let y = 0; y < 56; y++) {
    const t = (56 - y) / 56;
    r.rect(Math.round(40 - 40 * Math.sqrt(Math.max(0, 1 - t * t))), y, 71, y);
  }
  r.line(50, 2, 41, 54, false); r.line(61, 1, 64, 40, false); r.line(31, 11, 24, 50, false); r.line(55, 16, 53, 36, false); r.line(18, 24, 13, 52, false); r.line(68, 12, 70, 30, false); r.line(40, 20, 38, 34, false);
  r.rect(0, 49, 71, 49, false);
  return decor('rioPeak', 9, 7, r, ['fffffffff', 'fffffffff', 'fffffffff', 'fffffffff', 'fffffffff', 'fffffffff', 'ddddddddd']);
}

// ---- the cable car's stations and the quay

/** The cable car's station: a boxy building under a sloping red roof, windows in a row, the cable arriving at its roof. 4 x 3 characters. */
function cableStation(): NewDecor {
  const r = new Raster(32, 24);
  r.triangle(0, 8, 31, 0, 31, 8); r.rect(0, 8, 31, 8);
  r.rect(2, 9, 29, 23);
  for (const x of [5, 12, 19]) r.rect(x, 12, x + 4, 17, false);
  r.rect(23, 14, 27, 23, false); r.rect(25, 14, 25, 23);
  return decor('cableStation', 4, 3, r, ['2222', '7777', '7777']);
}

/** The cable's line, its lower half of a pair: climbs a row over two cells (a decoration, so it is drawn wherever it is wanted over the picture). 1 x 1 character. */
function cableLow(): NewDecor {
  const r = new Raster(8, 8);
  r.stamp(['........', '........', '........', '........', '......##', '....####', '..####..', '####....'], 0, 0);
  return decor('rioCableLow', 1, 1, r, 1);
}

/** The cable's line, its upper half of a pair. 1 x 1 character. */
function cableHigh(): NewDecor {
  const r = new Raster(8, 8);
  r.stamp(['......##', '....####', '..####..', '####....', '........', '........', '........', '........'], 0, 0);
  return decor('rioCableHigh', 1, 1, r, 1);
}

/** Stilts under the station's shelf: two posts crossed with braces. 2 x 2 characters. */
function stilts(): NewDecor {
  const r = new Raster(16, 16);
  r.rect(1, 0, 2, 15); r.rect(13, 0, 14, 15); r.line(2, 0, 13, 15); r.line(13, 0, 2, 15);
  return decor('rioStilts', 2, 2, r, 9);
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
  return decor('fishingBoat', 5, 3, r, ['22222', '11111', '99999']);
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

// ---- Lapa's aqueduct: two storeys of arches, the street under them

/** The upper storey of the aqueduct (the Arcos da Lapa): a cornice over two arches with their piers, white stone. 4 x 4 characters. */
function lapaUpper(): NewDecor {
  const r = new Raster(32, 32);
  r.rect(0, 0, 31, 31);
  for (const x0 of [3, 19]) { r.rect(x0, 12, x0 + 9, 31, false); r.ellipse(x0 + 4.5, 12, 5, 6, false); }
  r.rect(0, 4, 31, 4, false);
  return decor('lapaUpper', 4, 4, r, 1);
}

/** The lower storey: one great arch to the street between two piers, the springers of the arch cut in. 4 x 6 characters (it stands on the street). */
function lapaBase(): NewDecor {
  const r = new Raster(32, 48);
  r.rect(0, 0, 31, 47);
  r.rect(4, 14, 27, 47, false); r.ellipse(15.5, 14, 12, 12, false);
  r.rect(0, 0, 31, 0, false); r.rect(0, 1, 31, 1);
  return decor('lapaBase', 4, 6, r, 1);
}

// ---- the favela: colourful houses with their washing hung between them

/** A house front of the hill, the wall in one of Rio's colours: three windows and a door. 3 x 3 characters. */
function house(name: string, colour: number, kind: 'door' | 'balcony' | 'shop' | 'tank'): NewDecor {
  const r = new Raster(24, 24);
  r.rect(0, 0, 23, 23);
  r.rect(0, 0, 23, 1, false); r.rect(0, 2, 23, 3);
  if (kind === 'door') {
    r.rect(3, 6, 8, 11, false); r.rect(15, 6, 20, 11, false); r.rect(5, 6, 6, 11); r.rect(17, 6, 18, 11);
    r.rect(9, 14, 14, 23, false); r.rect(11, 14, 12, 23);
  } else if (kind === 'balcony') {
    r.rect(2, 6, 21, 12, false); r.rect(2, 9, 21, 9); r.rect(11, 6, 12, 8);
    r.rect(2, 16, 7, 23, false); r.rect(15, 16, 21, 21, false); r.rect(15, 16, 21, 16); r.rect(18, 16, 18, 21);
  } else if (kind === 'shop') {
    r.rect(2, 6, 21, 8, false); r.rect(2, 12, 21, 23, false); r.rect(2, 12, 21, 14);
    r.rect(5, 15, 18, 23, false); r.rect(11, 15, 12, 23);
  } else {
    r.rect(3, 6, 8, 11, false); r.rect(5, 6, 6, 11); r.rect(15, 6, 20, 11, false); r.rect(15, 8, 20, 8);
    r.rect(9, 14, 14, 23, false); r.ellipse(18, 18, 2.5, 2.5, false);
  }
  return decor(name, 3, 3, r, colour);
}

/** A line of washing, two cells wide: the line along the top, clothes in two colours hanging from it (cells side by side make one line of any length). 2 x 1 characters. */
function wash(name: string, kind: 'shirts' | 'dress' | 'towels' | 'trousers', colours: string): NewDecor {
  const r = new Raster(16, 8);
  r.rect(0, 0, 15, 0);
  if (kind === 'shirts') { r.rect(1, 1, 6, 6); r.rect(0, 1, 1, 3); r.rect(6, 1, 7, 3); r.rect(9, 1, 14, 7); r.rect(11, 1, 12, 2, false); }
  else if (kind === 'dress') { r.triangle(4, 1, 0, 7, 8, 7); r.rect(3, 1, 5, 2); r.rect(10, 1, 13, 4); r.rect(11, 5, 12, 6); }
  else if (kind === 'towels') { r.rect(1, 1, 5, 7); r.rect(1, 3, 5, 3, false); r.rect(9, 1, 14, 6); r.rect(9, 3, 14, 3, false); }
  else { r.rect(1, 1, 6, 2); r.rect(1, 3, 2, 7); r.rect(5, 3, 6, 7); r.rect(9, 1, 14, 5); r.rect(11, 1, 12, 1, false); r.rect(9, 5, 10, 7); r.rect(13, 5, 14, 7); }
  return decor(name, 2, 1, r, [colours]);
}

/** A post under a roof's end: an upright with a footing. 1 x 2 characters. */
function post(): NewDecor {
  const r = new Raster(8, 16);
  r.rect(2, 0, 5, 15); r.rect(0, 14, 7, 15);
  return decor('rioPost', 1, 2, r, 9);
}

/** A pole at a roof's edge to hang washing from: an upright with a crossbar. 1 x 3 characters. */
function pole(): NewDecor {
  const r = new Raster(8, 24);
  r.rect(3, 0, 4, 23); r.rect(0, 0, 7, 1);
  return decor('rioPole', 1, 3, r, 9);
}

/** A church tower of the hill: a square tower with a belfry opening and a cross on a little roof, one of the hill's colours. 3 x 4 characters. */
function church(): NewDecor {
  const r = new Raster(24, 32);
  r.rect(11, 0, 12, 5); r.rect(9, 2, 14, 3); // the cross
  r.triangle(12, 5, 2, 12, 21, 12); r.rect(3, 12, 20, 31); // the roof and the tower
  r.rect(8, 15, 15, 23, false); r.rect(10, 13, 13, 14, false); r.rect(11, 16, 12, 22);
  r.rect(9, 27, 14, 31, false);
  return decor('church', 3, 4, r, ['111', '111', 'eee', 'eee'].map((row) => row));
}

/** A satellite dish on its bracket. 1 x 1 characters. */
function dish(): NewDecor {
  const r = new Raster(8, 8);
  r.ellipse(3.5, 3, 3.5, 2.8); r.ellipse(3.5, 3.6, 2.6, 2, false); r.rect(3, 5, 4, 7); r.rect(1, 7, 6, 7);
  return decor('dish', 1, 1, r, 1);
}

// ---- the summit: the rail, a viewer, the flag

/** A railing along the summit's edge: a top rail on posts. 4 x 1 characters. */
function rail(): NewDecor {
  const r = new Raster(32, 8);
  r.rect(0, 1, 31, 2);
  for (const x of [0, 10, 20, 30]) r.rect(x, 1, x + 1, 7);
  return decor('rioRail', 4, 1, r, 1);
}

/** A coin-in-the-slot viewer on its post: a binocular box on a stand. 1 x 2 characters. */
function scope(): NewDecor {
  const r = new Raster(8, 16);
  r.rect(1, 1, 6, 5); r.rect(2, 2, 2, 4, false); r.rect(5, 2, 5, 4, false); r.rect(3, 6, 4, 15); r.rect(1, 14, 6, 15);
  return decor('rioScope', 1, 2, r, 8);
}

/** Brazil's flag on a pole: green with the yellow diamond. 4 x 3 characters (the pole at the left). */
function flag(): NewDecor {
  const r = new Raster(32, 24);
  r.rect(2, 0, 3, 23); r.rect(0, 22, 5, 23);
  r.rect(8, 2, 31, 2); r.rect(8, 15, 31, 15);
  r.rect(8, 3, 15, 14); r.rect(24, 3, 31, 14); // the green
  r.triangle(19.5, 3, 16, 8.5, 23, 8.5); r.triangle(19.5, 14, 16, 8.5, 23, 8.5); // the yellow diamond
  r.ellipse(19.5, 8.5, 2.5, 2.5, false); // (the blue disc, dark on this screen)
  return decor('rioFlag', 4, 3, r, ['9575', '9575', '9000']);
}

// ---- the churrascaria: diners, the grill, the wine rack

/** A diner at the table: head, shoulders, one arm to the plate, the shirt in a bright colour. 1 x 2 characters. */
function diner(name: string, colour: number, hair: boolean): NewDecor {
  const r = new Raster(8, 16);
  r.disc(3.5, 3.5, 2.8); r.rect(0, 8, 7, 15); r.rect(1, 6, 6, 7);
  r.set(2, 3, false); r.set(5, 3, false); r.rect(3, 5, 4, 5, false);
  if (hair) r.rect(1, 0, 6, 1, false);
  return decor(name, 1, 2, r, colour);
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

/** The grill (a churrasqueira): a brick pit with the fire under two racks of long skewers of meat, 6 x 4 characters. The top three rows' meat turns and the flames flicker (`GRILL_ANIM`). */
const GRILL = { w: 6, h: 4 } as const;
function grillRaster(turn: 0 | 1): Raster {
  const r = new Raster(48, 32);
  // the brick pit, its fire box open at the top
  r.rect(0, 24, 47, 31); r.rect(2, 28, 45, 28, false); r.rect(1, 25, 46, 25, false);
  r.rect(7, 26, 8, 27, false); r.rect(19, 26, 20, 27, false); r.rect(31, 26, 32, 27, false); r.rect(41, 26, 42, 27, false);
  // the flames: a tongue between each pair of skewers' uprights
  for (const x of [8, 18, 28, 38]) {
    const lean = turn === 0 ? 0 : 2;
    r.triangle(x + 3 + lean, 12, x - 1, 24, x + 7, 24);
    r.triangle(x + 3 + lean, 17, x + 1, 24, x + 5, 24, false);
  }
  // the uprights and two long skewers of meat, the chunks turning from a round face to a narrow edge
  r.rect(1, 6, 2, 23); r.rect(45, 6, 46, 23);
  r.rect(0, 7, 47, 7);
  for (const x of [5, 13, 21, 29, 37]) { if (turn === 0) r.ellipse(x + 3, 7, 3.4, 3); else r.ellipse(x + 3, 7, 1.8, 3); }
  r.rect(0, 15, 47, 15);
  for (const x of [9, 17, 25, 33]) { if (turn === 0) r.ellipse(x + 3, 15, 1.8, 3); else r.ellipse(x + 3, 15, 3.4, 3); }
  return r;
}
function grill(): NewDecor {
  const r = grillRaster(0);
  return decor('rioGrill', GRILL.w, GRILL.h, r, ['aaaaaa', 'aaaaaa', '878787', '999999']);
}
/** The grill's turning meat and flicker as frames of its top three rows' characters (row by row), for the engine's `charAnims` (`cell` numbers of the decoration). */
export const GRILL_ANIM = {
  cells: Array.from({ length: GRILL.w * 3 }, (_, i) => i),
  frames: ([0, 1] as const).map((turn) => characters('rioGrill', grillRaster(turn).rows(), GRILL.w, GRILL.h).subarray(0, GRILL.w * 3 * 8)),
} as const;

/** A wine rack on the wall: bottles lying in their pigeonholes. 2 x 2 characters. */
function wineRack(): NewDecor {
  const r = new Raster(16, 16);
  r.frame(0, 0, 15, 15); r.rect(0, 7, 15, 8); r.rect(7, 0, 8, 15);
  for (const [x, y] of [[2, 2], [10, 2], [2, 10], [10, 10]] as const) r.rect(x, y, x + 3, y + 3, false), r.ellipse(x + 1.5, y + 1.5, 1.6, 1.6);
  return decor('rioWineRack', 2, 2, r, 2);
}

/** A hanging red lamp on its flex. 1 x 2 characters. */
function lampRed(): NewDecor {
  const r = new Raster(8, 16);
  r.rect(3, 0, 4, 4); r.triangle(3.5, 5, 0, 11, 7, 11); r.rect(0, 11, 7, 12); r.rect(2, 13, 5, 14);
  return decor('lampRed', 1, 2, r, 2);
}

/** A stage curtain, drawn back to one side in folds. 2 x 3 characters. */
function curtain(): NewDecor {
  const r = new Raster(16, 24);
  r.rect(0, 0, 15, 23);
  for (const x of [3, 7, 11]) r.line(x, 2, x + 1, 23, false);
  r.rect(0, 0, 15, 1); r.rect(0, 2, 15, 2, false);
  return decor('curtain', 2, 3, r, 2);
}

// ---- the carnival: floats with their dancers, stands, balloons, the drum

/**
 * A samba dancer on a float, 16 x 16 pixels at (x0, y0) of a raster: a fan of plumes over a smiling face, arms up or out, a feathered skirt flaring, the skirt swinging side to side. `pose` 0 arms up, 1 arms out.
 * Two frames of it are the dance (`FLOAT_DANCERS`).
 */
function samba(r: Raster, x0: number, y0: number, pose: 0 | 1) {
  const o = pose === 0 ? 0 : 1;
  const at = (x: number, y: number) => [x0 + x, y0 + y] as const;
  const [hx, hy] = at(8, 5);
  r.disc(hx, hy, 2.6); // the head
  r.set(...at(7, 5), false); r.set(...at(10, 5), false); r.rect(...at(7, 7), ...at(9, 7), false); // eyes, a smile
  for (const [dx, dy] of [[3, 0], [8, 0], [13, 0], [5, 1], [11, 1]] as const) { const [px, py] = at(dx, dy); r.line(hx, hy - 2, px, py); } // the plumes
  const [bx, by] = at(6, 8);
  r.rect(bx, by, bx + 3, by + 3); // the body
  const [sx, sy] = at(8 + o, 10);
  r.triangle(sx, sy, ...at(1 + o, 15), ...at(14 + o, 15)); // the skirt, swinging
  for (let k = 2; k < 15; k += 3) { const [fx, fy] = at(k + o, 13); r.rect(fx, fy, fx, fy + 2, false); }
  if (pose === 0) { limb(r, ...at(6, 9), ...at(3, 3), 2); limb(r, ...at(10, 9), ...at(13, 3), 2); }
  else { limb(r, ...at(5, 9), ...at(0, 10), 2); limb(r, ...at(10, 9), ...at(15, 10), 2); }
}

/** One float's picture: its prop (made by `prop`) across the right four columns, the dancer at the left two columns' lower rows (cells 6 and 7: the dancer's, the engine's `charAnims` change their pictures). 6 x 3 characters. */
function floatPiece(name: string, prop: (r: Raster) => void, colours: readonly string[], pose: 0 | 1): { piece: NewDecor; rows: readonly string[] } {
  const r = new Raster(48, 24);
  prop(r);
  r.rect(0, 8, 15, 23, false);
  samba(r, 0, 8, pose);
  return { piece: decor(name, 6, 3, r, colours), rows: r.rows() };
}

/** A pirate galleon for the carnival: two masts with square sails and a flag over a curved hull with its gunports. */
const galleonProp = (r: Raster) => {
  r.triangle(16, 16, 47, 16, 40, 23); r.rect(16, 16, 47, 18); r.rect(18, 19, 40, 23); r.triangle(40, 19, 47, 19, 40, 23);
  for (let x = 20; x < 40; x += 5) r.rect(x, 20, x + 2, 21, false);
  r.rect(24, 3, 25, 16); r.rect(37, 5, 38, 16);
  r.rect(17, 4, 32, 13); r.rect(30, 6, 45, 14); r.rect(24, 4, 25, 13, false); r.rect(37, 6, 38, 14, false);
  r.rect(17, 8, 32, 8, false); r.rect(30, 10, 45, 10, false);
  r.rect(24, 3, 25, 16); r.rect(37, 5, 38, 16);
  r.rect(26, 0, 33, 2); r.rect(26, 0, 26, 2, false);
};
/** A great bird for the carnival: a tail fan rising over the dancer, a round body, a long neck and a beaked head. */
const birdProp = (r: Raster) => {
  for (let k = -3; k <= 3; k++) { const a = (k * 18 * Math.PI) / 180; for (let t = 2; t < 11; t++) r.set(10 + Math.sin(a) * t * 1.2, 7 - Math.cos(a) * t * 0.7, true), r.set(11 + Math.sin(a) * t * 1.2, 7 - Math.cos(a) * t * 0.7, true); }
  r.ellipse(32, 17, 10, 6); r.rect(39, 6, 42, 16); r.ellipse(43, 6, 4, 3.4); r.triangle(46, 5, 47, 7, 46, 9);
  r.cut(['##'], 42, 5); r.rect(24, 17, 38, 17, false); r.rect(16, 21, 47, 23, false);
  r.rect(26, 22, 28, 23); r.rect(35, 22, 37, 23);
};
/** A sun for the carnival: a round smiling face with a ring of rays. */
const sunProp = (r: Raster) => {
  r.disc(31.5, 12, 6.5);
  for (let k = 0; k < 12; k++) { const a = (k * Math.PI) / 6; r.line(31.5 + Math.cos(a) * 8, 12 + Math.sin(a) * 8, 31.5 + Math.cos(a) * 15, 12 + Math.sin(a) * 11.5); }
  r.cut(['##.##'], 29, 9); r.cut(['#...#', '.###.'], 29, 13);
};

const GALLEON = floatPiece('floatGalleon', galleonProp, ['aa1117', 'a31111', 'aa2222'], 0);
const BIRD = floatPiece('floatBird', birdProp, ['552222', 'a32222', 'aa2222'], 0);
const SUN = floatPiece('floatSun', sunProp, ['a37777', 'a37777', 'aa7777'], 0);

/** The dancers: each float's dancer chars (the decoration's cells 6, 7, 12 and 13 of a 6-wide piece: the two left cells of its two lower rows) with their two pictures, arms up and arms out, for the engine's `charAnims`. */
export const FLOAT_DANCERS = (['floatGalleon', 'floatBird', 'floatSun'] as const).map((name) => {
  const prop = name === 'floatGalleon' ? galleonProp : name === 'floatBird' ? birdProp : sunProp;
  const rowsOf = (pose: 0 | 1) => floatPiece(name, prop, ['aaaaaa', 'aaaaaa', 'aaaaaa'], pose).rows;
  const cells = [6, 7, 12, 13] as const;
  const bytes = (pose: 0 | 1) => {
    const all = characters(name, rowsOf(pose), 6, 3);
    return Uint8Array.from(cells.flatMap((c) => [...all.subarray(c * 8, c * 8 + 8)]));
  };
  return { decor: name, cells, frames: [bytes(0), bytes(1)] };
});

/** The stands: tiers of the crowd, rows of round heads and shoulders, in two colours. 4 x 2 characters. */
function stands(name: string, tops: string, bottoms: string): NewDecor {
  const r = new Raster(32, 16);
  for (const y of [3, 11]) for (let x = 3; x < 32; x += 6) { r.disc(x, y, 2.4); r.rect(x - 3, y + 2, x + 3, y + 4); }
  return decor(name, 4, 2, r, [tops, bottoms]);
}

/** A string of balloons: three round balloons on strings, in bright colours. 2 x 2 characters. */
function balloons(): NewDecor {
  const r = new Raster(16, 16);
  for (const [x, y] of [[3, 3], [8, 2], [12, 4]] as const) { r.ellipse(x, y, 2.6, 3); r.line(x, y + 3, 8, 15); }
  return decor('rioBalloons', 2, 2, r, ['27', '53']);
}

/** A surdo, the big bass drum on the bateria's riser: a deep barrel with its skin and rope tension. 2 x 2 characters. */
function surdo(): NewDecor {
  const r = new Raster(16, 16);
  r.ellipse(7.5, 8, 7.4, 7.4); r.ellipse(7.5, 8, 5.2, 5.2, false); r.ellipse(7.5, 8, 3.6, 3.6);
  for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; r.set(7.5 + Math.cos(a) * 6.3, 8 + Math.sin(a) * 6.3, false); }
  return decor('surdo', 2, 2, r, 7);
}

/** A tall standard of feathers carried in the parade: a pole with a fan of plumes. 2 x 4 characters. */
function plumes(): NewDecor {
  const r = new Raster(16, 32);
  r.rect(7, 12, 8, 31);
  for (let k = -3; k <= 3; k++) { const a = (k * 22 * Math.PI) / 180; for (let t = 3; t < 13; t++) r.set(7.5 + Math.sin(a) * t, 12 - Math.cos(a) * t, true), r.set(8.5 + Math.sin(a) * t, 12 - Math.cos(a) * t, true); }
  r.disc(7.5, 12, 2.5);
  return decor('rioPlumes', 2, 4, r, ['aa', '22', '77', '77']);
}

export const RIO_DECOR = {
  rioSkyHi: skyBand('rioSkyHi', ['........', '..#.....', '........', '.....#..', '........', '.#......', '........', '....#...'], 6),
  rioSkyMid: skyBand('rioSkyMid', ['........', '..#...#.', '........', '#.......', '........', '...#..#.', '........', '.#......'], 14),
  rioSkyLow: skyBand('rioSkyLow', ['........', '.##.....', '........', '.....##.', '........', '##......', '........', '....##..'], 14),
  christ: christ(),
  christFar: christFar(),
  sugarloaf: sugarloaf(),
  rioPeak: peak(),
  cableStation: cableStation(),
  rioCableLow: cableLow(),
  rioCableHigh: cableHigh(),
  rioStilts: stilts(),
  lampPost: lampPost(),
  bunting: bunting(),
  fishingBoat: fishingBoat(),
  coconutStand: coconutStand(),
  parasol: parasol(),
  deckchair: deckchair(),
  lapaUpper: lapaUpper(),
  lapaBase: lapaBase(),
  rioHousePink: house('rioHousePink', 10, 'door'),
  rioHouseYellow: house('rioHouseYellow', 7, 'balcony'),
  rioHouseBlue: house('rioHouseBlue', 14, 'shop'),
  rioHouseGreen: house('rioHouseGreen', 13, 'tank'),
  rioWashA: wash('rioWashA', 'shirts', '27'),
  rioWashB: wash('rioWashB', 'dress', '3a'),
  rioWashC: wash('rioWashC', 'towels', '84'),
  rioWashD: wash('rioWashD', 'trousers', '1e'),
  rioPole: pole(),
  rioPost: post(),
  church: church(),
  dish: dish(),
  rioRail: rail(),
  rioScope: scope(),
  rioFlag: flag(),
  rioDinerRed: diner('rioDinerRed', 2, true),
  rioDinerBlue: diner('rioDinerBlue', 14, false),
  restTable: restTable(),
  saladBar: saladBar(),
  rioGrill: grill(),
  rioWineRack: wineRack(),
  lampRed: lampRed(),
  curtain: curtain(),
  floatGalleon: GALLEON.piece,
  floatBird: BIRD.piece,
  floatSun: SUN.piece,
  stands: stands('stands', '4444', 'AAAA'),
  rioStandsGold: stands('rioStandsGold', '7777', '8888'),
  rioBalloons: balloons(),
  surdo: surdo(),
  rioPlumes: plumes(),
} as const satisfies Record<string, NewDecor>;

export type RioDecor = keyof typeof RIO_DECOR;
