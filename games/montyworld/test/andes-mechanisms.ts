/**
 * The Andes and the Amazon's mechanisms, headless, each on its own with the room's creatures out of the way unless it says so (the bot, andes.ts, plays them all together; docs/dosvidaniya-reset.md is the plan): the
 * parachute's flight (a slow sink, the dive, the steering, the updrafts' lift, a ledge to rest on, the canopy over him, only in the two flight rooms) and the drop's two landings, the boulders on Machu Picchu's hill,
 * the spitting llama and its spit (the panpipes' gate), the vines, the rotten logs, the tangle on the kapok's branch (the machete's gate), the Amazon's route proved by search (the canopy left only down its lattice,
 * each river crossed only on its vines, the kapok entered only from the river, the machete only off the walkway), the high ledge only from the plateau, the tunnel a wall without the panpipes, the loops, fairness
 * from several starts, the hints, the map and a save in each room.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/andes-mechanisms.ts [--room <rooms>] [--record]
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
import { ANDES_SCENERY_CREATURES } from '../src/art/andes-scenery';
import { ANDES_ITEMS, CANOPY } from '../src/art/andes-items';
import { chulloWorn, CHULLO_COLOUR } from '../src/art/andes-hat';
import { AND, ANDES_ROOMS, ANDES_SECTORS, BOULDER_PATH, BOULDERS_OF_PICCHU, LOG_CRACKS, LOGS, TANGLE_CELLS, VINES } from '../src/andes';
import { ANDES_SPRITE, BOULDER_POINTERS, CANOPY_POINTERS, LEAP_POINTERS } from '../src/andes-pointers';
import { WORLD } from '../src/data';
import { HAT_BLOCKS } from '../src/hats';
import { CODEC } from '../src/main';
import { PAC, PAC_SPRITE } from '../src/pacific';
import { RIO_FIRST } from '../src/rio';
import { SPRITE } from '../src/moscow';
import { SIB_SPRITE } from '../src/siberia';
import { CHINA_SPRITE, DRAGON_POINTERS } from '../src/china-pointers';
import { JAPAN_SPRITE } from '../src/japan-pointers';
import { newGame } from '../../shared/monty/test/bot';
import { ROW, SCREEN } from '../../shared/monty/screen';
import { search } from './search';
import { cell, colOf, dead, diesAt, LEFT, overCrowded, RIGHT, at, rowText, run } from './mech-kit';
import { coinIndex, creatureRooms, itemIndex, standY } from './route';
import { SCOPE } from './scope';
import { CHULLO, LEDGE_EMPANADA } from './andes-route';

const DOWN = { ...NONE, down: true };
const UP = { ...NONE, up: true };
const JUMP = { ...NONE, fire: true };
/** The items by where they are (the room's nth). */
const CHULLO_AT = [AND.terraces, CHULLO] as const, PANPIPES = [AND.picchu, 0] as const, MACHETE = [AND.boat, 0] as const;

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
/** A game whose room's vines are taken down (their cells as they were under them): what he can reach without riding one. */
const noVines = (s: State): State => {
  for (const v of s.g.vines) for (const [at, chr, colour] of v.cells) { s.g.mem[SCREEN + at] = chr; s.g.col[at] = colour; }
  s.g.vines = [];
  return s;
};
/** The room he is in has him at its cell of the exit grid (the region's rooms by their cells). */
const cellOf = (id: number): readonly [row: number, col: number] => { const r = roomOf(id); return [r.row, r.col]; };

