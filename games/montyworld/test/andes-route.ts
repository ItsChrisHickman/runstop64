/**
 * The Andes and the Amazon's route for the bot: the goals, in the order a player who takes everything plays them (docs/dosvidaniya-back-half-plan.md): bailed out of the mail plane into the drop's top (the
 * flight: flight.ts) and down the three rooms of the drop (the spire's coin, the canyon's coin over its ridge, the gorge's shelf and the coin between the condors' dives), the west throat onto the guardhouse's
 * roof (its coin) and into the guardhouse for the chullo, down the terraces to Machu Picchu's lane, up the ladder, over the gap and up the hill against the boulders for its two coins and the panpipes, east
 * along the top onto the Inca trail, over the logs to the empanada at its end and back, west off the plateau onto the terraces' high ledge, down the terraces again and back into the lane, past the calmed
 * llama down the well into the canopy; the canopy's coin, west along the lattice into the cloud forest (the coin at its liana's head, the coin over the stream's stones), down the west liana to VINE AND
 * DANDY (a coin on each log, the empanada on the east bank), the creek (the empanada in the fig's niche, the coin on the second log, over the piranha's channel), the roots (the coin on the log), up the
 * liana into the kapok, up its boughs to the branch (the tangle across it) and the walkway's coin past the jaguar; down again and east to the riverboat, past the captain in the chullo to the stern's coin
 * and up to the top deck for the machete; back to the kapok and through the cut tangle to the way out. Shared by the bot test and the pictures.
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
  leg('F1: up the updraft to the coin on the spire\'s tip', coin(AND.jump, 19, 10)),
  leg('F1 to F2: out at the bottom', into(AND.thin, 10, 19, AND.jump)),
  leg('F2: a line past the condors to the coin over the ridge\'s crest', livesFor(coin(AND.thin, 15, 7), 40)),
  leg('F2 to F3: down the left canyon', into(AND.gorge, 7, 19, AND.thin)),
  leg('F3: up the updraft and under the overhang, the empanada on the shelf', livesFor(item(AND.gorge, 0, [24, 6]), 40)),
  leg('F3: the coin between the condors\' dives', livesFor(coin(AND.gorge, 16, 9), 40)),
  leg('F3 to MP1: down the west throat onto the guardhouse\'s roof', livesFor(stands(AND.terraces, 5, 1, 6), 40)),
  leg('MP1: the coin on the guardhouse\'s roof', coin(AND.terraces, 4, 3)),
  leg('MP1: into the guardhouse, the chullo', livesFor(item(AND.terraces, CHULLO, [3, 6]), 40)),
  leg('MP1: down the terraces past the llama and the cuy to the low path', livesFor(stands(AND.terraces, 18, 22, 25), 60)),
  leg('MP1 to MP2: past the second llama, east under the cliff into the lane', into(AND.picchu, 31, 16, AND.terraces)),
  leg('MP2: up the ladder onto the plateau', stands(AND.picchu, 8, 0, 3)),
  leg('MP2: over the cuy\'s gap and up the step against the boulders, its coin', livesFor(coin(AND.picchu, 21, 4), 60)),
  leg('MP2: up to the Intihuatana, the panpipes', livesFor(item(AND.picchu, 0, [26, 2]), 60)),
  leg('MP2: the coin by the carved stone', livesFor(coin(AND.picchu, 30, 2), 60)),
  leg('MP2 to the bridge: east along the top onto the Inca trail', into(AND.bridge, 31, 2, AND.picchu)),
  leg('the bridge: over the logs past the vizcacha, the empanada at the trail\'s end', livesFor(item(AND.bridge, 0, [27, 2]), 60)),
  leg('the bridge to MP2: back along the trail', into(AND.picchu, 0, 2, AND.bridge)),
  leg('MP2 to MP1: back down the hill and west off the plateau onto the high ledge', into(AND.terraces, 0, 6, AND.picchu)),
  leg('MP1: the empanada on the high ledge', item(AND.terraces, LEDGE_EMPANADA, [27, 6])),
  leg('MP1: off the ledge onto the last step and down to the low path', livesFor(stands(AND.terraces, 18, 22, 25), 60)),
  leg('MP1 to MP2: east again into the lane', into(AND.picchu, 31, 16, AND.terraces)),
  leg('MP2 to the canopy: past the calmed llama through the tunnel and down the well', into(AND.canopy, 20, 19, AND.picchu)),
  leg('the canopy: down the well\'s liana onto the bough', stands(AND.canopy, 7, 17, 24)),
  leg('the canopy: off the bough onto the liana across, up the middle liana past the sloth, the coin at its head', livesFor(coin(AND.canopy, 13, 4), 60)),
  leg('the canopy to CLOUD NINE: west along the lattice', into(AND.cloud, 0, 8, AND.canopy)),
  leg('CLOUD NINE: up the liana to the coin at its head', livesFor(coin(AND.cloud, 21, 3), 60)),
  leg('CLOUD NINE: down past the bear, the coin over the stream\'s stones', livesFor(coin(AND.cloud, 8, 14), 60)),
  leg('CLOUD NINE to VINE AND DANDY: down the west liana', into(AND.vine, 2, 19, AND.cloud)),
  leg('VINE AND DANDY: the first vine, the coin on the first log', livesFor(coin(AND.vine, 14, 14), 60)),
  leg('VINE AND DANDY: the second vine, the coin on the second log', livesFor(coin(AND.vine, 21, 14), 60)),
  leg('VINE AND DANDY: the third vine to the east bank, the empanada', livesFor(item(AND.vine, 0, [29, 13]), 60)),
  leg('VINE AND DANDY to the creek: east into the fig\'s niche', into(AND.sandbar, 31, 13, AND.vine)),
  leg('the creek: the empanada in the niche under the fig', item(AND.sandbar, 0, [0, 13])),
  leg('the creek: over the vine and the rotten logs, the coin on the second log', livesFor(coin(AND.sandbar, 14, 14), 60)),
  leg('the creek: over the piranha\'s channel onto the sandbar', livesFor(stands(AND.sandbar, 15, 18, 28), 60)),
  leg('the creek to the roots: east along the sandbar', into(AND.roots, 31, 13, AND.sandbar)),
  leg('the roots: over the first vine, the coin on the log', livesFor(coin(AND.roots, 13, 14), 60)),
  leg('the roots: over the second vine onto the east bank', livesFor(stands(AND.roots, 15, 21, 28), 60)),
  leg('the roots to the kapok: up the liana on its flank', into(AND.kapok, 24, 0, AND.roots)),
  leg('the kapok: up the buttress boughs past the anaconda onto the branch (the tangle across it)', livesFor(stands(AND.kapok, 8, 15, 22), 60)),
  leg('the kapok: up onto the walkway and west past the jaguar, the coin at its end', livesFor(coin(AND.kapok, 3, 4), 60)),
  leg('the kapok to the roots: back down to the low boughs and the liana', into(AND.roots, 24, 19, AND.kapok)),
  leg('the roots to the boat: east along the bank', into(AND.boat, 31, 13, AND.roots)),
  leg('the boat: past the captain (in the chullo he steps off) to the stern, the coin', livesFor(coin(AND.boat, 30, 14), 60)),
  leg('the boat: up the ladder and west past the macaw, the machete', livesFor(item(AND.boat, 0, [12, 6]), 60)),
  leg('the boat to the roots: back west along the bank', into(AND.roots, 0, 13, AND.boat)),
  leg('the roots to the kapok: up the liana again', into(AND.kapok, 24, 0, AND.roots)),
  leg('the kapok: up the boughs onto the branch again', livesFor(stands(AND.kapok, 8, 15, 22), 60)),
  leg('the kapok: through the cut tangle along the branch to the way out to Rio', stands(AND.kapok, 8, 27, 30)),
];
