/**
 * Hawaii's mechanisms, headless, each on its own with the room's creatures out of the way (the bot, pacific.ts, plays them all together; docs/dosvidaniya-back-half-plan.md, "Hawaii"): the region's data
 * (nineteen rooms on the grid, the ids, the coins and finds), the ship's pistons and bilge, Waikiki's surf shut until the snorkel (no way into the sea without it), the luau's torches, the lookout's rocks,
 * the swims (the snorkel, no way out upward but up a rope through the surface: Lahaina's mooring rope, the road's pool, Hana's cove; the surge and its lee, the moray), the road's cars, Hana's wave,
 * Mauna Loa's lava, cracking crust and vent, the Big Island's locks (the astronomer wants the moon rock; the rock wakes the pit's lava), the biplane's two locks, the lei as a costume that gates
 * nothing, the hints, the banners, the swimmer's pictures, and a save in each room.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/pacific-mechanisms.ts [--room <rooms>] [--record]
 */
import { enterRoom } from '../../montyotr/src/ending';
import { wear } from '../../montyotr/src/items';
import { lavaTop } from '../../montyotr/src/lava';
import { MOTR } from '../../montyotr/src/motr';
import { pulsePhase } from '../../montyotr/src/pulses';
import { restore, snapshot } from '../../montyotr/src/save';
import { surgeRuns } from '../../montyotr/src/swim';
import { frame, NONE } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { WORLD } from '../src/data';
import { FLY } from '../src/sky';
import { JP } from '../src/japan';
import { CODEC } from '../src/main';
import { SWIM_CYCLE, SWIM_POINTERS } from '../src/pacific-pointers';
import { BIPLANE_AT, CRUST_CRACKS, CURRENTS, LAVA, MORAY, PAC, PACIFIC_ROOMS, PACIFIC_SECTORS, PARACHUTE_AT, SURF_CELLS, SURGE, TORCHES, TORCH_PULSES, VENT, VENT_PULSES } from '../src/pacific';
import { newGame } from '../../shared/monty/test/bot';
import { search } from './search';
import { at, cell, colOf, dead, diesAt, LEFT, overCrowded, RIGHT, rowText, run, UP } from './mech-kit';
import { creatureRooms, itemIndex, standY } from './route';
import { SCOPE } from './scope';

const DOWN = { ...NONE, down: true };
/** The items by room and place in it. */
const SNORKEL = [PAC.lookout, 0] as const, LEI = [PAC.luau, 0] as const, PARACHUTE = [PAC.summit, 0] as const, COFFEE = [PAC.coffee, 0] as const, MOON_ROCK = [PAC.loa, 0] as const;

// ---- the data -------------------------------------------------------------------------------------
SCOPE.section([], 'the data', () => {
  const cells = WORLD.exitGrid.image;
  const cols = WORLD.exitGrid.cols;
  const grid = (row: number, col: number) => cells[row * cols + col];
  const placed = [
    [2, 17, PAC.ship], [2, 18, PAC.waikiki], [1, 18, PAC.luau], [0, 18, PAC.diamond], [0, 19, PAC.lookout], [3, 18, PAC.clam], [3, 19, PAC.kelp], [2, 19, PAC.lahaina], [2, 20, PAC.road], [3, 20, PAC.cave],
    [2, 21, PAC.hana], [3, 21, PAC.fish], [3, 22, PAC.kona], [2, 22, PAC.kea], [1, 22, PAC.summit], [2, 23, PAC.falls], [3, 23, PAC.hilo], [4, 22, PAC.loa], [4, 23, PAC.coffee],
  ] as const;
  check('Hawaii is nineteen rooms at columns 17-23 (rows 0-4): Japan\'s port beside the ship, column 24 empty (the flight is a flight, not a room over), the sky from 25',
    placed.every(([r, c, id]) => grid(r, c) === id) && grid(2, 16) === JP.port && [0, 1, 2, 3, 4, 5, 6, 7].every((r) => grid(r, 24) === 0xff) && grid(0, 25) === FLY.mail && PACIFIC_ROOMS.length === 19);
  check('the first build\'s ids that came back keep them, the new rooms are 87-93 (after the sky\'s and the other regions\' returns); 39, 40, 44, 50 and 54 stay retired',
    [...cells].every((c) => ![39, 40, 44, 50, 54].includes(c)) && PACIFIC_ROOMS.filter((r) => r.id >= 82).every((r) => r.id >= 87 && r.id <= 93) && PACIFIC_SECTORS.length === 17);
  const rooms = creatureRooms(PACIFIC_ROOMS);
  check(`no creature in more than two rooms (${[...rooms.values()].map((v) => v.size).join(' ')}), no room with a fourth (sprite 7 is the worn lei's)`, [...rooms.values()].every((v) => v.size <= 2) && overCrowded(PACIFIC_ROOMS).length === 0);
  check('the four swim rooms are the crossings and the sea cave; only the last crossing has a surge (the flight\'s gusts are currents too); the lava is Mauna Loa\'s alone; Monty on the Run has none of them',
    WORLD.swimRooms.join() === [PAC.clam, PAC.kelp, PAC.cave, PAC.fish].join() && WORLD.currents.every((c) => c.room === PAC.fish || (Object.values<number>(FLY)).includes(c.room))
    && WORLD.risingLava.every((l) => l.room === PAC.loa || !(Object.values<number>(PAC)).includes(l.room)) && WORLD.risingLava.some((l) => l.room === PAC.loa) && MOTR.currents.length === 0 && MOTR.swimRooms.length === 0);
  const g = newGame(WORLD, false).g;
  check('the lei opens nothing: no room effect waits for it, and it is worn', WORLD.roomEffects.every((e) => (e.when ?? []).every((w) => !('taken' in w) || w.taken !== itemIndex(g, ...LEI))) && WORLD.costumes.some((c) => c.item === itemIndex(g, ...LEI)));
});

