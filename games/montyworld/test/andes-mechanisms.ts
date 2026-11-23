/**
 * The Andes and the Amazon's mechanisms, headless, each on its own with the room's creatures out of the way unless it says so (the bot, andes.ts, plays them all together; docs/dosvidaniya-reset.md is the plan): the
 * parachute's flight (a slow sink, the dive, the steering, the updrafts' lift, a ledge to rest on, the canopy over him, only in the two flight rooms) and the drop's two landings, the boulders on Machu Picchu's hill,
 * the spitting llama and its spit (the panpipes' gate), the vines, the rotten logs, the tangle in the root arch (the machete's gate), the region's one-way pieces and its loops proved by search (the bough only down the
 * hollow, the high ledge only from the plateau, the tunnel a wall without the panpipes, the kapok's floor closed but for the hollow, every fall through the canopy's floor landing on his feet), fairness from several
 * starts, the hints, the map and a save in each room.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/andes-mechanisms.ts [--record]
 */
import { enterRoom } from '../../montyotr/src/ending';
import { canopyFrame, FLIGHT, flightOf, inUpdraft } from '../../montyotr/src/flight';
import type { Game } from '../../montyotr/src/game';
import { wear } from '../../montyotr/src/items';
import { montyMap } from '../../montyotr/src/map';
import { MOTR } from '../../montyotr/src/motr';
import { polyline } from '../../montyotr/src/paths';
import { rollerAt } from '../../montyotr/src/rollers';
import { restore, snapshot } from '../../montyotr/src/save';
import { vineHeld, vineWay } from '../../montyotr/src/vines';
import { frame, NONE, type State } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { must } from '../../shared/test/must';
import { ANDES_CREATURES } from '../src/art/andes-creatures';
import { ANDES_ITEMS, CANOPY } from '../src/art/andes-items';
import { chulloWorn, CHULLO_COLOUR } from '../src/art/andes-hat';
import { AND, ANDES_ROOMS, ANDES_SECTORS, BOULDER_PATH, BOULDERS_OF_PICCHU, LOG_CRACKS, LOGS, TANGLE_CELLS, VINES } from '../src/andes';
import { ANDES_SPRITE, BOULDER_POINTERS, CANOPY_POINTERS, LEAP_POINTERS } from '../src/andes-pointers';
import { WORLD } from '../src/data';
import { HAT_BLOCKS } from '../src/hats';
import { CODEC } from '../src/main';
import { PAC, PAC_SPRITE } from '../src/pacific';
import { SPRITE } from '../src/moscow';
import { SIB_SPRITE } from '../src/siberia';
import { CHINA_SPRITE, DRAGON_POINTERS } from '../src/china-pointers';
import { JAPAN_SPRITE } from '../src/japan-pointers';
import { newGame } from '../../shared/monty/test/bot';
import { search } from './search';
import { cell, colOf, dead, diesAt, LEFT, overCrowded, RIGHT, at, rowText, run } from './mech-kit';
import { creatureRooms, itemIndex, standY } from './route';
import { CHULLO, LEDGE_EMPANADA } from './andes-route';

const DOWN = { ...NONE, down: true };
const UP = { ...NONE, up: true };
const JUMP = { ...NONE, fire: true };
/** The items by where they are (the room's nth). */
const CHULLO_AT = [AND.terraces, CHULLO] as const, PANPIPES = [AND.picchu, 0] as const, MACHETE = [AND.roots, 0] as const, PARACHUTE = [PAC.plane, 0] as const;

/** The picture sprite 2 shows (the canopy's). */
const sprite2 = (g: Game): number | undefined => g.vic.sprites[2]?.ptr;
/** The sprite pixel (x) of Monty's left edge. */
const px = (g: Game) => g.x2 * 2 + g.stepGate;
const settled = (g: Game) => !g.freeze && !g.script;
const reach = (from: State, aim: { room: number; col: number; row: number }, goal: (g: Game) => boolean, limit = 200000) => search(from, (g) => goal(g) && settled(g), [aim], limit, 1.5) !== null;
/** The room as the data has it. */
const roomOf = (id: number) => must(ANDES_ROOMS.find((r) => r.id === id), `room ${id}`);
/** Whether a cell of a room's map stops him (a wall, a floor, a hazard: the joins' sense). */
const solid = (id: number, col: number, row: number) => {
  const r = roomOf(id);
  const ch = r.map[row]?.[col] ?? '.';
  return ch !== '.' && [1, 2, 4].includes(WORLD.tileProperty(r.tiles[Number(ch) - 1] ?? 0));
};
/** A game standing in a room whose way out to the room at (row, col) of the exit grid is shut: what he can reach without leaving the room that way. */
const shutOff = (s: State, row: number, col: number): State => { s.g.exitGrid[row * WORLD.exitGrid.cols + col] = 0xff; return s; };

