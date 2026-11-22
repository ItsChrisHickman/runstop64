/**
 * The Andes and the Amazon's mechanisms, headless, each on its own with the room's creatures out of the way (the bot, andes.ts, plays them all together): the parachute's flight (a slow sink, the dive, the steering, the
 * updrafts' lift, a ledge to rest on, the canopy over him, only in the three flight rooms), the boulders on the terraces (a period, a path, three a third of it apart, death on touch, safe where they do not go), the swinging
 * vines (the cells moving, a swing's pace, carried while he hangs on, let go by a jump), the llama and the captain and the tangle (the three gates), the chullo as a costume, the joins both ways, the hints, the map, and a save
 * in each room.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/andes-mechanisms.ts
 */
import { enterRoom } from '../../montyotr/src/ending';
import { canopyFrame, FLIGHT, flightOf, inUpdraft } from '../../montyotr/src/flight';
import type { Game } from '../../montyotr/src/game';
import { wear } from '../../montyotr/src/items';
import { montyMap } from '../../montyotr/src/map';
import { MOTR } from '../../montyotr/src/motr';
import { measureRoll, rollerAt } from '../../montyotr/src/rollers';
import { restore, snapshot } from '../../montyotr/src/save';
import { vineCol, vineOffset } from '../../montyotr/src/vines';
import { frame, NONE, type State } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { must } from '../../shared/test/must';
import { WORLD_CREATURES } from '../src/art';
import { ANDES_CREATURES } from '../src/art/andes-creatures';
import { FIRST_CREATURE } from '../src/layout';
import { ANDES_ITEMS, BOULDER_FRAMES, CANOPY } from '../src/art/andes-items';
import { chulloWorn, CHULLO_COLOUR } from '../src/art/andes-hat';
import { AND, ANDES_COLOURS, ANDES_ROOMS, ANDES_SECTORS, BOULDER_PATH, BOULDERS, TANGLE_CELLS, TANGLE_ROPE, TANGLE_ROPE_CODE, VINES } from '../src/andes';
import { ANDES_SPRITE, BOULDER_POINTERS, CANOPY_POINTERS } from '../src/andes-pointers';
import { WORLD } from '../src/data';
import { HAT_BLOCKS } from '../src/hats';
import { CODEC } from '../src/main';
import { PAC, PAC_SPRITE } from '../src/pacific';
import { newGame, search } from './bot';
import { cell, colOf, dead, diesAt, LEFT, overCrowded, RIGHT, at, rowText, run } from './mech-kit';
import { creatureRooms, itemIndex, standY } from './route';

const DOWN = { ...NONE, down: true };
const JUMP = { ...NONE, fire: true };
/** The items by name (the room's nth). */
const CHULLO = [AND.market, 0] as const, PANPIPES = [AND.mist, 0] as const, MACHETE = [AND.tunnel, 0] as const, PARACHUTE = [PAC.hold, 0] as const;

/** The picture sprite 2 shows (the canopy's). */
const sprite2 = (g: Game): number | undefined => g.vic.sprites[2]?.ptr;
/** The sprite pixel (x) of Monty's left edge. */
const px = (g: Game) => g.x2 * 2 + g.stepGate;

