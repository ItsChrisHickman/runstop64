/**
 * Rio's streets and carnival, brought back from the region as Chris liked it before the 2026-11-23 reset (commit 44ea872's rio-decor.ts, the same pictures): the favela's sky, its colourful houses, washing lines,
 * poles and posts, the church and a satellite dish (HOUSE OF COLOUR); the carnival's floats with their dancing samba dancers, the grandstands' crowds, bunting, balloons, the bateria's surdo and the parade's
 * plumes (BEAT THE DRUM, FLOAT YOUR BOAT). Solid ink with the detail cut into it as black lines, as the rest of Rio's art.
 */
import { decor } from './decorations';
import { characters } from './pixels';
import { limb, Raster } from './raster';
import type { NewDecor } from './types';

// ---- the sky (one character each, laid over a room's empty cells)

/** One character of blue sky: sparse flecks at the zenith, dashes lower, lines near the horizon. */
function skyBand(name: string, rows: readonly string[], colour: number): NewDecor {
  const r = new Raster(8, 8);
  r.stamp(rows, 0, 0);
  return decor(name, 1, 1, r, colour);
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

/** A post under a house on stilts: an upright with a footing. 1 x 2 characters. */
function post(): NewDecor {
  const r = new Raster(8, 16);
  r.rect(2, 0, 5, 15); r.rect(0, 14, 7, 15);
  return decor('rioPost', 1, 2, r, 9);
}

/** A pole on a roof to hang washing from: an upright with a crossbar. 1 x 3 characters. */
function washPole(): NewDecor {
  const r = new Raster(8, 24);
  r.rect(3, 0, 4, 23); r.rect(0, 0, 7, 1);
  return decor('rioWashPole', 1, 3, r, 9);
}

/** A church tower of the hill: a square tower with a belfry opening and a cross on a little roof. 3 x 4 characters. */
function church(): NewDecor {
  const r = new Raster(24, 32);
  r.rect(11, 0, 12, 5); r.rect(9, 2, 14, 3); // the cross
  r.triangle(12, 5, 2, 12, 21, 12); r.rect(3, 12, 20, 31); // the roof and the tower
  r.rect(8, 15, 15, 23, false); r.rect(10, 13, 13, 14, false); r.rect(11, 16, 12, 22);
  r.rect(9, 27, 14, 31, false);
  return decor('church', 3, 4, r, ['111', '111', 'eee', 'eee']);
}

/** A satellite dish on its bracket. 1 x 1 characters. */
function dish(): NewDecor {
  const r = new Raster(8, 8);
  r.ellipse(3.5, 3, 3.5, 2.8); r.ellipse(3.5, 3.6, 2.6, 2, false); r.rect(3, 5, 4, 7); r.rect(1, 7, 6, 7);
  return decor('dish', 1, 1, r, 1);
}

// ---- the carnival: floats with their dancers, stands, balloons, the drum

/**
 * A samba dancer on a float, 16 x 16 pixels at (x0, y0) of a raster: a fan of plumes over a smiling face, arms up or out, a feathered skirt flaring, swinging side to side. `pose` 0 arms up, 1 arms out.
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

/** One float's picture: its prop (made by `prop`) across the right four columns, the dancer at the left two columns' lower rows (cells 6, 7, 12 and 13: the engine's `charAnims` change their pictures). 6 x 3 characters. */
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
  for (let k = -3; k <= 3; k++) { const a = (k * 18 * Math.PI) / 180; for (let t = 2; t < 11; t++) { r.set(10 + Math.sin(a) * t * 1.2, 7 - Math.cos(a) * t * 0.7, true); r.set(11 + Math.sin(a) * t * 1.2, 7 - Math.cos(a) * t * 0.7, true); } }
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

const FLOAT_PROPS = { floatGalleon: galleonProp, floatBird: birdProp, floatSun: sunProp } as const;
type FloatName = keyof typeof FLOAT_PROPS;
const FLOAT_NAMES = ['floatGalleon', 'floatBird', 'floatSun'] as const satisfies readonly FloatName[];
const FLOAT_COLOURS: Readonly<Record<FloatName, readonly string[]>> = { floatGalleon: ['aa1117', 'a31111', 'aa2222'], floatBird: ['552222', 'a32222', 'aa2222'], floatSun: ['a37777', 'a37777', 'aa7777'] };
const floatOf = (name: FloatName) => floatPiece(name, FLOAT_PROPS[name], FLOAT_COLOURS[name], 0).piece;

/** The dancers: each float's dancer characters (cells 6, 7, 12 and 13 of the 6-wide piece: the two left cells of its two lower rows) with their two pictures, arms up and arms out, for the engine's `charAnims`. */
export const FLOAT_DANCERS = FLOAT_NAMES.map((name) => {
  const cells = [6, 7, 12, 13] as const;
  const bytes = (pose: 0 | 1) => {
    const all = characters(name, floatPiece(name, FLOAT_PROPS[name], ['aaaaaa', 'aaaaaa', 'aaaaaa'], pose).rows, 6, 3);
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

/** The grandstand's concrete tiers seen behind the crowd, down to the avenue: a tier's edge every four rows of pixels, its seats' backs, calm and dark (one character, laid over a room's empty cells; the floats draw over it and put it back). */
function tiers(): NewDecor {
  const r = new Raster(8, 8);
  r.stamp(['########', '........', '.#...#..', '........', '########', '........', '...#...#', '........'], 0, 0);
  return decor('rioTiers', 1, 1, r, 6);
}

/**
 * A row of the grandstand's crowd dancing (the carnival's spectacle, Chris 2026-11-25: "dancers everywhere"): eight little samba dancers side by side, 8 x 16 pixels each, a plume on the head, each in a colour
 * of its own (one column each). Four poses, big enough to read at screen size: arms flung up in a V, both out and bobbing down, one hand high and the hips swung the other way, arms low and the kick on the other
 * leg; dancer k is in pose (k + frame) mod 4, so a wave runs along the stand rather than the whole stand in step. The engine's `charAnims` steps the four (`CROWD_DANCE`). Two colour orders (`rioCrowd`, `rioCrowdB`),
 * one a tier, so neighbouring tiers never match. 8 x 2 characters, repeated along the tiers.
 */
const CROWD_COLOURS = { rioCrowd: '27ad385e', rioCrowdB: 'e583da72' } as const;
type CrowdName = keyof typeof CROWD_COLOURS;
const CROWD_FRAMES = 4;
function crowdRaster(frame: number): Raster {
  const r = new Raster(64, 16);
  for (let k = 0; k < 8; k++) {
    const pose = (k + frame) % CROWD_FRAMES;
    const sway = pose === 2 ? 1 : pose === 3 ? -1 : 0, bob = pose === 1 ? 1 : 0;
    const x = k * 8 + sway, y = bob;
    r.rect(x + 3, y, x + 4, y + 2); r.set(x + 2, y + 1); r.set(x + 5, y + 1); // the plume
    r.disc(x + 3.5, y + 4.5, 1.8); // the head
    r.rect(x + 3, y + 7, x + 4, y + 10); // the body
    if (pose === 0) { r.line(x + 2, y + 7, x, y); r.line(x + 5, y + 7, x + 7, y); } // a V, flung up
    else if (pose === 1) { r.line(x + 2, y + 7, x, y + 7); r.line(x + 5, y + 7, x + 7, y + 7); } // out level
    else if (pose === 2) { r.line(x + 5, y + 7, x + 7, y + 1); r.line(x + 2, y + 7, x + 1, y + 9); } // one hand high, the other on the hip
    else { r.line(x + 2, y + 7, x, y + 10); r.line(x + 5, y + 7, x + 7, y + 10); } // low
    r.triangle(x + 3.5, y + 9, x + 1 - sway, Math.min(13, y + 13), x + 6 - sway, Math.min(13, y + 13)); // the skirt, flaring the other way to the sway
    if (pose % 2 === 0) { r.rect(x + 2, 14, x + 2, 15); r.rect(x + 5, 12, x + 7, 12); } else { r.rect(x + 5, 14, x + 5, 15); r.rect(x, 12, x + 2, 12); } // a leg down, a leg kicking high
  }
  return r;
}
const crowdOf = (name: CrowdName): NewDecor => decor(name, 8, 2, crowdRaster(0), [CROWD_COLOURS[name], CROWD_COLOURS[name]]);
/** The crowds' pictures for the engine's `charAnims`: all sixteen characters of each piece, the four poses in turn. */
export const CROWD_DANCES = (['rioCrowd', 'rioCrowdB'] as const).map((decorName) => ({
  decor: decorName, cells: Array.from({ length: 16 }, (_, i) => i),
  frames: Array.from({ length: CROWD_FRAMES }, (_, f) => characters(decorName, crowdRaster(f).rows(), 8, 2)),
}));

/** A riser of the Selaron steps under its tread: a band of little square tiles, the mosaic Jorge Selaron laid on Lapa's steps. 2 x 1 characters. */
function selaron(): NewDecor {
  const r = new Raster(16, 8);
  for (let y = 1; y < 8; y += 3) for (let x = (y % 2) * 2; x < 16; x += 4) r.rect(x, y, x + 1, y + 1);
  return decor('rioSelaron', 2, 1, r, ['a7']);
}

/** Bunting strung across: a rope hung with little flags in turn. 4 x 1 characters. */
function bunting(): NewDecor {
  const r = new Raster(32, 8);
  r.rect(0, 0, 31, 0);
  for (let x = 1; x < 32; x += 6) r.triangle(x, 1, x + 4, 1, x + 2, 6);
  return decor('bunting', 4, 1, r, ['2751']);
}

/** A string of balloons: three round balloons on strings, in bright colours. 2 x 2 characters. */
function balloons(): NewDecor {
  const r = new Raster(16, 16);
  for (const [x, y] of [[3, 3], [8, 2], [12, 4]] as const) { r.ellipse(x, y, 2.6, 3); r.line(x, y + 3, 8, 15); }
  return decor('rioBalloons', 2, 2, r, ['27', '53']);
}

/** A surdo, the big bass drum of the bateria: a deep barrel with its skin and rope tension. 2 x 2 characters. */
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
  for (let k = -3; k <= 3; k++) { const a = (k * 22 * Math.PI) / 180; for (let t = 3; t < 13; t++) { r.set(7.5 + Math.sin(a) * t, 12 - Math.cos(a) * t, true); r.set(8.5 + Math.sin(a) * t, 12 - Math.cos(a) * t, true); } }
  r.disc(7.5, 12, 2.5);
  return decor('rioPlumes', 2, 4, r, ['aa', '22', '77', '77']);
}

export const RIO_STREETS = {
  rioSkyHi: skyBand('rioSkyHi', ['........', '..#.....', '........', '.....#..', '........', '.#......', '........', '....#...'], 6),
  rioSkyMid: skyBand('rioSkyMid', ['........', '..#...#.', '........', '#.......', '........', '...#..#.', '........', '.#......'], 14),
  rioSkyLow: skyBand('rioSkyLow', ['........', '.##.....', '........', '.....##.', '........', '##......', '........', '....##..'], 14),
  rioHousePink: house('rioHousePink', 10, 'door'),
  rioHouseYellow: house('rioHouseYellow', 7, 'balcony'),
  rioHouseBlue: house('rioHouseBlue', 14, 'shop'),
  rioHouseGreen: house('rioHouseGreen', 13, 'tank'),
  rioWashA: wash('rioWashA', 'shirts', '27'),
  rioWashB: wash('rioWashB', 'dress', 'ea'), // (light blue and pink: not the football's cyan it bounces past)
  rioWashC: wash('rioWashC', 'towels', '84'),
  rioWashD: wash('rioWashD', 'trousers', '1e'),
  rioWashPole: washPole(),
  rioPost: post(),
  church: church(),
  dish: dish(),
  floatGalleon: floatOf('floatGalleon'),
  floatBird: floatOf('floatBird'),
  floatSun: floatOf('floatSun'),
  stands: stands('stands', '4444', 'aaaa'),
  rioStandsGold: stands('rioStandsGold', '7777', '8888'),
  rioTiers: tiers(),
  rioCrowd: crowdOf('rioCrowd'),
  rioCrowdB: crowdOf('rioCrowdB'),
  rioSelaron: selaron(),
  bunting: bunting(),
  rioBalloons: balloons(),
  surdo: surdo(),
  rioPlumes: plumes(),
} as const satisfies Record<string, NewDecor>;