// ---- the cargo ship: the pistons and the bilge -------------------------------------------------------
SCOPE.section([PAC.ship, JP.port, PAC.waikiki], 'the cargo ship: the pistons and the bilge', () => {
  const pistons = PACIFIC_ROOMS.find((r) => r.id === PAC.ship)?.crushers ?? [];
  check('two pistons (Mole Crushers) in the hold, each three cells tall', pistons.length === 2 && pistons.every((p) => p.height === 3));
  check('the bilge water kills (walking into it)', diesAt(at(PAC.ship, 15, 19), RIGHT, 80) >= 0);
  const hop = search(at(PAC.ship, 14, 19), (g) => colOf(g) >= 22 && g.y === standY(19), [{ room: PAC.ship, col: 24, row: 17 }], 40000, 1.5);
  check('a jump clears it', hop !== null);
});

// ---- Waikiki: the surf ---------------------------------------------------------------------------------
SCOPE.section([PAC.waikiki, PAC.clam, PAC.ship, PAC.luau], 'Waikiki: the surf shut until the snorkel', () => {
  check('the surf kills him without the snorkel', diesAt(at(PAC.waikiki, 23, 19), RIGHT, 120) >= 0);
  const stats = { exhausted: false };
  const swim = search(at(PAC.waikiki, 23, 19), (g) => g.roomId === PAC.clam, [{ room: PAC.waikiki, col: 28, row: 17 }], 120000, 1.5, stats);
  check(`no way into the sea without the snorkel, jumps and all (${stats.exhausted ? 'every state looked at' : 'the state limit'})`, swim === null);
  const dive = at(PAC.waikiki, 23, 19, [SNORKEL]);
  for (let f = 0; f < 200 && dive.g.roomId !== PAC.clam; f++) frame(dive, RIGHT);
  check('with the snorkel the surf is gone and he dives through into CLAM DOWN, alive', dive.g.roomId === PAC.clam && !dead(dive.g) && SURF_CELLS.every(([row, col]) => cell(at(PAC.waikiki, 2, 19, [SNORKEL]).g, col, row) === 0 || cell(at(PAC.waikiki, 2, 19, [SNORKEL]).g, col, row) > 8));
});

// ---- the luau's torches --------------------------------------------------------------------------------
SCOPE.section([PAC.luau], 'the luau: the torches', () => {
  const torch = TORCH_PULSES[0];
  const phases = torch ? [10, 70, 100, 150].map((t) => pulsePhase(torch, (t + (torch.offset ?? 0)) % torch.period)) : [];
  check(`a torch is out, flickers, burns and is out again (${phases.join(' ')})`, torch !== undefined && new Set(phases).size >= 3);
  const gap = at(PAC.luau, 13, 19);
  run(gap, NONE, 2 * TORCHES.period);
  check('the gap between the first two torches (cols 13-15, at the rope\'s foot) is safe through two of their periods', !dead(gap.g));
  check('standing in a torch he dies when it burns', diesAt(at(PAC.luau, 16, 19), NONE, TORCHES.period + 20) >= 0);
});

