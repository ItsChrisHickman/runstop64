import type { Game } from './game';

/** A place of the montage and what Monty does there. */
export interface Scene {
  room: number;
  /** Where he comes into the room (his place as the game keeps it, and the way he faces: $01 right, $81 left). */
  spot: { x2: number; y: number; facing?: number };
  /** What the game has by then (items taken, what they open), before he arrives. */
  prepare(g: Game): void;
  /** What he does there: takes an item, or some coins (50 points each), the treasure, or drives the C5 left as far as an x. */
  take: { item: number } | { coins: number } | { treasure: true } | { drive: number };
  /** Places he goes by on the way (the route finder's steps for a way that goes round: Monty's x2 and y), in order. */
  via?: readonly { x2: number; y: number }[];
  /** The row its credits go on (picture pixels), where the creatures of the room go through the usual one (the one under the playfield). */
  creditRow?: number;
  /** Frames the place is shown at least, if its route is not what it lasts (the treasure's ending plays on by itself). */
  frames?: number;
  /** The stick, as text (pilot.ts), found by `re/routes.ts`. */
  route: string;
  /** Credit lines over this place (upper case, at most 38 letters). */
  credits: readonly string[];
}

/** What he does there is done (in a game that has run so far; coins are counted by the score, as nothing else scores in a place). */
export function isDone(scene: Scene, g: Game): boolean {
  if ('item' in scene.take) return g.siCollected[scene.take.item] !== 0;
  if ('coins' in scene.take) return g.score >= scene.take.coins * 50;
  if ('treasure' in scene.take) return g.completionActive !== 0;
  return g.x2 <= scene.take.drive;
}

const LEFT = 0x81, RIGHT = 0x01;
/** The row between the score and the room (screen row 2), which the game leaves empty too. */
const TOP_ROW = 16;
const nothing = () => {};

/**
 * The montage, in the order of the journey west (the house, the escape tunnel, the sewerage works, the Ultimate Experience, the
 * tree stump, the C5 street, the boat, the dock). The credits are in three parts, as Super Mario World's: the makers, true facts,
 * then the port (shared/native/ending.ts `PORT_CREDITS`, put after the last place's by ending.ts). Sources of every line:
 * re/credits.md. A line is at most 38 letters of the game's lettering (no apostrophes, percent signs or brackets: its font has none).
 */
