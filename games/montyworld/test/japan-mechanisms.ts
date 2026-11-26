/**
 * Japan's mechanisms, headless, each on its own with the room's creatures out of the way (the bot, japan.ts, plays them all together): the bullet trains sweeping the
 * platform (a picture drawn in the room's characters, a warning, deadly on the lane, safe below, a fair timing), the paper doors (open, shaking, shut over him, a wall),
 * the three gates (the shutter and the daruma, the koi and the fish food, the guard and the ninja hood), the hood as a costume in the rice hat's place, the joins (the
 * loop, the ways back, no trap), the layout's sanity (nothing drawn in a tile), the hints, the map, a save from before Japan carrying on, and MOUNT FUJI's SNOW SLIDES (the huts safe,
 * the open climb deadly as a snowball comes, the climb crossed up and down by waiting in a hut for one to pass).
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/japan-mechanisms.ts [--room <rooms>]
 */
import { PLAY_COL, PLAY_ROW, ROW, SCREEN_MARGIN } from '../../shared/monty/screen';
import { decorChars } from '../../montyotr/src/decor-chars';
import { enterRoom } from '../../montyotr/src/ending';
import type { Game } from '../../montyotr/src/game';
import { wear } from '../../montyotr/src/items';
import { montyMap } from '../../montyotr/src/map';
import { MOTR } from '../../montyotr/src/motr';
import { pulseCode, pulsePhase } from '../../montyotr/src/pulses';
import { pixelX, pixelY } from '../../montyotr/src/cells';
import { rollerAt } from '../../montyotr/src/rollers';
import { restore, snapshot } from '../../montyotr/src/save';
import { frame, NONE, type State } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { must } from '../../shared/test/must';
import { hoodWorn, WORLD_CREATURES, WORLD_DECOR } from '../src/art';
import { JAPAN_CAVE_CREATURES } from '../src/art/japan-cave';
import { JAPAN_CREATURES } from '../src/art/japan-creatures';
import { CHI } from '../src/china';
import { ADDED_ROOMS, WORLD } from '../src/data';
import { HAT_BLOCKS } from '../src/hats';
import { BALL_STREAM, CAVE, CROSSING, CROSSING_MOUTHS, DOOR_PULSES, DOORS, FUJI, FUJI_HUTS, FUJI_SNOW, GALLERY_DOOR_PULSES, GALLERY_ROW, JAPAN_ROOMS, JP, MOLE_SINKING, MOLE_STONES, PLANK_CELLS, PLANK_CODE, SHUTTER_CELLS, STREET_TRAIN, TRAIN, TRAIN_APART, TRAINS } from '../src/japan';
import { HOOD_COLOUR } from '../src/art/japan-hood';
import { JAPAN_SPRITE } from '../src/japan-pointers';
import { FIRST_CREATURE, isBackdrop, pieceChar } from '../src/layout';
import { CODEC } from '../src/main';
import { PAC } from '../src/pacific';
import { ACTIONS, hold, newGame } from '../../shared/monty/test/bot';
import { SCOPE, scopedRooms } from './scope';
import { search } from './search';
import { at, cell, coinsIn, colOf, dead, diesAt, entriesBefore, itemsIn, keyItemsIn, LEFT, overCrowded, panelLine, RIGHT, rowText, run, snacksIn, UP } from './mech-kit';
import { coinIndex, creatureRooms, itemIndex, standY } from './route';

/** The items by name (the room's nth). */
const DARUMA = [JP.platform, 0] as const, FISH = [JP.crossing, 0] as const, HOOD = [JP.mole, 0] as const;
const CREATURE_NAMES = [...Object.keys(JAPAN_CREATURES), ...Object.keys(JAPAN_CAVE_CREATURES)];

// ---- the data -------------------------------------------------------------------------------------
SCOPE.section([], 'the data: Japan on the grid, its entries, creatures, sprite blocks', () => {
  const cells = WORLD.exitGrid.image;
  const cols = WORLD.exitGrid.cols;
  const grid = (row: number, col: number) => cells[row * cols + col];
  check('Japan is thirteen rooms, a block of five columns (12-16) by three rows beside China\'s and the ice cave under MOUNT FUJI, room ids 27 to 37, SHOOT FOR THE MOON\'s 97 and GONE WITH THE WIND\'s 98 (added after the flight; the three regions before it unchanged)',
    cells.filter((c) => (c >= JP.harbour && c <= JP.port) || c === JP.grove || c === JP.cave).length === 13 && [grid(1, 12), grid(1, 13), grid(2, 13), grid(1, 14), grid(2, 14), grid(2, 15), grid(1, 15), grid(0, 15), grid(0, 16), grid(1, 16), grid(2, 16), grid(0, 14), grid(3, 15)].join()
      === [JP.harbour, JP.street, JP.parlour, JP.crossing, JP.platform, JP.fuji, JP.garden, JP.mole, JP.hideout, JP.hall, JP.port, JP.grove, JP.cave].join() && grid(1, 11) === CHI.junk && grid(0, 12) === 0xff && grid(2, 12) === 0xff && grid(0, 13) === 0xff);
  const coinRooms = Array.from({ length: WORLD.coinTable.length / 3 }, (_, i) => WORLD.coinTable[i * 3] ?? 0);
  const firstAdded = coinRooms.indexOf(CHI.heaven);
  check('SHOOT FOR THE MOON\'s two coins are at the coin table\'s end with the other rooms added after every region (data.ts ADDED_ROOMS: no other coin\'s place moves, so every save keeps its coins) and it has no find',
    coinsIn(JP.grove, JP.grove) === 2 && firstAdded >= 0 && coinRooms.indexOf(JP.grove) > firstAdded && coinRooms.slice(firstAdded).every((r) => ADDED_ROOMS.includes(r)) && itemsIn(JP.grove, JP.grove) === 0);
  check('GONE WITH THE WIND\'s two coins are the coin table\'s last (the room added last: a format 4 save\'s coins keep their places) and it has no find',
    coinsIn(JP.cave, JP.cave) === 2 && coinRooms.slice(-2).every((r) => r === JP.cave) && itemsIn(JP.cave, JP.cave) === 0);
  const before = entriesBefore(JP.harbour, JP.port);
  check('the regions before Japan keep their coins and finds, in the same table places (first), and Japan adds 24 coins and 5 finds (two sushi, the daruma, the fish food, the ninja hood)',
    before.ordered && coinsIn(JP.harbour, JP.port) === 24 && itemsIn(JP.harbour, JP.port) === 5);
  check('Japan\'s 3 key items and 2 snacks count on the pause screen', keyItemsIn(JP.harbour, JP.port) === 3 && snacksIn(JP.harbour, JP.port) === 2);
  const rooms = creatureRooms(JAPAN_ROOMS);
  const most = Math.max(...[...rooms.values()].map((v) => v.size));
  check(`${rooms.size} kinds of creature in Japan's thirteen rooms, none in more than two (${[...rooms.values()].map((v) => v.size).join(' ')})`, rooms.size === CREATURE_NAMES.length && rooms.size >= 8 && rooms.size <= 13 && most <= 2);
  const used = [...HAT_BLOCKS, ...Object.values(JAPAN_SPRITE)];
  check(`every block of the bank Japan uses is its own (${used.length} pointers, none twice, none Monty's: $50-$73) and its four items have pictures there`,
    new Set(used).size === used.length && used.every((p) => p < 0x50 || p > 0x73) && Object.values(JAPAN_SPRITE).every((p) => WORLD.bankImage.subarray(p * 64, p * 64 + 63).some((b) => b !== 0)));
  const lockstep = scopedRooms(JAPAN_ROOMS).flatMap((r) => {
    const seen = new Set<string>();
    return (r.enemies ?? []).flatMap((e) => { const k = `${e.dir}/${e.speed}/${e.range}`; if (seen.has(k)) return [`room ${r.id}: two creatures that go ${k} (direction/speed/range)`]; seen.add(k); return []; });
  });
  check(`no two creatures of a room go in lockstep (the same direction, speed and range): ${lockstep.length ? lockstep.join('; ') : 'none do'}`, lockstep.length === 0);
  const crowded = overCrowded(scopedRooms(JAPAN_ROOMS));
  check(`no room has a fourth creature (sprite 7 is the worn hat's: it would be a phantom; ${crowded.length ? `rooms ${crowded.join()}` : 'none do'})`, crowded.length === 0);
  check('Monty on the Run is as it was (no pictured tunnels, no pulse with an offset)', MOTR.tunnels.length === 0 && MOTR.pulses.every((p) => p.offset === undefined));
});

