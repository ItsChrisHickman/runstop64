/**
 * Hawaii's island hopping brought back (docs/dosvidaniya-back-half-plan.md, "Hawaii"): the pieces of the first build and its second pass that the 2026-11-23 reset took out (art/pacific-*.ts at
 * 8cbd446^), restored as they were drawn, for the rooms that came back: the luau's show (the sunset's bands, the sun, the stage, the drums and drummers, the hula dancers, the fire-knife dancer, the
 * tiki torches, the earth oven, the roast pig, the feast, the lei's arch), Diamond Head's trail and the bunker's lookout, the reefs' kelp, sea fans, bubbles and Molokai's sea cliffs, Lahaina's
 * outrigger and the whale's tail, the Road to Hana's road, bridges, bamboo, lane signs, waterfalls and red cars, Hana's bread stand and swash, the coffee trees and sacks, the lava rocks; the crab,
 * the eel, the manta, the tiki and the surfer. They come after every region's art (world.ts), so no piece of the shipped regions moves. Names start `pac`, as the rest of the Pacific's.
 */
import { decor } from './decorations';
import { creatureBank, mirrored, shifted } from './pixels';
import { splashRows, streakRows } from './pacific-falls';
import { limb, over, Raster } from './raster';
import { tile } from './tiles';
import type { NewCreature, NewDecor } from './types';

/** A shape on its own raster, laid over `r` with a black moat round it (raster.ts `over`). */
function lay(r: Raster, draw: (s: Raster) => void) {
  const s = new Raster(16, 16);
  draw(s);
  over(r, s);
}

/** The four frames of a creature that goes left, and its mirror for going right. */
function pair(name: string, left: readonly (readonly string[])[], colour: number, copy = false): NewCreature {
  return { frames: creatureBank(name, left, left.map(mirrored)), copy, colour };
}

/** A beach crab, front on: two raised claws that snap, eyes on stalks, six legs. */
function crab(): NewCreature {
  const frame = (a: number, snap: boolean) => {
    const r = new Raster(16, 16);
    r.ellipse(7.5, 10, 5.8, 3.6); // the body
    lay(r, (s) => { for (let k = 0; k < 3; k++) { limb(s, 3 - k, 11 + k * 0.4, 0 + a * (k % 2 ? 1 : -1), 13 + k * 1, 1); limb(s, 12 + k, 11 + k * 0.4, 15 - a * (k % 2 ? 1 : -1), 13 + k * 1, 1); } });
    lay(r, (s) => { // the claws up
      limb(s, 3, 8, 1, 4, 2); limb(s, 12, 8, 14, 4, 2);
      s.disc(1.6, 2.4, 2.8); s.disc(13.4, 2.4, 2.8);
    });
    r.cut(snap ? ['#', '#', '#'] : ['#'], 1, 1); r.cut(snap ? ['#', '#', '#'] : ['#'], 14, 1); // the claws' gape
    r.rect(5, 5, 5, 7); r.rect(10, 5, 10, 7); r.disc(5, 4.4, 1.4); r.disc(10, 4.4, 1.4); // eye stalks and eyes
    r.set(5, 4, false); r.set(10, 4, false);
    r.cut(['#####'], 5, 10); r.rect(5, 9, 5, 9); r.rect(9, 9, 9, 9); // a wide grin
    return r.rows();
  };
  return pair('pacCrab', [frame(-1, true), frame(0, false), frame(1, true), frame(0, false)], 2, true);
}

/** A moray swimming to the left: a big head with a ringed eye, the jaws snapping on their teeth, a thick body that waves. */
function eel(): NewCreature {
  const frame = (ph: number, open: boolean) => {
    const r = new Raster(16, 16);
    for (let x = 7; x < 16; x++) {
      const y = 9 + 2.4 * Math.sin((x - ph * 2.2) / 1.9);
      r.rect(x, Math.round(y - 2.5), x, Math.round(y + 2.5));
    }
    r.ellipse(5, 8, 5.6, 5); // the head
    r.cut(open ? ['######', '######', '######'] : ['######'], 0, open ? 9 : 10); // the jaws
    r.stamp(['#.#.#.'], 0, open ? 8 : 9); // upper teeth
    if (open) r.stamp(['.#.#.#'], 0, 12);
    r.cut(['###', '###', '###'], 4, 3); r.rect(5, 4, 5, 4); // the eye
    return r.rows();
  };
  return pair('pacEel', [frame(0, true), frame(1, false), frame(2, true), frame(3, false)], 13);
}

