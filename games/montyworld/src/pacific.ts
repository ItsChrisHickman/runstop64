import type { Arrival, BoardingSpec, CharAnim, CrackSpec, CurrentSpec, IcicleSpec, LavaSpec, PulseSpec, RollerSpec, SwimSurface, TunnelSpec } from '../../montyotr/src/montydata';
import { PLAY_ROW } from '../../shared/monty/screen';
import type { RoomSpec, Sector } from '../../shared/monty/rooms';
import { WORLD_DECOR, type WorldDecor } from './art/world';
import { BOULDER_POINTERS } from './andes-pointers';
import { BUBBLE_FRAMES, SPLASH_FRAMES, STREAK_FRAMES } from './art/pacific-falls';
import { HULA_FRAMES } from './art/pacific-islands';
import { codeOf, decorIndex, fillCells, fillWhere, type Grid, room, type Palette } from './layout';

/**
 * The Pacific, the fifth region of Do Svidaniya Monty: Hawaii's island hopping (docs/dosvidaniya-back-half-plan.md, "Hawaii" and "Hawaii polish pass"; Chris, 2026-11-25: "landing in Honolulu, then climbing
 * Diamond Head to get the snorkel that a tourist left behind, then snorkeling past Molokai to Lahaina, Road to Hana", then to the Big Island (Kona), where the island splits over Mauna Kea and Mauna Loa into
 * Hilo and the plane). Nineteen rooms on four islands: one swim (Oahu to Maui past Molokai, two rooms of open sea) and the turtle crossing to the Big Island on the surface. No banners: each room's own name
 * carries the journey.
 *
 *            col 17          18                  19              20               21              22              23
 *   row 0                                        THE LOOKOUT
 *   row 1                    LEI OF THE LAND     DIAMOND HEAD                                     THE SUMMIT
 *   row 2    THE CARGO SHIP  WELCOME TO HONOLULU WHALE OF A TIME THE ROAD TO HANA KAIHALULU       MAUNA KEA   <->  AKAKA FALLS
 *   row 3                    CHANNEL SURFING     LAND AHOY       THE SEA CAVE     SHELL GAME      KONA        <->  HILO GOODBYE  -> the biplane: THE FLIGHT
 *   row 4                                                                                         MAUNA LOA   <->  COFFEE BREAK
 *
 * Oahu: off the ship onto Waikiki's beach under Aloha Tower, where the surf stops him (deadly until the snorkel); up the palm to the luau (the torches, the hula show, the lei), east along its lawn to the foot
 * of Diamond Head, up the cone by its trail (the walkway, the lighted tunnel, the switchback and stairs, the rockfall, its switchbacks seen zig-zagging up the crater wall beyond) and the Fire Control
 * Station's spiral stair to THE LOOKOUT on the rim, looking down on Waikiki, where a tourist left the snorkel; back down and into the surf. The swim (CHANNEL SURFING: Oahu falling behind, Molokai's sea
 * cliffs alongside; LAND AHOY: Lanai low, West Maui ahead) comes up Lahaina's mooring rope on Maui (or on east into the sea cave, the bonus, and up the road's pool); THE ROAD TO HANA's three tiers with the
 * cars over the one-lane bridges; Kaihalulu's red sand cove, down its cliff to the channel, where the turtles carry him (SHELL GAME: hop shell to shell as they surface and dive) onto Kona's black sand on the
 * Big Island. There the way splits into a loop, Moscow's way (docs/dosvidaniya-moscow.md part 1): the top way up through the cloud to Mauna Kea's summit, where the astronomer keeps the ladder to the parachute
 * drawn up until Monty brings him the moon rock, then along Akaka Falls' high trail and down into Hilo; the bottom way down the lava tube to Mauna Loa (the run ahead of the lava; the moon rock down the crater's
 * pit, which wakes the pit's own lava) and along the coffee farm (the coffee) up into Hilo. Every join goes both ways, and Akaka Falls is crossed twice at two heights (the high trail, and the low lane from
 * Hilo's roofs to Mauna Kea's foot). The biplane takes off only with both (NO FLYING WITHOUT A PARACHUTE, TOO SLEEPY TO FLY), and the summit's gate wants the bottom way's rock: whichever way he takes first,
 * the loop sends him round for the other. Playfield cells as in moscow.ts.
 */

// ---- the ids -----------------------------------------------------------------------------------------
/**
 * Room ids never change once a region has shipped: the first build's (38-54) that came back keep theirs (HANA BANANA's 49 had become the swim room, then FISH OUT OF WATER, now SHELL GAME; MAUNA KEA-OS's 52 the lava, now on
 * Mauna Loa; COFFEE BREAK's 51 and HILO GOODBYE's 53 back to their own), and the new ones go on after the sky's (79-81) and those other regions keep for their returns (82-86): 87 on. 39, 40, 44, 50 and 54
 * stay retired (save-migrate.ts carries a save in one on in a kept room).
 */
export const PAC = {
  ship: 38, waikiki: 41, luau: 42, clam: 43, kelp: 45, lahaina: 46, road: 47, cave: 48, fish: 49, coffee: 51, loa: 52, hilo: 53,
  hana: 87, diamond: 88, lookout: 89, kona: 90, kea: 91, summit: 92, falls: 93,
} as const;

/** The rooms of open water (swim.ts): Monty swims in them, and only with the snorkel: the swim past Molokai and the sea cave. */
export const SWIM_ROOMS: readonly number[] = [PAC.clam, PAC.kelp, PAC.cave];
/** The sea's surface in both swim rooms (the row of the waves): one level, so the two join on the water. */
const SURFACE = 8;
const surfaceY = (row: number): number => 0x32 + (row + PLAY_ROW) * 8 - 4;
/** The swim's two rooms are open sea with a surface (swim.ts, `swimSurfaces`): he floats up with his head at the waterline; coming in from Waikiki's surf above he drops in. */
export const SWIM_SURFACES: readonly SwimSurface[] = [PAC.clam, PAC.kelp].map((room) => ({ room, y: surfaceY(SURFACE) }));

/**
 * The sprite pointers (in the bank) of the Pacific's items: the original's item blocks the world never uses ($8F-$91, $93, $94). The bank is full, so the moon rock borrows the first boulder block while
 * Mauna Loa is loaded (`roomBlocks`, data.ts; no boulder rolls there), the only room that shows it (it is not one of the map's key items: they need a block of their own).
 */
export const PAC_SPRITE = { coffee: 0x8f, snorkel: 0x90, lei: 0x91, musubi: 0x93, parachute: 0x94, moonRock: BOULDER_POINTERS[0] } as const;

const centred = (text: string): Sector => ({ col: Math.floor((32 - text.length) / 2), text });
/** The sectors' names by their place from 38 (the Andes' follow at 55, so the list keeps seventeen places: the retired rooms' are empty). Plain names, a pun where it lands. */
const NAMES = [
  'THE CARGO SHIP', '', '', 'WELCOME TO HONOLULU', 'LEI OF THE LAND', 'CHANNEL SURFING', '', 'LAND AHOY', 'WHALE OF A TIME', 'THE ROAD TO HANA', 'THE SEA CAVE', 'SHELL GAME', '', 'COFFEE BREAK', 'MAUNA LOA', 'HILO GOODBYE', '',
] as const;
export const PACIFIC_SECTORS: readonly Sector[] = NAMES.map(centred);
/** The map's colour of each (the ship red, the beach yellow, the luau pink, the swims blue, Lahaina brown, the road green, the turtles' channel light blue, the farm brown, the lava orange, Hilo grey; the retired none). */
export const PACIFIC_COLOURS: readonly number[] = [2, 0, 0, 7, 10, 6, 0, 14, 9, 5, 6, 14, 0, 9, 8, 12, 0];
/** The sectors from 82 on (the rooms that came back after the sky's, 87-93; 82-86 are other regions' returns, empty here), and their map colours. */
const LATER_NAMES: Readonly<Record<number, string>> = { 87: 'KAIHALULU', 88: 'DIAMOND HEAD', 89: 'THE LOOKOUT', 90: 'KONA', 91: 'MAUNA KEA', 92: 'THE SUMMIT', 93: 'AKAKA FALLS' };
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

