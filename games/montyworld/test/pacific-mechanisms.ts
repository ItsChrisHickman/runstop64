/**
 * The Pacific's mechanisms, headless, each on its own with the room's creatures out of the way (the bot, pacific.ts, plays them all together; docs/dosvidaniya-reset.md, "the Pacific"): the region's data
 * (five rooms on the grid, the ids kept, the coins and finds), the ship's pistons and bilge, Waikiki's surf shut until the snorkel and the snorkel out of reach from the sand, the luau's torches, Hana's
 * swimming (the snorkel, no way out upward, the surge and its lee, the moray), Hilo's lava (from the floor to under the long ledge), its cracking crust and steam vent, the hold's loose crate and its shelter,
 * the rear door and the parachute, the lei as a costume that gates nothing, the hints, the banners, the swimmer's pictures, and a save in each room.
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
import { AND } from '../src/andes';
import { CODEC } from '../src/main';
import { SWIM_CYCLE, SWIM_POINTERS } from '../src/pacific-pointers';
import { CRUST_CRACKS, CURRENTS, LAVA, LOOSE_CRATE, MORAY, PAC, PACIFIC_ROOMS, PACIFIC_SECTORS, PLANE_DOOR_CELLS, SURF_CELLS, SURGE, TORCHES, TORCH_PULSES, VENT, VENT_PULSES } from '../src/pacific';
import { newGame } from '../../shared/monty/test/bot';
import { search } from './search';
import { at, cell, coinsIn, colOf, dead, diesAt, entriesBefore, itemsIn, LEFT, overCrowded, RIGHT, rowText, run, UP } from './mech-kit';
import { creatureRooms, itemIndex, standY } from './route';
import { SCOPE } from './scope';

const DOWN = { ...NONE, down: true };
/** The items by room and place in it. */
const SNORKEL = [PAC.waikiki, 0] as const, LEI = [PAC.waikiki, 1] as const, PARACHUTE = [PAC.plane, 0] as const;

// ---- the data -------------------------------------------------------------------------------------
SCOPE.section([], 'the data', () => {
  const cells = WORLD.exitGrid.image;
  const cols = WORLD.exitGrid.cols;
  const grid = (row: number, col: number) => cells[row * cols + col];
  const placed = [[2, 17, PAC.ship], [2, 18, PAC.waikiki], [3, 18, PAC.hana], [3, 19, PAC.hilo], [2, 19, PAC.plane]] as const;
  check('the Pacific is five rooms in a U at columns 17-19 (rows 2-3): Japan\'s port beside the ship, the plane beside the Andes\' first room (moved to [2,20]), nothing else in its columns',
    placed.every(([r, c, id]) => grid(r, c) === id) && grid(2, 16) === JP.port && grid(2, 20) === AND.jump && [0, 1, 4, 5, 6, 7].every((r) => [17, 18, 19].every((c) => grid(r, c) === 0xff)) && grid(3, 17) === 0xff);
  const before = entriesBefore(PAC.ship, PAC.plane);
  check('the regions before the Pacific keep their coins and finds in the same table places, and the Pacific has 9 coins (2, 2, 2, 2, 1) and 4 finds (the snorkel, the lei, the musubi, the parachute)',
    before.ordered && coinsIn(PAC.ship, PAC.plane) === 9 && itemsIn(PAC.ship, PAC.plane) === 4 && PACIFIC_ROOMS.map((r) => r.coins?.length ?? 0).join() === '2,2,2,2,1');
  check('the room ids are the first build\'s (38, 41, 49, 52, 54); the sectors keep seventeen places, the five kept named plainly and the retired twelve empty',
    PACIFIC_ROOMS.map((r) => r.id).join() === '38,41,49,52,54' && PACIFIC_SECTORS.length === 17 && PACIFIC_SECTORS.filter((s) => s.text !== '').map((s) => s.text).join() === 'THE CARGO SHIP,WAIKIKI,HANA,HILO,THE CARGO PLANE');
  const rooms = creatureRooms(PACIFIC_ROOMS);
  check(`ten kinds of creature and Viktor Vole aboard the ship, none in more than two rooms (${[...rooms.values()].map((v) => v.size).join(' ')}), no room with a fourth (sprite 7 is the worn lei's)`, rooms.size === 11 && [...rooms.values()].every((v) => v.size <= 2) && overCrowded(PACIFIC_ROOMS).length === 0);
  check('Hana is the one swim room and the only room of the Pacific with a surge (the flight\'s gusts are currents too); Hilo has the lava; Monty on the Run has none of them',
    WORLD.swimRooms.join() === String(PAC.hana) && WORLD.currents.every((c) => c.room === PAC.hana || (Object.values<number>(FLY)).includes(c.room)) && WORLD.risingLava.some((l) => l.room === PAC.hilo) && MOTR.currents.length === 0 && MOTR.swimRooms.length === 0);
  check('the lei opens nothing: no room effect waits for it, and it is worn', WORLD.roomEffects.every((e) => (e.when ?? []).every((w) => !('taken' in w) || w.taken !== itemIndex(newGame(WORLD, false).g, ...LEI))) && WORLD.costumes.some((c) => c.item === itemIndex(newGame(WORLD, false).g, ...LEI)));
});

