/**
 * The Pacific's mechanisms, headless, each on its own with the room's creatures out of the way (the bot, pacific.ts, plays them all together): swimming (the jetpack's free movement slower and buoyant, in the reefs
 * and the cave only, the sea shut with deadly surf until the snorkel), the luau's torches (flame, flicker, burn, a gap to wait in), the road's cars (one to a bridge, a span only, the way Monty goes, a fair crossing
 * behind each), the volcano's lava (a row a time, kills at the ledge, never above row 11, the shelf and the high ledges safe), the loader's ride, the four gates, the lei as a costume, the joins both ways, the hints,
 * the map, and a save in each room.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/pacific-mechanisms.ts
 */
import { enterRoom } from '../../montyotr/src/ending';
import type { Game } from '../../montyotr/src/game';
import { wear } from '../../montyotr/src/items';
import { lavaTop } from '../../montyotr/src/lava';
import { montyMap } from '../../montyotr/src/map';
import { MOTR } from '../../montyotr/src/motr';
import { pulsePhase } from '../../montyotr/src/pulses';
import { restore, snapshot } from '../../montyotr/src/save';
import { SWIM } from '../../montyotr/src/swim';
import { frame, NONE, type State } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { must } from '../../shared/test/must';
import { WORLD_CREATURES } from '../src/art';
import { PACIFIC_CREATURES } from '../src/art/pacific-creatures';
import { SWIM_CYCLE, SWIM_POINTERS } from '../src/pacific-pointers';
import { PACIFIC_MORE_CREATURES } from '../src/art/pacific-more';
import { LEI_COLOUR, leiWorn } from '../src/art/pacific-lei';
import { WORLD } from '../src/data';
import { HAT_BLOCKS } from '../src/hats';
import { JP } from '../src/japan';
import { FIRST_CREATURE } from '../src/layout';
import { CODEC } from '../src/main';
import { BRIDGES, CAR, CHAIN_CELLS, MORAY, PIER_PALETTE, ROCKS, WAVE, COVE_CELLS, COVE_ROPE, COVE_ROPE_CODE, LAVA, LOADER, PAC, PAC_SPRITE, PACIFIC_COLOURS, PACIFIC_ROOMS, PACIFIC_EXTRA_ROOMS, PACIFIC_EXTRA_SECTORS, PACIFIC_SECTORS, PLANE_DOOR_CELLS, DIVE_CELLS, DIVE_ROPE, DIVE_ROPE_CODE, TORCHES, TORCH_PULSES } from '../src/pacific';
import { AND } from '../src/andes';
import { newGame } from '../../shared/monty/test/bot';
import { search } from './search';
import { cell, colOf, dead, diesAt, LEFT, overCrowded, RIGHT, UP, at, rowText, run } from './mech-kit';
import { creatureRooms, itemIndex, standY } from './route';
import { codeOf } from '../src/layout';

const DOWN = { ...NONE, down: true };
/** The items by name (the room's nth). */
const CUTTERS = [PAC.box, 0] as const, SNORKEL = [PAC.surf, 0] as const, LEI = [PAC.lei, 0] as const, PARACHUTE = [PAC.hold, 0] as const;

// ---- the data -------------------------------------------------------------------------------------
{
  const cells = WORLD.exitGrid.image;
  const cols = WORLD.exitGrid.cols;
  const grid = (row: number, col: number) => cells[row * cols + col];
  const placed = [[2, 17, PAC.stern], [2, 18, PAC.box], [2, 19, PAC.pier], [2, 20, PAC.surf], [1, 21, PAC.lei], [1, 20, PAC.feast], [0, 20, PAC.diamond], [0, 21, PAC.lookout], [2, 21, PAC.clam], [2, 22, PAC.mole], [2, 23, PAC.kelp], [1, 23, PAC.whale], [1, 24, PAC.road], [2, 24, PAC.cave],
    [1, 25, PAC.hana], [2, 25, PAC.fish], [2, 26, PAC.coffee], [2, 27, PAC.mauna], [2, 28, PAC.hilo], [2, 29, PAC.hold]] as const;
  check('the Pacific is seventeen rooms in a block of thirteen columns (17-29) beside Japan\'s, room ids 38 to 54, and three more of the second pass (the feast, Diamond Head and its lookout, ids 78-80), Japan\'s port (row 2) joined to the stern (row 2), the regions before it unchanged',
    placed.every(([r, c, id]) => grid(r, c) === id) && cells.filter((c) => c !== 0xff).length === 81 && grid(2, 16) === JP.port && grid(0, 17) === 0xff && grid(1, 17) === 0xff && grid(2, 30) === AND.jump);
  const coinsIn = (lo: number, hi: number) => Array.from({ length: WORLD.coinTable.length / 3 }, (_, i) => WORLD.coinTable[i * 3] ?? 0).filter((r) => r >= lo && r <= hi).length;
  const itemsIn = (lo: number, hi: number) => Array.from({ length: WORLD.specialItems.length / 4 }, (_, i) => WORLD.specialItems[i * 4] ?? 0).filter((r) => r >= lo && r <= hi).length;
  check('the regions before the Pacific keep their coins and finds, in the same table places (first), and the Pacific adds 80 coins and 7 finds (the cutters, the snorkel, the lei, the parachute and three musubi)',
    coinsIn(0, 37) === 67 && itemsIn(0, 37) === 18 && coinsIn(38, 54) === 80 && itemsIn(38, 54) === 7 && (WORLD.coinTable[66 * 3] ?? 99) <= 37 && (WORLD.coinTable[67 * 3] ?? 0) >= 38);
  check('19 key items and 24 snacks count on the pause screen', WORLD.progress.keyItems.length === 19 && WORLD.progress.cakes.length === 24);
  check('the second pass adds 11 coins and a musubi (rooms 78-80), after Rio\'s in the tables', coinsIn(78, 80) === 11 && itemsIn(78, 80) === 1 && PACIFIC_EXTRA_SECTORS.length === 3);
  check('the Pacific\'s sectors and map colours are one each', PACIFIC_SECTORS.length === 17 && PACIFIC_COLOURS.length === 17 && PACIFIC_SECTORS.every((s) => s.text.length <= 32 && !/Z/.test(s.text)));
  const rooms = creatureRooms([...PACIFIC_ROOMS, ...PACIFIC_EXTRA_ROOMS]);
  const most = Math.max(...[...rooms.values()].map((v) => v.size));
  check(`${rooms.size} kinds of creature in the Pacific's seventeen rooms, none in more than two (${[...rooms.values()].map((v) => v.size).join(' ')})`, rooms.size <= Object.keys(PACIFIC_CREATURES).length + Object.keys(PACIFIC_MORE_CREATURES).length && rooms.size >= 8 && most <= 2);
  const used = [...HAT_BLOCKS, ...Object.values(PAC_SPRITE)];
  check(`every block of the bank the Pacific uses is its own (${used.length} pointers, none twice, none Monty's: $50-$73, none the first aid kit's, the smoke stack's or the treasure's) and its five items have pictures there`,
    new Set(used).size === used.length && used.every((p) => p < 0x50 || p > 0x73) && Object.values<number>(PAC_SPRITE).every((p) => p !== 0x8e && p !== 0x92 && p !== 0x9b && WORLD.bankImage.subarray(p * 64, p * 64 + 63).some((b) => b !== 0)));
  const crowded = overCrowded(PACIFIC_ROOMS);
  check(`no room has a fourth creature (sprite 7 is the worn lei's: it would be a phantom; ${crowded.length ? `rooms ${crowded.join()}` : 'none do'})`, crowded.length === 0);
  check('Monty on the Run is as it was (no swim rooms, no lava, no span on a tunnel)', MOTR.swimRooms.length === 0 && MOTR.risingLava.length === 0 && MOTR.tunnels.length === 0);
  check('the swim rooms are the three reefs and the cave, the lava the volcano\'s', WORLD.swimRooms.join() === [PAC.clam, PAC.kelp, PAC.cave, PAC.fish].join() && WORLD.risingLava.length === 1 && WORLD.risingLava[0]?.room === PAC.mauna);
}

