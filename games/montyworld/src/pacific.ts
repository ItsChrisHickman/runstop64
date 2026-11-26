import type { Arrival, BoardingSpec, CharAnim, CrackSpec, CurrentSpec, LavaSpec, PulseSpec, RollerSpec, TunnelSpec } from '../../montyotr/src/montydata';
import type { RoomSpec, Sector } from '../../shared/monty/rooms';
import type { WorldDecor } from './art/world';
import { BOULDER_POINTERS } from './andes-pointers';
import { BUBBLE_FRAMES, SPLASH_FRAMES, STREAK_FRAMES } from './art/pacific-falls';
import { codeOf, decorIndex, fillCells, type Grid, room, type Palette } from './layout';

/**
 * The Pacific, the fifth region of Do Svidaniya Monty: Hawaii's island hopping (docs/dosvidaniya-back-half-plan.md, "Hawaii"; Chris, 2026-11-25: "landing in Honolulu, then climbing Diamond Head to get
 * the snorkel that a tourist left behind, then snorkeling past Molokai to Lahaina, Road to Hana, then more snorkeling from that beach ... to the Big Island (Kona)", where the island splits over Mauna Kea and
 * Mauna Loa into Hilo and the plane). Nineteen rooms on four islands and three swims, the rooms the 2026-11-23 reset cut brought back as they were designed (`804a838^`) and the Big Island's fork new.
 *
 *            col 17          18              19              20              21              22              23
 *   row 0                    DIAMOND HEAD    THE LOOKOUT
 *   row 1                    LEI OF THE LAND                                                 THE SUMMIT
 *   row 2    THE CARGO SHIP  WAIKIKI         WHALE OF A TIME THE ROAD TO HANA HANA           MAUNA KEA    ->  AKAKA FALLS
 *   row 3                    CLAM DOWN       KELP WANTED     THE SEA CAVE    FISH OUT OF     KONA        <->  HILO GOODBYE  -> the biplane: THE FLIGHT
 *                                                                            WATER
 *   row 4                                                                                    MAUNA LOA    ->  COFFEE BREAK
 *
 * Oahu: off the ship onto Waikiki's beach, where the surf stops him (deadly until the snorkel); up the palm to the luau (the torches, the hula show, the lei), up the hillside rope to Diamond Head's crater
 * trail and through the old bunker to THE LOOKOUT, where a tourist left the snorkel; back down and into the surf. The first swim (CLAM DOWN, Molokai's sea cliffs behind; KELP WANTED) comes up Lahaina's
 * mooring rope on Maui (or on east through the sea cave and up the road's pool); THE ROAD TO HANA's three tiers with the cars over the one-lane bridges; Hana's red sand cove drops into the last swim (FISH
 * OUT OF WATER: the surge, the moray, the shark), out onto Kona's black sand on the Big Island. There the way splits: up through the cloud to Mauna Kea's summit (the parachute, snagged on the big dome) and
 * down Akaka Falls into Hilo; or down the lava tube to Mauna Loa (the run ahead of the lava) and along the coffee farm (the coffee) up into Hilo. The biplane takes off only with both (NO FLYING WITHOUT A
 * PARACHUTE, TOO SLEEPY TO FLY), so whichever way he takes first, Hilo sends him back out to Kona for the other: Monty on the Run's double-back. Playfield cells as in moscow.ts.
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

/** The sprite pointers (in the bank) of the Pacific's items: the original's item blocks the world never uses ($8F-$91, $93, $94). */
export const PAC_SPRITE = { coffee: 0x8f, snorkel: 0x90, lei: 0x91, musubi: 0x93, parachute: 0x94 } as const;

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
  T: ['pacTrailStone', 9], R: ['pacBamboo', 13], C: ['pacConcrete', 12], K: ['pacBasalt', 9],
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
  R: ['pacRoad', 11], B: ['pacBridgeDeck', 8], S: ['pacBasalt', 5], V: ['pacBamboo', 13], Y: ['pacCarCab', 2], Z: ['pacCarBody', 2],
} as const satisfies Palette;

/** Hana: the headland's rock and turf, Kaihalulu's red sand, the bamboo rope, the swash of the surf up the beach. */
export const HANA_PALETTE = {
  B: ['pacBasalt', 9], T: ['pacTurf', 5], K: ['pacBlackSand', 10], R: ['pacBamboo', 13], P: ['pacSwash', 6],
} as const satisfies Palette;