// ---- nothing drawn in a tile: the layout's sanity --------------------------------------------------------
SCOPE.section([], 'the layout\'s sanity: nothing drawn in a tile', () => {
  const decorTypes = Object.values(WORLD_DECOR), decorNames = Object.keys(WORLD_DECOR);
  const problems: string[] = [];
  let pools = 0;
  for (const r of scopedRooms(JAPAN_ROOMS)) {
    const solid = (col: number, row: number) => {
      const ch = r.map[row]?.[Math.max(0, Math.min(31, col))]; // (a margin column is as the edge cell beside it)
      if (ch === undefined) return true;
      if (ch === '.') return false;
      const tile = r.tiles[Number(ch) - 1];
      return tile !== undefined && WORLD.tileProperty(tile) !== 0;
    };
    const inRoom = (cx: number, cy: number) => ({ col: cx - 4, row: cy - 3 });
    for (const d of r.decor ?? []) {
      const { col, row } = inRoom(d.col, d.row);
      const w = typeof d.type === 'number' ? decorTypes[d.type]?.w ?? 1 : d.type.text.length, h = typeof d.type === 'number' ? decorTypes[d.type]?.h ?? 1 : 1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (solid(col + x, row + y)) problems.push(`room ${r.id}: a decoration over a tile he touches (a floor, a wall, a rope, water) at ${col + x},${row + y}`);
      if (col < -SCREEN_MARGIN || col + w > 32 + SCREEN_MARGIN || row < 0 || row + h > 20) problems.push(`room ${r.id}: a decoration off the picture (the playfield and the margin it shows)`);
    }
    /** The cells decorations are drawn in (a coin or an item there is covered by their characters; a backdrop lies under the pickups, the coin drawn over it). */
    const drawn = new Set((r.decor ?? []).flatMap((d) => {
      if (typeof d.type === 'number' && isBackdrop(decorNames[d.type] ?? '')) return [];
      const { col, row } = inRoom(d.col, d.row);
      const w = typeof d.type === 'number' ? decorTypes[d.type]?.w ?? 1 : d.type.text.length, h = typeof d.type === 'number' ? decorTypes[d.type]?.h ?? 1 : 1;
      return Array.from({ length: w * h }, (_, i) => `${col + (i % w)},${row + Math.floor(i / w)}`);
    }));
    for (const [col, row] of r.coins ?? []) {
      if (solid(col, row)) problems.push(`room ${r.id}: a coin in a tile at ${col},${row}`);
      if (drawn.has(`${col},${row}`)) problems.push(`room ${r.id}: a coin under a decoration at ${col},${row}`);
    }
    if (r.item) {
      const { col, row } = inRoom(r.item.col, r.item.row);
      for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) if (solid(col + x, row + y)) problems.push(`room ${r.id}: an item in a tile`);
    }
    /** A tile he cannot be in (a creature may start in water). */
    const wall = (col: number, row: number) => {
      const ch = r.map[row]?.[col];
      if (ch === undefined) return true;
      const tile = ch === '.' ? undefined : r.tiles[Number(ch) - 1];
      return tile !== undefined && WORLD.tileProperty(tile) !== 0 && WORLD.tileProperty(tile) !== 4;
    };
    for (const e of r.enemies ?? []) { const { col, row } = inRoom(e.col, e.row); for (const [x, y] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) if (wall(col + x, row + y)) problems.push(`room ${r.id}: a creature starts in a tile at ${col},${row}`); }
    const first = decorChars(WORLD, r.id);
    const placed = new Set((r.decor ?? []).flatMap((d) => (typeof d.type === 'number' ? [d.type] : [])));
    for (const t of placed) if (!first[WORLD.decorKindIn(r.id, t) ?? -1]) problems.push(`room ${r.id}: decoration ${t} did not fit in the character pool`);
    pools += [...placed].reduce((n, t) => n + (decorTypes[t]?.w ?? 0) * (decorTypes[t]?.h ?? 0), 0);
    if (r.tiles.length > 8) problems.push(`room ${r.id}: more than eight tiles`);
  }
  check(`no decoration, coin, item or creature of Japan's rooms is in a tile, every decoration fits its room's character pool, no more than eight tiles a room (${problems.length ? problems.join('; ') : `${pools} characters of decorations`})`, problems.length === 0);
});

// ---- the parlour: arriving by the rope and pausing at its top is safe ----------------------------------------
SCOPE.section([JP.street, JP.parlour, JP.harbour, JP.crossing, JP.platform], 'the parlour: arriving by the rope is safe', () => {
  for (const enhanced of [false, true]) {
    const found = search(at(JP.street, 18, 17, [], enhanced), (g) => g.roomId === JP.parlour && g.onRope !== 0, [{ room: JP.street, col: 21, row: 19 }], 150000, 1.5);
    const s = must(found?.end, 'a way down the rope');
    const lives = s.g.lives, arrived = s.g.roomId === JP.parlour && s.g.onRope !== 0, top = s.g.y;
    let died = false;
    for (let n = 0; n < 1500 && !died; n++) { frame(s, NONE); died = dead(s.g) || s.g.lives !== lives; }
    check(`${enhanced ? 'ENHANCED' : 'ORIGINAL'}: down the street's stairs into the parlour (arrived ${arrived}, y ${top}) and standing still at the rope's top for 1500 frames, the lantern ghost does not touch him`, arrived && !died);
  }
});

// ---- the bullet trains -------------------------------------------------------------------------------------
SCOPE.section([JP.platform, JP.fuji, JP.parlour], 'the bullet trains', () => {
  const trainCodes = new Set(TRAINS.flatMap((t) => (t.picture ?? []).flat().filter((c) => c !== 0)));
  const lane = (g: Game, col: number) => [8, 9, 10, 11, 12, 13].some((row) => trainCodes.has(cell(g, col, row)));
  const right = must(TRAINS[0], 'the up train'), left = must(TRAINS[1], 'the down train');
  check(`two trains, ${TRAIN.cols} cells long and ${TRAIN.rows} tall on the platform lane (rows ${TRAIN.top}-${TRAIN.top + TRAIN.rows - 1}), the up one from the right and the down one from the left, ${TRAIN_APART} frames apart, taking turns, each a cell every ${TRAIN.step} frames`,
    TRAINS.length === 2 && right.from === 'right' && left.from === 'left' && right.cols === TRAIN.cols && left.picture?.length === TRAIN.rows && left.picture.every((r) => r.length === TRAIN.cols) && (left.offset ?? 0) - (right.offset ?? 0) === TRAIN_APART && right.step === TRAIN.step);
  const noses = [right.picture?.[5]?.[0], left.picture?.[5]?.[TRAIN.cols - 1], right.picture?.[0]?.[0], left.picture?.[0]?.[TRAIN.cols - 1], right.picture?.[0]?.[TRAIN.nose], left.picture?.[0]?.[TRAIN.cols - TRAIN.nose - 1]];
  check('each train\'s nose is at the end it goes in front: stepped (the front cells have no roof) and mirrored between the two', noses[0] !== 0 && noses[1] !== 0 && noses[2] === 0 && noses[3] === 0 && noses[4] !== 0 && noses[5] !== 0);
  check('its characters are tiles he passes through (class 0), so the picture is not a wall', [...trainCodes].every((code) => WORLD.tileProperty(must(JAPAN_ROOMS.find((r) => r.id === JP.platform), 'the platform').tiles[code - 1] ?? -1) === 0));
  // the sequence: quiet, a flashing edge at the right, the up train through, the down train
  SCOPE.section([JP.platform], 'the bullet trains: the sequence', () => {
    const s = at(JP.platform, 14, 17);
    let warnFrom = -1, onFrom = -1, offAt = -1, downFrom = -1;
    for (let f = 1; f <= 800; f++) {
      frame(s, NONE);
      if (lane(s.g, 31) && warnFrom < 0) warnFrom = f;
      if (onFrom < 0 && lane(s.g, 25) && s.g.tunnels[0]?.state === 'sweep') onFrom = f;
      if (onFrom > 0 && offAt < 0 && s.g.tunnels[0]?.state === 'rest') offAt = f;
      if (lane(s.g, 0) && downFrom < 0 && f > TRAIN.first + 100) downFrom = f;
    }
    check(`the up train's right edge starts flashing ${warnFrom} frames in (after ${TRAIN.first}), it comes on at the room's right at frame ${onFrom} (${TRAIN.warn} frames of warning) and is gone by ${offAt}; the down train's edge flashes from ${downFrom}`,
      Math.abs(warnFrom - TRAIN.first) <= 18 && onFrom > warnFrom + TRAIN.warn - 24 && onFrom < warnFrom + TRAIN.warn + 60 && offAt > onFrom + 100 && Math.abs(downFrom - TRAIN.first - TRAIN_APART) <= 24);
  });
  // deadly on the lane, safe below it
  SCOPE.section([JP.platform], 'the bullet trains: deadly on the lane, safe below', () => {
    const lanes = at(JP.platform, 14, 14);
    const when = diesAt(lanes, NONE, 2 * 656);
    check(`standing on the platform (col 14) a train kills him (frame ${when}) within a cycle`, when >= 0 && when < 2 * (TRAIN.warn + TRAIN.sweep + TRAIN.quiet));
    const under = at(JP.platform, 14, 17);
    run(under, NONE, 2 * 656);
    check('in the underpass the trains do nothing to him in two cycles', !dead(under.g));
    const stairs = at(JP.platform, 20, 17);
    run(stairs, UP, 6);
    let rope = 0;
    for (let f = 0; f < 2 * 656; f++) { frame(stairs, NONE); rope += stairs.g.onRope ? 1 : 0; if (dead(stairs.g)) break; }
    check('hanging on the stairs\' rope below the deck (the way up is a rope through the deck, cells 19-21) the trains do nothing either', rope > 0 && !dead(stairs.g));
  });
  // a fair timing: the cycle has a quiet moment (no train on the platform, no edge flashing), and a dash from the second stairs' top to the way out through the open shutter, started in it, is always clear
  SCOPE.section([JP.platform, JP.fuji, JP.parlour], 'the bullet trains: a fair timing to the way out', () => {
    const cycle = 2 * (TRAIN.warn + TRAIN.sweep + TRAIN.quiet);
    const quietAt = (g: Game) => Array.from({ length: 32 }, (_, c) => c).every((c) => !lane(g, c));
    // the room watched for two cycles: the frames with nothing on the lane and no edge flashing
    const watch = at(JP.platform, 14, 17);
    const quiet: boolean[] = [];
    for (let f = 0; f < 2 * cycle; f++) { frame(watch, NONE); quiet.push(quietAt(watch.g)); }
    let longest = 0, run0 = 0;
    for (const q of quiet) { run0 = q ? run0 + 1 : 0; longest = Math.max(longest, run0); }
    check(`a cycle is ${cycle} frames and has a quiet moment (${longest} frames in a row with no train on the platform and no edge flashing, after the first ${TRAIN.first}), twice in it`, longest >= 40 && quiet.slice(TRAIN.first + cycle - 20, TRAIN.first + cycle + 20).some((q) => !q));
    let clear = 0, hit = 0, quietStarts = 0, quietClear = 0, windows = '';
    for (let wait = 0; wait < cycle; wait += 4) {
      const s = at(JP.platform, 22, 14, [DARUMA]);
      run(s, NONE, wait);
      const quietStart = wait >= 16 && quiet.slice(wait - 16, wait).every((q) => q); // (nothing for 16 frames: a flash is off for 8 at a time)
      let out = false;
      for (let f = 0; f < 140 && !out && !dead(s.g); f++) { frame(s, RIGHT); if (s.g.roomId === JP.fuji) out = true; }
      const ok = out && !dead(s.g);
      if (ok) clear++; else hit++;
      if (quietStart) { quietStarts++; if (ok) quietClear++; }
      windows += ok ? '.' : '#';
    }
    const total = clear + hit;
    check(`the dash from the second stairs' top to the way out (cells 22 to 31, 80 frames) is clear at ${clear} of ${total} starts across a cycle (${windows}): a timing, neither shut nor open; and started at no flash and no train it is clear at ${quietClear} of ${quietStarts}`,
      clear / total >= 0.25 && hit / total >= 0.15 && quietStarts >= 8 && quietClear === quietStarts);
  });
  // and the up train's whole length: a 300 frame cycle for each
  SCOPE.section([JP.platform], 'the bullet trains: a train\'s whole length', () => {
    const s = at(JP.platform, 14, 17);
    run(s, NONE, TRAIN.first + TRAIN.warn + 10);
    let across = 0, started = false;
    for (let f = 0; f < 200; f++) { frame(s, NONE); const on = lane(s.g, 10); if (on) { started = true; across++; } else if (started) break; }
    check(`a train takes ${across} frames to go past a cell: its ${TRAIN.cols} cells at ${TRAIN.step} a cell (${TRAIN.cols * TRAIN.step})`, Math.abs(across - TRAIN.cols * TRAIN.step) <= 6);
  });
});