// ---- swimming ------------------------------------------------------------------------------------------
{
  const s = at(PAC.clam, 9, 8);
  const y0 = s.g.y, x0 = s.g.x2;
  run(s, NONE, 60);
  check(`in a reef he does not fall: with no stick the sea lifts him a pixel every ${SWIM.float}th frame (${y0 - s.g.y} pixels in 60 frames), and he stays where he is across`, Math.abs(y0 - s.g.y - 10) <= 1 && s.g.x2 === x0 && !dead(s.g));
  const d = at(PAC.clam, 9, 8);
  const dy = d.g.y;
  run(d, DOWN, 60);
  check(`held down he sinks a pixel every other frame (${d.g.y - dy} pixels in 60 frames), half the jetpack's thrust`, Math.abs(d.g.y - dy - 30) <= 1);
  const u = at(PAC.clam, 9, 12);
  const uy = u.g.y;
  run(u, UP, 60);
  check(`held up he swims up a pixel every other frame (${uy - u.g.y} pixels in 60 frames)`, Math.abs(uy - u.g.y - 30) <= 1);
  const r = at(PAC.clam, 4, 8);
  const rx = r.g.x2 * 2 + r.g.stepGate;
  run(r, RIGHT, 60);
  check(`held right he swims at his walking pace, a pixel a frame (${(r.g.x2 * 2 + r.g.stepGate) - rx} pixels in 60 frames)`, Math.abs((r.g.x2 * 2 + r.g.stepGate) - rx - 58) <= 4);
  const bed = at(PAC.clam, 4, 15);
  run(bed, DOWN, 120);
  check('the seabed stops him (he lies on the sand at floor 19), alive', bed.g.y === standY(19) && !dead(bed.g));
  const rock = at(PAC.clam, 6, 15);
  run(rock, RIGHT, 150);
  check('a reef\'s rock stops him as a wall does', rock.g.roomId === PAC.clam && colOf(rock.g) < 8);
  check('he swims out of one reef into the next room by the side at his height (CLAM to MOLE-OKAI on its landing, KELP to the sea cave and back)',
    (() => { const a = at(PAC.clam, 27, 19); run(a, RIGHT, 80); const b = at(PAC.kelp, 27, 19); run(b, RIGHT, 80); const c = at(PAC.cave, 3, 19); run(c, LEFT, 80); return a.g.roomId === PAC.mole && b.g.roomId === PAC.cave && c.g.roomId === PAC.kelp; })());
  const up = at(PAC.kelp, 15, 8);
  for (let f = 0; f < 400 && up.g.roomId !== PAC.whale; f++) frame(up, UP);
  run(up, NONE, 6);
  check('up through the ceiling gap of the second reef he comes out at Lahaina\'s slipway, on the rope', up.g.roomId === PAC.whale && up.g.onRope !== 0);
  const lift = at(PAC.mole, 2, 19);
  run(lift, NONE, 60);
  check('on land (Molokai) he does not swim: a stick of nothing leaves him standing on the landing', lift.g.y === standY(19) && lift.g.roomId === PAC.mole);
  const dive = at(PAC.lei, 26, 12);
  check('at the stage\'s far end the lawn\'s last boards are deadly waves without the snorkel (he dies stepping on them)', diesAt(dive, RIGHT, 200) >= 0);
  {
    const stats = { exhausted: false };
    const across = search(at(PAC.lei, 26, 12), (g) => g.roomId === PAC.clam, [{ room: PAC.clam, col: 28, row: 3 }], 150000, 1.5, stats);
    check(`there is no way past the waves into the reef without the snorkel, jumps and all (${stats.exhausted ? 'every state looked at' : 'the 150000-state limit'})`, across === null);
    const open = at(PAC.lei, 26, 12, [SNORKEL]);
    for (let f = 0; f < 120 && open.g.onRope === 0; f++) frame(open, RIGHT);
    for (let f = 0; f < 400 && open.g.roomId !== PAC.clam; f++) frame(open, DOWN);
    run(open, NONE, 4);
    check('with the snorkel the dive is a gap with a rope hanging in it: he takes the rope and climbs down into the first reef alive', open.g.roomId === PAC.clam && !dead(open.g));
    check(`the dive's cells are deadly waves until the snorkel and empty after, with the rope hung down the gap (${DIVE_CELLS.length} cells, ${DIVE_ROPE.length} of rope)`, DIVE_CELLS.every(([row, col]) => cell(at(PAC.lei, 2, 12).g, col, row) !== 0) && DIVE_CELLS.every(([row, col]) => cell(at(PAC.lei, 2, 12, [SNORKEL]).g, col, row) === 0 || DIVE_ROPE.some(([r2, c2]) => r2 === row && c2 === col)) && DIVE_ROPE.every(([row, col]) => cell(at(PAC.lei, 2, 12, [SNORKEL]).g, col, row) === DIVE_ROPE_CODE));
    for (const floor of [5, 10, 15]) {
      const back = at(PAC.clam, 28, floor, [SNORKEL]);
      for (let f = 0; f < 400 && back.g.roomId !== PAC.lei; f++) frame(back, UP);
      run(back, NONE, 4);
      check(`swimming up out of the reef through the gap from row ${floor} he comes into the show alive, on the rope (room ${back.g.roomId}, y ${back.g.y})`, back.g.roomId === PAC.lei && !dead(back.g) && back.g.onRope !== 0);
    }
  }
  const cove = at(PAC.hana, 17, 18);
  check('at Hana the cove\'s pool is deadly surf without the snorkel', diesAt(cove, RIGHT, 200) >= 0);
  const drop = at(PAC.hana, 17, 18, [SNORKEL]);
  for (let f = 0; f < 120 && drop.g.onRope === 0; f++) frame(drop, RIGHT);
  for (let f = 0; f < 300 && drop.g.roomId !== PAC.fish; f++) frame(drop, DOWN);
  check('with it the pool is a gap with a rope over it: he takes the rope and climbs down into the third reef, and the rope hangs back up into the cove', drop.g.roomId === PAC.fish && COVE_ROPE.every(([row, col]) => cell(at(PAC.hana, 17, 18, [SNORKEL]).g, col, row) === COVE_ROPE_CODE));
  void COVE_CELLS;
  void SWIM;
}

