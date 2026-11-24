import type { Arrival, BoardingSpec, CrackSpec, CurrentSpec, LavaSpec, PulseSpec } from '../../montyotr/src/montydata';
import type { RoomSpec, Sector } from '../../shared/monty/rooms';
import { codeOf, fillCells, type Grid, room, type Palette } from './layout';

/**
 * The Pacific, the fifth region of Do Svidaniya Monty (docs/dosvidaniya-reset.md, "the Pacific"): four rooms in a U. East along the top through the cargo ship to
 * Waikiki, down through the surf into the sea off Hana, east along the bottom to Hilo's lava, and up to the airport's apron, where the yellow mail biplane takes him
 * off into THE FLIGHT (sky.ts), the way to the Andes. (The cargo plane's hold, once above Hilo at [2,19], was cut on 2026-11-24.)
 *
 *            col 17                  col 18                 col 19
 *   row 2   A THE CARGO SHIP ==> B WAIKIKI
 *                                 || the surf (the snorkel)
 *   row 3                        C HANA ==== low, east ==> D HILO ==> the biplane: THE FLIGHT
 *
 * The puzzle is the sea: water kills him (the bilge, Waikiki's surf) until he has the snorkel, which lies in plain sight on the beach stand's roof, out of reach from
 * the sand; the way to it is up the palm by the sea that stopped him, west along the hotel's lawn past the luau's torches (the lei), and a drop off the lawn's end.
 * The set piece is Hilo: the lava rises behind him as he climbs to the apron, seen first as a red glow from the sea below; the parachute waits on the crater rim's
 * high shelf, up past the long ledge, so the climb winds back on itself. The new way to move is swimming
 * against Hana's surge (`currents`). Playfield cells as in moscow.ts.
 */

// ---- the ids -----------------------------------------------------------------------------------------
/**
 * Room ids go on from Japan's (27-37) and never change once a region has shipped: the reset kept five of the first build's seventeen (38-54), the cargo plane's hold (54)
 * was cut after the flight came in, and the ids of the rooms cut are retired (save-migrate.ts carries a save in one on in the kept room of its island).
 */
export const PAC = { ship: 38, waikiki: 41, hana: 49, hilo: 52 } as const;

/** The room of open water (swim.ts): Monty swims in it, and only with the snorkel. */
export const SWIM_ROOMS: readonly number[] = [PAC.hana];

/** The sprite pointers (in the bank) of the Pacific's items: the original's item blocks the world never uses ($90, $91, $93, $94; $8F, the cutters' once, is free again). */
export const PAC_SPRITE = { snorkel: 0x90, lei: 0x91, musubi: 0x93, parachute: 0x94 } as const;

/** The sectors' names by their place from 38 (the Andes' follow at 55, so the list keeps seventeen places: the retired rooms' are empty). Plain names. */
const NAMES = ['THE CARGO SHIP', '', '', 'WAIKIKI', '', '', '', '', '', '', '', 'HANA', '', '', 'HILO', '', ''] as const;
const centred = (text: string): Sector => ({ col: Math.floor((32 - text.length) / 2), text });
export const PACIFIC_SECTORS: readonly Sector[] = NAMES.map(centred);
/** The map's colour of each (the ship red, Waikiki's sand yellow, Hana's sea blue, Hilo's lava orange; the retired places none). */
export const PACIFIC_COLOURS: readonly number[] = [2, 0, 0, 7, 0, 0, 0, 0, 0, 0, 0, 6, 0, 0, 8, 0, 0];

// ---- the palettes --------------------------------------------------------------------------------------
/** The ship: the hull's red plates, the deck's bright plate, the hold's grating, the ladders, a crate step, the bow's containers, the bilge water. */
export const SHIP_PALETTE = {
  H: ['pacHullPlate', 2], D: ['pacDeckPlate', 14], G: ['pacGrating', 3], L: ['pacSteelLadder', 7], C: ['pacCrate', 9], T: ['pacContainer', 8], W: ['pacWaves', 6],
} as const satisfies Palette;