// ---- the data -------------------------------------------------------------------------------------
SCOPE.section([], 'the data', () => {
  const cells = WORLD.exitGrid.image;
  const cols = WORLD.exitGrid.cols;
  const grid = (row: number, col: number) => cells[row * cols + col];
  const placed = [[2, 25, AND.jump], [3, 25, AND.thin], [4, 25, AND.gorge], [5, 25, AND.terraces], [5, 26, AND.picchu], [5, 27, AND.bridge], [6, 25, AND.cloud], [6, 26, AND.canopy], [6, 27, AND.kapok],
    [7, 25, AND.vine], [7, 26, AND.sandbar], [7, 27, AND.roots], [7, 28, AND.boat], [7, 29, AND.ends]] as const;
  check('the Andes and the Amazon are fourteen rooms: the drop (three) down column 25, Machu Picchu and the Inca bridge beside its foot, the Amazon a U under them, the riverboat east of the roots and the last bank east of her, east of Hawaii past the flight\'s gap (column 24 empty)',
    placed.every(([r, c, id]) => grid(r, c) === id) && ANDES_ROOMS.length === 14 && grid(3, 23) === PAC.hilo && [0, 1, 2, 3, 4, 5, 6, 7].every((r) => grid(r, 24) === 0xff) && WORLD.exitGrid.rows === 8);
  check('the ids of the rooms kept are as they were (55-59; 62, 63, 65, 66), OUT OF THIN AIR and THE RIVER QUEEN back as their own 56 and 64, the new rooms 83-85 and THE RIVER ENDS 94; 60, 61 and 78 are no room\'s',
    [...cells].every((c) => ![60, 61, 78].includes(c)) && ANDES_ROOMS.every((r) => [55, 56, 57, 58, 59, 62, 63, 64, 65, 66, 83, 84, 85, 94].includes(r.id)));
  const coins = ANDES_ROOMS.map((r) => r.coins?.length ?? 0);
  check(`18 coins in 14 rooms, never more than 2 a room, each with its reason (${coins.join(' ')})`, coins.reduce((a, b) => a + b, 0) === 18 && coins.every((n) => n <= 2));
  const finds = ANDES_ROOMS.flatMap((r) => [...(r.cake ? ['cake'] : []), ...(r.item ? [r.item.name] : []), ...(r.item2 ? [r.item2.name] : [])]);
  check(`ten finds: the chullo, the panpipes, the machete and seven empanadas (${finds.join(', ')})`, finds.length === 10 && ['chullo', 'panpipes', 'machete', 'empanada1', 'empanada2', 'empanada3', 'empanada4', 'empanada5', 'empanada6', 'cake'].every((n) => finds.includes(n)));
  const index = (room: number, nth: number) => itemIndex(newGame(WORLD, false).g, room, nth);
  check('the chullo, the panpipes and the machete count among the pause screen\'s items, the seven empanadas among its snacks',
    [CHULLO_AT, PANPIPES, MACHETE].every(([r, n]) => WORLD.progress.keyItems.includes(index(r, n))) && [[AND.terraces, LEDGE_EMPANADA], [AND.gorge, 0], [AND.sandbar, 0], [AND.bridge, 0], [AND.vine, 0], [AND.boat, 1], [AND.ends, 0]].every(([r, n]) => WORLD.progress.cakes.includes(index(r ?? 0, n ?? 0))));
  const NAMED = [[AND.jump, 'JUMP FOR JOY'], [AND.thin, 'OUT OF THIN AIR'], [AND.gorge, 'CONDOR COUNTRY'], [AND.terraces, 'NO PROBLLAMA'], [AND.picchu, 'MACHU PICCHU'], [AND.bridge, 'THE INCA BRIDGE'],
    [AND.canopy, 'THE CANOPY'], [AND.cloud, 'CLOUD NINE'], [AND.vine, 'VINE AND DANDY'], [AND.sandbar, 'UP THE CREEK'], [AND.roots, 'THE ROOTS'], [AND.kapok, 'BRANCHING OUT'], [AND.boat, 'THE RIVER QUEEN'], [AND.ends, 'THE RIVER ENDS']] as const;
  const shown = (id: number) => WORLD.sectorNames[WORLD.sectorIdx[id] ?? 0]?.text;
  check(`every room shows a name of its own (${NAMED.filter(([id, t]) => shown(id) !== t).map(([id]) => `${id}: ${shown(id)}`).join(', ') || 'all fourteen'})`, NAMED.every(([id, t]) => shown(id) === t) && ANDES_SECTORS.length === 12);
  const rooms = creatureRooms(ANDES_ROOMS);
  const most = Math.max(...[...rooms.values()].map((v) => v.size));
  check(`${rooms.size} kinds of creature in the region (and the piranha, a thing on a path), none in more than two rooms (${[...rooms.values()].map((v) => v.size).join(' ')}), every kind of the region's art in a room`,
    rooms.size === Object.keys(ANDES_CREATURES).length + Object.keys(ANDES_SCENERY_CREATURES).length && rooms.size === 13 && most <= 2);
  const used = [...HAT_BLOCKS, ...Object.values(SPRITE), ...Object.values(SIB_SPRITE), ...Object.values(CHINA_SPRITE), ...Object.values(DRAGON_POINTERS), ...Object.values(JAPAN_SPRITE), ...Object.values(PAC_SPRITE).filter((p) => p !== PAC_SPRITE.moonRock), ...Object.values(ANDES_SPRITE), ...Object.values(CANOPY_POINTERS), ...BOULDER_POINTERS, ...LEAP_POINTERS];
  check(`every block of the bank the Andes use is its own (${used.length} pointers with every earlier region's and the hats', none twice, none Monty's; the moon rock borrows a boulder's block in Mauna Loa alone: roomBlocks) and each has a picture there`,
    new Set(used).size === used.length && used.every((p) => p < 0x50 || p > 0x73) && [...Object.values<number>(ANDES_SPRITE), ...Object.values(CANOPY_POINTERS), ...BOULDER_POINTERS, ...LEAP_POINTERS].every((p) => WORLD.bankImage.subarray(p * 64, p * 64 + 63).some((b) => b !== 0)));
  const crowded = overCrowded(ANDES_ROOMS);
  check(`no room has a fourth creature (sprite 7 is the worn chullo's; ${crowded.length ? `rooms ${crowded.join()}` : 'none do'})`, crowded.length === 0);
  check('Monty on the Run is as it was (no flight rooms, no boulders, no vines, no canopy)', MOTR.flights.length === 0 && MOTR.rollers.length === 0 && MOTR.vines.length === 0 && MOTR.canopy === null);
  const rollersIn = (room: number) => WORLD.rollers.filter((r) => r.room === room).length;
  check('the flight rooms are the drop\'s three, the boulders Machu Picchu\'s three, the leaping piranhas two in VINE AND DANDY, one in the creek and two at the roots, the vines three, one and two, the rotten logs the creek\'s five cells',
    WORLD.flights.map((f) => f.room).join() === [AND.jump, AND.thin, AND.gorge].join() && rollersIn(AND.picchu) === 3 && rollersIn(AND.vine) === 2 && rollersIn(AND.sandbar) === 1 && rollersIn(AND.roots) === 2
    && WORLD.vines.filter((v) => v.room === AND.vine).length === 3 && WORLD.vines.filter((v) => v.room === AND.sandbar).length === 1 && WORLD.vines.filter((v) => v.room === AND.roots).length === 2 && WORLD.vines.length === 6
    && WORLD.cracks.filter((c) => c.room === AND.sandbar).length === 5 && LOG_CRACKS.length === 5);
  const crowdedRollers = ANDES_ROOMS.filter((r) => new Set(WORLD.rollers.filter((b) => b.room === r.id).map((b) => b.sprite)).size !== rollersIn(r.id) || WORLD.rollers.some((b) => b.room === r.id && b.sprite === 1 && (r.cake !== undefined)));
  check('no two things on paths share a sprite in a room, and none takes sprite 1 where a room shows two finds', crowdedRollers.length === 0);
  // the open block: like the sewer, under a quarter solid, its lianas a lattice
  const share = (id: number) => { let n = 0; for (let r = 0; r < 20; r++) for (let c = 0; c < 32; c++) if (solid(id, c, r)) n++; return n / 640; };
  const ropes = (id: number) => { const r = roomOf(id); let n = 0; for (const line of r.map) for (const ch of line) if (ch !== '.' && WORLD.tileProperty(r.tiles[Number(ch) - 1] ?? 0) === 3) n++; return n; };
  check(`the canopy is the open space, as the sewer is: under a quarter solid (${Math.round(share(AND.canopy) * 100)}%), a lattice of ${ropes(AND.canopy)} rope cells (60-100)`, share(AND.canopy) < 0.25 && ropes(AND.canopy) >= 60 && ropes(AND.canopy) <= 100);
  const amazon = [AND.canopy, AND.cloud, AND.kapok, AND.vine, AND.sandbar, AND.roots];
  check(`and Machu Picchu before it, its tunnel the region's squeeze, is more solid than any room of the Amazon (${Math.round(share(AND.picchu) * 100)}%; the Amazon's ${amazon.map((id) => Math.round(share(id) * 100)).join('% ')}%, water and ground counted)`,
    amazon.every((id) => share(id) < share(AND.picchu)));
});

