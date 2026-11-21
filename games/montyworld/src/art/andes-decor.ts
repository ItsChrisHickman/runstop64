/**
 * The Andes' and the Amazon's decorations for Monty Mole: World Tour (region 6), in Monty on the Run's decoration format and the
 * earlier regions' manner: solid ink with the detail cut into it as black lines. The mountains and clouds of the parachute drop, the
 * updraft, Machu Picchu's gate, hut, stone and Huayna Picchu, the village market's stall, textiles, pots and pen, the waterfall, the
 * cloud forest's tree, ferns and vines, the tunnel's torch and idol, and the riverboat's funnel, pilot house, paddle wheel and cargo.
 */
import { decor } from './decorations';
import { Raster } from './raster';
import type { NewDecor } from './types';

/** A range of snow peaks: three jagged summits, the snow white above the grey and the dark foot. 8 x 3 characters. */
function mountainRange(): NewDecor {
  const r = new Raster(64, 24);
  for (const [cx, top, half] of [[14, 2, 14], [34, 0, 17], [53, 5, 13]] as const) r.triangle(cx, top, cx - half, 24, cx + half, 24);
  r.rect(0, 22, 63, 23);
  for (const [x0, x1, y] of [[10, 18, 9], [28, 40, 8], [48, 58, 13]] as const) r.rect(x0, y, x1, y, false); // the snowline
  for (let y = 12; y < 22; y += 4) for (let x = (y % 8) + 6; x < 60; x += 11) r.rect(x, y, x + 2, y, false); // crags
  return decor('mountainRange', 8, 3, r, ['11111111', 'CCCCCCCC', 'BBBBBBBB']);
}

/** One big peak: a snow cap on a grey face with the ridges cut in. 5 x 4 characters. */
function peak(): NewDecor {
  const r = new Raster(40, 32);
  r.triangle(20, 0, 0, 32, 40, 32);
  r.line(20, 3, 12, 20, false); r.line(20, 6, 28, 22, false); r.line(14, 12, 8, 28, false); r.line(25, 16, 33, 30, false);
  r.rect(10, 14, 30, 14, false); // the snowline
  return decor('peak', 5, 4, r, ['11111', '1CCC1', 'CCCCC', 'BBBBB']);
}

/** A puffy cloud: a bank of round heads on a flat foot. 4 x 2 characters. */
function cloud(): NewDecor {
  const r = new Raster(32, 16);
  r.ellipse(8, 10, 8, 5); r.ellipse(17, 7, 8, 6); r.ellipse(25, 10, 7, 5); r.rect(2, 10, 30, 14);
  r.rect(0, 13, 31, 15, false);
  r.rect(6, 6, 8, 6, false); r.rect(15, 3, 18, 3, false); // light gaps
  return decor('cloud', 4, 2, r, 1);
}

