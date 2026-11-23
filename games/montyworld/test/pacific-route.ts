/**
 * The Pacific's route for the bot (docs/dosvidaniya-reset.md, "the Pacific"): the goals, in the order a player who takes everything plays them. Onto the cargo ship from Japan's gangway, up onto the deck
 * and the funnel's catwalk, down the hatch, west between the pistons, down into the bilge and out of the bow door; along Waikiki's beach to the surf that stops him, up the palm to the hotel's lawn, past
 * the torches to the lei, off the lawn's end onto the stand's roof for the snorkel, back down and into the sea; west along Hana's top lane, down past the moray into the sea cave, east along the bottom lane
 * against the surge, out onto Hilo's shore; up the lava climb to the apron and the belly ladder; in the hold up the net, the parachute, and out of the rear door. Functions on the game, shared by the bot
 * test and the pictures.
 */
import { lavaTop } from '../../montyotr/src/lava';
import { copy, frame } from '../../montyotr/test/play';
import { ACTIONS } from '../../shared/monty/test/bot';
import { AND } from '../src/andes';
import { LAVA, PAC } from '../src/pacific';
import { above, coin, into, item, leg, stands, type Leg, type Part } from './route';

/** A leg's goal reached with the lava still a good way off (100 frames): a leg that ended on a ledge the lava reaches in a few frames would hand the next one a death. */
const outOfLava = (part: Part): Part => ({
  ...part,
  goal: (g) => part.goal(g) && (g.lavas[0] === undefined || lavaTop(LAVA, g.lavas[0].t + 100) > g.montyRow - 3 + 1),
});

/** A leg's goal reached with some move that lives on for `frames` more (the bot's own check looks only 12 frames ahead). */
const livesFor = (part: Part, frames: number): Part => ({
  ...part,
  goal: (g) => part.goal(g) && ACTIONS.some(([, stick]) => {
    const t = { g: copy(g), col: 0 };
    for (let f = 0; f < frames; f++) { frame(t, stick); if (t.g.actionCounter !== 0) return false; }
    return true;
  }),
});

/** In a room with his top left in a box of playfield cells (a place in open water, where he does not stand). */
const within = (room: number, c0: number, c1: number, r0: number, r1: number): Part => ({
  goal: (g) => g.roomId === room && !g.freeze && !g.script && g.montyCol - 4 >= c0 && g.montyCol - 4 <= c1 && g.montyRow - 3 >= r0 && g.montyRow - 3 <= r1,
  aim: [{ room, col: Math.round((c0 + c1) / 2), row: Math.round((r0 + r1) / 2) }],
});

/** Where the items' sprites are (playfield cell of the top left), as the rooms say. */
const SNORKEL_AT = [6, 12] as const, LEI_AT = [7, 5] as const, MUSUBI_AT = [2, 15] as const, PARACHUTE_AT = [2, 6] as const;

/** Every leg has a name of its own (the bot's kept routes are by name). */
export const PACIFIC_LEGS: readonly Leg[] = [
  leg('A: up the crate step onto the deck', stands(PAC.ship, 9, 7, 11)),
  leg('A: up the rung ladder to the funnel\'s catwalk, its coin', coin(PAC.ship, 9, 3)),
  leg('A: east along the deck under the crane\'s crate, down the hatch into the hold', stands(PAC.ship, 14, 22, 26)),
  leg('A: west between the pistons, the coin', livesFor(coin(PAC.ship, 17, 13), 40)),
  leg('A: past the second piston to the ladder, down into the bilge', stands(PAC.ship, 19, 7, 12)),
  leg('A to B: east over the bilge water, out of the bow door', into(PAC.waikiki, 31, 17, PAC.ship)),
  leg('B: along the beach to the palm by the surf', stands(PAC.waikiki, 19, 17, 21)),
  leg('B: up the palm to the lawn, the coin at its head', coin(PAC.waikiki, 19, 6)),
  leg('B: west past the first torch, the coin between them', livesFor(coin(PAC.waikiki, 13, 6), 40)),
  leg('B: past the second torch and the hula dancer, the lei', livesFor(item(PAC.waikiki, 1, LEI_AT), 40)),
  leg('B: off the lawn\'s end onto the stand\'s roof, the snorkel', item(PAC.waikiki, 0, SNORKEL_AT)),
  leg('B to C: down to the sand, east past the coconut, into the sea', into(PAC.hana, 28, 19, PAC.waikiki)),
  leg('C: west along the top lane past the turtle to the drop-off', within(PAC.hana, 2, 6, 9, 12)),
  leg('C: down past the moray into the sea cave, the coin on its ledge', livesFor(coin(PAC.hana, 4, 16), 40)),
  leg('C: the Spam musubi in the cave', livesFor(item(PAC.hana, 0, MUSUBI_AT), 40)),
  leg('C: out past the moray, east into the first head\'s lee', livesFor(within(PAC.hana, 10, 11, 15, 17), 40)),
  leg('C: over the first head against the surge, the coin in the middle head\'s hollow', livesFor(coin(PAC.hana, 20, 18), 40)),
  leg('C: out of the hollow and up over the middle head between sets', within(PAC.hana, 21, 22, 13, 14)),
  leg('C: down past the middle head, timing the shark, into the third head\'s lee', livesFor(within(PAC.hana, 23, 24, 16, 17), 40)),
  leg('C to D: over the third head between sets, out onto Hilo\'s shore', into(PAC.hilo, 31, 16, PAC.hana)),
  leg('D: up the rope and over the cracking crust, the coin on the middle ledge', outOfLava(coin(PAC.hilo, 16, 13))),
  leg('D: up the east wall\'s rope to the long ledge, the coin at its head', coin(PAC.hilo, 26, 8)),
  leg('D: west past the steam vent, up the rope to the apron', stands(PAC.hilo, 5, 9, 12)),
  leg('D to E: past the nene, up the belly ladder into the hold', into(PAC.plane, 8, 0, PAC.hilo, above(17))),
  leg('E: up the cargo net, the coin in it', livesFor(coin(PAC.plane, 15, 10), 40)),
  leg('E: west along the rack past the rooster, the parachute', livesFor(item(PAC.plane, 0, PARACHUTE_AT), 40)),
  leg('E to the Andes: down, across the floor behind the loose crate, out of the rear door', into(AND.jump, 31, 14, PAC.plane)),
];