// ---- the data -------------------------------------------------------------------------------------
{
  const cells = WORLD.exitGrid.image;
  const cols = WORLD.exitGrid.cols;
  const grid = (row: number, col: number) => cells[row * cols + col];
  const placed = [[2, 20, AND.jump], [3, 20, AND.gorge], [4, 20, AND.terraces], [4, 21, AND.picchu], [5, 21, AND.canopy], [5, 22, AND.kapok], [6, 21, AND.sandbar], [6, 22, AND.roots]] as const;
  check('the Andes and the Amazon are eight rooms: the drop (F1, F2) down column 20, Machu Picchu beside its foot, the Amazon an open block of two by two under it, beside the Pacific\'s plane (row 2, column 19)',
    placed.every(([r, c, id]) => grid(r, c) === id) && ANDES_ROOMS.length === 8 && grid(2, 19) === PAC.plane && WORLD.exitGrid.rows === 8);
  check('the ids of the rooms kept are as they were (55, 57, 58, 59; 62, 63, 65, 66), and the retired 56, 60, 61, 64 and 78 are no room\'s', [...cells].every((c) => ![56, 60, 61, 64, 78].includes(c)) && ANDES_ROOMS.every((r) => [55, 57, 58, 59, 62, 63, 65, 66].includes(r.id)));
  const coins = ANDES_ROOMS.map((r) => r.coins?.length ?? 0);
  check(`9 coins in 8 rooms, never more than 3 a room, each with its reason (${coins.join(' ')})`, coins.reduce((a, b) => a + b, 0) === 9 && coins.every((n) => n <= 3));
  const finds = ANDES_ROOMS.flatMap((r) => [...(r.cake ? ['cake'] : []), ...(r.item ? [r.item.name] : [])]);
  check(`six finds: the chullo, the panpipes, the machete and three empanadas (${finds.join(', ')})`, finds.length === 6 && ['chullo', 'panpipes', 'machete', 'empanada1', 'empanada2', 'cake'].every((n) => finds.includes(n)));
  check('the three key items still count on the pause screen, the snacks three fewer than the six empanadas there were', WORLD.progress.keyItems.length === 19 && WORLD.progress.cakes.length === 20);
  check('the Amazon\'s four rooms show one name, THE RAINFOREST, as the sewer\'s six show SEWERAGE WORKS; the drop\'s and Machu Picchu\'s their own',
    [AND.canopy, AND.kapok, AND.sandbar, AND.roots].every((id) => WORLD.sectorNames[WORLD.sectorIdx[id] ?? 0]?.text === 'THE RAINFOREST')
    && ([[AND.jump, 'JUMP FOR JOY'], [AND.gorge, 'CONDOR COUNTRY'], [AND.terraces, 'NO PROBLLAMA'], [AND.picchu, 'MACHU PICCHU']] as const).every(([id, t]) => WORLD.sectorNames[WORLD.sectorIdx[id] ?? 0]?.text === t)
    && ANDES_SECTORS.length === 12);
  const rooms = creatureRooms(ANDES_ROOMS);
  const most = Math.max(...[...rooms.values()].map((v) => v.size));
  check(`${rooms.size} kinds of creature in the region (and the piranha, a thing on a path), none in more than two rooms (${[...rooms.values()].map((v) => v.size).join(' ')}), every kind of the region's art in a room`,
    rooms.size === Object.keys(ANDES_CREATURES).length && rooms.size === 9 && most <= 2);
  const used = [...HAT_BLOCKS, ...Object.values(SPRITE), ...Object.values(SIB_SPRITE), ...Object.values(CHINA_SPRITE), ...Object.values(DRAGON_POINTERS), ...Object.values(JAPAN_SPRITE), ...Object.values(PAC_SPRITE), ...Object.values(ANDES_SPRITE), ...Object.values(CANOPY_POINTERS), ...BOULDER_POINTERS, ...LEAP_POINTERS];
  check(`every block of the bank the Andes use is its own (${used.length} pointers with every earlier region's and the hats', none twice, none Monty's) and each has a picture there`,
    new Set(used).size === used.length && used.every((p) => p < 0x50 || p > 0x73) && [...Object.values<number>(ANDES_SPRITE), ...Object.values(CANOPY_POINTERS), ...BOULDER_POINTERS, ...LEAP_POINTERS].every((p) => WORLD.bankImage.subarray(p * 64, p * 64 + 63).some((b) => b !== 0)));
  const crowded = overCrowded(ANDES_ROOMS);
  check(`no room has a fourth creature (sprite 7 is the worn chullo's; ${crowded.length ? `rooms ${crowded.join()}` : 'none do'})`, crowded.length === 0);
  check('Monty on the Run is as it was (no flight rooms, no boulders, no vines, no canopy)', MOTR.flights.length === 0 && MOTR.rollers.length === 0 && MOTR.vines.length === 0 && MOTR.canopy === null);
  const rollersIn = (room: number) => WORLD.rollers.filter((r) => r.room === room).length;
  check('the flight rooms are the drop\'s two, the boulders Machu Picchu\'s three, the leaping piranhas one in the river and two at the roots, the vines one and two, the rotten logs the river\'s five cells',
    WORLD.flights.map((f) => f.room).join() === [AND.jump, AND.gorge].join() && rollersIn(AND.picchu) === 3 && rollersIn(AND.sandbar) === 1 && rollersIn(AND.roots) === 2
    && WORLD.vines.filter((v) => v.room === AND.sandbar).length === 1 && WORLD.vines.filter((v) => v.room === AND.roots).length === 2 && WORLD.vines.length === 3
    && WORLD.cracks.filter((c) => c.room === AND.sandbar).length === 5 && LOG_CRACKS.length === 5);
  const crowdedRollers = ANDES_ROOMS.filter((r) => new Set(WORLD.rollers.filter((b) => b.room === r.id).map((b) => b.sprite)).size !== rollersIn(r.id) || WORLD.rollers.some((b) => b.room === r.id && b.sprite === 1 && (r.cake !== undefined)));
  check('no two things on paths share a sprite in a room, and none takes sprite 1 where a room shows two finds', crowdedRollers.length === 0);
  // the open block: like the sewer, under a quarter solid, its lianas a lattice
  const share = (id: number) => { let n = 0; for (let r = 0; r < 20; r++) for (let c = 0; c < 32; c++) if (solid(id, c, r)) n++; return n / 640; };
  const ropes = (id: number) => { const r = roomOf(id); let n = 0; for (const line of r.map) for (const ch of line) if (ch !== '.' && WORLD.tileProperty(r.tiles[Number(ch) - 1] ?? 0) === 3) n++; return n; };
  check(`the canopy is the open space, as the sewer is: under a quarter solid (${Math.round(share(AND.canopy) * 100)}%), a lattice of ${ropes(AND.canopy)} rope cells (60-100)`, share(AND.canopy) < 0.25 && ropes(AND.canopy) >= 60 && ropes(AND.canopy) <= 100);
  check(`and Machu Picchu before it, its tunnel the region's squeeze, is the most solid room of all (${Math.round(share(AND.picchu) * 100)}%; the block's ${[AND.canopy, AND.kapok, AND.sandbar, AND.roots].map((id) => Math.round(share(id) * 100)).join('% ')}%, water and ground counted)`,
    ANDES_ROOMS.every((r) => r.id === AND.picchu || share(r.id) < share(AND.picchu)));
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
  check(`he steers at his walking pace, a pixel a frame (${px(r.g) - rx} pixels in 40 frames)`, Math.abs(px(r.g) - rx - 40) <= 2);
  const up = at(AND.jump, 5, 8);
  run(up, UP, 40);
  check('up held alone he does not rise (only an updraft lifts him)', up.g.y >= standY(8) + 20 - 4);
  const u = at(AND.jump, 10, 14);
  const uy = u.g.y;
  check('the updraft (columns 9-11 of the first room) is where the data says', spec.updrafts.length === 1 && inUpdraft(u.g, spec) && !inUpdraft(at(AND.jump, 6, 14).g, spec));
  run(u, NONE, 30);
  check(`in an updraft he is lifted a pixel a frame (${uy - u.g.y} pixels in 30 frames)`, Math.abs(uy - u.g.y - 30) <= 1);
  const ledge = at(AND.jump, 19, 12);
  run(ledge, NONE, 60);
  check(`a ledge holds him: he rests on the spire's snowy tip (floor 12, y ${ledge.g.y}), the canopy folded, alive`, ledge.g.y === standY(12) && !ledge.g.canopyShown && !dead(ledge.g));
  run(ledge, LEFT, 40);
  run(ledge, NONE, 20);
  check('and walks off its end into the air, the canopy open again, sinking', ledge.g.y > standY(12) && ledge.g.canopyShown);
  const sky = at(AND.jump, 6, 8);
  run(sky, NONE, 3);
  check(`the canopy is a sprite over him (sprite 2, level, colour ${CANOPY.colour}) and leans the way he steers`, sky.g.canopyShown && sprite2(sky.g) === CANOPY_POINTERS.level && (() => { run(sky, LEFT, 2); return sprite2(sky.g) === CANOPY_POINTERS.left && canopyFrame(sky.g) === CANOPY_POINTERS.left; })()
    && (() => { run(sky, RIGHT, 2); return sprite2(sky.g) === CANOPY_POINTERS.right; })());
  const ground = at(AND.terraces, 13, 12);
  run(ground, NONE, 10);
  check('outside the flight rooms there is no canopy and he stands on his feet', !ground.g.canopyShown && flightOf(ground.g) === undefined && ground.g.y === standY(12));
  const down = at(AND.jump, 10, 14);
  run(down, DOWN, 2);
  for (let f = 0; f < 400 && down.g.roomId !== AND.gorge; f++) frame(down, DOWN);
  check('out of the first flight room by the open bottom he comes into the gorge at its top, still under the canopy', down.g.roomId === AND.gorge && down.g.montyRow - 3 <= 4 && flightOf(down.g) !== undefined);
  // the gorge's foot is two throats either side of the pinnacle: the west one lands on the guardhouse's roof, the east one on the broad terrace, on his feet
  const land = (col: number) => { const s = at(AND.gorge, col, 17); for (let f = 0; f < 400 && s.g.roomId !== AND.terraces; f++) frame(s, DOWN); run(s, NONE, 150); return s; };
  const west = land(4), east = land(12);
  check(`down the west throat he lands on the guardhouse's roof (room ${west.g.roomId}, y ${west.g.y}, the roof's ${standY(5)}), down the east one on the broad terrace (y ${east.g.y}, ${standY(12)}), on his feet, alive`,
    west.g.roomId === AND.terraces && west.g.y === standY(5) && east.g.roomId === AND.terraces && east.g.y === standY(12) && !west.g.canopyShown && !dead(west.g) && !dead(east.g));
  check('the gorge\'s foot is open only at the two throats (cols 3-7 and 11-14), the pinnacle between them', [...Array(32).keys()].filter((c) => !solid(AND.gorge, c, 19)).join() === [3, 4, 5, 6, 7, 11, 12, 13, 14].join());
  const door = at(PAC.plane, 28, 16, [PARACHUTE]);
  run(door, RIGHT, 90);
  run(door, NONE, 2);
  check('with the parachute he walks out of the plane\'s rear door and the sky takes him: the first flight room, under the canopy', door.g.roomId === AND.jump && door.g.canopyShown);
  const shut = at(PAC.plane, 28, 16);
  run(shut, RIGHT, 90);
  check('without it the door is shut (he stops in the hold)', shut.g.roomId === PAC.plane);
  const back = at(AND.jump, 2, 16);
  run(back, LEFT, 60);
  check('the plane\'s ramp walks back into the hold (the door is the only opening on that side)', back.g.roomId === PAC.plane);
  const cond = at(AND.gorge, 13, 9, [], false, true);
  check(`a condor diving in the updraft's column kills him when it meets him (in ${diesAt(cond, NONE, 260)} frames)`, diesAt(at(AND.gorge, 13, 9, [], false, true), NONE, 260) >= 0);
  check('the flight shaft is one way: from the terraces the bot finds no way up into the gorge (40000 states)', search(at(AND.terraces, 4, 5, [], false, true), (g) => g.roomId === AND.gorge, undefined, 40000, 0) === null);
}