// ---- the parachute: flight --------------------------------------------------------------------------
SCOPE.section([AND.jump, AND.thin, AND.gorge, AND.terraces, AND.picchu], 'the parachute: flight', () => {
  SCOPE.section([AND.jump], 'flight in the first room: sink, dive, steering, updraft, ledge, canopy', () => {
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
  });
  SCOPE.section([AND.terraces], 'no canopy outside the flight rooms', () => {
    const ground = at(AND.terraces, 13, 12);
    run(ground, NONE, 10);
    check('outside the flight rooms there is no canopy and he stands on his feet', !ground.g.canopyShown && flightOf(ground.g) === undefined && ground.g.y === standY(12));
  });
  SCOPE.section([AND.jump, AND.thin], 'out of the first flight room into the canyon', () => {
    const down = at(AND.jump, 10, 14);
    run(down, DOWN, 2);
    for (let f = 0; f < 400 && down.g.roomId !== AND.thin; f++) frame(down, DOWN);
    check('out of the first flight room by the open bottom he comes into the canyon (OUT OF THIN AIR) at its top, still under the canopy', down.g.roomId === AND.thin && down.g.montyRow - 3 <= 4 && flightOf(down.g) !== undefined);
  });
  SCOPE.section([AND.thin, AND.gorge], 'the canyon: a course', () => {
    check('the canyon\'s foot is open only at the left canyon (cols 5-10): the ridge and the right canyon\'s floor shut the rest', [...Array(32).keys()].filter((c) => !solid(AND.thin, c, 19)).join() === [5, 6, 7, 8, 9, 10].join());
    const down = at(AND.thin, 7, 14);
    for (let f = 0; f < 400 && down.g.roomId !== AND.gorge; f++) frame(down, DOWN);
    check('down the left canyon he comes into the gorge at its top, still under the canopy', down.g.roomId === AND.gorge && flightOf(down.g) !== undefined);
    const floor = at(AND.thin, 23, 16);
    run(floor, NONE, 200);
    check(`a line that drifts right lands on the right canyon\'s floor (y ${floor.g.y}), alive, and its updraft lifts him back up over the ridge (the bot's way down from there is the probe in andes.ts)`, !dead(floor.g) && (floor.g.y === standY(18) || floor.g.y < standY(16)));
    check(`the canyon\'s diving condor kills him in the right canyon (in ${diesAt(at(AND.thin, 25, 12, [], false, true), NONE, 300)} frames)`, diesAt(at(AND.thin, 25, 12, [], false, true), NONE, 300) >= 0);
  });
  SCOPE.section([AND.jump], 'JUMP FOR JOY teaches the drop', () => {
    check('JUMP FOR JOY has no creatures: the room that teaches the drop', (roomOf(AND.jump).enemies ?? []).length === 0);
  });
  SCOPE.section([AND.gorge, AND.terraces], 'the gorge foot: two throats, two landings', () => {
    // the gorge's foot is two throats either side of the pinnacle: the west one lands on the guardhouse's roof, the east one on the broad terrace, on his feet
    const land = (col: number) => { const s = at(AND.gorge, col, 17); for (let f = 0; f < 400 && s.g.roomId !== AND.terraces; f++) frame(s, DOWN); run(s, NONE, 150); return s; };
    const west = land(4), east = land(12);
    check(`down the west throat he lands on the guardhouse's roof (room ${west.g.roomId}, y ${west.g.y}, the roof's ${standY(5)}), down the east one on the broad terrace (y ${east.g.y}, ${standY(12)}), on his feet, alive`,
      west.g.roomId === AND.terraces && west.g.y === standY(5) && east.g.roomId === AND.terraces && east.g.y === standY(12) && !west.g.canopyShown && !dead(west.g) && !dead(east.g));
    check('the gorge\'s foot is open only at the two throats (cols 3-7 and 11-14), the pinnacle between them', [...Array(32).keys()].filter((c) => !solid(AND.gorge, c, 19)).join() === [3, 4, 5, 6, 7, 11, 12, 13, 14].join());
  });
  SCOPE.section([AND.jump], 'JUMP FOR JOY shut to the west', () => {
    check('JUMP FOR JOY\'s west edge is the mountainside, solid all the way down (he drops in at its top from the bail-out; nothing west of it since the hold was cut)', [...Array(20).keys()].every((r) => solid(AND.jump, 0, r)));
  });
  SCOPE.section([AND.gorge], 'the gorge condor', () => {
    const cond = at(AND.gorge, 13, 9, [], false, true);
    check(`a condor diving in the updraft's column kills him when it meets him (in ${diesAt(cond, NONE, 260)} frames)`, diesAt(at(AND.gorge, 13, 9, [], false, true), NONE, 260) >= 0);
  });
  SCOPE.section([AND.terraces, AND.gorge, AND.picchu, AND.jump, AND.thin], 'the flight shaft is one way', () => {
    check('the flight shaft is one way: from the terraces the bot finds no way up into the gorge (40000 states)', search(at(AND.terraces, 4, 5, [], false, true), (g) => g.roomId === AND.gorge, undefined, 40000, 0) === null);
  });
});

// ---- the boulders ---------------------------------------------------------------------------------------
SCOPE.section([AND.picchu], 'the boulders', () => {
  const path = polyline(BOULDER_PATH);
  const first = must(BOULDERS_OF_PICCHU[0], 'a boulder');
  const start = rollerAt(first, first.start);
  const mid = rollerAt(first, first.start + Math.floor(path.length / first.speed / 2));
  const gone = rollerAt(first, first.start + Math.ceil(path.length / first.speed) + 5);
  const again = rollerAt(first, first.start + first.every);
  check(`a boulder tumbles off the mountain from above the hill's lip (${start ? Math.round(start.x) : '-'}, ${start ? Math.round(start.y) : '-'}) west and down a path ${Math.round(path.length)} pixels long at ${first.speed} a frame into the condor's gap, gone after it and back ${first.every} frames on; three a third of that apart`,
    start !== null && mid !== null && gone === null && again !== null && Math.abs((again?.x ?? 0) - (start?.x ?? 1)) < 1 && (mid?.y ?? 0) > (start?.y ?? 0) && BOULDERS_OF_PICCHU.map((b) => b.start).join() === '0,120,240');
  const hit = diesAt(at(AND.picchu, 21, 6), NONE, 360);
  check(`standing on the step in the boulders' way kills him when one comes (after ${hit} frames)`, hit >= 0 && hit < 360);
  check('they fall in at the lip of the top (col 24, above the screen first: seen falling) and roll only down the climb: on the top east of the lip, the way to the Inca bridge, nothing rolls in two whole periods',
    (BOULDER_PATH[0]?.[1] ?? 0) < 0 && Math.abs((BOULDER_PATH[0]?.[0] ?? 0) - 24.2) < 0.01 && diesAt(at(AND.picchu, 28, 4), NONE, 720) < 0);
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
});

