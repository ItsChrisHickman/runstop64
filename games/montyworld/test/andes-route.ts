/**
 * The Andes and the Amazon's route for the bot: the goals, in the order a player who takes everything plays them (docs/dosvidaniya-reset.md, the plan's route): bailed out of the mail plane into the drop's top (the flight: flight.ts) and down the drop (the spire's
 * coin past the condor, the gorge's shelf and the coin between the condors' dives), the west throat onto the guardhouse's roof (its coin) and into the guardhouse for the chullo, down the terraces past the llamas and
 * the cuy to Machu Picchu's lane, up the ladder, over the gap and up the hill against the boulders for its two coins and the panpipes, west off the plateau onto the terraces' high ledge (the empanada seen from
 * below), down the terraces again and back into the lane, past the calmed llama down the well into the canopy; down the canopy's lattice (the coin at the middle liana's head) and through its floor to the river's
 * west bank (the empanada in the fig's niche), east over the vine, the rotten logs (a coin) and the piranha's channel to the sandbar, over the vines and the log (a coin) to the east bank, up the liana into the
 * kapok, up its boughs past the anaconda to the branch (the tangle across it) and the walkway (its coin), west past the jaguar for the machete, back, and through the cut tangle to the way out. Shared by the bot
 * test and the pictures.
 */
import { AND } from '../src/andes';
import { into, item, leg, stands, type Leg } from './route';
import { coin } from './route';
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
  leg('F1: up the updraft and past the condor, the coin on the spire\'s tip', coin(AND.jump, 19, 10)),
  leg('F1 to F2: out at the bottom', into(AND.gorge, 10, 19, AND.jump)),
  leg('F2: up the updraft and under the overhang, the empanada on the shelf', livesFor(item(AND.gorge, 0, [24, 6]), 40)),
  leg('F2: the coin between the condors\' dives', livesFor(coin(AND.gorge, 16, 9), 40)),
  leg('F2 to MP1: down the west throat onto the guardhouse\'s roof', livesFor(stands(AND.terraces, 5, 1, 6), 40)),
  leg('MP1: the coin on the guardhouse\'s roof', coin(AND.terraces, 4, 3)),
  leg('MP1: into the guardhouse, the chullo', livesFor(item(AND.terraces, CHULLO, [3, 6]), 40)),
  leg('MP1: down the terraces past the llama and the cuy to the low path', livesFor(stands(AND.terraces, 18, 22, 25), 60)),
  leg('MP1 to MP2: past the second llama, east under the cliff into the lane', into(AND.picchu, 31, 16, AND.terraces)),
  leg('MP2: up the ladder onto the plateau', stands(AND.picchu, 8, 0, 3)),
  leg('MP2: over the cuy\'s gap and up the step against the boulders, its coin', livesFor(coin(AND.picchu, 21, 4), 60)),
  leg('MP2: up to the Intihuatana, the panpipes', livesFor(item(AND.picchu, 0, [25, 2]), 60)),
  leg('MP2: the coin by the carved stone', livesFor(coin(AND.picchu, 30, 2), 60)),
  leg('MP2 to MP1: back down the hill and west off the plateau onto the high ledge', into(AND.terraces, 0, 6, AND.picchu)),
  leg('MP1: the empanada on the high ledge', item(AND.terraces, LEDGE_EMPANADA, [27, 6])),
  leg('MP1: off the ledge onto the last step and down to the low path', livesFor(stands(AND.terraces, 18, 22, 25), 60)),
  leg('MP1 to MP2: east again into the lane', into(AND.picchu, 31, 16, AND.terraces)),
  leg('MP2 to A1: past the calmed llama through the tunnel and down the well', into(AND.canopy, 20, 19, AND.picchu)),
  leg('A1: down the well\'s liana onto the bough', stands(AND.canopy, 7, 17, 24)),
  leg('A1: off the bough onto the liana across, up the middle liana past the sloth, the coin at its head', livesFor(coin(AND.canopy, 13, 4), 60)),
  leg('A1 to A3: west along the lianas over the trunk and down through the canopy\'s floor', into(AND.sandbar, 3, 19, AND.canopy)),
  leg('A3: the empanada in the niche under the fig', item(AND.sandbar, 0, [0, 13])),
  leg('A3: over the vine and the rotten logs, the coin on the second log', livesFor(coin(AND.sandbar, 14, 14), 60)),
  leg('A3: over the piranha\'s channel onto the sandbar', livesFor(stands(AND.sandbar, 15, 18, 28), 60)),
  leg('A3 to A4: east along the sandbar', into(AND.roots, 31, 13, AND.sandbar)),
  leg('A4: over the first vine, the coin on the log', livesFor(coin(AND.roots, 10, 14), 60)),
  leg('A4: over the second vine onto the east bank', livesFor(stands(AND.roots, 15, 18, 25), 60)),
  leg('A4 to A2: up the liana on the kapok\'s flank', into(AND.kapok, 20, 0, AND.roots)),
  leg('A2: up the buttress boughs past the anaconda onto the branch (the tangle across it)', livesFor(stands(AND.kapok, 8, 15, 22), 60)),
  leg('A2: up onto the walkway, the coin at its root', livesFor(coin(AND.kapok, 12, 5), 60)),
  leg('A2: west past the jaguar, the machete', livesFor(item(AND.kapok, 0, [2, 4]), 60)),
  leg('A2: back past the jaguar and down onto the branch', livesFor(stands(AND.kapok, 8, 15, 22), 60)),
  leg('A2: through the cut tangle along the branch to the way out to Rio', stands(AND.kapok, 8, 27, 30)),
];