/** Diamond Head's two rooms: the paved trail, the concrete (lintels, the Fire Control Station), the tuff, the stairs (the tunnel's, the switchback's, the spiral), the station's slits. */
export const DIAMOND_PALETTE = {
  T: ['pacTrail', 15], C: ['pacConcrete', 12], K: ['pacTuff', 8], S: ['pacStairs', 15], W: ['pacSlitWall', 12],
} as const satisfies Palette;

/** A swim room's (the sea is a backdrop, one flat blue): the sandy bottom and Maui's lava shore, the reef's rock, coral, the mooring and the pool's ropes, and the sea cave's flow lines. */
export const SEA_PALETTE = {
  K: ['pacBlackSand', 11], R: ['pacReefRock', 9], C: ['pacCoral', 10], L: ['pacBamboo', 13], U: ['pacSurge', 6],
} as const satisfies Palette;

/** SHELL GAME: Maui's black lava shore and the rocks at the waterline, the rope down from Kaihalulu, the channel's breaking swell, the turtles' shells (up and going under) and heads, Kona's black sand. */
export const SHELL_PALETTE = {
  L: ['pacBasalt', 11], R: ['pacBamboo', 13], W: ['pacWaves', 14], S: ['pacShell', 13], T: ['pacShellEast', 13], D: ['pacShellDive', 5], H: ['pacTurtleHead', 13], K: ['pacBlackSand', 12],
} as const satisfies Palette;

/** Lahaina: the fort's coral-block wall and the quay, the harbour water, the brig's hull and deck, the ropes, the crates. */
export const WHALE_PALETTE = {
  Q: ['pacWallStone', 9], W: ['pacWaves', 6], H: ['pacHullPlate', 2], D: ['pacDeckPlate', 14], R: ['pacBamboo', 13], C: ['pacCrate', 9],
} as const satisfies Palette;

/** The road's eight: the road, the bridge's deck, the cliff, the bamboo to climb, and the red car's cabin and body. */
export const ROAD_PALETTE = {
  R: ['pacRoad', 15], B: ['pacBridgeDeck', 8], S: ['pacBasalt', 9], V: ['pacBamboo', 13], Y: ['pacCarCab', 2], Z: ['pacCarBody', 2],
} as const satisfies Palette;

/** Hana: the headland's rock and turf, Kaihalulu's red cinder sand, the bamboo rope, the swash of the surf up the beach, the black lava-rock wall across the cove's mouth. */
export const HANA_PALETTE = {
  B: ['pacBasalt', 9], T: ['pacTurf', 5], K: ['pacSandFill', 10], R: ['pacBamboo', 13], P: ['pacSwash', 6], L: ['pacBasalt', 11],
} as const satisfies Palette;

/** Kona: the black sand and the lava rock, the tide pool, the ropes up to Mauna Kea and down the lava tube to Mauna Loa. */
export const KONA_PALETTE = {
  K: ['pacBlackSand', 12], B: ['pacBasalt', 12], W: ['pacWaves', 14], R: ['pacBamboo', 13],
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

/** Waikiki's surf (cols 26-30, rows 18-19): deadly waves until the snorkel; then gone, a dive into CHANNEL SURFING's sea from the sky over it. */
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
 * Diamond Head's rockfall (rollers; the Andes' boulders' pictures; the real trail has its rockfall fences): a rock loosed from the cone's shoulder falls in at the top of the room (col 26, clear of the
 * spiral stair), rolls west along the shoulder (floor 6) a pixel a frame, drops onto the top of the slope (floor 7) and rolls on to the gully (cols 14-15), where it falls out of sight. One every 420 frames,
 * on the path about 130 of them: wait at the gully's west edge for one to go by, then run for the stair. (On sprite 4: the room has no creatures.)
 */
export const ROCK_PATH: readonly (readonly [col: number, row: number])[] = [[26, 0], [26, 4], [21.4, 4], [20.4, 5], [14.6, 5], [14.2, 7], [14.2, 7]];
export const ROCKS: readonly RollerSpec[] = [{ room: PAC.diamond, sprite: 4, path: ROCK_PATH, speed: 1, every: 420, start: 0, frames: BOULDER_POINTERS, colour: 7 }];

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
 * SHELL GAME's turtles (Chris, 2026-11-25: "if getting between island two and three involves riding on turtles' backs instead? Maybe that's good"): green sea turtles at the surface of the channel between
 * Maui and the Big Island, each a shell two cells long (its two halves) and its head (`pulses` of floor tiles, harmless: nothing of them kills). Each is up for `up` frames, shows going under for `warn` (the shell sinks to its
 * crown, flickering), and is down for the rest of its period, the swell's cells showing where it was; then it surfaces again. The swell between them (the room's waves) is deadly, as Waikiki's surf is. They
 * keep their own time (`offset`), so he hops from shell to shell as each comes up and waits on one that will stay up while the next one surfaces.
 */
export const TURTLES = { row: 17, period: 240, up: 130, warn: 40, shells: [{ col: 7, offset: 60 }, { col: 19, offset: 0 }, { col: 24, offset: 150 }] } as const;
export const TURTLE_PULSES: readonly PulseSpec[] = TURTLES.shells.flatMap(({ col, offset }): PulseSpec[] => {
  const timing = { room: PAC.fish, row: TURTLES.row, rows: 1, period: TURTLES.period, start: TURTLES.up, warn: TURTLES.warn, live: 0, offset, warnCode: codeOf(SHELL_PALETTE, 'D'), liveCode: 0, spent: 0 };
  return [{ ...timing, col, cols: 1, idle: codeOf(SHELL_PALETTE, 'S') }, { ...timing, col: col + 1, cols: 1, idle: codeOf(SHELL_PALETTE, 'T') }, { ...timing, col: col + 2, cols: 1, idle: codeOf(SHELL_PALETTE, 'H') }];
});
/** The sea cave's flow lines slide west a pixel a step (half a pixel a frame), the water's way out of the lava tube. */
export const SURGE_ANIMS: readonly CharAnim[] = [{ kind: 'scroll', room: PAC.cave, rings: [[codeOf(SEA_PALETTE, 'U')]], dx: -1, px: 1, every: 1 }];

/**
 * THE SEA CAVE, the bonus off the route (Chris, 2026-11-25: "Having a bonus room that is off the path is an opportunity to try some new things and add some fun challenges"): an old lava tube runs east under
 * the cavern's floor from its mouth by the reef's doorway (cols 2-5) to a pocket of still water at its end (cols 24-29), where the Spam musubi is. The swell drains out of the tube in sets (`currents`, west,
 * the flow lines seen 30 frames before), and two loose stalactites hang in cracks in its roof (`icicles`, drawn in the rock's grey): passing under one at his pace is safe, but a set
 * that catches him past one carries him back under it as it falls. So: wait at the mouth for a set to drain, swim in, up into the alcove halfway (a coin) before the next, out of it as that one is spent
 * and on into the pocket; then ride a set out. The new things: the sea drags him back into a trap he has sprung, and he reads two clocks at once.
 */
export const CAVE_TUBE = { col: 6, cols: 18, top: 15, bottom: 18, alcove: 13, end: 24 } as const;
export const CAVE_TIDE = { period: 220, start: 140, length: 80, warn: 30 } as const;
export const CAVE_STALACTITES: readonly IcicleSpec[] = [10, 19].map((col): IcicleSpec => ({ room: PAC.cave, col, row: 13, floor: 19, colour: 15 }));
const CAVE_CURRENT: CurrentSpec = { room: PAC.cave, col: CAVE_TUBE.col, cols: CAVE_TUBE.cols, top: CAVE_TUBE.top, bottom: CAVE_TUBE.bottom, dx: -1, period: CAVE_TIDE.period, start: CAVE_TIDE.start, length: CAVE_TIDE.length };
/** The tube's flow lines (harmless `pulses`): two staggered rows, steady (not a flicker), seen from 30 frames before a set until it is spent. */
const CAVE_FLOW_PULSES: readonly PulseSpec[] = ([[15, [7, 12, 17, 22]], [17, [9, 14, 20]]] as const).flatMap(([row, cols]) => cols.map((col): PulseSpec => ({
  room: PAC.cave, col, row, cols: 2, rows: 1, period: CAVE_TIDE.period, start: CAVE_TIDE.start - CAVE_TIDE.warn, warn: 0, live: 0,
  idle: 0, warnCode: codeOf(SEA_PALETTE, 'U'), liveCode: codeOf(SEA_PALETTE, 'U'), spent: codeOf(SEA_PALETTE, 'U'),
})));
/** The Pacific's surge (the sea cave's tube) and its flow lines. */
export const PACIFIC_CURRENTS: readonly CurrentSpec[] = [CAVE_CURRENT];
export const PACIFIC_FLOW_PULSES: readonly PulseSpec[] = CAVE_FLOW_PULSES;

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

