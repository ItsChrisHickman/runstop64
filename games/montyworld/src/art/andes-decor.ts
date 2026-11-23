/**
 * The Andes' and the Amazon's decorations, in Monty on the Run's decoration format and the earlier regions' manner: solid ink with the detail cut into it as black lines. Few, since the rebuild draws its
 * rooms on black (docs/dosvidaniya-reset.md): the drop's grey clouds and updrafts, the Intihuatana and the tunnel's torches, the launch to Rio; and the forest pieces and clouds Rio's rooms use.
 */
import { decor } from './decorations';
import { Raster } from './raster';
import type { NewDecor } from './types';

/** A puffy cloud: a bank of round heads on a flat foot. 4 x 2 characters. */
function cloud(colour = 1, name = 'cloud'): NewDecor {
  const r = new Raster(32, 16);
  r.ellipse(8, 10, 8, 5); r.ellipse(17, 7, 8, 6); r.ellipse(25, 10, 7, 5); r.rect(2, 10, 30, 14);
  r.rect(0, 13, 31, 15, false);
  r.rect(6, 6, 8, 6, false); r.rect(15, 3, 18, 3, false); // light gaps
  return decor(name, 4, 2, r, colour);
}

/** A great cloud bank. 6 x 2 characters. */
function cloudBig(): NewDecor {
  const r = new Raster(48, 16);
  r.ellipse(9, 10, 9, 5); r.ellipse(22, 7, 10, 7); r.ellipse(36, 8, 9, 6); r.ellipse(43, 11, 5, 4); r.rect(3, 10, 46, 14);
  r.rect(0, 13, 47, 15, false);
  r.rect(7, 6, 10, 6, false); r.rect(20, 2, 24, 2, false); r.rect(34, 4, 37, 4, false);
  return decor('cloudBig', 6, 2, r, 1);
}

/** An updraft: three S-shaped wisps of air rising in a column, each a stroke of cloud. 3 x 4 characters. */
function updraft(): NewDecor {
  const r = new Raster(24, 32);
  for (const [x0, y0] of [[4, 28], [12, 18], [6, 8]] as const) {
    for (let i = 0; i < 10; i++) { const x = x0 + Math.round(Math.sin(i / 2) * 3), y = y0 - i; r.set(x, y); r.set(x + 1, y); r.set(x + 8 - (y0 % 3), y - 6); r.set(x + 9 - (y0 % 3), y - 6); }
  }
  r.rect(0, 0, 23, 0, false);
  return decor('updraft', 3, 4, r, 3);
}

/** The Intihuatana, the hitching post of the sun: a carved pillar rising from a stepped block. 2 x 2 characters. */
function intihuatana(): NewDecor {
  const r = new Raster(16, 16);
  r.rect(0, 11, 15, 15); r.rect(2, 8, 13, 10);
  r.rect(7, 1, 9, 7); r.rect(5, 0, 6, 1); // the pillar and its angled face
  r.rect(0, 13, 15, 13, false); r.rect(2, 10, 13, 10, false);
  return decor('intihuatana', 2, 2, r, 8);
}

/** A fern: a rosette of long fronds arching out. 3 x 3 characters. */
function fern(): NewDecor {
  const r = new Raster(24, 24);
  for (const [dx, dy] of [[-10, -8], [-6, -14], [0, -16], [6, -14], [10, -8], [-12, -2], [12, -2]] as const) {
    r.line(12, 23, 12 + dx, 23 + dy); r.line(13, 23, 13 + dx, 23 + dy);
    for (let t = 0.35; t < 1; t += 0.2) r.set(12 + dx * t - 1, 23 + dy * t + 1), r.set(12 + dx * t + 2, 23 + dy * t + 1);
  }
  return decor('fern', 3, 3, r, 13);
}