// ---- the paper doors ----------------------------------------------------------------------------------------
SCOPE.section([JP.hall], 'the paper doors', () => {
  const door = (k: number) => must(DOOR_PULSES[k], 'a door');
  check(`three doors at cols ${DOORS.cols.join(', ')}, 2 cells wide and ${DOORS.rows} tall, a ${DOORS.period}-frame period, started ${DOORS.apart} frames apart`, DOOR_PULSES.length === 3 && DOOR_PULSES.every((p, k) => p.col === DOORS.cols[k] && p.rows === DOORS.rows && p.period === DOORS.period && p.offset === (DOORS.period - k * DOORS.apart) % DOORS.period));
  const first = door(0);
  check('the pure timing: open, then shaking, then shut for good over the leading edge, then a wall until the period is round',
    pulsePhase(first, 0) === 'idle' && pulsePhase(first, first.start) === 'warn' && pulsePhase(first, first.start + first.warn) === 'live' && pulsePhase(first, first.start + first.warn + first.live) === 'spent' && pulseCode(first, first.start + first.warn + first.live) === first.spent && first.spent === first.liveCode);
  // each door's state in time, sampled in the room
  {
    const s = at(JP.hall, 3, 14);
    const log: string[][] = [[], [], []];
    for (let f = 1; f <= 2 * DOORS.period; f++) {
      frame(s, NONE);
      DOOR_PULSES.forEach((p, k) => log[k]?.push(cell(s.g, p.col, p.row + 1) === p.idle ? 'o' : cell(s.g, p.col, p.row + 1) === p.warnCode ? 'w' : 's'));
    }
    /** The frame each door first shuts after it has been open (a door loaded part way through being shut waits for the next). */
    const shutFrom = log.map((l) => { const text = l.join(''); return text.indexOf('s', text.indexOf('o')); });
    const mod = (n: number) => ((n % DOORS.period) + DOORS.period) % DOORS.period;
    check(`the doors shut ${shutFrom.join(', ')} frames in (the first, then 40 frames after each), each opening again and a wall of paper for ${DOORS.live + (DOORS.period - DOORS.open - DOORS.warn - DOORS.live)} frames`,
      shutFrom.every((f, k) => f > 0 && Math.abs(f - (mod(DOORS.open + DOORS.warn - (must(DOOR_PULSES[k], 'a door').offset ?? 0)) + (f > DOORS.period ? DOORS.period : 0))) <= 4) && (shutFrom[1] ?? 0) - (shutFrom[0] ?? 0) === DOORS.apart && (shutFrom[2] ?? 0) + DOORS.period - (shutFrom[1] ?? 0) === DOORS.apart && log.every((l) => l.join('').includes('o')));
  }
  // deadly in the doorway as it shuts, a wall for the one outside, safe while it is open
  {
    const in2 = at(JP.hall, 11, 14);
    in2.g.enemies = [];
    const when = diesAt(in2, NONE, DOORS.period);
    check(`standing in the second doorway (cols 12-13) he dies as it shuts (frame ${when}; its shutting is at ${(((DOORS.open + DOORS.warn - (door(1).offset ?? 0)) % DOORS.period) + DOORS.period) % DOORS.period})`, when >= 0 && Math.abs(when - (((DOORS.open + DOORS.warn - (door(1).offset ?? 0)) % DOORS.period + DOORS.period) % DOORS.period)) <= 14);
    const waits = at(JP.hall, 9, 14);
    run(waits, RIGHT, 20);
    run(waits, NONE, 2 * DOORS.period);
    check('waiting in front of the doors, in the space between the first and the second, nothing happens in two periods', !dead(waits.g));
    // walking into a shut door: stopped, alive
    let blocked = false;
    for (let wait = 0; wait < DOORS.period && !blocked; wait += 4) {
      const s = at(JP.hall, 9, 14);
      run(s, NONE, wait);
      if (cell(s.g, 12, 12) !== door(1).liveCode) continue;
      const x0 = colOf(s.g);
      run(s, RIGHT, 20);
      blocked = !dead(s.g) && colOf(s.g) <= x0 + 1 && colOf(s.g) < 12;
    }
    check('a shut door is a wall: walking into it he is stopped, not killed', blocked);
  }
  // fair: a walk through all three from the first doorway's left: some starts clear without waiting, some blocked
  {
    let through = 0, stopped = 0, died = 0, windows = '';
    for (let wait = 0; wait < DOORS.period; wait += 8) {
      const s = at(JP.hall, 3, 14);
      s.g.enemies = [];
      run(s, NONE, wait);
      for (let f = 0; f < 260 && !dead(s.g) && colOf(s.g) < 19; f++) frame(s, RIGHT);
      if (dead(s.g)) { died++; windows += '#'; } else if (colOf(s.g) >= 19) { through++; windows += '.'; } else { stopped++; windows += 'o'; }
    }
    check(`walking right from the hall's start at ${DOORS.period / 8} starts across a period (${windows}): ${through} go through all three, ${stopped} are stopped by a shut door, ${died} are caught as one shuts`, through > 0 && stopped + died > 0 && died < through + stopped);
  }
});

// ---- the hall's gallery: the way on, back west over the doors from the rope past the third to the rope up to the hideout ----------
SCOPE.section([JP.hall, JP.hideout, JP.garden, JP.port, JP.mole], 'the hall\'s gallery: the way on to the hideout', () => {
  const s = at(JP.hall, 20, 14);
  s.g.pulses = [];
  const coin = coinIndex(s.g, JP.hall, 8, 6);
  const found = search(s, (g) => g.coinCollected[coin] !== 0 && g.roomId === JP.hall, [{ room: JP.hall, col: 8, row: 6 }], 150000, 1.5);
  check('the gallery: up the rope past the third door and back west along the eaves through the partitions to the coin (a floor of its own, row 8, with a doorway through each partition)', found !== null
    && DOORS.cols.every((c) => [5, 6, 7].every((row) => at(JP.hall, 3, 14).g.flagAt(row + 3, c + 4) === 0) && at(JP.hall, 3, 14).g.flagAt(8 + 3, c + 4) === 2));
  for (const enhanced of [false, true]) {
    const t = at(JP.hall, 20, 14, [], enhanced);
    t.g.pulses = [];
    check(`${enhanced ? 'ENHANCED' : 'ORIGINAL'}: from the floor past the third door the bot climbs to the gallery and walks it west to the rope at the left, up to the hideout`,
      search(t, (g) => g.roomId === JP.hideout && !g.freeze && !g.script, [{ room: JP.hall, col: 4, row: 0 }], 150000, 1.5) !== null);
  }
});

// ---- the gallery's doors: the same paper doors over the floor's, met walking west ----------
SCOPE.section([JP.hall, JP.hideout], "the gallery's doors", () => {
  check(`three more doors on the gallery (rows ${GALLERY_ROW}-${GALLERY_ROW + DOORS.rows - 1}) at cols ${DOORS.cols.join(', ')}, shutting from the east ${DOORS.apart} frames apart`,
    GALLERY_DOOR_PULSES.length === 3 && GALLERY_DOOR_PULSES.every((p, k) => p.col === DOORS.cols[k] && p.row === GALLERY_ROW && p.offset === (DOORS.period - (2 - k) * DOORS.apart) % DOORS.period));
  const mid = must(GALLERY_DOOR_PULSES[1], 'a gallery door');
  const shutAt = (((DOORS.open + DOORS.warn - (mid.offset ?? 0)) % DOORS.period) + DOORS.period) % DOORS.period;
  const in2 = at(JP.hall, 11, 8);
  in2.g.enemies = [];
  const when = diesAt(in2, NONE, DOORS.period);
  check(`standing in the gallery's second doorway (cols 12-13) he dies as it shuts (frame ${when}; its shutting is at ${shutAt})`, when >= 0 && Math.abs(when - shutAt) <= 14);
  for (const enhanced of [false, true]) {
    const t = at(JP.hall, 20, 14, [], enhanced);
    check(`${enhanced ? 'ENHANCED' : 'ORIGINAL'}: with every door and the lantern ghost running, the bot gets from past the floor's third door up and west along the gallery through its three doors to the hideout`,
      search(t, (g) => g.roomId === JP.hideout && !g.freeze && !g.script, [{ room: JP.hall, col: 4, row: 0 }], 200000, 1.5) !== null);
  }
});

// ---- the doors are the way: held shut, nothing gets him from the hall's west end up to the gallery or the hideout --------------------
SCOPE.section([JP.hall], 'the doors are the way: held shut, no way up', () => {
  const s = at(JP.hall, 3, 14);
  const wall = (col: number, row: number, code: number) => s.g.setRoomChar((row + PLAY_ROW) * ROW + col + PLAY_COL, code);
  for (const p of DOOR_PULSES) for (let r = p.row; r < p.row + p.rows; r++) for (let c = p.col; c < p.col + p.cols; c++) wall(c, r, p.spent);
  const door = must(DOOR_PULSES[0], 'a door');
  wall(0, 12, door.spent); wall(0, 13, door.spent); // (and the way back to the garden, so the search stays in the hall's west end)
  s.g.pulses = [];
  const shut = DOOR_PULSES.every((p) => s.g.flagAt(p.row + 1 + PLAY_ROW, p.col + PLAY_COL) !== 0) && s.g.flagAt(13 + PLAY_ROW, PLAY_COL) !== 0;
  const stats = { exhausted: false };
  const none = search(s, (g) => g.roomId !== JP.hall || g.onRope !== 0 || g.y <= standY(8), [{ room: JP.hall, col: 4, row: 8 }], 100000, 0, stats) === null;
  check(`with the three doors held shut the bot finds no way from the hall's west end onto a rope or the gallery (${stats.exhausted ? 'every state there is looked at' : 'the search limit'}): the hideout's rope hangs out of reach of the floor, so the doors are the way`, shut && none && stats.exhausted);
});

