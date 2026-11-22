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
import { PLAY_COL, PLAY_ROW } from '../../shared/monty/screen';
import { WORLD_CREATURES } from '../src/art';
import { PACIFIC_CREATURES } from '../src/art/pacific-creatures';
import { LEI_COLOUR, leiWorn } from '../src/art/pacific-lei';
import { WORLD } from '../src/data';
import { HAT_BLOCKS } from '../src/hats';
import { JP } from '../src/japan';
import { FIRST_CREATURE } from '../src/layout';
import { CODEC } from '../src/main';
import { BRIDGES, CAR, CHAIN_CELLS, COVE_CELLS, COVE_ROPE, COVE_ROPE_CODE, LAVA, LOADER, PAC, PAC_SPRITE, PACIFIC_COLOURS, PACIFIC_ROOMS, PACIFIC_SECTORS, PLANE_DOOR_CELLS, POOL_CELLS, POOL_SEA, TORCHES, TORCH_PULSES } from '../src/pacific';
import { newGame, search } from './bot';
import { cell, colOf, dead, diesAt, LEFT, overCrowded, RIGHT, UP, at, rowText, run } from './mech-kit';
import { creatureRooms, itemIndex, standY } from './route';

const DOWN = { ...NONE, down: true };
/** The items by name (the room's nth). */
const CUTTERS = [PAC.stern, 0] as const, SNORKEL = [PAC.surf, 0] as const, LEI = [PAC.lei, 0] as const, PARACHUTE = [PAC.hold, 0] as const;