// ---- the luau's torches --------------------------------------------------------------------------------
{
  const e = must(TORCH_PULSES[0], 'the first torch');
  const phases = [0, e.start - 1, e.start, e.start + e.warn - 1, e.start + e.warn, e.start + e.warn + e.live - 1, e.start + e.warn + e.live, e.period - 1].map((t) => pulsePhase(e, t));
  check(`a torch burns low for ${TORCHES.idle} frames, flickers for ${TORCHES.warn}, burns tall and deadly for ${TORCHES.live} and settles for ${TORCHES.period - TORCHES.idle - TORCHES.warn - TORCHES.live}, a ${TORCHES.period}-frame period (${phases.join(' ')})`,
    phases.join() === ['idle', 'idle', 'warn', 'warn', 'live', 'live', 'spent', 'spent'].join() && TORCH_PULSES.length === 3);
  check(`the three torches go off ${TORCHES.apart} frames after one another (offsets ${TORCH_PULSES.map((p) => p.offset).join(', ')}), a three-cell gap between them`, TORCH_PULSES.map((p) => p.offset).join() === [0, 110, 70].join() && TORCHES.cols.every((c, i) => i === 0 || (TORCHES.cols[i - 1] ?? 0) - c === 5));
  const s = at(PAC.feast, 25, 18);
  const codeAt = (col: number) => cell(s.g, col, TORCHES.row + 1);
  const seen = new Set<number>();
  for (let f = 0; f < TORCHES.period; f++) { frame(s, NONE); seen.add(codeAt(22)); }
  check(`a torch's foot is drawn in three characters, the embers, the small flame and the tall one (${seen.size}), and its head is empty until the tall flame fills it`, seen.size === 3 && !dead(s.g));
  // standing in the first torch's cells: safe through its low and flickering time, dead when it is tall
  const stand = at(PAC.feast, 22, 18);
  let died = -1;
  for (let f = 0; f < 200; f++) { frame(stand, NONE); if (dead(stand.g)) { died = f; break; } }
  check(`standing in a torch's cells he is safe while it burns low and dies when it burns tall (dead at frame ${died}, the tall flame from ${TORCHES.idle + TORCHES.warn})`, died >= TORCHES.idle + TORCHES.warn - 3 && died < TORCHES.idle + TORCHES.warn + TORCHES.live);
  const gap = at(PAC.feast, 25, 18);
  let safe = true;
  for (let f = 0; f < 600; f++) { frame(gap, NONE); if (dead(gap.g)) safe = false; }
  check('in the gap between two torches he is never touched, through four cycles', safe);
  const through = search(at(PAC.feast, 26, 18), (g) => g.roomId === PAC.feast && colOf(g) <= 6 && g.y === standY(18), [{ room: PAC.feast, col: 5, row: 16 }], 150000, 1.5);
  check('the bot walks the lane from the rope to the ladder past all three torches (waiting in the gaps)', through !== null);
}

// ---- the road's cars -----------------------------------------------------------------------------------
{
  const cars = WORLD.tunnels.filter((t) => t.room === PAC.road);
  check(`three one-lane bridges, a car of ${CAR.cols} by 2 cells to each over a ${BRIDGES[0].last - BRIDGES[0].first + 1}-cell span, each going the way Monty does (left to right, right to left, left to right), ${CAR.rest} frames at rest, ${CAR.warn} of a flashing edge, a cell every ${CAR.step} frames`,
    cars.length === 3 && cars.every((c, i) => c.span?.from === BRIDGES[i]?.first && c.span?.to === BRIDGES[i]?.last && c.from === BRIDGES[i]?.from && c.cols === CAR.cols && c.rest === CAR.rest && c.warn === CAR.warn && c.step === CAR.step));
  // each bridge: a car is drawn only within its span, kills over it, never outside it; and a crossing begun as the car clears the far end is clear
  for (const [i, b] of BRIDGES.entries()) {
    const car = must(cars[i], 'the car');
    const lane = (g: Game) => [car.top, car.bottom].flatMap((row) => Array.from({ length: 32 }, (_, c) => ({ c, row, v: cell(g, c, row) }))).filter((p) => p.v === car.code || (car.picture ?? []).flat().filter((c) => c !== 0).includes(p.v));
    const s = at(PAC.road, b.from === 'left' ? 2 : 29, b.level);
    let outside = 0, drawn = 0;
    for (let f = 0; f < 700; f++) { frame(s, NONE); for (const p of lane(s.g)) { drawn++; if (p.c < b.first || p.c > b.last) outside++; } }
    check(`bridge ${i + 1} (floor ${b.level}): its car is drawn (${drawn} cells over 700 frames) only within columns ${b.first}-${b.last} (${outside} outside), and he waiting off the bridge is not touched`, drawn > 0 && outside === 0 && !dead(s.g));
    // on the bridge a car kills: stand in the middle through a cycle
    const mid = at(PAC.road, Math.floor((b.first + b.last) / 2), b.level);
    check(`bridge ${i + 1}: standing on the bridge the car kills him (frame ${diesAt(mid, NONE, 2 * (CAR.rest + CAR.warn + 80))})`, dead(mid.g));
    // a fair crossing: wait off the bridge's near end until the car has cleared the far end, then walk across
    const w = at(PAC.road, b.from === 'left' ? b.first - 4 : b.last + 3, b.level);
    const state = () => w.g.tunnels.find((t) => t.spec === car)?.state;
    let guard = 0;
    while (state() !== 'sweep' && guard++ < 1500) frame(w, NONE);
    while (state() === 'sweep' && guard++ < 3000) frame(w, NONE);
    const stick = b.from === 'left' ? RIGHT : LEFT;
    let ok = !dead(w.g);
    const far = b.from === 'left' ? b.last + 2 : b.first - 3;
    for (let f = 0; f < 300 && ok && (b.from === 'left' ? colOf(w.g) < far : colOf(w.g) > far); f++) { frame(w, stick); ok = !dead(w.g); }
    check(`bridge ${i + 1}: crossing the moment its car has cleared the far end he gets over alive (to column ${colOf(w.g)}, room ${w.g.roomId})`, ok && (b.from === 'left' ? colOf(w.g) >= far : colOf(w.g) <= far));
  }
}