/** Kona: the black sand and the lava rock, the tide pool, the ropes up to Mauna Kea and down the lava tube to Mauna Loa. */
export const KONA_PALETTE = {
  K: ['pacBlackSand', 11], B: ['pacBasalt', 9], W: ['pacWaves', 14], R: ['pacBamboo', 13],
} as const satisfies Palette;

/** Mauna Kea and its summit: the red cinder, the rope, the observatory's catwalk and ladders. */
export const KEA_PALETTE = {
  C: ['pacBasalt', 2], R: ['pacBamboo', 13], G: ['pacGrating', 15], L: ['pacSteelLadder', 15],
} as const satisfies Palette;

/** Akaka Falls: the gorge's rock and its mossy ledges, the plunge pool. */
export const FALLS_PALETTE = {
  B: ['pacBasalt', 9], T: ['pacTurf', 5], W: ['pacWaves', 14],
} as const satisfies Palette;

/** Mauna Loa: the crater's dark rock, the ledges' pale crust (whole and split), the lava and its crest, the ropes, the steam vent's column. */
export const LOA_PALETTE = {
  K: ['pacCrust', 9], L: ['pacCrust', 15], Y: ['pacCrustSplit', 15], M: ['pacMagma', 2], C: ['pacMagmaCrest', 7], R: ['pacBamboo', 13], V: ['pacSteam', 1],
} as const satisfies Palette;

/** The coffee farm: the terraces' turf over red soil, the rope up to Hilo, the low lane's road. */
export const COFFEE_PALETTE = {
  T: ['pacTurf', 5], S: ['pacBasalt', 9], R: ['pacBamboo', 13], P: ['pacRoad', 11], B: ['pacReefRock', 9],
} as const satisfies Palette;

/** Hilo: the street, the storefronts' roofs, the bayfront's sea wall, the rope down to the farm. */
export const HILO_PALETTE = {
  P: ['pacRoad', 11], J: ['pacBridgeDeck', 8], H: ['pacHotelWall', 7], R: ['pacBamboo', 13], S: ['pacSeaWall', 14],
} as const satisfies Palette;

// ---- the backdrops -------------------------------------------------------------------------------------
/** The open sea of a swim room over every cell its paint leaves empty below the cliffs (a backdrop: a coin is drawn over it, a pulse's cell goes back to it). */
const seaOf = (paint: (g: Grid) => void, keep: readonly (readonly [col: number, row: number])[] = []) => fillCells(paint, keep, [0, 0, 31, 19], 'pacSeaFlat');
/** The luau's and Diamond Head's sunset: the sky's bands over every empty cell (rows `bands`), then the sea's waves on the horizon. */
function sunset(paint: (g: Grid) => void, keep: readonly (readonly [col: number, row: number])[], rows: { purple: number; red: number; orange: number; gold: number; sea?: number }): (readonly [WorldDecor, number, number])[] {
  const { purple, red, orange, gold, sea } = rows;
  return [
    ...fillCells(paint, keep, [0, 0, 31, purple], 'pacSkyPurple'), ...fillCells(paint, keep, [0, purple + 1, 31, red], 'pacSkyRed'),
    ...fillCells(paint, keep, [0, red + 1, 31, orange], 'pacSkyOrange'), ...fillCells(paint, keep, [0, orange + 1, 31, gold], 'pacSkyGold'),
    ...(sea === undefined ? [] : fillCells(paint, keep, [0, gold + 1, 31, sea], 'pacSeaWave')),
  ];
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
/** The flow lines slide west a pixel a step (half a pixel a frame), the water's way. */
export const SURGE_ANIM: CharAnim = { kind: 'scroll', room: PAC.fish, rings: [[codeOf(SEA_PALETTE, 'U')]], dx: -1, px: 1, every: 1 };

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
 * Mauna Loa's lava (`risingLava`; the lava belongs on the volcano: Chris, 2026-11-25): in the basin (cols 11-29, east of the shore the lava tube drops him on) it starts at the floor when he comes in and rises
 * a row every 40 frames to row 10, the row under the long ledge's feet, holds 150 and drains a row every 12. The ledges at floor 9 and above are always clear.
 */
export const LAVA: LavaSpec = {
  room: PAC.loa, col: 11, cols: 19, baseRow: 19, topRow: 10, stepFrames: 40, holdFrames: 150, drainFrames: 12, code: codeOf(LOA_PALETTE, 'M'), crest: codeOf(LOA_PALETTE, 'C'),
};
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
export const PARACHUTE_AT = { col: 21, row: 3 } as const;
/** The sack of coffee at the far end of the farm's lowest terrace (its top left). */
export const COFFEE_AT = { col: 21, row: 11 } as const;

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
  g.box(14, 14, 14, 19, 'R'); // the rope up from the luau
  g.box(28, 16, 29, 16, 'T'); // the first step
  g.box(4, 14, 29, 14, 'T'); // the second ledge
  g.box(2, 12, 3, 12, 'T'); // the second step
  g.box(4, 10, 31, 10, 'T'); // the third ledge, out of the room at the right
  g.box(30, 11, 31, 19, 'K'); // the crater's rim under it, closing the trail's end
};
const DIAMOND_COINS = [[28, 14], [2, 10]] as const;