// ---- the vines and the rotten logs ---------------------------------------------------------------------------
SCOPE.section([AND.roots, AND.sandbar], 'the vines and the rotten logs', () => {
  SCOPE.section([AND.roots, AND.sandbar], 'the vines', () => {
    const roots = VINES.filter((v) => v.room === AND.roots);
    check(`the roots' two vines hang from the leaves at columns ${roots.map((v) => v.col).join(' and ')}, half a swing apart; the creek's one from the canopy at column 9; VINE AND DANDY's three at 8, 16 and 24 as they were`, roots.length === 2 && roots[1]?.phase === 48 && VINES.find((v) => v.room === AND.sandbar)?.col === 9 && VINES.filter((v) => v.room === AND.vine).map((v) => v.col).join() === '8,16,24');
    const grabbed = (): { s: State; frames: number } => {
      const h = at(AND.roots, 5, 15);
      h.g.rollers = [];
      for (let f = 0; f < 400; f++) { frame(h, NONE); if (h.g.onRope && vineHeld(h.g)) return { s: h, frames: f }; }
      return { s: h, frames: -1 };
    };
    const hang = grabbed();
    check(`standing still at the west bank's edge the first vine swings over and takes hold of him (after ${hang.frames} frames)`, hang.frames >= 0 && !dead(hang.s.g));
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
    check('the river is deadly: stepping off the west bank into it kills him', diesAt(at(AND.roots, 3, 15), RIGHT, 120) >= 0);
    check('the roots\' west bank is eight cells wide (cols 0-7), the first piranha\'s leap three cells clear of its edge: the wait, the take and the landing are all in the room, no jump starts in the creek',
      [...Array(8).keys()].every((c) => solid(AND.roots, c, 15)) && Math.min(...(WORLD.rollers.find((r) => r.room === AND.roots && r.sprite === 1)?.path ?? [[0, 0]]).map(([c]) => c)) >= 8);
  });
  SCOPE.section([AND.sandbar], 'the rotten logs', () => {
    // the rotten logs: a crossing at his walk holds, a stop does not
    const [l0] = LOGS;
    const stop = at(AND.sandbar, must(l0, 'a log')[0], 16);
    stop.g.rollers = [];
    check(`a stop on a rotten log drops him into the river (it cracks after ${must(LOG_CRACKS[0], 'a crack').crack} frames and is gone after ${must(LOG_CRACKS[0], 'a crack').gone})`, diesAt(stop, NONE, 200) >= 0);
    const walk = at(AND.sandbar, 13, 16);
    walk.g.rollers = [];
    run(walk, LEFT, 2);
    check(`walking over the second log he is not let down (after 20 frames at his walk he is on it at col ${colOf(walk.g)}, alive)`, (() => { run(walk, LEFT, 18); return !dead(walk.g) && walk.g.y === standY(16); })());
  });
});

// ---- the gates ---------------------------------------------------------------------------------------------
SCOPE.section([AND.picchu, AND.terraces, AND.canopy, AND.kapok, AND.roots, AND.boat, AND.ends, RIO_FIRST], 'the gates', () => {
  SCOPE.section([AND.picchu, AND.terraces, AND.canopy], 'the llama, the spit and the tunnel', () => {
    const llamaType = must(at(AND.picchu, 4, 18, [], false, true).g.enemies[0], 'the llama').type;
    const llama = (holds: readonly (readonly [number, number])[], col: number, frames = 3) => {
      const s = at(AND.picchu, col, 18, holds, false, true);
      s.g.rollers = [];
      run(s, NONE, frames);
      return { n: s.g.enemies.filter((e) => e.x !== 0xff && e.type === llamaType).length, leaving: s.g.leaving.length, alive: !dead(s.g), line: rowText(s.g) };
    };
    const up = at(AND.picchu, 2, 8, [PANPIPES], false, true);
    run(up, NONE, 3);
    const near = llama([PANPIPES], 4), gone = llama([PANPIPES], 4, 240);
    const well = at(AND.picchu, 20, 18, [PANPIPES], false, true);
    well.g.rollers = [];
    run(well, NONE, 240);
    check(`the spitting llama paces the tunnel's mouth; with the panpipes it stays while he is off the lane (on the plateau: ${up.g.leaving.length} leaving), and once he comes down onto the lane he plays them and it trots off west up the lane, harmless, out of the room (after 240 frames: ${gone.n} left, he alive: ${gone.alive}), no words on the name row ("${gone.line}"); coming back up the well, east of it, the same`,
      llama([], 4).n === 1 && up.g.leaving.length === 0 && up.g.enemies.some((e) => e.x !== 0xff && e.type === llamaType) && near.n === 1 && near.leaving === 1 && gone.n === 0 && gone.leaving === 0 && gone.alive && !/LLAMA|PANPIPES/.test(gone.line)
      && !well.g.enemies.some((e) => e.x !== 0xff && e.type === llamaType) && !dead(well.g));
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
  });
  SCOPE.section([AND.kapok, AND.canopy, AND.roots, RIO_FIRST], 'the tangle and the machete', () => {
    const tangle = (holds: readonly (readonly [number, number])[]) => at(AND.kapok, 18, 8, holds);
    const cut = tangle([MACHETE]);
    const before = TANGLE_CELLS.every(([row, col]) => cell(cut.g, col, row) !== 0);
    run(cut, RIGHT, 40);
    check(`the tangle chokes the kapok's branch (six cells); with the machete it stands until he comes up to it, and there he cuts it away, seen (no words on the name row: "${rowText(cut.g)}")`,
      TANGLE_CELLS.length === 6 && TANGLE_CELLS.every(([row, col]) => cell(tangle([]).g, col, row) !== 0) && before && TANGLE_CELLS.every(([row, col]) => cell(cut.g, col, row) === 0) && !/MACHETE|HACK/.test(rowText(cut.g)));
    const past = (g: Game) => (g.roomId === AND.kapok && colOf(g) >= 27 && g.y === standY(8)) || g.roomId === RIO_FIRST;
    check('without the machete the bot finds no way along the branch past the tangle or out to Rio, from the branch or the low boughs (100000 states each)',
      search(tangle([]), past, undefined, 100000, 0) === null && search(at(AND.kapok, 20, 16), past, undefined, 100000, 0) === null);
    check('with it he walks along the branch out of the kapok into Rio\'s first room', reach(tangle([MACHETE]), { room: AND.kapok, col: 31, row: 7 }, (g) => g.roomId === RIO_FIRST));
  });
  SCOPE.section([AND.boat, AND.roots, AND.ends], 'the captain and the chullo', () => {
    const captainType = must(at(AND.boat, 1, 15, [], false, true).g.enemies[0], 'the captain').type;
    const captains = (holds: readonly (readonly [number, number])[], frames = 3) => {
      const s = at(AND.boat, 1, 15, holds, false, true);
      run(s, NONE, frames);
      return { n: s.g.enemies.filter((e) => e.x !== 0xff && e.type === captainType).length, leaving: s.g.leaving.length, line: rowText(s.g) };
    };
    const aboard = captains([CHULLO_AT]), off = captains([CHULLO_AT], 300);
    const stern = at(AND.boat, 30, 15, [CHULLO_AT], false, true);
    run(stern, NONE, 300);
    check(`the riverboat's captain paces the cargo deck; in the chullo (a local's hat), as he comes to the gangway, the captain walks off aft, out of the room (after 300 frames: ${off.n} left), no words on the name row ("${off.line}")`,
      captains([]).n === 1 && aboard.n === 1 && aboard.leaving === 1 && off.n === 0 && off.leaving === 0 && !/CAPTAIN|LOCAL/.test(off.line));
    check('coming back aboard at the stern from the last bank, in the chullo, the captain walks off past him the same (harmless)', !stern.g.enemies.some((e) => e.x !== 0xff && e.type === captainType) && !dead(stern.g));
    const machete = (g: Game) => g.siCollected[itemIndex(g, ...MACHETE)] !== 0;
    check('without the chullo the captain is a wall: from the bank the bot finds no way to the ladder, the top deck or the machete (150000 states, the creatures in)',
      search(at(AND.boat, 1, 15, [], false, true), (g) => g.roomId === AND.boat && (machete(g) || g.y <= standY(8) || colOf(g) >= 26), undefined, 150000, 0) === null);
    check('in it he walks past to the stern, up the ladder and west along the top deck to the machete', reach(at(AND.boat, 1, 15, [CHULLO_AT], false, true), { room: AND.boat, col: 12, row: 6 }, machete, 400000));
  });
});