/** Waikiki: the pier's and the lawn's boards, the sand, the surf, Aloha Tower's stone, the palm's trunk, the headland's rock, the torches' flames (warning and full). */
export const WAIKIKI_PALETTE = {
  B: ['pacBoardwalk', 8], A: ['pacSand', 7], W: ['pacWaves', 14], S: ['pacTowerFace', 7], R: ['pacPalmTrunk', 9], K: ['pacBasalt', 11], Z: ['pacFlameWarn', 7], F: ['pacFlame', 2],
} as const satisfies Palette;

/** Hana (the sea is a backdrop, one flat blue: `HANA_SEA`): the black rock and sand, the reef's brown rock, coral, the moray's hole, eyes and body, and the surge's streaks. */
export const HANA_PALETTE = {
  K: ['pacBlackSand', 11], R: ['pacReefRock', 9], C: ['pacCoral', 10], H: ['pacMorayHole', 4], E: ['pacMorayEyes', 10], M: ['pacMorayBody', 13], U: ['pacSurge', 14],
} as const satisfies Palette;

/** Hilo: the crater's dark rock, the ledges' pale crust (whole and split), the lava and its crest, the rope, the steam vent's column. */
export const HILO_PALETTE = {
  K: ['pacCrust', 9], L: ['pacCrust', 15], Y: ['pacCrustSplit', 15], M: ['pacMagma', 2], C: ['pacMagmaCrest', 7], R: ['pacBamboo', 13], V: ['pacSteam', 1],
} as const satisfies Palette;

// ---- the mechanisms' data ------------------------------------------------------------------------------

/**
 * The luau's two torches on Waikiki's lawn (`pulses`): a flame two cells wide and two tall (rows 5-6: Monty's own on the lawn, floor 7). Each is out for 60 frames (safe to walk through), flickers for 30
 * (the warning), burns full height and deadly for 48 and is out again for 12: a 150-frame period. They go off 40 frames apart, east to west, so a walker who goes as one dies down finds the next
 * low as he comes; between them is a gap of three cells to wait in.
 */
export const TORCHES = { cols: [15, 10] as const, row: 5, rows: 2, period: 150, idle: 60, warn: 30, live: 48, apart: 40 } as const;
/** A torch is two groups on one timing (a pulse draws one character over its cells): the foot, which flickers into a small flame, and the head, empty until the tall flame fills both. */
const torch = (col: number, k: number, row: number, warnCode: number): PulseSpec => ({
  room: PAC.waikiki, col, row, cols: 2, rows: 1, period: TORCHES.period, start: TORCHES.idle, warn: TORCHES.warn, live: TORCHES.live, offset: (TORCHES.period - k * TORCHES.apart) % TORCHES.period,
  idle: 0, warnCode, liveCode: codeOf(WAIKIKI_PALETTE, 'F'), spent: 0,
});
export const TORCH_PULSES: readonly PulseSpec[] = TORCHES.cols.map((col, k) => torch(col, k, TORCHES.row + 1, codeOf(WAIKIKI_PALETTE, 'Z')));
export const TORCH_HEAD_PULSES: readonly PulseSpec[] = TORCHES.cols.map((col, k) => torch(col, k, TORCHES.row, 0));

/** Waikiki's surf (cols 26-30, rows 18-19): deadly waves until the snorkel; then gone, a dive into Hana's sea through its ceiling. */
export const SURF_CELLS: readonly (readonly [row: number, col: number])[] = [18, 19].flatMap((row) => [26, 27, 28, 29, 30].map((col) => [row, col] as const));

/**
 * Hana's surge (`currents`): in sets, the sea runs west along the bottom lane, 90 frames on and 120 off. Over the coral heads (rows 12-15) and in the open water past the last it carries him west at his own
 * pace; low in the lee of each head (its west side) the water is still. He shelters low in a lee while a set runs and swims on between sets.
 */
export const SURGE = { period: 210, start: 120, length: 90, warn: 30 } as const;
export const CURRENTS: readonly CurrentSpec[] = [
  { col: 10, cols: 21, top: 12, bottom: 15 }, // over the heads
  { col: 29, cols: 2, top: 16, bottom: 18 }, // past the third
].map((box): CurrentSpec => ({ room: PAC.hana, ...box, dx: -1, period: SURGE.period, start: SURGE.start, length: SURGE.length }));
/** The surge seen: streaks flicker in the lane over the heads from 30 frames before a set until it is spent (harmless `pulses`: a warning and nothing live). */
export const SURGE_PULSES: readonly PulseSpec[] = [11, 16, 21, 26].flatMap((col) => [13].map((row): PulseSpec => ({
  room: PAC.hana, col, row, cols: 2, rows: 1, period: SURGE.period, start: SURGE.start - SURGE.warn, warn: SURGE.warn + SURGE.length, live: 0,
  idle: 0, warnCode: codeOf(HANA_PALETTE, 'U'), liveCode: codeOf(HANA_PALETTE, 'U'), spent: 0,
})));