/**
 * No arrival banners in Hawaii (Chris, 2026-11-25: "I don't want Hawaii: island name all over the place... It should naturally flow with the names"): every room's own name carries the journey, from
 * WELCOME TO HONOLULU past Molokai (CHANNEL SURFING) to Maui (LAND AHOY) and over the turtles (SHELL GAME) to KONA.
 */
export const ARRIVALS: readonly Arrival[] = [];

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
  g.box(23, 17, 24, 18, 'C'); // the crate step up to the stage
  g.box(25, 15, 31, 15, 'B'); // the stage
  g.box(28, 13, 29, 14, 'C'); // the drummers' platform
};
const LUAU_COINS = [[8, 17], [28, 11]] as const;
/** Diamond Head on the horizon to the east, the next room's mountain (its high rim at the left, as Waikiki sees it), and an outrigger on the evening sea, which runs in to the lawn's dark edge (where the torches stand: their flames come and go there). */
const LUAU_HEAD_RIDGE = ridge([[10, 11], [12, 9], [13, 8], [14, 8], [15, 9], [19, 9], [21, 10], [23, 11]]);
const inLuauHead = (c: number, r: number): boolean => c >= 11 && c <= 22 && r <= 10 && r >= LUAU_HEAD_RIDGE(c);
const LUAU_CANOE: readonly Cell[] = cellsOf(9, 14, 4, 2);
const LUAU_KEEP: readonly (readonly [col: number, row: number])[] = [...LUAU_COINS, ...TORCHES.cols.flatMap((col) => [[col, 17], [col + 1, 17], [col, 18], [col + 1, 18]] as const), [1, 16], [2, 16], [1, 17], [2, 17]];

/**
 * DIAMOND HEAD, the climb (Chris, 2026-11-25: "Diamond Head deserves to be at least iconic: 2 rooms, climb up, top room is the lookout"): the tuff cone's flank in profile, its eroded slope and kiawe
 * scrub under the sky, and the summit trail up it as the real one goes: the paved walkway along the foot, the lighted tunnel bored up through the cone's shoulder (in at its foot, up its concrete stairs,
 * out of its upper mouth higher up), the switchback back west to the steep stairs, then east along the top of the slope past the gully to the Fire Control Station's spiral stair up into THE LOOKOUT.
 */
const paintDiamond = (g: Grid): void => {
  g.box(0, 19, 31, 19, 'T'); // the paved walkway along the cone's foot (in from the luau's lawn)
  g.box(22, 6, 31, 18, 'K').clear(25, 8, 30, 18).box(22, 6, 31, 6, 'T'); // the cone's shoulder, the tunnel bored up through it, the trail along its top
  g.clear(22, 16, 24, 18); // the tunnel's lower mouth on the walkway, a hole in the rock
  g.clear(22, 10, 24, 12).box(22, 13, 25, 13, 'T'); // the upper mouth and the landing out of it
  g.box(29, 13, 30, 13, 'T'); // the tunnel's niche beside the stairs
  g.box(27, 9, 27, 18, 'S'); // the tunnel's lighted stairs
  g.box(3, 13, 21, 13, 'T'); // the switchback west from the upper mouth
  g.box(5, 7, 5, 12, 'S'); // the steep stairs up the slope
  g.box(1, 7, 3, 7, 'T').box(7, 7, 13, 7, 'T').box(16, 7, 20, 7, 'T'); // the top of the slope: the old bunker's ledge west of the stairs, the trail east, broken by the gully (cols 14-15)
  g.box(0, 15, 1, 15, 'K'); // a shelf of tuff at the luau stage's end
  g.box(29, 0, 29, 5, 'S'); // the Fire Control Station's spiral stair, up into THE LOOKOUT
};
/** On the old bunker's ledge off the stairs (a pocket off the route), in the tunnel's niche beside its stairs (inside the structure). */
const DIAMOND_COINS = [[1, 5], [29, 11]] as const;
/** The cone's skyline (its slope rising east to the shoulder over the tunnel) and where the kiawe scrub starts on its lower slope. */
const DIAMOND_RIDGE = ridge([[0, 12], [3, 11], [5, 9], [8, 9], [10, 7], [13, 6], [16, 4], [18, 4], [21, 2], [25, 1], [28, 0], [31, 0]]);
/** Across the crater, behind the near slope: the far rim's jagged green crest (the crater's bowl between the two, the way the trail climbs its inner wall). */
const DIAMOND_FAR_RIM = ridge([[0, 4], [2, 3], [4, 4], [6, 3], [8, 5], [10, 5], [12, 7], [14, 8], [16, 10]]);
const DIAMOND_SCRUB = (c: number): number => (c % 5 === 2 ? 15 : 16);
const DIAMOND_PIECES = [
  ['pacCaveTuff', 11, 16], ['pacLookout', 15, 10], ['pacCaveTuff', 17, 3], ['pacKiawe', 5, 17], ['pacKiawe', 17, 17], ['pacKiawe', 1, 17],
  ['pacTunnelLamp', 30, 9], ['pacTunnelLamp', 25, 16], ['pacTunnelLamp', 30, 16], ['pacTunnelLamp', 25, 9],
] as const;
/**
 * The summit trail's switchbacks seen up the crater's inner wall beyond the near slope (the real trail zig-zags up it, built for mules: DLNR), where the climb goes on: runs rising east and west in turn,
 * each a row of cells on a diagonal. Drawn over the far wall's backdrop, under its rim.
 */
const ZIGZAG: readonly (readonly [col: number, row: number, up: boolean])[] = [
  [0, 9, true], [1, 8, true], [2, 7, true], [3, 6, true], [3, 5, false], [2, 4, false], [1, 3, false], [1, 2, true], [2, 1, true],
];
const diamondZig: Placed[] = ZIGZAG.map(([c, r, up]) => [up ? 'pacTrailUp' : 'pacTrailDown', c, r] as const);
const DIAMOND_KEEP: readonly Cell[] = [...DIAMOND_COINS, ...DIAMOND_PIECES.flatMap(under), ...ZIGZAG.map(([c, r]) => [c, r] as const)];
/** The tunnel inside the shoulder: dark, lit by its lamps (no backdrop). */
const inTunnel = (c: number, r: number): boolean => c >= 22 && r >= 8;
const diamondScenery: Placed[] = [
  ...fillWhere(paintDiamond, DIAMOND_KEEP, (c, r) => r < DIAMOND_RIDGE(c) && r < DIAMOND_FAR_RIM(c) && !inTunnel(c, r), 'pacSkyDay'),
  ...fillWhere(paintDiamond, DIAMOND_KEEP, (c, r) => r < DIAMOND_RIDGE(c) && r >= DIAMOND_FAR_RIM(c), 'pacCliffFill'),
  ...fillWhere(paintDiamond, DIAMOND_KEEP, (c, r) => r >= DIAMOND_RIDGE(c) && r < DIAMOND_SCRUB(c) && !inTunnel(c, r), 'pacTuffFill'),
  ...fillWhere(paintDiamond, DIAMOND_KEEP, (c, r) => r >= DIAMOND_SCRUB(c) && !inTunnel(c, r), 'pacScrubFill'),
];

/**
 * THE LOOKOUT, the summit on the row above: the Fire Control Station (1910) in section on the rim, its spiral stair up from the climb, its observation slits, the summit bunker on its roof; out of its slit
 * onto the walk along the rim to the lookout's railing, where a tourist left his snorkel. The payoff is the view: Waikiki's beach and hotels and Honolulu under the Ko'olau mountains far off along the shore,
 * the sea, and the cone's outer flank falling to the coast, Diamond Head Lighthouse at its foot.
 */
