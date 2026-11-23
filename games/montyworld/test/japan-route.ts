/**
 * Japan's route for the bot: the goals, in the order a player who takes everything plays them (from China's junk onto the harbour's quay, the crates and the market's
 * roof for the sushi, the rooftops, down the drainpipe, the stairs to the parlour for the daruma, the underpass to the platform, up the rope to the crossing for the fish
 * food, back down and east past the shutter and the trains, Fuji's switchbacks, the garden's pond and pergola to THE LAST MOLE for the hood, back to the gate and through
 * the hall (the paper doors, the guard gone) with the hideout's dead end on the way, down to the port and the cargo ship's gangway), as functions on the game. Shared by the
 * bot test and the pictures.
 */
import { JP } from '../src/japan';
import { above, coin, into, item, leg, stands, type Leg, type Part } from './route';

/** A leg ended hanging on the second stairs' rope below the deck (cols 19-21), where a train sweeping the lane cannot reach him: a leg that ended on the deck itself could end with a train a step behind him. */
function underTheDeck(part: Part): Part {
  return { ...part, goal: (g) => part.goal(g) && g.roomId === JP.platform && g.onRope !== 0 && g.montyCol - 4 >= 19 && g.montyCol - 4 <= 21 && g.y >= 50 + 17 * 8 };
}

/** A leg that ends west of a column: the third tier's coin is on the east ninja's lane, and a leg that ended with him cornered east of it would hand the next one no way out (the search then finds none). */
function westOf(part: Part, col: number): Part {
  return { ...part, goal: (g) => part.goal(g) && g.montyCol - 4 <= col };
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
  leg('C: down the rope to the lane', stands(JP.parlour, 17, 18, 23)),
  leg('C: down and across the lane under the crusher, up the stair past the claw machine to the prize shelf and the daruma', item(JP.parlour, 0, [3, 7])),
  leg('C to E: out east, low, to the underpass', into(JP.platform, 31, 15, JP.parlour)),
  leg('E: the coin in the underpass\'s pocket', coin(JP.platform, 27, 15)),
  leg('E: up the second stairs onto the platform, the coin out in the middle of the lane between the two stairs, and back down the stairs\' rope below the deck before a train comes', underTheDeck(coin(JP.platform, 16, 12))),
  leg('E to D: up the crossing\'s rope', into(JP.crossing, 23, 0, JP.platform)),
  leg('D: the coin in the street past the crossing (on the green man)', coin(JP.crossing, 19, 14)),
  leg('D: the coin in the street\'s east pocket', coin(JP.crossing, 25, 15)),
  leg('D: up the rope to the overpass, the coin on it', coin(JP.crossing, 16, 5)),
  leg('D: along the overpass to the fish food', item(JP.crossing, 0, [24, 5])),
  leg('D to E: back down to the street and the subway\'s rope', into(JP.platform, 23, 19, JP.crossing)),
  leg('E to F: along the platform past the trains, through the shutter the daruma rolled up', into(JP.fuji, 31, 13, JP.platform)),
  leg('F: the coin on the first ledge', coin(JP.fuji, 17, 12)),
  leg('F: the coin on the steps', coin(JP.fuji, 24, 10)),
  leg('F: the coin on the second ledge', coin(JP.fuji, 12, 7)),
  leg('F to G: up the chain', into(JP.garden, 5, 0, JP.fuji)),
  leg('G: the coin before the temple', coin(JP.garden, 16, 12)),
  leg('G: over the pond\'s planks (the koi gone), the coin over them', coin(JP.garden, 19, 11)),
  leg('G to L: up the pergola and the bamboo rope', into(JP.mole, 28, 0, JP.garden)),
  leg('L: out over the stepping stones, up the bamboo rope to the high ledge and its coin', coin(JP.mole, 17, 4)),
  leg('L: to the shrine and the hood', item(JP.mole, 0, [1, 12])),
  leg('L to G: back over the stones and down the rope', into(JP.garden, 28, 19, JP.mole)),
  leg('G to I: out through the castle gate', into(JP.hall, 31, 13, JP.garden)),
  leg('I to H: up the rope to the woods outside', into(JP.hideout, 4, 0, JP.hall)),
  leg('H: the coin on the first walkway', coin(JP.hideout, 9, 13)),
  leg('H: the coin on the hideout\'s ridge (and back west, clear of the ninja)', westOf(coin(JP.hideout, 26, 9), 21)),
  leg('H: the coin on the lookout', coin(JP.hideout, 11, 5)),
  leg('H: the sushi at the end of the door\'s corridor (the guard gone)', item(JP.hideout, 0, [26, 15])),
  leg('H to I: back down the rope', into(JP.hall, 4, 19, JP.hideout)),
  leg('I: through the first door, into the space between it and the second', stands(JP.hall, 14, 8, 11)),
  leg('I: through the second door into the space before the third', stands(JP.hall, 14, 14, 17)),
  leg('I: back west through both doors, up the rope and along the gallery to the coin at its end', coin(JP.hall, 8, 6)),
  leg('I to J: through the third door past the guard (gone), to the floor gap and down the rope', into(JP.port, 25, 19, JP.hall)),
  leg('J: the coin on the quay past the crab', coin(JP.port, 23, 15)),
  leg('J: along the quay past the sumo onto the container stair\'s first step', stands(JP.port, 15, 9, 11)),
  leg('J: the coin on top of the containers past the sumo', coin(JP.port, 4, 9)),
  leg('J: up the gangway onto the ship\'s deck at the sign', stands(JP.port, 13, 28, 29)),
];
