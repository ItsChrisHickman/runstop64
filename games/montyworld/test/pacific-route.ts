/**
 * Hawaii's route for the bot (docs/dosvidaniya-back-half-plan.md, "Hawaii"): the goals, in the order a player who takes everything plays them. Onto the cargo ship from Japan's gangway, through it and out of the
 * bow door; along Waikiki's beach to the surf that stops him, up the palm past the lawn (the stand's roof), up into the luau past the torches (the lei, the beach west of it, the drummers' platform), east along its lawn and up
 * Diamond Head (the mongooses, the tunnel, the stairs, the frigatebird over the gully) to THE LOOKOUT (the snorkel); back down and into the surf; the swim past Molokai and up Lahaina's mooring rope (the spar, the brig's musubi); along the road, down its pool into the sea
 * cave (the ledge's coin; through the lava tube between the swell's sets, the alcove's coin, the musubi in the pocket, out on a set) and back up, up the road's three tiers to Kaihalulu (the cinder cave's coin, the lagoon's); down its cliff to the channel and over the turtles (SHELL GAME: the musubi on the shore's rock) onto Kona; down the lava tube and over Mauna Loa ahead of the lava, down its pit for the
 * moon rock and out ahead of the pit's lava, along the coffee farm (the coffee) and up into Hilo (the plane still wants the parachute); up from the roofs along Akaka Falls' low lane to Mauna Kea and its
 * summit (the rock to the astronomer, his ladder, the parachute); back down and along the falls' high trail, down the rope to Hilo; and away in the biplane.
 * Functions on the game, shared by the bot test and the pictures.
 */
import { lavaTop } from '../../montyotr/src/lava';
import { copy, frame } from '../../montyotr/test/play';
import { ACTIONS } from '../../shared/monty/test/bot';
import { FLY } from '../src/sky';
import type { Game } from '../../montyotr/src/game';
import { BIPLANE_AT, CAVE_MUSUBI_AT, CAVE_TIDE, CAVE_TUBE, COFFEE_AT, LAVA, MOON_ROCK_AT, MOORING_COL, PAC, PARACHUTE_AT } from '../src/pacific';
import { coin, into, item, leg, stands, type Leg, type Part } from './route';

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

/** The sea cave's tide clock (its flow lines' period, which the tube's current shares): frames into its 220, the set running from CAVE_TIDE.start to the period's end. */
const tide = (g: Game): number => g.pulses.find((p) => g.data.pulses[p.index]?.room === PAC.cave)?.t ?? -1;
/** A part reached with the tide clock in a window (`from` to `to`): where a player waits on the sea before he goes (a weighted search heads for the goal and will not wait of itself). */
const onTide = (part: Part, from: number, to: number): Part => ({ ...part, goal: (g) => part.goal(g) && tide(g) >= from && tide(g) <= to });