// ---- the Amazon's route and the loops (proofs by search) ------------------------------------------------------
SCOPE.section([AND.canopy, AND.cloud, AND.picchu, AND.terraces, AND.gorge, AND.bridge, AND.vine, AND.sandbar, AND.kapok, AND.roots, AND.boat, AND.ends, RIO_FIRST], 'the Amazon route and the loops', () => {
  SCOPE.section([AND.canopy, AND.cloud, AND.picchu, AND.terraces, AND.vine, AND.kapok], 'the canopy left only west along its lattice', () => {
    // the canopy: the well's liana ends on the bough, and the only way on is west along the lattice into the cloud forest
    const elsewhere = (g: Game) => g.roomId !== AND.canopy && g.roomId !== AND.picchu;
    check('the canopy is left only west along its lattice: from the well\'s bough, the way west into CLOUD NINE shut, the bot finds no way into any other room of the Amazon (150000 states)',
      search(shutOff(at(AND.canopy, 20, 7), ...cellOf(AND.cloud)), elsewhere, undefined, 150000, 0) === null);
    check('and along it he comes into CLOUD NINE on its liana slung across', reach(at(AND.canopy, 20, 7), { room: AND.canopy, col: 0, row: 8 }, (g) => g.roomId === AND.cloud));
    check('the canopy\'s floor is closed all along (the gap under its west liana is gone), and its east side is shut (the kapok is reached from the river)',
      [...Array(32).keys()].every((c) => solid(AND.canopy, c, 19)) && [...Array(20).keys()].every((r) => solid(AND.canopy, 31, r)));
  });
  SCOPE.section([AND.cloud, AND.canopy, AND.vine, AND.sandbar], 'CLOUD NINE: down, west over the stream, down to the river', () => {
    check('from its slung liana down the hanging one to the forest floor', reach(at(AND.cloud, 26, 9), { room: AND.cloud, col: 20, row: 16 }, (g) => g.roomId === AND.cloud && g.y === standY(18)));
    check('and west over the stream\'s stones, down the west liana onto VINE AND DANDY\'s west bank', reach(at(AND.cloud, 22, 18), { room: AND.cloud, col: 2, row: 19 }, (g) => g.roomId === AND.vine && colOf(g) <= 4));
    check('the stream is deadly: walking into it from the bank kills him', diesAt(at(AND.cloud, 14, 18), LEFT, 120) >= 0);
    check('CLOUD NINE is left down only by its west liana: its floor is closed but round it (cols 1-3)', [...Array(32).keys()].filter((c) => !solid(AND.cloud, c, 19)).join() === '1,2,3');
  });
  SCOPE.section([AND.vine, AND.sandbar, AND.roots, AND.kapok, AND.cloud, AND.canopy, AND.picchu, AND.terraces], 'each river crossed only on its vines', () => {
    // each river is crossed on its vines: without them the bot finds no way over
    check('VINE AND DANDY is crossed only on its vines: with them taken down, from the west bank the bot finds no way to the east bank or beyond (100000 states)',
      search(noVines(at(AND.vine, 3, 15)), (g) => (g.roomId === AND.vine && colOf(g) >= 27 && g.y === standY(15)) || g.roomId === AND.sandbar, undefined, 100000, 0) === null);
    const onSandbar = (g: Game) => g.roomId !== AND.sandbar || (colOf(g) >= 18 && g.y === standY(15));
    check('the creek is crossed only on its vine: with it taken down, from the west bank the bot finds no way to the sandbar or beyond (100000 states)',
      search(noVines(at(AND.sandbar, 2, 15)), (g) => onSandbar(g) && g.roomId !== AND.vine, undefined, 100000, 0) === null);
    check('the roots\' river likewise: with its two vines taken down, from the west bank the bot finds no way to the east bank, the kapok or the boat (100000 states)',
      search(noVines(at(AND.roots, 3, 15)), (g) => (g.roomId === AND.roots && colOf(g) >= 21 && g.y === standY(15)) || g.roomId === AND.kapok || g.roomId === AND.boat, undefined, 100000, 0) === null);
  });
  SCOPE.section([AND.kapok, AND.roots, AND.sandbar, AND.boat, AND.canopy, AND.picchu, AND.terraces], 'the kapok entered only from the river', () => {
    check('the kapok is entered only from the river: from the roots, the liana up its flank shut, the bot finds no way into it (100000 states)',
      search(shutOff(at(AND.roots, 22, 15), ...cellOf(AND.kapok)), (g) => g.roomId === AND.kapok, undefined, 100000, 0) === null);
    check('the kapok\'s floor is closed but round the liana (cols 23-25)', [...Array(32).keys()].filter((c) => !solid(AND.kapok, c, 19)).join() === '23,24,25');
  });
  SCOPE.section([AND.kapok, AND.roots, AND.sandbar, AND.canopy, RIO_FIRST], 'the walkway reached only from the branch', () => {
    const onWalkway = (g: Game) => g.roomId === AND.kapok && g.y === standY(6);
    check('the walkway is reached only from the branch: from the low boughs, the branch taken away, the bot finds no way onto it (100000 states)',
      search((() => { const s = at(AND.kapok, 6, 16); for (let c = 15; c <= 31; c++) if (cell(s.g, c, 8) !== 0) s.g.setRoomChar((8 + 3) * ROW + c + 4, 0); return s; })(), onWalkway, undefined, 100000, 0) === null);
    check('with the branch, up the boughs and onto the walkway', reach(at(AND.kapok, 6, 16), { room: AND.kapok, col: 10, row: 4 }, onWalkway));
    check('a fall off the walkway is no trap: from the low boughs he climbs back up to the branch', reach(at(AND.kapok, 4, 16), { room: AND.kapok, col: 18, row: 6 }, (g) => g.roomId === AND.kapok && g.y === standY(8)));
  });
  // the high ledge: reached only from Machu Picchu's plateau
  const onLedge = (g: Game) => g.roomId === AND.terraces && g.y === standY(8) && colOf(g) >= 22;
  SCOPE.section([AND.terraces, AND.picchu, AND.gorge, AND.bridge], 'the high ledge only from the plateau', () => {
    check('the terraces\' high ledge is out of reach from the terraces: the way east to Machu Picchu shut, the bot finds no way onto it from the top terrace (100000 states)', search(shutOff(at(AND.terraces, 6, 8), ...cellOf(AND.picchu)), onLedge, undefined, 100000, 0) === null);
    check('it is the plateau that runs out onto it, west from Machu Picchu', reach(at(AND.picchu, 2, 8), { room: AND.terraces, col: 27, row: 6 }, onLedge));
    check('and off its west end he drops onto the last step, from where the terraces climb back up to the top terrace (the chullo\'s, never a dead end)',
      reach(at(AND.terraces, 23, 8), { room: AND.terraces, col: 4, row: 6 }, (g) => g.roomId === AND.terraces && g.y === standY(8) && colOf(g) <= 7));
    check('the top terrace ends at the mountainside drawn at its west end (cols 0-1 solid over it): a terrace that leads nowhere looks it', [0, 1].every((c) => [...Array(8).keys()].every((r) => solid(AND.terraces, c, r))));
  });
  SCOPE.section([AND.picchu, AND.terraces, AND.canopy, AND.bridge], 'Machu Picchu is a loop', () => {
    check('Machu Picchu is a loop: the lane, the ladder up to the plateau, west onto the terraces\' high ledge, down the terraces to the low path, east into the lane again',
      reach(at(AND.picchu, 2, 18), { room: AND.picchu, col: 2, row: 6 }, (g) => g.roomId === AND.picchu && g.y === standY(8))
      && reach(at(AND.picchu, 2, 8), { room: AND.terraces, col: 27, row: 6 }, onLedge)
      && reach(at(AND.terraces, 23, 8), { room: AND.terraces, col: 24, row: 16 }, (g) => g.roomId === AND.terraces && g.y === standY(18))
      && reach(at(AND.terraces, 24, 18), { room: AND.terraces, col: 31, row: 16 }, (g) => g.roomId === AND.picchu));
  });
  SCOPE.section([AND.picchu, AND.bridge], 'the Inca bridge: out along the trail and back', () => {
    check('from Machu Picchu\'s top he walks east onto the Inca trail, over the logs to its end, and back (a dead end that doubles back)',
      reach(at(AND.picchu, 28, 4), { room: AND.bridge, col: 27, row: 3 }, (g) => g.roomId === AND.bridge && colOf(g) >= 25 && g.y === standY(4))
      && reach(at(AND.bridge, 27, 4), { room: AND.bridge, col: 0, row: 3 }, (g) => g.roomId === AND.picchu && g.y === standY(4)));
    check('the trail is the only way in the room: its gap is bridged by the logs, nothing else of it reaches down (the valley far below is scenery)', [16, 17, 18].every((c) => solid(AND.bridge, c, 6)) && [...Array(32).keys()].every((c) => !solid(AND.bridge, c, 19) || c <= 1));
  });
  SCOPE.section([AND.canopy, AND.cloud, AND.vine, AND.sandbar, AND.roots, AND.kapok, AND.boat], 'the Amazon U and back', () => {
    check('the Amazon goes round as a U: from CLOUD NINE\'s floor west and down to VINE AND DANDY, east over it to the creek, over the creek to the roots, over the roots to the east bank, up into the kapok; and east along the bank to the boat and back',
      reach(at(AND.cloud, 22, 18), { room: AND.cloud, col: 2, row: 19 }, (g) => g.roomId === AND.vine)
      && reach(at(AND.vine, 3, 15), { room: AND.vine, col: 31, row: 13 }, (g) => g.roomId === AND.sandbar, 400000)
      && reach(at(AND.sandbar, 2, 15), { room: AND.sandbar, col: 31, row: 13 }, (g) => g.roomId === AND.roots, 400000)
      && reach(at(AND.roots, 3, 15), { room: AND.roots, col: 24, row: 0 }, (g) => g.roomId === AND.kapok, 400000)
      && reach(at(AND.roots, 22, 15), { room: AND.roots, col: 31, row: 13 }, (g) => g.roomId === AND.boat)
      && reach(at(AND.boat, 1, 15), { room: AND.boat, col: 0, row: 13 }, (g) => g.roomId === AND.roots));
    check('and back the other way: from the kapok down to the east bank, back over the roots and the creek, back over VINE AND DANDY to its west bank (CLOUD NINE\'s liana goes up again from it)',
      reach(at(AND.kapok, 20, 16), { room: AND.kapok, col: 24, row: 19 }, (g) => g.roomId === AND.roots)
      && reach(at(AND.roots, 22, 15), { room: AND.roots, col: 0, row: 13 }, (g) => g.roomId === AND.sandbar, 400000)
      && reach(at(AND.sandbar, 22, 15), { room: AND.sandbar, col: 0, row: 13 }, (g) => g.roomId === AND.vine, 400000)
      && reach(at(AND.vine, 29, 15), { room: AND.vine, col: 2, row: 0 }, (g) => g.roomId === AND.cloud, 400000));
  });
  SCOPE.section([AND.boat, AND.ends, AND.roots], 'the riverboat\'s stern leads on to THE RIVER ENDS', () => {
    check('the boat\'s east edge is open from the cargo deck up (rows 1-14, the stern), and THE RIVER ENDS\' west edge the same: the bank goes on, no way drawn that leads nowhere',
      [...Array(14).keys()].map((r) => r + 1).every((r) => !solid(AND.boat, 31, r) && !solid(AND.ends, 0, r)) && solid(AND.boat, 31, 15) && solid(AND.ends, 0, 15));
    check('THE RIVER ENDS is shut to the east (the forest comes down to the high bank: nothing east of it)', [...Array(20).keys()].every((r) => solid(AND.ends, 31, r)));
    check('in the chullo he walks off the stern onto the last bank; up the muddy stair past the anaconda to the empanada under the palm; and back along the bank onto the boat',
      reach(at(AND.boat, 1, 15, [CHULLO_AT], false, true), { room: AND.boat, col: 31, row: 13 }, (g) => g.roomId === AND.ends, 400000)
      && reach(at(AND.ends, 1, 15, [], false, true), { room: AND.ends, col: 28, row: 6 }, (g) => g.siCollected[itemIndex(g, AND.ends, 0)] !== 0, 400000)
      && reach(at(AND.ends, 27, 8, [], false, true), { room: AND.ends, col: 0, row: 13 }, (g) => g.roomId === AND.boat, 400000));
  });
  SCOPE.section([AND.canopy, AND.picchu], 'the well liana both ways', () => {
    check('the well\'s liana goes both ways: up from the canopy\'s bough into the tunnel', reach(at(AND.canopy, 20, 7, [PANPIPES]), { room: AND.canopy, col: 20, row: 0 }, (g) => g.roomId === AND.picchu));
  });
});

