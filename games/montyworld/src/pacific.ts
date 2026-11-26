import type { Arrival, BoardingSpec, CharAnim, CrackSpec, CurrentSpec, IcicleSpec, LavaSpec, PulseSpec, RollerSpec, SwimSurface, TunnelSpec } from '../../montyotr/src/montydata';
import { PLAY_ROW } from '../../shared/monty/screen';
import type { RoomSpec, Sector } from '../../shared/monty/rooms';
import { WORLD_DECOR, type WorldDecor } from './art/world';
import { BOULDER_POINTERS } from './andes-pointers';
import { BUBBLE_FRAMES, SPLASH_FRAMES, STREAK_FRAMES } from './art/pacific-falls';
import { HULA_FRAMES } from './art/pacific-islands';
import { codeOf, decorIndex, fillCells, fillWhere, type Grid, room, type Palette } from './layout';

/**
 * The Pacific, the fifth region of Do Svidaniya Monty: Hawaii's island hopping (docs/dosvidaniya-back-half-plan.md, "Hawaii"; Chris, 2026-11-25: "landing in Honolulu, then climbing Diamond Head to get
 * the snorkel that a tourist left behind, then snorkeling past Molokai to Lahaina, Road to Hana, then more snorkeling from that beach ... to the Big Island (Kona)", where the island splits over Mauna Kea and
 * Mauna Loa into Hilo and the plane). Nineteen rooms on four islands and three swims, the rooms the 2026-11-23 reset cut brought back as they were designed (`804a838^`) and the Big Island's fork new.
 *
 *            col 17          18              19              20              21              22              23
 *   row 0                    DIAMOND HEAD    THE LOOKOUT
 *   row 1                    LEI OF THE LAND                                                 THE SUMMIT
 *   row 2    THE CARGO SHIP  WAIKIKI         WHALE OF A TIME THE ROAD TO HANA HANA           MAUNA KEA   <->  AKAKA FALLS
 *   row 3                    CLAM DOWN       KELP WANTED     THE SEA CAVE    FISH OUT OF     KONA        <->  HILO GOODBYE  -> the biplane: THE FLIGHT
 *                                                                            WATER
 *   row 4                                                                                    MAUNA LOA   <->  COFFEE BREAK
 *
 * Oahu: off the ship onto Waikiki's beach, where the surf stops him (deadly until the snorkel); up the palm to the luau (the torches, the hula show, the lei), up the hillside rope to Diamond Head's crater
 * trail and through the old bunker to THE LOOKOUT, where a tourist left the snorkel; back down and into the surf. The first swim (CLAM DOWN, Molokai's sea cliffs behind; KELP WANTED) comes up Lahaina's
 * mooring rope on Maui (or on east through the sea cave and up the road's pool); THE ROAD TO HANA's three tiers with the cars over the one-lane bridges; Hana's red sand cove drops into the last swim (FISH
 * OUT OF WATER: the surge, the moray, the shark), out onto Kona's black sand on the Big Island. There the way splits into a loop, Moscow's way (docs/dosvidaniya-moscow.md part 1): the top way up
 * through the cloud to Mauna Kea's summit, where the astronomer keeps the ladder to the parachute drawn up until Monty brings him the moon rock, then along Akaka Falls' high trail and down into Hilo; the
 * bottom way down the lava tube to Mauna Loa (the run ahead of the lava; the moon rock down the crater's pit, which wakes the pit's own lava) and along the coffee farm (the coffee) up into Hilo. Every join
 * goes both ways, and Akaka Falls is crossed twice at two heights (the high trail, and the low lane from Hilo's roofs to Mauna Kea's foot). The biplane takes off only with both (NO FLYING WITHOUT A
 * PARACHUTE, TOO SLEEPY TO FLY), and the summit's gate wants the bottom way's rock: whichever way he takes first, the loop sends him round for the other. Playfield cells as in moscow.ts.
 */

// ---- the ids -----------------------------------------------------------------------------------------
/**
 * Room ids never change once a region has shipped: the first build's (38-54) that came back keep theirs (HANA BANANA's 49 had become the swim room, now FISH OUT OF WATER; MAUNA KEA-OS's 52 the lava, now on
 * Mauna Loa; COFFEE BREAK's 51 and HILO GOODBYE's 53 back to their own), and the new ones go on after the sky's (79-81) and those other regions keep for their returns (82-86): 87 on. 39, 40, 44, 50 and 54
 * stay retired (save-migrate.ts carries a save in one on in a kept room).
 */
export const PAC = {
  ship: 38, waikiki: 41, luau: 42, clam: 43, kelp: 45, lahaina: 46, road: 47, cave: 48, fish: 49, coffee: 51, loa: 52, hilo: 53,
  hana: 87, diamond: 88, lookout: 89, kona: 90, kea: 91, summit: 92, falls: 93,
} as const;

/** The rooms of open water (swim.ts): Monty swims in them, and only with the snorkel. */
export const SWIM_ROOMS: readonly number[] = [PAC.clam, PAC.kelp, PAC.cave, PAC.fish];
/**
 * The swim past Molokai is open sea under the sky (Chris, 2026-11-25: "In the original pass there was a good swimming scene with Molokai in the background"): its two rooms' sea has a surface (`SURFACE`,
 * the row of the waves), Molokai's sea cliffs and Maui's mountains over it. He floats up with his head at the waterline (swim.ts, `swimSurfaces`), and coming in from Waikiki's surf above he drops in.
 */
const SURFACE = 6;
export const SWIM_SURFACES: readonly SwimSurface[] = [PAC.clam, PAC.kelp].map((room) => ({ room, y: 0x32 + (SURFACE + PLAY_ROW) * 8 - 4 }));

/**
 * The sprite pointers (in the bank) of the Pacific's items: the original's item blocks the world never uses ($8F-$91, $93, $94). The bank is full, so the moon rock borrows the first boulder block while
 * Mauna Loa is loaded (`roomBlocks`, data.ts; no boulder rolls there), the only room that shows it (it is not one of the map's key items: they need a block of their own).
 */
export const PAC_SPRITE = { coffee: 0x8f, snorkel: 0x90, lei: 0x91, musubi: 0x93, parachute: 0x94, moonRock: BOULDER_POINTERS[0] } as const;

const centred = (text: string): Sector => ({ col: Math.floor((32 - text.length) / 2), text });
/** The sectors' names by their place from 38 (the Andes' follow at 55, so the list keeps seventeen places: the retired rooms' are empty). Plain names, a pun where it lands. */
const NAMES = [
  'THE CARGO SHIP', '', '', 'WAIKIKI', 'LEI OF THE LAND', 'CLAM DOWN', '', 'KELP WANTED', 'WHALE OF A TIME', 'THE ROAD TO HANA', 'THE SEA CAVE', 'FISH OUT OF WATER', '', 'COFFEE BREAK', 'MAUNA LOA', 'HILO GOODBYE', '',
] as const;
export const PACIFIC_SECTORS: readonly Sector[] = NAMES.map(centred);
/** The map's colour of each (the ship red, the beach yellow, the luau pink, the swims blue, Lahaina brown, the road green, Molokai's... the farm brown, the lava orange, Hilo grey; the retired none). */
export const PACIFIC_COLOURS: readonly number[] = [2, 0, 0, 7, 10, 6, 0, 14, 9, 5, 6, 14, 0, 9, 8, 12, 0];
/** The sectors from 82 on (the rooms that came back after the sky's, 87-93; 82-86 are other regions' returns, empty here), and their map colours. */
const LATER_NAMES: Readonly<Record<number, string>> = { 87: 'HANA', 88: 'DIAMOND HEAD', 89: 'THE LOOKOUT', 90: 'KONA', 91: 'MAUNA KEA', 92: 'THE SUMMIT', 93: 'AKAKA FALLS' };
const LATER_COLOURS: Readonly<Record<number, number>> = { 87: 10, 88: 9, 89: 1, 90: 11, 91: 2, 92: 1, 93: 5 };
const LATER = Array.from({ length: PAC.falls - 82 + 1 }, (_, i) => 82 + i);
export const PACIFIC_LATER_SECTORS: readonly Sector[] = LATER.map((id) => centred(LATER_NAMES[id] ?? ''));
export const PACIFIC_LATER_COLOURS: readonly number[] = LATER.map((id) => LATER_COLOURS[id] ?? 0);

// ---- the palettes --------------------------------------------------------------------------------------
/** The ship: the hull's red plates, the deck's bright plate, the hold's grating, the ladders, a crate step, the bow's containers, the bilge water. */
export const SHIP_PALETTE = {
  H: ['pacHullPlate', 2], D: ['pacDeckPlate', 14], G: ['pacGrating', 3], L: ['pacSteelLadder', 7], C: ['pacCrate', 9], T: ['pacContainer', 8], W: ['pacWaves', 6],
} as const satisfies Palette;

/** Waikiki: the pier's and the lawn's boards, the sand, the surf, Aloha Tower's stone, the palm's trunk, Diamond Head's rock. */
export const WAIKIKI_PALETTE = {
  B: ['pacBoardwalk', 8], A: ['pacSand', 7], W: ['pacWaves', 14], S: ['pacTowerFace', 7], R: ['pacPalmTrunk', 9], K: ['pacBasalt', 11],
} as const satisfies Palette;

/** The luau: the lawn's sand, the stage's boards, the crate steps, the palm, the hillside rope, the torches' embers and flames (warning and full). */
export const LUAU_PALETTE = {
  A: ['pacSand', 7], B: ['pacBoardwalk', 9], C: ['pacCrate', 9], P: ['pacPalmTrunk', 9], R: ['pacBamboo', 13], Y: ['pacEmber', 7], Z: ['pacFlameWarn', 7], F: ['pacFlame', 2],
} as const satisfies Palette;

/** Diamond Head's trail and the bunker's: the stone steps, the rope up from the luau, the concrete, the crater's rock. */
export const DIAMOND_PALETTE = {
  T: ['pacTrail', 15], R: ['pacBamboo', 13], C: ['pacConcrete', 12], K: ['pacTuff', 8],
} as const satisfies Palette;

/** A swim room's (the sea is a backdrop, one flat blue: `SEA`): the cliffs over the water, the reef's rock, coral, the mooring and cove ropes, the moray's hole, eyes and body, and the surge's streaks. */
export const SEA_PALETTE = {
  K: ['pacBlackSand', 11], R: ['pacReefRock', 9], C: ['pacCoral', 10], L: ['pacBamboo', 13], H: ['pacMorayHole', 4], E: ['pacMorayEyes', 10], M: ['pacMorayBody', 13], U: ['pacSurge', 6],
} as const satisfies Palette;

/** Lahaina: the fort's coral-block wall and the quay, the harbour water, the brig's hull and deck, the ropes, the crates. */
export const WHALE_PALETTE = {
  Q: ['pacWallStone', 9], W: ['pacWaves', 6], H: ['pacHullPlate', 2], D: ['pacDeckPlate', 14], R: ['pacBamboo', 13], C: ['pacCrate', 9],
} as const satisfies Palette;

/** The road's eight: the road, the bridge's deck, the cliff, the bamboo to climb, and the red car's cabin and body. */
export const ROAD_PALETTE = {
  R: ['pacRoad', 15], B: ['pacBridgeDeck', 8], S: ['pacBasalt', 13], V: ['pacBamboo', 13], Y: ['pacCarCab', 2], Z: ['pacCarBody', 2],
} as const satisfies Palette;

/** Hana: the headland's rock and turf, Kaihalulu's red sand, the bamboo rope, the swash of the surf up the beach. */
export const HANA_PALETTE = {
  B: ['pacBasalt', 9], T: ['pacTurf', 5], K: ['pacBlackSand', 10], R: ['pacBamboo', 13], P: ['pacSwash', 6],
} as const satisfies Palette;

