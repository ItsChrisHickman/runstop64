/**
 * China's decorations for Monty Mole: World Tour (region 3), in Monty on the Run's decoration format and Moscow's and Siberia's manner: solid ink with
 * the detail cut into it as black lines. Bamboo, a wall's flag, the hutong's door and washing, the market's stall, lanterns and banner, the tower's slit,
 * rack and the beacon's brazier, the gate's stone lion, a roof's dragon, and the willow pattern's willow, pagoda, bridge's arches and crouching figures, the
 * junk and the quay's post and boxes.
 */
import { decor } from './decorations';
import { Raster } from './raster';
import type { NewDecor } from './types';

/** A clump of bamboo: stalks with their joints and a tuft of leaves at the top of each. 2 x 4 characters. */
function bambooClump(): NewDecor {
  const r = new Raster(16, 32);
  for (const [x, top] of [[3, 4], [8, 0], [12, 7]] as const) {
    r.rect(x, top + 3, x + 1, 31);
    for (let y = top + 8; y < 31; y += 7) r.rect(x, y, x + 1, y, false); // the joints
    r.triangle(x - 2, top + 5, x + 1, top, x + 1, top + 6); r.triangle(x + 3, top + 5, x, top + 1, x, top + 6); // the leaves
  }
  return decor('bambooClump', 2, 4, r, 13);
}

/** A flag on a pole at the wall's top: a red swallow-tailed pennant with a gold disc. 2 x 3 characters. */
function wallFlag(): NewDecor {
  const r = new Raster(16, 24);
  r.rect(1, 0, 2, 23);
  r.rect(3, 2, 15, 12);
  r.triangle(15, 2, 11, 7, 15, 12, false); // the swallowtail
  r.ellipse(8, 7, 2.2, 2.2, false); r.ellipse(8, 7, 1, 1);
  return decor('wallFlag', 2, 3, r, ['92', '92', '90']);
}

/** A hutong's door: a red double door with studs under a small tiled roof, a lantern at each side. 3 x 3 characters. */
function hutongDoor(): NewDecor {
  const r = new Raster(24, 24);
  r.triangle(0, 7, 12, 0, 23, 7); r.rect(0, 7, 23, 8); r.rect(3, 8, 20, 8, false); // the roof
  r.rect(5, 9, 18, 23); r.rect(11, 9, 12, 23, false); // the doors and their seam
  for (const y of [12, 16, 20]) for (const x of [7, 9, 14, 16]) r.set(x, y, false); // the studs
  for (const x of [1, 20]) { r.rect(x, 12, x + 2, 17); r.rect(x + 1, 13, x + 1, 16, false); r.rect(x + 1, 18, x + 1, 19); } // the lanterns
  return decor('hutongDoor', 3, 3, r, ['777', '222', '222']);
}

/** Washing on a line: a shirt, trousers and a towel hung by pegs from a cord. 4 x 2 characters. */
function laundry(): NewDecor {
  const r = new Raster(32, 16);
  r.rect(0, 1, 31, 1);
  r.rect(3, 2, 9, 8); r.rect(1, 2, 2, 5); r.rect(10, 2, 11, 5); // the shirt, its sleeves
  r.rect(5, 2, 7, 3, false);
  r.rect(14, 2, 19, 10); r.rect(16, 6, 17, 10, false); // the trousers
  r.rect(23, 2, 29, 12); r.rect(23, 5, 29, 5, false); r.rect(23, 8, 29, 8, false); // the towel's stripes
  return decor('laundry', 4, 2, r, ['1111', '1111']);
}