/** A manta ray flapping, front on like the bat: wings down, level, up, level; a body with two horns, two big eyes and a wide mouth, a long tail. */
function manta(): NewCreature {
  const frame = (wing: number) => {
    const r = new Raster(16, 16);
    const tip = [11, 6, 1, 6][wing] ?? 6;
    lay(r, (s) => { s.triangle(5, 5, 0, tip, 1, tip + 5); s.triangle(5, 5, 1, tip + 5, 6, 12); s.triangle(10, 5, 15, tip, 14, tip + 5); s.triangle(10, 5, 14, tip + 5, 9, 12); }); // the wings
    r.ellipse(7.5, 8, 4.4, 5.6); // the body
    lay(r, (s) => { s.triangle(3.4, 0, 3.4, 4, 5.8, 4); s.triangle(11.6, 0, 11.6, 4, 9.2, 4); }); // the horns
    r.rect(7, 12, 8, 15); // the tail
    r.cut(['##', '##'], 4, 5); r.cut(['##', '##'], 9, 5); r.rect(5, 5, 5, 5); r.rect(10, 5, 10, 5); // the eyes
    r.cut(['#####'], 5, 9); r.cut(['#..#'], 5.5, 11); // the mouth
    r.rect(2, tip + 3, 2, tip + 5, false); r.rect(13, tip + 3, 13, tip + 5, false);
    return r.rows();
  };
  return pair('pacManta', [0, 1, 2, 3].map(frame), 14, true);
}

/** A floating tiki head: a flat brow, great round eyes, a wide nose, the mouth open with tusks, bobbing as it goes. */
function tiki(): NewCreature {
  const frame = (bob: number, wide: boolean) => {
    const r = new Raster(16, 16);
    r.rect(1, 1 + bob, 14, 14 + bob);
    r.rect(0, 3 + bob, 15, 4 + bob); r.rect(2, 0 + bob, 13, 0 + bob); // the brow ridge
    r.cut(['.##.', '####', '####', '.##.'], 2, 5 + bob); r.cut(['.##.', '####', '####', '.##.'], 10, 5 + bob); // the eyes
    r.rect(4, 6 + bob, 5, 7 + bob); r.rect(11, 6 + bob, 12, 7 + bob); // the pupils
    r.cut(['#.#'], 6, 9 + bob); r.rect(7, 7 + bob, 8, 9 + bob); // the nose
    r.cut(wide ? ['########', '########'] : ['########'], 4, 11 + bob);
    r.rect(5, 11 + bob, 5, 12 + bob); r.rect(10, 11 + bob, 10, 12 + bob); // the tusks
    r.rect(0, 15, 1, 15 - 0); r.rect(14, 15, 15, 15);
    r.rect(3, 15, 12, 15, false);
    return r.rows();
  };
  return pair('pacTiki', [frame(0, true), frame(1, false), frame(0, true), frame(-1, false)].map((rows) => rows), 9, true);
}

/** The surfer's first pose, row by row: his right arm up in a wave, the other down, the board under his feet. */
const SURFER: readonly string[] = [
  '....#.#..#.#..#.',
  '...##########.##',
  '...##########.#.',
  '...#..####..#.#.',
  '...#..####..###.',
  '...##########.#.',
  '....#......#.#..',
  '.....######..#..',
  '..############..',
  '.##.#.####.#.##.',
  '.##.########.##.',
  '.#..##....##..#.',
  '....##....##....',
  '....##....##....',
  '.##############.',
  '..############..',
];

function surfer(): NewCreature {
  const waveLeft = mirrored(SURFER);
  const left = [SURFER, shifted(waveLeft, 1), SURFER, shifted(waveLeft, 1)];
  return pair('pacSurfer', left, 8);
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
  return pair('pacFireKnife', [frame(0), frame(1), frame(2), frame(3)], 1, true);
}