// ---- the cargo ship: the pistons and the bilge -------------------------------------------------------
SCOPE.section([PAC.ship, JP.port, PAC.waikiki], 'the cargo ship: the pistons and the bilge', () => {
  const pistons = PACIFIC_ROOMS.find((r) => r.id === PAC.ship)?.crushers ?? [];
  check('two pistons (Mole Crushers) in the hold, each three cells tall', pistons.length === 2 && pistons.every((p) => p.height === 3));
  const bilge = at(PAC.ship, 15, 19);
  check('the bilge water kills (walking into it)', diesAt(bilge, RIGHT, 80) >= 0);
  const hop = search(at(PAC.ship, 14, 19), (g) => colOf(g) >= 22 && g.y === standY(19), [{ room: PAC.ship, col: 24, row: 17 }], 40000, 1.5);
  check('a jump clears it', hop !== null);
  const ship = PACIFIC_ROOMS.find((r) => r.id === PAC.ship);
  const edge = Array.from({ length: 20 }, (_, row) => ship?.map[row]?.[31] ?? '.').join('');
  check(`the bow's end is shut from the deck down through the hold (the containers and the hull: the door, rows 15-18, is reached only by the bilge) (${edge})`, /^[^.]{15}\.{4}[^.]$/.test(edge));
});