// ---- the gates ------------------------------------------------------------------------------------------
SCOPE.section([JP.platform, JP.parlour, JP.fuji, JP.crossing, JP.garden, JP.mole, JP.hall, JP.hideout, JP.port], 'the gates', () => {
  const arc = WORLD.jumpArc;
  let rise = 0;
  for (let i = 0; i < arc.length && arc[i] !== 0xff; i++) rise += arc[i] ?? 0;
  // the shutter and the daruma
  SCOPE.section([JP.platform, JP.parlour, JP.fuji, JP.crossing], 'the gates: the shutter and the daruma', () => {
    const shut = at(JP.platform, 26, 14);
    shut.g.tunnels = [];
    check('without the daruma the platform\'s end is a roller shutter (its four cells hold the shutter tile)', SHUTTER_CELLS.length === 4 && SHUTTER_CELLS.every(([row, col]) => cell(shut.g, col, row) !== 0));
    const out = (g: Game) => g.roomId === JP.fuji;
    const stats = { exhausted: false };
    const noWay = search(shut, out, undefined, 80000, 0, stats) === null;
    check(`and the bot finds no way through it (80000 states looked at${stats.exhausted ? ', every one there is' : ', the search limit'}); a jump (${rise}) is lower than the wall over it`, noWay);
    const open = at(JP.platform, 26, 14, [DARUMA]);
    open.g.tunnels = [];
    check('with it (taken at the platform\'s west end) the shutter is gone and the bot walks out east into the mountain\'s foot', SHUTTER_CELLS.every(([row, col]) => cell(open.g, col, row) === 0) && search(open, out, undefined, 100000, 1.5) !== null);
  });
  // the koi and the fish food
  SCOPE.section([JP.garden, JP.crossing, JP.fuji, JP.mole, JP.hall], 'the gates: the koi and the fish food', () => {
    const KOI = FIRST_CREATURE + Object.keys(WORLD_CREATURES).indexOf('jpKoi');
    const pond = at(JP.garden, 8, 14, [], false, true);
    const koi = pond.g.enemies.filter((e) => e.type === KOI);
    check('without the fish food two koi leap in the pond (in its first two slots), on the screen', koi.length === 2 && pond.g.enemies[0]?.type === KOI && pond.g.enemies[1]?.type === KOI && koi.every((e) => e.x !== 0xff));
    const fed = at(JP.garden, 8, 14, [FISH], false, true);
    check('with it (taken at the overpass) both are gone, sent off the screen; the tanuki stays', fed.g.enemies.filter((e) => e.type === KOI).every((e) => e.x === 0xff) && fed.g.enemies.filter((e) => e.type !== KOI).every((e) => e.x !== 0xff));
    // the pond: without the food only the first plank is there (the far bank is seven cells off), with it the other two float up
    const far = (g: Game) => g.roomId === JP.garden && colOf(g) >= 26 && g.y === standY(14);
    const bare = at(JP.garden, 14, 14);
    const jump = (() => { let n = 0; for (const [row, col] of PLANK_CELLS) n += cell(bare.g, col, row) === 0 ? 0 : 1; return n; })();
    check(`without the food the pond's other planks are not there (${PLANK_CELLS.length} cells empty): the far bank is out of a jump's reach (a jump spans about five cells), and the bot finds no way across in 150000 states`, jump === 0 && search(bare, far, [{ room: JP.garden, col: 28, row: 12 }], 150000, 1.5) === null);
    const clear = at(JP.garden, 14, 14, [FISH]);
    check('with it (taken at the overpass) the planks are there (placed on loading the room) and the bot crosses them to the far bank', PLANK_CELLS.every(([row, col]) => cell(clear.g, col, row) === PLANK_CODE) && search(clear, far, [{ room: JP.garden, col: 28, row: 12 }], 150000, 1.5) !== null);
  });
  // the hideout's door guard (a ninja at the low corridor under the roof) and the hood: the way on to the port runs through that door (the hall's far end is walled)
  SCOPE.section([JP.hideout, JP.hall, JP.port, JP.mole, JP.garden], 'the gates: the door guard and the hood', () => {
    const SAMURAI = FIRST_CREATURE + Object.keys(WORLD_CREATURES).indexOf('jpSamurai');
    const NINJA = FIRST_CREATURE + Object.keys(WORLD_CREATURES).indexOf('jpNinja');
    const sushi = (g: Game) => g.siCollected[itemIndex(g, JP.hideout, 0)] !== 0;
    const guard = at(JP.hideout, 17, 17, [], false, true);
    check('without the hood a ninja guards the hideout\'s door (its first creature slot) and a samurai paces the roof', guard.g.enemies[0]?.type === NINJA && guard.g.enemies[0].x !== 0xff && guard.g.enemies[1]?.type === SAMURAI);
    const stats = { exhausted: false };
    const port = (g: Game) => g.roomId === JP.port;
    const aim = [{ room: JP.hideout, col: 25, row: 19 }, { room: JP.hall, col: 25, row: 19 }] as const;
    guard.g.pulses = [];
    const noWay = search(guard, port, aim, 60000, 0, stats) === null && search(guard, sushi, [{ room: JP.hideout, col: 28, row: 15 }], 60000, 0) === null;
    check(`and the bot finds no way past him, neither to the sushi nor down the shaft to the port (60000 states looked at${stats.exhausted ? ', every one there is' : ', the search limit'}): the hall's far end is walled, so the hideout's door is the way on`, noWay);
    const hood = at(JP.hideout, 17, 17, [HOOD], false, true);
    check('with the ninja hood the door guard is gone (sent off the screen) and the roof samurai stays', must(hood.g.enemies[0], 'the guard').x === 0xff && must(hood.g.enemies[1], 'the roof samurai').x !== 0xff);
    check('and the bot walks in and takes the sushi', search(hood, sushi, [{ room: JP.hideout, col: 28, row: 15 }], 150000, 1.5) !== null);
    hood.g.pulses = [];
    check('and drops down the corridor\'s gap, down the hall\'s shaft and the rope, to the port', search(at(JP.hideout, 17, 17, [HOOD], false, true), port, aim, 150000, 1.5) !== null);
  });
});

// ---- the hood is a costume: it takes the rice hat's place -------------------------------------------------
SCOPE.section([CHI.top, JP.mole, JP.fuji, JP.hideout], 'the hood as a costume', () => {
  const rice = itemIndex(newGame(WORLD, false).g, CHI.top, 0), hood = itemIndex(newGame(WORLD, false).g, JP.mole, 0);
  const worn = hoodWorn(WORLD.bankImage);
  const s = newGame(WORLD, false);
  wear(s.g, rice);
  const pool0 = must(HAT_BLOCKS[0], 'the first hat block');
  const hatBlock = (g: Game) => g.mem.slice(pool0 * 64, pool0 * 64 + 63);
  const ricePicture = hatBlock(s.g);
  wear(s.g, hood);
  const first = worn.monty[0];
  check('putting on the hood writes its pictures over Monty\'s (the rice hat\'s go) and its sprite over the hat pool\'s',
    s.g.worn === hood && first !== undefined && first.ptr === 0x50 && s.g.mem.slice(0x50 * 64, 0x50 * 64 + 63).every((b, i) => b === first.block[i]) && !hatBlock(s.g).every((b, i) => b === ricePicture[i]));
  SCOPE.section([JP.fuji, JP.mole], 'the hood costume: its sprite over him', () => {
    const play = at(JP.fuji, 20, 8, []);
    wear(play.g, hood);
    run(play, NONE, 5);
    check('the hood is a sprite of its own over him (sprite 7, red), enabled', (play.g.vic.enable & 0x80) !== 0 && play.g.scol[7] === HOOD_COLOUR && HAT_BLOCKS.includes(play.g.sptr[7] ?? 0));
  });
  SCOPE.section([CHI.top, JP.mole], 'the hood costume: the rice hat again', () => {
    wear(s.g, rice);
    check('wearing the rice hat again (a game carried on from an older save) puts its pictures back over the hood\'s', s.g.worn === rice && hatBlock(s.g).every((b, i) => b === ricePicture[i]));
  });
  SCOPE.section([JP.hideout, JP.mole, CHI.top], 'the hood costume: kept in a save', () => {
    const a = newGame(WORLD, false);
    a.g.siCollected[hood] = 0x81;
    wear(a.g, hood);
    enterRoom(a.g, JP.hideout, 0x0c + 10 * 4, standY(17));
    for (let n = 0; n < 200 && (a.g.freeze || a.g.script); n++) frame(a, NONE);
    const b = newGame(WORLD, false);
    wear(b.g, rice);
    restore(b.g, CODEC.unpack(CODEC.pack(snapshot(a.g)), CODEC.format));
    check('a save made in the hood carries on in it (the hood as the worn item, its pictures in the bank, the guard gone)', b.g.worn === hood && b.g.enemies.filter((e) => e.type === FIRST_CREATURE + Object.keys(WORLD_CREATURES).indexOf('jpNinja')).every((e) => e.x === 0xff) && b.g.mem.slice(0x50 * 64, 0x50 * 64 + 63).every((v, i) => v === first?.block[i]));
  });
});

