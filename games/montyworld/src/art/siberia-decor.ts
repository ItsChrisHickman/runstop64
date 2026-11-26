/**
 * Siberia's decorations for Monty Mole: World Tour (region 2), in Monty on the Run's decoration format and Moscow's manner
 * (decorations.ts): solid ink with the detail cut into it as black lines. Pines, the dining car's table and window, the sleeper's
 * bunk, the mine's coal bucket and cart, the telegraph pole, a log cabin, the border's raised boom.
 */
import { decor } from './decorations';
import { characters } from './pixels';
import { Raster } from './raster';
import { SIBERIA_SKY } from './siberia-sky';
import type { NewDecor } from './types';

/** A pine: tiers of boughs, each tier a triangle with a ragged edge and a black line under it, a trunk. `w` characters across. */
function pine(w: number, h: number, tiers: number, name: string): NewDecor {
  const r = new Raster(w * 8, h * 8);
  const cx = w * 4, trunk = 3;
  const room = h * 8 - trunk - 1;
  for (let k = 0; k < tiers; k++) {
    const top = Math.round((k * room) / (tiers + 0.6)), bottom = Math.round(((k + 1.6) * room) / (tiers + 0.6));
    const half = (w * 4 - 1) * (0.45 + (0.55 * (k + 1)) / tiers);
    for (let y = top; y <= bottom; y++) {
      const t = (y - top) / Math.max(1, bottom - top);
      const x = Math.max(1, 1 + half * t);
      for (let i = -Math.floor(x); i < Math.floor(x); i++) r.set(cx + i, y);
    }
    r.rect(cx - Math.floor(half) + 1, bottom, cx + Math.floor(half) - 2, bottom, false); // the dark under each tier
    for (let i = -Math.floor(half) + 2; i < half - 2; i += 3) r.set(cx + i, bottom - 1, false); // the fringe
  }
  r.rect(cx - 1, h * 8 - trunk, cx, h * 8 - 1);
  const rows = Array.from({ length: h }, (_, j) => (j === h - 1 ? '9'.repeat(w) : '5'.repeat(w)));
  rows[h - 1] = '5'.repeat(Math.floor((w - 1) / 2)) + '9' + '5'.repeat(Math.ceil((w - 1) / 2));
  return decor(name, w, h, r, rows);
}

/** The dining car's table: a white cloth to the floor's edge, two glasses in their holders, a loaf. 3 x 2 characters. */
function diningTable(): NewDecor {
  const r = new Raster(24, 16);
  r.rect(0, 5, 23, 7); // the cloth's top
  r.rect(1, 8, 22, 12); // its hang
  for (let x = 3; x < 22; x += 4) r.rect(x, 9, x, 12, false); // the folds
  r.rect(2, 13, 3, 15); r.rect(20, 13, 21, 15); // the legs
  for (const x of [4, 9]) { r.rect(x, 1, x + 2, 4); r.rect(x + 1, 2, x + 1, 3, false); r.rect(x - 1, 4, x + 3, 4); } // glasses in holders
  r.ellipse(18, 3.5, 3.3, 1.9); // the loaf
  r.rect(16, 3, 20, 3, false);
  return decor('diningTable', 3, 2, r, ['777', '111']);
}

/**
 * What goes by a carriage window: a strip of landscape 24 pixels wide and 16 tall that joins up with itself at the edges (a tall pine, a
 * telegraph pole with its cross-arm, a small pine, the snow along the foot), so the train's window can slide it past for ever (`charAnims`).
 */
function scenery(): Raster {
  const r = new Raster(24, 16);
  r.triangle(6, 0, 1, 8, 11, 8); r.triangle(6, 3, 0, 12, 12, 12); // the tall pine: two tiers
  r.rect(1, 8, 11, 8, false); r.rect(0, 12, 12, 12, false); // the dark under each tier
  r.rect(5, 13, 6, 15);
  r.rect(15, 2, 15, 15); r.rect(12, 4, 18, 4); r.rect(12, 3, 12, 3); r.rect(18, 3, 18, 3); r.rect(13, 7, 17, 7); // the pole, its arm and its wires' glass
  r.triangle(20, 6, 17, 12, 23, 12); r.rect(19, 13, 20, 15); // the small pine
  r.rect(17, 12, 23, 12, false);
  r.rect(0, 15, 23, 15); // the snow along the foot
  return r;
}