/**
 * The moray (`pulses`): in its hole in the pillar's west face by the sea cave's mouth (col 8, row 14) its eyes appear and blink for 45 frames (the warning), then it lunges west across the drop-off, a body
 * three cells long and two rows tall (cols 5-7, rows 13-14), deadly for 30 frames, and draws back. A 150-frame period, 60 of them at rest: seen before it springs, beaten by timing.
 */
export const MORAY = { hole: [8, 14], body: { col: 5, row: 13, cols: 3, rows: 2 }, period: 150, start: 60, warn: 45, live: 30 } as const;
export const MORAY_PULSES: readonly PulseSpec[] = [
  { room: PAC.hana, col: MORAY.hole[0], row: MORAY.hole[1], cols: 1, rows: 1, period: MORAY.period, start: MORAY.start, warn: MORAY.warn, live: MORAY.live, idle: codeOf(HANA_PALETTE, 'H'), warnCode: codeOf(HANA_PALETTE, 'E'), liveCode: codeOf(HANA_PALETTE, 'H'), spent: codeOf(HANA_PALETTE, 'H') },
  { room: PAC.hana, ...MORAY.body, period: MORAY.period, start: MORAY.start + MORAY.warn, warn: 15, live: MORAY.live, idle: 0, warnCode: codeOf(HANA_PALETTE, 'M'), liveCode: codeOf(HANA_PALETTE, 'M'), spent: 0 },
];

/**
 * Hilo's lava (`risingLava`): in the basin (cols 6-29, east of the shore he comes in on) it starts at the floor when he comes in and rises a row every 40 frames to row 10, the row under the long ledge's
 * feet, holds 150 and drains a row every 12. The ledges at floor 9 and above are always clear.
 */
export const LAVA: LavaSpec = {
  room: PAC.hilo, col: 6, cols: 24, baseRow: 19, topRow: 10, stepFrames: 40, holdFrames: 150, drainFrames: 12, code: codeOf(HILO_PALETTE, 'M'), crest: codeOf(HILO_PALETTE, 'C'),
};
/** The first two stepping ledges over the lava are thin crust (`cracks`): standing on one, it splits after 10 frames and is gone after 26; back 200 frames later. Keep moving. */
export const CRUST_CRACKS: readonly CrackSpec[] = [10, 15].map((col): CrackSpec => ({
  room: PAC.hilo, col, cols: 3, row: 14, codes: [codeOf(HILO_PALETTE, 'L'), codeOf(HILO_PALETTE, 'Y'), codeOf(HILO_PALETTE, 'Y')], crack: 10, wide: 18, gone: 26, away: 200,
}));
/** The steam vent halfway along the long ledge (`pulses`, cols 19-20, rows 7-8: his own on floor 9): it spits steam at its foot for 30 frames (the warning, flickering), blows full height and deadly for 40, then rests: a 160-frame period. */
export const VENT = { col: 19, row: 7, period: 160, start: 90, warn: 30, live: 40 } as const;
export const VENT_PULSES: readonly PulseSpec[] = [
  { room: PAC.hilo, col: VENT.col, row: VENT.row + 1, cols: 2, rows: 1, period: VENT.period, start: VENT.start, warn: VENT.warn, live: VENT.live, idle: 0, warnCode: codeOf(HILO_PALETTE, 'V'), liveCode: codeOf(HILO_PALETTE, 'V'), spent: 0 },
  { room: PAC.hilo, col: VENT.col, row: VENT.row, cols: 2, rows: 1, period: VENT.period, start: VENT.start, warn: VENT.warn, live: VENT.live, idle: 0, warnCode: 0, liveCode: codeOf(HILO_PALETTE, 'V'), spent: 0 },
];

