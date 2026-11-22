/**
 * The Pacific's route for the bot: the goals, in the order a player who takes everything plays them (from Japan's cargo ship onto the stern, the engine room for the bolt cutters, the hold and the deck of the bow
 * for the musubi and the coins, the chain cut and down the ramp to Honolulu, the street and the roofs to Waikiki, the snorkel in the shop's loft, up the cliff rope to the luau for the lei past the torches, back down and
 * wading into the first reef, Molokai's fishponds, the second reef and the sea cave, up the slipway to Lahaina, the Road to Hana's three bridges, Hana's beach and cave and the drop into the third reef, Kona's coast and farm,
 * the volcano's climb with the lava behind him, Hilo's airport (the guard gone, the loader up) and the plane's hold with the parachute), as functions on the game. Shared by the bot test and the pictures.
 */
import { lavaTop } from '../../montyotr/src/lava';
import { LAVA, PAC } from '../src/pacific';
import { copy, frame } from '../../montyotr/test/play';
import { ACTIONS } from './bot';
import { above, coin, into, item, leg, standY, stands, type Leg, type Part } from './route';

/** Swimming to a place: his top left within a cell of the one given (a swim across a wide room is a few of these, so the search never has the whole sea to look through). */
const swimTo = (room: number, col: number, row: number): Part => ({
  goal: (g) => g.roomId === room && !g.freeze && !g.script && Math.abs(g.montyCol - 4 - col) <= 1 && Math.abs(g.montyRow - 3 - row) <= 1,
  aim: [{ room, col, row }],
});

/**
 * A leg's goal reached with the lava still a good way off (100 frames): a coin taken on a ledge the lava reaches in a few frames is no coin taken (the bot's check that some move lives on looks 12 frames ahead,
 * and a jump from a ledge the lava is about to reach lives that long), and a leg that ended there would hand the next one a death.
 */
const outOfLava = (part: Part): Part => ({
  goal: (g) => part.goal(g) && (g.lavas[0] === undefined || lavaTop(LAVA, g.lavas[0].t + 100) > g.montyRow - 3 + 1),
  aim: part.aim,
});

/** A leg's goal reached with some move that lives on for `frames` more (a coin taken in front of a creature that is about to reach him is no coin taken: the bot's own check looks only 12 frames ahead). */
const livesFor = (part: Part, frames: number): Part => ({
  goal: (g) => part.goal(g) && ACTIONS.some(([, stick]) => {
    const t = { g: copy(g), col: 0 };
    for (let f = 0; f < frames; f++) { frame(t, stick); if (t.g.actionCounter !== 0) return false; }
    return true;
  }),
  aim: part.aim,
});

/** A leg that ends in the low lane: the way out is the same room by two lanes, and a leg that ended in the other would hand the next one the wrong start. */
const low = (floor: number) => (g: Parameters<Part['goal']>[0]) => !above(floor)(g);

