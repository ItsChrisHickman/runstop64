import type { CharAnim } from '../../montyotr/src/montydata';
import { WINDOW_SCENERY } from './art/siberia-decor';
import { WHEEL_FRAMES } from './art/siberia-tiles';
import type { WorldDecor } from './art/world';
import { codeOf, decorIndex, type Grid, type Palette } from './layout';

/**
 * The Trans-Siberian drawn as a train: a side view of its carriages on the rails, cut open as Monty on the Run cuts its rooms. A car is
 * the roof's walkway with its edge curving away under it (and the vents and a stovepipe on top), a row of windows with the snow going by,
 * the inside (the floor, the end walls with their gangways between the cars), the bogies' wheels and the rail and sleepers under them.
 * The train moves: the landscape slides past the windows, the sleepers under the car, the wheels turn (`trainAnims`, the engine's
 * `charAnims`). Every train room is a car of the same make, so these pieces are written once and the rooms (siberia.ts, the station in
 * moscow.ts) declare what is in each.
 */

/** The palette of a passenger car's rooms: the roof, the far wall behind him, the floor, the wheels, the rail, the end walls, a tunnel's granite and a ladder. */
export const TRAIN_PALETTE = {
  D: ['roofDeck', 12], E: ['carWall', 5], F: ['carFloor', 9], W: ['wheel', 2], L: ['rail', 12], T: ['trainSide', 5], X: ['tunnelFace', 12], R: ['ironLadder', 7],
} as const satisfies Palette;

/** The rows of a car (playfield rows): the roof's walkway, the floor Monty walks along inside, the wheels and the rail; and a gangway's two rows. */
export const CAR = { roof: 9, floor: 17, wheels: 18, rail: 19, gangwayTop: 15, gangwayBottom: 16 } as const;

/** A decoration as a room lists it: which, and its top left cell (a playfield column and row). */
export type Placed = readonly [WorldDecor, col: number, row: number];

/** The floor, the rail and the bogies' wheels of a car from column `from` to `to`: each bogie two wheels (at its column and two on) with an axle bar between. */
export function undercarriage(g: Grid, from: number, to: number, bogies: readonly number[]) {
  g.box(from, CAR.floor, to, CAR.floor, 'F').box(from, CAR.rail, to, CAR.rail, 'L');
  for (const c of bogies) g.box(c, CAR.wheels, c, CAR.wheels, 'W').box(c + 2, CAR.wheels, c + 2, CAR.wheels, 'W');
}

/** The axle bars of those bogies. */
export const bogieBars = (bogies: readonly number[]): readonly Placed[] => bogies.map((c) => ['bogieBar', c + 1, CAR.wheels] as const);

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

/** A gangway's bellows over the opening at a car's end (the left end at column 0, the right at 30). */
export const gangwayAt = (col: 0 | 30): Placed => ['gangway', col, CAR.gangwayTop];

/**
 * What moves in a car's room: the sleepers under it (the rail's character slides back, as the ground goes), the wheels turning, and the
 * landscape in its windows going by more slowly (if it has windows). The train runs east, so what is outside goes west. `fromCol`: where
 * Monty has to be for it to run (the station's car is standing until he is aboard); none for the cars that are always on their way.
 */
export function trainAnims(room: number, palette: Palette, windows: boolean, fromCol?: number): readonly CharAnim[] {
  const when = fromCol === undefined ? {} : { fromCol };
  return [
    { kind: 'scroll', room, rings: [[codeOf(palette, 'L')]], dx: -1, px: 2, every: 1, ...when },
    { kind: 'cycle', room, chars: [codeOf(palette, 'W')], frames: WHEEL_FRAMES, every: 3, ...when },
    ...(windows ? [{
      kind: 'scroll', room, rings: WINDOW_SCENERY.map((ring) => ring.map((cell) => ({ decor: decorIndex('trainWindow'), cell }))), dx: -1, px: 1, every: 1, ...when,
    } as const] : []),
  ];
}