/** A tiki torch: a bamboo pole and a bowl with its flame. 1 x 3 characters. */
function tikiTorch(): NewDecor {
  const r = new Raster(8, 24);
  r.ellipse(3.5, 4, 2, 3.4); r.rect(3, 0, 4, 2); r.rect(3, 3, 4, 6, false); // the flame, a core cut out
  r.rect(1, 8, 6, 9); r.rect(2, 10, 5, 10);
  r.rect(3, 11, 4, 23);
  return decor('pacTikiTorch', 1, 3, r, ['7', '9', '9']);
}

/** A tiki totem: three carved heads stacked, eyes, tusks and open mouths. 2 x 3 characters. */
function totem(): NewDecor {
  const r = new Raster(16, 24);
  r.rect(1, 0, 14, 23);
  for (const y of [0, 8, 16]) {
    r.rect(3, y + 2, 5, y + 3, false); r.rect(10, y + 2, 12, y + 3, false); // eyes
    r.rect(5, y + 5, 10, y + 6, false); r.rect(6, y + 5, 6, y + 5); r.rect(9, y + 5, 9, y + 5); // mouth and teeth
    r.rect(1, y + 7, 14, y + 7, false);
  }
  return decor('pacTotem', 2, 3, r, ['99', '99', '99']);
}

/** A roast pig on a spit over the pit: the pig on its pole, the fire's flames under. 3 x 2 characters. */
function roastPig(): NewDecor {
  const r = new Raster(24, 16);
  r.rect(0, 7, 23, 7); r.rect(0, 5, 0, 9); r.rect(23, 5, 23, 9); // the spit
  r.ellipse(11, 5, 8, 3.4); r.ellipse(19, 4, 3, 2.8); r.rect(21, 4, 23, 4, false); r.set(20, 3, false); // pig and head
  r.rect(4, 6, 6, 8); r.rect(14, 6, 16, 8); // trotters
  r.rect(2, 11, 21, 15); r.triangle(4, 15, 6, 10, 9, 15, false); r.triangle(12, 15, 15, 10, 18, 15, false);
  return decor('pacRoastPig', 3, 2, r, ['888', '222']);
}

/** Molokai's sea cliffs: a wall of green fluted ridges falling to the sea, their folds as black lines. 4 x 8 characters. */
function seaCliff(name: string, shift: number): NewDecor {
  const r = new Raster(32, 64);
  for (let y = 0; y < 64; y++) r.rect(Math.max(0, Math.round(shift + 3 * Math.sin(y / 9))), y, 31, y);
  for (const x of [4, 10, 16, 22, 28]) {
    for (let y = 0; y < 64; y++) r.set(x + Math.round(2 * Math.sin((y + x) / 6)), y, false);
    r.line(x, 0, x + 1, 63, false);
  }
  for (let y = 7; y < 64; y += 14) r.rect(0, y, 31, y, false);
  return decor(name, 4, 8, r, 5);
}

/** A fan of coral: a spread of branches from one stalk. 2 x 3 characters. */
function seaFan(): NewDecor {
  const r = new Raster(16, 24);
  r.rect(7, 16, 8, 23);
  for (const x of [1, 4, 7, 10, 13]) r.line(7.5, 17, x + 1, 1); for (const x of [2, 7, 12]) r.rect(x, 1, x + 1, 2);
  r.line(0, 8, 15, 8, false); r.line(3, 13, 12, 13, false);
  return decor('pacSeaFan', 2, 3, r, 10);
}

/** A strand of kelp: a slow wave in a long ribbon. 1 x 3 characters. */
function kelp(): NewDecor {
  const r = new Raster(8, 24);
  for (let y = 0; y < 24; y++) r.rect(Math.round(3 + 2 * Math.sin(y / 3)), y, Math.round(4 + 2 * Math.sin(y / 3)), y);
  for (const y of [5, 12, 19]) { r.rect(Math.round(1 + 2 * Math.sin(y / 3)), y, Math.round(3 + 2 * Math.sin(y / 3)), y + 1); }
  return decor('pacKelp', 1, 3, r, 5);
}

/** A rise of bubbles: three rings, small to large. 1 x 2 characters. */
function bubbles(): NewDecor {
  const r = new Raster(8, 16);
  r.ring(4, 12, 1.5, 1); r.ring(3, 7, 2, 1); r.ring(4.5, 2, 2, 1);
  return decor('pacBubbles', 1, 2, r, 1);
}

