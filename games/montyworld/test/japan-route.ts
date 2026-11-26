/**
 * Japan's route for the bot: the goals, in the order a player who takes everything plays them (from China's junk onto the harbour's quay, the crates and the market's
 * roof for the sushi, the rooftops, down the drainpipe, the stairs to the parlour (the prize shelf's coin), the underpass to the platform and up its first stairs for the daruma at its west end, up the rope to the crossing for the fish
 * food, back down and east past the shutter and the trains, Fuji's switchbacks, the garden's pond and pergola to THE LAST MOLE for the hood, back to the gate and through
 * the hall (the paper doors, the rope past them up to the gallery and back west along it to the rope up) and the hideout's door (the hood) and down its shaft to the port and the cargo ship's gangway), as functions on the game. Shared by the
 * bot test and the pictures.
 */
import { CAVE, FUJI, GROVE, JP } from '../src/japan';
import { above, coin, into, item, leg, stands, type Leg, type Part } from './route';

/** A leg ended hanging on the second stairs' rope below the deck (cols 19-21), where a train sweeping the lane cannot reach him: a leg that ended on the deck itself could end with a train a step behind him. */
function underTheDeck(part: Part): Part {
  return { ...part, goal: (g) => part.goal(g) && g.roomId === JP.platform && g.onRope !== 0 && g.montyCol - 4 >= 19 && g.montyCol - 4 <= 21 && g.y >= 50 + 17 * 8 };
}

/** A leg ended hanging on the first stairs' rope below the deck (cols 8-10), as `underTheDeck`. */
function underTheFirstDeck(part: Part): Part {
  return { ...part, goal: (g) => part.goal(g) && g.roomId === JP.platform && g.onRope !== 0 && g.montyCol - 4 >= 8 && g.montyCol - 4 <= 10 && g.y >= 50 + 17 * 8 };
}

/** A leg that ends west of a column: the third tier's coin is on the east ninja's lane, and a leg that ended with him cornered east of it would hand the next one no way out (the search then finds none). */
function westOf(part: Part, col: number): Part {
  return { ...part, goal: (g) => part.goal(g) && g.montyCol - 4 <= col };
}

/** A leg that ends with no creature within three cells of him: the gallery's coin is on the lantern ghost's beat, and a leg that ended with it on top of him would hand the next one no way out. */
function clearOfCreatures(part: Part): Part {
  return { ...part, goal: (g) => part.goal(g) && g.enemies.every((e) => e.x === 0xff || Math.abs(e.x - (g.montyCol - 4) * 8) > 24 || Math.abs(e.y - g.y) > 24) };
}

