import type { Arrival, CharAnim, CurrentSpec, PlaneLeg, PlaneLook, PulseSpec, PursuerSpec, RollerSpec, TunnelSpec } from '../../montyotr/src/montydata';
import type { RoomSpec, Sector } from '../../shared/monty/rooms';
import { BIRD_COLOURS, BIRD_PICTURES, PLANE_COLOUR, PLANE_PICTURES, VIKTOR_HEAD_INK, VIKTOR_HEAD_PICTURE, VIKTOR_PLANE_PICTURES } from './art/sky';
import { codeOf, decorIndex, room, type Palette } from './layout';

/**
 * THE FLIGHT, Hilo to the Andes (docs/dosvidaniya-flight.md): on Hilo's apron Monty, with the parachute, takes the yellow mail biplane (pacific.ts `biplaneBoarding`), and flies three legs east, a room each, about 75 seconds
 * in all, to the Andes, where Viktor clips his tail and he bails out into JUMP FOR JOY. The legs are on the exit grid's top row over the Andes' columns, where nothing else is beside them:
 *
 *            col 20               col 21                 col 22
 *   row 0   L1 THE MAIL RUN ==> L2 STORMY WEATHER ==> L3 ON HIS TAIL    (the clock moves him on, where he is: planes.ts)
 *   row 2   F1 JUMP FOR JOY  <== the bail-out from L3 (into its top)
 *
 * L1 is birds and Kilauea: Vs of gulls, a frigatebird that screeches as it comes in high and dives, a slow albatross, and the volcano going by below with its plume (clear air above it). L2 is weather: under a
 * storm front whose clouds flicker before the lightning strikes down a column, gusts (seen by their streaks) that lift him off the safe low line into the bolts' height, a waterspout to go over, and three
 * coins: one on the low line, two in the gaps between bolts. L3 is Viktor: his red plane flies Monty's own path, three seconds behind and closing to one (he copies you: touching him is death); a flock or a
 * bolt Monty slips past catches him a moment later and knocks him back. The Andes rise along the bottom, and at the end he surges and clips Monty's tail: Viktor wins the round.
 * Sprites: Monty (3) in the plane (2), his lei (7), Viktor's red biplane (4, the star on his hat in it) with his white head under it (6, L3), the birds on 0, 1, 5 (and 6 in L1), each pass on the leg's clock. The bands slide by as Auf Wiedersehen Monty's do: the far wisps half a pixel a
 * frame, the low cloud a pixel, the sea two. Playfield cells as in moscow.ts.
 */

// ---- the ids ---------------------------------------------------------------------------------------------
/** The legs' rooms, after Rio's (67-77) and the Andes' retired 78: new rooms come last, so no shipped room's coins or finds move. */
export const FLY = { mail: 79, storm: 80, tail: 81 } as const;

/** The sectors' names by their place from 78 (78 is retired: none). */
const NAMES = ['', 'THE MAIL RUN', 'STORMY WEATHER', 'ON HIS TAIL'] as const;
export const SKY_SECTORS: readonly Sector[] = NAMES.map((text) => ({ col: Math.floor((32 - text.length) / 2), text }));
/** The map's colour of each (the sky's light blue). */
export const SKY_COLOURS: readonly number[] = [0, 14, 14, 14];

/** The banner on taking off. One name row: 32 letters. */
export const SKY_ARRIVALS: readonly Arrival[] = [{ rooms: [FLY.mail, FLY.storm, FLY.tail], text: 'BY AIR MAIL TO THE ANDES' }];

/** The first leg's cell, where the biplane on Hilo's apron takes him (pacific.ts `biplaneBoarding`). */
export const TAKE_OFF = { mapRow: 0, exitCol: 25 } as const;

// ---- the pictures (in the creature slots' blocks while a leg is loaded: the legs have no creatures but Viktor, in slot 0) ----------------------