/** A cascade: a stream falling over a lip in lines, its splash and mist at the foot. 2 x 5 characters (the streaks and the splash move: pacific-falls.ts, a `charAnims` cycle in the rooms that have it). */
function waterfall(): NewDecor {
  const r = new Raster(16, 40);
  r.rect(0, 0, 15, 2); r.rect(2, 3, 4, 5); r.rect(7, 3, 9, 6); r.rect(12, 3, 13, 5); // the lip and the water leaving it
  r.stamp(streakRows(0), 0, 8);
  r.stamp(splashRows(0), 0, 32);
  return decor('pacWaterfall', 2, 5, r, ['55', '33', '33', '33', '11']);
}

/** A clump of bamboo: three stalks with their rings, leaves out at the top. 2 x 4 characters. */
function bambooClump(): NewDecor {
  const r = new Raster(16, 32);
  for (const x of [2, 7, 12]) { r.rect(x, 5, x + 1, 31); for (let y = 9; y < 31; y += 7) r.rect(x - 1, y, x + 2, y, false); }
  for (const [x, y, dx] of [[2, 5, -2], [7, 3, 0], [12, 5, 2], [7, 5, 6], [8, 5, -6]] as const) r.triangle(x, y, x + dx - 1, y - 4, x + dx + 3, y - 1);
  return decor('pacBambooClump', 2, 4, r, 13);
}

/** A road sign: a triangle on a post, with a bar across it (a one-lane bridge). 1 x 2 characters. */
function laneSign(): NewDecor {
  const r = new Raster(8, 16);
  r.triangle(3.5, 0, 0, 8, 7, 8); r.rect(0, 8, 7, 8);
  r.triangle(3.5, 3, 2, 7, 5, 7, false); r.rect(3, 9, 4, 15);
  return decor('pacLaneSign', 1, 2, r, ['7', '9']);
}

/** An outrigger canoe on the water: the long hull, the float on its booms. 4 x 2 characters. */
function outrigger(): NewDecor {
  const r = new Raster(32, 16);
  r.rect(2, 6, 29, 8); r.triangle(0, 4, 3, 9, 3, 4); r.triangle(31, 4, 28, 9, 28, 4);
  r.rect(8, 9, 22, 9); r.rect(9, 3, 9, 5); r.rect(20, 3, 20, 5); // two paddlers' seats
  r.rect(7, 10, 8, 12); r.rect(21, 10, 22, 12); r.rect(3, 12, 26, 14); r.rect(5, 13, 24, 13, false); // booms and float
  return decor('pacOutrigger', 4, 2, r, 7);
}

/** A whale's tail breaching over the harbour: two flukes and the stock they rise from. 3 x 2 characters. */
function whaleTail(): NewDecor {
  const r = new Raster(24, 16);
  r.rect(10, 6, 13, 15); r.triangle(11.5, 8, 0, 0, 10, 4); r.triangle(11.5, 8, 23, 0, 13, 4);
  r.rect(11, 8, 12, 14, false);
  return decor('pacWhaleTail', 3, 2, r, 14);
}

/** A coffee tree: a glossy bush with its red cherries. 3 x 3 characters. */
function coffeeTree(): NewDecor {
  const r = new Raster(24, 24);
  r.rect(11, 14, 12, 23); r.ellipse(11.5, 9, 11, 8);
  for (let k = 0; k < 4; k++) r.line(2 + k * 6, 9, 5 + k * 6, 3, false);
  for (const [x, y] of [[5, 9], [11, 6], [17, 10], [9, 12], [14, 4]] as const) { r.rect(x, y, x + 1, y + 1, false); }
  return decor('pacCoffeeTree', 3, 3, r, ['555', '555', '999']);
}

/** Sacks of coffee beans stacked at the farm, tied at the neck. 2 x 2 characters. */
function sacks(): NewDecor {
  const r = new Raster(16, 16);
  for (const [x, y] of [[0, 8], [8, 8], [4, 1]] as const) {
    r.ellipse(x + 3.5, y + 4.5, 4, 3.6); r.rect(x + 2, y, x + 5, y + 1); r.rect(x + 3, y + 1, x + 4, y + 1, false);
  }
  return decor('pacSacks', 2, 2, r, 9);
}

