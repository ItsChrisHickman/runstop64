/**
 * Japan's mechanisms, headless, each on its own with the room's creatures out of the way (the bot, japan.ts, plays them all together): the bullet trains sweeping the
 * platform (a picture drawn in the room's characters, a warning, deadly on the lane, safe below, a fair timing), the paper doors (open, shaking, shut over him, a wall),
 * the three gates (the shutter and the daruma, the koi and the fish food, the guard and the ninja hood), the hood as a costume in the rice hat's place, the joins (the
 * loop, the ways back, no trap), the layout's sanity (nothing drawn in a tile), the hints, the map, and a save from before Japan carrying on.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/japan-mechanisms.ts
 */
import { decorChars } from '../../montyotr/src/decor-chars';
import { enterRoom } from '../../montyotr/src/ending';
import type { Game } from '../../montyotr/src/game';
import { wear } from '../../montyotr/src/items';
import { montyMap } from '../../montyotr/src/map';
import { MOTR } from '../../montyotr/src/motr';
import { pulseCode, pulsePhase } from '../../montyotr/src/pulses';
import { restore, snapshot } from '../../montyotr/src/save';
import { frame, NONE, type State } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { must } from '../../shared/test/must';
import { hoodWorn, WORLD_CREATURES, WORLD_DECOR } from '../src/art';
import { JAPAN_CREATURES } from '../src/art/japan-creatures';
import { CHI } from '../src/china';
import { WORLD } from '../src/data';
import { HAT_BLOCKS } from '../src/hats';
import { DOOR_PULSES, DOORS, JAPAN_ROOMS, JP, PLANK_CELLS, PLANK_CODE, SHUTTER_CELLS, TRAIN, TRAIN_APART, TRAINS } from '../src/japan';
import { HOOD_COLOUR } from '../src/art/japan-hood';
import { JAPAN_SPRITE } from '../src/japan-pointers';
import { FIRST_CREATURE } from '../src/layout';
import { CODEC } from '../src/main';
import { newGame, search } from './bot';
import { cell, colOf, overCrowded, dead, diesAt, LEFT, RIGHT, UP, at, rowText, run } from './mech-kit';
import { coinIndex, creatureRooms, itemIndex, standY } from './route';

/** The items by name (the room's nth). */
const DARUMA = [JP.parlour, 0] as const, FISH = [JP.crossing, 0] as const, HOOD = [JP.mole, 0] as const;
const CREATURE_NAMES = Object.keys(JAPAN_CREATURES);

// ---- the data -------------------------------------------------------------------------------------
{
  const cells = WORLD.exitGrid.image;
  const cols = WORLD.exitGrid.cols;
  const grid = (row: number, col: number) => cells[row * cols + col];
  check('Japan is eleven rooms, a block of five columns (12-16) by three rows beside China\'s, room ids 27 to 37 (the three regions before it unchanged)',
    cells.filter((c) => c !== 0xff).length === 78 && [grid(1, 12), grid(1, 13), grid(2, 13), grid(1, 14), grid(2, 14), grid(2, 15), grid(1, 15), grid(0, 15), grid(0, 16), grid(1, 16), grid(2, 16)].join()
      === [JP.harbour, JP.street, JP.parlour, JP.crossing, JP.platform, JP.fuji, JP.garden, JP.mole, JP.tiers, JP.hall, JP.port].join() && grid(1, 11) === CHI.junk && grid(0, 12) === 0xff && grid(2, 12) === 0xff && grid(0, 13) === 0xff && grid(0, 14) === 0xff);
  const coinsIn = (lo: number, hi: number) => Array.from({ length: WORLD.coinTable.length / 3 }, (_, i) => WORLD.coinTable[i * 3] ?? 0).filter((r) => r >= lo && r <= hi).length;
  const itemsIn = (lo: number, hi: number) => Array.from({ length: WORLD.specialItems.length / 4 }, (_, i) => WORLD.specialItems[i * 4] ?? 0).filter((r) => r >= lo && r <= hi).length;
  check('the regions before Japan keep their coins and finds, in the same table places (first), and Japan adds 23 coins and 5 finds (two sushi, the daruma, the fish food, the ninja hood)',
    coinsIn(0, 26) === 44 && itemsIn(0, 26) === 13 && coinsIn(27, 37) === 23 && itemsIn(27, 37) === 5 && (WORLD.coinTable[43 * 3] ?? 99) <= 26 && (WORLD.coinTable[44 * 3] ?? 0) >= 27);
  check('19 key items and 23 snacks count on the pause screen', WORLD.progress.keyItems.length === 19 && WORLD.progress.cakes.length === 23);
  const rooms = creatureRooms(JAPAN_ROOMS);
  const most = Math.max(...[...rooms.values()].map((v) => v.size));
  check(`${rooms.size} kinds of creature in Japan's eleven rooms, none in more than two (${[...rooms.values()].map((v) => v.size).join(' ')})`, rooms.size === CREATURE_NAMES.length && rooms.size >= 8 && rooms.size <= 12 && most <= 2);
  const used = [...HAT_BLOCKS, ...Object.values(JAPAN_SPRITE)];
  check(`every block of the bank Japan uses is its own (${used.length} pointers, none twice, none Monty's: $50-$73) and its four items have pictures there`,
    new Set(used).size === used.length && used.every((p) => p < 0x50 || p > 0x73) && Object.values(JAPAN_SPRITE).every((p) => WORLD.bankImage.subarray(p * 64, p * 64 + 63).some((b) => b !== 0)));
  const crowded = overCrowded(JAPAN_ROOMS);
  check(`no room has a fourth creature (sprite 7 is the worn hat's: it would be a phantom; ${crowded.length ? `rooms ${crowded.join()}` : 'none do'})`, crowded.length === 0);
  check('Monty on the Run is as it was (no pictured tunnels, no pulse with an offset)', MOTR.tunnels.length === 0 && MOTR.pulses.every((p) => p.offset === undefined));
}