// ---- the swims: the surface, the ropes out ---------------------------------------------------------------
SCOPE.section([PAC.clam, PAC.kelp, PAC.lahaina, PAC.cave, PAC.road, PAC.fish, PAC.hana, PAC.waikiki], 'the swims: the snorkel, the surface and the ropes up through it', () => {
  const without = at(PAC.clam, 16, 8);
  run(without, NONE, 8);
  check('the sea drowns him at once without the snorkel', dead(without.g));
  const surf = at(PAC.clam, 27, 4, [SNORKEL]);
  run(surf, UP, 300);
  check('swimming up under the surf\'s gap he stays in the sea (no rope there: the surface holds him, no bounce)', surf.g.roomId === PAC.clam && !dead(surf.g));
  const ropes: readonly (readonly [from: number, col: number, to: number])[] = [[PAC.kelp, 15, PAC.lahaina], [PAC.cave, 23, PAC.road], [PAC.fish, 26, PAC.hana]];
  for (const [from, col, to] of ropes) {
    const s = at(from, col, 5, [SNORKEL]);
    for (let f = 0; f < 300 && s.g.roomId === from; f++) frame(s, UP);
    run(s, UP, 60);
    check(`swimming up the rope through room ${from}'s surface he climbs out into room ${to} and holds on there, alive (room ${s.g.roomId})`, s.g.roomId === to && !dead(s.g));
  }
});

// ---- FISH OUT OF WATER: the surge, the moray --------------------------------------------------------------
SCOPE.section([PAC.fish, PAC.kona], 'FISH OUT OF WATER: the surge, the moray', () => {
  const over = at(PAC.fish, 20, 14, [SNORKEL]);
  run(over, NONE, SURGE.start - 2);
  const x0 = over.g.x2;
  run(over, NONE, 60);
  check(`while a set runs he is carried west over the heads (${x0 - over.g.x2} half-pixels in 60 frames)`, over.g.x2 < x0 - 10 && CURRENTS[0] !== undefined && surgeRuns(CURRENTS[0], SURGE.start + 10));
  const lee = at(PAC.fish, 10, 19, [SNORKEL]);
  run(lee, DOWN, 20);
  const lx = lee.g.x2;
  run(lee, NONE, SURGE.start + 40);
  check('in the first head\'s lee the water is still through a set', lee.g.x2 === lx && !dead(lee.g));
  const mouth = at(PAC.fish, 5, 15, [SNORKEL]);
  const hold = mouth.g.y;
  let died = -1;
  for (let f = 0; f < MORAY.period + 20 && died < 0; f++) { frame(mouth, mouth.g.y < hold ? DOWN : NONE); if (dead(mouth.g)) died = f; }
  check(`at the sea cave's mouth the moray's lunge kills (dead at frame ${died}, the lunge from ${MORAY.start + MORAY.warn + 15})`, died >= MORAY.start + MORAY.warn);
  const swimmer = at(PAC.fish, 16, 6, [SNORKEL, LEI]);
  wear(swimmer.g, itemIndex(swimmer.g, ...LEI));
  run(swimmer, RIGHT, 24);
  const facingRight = SWIM_CYCLE.right.some((p) => p === swimmer.g.sptr[3]) && swimmer.g.sptr[7] === SWIM_POINTERS.crownRight;
  run(swimmer, LEFT, 24);
  const facingLeft = SWIM_CYCLE.left.some((p) => p === swimmer.g.sptr[3]) && swimmer.g.sptr[7] === SWIM_POINTERS.crownLeft;
  check('in the sea he swims in his own pictures with the lei\'s crown on them', facingRight && facingLeft);
  const out = at(PAC.fish, 29, 18, [SNORKEL]);
  run(out, RIGHT, 80);
  check('out at the bottom right he comes onto Kona\'s black sand and stands there', out.g.roomId === PAC.kona && !dead(out.g));
});

