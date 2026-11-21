/**
 * Moscow's route for the bot: the goals, in the order a player who takes everything plays them (every coin, every pirozhok, both
 * key items, then out along the station's carriage roof to the edge), as functions on the game. Shared by the bot test and the
 * pictures.
 */
import type { Game } from '../../montyotr/src/game';
import { ROOM } from '../src/moscow';
import type { Aim, Goal } from './bot';

/** The index of the n-th coin of a room (its place in the coin table). */
export function coinIndex(g: Game, room: number, col: number, row: number): number {
  const t = g.data.coinTable;
  for (let i = 0; i * 3 < t.length; i++) if (t[i * 3] === room && t[i * 3 + 1] === col && t[i * 3 + 2] === row) return i;
  throw new Error(`no coin at ${col},${row} of room ${room}`);
}

/** The special item (key item or pirozhok) of a room: its index in the table. */
export function itemIndex(g: Game, room: number, nth = 0): number {
  const t = g.data.specialItems;
  let n = 0;
  for (let i = 0; i * 4 < t.length; i++) if (t[i * 4] === room && n++ === nth) return i;
  throw new Error(`no item ${nth} in room ${room}`);
}

/** Monty's y standing on a floor row (the floor's top row; his top is two rows above). */
export const standY = (floor: number) => 0x32 + (floor - 2 + 3) * 8;

type Part = Pick<Leg, 'goal' | 'aim'>;

/** Into a room, heading for the spot of the room he is in that leads there (`via`: a cell of it). */
const into = (room: number, col: number, row: number, from: number, also: Goal = () => true): Part => ({ goal: (g) => g.roomId === room && !g.freeze && !g.script && also(g), aim: [{ room: from, col, row }] });
/** Above (a high way in) or below a floor row. */
const above = (floor: number): Goal => (g) => g.y < standY(floor);
/** A coin taken, and he is on his feet (or a rope) again: a leg that ended in mid-air would hand the next one a jump already committed. */
const settledOn: Goal = (g) => !g.montyAction && !g.falling && !g.gameMode && !g.freeze && !g.script;
const coin = (room: number, col: number, row: number): Part => ({ goal: (g) => g.coinCollected[coinIndex(g, room, col, row)] !== 0 && settledOn(g), aim: [{ room, col, row: row - 1 }] });
/** A special item of a room (its n-th), where its sprite is. */
const item = (room: number, nth = 0): Part => ({
  goal: (g) => g.siCollected[itemIndex(g, room, nth)] !== 0 && settledOn(g),
  aim: [{ room, col: ITEM_AT[room]?.[nth]?.[0] ?? 0, row: ITEM_AT[room]?.[nth]?.[1] ?? 0 }],
});
/** Standing in a room on a floor row, not in a ride. */
const stands = (room: number, floor: number, from: number, to: number): Part => ({
  goal: (g) => g.roomId === room && !g.freeze && !g.gameMode && !g.falling && !g.montyAction && g.y === standY(floor) && g.montyCol - 4 >= from && g.montyCol - 4 <= to,
  aim: [{ room, col: Math.round((from + to) / 2), row: floor - 2 }],
});
/** Where the items' sprites are (playfield cell of the top left): the same as the rooms say. */
const ITEM_AT: Readonly<Record<number, readonly (readonly [number, number])[]>> = {
  [ROOM.domes]: [[28, 4]], [ROOM.gum]: [[12, 7]], [ROOM.platform]: [[13, 3], [12, 13]],
};

export interface Leg { name: string; goal: Goal; aim: readonly Aim[] }
const leg = (name: string, p: Part): Leg => ({ name, ...p });

/** Everything, in order. */
export const LEGS: readonly Leg[] = [
  leg('A: the coin on the train roof', coin(ROOM.start, 20, 8)),
  leg('A to B: over the roof, the gantry, out high', into(ROOM.streets, 31, 5, ROOM.start)),
  leg('B: the coin under the beam', coin(ROOM.streets, 13, 15)),
  leg('B to F: the rope up to the arcade', into(ROOM.gum, 20, 0, ROOM.streets)),
  leg('F: the coin on the first ledge', coin(ROOM.gum, 8, 13)),
  leg('F: the metro token', item(ROOM.gum)),
  leg('F: the coin in the right pocket', coin(ROOM.gum, 26, 15)),
  leg('F to B: back down the rope', into(ROOM.streets, 20, 19, ROOM.gum)),
  leg('B: the coin on the walkway', coin(ROOM.streets, 28, 4)),
  leg('B to G: the manhole', into(ROOM.hall, 7, 18, ROOM.streets)),
  leg('G: down the escalator to the terrace', stands(ROOM.hall, 14, 18, 22)),
  leg('G: the coin on the lower floor', coin(ROOM.hall, 10, 15)),
  leg('G to H: through the turnstile', into(ROOM.platform, 31, 14, ROOM.hall)),
  leg('H: the ushanka', item(ROOM.platform, 1)),
  leg('H: the coin under the escalator', coin(ROOM.platform, 26, 15)),
  leg('H: up the escalator', stands(ROOM.platform, 9, 28, 31)),
  leg('H: the pirozhok on the high ledge', item(ROOM.platform, 0)),
  leg('H: the coin on the gallery', coin(ROOM.platform, 4, 7)),
  leg('H to G: the gallery to the hall\'s stub', into(ROOM.hall, 0, 7, ROOM.platform)),
  leg('G to B: the rope up to the street', into(ROOM.streets, 3, 0, ROOM.hall)),
  leg('B to C: out of the street, low', into(ROOM.square, 31, 14, ROOM.streets, (g) => !above(10)(g))),
  leg('C: the coin past the drain (low lane)', coin(ROOM.square, 26, 15)),
  leg('C to B: back out of the low lane', into(ROOM.streets, 0, 14, ROOM.square)),
  leg('B: up the crates and the fire escape to the walkway', stands(ROOM.streets, 6, 24, 31)),
  leg('B to C: out of the street, high (the walkway)', into(ROOM.square, 31, 4, ROOM.streets, above(10))),
  leg('C: the high lane\'s coin', coin(ROOM.square, 14, 4)),
  leg('C to D: the flagpole rope', into(ROOM.domes, 25, 0, ROOM.square)),
  leg('D: the coin on the stair', coin(ROOM.domes, 7, 11)),
  leg('D: up the stair to the dome tops', stands(ROOM.domes, 6, 14, 17)),
  leg('D: the coin over the gap between the domes', coin(ROOM.domes, 19, 4)),
  leg('D: the pirozhok', item(ROOM.domes)),
  leg('D to K: the way out, high', into(ROOM.kremlin, 31, 4, ROOM.domes)),
  leg('K: the coin past the gorge (the guard has stepped aside)', coin(ROOM.kremlin, 25, 4)),
  leg('K to I: the drop', into(ROOM.station, 16, 18, ROOM.kremlin)),
  leg('I: the coin in the pocket', coin(ROOM.station, 2, 16)),
  leg('I: along the roof to the edge', stands(ROOM.station, 9, 27, 28)),
];