/** Kona: the black sand and the lava rock, the tide pool, the ropes up to Mauna Kea and down the lava tube to Mauna Loa. */
export const KONA_PALETTE = {
  K: ['pacBlackSand', 12], B: ['pacBasalt', 9], W: ['pacWaves', 14], R: ['pacBamboo', 13],
} as const satisfies Palette;

/** Mauna Kea and its summit: the red cinder, the rope, the observatory's catwalk and ladders. */
export const KEA_PALETTE = {
  C: ['pacBasalt', 10], R: ['pacBamboo', 13], G: ['pacGrating', 15], L: ['pacSteelLadder', 15],
} as const satisfies Palette;

/** Akaka Falls: the gorge's rock and its mossy trail, the plunge pool, the ropes down to Hilo. */
export const FALLS_PALETTE = {
  B: ['pacBasalt', 9], T: ['pacTurf', 13], W: ['pacWaves', 14], R: ['pacBamboo', 13],
} as const satisfies Palette;

/** Mauna Loa: the crater's dark rock, the ledges' pale crust (whole and split), the lava and its crest, the ropes, the steam vent's column. */
export const LOA_PALETTE = {
  K: ['pacCrust', 9], L: ['pacCrust', 15], Y: ['pacCrustSplit', 15], M: ['pacMagma', 2], C: ['pacMagmaCrest', 7], R: ['pacBamboo', 13], V: ['pacSteam', 1],
} as const satisfies Palette;

/** The coffee farm: the terraces' turf over red soil, the rope up to Hilo, the low lane's road. */
export const COFFEE_PALETTE = {
  T: ['pacTurf', 13], S: ['pacBasalt', 9], R: ['pacBamboo', 13], P: ['pacRoad', 15], B: ['pacReefRock', 9],
} as const satisfies Palette;

/** Hilo: the street, the storefronts' roofs, the bayfront's sea wall, the rope down to the farm. */
export const HILO_PALETTE = {
  P: ['pacRoad', 11], J: ['pacBridgeDeck', 8], H: ['pacHotelWall', 7], R: ['pacBamboo', 13], S: ['pacSeaWall', 14],
} as const satisfies Palette;

// ---- the backdrops -------------------------------------------------------------------------------------
/** The open sea of a swim room over every cell its paint leaves empty below the cliffs (a backdrop: a coin is drawn over it, a pulse's cell goes back to it). */
const seaOf = (paint: (g: Grid) => void, keep: readonly (readonly [col: number, row: number])[] = []) => fillCells(paint, keep, [0, 0, 31, 19], 'pacSeaFlat');
/** The luau's and Diamond Head's sunset: the sky's bands over every empty cell (rows `bands`), then the sea's waves on the horizon; only where `sky(col, row)` holds (above a ridge line), everywhere by default. */
function sunset(paint: (g: Grid) => void, keep: readonly Cell[], rows: { purple: number; red: number; orange: number; gold: number; sea?: number }, sky: (col: number, row: number) => boolean = () => true): Placed[] {
  const { purple, red, orange, gold, sea } = rows;
  const band = (r0: number, r1: number, piece: WorldDecor) => fillWhere(paint, keep, (c, r) => r >= r0 && r <= r1 && sky(c, r), piece);
  return [
    ...band(0, purple, 'pacSkyPurple'), ...band(purple + 1, red, 'pacSkyRed'), ...band(red + 1, orange, 'pacSkyOrange'), ...band(orange + 1, gold, 'pacSkyGold'),
    ...(sea === undefined ? [] : band(gold + 1, sea, 'pacSeaWave')),
  ];
}
type Cell = readonly [col: number, row: number];
type Placed = readonly [WorldDecor, number, number];
/** The cells a decoration of `w` x `h` characters covers from its top left: kept clear of a backdrop laid round it. */
/** The cells under a decoration placed at its top left, for keeping a backdrop out from under it. */
const under = ([piece, col, row]: readonly [WorldDecor, number, number]): Cell[] => cellsOf(col, row, WORLD_DECOR[piece].w, WORLD_DECOR[piece].h);
const cellsOf = (col: number, row: number, w: number, h: number): Cell[] => Array.from({ length: w * h }, (_, i) => [col + (i % w), row + Math.floor(i / w)] as const);
/** A ridge line: the row each column's slope starts at, from a list of (column, row) points joined by straight runs (the first and last held out to the edges). */
function ridge(points: readonly Cell[]): (col: number) => number {
  return (col) => {
    const after = points.findIndex(([c]) => c >= col);
    if (after <= 0) return (after === 0 ? points[0] : points[points.length - 1])?.[1] ?? 0;
    const a = points[after - 1], b = points[after];
    if (a === undefined || b === undefined) return 0;
    return Math.round(a[1] + ((b[1] - a[1]) * (col - a[0])) / Math.max(1, b[0] - a[0]));
  };
}
// ---- the mechanisms' data ------------------------------------------------------------------------------

/** Waikiki's surf (cols 26-30, rows 18-19): deadly waves until the snorkel; then gone, a dive into CLAM DOWN's sea through its ceiling. */
export const SURF_CELLS: readonly (readonly [row: number, col: number])[] = [18, 19].flatMap((row) => [26, 27, 28, 29, 30].map((col) => [row, col] as const));

/**
 * The luau's three torches on the lawn (`pulses`): a flame two cells wide and two tall (rows 17-18: Monty's own on the lawn, floor 19). Each is out for 60 frames (safe to walk through), flickers for 30
 * (the warning), burns full height and deadly for 48 and is out again for 12: a 150-frame period. They go off 40 frames apart, east to west, so a walker who goes as one dies down finds the next
 * low as he comes; between them are gaps of three cells to wait in (the middle one under the hillside rope).
 */
export const TORCHES = { cols: [16, 11, 6] as const, row: 17, rows: 2, period: 150, idle: 60, warn: 30, live: 48, apart: 40 } as const;
/** A torch is two groups on one timing (a pulse draws one character over its cells): the foot, which flickers into a small flame, and the head, empty until the tall flame fills both. */
const torch = (col: number, k: number, row: number, idle: number, warnCode: number): PulseSpec => ({
  room: PAC.luau, col, row, cols: 2, rows: 1, period: TORCHES.period, start: TORCHES.idle, warn: TORCHES.warn, live: TORCHES.live, offset: (TORCHES.period - k * TORCHES.apart) % TORCHES.period,
  idle, warnCode, liveCode: codeOf(LUAU_PALETTE, 'F'), spent: idle,
});
/** (the foot glows as embers while the torch is out, so it is seen where it stands) */
export const TORCH_PULSES: readonly PulseSpec[] = TORCHES.cols.map((col, k) => torch(col, k, TORCHES.row + 1, codeOf(LUAU_PALETTE, 'Y'), codeOf(LUAU_PALETTE, 'Z')));
export const TORCH_HEAD_PULSES: readonly PulseSpec[] = TORCHES.cols.map((col, k) => torch(col, k, TORCHES.row, 0, 0));

/**
 * THE LOOKOUT's tumbling rocks (rollers; the Andes' boulders' pictures): two, half a period apart, from the crater rim above the summit's lookout (col 28, falling in at the top of the room) along the summit
 * (floor 4), down the stairs (floors 6, 8) a pixel a frame, a fall of two rows at each edge, and gone at the tunnel's mouth (col 13): the tunnel is where to wait, the rocks never come into it. `every` 400
 * frames; a rock is on the path about 170 of them, so one at a time. (On sprites 4 and 5: the room has no creatures, and the snorkel is on sprite 0.)
 */
export const ROCK_PATH: readonly (readonly [col: number, row: number])[] = [[28, 0], [28, 2], [22.4, 2], [21.4, 4], [18.2, 4], [17.4, 6], [14.2, 6], [13.4, 8], [13.4, 8]];
export const ROCKS: readonly RollerSpec[] = [0, 200].map((start, i): RollerSpec => ({
  room: PAC.lookout, sprite: 4 + i, path: ROCK_PATH, speed: 1, every: 400, start, frames: BOULDER_POINTERS, colour: 9,
}));

/**
 * The Road to Hana's one-lane bridges (`tunnels` with a `span`): a red rental car, four cells long and two tall (the lane's own two rows), drives over each bridge, always the way Monty is going: it waits
 * 150 frames off the bridge, flashes its headlamps at the bridge's near end for 32 (the warning: the edge of the bridge lights), then drives over a cell every 4 frames (a bridge is 12 cells: 64 frames to be gone).
 * Monty takes 16 frames a cell, so a crossing that starts as the car clears the far end is a clear one (192 frames against the 182 the car waits and flashes, and it only gains from behind a little after);
 * stepping on as it flashes is not. The three bridges' cars are 70 frames apart so they come round in turn. (As the first build had it: Chris, 2026-11-25, "I really loved the three tiers with the cars driving through".)
 */
export const BRIDGES = [
  { level: 18, from: 'left', first: 8, last: 19, offset: 0 },
  { level: 13, from: 'right', first: 12, last: 23, offset: 70 },
  { level: 8, from: 'left', first: 11, last: 22, offset: 140 },
] as const;
export const CAR = { cols: 4, step: 4, rest: 150, warn: 32 } as const;
export const BRIDGE_CARS: readonly TunnelSpec[] = BRIDGES.map((b): TunnelSpec => ({
  room: PAC.road, from: b.from, code: codeOf(ROAD_PALETTE, 'Z'), cols: CAR.cols, top: b.level - 2, bottom: b.level - 1, step: CAR.step, rest: CAR.rest, warn: CAR.warn, offset: b.offset, span: { from: b.first, to: b.last },
  picture: [[0, codeOf(ROAD_PALETTE, 'Y'), codeOf(ROAD_PALETTE, 'Y'), 0], [codeOf(ROAD_PALETTE, 'Z'), codeOf(ROAD_PALETTE, 'Z'), codeOf(ROAD_PALETTE, 'Z'), codeOf(ROAD_PALETTE, 'Z')]],
}));

/**
 * The waterfalls move (charAnims cycles, charanim.ts): the streaks of the cascade's three middle rows (cells 2-7) fall, a roll of 3 pixels a frame, and the splash at its foot (cells 8-9) throws up spray and
 * mist: the Road to Hana's two cascades down the cliff, the road's pool falling into the sea cave, and Akaka Falls' two drops.
 */
export const FALLS_ANIMS: readonly CharAnim[] = [PAC.road, PAC.cave, PAC.falls].flatMap((room): CharAnim[] => {
  const cells = (from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => ({ decor: decorIndex('pacWaterfall'), cell: from + i }));
  return [
    { kind: 'cycle', room, chars: cells(2, 7), frames: STREAK_FRAMES, every: 1 },
    { kind: 'cycle', room, chars: cells(8, 9), frames: SPLASH_FRAMES, every: 2 },
  ];
});
/** The line of hula dancers behind the luau's stage dances (the plan: "swaying on the beat"; Chris, 2026-11-25: "not enough hula"): the decoration's six characters take the hula's four pictures, a beat each (12 steps, 24 frames). */
export const HULA_ANIM: CharAnim = { kind: 'cycle', room: PAC.luau, chars: [0, 1, 2, 3, 4, 5].map((cell) => ({ decor: decorIndex('pacHulaDancer'), cell })), frames: HULA_FRAMES, every: 12 };
/** The bubbles rise in every swim room (a `charAnims` cycle over the decoration's two characters: the rings climb 2 pixels a step and come round again at the foot). */
export const BUBBLE_ANIMS: readonly CharAnim[] = SWIM_ROOMS.map((room): CharAnim => ({
  kind: 'cycle', room, chars: [0, 1].map((cell) => ({ decor: decorIndex('pacBubbles'), cell })), frames: BUBBLE_FRAMES, every: 1,
}));