// ---- the joins: loops, the ways back, no trap -----------------------------------------------------------
SCOPE.section([...Object.values(JP), CHI.junk, CHI.willow, PAC.ship], 'the joins: loops, the ways back, no trap', () => {
  const reach = (from: State, aim: { room: number; col: number; row: number }, goal: (g: Game) => boolean, limit = 400000) => search(from, (g) => goal(g) && !g.freeze && !g.script, [aim], limit, 1.5);
  const into = (room: number, from: State, aim: { room: number; col: number; row: number }, limit = 150000) => reach(from, aim, (g) => g.roomId === room, limit) !== null;
  /** Into a room by a rope or a gap: and he is where there is something to hold or stand on (on the rope, or on a floor of the room), not in its stone. */
  const lands = (room: number, floors: readonly number[], from: State, aim: { room: number; col: number; row: number }, limit = 150000) =>
    reach(from, aim, (g) => g.roomId === room && (g.onRope !== 0 || floors.some((f) => g.y === standY(f))), limit) !== null;
  const quiet = (s: State) => { s.g.tunnels = []; s.g.pulses = []; return s; };
  SCOPE.section([CHI.junk, JP.harbour, CHI.willow], 'the joins: China\'s junk and the harbour', () => {
    check('China\'s junk walks east onto Japan\'s harbour (its deck) and the harbour walks west back onto the junk\'s deck', (() => { const s = at(CHI.junk, 27, 17, [[CHI.willow, 0]]); run(s, RIGHT, 100); const t = at(JP.harbour, 3, 17); run(t, LEFT, 100); return s.g.roomId === JP.harbour && t.g.roomId === CHI.junk; })());
  });
  SCOPE.section([JP.harbour, JP.street, JP.crossing, JP.parlour, CHI.junk], 'the joins: the harbour and the street', () => {
    check('the harbour and the street join twice: low (the quay) and high (the roof) both ways', into(JP.street, at(JP.harbour, 15, 17), { room: JP.harbour, col: 31, row: 15 }) && into(JP.harbour, at(JP.street, 5, 17), { room: JP.street, col: 0, row: 15 })
      && into(JP.street, at(JP.harbour, 25, 7), { room: JP.harbour, col: 31, row: 5 }) && into(JP.harbour, at(JP.street, 1, 7), { room: JP.street, col: 0, row: 5 }));
  });
  SCOPE.section([JP.street, JP.crossing, JP.harbour, JP.parlour, JP.platform, JP.garden], 'the joins: the street and the crossing', () => {
    check('the street and the crossing join twice: low and high, both ways', into(JP.crossing, at(JP.street, 5, 17), { room: JP.street, col: 31, row: 15 }) && into(JP.street, at(JP.crossing, 5, 17), { room: JP.crossing, col: 0, row: 15 })
      && into(JP.crossing, at(JP.street, 28, 7), { room: JP.street, col: 31, row: 5 }) && into(JP.street, at(JP.crossing, 1, 7), { room: JP.crossing, col: 0, row: 5 }));
  });
  SCOPE.section([JP.street, JP.harbour, JP.crossing, JP.parlour], 'the joins: the drainpipe', () => {
    check('the drainpipe joins the street to its roofs (up and down it)', search(at(JP.street, 2, 17), (g) => g.roomId === JP.street && g.y === standY(7) && colOf(g) >= 6, [{ room: JP.street, col: 8, row: 5 }], 100000, 1.5) !== null
      && search(at(JP.street, 8, 7), (g) => g.roomId === JP.street && g.y === standY(17), [{ room: JP.street, col: 3, row: 15 }], 100000, 1.5) !== null);
  });
  SCOPE.section([JP.street, JP.parlour, JP.harbour, JP.crossing, JP.platform], 'the joins: the street\'s rope and the parlour', () => {
    check('the street\'s gap lets him down its rope into the parlour and the parlour\'s rope climbs back up (both ends on the rope: the gaps are at the same cells)', lands(JP.parlour, [17], at(JP.street, 18, 17), { room: JP.street, col: 21, row: 19 }) && lands(JP.street, [17], at(JP.parlour, 18, 17), { room: JP.parlour, col: 21, row: 0 }));
  });
  SCOPE.section([JP.parlour, JP.platform, JP.street, JP.crossing, JP.fuji], 'the joins: the parlour and the underpass', () => {
    check('the parlour walks east into the underpass and the underpass west back into the parlour', into(JP.platform, at(JP.parlour, 25, 17), { room: JP.parlour, col: 31, row: 15 }) && into(JP.parlour, quiet(at(JP.platform, 5, 17)), { room: JP.platform, col: 0, row: 15 }));
  });
  SCOPE.section([JP.platform, JP.parlour, JP.crossing, JP.fuji], 'the joins: the underpass\'s stairs', () => {
    check('the underpass reaches the platform by both stairs (the bot climbs each)', [9, 20].every((c) => search(quiet(at(JP.platform, c - 3, 17)), (g) => g.roomId === JP.platform && g.y === standY(14), [{ room: JP.platform, col: c, row: 12 }], 100000, 1.5) !== null));
  });
  SCOPE.section([JP.crossing, JP.platform, JP.street, JP.garden, JP.parlour, JP.fuji], 'the joins: the subway rope, crossing and platform', () => {
    check('the crossing\'s subway rope lands him on the platform and the platform\'s rope climbs back to the crossing (the loop street, parlour, underpass, platform, crossing, street)',
      lands(JP.platform, [14], at(JP.crossing, 19, 17), { room: JP.crossing, col: 23, row: 19 }, 100000) && lands(JP.crossing, [17], quiet(at(JP.platform, 20, 14)), { room: JP.platform, col: 23, row: 0 }, 100000));
  });
  SCOPE.section([JP.platform, JP.fuji, JP.parlour, JP.crossing, JP.garden], 'the joins: the platform and the mountain', () => {
    check('the platform walks east into the mountain\'s foot (with the daruma) and the mountain walks west back onto the platform', into(JP.fuji, quiet(at(JP.platform, 24, 14, [DARUMA])), { room: JP.platform, col: 31, row: 13 }) && into(JP.platform, at(JP.fuji, 5, 14), { room: JP.fuji, col: 0, row: 13 }));
  });
  SCOPE.section([JP.fuji, JP.garden, JP.platform, JP.mole, JP.hall, JP.crossing], 'the joins: the mountain\'s chain and the garden', () => {
    check('the mountain\'s chain climbs into the garden and the garden\'s gap lets him down it again', lands(JP.garden, [14], at(JP.fuji, 8, 6), { room: JP.fuji, col: 5, row: 0 }, 200000) && lands(JP.fuji, [14, 8, 6], at(JP.garden, 2, 14), { room: JP.garden, col: 5, row: 19 }, 100000));
  });
  SCOPE.section([JP.garden, JP.mole, JP.crossing, JP.fuji, JP.hall, JP.hideout], 'the joins: the pergola\'s rope and the hidden room', () => {
    check('the pergola\'s rope climbs into THE LAST MOLE and the hidden room\'s rope drops back to the garden', lands(JP.mole, [14], at(JP.garden, 27, 10, [FISH]), { room: JP.garden, col: 28, row: 0 }, 100000) && lands(JP.garden, [14, 10], at(JP.mole, 30, 14), { room: JP.mole, col: 28, row: 19 }, 100000));
  });
  SCOPE.section([JP.garden, JP.hall, JP.fuji, JP.mole, JP.crossing, JP.hideout, JP.port], 'the joins: the garden\'s gate and the hall', () => {
    check('the garden\'s gate walks east into the hall and the hall west back into the garden', into(JP.hall, at(JP.garden, 27, 14), { room: JP.garden, col: 31, row: 13 }) && into(JP.garden, quiet(at(JP.hall, 3, 14)), { room: JP.hall, col: 0, row: 13 }));
  });
  SCOPE.section([JP.hall, JP.hideout, JP.garden, JP.port, JP.mole], 'the joins: the hall\'s rope and the roofs', () => {
    check('the hall\'s rope climbs from the gallery to the roofs and the roofs\' gap drops back to the hall', lands(JP.hideout, [17], quiet(at(JP.hall, 7, 8)), { room: JP.hall, col: 4, row: 0 }, 100000) && lands(JP.hall, [8, 14], at(JP.hideout, 8, 17), { room: JP.hideout, col: 4, row: 19 }, 100000));
  });
  SCOPE.section([JP.hideout, JP.hall, JP.port, JP.mole, JP.garden], 'the joins: the hideout down to the port', () => {
    check('the hideout\'s corridor gap (past the guard, in the hood) drops down the hall\'s walled shaft and the rope into the port', into(JP.port, quiet(at(JP.hideout, 21, 17, [HOOD])), { room: JP.hall, col: 25, row: 19 }, 150000));
  });
  SCOPE.section([JP.hall], 'the joins: the hall\'s far end is walled', () => {
    check('the hall\'s far end is walled: column 23 is solid from the ceiling to the floor between the doors\' side and the shaft (the hideout is the way on)', (() => { const s = at(JP.hall, 3, 14); return Array.from({ length: 15 }, (_, row) => s.g.flagAt(row + 3, 23 + 4)).every((f) => f === 1 || f === 2); })());
  });
  SCOPE.section([JP.port, JP.hall, JP.hideout, JP.mole, JP.garden, PAC.ship], 'the joins: the port back up to the hideout', () => {
    check('from the port he can climb the rope up the hall\'s shaft to the hideout (hood on)', search(quiet(at(JP.port, 22, 17, [HOOD])), (g) => g.roomId === JP.hideout && !g.freeze && !g.script, [{ room: JP.port, col: 25, row: 0 }, { room: JP.hall, col: 25, row: 0 }], 200000, 1.5) !== null);
  });
  SCOPE.section([JP.hideout, JP.hall, JP.garden, JP.mole, JP.port, JP.fuji], 'the joins: the hideout back to the garden', () => {
    check('and from the hideout down its left rope and out west of the hall to the garden (the way back runs the whole way)', reach(quiet(at(JP.hideout, 8, 17, [HOOD])), { room: JP.hideout, col: 4, row: 19 }, (g) => g.roomId === JP.hall, 150000) !== null
      && reach(at(JP.hall, 7, 8, [HOOD]), { room: JP.hall, col: 0, row: 13 }, (g) => g.roomId === JP.garden, 150000) !== null);
  });
  SCOPE.section([JP.port, JP.hall, PAC.ship], 'the joins: the ship\'s gangway', () => {
    check('the ship\'s gangway leads up to the deck, whose way east is open into the Pacific (the stern\'s landing)', (() => { const s = at(JP.port, 24, 17); return search(s, (g) => g.roomId === JP.port && g.y === standY(13) && colOf(g) >= 28, [{ room: JP.port, col: 28, row: 11 }], 100000, 1.5) !== null; })());
  });
});

