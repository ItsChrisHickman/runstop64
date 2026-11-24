import type { CharAnim } from '../../montyotr/src/montydata';
import { WINDOW_SCENERY } from './art/siberia-decor';
import { WHEEL_FRAMES } from './art/siberia-decor';
import type { WorldDecor } from './art/world';
import { PLAY_COLS, SCREEN_MARGIN } from '../../shared/monty/screen';
import { decorIndex, type Grid, type Palette } from './layout';

/**
 * The Trans-Siberian drawn as a train: a side view of its carriages on the rails, cut open as Monty on the Run cuts its rooms. A car is
 * the roof's walkway with its edge curving away under it (and the vents and a stovepipe on top), a row of windows with the snow going by,
 * the inside (the floor, the end walls with their gangways between the cars), the bogies' wheels and the rail and sleepers under them.
 * The train moves: the landscape slides past the windows, the sleepers under the car, the wheels turn (`trainAnims`, the engine's
 * `charAnims`). Every train room is a car of the same make, so these pieces are written once and the rooms (siberia.ts, the station in
 * moscow.ts) declare what is in each.
 */

/**
 * The palette of a passenger car's rooms (the outside in the carriages' maroon, the inside wall in wood: a cutaway shows the shell and the room in it): the roof, the far wall behind him, the floor, the end walls, a tunnel's stone portal, a ladder and the tunnel's
 * brick lining. (The wheels and the rail under the car are decorations, `underCar`: nothing there is walked on, and two of the eight codes are the tunnel's.)
 */
export const TRAIN_PALETTE = {
  D: ['roofDeck', 14], E: ['carWall', 8], F: ['carFloor', 9], T: ['trainSide', 2], X: ['tunnelFace', 15], R: ['ironLadder', 7], M: ['tunnelBrick', 2],
} as const satisfies Palette;

/** The rows of a car (playfield rows): the roof's walkway, the floor Monty walks along inside, the wheels and the rail; and a gangway's two rows. */
export const CAR = { roof: 9, floor: 17, wheels: 18, rail: 19, gangwayTop: 15, gangwayBottom: 16 } as const;

/** A decoration as a room lists it: which, and its top left cell (a playfield column and row). */
export type Placed = readonly [WorldDecor, col: number, row: number];

/** The floor of a car from column `from` to `to`. */
export function undercarriage(g: Grid, from: number, to: number) {
  g.box(from, CAR.floor, to, CAR.floor, 'F');
}

/**
 * What is under the floor, from column `from` to `to`: the rail on its sleepers (a character a cell, all of them one, so the sleepers slide together) and the
 * bogies' wheels, each bogie two (at its column and two on) with an axle bar between. Decorations, not tiles: nothing under the floor is walked on.
 */
export const underCar = (from: number, to: number, bogies: readonly number[]): readonly Placed[] => [
  // (the rail runs on out to the screen's edge where the car does)
  ...Array.from({ length: (to >= PLAY_COLS - 1 ? to + SCREEN_MARGIN : to) - (from <= 0 ? -SCREEN_MARGIN : from) + 1 }, (_, i): Placed => ['rail', (from <= 0 ? -SCREEN_MARGIN : from) + i, CAR.rail]),
  ...bogies.flatMap((c): Placed[] => [['wheel', c, CAR.wheels], ['wheel', c + 2, CAR.wheels], ['bogieBar', c + 1, CAR.wheels]]),
];

/** A hatch in the roof: three cells of the walkway cut away over a ladder that goes down into the car. */
export function hatch(g: Grid, col: number) {
  g.clear(col - 1, CAR.roof, col + 1, CAR.roof).box(col, CAR.roof, col, CAR.gangwayBottom, 'R');
}

/** The far wall of a car between its end walls (columns `from` to `to`), under the roof, down to the row above the car's inside. */
export function farWall(g: Grid, from: number, to: number) {
  g.box(from, CAR.roof + 1, to, CAR.gangwayTop - 1, 'E');
}

/** The buffers at a car's two ends (columns `from` and `to`), under the floor. */
export const buffersAt = (from: number, to: number): readonly Placed[] => [['buffer', from, CAR.wheels], ['buffer', to, CAR.wheels]];

/** A window: the decoration `trainWindow`, 5 x 4 characters, its top left cell. */
export const windowAt = (col: number, row = 11): Placed => ['trainWindow', col, row];

/**
 * What moves in a car's room: the sleepers under it (the rail's character slides back, as the ground goes), the wheels turning, and the
 * landscape in its windows going by more slowly (if it has windows). The train runs east, so what is outside goes west. `fromCol`: where
 * Monty has to be for it to run (the station's car is standing until he is aboard); none for the cars that are always on their way: they run from the moment
 * he is in the room, wherever he stands.
 */