/** The plane's pictures and the birds', in slots 1-3's blocks ($38-$4F). */
export const SKY_POINTERS = {
  level: 0x38, climb: 0x39, dive: 0x3a, wreck: 0x3b, gull: [0x3c, 0x3d, 0x3e, 0x3f], frigate: [0x40, 0x41, 0x42, 0x43], albatross: [0x44, 0x45, 0x46, 0x47],
  viktor: [0x48, 0x49, 0x4a, 0x4b], head: 0x4c,
} as const;
export const SKY_BLOCKS: readonly { ptr: number; block: Uint8Array }[] = [
  { ptr: SKY_POINTERS.level, block: PLANE_PICTURES.level }, { ptr: SKY_POINTERS.climb, block: PLANE_PICTURES.climb },
  { ptr: SKY_POINTERS.dive, block: PLANE_PICTURES.dive }, { ptr: SKY_POINTERS.wreck, block: PLANE_PICTURES.wreck },
  ...(['gull', 'frigate', 'albatross'] as const).flatMap((kind) => SKY_POINTERS[kind].map((ptr, i) => ({ ptr, block: BIRD_PICTURES[kind][i] ?? new Uint8Array(64) }))),
  ...SKY_POINTERS.viktor.map((ptr, i) => ({ ptr, block: VIKTOR_PLANE_PICTURES[i] ?? new Uint8Array(64) })), { ptr: SKY_POINTERS.head, block: VIKTOR_HEAD_PICTURE },
];

/** The plane over Monty (he sits in it in his walking picture facing east, `seat`): two pixels a step left of him (x2 units) and four pixels up, so his head is under its top wing. */
export const PLANE_LOOK: PlaneLook = { level: SKY_POINTERS.level, climb: SKY_POINTERS.climb, dive: SKY_POINTERS.dive, wreck: SKY_POINTERS.wreck, colour: PLANE_COLOUR, seat: 0x54, dx: -2, dy: -4 };

// ---- the palettes ----------------------------------------------------------------------------------------
/** L1: the sea's crest and swell; Kilauea's ash, its lighter puffs, the crater's glow and the cone. */
export const MAIL_PALETTE = {
  W: ['skyCrest', 14], S: ['skySea', 6], A: ['skyAsh', 11], P: ['skyPuff', 12], G: ['skyGlow', 2], K: ['skyCone', 9],
} as const satisfies Palette;
/** L2: the storm front, lit and dark, the bolt, the gusts' streaks, the waterspout, the sea. */
export const STORM_PALETTE = {
  C: ['skyStorm', 11], L: ['skyStormLit', 1], B: ['skyBolt', 7], T: ['skyStreak', 14], U: ['skySpout', 3], W: ['skyCrest', 14], S: ['skySea', 6],
} as const satisfies Palette;
/** L3: the storm's tail and its bolts, the sea, the Andes' rock and snow. */
export const TAIL_PALETTE = {
  C: ['skyStorm', 11], L: ['skyStormLit', 1], B: ['skyBolt', 7], W: ['skyCrest', 14], S: ['skySea', 6], R: ['skyPeak', 9], N: ['skySnow', 1],
} as const satisfies Palette;

// ---- the legs ----------------------------------------------------------------------------------------------
/** How long each leg is flown (frames), and the bail-out's parts: Viktor's surge to the tail, and the drop under the canopy. */
export const LEG_FRAMES = 1250;
export const BAIL = { surge: 60, drop: 110 } as const;

/**
 * The lowest row his top left may be in: down to just above the sea (Chris, 2026-11-24: "On his tail has a vertical limit that's very very high. Why can't I travel to the bottom?": L3 stopped him at
 * row 10, half the sky up, the whole leg). The plane's wheels are 16 pixels under his top, so on row 14 they are a cell above the sea's crest (row 17), in front of the low cloud. In L3 the Andes rise
 * along the bottom near the leg's end (`ANDES_RISE`, from the right): from then the bottom is row 12, the wheels a cell above the valleys' snow (row 15), and a plane lower down is lifted over them; the
 * peaks above that are scenery he flies in front of (harmless, as the sea is).
 */
const LOWEST = { sea: 14, andes: 12 } as const;
/** The frame of L3 the Andes come in at the right (SKY_TUNNELS' peaks). */
const ANDES_RISE = 820;
/** The legs, given the find Viktor's win takes (data.ts: hidden). Their tops are under each leg's cloud: L2's storm front (rows 0-2), L3's storm's tail. */
export const planeLegs = (lost: number): readonly PlaneLeg[] => [
  { room: FLY.mail, frames: LEG_FRAMES, box: { col0: 1, row0: 1, col1: 28, row1: LOWEST.sea }, then: { kind: 'east' } },
  { room: FLY.storm, frames: LEG_FRAMES, box: { col0: 1, row0: 3, col1: 28, row1: LOWEST.sea }, then: { kind: 'east' } },
  { room: FLY.tail, frames: LEG_FRAMES, box: { col0: 2, row0: 2, col1: 28, row1: LOWEST.sea }, rise: { at: ANDES_RISE, row1: LOWEST.andes }, then: { kind: 'bail', to: { mapRow: 2, exitCol: 25 }, viktor: 0, surge: BAIL.surge, drop: BAIL.drop, lost } },
];

