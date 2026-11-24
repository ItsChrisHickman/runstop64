/**
 * Rio's decorations for Do Svidaniya Monty (region 7, played at night on black, as Monty on the Run's rooms are), in Monty on the Run's decoration format: solid ink with the detail cut into it as black lines. Few, and
 * each tells the place: the Redeemer and Sugarloaf small across the bay from the beach, the cable car's stations and cable, Lapa's arches (dark grey, behind him), the
 * churrascaria's tables, lamps and grill, Santa Teresa's tram, the Sambadrome's float with its stamping head, its lever and control booth, the Apoteose arch, and the finale's fireworks.
 */
import { FINALE_DECOR } from './rio-finale';
import { decor } from './decorations';
import { characters } from './pixels';
import { Raster } from './raster';
import type { NewDecor } from './types';

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

/** A chain the Sambadrome's float hangs by from the lighting gantry: links one under another. 1 x 1 character, repeated down. */
function chain(): NewDecor {
  const r = new Raster(8, 8);
  r.rect(3, 0, 4, 1); r.rect(2, 2, 5, 5); r.rect(3, 3, 4, 4, false); r.rect(3, 6, 4, 7);
  return decor('rioChain', 1, 1, r, 12);
}

// ---- Lapa's aqueduct: two storeys of arches, the street under them

/** The upper storey of the aqueduct (the Arcos da Lapa): a cornice over two arches with their piers, white stone. 4 x 4 characters. */
function lapaUpper(): NewDecor {
  const r = new Raster(32, 32);
  r.rect(0, 0, 31, 31);
  for (const x0 of [3, 19]) { r.rect(x0, 12, x0 + 9, 31, false); r.ellipse(x0 + 4.5, 12, 5, 6, false); }
  r.rect(0, 4, 31, 4, false);
  return decor('lapaUpper', 4, 4, r, 11);
}

/** The lower storey: one great arch to the street between two piers, the springers of the arch cut in. 4 x 5 characters (it stands on the street). */
function lapaBase(): NewDecor {
  const r = new Raster(32, 40);
  r.rect(0, 0, 31, 39);
  r.rect(4, 14, 27, 39, false); r.ellipse(15.5, 14, 12, 12, false);
  r.rect(0, 0, 31, 0, false); r.rect(0, 1, 31, 1);
  return decor('lapaBase', 4, 5, r, 11);
}

