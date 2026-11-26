/**
 * Rio's route for the bot: the goals, in the order a player who takes everything plays them (docs/dosvidaniya-back-half-plan.md, "Rio": up the Redeemer and off his east hand, down through the favela, along Lapa's
 * street under the track into the carnival's street; the coins' detour up the Selaron steps and west onto the track, over its gap on the tram, up the ladder into the churrascaria past the gauchos and back; down through
 * the gap and east again into the carnival: over the bateria's risers, across the canal on the floats both ways (the crank on the stage), up the grandstand into the Sambadrome's showdown; the beach), as functions on
 * the game. Shared by the bot test and the pictures.
 */
import type { Game } from '../../montyotr/src/game';
import { RIO_ROOM as R } from '../src/rio';
import { underHead } from '../../montyotr/src/levers';
import { HELD_WARN } from '../../montyotr/src/mechanisms';
import { AND } from '../src/andes';
import { copy, frame } from '../../montyotr/test/play';
import { ACTIONS } from '../../shared/monty/test/bot';
import { coin, coinIndex, into, item, itemIndex, leg, settledOn, stands, type Leg, type Part } from './route';

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
/** Whether the Sambadrome's Viktor, from where he is now on Monty's path, will be under the float's head for the next `frames` frames (his ring holds where Monty was: the places he is about to walk). */
const willStand = (g: Game, frames: number): boolean => {
  const p = g.pursuers.find((q) => q.gone === 'no'), e = p ? g.data.pursuers[p.index] : undefined;
  if (!p || !e || p.written <= e.delay) return false;
  for (let k = 0; k < Math.min(frames, e.delay); k++) { const at = ((p.written + k) % e.delay) * 3; if (!underHead(g, p.ring[at] ?? 0, (p.ring[at + 1] ?? 0) + 1)) return false; }
  return true;
};
/** The headdress's place in the item table. */
const itemOf = (g: Game) => itemIndex(g, R.drum, 0);
/** A goal in the Sambadrome, guided to a cell. */
const inDrum = (goal: (g: Game) => boolean, col: number, row: number): Part => ({ goal: (g) => g.roomId === R.drum && goal(g) && settledOn(g), aim: [{ room: R.drum, col, row }] });

/** Every leg has a name of its own (the bot's kept routes are by name). */
export const RIO_LEGS: readonly Leg[] = [
  leg('C: off the canopy to the forest floor, the coin in the pocket under the canopy', livesFor(coin(R.arms, 3, 13), 40)),
  leg('C: up the west ladder to the west arm, past the marmoset, the snack on its hand', livesFor(item(R.arms, 0, [4, 2]), 40)),
  leg('C: down, east under the pedestal, up the east ladder and past the vulture: the guarana', livesFor(item(R.arms, 1, [25, 2]), 40)),
  leg('C: along the east arm, on the run, the coin on the hand', livesFor(coin(R.arms, 28, 3), 40)),
  leg('C to F: off the hand onto the slope, out east', into(R.colour, 31, 7, R.arms)),
  leg('F: over the football\'s well onto the yellow roof, down past the kite, west along the alley: the coin under the macaw', livesFor(coin(R.colour, 20, 13), 40)),
  leg('F: on west over the ladder\'s hole, the snack in the pocket', livesFor(item(R.colour, 0, [1, 12]), 40)),
  leg('F to L: down the ladder and east along the lane, out low', into(R.lap, 31, 17, R.colour)),
  leg('L: past the falling stone, the street\'s coin in the bat\'s bay', livesFor(coin(R.lap, 21, 17), 40)),
  leg('L to P: on along the street into the carnival', into(R.beat, 31, 17, R.lap)),
  leg('P: up the Selaron steps, the coin at their head', livesFor(coin(R.beat, 1, 7), 40)),
  leg('P to L: west onto the track', into(R.lap, 0, 7, R.beat)),
  leg('L: the coin at the track\'s east end', livesFor(coin(R.lap, 27, 7), 40)),
  leg('L: on the tram over the gap, the coin on the track\'s west part', coin(R.lap, 8, 7)),
  leg('L to W: up the ladder into the churrascaria', into(R.steak, 5, 0, R.lap)),
  leg('W: past the first gaucho, the coin by the step', livesFor(coin(R.steak, 14, 17), 40)),
  leg('W to L: back past the gaucho and down the ladder', into(R.lap, 5, 19, R.steak)),
  leg('L: through the gap to the street', livesFor(stands(R.lap, 18, 10, 20), 40)),
  leg('L to P: along the street into the carnival again', into(R.beat, 31, 17, R.lap)),
  leg('P: past the passista, the snack on the risers\' first step', livesFor(item(R.beat, 0, [17, 14]), 40)),
  leg('P: over the top riser under the drummer, its coin', livesFor(coin(R.beat, 21, 11), 40)),
  leg('P to Q: down past the baiana and out east to the canal', into(R.float, 31, 17, R.beat)),
  leg('Q: across the canal on lane A onto the stage: the crank', livesFor(item(R.float, 0, [26, 16]), 40)),
  leg('Q: part way up the grandstand\'s ladder and off west onto the balcony',
    { goal: stands(R.float, 14, 25, 26).goal, aim: [{ room: R.float, col: 22, row: 16 }, { room: R.float, col: 28, row: 16 }, { room: R.float, col: 28, row: 12 }, { room: R.float, col: 25, row: 12 }] }),
  leg('Q: west on lane B over the canal, its coin', livesFor(coin(R.float, 14, 12), 40)),
  leg('Q: on to the west balcony, its coin', livesFor(coin(R.float, 3, 13), 40)),
  leg('Q to D: back across on lane A, up the grandstand\'s ladder and out high', into(R.drum, 31, 7, R.float)),
  leg('D: over the drummer\'s riser and up the rope to the gantry, past the dancer: the headdress', inDrum((g) => g.siCollected[itemOf(g)] !== 0, 16, 2)),
  leg('D: down the rope onto the float, its coin, and off its east end to the lever (it only rattles)', inDrum((g) => g.leverLatch && g.coinCollected[coinIndex(g, R.drum, 18, 8)] !== 0, 22, 15)),
  leg('D: up the ladder to the booth, the crank fitted', inDrum((g) => !!g.siCollected[lever(g).armed], 28, 2)),
  leg('D: west along the gantry past the dancer and down the rope to the avenue', stands(R.drum, 18, 9, 14)),
  leg('D: under the float\'s head and on to the lever, so that Viktor will stand under it as long as its warning', inDrum((g) => g.montyCol - 4 === 21 && !g.leverLatch && !g.hold.pull && !g.pd.state && willStand(g, HELD_WARN + 16), 21, 15)),
  leg('D: the lever as Viktor stands under the head', inDrum((g) => !!g.siCollected[lever(g).done], 21, 15)),
  leg('D to B: the bars lifted, out east to the beach', into(R.bust, 31, 17, R.drum)),
  leg('B: onto the promenade', stands(R.bust, 18, 2, 6)),
];

/** The Andes' last room (the kapok's crown), where Rio is come into from (the route starts in C as a player arrives from it). */
export const FROM = AND.kapok;