// ---- the boulders ---------------------------------------------------------------------------------------
{
  const path = polyline(BOULDER_PATH);
  const first = must(BOULDERS_OF_PICCHU[0], 'a boulder');
  const start = rollerAt(first, first.start);
  const mid = rollerAt(first, first.start + Math.floor(path.length / first.speed / 2));
  const gone = rollerAt(first, first.start + Math.ceil(path.length / first.speed) + 5);
  const again = rollerAt(first, first.start + first.every);
  check(`a boulder rolls from the hill's top at the east edge (${start ? Math.round(start.x) : '-'}, ${start ? Math.round(start.y) : '-'}) west and down a path ${Math.round(path.length)} pixels long at ${first.speed} a frame into the condor's gap, gone after it and back ${first.every} frames on; three a third of that apart`,
    start !== null && mid !== null && gone === null && again !== null && Math.abs((again?.x ?? 0) - (start?.x ?? 1)) < 1 && (mid?.y ?? 0) > (start?.y ?? 0) && BOULDERS_OF_PICCHU.map((b) => b.start).join() === '0,120,240');
  const hit = diesAt(at(AND.picchu, 21, 6), NONE, 360);
  check(`standing on the step in the boulders' way kills him when one comes (after ${hit} frames)`, hit >= 0 && hit < 360);
  check('on the plateau west of the gap nothing rolls: two whole periods there untouched', diesAt(at(AND.picchu, 9, 8), NONE, 720) < 0);
  let stood = 0, hopped = 0;
  for (let d = 0; d < 360; d += 12) {
    const wait = at(AND.picchu, 21, 6);
    run(wait, NONE, d);
    const standing = diesAt(wait, NONE, 90) >= 0;
    const hop = at(AND.picchu, 21, 6);
    run(hop, NONE, d);
    run(hop, JUMP, 3);
    if (standing) stood++;
    if (standing && diesAt(hop, NONE, 90) < 0) hopped++;
  }
  check(`a hop clears a boulder: of ${stood} moments in a period when one is on its way to the step he stands on, jumping as it comes saves him in ${hopped}`, stood > 0 && hopped > 0);
}