// ---- fairness: from several starts (the room's timings run a while before he comes in), the crossing is there -------------------------
SCOPE.section([AND.jump, AND.thin, AND.gorge, AND.terraces, AND.picchu, AND.bridge, AND.canopy, AND.cloud, AND.kapok, AND.vine, AND.sandbar, AND.roots, AND.boat, AND.ends, RIO_FIRST], 'fairness from several starts', () => {
  const fair = (label: string, make: () => State, aim: { room: number; col: number; row: number }, goal: (g: Game) => boolean) => {
    const ok = [0, 37, 74, 111, 148].filter((wait) => { const s = make(); run(s, NONE, wait); return reach(s, aim, goal, 400000); }).length;
    check(`fair from every start: ${label} (${ok} of 5 starts)`, ok === 5);
  };
  SCOPE.section([AND.canopy, AND.cloud, AND.picchu], 'fair: the canopy lattice to the cloud forest', () => {
    fair('the canopy\'s lattice past the toucan and the sloth, the bough to CLOUD NINE', () => at(AND.canopy, 20, 7, [], false, true), { room: AND.canopy, col: 0, row: 8 }, (g) => g.roomId === AND.cloud);
  });
  SCOPE.section([AND.cloud, AND.vine], 'fair: the cloud forest floor', () => {
    fair('CLOUD NINE\'s floor past the bear and over the stream under the cock-of-the-rock, down to the river', () => at(AND.cloud, 22, 18, [], false, true), { room: AND.cloud, col: 2, row: 19 }, (g) => g.roomId === AND.vine);
  });
  SCOPE.section([AND.vine, AND.cloud, AND.sandbar], 'fair: VINE AND DANDY', () => {
    fair('VINE AND DANDY\'s three vines and two logs past the piranhas, the west bank to the east bank', () => at(AND.vine, 3, 15, [], false, true), { room: AND.vine, col: 29, row: 13 }, (g) => g.roomId === AND.vine && colOf(g) >= 27 && g.y === standY(15));
  });
  SCOPE.section([AND.sandbar, AND.vine, AND.roots], 'fair: the creek vine and logs', () => {
    fair('the creek\'s vine and rotten logs, the west bank to the sandbar', () => at(AND.sandbar, 2, 15, [], false, true), { room: AND.sandbar, col: 20, row: 13 }, (g) => g.roomId === AND.sandbar && colOf(g) >= 18 && g.y === standY(15));
  });
  SCOPE.section([AND.roots, AND.sandbar, AND.kapok, AND.boat], 'fair: the roots vines and log', () => {
    fair('the roots\' vines and log, from the room\'s west edge to the east bank', () => at(AND.roots, 0, 15, [], false, true), { room: AND.roots, col: 22, row: 13 }, (g) => g.roomId === AND.roots && colOf(g) >= 21 && g.y === standY(15));
  });
  SCOPE.section([AND.roots, AND.sandbar, AND.kapok, AND.boat], 'fair: the roots vines and log, back', () => {
    fair('back over them, the east bank to the west bank', () => at(AND.roots, 22, 15, [], false, true), { room: AND.roots, col: 3, row: 13 }, (g) => g.roomId === AND.roots && colOf(g) <= 6 && g.y === standY(15));
  });
  SCOPE.section([AND.kapok, AND.canopy, AND.roots, RIO_FIRST], 'fair: the kapok boughs', () => {
    fair('the kapok\'s boughs past the anaconda, the low boughs to the branch', () => at(AND.kapok, 6, 16, [], false, true), { room: AND.kapok, col: 18, row: 6 }, (g) => g.roomId === AND.kapok && g.y === standY(8));
  });
  SCOPE.section([AND.boat, AND.roots], 'fair: the boat', () => {
    fair('aboard in the chullo, up to the top deck and past the macaw to the machete', () => at(AND.boat, 1, 15, [CHULLO_AT], false, true), { room: AND.boat, col: 12, row: 6 }, (g) => g.siCollected[itemIndex(g, ...MACHETE)] !== 0);
  });
  SCOPE.section([AND.ends, AND.boat], 'fair: the last bank', () => {
    fair('THE RIVER ENDS\' muddy stair past the dolphin and the anaconda to the empanada', () => at(AND.ends, 1, 15, [], false, true), { room: AND.ends, col: 28, row: 6 }, (g) => g.siCollected[itemIndex(g, AND.ends, 0)] !== 0);
  });
  SCOPE.section([AND.bridge, AND.picchu], 'fair: the Inca trail', () => {
    fair('the trail past the vizcacha to its end', () => at(AND.bridge, 2, 4, [], false, true), { room: AND.bridge, col: 27, row: 3 }, (g) => g.roomId === AND.bridge && colOf(g) >= 25 && g.y === standY(4));
  });
  SCOPE.section([AND.picchu, AND.terraces, AND.canopy, AND.bridge], 'fair: the hill against the boulders', () => {
    fair('Machu Picchu\'s hill against the boulders, the plateau to the Intihuatana', () => at(AND.picchu, 2, 8, [], false, true), { room: AND.picchu, col: 26, row: 2 }, (g) => g.roomId === AND.picchu && colOf(g) >= 25 && g.y === standY(4));
  });
  SCOPE.section([AND.terraces, AND.picchu, AND.gorge], 'fair: the terraces to the low path', () => {
    fair('the terraces past the llamas and the cuy to the low path', () => at(AND.terraces, 12, 12, [], false, true), { room: AND.terraces, col: 31, row: 16 }, (g) => g.roomId === AND.picchu);
  });
  SCOPE.section([AND.gorge, AND.thin, AND.terraces], 'fair: the gorge condors', () => {
    fair('the gorge\'s condors to the shelf', () => at(AND.gorge, 6, 2, [], false, true), { room: AND.gorge, col: 24, row: 6 }, (g) => g.roomId === AND.gorge && g.y === standY(8) && colOf(g) >= 22);
  });
  SCOPE.section([AND.thin, AND.jump, AND.gorge], 'fair: the canyon condors', () => {
    fair('the canyon\'s condors, from the top to the coin over the ridge', () => at(AND.thin, 8, 2, [], false, true), { room: AND.thin, col: 15, row: 6 }, (g) => g.coinCollected[coinIndex(g, AND.thin, 15, 7)] !== 0);
  });
});

