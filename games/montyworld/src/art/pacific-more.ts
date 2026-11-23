/**
 * The Pacific's second pass (docs/dosvidaniya-pacific.md, "Pacific v2"): the pieces the redesigned rooms are made of beyond the first build's (pacific-tiles.ts, pacific-decor.ts, pacific-creatures.ts):
 * the luau's feast and show (hula dancers, drummers, the earth oven, the fire-knife dancer), Waikiki's hotel facade and the whole of Diamond Head, the crater trail's and the bunker's pieces, the tern of
 * Molokai, the crane of the ship, the moray's hole, Hana's black-sand pieces, Hilo's conveyor truck and cargo door. Same manner as the rest (solid ink with black-line detail); names start `pac` and are
 * in no other region.
 */
import { decor } from './decorations';
import { pair } from './creature-kit';
import { tile } from './tiles';
import { limb, Raster } from './raster';
import type { NewCreature, NewDecor } from './types';

// ---- tiles

export const PACIFIC_MORE_TILES = {
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
} as const;

// ---- decorations

/** The crane's jib out from the tower over the deck: a truss on its beam, the beam's underside where the crate's hook runs. 7 x 2 characters. */
function craneJib(): NewDecor {
  const r = new Raster(56, 16);
  r.rect(0, 12, 55, 15); r.rect(0, 14, 55, 14, false); // the beam, a line along it
  r.line(0, 12, 27, 2); r.line(27, 2, 55, 12); r.line(0, 11, 27, 1); r.line(27, 1, 55, 11); // the truss over it
  for (let x = 6; x < 55; x += 7) r.rect(x, 8, x, 11); // the verticals
  return decor('pacCraneJib', 7, 2, r, 14);
}

export const PACIFIC_MORE_DECOR = {
  pacCraneJib: craneJib(),
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
  return pair('pacTern', [frame(-1), frame(0), frame(1), frame(0)], 3, true);
}

export const PACIFIC_MORE_CREATURES = {
  pacTern: tern(),
} as const satisfies Record<string, NewCreature>;