/**
 * Hana's wave (`pulses`): the surf sweeps up Kaihalulu's red sand from the cove: three groups of cells two rows tall (rows 16-17, the height of him) start one after another from the cove (cols 24-25, 22-23,
 * 21), spray for 16 frames (the warning), the wave is across the beach for 40 (deadly: jump it, or wait on the steps), and it draws back the way it came. A 220-frame period.
 */
export const WAVE = { period: 220, start: 100, warn: 16, live: 40, rows: 2, row: 16, groups: [{ col: 24, cols: 2 }, { col: 22, cols: 2 }, { col: 21, cols: 1 }], apart: 14 } as const;
export const WAVE_PULSES: readonly PulseSpec[] = WAVE.groups.map((g, k): PulseSpec => ({
  room: PAC.hana, col: g.col, row: WAVE.row, cols: g.cols, rows: WAVE.rows, period: WAVE.period, start: WAVE.start + k * WAVE.apart, warn: WAVE.warn, live: WAVE.live - k * 4,
  idle: 0, warnCode: codeOf(HANA_PALETTE, 'P'), liveCode: codeOf(HANA_PALETTE, 'P'), spent: 0,
}));

/**
 * FISH OUT OF WATER's surge (`currents`): in sets, the sea runs west along the bottom lane, 90 frames on and 120 off. Over the coral heads (rows 12-15) and in the open water past the last it carries him west
 * at his own pace; low in the lee of each head (its west side) the water is still. He shelters low in a lee while a set runs and swims on between sets.
 */
export const SURGE = { period: 210, start: 120, length: 90, warn: 30 } as const;
export const CURRENTS: readonly CurrentSpec[] = [
  { col: 10, cols: 21, top: 12, bottom: 15 }, // over the heads
  { col: 29, cols: 2, top: 16, bottom: 18 }, // past the third
].map((box): CurrentSpec => ({ room: PAC.fish, ...box, dx: -1, period: SURGE.period, start: SURGE.start, length: SURGE.length }));
/**
 * The surge seen: flow lines in the lane over the heads (two rows of them, staggered), steady (not a flicker: Chris, 2026-11-25, "I don't know what the flashing blue things are") from 30 frames before a set until it is spent
 * (harmless `pulses`: shown from `start` as their spent look, nothing live), sliding west as the water runs (`SURGE_ANIM`), so the coming set is seen as the water starting to run.
 */
export const SURGE_PULSES: readonly PulseSpec[] = ([[13, [11, 16, 21, 26]], [15, [13, 18, 23, 28]]] as const).flatMap(([row, cols]) => cols.map((col): PulseSpec => ({
  room: PAC.fish, col, row, cols: 2, rows: 1, period: SURGE.period, start: SURGE.start - SURGE.warn, warn: 0, live: 0,
  idle: 0, warnCode: codeOf(SEA_PALETTE, 'U'), liveCode: codeOf(SEA_PALETTE, 'U'), spent: codeOf(SEA_PALETTE, 'U'),
})));
/** The flow lines slide west a pixel a step (half a pixel a frame), the water's way: FISH OUT OF WATER's over the heads and the sea cave's in its lava tube. */
export const SURGE_ANIMS: readonly CharAnim[] = [PAC.fish, PAC.cave].map((room): CharAnim => ({ kind: 'scroll', room, rings: [[codeOf(SEA_PALETTE, 'U')]], dx: -1, px: 1, every: 1 }));

/**
 * THE SEA CAVE, the bonus off the route (Chris, 2026-11-25: "Having a bonus room that is off the path is an opportunity to try some new things and add some fun challenges"): an old lava tube runs east under
 * the cavern's floor from its mouth by the reef's doorway (cols 2-5) to a pocket of still water at its end (cols 24-29), where the Spam musubi is. The swell drains out of the tube in sets (`currents`, west,
 * as FISH OUT OF WATER's surge, flow lines seen 30 frames before), and two loose stalactites hang in cracks in its roof (`icicles`, drawn in the rock's grey): passing under one at his pace is safe, but a set
 * that catches him past one carries him back under it as it falls. So: wait at the mouth for a set to drain, swim in, up into the alcove halfway (a coin) before the next, out of it as that one is spent
 * and on into the pocket; then ride a set out. The new things: the sea drags him back into a trap he has sprung, and he reads two clocks at once.
 */
export const CAVE_TUBE = { col: 6, cols: 18, top: 15, bottom: 18, alcove: 13, end: 24 } as const;
export const CAVE_TIDE = { period: 220, start: 140, length: 80, warn: 30 } as const;
export const CAVE_STALACTITES: readonly IcicleSpec[] = [10, 19].map((col): IcicleSpec => ({ room: PAC.cave, col, row: 13, floor: 19, colour: 15 }));
const CAVE_CURRENT: CurrentSpec = { room: PAC.cave, col: CAVE_TUBE.col, cols: CAVE_TUBE.cols, top: CAVE_TUBE.top, bottom: CAVE_TUBE.bottom, dx: -1, period: CAVE_TIDE.period, start: CAVE_TIDE.start, length: CAVE_TIDE.length };
/** The tube's flow lines (harmless `pulses`, as the surge's over the heads): two staggered rows, seen from 30 frames before a set until it is spent. */
const CAVE_FLOW_PULSES: readonly PulseSpec[] = ([[15, [7, 12, 17, 22]], [17, [9, 14, 20]]] as const).flatMap(([row, cols]) => cols.map((col): PulseSpec => ({
  room: PAC.cave, col, row, cols: 2, rows: 1, period: CAVE_TIDE.period, start: CAVE_TIDE.start - CAVE_TIDE.warn, warn: 0, live: 0,
  idle: 0, warnCode: codeOf(SEA_PALETTE, 'U'), liveCode: codeOf(SEA_PALETTE, 'U'), spent: codeOf(SEA_PALETTE, 'U'),
})));
/** The surges of the Pacific (FISH OUT OF WATER's, the sea cave's tube) and their flow lines. */
export const PACIFIC_CURRENTS: readonly CurrentSpec[] = [...CURRENTS, CAVE_CURRENT];
export const PACIFIC_FLOW_PULSES: readonly PulseSpec[] = [...SURGE_PULSES, ...CAVE_FLOW_PULSES];

/**
 * The moray (`pulses`): in its hole in the pillar's west face by the sea cave's mouth (col 8, row 14) its eyes appear and blink for 45 frames (the warning), then it lunges west across the drop-off, a body
 * three cells long and two rows tall (cols 5-7, rows 13-14), deadly for 30 frames, and draws back. A 150-frame period, 60 of them at rest: seen before it springs, beaten by timing.
 */
export const MORAY = { hole: [8, 14], body: { col: 5, row: 13, cols: 3, rows: 2 }, period: 150, start: 60, warn: 45, live: 30 } as const;
export const MORAY_PULSES: readonly PulseSpec[] = [
  { room: PAC.fish, col: MORAY.hole[0], row: MORAY.hole[1], cols: 1, rows: 1, period: MORAY.period, start: MORAY.start, warn: MORAY.warn, live: MORAY.live, idle: codeOf(SEA_PALETTE, 'H'), warnCode: codeOf(SEA_PALETTE, 'E'), liveCode: codeOf(SEA_PALETTE, 'H'), spent: codeOf(SEA_PALETTE, 'H') },
  { room: PAC.fish, ...MORAY.body, period: MORAY.period, start: MORAY.start + MORAY.warn, warn: 15, live: MORAY.live, idle: 0, warnCode: codeOf(SEA_PALETTE, 'M'), liveCode: codeOf(SEA_PALETTE, 'M'), spent: 0 },
];

/**
 * Mauna Loa's lava (`risingLava`; the lava belongs on the volcano: Chris, 2026-11-25): in the basin (cols 11-27, east of the shore the lava tube drops him on, west of the pit's wall) it starts at the floor
 * when he comes in and rises a row every 40 frames to row 10, the row under the long ledge's feet, holds 150 and drains a row every 12. The ledges at floor 9 and above are always clear.
 */
export const LAVA: LavaSpec = {
  room: PAC.loa, col: 11, cols: 17, baseRow: 19, topRow: 10, stepFrames: 40, holdFrames: 150, drainFrames: 12, code: codeOf(LOA_PALETTE, 'M'), crest: codeOf(LOA_PALETTE, 'C'),
};
/**
 * The pit's lava (the plan: "taking it wakes the lava, which rises behind him on the climb out"): asleep until the moon rock is taken (data.ts gives `wakenBy`), then it wells up the pit (cols 28-30) a row every
 * 20 frames to the stepping ledges' level (row 14) under him as he climbs the rope out, holds and drains like the basin's. Once the rock is gone it does so whenever he comes in.
 */
export const PIT_LAVA: LavaSpec = { ...LAVA, col: 28, cols: 3, topRow: 14, stepFrames: 20 };
/** The first two stepping ledges over the lava are thin crust (`cracks`): standing on one, it splits after 10 frames and is gone after 26; back 200 frames later. Keep moving. */
export const CRUST_CRACKS: readonly CrackSpec[] = [14, 19].map((col): CrackSpec => ({
  room: PAC.loa, col, cols: 3, row: 14, codes: [codeOf(LOA_PALETTE, 'L'), codeOf(LOA_PALETTE, 'Y'), codeOf(LOA_PALETTE, 'Y')], crack: 10, wide: 18, gone: 26, away: 200,
}));
/** The steam vent halfway along the long ledge (`pulses`, cols 20-21, rows 7-8: his own on floor 9): it spits steam at its foot for 30 frames (the warning, flickering), blows full height and deadly for 40, then rests: a 160-frame period. */
export const VENT = { col: 20, row: 7, period: 160, start: 90, warn: 30, live: 40 } as const;
export const VENT_PULSES: readonly PulseSpec[] = [
  { room: PAC.loa, col: VENT.col, row: VENT.row + 1, cols: 2, rows: 1, period: VENT.period, start: VENT.start, warn: VENT.warn, live: VENT.live, idle: 0, warnCode: codeOf(LOA_PALETTE, 'V'), liveCode: codeOf(LOA_PALETTE, 'V'), spent: 0 },
  { room: PAC.loa, col: VENT.col, row: VENT.row, cols: 2, rows: 1, period: VENT.period, start: VENT.start, warn: VENT.warn, live: VENT.live, idle: 0, warnCode: 0, liveCode: codeOf(LOA_PALETTE, 'V'), spent: 0 },
];

/** The arrival banners: Oahu on coming aboard at Honolulu from Japan, Molokai on the swim past it, Maui at Lahaina (or up the road from the sea cave), the Big Island at Kona. One name row: 32 letters. */
export const ARRIVALS: readonly Arrival[] = [
  { rooms: [PAC.ship, PAC.waikiki], text: 'WELCOME TO HAWAII: OAHU' },
  { rooms: [PAC.clam], text: 'HAWAII: PAST MOLOKAI' },
  { rooms: [PAC.lahaina, PAC.road, PAC.cave, PAC.hana], text: 'HAWAII: MAUI' },
  { rooms: [PAC.kona, PAC.kea, PAC.summit, PAC.falls, PAC.loa, PAC.coffee, PAC.hilo], text: 'HAWAII: THE BIG ISLAND' },
];