/**
 * A carriage window, 5 x 4 characters: a lintel, a curtain at each side, the landscape in the middle (the 3 x 2 characters of `scenery`: the
 * game slides them past, the same in every window of a room), the sill. Its characters are the room's own: row 1 and 2, columns 1-3 are the
 * moving ones (`WINDOW_SCENERY`).
 */
function trainWindow(): NewDecor {
  const r = new Raster(40, 32);
  r.rect(0, 0, 39, 2); // the lintel
  r.rect(0, 3, 5, 25); r.rect(34, 3, 39, 25); // the curtains
  r.rect(2, 5, 2, 25, false); r.rect(37, 5, 37, 25, false); // their folds
  const land = scenery();
  for (let y = 0; y < 16; y++) for (let x = 0; x < 24; x++) if (land.get(x, y)) r.set(8 + x, 8 + y);
  r.rect(0, 26, 39, 28); // the sill
  r.rect(2, 29, 37, 29);
  return decor('trainWindow', 5, 4, r, ['77777', '25552', '21112', '77777']);
}

/** The rows of the window's characters that move (row 1 and 2, columns 1-3, counted row by row in its 5 x 4), as rings: one a row. */
export const WINDOW_SCENERY: readonly (readonly number[])[] = [[6, 7, 8], [11, 12, 13]];

/** A carriage's open door: the frame, a grab-rail in it and the step. 2 x 2 characters. */
function carDoor(): NewDecor {
  const r = new Raster(16, 16);
  r.rect(0, 0, 15, 2); r.rect(0, 3, 1, 15); r.rect(14, 3, 15, 15);
  r.rect(4, 4, 4, 14); r.rect(4, 4, 6, 4); // the grab-rail
  r.rect(2, 15, 13, 15);
  return decor('carDoor', 2, 2, r, 7);
}

/** A ventilator on a carriage roof: a cowl on its base. 2 x 1 characters. */
function roofVent(): NewDecor {
  const r = new Raster(16, 8);
  r.ellipse(8, 4.5, 7, 3.5); r.rect(3, 6, 12, 7);
  r.rect(7, 2, 8, 4, false);
  return decor('roofVent', 2, 1, r, 12);
}

/** The stovepipe of a car's stove, on the roof, with a puff of smoke. 1 x 3 characters. */
function stovepipe(): NewDecor {
  const r = new Raster(8, 24);
  r.ellipse(3, 4, 3, 2.4); r.ellipse(5.5, 2.5, 2, 1.8); // the smoke
  r.rect(2, 9, 5, 23); r.rect(1, 8, 6, 9); // the pipe and its cap
  r.rect(3, 12, 3, 20, false);
  return decor('stovepipe', 1, 3, r, ['1', '1', 'b']);
}

/** A ceiling lamp: the cord, a shade and its glow. 1 x 2 characters. */
function carLamp(): NewDecor {
  const r = new Raster(8, 16);
  r.rect(3, 0, 4, 4);
  r.triangle(0, 9, 3.5, 4, 7, 9); r.rect(0, 9, 7, 9);
  r.rect(2, 11, 5, 14); r.rect(3, 12, 4, 13, false);
  return decor('carLamp', 1, 2, r, 7);
}

/** The dining car's samovar on its counter: a bulb with a chimney, a lid and a tap. 2 x 3 characters. */
function diningSamovar(): NewDecor {
  const r = new Raster(16, 24);
  r.rect(7, 2, 8, 6); r.rect(5, 5, 10, 6); // the chimney and its lid
  r.ellipse(8, 11, 5.5, 5); r.rect(13, 9, 15, 10); r.rect(14, 11, 14, 12); // the bulb and the tap
  r.rect(5, 11, 11, 11, false); r.rect(5, 14, 11, 14, false);
  r.rect(0, 16, 15, 23); r.rect(1, 19, 14, 19, false); r.rect(7, 20, 8, 23, false); // the counter
  return decor('diningSamovar', 2, 3, r, ['77', '77', '99']);
}

/** A locomotive cab's pressure gauge: a round dial, its needle over the red. 2 x 2 characters. */
function cabGauge(): NewDecor {
  const r = new Raster(16, 16);
  r.disc(8, 8, 7.5);
  for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) if (Math.hypot(x - 7.5, y - 7.5) <= 5.2) r.set(x, y, false);
  r.line(8, 8, 12, 4); r.rect(7, 7, 8, 8);
  return decor('cabGauge', 2, 2, r, 7);
}