// ---- the vines and the rotten logs ---------------------------------------------------------------------------
{
  const roots = VINES.filter((v) => v.room === AND.roots);
  check(`A4's two vines hang from the leaves at columns ${roots.map((v) => v.col).join(' and ')}, half a swing apart; A3's one from the fig at column 7`, roots.length === 2 && roots[1]?.phase === 48 && VINES.find((v) => v.room === AND.sandbar)?.col === 7);
  const grabbed = (): { s: State; frames: number } => {
    const h = at(AND.roots, 2, 15);
    h.g.rollers = [];
    for (let f = 0; f < 400; f++) { frame(h, NONE); if (h.g.onRope && vineHeld(h.g)) return { s: h, frames: f }; }
    return { s: h, frames: -1 };
  };
  const hang = grabbed();
  check(`standing still at the sandbar's edge the first vine swings over and takes hold of him (after ${hang.frames} frames)`, hang.frames >= 0 && !dead(hang.s.g));
  const xs: number[] = [];
  for (let f = 0; f < 96; f++) { frame(hang.s, NONE); xs.push(px(hang.s.g)); }
  check(`hanging on it he is carried, ${Math.max(...xs) - Math.min(...xs)} pixels from one end of the swing to the other`, Math.max(...xs) - Math.min(...xs) >= 20 && !dead(hang.s.g));
  check('he lets go of a vine by a jump and goes the way it swings', (() => {
    const j = grabbed().s;
    let way = 0;
    for (let f = 0; f < 200 && !way; f++) { frame(j, NONE); const held = vineHeld(j.g); way = held ? vineWay(held.spec, held.state.t) : 0; }
    const x0 = px(j.g);
    for (let f = 0; f < 6; f++) frame(j, JUMP);
    run(j, NONE, 10);
    return way !== 0 && !j.g.onRope && (way > 0) === (px(j.g) - x0 > 0);
  })());
  check('the river is deadly: stepping off the sandbar into it kills him', diesAt(at(AND.roots, 3, 15), RIGHT, 80) >= 0);
  // the rotten logs: a crossing at his walk holds, a stop does not
  const [l0] = LOGS;
  const stop = at(AND.sandbar, must(l0, 'a log')[0], 16);
  stop.g.rollers = [];
  check(`a stop on a rotten log drops him into the river (it cracks after ${must(LOG_CRACKS[0], 'a crack').crack} frames and is gone after ${must(LOG_CRACKS[0], 'a crack').gone})`, diesAt(stop, NONE, 200) >= 0);
  const walk = at(AND.sandbar, 13, 16);
  walk.g.rollers = [];
  run(walk, LEFT, 2);
  check(`walking over the second log he is not let down (after 20 frames at his walk he is on it at col ${colOf(walk.g)}, alive)`, (() => { run(walk, LEFT, 18); return !dead(walk.g) && walk.g.y === standY(16); })());
}