/** Every leg has a name of its own (the bot's kept routes are by name). */
export const PACIFIC_LEGS: readonly Leg[] = [
  leg('A: up onto the deck, the coin by the bridge', coin(PAC.stern, 20, 10)),
  leg('A: down the hatch ladder into the engine room', stands(PAC.stern, 18, 24, 28)),
  leg('A: past the crusher to the coin by the bilge', coin(PAC.stern, 15, 16)),
  leg('A: the coin on the pocket\'s crates', coin(PAC.stern, 7, 14)),
  leg('A: the bolt cutters', item(PAC.stern, 0, [5, 14])),
  leg('A to B: out right in the hold lane', into(PAC.box, 31, 16, PAC.stern, low(14))),
  leg('B: the first gantry over the bilge, its coin', coin(PAC.box, 13, 14)),
  leg('B: the second gantry\'s coin', coin(PAC.box, 23, 14)),
  leg('B: the far gantry\'s coin', coin(PAC.box, 28, 15)),
  leg('B: back across to the cargo stack and the musubi', item(PAC.box, 0, [5, 13])),
  leg('B: up the hatch ladder onto the deck', stands(PAC.box, 11, 4, 8)),
  leg('B: the coin on the first stack', coin(PAC.box, 7, 7)),
  leg('B: the coin on the tallest stack', coin(PAC.box, 13, 5)),
  leg('B: the coin on the third stack', coin(PAC.box, 19, 7)),
  leg('B: down to the crane\'s crate and the coin by the ramp', coin(PAC.box, 27, 9)),
  leg('B to C: down the ramp (the chain is cut)', into(PAC.pier, 31, 9, PAC.box)),
  leg('C: the coin on the pier', coin(PAC.pier, 2, 9)),
  leg('C: down the steps to the street, past the guard, the coin', coin(PAC.pier, 18, 15)),
  leg('C: the street\'s second coin', coin(PAC.pier, 25, 15)),
  leg('C: back to the first step and up the rope to the roofs, the coin', livesFor(coin(PAC.pier, 14, 5), 60)),
  leg('C: along the roofs past the coconut to the second coin', coin(PAC.pier, 24, 5)),
  leg('C to D: out along the roofs, high', into(PAC.surf, 31, 5, PAC.pier, above(9))),
  leg('D: the promenade\'s coin', coin(PAC.surf, 17, 5)),
  leg('D: the promenade\'s other coin', coin(PAC.surf, 15, 5)),
  leg('D: down the rope to the beach, the coin', coin(PAC.surf, 12, 15)),
  leg('D: along the beach past the surfer, the coin', coin(PAC.surf, 19, 15)),
  leg('D: up the shop\'s rope to the loft and the snorkel', item(PAC.surf, 0, [4, 11])),
  leg('D: the loft\'s coin', coin(PAC.surf, 6, 11)),
  leg('D to E: up the promenade and the cliff rope to the luau', into(PAC.lei, 28, 0, PAC.surf)),
  leg('E: the first gap between the torches, its coin', coin(PAC.lei, 25, 15)),
  leg('E: the second gap, its coin', coin(PAC.lei, 20, 16)),
  leg('E: the third gap, its coin', coin(PAC.lei, 15, 16)),
  leg('E: up the steps to the lei, the coin on the way', coin(PAC.lei, 9, 14)),
  leg('E: the lei', item(PAC.lei, 0, [3, 10])),
  leg('E to D: back past the torches and down the rope', into(PAC.surf, 28, 19, PAC.lei)),
  leg('D to F: down to the beach and wading into the sea (open now)', into(PAC.clam, 31, 17, PAC.surf)),
  leg('F: the coin by the arch', coin(PAC.clam, 10, 11)),
  leg('F: the coin by the tall rock', coin(PAC.clam, 20, 13)),
  leg('F: the coin by the hanging rock', coin(PAC.clam, 14, 9)),
  leg('F: the coin in the open water', coin(PAC.clam, 24, 7)),
  leg('F: the coin at the surface', coin(PAC.clam, 5, 9)),
  leg('F to G: out right to Molokai', into(PAC.mole, 31, 17, PAC.clam)),
  leg('G: the first wall\'s coin', coin(PAC.mole, 6, 15)),
  leg('G: the second wall\'s coin (the crab)', coin(PAC.mole, 14, 13)),
  leg('G: the high wall\'s coin', coin(PAC.mole, 18, 11)),
  leg('G: the fourth wall\'s coin', coin(PAC.mole, 23, 13)),
  leg('G: the far shore\'s coin', coin(PAC.mole, 29, 17)),
  leg('G to H: down into the second reef', into(PAC.kelp, 31, 17, PAC.mole)),
  leg('H: the coin by the coral', coin(PAC.kelp, 11, 14)),
  leg('H: the coin over the rock', coin(PAC.kelp, 23, 8)),
  leg('H: the coin by the cliffs', coin(PAC.kelp, 4, 11)),
  leg('H: the coin by the far kelp', coin(PAC.kelp, 28, 14)),
  leg('H: the coin under the slipway', coin(PAC.kelp, 15, 6)),
  leg('H to L: east into the sea cave', into(PAC.cave, 31, 17, PAC.kelp)),
  leg('L: the first coin', coin(PAC.cave, 8, 13)),
  leg('L: the second coin', coin(PAC.cave, 15, 11)),
  leg('L: the third coin', coin(PAC.cave, 22, 14)),
  leg('L: the far coin', coin(PAC.cave, 28, 16)),
  leg('L: back across the cave above the coral', swimTo(PAC.cave, 20, 9)),
  leg('L: left between the stalactites', swimTo(PAC.cave, 8, 9)),
  leg('L: down the cave\'s west end', swimTo(PAC.cave, 3, 15)),
  leg('L to H: back out to the reef', into(PAC.kelp, 0, 17, PAC.cave)),
  leg('H to I: up through the ceiling to the slipway', into(PAC.whale, 15, 0, PAC.kelp)),
  leg('I: up to the brig\'s deck, past the tiki, the coin', coin(PAC.whale, 6, 12)),
  leg('I: up the mast\'s rope to the spar and its coin', coin(PAC.whale, 9, 5)),
  leg('I: back to the quay, the coin by the canoe', coin(PAC.whale, 22, 15)),
  leg('I: along the quay, the far coin', coin(PAC.whale, 29, 15)),
  leg('I to J: out along the quay to the road', into(PAC.road, 31, 16, PAC.whale)),
  leg('J: over the first bridge behind its car, the coin', coin(PAC.road, 14, 15)),
  leg('J: the first level\'s end coin', coin(PAC.road, 27, 15)),
  leg('J: up the bamboo to the second level', stands(PAC.road, 13, 22, 27)),
  leg('J: over the second bridge, the coin', coin(PAC.road, 18, 10)),
  leg('J: the second level\'s end coin', coin(PAC.road, 6, 10)),
  leg('J: up the bamboo to the third level', stands(PAC.road, 8, 4, 8)),
  leg('J: over the third bridge, the coin', coin(PAC.road, 16, 5)),
  leg('J: the last coin, past the coconut', coin(PAC.road, 27, 5)),
  leg('J to K: out onto the headland', into(PAC.hana, 31, 6, PAC.road)),
  leg('K: the coin on the headland', coin(PAC.hana, 8, 6)),
  leg('K: down the bamboo rope to the beach', stands(PAC.hana, 18, 15, 19)),
  leg('K: past the crab, the beach\'s coin', coin(PAC.hana, 16, 16)),
  leg('K: the coin on the steps', coin(PAC.hana, 24, 14)),
  leg('K: up to the cave\'s ledge and the musubi', item(PAC.hana, 0, [28, 12])),
  leg('K: the coin above it', coin(PAC.hana, 28, 11)),
  leg('K to M: into the cove and down into the third reef', into(PAC.fish, 21, 19, PAC.hana)),
  leg('M: the first coin', coin(PAC.fish, 7, 11)),
  leg('M: the second coin', coin(PAC.fish, 16, 13)),
  leg('M: the third coin', coin(PAC.fish, 24, 8)),
  leg('M: the coin near the surface', coin(PAC.fish, 12, 6)),
  leg('M to N: out to the coast', into(PAC.coffee, 31, 17, PAC.fish)),
  leg('N: the first coin on the shore', coin(PAC.coffee, 10, 16)),
  leg('N: the second coin on the shore', coin(PAC.coffee, 24, 16)),
  leg('N: up the rope to the first terrace, the coin', coin(PAC.coffee, 8, 9)),
  leg('N: up the rope to the shed and the musubi', item(PAC.coffee, 0, [5, 6])),
  leg('N: along the terraces to the second terrace\'s coin', coin(PAC.coffee, 18, 7)),
  leg('N: the top terrace\'s coin', coin(PAC.coffee, 26, 5)),
  leg('N: back down the rope to the shore', stands(PAC.coffee, 19, 0, 8)),
  leg('N to O: out along the shore, low, to the volcano', into(PAC.mauna, 31, 17, PAC.coffee, (g) => g.y === standY(19))),
  leg('O: onto the first ledge, its coin', outOfLava(coin(PAC.mauna, 6, 15))),
  leg('O: the second ledge\'s coin', outOfLava(coin(PAC.mauna, 11, 13))),
  leg('O: up the rope to the snow shelf and its coin', outOfLava(coin(PAC.mauna, 4, 5))),
  leg('O: down to the third ledge, its coin', outOfLava(coin(PAC.mauna, 17, 11))),
  leg('O: the fourth ledge\'s coin', outOfLava(coin(PAC.mauna, 23, 9))),
  leg('O to P: out along the rim to the terminal', into(PAC.hilo, 31, 7, PAC.mauna)),
  leg('P: the coin on the terminal\'s roof', coin(PAC.hilo, 4, 7)),
  leg('P: down the roof\'s rope to the apron', stands(PAC.hilo, 17, 7, 9)),
  leg('P: through the customs shed (the guard has gone), the coin', coin(PAC.hilo, 10, 15)),
  leg('P: up the loader to the catwalk', stands(PAC.hilo, 7, 15, 17)),
  leg('P: along the catwalk, the first coin', coin(PAC.hilo, 20, 5)),
  leg('P: the second coin', coin(PAC.hilo, 26, 5)),
  leg('P to Q: out along the catwalk into the plane', into(PAC.hold, 31, 5, PAC.hilo)),
  leg('Q: the coin on the sill', coin(PAC.hold, 4, 5)),
  leg('Q: down the net, the coin on it', coin(PAC.hold, 9, 11)),
  leg('Q: the roller floor\'s coin past the first crate', coin(PAC.hold, 14, 14)),
  leg('Q: up the first pallet past the second crate, its coin', livesFor(coin(PAC.hold, 20, 12), 60)),
  leg('Q: onto the high pallet and the parachute', item(PAC.hold, 0, [25, 10])),
  leg('Q: the coin beside it', coin(PAC.hold, 27, 10)),
];