/** A market stall: a striped awning over a counter with steaming baskets and a hanging lantern. 4 x 3 characters. */
function stall(): NewDecor {
  const r = new Raster(32, 24);
  r.rect(0, 0, 31, 6); for (let x = 2; x < 32; x += 6) r.rect(x, 0, x + 2, 6, false); // the awning's stripes
  for (let x = 0; x < 32; x += 4) r.rect(x, 7, x + 1, 8); // the scallops
  r.rect(2, 9, 3, 23); r.rect(28, 9, 29, 23); // the posts
  r.rect(0, 16, 31, 18); r.rect(0, 19, 31, 19, false); r.rect(4, 20, 27, 23); r.rect(6, 21, 25, 23, false); // the counter
  for (const x of [6, 14, 22]) { r.rect(x, 12, x + 5, 15); r.rect(x + 1, 13, x + 4, 13, false); r.rect(x + 2, 9, x + 2, 11, false); r.set(x + 3, 10); } // baskets and steam
  return decor('stall', 4, 3, r, ['2222', '2222', '9999'].slice(0, 3));
}

/** A string of red paper lanterns along a cord. 4 x 2 characters. */
function lanternString(): NewDecor {
  const r = new Raster(32, 16);
  r.rect(0, 0, 31, 0);
  for (const x of [2, 12, 22]) { r.rect(x + 2, 1, x + 3, 2); r.rect(x, 3, x + 6, 12); r.rect(x + 1, 13, x + 5, 13); r.rect(x + 3, 14, x + 3, 15); r.rect(x + 1, 6, x + 1, 10, false); r.rect(x + 5, 6, x + 5, 10, false); }
  return decor('lanternString', 4, 2, r, ['2222', '2222']);
}

/** A hanging banner: a red cloth on a rod, gold writing down it, a tassel. 1 x 3 characters. */
function banner(): NewDecor {
  const r = new Raster(8, 24);
  r.rect(0, 0, 7, 1); r.rect(1, 2, 6, 19);
  for (const y of [4, 8, 12, 16]) { r.rect(2, y, 5, y, false); r.rect(3, y + 1, 3, y + 2, false); } // the writing
  r.triangle(1, 19, 6, 19, 3.5, 22, false); r.rect(3, 20, 4, 23);
  return decor('banner', 1, 3, r, ['7', '2', '2']);
}

/** An arrow slit in a watchtower's wall: the stone frame round a dark slit. 1 x 2 characters. */
function arrowSlit(): NewDecor {
  const r = new Raster(8, 16);
  r.rect(1, 0, 6, 15);
  r.rect(3, 2, 4, 13, false); r.rect(2, 6, 5, 8, false);
  return decor('arrowSlit', 1, 2, r, 15);
}

/** A weapons rack: spears and a halberd standing in a frame, a pennon on one. 3 x 2 characters. */
function rack(): NewDecor {
  const r = new Raster(24, 16);
  r.rect(0, 12, 23, 15); r.rect(1, 13, 22, 13, false); // the stand
  for (const [x, top] of [[3, 2], [8, 0], [14, 3], [19, 1]] as const) { r.rect(x, top + 3, x, 12); r.triangle(x - 1, top + 3, x + 1, top + 3, x, top); }
  r.rect(9, 3, 12, 5); r.triangle(12, 3, 12, 5, 14, 4, false); // a pennon
  return decor('rack', 3, 2, r, 12);
}

/** The beacon's brazier: a bronze bowl on three legs, a tall flame. 2 x 2 characters. */
function brazier(): NewDecor {
  const r = new Raster(16, 16);
  r.triangle(8, 0, 3, 9, 13, 9); r.triangle(8, 4, 6, 9, 10, 9, false); r.triangle(8, 6, 7, 9, 9, 9); // the flame, a core in it
  r.rect(1, 9, 14, 11); r.rect(2, 12, 13, 12); r.rect(3, 9, 12, 9, false);
  r.rect(3, 13, 4, 15); r.rect(11, 13, 12, 15); r.rect(7, 13, 8, 15);
  return decor('brazier', 2, 2, r, ['77', '99']);
}

