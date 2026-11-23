/**
 * Rio's route for the bot: the goals, in the order a player who takes everything plays them (docs/dosvidaniya-reset.md, "Rio (the last level)": up the Redeemer and off his east hand, down through the favela, along Lapa's
 * street under the track to Sugarloaf's foot, where the winch is dead; up the climbers' rope and west onto the track, over its gap on the tram, up the ladder into the churrascaria for the crank and back past the gauchos;
 * down through the gap and back to Sugarloaf, the crank works the winch and the car goes up; the Sambadrome's showdown; the beach), as functions on the game. Shared by the bot test and the pictures.
 */
import type { Game } from '../../montyotr/src/game';
import { RIO_ROOM as R } from '../src/rio';
import { AND } from '../src/andes';
import { copy, frame } from '../../montyotr/test/play';
import { ACTIONS } from '../../shared/monty/test/bot';
import { coin, coinIndex, into, item, leg, settledOn, stands, type Leg, type Part } from './route';

/** A leg's goal reached with some move that lives on for `frames` more (a coin taken in front of a creature that is about to reach him is no coin taken: the bot's own check looks only 12 frames ahead). */
export const livesFor = (part: Part, frames: number): Part => ({
  goal: (g) => part.goal(g) && ACTIONS.some(([, stick]) => {
    const t = { g: copy(g), col: 0 };
    for (let f = 0; f < frames; f++) { frame(t, stick); if (t.g.actionCounter !== 0) return false; }
    return true;
  }),
  aim: part.aim,
});

/** The Sambadrome's lever and booth, by the data (the crank fitted, the agent squashed: finds no room shows). */
const lever = (g: Game) => {
  const l = g.data.levers[0];
  if (!l) throw new Error('no lever in the data');
  return l;
};
/** A goal in the Sambadrome, guided to a cell. */
const inDrum = (goal: (g: Game) => boolean, col: number, row: number): Part => ({ goal: (g) => g.roomId === R.drum && goal(g) && settledOn(g), aim: [{ room: R.drum, col, row }] });

/** Every leg has a name of its own (the bot's kept routes are by name). */
export const RIO_LEGS: readonly Leg[] = [
  leg('C: off the canopy to the forest floor, the coin in the marmoset\'s run', livesFor(coin(R.arms, 4, 13), 40)),
  leg('C: up the west ladder to the west arm, the snack on its hand', item(R.arms, 0, [4, 2])),
  leg('C: down, through the chapel, up the east ladder and along the east arm, the coin on the hand', livesFor(coin(R.arms, 28, 3), 40)),
  leg('C to F: off the hand, out east', into(R.colour, 31, 7, R.arms)),
  leg('F: down between the houses to the alley, over the ladder\'s hole, the snack by the tank', livesFor(item(R.colour, 0, [3, 12]), 40)),
  leg('F: down the ladder to the lane, the coin under the football', livesFor(coin(R.colour, 27, 17), 40)),
  leg('F to L: out east, low', into(R.lap, 31, 17, R.colour)),
  leg('L: the street\'s coin in the bat\'s bay', livesFor(coin(R.lap, 21, 17), 40)),
  leg('L to S: on along the street', into(R.sugar, 31, 17, R.lap)),
  leg('S: up the climbers\' rope, the coin at the ledge\'s end', coin(R.sugar, 7, 7)),
  leg('S to L: west onto the track', into(R.lap, 0, 7, R.sugar)),
  leg('L: on the tram over the gap, the coin on the track\'s west part', coin(R.lap, 7, 7)),
  leg('L to W: up the ladder into the churrascaria', into(R.steak, 5, 0, R.lap)),
  leg('W: past the first gaucho, the coin between the arcs', livesFor(coin(R.steak, 17, 17), 40)),
  leg('W: up the steps past the second gaucho, the crank', livesFor(item(R.steak, 0, [28, 10]), 40)),
  leg('W to L: back past both gauchos and down the ladder', into(R.lap, 5, 19, R.steak)),
  leg('L: through the gap to the street', stands(R.lap, 18, 10, 20)),
  leg('L to S: along the street', into(R.sugar, 31, 17, R.lap)),
  leg('S: up the ladder, the bars gone, onto the car and up to the top station', stands(R.sugar, 8, 25, 31)),
  leg('S to D: out east from the top station', into(R.drum, 31, 7, R.sugar)),
  leg('D: the headdress on the drum riser', livesFor(item(R.drum, 0, [7, 4]), 40)),
  leg('D: down the rope onto the float, its coin, and off its east end to the lever (it only rattles)', inDrum((g) => g.leverLatch && g.coinCollected[coinIndex(g, R.drum, 18, 8)] !== 0, 22, 15)),
  leg('D: up the ladder to the booth, the crank fitted', inDrum((g) => !!g.siCollected[lever(g).armed], 28, 2)),
  leg('D: west along the gantry and down the rope to the avenue', stands(R.drum, 18, 9, 14)),
  leg('D: east under the float\'s head, the lever as the agent is under it', inDrum((g) => !!g.siCollected[lever(g).done], 21, 15)),
  leg('D to B: the bars lifted, out east to the beach', into(R.bust, 31, 17, R.drum)),
  leg('B: onto the promenade', stands(R.bust, 18, 2, 6)),
];

/** The Andes' last room (the kapok's crown), where Rio is come into from (the route starts in C as a player arrives from it). */
export const FROM = AND.kapok;