const paintLookout = (g: Grid): void => {
  g.box(7, 9, 22, 9, 'T').box(7, 6, 7, 8, 'C'); // the walk along the rim, the railing's post at the lookout
  g.box(8, 10, 22, 10, 'K').box(14, 11, 22, 11, 'K').box(19, 12, 22, 19, 'K'); // the rim's crest under it, the summit's rock under the station
  g.box(23, 4, 31, 4, 'C').box(23, 5, 23, 19, 'C').box(31, 5, 31, 19, 'C').clear(23, 6, 23, 8); // the Fire Control Station: its roof slab, its walls, the slit out onto the rim
  g.box(23, 12, 23, 12, 'W').box(23, 16, 23, 16, 'W').box(31, 7, 31, 7, 'W').box(31, 12, 31, 12, 'W'); // its observation slits
  g.box(24, 9, 27, 9, 'C').box(24, 15, 27, 15, 'C'); // its upper floor and the landing half way up
  g.box(24, 19, 27, 19, 'C'); // its floor, open round the stair (cols 28-30)
  g.box(29, 5, 29, 19, 'S'); // the spiral stair, up from the climb
};
/** On the station's landing half way up its stair (inside the structure), and on the rim walk under the tern's dive (timed). */
const LOOKOUT_COINS = [[24, 13], [16, 7]] as const;
const SNORKEL_AT = { col: 9, row: 7 } as const;
/**
 * The view down from the rim (Chris: The Lookout should read as looking down): the horizon high (row 1), the Ko'olau mountains a dark band along it, the sea spread out below it, and far down at the foot of
 * the view Waikiki's shore and hotels, small, Diamond Head Lighthouse on the coast; the cone's outer flank falling away from under the walk.
 */
const LOOKOUT_HORIZON = 1;
const LOOKOUT_SHORE = 14;
const KOOLAU = ridge([[0, 1], [4, 0], [9, 1], [14, 1], [18, 2]]);
const LOOKOUT_FLANK = ridge([[0, 19], [6, 17], [10, 14], [13, 12], [16, 11], [22, 11]]);
const LOOKOUT_PIECES = [['pacLighthouse', 0, 10], ['pacSkyline', 2, 12], ['pacSkyline', 8, 12], ['pacLookout', 25, 1]] as const;
const LOOKOUT_KEEP: readonly Cell[] = [...LOOKOUT_COINS, ...cellsOf(SNORKEL_AT.col, SNORKEL_AT.row, 2, 2), ...LOOKOUT_PIECES.flatMap(under)];
const inStation = (c: number, r: number): boolean => c >= 24 && r >= 5;
const lookoutScenery: Placed[] = [
  ...fillWhere(paintLookout, LOOKOUT_KEEP, (c, r) => !inStation(c, r) && r <= LOOKOUT_HORIZON && (c > 18 || r < KOOLAU(c)), 'pacSkyDay'),
  ...fillWhere(paintLookout, LOOKOUT_KEEP, (c, r) => c <= 18 && r >= KOOLAU(c) && r <= LOOKOUT_HORIZON + 1, 'pacCliffFill'),
  ...fillWhere(paintLookout, LOOKOUT_KEEP, (c, r) => !inStation(c, r) && r > LOOKOUT_HORIZON + (c <= 18 ? 1 : 0) && r < LOOKOUT_SHORE && r < LOOKOUT_FLANK(c), 'pacSeaFlat'),
  ...fillWhere(paintLookout, LOOKOUT_KEEP, (c, r) => !inStation(c, r) && r >= LOOKOUT_SHORE && r < LOOKOUT_FLANK(c), 'pacScrubFill'),
  ...fillWhere(paintLookout, LOOKOUT_KEEP, (c, r) => !inStation(c, r) && r >= LOOKOUT_FLANK(c), 'pacTuffFill'),
];

/**
 * The swim, Oahu to Maui past Molokai (Chris, 2026-11-25: "Monty should be swimming from one island, past that island, and arriving in Maui"; "They should not be underwater caves. We're swimming in the
 * open ocean"): two rooms of open sea under the evening sky, the sea open to both edges, the reef and the sandy bottom low. The horizon over the water tells the journey as he swims east: Oahu falling away
 * behind (Diamond Head's small dark cone at the west edge), then Molokai alongside: a long island, its north shore the world's tallest sea cliffs (sheer and fluted, cut by the deep valleys of Pelekunu and
 * Wailau, thin waterfalls down them) with the flat Kalaupapa peninsula low at their foot; then, in the second room, Molokai tapering away behind to its east cape, Lanai low and far on the horizon, and the West
 * Maui mountains rising ahead over Lahaina, where he comes up. Silhouettes, calmly drawn (LESSONS): black or a dark band against the sunset.
 */
/** The horizon over a swim room's water: its layers front to back (where `top(col)` is at or above a cell, that cell is the layer's: its backdrop, or black for a far island's silhouette), the sunset over the rest. */
interface Layer { top: (col: number) => number; piece: WorldDecor | null; /** only this many rows deep (a snow cap) */ rows?: number }
type Bands = { purple: number; red: number; orange: number; gold: number };
function horizon(paint: (g: Grid) => void, keep: readonly Cell[], surface: number, layers: readonly Layer[], bands?: Bands): Placed[] {
  const layerAt = (c: number, r: number): Layer | undefined => (r < surface ? layers.find((l) => r >= l.top(c) && (l.rows === undefined || r < l.top(c) + l.rows)) : undefined);
  const pieces = [...new Set(layers.flatMap((l) => (l.piece === null ? [] : [l.piece])))];
  return [
    ...sunset(paint, keep, bands ?? { purple: 1, red: Math.max(2, surface - 5), orange: surface - 3, gold: surface - 1 }, (c, r) => r < surface && layerAt(c, r) === undefined),
    ...pieces.flatMap((piece) => fillWhere(paint, keep, (c, r) => layerAt(c, r)?.piece === piece, piece)),
    ...fillWhere(paint, keep, (_c, r) => r === surface, 'pacSeaWave'),
    ...fillWhere(paint, keep, (_c, r) => r > surface, 'pacSeaFlat'),
  ];
}
/** Only over columns `c0` to `c1`: a layer's top elsewhere is below the water (nothing of it). */
const span = (c0: number, c1: number, top: (col: number) => number) => (col: number): number => (col >= c0 && col <= c1 ? top(col) : 99);

const paintClam = (g: Grid): void => {
  g.box(0, 19, 31, 19, 'K'); // the sandy bottom, open sea to both edges
  g.box(7, 12, 13, 14, 'R').box(7, 15, 7, 16, 'R').box(13, 15, 13, 16, 'R'); // the reef's arch, the way under it along the bottom (rows 17-18)
  g.box(2, 17, 4, 18, 'C'); // coral
  g.box(19, 13, 23, 18, 'R').box(20, 11, 22, 12, 'R'); // the tall coral head (its top three rows under the surface, a lane over it)
};
const CLAM_COINS = [[10, 17]] as const;
/** Oahu behind: Diamond Head's small cone at the west edge, dark (its steep face to the sea at the east). */
const OAHU_BEHIND = span(0, 4, ridge([[0, 6], [1, 5], [2, 5], [3, 6], [4, 7]]));
/** Molokai's low west end, rising to the north shore's cliffs behind Kalaupapa, then the cliffs' high wall east, its valleys cut deep (Pelekunu, Wailau). */
const MOLOKAI = span(7, 31, ridge([[7, 7], [9, 6], [10, 5], [11, 3], [13, 2], [19, 2], [20, 4], [21, 5], [22, 3], [25, 2], [26, 4], [27, 5], [28, 3], [31, 2]]));
/** Kalaupapa: the flat peninsula at the cliffs' foot, low on the water. */
const KALAUPAPA = span(11, 17, () => 6);
const CLAM_PIECES = [['pacCliffFall', 14, 3], ['pacCliffFall', 23, 3], ['pacCliffFall', 29, 3], ['pacKelp', 16, 16], ['pacSeaFan', 27, 16], ['pacBubbles', 25, 10], ['pacSeaFan', 5, 16]] as const;
const CLAM_KEEP: readonly Cell[] = [...CLAM_COINS, ...CLAM_PIECES.flatMap(under)];
const clamScenery: Placed[] = horizon(paintClam, CLAM_KEEP, SURFACE, [
  { top: KALAUPAPA, piece: 'pacScrubFill' }, { top: MOLOKAI, piece: 'pacCliffFill' }, { top: OAHU_BEHIND, piece: null },
]);

