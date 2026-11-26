/**
 * Hawaii's route for the bot (docs/dosvidaniya-back-half-plan.md, "Hawaii"): the goals, in the order a player who takes everything plays them. Onto the cargo ship from Japan's gangway, through it and out of the
 * bow door; along Waikiki's beach to the surf that stops him, up the palm past the lawn (the stand's roof), up into the luau past the torches (the lei, the drummers' platform), up the hillside rope over
 * Diamond Head's trail to THE LOOKOUT (the snorkel); back down and into the surf; the swim past Molokai and up Lahaina's mooring rope (the spar, the brig's musubi); along the road, down its pool into the sea
 * cave and back up, up the road's three tiers to Hana; down the cove into the last swim (the moray, the surge) onto Kona; on to Hilo, where the plane wants both; back to Kona, up over Mauna Kea to its summit
 * (the parachute), down Akaka Falls into Hilo; back to Kona, down the lava tube and over Mauna Loa ahead of the lava, along the coffee farm (the coffee) and up into Hilo; and away in the biplane.
 * Functions on the game, shared by the bot test and the pictures.
 */
import { lavaTop } from '../../montyotr/src/lava';
import { copy, frame } from '../../montyotr/test/play';
import { ACTIONS } from '../../shared/monty/test/bot';
import { FLY } from '../src/sky';
import { BIPLANE_AT, COFFEE_AT, LAVA, PAC, PARACHUTE_AT } from '../src/pacific';
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
  leg('Luau: back past the torches, up the stage to the drummers\' coin', livesFor(coin(PAC.luau, 28, 11), 40)),
  leg('Luau to Diamond Head: up the hillside rope from between the torches', into(PAC.diamond, 13, 0, PAC.luau)),
  leg('Diamond Head: the first ledge east to the step, its coin', coin(PAC.diamond, 28, 14)),
  leg('Diamond Head: the second ledge west to the step, the coin at the top of the climb', coin(PAC.diamond, 2, 10)),
  leg('Diamond Head to the Lookout: the third ledge east to the bunker', into(PAC.lookout, 31, 8, PAC.diamond)),
  leg('Lookout: into the tunnel, its coin', livesFor(coin(PAC.lookout, 6, 8), 40)),
  leg('Lookout: up the stairs between the rocks, the coin on the summit', livesFor(coin(PAC.lookout, 27, 2), 40)),
  leg('Lookout: the snorkel a tourist left', livesFor(item(PAC.lookout, 0, [24, 2]), 40)),
  leg('Lookout to Diamond Head: back down the stairs and through the tunnel', into(PAC.diamond, 0, 8, PAC.lookout)),
  leg('Diamond Head to the luau: down the trail and the rope', into(PAC.luau, 14, 19, PAC.diamond)),
  leg('Luau to Waikiki: down the palm', into(PAC.waikiki, 20, 19, PAC.luau)),
  leg('Waikiki to CLAM DOWN: down to the sand and into the surf', into(PAC.clam, 28, 19, PAC.waikiki)),
  // the swim past Molokai
  leg('CLAM DOWN: under the rock arch, its coin', livesFor(coin(PAC.clam, 10, 17), 40)),
  leg('CLAM DOWN to KELP WANTED: out east, low', into(PAC.kelp, 31, 16, PAC.clam)),
  leg('KELP WANTED: the coin in the kelp', livesFor(coin(PAC.kelp, 13, 17), 40)),
  leg('KELP WANTED to Lahaina: up the mooring rope', into(PAC.lahaina, 15, 1, PAC.kelp)),
  // Maui
  leg('Lahaina: the musubi on the brig\'s deck', livesFor(item(PAC.lahaina, 0, [6, 12]), 40)),
  leg('Lahaina: up the mast\'s rope to the spar, its coin', coin(PAC.lahaina, 9, 5)),
  leg('Lahaina to the road: along the quay under the fort\'s wall', into(PAC.road, 31, 16, PAC.lahaina)),
  leg('Road: the coin by the bend\'s bamboo', livesFor(coin(PAC.road, 27, 15), 40)),
  leg('Road to the sea cave: down the pool\'s rope', into(PAC.cave, 24, 19, PAC.road)),
  leg('Sea cave: the musubi past the humps', livesFor(item(PAC.cave, 0, [17, 15]), 40)),
  leg('Sea cave: the coin on the ledge under the stalactites', livesFor(coin(PAC.cave, 27, 8), 40)),
  leg('Sea cave to the road: back up the pool\'s rope', into(PAC.road, 24, 0, PAC.cave)),
  leg('Road: up the tiers over the bridges, the coin on the top bridge', livesFor(coin(PAC.road, 16, 5), 40)),
  leg('Road to Hana: out at the top', into(PAC.hana, 31, 6, PAC.road)),
  leg('Hana: down the bamboo, over the wave, up the steps to the coin in the cinder cave', livesFor(coin(PAC.hana, 25, 10), 40)),
  leg('Hana to FISH OUT OF WATER: down the cove\'s rope', into(PAC.fish, 27, 19, PAC.hana)),
  // the swim to the Big Island
  leg('FISH: west along the top lane to the drop-off', within(PAC.fish, 2, 6, 9, 12)),
  leg('FISH: down past the moray into the sea cave, the coin on its ledge', livesFor(coin(PAC.fish, 4, 16), 40)),
  leg('FISH: the Spam musubi in the cave', livesFor(item(PAC.fish, 0, [2, 15]), 40)),
  leg('FISH: out past the moray, east into the first head\'s lee', livesFor(within(PAC.fish, 10, 11, 15, 17), 40)),
  leg('FISH: over the first head against the surge, the coin in the middle head\'s hollow', livesFor(coin(PAC.fish, 20, 18), 40)),
  leg('FISH: out of the hollow and up over the middle head between sets', within(PAC.fish, 21, 22, 13, 14)),
  leg('FISH: down past the middle head, timing the shark, into the third head\'s lee', livesFor(within(PAC.fish, 23, 24, 16, 17), 40)),
  leg('FISH to Kona: over the third head between sets, out onto the black sand', into(PAC.kona, 31, 16, PAC.fish)),
  // the Big Island
  leg('Kona: over the lava tube, the coin over the tide pool', coin(PAC.kona, 16, 16)),
  leg('Kona: up the lava rock, its coin', coin(PAC.kona, 24, 13)),
  leg('Kona to Hilo: along the sand to the plane', into(PAC.hilo, 31, 17, PAC.kona)),
  leg('Hilo: east past the rooster, the coin on the street', livesFor(coin(PAC.hilo, 17, 17), 40)),
  leg('Hilo to Kona: back west for the mountains', into(PAC.kona, 0, 17, PAC.hilo)),
  leg('Kona to Mauna Kea: up the rope on the mountain\'s flank', into(PAC.kea, 28, 0, PAC.kona)),
  leg('Mauna Kea: up the switchbacks, the coin on the third', coin(PAC.kea, 22, 6)),
  leg('Mauna Kea: up to the top, its coin', coin(PAC.kea, 3, 2)),
  leg('Mauna Kea to the summit: up the rope', into(PAC.summit, 6, 0, PAC.kea)),
  leg('Summit: the coin by the cairn', coin(PAC.summit, 3, 12)),
  leg('Summit: up the dome\'s ladder to the catwalk, its coin', coin(PAC.summit, 23, 9)),
  leg('Summit: up to the dome\'s top, the parachute', livesFor(item(PAC.summit, 0, [PARACHUTE_AT.col, PARACHUTE_AT.row]), 40)),
  leg('Summit to Mauna Kea: back down the rope', into(PAC.kea, 6, 19, PAC.summit)),
  leg('Mauna Kea to Akaka Falls: the third switchback east down the wet side', into(PAC.falls, 31, 6, PAC.kea)),
  leg('Akaka Falls: down the gorge, the coin on the first ledge', coin(PAC.falls, 10, 9)),
  leg('Akaka Falls to Hilo: down the stream onto the storefronts\' roofs', into(PAC.hilo, 21, 19, PAC.falls)),
  leg('Hilo: the coin on the roofs', coin(PAC.hilo, 8, 10)),
  leg('Hilo to Kona: back west again', into(PAC.kona, 0, 17, PAC.hilo)),
  leg('Kona to Mauna Loa: down the lava tube\'s rope', into(PAC.loa, 7, 19, PAC.kona)),
  leg('Mauna Loa: over the cracking crust ahead of the lava, the coin at the last ledge\'s end', outOfLava(coin(PAC.loa, 26, 12))),
  leg('Mauna Loa: up the east wall\'s rope to the rim, the coin past the nene', livesFor(coin(PAC.loa, 22, 3), 40)),
  leg('Mauna Loa to the farm: out east along the rim', into(PAC.coffee, 31, 3, PAC.loa)),
  leg('Coffee farm: the coin on the top terrace', coin(PAC.coffee, 5, 3)),
  leg('Coffee farm: down a terrace, its coin', coin(PAC.coffee, 13, 7)),
  leg('Coffee farm: down to the sack of coffee', livesFor(item(PAC.coffee, 0, [COFFEE_AT.col, COFFEE_AT.row]), 40)),
  leg('Coffee farm to Hilo: down to the lane and up the rope', into(PAC.hilo, 29, 0, PAC.coffee)),
  leg('Hilo to the flight: to the biplane, and away', into(FLY.mail, BIPLANE_AT.col, 17, PAC.hilo)),
];