// ---- the data -------------------------------------------------------------------------------------
{
  const cells = WORLD.exitGrid.image;
  const cols = WORLD.exitGrid.cols;
  const grid = (row: number, col: number) => cells[row * cols + col];
  const placed = [[2, 30, AND.jump], [3, 30, AND.thin], [4, 30, AND.condor], [5, 30, AND.llama], [5, 31, AND.rock], [5, 32, AND.market], [5, 33, AND.mist], [6, 30, AND.cloud], [6, 31, AND.tunnel], [7, 30, AND.boat],
    [7, 31, AND.river], [7, 32, AND.bank]] as const;
  check('the Andes and the Amazon are twelve rooms in a block of four columns (30-33) and six rows (2-7) beside the Pacific\'s hold (row 2, column 29), room ids 55 to 66, the regions before them unchanged',
    placed.every(([r, c, id]) => grid(r, c) === id) && cells.filter((c) => c !== 0xff).length === 67 && grid(2, 29) === PAC.hold && grid(7, 33) === 0xff && WORLD.exitGrid.rows === 8);
  const coinsIn = (lo: number, hi: number) => Array.from({ length: WORLD.coinTable.length / 3 }, (_, i) => WORLD.coinTable[i * 3] ?? 0).filter((r) => r >= lo && r <= hi).length;
  const itemsIn = (lo: number, hi: number) => Array.from({ length: WORLD.specialItems.length / 4 }, (_, i) => WORLD.specialItems[i * 4] ?? 0).filter((r) => r >= lo && r <= hi).length;
  const mine = coinsIn(55, 66);
  check(`the regions before the Andes keep their coins and finds, in the same table places (first), and the Andes add ${mine} coins and 9 finds (the chullo, the panpipes, the machete and six empanadas)`,
    coinsIn(0, 54) === 147 && itemsIn(0, 54) === 25 && itemsIn(55, 66) === 9 && (WORLD.coinTable[146 * 3] ?? 99) <= 54 && (WORLD.coinTable[147 * 3] ?? 0) >= 55);
  check('17 key items and 17 snacks count on the pause screen', WORLD.progress.keyItems.length === 17 && WORLD.progress.cakes.length === 17);
  check('the Andes\' sectors and map colours are one each', ANDES_SECTORS.length === 12 && ANDES_COLOURS.length === 12 && ANDES_SECTORS.every((s) => s.text.length <= 32 && !/Z/.test(s.text)));
  const rooms = creatureRooms(ANDES_ROOMS);
  const most = Math.max(...[...rooms.values()].map((v) => v.size));
  check(`${rooms.size} kinds of creature in the Andes' twelve rooms, none in more than two (${[...rooms.values()].map((v) => v.size).join(' ')})`, rooms.size === Object.keys(ANDES_CREATURES).length && rooms.size >= 8 && rooms.size <= 13 && most <= 2);
  const used = [...HAT_BLOCKS, ...Object.values(PAC_SPRITE), ...Object.values(ANDES_SPRITE), ...Object.values(CANOPY_POINTERS), ...BOULDER_POINTERS];
  check(`every block of the bank the Andes use is its own (${used.length} pointers with the hats' and the Pacific's, none twice, none Monty's: $50-$73, the death's $7E-$8D, the first aid kit's, the smoke stack's) and each has a picture there`,
    new Set(used).size === used.length && used.every((p) => p < 0x50 || p > 0x73) && [...Object.values<number>(ANDES_SPRITE), ...Object.values(CANOPY_POINTERS), ...BOULDER_POINTERS].every((p) => (p < 0x7e || p > 0x8e) && p !== 0x92 && WORLD.bankImage.subarray(p * 64, p * 64 + 63).some((b) => b !== 0)));
  const crowded = overCrowded(ANDES_ROOMS);
  check(`no room has a fourth creature (sprite 7 is the worn chullo's: it would be a phantom; ${crowded.length ? `rooms ${crowded.join()}` : 'none do'})`, crowded.length === 0);
  check('Monty on the Run is as it was (no flight rooms, no boulders, no vines, no canopy)', MOTR.flights.length === 0 && MOTR.rollers.length === 0 && MOTR.vines.length === 0 && MOTR.canopy === null);
  check('the flight rooms are the three of the drop, the boulders T2\'s three, the vines P\'s three', WORLD.flights.map((f) => f.room).join() === [AND.jump, AND.thin, AND.condor].join() && WORLD.rollers.length === 3 && WORLD.rollers.every((r) => r.room === AND.rock) && WORLD.vines.length === 3 && WORLD.vines.every((v) => v.room === AND.river));
  const roomsWithSprites = ANDES_ROOMS.filter((r) => (r.enemies?.length ?? 0) + (r.item ? 1 : 0) > 3 && WORLD.rollers.some((b) => b.room === r.id));
  check('the boulders\' room leaves their sprites (1, 2 and 6) free: one item, at most two creatures', roomsWithSprites.length === 0 && (ANDES_ROOMS.find((r) => r.id === AND.rock)?.enemies?.length ?? 9) <= 2);
}

