import type { Arrival, BoardingSpec, CharAnim, CrackSpec, CurrentSpec, IcicleSpec, LavaSpec, PulseSpec, RollerSpec, RoomBlocks, SwimSurface, TunnelSpec } from '../../montyotr/src/montydata';
import { PLAY_ROW } from '../../shared/monty/screen';
import type { RoomSpec, Sector } from '../../shared/monty/rooms';
import { WORLD_DECOR, type WorldDecor } from './art/world';
import { BOULDER_POINTERS, LEAP_POINTERS } from './andes-pointers';
import { WHALE_BLOCKS } from './art/pacific-whale';
import { leap } from './leaps';
import { BUBBLE_FRAMES, PLUNGE_COLS, PLUNGE_SPLASH_FRAMES, PLUNGE_STREAK_FRAMES, SPLASH_FRAMES, STREAK_FRAMES } from './art/pacific-falls';
import { HULA_FRAMES } from './art/pacific-islands';
import { PLUNGE } from './art/pacific-scenery';
import { codeOf, decorIndex, fillCells, fillWhere, type Grid, room, type Palette } from './layout';

/**
 * The Pacific, the fifth region of Do Svidaniya Monty: Hawaii's island hopping (docs/dosvidaniya-back-half-plan.md, "Hawaii" and "Hawaii polish pass"; Chris, 2026-11-25: "landing in Honolulu, then climbing
 * Diamond Head to get the snorkel that a tourist left behind, then snorkeling past Molokai to Lahaina, Road to Hana", then to the Big Island (Kona), where the island splits over Mauna Kea and Mauna Loa into
 * Hilo and the plane). Twenty-two rooms on four islands (BOARD MEETING, the beach west of the luau, and ON THIN ICE and SEEING STARS either side of the summit, bonuses): one swim (Oahu to Maui past Molokai, two rooms of open sea) and the turtle crossing to the Big Island on the surface. No banners: each room's own name
 * carries the journey.
 *
 *            col 17          18                  19              20               21              22              23
 *   row 0                                        THE LOOKOUT
 *   row 1    BOARD MEETING   LEI OF THE LAND     DIAMOND HEAD                    ON THIN ICE <-> THE SUMMIT <-> SEEING STARS
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
 * pit, past a magma blob bobbing beside the rope) and along the coffee farm (the coffee) up into Hilo. Every join goes both ways, and Akaka Falls is crossed twice at two heights (the high trail, and the low lane from
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
  hana: 87, diamond: 88, lookout: 89, kona: 90, kea: 91, summit: 92, falls: 93, beach: 99, waiau: 101, ridge: 102,
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
/** The names and map colours of the Pacific's rooms whose sectors are after the sky's (87-93; later-sectors.ts lays them out with the other regions' later rooms, 82-86). */
export const PACIFIC_LATER_NAMES: Readonly<Record<number, string>> = {
  87: 'KAIHALULU', 88: 'DIAMOND HEAD', 89: 'THE LOOKOUT', 90: 'KONA', 91: 'MAUNA KEA', 92: 'THE SUMMIT', 93: 'AKAKA FALLS', 99: 'BOARD MEETING', 101: 'ON THIN ICE', 102: 'SEEING STARS',
};
export const PACIFIC_LATER_COLOURS: Readonly<Record<number, number>> = { 87: 10, 88: 9, 89: 1, 90: 11, 91: 2, 92: 1, 93: 5, 99: 3, 101: 14, 102: 7 };

// ---- the palettes --------------------------------------------------------------------------------------
/** The ship: the hull's red plates, the deck's bright plate, the hold's grating, the ladders, a crate step, the bow's containers, the bilge water. */
export const SHIP_PALETTE = {
  H: ['pacHullPlate', 2], D: ['pacDeckPlate', 14], G: ['pacGrating', 3], L: ['pacSteelLadder', 7], C: ['pacCrate', 9], T: ['pacContainer', 8], W: ['pacWaves', 6],
} as const satisfies Palette;

/** Waikiki: the pier's and the lawn's boards, the sand, the surf, Aloha Tower's stone, the palm's trunk, Diamond Head's rock, the surf gone calm (with the snorkel: the water he dives into). */
export const WAIKIKI_PALETTE = {
  B: ['pacBoardwalk', 8], A: ['pacSand', 7], W: ['pacWaves', 14], S: ['pacTowerFace', 7], R: ['pacPalmTrunk', 9], K: ['pacBasalt', 11], C: ['pacSeaCalm', 14],
} as const satisfies Palette;

/** The luau: the lawn's sand, the stage's boards, the crate steps, the palm, the hillside rope, the torches' embers and flames (warning and full). */
export const LUAU_PALETTE = {
  A: ['pacSand', 7], B: ['pacBoardwalk', 9], C: ['pacCrate', 9], P: ['pacPalmTrunk', 9], R: ['pacBamboo', 13], Y: ['pacEmber', 7], Z: ['pacFlameWarn', 7], F: ['pacFlame', 2],
} as const satisfies Palette;

/** BOARD MEETING, Waikiki's beach west of the luau: the sand, the racks' shelves (light: floors he jumps up through), the Royal Hawaiian's pink wall closing the west, the beach boys' crate. */
export const BEACH_BOYS_PALETTE = {
  A: ['pacSand', 7], S: ['pacBoardwalk', 3], H: ['pacHotelWall', 10], C: ['pacCrate', 9],
} as const satisfies Palette;

/** Diamond Head's two rooms: the paved trail, the concrete (lintels, the Fire Control Station), the tuff, the stairs (the tunnel's, the switchback's, the spiral), the station's slits. */
export const DIAMOND_PALETTE = {
  T: ['pacTrail', 15], C: ['pacConcrete', 12], K: ['pacTuff', 8], S: ['pacStairs', 1], W: ['pacSlitWall', 12],
} as const satisfies Palette;

/**
 * A swim room's (the sea is a backdrop, one flat blue): the sandy bottom and Maui's lava shore, the reef's rock, coral, the mooring and the pool's ropes, the sea cave's flow lines (white, Chris: "the flow should
 * be white arrows, not black"), and Koko Head's lava wall closing the swim's west edge.
 */
export const SEA_PALETTE = {
  K: ['pacBlackSand', 11], R: ['pacReefRock', 9], C: ['pacCoral', 10], L: ['pacBamboo', 13], U: ['pacSurge', 1], B: ['pacBasalt', 11],
} as const satisfies Palette;

/** SHELL GAME: Maui's black lava shore and the rocks at the waterline, the rope down from Kaihalulu, the channel's breaking swell (white: a breaker kills, as Kaihalulu's surf; plain blue would read as swimmable), the turtles' shells (up and going under) and heads, Kona's black sand. */
export const SHELL_PALETTE = {
  L: ['pacBasalt', 11], R: ['pacBamboo', 13], W: ['pacWaves', 1], S: ['pacShell', 13], T: ['pacShellEast', 13], D: ['pacShellDive', 5], H: ['pacTurtleHead', 13], K: ['pacBlackSand', 12],
} as const satisfies Palette;

/** Lahaina: the fort's coral-block wall and the quay, the brig's hull and deck, the ropes, the crates, the whale's spout, the harbour's stony bed under its shallows (the water a backdrop: he wades it). */
export const WHALE_PALETTE = {
  Q: ['pacWallStone', 9], H: ['pacHullPlate', 2], D: ['pacDeckPlate', 14], R: ['pacBamboo', 13], C: ['pacCrate', 9], V: ['pacSteam', 1], B: ['pacBasalt', 11],
} as const satisfies Palette;

/** The road's eight: the road, the bridge's deck, the cliff, the bamboo to climb, and the red car's cabin and body. */
export const ROAD_PALETTE = {
  R: ['pacRoad', 15], B: ['pacBridgeDeck', 8], S: ['pacBasalt', 9], V: ['pacBamboo', 13], Y: ['pacCarCab', 2], Z: ['pacCarBody', 2],
} as const satisfies Palette;

/**
 * Hana: the headland's rock and turf, Kaihalulu's red cinder sand, the bamboo rope, the surf breaking up the beach (white: a breaker kills where plain blue water would not; Chris: "why does it kill me if I have a
 * snorkel?"), the black lava-rock wall across the cove's mouth.
 */
export const HANA_PALETTE = {
  B: ['pacBasalt', 9], T: ['pacTurf', 5], K: ['pacSandFill', 10], R: ['pacBamboo', 13], P: ['pacSwash', 1], L: ['pacBasalt', 11],
} as const satisfies Palette;

/** Kona: the black sand and the lava rock (the tide pool's bed), the ropes up to Mauna Kea and down the lava tube to Mauna Loa. */
export const KONA_PALETTE = {
  K: ['pacBlackSand', 12], B: ['pacBasalt', 12], R: ['pacBamboo', 13],
} as const satisfies Palette;

/** Mauna Kea and its summit: the red cinder, the rope, the observatory's catwalk and ladders. */
export const KEA_PALETTE = {
  C: ['pacBasalt', 10], R: ['pacBamboo', 13], G: ['pacGrating', 15], L: ['pacSteelLadder', 15],
} as const satisfies Palette;

/** ON THIN ICE: the red cinder and its snow, Lake Waiau's ice (whole, cracking, split) and the icy water under it. */
export const WAIAU_PALETTE = {
  C: ['pacBasalt', 10], N: ['snowGround', 1], I: ['iceSheet', 14], J: ['iceCrack', 14], H: ['iceWide', 14], W: ['lakeWater', 6],
} as const satisfies Palette;
/** SEEING STARS: the red cinder, the domes' catwalks, gantry and ladders, the guide-star laser (shining, and its faint flicker as it is switched on). */
export const RIDGE_PALETTE = {
  C: ['pacBasalt', 10], G: ['pacGrating', 15], L: ['pacSteelLadder', 15], Z: ['pacLaser', 7], Y: ['pacLaser', 11],
} as const satisfies Palette;

/** Akaka Falls: the gorge's rock and its mossy trail, the plunge pool (churned white under the falls: it kills, as a breaker does; never calm water a snorkeller would swim), the ropes down to Hilo, the stream over the ford and its spate's white water. */
export const FALLS_PALETTE = {
  B: ['pacBasalt', 9], T: ['pacTurf', 13], W: ['pacWaves', 1], R: ['pacBamboo', 13], S: ['pacSurge', 14], V: ['pacSurge', 1], F: ['pacSwash', 1],
} as const satisfies Palette;

/** Mauna Loa: the crater's dark rock, the ledges' pale crust (whole and split), the lava and its crest, the ropes, the steam vent's column. */
export const LOA_PALETTE = {
  K: ['pacCrust', 9], L: ['pacCrust', 15], Y: ['pacCrustSplit', 15], M: ['pacMagma', 2], C: ['pacMagmaCrest', 7], R: ['pacBamboo', 13], V: ['pacSteam', 1],
} as const satisfies Palette;

/** The coffee farm: the terraces' turf over red soil, the rope up to Hilo, the farm road, the lava-rock wall at its end, the drying deck's boards. */
export const COFFEE_PALETTE = {
  T: ['pacTurf', 13], S: ['pacBasalt', 9], R: ['pacBamboo', 13], P: ['pacRoad', 15], B: ['pacReefRock', 9], D: ['pacBridgeDeck', 8],
} as const satisfies Palette;