// ---- the gates ---------------------------------------------------------------------------------------------
{
  const llama = (holds: readonly (readonly [number, number])[]) => at(AND.picchu, 4, 18, holds, false, true).g.enemies.filter((e) => e.x !== 0xff && e.type === must(at(AND.picchu, 4, 18, [], false, true).g.enemies[0], 'the llama').type).length;
  check('the spitting llama paces the tunnel\'s mouth until the panpipes are taken, then it is gone', llama([]) === 1 && llama([PANPIPES]) === 0);
  check('the spit gobs in front of the tunnel on a timing (it kills in the three cells before the mouth) and the panpipes calm it', diesAt(at(AND.picchu, 9, 18), NONE, 480) >= 0 && diesAt(at(AND.picchu, 9, 18, [PANPIPES]), NONE, 480) < 0);
  const walkIn = (holds: readonly (readonly [number, number])[]) => {
    const s = at(AND.picchu, 2, 18, holds, false, true);
    s.g.rollers = [];
    let died = -1;
    for (let f = 0; f < 260 && died < 0; f++) { frame(s, RIGHT); if (dead(s.g)) died = f; if (colOf(s.g) >= 19 && s.g.onRope) break; }
    if (died < 0) run(s, DOWN, 120);
    return { died, room: s.g.roomId };
  };
  check('without the panpipes walking into the tunnel kills him; with them he walks to the well, takes hold of its liana and climbs down into the canopy', walkIn([]).died >= 0 && walkIn([PANPIPES]).died < 0 && walkIn([PANPIPES]).room === AND.canopy);
  check('the tunnel is a wall without the panpipes: the bot finds no way from the lane into the canopy (150000 states, the creatures in)', search(at(AND.picchu, 2, 18, [], false, true), (g) => g.roomId === AND.canopy, undefined, 150000, 0) === null);
  const tangle = (holds: readonly (readonly [number, number])[]) => at(AND.roots, 20, 15, holds);
  check('the tangle fills the root arch (six cells) until the machete is taken, then it is gone', TANGLE_CELLS.length === 6 && TANGLE_CELLS.every(([row, col]) => cell(tangle([]).g, col, row) !== 0 && cell(tangle([MACHETE]).g, col, row) === 0));
  check('without the machete the bot finds no way from the east bank under the roots onto the jetty or out to Rio (100000 states)',
    search(tangle([]), (g) => (g.roomId === AND.roots && colOf(g) >= 26 && g.y === standY(15)) || g.roomId === 74, undefined, 100000, 0) === null);
  check('with it he walks through the arch onto the jetty', reach(tangle([MACHETE]), { room: AND.roots, col: 28, row: 13 }, (g) => g.roomId === AND.roots && colOf(g) >= 27 && g.y === standY(15)));
}