/** A giant tree of the cloud forest: a trunk with buttress roots under a heavy crown, moss and epiphytes. 4 x 6 characters. */
function giantTree(): NewDecor {
  const r = new Raster(32, 48);
  r.ellipse(16, 10, 16, 10);
  for (const x of [6, 16, 25]) r.set(x, 6, false), r.set(x + 1, 6, false);
  for (let x = 4; x < 30; x += 6) r.rect(x, 12, x + 2, 13, false);
  r.rect(11, 18, 20, 47);
  r.triangle(11, 36, 2, 47, 11, 47); r.triangle(20, 36, 29, 47, 20, 47); // the buttresses
  for (const y of [22, 30, 38]) r.rect(13, y, 13, y + 3, false), r.rect(18, y - 2, 18, y + 1, false);
  return decor('giantTree', 4, 6, r, ['5555', '5555', '9999', '9999', '9999', '9999']);
}

/** Vines hanging from the canopy: three strands with leaves. 2 x 4 characters. */
function hangingVines(): NewDecor {
  const r = new Raster(16, 32);
  for (const x of [2, 7, 12]) { r.rect(x, 0, x + 1, 31); for (let y = 4; y < 30; y += 7) { r.rect(x - 2, y, x - 1, y + 1); r.rect(x + 2, y + 3, x + 3, y + 4); } }
  r.rect(0, 0, 15, 0, false);
  return decor('hangingVines', 2, 4, r, 5);
}

/** A bromeliad: a spiky red rosette on a bough. 2 x 1 characters. */
function bromeliad(): NewDecor {
  const r = new Raster(16, 8);
  r.triangle(8, 0, 4, 7, 12, 7); r.triangle(3, 2, 0, 7, 7, 7); r.triangle(13, 2, 9, 7, 15, 7);
  r.rect(0, 7, 15, 7);
  r.rect(7, 3, 8, 6, false);
  return decor('bromeliad', 2, 1, r, 10);
}

/** A wooden signboard on a post: bars of lettering. 3 x 2 characters. */
function signBoard(): NewDecor {
  const r = new Raster(24, 16);
  r.rect(0, 0, 23, 9); r.rect(11, 10, 12, 15);
  r.rect(2, 2, 21, 7, false);
  r.rect(4, 3, 19, 3); r.rect(4, 5, 14, 5);
  return decor('signBoard', 3, 2, r, 9);
}

/** A torch in a wall bracket: a flame on a stick. 1 x 2 characters. */
function torch(): NewDecor {
  const r = new Raster(8, 16);
  r.triangle(4, 0, 1, 6, 7, 6); r.ellipse(4, 5, 3, 2);
  r.rect(3, 5, 4, 5, false);
  r.rect(3, 7, 4, 15); r.rect(1, 12, 6, 13);
  return decor('torch', 1, 2, r, ['8', '9']);
}

/** The launch that takes passengers down to the sea: a short hull, a cabin, a tall funnel and a pennant. 6 x 3 characters. */
function launch(): NewDecor {
  const r = new Raster(48, 24);
  r.rect(0, 14, 47, 17); r.triangle(0, 14, 0, 17, 6, 20); r.rect(6, 18, 40, 20); r.triangle(47, 14, 47, 17, 42, 20); // the hull
  r.rect(0, 15, 47, 15, false); for (let x = 5; x < 44; x += 8) r.rect(x, 17, x + 2, 17, false);
  r.rect(10, 6, 30, 13); r.rect(12, 8, 15, 11, false); r.rect(19, 8, 22, 11, false); r.rect(26, 8, 28, 11, false); // the cabin and windows
  r.rect(34, 2, 38, 13); r.rect(33, 0, 39, 1); r.rect(34, 6, 38, 6, false); // the funnel
  r.rect(2, 4, 2, 13); r.rect(3, 4, 8, 6); // the mast and the pennant
  return decor('launch', 6, 3, r, ['222222', '777777', '999999']);
}

export const ANDES_DECOR = {
  skyCloud: cloud(),
  /** The Andes' cloud: the same puffy shape in dark grey, so a sky stays calm and nothing white sits behind him. */
  mistCloud: cloud(11, 'mistCloud'),
  skyCloudBig: cloudBig(),
  updraft: updraft(),
  intihuatana: intihuatana(),
  fern: fern(),
  giantTree: giantTree(),
  hangingVines: hangingVines(),
  bromeliad: bromeliad(),
  signBoard: signBoard(),
  torch: torch(),
  launch: launch(),
} as const satisfies Record<string, NewDecor>;

export type AndesDecor = keyof typeof ANDES_DECOR;