/** Hilo: the street, the storefronts' roofs, the bayfront's sea wall, the airfield's hangar wall closing the east, the rope down to the farm. */
export const HILO_PALETTE = {
  P: ['pacRoad', 11], J: ['pacBridgeDeck', 8], H: ['pacHotelWall', 12], R: ['pacBamboo', 13], S: ['pacSeaWall', 14],
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
/**
 * The horizon band's last row (LESSONS, "No full-screen fill behind the play"; Chris, 2026-11-26, Hawaii: "the right idea turning into a flood fill that made each level heavy and busy rather than a
 * colorful accent to set the mood"): sky, sunset and the islands' mountains in their own colours sit in rows 0 to this one; below it, behind the play, black, but for the water and the room's own things.
 */
const HORIZON = 5;
/** The far islands' silhouette: one solid dark grey (Oahu behind, Lanai, the Big Island across the channel, Mauna Kea behind Hilo and Mauna Loa behind the coffee farm): far off, flat, no detail. */
const FAR: WorldDecor = 'rioShade';
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

/**
 * Waikiki's surf (cols 26-30, rows 18-19): deadly breakers until the snorkel. Coming up to it with the snorkel (`SURF_EDGE`, the sand by it) the surf goes calm, seen: the water stays, drawn as calm sea he
 * drops through into CHANNEL SURFING (Chris: the drop "doesn't really tell me there's water down there"), and stays calm (kept: data.ts).
 */
export const SURF_CELLS: readonly (readonly [row: number, col: number])[] = [18, 19].flatMap((row) => [26, 27, 28, 29, 30].map((col) => [row, col] as const));
export const SURF_CALM_CODE = codeOf(WAIKIKI_PALETTE, 'C');
/** The sand by the surf (playfield cells, corners inclusive) where he stands as it calms. */
export const SURF_EDGE = { col0: 22, row0: 15, col1: 30, row1: 19 } as const;

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
 * The Road to Hana's one-lane bridges (`tunnels` with a `span`): red rental cars, four cells long and two tall (the lane's own two rows), drive over each bridge, always the way Monty goes up the road, two at a
 * time (Chris, 2026-11-26: "the cars need to be moving constantly and they might need to be two at a time"): a pair close behind each other, then a gap, round and round, each tier at a speed of its own (a
 * cell every `step` frames: the middle tier's cars fastest, the top's slowest). The next car flashes its headlamps at the bridge's near end for 32 frames (the warning). Monty takes 16 frames a cell, so a
 * bridge (12 cells) is crossed by starting as the pair's second car clears its near end: the gap to the next pair is a little more than the walk needs (the cars gain on him from behind), and starting late,
 * or on the flash, is not. Going down the road, he drops off the tiers' ends and needs no bridge. The three tiers' pairs come round at different periods, so a car is always on the move somewhere.
 * (The three tiers and the cars driving through, Chris, 2026-11-25: "I really loved the three tiers with the cars driving through".)
 */
export const BRIDGES = [
  { level: 18, from: 'left', first: 8, last: 19, step: 4, pair: 28, period: 220, offset: 0 },
  { level: 13, from: 'right', first: 12, last: 23, step: 3, pair: 24, period: 240, offset: 80 },
  { level: 8, from: 'left', first: 11, last: 22, step: 5, pair: 40, period: 200, offset: 150 },
] as const;
export const CAR = { cols: 4, warn: 32 } as const;
/** The frames a car takes from coming on at a bridge's near end to being gone off its far end. */
const sweepFrames = (b: (typeof BRIDGES)[number]) => (b.last - b.first + 1 + CAR.cols + 1) * b.step;
export const BRIDGE_CARS: readonly TunnelSpec[] = BRIDGES.flatMap((b) => [0, b.pair].map((behind): TunnelSpec => ({
  room: PAC.road, from: b.from, code: codeOf(ROAD_PALETTE, 'Z'), cols: CAR.cols, top: b.level - 2, bottom: b.level - 1, step: b.step, rest: b.period - CAR.warn - sweepFrames(b), warn: CAR.warn,
  offset: b.offset + behind, span: { from: b.first, to: b.last },
  picture: [[0, codeOf(ROAD_PALETTE, 'Y'), codeOf(ROAD_PALETTE, 'Y'), 0], [codeOf(ROAD_PALETTE, 'Z'), codeOf(ROAD_PALETTE, 'Z'), codeOf(ROAD_PALETTE, 'Z'), codeOf(ROAD_PALETTE, 'Z')]],
})));

/**
 * The waterfalls move (charAnims cycles, charanim.ts): the streaks of the cascade's three middle rows (cells 2-7) fall, a roll of 3 pixels a frame, and the splash at its foot (cells 8-9) throws up spray and
 * mist: the Road to Hana's two cascades down the cliff, the road's pool falling into the sea cave, and Akaka Falls' plunge.
 */
const fallCells = (piece: WorldDecor, from: number, to: number) => Array.from({ length: to - from + 1 }, (_, i) => ({ decor: decorIndex(piece), cell: from + i }));
export const FALLS_ANIMS: readonly CharAnim[] = [
  ...[PAC.road, PAC.cave].flatMap((room): CharAnim[] => [
    { kind: 'cycle', room, chars: fallCells('pacWaterfall', 2, 7), frames: STREAK_FRAMES, every: 1 },
    { kind: 'cycle', room, chars: fallCells('pacWaterfall', 8, 9), frames: SPLASH_FRAMES, every: 2 },
  ]),
  // Akaka Falls' plunge: each block of three rows of streaks takes the cascade's pictures, its splash at the foot
  ...Array.from({ length: PLUNGE.streakBlocks }, (_, b): CharAnim => ({
    kind: 'cycle', room: PAC.falls, chars: fallCells('pacPlunge', b * 3 * PLUNGE_COLS, (b + 1) * 3 * PLUNGE_COLS - 1), frames: PLUNGE_STREAK_FRAMES, every: 1,
  })),
  { kind: 'cycle', room: PAC.falls, chars: fallCells('pacPlunge', (PLUNGE.rows - 1) * PLUNGE_COLS, PLUNGE.rows * PLUNGE_COLS - 1), frames: PLUNGE_SPLASH_FRAMES, every: 2 },
];
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
 * keep their own time (`offset`), so he hops from shell to shell as each comes up and waits on one that will stay up while the next one surfaces. Harder (Chris, 2026-11-26: "needs to be harder. Pretty cool
 * idea"): each its own period and time up, so the pattern drifts and has to be read each time, never learnt once; and the dolphins leap in the gaps between them (the room's creatures).
 */
export const TURTLES = {
  row: 17, warn: 40,
  shells: [{ col: 7, offset: 60, period: 240, up: 120 }, { col: 19, offset: 0, period: 200, up: 100 }, { col: 24, offset: 150, period: 280, up: 130 }],
} as const;
export const TURTLE_PULSES: readonly PulseSpec[] = TURTLES.shells.flatMap(({ col, offset, period, up }): PulseSpec[] => {
  const timing = { room: PAC.fish, row: TURTLES.row, rows: 1, period, start: up, warn: TURTLES.warn, live: 0, offset, warnCode: codeOf(SHELL_PALETTE, 'D'), liveCode: 0, spent: 0 };
  return [{ ...timing, col, cols: 1, idle: codeOf(SHELL_PALETTE, 'S') }, { ...timing, col: col + 1, cols: 1, idle: codeOf(SHELL_PALETTE, 'T') }, { ...timing, col: col + 2, cols: 1, idle: codeOf(SHELL_PALETTE, 'H') }];
});
/**
 * Akaka Falls' own hazard (Chris, 2026-11-26: "literally nothing going on"): the stream that becomes the falls crosses the high trail at a ford just above the lip (cols 18-20, from the forest at row 4 down
 * to the trail): calm, its flow lines; every `period` frames it comes down in spate, the water churning white for `warn` (the warning, flickering), then a white rush over the ford for `live`, deadly (it
 * would carry him over the falls). The trail's crossing is timed to it, both ways, with the parrot sweeping the trail.
 */
export const FORD = { col: 18, cols: 3, row: 4, rows: 4, period: 150, start: 60, warn: 30, live: 36 } as const;
export const FORD_PULSES: readonly PulseSpec[] = [{
  room: PAC.falls, col: FORD.col, row: FORD.row, cols: FORD.cols, rows: FORD.rows, period: FORD.period, start: FORD.start, warn: FORD.warn, live: FORD.live,
  idle: codeOf(FALLS_PALETTE, 'S'), warnCode: codeOf(FALLS_PALETTE, 'V'), liveCode: codeOf(FALLS_PALETTE, 'F'), spent: codeOf(FALLS_PALETTE, 'S'), // (the warning's white lines are nothing to touch; the rush is)
}];
/**
 * ON THIN ICE's frozen lake (`cracks`, a cell each, as the junk's deck): standing on a cell of it, it cracks after 20 frames, splits at 36 and is gone at 50, the icy water under it; back 240 frames later.
 * Keep moving: the snowball rolling across the ice and the nene walking the shore both make him wait, and waiting on the ice is what breaks it.
 */
export const WAIAU_ICE = { col: 10, cols: 10, row: 17 } as const;
export const WAIAU_CRACKS: readonly CrackSpec[] = Array.from({ length: WAIAU_ICE.cols }, (_, k): CrackSpec => ({
  room: PAC.waiau, col: WAIAU_ICE.col + k, cols: 1, row: WAIAU_ICE.row, codes: [codeOf(WAIAU_PALETTE, 'I'), codeOf(WAIAU_PALETTE, 'J'), codeOf(WAIAU_PALETTE, 'H')], crack: 20, wide: 36, gone: 50, away: 240,
}));
/**
 * SEEING STARS' guide-star laser (the edges plan: "Keck's guide-star laser as a timed beam across the way"): Subaru's small dome shines it straight up through the gantry between the twin domes (col 15),
 * flickering faintly for `warn` frames as it is switched on, then a bright beam, deadly, for `live`; the crossing over the gantry (and under it, past the dome on the ridge) is timed to it.
 */
export const LASER = { col: 15, period: 160, start: 50, warn: 30, live: 50, gantry: 9, domeTop: 12 } as const;
export const LASER_PULSES: readonly PulseSpec[] = ([[0, LASER.gantry - 1], [LASER.gantry + 1, LASER.domeTop]] as const).map(([row0, row1]): PulseSpec => ({
  room: PAC.ridge, col: LASER.col, row: row0, cols: 1, rows: row1 - row0 + 1, period: LASER.period, start: LASER.start, warn: LASER.warn, live: LASER.live,
  idle: 0, warnCode: codeOf(RIDGE_PALETTE, 'Y'), liveCode: codeOf(RIDGE_PALETTE, 'Z'), spent: 0,
}));
/** The sea cave's flow lines slide west a pixel a step (half a pixel a frame), the water's way out of the lava tube. */
export const SURGE_ANIMS: readonly CharAnim[] = [{ kind: 'scroll', room: PAC.cave, rings: [[codeOf(SEA_PALETTE, 'U')]], dx: -1, px: 1, every: 1 }];

/**
 * THE SEA CAVE, the bonus off the route (Chris, 2026-11-25: "Having a bonus room that is off the path is an opportunity to try some new things and add some fun challenges"): an old lava tube runs east under
 * the cavern's floor from its mouth by the reef's doorway (cols 2-5) to a pocket of still water at its end (cols 24-29), where the Spam musubi is. The swell drains out of the tube in sets (`currents`, west,
 * the flow lines seen 30 frames before), and two loose stalactites hang in cracks in its roof (`icicles`, drawn in the rock's grey): they drip on their own clocks (`CAVE_DRIPS`), so a swim under one is timed, and a set
 * that catches him past one carries him back under it as it falls. So: wait at the mouth for a set to drain, swim in, up into the alcove halfway (a coin) before the next, out of it as that one is spent
 * and on into the pocket; then ride a set out. The new things: the sea drags him back into a trap he has sprung, and he reads two clocks at once.
 */
export const CAVE_TUBE = { col: 6, cols: 18, top: 15, bottom: 18, alcove: 13, end: 24 } as const;
export const CAVE_TIDE = { period: 220, start: 140, length: 80, warn: 30 } as const;
/** The stalactites drip on their own clocks (`period`, Chris: "icicles on their own"), staggered, a period of their own against the tide's: the swim through the tube reads three clocks. */
export const CAVE_DRIPS = { period: 170, phases: [40, 125] } as const;
export const CAVE_STALACTITES: readonly IcicleSpec[] = [10, 19].map((col, i): IcicleSpec => ({ room: PAC.cave, col, row: 13, floor: 19, colour: 15, period: CAVE_DRIPS.period, phase: CAVE_DRIPS.phases[i] ?? 0 }));
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
/* (The pit's own lava, woken by the moon rock, is gone: Chris, 2026-11-26, two lava flows "seems really weird", the right one "doesn't have any purpose". One lava, the basin's, the clock across the
 * ledges; the pit's dead end is a magma blob bobbing beside the rope instead.) */
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
/**
 * The astronomer on the big dome's catwalk, his feet on it (floor 11): he paces it with his star chart from short of the ladder's head (col 15) to under the drawn-up ladder (col 25), so the catwalk's
 * coin and the step off the ladder are timed to his turn.
 */
export const ASTRONOMER_AT = { col: 18, row: 9 } as const;
/**
 * Where the astronomer's gate gives way, seen (data.ts, a room effect with `at`): coming up the dome's ladder onto the catwalk (or along the ridge under it) with the moon rock, he takes it, turns and walks
 * off east into the dome to look at it, and lets the ladder down; kept from then on (saved).
 */
export const DOME_GATE = { col0: 14, row0: 8, col1: 26, row1: 15 } as const;
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
/** The sunset along the top: the sun going down into the sea, Diamond Head on the horizon to the east, the next room's mountain (its high rim at the left, as Waikiki sees it), an outrigger out on the evening sea. */
const LUAU_HEAD_RIDGE = ridge([[11, 4], [13, 2], [15, 2], [16, 3], [20, 3], [22, 4]]);
const inLuauHead = (c: number, r: number): boolean => c >= 12 && c <= 21 && r < HORIZON && r >= LUAU_HEAD_RIDGE(c);
const LUAU_SUN = ['pacSun', 4, HORIZON - 1] as const;
const LUAU_CANOE = ['pacOutrigger', 24, HORIZON - 1] as const;
const LUAU_KEEP: readonly Cell[] = [...LUAU_COINS, ...under(LUAU_SUN), ...under(LUAU_CANOE)];

/**
 * BOARD MEETING (Chris, 2026-11-26, LEI OF THE LAND: "there should be a room to the left, because otherwise it just doesn't really make sense to go that way"): the bonus room west of the luau, Waikiki's beach
 * at sunset under the Royal Hawaiian's pink wall, the beach boys' surfboard rack and the outrigger canoes on theirs. Two beach boys carry their boards along the sand at their own speeds, crossing the way in
 * and each other; the rack is the climb, from their crate by the wall up five shelves in a zig-zag with a volleyball bouncing in the gap they share, its coin on the top board; another on the canoe rack (a jump
 * east off the second shelf), one over the beach boys' crossing.
 * In from the luau along the sand (east edge, floor 19); the way back is the same. Its foot is solid (THE CARGO SHIP below has open sky in its top row).
 */
const paintBeach = (g: Grid): void => {
  g.box(0, 19, 31, 19, 'A'); // the sand, on east under the luau's lawn
  g.box(0, 3, 1, 18, 'H'); // the Royal Hawaiian's pink wall closing the beach at the west
  g.box(2, 17, 3, 18, 'C'); // the beach boys' crate by the wall, the step up onto the rack
  for (const [c, row] of [[5, 15], [11, 13], [5, 11], [11, 9], [5, 7]] as const) g.box(c, row, c + 3, row, 'S'); // the surfboard rack's shelves, zig-zag up (the gap between them, cols 9-10, is the ball's)
  g.box(18, 13, 23, 13, 'S'); // the canoe rack, a jump east off the rack's second shelf
};
const BEACH_COINS = [[6, 5], [23, 11], [21, 16]] as const;
const BEACH_PIECES = [['pacSurfboards', 5, 13], ['pacSurfboards', 11, 7], ['pacOutrigger', 19, 11], ['pacPalm', 27, 13], ['pacSnorkelShop', 13, 15]] as const;
const BEACH_KEEP: readonly Cell[] = [...BEACH_COINS, ...BEACH_PIECES.flatMap(under)];

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
  g.box(30, 0, 31, 5, 'K'); // the cone's rock beside the stair (no room east of the summit: the stair is the way on)
  g.box(26, 19, 28, 19, 'C'); // the tunnel's concrete floor under its stairs (a climb down them stops there)
};
/** On the old bunker's ledge off the stairs (a pocket off the route), in the tunnel's niche beside its stairs (inside the structure). */
const DIAMOND_COINS = [[1, 5], [29, 11]] as const;
/** The cone's skyline (its slope rising east to the shoulder over the tunnel). */
const DIAMOND_RIDGE = ridge([[0, 12], [3, 11], [5, 9], [8, 9], [10, 7], [13, 6], [16, 4], [18, 4], [21, 2], [25, 1], [28, 0], [31, 0]]);
/** Across the crater, behind the near slope: the far rim's jagged green crest (the crater's bowl between the two, the way the trail climbs its inner wall). */
const DIAMOND_FAR_RIM = ridge([[0, 4], [2, 3], [4, 4], [6, 3], [8, 5], [10, 5], [12, 7], [14, 8], [16, 10]]);
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
/** Along the top only: the sky, the far rim's green crest across the crater, the near slope's brown tuff rising to the shoulder; black behind the trail below (no rock or scrub painted down the cone). */
const diamondScenery: Placed[] = [
  ...fillWhere(paintDiamond, DIAMOND_KEEP, (c, r) => r <= HORIZON && r < DIAMOND_RIDGE(c) && r < DIAMOND_FAR_RIM(c) && !inTunnel(c, r), 'pacSkyDay'),
  ...fillWhere(paintDiamond, DIAMOND_KEEP, (c, r) => r <= HORIZON && r < DIAMOND_RIDGE(c) && r >= DIAMOND_FAR_RIM(c), 'pacJungleFill'),
  ...fillWhere(paintDiamond, DIAMOND_KEEP, (c, r) => r <= HORIZON && r >= DIAMOND_RIDGE(c) && !inTunnel(c, r), 'pacTuffFill'),
];

