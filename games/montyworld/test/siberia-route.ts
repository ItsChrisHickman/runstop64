/**
 * Siberia's route for the bot: the goals, in the order a player who takes everything plays them (from Moscow's carriage roof along the
 * train, down every hatch, the tender's ticket, the forest and the yeti's hollow, the mine's lamp, the dark shaft, the lake, to the
 * village and the lifted barrier), as functions on the game. Shared by the bot test and the pictures.
 */
import { SIB } from '../src/siberia';
import { ROOM } from '../src/moscow';
import { coin, into, item, leg, stands, type Leg } from './route';

export const SIBERIA_LEGS: readonly Leg[] = [
  leg('I to A: along the carriage roof into the dining car', into(SIB.gravy, 31, 7, ROOM.station)),
  leg('A: down the first hatch to the pelmeni in the left pocket', item(SIB.gravy, 0, [3, 15])),
  leg('A: along the car past the inspector to the coin in the right pocket', coin(SIB.gravy, 28, 15)),
  leg('A: up the second rope to the roof', stands(SIB.gravy, 9, 27, 29)),
  leg('A to B: along the roof', into(SIB.sleeper, 31, 7, SIB.gravy)),
  leg('B: down the first hatch to the coin in the left pocket', coin(SIB.sleeper, 3, 15)),
  leg('B: along the corridor past the inspector to the right pocket\'s coin', coin(SIB.sleeper, 27, 15)),
  leg('B: back up to the roof', stands(SIB.sleeper, 9, 17, 21)),
  leg('B to C: east along the roof to the tender', into(SIB.coal, 31, 7, SIB.sleeper)),
  leg('C: down the coal to the coin over the trough', coin(SIB.coal, 15, 13)),
  leg('C: up the heaps to the ticket on the cab', item(SIB.coal, 0, [28, 7])),
  leg('C to B: back along the rim', into(SIB.sleeper, 0, 7, SIB.coal)),
  leg('B to F: up the pine\'s rope', into(SIB.pines, 22, 1, SIB.sleeper)),
  leg('F: the coin on the ground past the bear', coin(SIB.pines, 17, 15)),
  leg('F to O: west past the wolf', into(SIB.yeti, 0, 14, SIB.pines)),
  leg('O: the coin on the ledges', coin(SIB.yeti, 6, 11)),
  leg('O: the pelmeni at the top of the stair', item(SIB.yeti, 0, [2, 9])),
  leg('O to F: back past the yeti', into(SIB.pines, 31, 15, SIB.yeti)),
  leg('F: up the rope to the boughs', stands(SIB.pines, 7, 4, 25)),
  leg('F: the coin on the boughs', coin(SIB.pines, 14, 5)),
  leg('F to M: out east, high', into(SIB.mine, 31, 5, SIB.pines)),
  leg('M: the cart down to the gallery', stands(SIB.mine, 18, 0, 31)),
  leg('M: the lamp in the left pocket', item(SIB.mine, 0, [3, 16])),
  leg('M: the coin up the timber ledges', coin(SIB.mine, 19, 10)),
  leg('M to S: east along the gallery', into(SIB.shaft, 31, 16, SIB.mine)),
  leg('S: over the wall by the ledges the lamp shows, the coin on its top', coin(SIB.shaft, 15, 8)),
  leg('S to L: through the floor into the lake', into(SIB.lake, 28, 12, SIB.shaft)),
  leg('L: the coin on the shore', coin(SIB.lake, 25, 10)),
  leg('L: over the first ice to the coin on the island', coin(SIB.lake, 14, 10)),
  leg('L to G: over the second ice and down the rope', into(SIB.border, 5, 16, SIB.lake)),
  leg('G: the coin on the first woodpile', coin(SIB.border, 12, 13)),
  leg('G: the coin past the woodpile', coin(SIB.border, 24, 15)),
  leg('G: through the barrier the ticket lifted, to the planks', stands(SIB.border, 17, 28, 29)),
];
