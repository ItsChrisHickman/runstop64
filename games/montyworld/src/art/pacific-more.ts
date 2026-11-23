/**
 * The Pacific's second pass (docs/dosvidaniya-pacific.md, "Pacific v2"): the pieces the redesigned rooms are made of beyond the first build's (pacific-tiles.ts, pacific-decor.ts, pacific-creatures.ts):
 * the luau's feast and show (hula dancers, drummers, the earth oven, the fire-knife dancer), Waikiki's hotel facade and the whole of Diamond Head, the crater trail's and the bunker's pieces, the tern of
 * Molokai, the crane of the ship, the moray's hole, Hana's black-sand pieces, Hilo's conveyor truck and cargo door. Same manner as the rest (solid ink with black-line detail); names start `pac` and are
 * in no other region.
 */
import { decor } from './decorations';
import { lay, pair } from './creature-kit';
import { tile } from './tiles';
import { limb, Raster } from './raster';
import type { NewCreature, NewDecor } from './types';

// ---- tiles

export const PACIFIC_MORE_TILES = {
  /** A hotel's facade: floors of windows between white bands. Solid. */
  pacHotelWall: tile('pacHotelWall', 1, 1, [
    '########',
    '#.##.##.',
    '#.##.##.',
    '########',
    '#.##.##.',
    '#.##.##.',
    '########',
    '########',
  ]),
  /** The sea wall of Waikiki: blocks of coral stone with their courses. Solid. */
  pacSeaWall: tile('pacSeaWall', 1, 14, [
    '########',
    '#......#',
    '#.####.#',
    '#.####.#',
    '#......#',
    '########',
    '########',
    '........',
  ]),
  /** The moray's hole in the coral: a black mouth in the rock with two eyes in it at the warning. Solid. */
  pacMorayHole: tile('pacMorayHole', 1, 4, [
    '########',
    '###..###',
    '##....##',
    '#......#',
    '#......#',
    '##....##',
    '###..###',
    '########',
  ]),
  /** The hole with two eyes in it (the warning; the pulse flickers between it and the empty one). Solid. */
  pacMorayEyes: tile('pacMorayEyes', 1, 10, [
    '........',
    '........',
    '.##..##.',
    '.#.##.#.',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** The moray's body reaching out of its hole, banded, a head at the end of each row: it kills while it lunges (the pulse's live cells). */
  pacMorayBody: tile('pacMorayBody', 0, 10, [
    '........',
    '########',
    '#.##.##.',
    '########',
    '########',
    '.##.##.#',
    '########',
    '........',
  ]),
  /** A pier's plank beginning to give: the boards with cracks across them. A floor. */
  pacPlankCracked: tile('pacPlankCracked', 2, 9, [
    '########',
    '.#......',
    '.##.#.##',
    '.#.##.##',
    '..#.....',
    '####.#..',
    '#.##..#.',
    '........',
  ]),
  /** A rotten plank splitting: the boards broken, wide gaps. A floor. */
  pacPlankSplit: tile('pacPlankSplit', 2, 9, [
    '#.#..#.#',
    '........',
    '.#..#..#',
    '..#..##.',
    '........',
    '#..#...#',
    '.#...#..',
    '........',
  ]),
  /** Black sand running down into the sea, a ripple of foam along its top. A floor. */
  pacSwash: tile('pacSwash', 4, 6, [
    '..#..#..',
    '.#.##.#.',
    '########',
    '#..##..#',
    '########',
    '########',
    '########',
    '########',
  ]),
  /** A stone step of the crater trail: worn flat stone with a lip. A floor. */
  pacTrailStone: tile('pacTrailStone', 2, 9, [
    '########',
    '#.#..#.#',
    '........',
    '........',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** The bunker's concrete: poured walls with their form-board lines. Solid. */
  pacConcrete: tile('pacConcrete', 1, 12, [
    '########',
    '#......#',
    '#.####.#',
    '#.#..#.#',
    '#.#..#.#',
    '#.####.#',
    '#......#',
    '########',
  ]),
} as const;

// ---- decorations

/** A hula dancer, seen from the side: a flower in the hair, a lei, one arm up and one out, a grass skirt of fringes. 2 x 3 characters. */
function hulaDancer(): NewDecor {
  const r = new Raster(16, 24);
  r.disc(8, 4, 2.6); r.rect(5, 1, 6, 2); r.rect(6, 0, 7, 0); // head and the flower
  r.rect(6, 7, 9, 12); r.rect(5, 8, 10, 8, false); // body, the lei
  r.line(6, 8, 2, 3); r.line(5, 8, 1, 3); r.line(9, 9, 14, 11); r.line(9, 10, 14, 12); // the arms
  r.rect(4, 12, 11, 13); // the waistband
  for (let x = 4; x <= 11; x += 2) { r.rect(x, 14, x, 22); r.rect(x + 1, 14, x + 1, 20); }
  r.rect(7, 14, 7, 22, false);
  return decor('pacHulaDancer', 2, 3, r, ['dd', 'dd', '55']);
}

/** A drummer sitting behind his drum: head, shoulders and a drum between his knees, a hand raised. 2 x 2 characters. */
function drummer(): NewDecor {
  const r = new Raster(16, 16);
  r.disc(8, 3, 2.6); r.rect(5, 6, 10, 9); r.line(5, 7, 2, 4); r.line(10, 7, 12, 5); r.rect(11, 3, 12, 4);
  r.ellipse(8, 10, 5.5, 1.8); r.rect(3, 11, 12, 15); r.rect(3, 13, 12, 13, false);
  return decor('pacDrummer', 2, 2, r, ['87', '88']);
}

/** The earth oven (imu): a mound of hot stones in a pit, banana leaves over it and the steam going up. 4 x 2 characters. */
function earthOven(): NewDecor {
  const r = new Raster(32, 16);
  r.ellipse(15.5, 13, 15, 4); r.cut(['##', '#.', '.#', '##'], 6, 11);
  for (const [x, y] of [[4, 12], [10, 10], [16, 12], [22, 10], [27, 12]] as const) r.cut(['.#.', '#.#', '.#.'], x, y);
  r.rect(8, 7, 24, 8); r.line(6, 9, 10, 7); r.line(26, 9, 22, 7); // the banana leaves
  for (const x of [11, 16, 21]) { r.line(x, 5, x + 1, 3); r.line(x + 1, 3, x, 1); } // the steam
  return decor('pacEarthOven', 4, 2, r, ['2222', '2222']);
}

/** Diamond Head from Waikiki, all of it: the long slope up from the left to the crater's high rim, the rim's ridge cut as a black line, the lookout on it, the steep far side. 12 x 4 characters. */
function diamondHeadBig(): NewDecor {
  const r = new Raster(96, 32);
  for (let x = 0; x < 96; x++) {
    const h = x < 62 ? 6 + (x / 62) * 22 - (x > 40 && x < 56 ? (x - 40) * 0.4 : 0) : 28 - ((x - 62) / 34) * 24;
    const top = Math.max(0, Math.round(32 - h));
    r.rect(x, top, x, 31);
  }
  for (let x = 44; x < 94; x += 1) { const h = x < 62 ? 6 + (x / 62) * 22 - (x > 40 && x < 56 ? (x - 40) * 0.4 : 0) : 28 - ((x - 62) / 34) * 24; r.set(x, Math.round(32 - h) + 3, false); } // the crater's rim, a ridge line under the crest
  for (const x of [10, 22, 34, 70, 80]) r.line(x, 14 + Math.round(x / 8), x + 3, 31, false); // gullies
  r.rect(36, 6, 39, 8); r.rect(37, 4, 38, 5); // the lookout on the western rim
  return decor('pacDiamondHeadBig', 12, 4, r, 5);
}

/** The crane's tower, standing on the deck: a lattice mast on a broad foot with its cab at the top. 2 x 8 characters. */
function craneMast(): NewDecor {
  const r = new Raster(16, 64);
  r.rect(0, 0, 15, 8); r.rect(2, 2, 6, 5, false); // the cab, its window
  r.rect(3, 9, 4, 57); r.rect(11, 9, 12, 57); // the mast's two legs
  for (let y = 10; y < 56; y += 9) { r.line(4, y, 11, y + 8); r.line(11, y, 4, y + 8); } // the lattice
  r.rect(0, 58, 15, 63); r.rect(2, 60, 13, 60, false); // the foot
  return decor('pacCraneMast', 2, 8, r, 14);
}

/** The crane's jib out from the tower over the deck: a truss on its beam, the beam's underside where the crate's hook runs. 7 x 2 characters. */
function craneJib(): NewDecor {
  const r = new Raster(56, 16);
  r.rect(0, 12, 55, 15); r.rect(0, 14, 55, 14, false); // the beam, a line along it
  r.line(0, 12, 27, 2); r.line(27, 2, 55, 12); r.line(0, 11, 27, 1); r.line(27, 1, 55, 11); // the truss over it
  for (let x = 6; x < 55; x += 7) r.rect(x, 8, x, 11); // the verticals
  return decor('pacCraneJib', 7, 2, r, 14);
}

/** The cargo door of the plane, open: a ramp let down from the fuselage's side. 3 x 2 characters. */
function cargoDoor(): NewDecor {
  const r = new Raster(24, 16);
  r.rect(0, 0, 23, 1); r.rect(0, 2, 1, 14); r.rect(22, 2, 23, 14); r.rect(2, 2, 21, 14, false);
  r.line(1, 15, 22, 9); r.line(1, 14, 22, 8); // the ramp
  return decor('pacCargoDoor', 3, 2, r, 14);
}

/** The cargo loader's conveyor truck: a boxy cab at the left, the belt rising on its scissor frame to the right (the slope he rides). 5 x 4 characters. */
function conveyorTruck(): NewDecor {
  const r = new Raster(40, 32);
  r.rect(0, 12, 11, 27); r.rect(2, 14, 8, 20, false); r.rect(9, 14, 10, 20, false); // the cab, its windows
  r.disc(5, 29, 2.6); r.disc(30, 29, 2.6); r.disc(5, 29, 1.1); r.disc(30, 29, 1.1); // wheels
  r.rect(12, 24, 35, 27); // the chassis
  r.line(12, 25, 38, 2); r.line(12, 24, 38, 1); r.line(12, 26, 38, 3); r.line(14, 27, 39, 5); // the belt on its rise
  for (let k = 0; k < 5; k++) r.rect(17 + k * 4, 21 - k * 4, 18 + k * 4, 22 - k * 4, false); // the belt's cleats
  r.line(20, 26, 26, 12, false); r.line(26, 26, 20, 12, false); // the scissor frame
  return decor('pacConveyor', 5, 4, r, 7);
}

/** The Hilo terminal's gate: a counter with a lei greeter's sign, a conveyor of baggage. 3 x 2 characters. */
function gateDesk(): NewDecor {
  const r = new Raster(24, 16);
  r.rect(0, 6, 23, 15); r.rect(2, 8, 21, 9, false); r.rect(0, 4, 23, 5); r.rect(10, 0, 13, 3); r.rect(11, 1, 12, 2, false);
  return decor('pacGateDesk', 3, 2, r, 7);
}

/** A banana-bread stand: a striped awning over a table, loaves on it. 4 x 3 characters. */
function breadStand(): NewDecor {
  const r = new Raster(32, 24);
  r.rect(0, 0, 31, 4); for (let x = 2; x < 31; x += 6) r.rect(x, 1, x + 2, 3, false); // the awning, striped
  r.rect(2, 5, 3, 22); r.rect(28, 5, 29, 22); // the poles
  r.rect(0, 14, 31, 17); r.rect(1, 18, 30, 18, false);
  for (let k = 0; k < 4; k++) { r.ellipse(5 + k * 7, 12, 3, 1.8); r.line(4 + k * 7, 11, 6 + k * 7, 11, false); } // the loaves
  r.rect(4, 19, 5, 23); r.rect(26, 19, 27, 23);
  return decor('pacBreadStand', 4, 3, r, ['6666', '6666', '2222']);
}

/** The summit lookout: a concrete pillbox with a slit window and a flag on its roof. 4 x 3 characters. */
function lookout(): NewDecor {
  const r = new Raster(32, 24);
  r.rect(2, 6, 29, 23); r.rect(0, 4, 31, 6); r.rect(5, 10, 26, 13, false); r.rect(13, 18, 18, 23, false); // block, roof slab, the slit, the door
  r.rect(15, 0, 15, 4); r.rect(16, 0, 20, 2); r.rect(17, 1, 19, 1, false); // the flag
  return decor('pacLookout', 4, 3, r, 12);
}

/** A sea arch of black basalt: a bridge of rock over the surf. 6 x 4 characters. */
function seaArch(): NewDecor {
  const r = new Raster(48, 32);
  r.rect(0, 10, 47, 31);
  r.ellipse(24, 31, 13, 15, false);
  r.rect(0, 6, 11, 9); r.rect(36, 6, 47, 9);
  for (const x of [4, 14, 34, 42]) r.line(x, 12, x + 2, 24, false);
  return decor('pacSeaArch', 6, 4, r, 9);
}

/** Falling water down a cliff (a column of streaks): the picture the room's animation scrolls, the streaks falling. 2 x 6 characters, in two tones. */
function fallsStreaks(): NewDecor {
  const r = new Raster(16, 48);
  for (let x = 1; x < 15; x += 3) { for (let y = (x * 7) % 11; y < 48; y += 11) r.rect(x, y, x + 1, y + 6); }
  return decor('pacFalls', 2, 6, r, 3);
}

/** A wreck's bow in the sand: a hull's ribs and a hole in its side a diver swims through. 6 x 4 characters. */
function wreck(): NewDecor {
  const r = new Raster(48, 32);
  r.rect(4, 12, 43, 29); r.rect(0, 8, 8, 12); r.rect(40, 6, 47, 12);
  r.ellipse(24, 20, 10, 7, false);
  for (const x of [10, 38]) r.rect(x, 14, x, 28, false);
  r.rect(14, 0, 15, 8); r.line(15, 1, 22, 5);
  return decor('pacWreck', 6, 4, r, 12);
}

/** A giant clam, open, with a pearl: its two ribbed shells. 3 x 2 characters. */
function clam(): NewDecor {
  const r = new Raster(24, 16);
  r.ellipse(12, 12, 11, 3.5); r.ellipse(12, 5, 10, 4.5); r.rect(0, 8, 23, 9, false);
  for (const x of [4, 8, 12, 16, 20]) { r.line(x, 2, x, 6, false); r.line(x, 11, x, 14, false); }
  r.disc(12, 9, 1.6); r.set(11, 8, false);
  return decor('pacClam', 3, 2, r, ['777', '777']);
}

export const PACIFIC_MORE_DECOR = {
  pacHulaDancer: hulaDancer(),
  pacDrummer: drummer(),
  pacEarthOven: earthOven(),
  pacDiamondHeadBig: diamondHeadBig(),
  pacCraneMast: craneMast(),
  pacCraneJib: craneJib(),
  pacCargoDoor: cargoDoor(),
  pacConveyor: conveyorTruck(),
  pacGateDesk: gateDesk(),
  pacBreadStand: breadStand(),
  pacLookout: lookout(),
  pacSeaArch: seaArch(),
  pacFalls: fallsStreaks(),
  pacWreck: wreck(),
  pacClam: clam(),
} as const satisfies Record<string, NewDecor>;

// ---- creatures

/** A tern over the water: a white sea bird with a forked tail, wings beating up and down. Flies up and down over the fishponds. */
function tern(): NewCreature {
  const frame = (wing: number) => {
    const r = new Raster(16, 16);
    r.ellipse(8, 8, 5.5, 2.4); r.disc(12.5, 6.5, 2.2); r.rect(14, 6, 15, 7); r.set(12, 6, false); // body, head, beak, eye
    r.rect(0, 9, 2, 9); r.line(2, 9, 0, 12); r.line(3, 9, 2, 12); // the forked tail
    limb(r, 7, 7, 4 - wing, 1 + wing * 1.4, 1.2); limb(r, 9, 7, 11 + wing, 1 + wing * 1.4, 1.2); // the wings
    r.rect(6, 10, 8, 11, false);
    return r.rows();
  };
  return pair('pacTern', [frame(-1), frame(0), frame(1), frame(0)], 1, true);
}

/** The fire-knife dancer: a man in a grass skirt twirling a flaming blade over his head, one flame at each end. */
function fireKnife(): NewCreature {
  const frame = (a: number) => {
    const r = new Raster(16, 16);
    r.disc(8, 5, 2.4); r.rect(6, 8, 9, 11); r.rect(5, 12, 10, 13); // head, body, skirt
    for (let x = 5; x <= 10; x += 2) r.rect(x, 14, x, 15);
    r.rect(6, 14, 6, 15, false);
    const dx = [5, 3, 0, 3][a] ?? 5, dy = [1, 2, 4, 2][a] ?? 1;
    r.line(8 - dx, 3 - dy + 2, 8 + dx, 3 + dy - 2); r.line(8 - dx, 4 - dy + 2, 8 + dx, 4 + dy - 2); // the blade twirling
    lay(r, (s) => { s.disc(8 - dx, 2 - dy + 2, 1.7); s.disc(8 + dx, 2 + dy - 2, 1.7); }); // the flames at its ends
    r.rect(4, 8, 5, 8); r.rect(10, 8, 11, 8);
    return r.rows();
  };
  return pair('pacFireKnife', [frame(0), frame(1), frame(2), frame(3)], 2, true);
}

export const PACIFIC_MORE_CREATURES = {
  pacTern: tern(),
  pacFireKnife: fireKnife(),
} as const satisfies Record<string, NewCreature>;