/**
 * THE LOOKOUT, the summit on the row above: the Fire Control Station (1910) in section on the rim, its spiral stair up from the climb, its observation slits, the summit bunker on its roof; out of its slit
 * onto the walk along the rim to the lookout's railing, where a tourist left his snorkel. The payoff is the view: Waikiki's beach and hotels and Honolulu under the Ko'olau mountains far off along the shore,
 * the sea, and the cone's outer flank falling to the coast, Diamond Head Lighthouse at its foot.
 */
const paintLookout = (g: Grid): void => {
  g.box(7, 9, 22, 9, 'T').box(7, 6, 7, 8, 'C'); // the walk along the rim, the railing's post at the lookout
  g.box(8, 10, 22, 10, 'K').box(14, 11, 22, 11, 'K').box(19, 12, 22, 19, 'K'); // the rim's crest under it, the summit's rock under the station
  g.box(31, 1, 31, 3, 'C'); // the parapet at the roof's east end (nothing beyond the summit)
  g.box(23, 4, 31, 4, 'C').box(23, 5, 23, 19, 'C').box(31, 5, 31, 19, 'C').clear(23, 6, 23, 8); // the Fire Control Station: its roof slab, its walls, the slit out onto the rim
  g.box(23, 12, 23, 12, 'W').box(23, 16, 23, 16, 'W').box(31, 7, 31, 7, 'W').box(31, 12, 31, 12, 'W'); // its observation slits
  g.box(24, 9, 27, 9, 'C').box(24, 15, 27, 15, 'C'); // its upper floor and the landing half way up
  g.box(24, 19, 27, 19, 'C').box(30, 19, 30, 19, 'C'); // its floor, open round the stair (cols 28-29; the cone's rock under col 30)
  g.box(29, 5, 29, 19, 'S'); // the spiral stair, up from the climb
};
/** On the station's landing half way up its stair (inside the structure), and on the rim walk under the tern's dive (timed). */
const LOOKOUT_COINS = [[24, 13], [16, 7]] as const;
const SNORKEL_AT = { col: 9, row: 7 } as const;
/**
 * The view down from the rim (Chris: The Lookout should read as looking down): the horizon high (row 1), the Ko'olau's green mountains along it, the sea spread out below it, and far down at the foot of
 * the view Waikiki's hotels, small, Diamond Head Lighthouse on the coast; the cone's outer flank falling away from under the walk, black against the sea (no rock or scrub painted over it).
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
  ...fillWhere(paintLookout, LOOKOUT_KEEP, (c, r) => c <= 18 && r >= KOOLAU(c) && r <= LOOKOUT_HORIZON + 1, 'pacJungleFill'),
  ...fillWhere(paintLookout, LOOKOUT_KEEP, (c, r) => !inStation(c, r) && r > LOOKOUT_HORIZON + (c <= 18 ? 1 : 0) && r < LOOKOUT_SHORE && r < LOOKOUT_FLANK(c), 'pacSeaFlat'),
  ...fillWhere(paintLookout, LOOKOUT_KEEP, (c, r) => r === LOOKOUT_SHORE && r < LOOKOUT_FLANK(c), 'pacBeachFill'), // Waikiki's sand under the hotels, far below (Chris: "what exactly am I looking out at?")
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

/** The reef's wall across the swim's join (CHANNEL SURFING's east edge, LAND AHOY's west): two ways east, along the surface over it or low under it. */
const REEF_WALL = { top: SURFACE + 2, bottom: 15 } as const;
const paintClam = (g: Grid): void => {
  g.box(0, 19, 31, 19, 'K'); // the sandy bottom
  g.box(0, 3, 0, 18, 'B').box(1, 5, 1, 18, 'B').box(2, SURFACE + 1, 2, 18, 'B'); // Koko Head's lava wall rising out of the sea at the west edge: Oahu behind him, no way back (Chris: "looks like I'm supposed to swim to the left and I can't")
  g.box(7, 12, 13, 14, 'R').box(7, 15, 7, 16, 'R').box(13, 15, 13, 16, 'R'); // the reef's arch, the way under it along the bottom (rows 17-18)
  g.box(3, 17, 4, 18, 'C'); // coral
  g.box(19, 13, 23, 18, 'R').box(20, 11, 22, 12, 'R'); // the tall coral head (its top three rows under the surface, a lane over it)
  g.box(31, REEF_WALL.top, 31, REEF_WALL.bottom, 'R'); // the reef's wall at the east edge: on along the surface or low under it
};
const CLAM_COINS = [[10, 17]] as const;
/** Oahu falling behind: its east end (Koko Head's crater and Makapu'u under the Ko'olau's last ridge) far off at the west edge, sinking toward the water. */
const OAHU_BEHIND = span(0, 6, ridge([[0, 3], [1, 3], [2, 4], [3, 4], [4, 5], [5, 6], [6, 7]]));
/**
 * Molokai alongside, the near island, long across the horizon: its low west end, then the north shore's sea cliffs (the world's tallest) rising sheer out of the sea to the long flat top of the island,
 * notched by the deep valleys of Pelekunu and Wailau; its face fluted, the waterfalls threads down it.
 */
