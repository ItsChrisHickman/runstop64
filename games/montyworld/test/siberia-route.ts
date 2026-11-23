/**
 * Siberia's route for the bot (docs/dosvidaniya-reset.md, "Siberia (the Trans-Siberian)"): the goals, in the order a player who takes everything plays them. Onto the dining
 * car's roof from Moscow's carriage, down its first hatch (the coin) to the pelmeni in its dead end, back up; along the roof to the sleeper, into the closet while the mountain
 * goes over, then up the pine before the next; the yeti's cave (the coin on the bridge, the ticket); back down the pine and west along the roof under the mountain to the
 * closet, whose floor the ticket has opened, down into the corridor and east through the gangway (the inspector has seen the ticket) into the tender; the coal, the tipple,
 * the mine's hairpin, the river's ice, China's road.
 * As functions on the game; shared by the bot test and the pictures.
 */
import { CLOSET, SIB } from '../src/siberia';
import { ROOM } from '../src/moscow';
import { above, coin, into, item, leg, standY, stands, type Leg } from './route';

export const SIBERIA_LEGS: readonly Leg[] = [
  leg('I to A: aboard, up the hatch ladder, along the roof into the dining car', into(SIB.gravy, 31, 7, ROOM.station)),
  leg('A: down the first hatch, the coin two rungs down', coin(SIB.gravy, 13, 11)),
  leg('A: down into the car, west past the conductor to the pelmeni', item(SIB.gravy, 0, [3, 15])),
  leg('A: back up a hatch to the roof', stands(SIB.gravy, 9, 0, 31)),
  leg('A to B: along the roof to the sleeper', into(SIB.sleeper, 31, 7, SIB.gravy, above(10))),
  leg('B: down into the luggage closet', stands(SIB.sleeper, 13, 9, 11)),
  leg('B: in the closet while the mountain goes over', { goal: (g) => g.roomId === SIB.sleeper && g.tunnels.some((t) => t.state === 'sweep' && t.left + t.spec.cols <= CLOSET.left) && g.y >= standY(CLOSET.floor) - 24, aim: [{ room: SIB.sleeper, col: 10, row: 11 }] }),
  leg('B to Y: out at once and up the pine before the next', into(SIB.yeti, 20, 0, SIB.sleeper)),
  leg('Y: up the ice stair to the bridge, the coin in the yeti\'s lane', coin(SIB.yeti, 13, 8)),
  leg('Y: up the ledges to the ticket under the icicle', item(SIB.yeti, 0, [18, 3])),
  leg('Y to B: back down the pine', into(SIB.sleeper, 20, 19, SIB.yeti)),
  leg('B: the coin over the roof, a jump on the way west from the pine', coin(SIB.sleeper, 16, 5)),
  leg('B: west along the roof to the closet and down through its open floor into the corridor', { ...stands(SIB.sleeper, 17, 2, 29), aim: [{ room: SIB.sleeper, col: CLOSET.hatch, row: 15 }] }),
  leg('B: the coin in front of the inspector\'s gangway, past the provodnitsa', coin(SIB.sleeper, 27, 15)),
  leg('B to C: through the gangway the inspector has left', into(SIB.coal, 31, 16, SIB.sleeper)),
  leg('C: up the coal, the coin on the crest under the stoker', coin(SIB.coal, 11, 10)),
  leg('C: on up to the cab\'s roof', stands(SIB.coal, 11, 18, 26)),
  leg('C to M: up the ladder to the tipple and east along it', into(SIB.mine, 31, 3, SIB.coal)),
  leg('M: east along the gantry and down the ladder to the dock', stands(SIB.mine, 18, 21, 28)),
  leg('M: up the timber ledges, the coin at the top', coin(SIB.mine, 24, 12)),
  leg('M: the cart west over the working, the coin on the west dock', coin(SIB.mine, 2, 16)),
  leg('M to G: down the rope through the dock', into(SIB.border, 5, 19, SIB.mine)),
  leg('G: over the first ice to the sandbar, its coin', coin(SIB.border, 16, 15)),
  leg('G: over the second ice, past the reindeer and the guard, past the raised barrier', stands(SIB.border, 17, 29, 31)),
];
