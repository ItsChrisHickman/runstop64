/**
 * Japan's open-air scenery, in the manner of japan-decor.ts: the harbour at dawn (a sun and fishing boats on the horizon, the market's awnings, fish on ice in
 * crates, gulls), Fuji's sky (a red sun, clouds), the garden (a red torii, a pagoda, bamboo) and the castle's grounds (a clipped hedge, a banner). Solid
 * ink with the detail cut into it as black lines. Every name starts `jp`.
 */
import { decor } from './decorations';
import { Raster } from './raster';
import type { NewDecor } from './types';

/** The dawn: a half sun on the sea's line with rays and two fishing boats with their battened sails. 8 x 3 characters, colours by row. */
function horizon(): NewDecor {
  const r = new Raster(64, 24);
  r.disc(40, 22, 9); r.rect(28, 22, 52, 23, false); // the sun rising out of the sea
  for (const a of [-1.2, -0.7, -0.25, 0.25, 0.7, 1.2] as const) r.line(40 + Math.sin(a) * 12, 22 - Math.cos(a) * 12, 40 + Math.sin(a) * 18, 22 - Math.cos(a) * 18); // its rays
  r.rect(0, 22, 63, 22); for (let x = 3; x < 63; x += 9) r.rect(x, 23, x + 4, 23); // the sea's line and its ripples
  for (const [x, s] of [[4, 1], [50, 0]] as const) { // fishing boats: a hull, a mast, a battened sail
    r.rect(x, 19, x + 11, 20); r.rect(x + 1, 21, x + 10, 21); r.rect(x + 5, 8 + s * 3, x + 5, 19);
    r.triangle(x + 6, 9 + s * 3, x + 6, 18, x + 11, 18); r.rect(x + 7, 12 + s * 3, x + 10, 12 + s * 3, false);
  }
  return decor('jpHorizon', 8, 3, r, ['77777777', '88888888', '66666666']);
}

/** A market awning over a stall: a scalloped valance in stripes. 4 x 1 characters (one piece a colour). */
function awning(name: string, colour: number): NewDecor {
  const r = new Raster(32, 8);
  r.rect(0, 0, 31, 4);
  for (let x = 3; x < 32; x += 8) r.rect(x, 0, x + 3, 4, false); // the stripes
  for (let x = 0; x < 32; x += 8) { r.rect(x, 5, x + 7, 5); r.rect(x + 1, 6, x + 6, 6); r.rect(x + 3, 7, x + 4, 7); } // the scalloped edge
  return decor(name, 4, 1, r, colour);
}

/** A crate of fish on ice: the crate in timber below, silver fish heaped on the ice above with their tails up. 3 x 2 characters, the fish and ice white over a brown crate. */
function fishCrate(): NewDecor {
  const r = new Raster(24, 16);
  for (const [x, y, d] of [[2, 4, 1], [9, 2, -1], [15, 5, 1], [6, 6, -1]] as const) { // fish: a body, a forked tail, an eye
    r.ellipse(x + 4, y + 3, 4.2, 2.2); r.triangle(x + (d > 0 ? 8 : 0), y + 3, x + (d > 0 ? 11 : -3), y, x + (d > 0 ? 11 : -3), y + 6);
    r.set(x + (d > 0 ? 2 : 6), y + 2, false);
  }
  r.rect(0, 8, 23, 8, false);
  r.rect(0, 9, 23, 15); r.rect(2, 11, 21, 11, false); r.rect(2, 14, 21, 14, false); r.rect(11, 9, 12, 15, false); // the crate's slats
  return decor('jpFishCrate', 3, 2, r, ['111', '999']);
}

/** Gulls: two curved V strokes. 2 x 1 characters. */
function gulls(): NewDecor {
  const r = new Raster(16, 8);
  for (const [x, y] of [[1, 3], [9, 0]] as const) { r.line(x, y + 2, x + 2, y); r.line(x + 2, y, x + 4, y + 2); r.line(x + 4, y + 2, x + 6, y); r.line(x + 6, y, x + 7, y + 2); }
  return decor('jpGulls', 2, 1, r, 1);
}