/** A great cloud bank. 6 x 2 characters. */
function cloudBig(): NewDecor {
  const r = new Raster(48, 16);
  r.ellipse(9, 10, 9, 5); r.ellipse(22, 7, 10, 7); r.ellipse(36, 8, 9, 6); r.ellipse(43, 11, 5, 4); r.rect(3, 10, 46, 14);
  r.rect(0, 13, 47, 15, false);
  r.rect(7, 6, 10, 6, false); r.rect(20, 2, 24, 2, false); r.rect(34, 4, 37, 4, false);
  return decor('cloudBig', 6, 2, r, 15);
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

/** The Inca doorway: a trapezoid gate of fitted blocks, its lintel a single stone. 4 x 4 characters. */
function incaGate(): NewDecor {
  const r = new Raster(32, 32);
  r.rect(0, 0, 31, 31);
  r.triangle(8, 8, 24, 8, 26, 31); r.triangle(8, 8, 6, 31, 26, 31); r.rect(8, 8, 24, 31, false);
  for (let y = 0; y < 32; y += 8) r.rect(0, y + 7, 7, y + 7, false), r.rect(24, y + 7, 31, y + 7, false);
  r.rect(4, 0, 4, 6, false); r.rect(14, 0, 14, 6, false); r.rect(26, 0, 26, 6, false); r.rect(0, 7, 31, 7, false);
  r.rect(0, 28, 7, 31, false);
  return decor('incaGate', 4, 4, r, 12);
}

/** A stone hut with a thatched roof: the wall of fitted stones, a low door, a window, the straw in rows. 5 x 4 characters. */
function stoneHut(): NewDecor {
  const r = new Raster(40, 32);
  r.triangle(20, 0, 0, 14, 40, 14);
  for (let y = 5; y < 14; y += 3) r.rect(0, y, 39, y, false);
  r.rect(4, 14, 35, 31);
  for (let y = 18; y < 32; y += 5) r.rect(4, y, 35, y, false);
  for (const x of [11, 22, 29]) r.rect(x, 14, x, 31, false);
  r.rect(16, 21, 23, 31, false);
  r.rect(6, 17, 8, 19, false);
  return decor('stoneHut', 5, 4, r, ['77777', '77777', 'CCCCC', 'CCCCC']);
}

/** A market stall: a striped awning over a counter heaped with fruit, two posts. 5 x 4 characters. */
function marketStall(): NewDecor {
  const r = new Raster(40, 32);
  r.rect(0, 0, 39, 7);
  for (let x = 3; x < 40; x += 8) r.triangle(x - 3, 8, x + 3, 8, x, 12); // the scalloped edge
  for (let x = 4; x < 40; x += 8) r.rect(x, 0, x, 7, false);
  r.rect(2, 8, 3, 31); r.rect(36, 8, 37, 31); // the posts
  r.rect(0, 22, 39, 25); r.rect(4, 26, 35, 26, false); r.rect(4, 27, 35, 31);
  for (const x of [7, 15, 23, 31]) r.ellipse(x, 19, 3, 3); // fruit on the counter
  for (const x of [7, 15, 23, 31]) r.set(x + 1, 18, false);
  return decor('marketStall', 5, 4, r, ['22222', '22222', '77777', '99999']);
}

/** A woven cloth hung up: bands of colour with a pattern cut in, fringed. 2 x 3 characters. */
function textile(): NewDecor {
  const r = new Raster(16, 24);
  r.rect(1, 0, 14, 20);
  for (let y = 3; y < 20; y += 5) r.rect(1, y, 14, y, false);
  for (let y = 1; y < 20; y += 5) for (let x = 3; x < 14; x += 4) r.cut(['#.#', '.#.'], x - 1, y);
  for (let x = 2; x < 15; x += 3) r.rect(x, 21, x, 23);
  return decor('textile', 2, 3, r, ['27', '52', '72']);
}

/** A stack of clay pots: three on the floor, one on top. 2 x 2 characters. */
function pots(): NewDecor {
  const r = new Raster(16, 16);
  for (const [cx, cy, rx] of [[4, 12, 4], [12, 12, 4], [8, 5, 3.5]] as const) { r.ellipse(cx, cy, rx, 3.5); r.rect(cx - 2, cy - 5, cx + 1, cy - 4); r.rect(cx - 1, cy - 4, cx, cy - 4, false); }
  r.rect(0, 15, 15, 15);
  r.rect(2, 12, 6, 12, false); r.rect(10, 12, 14, 12, false);
  return decor('pots', 2, 2, r, 8);
}

/** A pen of sticks for the guinea pigs: posts and two rails. 3 x 2 characters. */
function cuyPen(): NewDecor {
  const r = new Raster(24, 16);
  for (let x = 1; x < 24; x += 5) r.rect(x, 2, x + 1, 15);
  r.rect(0, 5, 23, 6); r.rect(0, 11, 23, 12);
  return decor('cuyPen', 3, 2, r, 9);
}

/** Huayna Picchu: the steep green spire behind Machu Picchu, its terraces in bands and a path winding up. 6 x 6 characters. */
function huaynaPicchu(): NewDecor {
  const r = new Raster(48, 48);
  r.triangle(24, 0, 0, 48, 48, 48);
  r.rect(0, 40, 47, 47);
  for (let y = 10; y < 44; y += 6) { r.rect(0, y, 47, y, false); }
  for (let y = 12; y < 44; y += 6) for (let x = 16 + (y % 12); x < 36; x += 9) r.rect(x, y, x + 2, y + 1, false);
  r.line(26, 3, 26, 9, false); // the path up
  return decor('huaynaPicchu', 6, 6, r, ['555555', '555555', 'DDDDDD', 'DDDDDD', '555555', '999999']);
}

/** The Intihuatana, the hitching post of the sun: a carved pillar rising from a stepped block. 2 x 2 characters. */
function intihuatana(): NewDecor {
  const r = new Raster(16, 16);
  r.rect(0, 11, 15, 15); r.rect(2, 8, 13, 10);
  r.rect(7, 1, 9, 7); r.rect(5, 0, 6, 1); // the pillar and its angled face
  r.rect(0, 13, 15, 13, false); r.rect(2, 10, 13, 10, false);
  return decor('intihuatana', 2, 2, r, 15);
}

/** A waterfall falling from a ledge in streaks, ending in foam. 2 x 6 characters. */
function waterfall(): NewDecor {
  const r = new Raster(16, 48);
  r.rect(0, 0, 15, 3);
  for (let y = 4; y < 42; y++) for (const x of [2, 6, 10, 13]) if ((y + x) % 7 < 5) r.set(x, y), r.set(x + 1, y);
  for (let x = 0; x < 16; x += 2) r.rect(x, 43 + (x % 4), x + 1, 47);
  return decor('waterfall', 2, 6, r, 3);
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

/** A palm of the river bank: a leaning trunk and a crown of drooping fronds. 3 x 5 characters. */
function palm(): NewDecor {
  const r = new Raster(24, 40);
  for (let y = 12; y < 40; y++) r.rect(10 + Math.round((39 - y) / 12), y, 12 + Math.round((39 - y) / 12), y);
  for (let y = 16; y < 40; y += 4) r.rect(9, y, 14, y, false);
  for (const [dx, dy] of [[-11, 6], [-8, 1], [9, 1], [12, 7], [0, -2]] as const) {
    r.line(13, 10, 13 + dx, 10 + dy); r.line(13, 11, 13 + dx, 11 + dy); r.line(13, 12, 13 + dx, 12 + dy);
  }
  return decor('palm', 3, 5, r, ['555', '555', '999', '999', '999']);
}

/** A hut on stilts at the river's edge: a thatched roof, a plank room, a ladder, four legs in the water. 4 x 4 characters. */
function stiltHut(): NewDecor {
  const r = new Raster(32, 32);
  r.triangle(16, 0, 0, 11, 32, 11);
  for (let y = 4; y < 11; y += 3) r.rect(0, y, 31, y, false);
  r.rect(3, 11, 28, 23);
  for (let x = 8; x < 28; x += 6) r.rect(x, 11, x, 23, false);
  r.rect(12, 14, 17, 19, false);
  for (const x of [4, 12, 20, 27]) r.rect(x, 24, x + 1, 31);
  r.rect(2, 24, 29, 25);
  return decor('stiltHut', 4, 4, r, ['7777', '9999', '9999', '9999']);
}

/** The riverboat's funnel: a tall red stack with a black band and a puff of smoke. 2 x 3 characters. */
function funnel(): NewDecor {
  const r = new Raster(16, 24);
  r.rect(3, 6, 12, 23); r.rect(2, 5, 13, 6);
  r.rect(3, 10, 12, 11, false); r.rect(3, 12, 12, 12);
  r.ellipse(8, 3, 4, 2.4); r.ellipse(5, 1, 3, 1.4);
  return decor('funnel', 2, 3, r, ['FF', '22', '22']);
}

/** The pilot house: a white cabin with a row of windows, a wheel seen in one, a roof with its overhang. 5 x 3 characters. */
function pilotHouse(): NewDecor {
  const r = new Raster(40, 24);
  r.rect(0, 0, 39, 3); r.rect(3, 4, 36, 23);
  for (const x of [6, 15, 24] ) r.rect(x, 8, x + 6, 15, false);
  r.rect(30, 8, 33, 15, false);
  for (const x of [6, 15, 24]) r.rect(x + 2, 9, x + 3, 14); // the glints, bars in the panes
  r.ellipse(31.5, 12, 1.8, 2.4); r.rect(31, 10, 32, 14, false); // the wheel
  r.rect(3, 19, 36, 19, false);
  return decor('pilotHouse', 5, 3, r, ['22222', '11111', '11111']);
}

/** The paddle wheel at the stern: a ring of paddles round a hub, half under the water. 4 x 4 characters. */
function paddleWheel(): NewDecor {
  const r = new Raster(32, 32);
  r.ring(15.5, 15.5, 14.5, 2);
  r.disc(15.5, 15.5, 3);
  for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; r.line(15.5, 15.5, 15.5 + Math.cos(a) * 14, 15.5 + Math.sin(a) * 14); r.line(16.5, 15.5, 16.5 + Math.cos(a) * 14, 15.5 + Math.sin(a) * 14); }
  r.rect(14, 14, 17, 17, false); r.rect(15, 15, 16, 16);
  return decor('paddleWheel', 4, 4, r, 7);
}

/** A stack of cargo crates and a sack: slatted boxes. 3 x 2 characters. */
function cargo(): NewDecor {
  const r = new Raster(24, 16);
  r.rect(0, 6, 10, 15); r.rect(11, 0, 22, 15);
  r.rect(1, 7, 9, 14, false); r.rect(0, 10, 10, 10); r.line(1, 7, 9, 14); r.rect(12, 1, 21, 14, false);
  r.line(12, 1, 21, 14); r.line(21, 1, 12, 14); r.rect(11, 0, 22, 0);
  return decor('cargo', 3, 2, r, 9);
}

/** A hammock slung between two hooks, a sleeper's bundle in it. 3 x 1 characters. */
function hammock(): NewDecor {
  const r = new Raster(24, 8);
  r.rect(0, 0, 1, 7); r.rect(22, 0, 23, 7);
  for (let x = 2; x < 22; x++) { const y = 2 + Math.round(3 * Math.sin(((x - 2) / 19) * Math.PI)); r.rect(x, y, x, y + 1); }
  r.rect(8, 3, 15, 4, false);
  return decor('hammock', 3, 1, r, 10);
}

/** A lifebuoy: a red and white ring. 1 x 1 characters. */
function lifebuoy(): NewDecor {
  const r = new Raster(8, 8);
  r.ring(3.5, 3.5, 3.5, 2);
  r.rect(0, 3, 1, 4, false); r.rect(6, 3, 7, 4, false); r.rect(3, 0, 4, 1, false); r.rect(3, 6, 4, 7, false);
  return decor('lifebuoy', 1, 1, r, 2);
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

/** A golden idol in a wall niche: a squat figure with a headdress. 2 x 2 characters. */
function idol(): NewDecor {
  const r = new Raster(16, 16);
  r.rect(0, 0, 15, 15); r.rect(2, 2, 13, 15, false);
  r.rect(4, 3, 11, 4); r.rect(5, 5, 10, 8); r.rect(6, 6, 6, 6, false); r.rect(9, 6, 9, 6, false); r.rect(7, 8, 8, 8, false);
  r.rect(4, 9, 11, 15);
  return decor('idol', 2, 2, r, ['77', '77']);
}

export const ANDES_DECOR = {
  mountainRange: mountainRange(),
  peak: peak(),
  cloud: cloud(),
  cloudBig: cloudBig(),
  updraft: updraft(),
  incaGate: incaGate(),
  stoneHut: stoneHut(),
  marketStall: marketStall(),
  textile: textile(),
  pots: pots(),
  cuyPen: cuyPen(),
  huaynaPicchu: huaynaPicchu(),
  intihuatana: intihuatana(),
  waterfall: waterfall(),
  fern: fern(),
  giantTree: giantTree(),
  hangingVines: hangingVines(),
  bromeliad: bromeliad(),
  palm: palm(),
  stiltHut: stiltHut(),
  funnel: funnel(),
  pilotHouse: pilotHouse(),
  paddleWheel: paddleWheel(),
  cargo: cargo(),
  hammock: hammock(),
  lifebuoy: lifebuoy(),
  signBoard: signBoard(),
  torch: torch(),
  idol: idol(),
} as const satisfies Record<string, NewDecor>;

export type AndesDecor = keyof typeof ANDES_DECOR;