// ---- the data -------------------------------------------------------------------------------------
{
  const cells = WORLD.exitGrid.image;
  const cols = WORLD.exitGrid.cols;
  const grid = (row: number, col: number) => cells[row * cols + col];
  const placed = [[2, 17, PAC.stern], [2, 18, PAC.box], [2, 19, PAC.pier], [2, 20, PAC.surf], [1, 20, PAC.lei], [2, 21, PAC.clam], [2, 22, PAC.mole], [2, 23, PAC.kelp], [1, 23, PAC.whale], [1, 24, PAC.road], [2, 24, PAC.cave],
    [1, 25, PAC.hana], [2, 25, PAC.fish], [2, 26, PAC.coffee], [2, 27, PAC.mauna], [2, 28, PAC.hilo], [2, 29, PAC.hold]] as const;
  check('the Pacific is seventeen rooms in a block of thirteen columns (17-29) beside Japan\'s, room ids 38 to 54, Japan\'s port (row 2) joined to the stern (row 2), the regions before it unchanged',
    placed.every(([r, c, id]) => grid(r, c) === id) && cells.filter((c) => c !== 0xff).length === 55 && grid(2, 16) === JP.port && grid(0, 17) === 0xff && grid(1, 17) === 0xff && grid(2, 30) === 0xff);
  const coinsIn = (lo: number, hi: number) => Array.from({ length: WORLD.coinTable.length / 3 }, (_, i) => WORLD.coinTable[i * 3] ?? 0).filter((r) => r >= lo && r <= hi).length;
  const itemsIn = (lo: number, hi: number) => Array.from({ length: WORLD.specialItems.length / 4 }, (_, i) => WORLD.specialItems[i * 4] ?? 0).filter((r) => r >= lo && r <= hi).length;
  check('the regions before the Pacific keep their coins and finds, in the same table places (first), and the Pacific adds 80 coins and 7 finds (the cutters, the snorkel, the lei, the parachute and three musubi)',
    coinsIn(0, 37) === 67 && itemsIn(0, 37) === 18 && coinsIn(38, 54) === 80 && itemsIn(38, 54) === 7 && (WORLD.coinTable[66 * 3] ?? 99) <= 37 && (WORLD.coinTable[67 * 3] ?? 0) >= 38);
  check('14 key items and 11 snacks count on the pause screen', WORLD.progress.keyItems.length === 14 && WORLD.progress.cakes.length === 11);
  check('the Pacific\'s sectors and map colours are one each', PACIFIC_SECTORS.length === 17 && PACIFIC_COLOURS.length === 17 && PACIFIC_SECTORS.every((s) => s.text.length <= 32 && !/Z/.test(s.text)));
  const rooms = creatureRooms(PACIFIC_ROOMS);
  const most = Math.max(...[...rooms.values()].map((v) => v.size));
  check(`${rooms.size} kinds of creature in the Pacific's seventeen rooms, none in more than two (${[...rooms.values()].map((v) => v.size).join(' ')})`, rooms.size === Object.keys(PACIFIC_CREATURES).length && rooms.size >= 8 && rooms.size <= 13 && most <= 2);
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
  check(`held right he swims at his walking pace, a pixel every other frame (${(r.g.x2 * 2 + r.g.stepGate) - rx} pixels in 60 frames)`, Math.abs((r.g.x2 * 2 + r.g.stepGate) - rx - 30) <= 1);
  const bed = at(PAC.clam, 9, 17);
  run(bed, DOWN, 120);
  check('the seabed stops him (he lies on the sand at floor 19), alive', bed.g.y === standY(19) && !dead(bed.g));
  const rock = at(PAC.clam, 6, 15);
  run(rock, RIGHT, 150);
  check('a reef\'s rock stops him as a wall does', rock.g.roomId === PAC.clam && colOf(rock.g) < 8);
  check('he swims out of one reef into the next room by the side at his height (CLAM to MOLE-OKAI on its landing, KELP to the sea cave and back)',
    (() => { const a = at(PAC.clam, 28, 18); run(a, RIGHT, 60); const b = at(PAC.kelp, 28, 18); run(b, RIGHT, 60); const c = at(PAC.cave, 3, 18); run(c, LEFT, 60); return a.g.roomId === PAC.mole && b.g.roomId === PAC.cave && c.g.roomId === PAC.kelp; })());
  const up = at(PAC.kelp, 15, 8);
  run(up, UP, 400);
  check('up through the ceiling gap of the second reef he comes out at Lahaina\'s slipway, on the rope', up.g.roomId === PAC.whale && up.g.onRope !== 0);
  const lift = at(PAC.mole, 2, 19);
  run(lift, NONE, 60);
  check('on land (Molokai) he does not swim: a stick of nothing leaves him standing on the landing', lift.g.y === standY(19) && lift.g.roomId === PAC.mole);
  const sea = at(PAC.surf, 20, 18);
  const dies = diesAt(sea, RIGHT, 200);
  check(`at Waikiki the surf is deadly without the snorkel (dead after ${dies} frames at the pool's edge)`, dies >= 0);
  const wade = at(PAC.surf, 20, 18, [SNORKEL]);
  run(wade, RIGHT, 200);
  check('with the snorkel the pool is open water (the waves placed over by the sea tile: no death) and he wades east into the first reef', !dead(wade.g) && wade.g.roomId === PAC.clam);
  check(`the pool's cells are the waves until the snorkel and the sea after (${POOL_CELLS.length} cells)`, POOL_CELLS.every(([row, col]) => cell(at(PAC.surf, 5, 18).g, col - PLAY_COL, row - PLAY_ROW) !== POOL_SEA) && POOL_CELLS.every(([row, col]) => cell(at(PAC.surf, 5, 18, [SNORKEL]).g, col - PLAY_COL, row - PLAY_ROW) === POOL_SEA));
  const cove = at(PAC.hana, 17, 18);
  check('at Hana the cove\'s pool is deadly surf without the snorkel', diesAt(cove, RIGHT, 200) >= 0);
  const drop = at(PAC.hana, 17, 18, [SNORKEL]);
  run(drop, RIGHT, 120);
  check('with it the pool is a gap: he drops into the third reef, and the rope hangs back up into the cove', drop.g.roomId === PAC.fish && COVE_ROPE.every(([row, col]) => cell(at(PAC.hana, 17, 18, [SNORKEL]).g, col - PLAY_COL, row - PLAY_ROW) === COVE_ROPE_CODE));
  void COVE_CELLS;
}