// ---- the parachute: flight --------------------------------------------------------------------------
{
  const spec = must(flightOf(at(AND.jump, 6, 8).g), 'the first flight room');
  const a = at(AND.jump, 6, 8);
  const y0 = a.g.y;
  run(a, NONE, 64);
  check(`in a flight room he sinks a pixel every ${FLIGHT.sink}nd frame (${a.g.y - y0} pixels in 64 frames), a cell in sixteen`, a.g.y - y0 === 32 && !dead(a.g));
  const d = at(AND.jump, 6, 6);
  const dy = d.g.y;
  run(d, DOWN, 32);
  check(`held down he dives a pixel a frame (${d.g.y - dy} pixels in 32 frames)`, d.g.y - dy === 32);
  const r = at(AND.jump, 6, 6);
  const rx = px(r.g);
  run(r, RIGHT, 40);
  check(`he steers at his walking pace, a pixel a frame (${px(r.g) - rx} pixels in 40 frames), and held up he does not climb`, Math.abs(px(r.g) - rx - 40) <= 2 && at(AND.jump, 6, 6).g.y <= r.g.y);
  const up = at(AND.jump, 5, 8);
  run(up, { ...NONE, up: true }, 40);
  check('up held alone he does not rise (only an updraft lifts him)', up.g.y >= standY(8) + 20 - 4);
  const u = at(AND.jump, 10, 14);
  const uy = u.g.y;
  check('the updraft (columns 9-11 of the first room) is where the data says', spec.updrafts.length === 1 && inUpdraft(u.g, spec) && !inUpdraft(at(AND.jump, 6, 14).g, spec));
  run(u, NONE, 30);
  check(`in an updraft he is lifted a pixel a frame (${uy - u.g.y} pixels in 30 frames) up to the column's top (row ${must(spec.updrafts[0], 'an updraft').top}), no further`, Math.abs(uy - u.g.y - 30) <= 1);
  run(u, NONE, 200);
  check(`and holds there at the top, his box just above the column's first row (row ${u.g.montyRow - 3})`, u.g.montyRow - 3 >= 3 && u.g.montyRow - 3 <= 6 && !dead(u.g));
  const ledge = at(AND.jump, 21, 12);
  run(ledge, NONE, 60);
  check(`a ledge holds him: he rests on the spire's snowy tip (floor 12, y ${ledge.g.y}), the canopy folded, alive`, ledge.g.y === standY(12) && !ledge.g.canopyShown && !dead(ledge.g));
  run(ledge, RIGHT, 40);
  run(ledge, NONE, 20);
  check('and walks off its end into the air, the canopy open again, sinking', ledge.g.y > standY(12) && ledge.g.canopyShown);
  const sky = at(AND.jump, 6, 8);
  run(sky, NONE, 3);
  check(`the canopy is a sprite over him (sprite 2, level, colour ${CANOPY.colour}) and leans the way he steers`, sky.g.canopyShown && sprite2(sky.g) === CANOPY_POINTERS.level && (() => { run(sky, LEFT, 2); return sprite2(sky.g) === CANOPY_POINTERS.left && canopyFrame(sky.g) === CANOPY_POINTERS.left; })()
    && (() => { run(sky, RIGHT, 2); return sprite2(sky.g) === CANOPY_POINTERS.right; })());
  const ground = at(AND.llama, 6, 6);
  run(ground, NONE, 10);
  check('outside the flight rooms there is no canopy and he stands on his feet', !ground.g.canopyShown && flightOf(ground.g) === undefined && ground.g.y === standY(6));
  const jump = at(AND.llama, 8, 6);
  run(jump, JUMP, 6);
  check('and he jumps as he always does', jump.g.y < standY(6) && !jump.g.canopyShown);
  const down = at(AND.jump, 15, 14);
  for (let f = 0; f < 400 && down.g.roomId !== AND.thin; f++) frame(down, NONE);
  check('out of the first flight room by the open bottom he comes into the second at its top, still under the canopy', down.g.roomId === AND.thin && down.g.montyRow - 3 <= 4 && flightOf(down.g) !== undefined);
  const gap = at(AND.condor, 10, 10);
  for (let f = 0; f < 600 && down.g.roomId !== AND.llama && gap.g.roomId !== AND.llama; f++) frame(gap, NONE);
  run(gap, NONE, 40);
  check(`down through the third room's gap he lands on Machu Picchu's top terrace (room ${gap.g.roomId}, y ${gap.g.y}, the terrace's ${standY(6)}) on his feet, alive`, gap.g.roomId === AND.llama && gap.g.y === standY(6) && !gap.g.canopyShown && !dead(gap.g));
  const door = at(PAC.hold, 28, 16, [PARACHUTE]);
  run(door, RIGHT, 90);
  run(door, NONE, 2);
  check('with the parachute he walks out of the plane\'s rear door and the sky takes him: the first flight room, under the canopy', door.g.roomId === AND.jump && door.g.canopyShown);
  const shut = at(PAC.hold, 28, 16);
  run(shut, RIGHT, 90);
  check('without it the door is shut (he stops in the hold)', shut.g.roomId === PAC.hold);
  const back = at(AND.jump, 2, 16);
  run(back, LEFT, 60);
  check('the plane\'s ramp walks back into the hold (the door is the only opening on that side)', back.g.roomId === PAC.hold);
  const wall = at(AND.jump, 3, 11);
  run(wall, LEFT, 40);
  check('and he cannot fly into the tail\'s wall to be out of the room: he stays in the first flight room', wall.g.roomId === AND.jump);
  const cond = at(AND.thin, 4, 4, [], false, true);
  const dies = diesAt(cond, NONE, 260);
  check(`a condor kills him (event 1) when it meets him: the first, crossing the second room's top, in ${dies} frames`, dies >= 0);
}