export function trainAnims(room: number, windows: boolean, fromCol?: number): readonly CharAnim[] {
  const when = fromCol === undefined ? {} : { fromCol };
  return [
    { kind: 'scroll', room, rings: [[{ decor: decorIndex('rail'), cell: 0 }]], dx: -1, px: 2, every: 1, ...when },
    { kind: 'cycle', room, chars: [{ decor: decorIndex('wheel'), cell: 0 }], frames: WHEEL_FRAMES, every: 3, ...when },
    ...(windows ? [{
      kind: 'scroll', room, rings: WINDOW_SCENERY.map((ring) => ring.map((cell) => ({ decor: decorIndex('trainWindow'), cell }))), dx: -1, px: 1, every: 1, ...when,
    } as const] : []),
  ];
}

// ---- the sky above the train (art/siberia-sky.ts) ---------------------------------------------------------

/** Playfield columns, first to last inclusive, that a stretch of backdrop may fill: the tiles of the room (a rope through the sky, a boiler) stay clear of it. */
export type Span = readonly [from: number, to: number];

/** The rows the backdrop takes: smoke, the poles and their wires, the horizon (mountains over pines), two, two and three rows. */
export const SKY = { smoke: 2, wires: 4, horizon: 6 } as const;

/** Copies of a decoration `w` columns wide side by side along each span (they share their characters, so what moves in one moves in all). */
const along = (what: WorldDecor, w: number, row: number, spans: readonly Span[]): Placed[] =>
  spans.flatMap(([from, to]) => Array.from({ length: Math.floor((to - from + 1) / w) }, (_, i): Placed => [what, from + i * w, row]));

/**
 * What a room's sky holds: the spans of columns free of tiles, where the horizon goes (and the poles, unless `wires` says) if not the whole of `spans`, where the smoke may drift (none: none), and the moon and stars (pieces at
 * fixed cells). `dark`: Siberia's calm night (the reset): the horizon's dark picture (no white peaks) and no poles or wires.
 */
export interface SkySpec { spans: readonly Span[]; horizon?: readonly Span[]; wires?: readonly Span[]; smoke?: readonly Span[]; moon?: readonly [col: number, row: number]; stars?: readonly Placed[]; dark?: true }

/** The horizon's picture a sky uses. */
const horizonOf = (dark: boolean): WorldDecor => (dark ? 'horizonDark' : 'horizon');

/** The sky's decorations, to go first in a room's list so the car's own pieces (vents, a stovepipe) are drawn over them. */
export function skyDecor(s: SkySpec): readonly Placed[] {
  return [
    ...(s.moon ? [['moon', s.moon[0], s.moon[1]] as const] : []), ...(s.stars ?? []),
    ...along('smoke', 4, SKY.smoke, s.smoke ?? []), ...(s.dark ? [] : along('wires', 4, SKY.wires, s.wires ?? s.horizon ?? s.spans)), ...along(horizonOf(s.dark === true), 2, SKY.horizon, s.horizon ?? s.spans),
  ];
}

/**
 * What moves in the sky: the mountains slowest (a pixel every fourth step), the pines in front of them (every second), the poles with their wires and the
 * smoke at the pace of the windows' scenery (every step); all sliding west, as the train runs east. Nothing it draws is solid. `fromCol`: as `trainAnims`; `dark`: as the room's `SkySpec`;
 * `horizon`: false for a room whose sky has none (its `SkySpec.horizon` empty).
 */
export function skyAnims(room: number, smoke: boolean, fromCol?: number, dark = false, horizon = true): readonly CharAnim[] {
  const when = fromCol === undefined ? {} : { fromCol };
  const cells = (what: WorldDecor, ...rows: readonly (readonly number[])[]) => rows.map((row) => row.map((cell) => ({ decor: decorIndex(what), cell })));
  return [
    ...(horizon ? [
      { kind: 'scroll', room, rings: cells(horizonOf(dark), [0, 1], [2, 3]), dx: -1, px: 1, every: 4, ...when } as const,
      { kind: 'scroll', room, rings: cells(horizonOf(dark), [4, 5]), dx: -1, px: 1, every: 2, ...when } as const,
    ] : []),
    ...(dark ? [] : [{ kind: 'scroll', room, rings: cells('wires', [0, 1, 2, 3], [4, 5, 6, 7]), dx: -1, px: 1, every: 1, ...when } as const]),
    ...(smoke ? [{ kind: 'scroll', room, rings: cells('smoke', [0, 1, 2, 3], [4, 5, 6, 7]), dx: -1, px: 1, every: 1, ...when } as const] : []),
  ];
}
