/**
 * Japan's route for the bot: the goals, in the order a player who takes everything plays them (from China's junk onto the harbour's quay, the crates and the market's
 * roof for the sushi, the rooftops, down the drainpipe, the stairs to the parlour for the daruma, the underpass to the platform, up the rope to the crossing for the fish
 * food, back down and east past the shutter and the trains, Fuji's switchbacks, the garden's pond and pergola to THE LAST MOLE for the hood, back to the gate and through
 * the hall (the paper doors, the guard gone) with the roofs' dead end on the way, down to the port and the cargo ship's gangway), as functions on the game. Shared by the
 * bot test and the pictures.
 */
import { JP } from '../src/japan';
import { above, coin, into, item, leg, stands, type Leg } from './route';

export const JAPAN_LEGS: readonly Leg[] = [
  leg('A: over the inlet, the coin on the first crate', coin(JP.harbour, 15, 13)),
  leg('A: up the stair of crates onto the market\'s roof, the coin at its east end', coin(JP.harbour, 28, 5)),
  leg('A: along the market\'s roof to the sushi at its west end', item(JP.harbour, 0, [9, 5])),
  leg('A to B: out high along the roof', into(JP.street, 31, 5, JP.harbour, above(10))),
  leg('B: along the rooftops, the coin over the pit', coin(JP.street, 12, 5)),
  leg('B: down the drainpipe to the street', stands(JP.street, 17, 2, 6)),
  leg('B: the coin in the street', coin(JP.street, 14, 15)),
  leg('B to C: down the stairs\' rope into the parlour', into(JP.parlour, 21, 19, JP.street)),
  leg('C: the coin by the machines', coin(JP.parlour, 22, 14)),
  leg('C: past the claw to the prize shelf and the daruma', item(JP.parlour, 0, [3, 7])),
  leg('C: the coin on the shelf', coin(JP.parlour, 6, 7)),
  leg('C to E: out east, low, to the underpass', into(JP.platform, 31, 15, JP.parlour)),
  leg('E: the coin in the underpass\'s pocket', coin(JP.platform, 27, 15)),
  leg('E: up the second stairs onto the platform, the coin on it', coin(JP.platform, 25, 12)),
  leg('E to D: up the crossing\'s rope', into(JP.crossing, 23, 0, JP.platform)),
  leg('D: the coin in the street past the sumo', coin(JP.crossing, 19, 14)),
  leg('D: the coin in the street\'s east pocket', coin(JP.crossing, 25, 15)),
  leg('D: up the rope to the overpass, the coin on it', coin(JP.crossing, 16, 5)),
  leg('D: along the overpass to the fish food', item(JP.crossing, 0, [24, 5])),
  leg('D to E: back down to the street and the subway\'s rope', into(JP.platform, 23, 19, JP.crossing)),
  leg('E to F: along the platform past the trains, through the shutter the daruma rolled up', into(JP.fuji, 31, 13, JP.platform)),
  leg('F: the coin on the first ledge', coin(JP.fuji, 17, 12)),
  leg('F: the coin on the steps', coin(JP.fuji, 24, 10)),
  leg('F: the coin on the second ledge', coin(JP.fuji, 12, 6)),
  leg('F to G: up the chain', into(JP.garden, 5, 0, JP.fuji)),
  leg('G: the coin before the temple', coin(JP.garden, 16, 12)),
  leg('G: over the pond\'s planks (the koi gone), the coin over them', coin(JP.garden, 19, 11)),
  leg('G to L: up the pergola and the bamboo rope', into(JP.mole, 28, 0, JP.garden)),
  leg('L: out over the stepping stones, the coin over the gap', coin(JP.mole, 14, 10)),
  leg('L: to the shrine and the hood', item(JP.mole, 0, [1, 12])),
  leg('L to G: back over the stones and down the rope', into(JP.garden, 28, 19, JP.mole)),
  leg('G to I: out through the castle gate', into(JP.hall, 31, 13, JP.garden)),
  leg('I: the coin before the first door', coin(JP.hall, 2, 12)),
  leg('I to H: up the rope to the roofs', into(JP.tiers, 4, 0, JP.hall)),
  leg('H: the coin on the first tier', coin(JP.tiers, 12, 13)),
  leg('H: the coin on the third tier', coin(JP.tiers, 26, 9)),
  leg('H: the coin on the fifth tier', coin(JP.tiers, 10, 5)),
  leg('H: the sushi on the top tier', item(JP.tiers, 0, [18, 3])),
  leg('H to I: back down the rope', into(JP.hall, 4, 19, JP.tiers)),
  leg('I to J: through the three doors past the guard to the floor gap and down the rope', into(JP.port, 25, 19, JP.hall)),
  leg('J: the coin on the quay past the crab', coin(JP.port, 21, 15)),
  leg('J: the coin on top of the containers past the sumo', coin(JP.port, 4, 9)),
  leg('J: up the gangway onto the ship\'s deck at the sign', stands(JP.port, 13, 28, 29)),
];