const paintLookout = (g: Grid): void => {
  g.box(2, 4, 12, 5, 'C').box(0, 10, 13, 10, 'C'); // the old bunker's tunnel: its roof and floor (a concrete tube open at the left to the trail)
  g.box(14, 8, 17, 8, 'T').box(18, 6, 21, 6, 'T').box(22, 4, 31, 4, 'T'); // the stairs and the summit
  g.box(0, 11, 31, 19, 'K'); // the crater's wall under them
};
const LOOKOUT_COINS = [[27, 2], [6, 8]] as const;
const SNORKEL_AT = { col: 24, row: 2 } as const;

const paintClam = (g: Grid): void => {
  g.box(0, 0, 25, 2, 'K').box(31, 0, 31, 14, 'K').box(0, 0, 1, 19, 'K').box(0, 19, 31, 19, 'K'); // Oahu's shore over the water (the surf's gap, cols 26-30), the walls, the seabed; out east, low
  g.box(12, 3, 15, 6, 'K'); // a rock hanging from the shore
  g.box(7, 12, 13, 14, 'R').box(7, 15, 7, 16, 'R').box(13, 15, 13, 16, 'R'); // the rock arch, the way under it along the seabed (rows 17-18)
  g.box(2, 17, 4, 18, 'C'); // coral
  g.box(19, 11, 23, 18, 'R').box(20, 9, 22, 10, 'R'); // the tall rock
};
const CLAM_COINS = [[10, 17]] as const;

const paintKelp = (g: Grid): void => {
  g.box(0, 0, 13, 2, 'K').box(17, 0, 31, 2, 'K'); // Molokai's cliffs over the water, the slipway's gap (cols 14-16) where the mooring rope goes up to Lahaina
  g.box(0, 0, 1, 14, 'K').box(0, 19, 31, 19, 'K').box(31, 0, 31, 13, 'K'); // in from the west, low; out east into the sea cave (rows 14-18)
  g.box(15, 0, 15, 5, 'L'); // the mooring rope
  g.box(8, 16, 10, 18, 'C').box(19, 14, 21, 18, 'C'); // coral
  g.box(24, 11, 28, 18, 'R').box(25, 9, 27, 10, 'R').clear(25, 15, 27, 18); // a rock with a hollow under it
};
const KELP_COINS = [[13, 17]] as const;

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
  g.box(4, 4, 6, 6, 'K').box(10, 4, 12, 5, 'K').box(16, 4, 18, 5, 'K'); // stalactites
  g.box(8, 17, 10, 18, 'R').box(14, 17, 16, 18, 'R').box(20, 17, 23, 18, 'C');
  g.box(26, 9, 29, 9, 'R'); // the ledge under the stalactites at the back
};
const CAVE_COINS = [[27, 8]] as const;

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
  g.box(7, 0, 7, 18, 'R'); // the rope down the lava tube to Mauna Loa
  g.box(20, 17, 22, 18, 'B').box(23, 15, 25, 18, 'B'); // the lava rock stepping up from the beach
  g.box(28, 1, 28, 17, 'R'); // the rope up the mountain's flank to Mauna Kea
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
  g.box(30, 9, 31, 19, 'C').box(30, 0, 31, 5, 'C'); // the shoulder of the mountain closing the climb, the way east (rows 6-7)
};
const KEA_COINS = [[3, 2], [22, 6]] as const;