// ---- the volcano's lava ---------------------------------------------------------------------------------
{
  const tops = [0, 55, 56, 111, 112, 8 * LAVA.stepFrames - 1, 8 * LAVA.stepFrames, 8 * LAVA.stepFrames + LAVA.holdFrames - 1, 8 * LAVA.stepFrames + LAVA.holdFrames + LAVA.drainFrames, 8 * LAVA.stepFrames + LAVA.holdFrames + 8 * LAVA.drainFrames].map((t) => lavaTop(LAVA, t));
  check(`the lava starts at row ${LAVA.baseRow} and rises a row every ${LAVA.stepFrames} frames to row ${LAVA.topRow}, holds ${LAVA.holdFrames} frames and drains a row every ${LAVA.drainFrames} (${tops.join(' ')})`, tops.join() === [19, 19, 18, 18, 17, 12, 11, 11, 12, 19].join());
  const s = at(PAC.mauna, 2, 19);
  const covered = (row: number, col: number) => cell(s.g, col, row) === LAVA.code || cell(s.g, col, row) === LAVA.crest;
  let rows = 0;
  for (let f = 0; f < 8 * LAVA.stepFrames + 10; f++) { frame(s, NONE); if (f === 3 * LAVA.stepFrames + 5) rows = [14, 15, 16, 17, 18].filter((r) => covered(r, 10)).length; }
  check(`the lava is drawn over the basin's empty cells and rises through its rows (${rows} of the rows 14-18 covered after three steps; the landing is no lava's), at the rim row ${LAVA.topRow} in the end`, rows >= 1 && covered(LAVA.topRow, 10) && !covered(LAVA.topRow - 1, 10) && !covered(18, 2));
  const low = at(PAC.mauna, 6, 17);
  const lowDies = diesAt(low, NONE, 600);
  check(`standing on the first ledge (floor 17) the lava reaches him at frame ${lowDies} (when its top reaches his feet: ${3 * LAVA.stepFrames})`, lowDies >= 3 * LAVA.stepFrames - 10 && lowDies <= 4 * LAVA.stepFrames);
  const rim = at(PAC.mauna, 24, 11);
  run(rim, NONE, 2 * (8 * LAVA.stepFrames + LAVA.holdFrames + 8 * LAVA.drainFrames));
  check('on the top ledge (floor 11) the lava never touches him, through two cycles', !dead(rim.g));
  const shelf = at(PAC.mauna, 4, 7);
  run(shelf, NONE, 1500);
  check('on the snow shelf (floor 7) it never reaches him either', !dead(shelf.g));
  const enter = at(PAC.mauna, 2, 19);
  run(enter, NONE, 200);
  const again = at(PAC.coffee, 29, 19);
  run(again, RIGHT, 60);
  check('he comes into the room with the lava at the bottom, whenever he comes (it starts again each time), and it kills nothing at the landing (alive after 200 frames)', again.g.roomId === PAC.mauna && !dead(enter.g) && again.g.lavas[0]?.t !== undefined && again.g.lavas[0].t < 120);
  check('the four ledges are two rows apart (floors 17, 15, 13, 11) and the rim two above the last: a climb of jumps the bot makes ahead of the lava (pacific.ts)', [17, 15, 13, 11, 9].every((f, i, all) => i === 0 || (all[i - 1] ?? 0) - f === 2));
}

// ---- the loader, the guard, the gates --------------------------------------------------------------------
{
  const ride = at(PAC.hilo, 12, 17);
  run(ride, RIGHT, 40);
  const mid = ride.g.y;
  run(ride, NONE, 140);
  check(`the loader carries him up its slope, five rows (${LOADER.frames} frames) and sets him down on the gantry along the plane's back (floor 12, column ${colOf(ride.g)}, y ${ride.g.y}, was ${mid} in the ride), alive and free to walk`, ride.g.roomId === PAC.hilo && ride.g.y === standY(12) && colOf(ride.g) >= 16 && ride.g.gameMode === 0 && !dead(ride.g));
  run(ride, RIGHT, 400);
  check('along the gantry he walks out into the plane\'s hold (its sill, floor 12)', ride.g.roomId === PAC.hold);
  {
    const top = at(PAC.hilo, 25, 12);
    run(top, LEFT, 300);
    check(`from the gantry walking west he is turned back by the loader's treads or stands on it (column ${colOf(top.g)}), never dropped`, top.g.roomId === PAC.hilo && !dead(top.g) && top.g.y === standY(12));
    const apron = at(PAC.hilo, 13, 17, [LEI]);
    run(apron, { ...RIGHT, fire: true }, 30);
    run(apron, RIGHT, 300);
    check(`walking the apron east under the plane he stops at its end (room ${apron.g.roomId}, column ${colOf(apron.g)}), never out into the hold's wall`, apron.g.roomId === PAC.hilo && colOf(apron.g) >= 26);
  }
  // the guard and the lei
  const GUARD = FIRST_CREATURE + Object.keys(WORLD_CREATURES).indexOf('pacGuard');
  const guard = at(PAC.hilo, 6, 17, [], false, true);
  check('without the lei there is a guard in the gatehouse\'s corridor (its first creature slot)', guard.g.enemies[0]?.type === GUARD && guard.g.enemies[0].x !== 0xff);
  const past = (g: Game) => g.roomId === PAC.hilo && colOf(g) >= 11 && g.y === standY(17);
  const stats = { exhausted: false };
  const noWay = search(guard, past, [{ room: PAC.hilo, col: 12, row: 15 }], 120000, 0, stats) === null;
  check(`and the bot finds no way past him (120000 states looked at${stats.exhausted ? ', every one there is' : ', the search limit'}): the gatehouse's wall goes to the top of the room and the corridor is his lane, two cells high`, noWay);
  const lei = at(PAC.hilo, 6, 17, [LEI], false, true);
  check('with the lei he is gone (sent off the screen)', must(lei.g.enemies[0], 'the guard').x === 0xff);
  check('and the bot gets through the gatehouse to the loader', search(lei, past, [{ room: PAC.hilo, col: 12, row: 15 }], 100000, 1.5) !== null);
  // the cutters
  const chain = (holds: readonly (readonly [number, number])[]) => CHAIN_CELLS.map(([row, col]) => cell(at(PAC.box, 24, 11, holds).g, col, row));
  check('the chain across the ramp is a wall until the cutters (eight cells, with the gutter columns) and gone after', chain([]).every((c) => c !== 0) && chain([CUTTERS]).every((c) => c === 0));
  const wall = at(PAC.box, 27, 11);
  run(wall, RIGHT, 200);
  const gone = at(PAC.box, 27, 11, [CUTTERS]);
  run(gone, RIGHT, 200);
  check('without them the chain stops him at the bow; with them he walks down the ramp to the pier', wall.g.roomId === PAC.box && gone.g.roomId === PAC.pier);
  {
    const stats = { exhausted: false };
    const over = search(at(PAC.box, 24, 11), (g) => g.roomId === PAC.pier, [{ room: PAC.pier, col: 2, row: 9 }], 150000, 1.5, stats);
    check(`and no way past the chain without the cutters, jumps and all (${stats.exhausted ? 'every state looked at' : 'the 150000-state limit'})`, over === null);
  }
  // the parachute
  const door = (holds: readonly (readonly [number, number])[]) => PLANE_DOOR_CELLS.map(([row, col]) => cell(at(PAC.hold, 20, 16, holds).g, col, row));
  check('the plane\'s rear door is shut (eight cells, with the gutters) until the parachute and open after', door([]).every((c) => c !== 0) && door([PARACHUTE]).every((c) => c === 0));
}