/** A stone guardian lion on its pedestal: a curled mane, a ball under a paw, the pedestal carved. 2 x 2 characters. */
function lionStatue(): NewDecor {
  const r = new Raster(16, 16);
  r.disc(8, 4.5, 4.2); // the head
  for (let i = 0; i < 8; i++) { const t = (i / 8) * Math.PI * 2; r.disc(8 + Math.cos(t) * 5, 4.5 + Math.sin(t) * 3.4, 1.2); } // the mane's curls
  r.rect(4, 8, 11, 10); r.rect(3, 10, 12, 10);
  r.cut(['#.#'], 6, 3); r.cut(['#'], 8, 5); r.cut(['###'], 6, 6); // the eyes, nose, mouth
  r.rect(0, 11, 15, 15); r.rect(1, 12, 14, 12, false); r.rect(3, 14, 12, 14, false); // the pedestal
  r.ellipse(12, 9, 1.6, 1.6); r.set(12, 9, false); // the ball
  return decor('lionStatue', 2, 2, r, 15);
}

/** A dragon on the roof's ridge end: a curl of tiles rising, a head with a mouth open and a fin down its back. 2 x 2 characters. */
function roofDragon(): NewDecor {
  const r = new Raster(16, 16);
  r.ellipse(6, 10, 5.5, 4.5, true); r.ellipse(6, 10, 3, 2.5, false); // the curl
  r.rect(0, 13, 15, 15);
  r.rect(9, 3, 15, 8); r.rect(11, 5, 13, 5, false); r.rect(10, 7, 15, 7, false); r.rect(13, 4, 13, 4, false); // the head, mouth and eye
  r.triangle(2, 6, 4, 0, 6, 5); r.triangle(6, 5, 8, 0, 9, 4); // the fin
  return decor('roofDragon', 2, 2, r, 7);
}

/** The willow: a thick curved trunk, a great crown, long fronds hanging in strands to the ground. 4 x 6 characters. */
function willowTree(): NewDecor {
  const r = new Raster(32, 48);
  r.rect(14, 18, 17, 47); r.rect(12, 12, 19, 18); r.rect(15, 20, 15, 46, false); r.rect(6, 10, 25, 12); // the trunk and its boughs
  r.ellipse(16, 8, 14, 8); // the crown
  for (let x = 3; x < 30; x += 4) { r.rect(x, 12, x, 36 + ((x * 7) % 9)); r.rect(x + 2, 13, x + 2, 28 + ((x * 5) % 11)); } // the hanging fronds
  r.rect(8, 6, 24, 6, false); r.rect(5, 10, 27, 10, false);
  return decor('willowTree', 4, 6, r, 14);
}

/** A pagoda: five tiers, each a square body under a swept roof, a spire. 4 x 8 characters. */
function pagoda(): NewDecor {
  const r = new Raster(32, 64);
  r.rect(15, 0, 16, 7);
  for (let k = 0; k < 5; k++) {
    const y = 8 + k * 11, w = 5 + k * 2;
    r.triangle(16 - w - 3, y + 5, 16, y, 16 + w + 3, y + 5); r.rect(16 - w - 4, y + 5, 16 + w + 3, y + 6); // the roof, upturned at its ends
    r.rect(16 - w, y + 7, 16 + w - 1, y + 10); r.rect(16 - w + 2, y + 8, 16 + w - 3, y + 10, false); r.rect(16 - 1, y + 8, 16, y + 10); // the body and its door
  }
  return decor('pagoda', 4, 8, r, 1);
}

/** The bridge's arches under its deck: three round arches in a heavy wall. 8 x 2 characters. */
function archBridge(): NewDecor {
  const r = new Raster(64, 16);
  r.rect(0, 0, 63, 4);
  r.rect(0, 5, 63, 15);
  for (const cx of [11, 32, 53]) { r.ellipse(cx, 15, 8, 9, false); }
  r.rect(0, 5, 63, 5, false);
  r.rect(0, 0, 63, 0, false);
  return decor('archBridge', 8, 2, r, 14);
}