// ---- the one-way pieces and the loops (proofs by search) ------------------------------------------------------
{
  // the bough holds the machete: reached only down the hollow (from the crown), never from the bank, the river or the sandbar
  const onBough = (g: Game) => g.roomId === AND.roots && g.y === standY(7) && colOf(g) >= 18 && colOf(g) <= 24;
  check('the bough is reached only down the hollow: from the east bank, the bot finds no way up onto it (it is 8 rows up, no rope; 120000 states)', search(at(AND.roots, 20, 15), onBough, undefined, 120000, 0) === null);
  check('from the sandbar either, the way back up into the canopy shut (100000 states)', search(shutOff(at(AND.sandbar, 22, 15), 5, 21), onBough, undefined, 100000, 0) === null);
  check('down the hollow from the crown he lands in it and walks out onto the bough', reach(at(AND.kapok, 23, 4), { room: AND.roots, col: 21, row: 5 }, onBough));
  check('and the hollow is one way: from the bough the bot finds no way back up into the kapok (60000 states)', search(at(AND.roots, 21, 7), (g) => g.roomId === AND.kapok, undefined, 60000, 0) === null);
  // the high ledge: reached only from Machu Picchu's plateau
  const onLedge = (g: Game) => g.roomId === AND.terraces && g.y === standY(8) && colOf(g) >= 22;
  check('the terraces\' high ledge is out of reach from the terraces: the way east to Machu Picchu shut, the bot finds no way onto it from the top terrace (100000 states)', search(shutOff(at(AND.terraces, 6, 8), 4, 21), onLedge, undefined, 100000, 0) === null);
  check('it is the plateau that runs out onto it, west from Machu Picchu', reach(at(AND.picchu, 2, 8), { room: AND.terraces, col: 27, row: 6 }, onLedge));
  check('and off its west end he drops onto the last step, from where the terraces climb back up to the top terrace (the chullo\'s, never a dead end)',
    reach(at(AND.terraces, 23, 8), { room: AND.terraces, col: 4, row: 6 }, (g) => g.roomId === AND.terraces && g.y === standY(8) && colOf(g) <= 7));
  // the kapok's floor is closed but for the hollow
  check('the kapok\'s floor (its bottom row) is closed but for the hollow, cols 26-28', [...Array(32).keys()].filter((c) => !solid(AND.kapok, c, 19)).join() === '26,27,28');
  // every fall through the canopy's floor lands on his feet, never in the water
  const openBelow = [...Array(31).keys()].filter((c) => !solid(AND.canopy, c, 19) && !solid(AND.canopy, c + 1, 19));
  const falls = openBelow.map((c) => {
    const s = at(AND.canopy, c, 19);
    s.g.enemies = []; s.g.rollers = []; s.g.onRope = 0;
    s.g.y = standY(19) - 12;
    for (let f = 0; f < 300 && (s.g.roomId !== AND.sandbar || s.g.falling) && !s.g.onRope; f++) frame(s, NONE);
    run(s, NONE, 4);
    return { c, ok: !dead(s.g) && (s.g.onRope !== 0 || (s.g.roomId === AND.sandbar && (s.g.y === standY(15) || s.g.y === standY(16)))) };
  });
  check(`every fall through the canopy's floor (open at cols ${openBelow.join(' ')}) lands him standing on the sandbar or the second log, or on the long liana, never in the river (${falls.filter((f) => !f.ok).map((f) => f.c).join(' ') || 'all'})`,
    openBelow.length >= 10 && falls.every((f) => f.ok));
  // the loops
  check('Machu Picchu is a loop: the lane, the ladder up to the plateau, west onto the terraces\' high ledge, down the terraces to the low path, east into the lane again',
    reach(at(AND.picchu, 2, 18), { room: AND.picchu, col: 2, row: 6 }, (g) => g.roomId === AND.picchu && g.y === standY(8))
    && reach(at(AND.picchu, 2, 8), { room: AND.terraces, col: 27, row: 6 }, onLedge)
    && reach(at(AND.terraces, 23, 8), { room: AND.terraces, col: 24, row: 16 }, (g) => g.roomId === AND.terraces && g.y === standY(18))
    && reach(at(AND.terraces, 24, 18), { room: AND.terraces, col: 31, row: 16 }, (g) => g.roomId === AND.picchu));
  check('the Amazon is a loop: the roots back over the vines to the sandbar, up the long liana into the canopy, the walkway east to the kapok, down the hollow into the roots',
    reach(at(AND.roots, 20, 15), { room: AND.roots, col: 0, row: 13 }, (g) => g.roomId === AND.sandbar, 400000)
    && reach(at(AND.sandbar, 21, 15), { room: AND.sandbar, col: 20, row: 0 }, (g) => g.roomId === AND.canopy)
    && reach(at(AND.canopy, 23, 4), { room: AND.canopy, col: 31, row: 2 }, (g) => g.roomId === AND.kapok)
    && reach(at(AND.kapok, 23, 4), { room: AND.kapok, col: 27, row: 19 }, (g) => g.roomId === AND.roots));
  check('the well\'s liana goes both ways: up from the canopy into the tunnel', reach(at(AND.canopy, 22, 14, [PANPIPES]), { room: AND.canopy, col: 20, row: 0 }, (g) => g.roomId === AND.picchu));
  check('a fall off the kapok\'s walkway is no trap: from its low boughs he walks west into the canopy and down to the sandbar', reach(at(AND.kapok, 8, 16), { room: AND.canopy, col: 28, row: 16 }, (g) => g.roomId === AND.sandbar));
}