// ---- the lei is a costume ------------------------------------------------------------------------------
{
  const hood = itemIndex(newGame(WORLD, false).g, JP.mole, 0), lei = itemIndex(newGame(WORLD, false).g, PAC.lei, 0);
  const worn = leiWorn(WORLD.bankImage);
  const s = newGame(WORLD, false);
  wear(s.g, hood);
  const pool0 = must(HAT_BLOCKS[0], 'the first hat block');
  const hatBlock = (g: Game) => g.mem.slice(pool0 * 64, pool0 * 64 + 63);
  const hoodPicture = hatBlock(s.g);
  wear(s.g, lei);
  const first = worn.monty[0];
  check('putting on the lei writes its pictures over Monty\'s (the hood\'s go) and its sprite over the hat pool\'s',
    s.g.worn === lei && first !== undefined && first.ptr === 0x50 && s.g.mem.slice(0x50 * 64, 0x50 * 64 + 63).every((b, i) => b === first.block[i]) && !hatBlock(s.g).every((b, i) => b === hoodPicture[i]));
  {
    const play = at(PAC.surf, 3, 18, []);
    wear(play.g, lei);
    run(play, NONE, 5);
    check('the lei is a sprite of its own over him (sprite 7, light red), enabled', (play.g.vic.enable & 0x80) !== 0 && play.g.scol[7] === LEI_COLOUR && HAT_BLOCKS.includes(play.g.sptr[7] ?? 0));
  }
  {
    const a = newGame(WORLD, false);
    a.g.siCollected[lei] = 0x81;
    wear(a.g, lei);
    enterRoom(a.g, PAC.hilo, 0x0c + 15 * 4, standY(17));
    for (let n = 0; n < 200 && (a.g.freeze || a.g.script); n++) frame(a, NONE);
    const b = newGame(WORLD, false);
    wear(b.g, hood);
    restore(b.g, CODEC.unpack(CODEC.pack(snapshot(a.g)), CODEC.format));
    check('a save made in the lei carries on in it (the lei as the worn item, its pictures in the bank, the guard gone)', b.g.worn === lei && b.g.enemies.filter((e) => e.type === FIRST_CREATURE + Object.keys(WORLD_CREATURES).indexOf('pacGuard')).every((e) => e.x === 0xff) && b.g.mem.slice(0x50 * 64, 0x50 * 64 + 63).every((v, i) => v === first?.block[i]));
  }
}

// ---- the joins ------------------------------------------------------------------------------------------
{
  /** The rows open (not a wall) down the edge column of a room, and the columns open along its top or bottom row. */
  const open = (room: number) => {
    const r = must([...PACIFIC_ROOMS, ...PACIFIC_EXTRA_ROOMS].find((x) => x.id === room), 'a room');
    const wall = (col: number, row: number) => { const ch = r.map[row]?.[col] ?? '.'; return ch !== '.' && [1, 2, 4].includes(WORLD.tileProperty(r.tiles[Number(ch) - 1] ?? 0)); };
    return { wall };
  };
  const rowsOpen = (room: number, col: number) => Array.from({ length: 20 }, (_, row) => row).filter((row) => !open(room).wall(col, row));
  const colsOpen = (room: number, row: number) => Array.from({ length: 32 }, (_, col) => col).filter((col) => !open(room).wall(col, row));
  const together = (a: readonly number[], b: readonly number[]) => a.filter((x) => b.includes(x) && b.includes(x + 1) && a.includes(x + 1)).length > 0;
  const sides: readonly (readonly [number, number])[] = [[PAC.stern, PAC.box], [PAC.box, PAC.pier], [PAC.pier, PAC.surf], [PAC.feast, PAC.lei], [PAC.diamond, PAC.lookout], [PAC.clam, PAC.mole], [PAC.mole, PAC.kelp], [PAC.kelp, PAC.cave], [PAC.whale, PAC.road],
    [PAC.road, PAC.hana], [PAC.fish, PAC.coffee], [PAC.coffee, PAC.mauna], [PAC.mauna, PAC.hilo], [PAC.hilo, PAC.hold]];
  /** A side's rows that are open on one and wall on the other (a jump or a walk there would end inside a wall): every open row must meet an open one. The chain's rows and the waves' count as open (cut, snorkelled). */
  const cut = (l: number): readonly number[] => (l === PAC.box ? [9, 10] : []);
  const clash = (l: number, r: number) => {
    const a = [...rowsOpen(l, 31), ...cut(l)], b = rowsOpen(r, 0);
    return [...a.filter((x) => !b.includes(x)), ...b.filter((x) => !a.includes(x))].filter((row) => row >= 2); // (the two top rows are the ceiling's: nothing of him gets there)
  };
  const badSides = sides.filter(([l, r]) => !together([...rowsOpen(l, 31), ...cut(l)], rowsOpen(r, 0)) || clash(l, r).length > 0);
  check(`every east-west join of the Pacific is open at the same rows on both sides, no open row meeting a wall (${badSides.length ? badSides.map(([l, r]) => `${l}-${r}: ${clash(l, r).join(' ')}`).join(', ') : 'all thirteen'})`, badSides.length === 0);
  const tops: readonly (readonly [number, number])[] = [[PAC.feast, PAC.surf], [PAC.lei, PAC.clam], [PAC.diamond, PAC.feast], [PAC.whale, PAC.kelp], [PAC.road, PAC.cave], [PAC.hana, PAC.fish]];
  const badTops = tops.filter(([upper, lower]) => !together([...colsOpen(upper, 19), ...(upper === PAC.hana ? [20, 21, 22] : [])], colsOpen(lower, 0)));
  check(`every up-down join is open at the same columns (${badTops.length ? badTops.map(([u, l]) => `${u}-${l}`).join(', ') : 'all four'})`, badTops.length === 0);
  const reach = (from: State, aim: { room: number; col: number; row: number }, goal: (g: Game) => boolean, limit = 200000) => search(from, (g) => goal(g) && !g.freeze && !g.script, [aim], limit, 1.5) !== null;
  const quiet = (s: State) => { s.g.tunnels = []; s.g.pulses = []; s.g.lavas = []; return s; };
  check('Japan\'s port walks east onto the stern\'s landing and the stern walks west back onto the port\'s deck', (() => { const a = at(JP.port, 27, 13); run(a, RIGHT, 100); const b = at(PAC.stern, 1, 13); run(b, LEFT, 100); return a.g.roomId === PAC.stern && b.g.roomId === JP.port; })());
  check('the pier and Waikiki join twice, low (the street, the beach) and high (the roofs, the promenade), both ways', reach(quiet(at(PAC.pier, 20, 18)), { room: PAC.pier, col: 31, row: 16 }, (g) => g.roomId === PAC.surf) && reach(quiet(at(PAC.surf, 2, 18)), { room: PAC.surf, col: 0, row: 16 }, (g) => g.roomId === PAC.pier)
    && reach(quiet(at(PAC.pier, 20, 7)), { room: PAC.pier, col: 31, row: 5 }, (g) => g.roomId === PAC.surf) && reach(quiet(at(PAC.surf, 2, 7)), { room: PAC.surf, col: 0, row: 5 }, (g) => g.roomId === PAC.pier));
  check('the cliff rope climbs from the promenade to the feast and the feast\'s rope drops back; the hillside rope climbs to Diamond Head and drops back', reach(quiet(at(PAC.surf, 20, 7)), { room: PAC.surf, col: 28, row: 0 }, (g) => g.roomId === PAC.feast && g.onRope !== 0) && reach(quiet(at(PAC.feast, 24, 18)), { room: PAC.feast, col: 28, row: 19 }, (g) => g.roomId === PAC.surf && g.onRope !== 0)
    && reach(quiet(at(PAC.feast, 20, 12)), { room: PAC.feast, col: 14, row: 0 }, (g) => g.roomId === PAC.diamond && g.onRope !== 0) && reach(quiet(at(PAC.diamond, 8, 18)), { room: PAC.diamond, col: 14, row: 19 }, (g) => g.roomId === PAC.feast && g.onRope !== 0));
  check('the slipway\'s rope climbs from the second reef up to Lahaina and the harbour\'s rope drops back into the reef', reach(at(PAC.kelp, 15, 8), { room: PAC.kelp, col: 15, row: 0 }, (g) => g.roomId === PAC.whale && g.onRope !== 0) && reach(at(PAC.whale, 12, 18), { room: PAC.whale, col: 15, row: 19 }, (g) => g.roomId === PAC.kelp));
  check('the road\'s pool drops into the sea cave (from the first level), the cave\'s ceiling gap is the pool\'s and the cave leads back to the reef (the loop: reef, Lahaina, the road, the cave, the reef)',
    reach(quiet(at(PAC.road, 20, 18)), { room: PAC.road, col: 24, row: 19 }, (g) => g.roomId === PAC.cave) && reach(at(PAC.cave, 3, 18), { room: PAC.cave, col: 0, row: 17 }, (g) => g.roomId === PAC.kelp));
  check('the cove\'s rope climbs from the third reef back to Hana\'s beach, and the road runs back down, level by level, to the harbour', reach(at(PAC.fish, 21, 8, [SNORKEL]), { room: PAC.fish, col: 21, row: 0 }, (g) => g.roomId === PAC.hana && g.onRope !== 0)
    && reach(quiet(at(PAC.hana, 2, 8)), { room: PAC.hana, col: 0, row: 6 }, (g) => g.roomId === PAC.road));
  check('Hilo\'s terminal walks back west onto the volcano\'s rim and the hold\'s sill back onto the gantry', reach(quiet(at(PAC.hilo, 2, 9)), { room: PAC.hilo, col: 0, row: 7 }, (g) => g.roomId === PAC.mauna) && reach(at(PAC.hold, 3, 12), { room: PAC.hold, col: 0, row: 10 }, (g) => g.roomId === PAC.hilo));
}