// ---- the luau's torches --------------------------------------------------------------------------------
{
  const e = must(TORCH_PULSES[0], 'the first torch');
  const phases = [0, e.start - 1, e.start, e.start + e.warn - 1, e.start + e.warn, e.start + e.warn + e.live - 1, e.start + e.warn + e.live, e.period - 1].map((t) => pulsePhase(e, t));
  check(`a torch burns low for ${TORCHES.idle} frames, flickers for ${TORCHES.warn}, burns tall and deadly for ${TORCHES.live} and settles for ${TORCHES.period - TORCHES.idle - TORCHES.warn - TORCHES.live}, a ${TORCHES.period}-frame period (${phases.join(' ')})`,
    phases.join() === ['idle', 'idle', 'warn', 'warn', 'live', 'live', 'spent', 'spent'].join() && TORCH_PULSES.length === 3);
  check(`the three torches go off ${TORCHES.apart} frames after one another (offsets ${TORCH_PULSES.map((p) => p.offset).join(', ')}), a three-cell gap between them`, TORCH_PULSES.map((p) => p.offset).join() === [0, 110, 70].join() && TORCHES.cols.every((c, i) => i === 0 || (TORCHES.cols[i - 1] ?? 0) - c === 5));
  const s = at(PAC.lei, 25, 18);
  const codeAt = (col: number) => cell(s.g, col, TORCHES.row);
  const seen = new Set<number>();
  for (let f = 0; f < TORCHES.period; f++) { frame(s, NONE); seen.add(codeAt(22)); }
  check(`a torch is drawn in two characters, the small flame and the tall one (${seen.size})`, seen.size === 2 && !dead(s.g));
  // standing in the first torch's cells: safe through its low and flickering time, dead when it is tall
  const stand = at(PAC.lei, 22, 18);
  let died = -1;
  for (let f = 0; f < 200; f++) { frame(stand, NONE); if (dead(stand.g)) { died = f; break; } }
  check(`standing in a torch's cells he is safe while it burns low and dies when it burns tall (dead at frame ${died}, the tall flame from ${TORCHES.idle + TORCHES.warn})`, died >= TORCHES.idle + TORCHES.warn && died < TORCHES.idle + TORCHES.warn + TORCHES.live);
  const gap = at(PAC.lei, 25, 18);
  let safe = true;
  for (let f = 0; f < 600; f++) { frame(gap, NONE); if (dead(gap.g)) safe = false; }
  check('in the gap between two torches he is never touched, through four cycles', safe);
  const through = search(at(PAC.lei, 26, 18), (g) => g.roomId === PAC.lei && colOf(g) <= 10 && g.y === standY(18), [{ room: PAC.lei, col: 9, row: 16 }], 150000, 1.5);
  check('the bot walks the stage from the rope to the steps past all three torches (waiting in the gaps)', through !== null);
}