/** The band placements: a 12-wide strip three times across the picture's 36 columns (from the left margin, -2). */
const across = (piece: 'skyWisps' | 'skyLowCloud', row: number) => [-2, 10, 22].map((col) => [piece, col, row] as const);

/** The sea along the bottom (the crest on row 17, the swell below). */
const sea = (g: { box: (c0: number, r0: number, c1: number, r1: number, l: string) => unknown }) => { g.box(0, 17, 31, 17, 'W'); g.box(0, 18, 31, 19, 'S'); };

export const SKY_ROOMS: readonly RoomSpec[] = [
  // L1 THE MAIL RUN: off Hilo's apron and out over the sea; the volcano goes by below. The coin high on the right, for the climb over the plume.
  room({
    id: FLY.mail, cell: [0, 25], sector: 79, palette: MAIL_PALETTE,
    paint(g) { sea(g); },
    coins: [[24, 2]],
    decor: [...across('skyWisps', 0), ...across('skyLowCloud', 15)],
  }),
  // L2 STORMY WEATHER: under the storm front (rows 0-1); the bolts strike down to row 12, so the low line (rows 13-15) is safe until a gust lifts him off it. The coins: one on the low line, two between bolts.
  room({
    id: FLY.storm, cell: [0, 26], sector: 80, palette: STORM_PALETTE,
    paint(g) { g.box(0, 0, 31, 1, 'C'); for (const c of [0, 8, 15, 22, 29]) g.box(c, 2, c + 2, 2, 'C'); sea(g); }, // (its lumpy underside between the bolts' columns)
    coins: [[16, 14], [9, 7], [23, 5]],
    decor: [...across('skyLowCloud', 15)],
  }),
  // L3 ON HIS TAIL: the storm's trailing edge behind him at the top left, its last two bolts; Viktor on his trail; the Andes rising along the bottom.
  room({
    id: FLY.tail, cell: [0, 27], sector: 81, palette: TAIL_PALETTE,
    paint(g) { g.box(0, 0, 13, 1, 'C'); for (const c of [0, 6, 11]) g.box(c, 2, c + 1, 2, 'C'); sea(g); },
    decor: [...across('skyWisps', 0), ...across('skyLowCloud', 15)],
    creatures: [{ who: 'viktorPlane', col: 0, row: 6, way: 'right', speed: 1, range: 1 }],
  }),
];

// ---- the bands going by (charAnims: each strip's characters slide west; a step is every other frame) -------------------------------------------

/** A band's rings: its decoration's characters row by row (12 a row). */
const rings = (piece: 'skyWisps' | 'skyLowCloud', rows: number) => Array.from({ length: rows }, (_, r) => Array.from({ length: 12 }, (_, c) => ({ decor: decorIndex(piece), cell: r * 12 + c })));

function bands(room: number, palette: Palette, wisps: boolean): CharAnim[] {
  return [
    ...(wisps ? [{ kind: 'scroll', room, rings: rings('skyWisps', 1), dx: -1, px: 1, every: 1 } as const] : []), // half a pixel a frame
    { kind: 'scroll', room, rings: rings('skyLowCloud', 2), dx: -1, px: 2, every: 1 }, // a pixel a frame
    { kind: 'scroll', room, rings: [[codeOf(palette, 'W')], [codeOf(palette, 'S')]], dx: -1, px: 4, every: 1 }, // the sea, two pixels a frame
  ];
}
export const SKY_ANIMS: readonly CharAnim[] = [...bands(FLY.mail, MAIL_PALETTE, true), ...bands(FLY.storm, STORM_PALETTE, false), ...bands(FLY.tail, TAIL_PALETTE, true)];

// ---- the birds (rollers: once each, on the leg's clock) --------------------------------------------------------------------------------

/** A pass that comes once, `start` frames into the leg, along `path` (playfield cells of its top left) at `speed` pixels a frame. */
const pass = (room: number, sprite: number, kind: keyof typeof BIRD_COLOURS, start: number, path: RollerSpec['path'], speed: number, sound?: number): RollerSpec => ({
  room, sprite, path, speed, every: 2000, start, passes: 1, frames: SKY_POINTERS[kind], colour: BIRD_COLOURS[kind], ...(sound === undefined ? {} : { sound }),
});
/** A V of gulls straight across at a row, head on (two pixels a frame). */
const gulls = (room: number, sprite: number, start: number, row: number): RollerSpec => pass(room, sprite, 'gull', start, [[36, row], [-6, row]], 2);
/** The frigatebird: in high from the east, a dive across, and away low (its screech as it comes, a second before it shows: the effect `screech`). */
const frigate = (room: number, sprite: number, start: number, high: number, at: number, low: number, screech: number): RollerSpec =>
  pass(room, sprite, 'frigate', start, [[36, high], [at, high], [at - 12, low], [-6, low]], 2, screech);

