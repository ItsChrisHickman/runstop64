import { SCREEN_MARGIN } from '../../shared/monty/screen';
import { rollerTrain } from '../../montyotr/src/rollers';
import type { CharAnim, CrackSpec, IcicleSpec, PulseSpec, RollerSpec, RoomBlocks, TunnelSpec } from '../../montyotr/src/montydata';
import type { RoomSpec, Sector } from '../../shared/monty/rooms';
import { JAPAN_SPRITE, SHURIKEN_POINTERS, SNOWBALL_POINTERS } from './japan-pointers';
import { GUST_FRAMES, TENGU_FRAMES } from './art/japan-cave';
import { SNOWBALL_FRAMES } from './art/japan-fuji';
import { SHURIKEN_FRAMES } from './art/japan-shuriken';
import { SIGNAL_GREEN, SIGNAL_RED } from './art/japan-crossing';
import { GLASS_CELLS, pachinkoFrames } from './art/japan-pachinko';
import { WANTED_FRAMES } from './art/japan-items';
import type { WorldDecor } from './art/world';
import { wantedAnims, wantedCells, wantedDecor } from './wanted';
import { codeOf, decorIndex, fillCells, Grid, room, type Palette } from './layout';

/**
 * Japan, the fourth region of Do Svidaniya Monty (docs/dosvidaniya-japan.md): eleven rooms (ten and the hidden one) in a block five wide and three high at columns
 * 12-16 of the exit grid, entered from China's junk (column 11) and left east, over the cargo ship's gangway, into the Pacific (not yet built).
 *
 *             col 12                col 13              col 14                 col 15               col 16
 *   row 0       .                     .               S  SHOOT FOR THE MOON  L  THE LAST MOLE     H  NINJA HIDEOUT      (S: a bonus room, added 2026-11-25)
 *   row 1   A  THE FISH MARKET   B  NEON STREET      D  THE CROSSING    G  KOI POLLOI        I  THE SHOGUN'S HALL
 *   row 2       .                 C  PACHINKO PARLOUR   E  BULLET POINT       F  MOUNT FUJI         J  SAYONARA SAILOR
 *
 * Playfield cells as in moscow.ts. Floors: the harbour, streets, parlour, crossing and port are on row 17 ("low"), the rooftops and the overpass on row 7 ("high"), the platform,
 * the mountain, the garden and the hall on row 14 ("mid"). The bullet trains (E) are `tunnels` with a picture, the paper doors (I) `pulses` whose spent look is a wall; the daruma (E's west end)
 * rolls the platform's shutter up (E), the fish food (D) sends the koi off (G), the ninja hood (L, THE LAST MOLE) lets him by the castle's guard (I).
 */

// ---- the ids -----------------------------------------------------------------------------------------
/** Room ids go on from China's (18-26): they never change once the region has shipped. */
export const JP = { harbour: 27, street: 28, parlour: 29, crossing: 30, platform: 31, fuji: 32, garden: 33, mole: 34, hideout: 35, hall: 36, port: 37, grove: 97, cave: 98 } as const;
/** Whether a room is one of Japan's (the eleven made with it, and the rooms added after it shipped). */
export const isJapanese = (room: number): boolean => Object.values(JP).some((id) => id === room);

/** The names (a pun on the place, Monty on the Run's manner, no Z), the sectors from 27 on. */
const NAMES = [
  'THE FISH MARKET', 'NEON STREET', 'PACHINKO PARLOUR', 'THE CROSSING', 'BULLET POINT', 'MOUNT FUJI', 'KOI POLLOI', 'THE LAST MOLE', 'NINJA HIDEOUT', "THE SHOGUN'S HALL", 'SAYONARA SAILOR',
] as const;
export const JAPAN_SECTORS: readonly Sector[] = NAMES.map((text) => ({ col: Math.floor((32 - text.length) / 2), text }));
/** The map's colour of each (the harbour light blue, the street and parlour reds, the crossing grey, the platform blue, the mountain white, the garden green, the hidden room purple, the roofs yellow, the hall orange, the port brown). */
export const JAPAN_COLOURS: readonly number[] = [14, 2, 10, 12, 6, 1, 5, 4, 7, 8, 9];
/**
 * Rooms added to Japan after it shipped (later-sectors.ts): SHOOT FOR THE MOON (2026-11-25), the bonus bamboo grove west of THE LAST MOLE; GONE WITH THE WIND (2026-11-26), the bonus ice cave
 * at Mount Fuji's foot, where the tengu's gust carries him back up the mountain. The map's colour of each.
 */
export const JAPAN_LATER_NAMES: Readonly<Record<number, string>> = { [JP.grove]: 'SHOOT FOR THE MOON', [JP.cave]: 'GONE WITH THE WIND' };
export const JAPAN_LATER_COLOURS: Readonly<Record<number, number>> = { [JP.grove]: 13, [JP.cave]: 3 };

// ---- the palettes --------------------------------------------------------------------------------------
export const HARBOUR_PALETTE = {
  Q: ['jpQuay', 9], P: ['jpPier', 6], W: ['jpWater', 14], H: ['jpJunkHull', 2], T: ['jpCrateTop', 8], K: ['jpKawara', 14], B: ['jpRoofBody', 6], F: ['jpWarehouse', 9],
} as const satisfies Palette;

/** The street's eight: the asphalt, two lit tower faces, the roofs' tiles, the pipe (a rope), the fire escape's landings and the two of the train's (its windows and blue band). */
export const STREET_PALETTE = {
  A: ['jpAsphalt', 6], O: ['jpLitA', 7], P: ['jpLitB', 3], K: ['jpKawara', 14], R: ['jpPipe', 5], F: ['jpPlank', 2], W: ['jpTrainWin', 1], N: ['jpTrainBand', 6],
} as const satisfies Palette;

/** The parlour's seven (the last two only drawn by the ball stream's timing): the carpet, the walls, the press's column, the stair's steps, the rope. */
export const PARLOUR_PALETTE = {
  P: ['jpCarpet', 4], W: ['jpOffice', 2], K: ['jpTimber', 9], L: ['jpPlank', 2], R: ['jpBamboo', 5], F: ['jpBallsFew', 15], B: ['jpBalls', 15],
} as const satisfies Palette;
/** The crossing's eight: the asphalt, the zebra, the overpass's steel (and the towers), the subway's rope, a taxi's cabin and body, the crowd's heads and legs (the last four only drawn by the moving pictures). */
export const CROSSING_PALETTE = {
  A: ['jpAsphalt', 6], Z: ['jpZebra', 1], S: ['jpSteel', 14], R: ['jpPipe', 5], T: ['jpTaxiTop', 7], Y: ['jpTaxiBody', 7], C: ['jpCrowdTop', 13], L: ['jpCrowdLegs', 6],
} as const satisfies Palette;

/** The platform's eight: the tiled concrete (walls, deck, the pillar), the shutter, the stairs' rope, and the five a train is drawn in (its body, windows, blue band, wheels and the half cell of its nose). */
export const PLATFORM_PALETTE = {
  W: ['jpTiled', 14], H: ['jpShutter', 12], R: ['jpBamboo', 5], B: ['jpTrainBody', 1], N: ['jpTrainWin', 1], S: ['jpTrainBand', 6], L: ['jpTrainWheel', 12], E: ['jpTrainHalf', 1],
} as const satisfies Palette;

/** The mountain's seven: the scree (the spur, the crags, the rock under the first ledge), the trail's ledges, the chain, the cone behind the climb (snow above, light blue slope below), the huts' roofs and walls. */
export const FUJI_PALETTE = {
  S: ['jpScree', 9], T: ['jpTrail', 7], R: ['jpChain', 12], N: ['jpSnow', 1], M: ['jpSlope', 6], H: ['jpRoofBody', 2], W: ['jpKeepWall', 9],
} as const satisfies Palette;

export const GARDEN_PALETTE = {
  M: ['jpMoss', 5], G: ['jpGravel', 7], W: ['jpWater', 14], P: ['jpPlank', 2], R: ['jpBamboo', 5], L: ['jpPlaster', 1], K: ['jpKawara', 14], T: ['jpTimber', 9],
} as const satisfies Palette;

export const MOLE_PALETTE = {
  M: ['jpMoss', 5], W: ['jpWater', 14], S: ['jpStone', 12], T: ['jpTimber', 9], R: ['jpBamboo', 5], L: ['jpPlaster', 1], C: ['jpStoneSink', 12],
} as const satisfies Palette;

/** The hideout's eight: the timber (the trunks and the roof's wall), the grass, the walkways' planks, the eave's ridge and lip (yellow tiles), the roof's body (red tiles), the rope, and the two states of a plank giving way (only drawn by the lookout's rotten boards). */
export const HIDEOUT_PALETTE = {
  T: ['jpTimber', 9], M: ['jpMoss', 5], P: ['jpPlank', 8], E: ['jpEave', 7], B: ['jpRoofBody', 2], R: ['jpBamboo', 5], K: ['plankCracked', 8], L: ['plankSplit', 8],
} as const satisfies Palette;
/** The hall's eight: the timber, tatami, plaster, the gallery's eave, the paper door shut, shaking and open, and the rope. */
export const HALL_PALETTE = {
  T: ['jpTimber', 9], A: ['jpTatami', 7], E: ['jpEave', 14], S: ['jpShojiShut', 1], N: ['jpShojiWarn', 7], O: ['jpShojiOpen', 9], R: ['jpBamboo', 5],
} as const satisfies Palette;

export const PORT_PALETTE = {
  S: ['jpSteel', 14], C: ['jpContainer', 2], H: ['jpShipHull', 2], K: ['jpCrateTop', 8], D: ['jpCrate', 8], R: ['jpBamboo', 5], W: ['jpWater', 14], P: ['jpPorthole', 2],
} as const satisfies Palette;