// ---- nothing drawn in a tile: the layout's sanity --------------------------------------------------------
{
  const decorTypes = Object.values(WORLD_DECOR);
  const problems: string[] = [];
  let pools = 0;
  for (const r of JAPAN_ROOMS) {
    const solid = (col: number, row: number) => {
      const ch = r.map[row]?.[col];
      if (ch === undefined) return true;
      if (ch === '.') return false;
      const tile = r.tiles[Number(ch) - 1];
      return tile !== undefined && WORLD.tileProperty(tile) !== 0;
    };
    const any = (col: number, row: number) => (r.map[row]?.[col] ?? '.') !== '.';
    const inRoom = (cx: number, cy: number) => ({ col: cx - 4, row: cy - 3 });
    for (const d of r.decor ?? []) {
      const { col, row } = inRoom(d.col, d.row);
      const w = typeof d.type === 'number' ? decorTypes[d.type]?.w ?? 1 : d.type.text.length, h = typeof d.type === 'number' ? decorTypes[d.type]?.h ?? 1 : 1;
      for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (any(col + x, row + y)) problems.push(`room ${r.id}: a decoration over a tile at ${col + x},${row + y}`);
      if (col < 0 || col + w > 32 || row < 0 || row + h > 20) problems.push(`room ${r.id}: a decoration off the playfield`);
    }
    /** The cells decorations are drawn in (a coin or an item there is covered by their characters). */
    const drawn = new Set((r.decor ?? []).flatMap((d) => {
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
    for (const t of placed) if (!first[t]) problems.push(`room ${r.id}: decoration ${t} did not fit in the character pool`);
    pools += [...placed].reduce((n, t) => n + (decorTypes[t]?.w ?? 0) * (decorTypes[t]?.h ?? 0), 0);
    if (r.tiles.length > 8) problems.push(`room ${r.id}: more than eight tiles`);
  }
  check(`no decoration, coin, item or creature of Japan's rooms is in a tile, every decoration fits its room's character pool, no more than eight tiles a room (${problems.length ? problems.join('; ') : `${pools} characters of decorations`})`, problems.length === 0);
}

// ---- the parlour: arriving by the rope and pausing at its top is safe ----------------------------------------
{
  for (const enhanced of [false, true]) {
    const found = search(at(JP.street, 18, 17, [], enhanced), (g) => g.roomId === JP.parlour && g.onRope !== 0, [{ room: JP.street, col: 21, row: 19 }], 150000, 1.5);
    const s = must(found?.end, 'a way down the rope');
    const lives = s.g.lives, arrived = s.g.roomId === JP.parlour && s.g.onRope !== 0, top = s.g.y;
    let died = false;
    for (let n = 0; n < 1500 && !died; n++) { frame(s, NONE); died = dead(s.g) || s.g.lives !== lives; }
    check(`${enhanced ? 'ENHANCED' : 'ORIGINAL'}: down the street's stairs into the parlour (arrived ${arrived}, y ${top}) and standing still at the rope's top for 1500 frames, the lantern ghost does not touch him`, arrived && !died);
  }
}

// ---- the bullet trains -------------------------------------------------------------------------------------
{
  const trainCodes = new Set(TRAINS.flatMap((t) => (t.picture ?? []).flat().filter((c) => c !== 0)));
  const lane = (g: Game, col: number) => [8, 9, 10, 11, 12, 13].some((row) => trainCodes.has(cell(g, col, row)));
  const right = must(TRAINS[0], 'the up train'), left = must(TRAINS[1], 'the down train');
  check(`two trains, ${TRAIN.cols} cells long and ${TRAIN.rows} tall on the platform lane (rows ${TRAIN.top}-${TRAIN.top + TRAIN.rows - 1}), the up one from the right and the down one from the left, ${TRAIN_APART} frames apart, taking turns, each a cell every ${TRAIN.step} frames`,
    TRAINS.length === 2 && right.from === 'right' && left.from === 'left' && right.cols === TRAIN.cols && left.picture?.length === TRAIN.rows && left.picture.every((r) => r.length === TRAIN.cols) && (left.offset ?? 0) - (right.offset ?? 0) === TRAIN_APART && right.step === TRAIN.step);
  const noses = [right.picture?.[5]?.[0], left.picture?.[5]?.[TRAIN.cols - 1], right.picture?.[0]?.[0], left.picture?.[0]?.[TRAIN.cols - 1], right.picture?.[0]?.[TRAIN.nose], left.picture?.[0]?.[TRAIN.cols - TRAIN.nose - 1]];
  check('each train\'s nose is at the end it goes in front: stepped (the front cells have no roof) and mirrored between the two', noses[0] !== 0 && noses[1] !== 0 && noses[2] === 0 && noses[3] === 0 && noses[4] !== 0 && noses[5] !== 0);
  check('its characters are tiles he passes through (class 0), so the picture is not a wall', [...trainCodes].every((code) => WORLD.tileProperty(must(JAPAN_ROOMS.find((r) => r.id === JP.platform), 'the platform').tiles[code - 1] ?? -1) === 0));
  // the sequence: quiet, a flashing edge at the right, the up train through, the down train
  {
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
  }
  // deadly on the lane, safe below it
  {
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
  }
  // a fair timing: the cycle has a quiet moment (no train on the platform, no edge flashing), and a dash from the second stairs' top to the way out through the open shutter, started in it, is always clear
  {
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
  }
  // and the up train's whole length: a 300 frame cycle for each
  {
    const s = at(JP.platform, 14, 17);
    run(s, NONE, TRAIN.first + TRAIN.warn + 10);
    let across = 0, started = false;
    for (let f = 0; f < 200; f++) { frame(s, NONE); const on = lane(s.g, 10); if (on) { started = true; across++; } else if (started) break; }
    check(`a train takes ${across} frames to go past a cell: its ${TRAIN.cols} cells at ${TRAIN.step} a cell (${TRAIN.cols * TRAIN.step})`, Math.abs(across - TRAIN.cols * TRAIN.step) <= 6);
  }
}

// ---- the paper doors ----------------------------------------------------------------------------------------
{
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
}

// ---- the hall's gallery: a second height, over the first two doors ----------------------------------------
{
  const s = at(JP.hall, 3, 14);
  s.g.pulses = [];
  const coin = coinIndex(s.g, JP.hall, 13, 6);
  const found = search(s, (g) => g.coinCollected[coin] !== 0 && g.roomId === JP.hall, [{ room: JP.hall, col: 13, row: 6 }], 150000, 1.5);
  check('the gallery: up the rope at the left and along the eaves through the partitions to the coin at its end (a floor of its own, row 8, with a hole through each of the first two partitions)', found !== null
    && [6, 12].every((c) => [5, 6, 7].every((row) => at(JP.hall, 3, 14).g.flagAt(row + 3, c + 4) === 0) && at(JP.hall, 3, 14).g.flagAt(8 + 3, c + 4) === 2));
}

// ---- the gallery's end: stepping off drops him to the floor before the third door, alive ----------------------
{
  for (const enhanced of [false, true]) {
    const s = at(JP.hall, 13, 8, [], enhanced);
    s.g.pulses = [];
    run(s, RIGHT, 60);
    run(s, NONE, 60);
    check(`${enhanced ? 'ENHANCED' : 'ORIGINAL'}: walking off the gallery's end he drops to the floor before the third door (col ${colOf(s.g)}, y ${s.g.y}) alive`, !dead(s.g) && s.g.y === standY(14) && colOf(s.g) >= 14 && colOf(s.g) < 18);
  }
}

// ---- the gates ------------------------------------------------------------------------------------------
{
  const arc = WORLD.jumpArc;
  let rise = 0;
  for (let i = 0; i < arc.length && arc[i] !== 0xff; i++) rise += arc[i] ?? 0;
  // the shutter and the daruma
  {
    const shut = at(JP.platform, 26, 14);
    shut.g.tunnels = [];
    check('without the daruma the platform\'s end is a roller shutter (its four cells hold the shutter tile)', SHUTTER_CELLS.length === 4 && SHUTTER_CELLS.every(([row, col]) => cell(shut.g, col, row) !== 0));
    const out = (g: Game) => g.roomId === JP.fuji;
    const stats = { exhausted: false };
    const noWay = search(shut, out, undefined, 80000, 0, stats) === null;
    check(`and the bot finds no way through it (80000 states looked at${stats.exhausted ? ', every one there is' : ', the search limit'}); a jump (${rise}) is lower than the wall over it`, noWay);
    const open = at(JP.platform, 26, 14, [DARUMA]);
    open.g.tunnels = [];
    check('with it (taken in the parlour) the shutter is gone and the bot walks out east into the mountain\'s foot', SHUTTER_CELLS.every(([row, col]) => cell(open.g, col, row) === 0) && search(open, out, undefined, 100000, 1.5) !== null);
  }
  // the koi and the fish food
  {
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
  }
  // the guard and the hood
  {
    const GUARD = FIRST_CREATURE + Object.keys(WORLD_CREATURES).indexOf('jpSamurai');
    const guard = at(JP.hall, 20, 14, [], false, true);
    check('without the hood there is a guard in the corridor (its first creature slot)', guard.g.enemies[0]?.type === GUARD && guard.g.enemies[0].x !== 0xff);
    const past = (g: Game) => g.roomId === JP.port;
    const stats = { exhausted: false };
    guard.g.pulses = [];
    const noWayPast = search(guard, past, [{ room: JP.hall, col: 25, row: 19 }], 60000, 0, stats) === null;
    check(`and the bot finds no way past him to the floor gap (60000 states looked at${stats.exhausted ? ', every one there is' : ', the search limit'}): the corridor is two cells high under a low ceiling, his lane`, noWayPast);
    const hood = at(JP.hall, 20, 14, [HOOD], false, true);
    check('with the ninja hood he is gone (sent off the screen)', must(hood.g.enemies[0], 'the guard').x === 0xff);
    hood.g.pulses = [];
    check('and the bot gets through to the floor gap and the rope down to the port', search(hood, past, [{ room: JP.hall, col: 25, row: 19 }], 100000, 1.5) !== null);
  }
}

// ---- the hood is a costume: it takes the rice hat's place -------------------------------------------------
{
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
  {
    const play = at(JP.fuji, 20, 8, []);
    wear(play.g, hood);
    run(play, NONE, 5);
    check('the hood is a sprite of its own over him (sprite 7, red), enabled', (play.g.vic.enable & 0x80) !== 0 && play.g.scol[7] === HOOD_COLOUR && HAT_BLOCKS.includes(play.g.sptr[7] ?? 0));
  }
  {
    wear(s.g, rice);
    check('wearing the rice hat again (a game carried on from an older save) puts its pictures back over the hood\'s', s.g.worn === rice && hatBlock(s.g).every((b, i) => b === ricePicture[i]));
  }
  {
    const a = newGame(WORLD, false);
    a.g.siCollected[hood] = 0x81;
    wear(a.g, hood);
    enterRoom(a.g, JP.hall, 0x0c + 6 * 4, standY(14));
    for (let n = 0; n < 200 && (a.g.freeze || a.g.script); n++) frame(a, NONE);
    const b = newGame(WORLD, false);
    wear(b.g, rice);
    restore(b.g, CODEC.unpack(CODEC.pack(snapshot(a.g)), CODEC.format));
    check('a save made in the hood carries on in it (the hood as the worn item, its pictures in the bank, the guard gone)', b.g.worn === hood && b.g.enemies.filter((e) => e.type === FIRST_CREATURE + Object.keys(WORLD_CREATURES).indexOf('jpSamurai')).every((e) => e.x === 0xff) && b.g.mem.slice(0x50 * 64, 0x50 * 64 + 63).every((v, i) => v === first?.block[i]));
  }
}

// ---- the joins: loops, the ways back, no trap -----------------------------------------------------------
{
  const reach = (from: State, aim: { room: number; col: number; row: number }, goal: (g: Game) => boolean, limit = 400000) => search(from, (g) => goal(g) && !g.freeze && !g.script, [aim], limit, 1.5);
  const into = (room: number, from: State, aim: { room: number; col: number; row: number }, limit = 150000) => reach(from, aim, (g) => g.roomId === room, limit) !== null;
  /** Into a room by a rope or a gap: and he is where there is something to hold or stand on (on the rope, or on a floor of the room), not in its stone. */
  const lands = (room: number, floors: readonly number[], from: State, aim: { room: number; col: number; row: number }, limit = 150000) =>
    reach(from, aim, (g) => g.roomId === room && (g.onRope !== 0 || floors.some((f) => g.y === standY(f))), limit) !== null;
  const quiet = (s: State) => { s.g.tunnels = []; s.g.pulses = []; return s; };
  check('China\'s junk walks east onto Japan\'s harbour (its deck) and the harbour walks west back onto the junk\'s deck', (() => { const s = at(CHI.junk, 27, 17, [[CHI.willow, 0]]); run(s, RIGHT, 100); const t = at(JP.harbour, 3, 17); run(t, LEFT, 100); return s.g.roomId === JP.harbour && t.g.roomId === CHI.junk; })());
  check('the harbour and the street join twice: low (the quay) and high (the roof) both ways', into(JP.street, at(JP.harbour, 15, 17), { room: JP.harbour, col: 31, row: 15 }) && into(JP.harbour, at(JP.street, 5, 17), { room: JP.street, col: 0, row: 15 })
    && into(JP.street, at(JP.harbour, 25, 7), { room: JP.harbour, col: 31, row: 5 }) && into(JP.harbour, at(JP.street, 1, 7), { room: JP.street, col: 0, row: 5 }));
  check('the street and the crossing join twice: low and high, both ways', into(JP.crossing, at(JP.street, 5, 17), { room: JP.street, col: 31, row: 15 }) && into(JP.street, at(JP.crossing, 5, 17), { room: JP.crossing, col: 0, row: 15 })
    && into(JP.crossing, at(JP.street, 28, 7), { room: JP.street, col: 31, row: 5 }) && into(JP.street, at(JP.crossing, 1, 7), { room: JP.crossing, col: 0, row: 5 }));
  check('the drainpipe joins the street to its roofs (up and down it)', search(at(JP.street, 2, 17), (g) => g.roomId === JP.street && g.y === standY(7) && colOf(g) >= 6, [{ room: JP.street, col: 8, row: 5 }], 100000, 1.5) !== null
    && search(at(JP.street, 8, 7), (g) => g.roomId === JP.street && g.y === standY(17), [{ room: JP.street, col: 3, row: 15 }], 100000, 1.5) !== null);
  check('the street\'s gap lets him down its rope into the parlour and the parlour\'s rope climbs back up (both ends on the rope: the gaps are at the same cells)', lands(JP.parlour, [17], at(JP.street, 18, 17), { room: JP.street, col: 21, row: 19 }) && lands(JP.street, [17], at(JP.parlour, 18, 17), { room: JP.parlour, col: 21, row: 0 }));
  check('the parlour walks east into the underpass and the underpass west back into the parlour', into(JP.platform, at(JP.parlour, 25, 17), { room: JP.parlour, col: 31, row: 15 }) && into(JP.parlour, quiet(at(JP.platform, 5, 17)), { room: JP.platform, col: 0, row: 15 }));
  check('the underpass reaches the platform by both stairs (the bot climbs each)', [9, 20].every((c) => search(quiet(at(JP.platform, c - 3, 17)), (g) => g.roomId === JP.platform && g.y === standY(14), [{ room: JP.platform, col: c, row: 12 }], 100000, 1.5) !== null));
  check('the crossing\'s subway rope lands him on the platform and the platform\'s rope climbs back to the crossing (the loop street, parlour, underpass, platform, crossing, street)',
    lands(JP.platform, [14], at(JP.crossing, 19, 17), { room: JP.crossing, col: 23, row: 19 }, 100000) && lands(JP.crossing, [17], quiet(at(JP.platform, 20, 14)), { room: JP.platform, col: 23, row: 0 }, 100000));
  check('the platform walks east into the mountain\'s foot (with the daruma) and the mountain walks west back onto the platform', into(JP.fuji, quiet(at(JP.platform, 24, 14, [DARUMA])), { room: JP.platform, col: 31, row: 13 }) && into(JP.platform, at(JP.fuji, 5, 14), { room: JP.fuji, col: 0, row: 13 }));
  check('the mountain\'s chain climbs into the garden and the garden\'s gap lets him down it again', lands(JP.garden, [14], at(JP.fuji, 8, 6), { room: JP.fuji, col: 5, row: 0 }, 200000) && lands(JP.fuji, [14, 8, 6], at(JP.garden, 2, 14), { room: JP.garden, col: 5, row: 19 }, 100000));
  check('the pergola\'s rope climbs into THE LAST MOLE and the hidden room\'s rope drops back to the garden', lands(JP.mole, [14], at(JP.garden, 27, 10, [FISH]), { room: JP.garden, col: 28, row: 0 }, 100000) && lands(JP.garden, [14, 10], at(JP.mole, 30, 14), { room: JP.mole, col: 28, row: 19 }, 100000));
  check('the garden\'s gate walks east into the hall and the hall west back into the garden', into(JP.hall, at(JP.garden, 27, 14), { room: JP.garden, col: 31, row: 13 }) && into(JP.garden, quiet(at(JP.hall, 3, 14)), { room: JP.hall, col: 0, row: 13 }));
  check('the hall\'s rope climbs to the roofs and the roofs\' gap drops back to the hall', lands(JP.tiers, [17], quiet(at(JP.hall, 3, 14)), { room: JP.hall, col: 4, row: 0 }, 100000) && lands(JP.hall, [14], at(JP.tiers, 8, 17), { room: JP.tiers, col: 4, row: 19 }, 100000));
  check('the hall\'s gap (past the guard) drops to the port and the port\'s rope climbs back to the hall', lands(JP.port, [17], quiet(at(JP.hall, 18, 14, [HOOD])), { room: JP.hall, col: 25, row: 19 }, 100000) && lands(JP.hall, [14], at(JP.port, 22, 17), { room: JP.port, col: 25, row: 0 }, 100000));
  check('from the port he can climb back to the hall with nothing in hand and out west to the garden (the way back runs the whole way)', reach(at(JP.port, 22, 17), { room: JP.port, col: 25, row: 0 }, (g) => g.roomId === JP.hall, 150000) !== null);
  check('the ship\'s gangway leads up to the deck, whose way east is open into the Pacific (the stern\'s landing)', (() => { const s = at(JP.port, 24, 17); return search(s, (g) => g.roomId === JP.port && g.y === standY(13) && colOf(g) >= 28, [{ room: JP.port, col: 28, row: 11 }], 100000, 1.5) !== null; })());
}

// ---- hints, the map, saves --------------------------------------------------------------------------------
{
  const wants = [[JP.platform, 6, 17, 'THE SHUTTER OPENS FOR LUCK'], [JP.garden, 8, 14, 'HUNGRY KOI CROWD THE POND'], [JP.hall, 3, 14, 'THE GUARD SPOTS OUTSIDERS']] as const;
  for (const [room, col, floor, text] of wants) {
    const w = at(room, col, floor, [], true);
    run(w, NONE, 120);
    check(`ENHANCED: coming into room ${room} without what it wants says so ("${rowText(w.g)}")`, rowText(w.g) === text);
  }
  const plain = at(JP.garden, 8, 14, [], false);
  run(plain, NONE, 120);
  check('ORIGINAL says nothing', rowText(plain.g) === 'KOI POLLOI');
  for (const [item, text, floor] of [[DARUMA, 'DARUMA DOLLS GRANT WISHES', 9], [FISH, 'FISH FOOD: KOI FOLLOW FOOD', 7], [HOOD, 'A HOOD HIDES HIM FROM GUARDS', 14]] as const) {
    const [room, nth] = item;
    const rec = must(JAPAN_ROOMS.find((r) => r.id === room)?.item, 'the item');
    const take = at(room, rec.col - 4, floor, [], true);
    for (let f = 0; f < 80 && !take.g.siCollected[itemIndex(take.g, room, nth)]; f++) frame(take, NONE);
    run(take, NONE, 3);
    check(`ENHANCED: taking the ${text.split(':')[0]?.toLowerCase()} says what it is for ("${rowText(take.g)}")`, rowText(take.g) === text && take.g.siCollected[itemIndex(take.g, room, nth)] !== 0);
  }
  for (const n of ['sushi1', 'sushi2']) check(`the ${n} is a 200 point snack (a named item with the sushi's sprite)`, JAPAN_ROOMS.some((r) => r.item?.name === n && r.item.sprite === JAPAN_SPRITE.sushi));

  const s = newGame(WORLD, true);
  const info = montyMap.info(s.g, { rooms: {} });
  check(`the pause screen counts the snacks and the items over the four regions (${info.join(' | ')})`, info[3] === 'SNACKS 0/23' && info[2] === 'ITEMS  0/19');
  enterRoom(s.g, JP.platform, 0x40, standY(17));
  const places = montyMap.places({ x: 0, y: 0, w: 200, h: 150 }, s.g, { rooms: { 31: [0x40, 0xb2, 2, 14], 32: [0x40, 0xb2, 2, 15] } });
  check('in Japan the map shows its region (five columns), the rooms he has been to are places to go', places.length === 2 && places.every((p) => p.x >= 0 && p.x < 200 && p.y >= 0 && p.y < 150));

  // a save made on coming into each of Japan's rooms (every key taken, the hood on) carries on in the same room, alive
  {
    const spots = [[JP.harbour, 3, 17], [JP.street, 2, 17], [JP.parlour, 22, 17], [JP.crossing, 3, 17], [JP.platform, 5, 17], [JP.fuji, 3, 14], [JP.garden, 2, 14], [JP.mole, 30, 14], [JP.tiers, 10, 17], [JP.hall, 3, 14], [JP.port, 22, 17]] as const;
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
      const KOI_TYPE = FIRST_CREATURE + Object.keys(WORLD_CREATURES).indexOf('jpKoi'), GUARD_TYPE = FIRST_CREATURE + Object.keys(WORLD_CREATURES).indexOf('jpSamurai');
      const effects = room === JP.platform ? SHUTTER_CELLS.every(([row, col]) => cell(b.g, col, row) === 0)
        : room === JP.garden ? PLANK_CELLS.every(([row, col]) => cell(b.g, col, row) === PLANK_CODE) && b.g.enemies.filter((e) => e.type === KOI_TYPE).every((e) => e.x === 0xff)
        : room === JP.hall ? b.g.enemies.filter((e) => e.type === GUARD_TYPE).every((e) => e.x === 0xff)
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
  g1.siCollected[0] = 0x81; g1.siCollected[5] = 0x81; g1.coinCollected[0] = 0xff; g1.coinCollected[30] = 0xff;
  const old = snapshot(g1);
  const shortGrid = Array.from(WORLD.exitGrid.image, (c) => (c >= JP.harbour && c !== 0xff ? 0xff : c));
  const oldSave = { ...old, coins: old.coins.slice(0, 44), items: old.items.slice(0, 13), exitGrid: shortGrid, roomId: CHI.junk, worn: itemIndex(g1, CHI.top, 0) };
  const g2 = newGame(WORLD, true).g;
  restore(g2, CODEC.unpack(CODEC.pack(oldSave), CODEC.format));
  check('an old save (the regions before Japan\'s arrays and grids) loads: the finds and the rice hat are as saved, and Japan is on the grid, its coins and finds still to take',
    g2.siCollected[0] === 0x81 && g2.siCollected[5] === 0x81 && g2.coinCollected[0] === 0xff && g2.coinCollected[30] === 0xff && g2.worn === oldSave.worn && g2.exitGrid[1 * WORLD.exitGrid.cols + 12] === JP.harbour && g2.siCollected.length === 43 && g2.coinCollected.length === 282 && g2.coinCollected.slice(44).every((c) => c === 0));
}

void LEFT;
finish();