// ---- Mauna Loa: the lava, the crust, the vent ------------------------------------------------------------
SCOPE.section([PAC.loa], 'Mauna Loa: the lava, the crust, the vent', () => {
  const tops = [0, 40, 200, 360, 500].map((t) => lavaTop(LAVA, t));
  check(`the lava starts at the floor and rises a row every 40 frames to row 10, the row under the long ledge's feet (tops ${tops.join(' ')})`, tops[0] === 19 && tops[1] === 18 && tops[3] === 10 && tops[4] === 10);
  const shore = at(PAC.loa, 3, 19, [SNORKEL]);
  run(shore, NONE, 900);
  check('the shore the lava tube drops him on is outside the lava (he stands there through a whole cycle)', !dead(shore.g));
  check('on the low ledges the lava gets him if he waits', diesAt(at(PAC.loa, 25, 14, [SNORKEL]), NONE, 400) >= 0);
  const ledge = at(PAC.loa, 16, 9, [SNORKEL]);
  run(ledge, NONE, 900);
  check('on the long ledge (floor 9, clear of the vent) he is safe from the lava for good', !dead(ledge.g));
  const crust = CRUST_CRACKS[0];
  const onCrust = at(PAC.loa, crust?.col ?? 14, 14, [SNORKEL]);
  run(onCrust, NONE, (crust?.gone ?? 26) + 30);
  check('standing on the first stepping ledge it cracks, splits and gives way under him', onCrust.g.y > standY(14) || dead(onCrust.g));
  const ventDied = diesAt(at(PAC.loa, VENT.col, 9, [SNORKEL]), NONE, VENT.period + 10);
  check(`standing over the vent he dies when it blows (frame ${ventDied}, live from ${VENT.start + VENT.warn})`, VENT_PULSES[0] !== undefined && ventDied >= VENT.start + VENT.warn - 1);
});

// ---- the Big Island's locks: the moon rock for the astronomer, the rock waking the pit's lava ------------------
SCOPE.section([PAC.summit, PAC.loa], 'the Big Island: the astronomer wants the moon rock, and the rock wakes the pit\'s lava', () => {
  const parachute = (holds: readonly (readonly [number, number])[], stats: { exhausted: boolean }) =>
    search(at(PAC.summit, 17, 11, [SNORKEL, ...holds], false, true), (g) => !!g.siCollected[itemIndex(g, ...PARACHUTE)], [{ room: PAC.summit, col: PARACHUTE_AT.col, row: PARACHUTE_AT.row }], 30000, 1.5, stats);
  const without = { exhausted: false }, withRock = { exhausted: false };
  check(`without the moon rock the astronomer keeps him off the dome's ladder: no way to the parachute (${without.exhausted ? 'every state looked at' : 'the state limit'})`, parachute([], without) === null);
  check('with the moon rock the astronomer has gone in, and the ladder takes him to the parachute', parachute([MOON_ROCK], withRock) !== null);
  const asleep = at(PAC.loa, 3, 19, [SNORKEL]);
  run(asleep, NONE, 120);
  check('before the rock is taken the pit\'s lava sleeps (the basin\'s rises as ever)', asleep.g.lavas.find((l) => l.index === 1)?.t === 0 && (asleep.g.lavas.find((l) => l.index === 0)?.t ?? 0) > 0);
  check('with the rock taken, the pit\'s lava wells up: waiting at its foot he dies', diesAt(at(PAC.loa, 28, 19, [SNORKEL, MOON_ROCK]), NONE, 300) >= 0);
  const climbs = at(PAC.loa, 28, 19, [SNORKEL, MOON_ROCK]);
  run(climbs, UP, 150);
  check(`climbing the rope at once he is out ahead of it (row ${climbs.g.montyRow - 3})`, !dead(climbs.g));
});

// ---- the biplane's two locks ---------------------------------------------------------------------------
SCOPE.section([PAC.hilo, FLY.mail], 'Hilo: the biplane wants the parachute and the coffee', () => {
  const touch = (holds: readonly (readonly [number, number])[], hints: boolean) => {
    const s = at(PAC.hilo, BIPLANE_AT.col + 5, 19, [SNORKEL, ...holds]);
    s.g.assist = { ...s.g.assist, hints };
    let said = '';
    for (let f = 0; f < 80 && s.g.roomId === PAC.hilo; f++) { frame(s, LEFT); if (rowText(s.g).includes('FLY')) said = rowText(s.g); }
    run(s, NONE, 4);
    return { s, said };
  };
  const neither = touch([], true), noCoffee = touch([PARACHUTE], true), noParachute = touch([COFFEE], true);
  check(`without the parachute: ${neither.said}; with it but no coffee: ${noCoffee.said}; with the coffee only: ${noParachute.said}; and he stays (rooms ${neither.s.g.roomId}, ${noCoffee.s.g.roomId}, ${noParachute.s.g.roomId})`,
    neither.said === 'NO FLYING WITHOUT A PARACHUTE' && noCoffee.said === 'TOO SLEEPY TO FLY' && noParachute.said === 'NO FLYING WITHOUT A PARACHUTE'
    && [neither, noCoffee, noParachute].every((t) => t.s.g.roomId === PAC.hilo && !dead(t.s.g)));
  const away = touch([PARACHUTE, COFFEE], false).s;
  check(`with both he takes off: the first leg (room ${away.g.roomId} at [${away.g.mapRow},${away.g.exitCol}])`, away.g.roomId === FLY.mail && away.g.mapRow === 0 && away.g.exitCol === 25 && away.g.planeShown);
});

