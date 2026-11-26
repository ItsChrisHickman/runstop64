/**
 * The Andes' and the Amazon's scenery and the creatures of the rooms the back half brought back (docs/dosvidaniya-back-half-plan.md): what makes each room read as its real place at a glance, calmly
 * drawn (games/shared/monty/LESSONS.md, "How it looks"). The backdrops are tiles of the nothing class (he walks through them), each one pattern a room colours in its own palette: the cloud forest's
 * dark trees and the kapok's crown (the far ranges and the granite face are no room's now). Darker than anything solid and with no hard top edge, so none
 * reads as a floor. The landmarks: the Andes' snowy peaks on the horizon, Machu Picchu seen small and far below from the Inca bridge, and the riverboat's pilot house, funnel and paddle wheel (as THE RIVER QUEEN had them before
 * the reset). The creatures: a vizcacha on the Inca trail, a cock-of-the-rock and a spectacled bear in the cloud forest, and the riverboat's captain (his picture as it was). Names start `and`, as
 * the region's new pieces; they come after every other region's (world.ts), so nothing shipped moves.
 */
import { lay, pair } from './creature-kit';
import { decor } from './decorations';
import { limb, Raster } from './raster';
import { tile } from './tiles';
import type { NewCreature, NewDecor } from './types';

// ---- the backdrops (nothing-class tiles: a room's palette gives each its colour)

export const ANDES_SCENERY_TILES = {
  /** A far range of the Andes: the ridges of a mountainside seen from miles off, a few long diagonal folds, more dark than line. Scenery. Nothing. No room's since 2026-11-26 (it ran down behind the play as a fill: the ranges are `andPeaks` on the horizon); kept so no later tile moves. */
  andRange: tile('andRange', 0, 6, [
    '#.......',
    '.#......',
    '..#....#',
    '...#..#.',
    '....##..',
    '........',
    '.#......',
    '#.#.....',
  ]),
  /** A granite cliff face: long vertical joints, nothing across (so no line of it reads as a ledge). Scenery. Nothing. No room's since 2026-11-26 (THE INCA BRIDGE's face read as rain streaks filling the room); kept so no later tile moves. */
  andFace: tile('andFace', 0, 11, [
    '..#....#',
    '..#....#',
    '..#...#.',
    '.#....#.',
    '.#....#.',
    '.#...#..',
    '..#..#..',
    '..#..#..',
  ]),
  /** The forest seen behind: sparse leaves in the dark, more black than leaf, so the playfield stays clear. Scenery. Nothing. */
  andLeaves: tile('andLeaves', 0, 5, [
    '.##.....',
    '####....',
    '.##...#.',
    '.....###',
    '..#...#.',
    '.###....',
    '..#..##.',
    '....####',
  ]),
} as const;

// ---- the landmarks

/**
 * Machu Picchu seen from the Inca bridge's trail, small and far below: Huayna Picchu's steep green tooth rising over the saddle, the rounded shoulder of the mountain on the other side, the citadel's
 * grey ruins in a row on the saddle between them and the green terraces stepping down under it. 6 x 4 characters, every cell drawn (no box of black round it).
 */
function citadelFar(): NewDecor {
  const r = new Raster(48, 32);
  r.triangle(33, 0, 23, 22, 43, 22); r.rect(43, 18, 47, 22); r.triangle(43, 18, 47, 14, 47, 18); // Huayna Picchu, and the ridge falling off it east
  r.line(31, 6, 35, 10, false); r.line(29, 13, 37, 15, false); // its trail and terrace lines
  r.ellipse(4, 22, 9, 9); // the mountain's shoulder west
  r.rect(0, 22, 47, 31); // the saddle
  for (let x = 9; x < 31; x += 4) r.rect(x, 18, x + 2, 21); // the ruins: roofless houses in a row
  for (let y = 24; y < 32; y += 3) r.rect(0, y, 47, y, false); // the terraces stepping down
  return decor('andCitadelFar', 6, 4, r, ['555555', '555555', '5CCC55', '555555']);
}

/**
 * The far ranges of the Andes on the horizon: four peaks of different heights side by side, the tallest snow down its shoulders, the others snow on their tips, grey rock under the snow, each with its
 * shadow side cut by a ridge line. Drawn in the colours they are (white snow, grey rock), along the top band only (games/shared/monty/LESSONS.md: sky and distance live on the horizon, never a muted
 * dark-blue shape). 12 x 3 characters.
 */