// ---- the bullet trains ------------------------------------------------------------------------------------
/**
 * The bullet trains (E): a train 24 cells long and 6 tall (rows 8-13, on the platform's lane: taller than any jump) sweeps the room a cell every 3 frames, so across the 32 columns
 * and its own length in 171 frames. Its edge flashes at the end it comes in at for 100 frames first (the warning), then it comes on. The two trains take turns, so the room's cycle is
 * 656 frames: the up train from the right (its edge flashes from frame 185 and again every 656), 328 frames later the down train from the left, and between one train's going and the other's
 * flash 57 frames in which nothing is on the platform and no edge flashes: the quiet moment. No flash and no train is "go": a dash from the stairs to the way out (about 100 frames) started
 * then is clear, since the next train is a flash (100 frames) and its run in away. A flash means a train is coming from that end. The platform is unsafe while one is on it; the underpass
 * and the stairs' ropes below the platform are safe. Drawn in the room's own characters: a stepped nose (4 cells) and five cars (4 cells each) of white with a row of windows and a blue band
 * over wheels, going into the tiled wall at the ends as into a tunnel (it is not drawn over a wall).
 */
export const TRAIN = { rows: 6, top: 8, cols: 24, nose: 8, step: 3, warn: 100, sweep: 171, quiet: 57, first: 185 } as const;
/** A train's cycle (rest, warning, sweep) and the frames between the two trains' warnings: two trains with a quiet moment after each. */
const TRAIN_CYCLE = 2 * (TRAIN.warn + TRAIN.sweep + TRAIN.quiet);
export const TRAIN_REST = TRAIN_CYCLE - TRAIN.warn - TRAIN.sweep;
export const TRAIN_APART = TRAIN_CYCLE / 2;

/** The nose's height in pixels above the bogies, column by column from the tip: it rises half a cell at a time, then a cell, to the roof: the long shinkansen nose. */
const NOSE_HEIGHTS = [4, 8, 12, 16, 20, 24, 32, 40] as const;

/** The picture of a train, its nose at the leading end (`noseLeft`: the up train, going left). */
function trainPicture(noseLeft: boolean): number[][] {
  const code = (letter: string) => codeOf(PLATFORM_PALETTE, letter);
  const half = code('E'), wheel = code('L');
  const car = [code('B'), code('N'), code('B'), code('S'), code('B')]; // roof, windows, body, blue band, body (top to bottom) over the bogies
  const column = (height: number): number[] => [
    ...car.map((tile, r) => {
      const fromFoot = 4 - r, have = height - 8 * fromFoot; // pixels of this row that are body
      return have >= 8 ? tile : have >= 4 ? half : 0;
    }),
    wheel,
  ];
  const nose = NOSE_HEIGHTS.map(column);
  const columns = [...nose, ...Array.from({ length: TRAIN.cols - TRAIN.nose }, () => column(40))];
  const ordered = noseLeft ? columns : [...columns].reverse();
  return Array.from({ length: TRAIN.rows }, (_, r) => ordered.map((c) => c[r] ?? 0));
}

export const TRAINS: readonly TunnelSpec[] = [
  { room: JP.platform, from: 'right', code: codeOf(PLATFORM_PALETTE, 'B'), cols: TRAIN.cols, top: TRAIN.top, bottom: TRAIN.top + TRAIN.rows - 1, step: TRAIN.step, rest: TRAIN_REST, warn: TRAIN.warn, offset: TRAIN.first - TRAIN_REST, picture: trainPicture(true) },
  { room: JP.platform, from: 'left', code: codeOf(PLATFORM_PALETTE, 'B'), cols: TRAIN.cols, top: TRAIN.top, bottom: TRAIN.top + TRAIN.rows - 1, step: TRAIN.step, rest: TRAIN_REST, warn: TRAIN.warn, offset: TRAIN.first + TRAIN_APART - TRAIN_REST, picture: trainPicture(false) },
];

/**
 * The train over NEON STREET (`tunnels`, harmless): the railway's two-car-high commuter train (a row of windows over a blue band, five cars) runs over the roofs on the viaduct a cell every two frames, comes round again
 * 150 frames after it has gone, with no warning (it is only a picture: it cannot touch him). Drawn in the room's own characters (the platform's train tiles), over the sky.
 */
export const STREET_TRAIN: TunnelSpec = {
  room: JP.street, from: 'right', code: codeOf(STREET_PALETTE, 'W'), cols: 30, top: 0, bottom: 1, step: 2, rest: 150, warn: 0, offset: -100, harmless: true,
  picture: [0, 1].map((r) => Array.from({ length: 30 }, (_, c) => (c % 6 === 5 ? 0 : codeOf(STREET_PALETTE, r === 0 ? 'W' : 'N')))),
};


// ---- the parlour's falling balls -------------------------------------------------------------------------------
/** The steel balls falling through the glass of the machines (`charAnims`): the glass's six characters of each of the two kinds of machine cycle through eight pictures, the second kind's balls a few steps behind. */
export const PARLOUR_ANIMS: readonly CharAnim[] = (['jpPachinkoOrange', 'jpPachinkoGreen'] as const).map((name, k): CharAnim => ({
  kind: 'cycle', room: JP.parlour, chars: GLASS_CELLS.map((cell) => ({ decor: decorIndex(name), cell })), frames: pachinkoFrames(k * 5), every: 2,
}));

// ---- the scramble crossing ----------------------------------------------------------------------------------------
/**
 * The crossing's cycle (D; `tunnels`, the taxis deadly and the crowd harmless, and the signals' lamps `charAnims`), 480 frames from the moment he comes in: on the red man two taxis cross the zebra's zone (columns 6-17) one after the other,
 * the first from the left (its headlamps flash at the left edge from frame 40 for 30 frames, then it drives through, 3 frames a cell: gone by 121) and the second from the right (flash 100, gone by 181); then the green man: the crowd surges across
 * in two waves (from the left at 190 and from the right at 250, 4 frames a cell, harmless), and from 181 to the next flash at 520 the zone is clear (about 370 frames: he takes 16 a cell, so 192 for the zone). The overpass, the pocket east of the
 * gap and the gap itself are not in the zone at all.
 */
export const CROSSING = { zebra: [8, 15], zone: { from: 6, to: 17 }, period: 480, taxiStep: 3, taxiWarn: 30, taxiFirst: [40, 100], crowdStep: 4, crowdFirst: [190, 250], crowdSpan: { from: 4, to: 19 } } as const;
const taxiCols = 4, crowdCols = 12;
/** A tunnel mouth of the crossing: `first` the frame its first flash (or its first appearance) is at, `sweepCells` the cells it takes to cross. */
function lane(from: 'left' | 'right', first: number, o: { code: number; cols: number; step: number; warn: number; span: { from: number; to: number }; harmless: boolean; picture: readonly (readonly number[])[] }): TunnelSpec {
  const sweep = (o.span.to - o.span.from + 1 + o.cols + 1) * o.step;
  const rest = CROSSING.period - o.warn - sweep;
  return { room: JP.crossing, from, code: o.code, cols: o.cols, top: 15, bottom: 16, step: o.step, rest, warn: o.warn, offset: first - rest, span: o.span, picture: o.picture, ...(o.harmless ? { harmless: true } : {}) };
}
const T = codeOf(CROSSING_PALETTE, 'T'), Y = codeOf(CROSSING_PALETTE, 'Y'), C = codeOf(CROSSING_PALETTE, 'C'), L = codeOf(CROSSING_PALETTE, 'L');
const taxi = (noseLeft: boolean): number[][] => [noseLeft ? [0, 0, T, T] : [T, T, 0, 0], [Y, Y, Y, Y]];
const crowd: number[][] = [0, 1].map((r) => Array.from({ length: crowdCols }, (_, c) => ([2, 5, 8].includes(c) ? 0 : r === 0 ? C : L)));
const TAXI = { code: Y, cols: taxiCols, step: CROSSING.taxiStep, warn: CROSSING.taxiWarn, span: CROSSING.zone, harmless: false } as const;
const CROWD = { code: C, cols: crowdCols, step: CROSSING.crowdStep, warn: 0, span: CROSSING.crowdSpan, harmless: true, picture: crowd } as const;
export const CROSSING_MOUTHS: readonly TunnelSpec[] = [
  lane('left', CROSSING.taxiFirst[0], { ...TAXI, picture: taxi(false) }), lane('right', CROSSING.taxiFirst[1], { ...TAXI, picture: taxi(true) }),
  lane('left', CROSSING.crowdFirst[0], CROWD), lane('right', CROSSING.crowdFirst[1], CROWD),
];
/** The signals' lamps: the red man lit for the first 180 frames of a cycle (the taxis' turn, until the second has gone: frame 181), the green man for the rest. A picture a 20 frames: 24 of them is the 480-frame cycle. */
export const SIGNAL_ANIM: CharAnim = {
  kind: 'cycle', room: JP.crossing, chars: [0, 1].map((cell) => ({ decor: decorIndex('jpWalkSignal'), cell })),
  frames: Array.from({ length: 24 }, (_, k) => (k < 9 ? SIGNAL_RED : SIGNAL_GREEN)), every: 10,
};

/** Every mouth of Japan: the platform's two bullet trains, the street's railway and the crossing's taxis and crowd. */
export const JAPAN_TUNNELS: readonly TunnelSpec[] = [...TRAINS, STREET_TRAIN, ...CROSSING_MOUTHS];
/** Every picture that moves of Japan's rooms: the parlour's balls and the crossing's signals. */
export const JAPAN_ANIMS: readonly CharAnim[] = [...PARLOUR_ANIMS, SIGNAL_ANIM];

/**
 * The parlour's ball stream (`pulses`): steel balls pour down the chute from the ceiling on to the middle floor between the machines and the rope, two cells wide and two tall where he walks (rows 9-10, columns 17-18:
 * the chute's foot and the cell west of it, where the balls bounce, so the floor's east end, col 19, is clear of it to step off the rope on and watch from):
 * nothing for 60 frames, a trickle for 30 (the warning), a stream for 40 (deadly: the balls bounce across the floor), 10 frames of nothing, a 140 frame period. A set-up trap: the coin beyond it waits for the lull.
 */