// ---- the road's cars -----------------------------------------------------------------------------------
{
  const cars = WORLD.tunnels.filter((t) => t.room === PAC.road);
  check(`three one-lane bridges, a car of ${CAR.cols} by 2 cells to each over a ${BRIDGES[0].last - BRIDGES[0].first + 1}-cell span, each going the way Monty does (left to right, right to left, left to right), ${CAR.rest} frames at rest, ${CAR.warn} of a flashing edge, a cell every ${CAR.step} frames`,
    cars.length === 3 && cars.every((c, i) => c.span?.from === BRIDGES[i]?.first && c.span?.to === BRIDGES[i]?.last && c.from === BRIDGES[i]?.from && c.cols === CAR.cols && c.rest === CAR.rest && c.warn === CAR.warn && c.step === CAR.step));
  // each bridge: a car is drawn only within its span, kills over it, never outside it; and a crossing begun as the car clears the far end is clear
  for (const [i, b] of BRIDGES.entries()) {
    const car = must(cars[i], 'the car');
    const lane = (g: Game) => [car.top, car.bottom].flatMap((row) => Array.from({ length: 32 }, (_, c) => ({ c, row, v: cell(g, c, row) }))).filter((p) => p.v === car.code || (car.picture ?? []).flat().includes(p.v));
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
  const climb = search(at(PAC.mauna, 2, 19), (g) => g.roomId === PAC.hilo, [{ room: PAC.mauna, col: 31, row: 7 }], 300000, 1.5);
  check('the bot climbs the ledges ahead of the lava to the rim and out to Hilo', climb !== null);
  const shortcut = search(at(PAC.mauna, 2, 7), (g) => g.roomId === PAC.hilo, [{ room: PAC.mauna, col: 31, row: 7 }], 300000, 1.5);
  check('from the snow shelf (the high way in) the rope drops him to the second ledge, and the climb goes on from there to the rim', shortcut !== null);
}

// ---- the loader, the guard, the gates --------------------------------------------------------------------
{
  const ride = at(PAC.hilo, 12, 17);
  run(ride, RIGHT, 40);
  const mid = ride.g.y;
  run(ride, NONE, 140);
  check(`the loader carries him up ten rows (${LOADER.frames} frames) and sets him down on the catwalk (floor 7, column ${colOf(ride.g)}, y ${ride.g.y}, was ${mid} in the ride), alive and free to walk`, ride.g.roomId === PAC.hilo && ride.g.y === standY(7) && colOf(ride.g) >= 15 && ride.g.gameMode === 0 && !dead(ride.g));
  run(ride, RIGHT, 400);
  check('along the catwalk he walks out into the plane\'s hold (its sill, floor 7)', ride.g.roomId === PAC.hold);
  // the guard and the lei
  const GUARD = FIRST_CREATURE + Object.keys(WORLD_CREATURES).indexOf('pacGuard');
  const guard = at(PAC.hilo, 8, 17, [], false, true);
  check('without the lei there is a guard in the customs shed (its first creature slot)', guard.g.enemies[0]?.type === GUARD && guard.g.enemies[0].x !== 0xff);
  const past = (g: Game) => g.roomId === PAC.hilo && colOf(g) >= 13 && g.y === standY(17);
  const stats = { exhausted: false };
  const noWay = search(guard, past, [{ room: PAC.hilo, col: 14, row: 15 }], 60000, 0, stats) === null;
  check(`and the bot finds no way past him through the shed (60000 states looked at${stats.exhausted ? ', every one there is' : ', the search limit'}): the shed is two cells high under its roof, his lane`, noWay);
  const lei = at(PAC.hilo, 8, 17, [LEI], false, true);
  check('with the lei he is gone (sent off the screen)', must(lei.g.enemies[0], 'the guard').x === 0xff);
  check('and the bot gets through the shed to the loader', search(lei, past, [{ room: PAC.hilo, col: 14, row: 15 }], 100000, 1.5) !== null);
  // the cutters
  const chain = (holds: readonly (readonly [number, number])[]) => CHAIN_CELLS.map(([row, col]) => cell(at(PAC.box, 24, 11, holds).g, col - PLAY_COL, row - PLAY_ROW));
  check('the chain across the ramp is a wall until the cutters (four cells) and gone after', chain([]).every((c) => c !== 0) && chain([CUTTERS]).every((c) => c === 0));
  const wall = at(PAC.box, 27, 11);
  run(wall, RIGHT, 200);
  const gone = at(PAC.box, 27, 11, [CUTTERS]);
  run(gone, RIGHT, 200);
  check('without them the chain stops him at the bow; with them he walks down the ramp to the pier', wall.g.roomId === PAC.box && gone.g.roomId === PAC.pier);
  // the parachute
  const door = (holds: readonly (readonly [number, number])[]) => PLANE_DOOR_CELLS.map(([row, col]) => cell(at(PAC.hold, 20, 16, holds).g, col - PLAY_COL, row - PLAY_ROW));
  check('the plane\'s rear door is shut (four cells) until the parachute and open after', door([]).every((c) => c !== 0) && door([PARACHUTE]).every((c) => c === 0));
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
    enterRoom(a.g, PAC.hilo, 0x0c + 8 * 4, standY(17));
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
    const r = must(PACIFIC_ROOMS.find((x) => x.id === room), 'a room');
    const wall = (col: number, row: number) => { const ch = r.map[row]?.[col] ?? '.'; return ch !== '.' && WORLD.tileProperty(r.tiles[Number(ch) - 1] ?? 0) === 1; };
    return { wall };
  };
  const rowsOpen = (room: number, col: number) => Array.from({ length: 20 }, (_, row) => row).filter((row) => !open(room).wall(col, row));
  const colsOpen = (room: number, row: number) => Array.from({ length: 32 }, (_, col) => col).filter((col) => !open(room).wall(col, row));
  const together = (a: readonly number[], b: readonly number[]) => a.filter((x) => b.includes(x) && b.includes(x + 1) && a.includes(x + 1)).length > 0;
  const sides: readonly (readonly [number, number])[] = [[PAC.stern, PAC.box], [PAC.box, PAC.pier], [PAC.pier, PAC.surf], [PAC.surf, PAC.clam], [PAC.clam, PAC.mole], [PAC.mole, PAC.kelp], [PAC.kelp, PAC.cave], [PAC.whale, PAC.road],
    [PAC.road, PAC.hana], [PAC.fish, PAC.coffee], [PAC.coffee, PAC.mauna], [PAC.mauna, PAC.hilo], [PAC.hilo, PAC.hold]];
  const badSides = sides.filter(([l, r]) => !together(rowsOpen(l, 31), rowsOpen(r, 0)));
  check(`every east-west join of the Pacific is open at the same rows on both sides (${badSides.length ? badSides.map(([l, r]) => `${l}-${r}`).join(', ') : 'all thirteen'})`, badSides.length === 0);
  const tops: readonly (readonly [number, number])[] = [[PAC.surf, PAC.lei], [PAC.kelp, PAC.whale], [PAC.road, PAC.cave], [PAC.hana, PAC.fish]];
  const badTops = tops.filter(([upper, lower]) => !together(colsOpen(upper, 19), colsOpen(lower, 0)));
  check(`every up-down join is open at the same columns (${badTops.length ? badTops.map(([u, l]) => `${u}-${l}`).join(', ') : 'all four'})`, badTops.length === 0);
  const reach = (from: State, aim: { room: number; col: number; row: number }, goal: (g: Game) => boolean, limit = 200000) => search(from, (g) => goal(g) && !g.freeze && !g.script, [aim], limit, 1.5) !== null;
  const quiet = (s: State) => { s.g.tunnels = []; s.g.pulses = []; s.g.lavas = []; return s; };
  check('Japan\'s port walks east onto the stern\'s landing and the stern walks west back onto the port\'s deck', (() => { const a = at(JP.port, 27, 13); run(a, RIGHT, 100); const b = at(PAC.stern, 1, 13); run(b, LEFT, 100); return a.g.roomId === PAC.stern && b.g.roomId === JP.port; })());
  check('the pier and Waikiki join twice, low (the street, the beach) and high (the roofs, the promenade), both ways', reach(quiet(at(PAC.pier, 20, 18)), { room: PAC.pier, col: 31, row: 16 }, (g) => g.roomId === PAC.surf) && reach(quiet(at(PAC.surf, 2, 18)), { room: PAC.surf, col: 0, row: 16 }, (g) => g.roomId === PAC.pier)
    && reach(quiet(at(PAC.pier, 20, 7)), { room: PAC.pier, col: 31, row: 5 }, (g) => g.roomId === PAC.surf) && reach(quiet(at(PAC.surf, 2, 7)), { room: PAC.surf, col: 0, row: 5 }, (g) => g.roomId === PAC.pier));
  check('the cliff rope climbs from the promenade to the luau and the luau\'s rope drops back', reach(quiet(at(PAC.surf, 20, 7)), { room: PAC.surf, col: 28, row: 0 }, (g) => g.roomId === PAC.lei && g.onRope !== 0) && reach(quiet(at(PAC.lei, 24, 18)), { room: PAC.lei, col: 28, row: 19 }, (g) => g.roomId === PAC.surf && g.onRope !== 0));
  check('the slipway\'s rope climbs from the second reef up to Lahaina and the harbour\'s rope drops back into the reef', reach(at(PAC.kelp, 15, 8), { room: PAC.kelp, col: 15, row: 0 }, (g) => g.roomId === PAC.whale && g.onRope !== 0) && reach(at(PAC.whale, 12, 18), { room: PAC.whale, col: 15, row: 19 }, (g) => g.roomId === PAC.kelp));
  check('the road\'s pool drops into the sea cave (from the first level), the cave\'s ceiling gap is the pool\'s and the cave leads back to the reef (the loop: reef, Lahaina, the road, the cave, the reef)',
    reach(quiet(at(PAC.road, 20, 18)), { room: PAC.road, col: 24, row: 19 }, (g) => g.roomId === PAC.cave) && reach(at(PAC.cave, 3, 18), { room: PAC.cave, col: 0, row: 17 }, (g) => g.roomId === PAC.kelp));
  check('the cove\'s rope climbs from the third reef back to Hana\'s beach, and the road runs back down, level by level, to the harbour', reach(at(PAC.fish, 21, 8, [SNORKEL]), { room: PAC.fish, col: 21, row: 0 }, (g) => g.roomId === PAC.hana && g.onRope !== 0)
    && reach(quiet(at(PAC.hana, 2, 8)), { room: PAC.hana, col: 0, row: 6 }, (g) => g.roomId === PAC.road));
  check('Hilo\'s terminal walks back west onto the volcano\'s rim and the hold\'s sill back onto the catwalk', reach(quiet(at(PAC.hilo, 2, 9)), { room: PAC.hilo, col: 0, row: 7 }, (g) => g.roomId === PAC.mauna) && reach(at(PAC.hold, 3, 7), { room: PAC.hold, col: 0, row: 5 }, (g) => g.roomId === PAC.hilo));
}