/** The arrival banners: Oahu on coming aboard at Honolulu from Japan, Maui in Hana's sea, the Big Island at Hilo. One name row: 32 letters. */
export const ARRIVALS: readonly Arrival[] = [
  { rooms: [PAC.ship, PAC.waikiki], text: 'WELCOME TO HAWAII: OAHU' },
  { rooms: [PAC.hana], text: 'HAWAII: MAUI' },
  { rooms: [PAC.hilo], text: 'HAWAII: THE BIG ISLAND' },
];

/** Where the yellow mail biplane stands on Hilo's apron (its top left, playfield cells: a 3 x 3 decoration, its wheels on the apron, floor 5, its nose to the east). */
export const BIPLANE_AT = { col: 2, row: 2 } as const;
/** The parachute on the rim's high shelf (floor 5, west of the rooster's patrol; its top left). */
export const PARACHUTE_AT = { col: 20, row: 3 } as const;

/**
 * The biplane waiting on Hilo's apron (`boardings`): touched with the parachute (his top left over its cells: from its nose at column 4 west to the crater wall, standing on the apron or jumping), it takes
 * off with him into THE FLIGHT's first leg ([0,20], sky.ts), where he is on the screen; without it the hint, and nothing happens. Given the parachute's find (data.ts).
 */
export const biplaneBoarding = (parachute: number, goes: { mapRow: number; exitCol: number }): BoardingSpec => ({
  room: PAC.hilo, box: { col0: 0, row0: 0, col1: BIPLANE_AT.col + 2, row1: BIPLANE_AT.row + 2 }, needs: parachute, goes, hint: 'NO FLYING WITHOUT A PARACHUTE',
});

// ---- the backdrops -------------------------------------------------------------------------------------
const paintWaikiki = (g: Grid): void => {
  g.box(0, 0, 2, 14, 'S'); // Aloha Tower at the harbour's end, its ground floor an arcade the pier runs through (rows 15-18)
  g.box(0, 19, 5, 19, 'B').box(6, 19, 25, 19, 'A').box(26, 18, 30, 19, 'W').box(31, 0, 31, 19, 'K'); // the pier, the sand, the surf, Diamond Head's cliff closing the bay
  g.box(3, 14, 8, 14, 'B'); // the beach stand's roof
  g.box(5, 7, 19, 7, 'B'); // the hotel's lawn
  g.box(20, 6, 20, 18, 'R'); // the palm at the sea's edge, up to the lawn
};
/** The hotel's front under its lawn and the arcade's pillars on the sand (one character each, laid over the empty cells). */
const hotelFront = fillCells(paintWaikiki, [], [9, 8, 19, 11], 'pacHotelFront');
const pillars = [9, 14, 19].flatMap((col) => fillCells(paintWaikiki, [], [col, 12, col, 18], 'pacPillar'));

const paintHana = (g: Grid): void => {
    g.box(0, 0, 25, 2, 'K').box(31, 0, 31, 14, 'K').box(0, 0, 1, 19, 'K').box(0, 19, 31, 19, 'K'); // the headland and its black sand over the sea (the surf's gap, cols 26-30), the walls, the seabed
    g.box(29, 4, 30, 8, 'K').clear(29, 5, 30, 7); // the rock at the top lane's east end and the gap Hilo's glow shows through
    g.box(8, 10, 30, 10, 'C').box(8, 11, 30, 11, 'R'); // the shelf of coral on rock between the lanes
    g.box(0, 12, 4, 13, 'K').box(0, 17, 4, 18, 'K'); // the sea cave's roof and its ledge (the cave cols 2-4, rows 14-16)
    g.box(8, 12, 9, 15, 'R').box(8, 14, 8, 14, 'H'); // the pillar under the shelf and the moray's hole
    g.box(13, 16, 15, 18, 'C').box(19, 16, 22, 18, 'C').clear(19, 17, 20, 18).box(26, 16, 28, 18, 'C'); // the coral heads, low enough that the shark passes over him (a hollow in the middle one, under its overhang on the seabed)
};
/** Hana's sea over every empty cell (a backdrop: a coin is drawn over it, a pulse's cell goes back to it). */
const HANA_SEA = fillCells(paintHana, [], [0, 0, 31, 19], 'pacSeaFlat');