/** Every leg has a name of its own (the bot's kept routes are by name). */
export const PACIFIC_LEGS: readonly Leg[] = [
  // the cargo ship
  leg('A: up the crate step onto the deck', stands(PAC.ship, 9, 7, 11)),
  leg('A: up the rung ladder to the funnel\'s catwalk, its coin', coin(PAC.ship, 9, 3)),
  leg('A: east along the deck under the crane\'s crate, down the hatch into the hold', stands(PAC.ship, 14, 22, 26)),
  leg('A: west between the pistons, the coin', livesFor(coin(PAC.ship, 17, 13), 40)),
  leg('A: past the second piston to the ladder, down into the bilge', stands(PAC.ship, 19, 7, 12)),
  leg('A to Waikiki: east over the bilge water, out of the bow door', into(PAC.waikiki, 31, 17, PAC.ship)),
  // Oahu
  leg('Waikiki: along the beach past the surfer, the coin by the surf', livesFor(coin(PAC.waikiki, 25, 17), 40)),
  leg('Waikiki: up the palm onto the lawn', stands(PAC.waikiki, 7, 22, 25)),
  leg('Waikiki: west along the lawn, off its end onto the stand\'s roof, the coin', coin(PAC.waikiki, 5, 13)),
  leg('Waikiki to the luau: back to the palm and up the hill', into(PAC.luau, 20, 0, PAC.waikiki)),
  leg('Luau: the coin between the torches', livesFor(coin(PAC.luau, 8, 17), 40)),
  leg('Luau: past the last torch to the lei on its arch', livesFor(item(PAC.luau, 0, [1, 16]), 40)),
  leg('Luau to BOARD MEETING: on west along the sand', into(PAC.beach, 0, 17, PAC.luau)),
  leg('BOARD MEETING: the coin where the beach boys cross', livesFor(coin(PAC.beach, 21, 16), 40)),
  leg('BOARD MEETING: up the canoe rack, its coin', livesFor(coin(PAC.beach, 25, 12), 40)),
  leg('BOARD MEETING: up the surfboard rack past the volleyball, the top board\'s coin', livesFor(coin(PAC.beach, 6, 5), 40)),
  leg('BOARD MEETING to the luau: back east along the sand', into(PAC.luau, 31, 17, PAC.beach)),
  leg('Luau: back past the torches, up the stage to the drummers\' coin', livesFor(coin(PAC.luau, 28, 11), 40)),
  leg('Luau to Diamond Head: east along the lawn under the stage', into(PAC.diamond, 31, 17, PAC.luau)),
  leg('Diamond Head: along the walkway, into the tunnel and up its stairs, the coin in the niche', coin(PAC.diamond, 29, 11)),
  leg('Diamond Head: out of the upper mouth, west along the switchback, up the steep stairs, the coin on the bunker\'s ledge', coin(PAC.diamond, 1, 5)),
  leg('Diamond Head to the Lookout: east over the gully under the frigatebird, up onto the shoulder and the spiral stair', livesFor(into(PAC.lookout, 29, 0, PAC.diamond), 40)),
  leg('Lookout: up the station\'s stair, the coin on its landing', coin(PAC.lookout, 24, 13)),
  leg('Lookout: out through the slit onto the rim, the coin under the tern\'s dive', livesFor(coin(PAC.lookout, 16, 7), 40)),
  leg('Lookout: on along the rim, the snorkel a tourist left', livesFor(item(PAC.lookout, 0, [9, 7]), 40)),
  leg('Lookout to Diamond Head: back to the station and down its stair', into(PAC.diamond, 29, 19, PAC.lookout)),
  leg('Diamond Head to the luau: back over the gully, down the stairs, through the tunnel and along the walkway', into(PAC.luau, 0, 17, PAC.diamond)),
  leg('Luau to Waikiki: down the palm', into(PAC.waikiki, 20, 19, PAC.luau)),
  leg('Waikiki to CHANNEL SURFING: down to the sand and into the surf', into(PAC.clam, 28, 19, PAC.waikiki)),
  // the swim past Molokai
  leg('CHANNEL SURFING: under the reef\'s arch, its coin', livesFor(coin(PAC.clam, 10, 17), 40)),
  leg('CHANNEL SURFING to LAND AHOY: on east, low', into(PAC.kelp, 31, 16, PAC.clam)),
  leg('LAND AHOY: the coin in the kelp', livesFor(coin(PAC.kelp, 13, 17), 40)),
  leg('LAND AHOY to Lahaina: up the mooring rope', into(PAC.lahaina, MOORING_COL, 1, PAC.kelp)),
  // Maui
  leg('Lahaina: west over the whale\'s gap, the musubi on the brig\'s deck', livesFor(item(PAC.lahaina, 0, [6, 12]), 40)),
  leg('Lahaina: up the mast\'s rope to the spar, its coin', coin(PAC.lahaina, 9, 5)),
  leg('Lahaina to the road: along the quay under the fort\'s wall', into(PAC.road, 31, 16, PAC.lahaina)),
  leg('Road: the coin by the bend\'s bamboo', livesFor(coin(PAC.road, 27, 15), 40)),
  leg('Road to the sea cave: down the pool\'s rope', into(PAC.cave, 24, 19, PAC.road)),
  leg('Sea cave: the coin on the ledge over the tube\'s end', livesFor(coin(PAC.cave, 27, 8), 40)),
  leg('Sea cave: west through the cavern past the eel and the manta, down to the tube\'s mouth', livesFor(within(PAC.cave, 2, 4, 15, 17), 40)),
  leg('Sea cave: low at the tube\'s mouth while a set drains, until it is nearly spent', onTide(within(PAC.cave, 2, 4, 16, 17), CAVE_TIDE.start + 55, CAVE_TIDE.start + 75)),
  leg('Sea cave: into the tube between sets, past the first stalactite, up into the alcove, its coin', livesFor(coin(PAC.cave, CAVE_TUBE.alcove + 1, 13), 40)),
  leg('Sea cave: out of the alcove as a set is spent, past the second stalactite to the Spam musubi in the pocket', livesFor(item(PAC.cave, 0, [CAVE_MUSUBI_AT.col, CAVE_MUSUBI_AT.row]), 40)),
  leg('Sea cave: out of the tube on a set, to its mouth', livesFor(within(PAC.cave, 2, 5, 9, 17), 40)),
  leg('Sea cave to the road: up through the cavern and the pool\'s rope', into(PAC.road, 24, 0, PAC.cave)),
  leg('Road: up the tiers over the bridges, the coin on the top bridge', livesFor(coin(PAC.road, 16, 5), 40)),
  leg('Road to Kaihalulu: out at the top', into(PAC.hana, 31, 6, PAC.road)),
  leg('Kaihalulu: down the bamboo onto the sand, over the wave, up the steps to the coin in the cinder cave', livesFor(coin(PAC.hana, 25, 10), 40)),
  leg('Kaihalulu: down into the lagoon between waves, its coin', livesFor(coin(PAC.hana, 27, 17), 40)),
  leg('Kaihalulu to SHELL GAME: back over the sand to the bamboo, on down it to the channel', into(PAC.fish, 14, 19, PAC.hana)),
  // the turtles to the Big Island
  leg('SHELL GAME: down the rope onto the rock at the waterline', stands(PAC.fish, 16, 12, 15)),
  leg('SHELL GAME: west over the turtle (its coin) to the musubi on the shore\'s last rock', livesFor(item(PAC.fish, 0, [2, 14]), 40)),
  leg('SHELL GAME: the coin over the west turtle', livesFor(coin(PAC.fish, 8, 15), 40)),
  leg('SHELL GAME: back over the turtle to the rope\'s rock', livesFor(stands(PAC.fish, 16, 12, 15), 40)),
  leg('SHELL GAME: east over the turtles as they surface, the coin over the second', livesFor(coin(PAC.fish, 25, 15), 40)),
  leg('SHELL GAME to Kona: on over the last turtle onto the black sand', into(PAC.kona, 31, 17, PAC.fish)),
  // the Big Island: the bottom way first (the moon rock, the coffee), then the top way (the rock to the astronomer, the parachute), round the loop
  leg('Kona: over the lava tube, the coin over the tide pool', coin(PAC.kona, 16, 16)),
  leg('Kona: up the lava rock, its coin', coin(PAC.kona, 24, 13)),
  leg('Kona to Mauna Loa: back west, down the lava tube\'s rope', into(PAC.loa, 7, 19, PAC.kona)),
  leg('Mauna Loa: over the cracking crust ahead of the lava, the coin at the last ledge\'s end', outOfLava(coin(PAC.loa, 26, 12))),
  leg('Mauna Loa: down the rope into the crater\'s pit, the moon rock', livesFor(item(PAC.loa, 0, [MOON_ROCK_AT.col, MOON_ROCK_AT.row]), 40)),
  leg('Mauna Loa: up the rope ahead of the pit\'s lava to the rim, the coin at its head', livesFor(coin(PAC.loa, 22, 3), 40)),
  leg('Mauna Loa to the farm: out east along the rim', into(PAC.coffee, 31, 3, PAC.loa)),
  leg('Coffee farm: the coin on the top terrace', coin(PAC.coffee, 5, 3)),
  leg('Coffee farm: down a terrace, its coin', coin(PAC.coffee, 13, 7)),
  leg('Coffee farm: down to the sack of coffee', livesFor(item(PAC.coffee, 0, [COFFEE_AT.col, COFFEE_AT.row]), 40)),
  leg('Coffee farm to Hilo: down to the lane and up the rope', into(PAC.hilo, 29, 0, PAC.coffee)),
  leg('Hilo: west past the rooster, the coin on the street', livesFor(coin(PAC.hilo, 17, 17), 40)),
  leg('Hilo: up the rope onto the storefronts\' roofs, their coin', coin(PAC.hilo, 8, 10)),
  leg('Hilo to Akaka Falls: up the rope from the roofs into the low lane', into(PAC.falls, 9, 19, PAC.hilo)),
  leg('Akaka Falls: west along the low lane, the coin over the plunge pool', livesFor(coin(PAC.falls, 21, 16), 40)),
  leg('Akaka Falls to Mauna Kea: west to the mountain\'s foot', into(PAC.kea, 0, 17, PAC.falls)),
  leg('Mauna Kea: up the rope and the switchbacks, the coin on the third', coin(PAC.kea, 22, 6)),
  leg('Mauna Kea: up to the top, its coin', coin(PAC.kea, 3, 2)),
  leg('Mauna Kea to the summit: up the rope', into(PAC.summit, 6, 0, PAC.kea)),
  leg('Summit: the coin by the cairn', coin(PAC.summit, 3, 12)),
  leg('Summit: up the dome\'s ladder to the catwalk, its coin', coin(PAC.summit, 16, 9)),
  leg('Summit: up the astronomer\'s ladder (the moon rock given) to the parachute', livesFor(item(PAC.summit, 0, [PARACHUTE_AT.col, PARACHUTE_AT.row]), 40)),
  leg('Summit to Mauna Kea: back down the rope', into(PAC.kea, 6, 19, PAC.summit)),
  leg('Mauna Kea to Akaka Falls: the third switchback east onto the high trail', into(PAC.falls, 31, 6, PAC.kea)),
  leg('Akaka Falls: along the high trail over the falls, the coin at the rope\'s head', coin(PAC.falls, 24, 6)),
  leg('Akaka Falls to Hilo: down the rope to the street', into(PAC.hilo, 29, 19, PAC.falls)),
  leg('Hilo to the flight: to the biplane, and away', into(FLY.mail, BIPLANE_AT.col, 17, PAC.hilo)),
];