const paintSummit = (g: Grid): void => {
  g.box(0, 16, 4, 19, 'C').box(8, 16, 31, 19, 'C'); // the red cinder ridge, open round the rope up from the climb (cols 5-7)
  g.box(6, 16, 6, 19, 'R'); // the rope
  g.box(1, 14, 3, 15, 'C'); // the summit's knoll, the marker on it
  g.box(16, 11, 26, 11, 'G').box(15, 11, 15, 15, 'L'); // the big dome's catwalk and its ladder
  g.box(20, 6, 24, 6, 'G').box(25, 6, 25, 10, 'L'); // the dome's top platform and its ladder
};
const SUMMIT_COINS = [[3, 12], [23, 9]] as const;

const paintFalls = (g: Grid): void => {
  g.box(0, 8, 7, 8, 'T').box(0, 9, 3, 19, 'B').box(0, 0, 1, 5, 'B'); // the gorge's lip, in from Mauna Kea's wet side (rows 6-7), the cliff over it
  g.box(9, 11, 14, 11, 'T'); // the ledges down the gorge
  g.box(4, 14, 9, 14, 'T');
  g.box(12, 17, 19, 17, 'T');
  g.box(4, 19, 19, 19, 'B').box(23, 19, 31, 19, 'B'); // the gorge's floor, the stream's way down to Hilo (cols 20-22)
  g.box(24, 18, 29, 18, 'W'); // the plunge pool
  g.box(28, 0, 31, 4, 'B').box(30, 5, 31, 17, 'B'); // the falls' cliff
};
const FALLS_COINS = [[10, 9]] as const;

const paintLoa = (g: Grid): void => {
  g.box(0, 0, 1, 19, 'K').box(30, 0, 31, 2, 'K').box(30, 5, 31, 19, 'K').box(0, 19, 31, 19, 'K'); // the crater's walls and floor (the shore at the left, cols 2-10, outside the lava; out east at the top, rows 3-4)
  g.box(7, 0, 7, 18, 'R'); // the rope down the lava tube from Kona
  g.box(9, 14, 11, 14, 'L').box(14, 14, 16, 14, 'L').box(19, 14, 21, 14, 'L').box(24, 14, 29, 14, 'L'); // the first ledge and the stepping ledges (floor 14)
  g.box(15, 9, 26, 9, 'L').box(20, 9, 21, 9, 'Y'); // the long ledge (floor 9), the vent's crack in it
  g.box(28, 4, 28, 13, 'R'); // the rope up the east wall, past the long ledge to the rim
  g.box(19, 0, 19, 4, 'K').box(20, 5, 31, 5, 'L'); // the rim's spur and the high shelf east of it, out east to the farm
};
const LOA_COINS = [[26, 12], [22, 3]] as const;

const paintCoffee = (g: Grid): void => {
  g.box(0, 5, 9, 5, 'T').box(0, 6, 9, 19, 'S'); // the top terrace, in from Mauna Loa's rim
  g.box(10, 9, 16, 9, 'T').box(10, 10, 16, 19, 'S'); // the second
  g.box(17, 13, 23, 13, 'T').box(17, 14, 23, 19, 'S'); // the third, the sack at its far end
  g.box(24, 19, 31, 19, 'P'); // the farm's lane at the foot of the terraces
  g.box(29, 0, 29, 18, 'R'); // the rope up to Hilo
  g.box(0, 0, 0, 2, 'B'); // (the crater's rim at the west edge, over the way in)
};
const COFFEE_COINS = [[5, 3], [13, 7]] as const;