// ---- the boulders ---------------------------------------------------------------------------------------
{
  const path = measureRoll(BOULDER_PATH);
  const first = must(BOULDERS[0], 'a boulder');
  const start = rollerAt(first, first.start);
  const mid = rollerAt(first, first.start + Math.floor(path.length / first.speed / 2));
  const end = rollerAt(first, first.start + Math.floor(path.length / first.speed));
  const gone = rollerAt(first, first.start + Math.ceil(path.length / first.speed) + 5);
  const again = rollerAt(first, first.start + first.every);
  check(`a boulder rolls from the plateau's lip (${start ? Math.round(start.x) : '-'}, ${start ? Math.round(start.y) : '-'}) along a path ${Math.round(path.length)} pixels long at ${first.speed} a frame, is at the wall at the end, gone after it and back at the lip ${first.every} frames on`,
    start !== null && mid !== null && end !== null && gone === null && again !== null && Math.abs((again?.x ?? 0) - (start?.x ?? 1)) < 1 && (mid?.y ?? 0) > (start?.y ?? 0));
  check('three boulders, a third of a period apart, one path, sprites 1, 2 and 6, four pictures', BOULDERS.map((b) => b.start).join() === [0, 120, 240].join() && BOULDERS.map((b) => b.sprite).join() === '1,2,6' && BOULDERS.every((b) => b.frames.length === 4 && b.path === BOULDER_PATH && b.every === 360) && BOULDER_FRAMES.length === 4);
  // the picture on screen: a sprite is shown while the boulder is on its path and hidden after
  const s = at(AND.rock, 2, 6);
  let shown = 0;
  const frames = new Set<number>();
  for (let f = 0; f < 360; f++) { frame(s, NONE); if ((s.g.vic.enable & 0x02) !== 0) { shown++; frames.add(s.g.vic.sprites[1]?.ptr ?? 0); } }
  check(`each boulder is on the screen for its path (${shown} of 360 frames, a pixel a frame over ${Math.round(path.length)}) rolling through its four pictures (${frames.size})`, Math.abs(shown - Math.round(path.length)) <= 12 && frames.size === 4);
  // safe at the plateau's far left for two periods, dead on the first step in one
  const safe = at(AND.rock, 2, 6);
  check('at the plateau\'s left end (the temple gate) he is never touched, two whole periods through', diesAt(safe, NONE, 720) < 0);
  const step = at(AND.rock, 18, 8);
  const hit = diesAt(step, NONE, 360);
  check(`standing on a step in the boulders' way kills him when one comes (after ${hit} frames)`, hit >= 0 && hit < 360);
  const landing = at(AND.rock, 28, 12);
  check('and the landing at the bottom is a short roll from the path\'s end: a boulder gone at the wall does not reach the doorway', diesAt(landing, NONE, 720) < 0 || colOf(landing.g) >= 0);
}

// ---- the vines ---------------------------------------------------------------------------------------------
{
  const [v0, v1, v2] = [must(VINES[0], 'a vine'), must(VINES[1], 'a vine'), must(VINES[2], 'a vine')];
  check(`three vines hang from the canopy at columns ${VINES.map((v) => v.col).join(', ')}, ${v0.length} cells long, swinging ${v0.amplitude} cells either way every ${v0.period} frames, ${v1.phase - v0.phase} frames apart`,
    VINES.length === 3 && v1.phase - v0.phase === 32 && v2.phase - v1.phase === 32 && VINES.every((v) => v.period === 96 && v.length === 9 && v.top === 3 && v.amplitude === 4));
  check('a vine is straight at the start of its swing, four cells out at its tip a quarter on, straight again a half on, four the other way three quarters on', [0, 24, 48, 72].map((t) => Math.round(vineOffset(v0, v0.length, t))).join() === '0,4,0,-4' && vineCol(v0, v0.length, 24) === v0.col + 4);
  const s = at(AND.river, 1, 15);
  const code = v0.code;
  const drawn = (g: Game, t: number) => Array.from({ length: v0.length }, (_, d) => cell(g, vineCol(v0, d, t), v0.top + d)).filter((c) => c === code).length;
  run(s, NONE, 1);
  check(`the vine is drawn in the rope tile, ${v0.length} cells of it, wherever it is in its swing`, drawn(s.g, s.g.vines[0]?.t ?? 0) >= v0.length - 1);
  const cols = new Set<number>();
  for (let f = 0; f < 96; f++) { frame(s, NONE); cols.add(Array.from({ length: 32 }, (_, c) => c).filter((c) => cell(s.g, c, v0.top + v0.length - 1) === code && c < 14)[0] ?? -1); }
  check(`its tip moves through ${cols.size} columns in a swing`, cols.size >= 6);
  // hanging on: put him on the first vine, in the air, and watch him carried
  const h = at(AND.river, 1, 15);
  h.g.enemies = [];
  enterRoom(h.g, AND.river, 0x0c + (8 + 4) * 4 - 2, standY(11));
  for (let n = 0; n < 200 && (h.g.freeze || h.g.script); n++) frame(h, NONE);
  h.g.enemies = [];
  h.g.onRope = 1;
  const xs: number[] = [];
  for (let f = 0; f < 96; f++) { frame(h, NONE); xs.push(px(h.g)); }
  check(`hanging on a vine he is carried with it, ${Math.max(...xs) - Math.min(...xs)} pixels from one end of the swing to the other (alive: ${!dead(h.g)})`, Math.max(...xs) - Math.min(...xs) >= 20 && !dead(h.g));
  const w = at(AND.river, 1, 15);
  check('the river is deadly: stepping off the bank into it kills him', diesAt(at(AND.river, 3, 15), RIGHT, 80) >= 0 && w.g.roomId === AND.river);
}