// ---- Waikiki: the surf, the snorkel on the roof, the torches ---------------------------------------
SCOPE.section([PAC.waikiki, PAC.hana, PAC.ship, PAC.plane], 'Waikiki: the surf, the snorkel on the roof, the torches', () => {
  SCOPE.section([PAC.waikiki, PAC.hana, PAC.ship, PAC.plane], 'Waikiki: the surf and the snorkel on the roof', () => {
    check('the surf kills him without the snorkel', diesAt(at(PAC.waikiki, 23, 19), RIGHT, 120) >= 0);
    const stats = { exhausted: false };
    const swim = search(at(PAC.waikiki, 23, 19), (g) => g.roomId === PAC.hana, [{ room: PAC.waikiki, col: 28, row: 17 }], 120000, 1.5, stats);
    check(`no way into the sea without the snorkel, jumps and all (${stats.exhausted ? 'every state looked at' : 'the state limit'})`, swim === null);
    const dive = at(PAC.waikiki, 23, 19, [SNORKEL]);
    for (let f = 0; f < 200 && dive.g.roomId !== PAC.hana; f++) frame(dive, RIGHT);
    check('with the snorkel the surf is gone and he dives through into Hana\'s sea, alive', dive.g.roomId === PAC.hana && !dead(dive.g) && SURF_CELLS.every(([row, col]) => cell(at(PAC.waikiki, 2, 19, [SNORKEL]).g, col, row) === 0 || cell(at(PAC.waikiki, 2, 19, [SNORKEL]).g, col, row) > 8));
    const roof = PACIFIC_ROOMS.find((r) => r.id === PAC.waikiki)?.item;
    check('the snorkel lies on the stand\'s roof, five rows over the sand (his jump climbs two)', roof?.name === 'snorkel' && 19 - (((roof?.row ?? 0) - 3) + 2) >= 5);
    const fromLawn = search(at(PAC.waikiki, 6, 7, [LEI]), (g) => g.siCollected[itemIndex(g, ...SNORKEL)] !== 0, [{ room: PAC.waikiki, col: 6, row: 12 }], 20000, 1.5);
    check('off the lawn\'s west end he drops onto the roof and takes it', fromLawn !== null);
  });
  SCOPE.section([PAC.waikiki], 'Waikiki: the torches', () => {
    // the torches
    const torch = TORCH_PULSES[0];
    const phases = torch ? [10, 70, 100, 150].map((t) => pulsePhase(torch, (t + (torch.offset ?? 0)) % torch.period)) : [];
    check(`a torch is out, flickers, burns and is out again (${phases.join(' ')})`, torch !== undefined && new Set(phases).size >= 3);
    const gap = at(PAC.waikiki, 12, 7);
    run(gap, NONE, 2 * TORCHES.period);
    check('the gap between the torches (cols 12-14) is safe through two of their periods', !dead(gap.g));
    const inFlame = at(PAC.waikiki, 15, 7);
    check('standing in a torch he dies when it burns', diesAt(inFlame, NONE, TORCHES.period + 20) >= 0);
  });
});

