/**
 * ENHANCED's sparkles: where in the screen the game's puzzles and ways out are, read from the game's own state (`Game`, the rooms'
 * scripts), never from a timer of the view's. Each one marks something the original lets you find out only by dying or by luck, and
 * only while it is what moves the game on: a hazard gets none, and a thing that kills in one picture and saves in another is marked
 * in the picture that saves. Places are the middle of the thing in the Spectrum's 256 x 192 picture; the view shifts them into the
 * surface (`MoleyView.sparkle`) and c64kit's `Sparkles` draws the stardust.
 *
 * | Room | Sparkle | While |
 * |---|---|---|
 * | 0 | the exit cassette | no item is left and the cassette is showing (it hangs, drifts, falls; touched on the floor it is the way out for 3 passes, then it is gone and kills) |
 * | 1 | the exit object | no item is left and the exit object is on its way (stage `$64`) and not yet sunk to where it kills (y < `$50`) |
 * | 2 | the one spot (x `$2E`, y `$38`) | the puzzle has not started |
 * | 2 | the prize | its second half shows its last picture (`$24`): touching it is the way out; in the three before, it kills |
 * | 3 | the right end of the lane he is on | always (the lanes lead into one another that way; the bottom lane's end is the exit) |
 * | 3 | the way past the parked car, just right of it | he is on the bottom lane, short of it, and the car is asleep (after it has woken and finished; awake it eats whoever is by it) |
 * | 4 | the exit | it is open (not in its last pass) and no item is left |
 * | 5 | the pile | he is not carrying a paper |
 * | 5 | the NEWS shop | he is carrying one |
 *
 * Not marked, being hazards: the lamps, reels, walkers, traffic and pistons, the machines' flash in screen 1, the pit in screen 2, the parked
 * car while it can wake in screen 3 (by it when it wakes is the death), the lorry. Items are not marked: the items-left count
 * in the pocket box (the ENHANCED row before this one) says how many are left, and they are drawn in changing colours.
 */
import { BLANK_FRAME } from './data';
import type { Game } from './game';

/** What a sparkle marks. */
export type HintKind = 'spot' | 'prize' | 'exit' | 'lane' | 'past' | 'pile' | 'shop';

/** A place to sparkle: the middle of the thing, in the Spectrum's picture (256 x 192) pixels. */
export interface Hint {
  readonly kind: HintKind;
  readonly x: number;
  readonly y: number;
}

/** A 16 x 16 thing at x, y: its middle. */
const middle = (kind: HintKind, x: number, y: number): Hint => ({ kind, x: x + 8, y: y + 8 });

/** Room 2's spot where the puzzle starts: Monty's x and y (`$95E4`). */
export const SPOT = { x: 0x2e, y: 0x38 } as const;
/** Room 2's prize: the halves' column, and the row between them (the top half is at y `$60`, the bottom at `$70`). */
const PRIZE = { x: 0xdc, y: 0x68 } as const;
/** The picture on which the prize's second half is the way out (`$965C`). */
export const PRIZE_LAST = 0x24;
/** Room 1's exit object is on its way once the stage has counted to this (`$94E5`), and it kills from this row (`$9516`). */
const ROOM1_EXIT_STAGE = 0x64;
const ROOM1_EXIT_KILLS = 0x50;
/** Room 3: Monty leaves a lane to the right from this x on (`$9AC7`). */
export const LANE_END = 0xec;
/** Room 3's parked car (entity 6, x `$91`, y `$78`) wakes when Monty is at x `$8C`-`$9B` on the bottom lane; from x `$9C` on he is past it. */
export const CAR_PAST = 0x9c;
const LANE_ROWS_BOTTOM = 0x78;
/** The lane a row is in, as the game's own wrap tells them apart (`$9AC7`): above row 9 the top (walked on at y 8), above row `$41` the middle (y `$40`), else the bottom (y `$78`). */
export function laneOf(y: number): { readonly row: number; readonly bottom: boolean } {
  if (y < 0x09) return { row: 0x08, bottom: false };
  if (y < 0x41) return { row: 0x40, bottom: false };
  return { row: 0x78, bottom: true };
}

/** The sparkles for the game as it is after a pass. None while a room has only just been entered (its things are not yet placed) or the game is over. */
export function hintsOf(game: Game): Hint[] {
  if (game.first || game.lives < 0 || game.ended) return [];
  const e = game.entities;
  const r = game.rooms;
  const noneLeft = game.itemsLeft === 0;
  switch (game.room) {
    case 0: {
      const cassette = e[6];
      return noneLeft && cassette.frame !== BLANK_FRAME ? [middle('exit', cassette.x, cassette.y)] : [];
    }
    case 1: {
      const exit = e[2];
      return noneLeft && r.r1.stage === ROOM1_EXIT_STAGE && exit.y < ROOM1_EXIT_KILLS ? [middle('exit', exit.x, exit.y)] : [];
    }
    case 2: {
      if (r.r2.puzzle === 0) return [middle('spot', SPOT.x, SPOT.y)];
      return e[5].frame === PRIZE_LAST ? [middle('prize', PRIZE.x, PRIZE.y)] : [];
    }
    case 3: {
      const lane = laneOf(game.monty.y);
      const end = middle(lane.bottom ? 'exit' : 'lane', LANE_END, lane.row);
      // the parked car on the bottom lane catches whoever is by it when it wakes; while it sleeps (after a waking, 30 to 127 passes) it is safe to go by
      const asleep = r.r3.waking === 0 && r.r3.sleep !== 0;
      return lane.bottom && asleep && game.monty.x < CAR_PAST ? [middle('past', CAR_PAST, LANE_ROWS_BOTTOM), end] : [end];
    }
    case 4: {
      const open = r.r4.open;
      return noneLeft && open >= 2 ? [middle('exit', e[3].x, e[3].y)] : [];
    }
    case 5: {
      const spot = r.r5.carrying === 0 ? e[6] : e[7];
      return [middle(r.r5.carrying === 0 ? 'pile' : 'shop', spot.x, spot.y)];
    }
    default:
      return [];
  }
}