// ---- the doors in play (the creatures in) ------------------------------------------------------------------
{
  // walking west out of Hana onto the road's top level, the coconut and the car in, then running the level to its far end
  const road = at(PAC.hana, 2, 8, [], false, true);
  run(road, LEFT, 60);
  const alive = road.g.roomId === PAC.road && !dead(road.g);
  run(road, NONE, 160);
  check(`walking west from Hana onto the road's top level and standing there ${alive && !dead(road.g) ? 'is safe' : 'kills him'} (the coconut patrols well away from the doorway, ${must(PACIFIC_ROOMS.find((r) => r.id === PAC.road)?.enemies?.[0], 'the coconut').col - 4})`, alive && !dead(road.g));
  const bys = at(PAC.hana, 2, 8, [], false, true);
  const west = search(bys, (g) => g.roomId === PAC.road && colOf(g) <= 20 && g.y === standY(8), [{ room: PAC.road, col: 18, row: 6 }], 120000, 1.5);
  check('and he can run it on west past the coconut (a way found with its creatures in)', west !== null);
  // walking east along the roofs into Waikiki he stays on the promenade, not dropping into a notch under it
  const roofs = at(PAC.pier, 20, 7);
  run(roofs, RIGHT, 260);
  run(roofs, NONE, 60);
  check(`from the pier's roofs east onto Waikiki's promenade he lands standing on it (room ${roofs.g.roomId}, y ${roofs.g.y}, the promenade's ${standY(7)})`, roofs.g.roomId === PAC.surf && roofs.g.y === standY(7));
}

// ---- hints, the map, saves --------------------------------------------------------------------------------
{
  const wants = [[PAC.box, 24, 11, 'THE RAMP IS CHAINED SHUT'], [PAC.lei, 2, 12, 'A MOLE CANNOT SWIM THAT FAR'], [PAC.hilo, 2, 9, 'DEPARTING TRAVELLERS WEAR A LEI'], [PAC.hold, 3, 12, 'THE DROP IS FAR TOO HIGH']] as const;
  for (const [room, col, floor, text] of wants) {
    const w = at(room, col, floor, [], true);
    run(w, NONE, 120);
    check(`ENHANCED: coming into room ${room} without what it wants says so ("${rowText(w.g)}")`, rowText(w.g) === text);
  }
  const plain = at(PAC.surf, 3, 18, [], false);
  run(plain, NONE, 120);
  check('ORIGINAL says nothing', rowText(plain.g) === 'SURF AND TURF');
  for (const [item, text, col, floor] of [[CUTTERS, 'CUTTERS BITE THROUGH CHAINS', 8, 15], [SNORKEL, 'WITH A SNORKEL HE CAN SWIM', 3, 13], [LEI, 'A LEI: TRAVELLERS WEAR ONE', 6, 8], [PARACHUTE, 'PARACHUTE: FOR A LONG DROP', 22, 12]] as const) {
    const [room, nth] = item;
    const rec = must(PACIFIC_ROOMS.find((r) => r.id === room)?.item, 'the item');
    const take = at(room, rec.col - 4 - (col > 0 ? 0 : 0), floor, [], true);
    for (let f = 0; f < 80 && !take.g.siCollected[itemIndex(take.g, room, nth)]; f++) frame(take, NONE);
    run(take, NONE, 3);
    check(`ENHANCED: taking the ${text.split(':')[0]?.toLowerCase()} says what it is for ("${rowText(take.g)}")`, rowText(take.g) === text && take.g.siCollected[itemIndex(take.g, room, nth)] !== 0);
  }
  for (const n of ['musubi1', 'musubi2', 'musubi3']) check(`the ${n} is a 200 point snack (a named item with the musubi's sprite)`, PACIFIC_ROOMS.some((r) => r.item?.name === n && r.item.sprite === PAC_SPRITE.musubi));

  const s = newGame(WORLD, true);
  const info = montyMap.info(s.g, { rooms: {} });
  check(`the pause screen counts the snacks and the items over the five regions (${info.join(' | ')})`, info[3] === 'SNACKS 0/24' && info[2] === 'ITEMS  0/19');
  enterRoom(s.g, PAC.surf, 0x40, standY(18));
  const places = montyMap.places({ x: 0, y: 0, w: 200, h: 150 }, s.g, { rooms: { 41: [0x40, 0xb2, 2, 20], 42: [0x40, 0xb2, 1, 21] } });
  check('in the Pacific the map shows its region (thirteen columns), the rooms he has been to are places to go', places.length === 2 && places.every((p) => p.x >= 0 && p.x < 200 && p.y >= 0 && p.y < 150));

  // a save made on coming into each of the Pacific's rooms (every key taken, the lei on) carries on in the same room, alive
  {
    const spots = [[PAC.stern, 1, 13], [PAC.box, 2, 11], [PAC.pier, 1, 11], [PAC.surf, 3, 18], [PAC.lei, 2, 12], [PAC.feast, 24, 18], [PAC.diamond, 8, 18], [PAC.lookout, 4, 10], [PAC.clam, 3, 19], [PAC.mole, 2, 19], [PAC.kelp, 3, 19], [PAC.whale, 12, 18], [PAC.road, 3, 18], [PAC.cave, 3, 19],
      [PAC.hana, 2, 8], [PAC.fish, 4, 19], [PAC.coffee, 3, 19], [PAC.mauna, 2, 19], [PAC.hilo, 2, 9], [PAC.hold, 2, 12]] as const;
    const failed: number[] = [];
    const carried = spots.filter(([room, col, floor]) => {
      const a = newGame(WORLD, false);
      for (const [r, n] of [CUTTERS, SNORKEL, LEI]) a.g.siCollected[itemIndex(a.g, r, n)] = 0x81;
      wear(a.g, itemIndex(a.g, PAC.lei, 0));
      enterRoom(a.g, room, 0x0c + (col + 4) * 4, standY(floor));
      for (let n = 0; n < 200 && (a.g.freeze || a.g.script); n++) frame(a, NONE);
      const b = newGame(WORLD, false);
      restore(b.g, CODEC.unpack(CODEC.pack(snapshot(a.g)), CODEC.format));
      run(b, NONE, 4);
      const effects = room === PAC.box ? CHAIN_CELLS.every(([row, col2]) => cell(b.g, col2, row) === 0) : room === PAC.lei ? DIVE_CELLS.every(([row, col2]) => cell(b.g, col2, row) === 0 || DIVE_ROPE.some(([r2, c2]) => r2 === row && c2 === col2)) : true;
      b.g.enemies = [];
      b.g.enable &= 0x0f;
      b.g.vic.enable &= 0x0f;
      b.g.tunnels = [];
      b.g.pulses = [];
      b.g.lavas = [];
      run(b, NONE, 60);
      const ok = effects && b.g.roomId === room && !dead(b.g) && b.g.worn === itemIndex(b.g, PAC.lei, 0);
      if (!ok) { failed.push(room); console.log(`   room ${room}: now in ${b.g.roomId}, dead ${dead(b.g)} (counter ${b.g.actionCounter}, script ${b.g.script ? 'yes' : 'no'}), worn ${b.g.worn}, at ${colOf(b.g)},${b.g.y}`); }
      return ok;
    }).length;
    check(`a save made on coming into each of the Pacific's seventeen rooms packs, unpacks and carries on in the same room, alive, in the lei (${carried} of ${spots.length}${failed.length ? `; not in rooms ${failed.join(', ')}` : ''})`, carried === spots.length);
  }

  // a save from before the Pacific: the first four regions' arrays and a grid without it carry on in the new game
  const g1 = newGame(WORLD, true).g;
  g1.siCollected[0] = 0x81; g1.siCollected[5] = 0x81; g1.coinCollected[0] = 0xff; g1.coinCollected[30] = 0xff;
  const old = snapshot(g1);
  const shortGrid = Array.from(WORLD.exitGrid.image, (c) => (c >= PAC.stern && c !== 0xff ? 0xff : c));
  const oldSave = { ...old, coins: old.coins.slice(0, 67), items: old.items.slice(0, 18), exitGrid: shortGrid, roomId: JP.port, worn: itemIndex(g1, JP.mole, 0) };
  const g2 = newGame(WORLD, true).g;
  restore(g2, CODEC.unpack(CODEC.pack(oldSave), CODEC.format));
  check('an old save (the regions before the Pacific\'s arrays and grids) loads: the finds and the hood are as saved, and the Pacific is on the grid, its coins and finds still to take',
    g2.siCollected[0] === 0x81 && g2.siCollected[5] === 0x81 && g2.coinCollected[0] === 0xff && g2.coinCollected[30] === 0xff && g2.worn === oldSave.worn && g2.exitGrid[2 * WORLD.exitGrid.cols + 17] === PAC.stern && g2.siCollected.length === 44 && g2.coinCollected.length === 293 && g2.coinCollected.slice(67).every((c) => c === 0));
}