/** Lava rocks: three black boulders in a heap. 2 x 1 characters. */
function lavaRocks(): NewDecor {
  const r = new Raster(16, 8);
  r.ellipse(4, 5, 4, 3); r.ellipse(11, 5, 5, 3); r.ellipse(8, 3, 3, 2.6);
  r.line(3, 3, 5, 6, false); r.line(11, 3, 12, 7, false);
  return decor('pacLavaRocks', 2, 1, r, 11);
}

/** One character of sunset sky: lines of `colour` that thicken from the purple at the top to the gold at the horizon (placed a cell at a time over the room, as China's wall cells are). */
function skyBand(name: string, rows: readonly string[], colour: number): NewDecor {
  const r = new Raster(8, 8);
  r.stamp(rows, 0, 0);
  return decor(name, 1, 1, r, colour);
}

/** The sun on the sea's edge: a half disc with the black stripes of a retro sunset cut across its lower half. 4 x 2 characters. */
function sun(): NewDecor {
  const r = new Raster(32, 16);
  r.disc(15.5, 16, 15.5);
  for (const y of [8, 11, 14]) r.rect(0, y, 31, y, false);
  return decor('pacSun', 4, 2, r, 7);
}

/** A cell of the stage: planks over a grass-skirt fringe. 1 x 2 characters. */
function stageBoard(): NewDecor {
  const r = new Raster(8, 16);
  r.stamp(['########', '########', '........', '########', '########', '........', '########', '########'], 0, 0);
  r.stamp(['########', '.##.##.#', '.##.##.#', '.##.##.#', '.#..#..#', '.#..#..#', '.#..#..#', '........'], 0, 8);
  return decor('pacStageBoard', 1, 2, r, ['8', 'd']);
}

/** Two conga drums, striped. 2 x 2 characters. */
function drums(): NewDecor {
  const r = new Raster(16, 16);
  r.ellipse(3.5, 5, 3.5, 1.6); r.rect(1, 6, 6, 14); r.rect(1, 9, 6, 9, false); r.rect(1, 12, 6, 12, false);
  r.ellipse(11.5, 3, 3.5, 1.6); r.rect(9, 4, 14, 14); r.rect(9, 7, 14, 7, false); r.rect(9, 10, 14, 10, false);
  return decor('pacDrums', 2, 2, r, ['88', '99']);
}

/** The feast: a long low table with a cloth, platters of coconut shrimp and fruit on it. 6 x 2 characters. */
function feast(): NewDecor {
  const r = new Raster(48, 16);
  for (let k = 0; k < 5; k++) { r.ellipse(5 + k * 9, 6, 4, 2); r.rect(2 + k * 9, 7, 8 + k * 9, 7, false); r.set(4 + k * 9, 4, false); }
  r.rect(0, 8, 47, 11); r.rect(0, 12, 47, 12, false); r.rect(2, 12, 3, 15); r.rect(44, 12, 45, 15); r.rect(0, 13, 47, 13);
  for (let x = 1; x < 47; x += 4) r.rect(x, 9, x, 10, false);
  return decor('pacFeast', 6, 2, r, ['787878', '222222']);
}

/** The top of a frangipani arch: a curved bough strung with blossoms. 4 x 2 characters. */
function archTop(): NewDecor {
  const r = new Raster(32, 16);
  r.ring(15.5, 17, 15, 3);
  for (const [x, y] of [[3, 9], [7, 4], [13, 2], [19, 2], [25, 4], [29, 9]] as const) { r.disc(x, y, 2); r.set(x, y, false); }
  return decor('pacArchTop', 4, 2, r, 10);
}

/** One leg of the arch: a post wound with blossoms. 1 x 2 characters. */
function archLeg(): NewDecor {
  const r = new Raster(8, 16);
  r.rect(3, 0, 4, 15);
  for (const y of [2, 7, 12]) { r.disc(2, y, 1.5); r.disc(5, y + 2, 1.5); }
  return decor('pacArchLeg', 1, 2, r, ['a', '5']);
}

/** A stand of surfboards: a rack with four boards leaning, their stripes. 3 x 2 characters. */
function surfboards(): NewDecor {
  const r = new Raster(24, 16);
  r.rect(0, 14, 23, 15); r.rect(2, 8, 2, 14); r.rect(21, 8, 21, 14);
  for (const [x, w] of [[3, 3], [8, 3], [13, 3], [18, 3]] as const) {
    r.ellipse(x + 1, 6, w / 2, 6); r.rect(x + 1, 1, x + 1, 11, false); r.rect(x - 1, 8, x + 3, 8, false);
  }
  return decor('pacSurfboards', 3, 2, r, ['777', '222']);
}

