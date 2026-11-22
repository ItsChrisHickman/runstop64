/**
 * The Andes and the Amazon's route for the bot: the goals, in the order a player who takes everything plays them (out of the plane's door and down the three flight rooms for their coins and the first two empanadas, onto
 * Machu Picchu's top terrace, east along the plateau and down the steps past the boulders into the village for the chullo, into the cave for the panpipes, back up the steps and down T1's ladder to the low path, east into
 * the lane under the terraces, past the llama (gone with the tune) to the well and down into the Inca tunnel for the machete, west into the cloud forest and its boughs, the tangle cut and the rope down to the riverboat, up
 * to the top deck and along the cargo deck past the captain (gone with the hat), across the piranha river by the vines and up the last bank), as functions on the game. Shared by the bot test and the pictures.
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

/** Every leg has a name of its own (the bot's kept routes are by name). */
export const ANDES_LEGS: readonly Leg[] = [
  leg('Q to F1: out of the plane\'s door', into(AND.jump, 31, 15, PAC.hold)),
  leg('F1: off the ramp, the coin by the cliffs', coin(AND.jump, 7, 12)),
  leg('F1: up the updraft to the first coin', coin(AND.jump, 13, 8)),
  leg('F1: the second coin', coin(AND.jump, 16, 9)),
  leg('F1: the third coin', coin(AND.jump, 19, 10)),
  leg('F1: the empanada on the spire', item(AND.jump, 0, [21, 10])),
  leg('F1: the coin beyond the spire', coin(AND.jump, 26, 12)),
  leg('F1 to F2: out at the bottom', into(AND.thin, 26, 19, AND.jump)),
  leg('F2: the coin in the right updraft\'s foot', coin(AND.thin, 26, 13)),
  leg('F2: up the updraft', coin(AND.thin, 23, 7)),
  leg('F2: over to the first condor\'s coin', livesFor(coin(AND.thin, 19, 6), 40)),
  leg('F2: the coin over the ridge', coin(AND.thin, 16, 8)),
  leg('F2: the coin beyond it', coin(AND.thin, 12, 10)),
  leg('F2: the coin in the left canyon', coin(AND.thin, 8, 12)),
  leg('F2: up the left updraft', coin(AND.thin, 6, 7)),
  leg('F2 to F3: out at the bottom', into(AND.condor, 7, 19, AND.thin)),
  leg('F3: the coin by the ledge', coin(AND.condor, 5, 12)),
  leg('F3: the coin over the gap', coin(AND.condor, 10, 14)),
  leg('F3: up the updraft', coin(AND.condor, 14, 6)),
  leg('F3: the next coin', coin(AND.condor, 17, 8)),
  leg('F3: the empanada on the shelf', item(AND.condor, 0, [24, 6])),
  leg('F3: the coin on the shelf', coin(AND.condor, 27, 7)),
  leg('F3: the coin beyond', coin(AND.condor, 27, 13)),
  leg('F3 to T1: down through the gap', into(AND.llama, 15, 19, AND.condor)),
  leg('T1: the first coin on the terrace', coin(AND.llama, 11, 4)),
  leg('T1: the second', coin(AND.llama, 16, 4)),
  leg('T1: the third', coin(AND.llama, 22, 4)),
  leg('T1: the fourth', coin(AND.llama, 28, 4)),
  leg('T1 to T2: out east, high', into(AND.rock, 31, 5, AND.llama)),
  leg('T2: the coin on the plateau', coin(AND.rock, 7, 4)),
  leg('T2: the second', coin(AND.rock, 10, 4)),
  leg('T2: down the first step past the boulders, its coin', livesFor(coin(AND.rock, 18, 6), 60)),
  leg('T2: the second step\'s coin', livesFor(coin(AND.rock, 23, 8), 60)),
  leg('T2: the landing\'s coin', livesFor(coin(AND.rock, 27, 10), 60)),
  leg('T2 to V: out east onto the roofs', into(AND.market, 31, 10, AND.rock)),
  leg('V: the first roof\'s coin', coin(AND.market, 7, 10)),
  leg('V: down to the second roof, its coin', coin(AND.market, 12, 12)),
  leg('V: the third roof\'s coin', coin(AND.market, 16, 14)),
  leg('V: down to the lane, the coin by the ladder', livesFor(coin(AND.market, 21, 16), 60)),
  leg('V: up the ladder to the hat stall, its coin', coin(AND.market, 24, 7)),
  leg('V: the chullo', item(AND.market, 0, [25, 7])),
  leg('V: back down, the lane\'s last coin', coin(AND.market, 27, 16)),
  leg('V to M: out east into the cave', into(AND.mist, 31, 16, AND.market)),
  leg('M: the first coin', coin(AND.mist, 5, 16)),
  leg('M: onto the stone over the mist, its coin', livesFor(coin(AND.mist, 11, 15), 60)),
  leg('M: across to the far side', livesFor(coin(AND.mist, 16, 16), 60)),
  leg('M: up the first step', livesFor(coin(AND.mist, 20, 14), 60)),
  leg('M: up the second', livesFor(coin(AND.mist, 24, 12), 60)),
  leg('M: the coin over the ledge', coin(AND.mist, 29, 9)),
  leg('M: the panpipes', item(AND.mist, 0, [28, 10])),
  leg('M to V: back out west', into(AND.market, 0, 17, AND.mist)),
  leg('V to T2: back up to the landing', into(AND.rock, 0, 10, AND.market)),
  leg('T2: up the steps against the boulders to the plateau', livesFor(stands(AND.rock, 6, 0, 12), 60)),
  leg('T2 to T1: out west, high', into(AND.llama, 0, 5, AND.rock)),
  leg('T1: down the ladder to the low path', stands(AND.llama, 18, 2, 6)),
  leg('T1: onto the low path\'s first terrace, its coin', livesFor(coin(AND.llama, 11, 14), 60)),
  leg('T1: up to the second terrace, the coin', livesFor(coin(AND.llama, 15, 12), 60)),
  leg('T1: the low path\'s last coin past the second llama', livesFor(coin(AND.llama, 27, 16), 60)),
  leg('T1 to T2: out east, low', into(AND.rock, 31, 17, AND.llama)),
  leg('T2: the lane\'s coin', coin(AND.rock, 3, 16)),
  leg('T2: the empanada', item(AND.rock, 0, [8, 16])),
  leg('T2 to X: through the tunnel (the llama has gone) and down the well', into(AND.tunnel, 20, 19, AND.rock)),
  leg('X: down the rope, the coin by the torch', coin(AND.tunnel, 18, 16)),
  leg('X: east past the crusher and up the first stair, the coin', coin(AND.tunnel, 25, 14)),
  leg('X: up the second stair, the coin', coin(AND.tunnel, 27, 12)),
  leg('X: the machete', item(AND.tunnel, 0, [28, 10])),
  leg('X: the coin on the shelf', coin(AND.tunnel, 29, 9)),
  leg('X: back down and west under the torches, the coin', coin(AND.tunnel, 16, 16)),
  leg('X: west under the idol, the last coin', livesFor(coin(AND.tunnel, 5, 16), 60)),
  leg('X to CF: out west, low', into(AND.cloud, 0, 17, AND.tunnel)),
  leg('CF: the coin on the high ground', coin(AND.cloud, 28, 14)),
  leg('CF: over the stream on the logs, the coin', coin(AND.cloud, 19, 16)),
  leg('CF: up the rope to the boughs, the middle one\'s coin', livesFor(coin(AND.cloud, 24, 11), 60)),
  leg('CF: the high bough\'s coin', livesFor(coin(AND.cloud, 21, 6), 60)),
  leg('CF: across to the west bough, the coin', livesFor(coin(AND.cloud, 8, 6), 60)),
  leg('CF: down to the low bough, the coin', livesFor(coin(AND.cloud, 6, 10), 60)),
  leg('CF: down to the ground, past the jaguar, the coin', livesFor(coin(AND.cloud, 10, 16), 60)),
  leg('CF to B: down through the gap the machete cleared', into(AND.boat, 5, 19, AND.cloud)),
  leg('B: down the rope to the jetty and across the plank, the coin', coin(AND.boat, 6, 12)),
  leg('B: up the ladder to the top deck, the first coin', coin(AND.boat, 15, 6)),
  leg('B: the empanada', item(AND.boat, 0, [22, 6])),
  leg('B: the second coin', coin(AND.boat, 19, 6)),
  leg('B: back down to the cargo deck past the captain (gone), the coin', coin(AND.boat, 23, 13)),
  leg('B: under the paddle wheel, the coin', coin(AND.boat, 27, 13)),
  leg('B: the stern\'s coin', coin(AND.boat, 29, 13)),
  leg('B to P: out at the stern', into(AND.river, 31, 14, AND.boat)),
  leg('P: over the first vine to the first log, its coin', livesFor(coin(AND.river, 14, 14), 60)),
  leg('P: the coin at the first vine\'s tip', coin(AND.river, 10, 11)),
  leg('P: across to the second vine, the coin', coin(AND.river, 18, 10)),
  leg('P: onto the second log, its coin', coin(AND.river, 21, 14)),
  leg('P: the third vine\'s coin', coin(AND.river, 26, 11)),
  leg('P: onto the east bank, the coin', coin(AND.river, 30, 13)),
  leg('P: the empanada', item(AND.river, 0, [29, 13])),
  leg('P to R: out east', into(AND.bank, 31, 14, AND.river)),
  leg('R: the first coin on the bank', coin(AND.bank, 3, 13)),
  leg('R: over the pool onto the stair, the coin', coin(AND.bank, 13, 11)),
  leg('R: up the stair past the anaconda, the coin', livesFor(coin(AND.bank, 15, 9), 60)),
  leg('R: the next', coin(AND.bank, 19, 7)),
  leg('R: the last coin', coin(AND.bank, 22, 6)),
  leg('R: the empanada', item(AND.bank, 0, [23, 6])),
];