/** Where the yellow mail biplane stands at Hilo's airfield (its top left, playfield cells: a 3 x 3 decoration, its wheels on the apron, floor 19, its nose to the east). */
export const BIPLANE_AT = { col: 22, row: 16 } as const;
/** The parachute, snagged on the big dome's top at Mauna Kea's summit (its top left). */
export const PARACHUTE_AT = { col: 21, row: 2 } as const;
/** The astronomer on the big dome's catwalk, his feet on it (floor 11), where the ladder up to the telescope's platform comes down (col 25): he shuffles a cell, never off it. */
export const ASTRONOMER_AT = { col: 24, row: 9 } as const;
/**
 * The ladder from the catwalk up to the telescope's platform (col 25, rows 4-10), which the astronomer keeps drawn up while he stands guard (a ladder there could be caught from a jump over his head): given the
 * moon rock he lets it down and goes in to look at the rock (data.ts: a gate that places these cells and sends him off).
 */
export const DOME_LADDER: readonly (readonly [row: number, col: number])[] = [4, 5, 6, 7, 8, 9, 10].map((row) => [row, 25] as const);
export const DOME_LADDER_CODE = codeOf(KEA_PALETTE, 'L');
/** The sack of coffee at the far end of the farm's lowest terrace (its top left). */
export const COFFEE_AT = { col: 22, row: 11 } as const;

/**
 * The biplane waiting at Hilo (`boardings`): touched (his top left over its cells, standing on the apron or jumping) with the parachute and the coffee, it takes off with him into THE FLIGHT's first leg (sky.ts),
 * where he is on the screen; without one, that lock's hint (Monty on the Run's way: the lock before the key), and nothing happens. Given the two finds (data.ts).
 */
export const biplaneBoarding = (parachute: number, coffee: number, goes: { mapRow: number; exitCol: number }): BoardingSpec => ({
  room: PAC.hilo, box: { col0: BIPLANE_AT.col - 1, row0: 0, col1: BIPLANE_AT.col + 2, row1: 19 }, goes,
  needs: [{ item: parachute, hint: 'NO FLYING WITHOUT A PARACHUTE' }, { item: coffee, hint: 'TOO SLEEPY TO FLY' }],
});

// ---- the paints ----------------------------------------------------------------------------------------------
const paintWaikiki = (g: Grid): void => {
  g.box(0, 0, 2, 14, 'S'); // Aloha Tower at the harbour's end, its ground floor an arcade the pier runs through (rows 15-18)
  g.box(0, 19, 5, 19, 'B').box(6, 19, 25, 19, 'A').box(26, 18, 30, 19, 'W').box(31, 0, 31, 19, 'K'); // the pier, the sand, the surf, Diamond Head's cliff closing the bay
  g.box(3, 14, 8, 14, 'B'); // the beach stand's roof
  g.box(5, 7, 18, 7, 'B').box(22, 7, 25, 7, 'B'); // the hotel's lawn, open round the palm
  g.box(20, 0, 20, 18, 'R'); // the palm at the sea's edge, up past the lawn and on up the hill to the luau
};
const hotelFront = fillCells(paintWaikiki, [], [9, 8, 18, 11], 'pacHotelFront');
const pillars = [9, 14].flatMap((col) => fillCells(paintWaikiki, [], [col, 12, col, 18], 'pacPillar'));

const paintLuau = (g: Grid): void => {
  g.box(0, 19, 18, 19, 'A').box(22, 19, 31, 19, 'A'); // the lawn, open round the palm coming up from the beach (cols 19-21)
  g.box(20, 14, 20, 19, 'P'); // the palm's crown
  g.box(13, 0, 13, 18, 'R'); // the rope up the hillside to Diamond Head's trail, from the gap between the first two torches
  g.box(23, 17, 24, 18, 'C'); // the crate step up to the stage
  g.box(25, 15, 31, 15, 'B'); // the stage
  g.box(28, 13, 29, 14, 'C'); // the drummers' platform
};
const LUAU_COINS = [[8, 17], [28, 11]] as const;
const LUAU_KEEP: readonly (readonly [col: number, row: number])[] = [...LUAU_COINS, ...TORCHES.cols.flatMap((col) => [[col, 17], [col + 1, 17], [col, 18], [col + 1, 18]] as const), [1, 16], [2, 16], [1, 17], [2, 17]];

const paintDiamond = (g: Grid): void => {
  g.box(0, 18, 12, 18, 'T').box(16, 18, 27, 18, 'T'); // the first ledge, the rope's opening (cols 13-15); it ends at the first step
  g.box(0, 19, 12, 19, 'K').box(16, 19, 31, 19, 'K').box(28, 17, 29, 19, 'K'); // the crater's floor of tuff under the trail, round the rope's opening; the outcrop under the first step
  g.box(14, 14, 14, 19, 'R'); // the rope up from the luau
  g.box(28, 16, 29, 16, 'T'); // the first step
  g.box(4, 14, 29, 14, 'T'); // the second ledge
  g.box(0, 13, 1, 17, 'K'); // the tuff at the second ledge's turn
  g.box(2, 12, 3, 12, 'T'); // the second step
  g.box(0, 0, 3, 6, 'K'); // the overhang of tuff over the turn: the trail turns in a cave in the crater wall
  g.box(4, 10, 31, 10, 'T'); // the third ledge, out of the room at the right
  g.box(30, 11, 31, 19, 'K'); // the crater's rim under it, closing the trail's end
  g.box(26, 1, 31, 4, 'K').box(26, 5, 31, 5, 'C'); // the rim over the old tunnel's portal (its concrete lintel), the way on into THE LOOKOUT
};
const DIAMOND_COINS = [[28, 14], [2, 10]] as const;
/** Diamond Head's crater wall: its rim against the sky (high at the right, where the summit is), the eroded tuff under it, the kiawe scrub on the crater floor. */
const DIAMOND_RIM = ridge([[4, 3], [7, 4], [10, 5], [13, 4], [16, 5], [19, 6], [22, 4], [25, 2], [26, 1]]);
const DIAMOND_SCRUB = (c: number): number => (c % 5 === 2 ? 15 : 16);
/** The caves left dark in the wall (no backdrop): the turn's cave under the overhang, an old WWII tunnel's mouth behind the first ledge and a bunker's behind the third. */
const DIAMOND_CAVES = [(c: number, r: number) => c <= 3 && r >= 7 && r <= 12];
const DIAMOND_PIECES = [['pacPillbox', 11, 3], ['pacCaveTuff', 18, 15], ['pacCaveTuff', 7, 7], ['pacCaveTuff', 21, 6]] as const;
const DIAMOND_KEEP: readonly Cell[] = [...DIAMOND_COINS, ...DIAMOND_PIECES.flatMap(under)];
const diamondCave = (c: number, r: number) => DIAMOND_CAVES.some((cave) => cave(c, r));

const paintLookout = (g: Grid): void => {
  g.box(0, 1, 12, 3, 'K').box(0, 4, 12, 5, 'C').box(0, 10, 13, 10, 'C'); // the old tunnel through the rim: the tuff over it, its concrete lining and floor, its mouth at col 13
  g.box(14, 8, 17, 8, 'T').box(18, 6, 21, 6, 'T').box(22, 4, 31, 4, 'T'); // the stairs and the summit
  g.box(14, 9, 17, 10, 'K').box(18, 7, 21, 10, 'K').box(22, 5, 31, 10, 'K'); // the rim's rock under the stairs
  g.box(0, 11, 31, 11, 'K').box(0, 12, 0, 19, 'K'); // the rim's crest; its outer flank falls away under it
};
const LOOKOUT_COINS = [[27, 2], [6, 8]] as const;
const SNORKEL_AT = { col: 24, row: 2 } as const;
/** The summit's view out to sea over the stairs: Waikiki's hotels on the far shore and the sea; the sky's last bands over it. */
const LOOKOUT_SEA = 3;
const LOOKOUT_PIECES = [['pacLookout', 28, 1], ['pacSkyline', 15, 1], ['pacCaveTuff', 4, 12], ['pacCaveTuff', 17, 12], ['pacCaveTuff', 26, 13]] as const;
const LOOKOUT_KEEP: readonly Cell[] = [...LOOKOUT_COINS, ...cellsOf(SNORKEL_AT.col, SNORKEL_AT.row, 2, 2), ...LOOKOUT_PIECES.flatMap(under)];
/** The flank comes down through the scrub to the shore at the foot of the room. */
const LOOKOUT_SHORE = 18;
const LOOKOUT_SCRUB = (c: number): number => (c % 4 === 1 ? 15 : 16);

const paintClam = (g: Grid): void => {
  g.box(0, SURFACE + 1, 1, 19, 'K').box(31, 0, 31, 14, 'K').box(0, 19, 31, 19, 'K'); // Molokai's shore wall under the water, the sea stack at the east edge, the seabed; out east, low
  g.box(7, 12, 13, 14, 'R').box(7, 15, 7, 16, 'R').box(13, 15, 13, 16, 'R'); // the rock arch, the way under it along the seabed (rows 17-18)
  g.box(2, 17, 4, 18, 'C'); // coral
  g.box(19, 11, 23, 18, 'R').box(20, 9, 22, 10, 'R'); // the tall rock
};
const CLAM_COINS = [[10, 17]] as const;
/** Molokai's north shore over the water: the tallest sea cliffs in the world, green and fluted, falling sheer to the sea, waterfalls down them; lower to the east, where the swim goes on to Maui. */
const MOLOKAI = ridge([[0, 0], [5, 0], [8, 1], [12, 0], [16, 1], [19, 2], [22, 3], [25, 5]]);
const CLAM_PIECES = [['pacCliffFall', 4, 1], ['pacCliffFall', 10, 2], ['pacCliffFall', 15, 2], ['pacKelp', 16, 16], ['pacSeaFan', 27, 16], ['pacBubbles', 25, 9], ['pacSeaFan', 5, 16]] as const;
const CLAM_KEEP: readonly Cell[] = [...CLAM_COINS, ...CLAM_PIECES.flatMap(under)];

const paintKelp = (g: Grid): void => {
  g.box(0, 0, 1, 14, 'K').box(0, 19, 31, 19, 'K').box(31, 0, 31, 13, 'K'); // the sea stack (in from the west, low), the seabed; Maui's headland rising out of the sea at the east, the sea cave under it (out east, rows 14-18)
  g.box(30, 0, 30, 4, 'K'); // the headland's shoulder over the water
  g.box(15, 0, 15, SURFACE + 2, 'L'); // the mooring rope down from Lahaina's quay through the surface
  g.box(8, 16, 10, 18, 'C').box(19, 14, 21, 18, 'C'); // coral
  g.box(24, 11, 28, 18, 'R').box(25, 9, 27, 10, 'R').clear(25, 15, 27, 18); // a rock with a hollow under it
};
const KELP_COINS = [[13, 17]] as const;
/** Over the water ahead: Lanai low and far off at the west, West Maui's green mountains rising behind Lahaina at the east. */
const WEST_MAUI = ridge([[0, 4], [3, 4], [6, 5], [9, 5], [12, 3], [16, 2], [19, 0], [22, 1], [25, 0], [29, 1]]);
const KELP_PIECES = [['pacCliffFall', 21, 2], ['pacKelp', 12, 16], ['pacKelp', 17, 15], ['pacKelp', 22, 16], ['pacSeaFan', 29, 16], ['pacBubbles', 4, 12], ['pacBubbles', 29, 8]] as const;
const KELP_KEEP: readonly Cell[] = [...KELP_COINS, ...KELP_PIECES.flatMap(under)];
/** A swim room's sky, island and sea: the sunset's bands over the island's ridge, the island's cliffs under it down to the waves, the sea below. */
const openSea = (paint: (g: Grid) => void, keep: readonly Cell[], island: (col: number) => number): Placed[] => [
  ...sunset(paint, keep, { purple: 1, red: 2, orange: SURFACE - 1, gold: SURFACE - 1 }, (c, r) => r < island(c) && r < SURFACE),
  ...fillWhere(paint, keep, (c, r) => r >= island(c) && r < SURFACE, 'pacCliffFill'),
  ...fillWhere(paint, keep, (_c, r) => r === SURFACE, 'pacSeaWave'),
  ...fillWhere(paint, keep, (_c, r) => r > SURFACE, 'pacSeaFlat'),
];