/** The firebox door of the cab: a grate in a hot orange door. 2 x 2 characters. */
function cabFire(): NewDecor {
  const r = new Raster(16, 16);
  r.rect(1, 1, 14, 15);
  for (const x of [4, 7, 10]) r.rect(x, 4, x, 12, false);
  r.rect(2, 8, 13, 8, false);
  r.rect(6, 0, 9, 0);
  return decor('cabFire', 2, 2, r, 8);
}

/** A buffer at a car's end, under the floor: the plate on its stem. 1 x 1 character. */
function buffer(): NewDecor {
  const r = new Raster(8, 8);
  r.rect(0, 1, 7, 2); r.rect(3, 3, 4, 7);
  return decor('buffer', 1, 1, r, 12);
}

/** The axle bar between a bogie's two wheels. 1 x 1 character. */
function bogieBar(): NewDecor {
  const r = new Raster(8, 8);
  r.rect(0, 3, 7, 4); r.rect(2, 1, 5, 2);
  return decor('bogieBar', 1, 1, r, 12);
}

/** A sleeper's bunks: two berths, a pillow and a rolled blanket each, the ladder between. 3 x 2 characters. */
function bunk(): NewDecor {
  const r = new Raster(24, 16);
  r.rect(0, 0, 23, 1);
  r.rect(0, 2, 23, 6);
  r.rect(1, 3, 6, 5, false); r.rect(1, 3, 5, 4); // the pillow
  for (let x = 9; x < 22; x += 4) r.rect(x, 3, x, 5, false); // the blanket's folds
  r.rect(0, 8, 23, 9);
  r.rect(0, 10, 23, 14);
  r.rect(1, 11, 6, 13, false); r.rect(1, 11, 5, 12);
  for (let x = 9; x < 22; x += 4) r.rect(x, 11, x, 13, false);
  r.rect(0, 15, 23, 15);
  return decor('bunk', 3, 2, r, ['999', '999']);
}

/** A coal bucket (Wanted: Monty Mole's pail): a pail with its handle over, heaped with lumps of coal. 2 x 2 characters. */
function coalBucket(): NewDecor {
  const r = new Raster(16, 16);
  r.line(3, 6, 5, 1); r.line(5, 1, 10, 1); r.line(10, 1, 12, 6); // the handle
  r.ellipse(7.5, 6.5, 6, 2.6); // the heap of coal
  for (const [x, y] of [[4, 5], [8, 4], [11, 6], [6, 7]] as const) r.rect(x, y, x, y, false); // the lumps' gaps
  r.rect(1, 8, 14, 14); // the pail
  r.rect(2, 11, 13, 11, false); // its hoop
  r.rect(1, 15, 14, 15);
  return decor('coalBucket', 2, 2, r, 12);
}

/** A telegraph pole: the pole, two cross-arms with their glass insulators, the wire in a sag to each side. 2 x 4 characters. */
function pole(): NewDecor {
  const r = new Raster(16, 32);
  r.rect(7, 0, 8, 31);
  r.rect(1, 4, 14, 5); r.rect(3, 10, 12, 11);
  for (const x of [2, 6, 9, 13]) r.rect(x, 1, x, 3);
  for (const x of [4, 11]) r.rect(x, 7, x, 9);
  r.rect(7, 14, 8, 14, false); r.rect(7, 22, 8, 22, false); // the grain
  return decor('pole', 2, 4, r, 9);
}

/**
 * The border's boom gate, raised: the striped pole stood up on end beside its post, the bands a cell each (red, white), the post's foot grey. 1 x 7 characters.
 * Scenery: the way east is open (the ticket got him this far).
 */
function boomUp(): NewDecor {
  const r = new Raster(8, 56);
  r.rect(2, 0, 5, 47); r.rect(1, 48, 6, 55); r.rect(2, 50, 5, 50, false);
  return decor('boomUp', 1, 7, r, ['2', '1', '2', '1', '2', '1', 'C']);
}

/** A log cabin: logs in courses, a snow roof, a lit window, a door, a chimney. 5 x 4 characters. */
function cabin(): NewDecor {
  const r = new Raster(40, 32);
  r.rect(30, 0, 34, 6); r.rect(31, 2, 33, 3, false); // the chimney
  r.triangle(0, 14, 20, 3, 39, 14); // the snow roof
  r.rect(0, 14, 39, 15);
  r.rect(2, 9, 6, 9, false);
  for (let y = 16; y <= 31; y += 4) { r.rect(0, y, 39, y + 2); r.rect(0, y + 3, 39, y + 3, false); } // the logs
  r.rect(6, 17, 15, 26, false); r.rect(7, 18, 14, 25); r.rect(10, 18, 11, 25, false); r.rect(7, 22, 14, 22, false); // the window
  r.rect(26, 18, 34, 31, false); r.rect(27, 19, 33, 31); r.rect(30, 20, 30, 31, false); r.rect(32, 25, 32, 26, false); // the door
  const rows = ['11111', '11111', '99999', '99999'];
  return decor('cabin', 5, 4, r, rows);
}