// ---- hints, the map, saves --------------------------------------------------------------------------------
SCOPE.section([], 'hints, the map, saves', () => {
  const wants = [[JP.platform, 6, 17, 'THE SHUTTER OPENS FOR LUCK'], [JP.garden, 8, 14, 'HUNGRY KOI CROWD THE POND'], [JP.hideout, 6, 17, 'THE DOOR IS FOR NINJAS ONLY']] as const;
  for (const [room, col, floor, text] of wants) {
    SCOPE.section([room], 'hints: a room without what it wants', () => {
      const w = at(room, col, floor, [], true);
      run(w, NONE, 120);
      check(`ENHANCED: coming into room ${room} without what it wants says so ("${rowText(w.g)}")`, rowText(w.g) === text);
    });
  }
  SCOPE.section([JP.garden], 'hints: ORIGINAL says nothing', () => {
    const plain = at(JP.garden, 8, 14, [], false);
    run(plain, NONE, 120);
    check('ORIGINAL says nothing', rowText(plain.g) === 'KOI POLLOI');
  });
  for (const [item, text, floor] of [[DARUMA, 'DARUMA DOLLS GRANT WISHES', 9], [FISH, 'FISH FOOD: KOI FOLLOW FOOD', 7], [HOOD, 'A HOOD HIDES HIM FROM GUARDS', 14]] as const) {
    SCOPE.section([item[0]], 'hints: taking an item says what it is for', () => {
      const [room, nth] = item;
      const rec = must(JAPAN_ROOMS.find((r) => r.id === room)?.item, 'the item');
      const take = at(room, rec.col - 4, floor, [], true);
      for (let f = 0; f < 80 && !take.g.siCollected[itemIndex(take.g, room, nth)]; f++) frame(take, NONE);
      run(take, NONE, 3);
      check(`ENHANCED: taking the ${text.split(':')[0]?.toLowerCase()} says what it is for ("${rowText(take.g)}")`, rowText(take.g) === text && take.g.siCollected[itemIndex(take.g, room, nth)] !== 0);
    });
  }
  for (const n of ['sushi1', 'sushi2']) check(`the ${n} is a 200 point snack (a named item with the sushi's sprite)`, JAPAN_ROOMS.some((r) => r.item?.name === n && r.item.sprite === JAPAN_SPRITE.sushi));

  const s = newGame(WORLD, true);
  const info = montyMap.info(s.g, { rooms: {} });
  check(`the pause screen counts the snacks and the items over the four regions (${info.join(' | ')})`, info[2] === panelLine('SNACKS', WORLD.progress.cakes.length) && info[1] === panelLine('ITEMS', WORLD.progress.keyItems.length));
  enterRoom(s.g, JP.platform, 0x40, standY(17));
  const places = montyMap.places({ x: 0, y: 0, w: 200, h: 150 }, s.g, { rooms: { 31: [0x40, 0xb2, 2, 14], 32: [0x40, 0xb2, 2, 15] } });
  check('in Japan the map shows its region (five columns), the rooms he has been to are places to go', places.length === 2 && places.every((p) => p.x >= 0 && p.x < 200 && p.y >= 0 && p.y < 150));

  // a save made on coming into each of Japan's rooms (every key taken, the hood on) carries on in the same room, alive
  {
    const spots = ([[JP.harbour, 3, 17], [JP.street, 2, 17], [JP.parlour, 22, 17], [JP.crossing, 3, 17], [JP.platform, 5, 17], [JP.fuji, 3, 14], [JP.garden, 2, 14], [JP.mole, 30, 14], [JP.hideout, 10, 17], [JP.hall, 3, 14], [JP.port, 22, 17]] as const).filter(([room]) => SCOPE.has(room));
    const failed: number[] = [];
    const carried = spots.filter(([room, col, floor]) => {
      const a = newGame(WORLD, false);
      for (const [r, n] of [DARUMA, FISH, HOOD]) a.g.siCollected[itemIndex(a.g, r, n)] = 0x81;
      wear(a.g, itemIndex(a.g, JP.mole, 0));
      enterRoom(a.g, room, 0x0c + (col + 4) * 4, standY(floor));
      for (let n = 0; n < 200 && (a.g.freeze || a.g.script); n++) frame(a, NONE);
      const b = newGame(WORLD, false);
      restore(b.g, CODEC.unpack(CODEC.pack(snapshot(a.g)), CODEC.format));
      run(b, NONE, 4);
      // what the keys did in the room is as it was (the effects are put again on loading the room)
      const KOI_TYPE = FIRST_CREATURE + Object.keys(WORLD_CREATURES).indexOf('jpKoi'), GUARD_TYPE = FIRST_CREATURE + Object.keys(WORLD_CREATURES).indexOf('jpNinja');
      const effects = room === JP.platform ? SHUTTER_CELLS.every(([row, col]) => cell(b.g, col, row) === 0)
        : room === JP.garden ? PLANK_CELLS.every(([row, col]) => cell(b.g, col, row) === PLANK_CODE) && b.g.enemies.filter((e) => e.type === KOI_TYPE).every((e) => e.x === 0xff)
        : room === JP.hideout ? b.g.enemies.filter((e) => e.type === GUARD_TYPE).every((e) => e.x === 0xff)
        : true;
      b.g.enemies = [];
      b.g.enable &= 0x0f;
      b.g.vic.enable &= 0x0f;
      b.g.tunnels = [];
      run(b, NONE, 60);
      const ok = effects && b.g.roomId === room && !dead(b.g) && b.g.worn === itemIndex(b.g, JP.mole, 0);
      if (!ok) { failed.push(room); console.log(`   room ${room}: now in ${b.g.roomId}, dead ${dead(b.g)} (counter ${b.g.actionCounter}, script ${b.g.script ? 'yes' : 'no'}), worn ${b.g.worn}, at ${colOf(b.g)},${b.g.y}`); }
      return ok;
    }).length;
    check(`a save made on coming into each of Japan's eleven rooms packs, unpacks and carries on in the same room, alive, in the hood (${carried} of ${spots.length}${failed.length ? `; not in rooms ${failed.join(', ')}` : ''})`, carried === spots.length);
  }

  // a save from before Japan: the first four regions' arrays and a grid without Japan carry on in the new game
  const g1 = newGame(WORLD, true).g;
  const before = entriesBefore(JP.harbour, JP.port);
  const last = { coin: before.coins - 1, item: before.items - 1 }; // the last of the earlier regions' entries
  g1.siCollected[0] = 0x81; g1.siCollected[last.item] = 0x81; g1.coinCollected[0] = 0xff; g1.coinCollected[last.coin] = 0xff;
  const old = snapshot(g1);
  const shortGrid = Array.from(WORLD.exitGrid.image, (c) => (c >= JP.harbour && c !== 0xff ? 0xff : c));
  const oldSave = { ...old, coins: old.coins.slice(0, before.coins), items: old.items.slice(0, before.items), exitGrid: shortGrid, roomId: CHI.junk, worn: itemIndex(g1, CHI.top, 0) };
  const g2 = newGame(WORLD, true).g;
  restore(g2, CODEC.unpack(CODEC.pack(oldSave), CODEC.format));
  check('an old save (the regions before Japan\'s arrays and grids) loads: the finds and the rice hat are as saved, and Japan is on the grid, its coins and finds still to take',
    g2.siCollected[0] === 0x81 && g2.siCollected[last.item] === 0x81 && g2.coinCollected[0] === 0xff && g2.coinCollected[last.coin] === 0xff && g2.worn === oldSave.worn && g2.exitGrid[1 * WORLD.exitGrid.cols + 12] === JP.harbour && g2.siCollected.length === WORLD.specialItems.length / 4 && g2.coinCollected.length === WORLD.coinTable.length / 3 && g2.coinCollected.slice(before.coins).every((c) => c === 0));
});

// ---- the parlour's middle floor: off the rope clear of the ball stream, the coin taken in its lull, at any moment (Chris, 2026-11-25: the coin could only be had approaching in one go from the rope) ----
SCOPE.section([JP.parlour], 'the parlour\'s middle floor and its coin', () => {
  const coin = coinIndex(newGame(WORLD, false).g, JP.parlour, 16, 9);
  const ropeX2 = 0x0c + (21 + 4) * 4;
  const results = Array.from({ length: BALL_STREAM.period / 10 }, (_, k) => {
    const s = at(JP.parlour, 21, 17);
    enterRoom(s.g, JP.parlour, ropeX2, standY(11));
    s.g.enemies = []; // (the creatures as at(): the ghost by the rope is its own timing)
    run(s, NONE, 4 + k * 10);
    if (s.g.onRope === 0) return 'not on the rope';
    run(s, LEFT, 12); // (a step off, held a fifth of a second: he stops between the rope and the stream, on any of 16 frames' walk)
    const died = diesAt(s, NONE, BALL_STREAM.period + 10);
    if (died >= 0 || s.g.y !== standY(11) || colOf(s.g) < BALL_STREAM.col + BALL_STREAM.cols) return `stepping off ${k * 10} frames in: not standing clear at the floor's east end (${died >= 0 ? `dies ${died} frames on` : `at ${colOf(s.g)}, y ${s.g.y}`})`;
    return search(s, (g) => g.coinCollected[coin] !== 0 && !dead(g), [{ room: JP.parlour, col: 16, row: 9 }], 30000, 1.5) !== null ? '' : `stepping off ${k * 10} frames in: no way to the coin`;
  }).filter((r) => r !== '');
  check(`off the rope at any moment of the stream's ${BALL_STREAM.period} frames he stands clear of it at the middle floor's east end for a whole period, and the bot takes the coin from there (${results.length ? results.join('; ') : `${BALL_STREAM.period / 10} moments, all fine`})`, results.length === 0);
});

// ---- THE LAST MOLE: wider jumps, the koi across them, two sinking stones (Chris, 2026-11-25: more skill from platform to platform) -------
SCOPE.section([JP.mole, JP.garden], 'THE LAST MOLE: the stones', () => {
  const stick = (name: string) => must(ACTIONS.find(([n]) => n === name), name)[1];
  const stone = (k: number) => must(MOLE_STONES[k], `stone ${k}`);
  check(`six stepping stones as before (${MOLE_STONES.map(([c, r]) => `${c},${r}`).join(' ')}), the first jumps three cells wide`, MOLE_STONES.length === 6
    && stone(0)[0] - (stone(1)[0] + stone(1)[2]) === 3 && stone(1)[0] - (stone(2)[0] + stone(2)[2]) === 3);
  // a sinking stone: whole, then tipped (the warning) from 30 frames stood on, gone under him at 80, back 120 frames after
  const hi = stone(1);
  const sink = must(MOLE_SINKING[0], 'the first sinking stone');
  const on = at(JP.mole, hi[0], hi[1]);
  run(on, NONE, sink.crack + 2);
  const tipped = cell(on.g, hi[0], hi[1]) === sink.codes[1] && !dead(on.g);
  const sank = diesAt(on, NONE, sink.gone) >= 0;
  check(`the second and third stones sink (${MOLE_SINKING.map((c) => `${c.col},${c.row}`).join(' and ')}): stood on, one tips at ${sink.crack} frames (he is alive) and takes him under by ${sink.gone + 2}`, MOLE_SINKING.length === 2 && tipped && sank);
  const cross = at(JP.mole, hi[0], hi[1]);
  run(cross, NONE, sink.crack - 5);
  hold(cross, stick('J>'), 2);
  const away = hold(cross, NONE, 60);
  check('crossing is safe: a stone stood on for less than its warning and left (jumping back to the first) does not sink him', !away.dead && cross.g.y === standY(stone(0)[1]));
  // the whole crossing with the koi leaping, both ways, and the bonsai shelf still reached (down from the high ledge west of the bamboo rope)
  const hood = (g: Game) => g.siCollected[itemIndex(g, JP.mole, 0)] !== 0;
  check('with the koi leaping, the bot crosses from the rope up from the garden to the shrine and takes the hood',
    search(at(JP.mole, 30, 14, [], false, true), (g) => g.roomId === JP.mole && hood(g) && !dead(g), [{ room: JP.mole, col: 1, row: 12 }], 200000, 1.5) !== null);
  check('and crosses back from the shrine to the first stone',
    search(at(JP.mole, 1, 14, [HOOD], false, true), (g) => g.roomId === JP.mole && g.y === standY(stone(0)[1]) && colOf(g) >= stone(0)[0] - 1 && !dead(g), [{ room: JP.mole, col: stone(0)[0], row: 12 }], 200000, 1.5) !== null);
  check('the bonsai shelf is still a place to stand: the bot gets on to it from the stones',
    search(at(JP.mole, stone(2)[0], stone(2)[1]), (g) => g.roomId === JP.mole && g.y === standY(10) && colOf(g) <= 8 && !dead(g), [{ room: JP.mole, col: 4, row: 8 }], 200000, 1.5) !== null);
});