const paintWhale = (g: Grid): void => {
  g.box(0, 18, 9, 19, 'W').box(3, 15, 9, 17, 'H').box(4, 14, 9, 14, 'D'); // the old brig in the harbour water, its deck
  g.box(10, 16, 11, 17, 'C').box(10, 18, 13, 19, 'Q').box(17, 18, 31, 19, 'Q'); // the crates, the landing and the quay, the slipway's gap (cols 14-16)
  g.box(5, 6, 5, 13, 'R').box(6, 7, 12, 7, 'D'); // the mast's rope and the spar
  g.box(15, 12, 15, 19, 'R'); // the mooring rope, down into KELP WANTED
  g.box(30, 2, 31, 15, 'Q'); // the fort's wall at the quay's end (the road goes on under it)
};

const paintRoad = (g: Grid): void => {
  g.box(0, 0, 1, 15, 'S').box(0, 18, 1, 19, 'S').box(30, 0, 31, 5, 'S').box(30, 8, 31, 19, 'S'); // the cliff rising off the top at each end, the sky open over the road
  g.box(2, 18, 29, 19, 'R').clear(23, 18, 25, 19).box(8, 18, 19, 18, 'B').clear(8, 19, 19, 19).box(24, 16, 24, 19, 'V'); // the first level and its bridge, the pool (cols 23-25) with a rope hanging in it to the cave
  g.box(2, 13, 29, 14, 'R').clear(27, 13, 29, 14).box(12, 13, 23, 13, 'B').clear(12, 14, 23, 14); // the second level, its bridge, the bend's gap
  g.box(5, 8, 29, 9, 'R').box(11, 8, 22, 8, 'B').clear(11, 9, 22, 9); // the third level and its bridge
  g.box(28, 12, 28, 17, 'V').box(3, 7, 3, 12, 'V'); // the bends' bamboo
};

const paintCave = (g: Grid): void => {
  g.box(0, 0, 31, 3, 'K').clear(23, 0, 25, 3).box(0, 4, 1, 13, 'K').box(30, 4, 31, 19, 'K'); // the road's rock over the cavern, the pool's way up (cols 23-25), the doorway to KELP WANTED (rows 14-18)
  g.box(24, 0, 24, 3, 'L'); // the pool's rope, hanging down into the water
  g.box(0, 19, 31, 19, 'K');
  g.box(4, 4, 6, 5, 'K').box(10, 4, 12, 5, 'K').box(16, 4, 17, 4, 'K'); // stalactites over the cavern
  g.box(6, 12, 29, 14, 'R'); // the old lava tube's roof: the cavern above, the tube under it (rows 15-18), its mouth at the west (cols 2-5) where the cavern comes down to the doorway
  g.clear(CAVE_TUBE.alcove, 13, CAVE_TUBE.alcove + 2, 14); // the alcove in the tube's roof, halfway: out of the draining water
  for (const s of CAVE_STALACTITES) g.clear(s.col, 13, s.col, 14); // the cracks the tube's two loose stalactites hang in
  g.clear(CAVE_TUBE.end, 12, 29, 14); // the pocket at the tube's end, still water
  g.box(24, 9, 29, 11, 'R'); // the rock over the pocket, its top the ledge under the stalactites at the back
};
const CAVE_COINS = [[27, 8], [CAVE_TUBE.alcove + 1, 13]] as const;
/** The Spam musubi, in the still pocket at the tube's end. */
export const CAVE_MUSUBI_AT = { col: 26, row: 13 } as const;

const paintHana = (g: Grid): void => {
  g.box(0, 8, 13, 19, 'B').box(0, 0, 1, 5, 'B').box(0, 8, 13, 8, 'T'); // the headland at the road's end, its turf
  g.box(14, 18, 25, 19, 'K').box(29, 18, 31, 19, 'B').box(31, 0, 31, 17, 'B'); // Kaihalulu's red sand, the cove (cols 26-28) and the cinder cliff closing it
  g.box(14, 7, 14, 17, 'R'); // the bamboo rope down the cliff
  g.box(27, 14, 27, 19, 'R'); // the cove's rope, down into the swim to the Big Island
  g.box(18, 16, 19, 17, 'B').box(21, 14, 22, 15, 'B').box(24, 12, 26, 12, 'B'); // the steps up the cove's side to the ledge in the cinder cave
};
const HANA_COINS = [[25, 10]] as const;

const paintFish = (g: Grid): void => {
  g.box(0, 0, 25, 2, 'K').box(29, 0, 31, 2, 'K').box(31, 0, 31, 14, 'K').box(0, 0, 1, 19, 'K').box(0, 19, 31, 19, 'K'); // Hana's cove over the water (the gap, cols 26-28), the walls, the seabed
  g.box(27, 0, 27, 3, 'L'); // the cove's rope
  g.box(29, 4, 30, 8, 'K').clear(29, 5, 30, 7); // the rock at the top lane's east end, the gap the Big Island's glow shows through
  g.box(8, 10, 30, 10, 'C').box(8, 11, 30, 11, 'R'); // the shelf of coral on rock between the lanes
  g.box(0, 12, 4, 13, 'K').box(0, 17, 4, 18, 'K'); // the sea cave's roof and its ledge (the cave cols 2-4, rows 14-16)
  g.box(8, 12, 9, 15, 'R').box(8, 14, 8, 14, 'H'); // the pillar under the shelf and the moray's hole
  g.box(13, 16, 15, 18, 'C').box(19, 16, 22, 18, 'C').clear(19, 17, 20, 18).box(26, 16, 28, 18, 'C'); // the coral heads, low enough that the shark passes over him (a hollow in the middle one)
};
const FISH_COINS = [[20, 18], [4, 16]] as const;

const paintKona = (g: Grid): void => {
  g.box(0, 0, 1, 14, 'B'); // the lava cliff where the sea comes in (in from the swim, low)
  g.box(0, 19, 5, 19, 'K').box(9, 19, 14, 19, 'K').box(18, 19, 31, 19, 'K'); // the black sand, the lava tube's mouth (cols 6-8), the tide pool's (cols 15-17)
  g.box(15, 19, 17, 19, 'W'); // the tide pool
  g.box(7, 14, 7, 19, 'R'); // the rope down the lava tube to Mauna Loa (hanging from the tube's lip into the hole: it went on up into the sky, and up it led to Mauna Kea's foot with no rope there)
  g.box(20, 17, 22, 18, 'B').box(23, 15, 25, 18, 'B'); // the lava rock stepping up from the beach
  g.box(28, 0, 28, 17, 'R'); // the rope up the mountain's flank to Mauna Kea (on up into the room above, where it goes on)
};
const KONA_COINS = [[24, 13], [16, 16]] as const;

const paintKea = (g: Grid): void => {
  g.box(0, 0, 1, 19, 'C'); // the cinder cliff (Hana's cliff the other side)
  g.box(28, 15, 28, 19, 'R'); // the rope up from Kona
  g.box(14, 16, 26, 16, 'C'); // the first switchback, open round the rope
  g.box(10, 14, 11, 14, 'C'); // a step
  g.box(3, 12, 18, 12, 'C'); // the second
  g.box(21, 10, 22, 10, 'C'); // a step
  g.box(12, 8, 31, 8, 'C'); // the third, out east to the wet side and Akaka Falls
  g.box(8, 6, 9, 6, 'C'); // a step
  g.box(2, 4, 4, 4, 'C').box(8, 4, 10, 4, 'C'); // the top, open round the rope up to the summit
  g.box(6, 0, 6, 3, 'R'); // the rope up to the summit
  g.box(30, 9, 31, 16, 'C').box(30, 0, 31, 5, 'C'); // the shoulder of the mountain closing the climb, the ways east (rows 6-7 the high trail, rows 17-18 the low lane)
  g.box(26, 19, 27, 19, 'C').box(29, 19, 31, 19, 'C'); // the mountain's foot, the low lane's end, round the rope down to Kona
};
const KEA_COINS = [[3, 2], [22, 6]] as const;

const paintSummit = (g: Grid): void => {
  g.box(0, 16, 4, 19, 'C').box(8, 16, 31, 19, 'C'); // the red cinder ridge, open round the rope up from the climb (cols 5-7)
  g.box(6, 16, 6, 19, 'R'); // the rope
  g.box(1, 14, 3, 15, 'C'); // the summit's knoll, the marker on it
  g.box(16, 11, 26, 11, 'G').box(15, 11, 15, 15, 'L'); // the big dome's catwalk and its ladder
  g.box(20, 4, 24, 4, 'G'); // the telescope's platform over the dome (too high to jump to from the catwalk: its ladder is `DOME_LADDER`)
};
const SUMMIT_COINS = [[3, 12], [16, 9]] as const;

const paintFalls = (g: Grid): void => {
  g.box(0, 0, 1, 5, 'B').box(0, 8, 27, 8, 'T').box(0, 9, 1, 16, 'B'); // the cliff over the high trail's way in from Mauna Kea (rows 6-7); the high trail along the gorge's top (floor 8); the gorge's west wall
  g.box(2, 9, 4, 9, 'B').box(16, 9, 18, 9, 'B'); // the rock under the trail's edge (the falls pour out under it at cols 19-20)
  g.box(28, 0, 31, 4, 'B').box(31, 5, 31, 19, 'B'); // the cliff east, over the way down
  g.box(27, 9, 27, 18, 'B'); // the falls' cliff: the way down (cols 28-30) sealed from the low lane
  g.box(29, 7, 29, 19, 'R'); // the rope down from the trail's end to Hilo
  g.box(0, 19, 7, 19, 'B').box(11, 19, 19, 19, 'B').box(23, 19, 27, 19, 'B'); // the low lane by the plunge pool (floor 19), in from Mauna Kea's foot (rows 17-18); the rope's opening down to Hilo's roofs (cols 8-10)
  g.box(20, 19, 22, 19, 'W'); // the plunge pool
  g.box(9, 15, 9, 19, 'R'); // the rope down to Hilo's roofs
  g.box(13, 16, 15, 16, 'T'); // a mossy boulder by the lane
};
const FALLS_COINS = [[21, 16], [24, 6]] as const;

const paintLoa = (g: Grid): void => {
  g.box(0, 0, 1, 19, 'K').box(30, 0, 31, 2, 'K').box(30, 5, 31, 19, 'K').box(0, 19, 31, 19, 'K'); // the crater's walls and floor (the shore at the left, cols 2-10, outside the lava; out east at the top, rows 3-4)
  g.box(7, 0, 7, 18, 'R'); // the rope down the lava tube from Kona
  g.box(9, 14, 11, 14, 'L').box(14, 14, 16, 14, 'L').box(19, 14, 21, 14, 'L').box(24, 14, 27, 14, 'L'); // the first ledge and the stepping ledges (floor 14)
  g.box(27, 15, 27, 18, 'K').box(31, 5, 31, 18, 'K').clear(30, 15, 30, 18); // the crater's pit under the rope (cols 28-30), walled off from the basin: the moon rock at its foot
  g.box(15, 9, 26, 9, 'L').box(20, 9, 21, 9, 'Y'); // the long ledge (floor 9), the vent's crack in it
  g.box(28, 4, 28, 18, 'R'); // the rope up the east wall, from the pit's foot past the long ledge to the rim
  g.box(19, 0, 19, 4, 'K').box(20, 5, 31, 5, 'L'); // the rim's spur and the high shelf east of it, out east to the farm
};
const LOA_COINS = [[26, 12], [22, 3]] as const;
/** The moon rock at the foot of the crater's pit (its top left): the shooting star the summit saw fall. */
export const MOON_ROCK_AT = { col: 29, row: 17 } as const;