const paintKelp = (g: Grid): void => {
  g.box(0, 19, 31, 19, 'K'); // the sandy bottom (in from the west, open sea)
  g.box(31, 3, 31, 13, 'K'); // Maui's lava shore at the east edge, rising out of the sea, the sea cave's mouth under it (out east, rows 14-18)
  g.box(15, 0, 15, SURFACE + 2, 'L'); // the mooring rope down from Lahaina's quay through the surface
  g.box(8, 16, 10, 18, 'C').box(19, 14, 21, 18, 'C'); // coral
  g.box(24, 13, 28, 18, 'R').box(25, 11, 27, 12, 'R').clear(25, 15, 27, 18); // a coral head with a hollow under it
};
const KELP_COINS = [[13, 17]] as const;
/** Molokai behind, tapering east from the last room's cliffs to its cape. */
const MOLOKAI_TAIL = span(0, 6, ridge([[0, 2], [2, 3], [4, 5], [6, 7]]));
/** Lanai, low and far off on the horizon: a long gentle hump. */
const LANAI = span(8, 15, ridge([[8, 7], [9, 6], [11, 5], [14, 5], [15, 7]]));
/** The West Maui mountains rising ahead over Lahaina: steep, deep-valleyed peaks (Pu'u Kukui the highest). */
const WEST_MAUI = span(17, 31, ridge([[17, 7], [19, 6], [21, 4], [23, 2], [24, 3], [25, 1], [27, 2], [28, 4], [30, 3], [31, 3]]));
const KELP_PIECES = [['pacCliffFall', 26, 3], ['pacWhaleTail', 2, 6], ['pacKelp', 12, 16], ['pacKelp', 17, 15], ['pacKelp', 22, 16], ['pacSeaFan', 29, 16], ['pacBubbles', 4, 12], ['pacBubbles', 29, 9]] as const;
const KELP_KEEP: readonly Cell[] = [...KELP_COINS, ...KELP_PIECES.flatMap(under)];
const kelpScenery: Placed[] = horizon(paintKelp, KELP_KEEP, SURFACE, [
  { top: MOLOKAI_TAIL, piece: 'pacCliffFill' }, { top: WEST_MAUI, piece: 'pacCliffFill' }, { top: LANAI, piece: null },
]);

const paintWhale = (g: Grid): void => {
  g.box(0, 18, 9, 19, 'W').box(3, 15, 9, 17, 'H').box(4, 14, 9, 14, 'D'); // the old brig in the harbour water, its deck
  g.box(10, 16, 11, 17, 'C').box(10, 18, 13, 19, 'Q').box(17, 18, 31, 19, 'Q'); // the crates, the landing and the quay, the slipway's gap (cols 14-16)
  g.box(5, 6, 5, 13, 'R').box(6, 7, 12, 7, 'D'); // the mast's rope and the spar
  g.box(15, 12, 15, 19, 'R'); // the mooring rope, down into LAND AHOY
  g.box(30, 2, 31, 15, 'Q'); // the fort's wall at the quay's end (the road goes on under it)
  g.box(0, 2, 0, 17, 'Q'); // the harbour's sea wall on the west (Waikiki's cliff the other side)
};

const paintRoad = (g: Grid): void => {
  g.box(0, 0, 1, 15, 'S').box(0, 18, 1, 19, 'S').box(30, 0, 31, 5, 'S').box(30, 8, 31, 19, 'S'); // the cliff rising off the top at each end, the sky open over the road
  g.box(2, 18, 29, 19, 'R').clear(23, 18, 25, 19).box(8, 18, 19, 18, 'B').clear(8, 19, 19, 19).box(24, 16, 24, 19, 'V'); // the first level and its bridge, the pool (cols 23-25) with a rope hanging in it to the cave
  g.box(2, 13, 29, 14, 'R').clear(27, 13, 29, 14).box(12, 13, 23, 13, 'B').clear(12, 14, 23, 14); // the second level, its bridge, the bend's gap
  g.box(5, 8, 29, 9, 'R').box(11, 8, 22, 8, 'B').clear(11, 9, 22, 9); // the third level and its bridge
  g.box(28, 12, 28, 17, 'V').box(3, 7, 3, 12, 'V'); // the bends' bamboo
};

const paintCave = (g: Grid): void => {
  g.box(0, 0, 31, 3, 'K').clear(23, 0, 25, 3).box(0, 4, 1, 13, 'K').box(30, 4, 31, 19, 'K'); // the road's rock over the cavern, the pool's way up (cols 23-25), the doorway to LAND AHOY (rows 14-18)
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
  g.clear(13, 18, 13, 19); // the cliff's foot open round the rope, which goes on down to the sea (cols 13-15)
  g.box(16, 18, 25, 19, 'K').box(31, 0, 31, 10, 'B'); // Kaihalulu's red sand, Ka'uiki Head's cinder cliff closing the cove
  g.box(26, 19, 28, 19, 'L').box(29, 18, 31, 19, 'L').box(30, 13, 31, 17, 'L').box(31, 11, 31, 12, 'L'); // the natural wall of black lava rock across the cove's mouth, the lagoon inside it (cols 26-29) on its rock
  g.box(14, 7, 14, 19, 'R'); // the bamboo rope down the cliff, past the sand and on down to the channel (SHELL GAME)
  g.box(18, 16, 19, 17, 'B').box(22, 14, 23, 15, 'B').box(24, 12, 26, 12, 'B'); // the steps up the cove's side to the ledge in the cinder cave (the second clear of the first's east side: from the sand under it a jump onto the first, the way back west from the lagoon)
};
/** In the cinder cave (up the steps), and in the lagoon where the wave comes from (at a hazard's edge: in and out between waves). */
const HANA_COINS = [[25, 10], [27, 17]] as const;

/**
 * SHELL GAME, the turtle crossing to the Big Island (Chris, 2026-11-25: FISH OUT OF WATER "is terrible", redone from scratch): no swim, the surface of the open channel. Down the rope from Kaihalulu's cliff
 * onto the lava rock at the waterline; west, the shore's last rock under Maui's cliff (the Spam musubi left on it) over one turtle; east, two turtles across the swell to Kona's black sand. Behind, Maui:
 * Haleakala's long, gentle shield falling to the sea over the cliff; ahead, the Big Island rising over the horizon, Kohala low, Mauna Kea's bumpy crown with its snow and Mauna Loa's smooth broad dome.
 */
const paintFish = (g: Grid): void => {
  g.box(0, 0, 1, 19, 'L').box(0, 16, 4, 19, 'L'); // Maui's lava sea cliff at the west edge and the last rock at its foot (the sea cave's rock the other side)
  g.box(14, 0, 14, 15, 'R'); // the rope down Kaihalulu's cliff, on down to the water
  g.box(12, 16, 16, 19, 'L'); // the lava rock at the waterline under it
  g.box(5, 18, 11, 19, 'W').box(17, 18, 28, 19, 'W'); // the channel's swell, breaking (deadly: the turtles' shells over it at row 17)
  g.box(29, 19, 31, 19, 'K'); // Kona's black sand, out east
};
/** Over the west turtle (taken from its back), and over the second east one's (the crossing's own move). */
const FISH_COINS = [[8, 15], [25, 15]] as const;
const FISH_MUSUBI_AT = { col: 2, row: 14 } as const;
const HALEAKALA = span(0, 14, ridge([[2, 7], [6, 9], [10, 12], [13, 15], [14, 16]]));
const KOHALA = span(17, 19, ridge([[17, 16], [18, 15], [19, 15]]));
const MAUNA_KEA = span(20, 26, ridge([[20, 14], [21, 13], [22, 12], [24, 12], [25, 13], [26, 14]]));
const KEA_SNOW = span(22, 24, () => 12);
const MAUNA_LOA = span(27, 31, ridge([[27, 14], [29, 13], [31, 13]]));
const FISH_PIECES = [['pacLavaRocks', 29, 18]] as const;
const FISH_KEEP: readonly Cell[] = [...FISH_COINS, ...cellsOf(FISH_MUSUBI_AT.col, FISH_MUSUBI_AT.row, 2, 2), ...FISH_PIECES.flatMap(under), ...cellsOf(29, 17, 3, 2)]; // (over Kona's sand: no sea)
const fishScenery: Placed[] = horizon(paintFish, FISH_KEEP, TURTLES.row, [
  { top: KEA_SNOW, piece: 'pacSnowCap', rows: 1 },
  { top: KOHALA, piece: null }, { top: MAUNA_KEA, piece: null }, { top: MAUNA_LOA, piece: null }, { top: HALEAKALA, piece: null },
], { purple: 5, red: 9, orange: 13, gold: 16 });