/** A crouching figure on the bridge: a round head in a hat, long sleeves hanging forward, knees drawn up. 2 x 2 characters. */
function crouchFigure(): NewDecor {
  const r = new Raster(16, 16);
  r.triangle(8, 0, 3, 5, 13, 5); // the pointed hat
  r.disc(8, 7, 3); // the head
  r.cut(['#.#'], 6, 6); r.cut(['##'], 7, 9);
  r.rect(2, 10, 13, 15); r.rect(3, 12, 12, 12, false); // the robed back, the knees
  r.rect(0, 10, 2, 15); // a sleeve hanging down
  return decor('crouchFigure', 2, 2, r, 1);
}

/** A junk: a high stern, a battened hull, a mast with its fully battened sail furled in panels. 6 x 6 characters. */
function junk(): NewDecor {
  const r = new Raster(48, 48);
  r.rect(23, 0, 24, 38); // the mast
  r.rect(8, 3, 22, 30); for (let y = 8; y <= 28; y += 6) r.rect(8, y, 22, y, false); // the sail's battens
  r.rect(1, 4, 6, 31, false);
  r.rect(30, 8, 40, 22); r.rect(30, 14, 40, 14, false); // the little sail aft
  r.rect(0, 36, 47, 42); r.rect(0, 40, 47, 40, false); // the hull
  r.triangle(0, 36, 0, 30, 8, 36); r.triangle(47, 36, 47, 28, 38, 36); // the sweep of the bow and the stern
  r.rect(0, 43, 47, 47); for (let x = 2; x < 47; x += 6) r.rect(x, 43, x + 2, 43, false); // the waterline
  return decor('junk', 6, 6, r, ['222222', '222222', '777777', '999999', '999999', '999999'].map((row) => row));
}

/** A lantern on a post: a pole with a hanging red lantern. 1 x 3 characters. */
function lanternPost(): NewDecor {
  const r = new Raster(8, 24);
  r.rect(3, 0, 4, 23); r.rect(0, 2, 7, 2);
  r.rect(1, 3, 6, 9); r.rect(2, 5, 5, 7, false);
  return decor('lanternPost', 1, 3, r, ['2', '2', '9']);
}

/** Boxes of goods stacked at the quay: two crates and a sack. 2 x 2 characters. */
function boxes(): NewDecor {
  const r = new Raster(16, 16);
  r.rect(0, 8, 9, 15); r.rect(2, 10, 7, 13, false); r.rect(0, 8, 9, 8);
  r.rect(7, 1, 15, 8); r.rect(9, 3, 13, 6, false);
  r.ellipse(12, 12, 3.4, 3.2); r.rect(10, 9, 14, 9, false);
  return decor('boxes', 2, 2, r, 8);
}

/** A paper lantern hanging on its cord from the ceiling. 1 x 2 characters. */
function hangingLantern(): NewDecor {
  const r = new Raster(8, 16);
  r.rect(3, 0, 4, 2); r.rect(1, 3, 6, 11); r.rect(2, 5, 2, 9, false); r.rect(5, 5, 5, 9, false); r.rect(2, 12, 5, 12); r.rect(3, 13, 4, 15);
  return decor('hangingLantern', 1, 2, r, ['2', '7']);
}

/** A lattice window: a red frame round a pane of diagonal bars. 2 x 2 characters. */
function latticeWindow(): NewDecor {
  const r = new Raster(16, 16);
  r.rect(0, 0, 15, 15); r.rect(2, 2, 13, 13, false);
  for (let i = -12; i < 12; i += 4) { r.line(2 + i, 13, 13 + i, 2); r.line(2 - i, 13, 13 - i, 2); } // the bars, crossing
  r.rect(2, 2, 13, 2, false); r.rect(2, 13, 13, 13, false);
  return decor('latticeWindow', 2, 2, r, 2);
}