const paintCoffee = (g: Grid): void => {
  g.box(0, 5, 9, 5, 'T').box(0, 6, 9, 19, 'S'); // the top terrace, in from Mauna Loa's rim
  g.box(10, 9, 16, 9, 'T').box(10, 10, 16, 19, 'S'); // the second
  g.box(17, 13, 23, 13, 'T').box(17, 14, 23, 19, 'S'); // the third, the sack at its far end
  g.box(11, 7, 12, 7, 'T').box(17, 11, 18, 11, 'T').box(27, 17, 28, 17, 'T').box(24, 15, 25, 15, 'T'); // the stone steps up each terrace's bank (the way back up from Hilo)
  g.box(24, 19, 31, 19, 'P'); // the farm's lane at the foot of the terraces
  g.box(29, 0, 29, 18, 'R'); // the rope up to Hilo
  g.box(0, 0, 0, 2, 'B'); // (the crater's rim at the west edge, over the way in)
};
const COFFEE_COINS = [[5, 3], [13, 7]] as const;

const paintHilo = (g: Grid): void => {
  g.box(0, 19, 27, 19, 'P').box(31, 19, 31, 19, 'P'); // the street along the bayfront to the airfield, the rope's opening (cols 28-30)
  g.box(29, 0, 29, 19, 'R'); // the rope from Akaka Falls' high trail, past the street, down to the coffee farm
  g.box(2, 12, 14, 12, 'J'); // the old wooden storefronts' roofs
  g.box(9, 0, 9, 11, 'R').box(16, 11, 16, 18, 'R'); // the rope up from the roofs to the falls' low lane, and the rope up to the roofs from the street
};
const HILO_COINS = [[8, 10], [17, 17]] as const;
/** The storefronts under their roofs (one character each over the empty cells: a backdrop he walks past). */
const storefronts = fillCells(paintHilo, [], [2, 13, 14, 18], 'pacHotelFront');

// ---- the islands' scenery (Chris, 2026-11-25: "I really want you to think about representing these islands properly"): each room's backdrop, laid round its pieces ----
const text = (col: number, row: number, words: string): Cell[] => cellsOf(col, row, words.length, 1);
const keepOf = (cells: readonly Cell[], pieces: readonly (readonly [WorldDecor, number, number])[]): Cell[] => [...cells, ...pieces.flatMap(under)];

/** Waikiki on a clear day: the sky, Diamond Head's brown tuff cone standing on the sea at the bay's end (its steep face to the sea, the long slope back), the sea behind the beach. */
const WAIKIKI_COINS = [[5, 13], [25, 17]] as const;
const WAIKIKI_PIECES = [['pacSnorkelShop', 3, 15], ['pacPalm', 21, 13], ['pacSurfboards', 11, 17]] as const;
const WAIKIKI_KEEP = keepOf(WAIKIKI_COINS, WAIKIKI_PIECES);
const WAIKIKI_HEAD = ridge([[21, 11], [24, 9], [27, 7], [29, 6], [30, 7]]);
const WAIKIKI_SEA = 12;
const waikikiScenery: Placed[] = [
  ...fillWhere(paintWaikiki, WAIKIKI_KEEP, (c, r) => (c < 21 ? r < 7 : r < WAIKIKI_HEAD(c) && r < WAIKIKI_SEA), 'pacSkyDay'),
  ...fillWhere(paintWaikiki, WAIKIKI_KEEP, (c, r) => c >= 21 && r >= WAIKIKI_HEAD(c) && r < WAIKIKI_SEA, 'pacTuffFill'),
  ...fillWhere(paintWaikiki, WAIKIKI_KEEP, (c, r) => c >= 21 && r === WAIKIKI_SEA, 'pacSeaWave'),
  ...fillWhere(paintWaikiki, WAIKIKI_KEEP, (c, r) => c >= 21 && r > WAIKIKI_SEA && r < 18, 'pacSeaFlat'),
];

/** Lahaina in the evening: the sunset over the channel, Lanai's low shape far out, the whale's tail breaching off the harbour; West Maui's green mountains behind Front Street's old storefronts. */
const LAHAINA_COINS = [[9, 5]] as const;
const LAHAINA_PIECES = [['pacOutrigger', 19, 16], ['pacPalm', 24, 12], ['pacWhaleTail', 0, 12]] as const;
const LAHAINA_KEEP = keepOf([...LAHAINA_COINS, ...cellsOf(6, 12, 2, 2)], LAHAINA_PIECES);
const LAHAINA_MOUNTAINS = ridge([[14, 10], [16, 7], [19, 4], [22, 3], [24, 5], [26, 2], [29, 3]]);
const LAHAINA_SEA = 11;
const lahainaScenery: Placed[] = [
  ...sunset(paintWhale, LAHAINA_KEEP, { purple: 2, red: 5, orange: LAHAINA_SEA - 1, gold: LAHAINA_SEA - 1 }, (c, r) => r < LAHAINA_SEA && (c < 14 || r < LAHAINA_MOUNTAINS(c))),
  ...fillWhere(paintWhale, LAHAINA_KEEP, (c, r) => c >= 14 && r >= LAHAINA_MOUNTAINS(c) && r <= LAHAINA_SEA, 'pacCliffFill'),
  ...fillWhere(paintWhale, LAHAINA_KEEP, (c, r) => c < 14 && r === LAHAINA_SEA, 'pacSeaWave'),
  ...fillWhere(paintWhale, LAHAINA_KEEP, (c, r) => c < 17 && r > LAHAINA_SEA && r < 18, 'pacSeaFlat'),
  ...fillWhere(paintWhale, LAHAINA_KEEP, (c, r) => c >= 17 && r > LAHAINA_SEA && r < 18, 'pacHotelFront'),
];

/** The Road to Hana cut into the jungle cliff: rainforest over every empty cell (the waterfalls and bamboo in it). */
const ROAD_COINS = [[27, 15], [16, 5]] as const;
const ROAD_PIECES = [['pacWaterfall', 6, 2], ['pacWaterfall', 20, 2], ['pacBambooClump', 25, 4], ['pacBambooClump', 7, 4],
  ['pacLaneSign', 6, 16], ['pacLaneSign', 20, 16], ['pacLaneSign', 10, 11], ['pacLaneSign', 24, 11], ['pacLaneSign', 9, 6], ['pacLaneSign', 23, 6]] as const;
const roadScenery: Placed[] = fillWhere(paintRoad, keepOf(ROAD_COINS, ROAD_PIECES), () => true, 'pacJungleFill');

/** Kaihalulu: the red cinder cliffs round the cove, a cave in them, the sea inside the cove's rocks, the sky over the headland. */
const HANA_PIECES = [['pacBreadStand', 2, 5], ['pacPalmSmall', 9, 4], ['pacLavaRocks', 16, 17], ['pacPalmSmall', 27, 9], ['pacCaveCinder', 17, 9]] as const;
const HANA_WAVE_CELLS: Cell[] = WAVE.groups.flatMap((w) => cellsOf(w.col, WAVE.row, w.cols, WAVE.rows));
const HANA_CLIFF = ridge([[15, 8], [18, 6], [22, 5], [26, 3], [30, 1]]);
const hanaKeep = keepOf([...HANA_COINS, ...HANA_WAVE_CELLS], HANA_PIECES);
const hanaScenery: Placed[] = [
  ...fillWhere(paintHana, hanaKeep, (c, r) => (c < 15 ? r < 8 : r < HANA_CLIFF(c)), 'pacSkyDay'),
  ...fillWhere(paintHana, hanaKeep, (c, r) => c >= 15 && r >= HANA_CLIFF(c) && (c < 26 || r < 13), 'pacCinderFill'),
  ...fillWhere(paintHana, hanaKeep, (c, r) => c >= 26 && r === 13, 'pacSeaWave'),
  ...fillWhere(paintHana, hanaKeep, (c, r) => c >= 26 && r > 13 && r < 18, 'pacSeaFlat'),
];

/** Kona at sunset: the sea on the west horizon, the old lava fields rising inland under the shield of the mountains. */
const KONA_PIECES = [['pacLavaRocks', 11, 18], ['pacPalmSmall', 12, 15], ['pacLavaRocks', 29, 18]] as const;
const KONA_KEEP = keepOf([...KONA_COINS, ...text(3, 12, 'MAUNA LOA'), ...text(18, 10, 'MAUNA KEA')], KONA_PIECES);
const KONA_SLOPE = ridge([[2, 9], [10, 9], [16, 7], [22, 5], [27, 4], [31, 4]]);
const konaScenery: Placed[] = [
  ...sunset(paintKona, KONA_KEEP, { purple: 1, red: 3, orange: 5, gold: 6, sea: 8 }, (c, r) => r < KONA_SLOPE(c)),
  ...fillWhere(paintKona, KONA_KEEP, (c, r) => r >= KONA_SLOPE(c) && r < 19, 'pacLavaFill'),
];

/** Mauna Kea's climb: the dusk over its red cinder slope, the sea of cloud under the switchbacks. */
const KEA_SLOPE = ridge([[2, 1], [8, 1], [14, 2], [20, 3], [26, 3], [29, 4]]);
const KEA_CLOUDS = 17;
const keaScenery: Placed[] = [
  ...sunset(paintKea, KEA_COINS, { purple: 1, red: 3, orange: 3, gold: 3 }, (c, r) => r < KEA_SLOPE(c)),
  ...fillWhere(paintKea, KEA_COINS, (c, r) => r >= KEA_SLOPE(c) && r < KEA_CLOUDS, 'pacCinderFill'),
  ...fillWhere(paintKea, KEA_COINS, (_c, r) => r >= KEA_CLOUDS, 'pacCloudFill'),
];

/** The summit over the cloud tops: the sea of cloud on the horizon behind the ridge. */
const SUMMIT_PIECES = [['pacDomeBig', 17, 6], ['pacDomeSmall', 9, 13], ['pacDomeSmall', 28, 13], ['pacCairn', 1, 12]] as const;
const summitScenery: Placed[] = fillWhere(paintSummit, keepOf(SUMMIT_COINS, SUMMIT_PIECES), (_c, r) => r >= 14, 'pacCloudFill');

/** Akaka Falls' gorge: rainforest on every side of the falls. */
const FALLS_PIECES = [['pacWaterfall', 19, 9], ['pacWaterfall', 19, 14], ['pacPalmSmall', 3, 4], ['pacPalm', 3, 13], ['pacBambooClump', 12, 4], ['pacBambooClump', 24, 15]] as const;
const fallsScenery: Placed[] = fillWhere(paintFalls, keepOf(FALLS_COINS, FALLS_PIECES), () => true, 'pacJungleFill');

/** Mauna Loa's crater: old lava on its walls and floor round the basin (dark until the lava rises in it), the night glowing red over the rim. */
const LOA_PIECES = [['pacLavaRocks', 3, 18]] as const;
const LOA_KEEP = keepOf([...LOA_COINS, ...cellsOf(MOON_ROCK_AT.col, MOON_ROCK_AT.row, 2, 2), ...cellsOf(VENT.col, VENT.row, 2, 2)], LOA_PIECES);
const loaBasin = (c: number, r: number) => (c >= LAVA.col && c < LAVA.col + LAVA.cols && r > LAVA.topRow) || (c >= PIT_LAVA.col && c < PIT_LAVA.col + PIT_LAVA.cols && r > PIT_LAVA.topRow);
const loaScenery: Placed[] = [
  ...sunset(paintLoa, LOA_KEEP, { purple: 0, red: 1, orange: 2, gold: 2 }, (_c, r) => r < 3),
  ...fillWhere(paintLoa, LOA_KEEP, (c, r) => r >= 3 && !loaBasin(c, r), 'pacLavaFill'),
];