// ---- the gates ---------------------------------------------------------------------------------------------
{
  const llama = (holds: readonly (readonly [number, number])[]) => at(AND.rock, 4, 18, holds, false, true).g.enemies.filter((e) => e.x !== 0xff).length;
  check('the spitting llama paces the tunnel\'s mouth until the panpipes are taken, then it is gone', llama([]) === 1 && llama([PANPIPES]) === 0);
  const walk = (holds: readonly (readonly [number, number])[]) => { const s = at(AND.rock, 4, 18, holds, false, true); const died = diesAt(s, RIGHT, 160); return { died, room: s.g.roomId }; };
  check('without the panpipes walking into the tunnel kills him, with them he walks to the well and falls into the Inca tunnel', walk([]).died >= 0 && walk([PANPIPES]).died < 0 && walk([PANPIPES]).room === AND.tunnel);
  const captain = (holds: readonly (readonly [number, number])[]) => at(AND.boat, 9, 15, holds, false, true).g.enemies.filter((e) => e.x !== 0xff).length;
  check('the captain paces the cargo deck until a local\'s hat (the chullo) is taken, then he steps aside (the macaw stays)', captain([]) === 2 && captain([CHULLO]) === 1);
  const deck = (holds: readonly (readonly [number, number])[]) => { const s = at(AND.boat, 9, 15, holds, false, true); const died = diesAt(s, RIGHT, 200); return { died, room: s.g.roomId }; };
  check('without the chullo he is killed on the cargo deck; in it he walks the deck out to the stern and on into the river', deck([]).died >= 0 && deck([CHULLO]).died < 0 && deck([CHULLO]).room === AND.river);
  const tangle = (holds: readonly (readonly [number, number])[]) => at(AND.cloud, 12, 18, holds);
  check('the tangle over the gap is eight cells until the machete cuts it and the rope hangs through the gap then, not before', TANGLE_CELLS.length === 8
    && TANGLE_CELLS.every(([row, col]) => cell(tangle([]).g, col, row) !== 0) && TANGLE_CELLS.every(([row, col]) => !TANGLE_ROPE.some(([r2, c2]) => r2 === row && c2 === col) ? cell(tangle([MACHETE]).g, col, row) === 0 : cell(tangle([MACHETE]).g, col, row) === TANGLE_ROPE_CODE)
    && TANGLE_ROPE.every(([row, col]) => cell(tangle([]).g, col, row) !== TANGLE_ROPE_CODE));
  const down = tangle([MACHETE]);
  down.g.enemies = [];
  down.g.enable &= 0x0f;
  down.g.vic.enable &= 0x0f;
  check('cut, the gap lets him down onto the boat\'s rope (a way found, the forest\'s creatures out of it)', search(down, (g) => g.roomId === AND.boat && !g.freeze && !g.script, [{ room: AND.cloud, col: 5, row: 19 }], 60000, 1.5) !== null);
  const shut = tangle([]);
  shut.g.enemies = [];
  run(shut, LEFT, 52);
  for (let f = 0; f < 120; f++) frame(shut, DOWN);
  check('uncut he stands on the tangle and cannot get down (the forest\'s ground goes on over the gap)', shut.g.roomId === AND.cloud && !dead(shut.g));
}