// ---- the parlour's Mole Crusher moves (the engine animates a lone shaft only with the first shaft's characters) ----------------------
SCOPE.section([JP.parlour], 'the parlour\'s Mole Crusher', () => {
  const roomSpec = must(JAPAN_ROOMS.find((r) => r.id === JP.parlour), 'the parlour');
  check('the parlour has one Mole Crusher (the engine picks its glyph bank: crushers.ts)', roomSpec.crushers?.length === 1);
  const watcher = at(JP.parlour, 24, 17);
  const pictures = new Set<string>(), states = new Set<number>();
  for (let f = 0; f < 900; f++) { frame(watcher, NONE); states.add(watcher.g.pd.state); pictures.add(Array.from(watcher.g.mem.subarray(0x80, 0xe0)).join()); }
  check(`it visibly crushes: over 900 frames its shaft takes ${pictures.size} pictures and goes down and back up (states ${[...states].join(',')})`, pictures.size > 10 && states.has(1) && states.has(2));
  const under = at(JP.parlour, 12, 17);
  const diedAt = diesAt(under, NONE, 1500);
  check(`and a mole standing under it dies as it comes down (at frame ${diedAt})`, diedAt >= 0);
  let throughAlive = 0, tried = 0;
  for (let wait = 0; wait < 220; wait += 10) {
    const s = at(JP.parlour, 20, 17);
    run(s, NONE, wait);
    tried++;
    for (let f = 0; f < 200 && !dead(s.g) && colOf(s.g) > 8; f++) frame(s, LEFT);
    if (!dead(s.g) && colOf(s.g) <= 8) throughAlive++;
  }
  check(`walking west across the lane under it from the machines to the stair, ${throughAlive} of ${tried} starts across its cycle get through (it can be timed: the cycle is a few seconds)`, throughAlive > 0 && throughAlive < tried);
});

// ---- NEON STREET's railway: a train over the roofs that touches nothing -------------------------------------------------------------
SCOPE.section([JP.street, JP.harbour, JP.crossing, JP.parlour], 'NEON STREET: the railway and the fire escape', () => {
  SCOPE.section([JP.street], 'NEON STREET: the train over the roofs', () => {
    const train = must(STREET_TRAIN, 'the street\'s train');
    check('the street has a train over the roofs on a viaduct (rows 0-1, a tunnel mouth with a picture) that is only scenery: harmless, no warning', train.room === JP.street && train.harmless === true && train.warn === 0 && train.top === 0 && train.bottom === 1 && train.picture?.length === 2);
    const codes = new Set((train.picture ?? []).flat().filter((c) => c !== 0));
    const s = at(JP.street, 8, 7);
    let seenFrames = 0;
    for (let f = 0; f < 700 && !dead(s.g); f++) {
      frame(s, NONE);
      const here = [0, 1].some((row) => Array.from({ length: 32 }, (_, c) => c).some((c) => codes.has(cell(s.g, c, row))));
      if (here) seenFrames++;
    }
    check(`it is drawn in the room's own characters and passes over the roofs (seen on ${seenFrames} of 700 frames) while he stands on the roof, alive`, seenFrames > 100 && seenFrames < 650 && !dead(s.g));
  });
  SCOPE.section([JP.street, JP.harbour, JP.crossing, JP.parlour], 'NEON STREET: the fire escape', () => {
    // the alley's fire escape joins the street to the roofs both ways
    check('the alley\'s fire escape climbs from the street to the roofs and down again (landings two rows apart)',
      search(at(JP.street, 12, 17), (g) => g.roomId === JP.street && g.y === standY(7) && colOf(g) >= 21, [{ room: JP.street, col: 22, row: 5 }], 120000, 1.5) !== null
      && search(at(JP.street, 22, 7), (g) => g.roomId === JP.street && g.y === standY(17) && colOf(g) <= 19, [{ room: JP.street, col: 17, row: 15 }], 120000, 1.5) !== null);
  });
});

// ---- THE CROSSING: taxis on the red man, the crowd on the green ------------------------------------------------------------------------
SCOPE.section([JP.crossing], 'THE CROSSING: taxis and the crowd', () => {
  const taxis = CROSSING_MOUTHS.filter((m) => !m.harmless), crowds = CROSSING_MOUTHS.filter((m) => m.harmless);
  check(`two taxis (deadly, from the left and from the right) and two crowd waves (harmless) cross the zebra's zone, columns ${CROSSING.zone.from}-${CROSSING.zone.to}, on a ${CROSSING.period} frame cycle`,
    taxis.length === 2 && crowds.length === 2 && taxis.every((m) => m.span?.from === CROSSING.zone.from && m.span.to === CROSSING.zone.to && m.warn === CROSSING.taxiWarn) && CROSSING_MOUTHS.every((m) => (m.rest ?? 0) + m.warn + ((m.span?.to ?? 31) - (m.span?.from ?? 0) + 1 + m.cols + 1) * m.step === CROSSING.period));
  // walking east across the zone from its start, every start across the cycle: those on the green get through, those into a taxi die
  let windows = '', safe = 0, hit = 0;
  for (let wait = 0; wait < CROSSING.period + 40; wait += 8) {
    const s = at(JP.crossing, 3, 17);
    run(s, NONE, wait);
    for (let f = 0; f < 420 && !dead(s.g) && colOf(s.g) < 19; f++) frame(s, RIGHT);
    if (dead(s.g)) { hit++; windows += '#'; } else if (colOf(s.g) >= 19) { safe++; windows += '.'; } else windows += 'o';
  }
  check(`walking east from the pavement at ${windows.length} starts across the cycle (${windows}): ${safe} get across, ${hit} are hit by a taxi`, safe > 0 && hit > 0 && hit < windows.length / 2);
  // the green window: every start from just after the second taxi to well before the next flash gets across
  let clear = true;
  for (let wait = 181; wait <= 330; wait += 7) {
    const s = at(JP.crossing, 3, 17);
    run(s, NONE, wait);
    for (let f = 0; f < 420 && !dead(s.g) && colOf(s.g) < 19; f++) frame(s, RIGHT);
    if (dead(s.g) || colOf(s.g) < 19) clear = false;
  }
  check('every start on the green man (frames 181 to 330 of the cycle) gets across alive: the whole crossing is a safe window, 370 frames, for a 192 frame walk', clear);
  // the crowd is only a picture: walking with it, he is not hurt
  const c = at(JP.crossing, 2, 17);
  run(c, NONE, 250);
  let crowdSeen = false;
  const crowdCodes = new Set(crowds.flatMap((m) => (m.picture ?? []).flat().filter((x) => x !== 0)));
  for (let f = 0; f < 200 && !dead(c.g); f++) { frame(c, RIGHT); if (Array.from({ length: 32 }, (_, k) => k).some((k) => crowdCodes.has(cell(c.g, k, 15)))) crowdSeen = true; }
  check('in the crowd\'s wave he walks through its pictured figures unhurt', crowdSeen && !dead(c.g));
  // the signals: the red man while the taxis have the road, the green man after
  const ref = pieceChar(WORLD, JP.crossing, 'jpWalkSignal');
  const sig = at(JP.crossing, 3, 17);
  const lit = (g: Game) => [0, 1].map((k) => Array.from(g.mem.subarray((ref + k) * 8, (ref + k) * 8 + 8)).join());
  const red = lit(sig.g);
  run(sig, NONE, 100);
  const stillRed = lit(sig.g).join() === red.join();
  run(sig, NONE, 160);
  const green = lit(sig.g);
  run(sig, NONE, 300);
  const nextRed = lit(sig.g);
  check('the signal shows the red man through the taxis\' turn (to frame 180) and the green man on the crowd\'s, then the red man again for the next cycle', stillRed && green.join() !== red.join() && nextRed.join() === red.join());
});


// ---- the joins are strict: what is open at one room's edge is open on the other side, at every height (a jump reaches any) ------------------------------
SCOPE.section([], 'the joins are strict: open edges match', () => {
  const cells = WORLD.exitGrid.image, cols = WORLD.exitGrid.cols;
  const roomAt = (row: number, col: number) => JAPAN_ROOMS.find((r) => r.id === cells[row * cols + col]);
  type Spec = (typeof JAPAN_ROOMS)[number];
  const propAt = (r: Spec, col: number, row: number) => {
    const ch = r.map[row]?.[col] ?? '.';
    return ch === '.' ? 0 : WORLD.tileProperty(r.tiles[Number(ch) - 1] ?? 0);
  };
  const solidAt = (r: Spec, col: number, row: number) => { const p = propAt(r, col, row); return p === 1 || p === 2; };
  /** An open edge cell he can be in: open, with a floor under it within a jump's reach (his body two cells, a jump two and a bit) and open cells between. */
  const reachable = (r: Spec, col: number, row: number) => {
    if (solidAt(r, col, row)) return false;
    for (let f = row + 1; f <= row + 4 && f < 20; f++) { if (solidAt(r, col, f)) return true; }
    return false;
  };
  const bad: string[] = [];
  for (const r of JAPAN_ROOMS) {
    const east = roomAt(r.row, r.col + 1);
    if (east && SCOPE.any([r.id, east.id])) for (let row = 0; row < 20; row++) {
      if ((reachable(r, 31, row) && solidAt(east, 0, row)) || (reachable(east, 0, row) && solidAt(r, 31, row))) bad.push(`${r.id}|${east.id} row ${row}`);
    }
  }
  check(`every edge cell of Japan's rooms that is open (not solid) on one side of a join is open on the other, at every row (${bad.length ? bad.join('; ') : 'none differ'})`, bad.length === 0);
});