/** The coffee farm on Mauna Loa's green flank: the sky, the mountain's dark shoulder far behind, the hillside of scrub under the terraces. */
const COFFEE_PIECES = [['pacCoffeeTree', 2, 2], ['pacCoffeeTree', 14, 6], ['pacCoffeeTree', 19, 10], ['pacSacks', 7, 3], ['pacSacks', 25, 17]] as const;
const COFFEE_KEEP = keepOf([...COFFEE_COINS, ...cellsOf(COFFEE_AT.col, COFFEE_AT.row, 2, 2)], COFFEE_PIECES);
const COFFEE_FAR = ridge([[0, 3], [8, 2], [16, 3], [24, 5], [31, 7]]);
const coffeeScenery: Placed[] = [
  ...fillWhere(paintCoffee, COFFEE_KEEP, (c, r) => r < COFFEE_FAR(c), 'pacSkyDay'),
  ...fillWhere(paintCoffee, COFFEE_KEEP, (c, r) => r >= COFFEE_FAR(c) && r < COFFEE_FAR(c) + 4, 'pacLavaFill'),
  ...fillWhere(paintCoffee, COFFEE_KEEP, (c, r) => r >= COFFEE_FAR(c) + 4 && r < 19, 'pacScrubFill'),
];

/** Hilo in the evening: the bay on the horizon, Mauna Kea's broad dark shoulder rising behind the town. */
const HILO_KEEP = keepOf([...HILO_COINS, ...text(6, 14, 'HILO')], [['skyBiplane', BIPLANE_AT.col, BIPLANE_AT.row]]);
const HILO_KEA = ridge([[14, 9], [18, 6], [23, 4], [28, 3], [31, 4]]);
const hiloScenery: Placed[] = [
  ...sunset(paintHilo, HILO_KEEP, { purple: 1, red: 3, orange: 5, gold: 6, sea: 8 }, (c, r) => c < 14 || r < HILO_KEA(c)),
  ...fillWhere(paintHilo, HILO_KEEP, (c, r) => c >= 14 && r >= HILO_KEA(c) && r <= 8, 'pacLavaFill'),
];

// ---- the rooms ----------------------------------------------------------------------------------------------