export const SCENES: readonly Scene[] = [
  {
    room: 0x00, spot: { x2: 0x86, y: 0xb2, facing: LEFT }, prepare: nothing, take: { coins: 1 },
    route: '<32 J<8 .40 <32 J<8 .32 J<8 .32 J>8 .32 J>8 .32',
    credits: ['A GREMLIN GRAPHICS GAME, 1985', 'ORIGINAL GAME BY PETER HARRAP'],
  },
  {
    room: 0x0d, spot: { x2: 0x14, y: 0xa2, facing: RIGHT }, prepare: nothing, take: { item: 0 },
    route: '>32 .120 J>8 .40 J>8 .64 >8 J>8 .40 >24',
    credits: ['C64 VERSION BY MICRO PROJECTS LTD', 'ANTHONY CLARKE AND JASON PERKINS', 'GRAPHICS BY MARK RODGERS'],
  },
  {
    room: 0x13, spot: { x2: 0x14, y: 0xca, facing: RIGHT }, prepare: nothing, take: { item: 1 },
    route: '>16 J>8 .32 J>8 .32 J>8 .32 ^40 >24',
    credits: ['MUSIC BY ROB HUBBARD', 'THE THIRD MONTY MOLE GAME'],
  },
  {
    // (a creature of the room goes down through the row under the playfield: its credits go in the row above the room)
    room: 0x1a, spot: { x2: 0x94, y: 0xaa, facing: LEFT }, prepare: nothing, take: { item: 6 }, creditRow: TOP_ROW,
    route: '^<16 <32 ^<56 J<8 .32 <24',
    credits: ['PETER HARRAP WROTE THE FIRST GAME,', 'WANTED: MONTY MOLE, AT 19 IN 1984,'],
  },
  {
    // (and a creature of this room stands in the floor, in the row under the playfield)
    room: 0x1d, spot: { x2: 0x90, y: 0xb2, facing: LEFT }, prepare: nothing, take: { coins: 2 }, creditRow: TOP_ROW,
    route: '<8 ^<8 <16 ^<24 ^24 ^<32 ^>8 >8 ^8 ^<8 ^8 ^<8 <8 ^>8 >40 ^8 .8 ^8 .8 ^16 ^>8 >16 <24 .8 ^8 ^<24 <8 >8 .8 >16 <32',
    credits: ['AS A REACTION TO THE BRITISH', 'MINERS STRIKE: A MOLE STEALING COAL', 'TO KEEP HIS FAMILY WARM'],
  },
  {
    room: 0x20, spot: { x2: 0x94, y: 0x6a, facing: LEFT }, prepare: nothing, take: { coins: 1 }, creditRow: TOP_ROW,
    route: '<8 .24 <24 .8 >8 <24 ^<8 <24 ^<16 <16 ^<24 <16 ^<8 <16 ^<16',
    credits: ['MONTY ESCAPES FROM HIS HOUSE FOR THE', 'ENGLISH CHANNEL AND FREEDOM'],
  },
  {
    room: 0x21, spot: { x2: 0x14, y: 0x6a, facing: RIGHT }, prepare: nothing, take: { coins: 1 },
    route: '>56 v>24 .8 >24 J>8 .64 >8 v>8 v16 .8 >40 .32 >32',
    credits: ['THE MOLE CRUSHERS CAME OVER FROM', 'WANTED: MONTY MOLE, SAID ZZAP!64', 'PETER HARRAP: I LIKE A BIT OF A SHOCK'],
  },
  {
    // (the C5 drives on by itself after the route, through the street)
    room: 0x24, spot: { x2: 0x9b, y: 0x7a, facing: LEFT }, prepare: nothing, take: { drive: 0x20 }, frames: 260,
    route: '<64',
    credits: ['ROB HUBBARD SAID THE MAIN TUNE WAS', 'INSPIRED BY DEVILS GALOP, THE DICK'],
  },
  {
    room: 0x29, spot: { x2: 0x14, y: 0xa2, facing: RIGHT }, prepare: nothing, take: { item: 9 },
    route: '>40 <16 >16 <8 >8 J>8 .32 v>16',
    credits: ['BARTON RADIO SERIAL THEME', 'HARDCORE GAMING 101 READERS RATED IT'],
  },
  {
    room: 0x2d, spot: { x2: 0x94, y: 0xb2, facing: LEFT }, prepare: nothing, take: { item: 18 },
    route: '<72 .40 ^<8 J>8 .24 ^<8 ^24 ^<16 J<8',
    credits: ['NUMBER 2 IN WESTERN GAME MUSIC, 2011', 'ZZAP!64 GAVE IT 90 PER CENT IN 1985:'],
  },
  {
    room: 0x2b, spot: { x2: 0x94, y: 0xb2, facing: LEFT }, prepare: nothing, take: { item: 10 },
    route: 'J<8 .40 J<8 .32 >8 .8 J>8',
    credits: ['MOLING ABOUT HAS NEVER BEEN SUCH FUN'],
  },
  {
    room: 0x2f, spot: { x2: 0x48, y: 0x9a, facing: LEFT }, prepare: (g) => { g.siCollected[8] = 0x81; }, take: { treasure: true },
    // (the treasure's ending plays on by itself: 612 frames from his touch to GAME OVER)
    route: '<16 .8', frames: 660,
    credits: ['MONTY BOARDS A FERRY TO FRANCE:', 'AUF WIEDERSEHEN MONTY IS THE NEXT GAME'],
  },
];

/**
 * The creatures of the parade, in the order the journey meets them (the room each first appears in): the game's enemy types
 * (more than one for a creature made of several sprites moving together) and the name under it. No names are documented for
 * most (the C64 code numbers them): they are plain descriptions of the sprite, but for the ones ZZAP!64 names (mugs, hands,
 * blobbies, jellyfish: issue 6, p. 16) and the ones the reconstruction's comments name (the wasp that fly spray sees off, the
 * bubble the teddy bear wakes; re/credits.md).
 */
export const CAST: readonly { types: readonly number[]; name: string }[] = [
  { types: [25], name: 'GRINNER' },
  { types: [9], name: 'BLOB' },
  { types: [15], name: 'SHOE' },
  { types: [24], name: 'TEAPOT' },
  { types: [14], name: 'CLOCK FACE' },
  { types: [20], name: 'WASP' },
  { types: [27], name: 'HAND' },
  { types: [10], name: 'SPRING EYE' },
  { types: [29], name: 'COG' },
  { types: [11], name: 'HORNED THING' },
  { types: [21], name: 'BUBBLE' },
  { types: [22], name: 'GHOST' },
  { types: [28], name: 'BUGGY' },
  { types: [17], name: 'DOTTED BALL' },
  { types: [19], name: 'DOME' },
  { types: [18], name: 'MUG' },
  { types: [8], name: 'BOOT' },
  { types: [30], name: 'SPIKY BUG' },
  { types: [26], name: 'CONE' },
  { types: [16], name: 'TOTEM' },
  { types: [12], name: 'MUSHROOM' },
  { types: [23], name: 'SPOOK' },
  { types: [32, 33, 34], name: 'BANNER PLANE' },
  { types: [13], name: 'JELLYFISH' },
];