// ---- the hints and the banners ------------------------------------------------------------------------
SCOPE.section([], 'the hints and the banners', () => {
  const want = WORLD.hints.wanted.filter((h) => (Object.values<number>(PAC)).includes(h.room)).map((h) => `${h.room}:${h.text}`);
  check(`the surf's hint on coming into Waikiki, the astronomer's at the summit (${want.join(' / ')})`, want.join('|') === `${PAC.waikiki}:A MOLE CANNOT SWIM THAT FAR|${PAC.summit}:THE ASTRONOMER WANTS A MOON ROCK`);
  const take = new Set(WORLD.hints.take.map((h) => h.text));
  check('the take hints: the snorkel\'s, the lei\'s, the parachute\'s, the coffee\'s and the moon rock\'s', take.has('WITH A SNORKEL HE CAN SWIM') && take.has('A LEI: TRAVELLERS WEAR ONE') && take.has('PARACHUTE: FOR A LONG DROP') && take.has('COFFEE KEEPS A PILOT AWAKE') && take.has('A MOON ROCK: FOR AN ASTRONOMER'));
});
SCOPE.section([JP.port, PAC.ship, PAC.waikiki, PAC.clam, PAC.kelp, PAC.lahaina, PAC.fish, PAC.kona], 'the banners', () => {
  const arrive = (from: number, to: number, col: number, floor: number) => {
    const s = at(from, 2, 13, [SNORKEL]);
    enterRoom(s.g, to, 0x0c + (col + 4) * 4, standY(floor));
    run(s, NONE, 3);
    return rowText(s.g);
  };
  check('Oahu welcomes him aboard at Honolulu, Molokai on the swim past it, Maui at Lahaina, the Big Island at Kona',
    arrive(JP.port, PAC.ship, 1, 13) === 'WELCOME TO HAWAII: OAHU' && arrive(PAC.waikiki, PAC.clam, 27, 5) === 'HAWAII: PAST MOLOKAI' && arrive(PAC.kelp, PAC.lahaina, 15, 18) === 'HAWAII: MAUI' && arrive(PAC.fish, PAC.kona, 1, 19) === 'HAWAII: THE BIG ISLAND');
});

// ---- a save in each room ----------------------------------------------------------------------------
SCOPE.section([], 'a save in each room', () => {
  const spots = [
    [PAC.ship, 1, 13], [PAC.waikiki, 1, 19], [PAC.luau, 23, 19], [PAC.diamond, 16, 18], [PAC.lookout, 1, 10], [PAC.clam, 27, 5], [PAC.kelp, 2, 18], [PAC.lahaina, 27, 18], [PAC.road, 3, 18],
    [PAC.cave, 3, 18], [PAC.hana, 3, 8], [PAC.fish, 27, 5], [PAC.kona, 2, 19], [PAC.kea, 20, 16], [PAC.summit, 10, 16], [PAC.falls, 2, 8], [PAC.loa, 3, 19], [PAC.coffee, 2, 5], [PAC.hilo, 2, 19],
  ] as const;
  const failed: number[] = [];
  for (const [room, col, floor] of spots.filter(([id]) => SCOPE.has(id))) {
    const a = newGame(WORLD, false);
    for (const [r, n] of [SNORKEL, LEI]) a.g.siCollected[itemIndex(a.g, r, n)] = 0x81;
    wear(a.g, itemIndex(a.g, ...LEI));
    enterRoom(a.g, room, 0x0c + (col + 4) * 4, standY(floor));
    for (let n = 0; n < 200 && (a.g.freeze || a.g.script); n++) frame(a, NONE);
    const b = newGame(WORLD, false);
    restore(b.g, CODEC.unpack(CODEC.pack(snapshot(a.g)), CODEC.format));
    b.g.enemies = []; b.g.enable &= 0x0f; b.g.vic.enable &= 0x0f; b.g.pulses = []; b.g.lavas = []; b.g.rollers = []; b.g.tunnels = [];
    run(b, NONE, 40);
    if (b.g.roomId !== room || dead(b.g) || b.g.worn !== itemIndex(b.g, ...LEI)) failed.push(room);
  }
  check(`a save made in each of Hawaii's rooms carries on there, alive, in the lei${failed.length ? ` (not in ${failed.join()})` : ''}`, failed.length === 0);
});

SCOPE.report();
finish();