export const PACIFIC_ROOMS: readonly RoomSpec[] = [
  // THE CARGO SHIP: the ship in section, moored at Honolulu; the region's tightest room, crossed three times at three heights. In from Japan's gangway on the landing (floor 13); up the crate step onto
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

  // WAIKIKI: Oahu's beach (SURF AND TURF's), the harbour's end to the surf. In through Aloha Tower's arcade onto the pier (floor 19); east along the sand past the surfer to the sea, which stops him (deadly
  // surf until the snorkel: A MOLE CANNOT SWIM THAT FAR; a coin at its edge). The palm at the sea's edge climbs past the hotel's lawn (floor 7: off its west end onto the beach stand's roof, a coin seen from the sand) and on up
  // the hill to the luau. With the snorkel the surf is the way down into the swim past Molokai. A tern dives over it.
  room({
    id: PAC.waikiki, cell: [2, 18], sector: 41, palette: WAIKIKI_PALETTE,
    paint: paintWaikiki,
    coins: WAIKIKI_COINS,
    decor: [...waikikiScenery, ...hotelFront, ...pillars, ...WAIKIKI_PIECES],
    creatures: [
      { who: 'pacSurfer', col: 9, row: 17, way: 'right', speed: 1, range: 56 },
      { who: 'pacTern', col: 27, row: 8, way: 'down', speed: 1, range: 48 },
    ],
  }),

  // LEI OF THE LAND: the luau at sunset above Waikiki, its show (the first build's luau with the second pass's stage). Up the palm through the lawn (cols 19-21); west past three torches whose flames take
  // turns (a three-cell gap between each to wait in) to the lei on its arch at the west end; the hillside rope (col 13) goes up from the gap between the first two torches to Diamond Head's trail. East of the
  // palm the crate step and the stage, the hula dancer swaying across it and the fire-knife dancer's leaps, the drummers' platform (a coin) and a line of hula dancers behind.
  room({
    id: PAC.luau, cell: [1, 18], sector: 42, palette: LUAU_PALETTE,
    paint: paintLuau,
    coins: LUAU_COINS,
    item: { name: 'lei', col: 1, row: 16, sprite: PAC_SPRITE.lei },
    decor: [
      ...sunset(paintLuau, LUAU_KEEP, { purple: 1, red: 4, orange: 7, gold: 10, sea: 12 }), ['pacSun', 7, 9],
      ['pacArchTop', 0, 12], ['pacArchLeg', 0, 14], ['pacArchLeg', 3, 14],
      ['pacHulaDancer', 22, 12], ['pacHulaDancer', 25, 12], ['pacHulaDancer', 30, 12], ['pacDrummer', 30, 11], ['pacDrums', 30, 13],
      ['pacFronds', 18, 12],
    ],
    creatures: [
      { who: 'pacHula', col: 25, row: 13, way: 'right', speed: 1, range: 20 },
      { who: 'pacFireKnife', col: 22, row: 9, way: 'up', speed: 1, range: 40 },
      { who: 'pacTiki', col: 4, row: 6, way: 'down', speed: 1, range: 40 },
    ],
  }),

  // DIAMOND HEAD: the crater trail, the climb up from the luau (the second pass's, as it was). In by the rope up the hillside (col 14, the floor's opening); the trail switches back up the crater wall: the
  // first ledge (floor 18) east to a step up (cols 28-29: a coin), the second (floor 14) west to a step (cols 2-3: a coin at the top of the climb), the third (floor 10) east out of the room to the bunker.
  // A tern dives along the second ledge.
  room({
    id: PAC.diamond, cell: [0, 18], sector: 88, palette: DIAMOND_PALETTE,
    paint: paintDiamond,
    coins: DIAMOND_COINS,
    decor: [
      ...sunset(paintDiamond, DIAMOND_KEEP, { purple: 1, red: 2, orange: 5, gold: 5 }, (c, r) => r < DIAMOND_RIM(c)),
      ...fillWhere(paintDiamond, DIAMOND_KEEP, (c, r) => r >= DIAMOND_RIM(c) && r < DIAMOND_SCRUB(c) && !diamondCave(c, r), 'pacTuffFill'),
      ...fillWhere(paintDiamond, DIAMOND_KEEP, (c, r) => r >= DIAMOND_SCRUB(c) && !diamondCave(c, r), 'pacScrubFill'),
      ...DIAMOND_PIECES,
    ],
    creatures: [{ who: 'pacTern', col: 18, row: 7, way: 'down', speed: 1, range: 40 }],
  }),

  // THE LOOKOUT: the old bunker's tunnel and the stairs to the summit of Diamond Head. In from the trail at the left (floor 10, the tunnel's mouth at col 13); the stairs climb to the summit lookout (floor 4),
  // where a tourist left his snorkel and mask. Rocks tumble down the stairs from the crater's rim and vanish at the tunnel's mouth: the tunnel is the place to wait (a coin in it).
  room({
    id: PAC.lookout, cell: [0, 19], sector: 89, palette: DIAMOND_PALETTE,
    paint: paintLookout,
    coins: LOOKOUT_COINS,
    item: { name: 'snorkel', col: SNORKEL_AT.col, row: SNORKEL_AT.row, sprite: PAC_SPRITE.snorkel },
    decor: [
      ...sunset(paintLookout, LOOKOUT_KEEP, { purple: 0, red: 1, orange: 2, gold: 2, sea: LOOKOUT_SEA }, (c) => c >= 13),
      ...fillWhere(paintLookout, LOOKOUT_KEEP, (c, r) => c >= 13 && r > LOOKOUT_SEA && r < 11, 'pacSeaFlat'),
      ...fillWhere(paintLookout, LOOKOUT_KEEP, (c, r) => r > 11 && r < LOOKOUT_SCRUB(c), 'pacTuffFill'),
      ...fillWhere(paintLookout, LOOKOUT_KEEP, (c, r) => r >= LOOKOUT_SCRUB(c) && r < LOOKOUT_SHORE, 'pacScrubFill'),
      ...fillWhere(paintLookout, LOOKOUT_KEEP, (_c, r) => r === LOOKOUT_SHORE, 'pacSeaWave'),
      ...fillWhere(paintLookout, LOOKOUT_KEEP, (_c, r) => r > LOOKOUT_SHORE, 'pacSeaFlat'),
      ...LOOKOUT_PIECES,
    ],
  }),

  // CLAM DOWN: the swim past Molokai (the first crossing), learning to swim, in the open sea under the evening sky with Molokai's sea cliffs over the water, waterfalls down them. In from Waikiki's surf
  // above (cols 26-30): he drops into the sea; down under the rock arch along the seabed (a coin inside it), past the tall rock, out low east past the sea stack. No current; a turtle rising to breathe and an eel.
  room({
    id: PAC.clam, cell: [3, 18], sector: 43, palette: SEA_PALETTE,
    paint: paintClam,
    coins: CLAM_COINS,
    decor: [...openSea(paintClam, CLAM_KEEP, MOLOKAI), ...CLAM_PIECES],
    creatures: [
      { who: 'pacTurtle', col: 3, row: 8, way: 'down', speed: 1, range: 40 },
      { who: 'pacEel', col: 26, row: 9, way: 'left', speed: 1, range: 12 },
    ],
  }),

  // KELP WANTED: the second reef, off Maui, the open sea with Lanai low on the horizon and West Maui's mountains ahead. In from the west, low; through the kelp past the manta (a coin deep in it); the mooring
  // rope comes down from Lahaina's quay through the surface (col 15), the way up; east, low, under Maui's headland, the sea cave under the road.
  room({
    id: PAC.kelp, cell: [3, 19], sector: 45, palette: SEA_PALETTE,
    paint: paintKelp,
    coins: KELP_COINS,
    decor: [...openSea(paintKelp, KELP_KEEP, WEST_MAUI), ...KELP_PIECES],
    creatures: [
      { who: 'pacManta', col: 8, row: 9, way: 'right', speed: 1, range: 100 },
      { who: 'pacTurtle', col: 22, row: 8, way: 'down', speed: 1, range: 40 },
    ],
  }),

  // WHALE OF A TIME: Lahaina's old whaling harbour on Maui. Up the mooring rope from the reef through the slipway (cols 14-16) onto the quay. The old brig lies in the harbour water at the left: the crates up
  // to its deck (a Spam musubi), the mast's rope to the spar (a dead end, its coin); the quay runs east past the outrigger and under the fort's wall onto the road. The whale's tail in the harbour.
  room({
    id: PAC.lahaina, cell: [2, 19], sector: 46, palette: WHALE_PALETTE,
    shut: [['left', 2, 17, 'Q']], // (Waikiki's cliff the other side: the fort's wall)
    paint: paintWhale,
    coins: LAHAINA_COINS,
    item: { name: 'musubi2', col: 6, row: 12, sprite: PAC_SPRITE.musubi },
    decor: [...lahainaScenery, ...LAHAINA_PIECES],
    creatures: [
      { who: 'pacTiki', col: 7, row: 9, way: 'down', speed: 1, range: 20 },
      { who: 'pacSurfer', col: 18, row: 16, way: 'right', speed: 1, range: 40 },
    ],
  }),

  // THE ROAD TO HANA: the road winds up the cliff in three levels (floors 18, 13, 8) joined by bamboo at the bends (cols 28 and 3), over three one-lane bridges (a red car crosses each, the way Monty goes)
  // with a yield sign at each end; waterfalls down the cliff behind. In at the left on the lowest level, out at the right on the highest. A gap (cols 23-25) in the lowest level is a pool under a waterfall
  // with a rope hanging in it: the way down into the sea cave, and back up. As the first build had it (Chris, 2026-11-25: "I really loved the three tiers with the cars driving through").
  room({
    id: PAC.road, cell: [2, 20], sector: 47, palette: ROAD_PALETTE,
    paint: paintRoad,
    coins: ROAD_COINS,
    decor: [...roadScenery, ...ROAD_PIECES],
    creatures: [{ who: 'pacCoconut', col: 23, row: 6, way: 'right', speed: 1, range: 16 }],
  }),

  // THE SEA CAVE: under the road, open water, the bonus off the route (`CAVE_TUBE`). In from the reef at the left (rows 14-18), or down the rope through the road's pool (cols 23-25), the way up again. The
  // cavern above, an eel and a manta in it; the ledge under the stalactites at the back holds a coin, seen through the pool from the road above. Under the cavern the old lava tube, the swell draining out of it
  // in sets past its two loose stalactites: the alcove halfway (a coin), the Spam musubi in the still pocket at its end.
  room({
    id: PAC.cave, cell: [3, 20], sector: 48, palette: SEA_PALETTE,
    paint: paintCave,
    coins: CAVE_COINS,
    item: { name: 'musubi3', col: CAVE_MUSUBI_AT.col, row: CAVE_MUSUBI_AT.row, sprite: PAC_SPRITE.musubi },
    decor: [...seaOf(paintCave, [...CAVE_COINS, [CAVE_MUSUBI_AT.col, CAVE_MUSUBI_AT.row], [CAVE_MUSUBI_AT.col + 1, CAVE_MUSUBI_AT.row], [CAVE_MUSUBI_AT.col, CAVE_MUSUBI_AT.row + 1], [CAVE_MUSUBI_AT.col + 1, CAVE_MUSUBI_AT.row + 1]]),
      ['pacWaterfall', 21, 4], ['pacKelp', 3, 16], ['pacSeaFan', 28, 16], ['pacBubbles', 4, 11]],
    creatures: [
      { who: 'pacEel', col: 6, row: 9, way: 'right', speed: 1, range: 120 },
      { who: 'pacManta', col: 14, row: 6, way: 'right', speed: 1, range: 60 },
    ],
  }),

  // HANA: the road's end on Maui, Kaihalulu's red sand in its cinder cove (HANA BANANA's place). In at the left on the headland (floor 8), the banana-bread stand by the road; the bamboo rope (col 14) down the
  // cliff to the red sand (floor 18), the surf sweeping up it from the cove on a timing (spray, then the wave, then it draws back); steps up the cove's side to the ledge in the cinder cave (a coin). The cove
  // (cols 26-28) is the way on, down its rope into the last swim; the crab scuttles the sand.
  room({
    id: PAC.hana, cell: [2, 21], sector: 87, palette: HANA_PALETTE,
    paint: paintHana,
    coins: HANA_COINS,
    decor: [...hanaScenery, ...HANA_PIECES],
    creatures: [{ who: 'pacCrab', col: 15, row: 16, way: 'right', speed: 1, range: 20 }],
  }),

  // FISH OUT OF WATER: the swim to the Big Island (the last crossing; the reset's swim room, which had Hana's name), all water. In down the cove's rope (cols 26-28, its only way up). West along the top lane
  // under the cove's rock, the Big Island's red glow seen through a gap at its east end; down the drop-off at the west, past the moray by the sea cave's mouth (the cave a pocket with the musubi and a coin);
  // east along the bottom lane against the surge, from lee to lee of the coral heads (a coin in the middle head's hollow), under the reef shark's patrol, and out at the bottom right onto Kona's black sand.
  room({
    id: PAC.fish, cell: [3, 21], sector: 49, palette: SEA_PALETTE,
    paint: paintFish,
    coins: FISH_COINS,
    item: { name: 'musubi1', col: 2, row: 15, sprite: PAC_SPRITE.musubi },
    decor: [...seaOf(paintFish), ['pacGlow', 29, 5], ['pacBubbles', 16, 5], ['pacBubbles', 24, 13]],
    creatures: [{ who: 'pacSharkFin', col: 10, row: 12, way: 'right', speed: 1, range: 144 }],
  }),

  // KONA: the Big Island's black sand, rocky with lava (Chris, 2026-11-25: "a rocky beach with black sand"), where the way splits. Out of the sea at the left (floor 19); over the lava tube's mouth (the rope
  // down it to MAUNA LOA, the bottom way) and the tide pool (a coin over it); up the lava rock (a coin at its top) to the rope up the mountain's flank to MAUNA KEA (the top way); on east along the sand to
  // Hilo, where the plane is. A crab on the sand.
  room({
    id: PAC.kona, cell: [3, 22], sector: 90, palette: KONA_PALETTE,
    paint: paintKona,
    coins: KONA_COINS,
    decor: [...konaScenery, ...KONA_PIECES, [{ text: 'MAUNA LOA', colour: 8 }, 3, 12], [{ text: 'MAUNA KEA', colour: 2 }, 18, 10]],
    creatures: [{ who: 'pacCrab', col: 19, row: 17, way: 'right', speed: 1, range: 40 }],
  }),

  // MAUNA KEA: the top way, the climb up through the cloud (Chris, 2026-11-25: Mauna Kea "is on a path through the middle of the island"). Up the rope from Kona onto the cinder switchbacks: the first (floor 16)
  // west, a step, the second (floor 12) west to a step, the third (floor 8) east, which runs on out of the room down the wet side to Akaka Falls; on up a step to the top (floor 4) and the rope up to the summit.
  // A nene on the second switchback; the clouds below.
  room({
    id: PAC.kea, cell: [2, 22], sector: 91, palette: KEA_PALETTE,
    paint: paintKea,
    coins: KEA_COINS,
    decor: keaScenery,
    creatures: [{ who: 'pacNene', col: 6, row: 10, way: 'right', speed: 1, range: 40 }],
  }),

  // THE SUMMIT: Mauna Kea's top, above the clouds at night (the only night in the game): the red cinder ridge, the summit's cairn on its knoll (a coin), the small observatories, the big dome with its slit open and
  // the telescope pointing out at the stars and the moon, a shooting star falling south (to Mauna Loa's crater: the moon rock). Up the dome's ladder to the catwalk (a coin), where the astronomer reading his star
  // chart stands guard, the ladder up to the telescope's platform drawn up, until Monty brings the moon rock (data.ts: then he lets it down and goes in to look at it). Up it to the platform, where a paraglider's
  // parachute is snagged. A dead end: back down.
  room({
    id: PAC.summit, cell: [1, 22], sector: 92, palette: KEA_PALETTE,
    paint: paintSummit,
    coins: SUMMIT_COINS,
    item: { name: 'parachute', col: PARACHUTE_AT.col, row: PARACHUTE_AT.row, sprite: PAC_SPRITE.parachute },
    decor: [
      ['jpStars', 1, 1], ['jpStars', 9, 3], ['jpStars', 12, 0], ['jpStars', 26, 5], ['jpMoon', 27, 1],
      ...summitScenery, ...SUMMIT_PIECES, ['pacShootingStar', 4, 4],
    ],
    creatures: [{ who: 'pacAstronomer', col: ASTRONOMER_AT.col, row: ASTRONOMER_AT.row, way: 'right', speed: 1, range: 8 }], // (the first: data.ts sends him in)
  }),

  // AKAKA FALLS: the wet side of the island, the rainforest gorge where the falls pour out under the high trail into the plunge pool. Crossed twice at two heights (the plan: Moscow's rule), sealed from each
  // other by the gorge: the high trail from Mauna Kea's third switchback along the gorge's top (floor 8) to the rope at its end (a coin at its head) down the way the stream goes, to Hilo's street; and the low
  // lane by the plunge pool (floor 19; a coin over the pool), from Hilo's roofs up the rope at the left, west to Mauna Kea's foot. A parrot in the trees.
  room({
    id: PAC.falls, cell: [2, 23], sector: 93, palette: FALLS_PALETTE,
    paint: paintFalls,
    coins: FALLS_COINS,
    decor: [...fallsScenery, ...FALLS_PIECES],
    creatures: [{ who: 'pacParrot', col: 12, row: 3, way: 'right', speed: 1, range: 60 }],
  }),

  // MAUNA LOA: the bottom way, along the south over the volcano's lava (MAUNA KEA-OS's rising lava, where it belongs). Down the lava tube's rope from Kona onto the shore (cols 2-10, outside the lava), and the
  // lava starts to rise. Onto the first ledge (floor 14), east over the stepping ledges (the first two cooled crust that cracks under a standing foot; a magma blob bobs up between them) to the last (a coin at
  // its end), up the rope on the east wall past the long ledge to the rim's high shelf (floor 5: a coin at the rope's head) and out east to the coffee farm. The rope hangs on down a pit walled off from the
  // basin to the moon rock at its foot (a dead end off the route): taken, it wakes the pit's own lava, which wells up behind him as he climbs out.
  room({
    id: PAC.loa, cell: [4, 22], sector: 52, palette: LOA_PALETTE,
    paint: paintLoa,
    coins: LOA_COINS,
    item: { name: 'moon rock', col: MOON_ROCK_AT.col, row: MOON_ROCK_AT.row, sprite: PAC_SPRITE.moonRock },
    decor: [...loaScenery, ...LOA_PIECES],
    creatures: [{ who: 'pacMagma', col: 17, row: 16, way: 'up', speed: 1, range: 40, colour: 8 }], // (orange, molten: white read as a ghost; it differs from the lava's red and crest's yellow and the steam's white)
  }),

  // COFFEE BREAK: Hilo's coffee farm on the slope below the town (COFFEE BREAK's coffee). In from Mauna Loa's rim onto the top terrace (floor 5), down the terraces between the coffee rows, the sack of beans
  // at the far end of the lowest (up off the farm's lane), down to the lane and up the rope to Hilo. Stone steps up each terrace's bank make it a way both ways: from Hilo up the terraces to Mauna Loa.
  room({
    id: PAC.coffee, cell: [4, 23], sector: 51, palette: COFFEE_PALETTE,
    paint: paintCoffee,
    coins: COFFEE_COINS,
    item: { name: 'coffee', col: COFFEE_AT.col, row: COFFEE_AT.row, sprite: PAC_SPRITE.coffee },
    decor: [...coffeeScenery, ...COFFEE_PIECES],
    creatures: [
      { who: 'pacRooster', col: 26, row: 17, way: 'right', speed: 1, range: 8 },
      { who: 'pacNene', col: 13, row: 7, way: 'right', speed: 1, range: 8 }, // (a nene grazing the second terrace: no lava off the volcano)
    ],
  }),

  // HILO GOODBYE: Hilo's bayfront and the airfield, where the two ways meet. In along the street from Kona; up the rope onto the old wooden storefronts' roofs (a coin) and up the rope from them into Akaka
  // Falls' low lane (the top way, up to Mauna Kea); east to the airfield where the yellow mail biplane waits: NO FLYING WITHOUT A PARACHUTE, TOO SLEEPY TO FLY. The long rope at the street's end comes down
  // from Akaka Falls' high trail and goes on down to the coffee farm's lane (the bottom way). A rooster struts the street.
  room({
    id: PAC.hilo, cell: [3, 23], sector: 53, palette: HILO_PALETTE,
    paint: paintHilo,
    coins: HILO_COINS,
    decor: [...hiloScenery, ...storefronts, [{ text: 'HILO', colour: 7 }, 6, 14], ['skyBiplane', BIPLANE_AT.col, BIPLANE_AT.row]], // (the evening over Hilo Bay: he takes off into the night)
    creatures: [{ who: 'pacRooster', col: 15, row: 17, way: 'right', speed: 1, range: 24 }],
  }),
];