// ---- the second pass: the banners, the swimmer, the serpent, the moray, the wave, the rocks, the planks, the tern ----------------------------------
{
  const arrive = (from: number, to: number, col: number, floor: number) => {
    const s = at(from, 2, 11);
    enterRoom(s.g, to, 0x0c + (col + 4) * 4, standY(floor));
    run(s, NONE, 3);
    return rowText(s.g);
  };
  check('the harbour welcomes him off the ship and each island names itself on coming ashore (the name row, both modes)',
    arrive(PAC.box, PAC.pier, 1, 11) === 'WELCOME TO HAWAII: OAHU' && arrive(PAC.clam, PAC.mole, 2, 19) === 'HAWAII: MOLOKAI' && arrive(PAC.kelp, PAC.whale, 15, 18) === 'HAWAII: MAUI' && arrive(PAC.fish, PAC.coffee, 3, 19) === 'HAWAII: THE BIG ISLAND');
  check('not between the rooms of one island: the name is shown', arrive(PAC.pier, PAC.surf, 3, 18) === 'SURF AND TURF' && arrive(PAC.whale, PAC.road, 3, 18) === 'THE ROAD TO HANA' && arrive(PAC.coffee, PAC.mauna, 2, 19) === 'MAUNA KEA-OS');

  // the swimmer: his own pictures, the lei's crown on them, the blocks put in only in the swim rooms
  const swimmer = at(PAC.clam, 4, 10);
  wear(swimmer.g, itemIndex(swimmer.g, PAC.lei, 0));
  run(swimmer, RIGHT, 24);
  const rightSet: readonly number[] = SWIM_CYCLE.right, leftSet: readonly number[] = SWIM_CYCLE.left;
  const facingRight = rightSet.includes(swimmer.g.sptr[3] ?? 0) && swimmer.g.sptr[7] === SWIM_POINTERS.crownRight;
  run(swimmer, LEFT, 24);
  const facingLeft = leftSet.includes(swimmer.g.sptr[3] ?? 0) && swimmer.g.sptr[7] === SWIM_POINTERS.crownLeft;
  const blocksIn = [...SWIM_POINTERS.left, ...SWIM_POINTERS.right].every((ptr) => swimmer.g.mem.slice(ptr * 64, ptr * 64 + 63).some((b) => b !== 0) && !swimmer.g.mem.slice(ptr * 64, ptr * 64 + 64).every((b, i) => b === WORLD.bankImage[ptr * 64 + i]));
  const land = at(PAC.stern, 1, 13);
  const blocksOut = [...SWIM_POINTERS.left, ...SWIM_POINTERS.right].every((ptr) => land.g.mem.slice(ptr * 64, ptr * 64 + 64).every((b, i) => b === WORLD.bankImage[ptr * 64 + i]));
  check('swimming right and left he is drawn in his own swimming pictures with the lei\'s crown on each, the pictures in the bank only while a swim room is loaded (Rio\'s skewers have the blocks otherwise)', facingRight && facingLeft && blocksIn && blocksOut);
  const walker = at(PAC.mole, 2, 19);
  run(walker, RIGHT, 20);
  check('on land (Molokai) he is in his walking pictures', walker.g.frameIndex >= 0x50 && walker.g.frameIndex <= 0x73);
}

