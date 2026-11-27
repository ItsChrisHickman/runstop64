/**
 * Siberia's route for the bot (docs/dosvidaniya-reset.md, "Siberia (the Trans-Siberian)"): the goals, in the order a player who takes everything plays them. Onto the dining
 * car's roof from Moscow's carriage, down its first hatch (the coin) to the pelmeni in its dead end, back up; along the roof to the sleeper, into the closet while the mountain
 * goes over, then up the pine before the next; the yeti's cave (the coin on the bridge, the ticket); back down the pine and west along the roof under the mountain to the
 * closet, whose floor the ticket has opened, down into the corridor and east through the gangway (the inspector has seen the ticket) into the tender; along its corridor into the cab
 * (the coin), back to the steam valve's wheel (the steam leaves the roof's way and blows across the inside's), back west under the sleeper, up the closet, east along the roof under the
 * mountain (the vestibule) onto the tender's coal, across the cab's roof and up the tipple; the mine's hairpin, the river's ice, China's road.
 * As functions on the game; shared by the bot test and the pictures.
 */
import { CAB, CLOSET, SIB, STEAM, TAIGA } from '../src/siberia';
import { STEAM_VALVE } from '../src/data';
import { ROOM } from '../src/moscow';
import { above, coin, into, item, leg, settledOn, standY, stands, type Leg } from './route';

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
  leg('C: along the tender\'s corridor under the coal', stands(SIB.coal, 17, 3, 8)),
  leg('C: on across the footplate into the cab, past the stoker to the coin by the gauge', coin(SIB.coal, 20, 13)),
  leg('C: back to the corridor\'s end, a jump turns the wheel in its niche: the steam out of the bottom, across the way into the cab; the top quiet', { goal: (g) => g.roomId === SIB.coal && g.siCollected[STEAM_VALVE] !== 0 && g.montyCol - 4 <= CAB.front && settledOn(g), aim: [{ room: SIB.coal, col: STEAM.box.col0, row: STEAM.box.row0 }] }),
  leg('C to B: back west through the gangway into the sleeper\'s corridor', into(SIB.sleeper, 0, 16, SIB.coal)),
  leg('B: west past the provodnitsa and up the closet\'s ladder to the roof', { ...stands(SIB.sleeper, 9, 0, 31), aim: [{ room: SIB.sleeper, col: CLOSET.hatch, row: 11 }] }),
  leg('B to C: east along the roof under the mountain (the vestibule its shelter) onto the tender\'s coal', into(SIB.coal, 31, 7, SIB.sleeper, (g) => above(CAB.roof + 1)(g) && !g.actionCounter)),
  leg('C: over the coal\'s crest and across the quiet top of the pipe onto the cab\'s roof', stands(SIB.coal, CAB.roof, CAB.cabFrom, CAB.boiler - 1)),
  leg('C to M: under the bat while it is up, down onto the boiler, up the tipple\'s ladder and east along its deck', into(SIB.mine, 31, 3, SIB.coal)),
  leg('M: east along the gantry and down the ladder to the dock', stands(SIB.mine, 18, 21, 28)),
  leg('M: up the timber ledges, the coin at the top', coin(SIB.mine, 23, 12)),
  leg('M: the cart west over the working, the coin on the west dock', coin(SIB.mine, 2, 16)),
  leg('M to G: down the rope through the dock', into(SIB.border, 5, 19, SIB.mine)),
  leg('G to T: west along the village bank into the taiga (OFF THE BEATEN PATH, a bonus room)', into(SIB.taiga, 0, 15, SIB.border)),
  ...TAIGA.boughs.map(([col, floor, cols], i) => leg(`T: up the pines, bough ${i + 1} (its snow slides off if he stops)`, stands(SIB.taiga, floor, col, col + cols - 2))),
  leg('T: up to the eagle owl\'s nest, its coin', coin(SIB.taiga, 23, 3)),
  leg('T: back down to the third bough, the coin under the icicle', coin(SIB.taiga, 18, 9)),
  leg('T to G: back east along the trail to the village', into(SIB.border, 31, 15, SIB.taiga)),
  leg('G: over the first ice to the sandbar, its coin', coin(SIB.border, 16, 15)),
  leg('G: over the second ice, past the reindeer and the guard, past the raised barrier', stands(SIB.border, 17, 29, 31)),
];