function peaks(): NewDecor {
  const r = new Raster(96, 24);
  r.triangle(13, 4, 0, 23, 31, 23); // a peak at the west
  r.triangle(41, 0, 19, 23, 63, 23); // the tallest
  r.triangle(65, 9, 49, 23, 81, 23); // a lesser one in front of the next
  r.triangle(84, 3, 67, 23, 95, 23); // and one at the east
  for (const [x0, y0, x1, y1] of [[14, 6, 22, 22], [42, 2, 52, 22], [66, 11, 72, 22], [85, 5, 94, 22]] as const) r.line(x0, y0, x1, y1, false); // the shadow side's ridge
  return decor('andPeaks', 12, 3, r, ['111111111111', 'CCCC11CCCCCC', 'CCCCCCCCCCCC']);
}

/** The riverboat's funnel: a tall red stack with a black band and a puff of smoke. 2 x 3 characters (THE RIVER QUEEN's, as it was). */
function funnel(): NewDecor {
  const r = new Raster(16, 24);
  r.rect(3, 6, 12, 23); r.rect(2, 5, 13, 6);
  r.rect(3, 10, 12, 11, false); r.rect(3, 12, 12, 12);
  r.ellipse(8, 3, 4, 2.4); r.ellipse(5, 1, 3, 1.4);
  return decor('andFunnel', 2, 3, r, ['BB', '22', '22']);
}

/** The pilot house: a cabin with a row of windows, a wheel seen in one, a roof with its overhang. 5 x 3 characters (as it was). */
function pilotHouse(): NewDecor {
  const r = new Raster(40, 24);
  r.rect(0, 0, 39, 3); r.rect(3, 4, 36, 23);
  for (const x of [6, 15, 24]) r.rect(x, 8, x + 6, 15, false);
  r.rect(30, 8, 33, 15, false);
  for (const x of [6, 15, 24]) r.rect(x + 2, 9, x + 3, 14); // the glints, bars in the panes
  r.ellipse(31.5, 12, 1.8, 2.4); r.rect(31, 10, 32, 14, false); // the wheel
  r.rect(3, 19, 36, 19, false);
  return decor('andPilotHouse', 5, 3, r, ['22222', 'FFFFF', 'FFFFF']);
}

/** The paddle wheel at the stern: a ring of paddles round a hub. 4 x 4 characters (as it was). */
function paddleWheel(): NewDecor {
  const r = new Raster(32, 32);
  r.ring(15.5, 15.5, 14.5, 2);
  r.disc(15.5, 15.5, 3);
  for (let k = 0; k < 8; k++) { const a = (k * Math.PI) / 4; r.line(15.5, 15.5, 15.5 + Math.cos(a) * 14, 15.5 + Math.sin(a) * 14); r.line(16.5, 15.5, 16.5 + Math.cos(a) * 14, 15.5 + Math.sin(a) * 14); }
  r.rect(14, 14, 17, 17, false); r.rect(15, 15, 16, 16);
  return decor('andPaddleWheel', 4, 4, r, 2);
}

export const ANDES_SCENERY_DECOR = {
  andCitadelFar: citadelFar(),
  andPeaks: peaks(),
  andFunnel: funnel(),
  andPilotHouse: pilotHouse(),
  andPaddleWheel: paddleWheel(),
} as const satisfies Record<string, NewDecor>;

// ---- the creatures

/** A vizcacha hopping along the trail to the left: a rabbit's long ears laid back, a round face with a dark band under its big eye and long whiskers, a hunched body and a long tail curled up behind. */
function vizcacha(): NewCreature {
  const frame = (hop: number) => {
    const r = new Raster(16, 16);
    limb(r, 13, 11, 15, 6 - hop, 2); r.rect(14, 4 - hop, 15, 6 - hop); // the tail curled up
    r.ellipse(9.5, 11 - hop, 5, 3.6); // the hunched body
    lay(r, (s) => { limb(s, 11, 13 - hop, 12 + hop, 15, 2); limb(s, 7, 13 - hop, 6 - hop, 15, 2); }); // the legs
    lay(r, (s) => s.ellipse(4.5, 7 - hop, 4, 3.4)); // the head
    limb(r, 5, 4 - hop, 9, 0, 2); limb(r, 3, 4 - hop, 5, 0, 2); // the long ears, laid back
    r.cut(['###', '###'], 2, 6 - hop); r.set(3, 6 - hop); // the dark band and the eye lit in it
    r.cut(['#'], 0, 8 - hop); r.line(0, 9 - hop, 3, 9 - hop, false); // the nose and the mouth
    return r.rows();
  };
  return pair('andVizcacha', [frame(0), frame(1), frame(2), frame(1)], 15);
}