export const BALL_STREAM: PulseSpec = {
  room: JP.parlour, col: 17, row: 9, cols: 2, rows: 2, period: 140, start: 60, warn: 30, live: 40, idle: 0, warnCode: codeOf(PARLOUR_PALETTE, 'F'), liveCode: codeOf(PARLOUR_PALETTE, 'B'), spent: 0,
};

// ---- the paper doors ----------------------------------------------------------------------------------------
/**
 * The hall's three pairs of sliding paper doors (I; `pulses`): a doorway 2 cells wide and 3 tall (rows 11-13) open for 80 frames, its lattice shaking for 24 (the warning), shut over a
 * panel's leading edge for 8 (deadly to what is in the doorway) and then a wall of paper until the 160-frame period is round. The doors shut 40 frames after one another from the first (the offsets run backwards in the period: 0, 120, 80), so a walker who passes the first as it opens finds the next open as he comes. A shut door
 * is a wall, not a trap: waiting at one is safe, stepping in as it shakes is not.
 */
/** The hideout's lookout boards (row 9, columns 12-16), each cell its own patch of rotten wood: it shows a crack after 16 frames under his feet, splits after 34 and is gone after 46 (a walk over a cell is about 18); whole again when he comes into the room. */
export const HIDEOUT_CRACKS: readonly CrackSpec[] = Array.from({ length: 5 }, (_, k): CrackSpec => ({
  room: JP.hideout, col: 12 + k, cols: 1, row: 9, codes: [codeOf(HIDEOUT_PALETTE, 'P'), codeOf(HIDEOUT_PALETTE, 'K'), codeOf(HIDEOUT_PALETTE, 'L')], crack: 16, wide: 34, gone: 46, away: 600,
}));
/**
 * The hideout's patterns (Chris, 2026-11-26: "no challenge. Should have much more interesting enemy patterns"; `rollers`, each on a sprite the room leaves free: the sushi is sprite 0, the creatures 4-6,
 * the worn hood 7). A shuriken (sprite 1) is thrown from the cedar along the ground to the door, at his height, every `every` frames: from the rope's foot below the grass he watches it pass, then runs
 * (or jumps it). A ninja (sprite 2, the door guard's own pictures in slot 0's blocks: $30-$37) leaps in an arc from the first walkway to the second and back, under the lookout's boards, and is gone
 * a moment between leaps (a ninja): Monty steps up as he lands on the far one.
 */
export const HIDEOUT_SHURIKEN: RollerSpec = { room: JP.hideout, sprite: 1, path: [[2, 15], [20, 15]], speed: 3, every: 150, start: 120, frames: SHURIKEN_POINTERS, colour: 15 };
/** The leap's arc: from the first walkway (floor 15) to the second (floor 13) and back, its top a row under the lookout's boards (a point is the picture's top left: its floor's row less two). */
const LEAP_ENDS = { from: [7, 13], to: [13, 11], apex: 10.5 } as const;
const leapArc = (a: readonly [number, number], b: readonly [number, number]): (readonly [number, number])[] => Array.from({ length: 9 }, (_, i) => {
  const t = i / 8, lift = 2 * LEAP_ENDS.apex - (a[1] + b[1]) / 2; // (a curve whose middle is at the apex's row)
  return [a[0] + (b[0] - a[0]) * t, (1 - t) * (1 - t) * a[1] + 2 * t * (1 - t) * lift + t * t * b[1]] as const;
});
export const HIDEOUT_LEAP: RollerSpec = {
  room: JP.hideout, sprite: 2, path: [...leapArc(LEAP_ENDS.from, LEAP_ENDS.to), ...leapArc(LEAP_ENDS.to, LEAP_ENDS.from).slice(1)], speed: 1, every: 150, start: 10,
  frames: [0x34, 0x35, 0x36, 0x37, 0x30, 0x31, 0x32, 0x33], colour: 10, spread: true, // (going east in his pictures going on, back west in those going back)
};
export const HIDEOUT_BLOCKS: RoomBlocks = { rooms: [JP.hideout], blocks: SHURIKEN_POINTERS.map((ptr, i) => ({ ptr, block: SHURIKEN_FRAMES[i] ?? new Uint8Array(64) })) };
export const DOORS = { cols: [6, 12, 18] as const, row: 11, rows: 3, period: 160, open: 80, warn: 24, live: 8, apart: 40 } as const;
/** A paper door at `col` on the doorway from `row`, the `k`th the walker meets (so it shuts `k` times `apart` frames after the first). */
const paperDoor = (col: number, row: number, k: number): PulseSpec => ({
  room: JP.hall, col, row, cols: 2, rows: DOORS.rows, period: DOORS.period, start: DOORS.open, warn: DOORS.warn, live: DOORS.live, offset: (DOORS.period - k * DOORS.apart) % DOORS.period,
  idle: codeOf(HALL_PALETTE, 'O'), warnCode: codeOf(HALL_PALETTE, 'N'), liveCode: codeOf(HALL_PALETTE, 'S'), spent: codeOf(HALL_PALETTE, 'S'),
});
/** The floor's doors, met walking east. */
export const DOOR_PULSES: readonly PulseSpec[] = DOORS.cols.map((col, k) => paperDoor(col, DOORS.row, k));
/**
 * The gallery's doors (rows 5-7, the holes through the partitions): the same paper doors, the room's second test (Chris, 2026-11-25: the upper
 * doorways should be hazards too, the lantern ghost bobbing over the first bay to cross as well). Met walking west, so they shut from the east.
 */
export const GALLERY_ROW = 5;
export const GALLERY_DOOR_PULSES: readonly PulseSpec[] = DOORS.cols.map((col, k) => paperDoor(col, GALLERY_ROW, DOORS.cols.length - 1 - k));

/** The pond's other two planks (cols 19-20 on row 13, cols 22-23 on row 14): not there until the fish food, which brings them up as the koi come to feed. Without them the far bank is seven cells off. */
export const PLANK_CELLS: readonly (readonly [row: number, col: number])[] = [[13, 19], [13, 20], [14, 22], [14, 23]];
export const PLANK_CODE = codeOf(GARDEN_PALETTE, 'P');

// ---- the key items' places -------------------------------------------------------------------------------
/** The shutter's cells (col 29, rows 10-13: one cell wide, so the train runs on past it as past a post) that the daruma rolls up. */
export const SHUTTER_CELLS: readonly (readonly [row: number, col: number])[] = [10, 11, 12, 13].map((row) => [row, 29] as const);

/**
 * Each gate's picture of what it wants (Chris: "if you have the item, the obstacle doesn't exist... If you knew you knew, otherwise, huh?"): the key item drawn blinking over the gate from the first visit
 * (art/japan-items.ts JAPAN_WANTED), gone as he uses the item there (data.ts: the gate's room effect clears its `wantedCells`; wanted.ts). The daruma beside the shutter's top (the gantry post is over it), the fish food
 * over the pond's far planks, the hood over the hideout's door, under the first walkway.
 */
export const WANTED = {
  shutter: { room: JP.platform, piece: 'jpWantDaruma', col: 27, row: 8 },
  pond: { room: JP.garden, piece: 'jpWantFishFood', col: 21, row: 9 },
  door: { room: JP.hideout, piece: 'jpWantHood', col: 19, row: 12 },
} as const;
export { wantedCells };
export const WANTED_ANIMS: readonly CharAnim[] = wantedAnims(Object.values(WANTED), WANTED_FRAMES);

/** The platform's scenery: the skyline beyond the station, a sign and a clock, the overhead wire across the whole room (but where a rope climbs through it) on its masts, the safety line along the deck's edge. */
const WIRE_COLS = Array.from({ length: 32 }, (_, c) => c).filter((c) => c !== 0 && c !== 23 && c !== 29);
const EDGE_COLS = [1, 2, 3, 4, 5, 6, 7, 11, 12, 15, 16, 17, 18, 22, 24, 25, 28, 30, 31];
const PLATFORM_DECOR = [
  ['jpTowerGreen', 1, 3], ['jpTowerYellow', 26, 2], ['jpStars', 10, 1], ['jpStationSign', 6, 4], ['jpClock', 20, 4], ['jpBoard', 15, 3], ['jpVending', 5, 11],
  ...WIRE_COLS.map((col) => ['jpWire', col, 7] as const), ['jpMast', 13, 8], ['jpMast', 25, 8],
  ...EDGE_COLS.map((col) => ['jpEdge', col, 13] as const),
] as const;

// ---- Mount Fuji ------------------------------------------------------------------------------------------
/**
 * The mountain behind the climb (no fill behind the play: LESSONS.md): Fuji's own cone in the top band, snow over light blue, its flanks at 45 degrees (a diagonal character beyond each row's end),
 * its narrow crater top under the snowballs' start, its foot resting on the second ledge between the last step and the top hut: the trail's upper ledges run along its foot. The cone's half width in
 * cells from row 2 down; its centre is between columns 15 and 16.
 */
const FUJI_HALF = [1, 2, 3, 4, 5, 6] as const;
const FUJI_MID = 16;
/** The snow: solid white down to this row, its jagged edge on the row under it. */
const SNOW_ROWS = 3;
/**
 * The open mountainside (Chris, 2026-11-26: "Might be better if Monty enters on a ledge and we have no arbitrary floor"): he comes in from the platform on a ledge (`entry`) that juts from a spur of
 * rock, and the switchbacks hang over the drop: a gap (`gap`, three cells: a jump) between the entry ledge and the first ledge (`ledge`), whose rock tapers under it, the steps up on the flank to the
 * second ledge. Below them nothing but the drop, which falls through the room's foot (columns `open`) into the ice cave at Fuji's foot (GONE WITH THE WIND).
 */