// ---- fairness: from several starts (the room's timings run a while before he comes in), the crossing is there -------------------------
{
  const fair = (label: string, make: () => State, aim: { room: number; col: number; row: number }, goal: (g: Game) => boolean) => {
    const ok = [0, 37, 74, 111, 148].filter((wait) => { const s = make(); run(s, NONE, wait); return reach(s, aim, goal, 400000); }).length;
    check(`fair from every start: ${label} (${ok} of 5 starts)`, ok === 5);
  };
  fair('the roots\' vines and log, the sandbar to the east bank', () => at(AND.roots, 2, 15, [], false, true), { room: AND.roots, col: 20, row: 13 }, (g) => g.roomId === AND.roots && colOf(g) >= 18 && g.y === standY(15));
  fair('back over them, the east bank to the sandbar', () => at(AND.roots, 20, 15, [], false, true), { room: AND.roots, col: 0, row: 13 }, (g) => g.roomId === AND.sandbar);
  fair('the river\'s rotten logs and vine, the sandbar to the fig\'s pocket', () => at(AND.sandbar, 22, 15, [], false, true), { room: AND.sandbar, col: 2, row: 13 }, (g) => g.roomId === AND.sandbar && colOf(g) <= 2 && g.y === standY(15));
  fair('and back', () => at(AND.sandbar, 1, 15, [], false, true), { room: AND.sandbar, col: 20, row: 13 }, (g) => g.roomId === AND.sandbar && colOf(g) >= 18 && g.y === standY(15));
  fair('Machu Picchu\'s hill against the boulders, the plateau to the Intihuatana', () => at(AND.picchu, 2, 8, [], false, true), { room: AND.picchu, col: 26, row: 2 }, (g) => g.roomId === AND.picchu && colOf(g) >= 25 && g.y === standY(4));
  fair('the terraces past the llama and the cuy to the low path', () => at(AND.terraces, 12, 12, [], false, true), { room: AND.terraces, col: 31, row: 16 }, (g) => g.roomId === AND.picchu);
  fair('the walkway under the anaconda and past the jaguar into the hollow', () => at(AND.kapok, 2, 4, [], false, true), { room: AND.kapok, col: 27, row: 19 }, (g) => g.roomId === AND.roots);
  fair('the gorge\'s condors to the shelf', () => at(AND.gorge, 6, 2, [], false, true), { room: AND.gorge, col: 24, row: 6 }, (g) => g.roomId === AND.gorge && g.y === standY(8) && colOf(g) >= 22);
}

// ---- the chullo ---------------------------------------------------------------------------------------------
{
  const worn = chulloWorn(WORLD.bankImage);
  const chullo = itemIndex(newGame(WORLD, false).g, ...CHULLO_AT);
  const s = newGame(WORLD, false);
  wear(s.g, chullo);
  check('putting on the chullo writes its pictures over Monty\'s', s.g.worn === chullo && worn.monty.length > 0 && worn.monty.every((m) => s.g.mem.slice(m.ptr * 64, m.ptr * 64 + 63).every((b, i) => b === m.block[i])));
  const play = at(AND.picchu, 2, 8, []);
  wear(play.g, chullo);
  run(play, NONE, 5);
  check(`the chullo is a sprite of its own over him (sprite 7, colour ${CHULLO_COLOUR}), enabled`, (play.g.vic.enable & 0x80) !== 0 && play.g.scol[7] === CHULLO_COLOUR && HAT_BLOCKS.includes(play.g.sptr[7] ?? 0));
  check('the three key items and the empanada have pictures of their own', [ANDES_ITEMS.chullo, ANDES_ITEMS.panpipes, ANDES_ITEMS.machete, ANDES_ITEMS.empanada].every((i) => i.block.some((b) => b !== 0)));
  const two = at(AND.terraces, 5, 8, [], false, true);
  run(two, NONE, 4);
  check('the terraces show both their finds at once: the chullo in the guardhouse and the empanada on the high ledge (sprites 0 and 1)', (two.g.vic.enable & 3) === 3 && [two.g.sptr[0], two.g.sptr[1]].sort().join() === [ANDES_SPRITE.chullo, ANDES_SPRITE.empanada].sort().join());
  check('the ledge\'s empanada is a 200 point snack like the others', itemIndex(two.g, AND.terraces, LEDGE_EMPANADA) >= 0 && WORLD.progress.cakes.includes(itemIndex(two.g, AND.terraces, LEDGE_EMPANADA)));
}