/** A cock-of-the-rock flying to the left: Peru's bright orange bird, the great fan of a crest over its beak, a round eye, black wings beating, a short dark tail. */
function cockOfTheRock(): NewCreature {
  const frame = (wing: number) => {
    const r = new Raster(16, 16);
    r.ellipse(9, 9, 5, 3.6); // the body
    r.rect(13, 8, 15, 10); r.rect(14, 10, 15, 11); // the tail
    r.disc(4.5, 6, 4); r.ellipse(3, 3, 3, 2.6); // the head and the crest fanned over it
    r.cut(['##', '##'], 3, 5); r.set(3, 5); // the eye
    r.line(0, 7, 1, 7, false); // the beak's line under the crest
    const tip = [2, 6, 11][wing] ?? 6;
    lay(r, (s) => { s.triangle(8, 8, 14, 8, 11, tip + 2); s.rect(9, 8, 13, 9); }); // the wing, up, level or down
    r.line(9, 9, 13, 9, false);
    return r.rows();
  };
  return pair('andCockOfTheRock', [frame(0), frame(1), frame(2), frame(1)], 8);
}

/** A spectacled bear ambling to the left: a big round head with round ears, the pale rings round its eyes that give it its name, a blunt snout, a heavy body on stout legs. */
function spectacledBear(): NewCreature {
  const frame = (a: number) => {
    const r = new Raster(16, 16);
    r.ellipse(10.5, 9.5, 5.4, 4); // the heavy body
    lay(r, (s) => { limb(s, 13, 11, 13 - a, 15, 3); limb(s, 8, 11, 8 + a, 15, 3); }); // the stout legs
    lay(r, (s) => { s.disc(5, 7, 4.6); s.disc(1.5, 2.5, 1.6); s.disc(8.5, 2.5, 1.6); }); // the round head and ears
    r.ring(3.5, 6.5, 1.8, 1); r.ring(7, 6.5, 1.8, 1); // the spectacles, pale rings round the eyes (cut, then the eyes lit)
    r.cut(['#', '#'], 1, 6); r.cut(['#', '#'], 9, 6);
    r.rect(1, 9, 4, 11); r.cut(['##'], 1, 9); // the blunt snout and its nose
    r.cut(['###'], 2, 11); // the mouth
    return r.rows();
  };
  return pair('andSpectacledBear', [frame(1.5), frame(0), frame(-1.5), frame(0)], 9);
}

/** The riverboat's captain, seen front on: a white-topped cap with a wide peak and a badge, small eyes over a great beard with a pipe in it, a jersey striped across, arms folded; he rocks from foot to foot (as THE RIVER QUEEN had him). */
function captain(): NewCreature {
  const frame = (k: number): string[] => {
    const r = new Raster(16, 16);
    r.ellipse(8, 2.5, 5, 2.6); r.rect(3, 3, 12, 4); // the cap's crown
    r.rect(1, 5, 14, 6); // the peak, wide
    r.rect(2, 4, 13, 4, false); r.cut(['##', '##'], 7, 1); // the band, the badge
    r.rect(4, 7, 11, 9); // the face
    r.cut(['#'], 5, 8); r.cut(['#'], 10, 8); // the eyes
    r.ellipse(8, 11.5, 5, 3); // the great beard
    r.cut(['#####'], 3, 11); r.rect(10, 11, 14, 11); r.rect(13, 12, 14, 13); // the mouth cut in it, the pipe's stem and bowl
    r.rect(13, 12, 14, 12, false);
    r.rect(1, 13, 14, 15); // the jersey and folded arms
    for (const y of [13, 15]) r.rect(2, y, 13, y, false); // the stripes
    r.rect(7, 13, 8, 15, false); // the arms' join
    if (k & 1) { r.rect(1, 15, 3, 15, false); r.rect(12, 15, 14, 15, false); }
    return r.rows();
  };
  return pair('andCaptain', [frame(0), frame(1), frame(0), frame(1)], 1, true);
}

export const ANDES_SCENERY_CREATURES = {
  andVizcacha: vizcacha(),
  andCockOfTheRock: cockOfTheRock(),
  andSpectacledBear: spectacledBear(),
  andCaptain: captain(),
} as const satisfies Record<string, NewCreature>;