/** A beach umbrella: a scalloped canopy on a pole, a stripe up its panels. 3 x 2 characters. */
function umbrella(): NewDecor {
  const r = new Raster(24, 16);
  r.ellipse(11.5, 6, 11.5, 6); r.rect(0, 6, 23, 12, false);
  r.rect(0, 5, 23, 6); for (const x of [3, 7, 11, 15, 19]) r.rect(x, 5, x, 6, false);
  for (const x of [1, 6, 11, 16, 21]) r.rect(x, 7, x + 1, 8);
  r.rect(11, 6, 12, 15); r.rect(0, 15, 23, 15, false);
  return decor('pacUmbrella', 3, 2, r, ['222', '999']);
}

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

/** A palm: a leaning trunk ringed with growth, a crown of long drooping fronds, a bunch of coconuts. `w` x `h` characters. */
function palmOf(w: number, h: number, name: string): NewDecor {
  const r = new Raster(w * 8, h * 8);
  const cx = Math.round(w * 4), top = Math.round(h * 2.2);
  for (let y = top; y < h * 8; y++) {
    const lean = Math.round(((h * 8 - y) / (h * 8 - top)) * (w * 1.2));
    r.rect(cx - 2 - lean + 3, y, cx - lean + 3, y);
    if (y % 4 === 0) r.rect(cx - 2 - lean + 3, y, cx - 2 - lean + 3, y, false);
  }
  const tx = cx + 3 - 0, ty = top;
  const reach = w * 3.6;
  for (const [dx, dy] of [[-reach, 3], [-reach * 0.7, -3], [reach * 0.7, -3], [reach, 3], [0, -8], [-reach * 0.4, 7], [reach * 0.4, 7]] as const) {
    r.line(tx, ty, tx + dx, ty + dy + 4); r.line(tx, ty + 1, tx + dx, ty + dy + 5); r.line(tx, ty - 1, tx + dx, ty + dy + 3);
  }
  r.disc(tx - 1, ty + 4, 1.6); r.disc(tx + 3, ty + 4, 1.6); // coconuts
  r.set(tx - 2, ty + 4, false); r.set(tx + 2, ty + 4, false);
  const rows = Array.from({ length: h }, (_, j) => (j < Math.ceil(h * 0.45) ? '5'.repeat(w) : '9'.repeat(w)));
  return decor(name, w, h, r, rows);
}


// ---- new for the Big Island's fork (2026-11-25): Mauna Kea's observatories

/** An observatory's dome on its drum, small and far along the summit ridge: the white dome, a seam, the drum's band and door. 3 x 3 characters. */
function domeSmall(): NewDecor {
  const r = new Raster(24, 24);
  r.ellipse(11.5, 12, 10, 10); r.rect(0, 12, 23, 23, false); // the dome
  r.rect(2, 13, 21, 23); // the drum
  r.rect(11, 2, 12, 11, false); // the shutter's seam
  r.rect(2, 15, 21, 15, false); // the drum's band
  r.rect(9, 18, 14, 23, false); r.rect(10, 19, 13, 23); r.rect(11, 19, 12, 23, false); // the door
  return decor('pacDomeSmall', 3, 3, r, 1);
}

/** The big telescope's dome, its slit open on the night and the telescope's barrel pointing out of it at the sky, on its tall drum with the catwalk's rail round it. 6 x 5 characters. */
function domeBig(): NewDecor {
  const r = new Raster(48, 40);
  r.ellipse(23.5, 22, 21, 20); r.rect(0, 22, 47, 39, false); // the dome
  r.rect(19, 3, 28, 21, false); // the slit, open
  r.line(20, 18, 33, 2); r.line(21, 18, 34, 3); r.line(22, 18, 35, 4); r.line(21, 19, 34, 3); r.rect(32, 0, 37, 4); r.rect(33, 1, 36, 3, false); // the barrel and its mouth
  r.rect(3, 23, 44, 39); // the drum
  r.rect(3, 26, 44, 26, false); r.rect(3, 33, 44, 33, false); // its bands
  r.rect(8, 28, 11, 31, false); r.rect(36, 28, 39, 31, false); // windows
  return decor('pacDomeBig', 6, 5, r, ['111111', '111111', '111111', '111111', 'ffffff']);
}