// ---- MOUNT FUJI: SNOW SLIDES ----------------------------------------------------------------------------
SCOPE.section([JP.fuji], 'MOUNT FUJI: SNOW SLIDES', () => {
  const ball = must(WORLD.rollers.find((r) => r.room === JP.fuji), 'the mountain\'s snowball');
  const [foot, top] = FUJI_HUTS;
  const fuji = must(JAPAN_ROOMS.find((r) => r.id === JP.fuji), 'the mountain');
  check(`one snowball on the mountain, every ${FUJI_SNOW.every} frames, the first ${FUJI_SNOW.start} in; two huts; no creature to crowd its timing`, WORLD.rollers.filter((r) => r.room === JP.fuji).length === 1 && FUJI_HUTS.length === 2 && (fuji.enemies?.length ?? 0) === 0);
  /** Where the snowball is (its top left, in cells) in a game in the mountain, or null while it is not rolling. */
  const where = (g: Game) => {
    const t = g.rollers.find((r) => WORLD.rollers[r.index] === ball)?.t ?? 0, p = rollerAt(ball, t);
    return p ? { col: (p.x - pixelX(0)) / 8, row: (p.y - pixelY(0)) / 8 } : null;
  };
  const inHut = (h: { col0: number; floor: number }) => at(JP.fuji, h.col0 + 1, h.floor);
  // the huts are safe: two snowballs pass, he stands in each untouched
  const footSafe = diesAt(inHut(foot), NONE, 2 * FUJI_SNOW.every + FUJI_SNOW.start) < 0, topSafe = diesAt(inHut(top), NONE, 2 * FUJI_SNOW.every + FUJI_SNOW.start) < 0;
  check(`standing in the foot hut and in the top hut, two snowballs pass over him and neither touches him (foot ${footSafe}, top ${topSafe})`, footSafe && topSafe);
  // standing in the open on the climb when one comes kills him: on the first ledge, the two steps, the top of the climb
  const open = ([[15, 14], [21, 14], [24, 12], [27, 10], [26, 8]] as const).map(([col, floor]) => ({ col, floor, at: diesAt(at(JP.fuji, col, floor), NONE, FUJI_SNOW.every + FUJI_SNOW.start) }));
  check(`standing in the open on the climb, the first snowball kills him (${open.map((o) => `${o.col},${o.floor}: frame ${o.at}`).join('; ')})`, open.every((o) => o.at >= 0));
  // and walking straight on from the way in (a jump over the gap to the first ledge), it meets him on the first ledge
  const rush = at(JP.fuji, 0, 14);
  let rushed = -1;
  for (let f = 0; f < 300 && rushed < 0; f++) {
    frame(rush, colOf(rush.g) === FUJI.gap.col0 - 2 && !rush.g.montyAction && !rush.g.falling ? { ...RIGHT, fire: true } : RIGHT);
    if (dead(rush.g)) rushed = f;
  }
  check(`walking on from the way in without waiting, the first snowball meets him on the first ledge (frame ${rushed}, at column ${colOf(rush.g)})`, rushed >= 0 && rush.g.roomId === JP.fuji);
  // each part of the climb is crossed by waiting in a hut for a snowball to pass: up from the foot hut to the top hut, down from the top hut to the foot hut
  const passed = (s: State, gone: (p: { col: number; row: number }) => boolean) => {
    let seen = false;
    for (let f = 0; f < 2 * FUJI_SNOW.every && !dead(s.g); f++) {
      frame(s, NONE);
      const p = where(s.g);
      if (p && !gone(p)) seen = true;
      if (seen && (!p || gone(p))) return true;
    }
    return false;
  };
  const up = inHut(foot);
  const upWaited = passed(up, (p) => p.col < foot.col0 - 2);
  const upWay = upWaited && search(up, (g) => g.roomId === JP.fuji && colOf(g) >= top.col0 && colOf(g) <= top.wall1 - 1 && g.montyRow - PLAY_ROW === top.floor - 2, [{ room: JP.fuji, col: top.col0, row: top.floor - 2 }], 100000, 1.5);
  check(`up: waiting in the foot hut until a snowball has passed over it, he climbs to the top hut before the next (${upWay ? `${upWay.route.reduce((n, [, f]) => n + f, 0)} frames` : 'no way'})`, upWaited && upWay !== null && upWay !== false);
  const down = inHut(top);
  const downWaited = passed(down, (p) => p.row >= 12 || p.col < top.col0 - 2);
  const downWay = downWaited && search(down, (g) => g.roomId === JP.fuji && colOf(g) >= foot.col0 && colOf(g) <= foot.wall1 - 1 && g.montyRow - PLAY_ROW === foot.floor - 2, [{ room: JP.fuji, col: foot.col0 + 1, row: foot.floor - 2 }], 100000, 1.5);
  check(`down: waiting in the top hut until a snowball has gone down the climb, he goes down to the foot hut behind it (${downWay ? `${downWay.route.reduce((n, [, f]) => n + f, 0)} frames` : 'no way'})`, downWaited && downWay !== null && downWay !== false);
  // the rest of the room is clear: the second ledge west of the top hut, the last step and the chain
  const ledge = at(JP.fuji, 14, 8);
  check('the second ledge west of the top hut is clear of the snowballs (two pass, he stands there)', diesAt(ledge, NONE, 2 * FUJI_SNOW.every + FUJI_SNOW.start) < 0);
});

// ---- MOUNT FUJI's open mountainside and GONE WITH THE WIND --------------------------------------------------------
SCOPE.section([JP.fuji, JP.cave], 'MOUNT FUJI\'s open mountainside and the ice cave at its foot', () => {
  const fuji = must(JAPAN_ROOMS.find((r) => r.id === JP.fuji), 'the mountain'), cave = must(JAPAN_ROOMS.find((r) => r.id === JP.cave), 'the cave');
  const open = (map: readonly string[], row: number) => Array.from({ length: 32 }, (_, c) => map[row]?.[c] === '.');
  const foot = open(fuji.map, 19), mouth = open(cave.map, 0);
  check('no floor across MOUNT FUJI: under its ledges the drop runs through the room\'s foot (columns ' + `${FUJI.open.col0}-${FUJI.open.col1}), open where the cave\'s sinkhole is open and shut where it is shut`,
    [17, 18, 19].every((row) => Array.from({ length: FUJI.open.col1 - FUJI.open.col0 }, (_, i) => FUJI.open.col0 + 1 + i).every((c) => fuji.map[row]?.[c] === '.'))
      && foot.every((o, c) => o === mouth[c]) && foot.every((o, c) => o === (c >= FUJI.open.col0 && c <= FUJI.open.col1)));
  // a step off the ledge he came in on, into the gap: he falls through the mountain's foot into the cave, onto the snow under the sinkhole, alive
  const step = at(JP.fuji, FUJI.entry.col1 - 1, FUJI.floor);
  let fell = false;
  for (let f = 0; f < 200 && !dead(step.g); f++) { frame(step, step.g.roomId === JP.fuji && !step.g.falling ? RIGHT : NONE); if (step.g.roomId === JP.cave && !step.g.falling && !step.g.montyAction) { fell = true; break; } }
  check(`off the entry ledge into the gap, he drops into GONE WITH THE WIND and lands on the snow heap (room ${step.g.roomId}, row ${step.g.montyRow - PLAY_ROW}, alive ${!dead(step.g)})`, fell && !dead(step.g) && step.g.montyRow - PLAY_ROW + 2 <= CAVE.heap.floor);
  // the tengu: harmless (a cameo), he flies in from the tube's east end once Monty is down in the tube, and stays by the gust beckoning
  const tube = at(JP.cave, CAVE.hole.col0, CAVE.floor);
  for (let f = 0; f < 200; f++) frame(tube, NONE);
  const tengu = WORLD.cameos.find((c) => c.room === JP.cave);
  const shown = tengu !== undefined && (tube.g.enable & (1 << tengu.sprite)) !== 0 && tube.g.sx[tengu.sprite] === 0x0c + (CAVE.tengu.col + 4) * 4;
  check(`down in the tube, the tengu has flown in and stands by the gust (sprite ${tengu?.sprite}, x2 ${tengu ? tube.g.sx[tengu.sprite] : '-'}), a cameo touching nothing`, shown && !dead(tube.g));
  // the gust: whenever he walks into it (whatever its flicker shows), the wind sets him down at the top of the mountain's climb, standing, alive, the warp's sound
  const lifts = [0, 37, 91, 160].map((wait) => {
    const s = at(JP.cave, CAVE.mound.col0, CAVE.mound.floor);
    for (let f = 0; f < wait; f++) frame(s, NONE);
    let f = 0;
    for (; f < 120 && s.g.roomId === JP.cave; f++) frame(s, RIGHT);
    for (let n = 0; n < 60; n++) frame(s, NONE);
    return { wait, ok: s.g.roomId === JP.fuji && s.g.montyCol - PLAY_COL === FUJI.top.col && s.g.y === standY(FUJI.top.floor) && !dead(s.g), at: `${s.g.roomId} ${s.g.montyCol - PLAY_COL},${s.g.y}`, frames: f };
  });
  check(`into the tengu's gust from the ice mound after any wait, he is set down at the top of MOUNT FUJI's climb, the last step under the chain (${lifts.map((l) => `wait ${l.wait}: ${l.at} after ${l.frames}`).join('; ')})`, lifts.every((l) => l.ok));
  check('the gust is the cave\'s one teleporter and MOUNT FUJI has none (the only teleport in the game, a reward)', WORLD.teleporterCfg.length === 5 && WORLD.teleporterCfg[0] === JP.cave && cave.teleporter !== undefined && fuji.teleporter === undefined);
  // the dangers: the yuki-onna's drift reaches the tube's floor, the icicles fall on him
  const yuki = at(JP.cave, CAVE.yuki.col, CAVE.floor, [], false, true);
  check(`standing in the yuki-onna's lane, she drifts down onto him (frame ${diesAt(yuki, NONE, 400)})`, dead(yuki.g));
  const ice = CAVE.icicles.map((col) => diesAt(at(JP.cave, col, CAVE.floor), NONE, 200));
  check(`standing under each icicle, it falls on him (${ice.join(', ')})`, ice.every((f) => f >= 0));
});

SCOPE.report();
finish();