// ---- hints, the map, saves --------------------------------------------------------------------------------
{
  const wants = [[PAC.box, 24, 11, 'THE CHAIN WANTS BOLT CUTTERS'], [PAC.surf, 3, 18, 'THE SEA WANTS A SNORKEL'], [PAC.hilo, 2, 9, 'THE GUARD WANTS A LEI'], [PAC.hold, 3, 7, 'THE REAR DOOR WANTS A PARACHUTE']] as const;
  for (const [room, col, floor, text] of wants) {
    const w = at(room, col, floor, [], true);
    run(w, NONE, 120);
    check(`ENHANCED: coming into room ${room} without what it wants says so ("${rowText(w.g)}")`, rowText(w.g) === text);
  }
  const plain = at(PAC.surf, 3, 18, [], false);
  run(plain, NONE, 120);
  check('ORIGINAL says nothing', rowText(plain.g) === 'SURF AND TURF');
  for (const [item, text, col, floor] of [[CUTTERS, 'CUTTERS: THE CHAIN ON THE RAMP', 8, 18], [SNORKEL, 'SNORKEL: THE SEA IS OPEN NOW', 3, 13], [LEI, 'LEI: PAST THE AIRPORT GUARD', 6, 12], [PARACHUTE, 'PARACHUTE: THE REAR DOOR IS OPEN', 22, 12]] as const) {
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
  check(`the pause screen counts the snacks and the items over the five regions (${info.join(' | ')})`, info[3] === 'SNACKS  0/11' && info[2] === 'ITEMS  0/14');
  enterRoom(s.g, PAC.surf, 0x40, standY(18));
  const places = montyMap.places({ x: 0, y: 0, w: 200, h: 150 }, s.g, { rooms: { 41: [0x40, 0xb2, 2, 20], 42: [0x40, 0xb2, 1, 20] } });
  check('in the Pacific the map shows its region (thirteen columns), the rooms he has been to are places to go', places.length === 2 && places.every((p) => p.x >= 0 && p.x < 200 && p.y >= 0 && p.y < 150));

  // a save made on coming into each of the Pacific's rooms (every key taken, the lei on) carries on in the same room, alive
  {
    const spots = [[PAC.stern, 1, 13], [PAC.box, 2, 11], [PAC.pier, 1, 11], [PAC.surf, 3, 18], [PAC.lei, 24, 18], [PAC.clam, 3, 19], [PAC.mole, 2, 19], [PAC.kelp, 3, 19], [PAC.whale, 12, 18], [PAC.road, 3, 18], [PAC.cave, 3, 19],
      [PAC.hana, 2, 8], [PAC.fish, 4, 19], [PAC.coffee, 3, 19], [PAC.mauna, 2, 19], [PAC.hilo, 2, 9], [PAC.hold, 2, 7]] as const;
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
      const effects = room === PAC.box ? CHAIN_CELLS.every(([row, col2]) => cell(b.g, col2 - PLAY_COL, row - PLAY_ROW) === 0) : room === PAC.surf ? POOL_CELLS.every(([row, col2]) => cell(b.g, col2 - PLAY_COL, row - PLAY_ROW) === POOL_SEA) : true;
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
    g2.siCollected[0] === 0x81 && g2.siCollected[5] === 0x81 && g2.coinCollected[0] === 0xff && g2.coinCollected[30] === 0xff && g2.worn === oldSave.worn && g2.exitGrid[2 * WORLD.exitGrid.cols + 17] === PAC.stern && g2.siCollected.length === 25 && g2.coinCollected.length === 147 && g2.coinCollected.slice(67).every((c) => c === 0));
}

void LEFT;
finish();