// ---- Hana: the snorkel, the surface, the surge, the moray --------------------------------------------
SCOPE.section([PAC.hana, PAC.waikiki, PAC.hilo, PAC.ship], 'Hana: the snorkel, the surface, the surge, the moray', () => {
  SCOPE.section([PAC.hana], 'Hana: the snorkel, the surface, the surge', () => {
    const without = at(PAC.hana, 16, 6);
    run(without, NONE, 8);
    check('Hana\'s water drowns him at once without the snorkel', dead(without.g));
    const up = at(PAC.hana, 27, 4, [SNORKEL]);
    run(up, UP, 300);
    check('swimming up under the dive\'s gap he stays in the sea (the surface holds him: no way out upward, no bounce)', up.g.roomId === PAC.hana && !dead(up.g));
    // the surge: carried west over the heads while a set runs, still in a lee
    const over = at(PAC.hana, 20, 14, [SNORKEL]);
    run(over, NONE, SURGE.start - 2);
    const x0 = over.g.x2;
    run(over, NONE, 60);
    check(`while a set runs he is carried west over the heads (${x0 - over.g.x2} half-pixels in 60 frames)`, over.g.x2 < x0 - 10 && CURRENTS[0] !== undefined && surgeRuns(CURRENTS[0], SURGE.start + 10));
    const lee = at(PAC.hana, 10, 19, [SNORKEL]);
    run(lee, DOWN, 20);
    const lx = lee.g.x2;
    run(lee, NONE, SURGE.start + 40);
    check('in the first head\'s lee the water is still through a set', lee.g.x2 === lx && !dead(lee.g));
    const still = at(PAC.hana, 20, 14, [SNORKEL]);
    run(still, NONE, 30);
    const sx = still.g.x2;
    run(still, NONE, 60);
    check('between sets the water is still over the heads too', Math.abs(still.g.x2 - sx) <= 1);
  });
  SCOPE.section([PAC.hana, PAC.waikiki, PAC.hilo], 'Hana: the moray and the sea cave', () => {
    // the moray
    const mouth = at(PAC.hana, 5, 15, [SNORKEL]);
    const hold = mouth.g.y; // (the sea lifts him: a stroke down whenever it has, so he stays in the lunge's way)
    let died = -1;
    for (let f = 0; f < MORAY.period + 20 && died < 0; f++) { frame(mouth, mouth.g.y < hold ? DOWN : NONE); if (dead(mouth.g)) died = f; }
    check(`at the sea cave's mouth the moray's lunge kills (dead at frame ${died}, the lunge from ${MORAY.start + MORAY.warn + 15})`, died >= MORAY.start + MORAY.warn);
    const cave = search(at(PAC.hana, 5, 11, [SNORKEL]), (g) => g.coinCollected.some((c, i) => c !== 0 && WORLD.coinTable[i * 3] === PAC.hana && WORLD.coinTable[i * 3 + 1] === 4), [{ room: PAC.hana, col: 3, row: 15 }], 80000, 1.5);
    check('the bot swims past the moray into the sea cave for its coin (timing the lunge)', cave !== null);
  });
  SCOPE.section([PAC.hana, PAC.ship], 'Hana: the swimmer pictures', () => {
    // the swimmer
    const swimmer = at(PAC.hana, 16, 6, [SNORKEL, LEI]);
    wear(swimmer.g, itemIndex(swimmer.g, ...LEI));
    run(swimmer, RIGHT, 24);
    const facingRight = SWIM_CYCLE.right.some((p) => p === swimmer.g.sptr[3]) && swimmer.g.sptr[7] === SWIM_POINTERS.crownRight;
    run(swimmer, LEFT, 24);
    const facingLeft = SWIM_CYCLE.left.some((p) => p === swimmer.g.sptr[3]) && swimmer.g.sptr[7] === SWIM_POINTERS.crownLeft;
    const land = at(PAC.ship, 1, 13);
    const blocksOut = [...SWIM_POINTERS.left, ...SWIM_POINTERS.right].every((ptr) => land.g.mem.slice(ptr * 64, ptr * 64 + 64).every((b, i) => b === WORLD.bankImage[ptr * 64 + i]));
    check('in Hana he swims in his own pictures with the lei\'s crown on them, the blocks in the bank only there', facingRight && facingLeft && blocksOut);
  });
  SCOPE.section([PAC.hana, PAC.hilo], 'Hana: out onto the Hilo shore', () => {
    const out = at(PAC.hana, 29, 18, [SNORKEL]);
    run(out, RIGHT, 80);
    check('out at the bottom right he comes onto Hilo\'s shore and stands there', out.g.roomId === PAC.hilo && !dead(out.g));
  });
});