export const FUJI = { entry: { col0: 0, col1: 8 }, gap: { col0: 9, col1: 11 }, ledge: { col0: 12, col1: 22 }, floor: 14, open: { col0: 2, col1: 28 } } as const;
/** Fuji's tiles: the cone behind the climb, the spur and the crags, the trail's ledges and steps, the rock over the chain's top, the chain. */
function paintFuji(g: Grid) {
  FUJI_HALF.forEach((hw, k) => g.box(FUJI_MID - hw, k + 2, FUJI_MID - 1 + hw, k + 2, k + 2 <= SNOW_ROWS ? 'N' : 'M')); // the cone: snow above, light blue slope below
  g.box(1, 0, 3, 0, 'S').box(7, 0, 9, 0, 'S'); // (a rock overhang either side of the chain's top: no jumping off it out of the room)
  g.box(30, 0, 31, 19, 'S').box(29, 8, 29, 19, 'S'); // (open sky; the rock of the mountain's flank closes the right, the line of the platform open at the left)
  g.box(FUJI.entry.col0, FUJI.floor, FUJI.entry.col1, FUJI.floor, 'T'); // the ledge he comes in on
  g.box(0, 15, 6, 15, 'S').box(0, 16, 4, 16, 'S').box(0, 17, 2, 17, 'S').box(0, 18, 1, 19, 'S'); // the spur it juts from, down the platform's side to the room's foot
  g.box(FUJI.ledge.col0, FUJI.floor, FUJI.ledge.col1, FUJI.floor, 'T').box(13, 15, 21, 15, 'S').box(15, 16, 19, 16, 'S'); // the first ledge over the drop, its rock tapering under it
  g.box(23, 12, 25, 12, 'T').box(26, 10, 28, 10, 'T'); // the steps: the upper one off the flank's rock, the lower one off a crag under it
  g.box(26, 12, 28, 12, 'S').box(27, 13, 28, 13, 'S').box(28, 14, 28, 14, 'S'); // (the crag: a row under the upper step, so no one stands in it, tapering into the flank)
  g.box(10, 8, 26, 8, 'T'); // the second ledge
  g.box(7, 6, 9, 6, 'T'); // the last step
  g.box(5, 0, 5, 5, 'R'); // the chain
  for (const h of FUJI_HUTS) g.box(h.col0, h.floor - 4, h.col1, h.floor - 4, 'H').box(h.col0, h.floor - 3, h.wall1, h.floor - 1, 'W'); // the pilgrims' huts: a tiled roof over a plank back wall (he walks in front of it)
}
/**
 * The pilgrims' huts (SNOW SLIDES): a roof (solid: he cannot jump up onto it from inside) four rows over a ledge, from `col0` to `col1`, a plank back wall under it to `wall1`. The snowballs pass over the roof;
 * in under it he is out of their way. One at the foot of the climb by the way in, on the first ledge (west of the second ledge, so the snowball's hop over its roof clears that ledge); one at the top, at the
 * second ledge's east end, under the summit's east flank (the snowball rolls off the summit onto its roof and drops off its east end down the steps). Its roof runs a cell past its wall: the eaves, with the coin under them.
 */
export const FUJI_HUTS = [
  { col0: 3, col1: 7, wall1: 7, floor: 14 },
  { col0: 22, col1: 25, wall1: 24, floor: 8 },
] as const;
/** Where the tengu's gust sets him down (GONE WITH THE WIND): in the foot hut on the ledge he came in on, out of the snowballs' way, so the climb and its snow slides are still ahead of him. */
export const GUST_LANDING = { col: FUJI_HUTS[0].col0 + 1, floor: FUJI_HUTS[0].floor } as const;
/** The mountain's coins: on the first ledge in the snowballs' lane, on the steps they drop down, and under the eaves of the top hut, a step from where they drop (a backdrop leaves their cells alone). */
const FUJI_COINS: readonly (readonly [number, number])[] = [[17, 12], [24, 10], [25, 6]];
/**
 * SNOW SLIDES: snowballs (rollers, as the Andes' boulders: sprites on a path, deadly to touch), one every `FUJI_SNOW.apart` frames, the first `start` frames after he comes in: seen at the summit (on the cone's
 * crater top, against the sky), it rolls east off it and down the cone's flank onto the top hut's roof (the same distance as before the cone was redrawn, so the timing is unchanged), along it and off its east end down onto the upper step, back west off it onto the lower step, off that onto the
 * first ledge, west along it, hops over the foot hut's roof and flies off the room's west edge high over the way in. So the climb (the first ledge east, the steps, up onto the second ledge) is crossed between
 * two snowballs, from hut to hut: wait in the foot hut for one to pass over, then climb to the top hut before the next. The second ledge west of the top hut, the last step and the chain are clear.
 * (A point is the snowball's top left cell: its floor's row less two.)
 */
export const FUJI_SNOW = { every: 460, start: 30, speed: 2, apart: 153 } as const;
export const FUJI_SNOW_PATH: readonly (readonly [col: number, row: number])[] = [
  [15.6, 0], [18, 0], [20, 2], [22, 2], [24, 2], [26.2, 3.5], [27, 8], [25, 8], [24, 10], [23, 10], [21.5, 12], [10, 12], [9, 9], [8, 8], [2, 8], [-3, 9.5],
];
/**
 * The snowballs (white: they stand off the black sky; they roll down the cone's edge against the sky, never across its face), three on the path at once (Chris: "love the Donkey Kong feel... needs more
 * snowballs at a time"), a third of `every` apart (`FUJI_SNOW.apart`), on sprites 1, 2 and 4 (the mountain has no creatures), their pictures put in while the mountain is loaded. One is always on the
 * climb or about to be: the wait in a hut is for the gap behind one, and the next is already rolling off the summit.
 */
export const FUJI_SNOWBALLS: readonly RollerSpec[] = rollerTrain(
  { room: JP.fuji, path: FUJI_SNOW_PATH, every: FUJI_SNOW.every, speed: FUJI_SNOW.speed, frames: SNOWBALL_POINTERS, colour: 1 },
  [1, 2, 4].map((sprite, i) => ({ sprite, start: FUJI_SNOW.start + i * FUJI_SNOW.apart })),
);
export const FUJI_BLOCKS: RoomBlocks = { rooms: [JP.fuji], blocks: SNOWBALL_POINTERS.map((ptr, i) => ({ ptr, block: SNOWBALL_FRAMES[i] ?? new Uint8Array(64) })) };
/** What finishes the cone, stamped where the painted room has the slope (or empty cells beside it): the snow's jagged edge on the first row of slope, the flanks' diagonal edges (white beside the snow, light blue below). */
function fujiSnow(): (readonly [WorldDecor, col: number, row: number])[] {
  const g = new Grid();
  paintFuji(g);
  const out: (readonly [WorldDecor, col: number, row: number])[] = [];
  const edge = ['jpSnowEdgeA', 'jpSnowEdgeB', 'jpSnowEdgeC'] as const;
  FUJI_HALF.forEach((hw, k) => {
    const row = k + 2, left = FUJI_MID - hw, right = FUJI_MID - 1 + hw;
    if (row === SNOW_ROWS + 1) for (let c = left; c <= right; c++) out.push([edge[(c * 7 + 1) % 3] ?? 'jpSnowEdgeA', c, row]);
    const snow = row <= SNOW_ROWS;
    if (g.at(left - 1, row) === '.') out.push([snow ? 'jpSnowFlankL' : 'jpFlankL', left - 1, row]);
    if (g.at(right + 1, row) === '.') out.push([snow ? 'jpSnowFlankR' : 'jpFlankR', right + 1, row]);
  });
  return out.filter(([, c, r]) => !FUJI_COINS.some(([cc, cr]) => cc === c && cr === r));
}

// ---- the hidden garden's stones ------------------------------------------------------------------------------
/**
 * THE LAST MOLE's six stepping stones (two cells each, their floor row), east to west from the rope: the first jumps are wider (three cells, two rows up then two rows down to the stone beside the
 * bamboo rope, a koi leaping across the first), then two rows up again past the bamboo rope and the pond's west half as it always was (the stone under the bonsai shelf's end, the stone by the shrine, the bank).
 */
export const MOLE_STONES: readonly (readonly [col: number, floor: number, cols: number])[] = [[25, 14, 2], [20, 12, 2], [15, 14, 2], [11, 12, 2], [8, 13, 2], [4, 14, 2]];
/**
 * The second and third stones sink (`cracks`, as the hideout's rotten boards; the Last Ninja's stepping stones): stood on, a stone cracks and tips after 30 frames and goes under after 80, back up 120 frames
 * later. Crossing is safe, waiting is not: the koi's leap is watched from the first stone (solid) and the bamboo rope (beside the third), not from a sinking stone.
 */
export const MOLE_SINKING: readonly CrackSpec[] = [1, 2].flatMap((k): CrackSpec[] => {
  const stone = MOLE_STONES[k];
  if (!stone) return [];
  const [col, row, cols] = stone;
  const sink = codeOf(MOLE_PALETTE, 'C');
  return [{ room: JP.mole, col, cols, row, codes: [codeOf(MOLE_PALETTE, 'S'), sink, sink], crack: 30, wide: 55, gone: 80, away: 120 }];
});

// ---- the port ----------------------------------------------------------------------------------------------
/** The port's tiles: the container stack at the left, the quay, the rope down from the hall and a short crane arm over its top, the container stair, the gangway's plank, the ship's hull and deck. */
function paintPort(g: Grid) {
  g.box(0, 14, 2, 16, 'C').box(0, 11, 2, 13, 'D').box(0, 8, 2, 10, 'C').box(0, 5, 2, 7, 'D').box(0, 2, 2, 4, 'C').box(0, 0, 2, 1, 'D'); // (open sky; a stack of four containers closes the left, the ship goes on off the right)
  g.box(19, 0, 31, 0, 'S').clear(24, 0, 26, 0); // a crane's boom over the rope's top (so no one leaves by the sky beside it)
  g.box(0, 17, 27, 19, 'S');
  g.box(25, 0, 25, 16, 'R');
  g.box(9, 15, 11, 16, 'C').box(6, 13, 8, 16, 'C').box(3, 11, 5, 16, 'C'); // the container stair, up to the west
  g.box(26, 15, 27, 15, 'K'); // the gangway's plank
  g.box(28, 18, 31, 19, 'W'); // the water at the ship's side
  g.box(28, 14, 31, 17, 'H').box(29, 15, 29, 15, 'P').box(31, 15, 31, 15, 'P'); // the ship's hull with its portholes, afloat
  g.box(28, 13, 31, 13, 'K'); // the deck
}

