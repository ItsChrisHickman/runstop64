/**
 * The Andes and the Amazon's route for the bot: the goals, in the order a player who takes everything plays them (docs/dosvidaniya-reset.md, the plan's route): out of the plane's door and down the drop (the spire's
 * coin, the gorge's shelf and the coin between the condors' dives), the west throat onto the guardhouse's roof (its coin) and into the guardhouse for the chullo, down the terraces past the llama and the cuy and the
 * second llama to Machu Picchu's lane, up the ladder, over the condor's gap and up the hill against the boulders for its two coins and the panpipes, west off the plateau onto the terraces' high ledge (the
 * empanada seen from below), down the terraces again and back into the lane, past the calmed llama down the well into the canopy (its coin at a crossing), down the long liana to the sandbar, west over the
 * rotten logs and the vine into the fig's pocket (its coin and empanada), east over the vines to the log's coin (the tangle and the machete in sight), back, up the lattice to the walkway, east under the
 * anaconda (its coin) to the crown, down the hollow trunk to the machete, off the bough and through the cut tangle onto the jetty. Shared by the bot test and the pictures.
 */
import { AND } from '../src/andes';
import { into, item, leg, stands, type Leg } from './route';
import { coin } from './route';
import { PAC } from '../src/pacific';
import { copy, frame } from '../../montyotr/test/play';
import { ACTIONS } from '../../shared/monty/test/bot';
import type { Part } from './route';

/** A leg's goal reached with some move that lives on for `frames` more (a coin taken in front of a creature that is about to reach him is no coin taken: the bot's own check looks only 12 frames ahead). */
const livesFor = (part: Part, frames: number): Part => ({
  goal: (g) => part.goal(g) && ACTIONS.some(([, stick]) => {
    const t = { g: copy(g), col: 0 };
    for (let f = 0; f < frames; f++) { frame(t, stick); if (t.g.actionCounter !== 0) return false; }
    return true;
  }),
  aim: part.aim,
});

/** The terraces' finds: the empanada on the high ledge is the room's cake (its first), the chullo its item (its second). */
export const LEDGE_EMPANADA = 0, CHULLO = 1;

/** Every leg has a name of its own (the bot's kept routes are by name). */
export const ANDES_LEGS: readonly Leg[] = [
  leg('Q to F1: out of the plane\'s door', into(AND.jump, 31, 15, PAC.hold)),
  leg('F1: up the updraft, the coin on the spire\'s tip', coin(AND.jump, 19, 10)),
  leg('F1 to F2: out at the bottom', into(AND.gorge, 10, 19, AND.jump)),
  leg('F2: up the updraft and under the overhang, the empanada on the shelf', livesFor(item(AND.gorge, 0, [24, 6]), 40)),
  leg('F2: the coin between the condors\' dives', livesFor(coin(AND.gorge, 16, 9), 40)),
  leg('F2 to MP1: down the west throat onto the guardhouse\'s roof', livesFor(stands(AND.terraces, 5, 1, 6), 40)),
  leg('MP1: the coin on the guardhouse\'s roof', coin(AND.terraces, 4, 3)),
  leg('MP1: into the guardhouse, the chullo', livesFor(item(AND.terraces, CHULLO, [3, 6]), 40)),
  leg('MP1: down the terraces past the llama and the cuy to the low path', livesFor(stands(AND.terraces, 18, 22, 25), 60)),
  leg('MP1 to MP2: past the second llama, east under the cliff into the lane', into(AND.picchu, 31, 16, AND.terraces)),
  leg('MP2: up the ladder onto the plateau', stands(AND.picchu, 8, 0, 3)),
  leg('MP2: over the condor\'s gap and up the step against the boulders, its coin', livesFor(coin(AND.picchu, 21, 4), 60)),
  leg('MP2: up to the Intihuatana, the panpipes', livesFor(item(AND.picchu, 0, [25, 2]), 60)),
  leg('MP2: the coin by the carved stone', livesFor(coin(AND.picchu, 30, 2), 60)),
  leg('MP2 to MP1: back down the hill and west off the plateau onto the high ledge', into(AND.terraces, 0, 6, AND.picchu)),
  leg('MP1: the empanada on the high ledge', item(AND.terraces, LEDGE_EMPANADA, [27, 6])),
  leg('MP1: off the ledge onto the last step and down to the low path', livesFor(stands(AND.terraces, 18, 22, 25), 60)),
  leg('MP1 to MP2: east again into the lane', into(AND.picchu, 31, 16, AND.terraces)),
  leg('MP2 to A1: past the calmed llama through the tunnel and down the well', into(AND.canopy, 20, 19, AND.picchu)),
  leg('A1: the coin at the lianas\' crossing', livesFor(coin(AND.canopy, 13, 11), 60)),
  leg('A1 to A3: down the long liana to the sandbar', into(AND.sandbar, 20, 19, AND.canopy)),
  leg('A3: west over the rotten logs and the vine into the fig\'s pocket, its coin', livesFor(coin(AND.sandbar, 3, 13), 60)),
  leg('A3: the empanada in the pocket', item(AND.sandbar, 0, [0, 13])),
  leg('A3: back over the vine and the logs to the sandbar', livesFor(stands(AND.sandbar, 15, 18, 28), 60)),
  leg('A3 to A4: east along the sandbar', into(AND.roots, 31, 13, AND.sandbar)),
  leg('A4: over the first vine, the coin on the log', livesFor(coin(AND.roots, 11, 14), 60)),
  leg('A4: over the second vine onto the east bank (the tangle and the machete in sight)', livesFor(stands(AND.roots, 15, 18, 22), 60)),
  leg('A4 to A3: back over the vines and the log', into(AND.sandbar, 0, 13, AND.roots)),
  leg('A3 to A1: up the long liana into the canopy', into(AND.canopy, 20, 0, AND.sandbar)),
  leg('A1: up the lattice onto the walkway', stands(AND.canopy, 4, 22, 29)),
  leg('A1 to A2: east along the walkway', into(AND.kapok, 31, 2, AND.canopy)),
  leg('A2: under the anaconda, its coin', livesFor(coin(AND.kapok, 17, 2), 60)),
  leg('A2 to A4: past the jaguar on the crown and down the hollow trunk', into(AND.roots, 27, 19, AND.kapok)),
  leg('A4: out of the hollow onto the bough, the machete', item(AND.roots, 0, [20, 5])),
  leg('A4: off the bough onto the bank, through the cut tangle onto the jetty', stands(AND.roots, 15, 26, 30)),
];