// ---- Hilo: the lava, the crust, the vent ------------------------------------------------------------
SCOPE.section([PAC.hilo, PAC.hana, PAC.plane], 'Hilo: the lava, the crust, the vent', () => {
  SCOPE.section([PAC.hilo], 'Hilo: the lava, the crust, the vent', () => {
    const tops = [0, 40, 200, 360, 500].map((t) => lavaTop(LAVA, t));
    check(`the lava starts at the floor and rises a row every 40 frames to row 10, the row under the long ledge's feet (tops ${tops.join(' ')})`, tops[0] === 19 && tops[1] === 18 && tops[3] === 10 && tops[4] === 10 && Math.min(...Array.from({ length: 900 }, (_, t) => lavaTop(LAVA, t))) === LAVA.topRow);
    const shore = at(PAC.hilo, 1, 19, [SNORKEL]);
    run(shore, NONE, 900);
    check('the shore he comes out on is outside the lava (he stands there through a whole cycle)', !dead(shore.g));
    const caught = at(PAC.hilo, 21, 14, [SNORKEL]);
    check('on the low ledges the lava gets him if he waits', diesAt(caught, NONE, 400) >= 0);
    const ledge = at(PAC.hilo, 14, 9, [SNORKEL]);
    run(ledge, NONE, 900);
    check('on the long ledge (floor 9, clear of the vent) he is safe from the lava for good', !dead(ledge.g));
    const crust = CRUST_CRACKS[0];
    const onCrust = at(PAC.hilo, crust?.col ?? 10, 14, [SNORKEL]);
    run(onCrust, NONE, (crust?.gone ?? 26) + 30);
    check('standing on the first stepping ledge it cracks, splits and gives way under him', onCrust.g.y > standY(14) || dead(onCrust.g));
    const vent = VENT_PULSES[0];
    const atVent = at(PAC.hilo, VENT.col, 9, [SNORKEL]);
    const ventDied = diesAt(atVent, NONE, VENT.period + 10);
    check(`standing over the vent he dies when it blows (frame ${ventDied}, live from ${VENT.start + VENT.warn})`, vent !== undefined && ventDied >= VENT.start + VENT.warn - 1);
  });
  SCOPE.section([PAC.hilo, PAC.hana, PAC.plane], 'Hilo: the climb to the long ledge', () => {
    const climb = search(at(PAC.hilo, 1, 19, [SNORKEL]), (g) => g.y === standY(9) && colOf(g) >= 20, [{ room: PAC.hilo, col: 26, row: 7 }], 200000, 2);
    check('the bot climbs from the shore to the long ledge ahead of the lava', climb !== null);
  });
  SCOPE.section([PAC.hilo, PAC.plane], 'Hilo: up the belly ladder into the hold', () => {
    // up the ladder from either column it can be climbed from, with the lava's rows on the floor under the hatch (he comes out of the top at the bottom of the room before the hold loads)
    for (const col of [7, 8]) {
      const ladder = at(PAC.hilo, col, 5, [SNORKEL]);
      let died = false;
      for (let f = 0; f < 300 && ladder.g.roomId === PAC.hilo; f++) { frame(ladder, UP); if (ladder.g.actionCounter !== 0) died = true; }
      run(ladder, UP, 20);
      check(`up the belly ladder (from column ${col}) he comes into the hold alive, on the ladder at its foot (at ${colOf(ladder.g)},${ladder.g.montyRow - 3})`, !died && !dead(ladder.g) && ladder.g.roomId === PAC.plane && ladder.g.montyRow - 3 >= 14);
    }
  });
});

// ---- the cargo plane: the crate, the door ------------------------------------------------------------
SCOPE.section([PAC.plane, AND.jump], 'the cargo plane: the crate, the door', () => {
  SCOPE.section([PAC.plane], 'the cargo plane: the loose crate', () => {
    const arrive = at(PAC.plane, 7, 16, [SNORKEL]);
    run(arrive, NONE, LOOSE_CRATE.start - 10);
    check('arriving up the ladder is safe: the loose crate\'s first roll comes later', !dead(arrive.g));
    const floor = at(PAC.plane, 20, 16, [SNORKEL]);
    check('standing on the roller floor the loose crate gets him', diesAt(floor, NONE, LOOSE_CRATE.start + LOOSE_CRATE.every) >= 0);
    const net = at(PAC.plane, 14, 12, [SNORKEL]);
    run(net, NONE, 2 * LOOSE_CRATE.every);
    check('on the cargo net he is out of its way', !dead(net.g));
  });
  SCOPE.section([PAC.plane, AND.jump], 'the cargo plane: the rear door', () => {
    const shut = at(PAC.plane, 27, 16, [SNORKEL]);
    run(shut, RIGHT, 80);
    check('without the parachute the rear door is shut (he stops in the hold)', shut.g.roomId === PAC.plane && PLANE_DOOR_CELLS.length === 8);
    const open = at(PAC.plane, 27, 16, [SNORKEL, PARACHUTE]);
    run(open, RIGHT, 80);
    check('with it the door is open onto the apron\'s mail biplane: the flight\'s first leg (sky.ts)', open.g.roomId === FLY.mail);
  });
});