// ---- the rooms ----------------------------------------------------------------------------------------------

/**
 * SHOOT FOR THE MOON (added 2026-11-25): a bamboo grove west of THE LAST MOLE's shrine, the way across it a stream in a gully. Four tall stalks stand out of the water (`GROVE.stalks`:
 * column, top row; each down to just over the water): he jumps from the bank to the first, and from stalk to stalk, taking hold as he comes down (a jump grips a rope only on its way
 * down), to the mossy stone on the cedar at the far side (a coin: it ends the crossing). A jump from low on a stalk falls short, so he climbs before each one. The second coin is at the
 * head of the tallest stalk. Two cranes cross the stalks' heights on two periods. Back the same way.
 */
const GROVE_STALKS: readonly (readonly [col: number, top: number])[] = [[21, 5], [16, 3], [11, 5], [6, 4]];
export const GROVE = { stalks: GROVE_STALKS, water: 16, stone: { col: 2, floor: 7, cols: 3 } } as const;
const GROVE_PALETTE = { M: ['jpMoss', 5], W: ['jpWater', 14], R: ['jpBamboo', 13], S: ['jpStone', 12], T: ['jpTimber', 9] } as const satisfies Palette;
const paintGrove = (g: Grid): void => {
  g.box(25, 14, 31, 19, 'M'); // the bank by the shrine
  g.box(2, GROVE.water, 24, 19, 'W'); // the stream in its gully
  g.box(0, 0, 1, 19, 'T'); // a great cedar closes the grove at the west
  for (const [col, top] of GROVE.stalks) g.box(col, top, col, GROVE.water - 1, 'R');
  g.box(GROVE.stone.col, GROVE.stone.floor, GROVE.stone.col + GROVE.stone.cols - 1, GROVE.stone.floor, 'S'); // a mossy stone set in the cedar's roots
};
const GROVE_COINS: readonly (readonly [col: number, row: number])[] = [[3, 5], [16, 1]];
/** The far bamboo: culms at these columns from the leaves to the water (never a wall of it: black night between), their leaves in sprays at the top, wider at every other one. */
const GROVE_CULMS = [3, 8, 13, 18, 23, 26, 29] as const;
const GROVE_BACK = GROVE_CULMS.flatMap((c, i) => [
  ...fillCells(paintGrove, GROVE_COINS, [c, 2, c, GROVE.water - 1], 'jpBambooBack'),
  ...fillCells(paintGrove, GROVE_COINS, [c - 1 - (i % 2), 0, c + 1, 1], 'jpBambooLeaves'),
]).concat(GROVE.stalks.flatMap(([c, top]) => fillCells(paintGrove, GROVE_COINS, [c - 1, top - 1, c + 1, top], 'jpBambooLeaves'))); // and a spray at each stalk's head

// ---- GONE WITH THE WIND: the ice cave at Fuji's foot ----------------------------------------------------------
/**
 * The ice cave under MOUNT FUJI (Chris, 2026-11-26: "a cave that takes Monty to the top like the MOTR teleports... if it made sense, having a few teleports if fun would be cool"; the real Narusawa Ice Cave
 * and Fugaku Wind Cave are lava tubes at Fuji's foot). A bonus room, off the way on: he drops into it off the open mountainside (the gap by the way in, or off the steps), lands on the snow heaped
 * under the sinkhole (`heap`), drops through its hole at the west (`hole`) into the lava tube and goes east under its ceiling: an icicle (`icicles`), a rock hump, the yuki-onna drifting up and down
 * across the tube, a frozen fall hanging from the ceiling, a second snow woman between the fall and a second icicle over the first coin, a mound of ice with the second; and at the end the tengu, hovering beside the gust
 * and fanning the wind into it (drawn in the room's characters: TENGU_ANIM) (`gust`, Monty on the Run's teleporter beam, always open): into it, and the wind carries him up the beam (MontyData.teleportLift: `GUST_LIFT`) and out, and sets him down in the foot hut on MOUNT FUJI's
 * way in (`GUST_LANDING`), where he materialises: the climb and its snow slides still ahead of him, the cave a detour with its coins, never a way round them.
 * A teleport as a reward, seen and understood (the gust carrying him up, Monty set down safe), never a punishment; the only way out, and always there.
 */
export const CAVE = {
  heap: { floor: 8, mound: [[11, 19, 7], [13, 17, 6]] }, hole: { col0: 3, col1: 5 }, ceiling: 9, floor: 18,
  hump: { col0: 9, col1: 11, floor: 16 }, fall: { col0: 17, col1: 18, row0: 10, row1: 13 }, mound: { col0: 22, col1: 23, floor: 16 },
  yuki: [{ col: 13, row: 10, speed: 2, range: 24 }, { col: 19, row: 10, speed: 1, range: 48 }], icicles: [7, 21], gust: { col: 25, row: 9, height: 7 }, tengu: { col: 26, row: 10 },
} as const;
/** How far the gust carries him up its beam before it sets him down at the top (MontyData.teleportLift): from standing on the tube's floor until his head is in the beam's top. */
export const GUST_LIFT = (CAVE.floor - 3 - CAVE.gust.row) * 8;
const CAVE_PALETTE = { K: ['jpScree', 9], S: ['snowGround', 1], F: ['snowFill', 1], I: ['iceFall', 3] } as const satisfies Palette;
const paintCave = (g: Grid): void => {
  g.box(0, 0, 1, 19, 'K').box(29, 0, 31, 19, 'K'); // the lava tube's walls (the sinkhole open above to the mountainside: MOUNT FUJI's foot)
  g.box(2, CAVE.heap.floor, 28, CAVE.heap.floor, 'S'); // the snow fallen in through the sinkhole, heaped under it
  for (const [c0, c1, row] of CAVE.heap.mound) g.box(c0, row + 1, c1, CAVE.heap.floor, 'F').box(c0, row, c1, row, 'S');
  g.box(2, CAVE.ceiling, 28, CAVE.ceiling, 'K'); // the tube's roof under it
  g.clear(CAVE.hole.col0, CAVE.heap.floor, CAVE.hole.col1, CAVE.ceiling); // the hole down into the tube
  g.box(2, CAVE.floor, 28, 19, 'K'); // the tube's floor
  g.box(2, CAVE.ceiling + 1, 2, CAVE.floor - 1, 'I'); // a frozen fall down the west wall
  g.box(CAVE.hump.col0, CAVE.hump.floor, CAVE.hump.col1, CAVE.floor - 1, 'K'); // a hump of lava rock
  g.box(CAVE.fall.col0, CAVE.fall.row0, CAVE.fall.col1, CAVE.fall.row1, 'I'); // a frozen fall hanging from the roof (he walks under it)
  g.box(CAVE.mound.col0, CAVE.mound.floor, CAVE.mound.col1, CAVE.floor - 1, 'I'); // a mound of ice built up from the floor where the roof drips, as the falls are
};
const CAVE_COINS: readonly (readonly [col: number, row: number])[] = [[21, 16], [22, 14]];
/**
 * The tube's two icicles: over the way in from the hole, shaking as he comes toward it (`lead`: walking straight on from the hole meets its fall, so he waits for it), and over the first coin, dripping on
 * its own clock (`period`: the coin is taken between two falls, whoever is near).
 */
export const CAVE_ICICLE_TIMING = { lead: 3, period: 150, phase: 60 } as const;
export const CAVE_ICICLES: readonly IcicleSpec[] = [
  { room: JP.cave, col: CAVE.icicles[0], row: CAVE.ceiling + 1, floor: CAVE.floor, lead: CAVE_ICICLE_TIMING.lead },
  { room: JP.cave, col: CAVE.icicles[1], row: CAVE.ceiling + 1, floor: CAVE.floor, period: CAVE_ICICLE_TIMING.period, phase: CAVE_ICICLE_TIMING.phase },
];
/**
 * The tengu (Chris, 2026-11-26: the cameo that flew in and stood by the gust read as Viktor): drawn in the room's characters in his own colours, hovering beside the gust's beam at its top (`CAVE.tengu`),
 * flapping his crow's wings and fanning the wind into it: the wind's maker. Scenery: he touches nothing.
 */
export const TENGU_ANIM: CharAnim = {
  kind: 'cycle', room: JP.cave, chars: Array.from({ length: 9 }, (_, cell) => ({ decor: decorIndex('jpTengu'), cell })), frames: TENGU_FRAMES, every: 8,
};
/** The wind rising either side of the gust's beam, the whole height of the tube: one character, turned a step every few frames. */
const GUST_DECOR = [CAVE.gust.col - 1, CAVE.gust.col + 1].flatMap((col) => Array.from({ length: CAVE.gust.height + 1 }, (_, i) => ['jpGust', col, CAVE.gust.row + 1 + i] as const))
  .filter(([, col, row]) => !(col >= CAVE.tengu.col && row < CAVE.tengu.row + 3)); // (the tengu hovers over the beam's east side at its top)
/** The heap's sides under the sinkhole: a snow slope beside each step of it (so it reads as a drift, not a wall of blocks). */
const HEAP_DECOR = CAVE.heap.mound.flatMap(([c0, c1, row]) => [['jpSnowFlankL', c0 - 1, row], ['jpSnowFlankR', c1 + 1, row]] as const);
export const GUST_ANIM: CharAnim = { kind: 'cycle', room: JP.cave, chars: [{ decor: decorIndex('jpGust'), cell: 0 }], frames: GUST_FRAMES, every: 3 };