/** The rising sun of the flag: a great red disc with a thin ring. 4 x 4 characters. */
function sun(): NewDecor {
  const r = new Raster(32, 32);
  r.disc(15.5, 15.5, 15); r.ring(15.5, 15.5, 11.5); r.rect(9, 9, 13, 10, false); // a glint
  return decor('jpSun', 4, 4, r, 10);
}

/** A bank of cloud drifting: a flat base and rounded humps. 5 x 2 characters. */
function cloud(): NewDecor {
  const r = new Raster(40, 16);
  r.disc(10, 10, 5); r.disc(18, 7, 6.5); r.disc(27, 9, 5.5); r.disc(33, 11, 3.5); r.rect(6, 11, 36, 14);
  r.rect(4, 15, 39, 15, false); r.rect(8, 9, 10, 9, false); r.rect(20, 6, 24, 6, false); r.rect(11, 13, 30, 13, false);
  return decor('jpCloud', 5, 2, r, 1);
}

/** A great red torii gate: two round pillars, the two lintels with their upturned ends. 5 x 4 characters. */
function torii(): NewDecor {
  const r = new Raster(40, 32);
  r.rect(6, 8, 9, 31); r.rect(30, 8, 33, 31); // the pillars
  r.rect(4, 28, 11, 31); r.rect(28, 30, 35, 31); r.rect(7, 10, 7, 30, false); r.rect(31, 10, 31, 30, false);
  r.rect(1, 2, 38, 5); r.triangle(0, 1, 4, 2, 2, 6); r.triangle(39, 1, 35, 2, 37, 6); r.rect(3, 2, 36, 2, false); // the top lintel, upturned
  r.rect(0, 0, 2, 1); r.rect(37, 0, 39, 1); r.rect(4, 3, 35, 3, false);
  r.rect(9, 11, 30, 14); r.rect(9, 12, 30, 12, false); // the lower tie-beam
  r.rect(18, 6, 21, 10); r.rect(19, 7, 20, 9, false); // the plaque
  return decor('jpTorii', 5, 4, r, 2);
}

/** A five-storey pagoda: stacked square storeys, each with its swept roof, a finial spire. 4 x 8 characters. */
function pagoda(): NewDecor {
  const r = new Raster(32, 64);
  r.rect(15, 0, 16, 7); r.rect(13, 3, 18, 3, false); r.rect(14, 6, 17, 6, false); // the finial rings
  for (let k = 0; k < 5; k++) {
    const y = 8 + k * 11, half = 6 + k * 2;
    r.triangle(16 - half - 4, y + 4, 16 + half + 4, y + 4, 16, y - 1); r.rect(16 - half - 5, y + 4, 16 + half + 4, y + 5); // the swept roof
    r.rect(16 - half - 5, y + 3, 16 - half - 5, y + 3, false);
    r.rect(16 - half + 1, y + 6, 16 + half - 1, y + 10); r.rect(14, y + 7, 17, y + 10, false); // the storey and its door
  }
  r.rect(2, 62, 29, 63);
  return decor('jpPagoda', 4, 8, r, 2);
}

/** Three stalks of bamboo: tall green canes with their nodes and a few leaves. 3 x 6 characters. */
function bamboo(): NewDecor {
  const r = new Raster(24, 48);
  for (const [x, lo] of [[3, 0], [11, 6], [19, 2]] as const) {
    r.rect(x, lo, x + 2, 47);
    for (let y = lo + 6; y < 47; y += 9) r.rect(x, y, x + 2, y, false); // the nodes
    r.rect(x + 1, lo, x + 1, 47, false);
    r.rect(x + 3, lo + 10, x + 6, lo + 11); r.rect(x - 4, lo + 22, x - 1, lo + 23); // leaves
  }
  return decor('jpBamboo3', 3, 6, r, 5);
}