/** A row of stalactites hanging from the mine's roof. 3 x 1 characters. */
function stalactites(): NewDecor {
  const r = new Raster(24, 8);
  r.rect(0, 0, 23, 1);
  for (const [x, h] of [[1, 5], [7, 7], [13, 4], [18, 6]] as const) for (let y = 2; y < 2 + h; y++) { const w = Math.max(1, 3 - Math.floor((y - 2) / 2)); r.rect(x, y, x + w, y); }
  return decor('stalactites', 3, 1, r, 12);
}

// ---- under the train: the rail and the wheels (decorations: nothing under the floor is walked on) --------------------

/** The rail on its sleepers seen from the side: the iron's head along the top, a sleeper and a gap of ballast every 8 pixels (it is made to slide sideways). 1 x 1 character. */
const RAIL_ROWS = ['########', '########', '.####...', '.####...', '.####...', '.####...', '........', '#...#.#.'] as const;
/** The wheel under a carriage: the rim, the hub and four spokes (a cross; `WHEEL_FRAMES` turns it to a saltire). 1 x 1 character. */
const WHEEL_ROWS = ['..####..', '.#.##.#.', '#..##..#', '########', '########', '#..##..#', '.#.##.#.', '..####..'] as const;
const oneChar = (name: string, rows: readonly string[], colour: number): NewDecor => {
  const r = new Raster(8, 8);
  r.stamp(rows, 0, 0);
  return decor(name, 1, 1, r, colour);
};

/** The wheel's pictures in turn (a character, as bytes): the cross, then the saltire. */
export const WHEEL_FRAMES: readonly Uint8Array[] = [
  characters('wheel', WHEEL_ROWS, 1, 1),
  characters('wheel turned', ['..####..', '.##..##.', '#.#..#.#', '#..##..#', '#..##..#', '#.#..#.#', '.##..##.', '..####..'], 1, 1),
];

/** A locomotive's big driving wheel: the tyre, six spokes and the hub with a crank pin. 3 x 3 characters. */
function drivingWheel(): NewDecor {
  const r = new Raster(24, 24);
  r.ring(11.5, 11.5, 11, 3);
  for (let k = 0; k < 6; k++) {
    const a = (k * Math.PI) / 3 + 0.3;
    r.line(11.5, 11.5, 11.5 + 9 * Math.cos(a), 11.5 + 9 * Math.sin(a));
    r.line(12.5, 11.5, 12.5 + 9 * Math.cos(a), 11.5 + 9 * Math.sin(a));
  }
  r.disc(11.5, 11.5, 3.2); r.ellipse(11.5, 11.5, 1.2, 1.2, false);
  return decor('drivingWheel', 3, 3, r, 2);
}

/** The locomotive cab's window: a lit frame round dark glass with a glint, a sill. 2 x 2 characters. */
function cabWindow(): NewDecor {
  const r = new Raster(16, 16);
  r.rect(0, 0, 15, 15);
  r.rect(2, 2, 13, 11, false);
  r.line(4, 9, 8, 4); r.line(6, 9, 10, 4);
  r.rect(7, 2, 8, 11);
  return decor('cabWindow', 2, 2, r, 7);
}

/** A mine cart's wall over its bed: the rim of the box with a heap of coal in it and a lamp hook. 4 x 1 characters. */
function mineCart(): NewDecor {
  const r = new Raster(32, 8);
  r.rect(0, 3, 31, 4); r.rect(0, 5, 31, 7); r.rect(2, 6, 29, 6, false);
  r.ellipse(9, 2.5, 5, 2.6); r.ellipse(22, 2.5, 6, 2.6); // the heaped ore
  for (const x of [6, 11, 19, 24]) r.set(x, 2, false);
  return decor('mineCart', 4, 1, r, 8);
}

// ---- OFF THE BEATEN PATH (the taiga off the trail, added 2026-11-25): the northern lights, the pines' crowns and trunks, the eagle owl's nest ----------------------