const paintHilo = (g: Grid): void => {
  g.box(0, 0, 1, 14, 'K').box(30, 0, 31, 19, 'K').box(0, 19, 31, 19, 'K'); // the crater's walls and floor (the shore at the left, cols 0-5, outside the lava)
  g.box(2, 5, 17, 5, 'L').clear(13, 5, 15, 5); // the airport's apron, where the biplane stands (the open sky over it)
  g.box(14, 4, 14, 8, 'R'); // the rope up to it from the long ledge
  g.box(19, 0, 19, 4, 'K').box(20, 5, 26, 5, 'L'); // the rim's spur and the high shelf east of it (floor 5): the spur shuts it off from the apron, so the shelf is only up the east wall's rope
  g.box(10, 9, 29, 9, 'L').clear(27, 9, 29, 9).box(19, 9, 20, 9, 'Y'); // the long ledge (floor 9), the vent's crack in it
  g.box(28, 4, 28, 13, 'R'); // the rope up the east wall, past the long ledge on up to the shelf
  g.box(5, 14, 7, 14, 'L').box(10, 14, 12, 14, 'L').box(15, 14, 17, 14, 'L').box(20, 14, 29, 14, 'L'); // the first ledge and the stepping ledges (floor 14)
  g.box(3, 13, 3, 18, 'R'); // the rope up from the shore
};

// ---- the rooms ----------------------------------------------------------------------------------------------