// ---- hints, the map, saves --------------------------------------------------------------------------------
{
  const wants = [[AND.picchu, 2, 18, 'THE LLAMA IS CROSS: CALM IT'], [AND.roots, 20, 15, 'THE UNDERGROWTH IS TOO THICK']] as const;
  for (const [room, col, floor, text] of wants) {
    const w = at(room, col, floor, [], true);
    run(w, NONE, 120);
    check(`ENHANCED: coming into room ${room} without what it wants says so ("${rowText(w.g)}")`, rowText(w.g) === text);
  }
  const plain = at(AND.picchu, 2, 18, [], false);
  run(plain, NONE, 120);
  check('ORIGINAL says only the place\'s name', rowText(plain.g) === 'MACHU PICCHU');
  check('no hint is left for what the rebuild took out (the captain, the snake)', WORLD.hints?.wanted.every((w) => !/CAPTAIN|SNAKE/.test(w.text)) ?? true);
  for (const [item, text, col, floor] of [[CHULLO_AT, 'A CHULLO: LOOK LIKE A LOCAL', 5, 8], [PANPIPES, 'PANPIPES: MUSIC CALMS BEASTS', 27, 4], [MACHETE, 'MACHETE: HACKS THROUGH VINES', 23, 7]] as const) {
    const [room, nth] = item;
    const take = at(room, col, floor, [], true);
    take.g.rollers = [];
    for (let f = 0; f < 160 && !take.g.siCollected[itemIndex(take.g, room, nth)]; f++) frame(take, LEFT);
    run(take, NONE, 3);
    check(`ENHANCED: taking the ${text.split(':')[0]?.toLowerCase()} says what it is for ("${rowText(take.g)}")`, rowText(take.g) === text && take.g.siCollected[itemIndex(take.g, room, nth)] !== 0);
  }

  const s = newGame(WORLD, true);
  const info = montyMap.info(s.g, { rooms: {} });
  check(`the pause screen counts the snacks and the items (${info.join(' | ')})`, info[3] === 'SNACKS 0/20' && info[2] === 'ITEMS  0/19');
  enterRoom(s.g, AND.picchu, 0x40, standY(8));
  const places = montyMap.places({ x: 0, y: 0, w: 200, h: 150 }, s.g, { rooms: { [AND.picchu]: [0x40, 0xb2, 4, 21], [AND.terraces]: [0x40, 0xb2, 4, 20] } });
  check('in the Andes the map shows its region, the rooms he has been to are places to go', places.length === 2 && places.every((p) => p.x >= 0 && p.x < 200 && p.y >= 0 && p.y < 150));

  // a save made on coming into each of the region's rooms (every key taken, the chullo on) carries on in the same room, alive
  const spots = [[AND.jump, 1, 16], [AND.gorge, 6, 6], [AND.terraces, 5, 8], [AND.picchu, 2, 8], [AND.canopy, 24, 4], [AND.kapok, 2, 4], [AND.sandbar, 22, 15], [AND.roots, 20, 15]] as const;
  const failed: number[] = [];
  const carried = spots.filter(([room, col, floor]) => {
    const a = newGame(WORLD, false);
    for (const [r, n] of [CHULLO_AT, PANPIPES, MACHETE]) a.g.siCollected[itemIndex(a.g, r, n)] = 0x81;
    wear(a.g, itemIndex(a.g, ...CHULLO_AT));
    enterRoom(a.g, room, 0x0c + (col + 4) * 4, standY(floor));
    for (let n = 0; n < 200 && (a.g.freeze || a.g.script); n++) frame(a, NONE);
    const b = newGame(WORLD, false);
    restore(b.g, CODEC.unpack(CODEC.pack(snapshot(a.g)), CODEC.format));
    run(b, NONE, 4);
    const cut = room === AND.roots ? TANGLE_CELLS.every(([row, c]) => cell(b.g, c, row) === 0) : true;
    b.g.enemies = []; b.g.enable &= 0x0f; b.g.vic.enable &= 0x0f; b.g.rollers = [];
    run(b, NONE, 60);
    const ok = cut && b.g.roomId === room && !dead(b.g) && b.g.worn === itemIndex(b.g, ...CHULLO_AT);
    if (!ok) { failed.push(room); console.log(`   room ${room}: now in ${b.g.roomId}, dead ${dead(b.g)}, worn ${b.g.worn}, at ${colOf(b.g)},${b.g.y}`); }
    return ok;
  }).length;
  check(`a save made on coming into each of the region's eight rooms packs, unpacks and carries on in the same room, alive, in the chullo (${carried} of ${spots.length}${failed.length ? `; not in rooms ${failed.join(', ')}` : ''})`, carried === spots.length);
}

finish();