{
  // the sea cave's serpent and its two ways out
  const lane = at(PAC.cave, 2, 19);
  let safe = true;
  for (let f = 0; f < 800; f++) { frame(lane, f % 220 < 110 ? { ...RIGHT, down: true } : { ...LEFT, down: true }); if (dead(lane.g)) { safe = false; break; } }
  check('the seabed under the serpent\'s loop is clear: he swims its length and back, twice over the loop\'s lap, untouched', safe);
  const there = at(PAC.cave, 20, 12);
  let died = false;
  for (let f = 0; f < 800 && !died; f++) { frame(there, NONE); died = dead(there.g); }
  check('and the serpent kills what it touches (the loop\'s middle is deadly within a lap)', died);
  check('the cave has one big creature and no walker: the serpent\'s six pieces, no enemies', WORLD.dragons.some((d) => d.room === PAC.cave && d.pieces.length === 6) && !PACIFIC_ROOMS.find((r) => r.id === PAC.cave)?.enemies?.length);
  const reachUp = (s: State) => search(s, (g) => g.roomId === PAC.road && g.onRope !== 0 && !g.freeze && !g.script, [{ room: PAC.cave, col: 24, row: 0 }], 300000, 1.5) !== null;
  check('from the entrance the bot swims round the serpent and up through the pool\'s gap to the road, onto the rope (the way up at the top right: a real exit, no bounce)', reachUp(at(PAC.cave, 2, 18)));
  const idle = at(PAC.road, 21, 18);
  for (let f = 0; f < 120 && idle.g.onRope === 0; f++) frame(idle, RIGHT);
  for (let f = 0; f < 300 && idle.g.roomId !== PAC.cave; f++) frame(idle, DOWN);
  run(idle, NONE, 400);
  check('coming down the pool\'s rope into the cave and then doing nothing, he stays in the cave (the sea\'s lift stops short of the ceiling: no screen bounce), alive', idle.g.roomId === PAC.cave && !dead(idle.g));
}

{
  // the moray, Hana's wave, the lookout's rocks, the pier's rotten planks
  const hole = MORAY.hole, body = MORAY.body;
  const s = at(PAC.kelp, 15, 19);
  const holeCodes = new Set<number>(), bodyCodes = new Set<number>();
  for (let f = 0; f < MORAY.period; f++) { frame(s, NONE); holeCodes.add(cell(s.g, hole[0], hole[1])); bodyCodes.add(cell(s.g, body.col, body.row)); }
  check(`the moray's hole shows its eyes (${holeCodes.size} pictures) before a ${MORAY.warn}-frame blink, then its body lunges across the way to the cave (${bodyCodes.size} pictures at its first cell)`, holeCodes.size === 2 && bodyCodes.size === 2);
  const lunge = at(PAC.kelp, 28, 17);
  const y0 = lunge.g.y;
  let diedAt = -1;
  for (let f = 0; f < MORAY.period + 20 && diedAt < 0; f++) { frame(lunge, lunge.g.y > y0 ? UP : lunge.g.y < y0 - 2 ? DOWN : NONE); if (dead(lunge.g)) diedAt = f; }
  check(`standing in the lunge's cells he is safe until it comes and dies in it (dead at frame ${diedAt}, the lunge from ${MORAY.start + MORAY.warn + 15})`, diedAt >= MORAY.start + MORAY.warn && diedAt <= MORAY.start + MORAY.warn + 15 + MORAY.live);
  const past = search(at(PAC.kelp, 20, 19), (g) => g.roomId === PAC.cave, [{ room: PAC.kelp, col: 31, row: 17 }], 900000, 1.5);
  check('the bot swims past the moray into the sea cave (timing it)', past !== null);
  const wave = at(PAC.hana, 17, 18);
  const waveDied = diesAt(wave, NONE, WAVE.period + 50);
  check(`the wave sweeps the beach: standing at the cove's edge he dies when it comes (dead at frame ${waveDied}, the first group live from ${WAVE.start + WAVE.warn})`, waveDied >= WAVE.start && waveDied <= WAVE.start + WAVE.warn + WAVE.live);
  const clear = at(PAC.hana, 25, 18);
  let clearSafe = true;
  for (let f = 0; f < 2 * WAVE.period; f++) { frame(clear, NONE); if (dead(clear.g)) clearSafe = false; }
  check('the wave stops short of the steps: the right-hand beach is safe through two waves', clearSafe);
  const tunnel = at(PAC.lookout, 6, 10);
  let tunnelSafe = true;
  for (let f = 0; f < 1000; f++) { frame(tunnel, NONE); if (dead(tunnel.g)) tunnelSafe = false; }
  check(`the tunnel is the place to wait: rocks (${ROCKS.length} of them, a lap of ${ROCKS[0]?.every} frames) vanish at its mouth and never reach inside, through a thousand frames`, tunnelSafe && ROCKS.length === 2);
  const stair = at(PAC.lookout, 16, 8);
  const stairDied = diesAt(stair, NONE, 800);
  check(`on the stairs a rock reaches him (dead at frame ${stairDied}): the trap is seen coming and keeps rolling`, stairDied >= 0);
  const summit = search(at(PAC.lookout, 4, 10), (g) => g.siCollected[itemIndex(g, PAC.lookout, 0)] !== 0 && g.y === standY(4), [{ room: PAC.lookout, col: 24, row: 2 }], 1500000, 3);
  check('the bot climbs the stairs past the tumbling rocks to the stash (a musubi and coins) at the summit lookout', summit !== null);
  const planks = at(PAC.pier, 16, 7);
  const planksAt = (frames: number) => { run(planks, NONE, frames); return cell(planks.g, 16, 7); };
  const code = (l: string) => codeOf(PIER_PALETTE, l);
  const [c1, c2, c3] = [planksAt(60), planksAt(32), planksAt(40)];
  check('standing on the rotten planks he sees them crack, split and give way (whole, cracked, split, gone), and he falls into the alley to the street', c1 === code('X') && c2 === code('Y') && c3 === 0 && (run(planks, NONE, 140), planks.g.roomId === PAC.pier && planks.g.y === standY(18) && !dead(planks.g)));
  const crossing = at(PAC.pier, 10, 7);
  run(crossing, RIGHT, 110);
  check('walking across without stopping they hold (he comes over onto the far roofs, still on the roof level)', crossing.g.roomId === PAC.pier && colOf(crossing.g) >= 21 && crossing.g.y === standY(7));
}

{
  // MOLE-OKAI's tern: comfortably passable (Chris found the crab very hard to jump): from several starts and timings the bot crosses the ponds
  const crossings = [0, 25, 50, 75, 100, 125].map((wait) => {
    const s = at(PAC.mole, 2, 19, [], false, true);
    run(s, NONE, wait);
    return search(s, (g) => g.roomId === PAC.kelp, [{ room: PAC.mole, col: 31, row: 17 }], 200000, 1.5) !== null;
  });
  check(`the fishponds are crossed from every one of six starts, the tern at six different places in its dive (${crossings.filter(Boolean).length} of 6), one creature, a bird over the water, never a walker to jump`, crossings.every(Boolean) && PACIFIC_ROOMS.find((r) => r.id === PAC.mole)?.enemies?.length === 1);
}

{
  // the snorkel gates the sea: every swim room's water drowns him without it and carries him with it
  const bad: number[] = [];
  for (const room of WORLD.swimRooms) {
    const without = at(room, 4, 12);
    run(without, NONE, 8);
    const withIt = at(room, 4, 12, [SNORKEL]);
    run(withIt, RIGHT, 60);
    if (!dead(without.g) || dead(withIt.g)) bad.push(room);
  }
  check(`in every swim room (${WORLD.swimRooms.length}) the water drowns him at once without the snorkel and he swims with it${bad.length ? ` (not in rooms ${bad.join()})` : ''}`, bad.length === 0 && WORLD.swimGate !== null);
}

void LEFT;
finish();