/**
 * The northern lights, a curtain stamped a cell at a time along a wave over the taiga: its upper fringe (thin rays fading out upward), its body (rays from top to
 * bottom with breaks) and its hem (the rays ending in a bright folded edge). Rays only, never a level edge (nothing in the sky may look like a ledge). Each 1 x 1 character, one ink: the fringe violet, the body green, the hem light green.
 */
function auroraTop(): NewDecor {
  const r = new Raster(8, 8);
  for (const [x, y] of [[0, 5], [3, 3], [5, 6], [7, 4]] as const) r.rect(x, y, x, 7);
  return decor('auroraTop', 1, 1, r, 4);
}
function auroraBody(): NewDecor {
  const r = new Raster(8, 8);
  for (const x of [0, 3, 5, 7]) r.rect(x, 0, x, 7);
  r.set(3, 4, false); r.set(7, 2, false);
  return decor('auroraBody', 1, 1, r, 5);
}
function auroraHem(): NewDecor {
  const r = new Raster(8, 8);
  for (const [x, y] of [[0, 3], [3, 6], [5, 2], [7, 4]] as const) r.rect(x, 0, x, y);
  return decor('auroraHem', 1, 1, r, 13);
}

/** A pine's needles round its trunk: stacked chevrons of drooping boughs, sparse enough to stay behind the snowy boughs he stands on. Green, a backdrop stamped tier by tier (fillCells). 1 x 1 character. */
function taigaNeedles(): NewDecor {
  const r = new Raster(8, 8);
  r.stamp(['...##...', '..#..#..', '.#....#.', '#......#', '...##...', '..#..#..', '.#....#.', '#......#'], 0, 0); // stacked boughs drooping either way, a chevron a tier
  return decor('taigaNeedles', 1, 1, r, 5);
}

/** A pine's trunk behind the boughs: bark in long ridges, darker than anything he stands on. A backdrop stamped down the trunk's cells (fillCells). 1 x 1 character. */
function taigaTrunk(): NewDecor {
  const r = new Raster(8, 8);
  r.rect(2, 0, 5, 7); r.rect(3, 1, 3, 3, false); r.rect(4, 4, 4, 6, false);
  return decor('taigaTrunk', 1, 1, r, 9);
}

/** The eagle owl in her nest at the top of the tallest pine: her round head, the ear tufts and two big eyes looking out over the sticks. 2 x 2 characters, orange, her eyes ringed in black. */
function eagleOwl(): NewDecor {
  const r = new Raster(16, 16);
  r.ellipse(7.5, 4.5, 4.5, 4); r.triangle(3, 0, 3, 3, 5, 2); r.triangle(12, 0, 12, 3, 10, 2); // her head and its ear tufts
  r.ellipse(7.5, 11.5, 5.5, 4.5); // her body
  r.ring(5.5, 4.5, 1.6, 1); r.ring(9.5, 4.5, 1.6, 1); r.set(7, 6, false); r.set(8, 6, false); // the big eyes, the beak
  for (const [x, y] of [[5, 10], [9, 11], [6, 13], [10, 13]] as const) r.set(x, y, false); // the speckled breast
  r.line(2, 10, 4, 15, false); r.line(13, 10, 11, 15, false); // the folded wings
  return decor('eagleOwl', 2, 2, r, 8);
}

export const SIBERIA_DECOR = {
  pineSmall: pine(2, 3, 2, 'pineSmall'),
  diningTable: diningTable(),
  trainWindow: trainWindow(),
  boomUp: boomUp(),
  carDoor: carDoor(),
  roofVent: roofVent(),
  stovepipe: stovepipe(),
  carLamp: carLamp(),
  diningSamovar: diningSamovar(),
  cabGauge: cabGauge(),
  cabFire: cabFire(),
  bogieBar: bogieBar(),
  buffer: buffer(),
  bunk: bunk(),
  coalBucket: coalBucket(),
  pole: pole(),
  cabin: cabin(),
  stalactites: stalactites(),
  rail: oneChar('rail', RAIL_ROWS, 12),
  wheel: oneChar('wheel', WHEEL_ROWS, 2),
  drivingWheel: drivingWheel(),
  cabWindow: cabWindow(),
  mineCart: mineCart(),
  auroraTop: auroraTop(),
  auroraBody: auroraBody(),
  auroraHem: auroraHem(),
  taigaNeedles: taigaNeedles(),
  taigaTrunk: taigaTrunk(),
  eagleOwl: eagleOwl(),
  ...SIBERIA_SKY,
} as const satisfies Record<string, NewDecor>;

export type SiberiaDecor = keyof typeof SIBERIA_DECOR;