/** Every bird of the flight, given the screech's sound effect. */
export const skyRollers = (screech: number): readonly RollerSpec[] => [
  // L1: gulls low then high (over the plume's top: duck under them), the frigatebird twice, the albatross slow across the middle, gulls at both heights at the end
  gulls(FLY.mail, 0, 100, 10),
  gulls(FLY.mail, 1, 280, 2),
  gulls(FLY.mail, 0, 430, 4),
  frigate(FLY.mail, 5, 520, 1, 22, 13, screech),
  gulls(FLY.mail, 0, 640, 12),
  gulls(FLY.mail, 1, 680, 5),
  pass(FLY.mail, 6, 'albatross', 760, [[36, 8], [-6, 8]], 1),
  frigate(FLY.mail, 5, 900, 2, 26, 14, screech),
  gulls(FLY.mail, 0, 980, 13),
  gulls(FLY.mail, 1, 1010, 3),
  // L3: flocks to slip past (and lead him into), one a little after another at heights that make him weave (sprites 0, 1 and 5: 4 and 6 are Viktor and his star)
  gulls(FLY.tail, 0, 200, 4),
  gulls(FLY.tail, 1, 330, 8),
  gulls(FLY.tail, 1, 500, 3),
  gulls(FLY.tail, 0, 520, 9),
  pass(FLY.tail, 5, 'albatross', 560, [[36, 6], [-6, 6]], 1),
  gulls(FLY.tail, 1, 700, 2),
  gulls(FLY.tail, 0, 760, 10),
  gulls(FLY.tail, 5, 900, 5),
  frigate(FLY.tail, 1, 930, 2, 24, 9, screech),
];

// ---- what is drawn in characters: the plume, the waterspout, the peaks (tunnels: once each), the lightning and the gusts' streaks (pulses) -------------

/** A picture written in a palette's letters ('.' leaves the cell as the room has it). */
const picture = (palette: Palette, rows: readonly string[]) => rows.map((row) => [...row].map((ch) => (ch === '.' ? 0 : codeOf(palette, ch))));

/** Kilauea's cone and plume, from row 6 down to the sea: clear air above it (rows 0-5). */
const PLUME = picture(MAIL_PALETTE, [
  '.PPAAPP.', 'PAAAAAAP', '.PAAAAP.', '..AAAA..', '..AAA...', '...AAA..', '..AAAA..', '..AAA...', '...AA...', '...GG...', '..KGGK..', '.KKKKKK.', 'KKKKKKKK', 'KKKKKKKK',
]);
/** The waterspout: a twisting funnel from the sea up to row 5, the spray at its foot; clear air above it (rows 3-4: he goes over it, under the storm). */
const SPOUT = picture(STORM_PALETTE, [
  '.UU', 'UUU', '.UU', 'UU.', '.UU', 'UU.', '.UU', 'UU.', '.UU', 'UU.', 'UUU', 'UUU', 'UUU', 'UUU', 'UUU',
]);
/** The Andes along the bottom (rows 11-19): a hundred columns of peaks, snow on their tops. */
const PEAKS = (() => {
  /** Each peak's column and height (cells): steep sides, a cell a column, the high ones snow-capped two cells deep. */
  const peaks = [[4, 5], [11, 8], [17, 6], [24, 9], [31, 7], [37, 5], [43, 9], [50, 8], [56, 6], [62, 9], [69, 7], [75, 9], [82, 6], [88, 8], [95, 7]] as const;
  const height = (c: number) => Math.max(5, ...peaks.map(([at, h]) => h - Math.abs(c - at)));
  const snowAt = (c: number) => Math.max(...peaks.map(([at, h]) => (h >= 7 ? h - Math.abs(c - at) - (h - 2) : -1)));
  const rows = Array.from({ length: 9 }, (_, r) => Array.from({ length: 100 }, (_, c) => {
    const top = 9 - Math.min(9, height(c));
    return r < top ? '.' : r < top + 1 + Math.max(0, snowAt(c)) ? 'N' : 'R';
  }).join(''));
  return picture(TAIL_PALETTE, rows);
})();