export const JAPAN_ROOMS: readonly RoomSpec[] = [
  // A THE FISH MARKET: the fishing harbour at dawn. In from China's junk (low, its deck at the left); the quay runs east, with the market on it, past an inlet and a crate stack to the way out (low) to the street.
  // A stair of crates climbs through the market's roof (the way out high, to the rooftops); the roof's west end is a dead end with a sushi.
  room({
    id: JP.harbour, cell: [1, 12], sector: 27, palette: HARBOUR_PALETTE,
    paint(g) {
      g.box(30, 7, 31, 7, 'K').box(30, 8, 31, 14, 'F'); // (open sea to the left and open sky: the junk sails in; the market's warehouse closes the right between its two lanes)
      g.box(0, 17, 9, 19, 'H').box(10, 17, 12, 19, 'W').box(13, 17, 31, 17, 'Q').box(13, 18, 31, 19, 'P');
      g.box(8, 7, 29, 7, 'K').clear(23, 7, 25, 7).box(26, 8, 29, 9, 'B'); // the market's roof, with a hatch over the stair's top crate (it climbs through: from the top crate a jump up either side, as from crate to crate; without it he stood with his head in the roof against the roof's end)
      g.box(14, 15, 16, 15, 'T').box(17, 13, 19, 13, 'T').box(20, 11, 22, 11, 'T').box(23, 9, 25, 9, 'T'); // the stair of crates
    },
    coins: [[15, 13], [28, 5]],
    item: { name: 'sushi1', col: 9, row: 5, sprite: JAPAN_SPRITE.sushi },
    decor: [['jpHorizon', 14, 2], ['jpGulls', 5, 3], ['jpGulls', 26, 5], ['jpJunkSail', 1, 9], ['jpAwningRed', 9, 8], ['jpAwningBlue', 13, 8], ['jpAwningYellow', 17, 8], ['jpAwningRed', 21, 8], ['jpStall', 17, 14], ['jpFishCrate', 26, 15], ['jpFishCrate', 29, 15]],
    creatures: [
      { who: 'jpKappa', col: 17, row: 15, way: 'right', speed: 2, range: 28 }, // walking the quay quick from the stair's foot past the stall: jumped where it turns, or followed (four cells clear of the street's edge)
      { who: 'jpSushiRoll', col: 10, row: 5, way: 'right', speed: 1, range: 80 }, // slow along the roof from the sushi's dead end to the hatch's edge: read from the top crate
      { who: 'jpKappa', col: 10, row: 11, way: 'down', speed: 2, range: 24 }, // leaping up out of the inlet and down again: the jump in from the junk's deck is timed to it
    ],
  }),

  // B NEON STREET: Monty's first night in Tokyo: a shopping street under a railway. In from the harbour low (the street: a ramen stall, vending machines, crowds) or high (the roofs); out to the crossing low or high. The shop fronts seal the lanes
  // from each other but for a drainpipe at the left and a fire escape in an alley (a zig-zag of landings up to the roofs); two pits between the roofs; a gap in the street with a rope down to the parlour. A train runs over the roofs on the viaduct, over and over.
  room({
    id: JP.street, cell: [1, 13], sector: 28, palette: STREET_PALETTE,
    paint(g) {
      g.box(0, 8, 1, 14, 'O').box(30, 8, 31, 14, 'O'); // (open sky: the buildings run off the screen's edges)
      g.box(0, 17, 31, 19, 'A').clear(20, 17, 22, 19).box(21, 16, 21, 19, 'R'); // the street, the stairs' gap and its rope
      g.box(6, 8, 13, 13, 'O').box(14, 8, 15, 13, 'P').box(21, 8, 23, 13, 'P').box(24, 8, 29, 13, 'O').clear(11, 8, 13, 8).clear(24, 8, 26, 8); // the shop fronts, a pit between two roofs at each gap, an alley between the two middle ones
      g.box(0, 7, 2, 7, 'K').box(6, 7, 10, 7, 'K').box(14, 7, 15, 7, 'K').box(21, 7, 23, 7, 'K').box(27, 7, 31, 7, 'K'); // the roofs (the alley is open to them)
      g.box(4, 7, 4, 16, 'R'); // the drainpipe
      g.box(16, 15, 18, 15, 'F').box(18, 13, 20, 13, 'F').box(16, 11, 18, 11, 'F').box(18, 9, 20, 9, 'F'); // the alley's fire escape: landings up to the roofs
    },
    coins: [[12, 5], [14, 15]],
    decor: [
      ...Array.from({ length: 32 + 2 * SCREEN_MARGIN }, (_, c) => ['jpViaduct', c - SCREEN_MARGIN, 2] as const), // the railway's girder over the roofs, out to the screen's edges
      ['jpTowerYellow', 3, 2], ['jpNeonPink', 7, 3], ['jpNeonCyan', 10, 2], ['jpScreen', 17, 3], ['jpTowerGreen', 26, 3],
      ['jpRamenStall', 8, 14], ['jpLantern', 6, 14], ['jpCrowdRed', 0, 15], ['jpCrowdPurple', 22, 15], ['jpVending', 26, 14], ['jpVending', 28, 14],
    ],
    creatures: [
      { who: 'jpSushiRoll', col: 6, row: 5, way: 'right', speed: 1, range: 24 },
      { who: 'jpLuckyCat', col: 27, row: 5, way: 'right', speed: 1, range: 16 },
      { who: 'jpKarakasa', col: 19, row: 5, way: 'down', speed: 1, range: 16 }, // a paper umbrella hopping up and down the alley between the fire escape's landings
    ],
  }),

  // C PACHINKO PARLOUR: a pachinko hall. In by the rope from the street's stairs; out east, low, to the underpass. A row of machines with a player hunched over each (the steel balls falling through the pins); at the west the prize counter: a stair
  // of steps up to the shelf with a claw machine and its prize (a coin at the top of the climb), behind the Mole Crusher (a press that comes down from the ceiling's column across the lane, crossed there and back).
  // The middle floor's coin is past the ball stream: off the rope he stands clear of it at the floor's east end, watches the trickle, and crosses in the lull (Chris, 2026-11-25: stepping off the rope landed
  // in the stream, so the coin could only be taken in one go from the rope).
  room({
    id: JP.parlour, cell: [2, 13], sector: 29, palette: PARLOUR_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 1, 'W').clear(20, 0, 22, 1);
      g.box(0, 2, 1, 16, 'W').box(30, 2, 31, 14, 'W');
      g.box(0, 17, 31, 19, 'P');
      g.box(21, 0, 21, 16, 'R');
      g.box(12, 2, 14, 11, 'K'); // the press's column, down from the ceiling
      g.box(15, 11, 19, 11, 'L').box(23, 11, 29, 11, 'L'); // the middle floor, the lane machines' tops (a gap for the rope)
      g.box(15, 5, 17, 5, 'L').box(23, 5, 29, 5, 'L'); // the top floor, the middle machines' tops (the gap for the rope and the ball chute)
      g.box(8, 15, 10, 15, 'L').box(5, 13, 7, 13, 'L').box(2, 11, 4, 11, 'L').box(2, 9, 8, 9, 'L'); // the counter's stair and the prize shelf
    },
    coins: [[16, 9], [25, 3], [3, 7]],
    decor: [
      ['jpClawMachine', 6, 4], ...Array.from({ length: 7 }, (_, k) => ['jpChute', 18, 2 + k] as const),
      ['jpPachinkoGreen', 23, 6], ['jpPachinkoOrange', 26, 6],
      ['jpPachinkoOrange', 15, 12], ['jpPachinkoGreen', 18, 12], ['jpPachinkoOrange', 22, 12], ['jpPachinkoGreen', 25, 12],
    ],
    creatures: [
      { who: 'jpDaruma', col: 13, row: 15, way: 'right', speed: 1, range: 32 }, // rolling from the Mole Crusher's lane to the machines: under the press as it rises and the daruma heads away (the floor west of the press, under the counter's stair, is the place to wait)
      { who: 'jpLanternGhost', col: 22, row: 6, way: 'down', speed: 1, range: 32 }, // the ghost bobs up and down beside the rope between the middle and the top floor and guards the way up to the coin
      { who: 'jpLuckyCat', col: 22, row: 15, way: 'right', speed: 2, range: 20 }, // quick along the east floor from the rope's foot toward the way out (clear of the edge he comes in by)
    ],
    crushers: [{ col: 12, row: 12, height: 5 }],
  }),

  // D THE CROSSING: Shibuya's scramble. In from the street low or on the overpass (high). The street's crossing (zebra, signals): the taxis drive through it on the red man (a flash of headlamps at the edge they come from, then the car) and the crowd surges across in two waves
  // on the green man, harmlessly; the lane runs on to the subway's gap (the rope down to the platform). The overpass runs along over it past the big screen to the station roof with the fish food and a rope down to the street east of the gap.
  room({
    id: JP.crossing, cell: [1, 14], sector: 30, palette: CROSSING_PALETTE,
    paint(g) {
      g.box(0, 9, 1, 14, 'S').box(30, 0, 31, 16, 'S'); // (open sky; a tower runs up the right edge, the crossing's buildings at the left)
      g.box(0, 7, 27, 8, 'S'); // the overpass (the channel at its end is two cells wide: the rope's, col 29, and the one beside it, so that he climbs it without any pixel positioning)
      g.box(0, 17, 31, 19, 'A').box(CROSSING.zebra[0], 17, CROSSING.zebra[1], 17, 'Z').clear(22, 17, 24, 19).box(23, 16, 23, 19, 'R');
      g.box(29, 7, 29, 16, 'R');
    },
    coins: [[16, 5], [25, 15], [19, 14]],
    item: { name: 'fishFood', col: 24, row: 5, sprite: JAPAN_SPRITE.fishFood },
    decor: [['jpTowerYellow', 2, 2], ['jpScreen', 9, 2], ['jpTowerCyan', 22, 1], ['jpNeonPink', 26, 2], ['jpStation', 23, 9], ['jpWalkSignal', 5, 12], ['jpWalkSignal', 18, 12], ['jpHachiko', 26, 14]],
    creatures: [
      { who: 'jpDaruma', col: 4, row: 5, way: 'right', speed: 2, range: 80 }, // quick along the whole overpass to the fish food and back: jumped where it turns, read from the overpass's west end
      { who: 'jpKarakasa', col: 17, row: 0, way: 'down', speed: 1, range: 40 }, // hopping down onto the overpass by the big screen and up again, on a period of its own against the daruma's
      { who: 'jpKarakasa', col: 20, row: 9, way: 'down', speed: 1, range: 48 }, // hopping down over the street's pocket between the zebra and the subway's gap: the walk off the zebra timed twice
    ],
  }),

  // E BULLET POINT: the bullet-train platform. Two lanes: the underpass (low; in from the parlour) and the platform over it, joined by two stairs (ropes through the deck). The rope from the crossing lands on the
  // platform. The platform's east end is shut by a roller shutter until the daruma, which stands at the platform's west end (Chris, 2026-11-25: something from the left of the middle opens the door on the
  // right): up the first stairs between two trains, along to it and back below the deck before the next. Two trains sweep the platform lane in turn.
  room({
    id: JP.platform, cell: [2, 14], sector: 31, palette: PLATFORM_PALETTE,
    shut: [['left', 3, 7, 'W']], // the parlour beside it is a wall there
    paint(g) {
      g.box(0, 0, 0, 13, 'W').box(14, 0, 31, 0, 'W').clear(22, 0, 24, 0).box(29, 1, 29, 9, 'W'); // (open sky: the line runs through the room's edges; a station pillar at the left, the train goes behind it; a canopy's edge over the rope's top and a gantry post over the gate, so that no one jumps off the rope's top over the gate or out of the room)
      g.box(0, 14, 31, 14, 'W').clear(8, 14, 10, 14).clear(19, 14, 21, 14);
      g.box(0, 17, 31, 19, 'W').box(30, 15, 31, 16, 'W');
      g.box(12, 15, 13, 16, 'W'); // the underpass walled under the deck's middle: the platform is the way between the two stairs (Chris: "the train is too easy to not encounter")
      g.box(9, 13, 9, 16, 'R').box(20, 13, 20, 16, 'R').box(23, 0, 23, 13, 'R');
      g.box(29, 10, 29, 13, 'H');
    },
    coins: [[27, 15], [16, 12]],
    item: { name: 'daruma', col: 3, row: 12, sprite: JAPAN_SPRITE.daruma },
    decor: [...PLATFORM_DECOR, wantedDecor(WANTED.shutter)],
  }),

  // F MOUNT FUJI: Mount Fuji's open mountainside (FUJI). In from the platform past the shutter onto a ledge jutting from a spur (mid); Fuji's cone behind the climb, the pilgrim's trail hanging over the drop along its foot
  // in switchbacks: a jump over the gap to the first ledge, east along it, up two steps on the flank, back west along the second ledge, up a step to the chain at the left that climbs to the garden. A fall
  // off the mountainside drops into the ice cave at its foot (GONE WITH THE WIND), whose tengu's gust carries him back up to the foot hut. SNOW SLIDES: snowballs roll from the summit down the climb
  // (FUJI_SNOW), and a pilgrims' hut at its foot and its top (FUJI_HUTS) is where he waits for one to pass.
  room({
    id: JP.fuji, cell: [2, 15], sector: 32, palette: FUJI_PALETTE,
    paint: paintFuji,
    coins: FUJI_COINS,
    decor: [['jpSun', 26, 0], ['jpCloud', 0, 3], ...fujiSnow()], // (the sun high in the corner, clear of the top hut's roof; a cloud on the horizon west of the chain, clear of the summit's flank)
    creatures: [], // (SNOW SLIDES is the room: no creature crowds the snowballs' timing)
  }),

  // G KOI POLLOI: the temple garden on the mountain's shoulder. In by the chain through the floor at the left; the bank runs right past the temple and the cherry tree to the koi pond: a zig-zag of planks over the
  // water with two koi leaping out of it (fed, the quick one swims off with the food and the planks float up; the slow one still leaps across the first plank and the jump off it: the crossing waited
  // for from the bank, both ways, the tanuki the bank's own puzzle). The fish food's picture blinks over the pond until then (WANTED). The far bank has the castle gate on the right and a pergola up to a bamboo rope through the ceiling to THE LAST MOLE.
  room({
    id: JP.garden, cell: [1, 15], sector: 33, palette: GARDEN_PALETTE,
    shut: [['left', 3, 8, 'K'], ['right', 3, 4, 'K']], // the crossing's wall at the left, the hall's at the right
    paint(g) {
      g.box(0, 1, 1, 13, 'L').box(0, 0, 1, 0, 'K'); // (open sky; a temple wall with its tiled cap at the left, the castle gatehouse at the right)
      g.box(30, 2, 31, 11, 'L').box(29, 1, 31, 1, 'K'); // the gatehouse runs up to the pergola's beam: no way out over it into the hall's wall
      g.box(22, 0, 31, 0, 'T').clear(27, 0, 29, 0); // a pergola's beam over the rope's top (no jumping out of the room off it)
      g.box(0, 14, 15, 19, 'M').box(7, 14, 15, 14, 'G').clear(4, 14, 6, 19).box(5, 13, 5, 19, 'R');
      g.box(16, 15, 24, 19, 'W').box(16, 14, 17, 14, 'P'); // the pond and the first plank (the others float up when the koi are fed: PLANK_CELLS)
      g.box(25, 14, 31, 19, 'M');
      g.box(28, 12, 29, 12, 'P').box(25, 10, 27, 10, 'P'); // the pergola
      g.box(28, 0, 28, 9, 'R');
    },
    coins: [[16, 12], [19, 11]],
    decor: [['jpPagoda', 12, 2], ['jpSakura', 6, 8], ['jpTorii', 11, 10], ['jpToro', 26, 11], wantedDecor(WANTED.pond)],
    creatures: [
      { who: 'jpKoi', col: 17, row: 17, way: 'up', speed: 1, range: 56 },
      { who: 'jpKoi', col: 20, row: 10, way: 'down', speed: 2, range: 28 }, // (the second at twice the first's pace: the gaps drift; the fish food sends this one off)
      { who: 'jpTanuki', col: 7, row: 12, way: 'right', speed: 2, range: 24 }, // quick along the gravel to the pond's edge
    ],
  }),

  // L THE LAST MOLE: hidden, off the garden's pergola. In by the rope through the floor; a moonlit pond crossed on six stepping stones, a bonsai garden on a shelf and a stone dragon behind it, the shrine
  // on its plinth with the ninja hood. More skill from stone to stone (Chris, 2026-11-25: "a little bit more skill to jump from platform to platform"): the first jumps are wider and two rows up or down,
  // judged from a stone's edge (no steering in the air), a koi leaping across the first and a second across the jump to the fourth, the crane low across the stones, and the second and third stones sink under him (MOLE_SINKING: keep moving). The high ledge either
  // side of the bamboo rope and the bonsai shelf (reached down from the west ledge) are as they were.
  room({
    id: JP.mole, cell: [0, 15], sector: 34, palette: MOLE_PALETTE,
    shut: [['right', 3, 8, 'L']], // the tiers' wall at the right
    paint(g) {
      g.box(30, 1, 31, 13, 'L').box(30, 0, 31, 0, 'S'); // (the night sky open above; a garden wall at the right, its stone coping)
      g.box(0, 14, 2, 19, 'M').box(3, 15, 26, 19, 'W').box(30, 14, 31, 19, 'M').clear(27, 14, 29, 19);
      g.box(28, 13, 28, 19, 'R');
      for (const [c, r, w] of MOLE_STONES) g.box(c, r, c + w - 1, r, 'S'); // the stones
      g.box(1, 10, 8, 10, 'T'); // the bonsai shelf
      g.box(10, 6, 12, 6, 'S').box(16, 6, 18, 6, 'S').box(14, 6, 14, 13, 'R'); // a high ledge, split at the middle for the bamboo rope that climbs to it from the stones
    },
    coins: [[17, 4]],
    item: { name: 'hood', col: 1, row: 12, sprite: JAPAN_SPRITE.hood },
    decor: [['jpMoon', 20, 2], ['jpDragon', 3, 3], ['jpShrine', 1, 11], ['jpBonsai', 1, 8], ['jpBonsai', 3, 8], ['jpBonsai', 5, 8], ['jpBonsai', 7, 8]],
    // (Viktor's shadow on the moon is on sprite 1 now, viktor.ts PLACES.moon, so the second koi has the third slot)
    creatures: [
      { who: 'jpKoi', col: 22, row: 17, way: 'up', speed: 2, range: 20 }, // (leaps out of the water across the first stones' jump)
      { who: 'jpCrane', col: 4, row: 8, way: 'right', speed: 2, range: 80 }, // low and quick across the stones at a jump's height between them, and across the bamboo rope: each hop timed to it
      { who: 'jpKoi', col: 13, row: 17, way: 'up', speed: 1, range: 48 }, // (leaps slowly out of the water across the jump from the third stone to the fourth)
    ],
  }),

  // H NINJA HIDEOUT: the woods outside the shogun's walls, on the way to the port. In by the rope from the hall's ceiling (it comes up through the grass at the left); wooden walkways zig-zag up through the pines and bamboo (floors 15, 13, 11), the third one the ridge of the hideout's
  // curved-eave roof, and doubling back left from it a lookout (floors 9 and 7). The hideout's door is a low corridor in the ground floor under the roof, where its guard (a ninja) paces so that no one can pass him (in the ninja hood he lets him by) to the sushi at its end.
  // Its patterns (HIDEOUT_SHURIKEN, HIDEOUT_LEAP): a shuriken thrown along the ground from the cedar to the door, a ninja leaping between the first two walkways, a second dropping from the bamboo onto the third,
  // a samurai sweeping the ridge. In the hood the guard walks off where Monty comes to the door (data.ts: kept). Past the guard the corridor's floor has a gap (cols 24-26, a rope down it): the shaft down through the hall to the port's rope, the way on; the sushi lies beyond it at the corridor's end.
  // The lookout's boards (row 9, cols 12-16) are rotten (HIDEOUT_CRACKS): they give way under whoever stops on them, on the way to the coin.
  room({
    id: JP.hideout, cell: [0, 16], sector: 35, palette: HIDEOUT_PALETTE,
    paint(g) {
      g.box(0, 0, 1, 16, 'T'); // (a great cedar's trunk closes the left; open sky above and the woods running off at the top)
      g.box(0, 17, 31, 19, 'M').clear(3, 17, 5, 19).box(4, 16, 4, 19, 'R').clear(24, 17, 26, 19).box(25, 16, 25, 19, 'R'); // the grass, the rope's gap up to the hall and (behind the door's guard) the shaft's gap down to it
      g.box(7, 15, 11, 15, 'P').box(12, 13, 16, 13, 'P').box(17, 11, 21, 11, 'P'); // the walkways up
      g.box(22, 11, 29, 11, 'E').box(21, 12, 31, 13, 'B').box(19, 14, 31, 14, 'E'); // the hideout's curved eave roof: its ridge in yellow tiles, its red body (to the edge: nothing to walk into) and the upturned lip over the door
      g.box(21, 15, 31, 15, 'T').clear(21, 15, 29, 16).box(30, 15, 31, 16, 'T'); // the wall over the door and the doorway's low corridor
      g.box(30, 0, 31, 11, 'T'); // (a pine's trunk closes the right over the roof, up to the top: no open edge where no room is)
      g.box(12, 9, 16, 9, 'P').box(6, 7, 11, 7, 'P'); // the lookout
    },
    coins: [[9, 13], [26, 9], [11, 5]],
    item: { name: 'sushi2', col: 28, row: 15, sprite: JAPAN_SPRITE.sushi },
    decor: [['jpMoon', 24, 2], ['jpCloud', 3, 2], ['jpPineBig', 6, 3], ['jpBamboo3', 3, 9], ['jpBamboo3', 18, 3], ['jpPine', 13, 5], ['jpHedge', 13, 16], ['jpBanner', 17, 13], ['jpHedge', 22, 5], wantedDecor(WANTED.door)],
    creatures: [
      { who: 'jpNinja', col: 21, row: 15, way: 'right', speed: 1, range: 24 }, // the door's guard (the hood: he walks off)
      { who: 'jpNinja', col: 18, row: 2, way: 'down', speed: 2, range: 28 }, // dropping out of the bamboo onto the third walkway and climbing back: under him while he is up
      { who: 'jpSamurai', col: 22, row: 9, way: 'right', speed: 2, range: 20 }, // a castle samurai sweeping the ridge quick, its coin in his beat
    ],
  }),

  // I THE SHOGUN'S HALL: inside the castle, the gate hall. In from the garden's gate (mid); the floor runs east through three pairs of paper doors that open and shut in turn, the only way on. Past the third a rope
  // (col 21) climbs to the gallery, which runs back west along the eaves through a paper door in each partition, timed like the floor's but shutting from the east (a coin on it, the lantern ghost bobbing over its first bay) to the rope at the left (col 4) up to the ninja hideout:
  // that rope's foot hangs at the gallery, out of reach of the floor below it. The hall's far end is walled: the way on to the port is down the hideout's shaft, which lands in the shut-off space at the right (cols 24-26) with the rope down to the port.
  room({
    id: JP.hall, cell: [1, 16], sector: 36, palette: HALL_PALETTE,
    paint(g) {
      g.box(0, 0, 31, 1, 'T').clear(3, 0, 5, 1).clear(24, 0, 26, 1);
      g.box(0, 2, 1, 11, 'S');
      g.box(0, 14, 22, 14, 'A').box(0, 15, 31, 19, 'T').clear(24, 14, 26, 19).box(27, 2, 31, 14, 'T');
      for (const c of DOORS.cols) g.box(c, 2, c + 1, 10, 'S').box(c, DOORS.row, c + 1, DOORS.row + DOORS.rows - 1, 'O'); // the partitions and the doorways
      for (const c of DOORS.cols) g.box(c, GALLERY_ROW, c + 1, GALLERY_ROW + DOORS.rows - 1, 'O').box(c, 8, c + 1, 8, 'E'); // and a doorway through it for the gallery
      g.box(5, 8, 19, 8, 'E'); // the gallery's eaves, from the rope up to the hideout (col 4) to the rope up from the floor past the third door (col 21, in a gap of three)
      g.box(23, 2, 23, 14, 'T'); // the wall that shuts the hall's far end: the way on is through the hideout, down the shaft at its right (cols 24-26)
      g.box(4, 0, 4, 8, 'R').box(21, 7, 21, 13, 'R').box(25, 0, 25, 19, 'R'); // the hideout's rope (its foot at the gallery), the rope up to the gallery, the shaft's rope
    },
    coins: [[8, 6]],
    decor: [['jpScroll', 9, 5], ['jpScroll', 15, 5], ['jpScroll', 2, 5], ['jpLantern', 10, 2], ['jpLantern', 16, 2], ['jpAndon', 9, 11], ['jpAndon', 15, 11]],
    creatures: [
      { who: 'jpLanternGhost', col: 9, row: 4, way: 'down', speed: 1, range: 16 },
    ],
  }),

  // J SAYONARA SAILOR: the port at sunset, the way out. In by the rope from the hall; a quay with paper lanterns and flags (a sumo dockworker and a kappa on it, a tanuki at the rope's foot), a stack of containers with a coin at the west end and, along the top, Mount Fuji small over the sea and the sun going down in the sunset's bands;
  // at the east the cargo ship moored at the quay's end: its hull with its portholes standing in the water, its deckhouse and funnel, and the gangway down, a plank to step on and the deck over it, which walks on east into the Pacific.
  room({
    id: JP.port, cell: [2, 16], sector: 37, palette: PORT_PALETTE,
    shut: [['left', 4, 4, 'D']], // Fuji's scree is a wall there
    paint: paintPort,
    coins: [[4, 9], [23, 15]],
    decor: [
      // the sunset on the horizon only (LESSONS.md: no full-screen fill): four warm bands along the top, Fuji and the setting sun on them, a strip of sea under; the quay black
      ...fillCells(paintPort, [], [0, 2, 27, 2], 'jpSkyA'), ...fillCells(paintPort, [], [0, 3, 27, 3], 'jpSkyB'), ...fillCells(paintPort, [], [0, 4, 27, 4], 'jpSkyC'), ...fillCells(paintPort, [], [0, 5, 27, 5], 'jpSkyD'),
      ...fillCells(paintPort, [], [3, 6, 24, 7], 'jpSeaLines'),
      ['jpFujiFar', 13, 4], ['jpSunHalf', 20, 4], ['jpGulls', 7, 3], ['jpGulls', 17, 2],
      ['jpLanternPost', 12, 13], ['jpFlagHinomaru', 15, 14], ['jpLanternPost', 20, 13], ['jpShipBridge', 28, 6], ['jpGangwayRail', 26, 12],
    ],
    creatures: [
      { who: 'jpSumo', col: 12, row: 15, way: 'right', speed: 1, range: 40 },
      { who: 'jpKappa', col: 16, row: 9, way: 'down', speed: 1, range: 56 }, // a kappa hopping up out of the sea behind the quay and down again across the lane
      { who: 'jpTanuki', col: 18, row: 15, way: 'right', speed: 2, range: 24 }, // the second puzzle, apart from the first jump: quick along the quay to the rope's foot, the coin in its beat
    ],
  }),
  // SHOOT FOR THE MOON: a bamboo grove west of THE LAST MOLE, a bonus room (Chris, 2026-11-25: "a room to the left of that... some sort of cool background design"). In along the moss
  // from the shrine's plinth; the bamboo stands thick and moonlit behind four tall stalks that rise out of a stream in a gully. Across it from stalk to stalk, gripping each on the way
  // down from the jump, to the stone on the cedar (a coin); a second coin tops the tallest stalk. Two cranes cross the grove. Never needed: back the way he came.
  room({
    id: JP.grove, cell: [0, 14], sector: JP.grove, palette: GROVE_PALETTE,
    paint: paintGrove,
    coins: GROVE_COINS,
    decor: [
      ...GROVE_BACK,
      ['jpToro', 27, 11],
    ],
    // two cranes crossing the stalks' heights on two periods: quick and high (across the climbs to each stalk's head), slow and low (across the bank's edge and the jumps' landings)
    creatures: [
      { who: 'jpCrane', col: 7, row: 6, way: 'right', speed: 2, range: 64 },
      { who: 'jpCrane', col: 23, row: 11, way: 'left', speed: 1, range: 152 },
    ],
  }),
  // GONE WITH THE WIND: the ice cave at Fuji's foot, a bonus room (CAVE): in by a drop off the open mountainside, out by the tengu's gust, up and back to the foot hut on the way in.
  room({
    id: JP.cave, cell: [3, 15], sector: JP.cave, palette: CAVE_PALETTE,
    paint: paintCave,
    coins: CAVE_COINS,
    decor: [...GUST_DECOR, ...HEAP_DECOR, ['jpTengu', CAVE.tengu.col, CAVE.tengu.row]],
    // two snow women drifting down across the tube and up again on two periods: quick between the hump and the frozen fall, slow between the fall and the dripping icicle over the first coin
    creatures: CAVE.yuki.map((y) => ({ who: 'jpYukiOnna', col: y.col, row: y.row, way: 'down' as const, speed: y.speed, range: y.range })),
    teleporter: { ...CAVE.gust, to: { cell: [2, 15], ...GUST_LANDING } },
  }),
];