/** A clipped hedge: a long green block with a rounded top and the cuts of its leaves. 3 x 1 characters. */
function hedge(): NewDecor {
  const r = new Raster(24, 8);
  r.rect(0, 2, 23, 7); r.rect(1, 1, 22, 1); r.rect(3, 0, 20, 0);
  for (let x = 2; x < 24; x += 5) r.rect(x, 4, x + 1, 4, false); for (let x = 5; x < 24; x += 6) r.rect(x, 6, x + 1, 6, false);
  return decor('jpHedge', 3, 1, r, 5);
}

/** A castle banner (nobori): a pole with a long hanging flag and a crest on it. 2 x 4 characters. */
function banner(): NewDecor {
  const r = new Raster(16, 32);
  r.rect(1, 0, 2, 31); r.rect(0, 0, 14, 1); r.rect(4, 3, 14, 26); r.rect(6, 5, 12, 24, false); r.disc(9, 14.5, 2.5); r.rect(8, 14, 10, 15, false);
  return decor('jpBanner', 2, 4, r, 2);
}

/** A dwarf pine on the grounds: layered pads of needles on a twisted trunk. 4 x 4 characters. */
function pineBig(): NewDecor {
  const r = new Raster(32, 32);
  r.line(15, 31, 14, 14); r.line(16, 31, 15, 14); r.line(15, 22, 26, 18);
  r.ellipse(15, 8, 11, 4.2); r.ellipse(6, 17, 7, 3.2); r.ellipse(26, 15, 6, 3); r.ellipse(17, 26, 8, 2.8);
  for (const [x, y] of [[9, 7], [18, 8], [5, 17], [25, 15], [15, 26]] as const) r.rect(x, y, x + 3, y, false);
  return decor('jpPineBig', 4, 4, r, 5);
}

/** An andon, a paper floor lamp: a lit paper box in a timber frame on short legs, a lattice on its face. 2 x 3 characters. */
function andon(): NewDecor {
  const r = new Raster(16, 24);
  r.rect(2, 2, 13, 3); r.rect(3, 4, 12, 18, false); r.frame(2, 4, 13, 18); r.rect(7, 4, 8, 18); r.rect(3, 10, 12, 10); // the frame and its lattice
  r.rect(6, 7, 9, 8); r.rect(6, 13, 9, 15); // the glow's marks
  r.rect(2, 19, 13, 20); r.rect(3, 21, 4, 23); r.rect(11, 21, 12, 23); // the base and its legs
  return decor('jpAndon', 2, 3, r, 7);
}

/** The cargo ship's bridge and funnel seen from the quay: a funnel with a red band over a white deckhouse with its row of windows. 4 x 7 characters. */
function shipBridge(): NewDecor {
  const r = new Raster(32, 56);
  r.rect(10, 0, 21, 17); r.rect(10, 5, 21, 8, false); r.rect(10, 9, 21, 12); // the funnel and its band
  r.rect(2, 20, 29, 55); r.rect(0, 18, 31, 19); // the deckhouse and its roof
  for (let y = 24; y < 52; y += 11) for (let x = 5; x < 28; x += 6) r.rect(x, y, x + 3, y + 5, false); // rows of windows
  r.rect(13, 44, 18, 55, false); // the door
  r.rect(15, 18, 15, 12, false);
  return decor('jpShipBridge', 4, 7, r, ['3333', '2222', '1111', '1111', '1111', '1111', '1111']);
}

export const JAPAN_SCENERY = {
  jpAndon: andon(),
  jpShipBridge: shipBridge(),
  jpHorizon: horizon(),
  jpAwningRed: awning('jpAwningRed', 2),
  jpAwningBlue: awning('jpAwningBlue', 6),
  jpAwningYellow: awning('jpAwningYellow', 7),
  jpFishCrate: fishCrate(),
  jpGulls: gulls(),
  jpSun: sun(),
  jpCloud: cloud(),
  jpTorii: torii(),
  jpPagoda: pagoda(),
  jpBamboo3: bamboo(),
  jpHedge: hedge(),
  jpBanner: banner(),
  jpPineBig: pineBig(),
} as const satisfies Record<string, NewDecor>;