export const JAPAN_LEGS: readonly Leg[] = [
  leg('A: over the inlet, the coin on the first crate', coin(JP.harbour, 15, 13)),
  leg('A: up the stair of crates onto the market\'s roof, the coin at its east end', coin(JP.harbour, 28, 5)),
  leg('A: along the market\'s roof to the sushi at its west end', item(JP.harbour, 0, [9, 5])),
  leg('A to B: out high along the roof', into(JP.street, 31, 5, JP.harbour, above(10))),
  leg('B: along the rooftops, the coin over the pit', coin(JP.street, 12, 5)),
  leg('B: down the drainpipe to the street', stands(JP.street, 17, 2, 6)),
  leg('B: the coin in the street', coin(JP.street, 14, 15)),
  leg('B to C: down the stairs\' rope into the parlour', into(JP.parlour, 21, 19, JP.street)),
  leg('C: up the rope to the middle floor, along it past the ball stream (in its lull) to the coin', coin(JP.parlour, 16, 9)),
  leg('C: up the rope to the top floor, the coin past the ghost on the rope', coin(JP.parlour, 25, 3)),
  leg('C: down the rope to the lane (waiting on it for the lucky cat: its foot is in the cat\'s walk), across the lane under the crusher, up the stair past the claw machine to the prize shelf and its coin', coin(JP.parlour, 3, 7)),
  leg('C to E: out east, low, to the underpass', into(JP.platform, 31, 15, JP.parlour)),
  leg('E: the coin in the underpass\'s pocket', coin(JP.platform, 27, 15)),
  leg('E: up the first stairs onto the platform between two trains, west to the daruma, and back down the stairs\' rope below the deck', underTheFirstDeck(item(JP.platform, 0, [3, 12]))),
  leg('E: up the second stairs onto the platform, the coin out in the middle of the lane between the two stairs, and back down the stairs\' rope below the deck before a train comes', underTheDeck(coin(JP.platform, 16, 12))),
  leg('E to D: up the crossing\'s rope', into(JP.crossing, 23, 0, JP.platform)),
  leg('D: the coin in the street past the crossing (on the green man)', coin(JP.crossing, 19, 14)),
  leg('D: the coin in the street\'s east pocket', coin(JP.crossing, 25, 15)),
  leg('D: up the rope to the overpass, the coin on it', coin(JP.crossing, 16, 5)),
  leg('D: along the overpass to the fish food', item(JP.crossing, 0, [24, 5])),
  leg('D to E: back down to the street and the subway\'s rope', into(JP.platform, 23, 19, JP.crossing)),
  leg('E to F: along the platform past the trains, through the shutter the daruma rolled up', into(JP.fuji, 31, 13, JP.platform)),
  leg('F: over the gap by the way in, the coin on the first ledge', coin(JP.fuji, 17, 12)),
  leg('F to W: back west off the first ledge into the gap and down the mountainside into the ice cave at its foot (GONE WITH THE WIND, a bonus room)', into(JP.cave, 10, 19, JP.fuji)),
  leg('W: across the snow heap and down its hole into the lava tube', stands(JP.cave, CAVE.floor, CAVE.hole.col0, CAVE.hole.col1)),
  leg('W: east under the first icicle, over the hump, past the yuki-onna, the coin under the second icicle', coin(JP.cave, 20, 16)),
  leg('W: the coin on the ice mound', coin(JP.cave, 22, 14)),
  leg('W to F: into the tengu\'s gust, set down at the top of the mountain\'s climb', { ...stands(JP.fuji, FUJI.top.floor, FUJI.top.col - 1, FUJI.top.col + 1), aim: [{ room: JP.cave, col: CAVE.gust.col, row: CAVE.floor - 2 }] }),
  leg('F: down onto the second ledge, the coin under the top hut\'s eaves', coin(JP.fuji, 25, 6)),
  leg('F: the coin on the steps (between two snowballs) and back to the top hut', coin(JP.fuji, 24, 10)),
  leg('F to G: up the chain', into(JP.garden, 5, 0, JP.fuji)),
  leg('G: the coin before the temple', coin(JP.garden, 16, 12)),
  leg('G: over the pond\'s planks (the koi gone), the coin over them', coin(JP.garden, 19, 11)),
  leg('G to L: up the pergola and the bamboo rope', into(JP.mole, 28, 0, JP.garden)),
  leg('L: out over the stepping stones (the koi\'s leaps, the two middle stones sinking), up the bamboo rope to the high ledge and its coin', coin(JP.mole, 17, 4)),
  leg('L: down the bamboo rope, across the widest water on the swinging rope to the shrine and the hood', item(JP.mole, 0, [1, 12])),
  leg('L to S: west off the shrine\'s plinth into the bamboo grove (SHOOT FOR THE MOON, a bonus room)', into(JP.grove, 0, 12, JP.mole)),
  ...GROVE.stalks.map(([col], i) => leg(`S: a jump to bamboo stalk ${i + 1}, gripped on the way down`, { goal: (g) => g.roomId === JP.grove && g.onRope !== 0 && g.montyCol - 4 >= col - 1 && g.montyCol - 4 <= col && !g.freeze && !g.script, aim: [{ room: JP.grove, col, row: 8 }] })),
  leg('S: on to the stone on the cedar, its coin', coin(JP.grove, 3, 5)),
  leg('S: back to the tallest stalk, the coin at its head', coin(JP.grove, 16, 1)),
  leg('S to L: back over the stream stalk by stalk and east to the shrine', into(JP.mole, 31, 12, JP.grove)),
  leg('L to G: back on the swinging rope, over the sinking stones and the koi, and down the rope', into(JP.garden, 28, 19, JP.mole)),
  leg('G to I: out through the castle gate', into(JP.hall, 31, 13, JP.garden)),
  leg('I: through the first door, into the space between it and the second', stands(JP.hall, 14, 8, 11)),
  leg('I: through the second door into the space before the third', stands(JP.hall, 14, 14, 17)),
  leg('I: through the third door to the foot of the rope past it', stands(JP.hall, 14, 20, 22)),
  leg('I: up the rope to the gallery and back west along it to the coin', clearOfCreatures(coin(JP.hall, 8, 6))),
  leg('I to H: on west along the gallery to the rope at the left and up it to the woods outside (the hall\'s far end is walled)', into(JP.hideout, 4, 0, JP.hall)),
  leg('H: the coin on the first walkway', coin(JP.hideout, 9, 13)),
  leg('H: the coin on the hideout\'s ridge (and back west, clear of the samurai)', westOf(coin(JP.hideout, 26, 9), 21)),
  leg('H: the coin on the lookout, over the rotten boards', coin(JP.hideout, 11, 5)),
  leg('H: the sushi at the end of the door\'s corridor (the guard gone), beyond the shaft\'s gap', item(JP.hideout, 0, [28, 15])),
  leg('H to I: back to the gap and down the shaft, the rope', into(JP.hall, 25, 19, JP.hideout)),
  leg('I to J: on down the hall\'s shaft to the port', into(JP.port, 25, 19, JP.hall)),
  leg('J: the coin on the quay past the crab', coin(JP.port, 23, 15)),
  leg('J: along the quay past the sumo onto the container stair\'s first step', stands(JP.port, 15, 9, 11)),
  leg('J: the coin on top of the containers past the sumo', coin(JP.port, 4, 9)),
  leg('J: up the gangway onto the ship\'s deck at the sign', stands(JP.port, 13, 28, 29)),
];