const paintHilo = (g: Grid): void => {
  g.box(0, 19, 27, 19, 'P').box(31, 19, 31, 19, 'P'); // the street along the bayfront to the airfield, the rope's opening (cols 28-30)
  g.box(29, 15, 29, 19, 'R'); // the rope down to the coffee farm
  g.box(2, 12, 14, 12, 'J'); // the old wooden storefronts' roofs
};
const HILO_COINS = [[8, 10], [17, 17]] as const;
/** The storefronts under their roofs (one character each over the empty cells: a backdrop he walks past). */
const storefronts = fillCells(paintHilo, [], [2, 13, 14, 18], 'pacHotelFront');

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
    coins: [[5, 13], [25, 17]],
    decor: [...hotelFront, ...pillars, ['pacSnorkelShop', 3, 15], ['pacPalm', 21, 13], ['pacSurfboards', 11, 17]],
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
    decor: [...sunset(paintDiamond, DIAMOND_COINS, { purple: 1, red: 3, orange: 5, gold: 7 }), ['pacLavaRocks', 18, 17], ['pacLavaRocks', 8, 13]],
    creatures: [{ who: 'pacTern', col: 18, row: 7, way: 'down', speed: 1, range: 40 }],
  }),

  // THE LOOKOUT: the old bunker's tunnel and the stairs to the summit of Diamond Head. In from the trail at the left (floor 10, the tunnel's mouth at col 13); the stairs climb to the summit lookout (floor 4),
  // where a tourist left his snorkel and mask. Rocks tumble down the stairs from the crater's rim and vanish at the tunnel's mouth: the tunnel is the place to wait (a coin in it).
  room({
    id: PAC.lookout, cell: [0, 19], sector: 89, palette: DIAMOND_PALETTE,
    paint: paintLookout,
    coins: LOOKOUT_COINS,
    item: { name: 'snorkel', col: SNORKEL_AT.col, row: SNORKEL_AT.row, sprite: PAC_SPRITE.snorkel },
    decor: [...sunset(paintLookout, [...LOOKOUT_COINS, [24, 2], [25, 2], [24, 3], [25, 3]], { purple: 1, red: 3, orange: 5, gold: 7 }), ['pacLookout', 28, 1]],
  }),

  // CLAM DOWN: the swim past Molokai (the first crossing), learning to swim. In through the surf's gap above (cols 26-30); down past the rock hanging from the shore, under the rock arch along the seabed (a
  // coin inside it), past the tall rock, out low east. No current; a turtle rising to breathe and an eel; Molokai's tall sea cliffs far off through the water.
  room({
    id: PAC.clam, cell: [3, 18], sector: 43, palette: SEA_PALETTE,
    paint: paintClam,
    coins: CLAM_COINS,
    decor: [...seaOf(paintClam, CLAM_COINS), ['pacSeaCliff', 2, 3], ['pacKelp', 16, 16], ['pacSeaFan', 27, 16], ['pacBubbles', 25, 6], ['pacSeaFan', 5, 16]],
    creatures: [
      { who: 'pacTurtle', col: 3, row: 4, way: 'down', speed: 1, range: 40 },
      { who: 'pacEel', col: 26, row: 9, way: 'left', speed: 1, range: 12 },
    ],
  }),

  // KELP WANTED: the second reef, off Maui. In from the west, low; through the kelp past the manta (a coin deep in it); the mooring rope goes up through the slipway's gap (cols 14-16) to Lahaina; east, low,
  // the sea cave under the road.
  room({
    id: PAC.kelp, cell: [3, 19], sector: 45, palette: SEA_PALETTE,
    paint: paintKelp,
    coins: KELP_COINS,
    decor: [...seaOf(paintKelp, KELP_COINS), ['pacSeaCliffB', 3, 3], ['pacKelp', 12, 16], ['pacKelp', 17, 15], ['pacKelp', 22, 16], ['pacSeaFan', 29, 16], ['pacBubbles', 4, 12], ['pacBubbles', 30, 8]],
    creatures: [
      { who: 'pacManta', col: 8, row: 6, way: 'right', speed: 1, range: 100 },
      { who: 'pacTurtle', col: 22, row: 5, way: 'down', speed: 1, range: 40 },
    ],
  }),

  // WHALE OF A TIME: Lahaina's old whaling harbour on Maui. Up the mooring rope from the reef through the slipway (cols 14-16) onto the quay. The old brig lies in the harbour water at the left: the crates up
  // to its deck (a Spam musubi), the mast's rope to the spar (a dead end, its coin); the quay runs east past the outrigger and under the fort's wall onto the road. The whale's tail in the harbour.
  room({
    id: PAC.lahaina, cell: [2, 19], sector: 46, palette: WHALE_PALETTE,
    shut: [['left', 2, 17, 'Q']], // (Waikiki's cliff the other side: the fort's wall)
    paint: paintWhale,
    coins: [[9, 5]],
    item: { name: 'musubi2', col: 6, row: 12, sprite: PAC_SPRITE.musubi },
    decor: [['pacOutrigger', 19, 16], ['pacPalm', 24, 12]],
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
    coins: [[27, 15], [16, 5]],
    decor: [['pacWaterfall', 6, 2], ['pacWaterfall', 20, 2], ['pacBambooClump', 25, 4], ['pacBambooClump', 7, 4],
      ['pacLaneSign', 6, 16], ['pacLaneSign', 20, 16], ['pacLaneSign', 10, 11], ['pacLaneSign', 24, 11], ['pacLaneSign', 9, 6], ['pacLaneSign', 23, 6]],
    creatures: [{ who: 'pacCoconut', col: 23, row: 6, way: 'right', speed: 1, range: 16 }],
  }),

  // THE SEA CAVE: under the road, open water. In from the reef at the left (rows 14-18), or down the rope through the road's pool (cols 23-25), the way up again. The ledge under the stalactites at the back
  // holds a coin, seen through the pool from the road above; a Spam musubi on the seabed past the humps. An eel and a manta.
  room({
    id: PAC.cave, cell: [3, 20], sector: 48, palette: SEA_PALETTE,
    paint: paintCave,
    coins: CAVE_COINS,
    item: { name: 'musubi3', col: 17, row: 15, sprite: PAC_SPRITE.musubi },
    decor: [...seaOf(paintCave, [...CAVE_COINS, [17, 15], [18, 15], [17, 16], [18, 16]]), ['pacWaterfall', 21, 4], ['pacKelp', 12, 16], ['pacSeaFan', 27, 16], ['pacBubbles', 5, 11]],
    creatures: [
      { who: 'pacEel', col: 6, row: 10, way: 'right', speed: 1, range: 80 },
      { who: 'pacManta', col: 12, row: 12, way: 'right', speed: 1, range: 60 },
    ],
  }),

  // HANA: the road's end on Maui, Kaihalulu's red sand in its cinder cove (HANA BANANA's place). In at the left on the headland (floor 8), the banana-bread stand by the road; the bamboo rope (col 14) down the
  // cliff to the red sand (floor 18), the surf sweeping up it from the cove on a timing (spray, then the wave, then it draws back); steps up the cove's side to the ledge in the cinder cave (a coin). The cove
  // (cols 26-28) is the way on, down its rope into the last swim; the crab scuttles the sand.
  room({
    id: PAC.hana, cell: [2, 21], sector: 87, palette: HANA_PALETTE,
    paint: paintHana,
    coins: HANA_COINS,
    decor: [['pacBreadStand', 2, 5], ['pacPalmSmall', 9, 4], ['pacLavaRocks', 16, 17], ['pacPalmSmall', 27, 9]],
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
    decor: [['pacLavaRocks', 11, 18], ['pacPalmSmall', 12, 15], [{ text: 'MAUNA LOA', colour: 8 }, 3, 15], [{ text: 'MAUNA KEA', colour: 2 }, 19, 3], ['pacLavaRocks', 29, 18]],
    creatures: [{ who: 'pacCrab', col: 19, row: 17, way: 'right', speed: 1, range: 40 }],
  }),

  // MAUNA KEA: the top way, the climb up through the cloud (Chris, 2026-11-25: Mauna Kea "is on a path through the middle of the island"). Up the rope from Kona onto the cinder switchbacks: the first (floor 16)
  // west, a step, the second (floor 12) west to a step, the third (floor 8) east, which runs on out of the room down the wet side to Akaka Falls; on up a step to the top (floor 4) and the rope up to the summit.
  // A nene on the second switchback; the clouds below.
  room({
    id: PAC.kea, cell: [2, 22], sector: 91, palette: KEA_PALETTE,
    paint: paintKea,
    coins: KEA_COINS,
    decor: [['skyLowCloud', 2, 17], ['skyLowCloud', 14, 18], ['skyWisps', 13, 2]],
    creatures: [{ who: 'pacNene', col: 6, row: 10, way: 'right', speed: 1, range: 40 }],
  }),

  // THE SUMMIT: Mauna Kea's top, above the clouds at night (the only night in the game): the red cinder ridge, the summit's cairn on its knoll (a coin), the small observatories, the big dome with its slit open and
  // the telescope pointing out at the stars and the moon. Up the dome's ladder to the catwalk (a coin) and up the second ladder to its top, where a paraglider's parachute is snagged. A dead end: back down.
  room({
    id: PAC.summit, cell: [1, 22], sector: 92, palette: KEA_PALETTE,
    paint: paintSummit,
    coins: SUMMIT_COINS,
    item: { name: 'parachute', col: PARACHUTE_AT.col, row: PARACHUTE_AT.row, sprite: PAC_SPRITE.parachute },
    decor: [
      ['jpStars', 1, 1], ['jpStars', 9, 3], ['jpStars', 12, 0], ['jpStars', 26, 5], ['jpMoon', 27, 1],
      ['pacDomeBig', 17, 6], ['pacDomeSmall', 9, 13], ['pacDomeSmall', 28, 13], ['pacCairn', 1, 12],
    ],
  }),

  // AKAKA FALLS: the wet side of the island, down from Mauna Kea through the rainforest gorge beside the tall waterfall, dropping in two falls to its plunge pool. In at the gorge's lip (floor 8); down the mossy
  // ledges (a coin on the first, seen from the lip) to the gorge's floor; the stream's way out at the bottom (cols 20-22) is a drop into Hilo, no way back up. A parrot in the trees.
  room({
    id: PAC.falls, cell: [2, 23], sector: 93, palette: FALLS_PALETTE,
    paint: paintFalls,
    coins: FALLS_COINS,
    decor: [['pacWaterfall', 26, 4], ['pacWaterfall', 26, 13], ['pacPalmSmall', 3, 4], ['pacPalm', 15, 11], ['pacBambooClump', 12, 7]],
    creatures: [{ who: 'pacParrot', col: 12, row: 3, way: 'right', speed: 1, range: 60 }],
  }),

  // MAUNA LOA: the bottom way, along the south over the volcano's lava (MAUNA KEA-OS's rising lava, where it belongs). Down the lava tube's rope from Kona onto the shore (cols 2-10, outside the lava), and the
  // lava starts to rise. Onto the first ledge (floor 14), east over the stepping ledges (the first two cooled crust that cracks under a standing foot; a magma blob bobs up between them) to the last (a coin at
  // its end), up the rope on the east wall past the long ledge to the rim's high shelf (floor 5: a coin at the rope's head), past the nene and out east to the coffee farm.
  room({
    id: PAC.loa, cell: [4, 22], sector: 52, palette: LOA_PALETTE,
    paint: paintLoa,
    coins: LOA_COINS,
    decor: [['pacLavaRocks', 3, 18]],
    creatures: [
      { who: 'pacMagma', col: 17, row: 16, way: 'up', speed: 1, range: 40, colour: 1 },
      { who: 'pacNene', col: 22, row: 3, way: 'right', speed: 1, range: 24 },
    ],
  }),

  // COFFEE BREAK: Hilo's coffee farm on the slope below the town (COFFEE BREAK's coffee). In from Mauna Loa's rim onto the top terrace (floor 5), down the terraces between the coffee rows (each a drop: no way
  // back up from the next), the sack of beans at the far end of the lowest, down to the farm's lane and up the rope to Hilo. From Hilo the rope leads only to the lane: the coffee is earned over Mauna Loa.
  room({
    id: PAC.coffee, cell: [4, 23], sector: 51, palette: COFFEE_PALETTE,
    paint: paintCoffee,
    coins: COFFEE_COINS,
    item: { name: 'coffee', col: COFFEE_AT.col, row: COFFEE_AT.row, sprite: PAC_SPRITE.coffee },
    decor: [['pacCoffeeTree', 2, 2], ['pacCoffeeTree', 14, 6], ['pacCoffeeTree', 18, 10], ['pacSacks', 7, 3], ['pacSacks', 25, 17]],
    creatures: [
      { who: 'pacRooster', col: 26, row: 17, way: 'right', speed: 1, range: 8 },
      { who: 'pacMagma', col: 14, row: 3, way: 'right', speed: 1, range: 20 },
    ],
  }),

  // HILO GOODBYE: Hilo's bayfront and the airfield, where the two ways meet. In along the street from Kona; the old wooden storefronts (their roofs a coin, reached only by the drop from Akaka Falls), east to
  // the airfield where the yellow mail biplane waits: NO FLYING WITHOUT A PARACHUTE, TOO SLEEPY TO FLY. The rope at the street's end goes down to the coffee farm's lane. A rooster struts the street.
  room({
    id: PAC.hilo, cell: [3, 23], sector: 53, palette: HILO_PALETTE,
    paint: paintHilo,
    coins: HILO_COINS,
    decor: [...storefronts, [{ text: 'HILO', colour: 7 }, 6, 14], ['skyBiplane', BIPLANE_AT.col, BIPLANE_AT.row]],
    creatures: [{ who: 'pacRooster', col: 15, row: 17, way: 'right', speed: 1, range: 24 }],
  }),
];