const MOLOKAI = span(7, 31, ridge([[7, 7], [9, 6], [10, 6], [11, 3], [20, 3], [21, 5], [22, 5], [23, 3], [26, 3], [27, 5], [28, 5], [29, 3], [31, 3]]));
/** Kalaupapa: the flat peninsula low on the water at the cliffs' foot, the little cone of Kauhako crater on it. */
const KALAUPAPA = span(11, 19, ridge([[11, 6], [13, 6], [14, 5], [15, 5], [16, 6], [19, 6]]));
const CLAM_PIECES = [['pacCliffFall', 12, 3], ['pacCliffFall', 18, 3], ['pacCliffFall', 25, 4], ['pacCliffFall', 30, 3], ['pacKelp', 16, 16], ['pacSeaFan', 27, 16], ['pacBubbles', 25, 10], ['pacSeaFan', 5, 16]] as const;
const CLAM_KEEP: readonly Cell[] = [...CLAM_COINS, ...CLAM_PIECES.flatMap(under)];
const clamScenery: Placed[] = horizon(paintClam, CLAM_KEEP, SURFACE, [
  { top: KALAUPAPA, piece: 'pacScrubFill' }, { top: MOLOKAI, piece: 'pacCliffFill' }, { top: OAHU_BEHIND, piece: FAR },
], { purple: 0, red: 3, orange: 5, gold: SURFACE - 1 });

/** The mooring rope down from Lahaina's quay through the surface (both rooms' column: it hangs in the gap in the quay). */
export const MOORING_COL = 19;
const paintKelp = (g: Grid): void => {
  g.box(0, 19, 31, 19, 'K'); // the sandy bottom (in from the west)
  g.box(0, REEF_WALL.top, 0, REEF_WALL.bottom, 'R'); // the reef's wall at the west edge (CHANNEL SURFING's): in along the surface or low
  g.box(31, SURFACE, 31, 13, 'K').box(30, 11, 30, 13, 'K'); // Maui's lava rock breaking the surface at the east edge, the sea cave's mouth under its ledge (out east, rows 14-18); the sky runs on over it
  g.box(MOORING_COL, 0, MOORING_COL, SURFACE + 2, 'L'); // the mooring rope down from Lahaina's quay through the surface
  g.box(8, 16, 10, 18, 'C').box(19, 14, 21, 18, 'C'); // coral
  g.box(24, 13, 28, 18, 'R').box(25, 11, 27, 12, 'R').clear(25, 15, 27, 18); // a coral head with a hollow under it
};
const KELP_COINS = [[13, 17]] as const;
/** Molokai behind, its sea cliffs ending at the east cape (Halawa), the flat top dropping sheer to the sea. */
const MOLOKAI_TAIL = span(0, 5, ridge([[0, 2], [2, 2], [3, 4], [4, 6], [5, 7]]));
/** Lanai, low and far off on the horizon: a long gentle whale's back. */
const LANAI = span(7, 14, ridge([[7, 7], [8, 6], [10, 5], [12, 5], [13, 6], [14, 7]]));
/** The West Maui mountains rising ahead over Lahaina, near and black against the sunset: steep, knife-edged ridges between deep valleys (Pu'u Kukui the highest). */
const WEST_MAUI = span(16, 31, ridge([[16, 7], [17, 6], [19, 5], [20, 3], [21, 4], [22, 2], [23, 3], [24, 1], [25, 2], [26, 1], [27, 3], [28, 2], [29, 4], [30, 5], [31, 5]]));
const KELP_PIECES = [['pacWhaleTail', 2, 6], ['pacKelp', 12, 16], ['pacKelp', 17, 15], ['pacKelp', 22, 16], ['pacSeaFan', 29, 16], ['pacBubbles', 4, 12], ['pacBubbles', 29, 9]] as const;
const KELP_KEEP: readonly Cell[] = [...KELP_COINS, ...KELP_PIECES.flatMap(under)];
const kelpScenery: Placed[] = horizon(paintKelp, KELP_KEEP, SURFACE, [
  { top: MOLOKAI_TAIL, piece: 'pacCliffFill' }, { top: LANAI, piece: FAR }, { top: WEST_MAUI, piece: null },
], { purple: 0, red: 3, orange: 5, gold: SURFACE - 1 });

/**
 * WHALE OF A TIME's harbour (Chris, 2026-11-26: "nothing to do with the whale"): shallows over a stony bed by the quay (he wades them: water never drowns a snorkeller), the mooring's gap open to the sea below,
 * and a humpback breaches out of the shallows between the quay's stub and the stone landing on its own clock, its spout the tell (`WHALE_BREACH`, `SPOUT_PULSES`): the crossing west to the brig (a jump, or a
 * wade through the gap) is timed to it.
 */
export const HARBOUR = { landing: [10, 12], gap: [13, 15], stub: [16, 17], quay: 21, spout: { col: 13, row: 15, rows: 3 } } as const;
const paintWhale = (g: Grid): void => {
  g.box(3, 15, 9, 17, 'H').box(4, 14, 9, 14, 'D'); // the old brig in the harbour water, its deck
  g.box(1, 19, HARBOUR.gap[1], 19, 'B'); // the harbour's bed under the shallows
  g.box(10, 16, 11, 17, 'C').box(HARBOUR.landing[0], 18, HARBOUR.landing[1], 19, 'Q'); // the crates on the stone landing
  g.box(HARBOUR.stub[0], 18, HARBOUR.stub[1], 19, 'Q').box(HARBOUR.quay, 18, 31, 19, 'Q'); // the quay's stub and the quay, the mooring's gap between them
  g.box(5, 6, 5, 13, 'R').box(6, 7, 12, 7, 'D'); // the mast's rope and the spar
  g.box(MOORING_COL, 12, MOORING_COL, 19, 'R'); // the mooring rope, down into LAND AHOY
  g.box(30, 2, 31, 15, 'Q'); // the fort's wall at the quay's end (the road goes on under it)
  g.box(0, 2, 0, 19, 'Q'); // the harbour's sea wall on the west (Waikiki's cliff the other side)
};
/**
 * The humpback (a leap: a roller on sprite 1 with its own three pictures, `WHALE_BLOCKS` in the leap's blocks while Lahaina is loaded, and a full block's box): out of the harbour's gap, up over it to row 9 and
 * back in, every 200 frames; its spout blows white over the water for the 40 frames before (a harmless pulse). Wait on the stub or the landing for the spout, let it breach, then jump.
 */
export const WHALE_BREACH: RollerSpec = leap(PAC.lahaina, 1, 12.5, 9.5, 200, 60, 15, { width: 3, surface: 16.5, frames: LEAP_POINTERS, size: { w: 24, h: 21 } });
export const SPOUT_PULSES: readonly PulseSpec[] = [{
  room: PAC.lahaina, col: HARBOUR.spout.col, row: HARBOUR.spout.row, cols: 1, rows: HARBOUR.spout.rows, period: WHALE_BREACH.every, start: WHALE_BREACH.start - 40, warn: 40, live: 0,
  idle: 0, warnCode: codeOf(WHALE_PALETTE, 'V'), liveCode: 0, spent: 0,
}];
export const WHALE_ROOM_BLOCKS: RoomBlocks = { rooms: [PAC.lahaina], blocks: LEAP_POINTERS.map((ptr, i) => ({ ptr, block: WHALE_BLOCKS[i] ?? new Uint8Array(63) })) };

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
/** On the cinder cliff's ledge (up the steps), and in the lagoon where the wave comes from (at a hazard's edge: in and out between waves). */
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
/** The channel's horizon, high in the room: the open sea from it down to the swell, the islands standing on it. */
const SHELL_HORIZON = 13;
/** Behind, Maui: Haleakala's long, gentle shield over the cliff, near and black against the sunset, falling to the sea toward the channel. */
const HALEAKALA = span(2, 15, ridge([[2, 3], [5, 3], [8, 5], [11, 8], [14, 11], [15, 12]]));
/** Ahead, the Big Island rising far off over the channel: Kohala low at its north end, Mauna Kea's bumpy crown of cinder cones under its snow, Mauna Loa's smooth broad dome. */
const KOHALA = span(16, 19, ridge([[16, 11], [17, 10], [19, 9]]));
const MAUNA_KEA = span(19, 26, ridge([[19, 10], [20, 7], [21, 5], [22, 4], [23, 5], [24, 4], [25, 6], [26, 9]]));
const KEA_SNOW = span(21, 24, MAUNA_KEA);
const MAUNA_LOA = span(27, 31, ridge([[26, 9], [27, 7], [29, 6], [31, 6]]));
const FISH_PIECES = [['pacLavaRocks', 29, 18]] as const;
const FISH_KEEP: readonly Cell[] = [...FISH_COINS, ...cellsOf(FISH_MUSUBI_AT.col, FISH_MUSUBI_AT.row, 2, 2), ...FISH_PIECES.flatMap(under)];
const fishScenery: Placed[] = horizon(paintFish, FISH_KEEP, SHELL_HORIZON, [
  { top: KEA_SNOW, piece: 'pacSnowCap', rows: 1 },
  { top: KOHALA, piece: FAR }, { top: MAUNA_KEA, piece: FAR }, { top: MAUNA_LOA, piece: FAR }, { top: HALEAKALA, piece: null },
], { purple: 1, red: 5, orange: 9, gold: SHELL_HORIZON - 1 });

const paintKona = (g: Grid): void => {
  g.box(0, 19, 5, 19, 'K').box(9, 19, 14, 19, 'K').box(18, 19, 31, 19, 'K'); // the black sand, the lava tube's mouth (cols 6-8), the tide pool's (cols 15-17)
  g.box(15, 19, 17, 19, 'B'); // the tide pool's rocky bed under a hand's depth of water (the water a backdrop: he wades it; Chris: "why would I drown in that little bit of water")
  g.box(7, 14, 7, 19, 'R'); // the rope down the lava tube to Mauna Loa (hanging from the tube's lip into the hole: it went on up into the sky, and up it led to Mauna Kea's foot with no rope there)
  g.box(20, 17, 22, 18, 'B').box(23, 15, 25, 18, 'B'); // the lava rock stepping up from the beach
  g.box(28, 0, 28, 17, 'R'); // the rope up the mountain's flank to Mauna Kea (on up into the room above, where it goes on)
};
const KONA_COINS = [[24, 13], [16, 16]] as const;
/** The tide pool's water over its bed, a backdrop he wades through. */
const KONA_POOL = { col0: 15, col1: 17, row: 18 } as const;

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

/**
 * ON THIN ICE (101, [1,21]), the bonus room west of the summit (Chris: the summit "looks like I should be able to walk left and right"; the edges plan's $65): Lake Waiau among the cinder cones under the
 * summit's night, frozen over. In along the ridge from the summit (floor 16); the east cone's steps (a coin on its top), across the lake's ice (it cracks under a foot that waits, a coin over its middle)
 * to the west cone's steps (a coin on its top), and back. The cone's flank closes the west (nothing beyond: the summit plateau falls away); the floor is solid over KAIHALULU's sky.
 */
const paintWaiau = (g: Grid): void => {
  g.box(0, 0, 0, 19, 'C'); // the west cone's flank closing the plateau
  g.box(1, 16, 9, 19, 'C').box(20, 16, 31, 19, 'C').box(1, 16, 9, 16, 'N').box(20, 16, 31, 16, 'N'); // the cinder ground either side of the lake, its snow
  g.box(10, 18, 19, 18, 'W').box(10, 19, 19, 19, 'C'); // the icy water and the lake's bed
  g.box(WAIAU_ICE.col, WAIAU_ICE.row, WAIAU_ICE.col + WAIAU_ICE.cols - 1, WAIAU_ICE.row, 'I'); // the ice (cracks.ts redraws it as it cracks)
  g.box(2, 14, 8, 15, 'C').box(3, 12, 7, 13, 'C').box(4, 10, 6, 11, 'C').box(2, 14, 8, 14, 'N').box(4, 10, 6, 10, 'N'); // the west cone, a step every two rows, snow on its shoulder and top
  g.box(21, 14, 27, 15, 'C').box(22, 12, 26, 13, 'C').box(23, 10, 25, 11, 'C').box(21, 14, 27, 14, 'N').box(23, 10, 25, 10, 'N'); // the east cone
};
/** On each cone's top (tops a climb), and over the middle of the ice (the crossing's own move). */
const WAIAU_COINS = [[5, 8], [24, 8], [14, 14]] as const;