// ---- the hints and the banners ------------------------------------------------------------------------
SCOPE.section([], 'the hints and the banners', () => {
  SCOPE.section([], 'the hints', () => {
    const want = WORLD.hints.wanted.filter((h) => h.room >= PAC.ship && h.room <= PAC.plane).map((h) => `${h.room}:${h.text}`);
    check(`the gates' hints are the two kept (${want.join(' / ')})`, want.join('|') === `${PAC.waikiki}:A MOLE CANNOT SWIM THAT FAR|${PAC.plane}:NO FLYING WITHOUT A PARACHUTE`);
    const take = new Set(WORLD.hints.take.map((h) => h.text));
    check('the take hints are the snorkel\'s, the lei\'s and the parachute\'s; the cutters\' and the chain\'s are gone', take.has('WITH A SNORKEL HE CAN SWIM') && take.has('A LEI: TRAVELLERS WEAR ONE') && take.has('PARACHUTE: FOR A LONG DROP') && ![...take].some((t) => t.includes('CUTTERS') || t.includes('CHAIN')));
  });
  SCOPE.section([JP.port, PAC.ship, PAC.waikiki, PAC.hana, PAC.hilo], 'the banners', () => {
    const arrive = (from: number, to: number, col: number, floor: number, holds: readonly (readonly [number, number])[] = []) => {
      const s = at(from, 2, 13, holds);
      enterRoom(s.g, to, 0x0c + (col + 4) * 4, standY(floor));
      run(s, NONE, 3);
      return rowText(s.g);
    };
    check('Oahu welcomes him aboard at Honolulu, Maui names itself in Hana\'s sea, the Big Island at Hilo; Waikiki after the ship is just its name',
      arrive(JP.port, PAC.ship, 1, 13) === 'WELCOME TO HAWAII: OAHU' && arrive(PAC.waikiki, PAC.hana, 27, 5, [SNORKEL]) === 'HAWAII: MAUI' && arrive(PAC.hana, PAC.hilo, 1, 19, [SNORKEL]) === 'HAWAII: THE BIG ISLAND' && arrive(PAC.ship, PAC.waikiki, 1, 19) === 'WAIKIKI');
  });
});

// ---- a save in each room ----------------------------------------------------------------------------
SCOPE.section([], 'a save in each room', () => {
  const spots = [[PAC.ship, 1, 13], [PAC.waikiki, 1, 19], [PAC.hana, 27, 5], [PAC.hilo, 1, 19], [PAC.plane, 7, 16]] as const;
  const failed: number[] = [];
  for (const [room, col, floor] of spots.filter(([id]) => SCOPE.has(id))) {
    const a = newGame(WORLD, false);
    for (const [r, n] of [SNORKEL, LEI]) a.g.siCollected[itemIndex(a.g, r, n)] = 0x81;
    wear(a.g, itemIndex(a.g, ...LEI));
    enterRoom(a.g, room, 0x0c + (col + 4) * 4, standY(floor));
    for (let n = 0; n < 200 && (a.g.freeze || a.g.script); n++) frame(a, NONE);
    const b = newGame(WORLD, false);
    restore(b.g, CODEC.unpack(CODEC.pack(snapshot(a.g)), CODEC.format));
    b.g.enemies = []; b.g.enable &= 0x0f; b.g.vic.enable &= 0x0f; b.g.pulses = []; b.g.lavas = []; b.g.rollers = [];
    run(b, NONE, 40);
    if (b.g.roomId !== room || dead(b.g) || b.g.worn !== itemIndex(b.g, ...LEI)) failed.push(room);
  }
  check(`a save made in each of the five rooms carries on there, alive, in the lei${failed.length ? ` (not in ${failed.join()})` : ''}`, failed.length === 0);
});

SCOPE.report();
finish();
