/**
 * China's route for the bot: the goals, in the order a player who takes everything plays them (from Siberia's border village through the wall's tunnel, up the
 * hutong's shelves and past the firecrackers for the key, back, up the wall's flank and its top to the tower, the walkway and the trapdoor to the wall's top for
 * the rice hat, down through the market under the dragon to the gate, the palace, the garden's stones for the bamboo, the well, the quay and the raft), as
 * functions on the game. Shared by the bot test and the pictures.
 */
import { CHI } from '../src/china';
import { SIB } from '../src/siberia';
import { coin, into, item, leg, stands, type Leg } from './route';

export const CHINA_LEGS: readonly Leg[] = [
  leg('G to A: east from the village onto the wall\'s foot', into(CHI.wall, 31, 15, SIB.border)),
  leg('A: through the tunnel under the wall to the hutong', into(CHI.alley, 31, 15, CHI.wall)),
  leg('D: the coin at the lane\'s end past the monk', coin(CHI.alley, 27, 15)),
  leg('D to L: on east along the lane to Houhai (DON\'T ROCK THE BOAT, a bonus room)', into(CHI.houhai, 31, 15, CHI.alley)),
  leg('L: out on the west boat, across to the east one while they wait together, on to the far bank\'s coin', coin(CHI.houhai, 28, 15)),
  leg('L: the coin over the boats\' meeting place', coin(CHI.houhai, 16, 13)),
  leg('L to D: back over the lake by the boats and west along the lane', into(CHI.alley, 0, 15, CHI.houhai)),
  leg('D: the coin on the shelves', coin(CHI.alley, 12, 11)),
  leg('D: up onto the roof ledge', stands(CHI.alley, 9, 17, 19)),
  leg('D: along the ledge past the firecrackers to the key', item(CHI.alley, 0, [28, 7])),
  leg('D: standing at the ledge\'s end beyond the last firecracker', stands(CHI.alley, 9, 28, 29)),
  leg('D: back along the ledge and down to the lane', stands(CHI.alley, 17, 2, 6)),
  leg('D to A: back west under the wall', into(CHI.wall, 0, 15, CHI.alley)),
  leg('A: the coin on the stair\'s middle step', coin(CHI.wall, 8, 11)),
  leg('A: back down to the tunnel and up the rope under the chamber', { goal: (g) => g.roomId === CHI.wall && g.onRope !== 0 && g.montyRow <= 15 && !g.freeze && !g.script, aim: [{ room: CHI.wall, col: 19, row: 12 }] }),
  leg('A: up the rope into the chamber in the wall, the coin there', coin(CHI.wall, 15, 11)),
  leg('A: up to the wall\'s top', stands(CHI.wall, 9, 14, 20)),
  leg('A: along the wall to the dumplings', item(CHI.wall, 0, [28, 7])),
  leg('A to T: back to the rope and up it into the tower', into(CHI.tower, 25, 0, CHI.wall)),
  leg('T: past the warrior to the coin on the stair', coin(CHI.tower, 7, 11)),
  leg('T: up the stair onto the walkway, the coin on it', coin(CHI.tower, 24, 7)),
  leg('T: along the walkway to the trapdoor\'s rope and up it', into(CHI.top, 16, 0, CHI.tower)),
  leg('C: the coin by the steps', coin(CHI.top, 23, 13)),
  leg('C: the coin on the long walkway', coin(CHI.top, 14, 9)),
  leg('C: up the left to the beacon\'s platform and the rice hat', item(CHI.top, 0, [27, 3])),
  leg('C to T: back down the floor gap\'s rope', into(CHI.tower, 16, 19, CHI.top)),
  leg('T to E: along the walkway east to the awnings, the coin on them', coin(CHI.market, 6, 7)),
  leg('E: down the awnings\' rope to the street', stands(CHI.market, 17, 11, 14)),
  leg('E: along the street under the dragon, the coin there', coin(CHI.market, 21, 15)),
  leg('E to F: out east to the gate', into(CHI.gate, 31, 15, CHI.market)),
  leg('F: the coin in the outer court past the lion', coin(CHI.gate, 8, 15)),
  leg('F: up the rope to the gallery over the outer court, the coin there', coin(CHI.gate, 6, 7)),
  leg('F: through the doors the hat opened, the coin in the inner court', coin(CHI.gate, 28, 15)),
  leg('F to G: up the rope past the guard', into(CHI.roofs, 24, 0, CHI.gate)),
  leg('G: west along the courtyard to the dumplings', item(CHI.roofs, 0, [4, 15])),
  leg('G to K: on west along the ridge into HEAVEN CAN WAIT', into(CHI.heaven, 0, 15, CHI.roofs)),
  leg('K: up the eaves to the coin at the top', coin(CHI.heaven, 15, 9)),
  leg('K to G: back east along the ridge', into(CHI.roofs, 31, 15, CHI.heaven)),
  leg('G: the coin on the courtyard', coin(CHI.roofs, 12, 15)),
  leg('G: up the eaves to the ridge, the coin on it', coin(CHI.roofs, 26, 7)),
  leg('G to H: along the ridge east to the garden', into(CHI.willow, 31, 7, CHI.roofs)),
  leg('H: down the steps to the shore', stands(CHI.willow, 15, 9, 11)),
  leg('H: over the first gap onto the stone, the coin over the next', coin(CHI.willow, 19, 13)),
  leg('H: across the stones to the island and the bamboo', item(CHI.willow, 0, [29, 13])),
  leg('H: back across the stones to the shore', stands(CHI.willow, 15, 9, 11)),
  leg('H to J: up the steps, down the well\'s rope to the quay', into(CHI.junk, 3, 19, CHI.willow)),
  leg('J: up the crane\'s rope onto its arm over the jetty, the coin there', coin(CHI.junk, 10, 9)),
  leg('J: along the jetty (it gives way behind him) and over the raft to the junk\'s deck', stands(CHI.junk, 17, 26, 27)),
  leg('J: to the junk\'s deck at the way east into Japan', stands(CHI.junk, 17, 28, 29)),
];