/** A potted tree: a round pot, a trunk, a ball of leaves. 2 x 2 characters. */
function pottedPlant(): NewDecor {
  const r = new Raster(16, 16);
  r.disc(8, 4.5, 4.2); r.rect(4, 3, 5, 3, false); r.rect(9, 6, 11, 6, false); // the leaves, gaps in them
  r.rect(7, 8, 8, 10); // the trunk
  r.rect(3, 11, 12, 15); r.rect(4, 12, 11, 12, false); r.rect(5, 15, 10, 15, false); // the pot
  return decor('pottedPlant', 2, 2, r, ['55', '22']);
}

/** A scholar's rock: a pitted grey boulder on a stand, holes through it. 3 x 2 characters. */
function rockery(): NewDecor {
  const r = new Raster(24, 16);
  r.ellipse(12, 6.5, 9, 6.2); r.rect(3, 13, 20, 15); r.rect(5, 12, 18, 12);
  r.ellipse(8, 5.5, 1.5, 2.4, false); r.ellipse(15.5, 8.5, 1.8, 1.3, false); r.rect(12, 2, 13, 4, false); r.line(5, 10, 9, 8, false); r.rect(11, 9, 12, 11, false);
  return decor('rockery', 3, 2, r, 15);
}

/** A big red drum on its stand, studs round its rims. 2 x 2 characters. */
function drum(): NewDecor {
  const r = new Raster(16, 16);
  r.ellipse(8, 7, 7.2, 6.4); r.rect(1, 7, 14, 10);
  r.ellipse(8, 5, 5, 2.4, false); r.rect(1, 11, 14, 11, false);
  for (const x of [2, 5, 8, 11, 13]) r.set(x, 9, false);
  r.rect(3, 12, 4, 15); r.rect(11, 12, 12, 15);
  return decor('drum', 2, 2, r, ['22', '99']);
}

/** A bronze gong hung in its frame, a mallet beside it. 3 x 3 characters. */
function gong(): NewDecor {
  const r = new Raster(24, 24);
  r.rect(0, 0, 23, 2); r.rect(1, 3, 2, 23); r.rect(21, 3, 22, 23); // the frame
  r.line(11, 3, 11, 6);
  r.disc(11.5, 13, 7.2); r.ellipse(11.5, 13, 4.4, 4.4, false); r.ellipse(11.5, 13, 1.8, 1.8); // the gong, its boss
  r.rect(0, 22, 23, 23);
  return decor('gong', 3, 3, r, ['999', '777', '999']);
}

/** A frieze of curling clouds along a wall's top. 4 x 1 characters. */
function cloudFrieze(): NewDecor {
  const r = new Raster(32, 8);
  for (let x = 0; x < 32; x += 8) { r.ellipse(x + 3.5, 4, 3.2, 3); r.ellipse(x + 3.5, 4, 1.4, 1.2, false); r.rect(x + 6, 5, x + 7, 6); }
  return decor('cloudFrieze', 4, 1, r, 7);
}

export const CHINA_DECOR = {
  bambooClump: bambooClump(),
  wallFlag: wallFlag(),
  hutongDoor: hutongDoor(),
  laundry: laundry(),
  stall: stall(),
  lanternString: lanternString(),
  banner: banner(),
  arrowSlit: arrowSlit(),
  rack: rack(),
  brazier: brazier(),
  lionStatue: lionStatue(),
  roofDragon: roofDragon(),
  willowTree: willowTree(),
  pagoda: pagoda(),
  archBridge: archBridge(),
  crouchFigure: crouchFigure(),
  junk: junk(),
  lanternPost: lanternPost(),
  boxes: boxes(),
  hangingLantern: hangingLantern(),
  latticeWindow: latticeWindow(),
  pottedPlant: pottedPlant(),
  rockery: rockery(),
  drum: drum(),
  gong: gong(),
  cloudFrieze: cloudFrieze(),
} as const satisfies Record<string, NewDecor>;

export type ChinaDecor = keyof typeof CHINA_DECOR;