/** The summit's marker: a cairn of red cinder stones with a pole. 1 x 2 characters. */
function cairn(): NewDecor {
  const r = new Raster(8, 16);
  r.rect(3, 0, 4, 8); r.rect(2, 0, 5, 1); // the pole and its flag's knot
  r.ellipse(3.5, 10, 2.5, 1.5); r.ellipse(3.5, 13, 3.5, 1.8); r.rect(0, 14, 7, 15);
  r.rect(1, 12, 6, 12, false);
  return decor('pacCairn', 1, 2, r, ['1', 'a']);
}

/** A shooting star falling south over the summit (the moon rock that lands in Mauna Loa's crater): a bright head low at the right, its trail fading up to the left. 4 x 2 characters. */
function shootingStar(): NewDecor {
  const r = new Raster(32, 16);
  r.disc(27, 12, 2.4); r.rect(27, 8, 27, 15); r.rect(23, 12, 31, 12); // the head and its sparkle
  r.line(4, 1, 24, 11); r.line(5, 1, 25, 10); // the trail
  for (const x of [0, 2, 8, 12]) r.set(x, Math.round(x / 2), false); // (broken into dashes at its far end)
  r.line(0, 0, 1, 0); r.set(6, 2, false); r.set(10, 4, false);
  return decor('pacShootingStar', 4, 2, r, 1);
}

// ---- the astronomer at Mauna Kea's summit (2026-11-25: he blocks the big dome's ladder until Monty brings him the moon rock)

/** The astronomer, wrapped up against the summit's cold: a bobble hat, a fat parka, a star chart held up in front of him, shuffling his feet as he reads it by the stars. */
function astronomer(): NewCreature {
  const frame = (step: number) => {
    const r = new Raster(16, 16);
    r.disc(7, 4, 2.6); r.rect(4, 1, 10, 2); r.disc(7, 0, 1.2); // the head, the hat and its bobble
    r.set(5, 4, false); // the eye (looking left at the chart)
    r.rect(4, 7, 11, 12); r.rect(3, 8, 12, 11); // the parka
    r.rect(4, 9, 11, 9, false); // its quilting
    r.rect(0, 5, 2, 10); r.rect(1, 6, 1, 9, false); r.set(1, 7); // the star chart in his hands, a star on it
    r.rect(3, 8, 3, 8); // the hand
    const a = [0, 1, 0, -1][step] ?? 0;
    r.rect(5 + a, 13, 6 + a, 15); r.rect(9 - a, 13, 10 - a, 15); // the boots
    return r.rows();
  };
  return pair('pacAstronomer', [0, 1, 2, 3].map(frame), 14);
}