const paintKona = (g: Grid): void => {
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
  // each step stands clear of the switchback above it (under one, Monty's head met it and the climb stopped there)
  g.box(14, 16, 26, 16, 'C'); // the first switchback, open round the rope
  g.box(11, 14, 12, 14, 'C'); // a step, off the first switchback's west end
  g.box(3, 12, 9, 12, 'C'); // the second, west of the step
  g.box(2, 10, 3, 10, 'C'); // a step at the second's west end
  g.box(6, 8, 31, 8, 'C'); // the third, east of that step, out east to the wet side and Akaka Falls
  g.box(2, 4, 4, 4, 'C').box(8, 4, 10, 4, 'C'); // the top, open round the rope up to the summit
  g.box(6, 0, 6, 7, 'R'); // the rope up to the summit, down to the third switchback (up it onto the top: no step under the top has room over it)
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
  g.box(19, 0, 19, 4, 'K').box(20, 5, 31, 5, 'L'); // the rim's spur and the high shelf east of it, out east to the farm
  g.clear(27, 5, 29, 5).box(28, 4, 28, 18, 'R'); // the rope up the east wall, from the pit's foot past the long ledge through its opening in the shelf (three cells round it, as every rope's opening; under the solid shelf the climb stopped) to the rim
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
/** Kamehameha Avenue's old wooden storefronts under their roofs, side by side along the bayfront (a backdrop he walks past). */
const storefronts: Placed[] = [2, 5, 8, 11].map((col) => ['pacStorefront', col, 13] as const);

// ---- the islands' scenery (Chris, 2026-11-25: "I really want you to think about representing these islands properly"): each room's backdrop, laid round its pieces ----
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

/** Lahaina in the evening: the sunset over the channel, the whale's tail breaching off the harbour; West Maui's green mountains behind Front Street's old storefronts and the courthouse's great banyan on the quay. */
const LAHAINA_COINS = [[9, 5]] as const;
const LAHAINA_PIECES = [['pacStorefront', 17, 12], ['pacStorefront', 20, 12], ['pacBanyan', 24, 14], ['pacWhaleTail', 1, 12], ['pacSail', 7, 8]] as const;
const LAHAINA_KEEP = keepOf([...LAHAINA_COINS, ...cellsOf(6, 12, 2, 2)], LAHAINA_PIECES);
const LAHAINA_MOUNTAINS = ridge([[14, 10], [16, 7], [19, 4], [22, 3], [24, 5], [26, 2], [29, 3]]);
const LAHAINA_SEA = 11;
const lahainaScenery: Placed[] = [
  ...sunset(paintWhale, LAHAINA_KEEP, { purple: 2, red: 5, orange: LAHAINA_SEA - 1, gold: LAHAINA_SEA - 1 }, (c, r) => r < LAHAINA_SEA && (c < 14 || r < LAHAINA_MOUNTAINS(c))),
  ...fillWhere(paintWhale, LAHAINA_KEEP, (c, r) => c >= 14 && r >= LAHAINA_MOUNTAINS(c) && (r <= LAHAINA_SEA || (c >= 17 && r <= 13)), 'pacCliffFill'),
  ...fillWhere(paintWhale, LAHAINA_KEEP, (c, r) => c < 14 && r === LAHAINA_SEA, 'pacSeaWave'),
  ...fillWhere(paintWhale, LAHAINA_KEEP, (c, r) => c < 17 && r > LAHAINA_SEA && r < 18, 'pacSeaFlat'),
];

/** The Road to Hana cut into the jungle cliff: rainforest over every empty cell (the waterfalls and bamboo in it). */
const ROAD_COINS = [[27, 15], [16, 5]] as const;
const ROAD_PIECES = [['pacWaterfall', 6, 2], ['pacWaterfall', 20, 2], ['pacBambooClump', 25, 4], ['pacBambooClump', 7, 4],
  ['pacLaneSign', 6, 16], ['pacLaneSign', 20, 16], ['pacLaneSign', 10, 11], ['pacLaneSign', 24, 11], ['pacLaneSign', 9, 6], ['pacLaneSign', 23, 6]] as const;
const roadScenery: Placed[] = fillWhere(paintRoad, keepOf(ROAD_COINS, ROAD_PIECES), () => true, 'pacJungleFill');

/** Kaihalulu: Ka'uiki Head's crumbling red cinder cliffs round the cove, a cave in them, ironwoods on the headland and the cliff top, the turquoise lagoon inside its natural wall of black lava rock. */
const HANA_PIECES = [['pacBreadStand', 2, 5], ['pacIronwood', 9, 5], ['pacIronwood', 11, 5], ['pacLavaRocks', 16, 17], ['pacCaveCinder', 17, 9]] as const;
const HANA_CLIFF = ridge([[15, 8], [18, 6], [22, 5], [26, 3], [30, 1]]);
const hanaKeep = keepOf(HANA_COINS, HANA_PIECES); // the wave's cells too: a pulse's idle cell shows the backdrop behind it
const hanaScenery: Placed[] = [
  ...fillWhere(paintHana, hanaKeep, (c, r) => (c < 15 ? r < 8 : r < HANA_CLIFF(c)), 'pacSkyDay'),
  ...fillWhere(paintHana, hanaKeep, (c, r) => c >= 15 && r >= HANA_CLIFF(c) && (c < 26 || r < 14), 'pacCinderFill'),
  ...fillWhere(paintHana, hanaKeep, (c, r) => c >= 26 && r >= 14, 'pacLagoonFill'),
];

/**
 * Kona at sunset: the sea on the west horizon (the channel he crossed), the black lava fields rising inland under the shield of the mountains, Mauna Kea's snow along the skyline where the rope climbs. No signs
 * (Chris: "the room names alone suffice"): the fork reads from the land, the rope up the slope toward the snow (the top way), the rope down into the lava tube's hole (the bottom way).
 */
const KONA_PIECES = [['pacLavaRocks', 11, 18], ['pacPalmSmall', 12, 15], ['pacLavaRocks', 29, 18], ['pacLavaRocks', 2, 18]] as const;
const KONA_KEEP = keepOf(KONA_COINS, KONA_PIECES);
const KONA_SLOPE = ridge([[2, 12], [9, 11], [14, 9], [20, 6], [24, 4], [27, 3], [31, 3]]);
const konaScenery: Placed[] = [
  ...sunset(paintKona, KONA_KEEP, { purple: 1, red: 3, orange: 5, gold: 6, sea: 7 }, (c, r) => r < KONA_SLOPE(c)),
  ...fillWhere(paintKona, KONA_KEEP, (c, r) => r > 7 && r < KONA_SLOPE(c), 'pacSeaFlat'),
  ...fillWhere(paintKona, KONA_KEEP, (c, r) => c >= 23 && r === KONA_SLOPE(c), 'pacSnowCap'),
  ...fillWhere(paintKona, KONA_KEEP, (c, r) => r >= KONA_SLOPE(c) + (c >= 23 ? 1 : 0) && r < 19, 'pacLavaFill'),
];

/**
 * Mauna Kea's climb out of the clouds (above the tree line the summit road is cut through black lava, the red cinder cones rising round it): the dusk over the cones, each a separate red hump, the mountain's black lava flank below them, and the sea of cloud under the first switchback.
 */
const KEA_CONES = ridge([[2, 8], [3, 6], [5, 4], [7, 5], [9, 8], [11, 6], [13, 3], [15, 2], [17, 3], [19, 6], [21, 7], [23, 5], [25, 4], [27, 6], [29, 8]]);
const KEA_FLANK = 9;
const KEA_CLOUDS = 17;
const keaScenery: Placed[] = [
  ...sunset(paintKea, KEA_COINS, { purple: 1, red: 3, orange: 5, gold: 7 }, (c, r) => r < KEA_CONES(c) && r < KEA_FLANK),
  ...fillWhere(paintKea, KEA_COINS, (c, r) => r >= KEA_CONES(c) && r < KEA_FLANK, 'pacCinderFill'),
  ...fillWhere(paintKea, KEA_COINS, (_c, r) => r >= KEA_FLANK && r < KEA_CLOUDS, 'pacLavaFill'),
  ...fillWhere(paintKea, KEA_COINS, (_c, r) => r >= KEA_CLOUDS, 'pacCloudFill'),
];

/** The summit over the cloud tops: the sea of cloud on the horizon behind the ridge. */
const SUMMIT_PIECES = [['pacDomeBig', 17, 6], ['pacDomeSmall', 9, 13], ['pacDomeSmall', 28, 13], ['pacCairn', 1, 12]] as const;
const summitScenery: Placed[] = fillWhere(paintSummit, keepOf(SUMMIT_COINS, SUMMIT_PIECES), (_c, r) => r >= 14, 'pacCloudFill');

/**
 * Akaka Falls' gorge (a 442-foot plunge into a deep, green gorge): the sky over the rainforest's dark canopy above the high trail, the stream going over the lip under it, and under the trail the gorge: its
 * walls of wet, mossy rock fluted by the spray, opening out downward round the plunge pool, the falls a white column in its dark middle. Calm: dark bands, the detail in the falls.
 */
const FALLS_PIECES = [['pacWaterfall', 19, 9], ['pacWaterfall', 19, 14], ['pacBambooClump', 2, 4], ['pacBambooClump', 4, 15], ['pacBambooClump', 12, 4], ['pacBambooClump', 24, 15]] as const;
const FALLS_KEEP = keepOf(FALLS_COINS, FALLS_PIECES);
/** The gorge's dark middle round the falls: wider the deeper it goes. */
const inGorge = (c: number, r: number): boolean => r > 8 && Math.abs(c - 19.5) <= 2 + (r - 9) * 0.6;
const fallsScenery: Placed[] = [
  ...fillWhere(paintFalls, FALLS_KEEP, (_c, r) => r <= 2, 'pacSkyDay'),
  ...fillWhere(paintFalls, FALLS_KEEP, (_c, r) => r > 2 && r <= 8, 'pacJungleFill'),
  ...fillWhere(paintFalls, FALLS_KEEP, (c, r) => r > 8 && !inGorge(c, r), 'pacCliffFill'),
];

/**
 * Mauna Loa's summit caldera, Moku'aweoweo, at night: the glow over the rim, the caldera's far wall of stacked flows lit red from below, and its floor of grey pahoehoe round the basin (dark until the lava
 * rises in it).
 */
const LOA_WALL = ridge([[2, 6], [5, 5], [9, 6], [12, 5], [16, 7], [19, 6], [23, 6], [27, 5], [30, 6]]);
const LOA_PIECES = [['pacLavaRocks', 3, 18]] as const;
const LOA_KEEP = keepOf([...LOA_COINS, ...cellsOf(MOON_ROCK_AT.col, MOON_ROCK_AT.row, 2, 2), ...cellsOf(VENT.col, VENT.row, 2, 2)], LOA_PIECES);
const loaBasin = (c: number, r: number) => (c >= LAVA.col && c < LAVA.col + LAVA.cols && r > LAVA.topRow) || (c >= PIT_LAVA.col && c < PIT_LAVA.col + PIT_LAVA.cols && r > PIT_LAVA.topRow);
const loaScenery: Placed[] = [
  ...sunset(paintLoa, LOA_KEEP, { purple: 0, red: 1, orange: 2, gold: 2 }, (_c, r) => r < 3),
  ...fillWhere(paintLoa, LOA_KEEP, (c, r) => r >= 3 && r < LOA_WALL(c) && !loaBasin(c, r), 'pacCinderFill'),
  ...fillWhere(paintLoa, LOA_KEEP, (c, r) => r >= LOA_WALL(c) && !loaBasin(c, r), 'pacLavaFill'),
];

/** The coffee farm on Mauna Loa's flank: the sky, the mountain's dark shoulder far behind, the hillside below planted in rows of coffee along the contour. */
const COFFEE_PIECES = [['pacCoffeeTree', 2, 2], ['pacCoffeeTree', 14, 6], ['pacCoffeeTree', 19, 10], ['pacSacks', 7, 3], ['pacSacks', 25, 17]] as const;
const COFFEE_KEEP = keepOf([...COFFEE_COINS, ...cellsOf(COFFEE_AT.col, COFFEE_AT.row, 2, 2)], COFFEE_PIECES);
const COFFEE_FAR = ridge([[0, 3], [8, 2], [16, 3], [24, 5], [31, 7]]);
const coffeeScenery: Placed[] = [
  ...fillWhere(paintCoffee, COFFEE_KEEP, (c, r) => r < COFFEE_FAR(c), 'pacSkyDay'),
  ...fillWhere(paintCoffee, COFFEE_KEEP, (c, r) => r >= COFFEE_FAR(c) && r < COFFEE_FAR(c) + 4, 'pacLavaFill'),
  ...fillWhere(paintCoffee, COFFEE_KEEP, (c, r) => r >= COFFEE_FAR(c) + 4 && r < 19, 'pacCoffeeRows'),
];

/** Hilo in the evening: the bay behind the bayfront's old storefronts, a banyan by the airfield, Mauna Kea's broad shoulder rising behind the town, bare at the top, the wet windward forest below. */
const HILO_PIECES = [['pacBanyan', 25, 15]] as const;
const HILO_KEEP = keepOf(HILO_COINS, [['skyBiplane', BIPLANE_AT.col, BIPLANE_AT.row], ...HILO_PIECES, ...storefronts]);
const HILO_KEA = ridge([[14, 9], [18, 6], [23, 4], [28, 3], [31, 4]]);
const hiloScenery: Placed[] = [
  ...sunset(paintHilo, HILO_KEEP, { purple: 1, red: 3, orange: 5, gold: 6, sea: 8 }, (c, r) => c < 14 || r < HILO_KEA(c)),
  ...fillWhere(paintHilo, HILO_KEEP, (c, r) => c < 14 && r > 8 && r < 12, 'pacSeaFlat'),
  ...fillWhere(paintHilo, HILO_KEEP, (c, r) => c >= 14 && r >= HILO_KEA(c) && r < HILO_KEA(c) + 2, 'pacLavaFill'),
  ...fillWhere(paintHilo, HILO_KEEP, (c, r) => c >= 15 && r >= HILO_KEA(c) + 2 && r < 19, 'pacJungleFill'),
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
  // turns (a three-cell gap between each to wait in) to the lei on its arch at the west end. East of the palm, the lawn goes on under the stage to the foot of Diamond Head; over it
  // the crate step and the stage, the hula dancer swaying across it and the fire-knife dancer's leaps, the drummers' platform (a coin) and a line of hula dancers behind.
  room({
    id: PAC.luau, cell: [1, 18], sector: 42, palette: LUAU_PALETTE,
    paint: paintLuau,
    coins: LUAU_COINS,
    item: { name: 'lei', col: 1, row: 16, sprite: PAC_SPRITE.lei },
    decor: [
      ...sunset(paintLuau, LUAU_KEEP, { purple: 1, red: 4, orange: 7, gold: 10, sea: 12 }, (c, r) => !inLuauHead(c, r)), ['pacSun', 7, 9],
      ...fillWhere(paintLuau, LUAU_KEEP, inLuauHead, 'pacTuffFill'),
      ...fillWhere(paintLuau, LUAU_KEEP, (c, r) => r >= 13 && r <= 16 && c < (r <= 15 ? 25 : 23) && !LUAU_CANOE.some(([hc, hr]) => hc === c && hr === r), 'pacSeaFlat'), ['pacOutrigger', 9, 14],
      ['pacArchTop', 0, 12], ['pacArchLeg', 0, 14], ['pacArchLeg', 3, 14],
      ['pacHulaDancer', 22, 12], ['pacHulaDancer', 25, 12], ['pacHulaDancer', 30, 12], ['pacDrummer', 30, 11], ['pacDrums', 30, 13],
      ['pacFronds', 18, 12],
    ],
    creatures: [
      { who: 'pacHula', col: 25, row: 13, way: 'right', speed: 1, range: 20, colour: 10 },
      { who: 'pacFireKnife', col: 22, row: 9, way: 'up', speed: 1, range: 40 },
      { who: 'pacTiki', col: 4, row: 6, way: 'down', speed: 1, range: 40 },
    ],
  }),

  // DIAMOND HEAD: the climb up the tuff cone (see paintDiamond). In from the luau's lawn on the walkway (floor 19); into the tunnel's lower mouth and up its lighted stairs (a coin in the niche beside them),
  // out of the upper mouth onto the switchback (floor 13) west to the steep stairs; up them to the top of the slope (floor 7: a coin on the old bunker's ledge west of them), east over the gully, where the
  // rocks loosed from the shoulder roll down the trail and drop out of sight (wait at the gully's west edge, then run), up onto the shoulder and the spiral stair up into THE LOOKOUT.
  room({
    id: PAC.diamond, cell: [1, 19], sector: 88, palette: DIAMOND_PALETTE,
    paint: paintDiamond,
    coins: DIAMOND_COINS,
    decor: [...diamondScenery, ...diamondZig, ...DIAMOND_PIECES],
  }),

  // THE LOOKOUT: the summit (see paintLookout). Up the spiral stair from the climb into the Fire Control Station (a coin on its landing half way), out through its slit onto the rim and west along the walk
  // to the lookout's railing, where a tourist left his snorkel; a tern dives over the walk. Back down the same way.
  room({
    id: PAC.lookout, cell: [0, 19], sector: 89, palette: DIAMOND_PALETTE,
    paint: paintLookout,
    coins: LOOKOUT_COINS,
    item: { name: 'snorkel', col: SNORKEL_AT.col, row: SNORKEL_AT.row, sprite: PAC_SPRITE.snorkel },
    decor: [...lookoutScenery, ...LOOKOUT_PIECES],
    creatures: [{ who: 'pacTern', col: 15, row: 1, way: 'down', speed: 1, range: 40 }],
  }),

  // CHANNEL SURFING: the swim past Molokai (see `horizon`), learning to swim, in the open sea under the evening sky: Diamond Head small behind, Molokai's sea cliffs alongside, waterfalls down them, Kalaupapa
  // low at their foot. In from Waikiki's surf above (cols 26-30): he drops into the sea; down under the reef's arch along the bottom (a coin inside it), past the tall coral head, on east. A turtle rising to
  // breathe and an eel.
  room({
    id: PAC.clam, cell: [3, 18], sector: 43, palette: SEA_PALETTE,
    paint: paintClam,
    coins: CLAM_COINS,
    decor: [...clamScenery, ...CLAM_PIECES],
    creatures: [
      { who: 'pacTurtle', col: 3, row: 10, way: 'down', speed: 1, range: 32 },
      { who: 'pacEel', col: 26, row: 9, way: 'left', speed: 1, range: 12 },
    ],
  }),

  // LAND AHOY: on past Molokai's east cape, Lanai low on the horizon, the West Maui mountains ahead, a humpback's flukes in the channel. In from the west, along the surface or low; through the kelp past the manta
  // (a coin deep in it); the mooring rope comes down from Lahaina's quay through the surface (col 15), the way up; east, low, under Maui's lava shore, the sea cave.
  room({
    id: PAC.kelp, cell: [3, 19], sector: 45, palette: SEA_PALETTE,
    paint: paintKelp,
    coins: KELP_COINS,
    decor: [...kelpScenery, ...KELP_PIECES],
    creatures: [
      { who: 'pacManta', col: 8, row: 9, way: 'right', speed: 1, range: 100 },
      { who: 'pacTurtle', col: 22, row: 8, way: 'down', speed: 1, range: 40 },
    ],
  }),

  // WHALE OF A TIME: Lahaina's old whaling harbour on Maui. Up the mooring rope from the reef through the slipway (cols 14-16) onto the quay. The old brig lies in the harbour water at the left: the crates up
  // to its deck (a Spam musubi), the mast's rope to the spar (a dead end, its coin); the quay runs east past the outrigger and under the fort's wall onto the road. The whale's tail in the harbour.
  room({
    id: PAC.lahaina, cell: [2, 19], sector: 46, palette: WHALE_PALETTE,
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

  // KAIHALULU: the road's end on Maui, Kaihalulu's red sand in its cinder cove (HANA BANANA's place). In at the left on the headland (floor 8), the banana-bread stand by the road; the bamboo rope (col 14) down
  // the cliff past the red sand (floor 18) and on down to the channel, the way on (SHELL GAME: the turtles start west of the Big Island, so the way down is at the cove's west end). Off it onto the sand, the surf
  // sweeping up it from the lagoon on a timing (spray, then the wave, then it draws back): in between waves to the lagoon's coin; steps up the cove's side to the ledge in the cinder cave (a coin). The crab.
  room({
    id: PAC.hana, cell: [2, 21], sector: 87, palette: HANA_PALETTE,
    paint: paintHana,
    coins: HANA_COINS,
    decor: [...hanaScenery, ...HANA_PIECES],
    creatures: [{ who: 'pacCrab', col: 17, row: 16, way: 'right', speed: 1, range: 20, colour: 7 }], // (clear of the rope's foot: the rope goes on down past the sand)
  }),

  // SHELL GAME: the turtle crossing to the Big Island, on the surface (see paintFish). Down the rope from Kaihalulu onto the lava rock at the waterline; west over one turtle to the shore's last rock under
  // Maui's cliff (the Spam musubi, a coin over the turtle's back); east over two turtles, each up, going under (the warning) and down in turn, to Kona's black sand. Back up the rope.
  room({
    id: PAC.fish, cell: [3, 21], sector: 49, palette: SHELL_PALETTE,
    paint: paintFish,
    coins: FISH_COINS,
    item: { name: 'musubi1', col: FISH_MUSUBI_AT.col, row: FISH_MUSUBI_AT.row, sprite: PAC_SPRITE.musubi },
    decor: [...fishScenery, ...FISH_PIECES], // (no creature: the turtles are the room's living thing, its timing to learn; the tern is Oahu's)
  }),

  // KONA: the Big Island's black sand, rocky with lava (Chris, 2026-11-25: "a rocky beach with black sand"), where the way splits. Out of the sea at the left (floor 19); over the lava tube's mouth (the rope
  // down it to MAUNA LOA, the bottom way) and the tide pool (a coin over it); up the lava rock (a coin at its top) to the rope up the mountain's flank to MAUNA KEA (the top way); on east along the sand to
  // Hilo, where the plane is. A crab on the sand.
  room({
    id: PAC.kona, cell: [3, 22], sector: 90, palette: KONA_PALETTE,
    paint: paintKona,
    coins: KONA_COINS,
    decor: [...konaScenery, ...KONA_PIECES],
    creatures: [{ who: 'pacCrab', col: 19, row: 17, way: 'right', speed: 1, range: 40 }],
  }),

  // MAUNA KEA: the top way, the climb up through the cloud (Chris, 2026-11-25: Mauna Kea "is on a path through the middle of the island"). Up the rope from Kona onto the cinder switchbacks: the first (floor 16)
  // west, a step, the second (floor 12) west to a step, the third (floor 8) east, which runs on out of the room down the wet side to Akaka Falls; up the rope from it to the top (floor 4) and on up to the summit.
  // A nene on the first switchback; the clouds below.
  room({
    id: PAC.kea, cell: [2, 22], sector: 91, palette: KEA_PALETTE,
    paint: paintKea,
    coins: KEA_COINS,
    decor: keaScenery,
    creatures: [{ who: 'pacNene', col: 15, row: 14, way: 'right', speed: 1, range: 28 }],
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
    ],
  }),

  // HILO GOODBYE: Hilo's bayfront and the airfield, where the two ways meet. In along the street from Kona; up the rope onto the old wooden storefronts' roofs (a coin) and up the rope from them into Akaka
  // Falls' low lane (the top way, up to Mauna Kea); east to the airfield where the yellow mail biplane waits: NO FLYING WITHOUT A PARACHUTE, TOO SLEEPY TO FLY. The long rope at the street's end comes down
  // from Akaka Falls' high trail and goes on down to the coffee farm's lane (the bottom way). A rooster struts the street.
  room({
    id: PAC.hilo, cell: [3, 23], sector: 53, palette: HILO_PALETTE,
    paint: paintHilo,
    coins: HILO_COINS,
    decor: [...hiloScenery, ...storefronts, ...HILO_PIECES, ['skyBiplane', BIPLANE_AT.col, BIPLANE_AT.row]], // (the evening over Hilo Bay: he takes off into the night)
    creatures: [{ who: 'pacRooster', col: 15, row: 17, way: 'right', speed: 1, range: 24 }],
  }),
];
