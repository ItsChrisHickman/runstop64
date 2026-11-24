/**
 * The Pacific's pieces new with the reset (docs/dosvidaniya-reset.md): the palm's trunk, Hana's surge streaks, Hilo's splitting crust, the lava's crest and the steam vent, the hotel's front and its arcade's
 * pillars, the glow of Hilo's lava seen from the sea, Kilauea far off, the nene and the rooster.
 * Monty on the Run's manner: one ink, solid shapes cut with black lines, no dither; backdrops dark and plain. Names start `pac`.
 */
import { creatureBank, mirrored } from './pixels';
import { Raster } from './raster';
import { decor } from './decorations';
import { tile } from './tiles';
import type { NewCreature, NewDecor } from './types';

export const PACIFIC_RESET_TILES = {
  /** A palm's trunk to climb: ringed segments, leaning a little. A rope. */
  pacPalmTrunk: tile('pacPalmTrunk', 3, 9, [
    '..####..',
    '.#####..',
    '..####..',
    '...####.',
    '..####..',
    '.#####..',
    '..####..',
    '...####.',
  ]),
  /** Aloha Tower's face: pale stone courses with a dark window slit in each. Solid. */
  pacTowerFace: tile('pacTowerFace', 1, 1, [
    '########',
    '###..###',
    '###..###',
    '###..###',
    '########',
    '........',
    '########',
    '########',
  ]),
  /** The surge going by: the flat sea cut by black streaks running west. Nothing (a pulse draws it while a set runs). */
  pacSurge: tile('pacSurge', 0, 6, [
    '########',
    '...#####',
    '####....',
    '########',
    '########',
    '#....###',
    '######..',
    '########',
  ]),
  /** The crust about to go: split by black cracks. Solid. */
  pacCrustSplit: tile('pacCrustSplit', 1, 9, [
    '###.####',
    '###..###',
    '##.#..##',
    '#..##..#',
    '.####...',
    '####.#.#',
    '###..###',
    '##..####',
  ]),
  /** The lava's surface: the crest, bubbles breaking. Deadly (the lava's own death; a passable character the mechanism draws). */
  pacMagmaCrest: tile('pacMagmaCrest', 4, 7, [
    '.#..#...',
    '#.##.##.',
    '########',
    '########',
    '#.######',
    '########',
    '####.###',
    '########',
  ]),
  /** The vent blowing: a column of steam. Nothing (the pulse is the danger). */
  pacSteam: tile('pacSteam', 0, 1, [
    '.##..##.',
    '########',
    '.######.',
    '..####..',
    '.######.',
    '########',
    '.##..##.',
    '..####..',
  ]),
} as const;

// ---- the decorations

/** The hotel's front under its lawn: a row of dark windows in the wall (one character laid over the cells, `fillCells`). */
function hotelFront(): NewDecor {
  const r = new Raster(8, 8);
  r.rect(0, 0, 7, 7); r.rect(2, 2, 5, 5, false); r.rect(0, 7, 7, 7, false);
  return decor('pacHotelFront', 1, 1, r, 2);
}

/** A pillar of the hotel's arcade, standing on the sand: a column of stone with its fluting. */
function pillar(): NewDecor {
  const r = new Raster(8, 8);
  r.rect(2, 0, 5, 7); r.rect(4, 0, 4, 7, false);
  return decor('pacPillar', 1, 1, r, 2);
}

/** Hilo's lava seen through a gap in Hana's rock: a red glow, brighter at the far side. 2 x 3 characters. */
function glow(): NewDecor {
  const r = new Raster(16, 24);
  for (let y = 0; y < 24; y++) for (let x = 0; x < 16; x++) if ((x + y) % 3 !== 0 || x > 11) r.set(x, y);
  r.rect(0, 0, 15, 0, false); r.rect(0, 23, 15, 23, false);
  return decor('pacGlow', 2, 3, r, 2);
}

/** A palm's crown over its trunk: fronds drooping either way. 4 x 2 characters. */
function fronds(): NewDecor {
  const r = new Raster(32, 16);
  for (const [x1, y1] of [[0, 12], [4, 15], [31, 12], [27, 15], [8, 2], [24, 2]] as const) { r.line(16, 6, x1, y1); r.line(16, 7, x1, y1 + 1); }
  r.disc(16, 7, 2.5);
  return decor('pacFronds', 4, 2, r, 5);
}

/** Hana's sea, one flat dark blue (laid over every empty cell, `fillCells`). */
function seaFlat(): NewDecor {
  const r = new Raster(8, 8);
  r.rect(0, 0, 7, 7);
  return decor('pacSeaFlat', 1, 1, r, 6);
}

export const PACIFIC_RESET_DECOR = {
  pacHotelFront: hotelFront(),
  pacPillar: pillar(),
  pacGlow: glow(),
  pacFronds: fronds(),
  pacSeaFlat: seaFlat(),
} as const satisfies Record<string, NewDecor>;

// ---- the creatures

function pair(name: string, left: readonly (readonly string[])[], colour: number): NewCreature {
  return { frames: creatureBank(name, left, left.map(mirrored)), copy: false, colour };
}

/** The nene, Hawaii's goose: a black-striped neck stretched forward, a round body, webbed feet stepping; it walks with its head bobbing. */
function nene(): NewCreature {
  const frame = (step: number) => {
    const r = new Raster(16, 16);
    r.ellipse(9, 9, 5.5, 3.5); // the body
    r.rect(3, 3 + (step & 1), 4, 9); r.disc(3, 3 + (step & 1), 2.2); r.rect(0, 3 + (step & 1), 1, 4 + (step & 1)); // the neck, the head, the bill
    r.set(3, 2 + (step & 1), false); // the eye
    r.line(6, 8, 13, 8, false); r.line(7, 10, 12, 10, false); // the wing's barring
    const a = [0, 1, 0, -1][step] ?? 0;
    r.line(8, 12, 8 + a, 15); r.line(11, 12, 11 - a, 15); r.rect(7 + a, 15, 9 + a, 15); r.rect(10 - a, 15, 12 - a, 15); // the legs and feet
    return r.rows();
  };
  return pair('pacNene', [0, 1, 2, 3].map(frame), 7);
}

/** A loose rooster (Hawaii's feral chickens): a comb, a beak, a puffed chest, a tail of curved feathers, strutting. */
function rooster(): NewCreature {
  const frame = (step: number) => {
    const r = new Raster(16, 16);
    r.ellipse(8, 9, 4.5, 3.5); // the body
    r.disc(4, 4, 2.4); r.rect(3, 4, 5, 8); // the head and neck
    r.rect(3, 0, 5, 1); r.set(2, 1); r.set(6, 1); // the comb
    r.rect(0, 4, 1, 4); r.set(1, 5); // the beak
    r.set(4, 3, false); // the eye
    r.line(12, 8, 15, 2); r.line(13, 9, 15, 5); r.line(11, 7, 13, 1); // the tail's feathers
    r.line(6, 9, 10, 9, false); // the wing
    const a = [0, 1, 0, -1][step] ?? 0;
    r.line(7, 12, 7 + a, 15); r.line(10, 12, 10 - a, 15); r.rect(6 + a, 15, 8 + a, 15); r.rect(9 - a, 15, 11 - a, 15);
    return r.rows();
  };
  return pair('pacRooster', [0, 1, 2, 3].map(frame), 10);
}

export const PACIFIC_RESET_CREATURES = {
  pacNene: nene(),
  pacRooster: rooster(),
} as const satisfies Record<string, NewCreature>;