/** A churrascaria table: a white cloth to the floor's edge, plates and a red coaster, a bottle. 3 x 2 characters. */
function restTable(): NewDecor {
  const r = new Raster(24, 16);
  r.rect(0, 5, 23, 8); r.rect(1, 9, 22, 13); for (let x = 4; x < 22; x += 5) r.rect(x, 10, x, 13, false);
  r.rect(2, 14, 3, 15); r.rect(20, 14, 21, 15);
  r.ellipse(6, 4, 3, 1.2); r.ellipse(16, 4, 3, 1.2); r.rect(11, 0, 12, 4); r.rect(11, 0, 11, 0, false);
  return decor('restTable', 3, 2, r, ['111', '111']);
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

/** A hanging red lamp on its flex. 1 x 2 characters. */
function lampRed(): NewDecor {
  const r = new Raster(8, 16);
  r.rect(3, 0, 4, 4); r.triangle(3.5, 5, 0, 11, 7, 11); r.rect(0, 11, 7, 12); r.rect(2, 13, 5, 14);
  return decor('lampRed', 1, 2, r, 2);
}


// ---- the tram, the Sambadrome

/** Santa Teresa's tram (the bonde), side on: the yellow open car under its roof, the benches and posts of its open sides, the trolley pole to the wire, the wheels on the deck. 5 x 3 characters (the deck it stands on is the float's: floats.ts). */
function tram(): NewDecor {
  const r = new Raster(40, 24);
  r.line(28, 0, 34, 3); r.line(29, 0, 35, 3); // the trolley pole
  r.rect(1, 3, 38, 5); // the roof
  for (const x of [2, 10, 19, 28, 36]) r.rect(x, 6, x + 1, 17); // the posts of the open sides
  r.rect(1, 14, 38, 19); r.rect(4, 16, 35, 16, false); // the body under the benches, a line along it
  r.rect(0, 9, 1, 13); r.rect(38, 9, 39, 13); // the dashes at the ends
  for (const x of [6, 31]) { r.disc(x, 21, 2.6); r.set(x, 21, false); } // the wheels
  return decor('rioTram', 5, 3, r, ['77777', '77777', '77777']);
}

/** The Sambadrome's float, the giant head on top of the crusher: a grinning carnival face in a crown of feathers, the mallet's housing under it (the head that stamps is the crusher's, below). 6 x 2 characters. */
function sambaFloat(): NewDecor {
  const r = new Raster(48, 16);
  for (let k = 0; k < 9; k++) { const x = 3 + k * 5; r.triangle(x, 0, x - 3, 7, x + 3, 7); } // the feathers
  r.rect(4, 7, 43, 15); // the face's band
  r.rect(10, 9, 15, 11, false); r.rect(32, 9, 37, 11, false); r.rect(12, 9, 13, 11); r.rect(34, 9, 35, 11); // the eyes
  r.rect(18, 13, 29, 14, false); r.rect(17, 12, 17, 12, false); r.rect(30, 12, 30, 12, false); // the grin
  return decor('rioFloat', 6, 2, r, ['a7a7a7', '444444']);
}

/** The float's lever on its post: a red-knobbed handle up. 1 x 2 characters. */
function lever(): NewDecor {
  const r = new Raster(8, 16);
  r.disc(5, 2, 2); r.line(5, 3, 3, 10); r.line(4, 3, 2, 10); // the handle and its knob
  r.rect(1, 10, 6, 15); r.rect(2, 12, 5, 12, false); // the post
  return decor('rioLever', 1, 2, r, ['2', 'f']);
}

/** The control booth's panel over the stands: its window (dark until the crank is fitted: the room's effect lights it) over a row of switches. 3 x 2 characters, behind him in the booth. */
function booth(): NewDecor {
  const r = new Raster(24, 16);
  r.frame(0, 0, 23, 15);
  r.frame(3, 2, 20, 8); // the window
  for (const x of [3, 9, 15]) r.rect(x, 11, x + 4, 13); // the switches
  return decor('rioBooth', 3, 2, r, ['eee', 'eee']);
}

/** The Apoteose arch at the Sambadrome's end, Niemeyer's M, as an outline in the dark: two humps on three legs. 6 x 3 characters, a backdrop's dark blue. */
function apoteose(): NewDecor {
  const r = new Raster(48, 24);
  for (const cx of [12, 36]) { r.ellipse(cx, 12, 12, 11); r.ellipse(cx, 12, 10, 9, false); r.rect(cx - 12, 12, cx + 12, 23, false); }
  for (const x of [0, 23, 46]) r.rect(x, 12, x + 1, 23);
  return decor('rioArch', 6, 3, r, 6);
}

/** The dark of a doorway or a wall seen behind, one character of solid dark grey (Lapa's street under the townhouse, where the arches' backdrop meets the picture's edge). */
function shade(): NewDecor {
  const r = new Raster(8, 8);
  r.rect(0, 0, 7, 7);
  return decor('rioShade', 1, 1, r, 11);
}

/** A firework of the finale: blank until the finale draws its bursts in (finale.ts writes its characters). 4 x 4 characters. */
function firework(): NewDecor {
  return decor('rioFirework', 4, 4, new Raster(32, 32), 7);
}

/** The finale's firework bursts in turn: a rising spark, a small star, the full burst (twelve rays with a bead at each tip), its embers falling away (the firework's sixteen characters each, row by row). */
export const FIREWORK_FRAMES: readonly Uint8Array[] = [0, 1, 2, 3].map((k) => {
  const r = new Raster(32, 32), c = 15.5;
  if (k === 0) { r.rect(15, 20, 16, 31); r.rect(14, 18, 17, 19); }
  else for (let a = 0; a < 12; a++) {
    const t = (a * Math.PI) / 6, dx = Math.cos(t), dy = Math.sin(t);
    if (k === 1) for (let d = 1; d <= 6; d++) r.set(c + dx * d, c + dy * d);
    else if (k === 2) { for (let d = 3; d <= 13; d++) r.set(c + dx * d, c + dy * d); r.disc(c + dx * 14, c + dy * 14, 1); }
    else for (let d = 9; d <= 15; d += 3) r.set(c + dx * d, c + dy * d + (d - 8) / 2);
  }
  return characters('rioFirework', r.rows(), 4, 4);
});

export const RIO_DECOR = {
  christFar: christFar(),
  sugarloaf: sugarloaf(),
  cableStation: cableStation(),
  rioCableLow: cableLow(),
  rioCableHigh: cableHigh(),
  ...FINALE_DECOR,
  lapaUpper: lapaUpper(),
  lapaBase: lapaBase(),
  restTable: restTable(),
  rioGrill: grill(),
  lampRed: lampRed(),
  rioTram: tram(),
  rioFloat: sambaFloat(),
  rioLever: lever(),
  rioBooth: booth(),
  rioArch: apoteose(),
  rioChain: chain(),
  rioFirework: firework(),
  rioShade: shade(),
} as const satisfies Record<string, NewDecor>;

export type RioDecor = keyof typeof RIO_DECOR;