export const SKY_TUNNELS: readonly TunnelSpec[] = [
  { room: FLY.mail, from: 'right', code: codeOf(MAIL_PALETTE, 'A'), cols: 8, top: 6, bottom: 19, step: 6, rest: 200, warn: 0, picture: PLUME, once: true, bleed: true },
  { room: FLY.storm, from: 'right', code: codeOf(STORM_PALETTE, 'U'), cols: 3, top: 5, bottom: 19, step: 6, rest: 640, warn: 0, picture: SPOUT, once: true, bleed: true },
  { room: FLY.tail, from: 'right', code: codeOf(TAIL_PALETTE, 'R'), cols: 100, top: 11, bottom: 19, step: 6, rest: ANDES_RISE, warn: 0, picture: PEAKS, once: true, bleed: true, harmless: true },
];

/** A strike: the storm's cells over the column flicker lit (the warning) and stay lit while the bolt is down the column (two cells wide, from row 2, under the cloud's base, to `bottom`), deadly. */
function strike(room: number, palette: Palette, col: number, bottom: number, period: number, offset: number): PulseSpec[] {
  const timing = { period, start: 100, warn: 36, live: 14, offset } as const;
  return [
    { room, col: col - 1, row: 1, cols: 4, rows: 1, ...timing, idle: codeOf(palette, 'C'), warnCode: codeOf(palette, 'L'), liveCode: codeOf(palette, 'L'), spent: codeOf(palette, 'C') },
    { room, col, row: 2, cols: 2, rows: bottom - 1, ...timing, idle: 0, warnCode: 0, liveCode: codeOf(palette, 'B'), spent: 0 },
  ];
}
/** L2's gusts: an updraft every 240 frames, 50 frames long, lifting him off the low line; its streaks show from 30 frames before it blows until it is spent (harmless pulses). */
export const GUST = { period: 240, start: 90, warn: 30, length: 50 } as const;
const GUST_COLS = [[2, 7], [15, 18]] as const;

export const SKY_PULSES: readonly PulseSpec[] = [
  ...[5, 12, 19, 26].flatMap((col, i) => strike(FLY.storm, STORM_PALETTE, col, 12, 180, i * 45)),
  ...GUST_COLS.flatMap(([c0, c1]) => [c0, c1].map((col): PulseSpec => ({
    room: FLY.storm, col, row: 13, cols: 1, rows: 2, period: GUST.period, start: GUST.start - GUST.warn, warn: GUST.warn + GUST.length, live: 0,
    idle: 0, warnCode: codeOf(STORM_PALETTE, 'T'), liveCode: codeOf(STORM_PALETTE, 'T'), spent: 0,
  }))),
  ...[3, 9].flatMap((col, i) => strike(FLY.tail, TAIL_PALETTE, col, 10, 160, i * 80)),
];
export const SKY_CURRENTS: readonly CurrentSpec[] = GUST_COLS.map(([c0, c1]): CurrentSpec => ({
  room: FLY.storm, col: c0, cols: c1 - c0 + 1, top: 3, bottom: 14, dx: 0, dy: -1, period: GUST.period, start: GUST.start, length: GUST.length,
}));

// ---- Viktor on his tail ------------------------------------------------------------------------------------
/**
 * L3's pursuer: the creature in slot 0 (his red plane) flies Monty's path 150 frames behind, from the moment the leg begins, and closes in a frame every 6 frames to 50 (a second: let the plane rest against the
 * box's edge that long and he is on him). A flock or a bolt that meets his plane knocks him back 60 frames along the trail. He is not escaped: the leg's end is his (planes.ts, the bail-out takes `lost`).
 */
export const TAIL_CHASE = { delay: 150, close: { every: 6, least: 50 }, setback: 60 } as const;
export const tailPursuer = (lost: number): PursuerSpec => ({
  room: FLY.tail, slot: 0, delay: TAIL_CHASE.delay, until: lost, close: TAIL_CHASE.close, knockedBy: { rollers: true, pulses: true, setback: TAIL_CHASE.setback },
  // his red biplane (the star on his hat in it), placed as Monty's is over Monty, and his head in white under it on sprite 6
  look: { frames: SKY_POINTERS.viktor, dx: PLANE_LOOK.dx, dy: PLANE_LOOK.dy, over: { sprite: 6, ptr: SKY_POINTERS.head, colour: VIKTOR_HEAD_INK } },
});