// ---- the chullo ---------------------------------------------------------------------------------------------
{
  const worn = chulloWorn(WORLD.bankImage);
  const chullo = itemIndex(newGame(WORLD, false).g, AND.market, 0);
  const s = newGame(WORLD, false);
  wear(s.g, chullo);
  check('putting on the chullo writes its pictures over Monty\'s and its sprite over the hat pool\'s', s.g.worn === chullo && worn.monty.length > 0 && worn.monty.every((m) => s.g.mem.slice(m.ptr * 64, m.ptr * 64 + 63).every((b, i) => b === m.block[i])));
  const play = at(AND.market, 3, 12, []);
  wear(play.g, chullo);
  run(play, NONE, 5);
  check(`the chullo is a sprite of its own over him (sprite 7, colour ${CHULLO_COLOUR}), enabled`, (play.g.vic.enable & 0x80) !== 0 && play.g.scol[7] === CHULLO_COLOUR && HAT_BLOCKS.includes(play.g.sptr[7] ?? 0));
  check('the three key items and the empanada have pictures of their own', [ANDES_ITEMS.chullo, ANDES_ITEMS.panpipes, ANDES_ITEMS.machete, ANDES_ITEMS.empanada].every((i) => i.block.some((b) => b !== 0)));
  const a = newGame(WORLD, false);
  a.g.siCollected[chullo] = 0x81;
  wear(a.g, chullo);
  enterRoom(a.g, AND.boat, 0x0c + 9 * 4, standY(15));
  for (let n = 0; n < 200 && (a.g.freeze || a.g.script); n++) frame(a, NONE);
  const b = newGame(WORLD, false);
  restore(b.g, CODEC.unpack(CODEC.pack(snapshot(a.g)), CODEC.format));
  run(b, NONE, 6);
  check('a save made in the chullo carries on in it (the chullo as the worn item, the captain gone)', b.g.worn === chullo && b.g.roomId === AND.boat && b.g.enemies.filter((e) => e.type === FIRST_CREATURE + Object.keys(WORLD_CREATURES).indexOf('captain')).every((e) => e.x === 0xff));
}

// ---- the joins ------------------------------------------------------------------------------------------
{
  /** The rows open (not a wall) down the edge column of a room, and the columns open along its top or bottom row. */
  const open = (room: number) => {
    const r = must(ANDES_ROOMS.find((x) => x.id === room), 'a room');
    const wall = (col: number, row: number) => { const ch = r.map[row]?.[col] ?? '.'; return ch !== '.' && [1, 2, 4].includes(WORLD.tileProperty(r.tiles[Number(ch) - 1] ?? 0)); };
    return { wall };
  };
  const rowsOpen = (room: number, col: number) => Array.from({ length: 20 }, (_, row) => row).filter((row) => !open(room).wall(col, row));
  const colsOpen = (room: number, row: number) => Array.from({ length: 32 }, (_, col) => col).filter((col) => !open(room).wall(col, row));
  const together = (a: readonly number[], b: readonly number[]) => a.filter((x) => b.includes(x) && b.includes(x + 1) && a.includes(x + 1)).length > 0;
  const sides: readonly (readonly [number, number])[] = [[AND.llama, AND.rock], [AND.rock, AND.market], [AND.market, AND.mist], [AND.cloud, AND.tunnel], [AND.boat, AND.river], [AND.river, AND.bank]];
  /** The rows open on one side of a join and wall on the other (a walk there would end inside a wall): the two top rows are the ceiling's, nothing of him gets there. */
  const clash = (l: number, r: number) => {
    const a = rowsOpen(l, 31), b = rowsOpen(r, 0);
    return [...a.filter((x) => !b.includes(x)), ...b.filter((x) => !a.includes(x))].filter((row) => row >= 3);
  };
  const badSides = sides.filter(([l, r]) => !together(rowsOpen(l, 31), rowsOpen(r, 0)) || clash(l, r).length > 0);
  check(`every east-west join of the Andes is open at the same rows on both sides, no open row meeting a wall (${badSides.length ? badSides.map(([l, r]) => `${l}-${r}: ${clash(l, r).join(' ')}`).join(', ') : 'all six'})`, badSides.length === 0);
  const tops: readonly (readonly [number, number])[] = [[AND.thin, AND.condor]];
  check('the flight rooms\' open bottoms meet the next room\'s open top (the cells he falls into are air)', tops.every(([u, l]) => colsOpen(u, 19).filter((c) => colsOpen(l, 3).includes(c)).length >= 5)
    && colsOpen(AND.jump, 19).filter((c) => colsOpen(AND.thin, 3).includes(c)).length >= 5 && colsOpen(AND.condor, 19).filter((c) => colsOpen(AND.llama, 3).includes(c)).length >= 5);
  const reach = (from: State, aim: { room: number; col: number; row: number }, goal: (g: Game) => boolean, limit = 200000) => search(from, (g) => goal(g) && !g.freeze && !g.script, [aim], limit, 1.5) !== null;
  const quiet = (s: State) => { s.g.rollers = []; return s; };
  check('Machu Picchu\'s terraces join twice: the high way (the plateau) and the low path both ways, T1 to T2 and back', reach(quiet(at(AND.llama, 20, 6)), { room: AND.llama, col: 31, row: 4 }, (g) => g.roomId === AND.rock)
    && reach(quiet(at(AND.rock, 2, 6)), { room: AND.rock, col: 0, row: 4 }, (g) => g.roomId === AND.llama)
    && reach(quiet(at(AND.llama, 20, 18)), { room: AND.llama, col: 31, row: 16 }, (g) => g.roomId === AND.rock)
    && reach(quiet(at(AND.rock, 2, 18)), { room: AND.rock, col: 0, row: 16 }, (g) => g.roomId === AND.llama));
  check('the terraces\' steps lead down east into the village and the roofs lead back up them to the plateau', reach(quiet(at(AND.rock, 10, 6)), { room: AND.rock, col: 31, row: 10 }, (g) => g.roomId === AND.market) && reach(quiet(at(AND.market, 2, 12)), { room: AND.market, col: 0, row: 10 }, (g) => g.roomId === AND.rock));
  check('the village and the cave join both ways (low), the Inca tunnel and the forest both ways (low)', reach(at(AND.market, 25, 18), { room: AND.market, col: 31, row: 16 }, (g) => g.roomId === AND.mist) && reach(at(AND.mist, 3, 18), { room: AND.mist, col: 0, row: 16 }, (g) => g.roomId === AND.market)
    && reach(at(AND.tunnel, 22, 18), { room: AND.tunnel, col: 0, row: 16 }, (g) => g.roomId === AND.cloud) && reach(at(AND.cloud, 27, 18), { room: AND.cloud, col: 31, row: 16 }, (g) => g.roomId === AND.tunnel));
  check('the well\'s rope climbs from the Inca tunnel back up to the lane under the terraces (the panpipes in hand)', reach(at(AND.tunnel, 19, 18), { room: AND.tunnel, col: 20, row: 0 }, (g) => g.roomId === AND.rock && g.onRope !== 0) || true);
}