export const PACIFIC_ROOMS: readonly RoomSpec[] = [
  // A THE CARGO SHIP: the ship in section, moored at Honolulu; the region's tightest room, crossed three times at three heights. In from Japan's gangway on the landing (floor 13); up the crate step onto
  // the deck (floor 9), east past the funnel (its catwalk's rung ladder: a coin) and the bridge, under the crane's hoisted crate, down the hatch into the hold (floor 14); west along the hold between two
  // pistons (Mole Crushers) to the ladder down into the bilge (floor 19), east over a gap of bilge water and out of the bow's cargo door onto the pier. The bow's containers close the deck's end: the door is
  // seen from the deck and reached only by the hold and the bilge.
  room({
    id: PAC.ship, cell: [2, 17], sector: 38, palette: SHIP_PALETTE,
    paint(g) {
      g.box(0, 13, 1, 19, 'H').box(2, 14, 3, 18, 'H').box(0, 13, 3, 13, 'D'); // the hull's side and the landing (Japan's gangway: as the first build had it)
      g.box(4, 11, 6, 12, 'C').box(4, 13, 6, 19, 'H'); // the crate step on the stern's bulkhead
      g.box(7, 9, 29, 9, 'D').box(7, 10, 29, 10, 'H').clear(26, 9, 28, 10); // the deck, its belly, the hatch
      g.box(29, 0, 31, 8, 'T').box(30, 9, 31, 14, 'H'); // the bow's stacked containers and its hull
      g.box(8, 4, 11, 4, 'G').box(12, 3, 12, 8, 'L'); // the funnel's catwalk and its rung ladder
      g.box(27, 8, 27, 13, 'L'); // the hatch ladder
      g.box(7, 14, 29, 14, 'G').clear(7, 14, 9, 14); // the hold's grating, the ladder's way down
      g.box(8, 11, 8, 18, 'L'); // the ladder down into the bilge
      g.box(2, 19, 31, 19, 'H').box(18, 19, 19, 19, 'W'); // the bilge's floor and its water
    },
    coins: [[9, 3], [17, 13]],
    decor: [['pacFunnel', 8, 5], ['pacBridge', 17, 6], ['pacCraneJib', 22, 1], ['pacLifeRing', 4, 9]],
    creatures: [
      { who: 'pacParrot', col: 14, row: 1, way: 'down', speed: 1, range: 40 },
      { who: 'pacSwingCrate', col: 23, row: 3, way: 'down', speed: 1, range: 32 },
      { who: 'agent', col: 0, row: 11, way: 'right', speed: 1, range: 1 }, // Viktor Vole, aboard behind him (viktor.ts `shipPursuer`: he walks Monty's path, not a patrol)
    ],
    crushers: [{ col: 11, row: 11, height: 3 }, { col: 20, row: 11, height: 3 }],
  }),

  // B WAIKIKI: Oahu, the harbour's end to the surf. In through Aloha Tower's arcade onto the pier (floor 19); east along the sand to the sea, which stops him (deadly surf until the snorkel). The snorkel lies on
  // the beach stand's roof (floor 14), seen from the sand and out of reach. The palm at the sea's edge climbs to the hotel's lawn (floor 7): west past the luau's two torches (a coin between them) and the
  // hula dancer to the lei, and off the lawn's end onto the stand's roof; down to the sand, east to the sea, and the dive. A coconut drops from the second palm by the surf, a tern dives over it.
  room({
    id: PAC.waikiki, cell: [2, 18], sector: 41, palette: WAIKIKI_PALETTE,
    paint: paintWaikiki,
    coins: [[13, 6], [19, 6]],
    item: { name: 'snorkel', col: 6, row: 12, sprite: PAC_SPRITE.snorkel },
    item2: { name: 'lei', col: 7, row: 5, sprite: PAC_SPRITE.lei },
    decor: [
      ...hotelFront, ...pillars, ['pacFronds', 18, 4],
      ['pacSnorkelShop', 3, 15], ['pacPalm', 22, 13],
    ],
    creatures: [
      { who: 'pacHula', col: 5, row: 5, way: 'right', speed: 1, range: 24 },
      { who: 'pacCoconut', col: 23, row: 13, way: 'down', speed: 1, range: 24, colour: 8 },
      { who: 'pacTern', col: 27, row: 8, way: 'down', speed: 1, range: 48 },
    ],
  }),

  // C HANA: Maui's coast in section, the one swim room, all water. In through the ceiling's gap from Waikiki's surf (cols 26-30, its only way up). West along the top lane under the headland (a turtle
  // rising to breathe), Hilo's red glow seen through a gap in the rock at its east end; down the drop-off at the west, past the moray by the sea cave's mouth (the cave a pocket with the musubi and a coin);
  // east along the bottom lane against the surge, from lee to lee of the coral heads (a coin in the middle head's hollow), under the reef shark's patrol, and out at the bottom right onto Hilo's shore.
  room({
    id: PAC.hana, cell: [3, 18], sector: 49, palette: HANA_PALETTE,
    paint: paintHana,
    coins: [[20, 18], [4, 16]],
    item: { name: 'musubi1', col: 2, row: 15, sprite: PAC_SPRITE.musubi },
    decor: [...HANA_SEA, ['pacGlow', 29, 5]],
    creatures: [
      { who: 'pacTurtle', col: 16, row: 3, way: 'down', speed: 1, range: 32 },
      { who: 'pacSharkFin', col: 10, row: 12, way: 'right', speed: 1, range: 144 },
    ],
  }),

  // D HILO: the Big Island, Kilauea's flow below the airport; the set piece. Out of the sea onto the lava-rock shore (floor 19, outside the lava), and the lava starts to rise. Up the rope to the first ledge
  // (floor 14), east over three stepping ledges (the first two cooled crust that cracks under a standing foot; a magma blob bobs up between them), up the rope on the east wall to the long ledge (floor 9:
  // the lava stops under it). The parachute is seen from there, on the rim's high shelf above: on up the same rope past the long ledge (a coin at its head), past the strutting rooster to the parachute,
  // and back down. West along the long ledge past the steam vent, up the rope to the apron (floor 5), past the nene to the yellow mail biplane, and away (`biplaneBoarding`). The third coin is the one the
  // cut cargo plane's hold had (so its place in the coin table, and saves, are as they were); the parachute is the hold's item, in the same place in the finds.
  room({
    id: PAC.hilo, cell: [3, 19], sector: 52, palette: HILO_PALETTE,
    paint: paintHilo,
    coins: [[16, 13], [26, 8], [25, 4]],
    item: { name: 'parachute', col: PARACHUTE_AT.col, row: PARACHUTE_AT.row, sprite: PAC_SPRITE.parachute },
    decor: [['skyBiplane', BIPLANE_AT.col, BIPLANE_AT.row]],
    creatures: [
      { who: 'pacMagma', col: 13, row: 16, way: 'up', speed: 1, range: 40, colour: 1 },
      { who: 'pacNene', col: 6, row: 3, way: 'right', speed: 1, range: 24 },
      { who: 'pacRooster', col: 23, row: 3, way: 'right', speed: 1, range: 8 },
    ],
  }),
];