/**
 * SEEING STARS (102, [1,23]), the bonus room east of the summit (the edges plan's $66): the telescope ridge, Keck's twin domes on their catwalks and Subaru's small dome between them under the gantry. In
 * along the ridge from the summit (floor 16); up either dome's ladder to its catwalk (a coin at each catwalk's far end), across the gantry between them through Subaru's guide-star laser, or along the ridge
 * under it. The ridge ends at a cinder cliff (east is the flight's gap: nothing there); the floor is solid over AKAKA FALLS' sky.
 */
const paintRidge = (g: Grid): void => {
  g.box(0, 16, 31, 19, 'C').box(30, 0, 31, 15, 'C'); // the ridge, and the cliff at its east end
  g.box(2, 11, 10, 11, 'G').box(11, 11, 11, 15, 'L'); // Keck I's catwalk and its ladder
  g.box(19, 11, 27, 11, 'G').box(18, 11, 18, 15, 'L'); // Keck II's catwalk and its ladder
  g.box(13, LASER.gantry, 17, LASER.gantry, 'G'); // the gantry between them (the laser up through it at col 15)
};
const RIDGE_COINS = [[2, 9], [27, 9]] as const;

const paintFalls = (g: Grid): void => {
  g.box(0, 0, 1, 5, 'B').box(0, 8, 27, 8, 'T').box(0, 9, 1, 16, 'B'); // the cliff over the high trail's way in from Mauna Kea (rows 6-7); the high trail along the gorge's top (floor 8); the gorge's west wall
  g.box(2, 9, 4, 9, 'B').box(16, 9, 17, 9, 'B'); // the rock under the trail's edge (the falls pour out under it at cols 18-20)
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

/**
 * COFFEE BREAK, redesigned (Chris, 2026-11-26: "needs to be redesigned. It just doesn't really make sense. It looks like I should be able to walk to the room to the right, but there's no way based on the map"):
 * a Kona coffee farm on Mauna Loa's flank, its edges the map's. West, the way in from the crater's rim (rows 3-4) onto the top terrace; down the terraces between the coffee rows to the hoshidana, the
 * farm's drying deck on its posts (the coffee drying on it: the sack), and down off it to the farm road under it, which runs east to the lava-rock wall at the farm's end (east is the flight's gap: nothing
 * there, and the wall says so) and the rope up to Hilo by it. Stone steps up each bank make it a way both ways.
 */
const paintCoffee = (g: Grid): void => {
  g.box(0, 5, 9, 5, 'T').box(0, 6, 9, 19, 'S'); // the top terrace, in from Mauna Loa's rim
  g.box(10, 9, 16, 9, 'T').box(10, 10, 16, 19, 'S'); // the second
  g.box(17, 13, 24, 13, 'D'); // the hoshidana's deck on its posts (the farm road runs on under it)
  g.box(11, 7, 12, 7, 'T').box(17, 11, 18, 11, 'T').box(27, 17, 28, 17, 'T').box(25, 15, 26, 15, 'T'); // the stone steps up each bank and up to the deck from the road (the way back up from Hilo)
  g.box(17, 19, 30, 19, 'P'); // the farm road along the foot of the terraces, under the deck
  g.box(31, 0, 31, 19, 'B'); // the farm's end: the lava-rock wall
  g.box(29, 0, 29, 18, 'R'); // the rope up to Hilo
  g.box(0, 0, 0, 2, 'B'); // (the crater's rim at the west edge, over the way in)
};
const COFFEE_COINS = [[5, 3], [13, 7]] as const;
/** The deck's posts down to the road (a backdrop he walks between). */
const COFFEE_POSTS = [18, 23].flatMap((col) => fillCells(paintCoffee, [], [col, 14, col, 18], 'pacPillar'));

const paintHilo = (g: Grid): void => {
  g.box(0, 19, 27, 19, 'P').box(31, 19, 31, 19, 'P'); // the street along the bayfront to the airfield, the rope's opening (cols 28-30)
  g.box(29, 0, 29, 19, 'R'); // the rope from Akaka Falls' high trail, past the street, down to the coffee farm
  g.box(2, 12, 14, 12, 'J'); // the old wooden storefronts' roofs
  g.box(9, 0, 9, 11, 'R').box(16, 11, 16, 18, 'R'); // the rope up from the roofs to the falls' low lane, and the rope up to the roofs from the street
  g.box(31, 0, 31, 18, 'H'); // the airfield's hangar wall at the east edge, over the street's end (east is the flight's gap: nothing there; a jump off the long rope's head or out of the falls' way down meets it)
};
const HILO_COINS = [[8, 10], [17, 17]] as const;
/** Kamehameha Avenue's old wooden storefronts under their roofs, side by side along the bayfront (a backdrop he walks past). */
const storefronts: Placed[] = [2, 5, 8, 11].map((col) => ['pacStorefront', col, 13] as const);

// ---- the islands' scenery (Chris, 2026-11-25: "I really want you to think about representing these islands properly"): each room's backdrop, laid round its pieces ----
const keepOf = (cells: readonly Cell[], pieces: readonly (readonly [WorldDecor, number, number])[]): Cell[] => [...cells, ...pieces.flatMap(under)];

/** Waikiki on a clear day: the sky, and on the horizon Diamond Head's brown tuff cone standing on the sea at the bay's end (its long slope back, its steep face to the sea); the surf on the beach below. */
const WAIKIKI_COINS = [[5, 13], [25, 17]] as const;
const WAIKIKI_PIECES = [['pacSnorkelShop', 3, 15], ['pacPalm', 21, 13], ['pacSurfboards', 11, 17]] as const;
const WAIKIKI_KEEP = keepOf(WAIKIKI_COINS, WAIKIKI_PIECES);
const WAIKIKI_HEAD = ridge([[21, 5], [23, 4], [26, 3], [28, 2], [29, 2], [30, 3]]);
const WAIKIKI_SEA = HORIZON + 1;
const waikikiScenery: Placed[] = [
  ...fillWhere(paintWaikiki, WAIKIKI_KEEP, (c, r) => (c < 21 ? r < WAIKIKI_SEA + 1 : r < WAIKIKI_HEAD(c)), 'pacSkyDay'),
  ...fillWhere(paintWaikiki, WAIKIKI_KEEP, (c, r) => c >= 21 && r >= WAIKIKI_HEAD(c) && r < WAIKIKI_SEA, 'pacTuffFill'),
  ...fillWhere(paintWaikiki, WAIKIKI_KEEP, (c, r) => c >= 21 && r === WAIKIKI_SEA, 'pacSeaWave'),
];

/** Lahaina in the evening: along the top the sunset over the channel, the whale's tail breaching out on it, West Maui's green mountains rising behind the town; below, the brig under sail, Front Street's old storefronts and the courthouse's great banyan on the quay. */
const LAHAINA_COINS = [[9, 5]] as const;
const LAHAINA_PIECES = [['pacStorefront', 21, 12], ['pacBanyan', 25, 14], ['pacWhaleTail', 2, HORIZON - 1], ['pacSail', 7, 8]] as const;
const LAHAINA_KEEP = keepOf([...LAHAINA_COINS, ...cellsOf(6, 12, 2, 2)], LAHAINA_PIECES);
const LAHAINA_MOUNTAINS = ridge([[14, 5], [16, 4], [19, 3], [22, 2], [24, 3], [26, 2], [29, 3]]);
const lahainaScenery: Placed[] = [
  ...sunset(paintWhale, LAHAINA_KEEP, { purple: 0, red: 1, orange: 3, gold: HORIZON - 1, sea: HORIZON }, (c, r) => c < 14 || r < LAHAINA_MOUNTAINS(c)),
  ...fillWhere(paintWhale, LAHAINA_KEEP, (c, r) => c >= 14 && r >= LAHAINA_MOUNTAINS(c) && r <= HORIZON, 'pacJungleFill'),
  ...fillWhere(paintWhale, LAHAINA_KEEP, (_c, r) => r === 18, 'pacSeaWave'), ...fillWhere(paintWhale, LAHAINA_KEEP, (_c, r) => r === 19, 'pacSeaFlat'), // the shallows, and the sea below the mooring's gap
];

/** The Road to Hana cut into the jungle cliff: along the top the sky and the rainforest's tree line along the cliff top, the waterfalls leaving it; black behind the tiers (no rock painted down the room). */
const ROAD_COINS = [[27, 15], [16, 5]] as const;
const ROAD_PIECES = [['pacWaterfall', 6, 2], ['pacWaterfall', 20, 2], ['pacBambooClump', 25, 4], ['pacBambooClump', 7, 4],
  ['pacLaneSign', 6, 16], ['pacLaneSign', 20, 16], ['pacLaneSign', 10, 11], ['pacLaneSign', 24, 11], ['pacLaneSign', 9, 6], ['pacLaneSign', 23, 6]] as const;
const ROAD_TREES = 2;
const roadScenery: Placed[] = [
  ...fillWhere(paintRoad, keepOf(ROAD_COINS, ROAD_PIECES), (_c, r) => r < ROAD_TREES, 'pacSkyDay'),
  ...fillWhere(paintRoad, keepOf(ROAD_COINS, ROAD_PIECES), (_c, r) => r === ROAD_TREES, 'pacJungleFill'),
];

/**
 * Kaihalulu: Ka'uiki Head's crumbling red cinder cliffs rising round the cove along the top, and down the cove's east side to the lava wall, the cinder cave in them over the ledge the steps climb to;
 * ironwoods on the headland, the turquoise lagoon inside its natural wall of black lava rock. Black over the sand (the cliff is not painted down the room).
 */
/** (No cave mouth in the cliff: Chris could not tell what the black hole meant; the ledge with its coin stands on the cinder face.) */
const HANA_PIECES = [['pacBreadStand', 2, 5], ['pacIronwood', 9, 5], ['pacIronwood', 11, 5], ['pacLavaRocks', 16, 17]] as const;
const HANA_CLIFF = ridge([[15, 8], [18, 6], [22, 5], [26, 3], [30, 1]]);
/** The cliff's face down the cove's east side, round the cave, to the lava wall. */
const HANA_FACE = 26;
const hanaKeep = keepOf(HANA_COINS, HANA_PIECES); // the wave's cells too: a pulse's idle cell shows the backdrop behind it
const hanaScenery: Placed[] = [
  ...fillWhere(paintHana, hanaKeep, (c, r) => (c < 15 ? r < 8 : r < HANA_CLIFF(c)), 'pacSkyDay'),
  ...fillWhere(paintHana, hanaKeep, (c, r) => c >= 15 && r >= HANA_CLIFF(c) && (r <= HORIZON || (c >= HANA_FACE && r < 14)), 'pacCinderFill'),
  ...fillWhere(paintHana, hanaKeep, (c, r) => c >= 26 && r >= 14, 'pacLagoonFill'),
];

/**
 * Kona at sunset, along the top: the sea on the west horizon (the channel he crossed), the black lava rising inland against the sky, Mauna Kea's snow along the skyline where the rope climbs. No signs
 * (Chris: "the room names alone suffice"): the fork reads from the land, the rope up the slope toward the snow (the top way), the rope down into the lava tube's hole (the bottom way).
 */
const KONA_PIECES = [['pacLavaRocks', 11, 18], ['pacPalmSmall', 12, 15], ['pacLavaRocks', 29, 18], ['pacLavaRocks', 2, 18]] as const;
const KONA_KEEP = keepOf(KONA_COINS, KONA_PIECES);
const KONA_SLOPE = ridge([[0, 6], [11, 6], [14, 5], [17, 4], [20, 3], [24, 2], [27, 1], [31, 1]]);
const konaScenery: Placed[] = [
  ...sunset(paintKona, KONA_KEEP, { purple: 0, red: 1, orange: 3, gold: HORIZON - 1, sea: HORIZON }, (c, r) => r < KONA_SLOPE(c)),
  ...fillWhere(paintKona, KONA_KEEP, (c, r) => c >= 23 && r === KONA_SLOPE(c), 'pacSnowCap'),
  ...fillWhere(paintKona, KONA_KEEP, (c, r) => r === KONA_POOL.row && c >= KONA_POOL.col0 && c <= KONA_POOL.col1, 'pacSeaWave'),
];

/**
 * Mauna Kea's climb out of the clouds (above the tree line the summit road is cut through black lava, the red cinder cones rising round it): along the top the dusk over the cones, each a separate red hump; black behind the switchbacks; the sea of cloud under the first one.
 */
const KEA_CONES = ridge([[2, 5], [3, 4], [5, 3], [7, 4], [9, 5], [11, 4], [13, 2], [15, 2], [17, 3], [19, 4], [21, 5], [23, 3], [25, 3], [27, 4], [29, 5]]);
const KEA_CLOUDS = 17;
const keaScenery: Placed[] = [
  ...sunset(paintKea, KEA_COINS, { purple: 0, red: 1, orange: 3, gold: HORIZON }, (c, r) => r < KEA_CONES(c)),
  ...fillWhere(paintKea, KEA_COINS, (c, r) => r >= KEA_CONES(c) && r <= HORIZON, 'pacCinderFill'),
  ...fillWhere(paintKea, KEA_COINS, (_c, r) => r >= KEA_CLOUDS, 'pacCloudFill'),
];

/** The summit over the cloud tops: the sea of cloud on the horizon behind the ridge. */
const SUMMIT_PIECES = [['pacDomeBig', 17, 6], ['pacDomeSmall', 9, 13], ['pacDomeSmall', 28, 13], ['pacCairn', 1, 12]] as const;
const summitScenery: Placed[] = fillWhere(paintSummit, keepOf(SUMMIT_COINS, SUMMIT_PIECES), (_c, r) => r >= 14, 'pacCloudFill');
/** The summit's night on either side: its stars, the sea of cloud on the horizon behind the cones and the domes. */
const WAIAU_PIECES = [['jpStars', 3, 1], ['jpStars', 14, 3], ['jpStars', 24, 0], ['jpStars', 28, 4]] as const;
const waiauScenery: Placed[] = fillWhere(paintWaiau, keepOf(WAIAU_COINS, WAIAU_PIECES), (_c, r) => r >= 14 && r <= 15, 'pacCloudFill');
const RIDGE_PIECES = [['pacDomeBig', 3, 6], ['pacDomeBig', 20, 6], ['pacDomeSmall', 14, 13], ['jpStars', 9, 1], ['jpStars', 22, 0], ['jpStars', 26, 3]] as const;
const ridgeScenery: Placed[] = fillWhere(paintRidge, keepOf([...RIDGE_COINS, ...cellsOf(LASER.col, 0, 1, LASER.domeTop + 1)], RIDGE_PIECES), (_c, r) => r >= 14 && r <= 15, 'pacCloudFill');

/**
 * Akaka Falls' gorge (a single 442-foot plunge into a deep gorge): the sky over the rainforest's tree line along the top, the forest dark under it along the high trail, and under the trail the gorge, black,
 * the falls one tall white column from under the trail's lip to the splash on the pool, the whole height of it. Calm: no rock painted down the gorge, the detail in the falls.
 */
const FALLS_PIECES = [['pacPlunge', 18, 9], ['pacBambooClump', 2, 4], ['pacBambooClump', 4, 15], ['pacBambooClump', 12, 4], ['pacBambooClump', 24, 15]] as const;
const FALLS_KEEP = keepOf(FALLS_COINS, FALLS_PIECES);
const fallsScenery: Placed[] = [
  ...fillWhere(paintFalls, FALLS_KEEP, (_c, r) => r <= 3, 'pacSkyDay'),
  ...fillWhere(paintFalls, FALLS_KEEP, (_c, r) => r === 4, 'pacJungleFill'),
];

/**
 * Mauna Loa's summit caldera, Moku'aweoweo, at dusk, along the top: Mauna Kea far off across the saddle on the sky over the rim (its snow on top; where the summit way goes), the top of the caldera's
 * far wall of stacked lava flows (dark brown fluted rock, the lava lake's red glow along its foot); black down in the crater, round the basin (dark until the lava rises in it).
 */
const LOA_WALL = ridge([[2, 4], [6, 4], [9, 5], [13, 4], [17, 5], [21, 4], [25, 5], [29, 4]]);
/** Mauna Kea, far off to the north over the rim: a long, gentle silhouette, black against the dusk, its summit's snow. */
const LOA_KEA = ridge([[3, 3], [5, 2], [7, 1], [9, 1], [11, 1], [13, 2], [15, 3], [16, 4]]);
const inLoaKea = (c: number, r: number): boolean => c >= 3 && c <= 16 && r >= LOA_KEA(c) && r < LOA_WALL(c);
const loaSnow = (c: number, r: number): boolean => r === LOA_KEA(c) && c >= 7 && c <= 11;
const LOA_PIECES = [['pacLavaRocks', 3, 18]] as const;
const LOA_KEEP = keepOf([...LOA_COINS, ...cellsOf(MOON_ROCK_AT.col, MOON_ROCK_AT.row, 2, 2), ...cellsOf(VENT.col, VENT.row, 2, 2)], LOA_PIECES);
const loaScenery: Placed[] = [
  ...sunset(paintLoa, LOA_KEEP, { purple: 0, red: 1, orange: 2, gold: 3 }, (c, r) => r < LOA_WALL(c) && !inLoaKea(c, r)),
  ...fillWhere(paintLoa, LOA_KEEP, (c, r) => inLoaKea(c, r) && loaSnow(c, r), 'pacSnowCap'),
  ...fillWhere(paintLoa, LOA_KEEP, (c, r) => r >= LOA_WALL(c) && r <= HORIZON, 'pacTuffFill'),
  ...fillWhere(paintLoa, LOA_KEEP, (_c, r) => r === HORIZON + 1, 'duskGlow'),
];

/** The coffee farm on Mauna Loa's flank: the sky, the mountain's shoulder far behind (a far silhouette), the hillside below planted in rows of coffee along the contour, the dark path between each row and the next. */
const COFFEE_PIECES = [['pacCoffeeTree', 2, 2], ['pacCoffeeTree', 14, 6], ['pacSacks', 7, 3], ['pacSacks', 20, 17]] as const;
const COFFEE_KEEP = keepOf([...COFFEE_COINS, ...cellsOf(COFFEE_AT.col, COFFEE_AT.row, 2, 2), ...cellsOf(18, 14, 1, 5), ...cellsOf(23, 14, 1, 5)], COFFEE_PIECES);
const COFFEE_FAR = ridge([[0, 3], [8, 2], [16, 3], [24, 5], [31, 7]]);
const coffeeScenery: Placed[] = [
  ...fillWhere(paintCoffee, COFFEE_KEEP, (c, r) => r < COFFEE_FAR(c), 'pacSkyDay'),
  ...fillWhere(paintCoffee, COFFEE_KEEP, (c, r) => r >= COFFEE_FAR(c) && r < COFFEE_FAR(c) + 3, FAR),
  ...fillWhere(paintCoffee, COFFEE_KEEP, (c, r) => r >= COFFEE_FAR(c) + 3 && r < 19 && (r - COFFEE_FAR(c)) % 2 === 1, 'pacCoffeeRows'),
];

/** Hilo in the evening: the bay behind the bayfront's old storefronts, a banyan by the airfield, Mauna Kea's broad shoulder rising far behind the town (a far silhouette, its snow along the top), the wet windward forest's tree line at its foot. */
const HILO_PIECES = [['pacBanyan', 25, 15]] as const;
const HILO_KEEP = keepOf(HILO_COINS, [['skyBiplane', BIPLANE_AT.col, BIPLANE_AT.row], ...HILO_PIECES, ...storefronts]);
const HILO_KEA = ridge([[14, 9], [18, 6], [23, 4], [28, 3], [31, 4]]);
const HILO_TREES = 13;
const hiloScenery: Placed[] = [
  ...sunset(paintHilo, HILO_KEEP, { purple: 1, red: 3, orange: 5, gold: 6, sea: 8 }, (c, r) => c < 14 || r < HILO_KEA(c)),
  ...fillWhere(paintHilo, HILO_KEEP, (c, r) => c < 14 && r > 8 && r < 12, 'pacSeaFlat'),
  ...fillWhere(paintHilo, HILO_KEEP, (c, r) => c >= 24 && r === HILO_KEA(c), 'pacSnowCap'),
  ...fillWhere(paintHilo, HILO_KEEP, (c, r) => c >= 14 && r >= HILO_KEA(c) + (c >= 24 ? 1 : 0) && r < HILO_TREES, FAR),
  ...fillWhere(paintHilo, HILO_KEEP, (c, r) => c >= 14 && r === HILO_TREES, 'pacJungleFill'),
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
      { who: 'pacSurfer', col: 4, row: 17, way: 'right', speed: 2, range: 80 }, // the whole beach, fast, from the pier to the surf's edge (Chris: "much further left and right and be faster"): jumped, or the palm's foot timed to his turn
      { who: 'pacTern', col: 11, row: 11, way: 'right', speed: 1, range: 128 }, // across the palm halfway up, slow and long: the climb waits at the foot (with the surfer coming) until it has gone by
      { who: 'pacTern', col: 23, row: 8, way: 'down', speed: 2, range: 36, colour: 1 }, // diving fast onto the sand by the surf, over its coin: the walk to the water is timed between it and the surfer
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
      ...sunset(paintLuau, LUAU_KEEP, { purple: 0, red: 1, orange: 3, gold: HORIZON - 1, sea: HORIZON }, (c, r) => !inLuauHead(c, r)), LUAU_SUN,
      ...fillWhere(paintLuau, LUAU_KEEP, inLuauHead, 'pacTuffFill'), LUAU_CANOE,
      ['pacArchTop', 0, 12], ['pacArchLeg', 0, 14], ['pacArchLeg', 3, 14],
      ['pacHulaDancer', 22, 12], ['pacHulaDancer', 25, 12], ['pacHulaDancer', 30, 12], ['pacDrummer', 30, 11], ['pacDrums', 30, 13],
      ['pacFronds', 18, 12],
    ],
    creatures: [
      { who: 'pacHula', col: 3, row: 17, way: 'right', speed: 1, range: 104, colour: 10 }, // dancing the lawn between the torches, slow, from the lei's arch to the palm: the run west waits for her and the flames together
      { who: 'pacFireKnife', col: 24, row: 7, way: 'down', speed: 2, range: 32 }, // leaping over the crate step, fast, down to a man on the crate: both ways east (onto the stage, or under it) start from the crate
      { who: 'pacTiki', col: 28, row: 4, way: 'down', speed: 1, range: 56 }, // a mask floating down over the drummers' platform on the stage: the hop over it (its coin, the stage's way east) waits for it to rise
    ],
  }),

  // DIAMOND HEAD: the climb up the tuff cone (see paintDiamond). In from the luau's lawn on the walkway (floor 19); into the tunnel's lower mouth and up its lighted stairs (a coin in the niche beside them),
  // out of the upper mouth onto the switchback (floor 13) west to the steep stairs; up them to the top of the slope (floor 7: a coin on the old bunker's ledge west of them), east over the gully and up
  // onto the shoulder and the spiral stair up into THE LOOKOUT. No rockfall (Chris: Mount Fuji's idea, repetitive): the trail's own creatures, mongooses on the walkway and the switchback, a frigatebird over the gully.
  room({
    id: PAC.diamond, cell: [1, 19], sector: 88, palette: DIAMOND_PALETTE,
    paint: paintDiamond,
    coins: DIAMOND_COINS,
    decor: [...diamondScenery, ...diamondZig, ...DIAMOND_PIECES],
    creatures: [
      { who: 'jpTanuki', col: 3, row: 17, way: 'right', speed: 3, range: 48, colour: 8 }, // a mongoose darting the whole walkway, fastest, up to the tunnel's mouth: met coming in, jumped
      { who: 'jpTanuki', col: 7, row: 11, way: 'right', speed: 2, range: 48, colour: 10 }, // another along the switchback from the steep stairs' foot to short of the upper mouth (the place to wait)
      { who: 'condor', col: 14, row: 0, way: 'down', speed: 2, range: 20 }, // a frigatebird diving over the gully in the trail at the top: the jump across waits for it to climb
    ],
  }),

  // THE LOOKOUT: the summit (see paintLookout). Up the spiral stair from the climb into the Fire Control Station (a coin on its landing half way), out through its slit onto the rim and west along the walk
  // to the lookout's railing, where a tourist left his snorkel; a tern dives over the walk. Back down the same way.
  room({
    id: PAC.lookout, cell: [0, 19], sector: 89, palette: DIAMOND_PALETTE,
    paint: paintLookout,
    coins: LOOKOUT_COINS,
    item: { name: 'snorkel', col: SNORKEL_AT.col, row: SNORKEL_AT.row, sprite: PAC_SPRITE.snorkel },
    decor: [...lookoutScenery, ...LOOKOUT_PIECES],
    creatures: [
      { who: 'pacTern', col: 12, row: 0, way: 'down', speed: 1, range: 56, colour: 3 }, // two terns diving onto the rim walk on periods of their own, slow and fast: the walk out to the railing (and back) reads both
      { who: 'pacTern', col: 18, row: 2, way: 'down', speed: 2, range: 20, colour: 1 },
      { who: 'bat', col: 24, row: 11, way: 'right', speed: 1, range: 48, colour: 8 }, // a bat in the station flitting across its spiral stair between the landings: the climb waits on the landing below it
    ],
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
      { who: 'pacSharkFin', col: 4, row: 7, way: 'right', speed: 2, range: 100 }, // a shark cruising the surface the whole width, fast, under the drop in from Waikiki: the dive and the surface lane east are timed to it
      { who: 'pacTurtle', col: 24, row: 12, way: 'right', speed: 1, range: 48 }, // a turtle across the water east of the coral head, slow: the dive down to the low way east passes it
      { who: 'pacEel', col: 30, row: 16, way: 'left', speed: 2, range: 40 }, // an eel sweeping the low way out east, fast: the low lane is a gap to read
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
      { who: 'pacSharkFin', col: 1, row: 7, way: 'right', speed: 2, range: 64, colour: 15 }, // a shark along the surface from the west edge to the mooring rope, fast: in along the surface, and up the rope, timed to it
      { who: 'pacManta', col: 2, row: 12, way: 'right', speed: 1, range: 128 }, // a manta gliding across the middle, slow and long: coming in low, the rise to the rope passes it
      { who: 'pacTurtle', col: 21, row: 9, way: 'right', speed: 1, range: 64 }, // a turtle along the lane over the coral head: the way on east to the sea cave, over the head and down, passes it
    ],
  }),

  // WHALE OF A TIME: Lahaina's old whaling harbour on Maui. Up the mooring rope from the reef through its gap in the quay (col 19) onto the quay. The old brig lies in the harbour water at the left: west over
  // the gap in the water where the humpback breaches (its spout first) onto the stone landing, the crates up to the brig's deck (a Spam musubi), the mast's rope to the spar (a dead end, its coin); the quay runs
  // east past the captain under the fort's wall onto the road.
  room({
    id: PAC.lahaina, cell: [2, 19], sector: 46, palette: WHALE_PALETTE,
    paint: paintWhale,
    coins: LAHAINA_COINS,
    item: { name: 'musubi2', col: 6, row: 12, sprite: PAC_SPRITE.musubi },
    decor: [...lahainaScenery, ...LAHAINA_PIECES],
    creatures: [ // (and the humpback breaching in the harbour: WHALE_BREACH, on sprite 1)
      { who: 'andCaptain', col: 21, row: 16, way: 'right', speed: 2, range: 32 }, // an old whaling captain pacing the quay, fast, from the mooring's gap to the fort: stepping off the rope (or onto it, back) is timed to his turn
      { who: 'dove', col: 1, row: 9, way: 'right', speed: 1, range: 88, colour: 7 }, // a mynah across the brig's rigging: the climb up the mast's rope to the spar's coin waits for it
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
    creatures: [ // (and the cars, two to a bridge: BRIDGE_CARS)
      { who: 'pacCoconut', col: 26, row: 2, way: 'down', speed: 2, range: 16 }, // a coconut dropping out of the trees onto the top tier past its bridge, fast: the way out east waits for it
      { who: 'pacCoconut', col: 7, row: 0, way: 'down', speed: 1, range: 48, colour: 9 }, // another, slower, onto the top tier west of its bridge: from the bamboo on east to the bridge, under it while it is up
    ],
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
      { who: 'pacEel', col: 2, row: 10, way: 'right', speed: 2, range: 76 }, // an eel darting the cavern's whole width over the tube's roof, fast: the swim down from the pool's rope to the tube's mouth crosses it
      { who: 'pacManta', col: 3, row: 5, way: 'right', speed: 1, range: 144 }, // a manta gliding under the cavern's roof, slow and long: the rope's foot and the coin's ledge are timed to it
      { who: 'pacEel', col: 3, row: 5, way: 'down', speed: 1, range: 88, colour: 7 }, // a moray rising and sinking by the tube's mouth, across the doorway from the reef: in either way, read it

    ],
  }),

  // KAIHALULU: the road's end on Maui, Kaihalulu's red sand in its cinder cove (HANA BANANA's place). In at the left on the headland (floor 8), the banana-bread stand by the road; the bamboo rope (col 14) down
  // the cliff past the red sand (floor 18) and on down to the channel, the way on (SHELL GAME: the turtles start west of the Big Island, so the way down is at the cove's west end). Off it onto the sand, the surf
  // breaking up it from the lagoon on a timing (spray, then the white breaker, then it draws back): in between waves to the lagoon's coin; steps up the cove's side to the ledge on the cinder cliff (a coin).
  room({
    id: PAC.hana, cell: [2, 21], sector: 87, palette: HANA_PALETTE,
    paint: paintHana,
    coins: HANA_COINS,
    decor: [...hanaScenery, ...HANA_PIECES],
    creatures: [
      { who: 'pacCrab', col: 15, row: 16, way: 'right', speed: 2, range: 36, colour: 7 }, // a crab scuttling the whole red sand from the rope's foot to the lagoon, fast: off the rope onto the sand, and down past it, timed
      { who: 'condor', col: 14, row: 11, way: 'right', speed: 2, range: 60 }, // a frigatebird sweeping the cove from the rope out to the cliff: the climb down the rope (and back up) waits for it to turn
      { who: 'pigeon', col: 22, row: 5, way: 'down', speed: 1, range: 56, colour: 15 }, // a zebra dove dropping over the middle step: the hop up to the cliff's ledge waits for it
    ],
  }),

  // SHELL GAME: the turtle crossing to the Big Island, on the surface (see paintFish). Down the rope from Kaihalulu onto the lava rock at the waterline; west over one turtle to the shore's last rock under
  // Maui's cliff (the Spam musubi, a coin over the turtle's back); east over two turtles, each up, going under (the warning) and down in turn, to Kona's black sand. Back up the rope.
  room({
    id: PAC.fish, cell: [3, 21], sector: 49, palette: SHELL_PALETTE,
    paint: paintFish,
    coins: FISH_COINS,
    item: { name: 'musubi1', col: FISH_MUSUBI_AT.col, row: FISH_MUSUBI_AT.row, sprite: PAC_SPRITE.musubi },
    decor: [...fishScenery, ...FISH_PIECES],
    // spinner dolphins leaping out of the swell in the gaps between the shells (Chris: "needs to be harder"), each its own height and pace, so a hop waits for the turtle under it and the dolphin over it
    creatures: [
      { who: 'dolphin', col: 17, row: 11, way: 'down', speed: 1, range: 48, colour: 15 }, // the gap off the rope's rock onto the first shell east: slow, high
      { who: 'dolphin', col: 22, row: 17, way: 'up', speed: 2, range: 28, colour: 12 }, // the gap between the two shells: fast
      { who: 'dolphin', col: 27, row: 13, way: 'down', speed: 1, range: 32, colour: 15 }, // the last gap, onto Kona's sand
    ],
  }),

  // KONA: the Big Island's black sand, rocky with lava (Chris, 2026-11-25: "a rocky beach with black sand"), where the way splits. Out of the sea at the left (floor 19); over the lava tube's mouth (the rope
  // down it to MAUNA LOA, the bottom way) and the tide pool (a coin over it); up the lava rock (a coin at its top) to the rope up the mountain's flank to MAUNA KEA (the top way); on east along the sand to
  // Hilo, where the plane is. A crab scuttling the sand from the palm to the lava rock (Chris: one "behind blocks... positioned in a harmless way"); a zebra dove gliding over the rock's top and the rope's
  // foot, another dropping over the lava tube's mouth. The tide pool is a hand deep: he wades it.
  room({
    id: PAC.kona, cell: [3, 22], sector: 90, palette: KONA_PALETTE,
    paint: paintKona,
    coins: KONA_COINS,
    decor: [...konaScenery, ...KONA_PIECES],
    creatures: [
      { who: 'pacCrab', col: 9, row: 17, way: 'right', speed: 2, range: 40 }, // the sand from the palm over the tide pool to the rock, fast: the walk east is timed to it, or it is jumped
      { who: 'pigeon', col: 18, row: 12, way: 'right', speed: 1, range: 104, colour: 15 }, // a zebra dove over the rock's top to past the rope, slow: the hop up to the coin and the climb wait for it
      { who: 'pigeon', col: 6, row: 10, way: 'down', speed: 2, range: 24, colour: 7 }, // another dropping over the lava tube's mouth, quick: the jump over the hole (and the climb down) waits for it
    ],
  }),

  // MAUNA KEA: the top way, the climb up through the cloud (Chris, 2026-11-25: Mauna Kea "is on a path through the middle of the island"). Up the rope from Kona onto the cinder switchbacks: the first (floor 16)
  // west, a step, the second (floor 12) west to a step, the third (floor 8) east, which runs on out of the room down the wet side to Akaka Falls; up the rope from it to the top (floor 4) and on up to the summit.
  // A nene walking the first switchback's length, another the third's, slow the other way; a hoary bat flitting up and down by the steps between the first and the second. The clouds below.
  room({
    id: PAC.kea, cell: [2, 22], sector: 91, palette: KEA_PALETTE,
    paint: paintKea,
    coins: KEA_COINS,
    decor: keaScenery,
    creatures: [
      { who: 'pacNene', col: 14, row: 14, way: 'right', speed: 2, range: 44 }, // the first switchback, met stepping off the rope: jumped, or waited out at the rope
      { who: 'bat', col: 9, row: 9, way: 'down', speed: 2, range: 24, colour: 8 }, // up and down by the step off the first's west end, across the hops up to the second
      { who: 'pacNene', col: 27, row: 6, way: 'left', speed: 1, range: 160 }, // the third, slow and long: the way up off the step and the run east to the falls read it
    ],
  }),

  // THE SUMMIT: Mauna Kea's top, above the clouds at night (the only night in the game): the red cinder ridge, the summit's cairn on its knoll (a coin), the small observatories, the big dome with its slit open and
  // the telescope pointing out at the stars and the moon, a shooting star falling south (to Mauna Loa's crater: the moon rock). Up the dome's ladder to the catwalk (a coin), where the astronomer reading his star
  // chart paces it, the ladder up to the telescope's platform drawn up, until Monty comes up to him with the moon rock (data.ts, seen there: he takes it, walks off into the dome and lets the ladder down,
  // and it stays down). Up it to the platform, where a paraglider's parachute is snagged. Snowballs roll along the ridge, fast and slow; the ridge runs on west to Lake Waiau and east to the telescopes.
  room({
    id: PAC.summit, cell: [1, 22], sector: 92, palette: KEA_PALETTE,
    paint: paintSummit,
    coins: SUMMIT_COINS,
    item: { name: 'parachute', col: PARACHUTE_AT.col, row: PARACHUTE_AT.row, sprite: PAC_SPRITE.parachute },
    decor: [
      ['jpStars', 1, 1], ['jpStars', 9, 3], ['jpStars', 12, 0], ['jpStars', 26, 5], ['jpMoon', 27, 1],
      ...summitScenery, ...SUMMIT_PIECES, ['pacShootingStar', 4, 4],
    ],
    creatures: [
      { who: 'pacAstronomer', col: ASTRONOMER_AT.col, row: ASTRONOMER_AT.row, way: 'right', speed: 1, range: 56 }, // (the first: data.ts sends him in)
      { who: 'snowball', col: 4, row: 14, way: 'right', speed: 3, range: 60, colour: 3 }, // the ridge, fast (kept off the edges he comes in by): from the rope to the ladder is a run between its passes
      { who: 'snowball', col: 27, row: 14, way: 'left', speed: 1, range: 96, colour: 14 }, // the east half, slow: crossing the fast one on its own period, so the gap is read
    ],
  }),

  // AKAKA FALLS: the wet side of the island, the rainforest gorge where the falls pour out under the high trail into the plunge pool. Crossed twice at two heights (the plan: Moscow's rule), sealed from each
  // other by the gorge: the high trail from Mauna Kea's third switchback along the gorge's top (floor 8) to the rope at its end (a coin at its head) down the way the stream goes, to Hilo's street; and the low
  // lane by the plunge pool (floor 19; a coin over the pool), from Hilo's roofs up the rope at the left, west to Mauna Kea's foot. The stream crosses the high trail at the falls' lip and comes down in spate
  // on its clock (`FORD`): the ford is crossed between rushes, with a parrot sweeping the trail fast; another drops by the falls over the low lane, slow.
  room({
    id: PAC.falls, cell: [2, 23], sector: 93, palette: FALLS_PALETTE,
    paint: paintFalls,
    coins: FALLS_COINS,
    decor: [...fallsScenery, ...FALLS_PIECES],
    creatures: [
      { who: 'pacParrot', col: 4, row: 6, way: 'right', speed: 2, range: 88 }, // the high trail at his height, fast (kept off the edge he comes in by): met coming in from Mauna Kea, and at the ford
      { who: 'pacParrot', col: 17, row: 11, way: 'down', speed: 1, range: 40, colour: 8 }, // dropping by the falls over the low lane, slow: the walk from the rope to the pool's coin passes under it
    ],
  }),

  // MAUNA LOA: the bottom way, along the south over the volcano's lava (MAUNA KEA-OS's rising lava, where it belongs). Down the lava tube's rope from Kona onto the shore (cols 2-10, outside the lava), and the
  // lava starts to rise. Onto the first ledge (floor 14), east over the stepping ledges (the first two cooled crust that cracks under a standing foot; a magma blob bobs up between them) to the last (a coin at
  // its end), up the rope on the east wall past the long ledge to the rim's high shelf (floor 5: a coin at the rope's head) and out east to the coffee farm. The rope hangs on down a pit walled off from the
  // basin to the moon rock at its foot (a dead end off the route), past a magma blob bobbing up and down beside the rope.
  room({
    id: PAC.loa, cell: [4, 22], sector: 52, palette: LOA_PALETTE,
    paint: paintLoa,
    coins: LOA_COINS,
    item: { name: 'moon rock', col: MOON_ROCK_AT.col, row: MOON_ROCK_AT.row, sprite: PAC_SPRITE.moonRock },
    decor: [...loaScenery, ...LOA_PIECES],
    // (orange, molten: white read as a ghost; it differs from the lava's red and crest's yellow and the steam's white)
    creatures: [
      { who: 'pacMagma', col: 17, row: 16, way: 'up', speed: 1, range: 40, colour: 8 }, // bobbing up between the two crusts, as it was (Chris: "pretty good"): the run over them ahead of the lava times it
      { who: 'pacMagma', col: 29, row: 9, way: 'down', speed: 1, range: 40, colour: 8 }, // in the pit beside the rope: the climb down to the moon rock and back up waits for it
    ],
  }),

  // COFFEE BREAK (see paintCoffee): in from Mauna Loa's rim onto the top terrace (floor 5), down the terraces between the coffee rows to the drying deck (the sack of beans), down to the farm road under it,
  // east to the rope up to Hilo by the farm's end wall. Stone steps up each bank make it a way both ways. A rooster struts each terrace, fast and slow; a farmhand cycles the road, under the deck.
  room({
    id: PAC.coffee, cell: [4, 23], sector: 51, palette: COFFEE_PALETTE,
    paint: paintCoffee,
    coins: COFFEE_COINS,
    item: { name: 'coffee', col: COFFEE_AT.col, row: COFFEE_AT.row, sprite: PAC_SPRITE.coffee },
    decor: [...coffeeScenery, ...COFFEE_POSTS, ...COFFEE_PIECES],
    creatures: [
      { who: 'pacRooster', col: 4, row: 3, way: 'right', speed: 2, range: 20 }, // the top terrace, fast, kept off the way in at the edge: met coming in, jumped
      { who: 'pacRooster', col: 10, row: 7, way: 'right', speed: 1, range: 48, colour: 7 }, // the second, slow: the step down onto it and the drop to the deck read it
      { who: 'bicycle', col: 17, row: 17, way: 'right', speed: 2, range: 52, colour: 15 }, // a farmhand cycling the road from under the deck to the rope: the drop off the deck and the rope's foot are timed to him
    ],
  }),

  // HILO GOODBYE: Hilo's bayfront and the airfield, where the two ways meet. In along the street from Kona; up the rope onto the old wooden storefronts' roofs (a coin) and up the rope from them into Akaka
  // Falls' low lane (the top way, up to Mauna Kea); east to the airfield where the yellow mail biplane waits: NO FLYING WITHOUT A PARACHUTE, TOO SLEEPY TO FLY. The long rope at the street's end comes down
  // from Akaka Falls' high trail and goes on down to the coffee farm's road (the bottom way). A cyclist rides the bayfront the length of the street, fast; a rooster struts by the plane, slow; a mynah flits
  // along the roofs.
  room({
    id: PAC.hilo, cell: [3, 23], sector: 53, palette: HILO_PALETTE,
    paint: paintHilo,
    coins: HILO_COINS,
    decor: [...hiloScenery, ...storefronts, ...HILO_PIECES, ['skyBiplane', BIPLANE_AT.col, BIPLANE_AT.row]], // (the evening over Hilo Bay: he takes off into the night)
    creatures: [
      { who: 'bicycle', col: 3, row: 17, way: 'right', speed: 2, range: 72, colour: 14 }, // the street from the storefronts to the plane, fast (kept off the way in at the edge): jumped, or met from the roofs' rope
      { who: 'pacRooster', col: 12, row: 17, way: 'right', speed: 1, range: 64 }, // under the roofs' rope to the plane, slow: the cyclist and he cross on different periods (east of the plane is clear: a save carried on there)
      { who: 'dove', col: 2, row: 10, way: 'right', speed: 1, range: 96, colour: 9 }, // a mynah along the roofs: the roof's coin and the rope up from them wait for it
    ],
  }),

  // BOARD MEETING: the bonus room west of the luau (see paintBeach). In along the sand from the luau's lawn; the beach boys carrying their boards each way at their own speeds; up the surfboard rack's shelves
  // (the volleyball bouncing in the gap between them) to its coin on the top board; the canoe rack's coin; one over the sand where the beach boys cross. Back east the same way.
  room({
    id: PAC.beach, cell: [1, 17], sector: 99, palette: BEACH_BOYS_PALETTE,
    paint: paintBeach,
    coins: BEACH_COINS,
    decor: [...sunset(paintBeach, BEACH_KEEP, { purple: 0, red: 1, orange: 3, gold: HORIZON - 1, sea: HORIZON }), ...BEACH_PIECES],
    creatures: [
      { who: 'pacSurfer', col: 4, row: 17, way: 'right', speed: 1, range: 184 }, // a beach boy carrying his board the whole beach, slow
      { who: 'pacSurfer', col: 26, row: 17, way: 'left', speed: 2, range: 80, colour: 3 }, // another the other way, fast: the two cross on different periods, so the gap is read and waited for
      { who: 'football', col: 9, row: 5, way: 'down', speed: 1, range: 80, colour: 1 }, // a volleyball bouncing in the rack's gap: each hop from shelf to shelf waits for it
    ],
  }),

  // ON THIN ICE: the bonus room west of the summit (see paintWaiau). A snowball rolling to and fro across the ice, fast; a nene on each cone's shoulder, quick and slow.
  room({
    id: PAC.waiau, cell: [1, 21], sector: 101, palette: WAIAU_PALETTE,
    paint: paintWaiau,
    coins: WAIAU_COINS,
    decor: [...waiauScenery, ...WAIAU_PIECES],
    creatures: [
      { who: 'snowball', col: 9, row: 15, way: 'right', speed: 2, range: 40, colour: 3 }, // rolling across the ice from shore to shore, fast: the crossing starts as it turns, and waiting on the ice breaks it
      { who: 'pacNene', col: 21, row: 12, way: 'right', speed: 2, range: 24 }, // the east cone's shoulder, quick: the climb to its top waits for it
      { who: 'pacNene', col: 2, row: 12, way: 'right', speed: 1, range: 48 }, // the west cone's shoulder, slow: the same climb the other side, on another period
    ],
  }),

  // SEEING STARS: the bonus room east of the summit (see paintRidge). An astronomer pacing Keck I's catwalk, another walking the ridge from dome to dome, quick; the laser through the gantry on its clock.
  room({
    id: PAC.ridge, cell: [1, 23], sector: 102, palette: RIDGE_PALETTE,
    paint: paintRidge,
    coins: RIDGE_COINS,
    decor: [...ridgeScenery, ...RIDGE_PIECES],
    creatures: [
      { who: 'pacAstronomer', col: 3, row: 9, way: 'right', speed: 1, range: 48, colour: 14 }, // Keck I's catwalk: its coin is taken between his turns
      { who: 'pacAstronomer', col: 4, row: 14, way: 'right', speed: 2, range: 96, colour: 10 }, // the ridge from Keck I's ladder to past Keck II's, quick (kept off the edge he comes in by): either ladder between his passes
    ],
  }),
];