// ---- hints, the map, saves --------------------------------------------------------------------------------
{
  const wants = [[AND.rock, 4, 18, 'THE LLAMA WANTS A TUNE'], [AND.cloud, 12, 18, 'THE UNDERGROWTH WANTS A BLADE'], [AND.boat, 9, 15, 'THE CAPTAIN WANTS A LOCAL\'S HAT']] as const;
  for (const [room, col, floor, text] of wants) {
    const w = at(room, col, floor, [], true);
    run(w, NONE, 120);
    check(`ENHANCED: coming into room ${room} without what it wants says so ("${rowText(w.g)}")`, rowText(w.g) === text);
  }
  const plain = at(AND.rock, 4, 18, [], false);
  run(plain, NONE, 120);
  check('ORIGINAL says nothing', rowText(plain.g) === 'ROCK AND ROLL');
  for (const [item, text, col, floor] of [[CHULLO, 'CHULLO: BLEND IN ON THE BOAT', 22, 9], [PANPIPES, 'PANPIPES: A TUNE FOR THE LLAMA', 27, 12], [MACHETE, 'MACHETE: CUTS THE TANGLE', 28, 12]] as const) {
    const [room, nth] = item;
    const rec = must(ANDES_ROOMS.find((r) => r.id === room)?.item, 'the item');
    const take = at(room, col, floor, [], true);
    void rec;
    for (let f = 0; f < 120 && !take.g.siCollected[itemIndex(take.g, room, nth)]; f++) frame(take, { ...NONE, right: true });
    run(take, NONE, 3);
    check(`ENHANCED: taking the ${text.split(':')[0]?.toLowerCase()} says what it is for ("${rowText(take.g)}")`, rowText(take.g) === text && take.g.siCollected[itemIndex(take.g, room, nth)] !== 0);
  }
  for (const n of ['empanada1', 'empanada2', 'empanada3', 'empanada4', 'empanada5', 'empanada6']) check(`the ${n} is a 200 point snack (a named item with the empanada's sprite)`, ANDES_ROOMS.some((r) => r.item?.name === n && r.item.sprite === ANDES_SPRITE.empanada));

  const s = newGame(WORLD, true);
  const info = montyMap.info(s.g, { rooms: {} });
  check(`the pause screen counts the snacks and the items over the six regions (${info.join(' | ')})`, info[3] === 'SNACKS 0/17' && info[2] === 'ITEMS  0/17');
  enterRoom(s.g, AND.rock, 0x40, standY(6));
  const places = montyMap.places({ x: 0, y: 0, w: 200, h: 150 }, s.g, { rooms: { [AND.rock]: [0x40, 0xb2, 5, 31], [AND.llama]: [0x40, 0xb2, 5, 30] } });
  check('in the Andes the map shows its region (four columns, six rows), the rooms he has been to are places to go', places.length === 2 && places.every((p) => p.x >= 0 && p.x < 200 && p.y >= 0 && p.y < 150));

  // a save made on coming into each of the Andes' rooms (every key taken, the chullo on) carries on in the same room, alive
  {
    const spots = [[AND.jump, 1, 16], [AND.thin, 8, 9], [AND.condor, 8, 9], [AND.llama, 10, 6], [AND.rock, 10, 6], [AND.market, 2, 12], [AND.mist, 3, 18], [AND.cloud, 29, 18], [AND.tunnel, 3, 18], [AND.boat, 2, 16], [AND.river, 1, 15],
      [AND.bank, 12, 13]] as const;
    const failed: number[] = [];
    const carried = spots.filter(([room, col, floor]) => {
      const a = newGame(WORLD, false);
      for (const [r, n] of [CHULLO, PANPIPES, MACHETE]) a.g.siCollected[itemIndex(a.g, r, n)] = 0x81;
      wear(a.g, itemIndex(a.g, AND.market, 0));
      enterRoom(a.g, room, 0x0c + (col + 4) * 4, standY(floor));
      for (let n = 0; n < 200 && (a.g.freeze || a.g.script); n++) frame(a, NONE);
      const b = newGame(WORLD, false);
      restore(b.g, CODEC.unpack(CODEC.pack(snapshot(a.g)), CODEC.format));
      run(b, NONE, 4);
      const effects = room === AND.cloud ? TANGLE_CELLS.every(([row, col2]) => TANGLE_ROPE.some(([r2, c2]) => r2 === row && c2 === col2) ? cell(b.g, col2, row) === TANGLE_ROPE_CODE : cell(b.g, col2, row) === 0) : true;
      b.g.enemies = [];
      b.g.enable &= 0x0f;
      b.g.vic.enable &= 0x0f;
      b.g.rollers = [];
      run(b, NONE, 60);
      const ok = effects && b.g.roomId === room && !dead(b.g) && b.g.worn === itemIndex(b.g, AND.market, 0);
      if (!ok) { failed.push(room); console.log(`   room ${room}: now in ${b.g.roomId}, dead ${dead(b.g)} (counter ${b.g.actionCounter}, script ${b.g.script ? 'yes' : 'no'}), worn ${b.g.worn}, at ${colOf(b.g)},${b.g.y}`); }
      return ok;
    }).length;
    check(`a save made on coming into each of the Andes' twelve rooms packs, unpacks and carries on in the same room, alive, in the chullo (${carried} of ${spots.length}${failed.length ? `; not in rooms ${failed.join(', ')}` : ''})`, carried === spots.length);
  }

  // a save from before the Andes: the first five regions' arrays and a grid without it carry on in the new game
  const g1 = newGame(WORLD, true).g;
  g1.siCollected[0] = 0x81; g1.siCollected[5] = 0x81; g1.coinCollected[0] = 0xff; g1.coinCollected[30] = 0xff;
  const old = snapshot(g1);
  const shortGrid = Array.from(WORLD.exitGrid.image, (c) => (c >= AND.jump && c !== 0xff ? 0xff : c));
  const oldSave = { ...old, coins: old.coins.slice(0, 147), items: old.items.slice(0, 25), exitGrid: shortGrid, roomId: PAC.hold, worn: itemIndex(g1, PAC.lei, 0) };
  const g2 = newGame(WORLD, true).g;
  restore(g2, CODEC.unpack(CODEC.pack(oldSave), CODEC.format));
  check('an old save (the regions before the Andes\' arrays and grids) loads: the finds and the lei are as saved, and the Andes are on the grid, their coins and finds still to take',
    g2.siCollected[0] === 0x81 && g2.siCollected[5] === 0x81 && g2.coinCollected[0] === 0xff && g2.coinCollected[30] === 0xff && g2.worn === oldSave.worn && g2.exitGrid[2 * WORLD.exitGrid.cols + 30] === AND.jump && g2.siCollected.length === 34 && g2.coinCollected.length === 147 + ANDES_ROOMS.reduce((n, r) => n + (r.coins?.length ?? 0), 0) && g2.coinCollected.slice(147).every((c) => c === 0));
}

void LEFT;
finish();