// ---- the chullo ---------------------------------------------------------------------------------------------
SCOPE.section([AND.picchu, AND.terraces], 'the chullo', () => {
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
});

// ---- hints, the map, saves --------------------------------------------------------------------------------
SCOPE.section([], 'hints, the map, saves', () => {
  const wants = [[AND.picchu, 2, 18, 'THE LLAMA IS CROSS: CALM IT'], [AND.kapok, 20, 16, 'THE UNDERGROWTH IS TOO THICK'], [AND.boat, 1, 15, 'THE CAPTAIN CARRIES LOCALS ONLY']] as const;
  for (const [room, col, floor, text] of wants.filter(([id]) => SCOPE.has(id))) {
    const w = at(room, col, floor, [], true);
    run(w, NONE, 120);
    check(`ENHANCED: coming into room ${room} without what it wants says so ("${rowText(w.g)}")`, rowText(w.g) === text);
  }
  SCOPE.section([AND.picchu], 'ORIGINAL says only the place name', () => {
    const plain = at(AND.picchu, 2, 18, [], false);
    run(plain, NONE, 120);
    check('ORIGINAL says only the place\'s name', rowText(plain.g) === 'MACHU PICCHU');
  });
  check('no hint is left for what the rebuild took out (the snake)', WORLD.hints?.wanted.every((w) => !/SNAKE/.test(w.text)) ?? true);
  for (const [item, text, col, floor] of ([[CHULLO_AT, 'A CHULLO: LOOK LIKE A LOCAL', 5, 8], [PANPIPES, 'PANPIPES: MUSIC CALMS BEASTS', 27, 4], [MACHETE, 'MACHETE: HACKS THROUGH VINES', 15, 8]] as const).filter(([[id]]) => SCOPE.has(id))) {
    const [room, nth] = item;
    const take = at(room, col, floor, [], true);
    take.g.rollers = [];
    for (let f = 0; f < 160 && !take.g.siCollected[itemIndex(take.g, room, nth)]; f++) frame(take, LEFT);
    run(take, NONE, 3);
    check(`ENHANCED: taking the ${text.split(':')[0]?.toLowerCase()} says what it is for ("${rowText(take.g)}")`, rowText(take.g) === text && take.g.siCollected[itemIndex(take.g, room, nth)] !== 0);
  }

  const s = newGame(WORLD, true);
  const info = montyMap.info(s.g, { rooms: {} });
  check(`the pause screen counts the snacks and the items (${info.join(' | ')})`, info[2] === `SNACKS 0/${WORLD.progress.cakes.length}` && info[1] === `ITEMS  0/${WORLD.progress.keyItems.length}`); // (the totals are world.ts's)
  SCOPE.section([AND.picchu, AND.terraces], 'the map in the Andes', () => {
    enterRoom(s.g, AND.picchu, 0x40, standY(8));
    const places = montyMap.places({ x: 0, y: 0, w: 200, h: 150 }, s.g, { rooms: { [AND.picchu]: [0x40, 0xb2, 5, 26], [AND.terraces]: [0x40, 0xb2, 5, 25] } });
    check('in the Andes the map shows its region, the rooms he has been to are places to go', places.length === 2 && places.every((p) => p.x >= 0 && p.x < 200 && p.y >= 0 && p.y < 150));
  });

  // a save made on coming into each of the region's rooms (every key taken, the chullo on) carries on in the same room, alive
  const spots = [[AND.jump, 1, 16], [AND.thin, 8, 6], [AND.gorge, 6, 6], [AND.terraces, 5, 8], [AND.picchu, 2, 8], [AND.bridge, 3, 4], [AND.canopy, 20, 7], [AND.cloud, 22, 18], [AND.kapok, 20, 16], [AND.vine, 3, 15], [AND.sandbar, 2, 15], [AND.roots, 3, 15], [AND.boat, 1, 15]] as const;
  const failed: number[] = [];
  // (the rooms the filter lets through: all of them without --room, so the count is the whole region's then)
  const scoped = spots.filter(([id]) => SCOPE.has(id));
  const carried = scoped.filter(([room, col, floor]) => {
    const a = newGame(WORLD, false);
    for (const [r, n] of [CHULLO_AT, PANPIPES, MACHETE]) a.g.siCollected[itemIndex(a.g, r, n)] = 0x81;
    wear(a.g, itemIndex(a.g, ...CHULLO_AT));
    enterRoom(a.g, room, 0x0c + (col + 4) * 4, standY(floor));
    for (let n = 0; n < 200 && (a.g.freeze || a.g.script); n++) frame(a, NONE);
    const b = newGame(WORLD, false);
    restore(b.g, CODEC.unpack(CODEC.pack(snapshot(a.g)), CODEC.format));
    run(b, NONE, 4);
    b.g.enemies = []; b.g.enable &= 0x0f; b.g.vic.enable &= 0x0f; b.g.rollers = [];
    run(b, NONE, 60);
    const ok = b.g.roomId === room && !dead(b.g) && b.g.worn === itemIndex(b.g, ...CHULLO_AT);
    if (!ok) { failed.push(room); console.log(`   room ${room}: now in ${b.g.roomId}, dead ${dead(b.g)}, worn ${b.g.worn}, at ${colOf(b.g)},${b.g.y}`); }
    return ok;
  }).length;
  check(`a save made on coming into each of the region's thirteen rooms packs, unpacks and carries on in the same room, alive, in the chullo (${carried} of ${scoped.length}${failed.length ? `; not in rooms ${failed.join(', ')}` : ''})`, carried === scoped.length);
});

SCOPE.report();
finish();