export const PACIFIC_ISLANDS_TILES = {
  /** Sand to fill under the crest. Solid. */
  pacSandFill: tile('pacSandFill', 1, 7, [
    '#####.##',
    '........',
    '.##.####',
    '........',
    '####.###',
    '........',
    '##.#####',
    '........',
  ]),
  /** A dry-stacked fishpond wall: rounded lava stones, the courses offset, black gaps between them. Solid. */
  pacWallStone: tile('pacWallStone', 1, 12, [
    '.##..##.',
    '########',
    '########',
    '.##..##.',
    '#..##..#',
    '########',
    '########',
    '#..##..#',
  ]),
  /** Thatch for a hut's roof: straw laid in slanting rows. A floor. */
  pacThatch: tile('pacThatch', 2, 9, [
    '########',
    '#.##.##.',
    '########',
    '.##.##.#',
    '########',
    '........',
    '........',
    '........',
  ]),
  /** Jungle earth with grass along its top and roots below. Solid. */
  pacTurf: tile('pacTurf', 1, 5, [
    '#.#.#.##',
    '########',
    '#.######',
    '########',
    '........',
    '###.####',
    '###.####',
    '........',
  ]),
  /** Red earth under the turf. Solid. */
  pacSoil: tile('pacSoil', 1, 2, [
    '###.####',
    '###.####',
    '........',
    '.#####.#',
    '.#####.#',
    '........',
    '####.###',
    '####.###',
  ]),
  /** The one-lane bridge's deck: a kerb and the road over concrete. A floor. */
  pacBridgeDeck: tile('pacBridgeDeck', 2, 12, [
    '########',
    '########',
    '#.#.#.#.',
    '........',
    '........',
    '........',
    '........',
    '........',
  ]),
  /** Asphalt: the road's top with its centre dashes, packed rows under. Solid. */
  pacRoad: tile('pacRoad', 1, 11, [
    '########',
    '########',
    '........',
    '##..##..',
    '........',
    '########',
    '########',
    '........',
  ]),
  /** Snow on Mauna Kea's top: a drift along the crest and packed rows. Solid. */
  pacSnow: tile('pacSnow', 1, 1, [
    '..##..#.',
    '########',
    '########',
    '........',
    '.####.##',
    '........',
    '###.####',
    '........',
  ]),
  /** A torch at rest: a few embers glowing in a bowl of coals, low (safe to walk through). Passable. */
  pacEmber: tile('pacEmber', 0, 7, [
    '........',
    '........',
    '........',
    '........',
    '........',
    '..#..#..',
    '.##.###.',
    '########',
  ]),
  /** A red rental car's cabin: a roof over two windows with a pillar between. Passable (the car is a picture the road's strike draws). */
  pacCarCab: tile('pacCarCab', 0, 2, [
    '........',
    '..####..',
    '.######.',
    '##.##.##',
    '##.##.##',
    '########',
    '########',
    '########',
  ]),
  /** A rental car's body: a door line, a handle, a bumper, a wheel arch cut into the foot. Passable. */
  pacCarBody: tile('pacCarBody', 0, 2, [
    '########',
    '########',
    '##.##.##',
    '########',
    '########',
    '###..###',
    '##.##.##',
    '.##..##.',
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
} as const;

export const PACIFIC_ISLANDS_CREATURES = {
  pacCrab: crab(),
  pacEel: eel(),
  pacManta: manta(),
  pacTiki: tiki(),
  pacSurfer: surfer(),
  pacFireKnife: fireKnife(),
  pacAstronomer: astronomer(),
} as const satisfies Record<string, NewCreature>;

export const PACIFIC_ISLANDS_DECOR = {
  pacTikiTorch: tikiTorch(),
  pacTotem: totem(),
  pacRoastPig: roastPig(),
  pacSeaCliff: seaCliff('pacSeaCliff', 4),
  pacSeaCliffB: seaCliff('pacSeaCliffB', 11),
  pacSeaFan: seaFan(),
  pacKelp: kelp(),
  pacBubbles: bubbles(),
  pacWaterfall: waterfall(),
  pacBambooClump: bambooClump(),
  pacLaneSign: laneSign(),
  pacOutrigger: outrigger(),
  pacWhaleTail: whaleTail(),
  pacCoffeeTree: coffeeTree(),
  pacSacks: sacks(),
  pacLavaRocks: lavaRocks(),
  pacSkyPurple: skyBand('pacSkyPurple', ['........', '..#.....', '........', '.....#..', '........', '.#......', '........', '....#...'], 4),
  pacSkyRed: skyBand('pacSkyRed', ['########', '........', '########', '........', '########', '........', '########', '........'], 2),
  pacSkyOrange: skyBand('pacSkyOrange', ['########', '########', '........', '########', '########', '........', '########', '########'], 8),
  pacSkyGold: skyBand('pacSkyGold', ['########', '########', '########', '........', '########', '########', '########', '........'], 7),
  pacSun: sun(),
  pacStageBoard: stageBoard(),
  pacDrums: drums(),
  pacFeast: feast(),
  pacArchTop: archTop(),
  pacArchLeg: archLeg(),
  pacSurfboards: surfboards(),
  pacUmbrella: umbrella(),
  pacPalmSmall: palmOf(3, 4, 'pacPalmSmall'),
  pacHulaDancer: hulaDancer(),
  pacDrummer: drummer(),
  pacEarthOven: earthOven(),
  pacBreadStand: breadStand(),
  pacLookout: lookout(),
  pacDomeSmall: domeSmall(),
  pacDomeBig: domeBig(),
  pacCairn: cairn(),
  pacShootingStar: shootingStar(),
} as const satisfies Record<string, NewDecor>;
