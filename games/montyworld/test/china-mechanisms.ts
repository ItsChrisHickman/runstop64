/**
 * China's mechanisms, headless, each on its own with the room's creatures out of the way (the bot, china.ts, plays them all together): the timed strikes (the
 * hutong's string of firecrackers going off in turn, the willow garden's three arms reaching over the river), the New Year dragon (six sprites on one path,
 * deadly where it touches, the street clear for long enough), the three gates (the trapdoor and the key, the city gate and the rice hat, the raft and the
 * bamboo), the rice hat as a costume taking the ushanka's place, the joins (the loop, the ways back, no trap), the hints, the map, and a save from before China
 * carrying on.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/china-mechanisms.ts [--room <rooms>]
 */
import { dragonUpdate, lapFrames, piecePlace } from '../../montyotr/src/dragons';
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
import { riceHatWorn } from '../src/art';
import { ARM_PULSES, AWNING_CRACKS, CHI, CHINA_ROOMS, CRACKER_PULSES, DOOR_CELLS, DRAGON, JUNK_CRACKS, JUNK_RAFT_CODE, RAFT_CELLS, TOWER_ROPE_CODE, TRAPDOOR_CELLS, TRAPDOOR_ROPE } from '../src/china';
import { CHINA_SPRITE, DRAGON_POINTERS } from '../src/china-pointers';
import { ADDED_ROOMS, WORLD } from '../src/data';
import { HAT_BLOCKS } from '../src/hats';
import { CODEC } from '../src/main';
import { ROOM } from '../src/moscow';
import { SIB } from '../src/siberia';
import { newGame } from '../../shared/monty/test/bot';
import { SCOPE } from './scope';
import { search } from './search';
import { at, cell, coinsIn, colOf, dead, diesAt, entriesBefore, itemsIn, keyItemsIn, LEFT, overCrowded, panelLine, RIGHT, rowText, run, snacksIn } from './mech-kit';
import { creatureRooms, itemIndex, standY } from './route';

/** The items by name (the room's nth). */
const KEY = [CHI.alley, 0] as const, HAT = [CHI.top, 0] as const, BAMBOO = [CHI.willow, 0] as const;

// ---- the data -------------------------------------------------------------------------------------
SCOPE.section([], 'the data: China on the grid, its entries, creatures, sprite blocks', () => {
  const cells = WORLD.exitGrid.image;
  const cols = WORLD.exitGrid.cols;
  const grid = (row: number, col: number) => cells[row * cols + col];
  check('China is eleven rooms, a block of four columns (8-11) by three rows beside Siberia\'s, room ids 18 to 26, HEAVEN CAN WAIT\'s 82 and DON\'T ROCK THE BOAT\'s 95 (added after the flight\'s; Moscow\'s and Siberia\'s unchanged)',
    cells.filter((c) => (c >= CHI.wall && c <= CHI.junk) || c === CHI.heaven || c === CHI.houhai).length === 11 && [grid(0, 8), grid(0, 9), grid(0, 10), grid(0, 11), grid(1, 8), grid(1, 9), grid(1, 10), grid(1, 11), grid(2, 8), grid(2, 9), grid(2, 10)].join()
      === [CHI.top, CHI.heaven, CHI.roofs, CHI.willow, CHI.tower, CHI.market, CHI.gate, CHI.junk, CHI.wall, CHI.alley, CHI.houhai].join() && grid(2, 7) === SIB.border && grid(1, 3) === ROOM.station && grid(2, 11) === 0xff);
  const before = entriesBefore(CHI.wall, CHI.junk);
  check('Moscow keeps its coins and finds, in the same table places (first), the regions before China come before its own entries, and China adds 17 coins and 5 finds (two dumplings, the key, the rice hat, the bamboo)',
    coinsIn(0, 8) === 14 && itemsIn(0, 8) === 4 && before.ordered && coinsIn(CHI.wall, CHI.junk) === 17 && itemsIn(CHI.wall, CHI.junk) === 5);
  const coinRooms = Array.from({ length: WORLD.coinTable.length / 3 }, (_, i) => WORLD.coinTable[i * 3] ?? 0);
  const firstAdded = coinRooms.indexOf(CHI.heaven);
  check('HEAVEN CAN WAIT\'s one coin and DON\'T ROCK THE BOAT\'s two are at the coin table\'s end with the other rooms added after every region (data.ts ADDED_ROOMS: no other coin\'s place moves, so every save keeps its coins), HEAVEN CAN WAIT\'s first; neither has a find',
    coinsIn(CHI.heaven, CHI.heaven) === 1 && coinsIn(CHI.houhai, CHI.houhai) === 2 && firstAdded >= 0 && coinRooms.slice(firstAdded).every((r) => ADDED_ROOMS.includes(r)) && coinRooms.lastIndexOf(CHI.houhai) > firstAdded
      && itemsIn(CHI.heaven, CHI.heaven) === 0 && itemsIn(CHI.houhai, CHI.houhai) === 0);
  check('China\'s 3 key items and 2 snacks count on the pause screen with the other regions\'', keyItemsIn(CHI.wall, CHI.junk) === 3 && snacksIn(CHI.wall, CHI.junk) === 2);
  const rooms = creatureRooms(CHINA_ROOMS);
  const most = Math.max(...[...rooms.values()].map((v) => v.size));
  check(`${rooms.size} kinds of creature in China's eleven rooms, none in more than three (${[...rooms.values()].map((v) => v.size).join(' ')}; three since the challenge pass gave its rooms three or four each)`, rooms.size >= 8 && rooms.size <= 12 && most <= 3);
  const crowded = overCrowded(CHINA_ROOMS);
  check(`no room has a fourth creature (sprite 7 is the worn ushanka's and rice hat's; ${crowded.length ? `rooms ${crowded.join()}` : 'none do'})`, crowded.length === 0);
  SCOPE.section([CHI.market], 'the data: the dragon\'s room is clear', () => {
    const market = must(CHINA_ROOMS.find((r) => r.id === CHI.market), 'the market');
    check('the dragon\'s room has no creature, item, lift or icicle (its sprites are the ones they would use)', !market.enemies?.length && !market.item && !market.cake && WORLD.lifts.every((l) => l.room !== CHI.market) && WORLD.icicles.every((i) => i.room !== CHI.market));
  });
  const used = [...HAT_BLOCKS, ...Object.values(CHINA_SPRITE), ...Object.values(DRAGON_POINTERS)];
  check(`every block of the bank China uses is its own (${used.length} pointers, none twice, none Monty's: $50-$73)`, new Set(used).size === used.length && used.every((p) => p < 0x50 || p > 0x73));
  const sprites = WORLD.itemSprites;
  check('no picture of the dragon is an item to the pickup (not collectable, not the treasure, the extra life or the smoke stack: its head is on sprite 0, which touching is picking up)',
    DRAGON.pieces.every((p) => p.frames.every((ptr) => !sprites.collectable(ptr) && ptr !== sprites.treasure && ptr !== sprites.extraLife && ptr !== sprites.fatal)));
  check('Monty on the Run is as it was (no timed strikes, no dragon)', MOTR.pulses.length === 0 && MOTR.dragons.length === 0);
});

// ---- the timed strikes: the firecrackers ------------------------------------------------------------
SCOPE.section([CHI.alley], 'the timed strikes: the hutong\'s firecrackers', () => {
  const first = must(CRACKER_PULSES[0], 'the first firecracker'), last = must(CRACKER_PULSES[CRACKER_PULSES.length - 1], 'the last');
  const col = (k: number) => must(CRACKER_PULSES[k], 'a firecracker').col;
  // what they look like in turn: hung, flickering, a bang, a scrap (empty), hung again at the period
  {
    const s = at(CHI.alley, 3, 17);
    const seen = CRACKER_PULSES.map(() => ({ lit: -1, live: -1, spent: -1 }));
    const liveFor = CRACKER_PULSES.map(() => 0);
    let hungAgain = -1;
    for (let f = 1; f <= first.period + 5; f++) {
      frame(s, NONE);
      CRACKER_PULSES.forEach((p, k) => {
        const c = cell(s.g, p.col, p.row), rec = seen[k];
        if (!rec) return;
        if (c === p.warnCode && rec.lit < 0) rec.lit = f;
        if (c === p.liveCode) { if (rec.live < 0) rec.live = f; liveFor[k] = (liveFor[k] ?? 0) + 1; }
        if (c === 0 && rec.live > 0 && rec.spent < 0) rec.spent = f;
      });
      if (f > first.period - 20 && cell(s.g, first.col, first.row) === first.idle && hungAgain < 0 && f >= first.period) hungAgain = f;
    }
    const offBy = CRACKER_PULSES.map((p, k) => (seen[k]?.live ?? -99) - (seen[0]?.live ?? 0) - (p.start - first.start));
    check(`the string goes off from the left end in turn: the first bang ${seen[0]?.live} frames in (the fuse flickering from frame ${seen[0]?.lit}), then a cell every ${(last.start - first.start) / (CRACKER_PULSES.length - 1)} frames, the last at frame ${seen[CRACKER_PULSES.length - 1]?.live}`,
      Math.abs((seen[0]?.live ?? 0) - (first.start + first.warn)) <= 2 && seen.every((r, k) => k === 0 || (r.live > (seen[k - 1]?.live ?? 0))) && offBy.every((d) => Math.abs(d) <= 2));
    check(`each is a bang for ${first.live} frames, then a scrap (empty) until the string is hung again at the end of its ${first.period}-frame period`, liveFor.every((n) => Math.abs(n - first.live) <= 2) && seen.every((r) => r.spent > r.live) && hungAgain >= 0);
    check('the pure timing is the data\'s: a cracker is idle, warns, is live, is spent by its start, warn and live frames',
      pulsePhase(first, first.start - 1) === 'idle' && pulsePhase(first, first.start) === 'warn' && pulsePhase(first, first.start + first.warn) === 'live' && pulsePhase(first, first.start + first.warn + first.live) === 'spent' && pulseCode(first, first.start + first.warn) === first.liveCode);
  }
  // deadly while live, only the cells they are in, nothing else
  const liveAt = (k: number) => CRACKER_PULSES[k]?.start ?? 0;
  {
    const s = at(CHI.alley, col(4) - 1, 9); // (his two cells are under the fourth and fifth crackers)
    const when = diesAt(s, NONE, first.period);
    check(`standing on the ledge under the fourth and fifth crackers he dies as the first of them goes off (frame ${when}; theirs at ${liveAt(3) + first.warn} and ${liveAt(4) + first.warn})`, when >= liveAt(3) + first.warn - 4 && when <= liveAt(4) + first.warn + 4);
  }
  {
    const s = at(CHI.alley, 28, 9);
    run(s, NONE, 2 * first.period);
    check('standing on the ledge beyond the last cracker (the key\'s end) nothing happens to him in two periods', !dead(s.g));
    const lane = at(CHI.alley, 20, 17);
    run(lane, NONE, 2 * first.period);
    check('on the lane under the ledge nothing happens to him either', !dead(lane.g));
  }
  {
    // the front outruns him: he walks right from the ledge's west end as the fuse is lit, and the bangs catch him
    const s = at(CHI.alley, 17, 9);
    run(s, NONE, first.start - 2);
    const when = diesAt(s, RIGHT, 200);
    check(`walking along the string with the fuse (a cell in 8 frames to its 6) it catches him (frame ${when} of the walk)`, when >= 0 && when < 150);
    // ... and he cannot go against it either: from the key's end west as it goes off
    const t = at(CHI.alley, 28, 9);
    run(t, NONE, first.start + first.warn);
    check('and against it, from the key\'s end into the bangs, it kills him', diesAt(t, LEFT, 120) >= 0);
  }
  {
    // crossing once it is spent (the front's last bang is over by start + 8 lags + warn + live): both ways, whole, before it is hung again
    const spent = last.start + last.warn + last.live;
    const there = at(CHI.alley, 17, 9);
    run(there, NONE, spent + 2);
    let crossed = -1;
    for (let f = 0; f < first.period - spent - 40 && crossed < 0; f++) { frame(there, RIGHT); if (colOf(there.g) >= 28) crossed = f; }
    check(`crossing after the last bang (frame ${spent}) to the key's end takes ${crossed} frames and he lives, before the string is hung again at ${first.period}`, crossed > 0 && !dead(there.g));
    const back = at(CHI.alley, 28, 9);
    run(back, NONE, spent + 2);
    let home = -1;
    for (let f = 0; f < first.period - spent - 40 && home < 0; f++) { frame(back, LEFT); if (colOf(back.g) <= 17) home = f; }
    check(`and back from the key's end takes ${home} frames and he lives`, home > 0 && !dead(back.g));
  }
  {
    // the key: it is on the ledge's end, past the string, and the hutong is a dead end with it
    const item = must(CHINA_ROOMS.find((r) => r.id === CHI.alley)?.item, 'the key');
    check('the key lies on the ledge\'s end (cell 28), the string\'s last cracker is at 27', item.col - 4 === 28 && col(CRACKER_PULSES.length - 1) === 27);
  }
});

// ---- the timed strikes: the willow garden's arms ------------------------------------------------------
SCOPE.section([CHI.willow], 'the timed strikes: the willow garden\'s arms', () => {
  const arm = (k: number) => must(ARM_PULSES[k * 2], 'an arm'), hand = (k: number) => must(ARM_PULSES[k * 2 + 1], 'a hand');
  // seen: each arm twitches, reaches (arm and hand cells), and is gone, a third of a period behind the last (the arms on their own: the koi's leaps out of the way, as the creatures are)
  const alone = (s: State): State => { s.g.rollers = []; return s; };
  {
    const s = alone(at(CHI.willow, 10, 15));
    const live: number[] = [-1, -1, -1], gone: number[] = [-1, -1, -1], flicker: number[] = [-1, -1, -1], run = [0, 0, 0];
    for (let f = 1; f <= arm(0).period + 5; f++) {
      frame(s, NONE);
      for (let k = 0; k < 3; k++) {
        const a = arm(k), c = cell(s.g, a.col, a.row + 3), h = cell(s.g, hand(k).col, hand(k).row);
        const shown = c === a.liveCode && h === hand(k).liveCode;
        if (shown && flicker[k] === -1) flicker[k] = f; // (it twitches first: shown a few frames at a time)
        run[k] = shown ? (run[k] ?? 0) + 1 : 0; // (and then is shown for good)
        if ((run[k] ?? 0) >= 12 && live[k] === -1) live[k] = f - 11;
        if (live[k] !== -1 && !shown && gone[k] === -1) gone[k] = f;
      }
    }
    check(`the three figures reach one after another: their arms (with hands) twitch from frames ${flicker.join(', ')} and are there from ${live.join(', ')}, a ${arm(1).start - arm(0).start}-frame start apart, each for ${arm(0).live} frames (gone at ${gone.join(', ')})`,
      live.every((l, k) => Math.abs(l - (arm(k).start + arm(k).warn)) <= 3) && gone.every((g, k) => Math.abs(g - (live[k] ?? 0) - arm(k).live) <= 3));
  }
  // deadly while they reach: over the gap he dies, on the shore three cells away he does not, and each arm in its own time
  for (let k = 0; k < 3; k++) {
    const a = arm(k);
    // held in the air in its column (as a jump over the gap would have him) the frames count until it has him
    const s = alone(at(CHI.willow, 10, 15));
    let when = -1;
    for (let f = 0; f < a.period && when < 0; f++) {
      s.g.x2 = 0x0c + (a.col + 4) * 4; s.g.y = standY(15) - 40; s.g.falling = 0;
      frame(s, NONE);
      if (dead(s.g)) when = f;
    }
    check(`the ${['first', 'second', 'third'][k]} arm kills what of him is under it: he dies ${when} frames in (it reaches at ${a.start + a.warn})`, when >= a.start + a.warn - 4 && when <= a.start + a.warn + 4);
  }
  {
    const s = alone(at(CHI.willow, 10, 15));
    run(s, NONE, 3 * arm(0).period);
    check('standing on the shore (cells 9-11) or on a stone away from the arms\' cells nothing happens in three periods', !dead(s.g));
    const stone = alone(at(CHI.willow, 16, 15));
    run(stone, NONE, 3 * arm(0).period);
    check('and on the first stone (cells 15-18, the arms are over the gaps either side)', !dead(stone.g));
    // the koi (Chris: "koi should jump"): leaping over the first two gaps, they leave him a place to wait on the shore and on the first stone, and they have him in the air over the gap
    const shore = at(CHI.willow, 9, 15), first = at(CHI.willow, 16, 15);
    run(shore, NONE, 460); run(first, NONE, 460);
    check('with the koi leaping, standing back on the shore (cell 9) and on the first stone\'s middle (16) he waits safely through two of their periods', !dead(shore.g) && !dead(first.g));
  }
  {
    // the crossing: the bot gets across all three gaps to the island and back, the arms and all
    const s = at(CHI.willow, 10, 15);
    const island = search(s, (g) => g.roomId === CHI.willow && !g.freeze && !g.script && g.y === standY(15) && colOf(g) >= 28, [{ room: CHI.willow, col: 29, row: 13 }], 400000, 1.5);
    check(`the bot crosses the three gaps to the island (${island ? island.route.reduce((n, [, f]) => n + f, 0) : 0} frames)`, island !== null);
    if (island) {
      const back = search(island.end, (g) => g.roomId === CHI.willow && !g.freeze && !g.script && g.y === standY(15) && colOf(g) <= 11, [{ room: CHI.willow, col: 10, row: 13 }], 400000, 1.5);
      check('and back to the shore', back !== null);
    }
    // the gaps are real: a jump rises 20 pixels and spans five cells; the river is deadly water, three cells wide at the first gap
    const fall = at(CHI.willow, 12, 15);
    run(fall, RIGHT, 100);
    check('walking off the shore into the river he dies', dead(fall.g) || colOf(fall.g) <= 14);
  }
});

// ---- the dragon ---------------------------------------------------------------------------------------
SCOPE.section([CHI.market, CHI.gate], 'the dragon', () => {
  const lap = lapFrames(DRAGON);
  const s = at(CHI.market, 3, 17);
  const places: [number, number][][] = [];
  const faces: number[][] = [];
  for (let f = 0; f < lap + 2; f++) {
    frame(s, NONE);
    places.push(DRAGON.pieces.map((p) => [s.g.sx[p.sprite] ?? 0, s.g.sy[p.sprite] ?? 0]));
    faces.push(DRAGON.pieces.map((p) => s.g.sptr[p.sprite] ?? 0));
  }
  check(`the dragon is six pieces on sprites 0, 1, 2, 4, 5 and 6 (all enabled: ${(s.g.vic.enable & 0x77).toString(2)}), a lap of ${lap} frames at a pixel a frame`, DRAGON.pieces.map((p) => p.sprite).join() === '0,1,2,4,5,6' && (s.g.vic.enable & 0x77) === 0x77 && lap > 300 && lap < 700);
  const moved = places.filter((p, i) => i > 0 && (p[0]?.[0] !== places[i - 1]?.[0][0] || p[0]?.[1] !== places[i - 1]?.[0][1])).length;
  check(`it moves (the head is somewhere new on ${moved} of ${places.length - 1} frames), and after a lap is where it was`, moved > lap / 2 && Math.abs((places[lap - 1]?.[0]?.[0] ?? 0) - (places[0]?.[0]?.[0] ?? 0)) <= 2 && Math.abs((places[lap - 1]?.[0]?.[1] ?? 0) - (places[0]?.[0]?.[1] ?? 0)) <= 2);
  // the pieces follow the head's path: each the gap behind
  {
    const t = 200;
    const head = piecePlace(DRAGON, 0, t), second = piecePlace(DRAGON, 1, t), tail = piecePlace(DRAGON, 5, t), early = piecePlace(DRAGON, 0, t - DRAGON.gap);
    check(`the pieces follow the head along its path, each ${DRAGON.gap} pixels behind the one in front (the second is where the head was ${DRAGON.gap} frames before: ${Math.round(second[0])},${Math.round(second[1])} and ${Math.round(early[0])},${Math.round(early[1])}), the tail ${5 * DRAGON.gap} behind (${Math.round(tail[0])},${Math.round(tail[1])}; head ${Math.round(head[0])},${Math.round(head[1])})`,
      Math.hypot(second[0] - early[0], second[1] - early[1]) < 1);
  }
  // the head faces the way it goes, its mouth opening and shutting
  {
    const head = faces.map((f) => f[0] ?? 0);
    const left: readonly number[] = [DRAGON_POINTERS.headLeftOpen, DRAGON_POINTERS.headLeftShut], right: readonly number[] = [DRAGON_POINTERS.headRightOpen, DRAGON_POINTERS.headRightShut];
    const seenLeft = head.some((p) => left.includes(p)), seenRight = head.some((p) => right.includes(p));
    const mouth = new Set(head.filter((p) => right.includes(p)));
    check('the head faces left when it goes left and right when it goes right, and opens and shuts its mouth', seenLeft && seenRight && mouth.size === 2);
  }
  // deadly where it touches: standing on the street where the head will come down, he dies; at the left, never
  {
    const near = at(CHI.market, 22, 17);
    const when = diesAt(near, NONE, 2 * lap);
    check(`standing on the street under the dragon's run (cell 22) it kills him within a lap (frame ${when})`, when >= 0 && when < lap);
    const far = at(CHI.market, 4, 17);
    run(far, NONE, 3 * lap);
    check('standing at the street\'s left (cell 4) nothing happens in three laps', !dead(far.g));
    const high = at(CHI.market, 4, 9);
    run(high, NONE, 3 * lap);
    check('nor on the awnings (cell 4)', !dead(high.g));
  }
  // fair: he can walk the street from the rope's foot to the way out when the dragon is up and not when it is down
  {
    let clear = 0, hit = 0, windows = '';
    const step = 8;
    for (let wait = 0; wait < lap; wait += step) {
      const s = at(CHI.market, 13, 17);
      run(s, NONE, wait);
      let out = false;
      for (let f = 0; f < 260 && !out && !dead(s.g); f++) { frame(s, RIGHT); if (s.g.roomId === CHI.gate || colOf(s.g) >= 29) out = true; }
      if (out && !dead(s.g)) clear++; else hit++;
      windows += out && !dead(s.g) ? '.' : '#';
    }
    const total = clear + hit;
    check(`the street from cell 13 to the way out is clear for a walk at ${clear} of ${total} starts across a lap (${windows}): a fair timing, not shut and not open`, clear / total >= 0.3 && hit / total >= 0.2);
  }
  // pieces' pictures are in the bank
  {
    const g = s.g;
    check('the dragon\'s pictures are in the bank (every pointer it shows has lit pixels)', DRAGON.pieces.every((p) => p.frames.every((ptr) => g.mem.subarray(ptr * 64, ptr * 64 + 63).some((b) => b !== 0))));
    void dragonUpdate;
  }
});

// ---- the gates ------------------------------------------------------------------------------------------
SCOPE.section([CHI.tower, CHI.top, CHI.alley, CHI.market, CHI.wall, CHI.gate, CHI.roofs, CHI.junk, CHI.willow], 'the gates', () => {
  const reach = (from: State, aim: { room: number; col: number; row: number }, goal: (g: Game) => boolean, limit = 400000) => search(from, (g) => goal(g) && !g.freeze && !g.script, [aim], limit, 1.5);
  /**
   * A gate used on the spot and kept (data.ts: `at`, `keep`; the back-half plan's "Cause and effect for every gate"): carrying the item but away from the gate it is still shut; where he uses it, it gives
   * way (the item used there, seen) and its keep find is taken; coming into the room again anywhere, it is open as the room loads.
   */
  const usedAndKept = (what: string, room: number, item: readonly [number, number], far: readonly [col: number, floor: number], near: readonly [col: number, floor: number], open: (g: Game) => boolean): void => {
    const away = at(room, far[0], far[1], [item]);
    run(away, NONE, 2);
    const s = at(room, near[0], near[1], [item]);
    const shutBefore = !open(s.g);
    frame(s, NONE);
    const keep = WORLD.roomEffects.find((e) => e.room === room && e.at)?.at?.keep ?? -1;
    check(`${what}: carried but away from it (column ${far[0]}) it is shut; at it (column ${near[0]}) it gives way at once, and is kept (its find taken)`, !open(away.g) && shutBefore && open(s.g) && keep >= 0 && !!s.g.siCollected[keep]);
    enterRoom(s.g, room, 0x0c + (far[0] + 4) * 4, standY(far[1]));
    for (let n = 0; n < 200 && (s.g.freeze || s.g.script); n++) frame(s, NONE);
    check(`${what}: coming into the room again (column ${far[0]}) it is open as the room loads`, open(s.g));
  };
  // the trapdoor and the key
  SCOPE.section([CHI.tower, CHI.top, CHI.alley, CHI.market, CHI.wall], 'the gates: the trapdoor and the key', () => {
    const shut = at(CHI.tower, 16, 9);
    check('without the key the tower\'s ceiling is the trapdoor (its cells hold the plank tile, the rope under it stops at row 2)',
      TRAPDOOR_CELLS.every(([row, col]) => cell(shut.g, col, row) !== 0 && cell(shut.g, col, row) !== TOWER_ROPE_CODE) && cell(shut.g, 16, 2) === TOWER_ROPE_CODE);
    const unplugged = (g: Game) => TRAPDOOR_CELLS.filter(([, col]) => col !== 16).every(([row, col]) => cell(g, col, row) === 0) && TRAPDOOR_ROPE.every(([row, col]) => cell(g, col, row) === TOWER_ROPE_CODE);
    usedAndKept('the trapdoor and the key (the plug gone, the rope to the top)', CHI.tower, KEY, [6, 17], [16, 9], unplugged);
    const open = at(CHI.tower, 16, 9, [KEY]);
    frame(open, NONE);
    check('with it, by the rope, the plug is gone and the rope reaches the top', unplugged(open.g));
    const without = reach(shut, { room: CHI.tower, col: 16, row: 0 }, (g) => g.roomId === CHI.top, 150000);
    check('and the bot finds no way up through the trapdoor without the key (a pointer, not the proof: the plug is solid)', without === null);
    const with_ = reach(open, { room: CHI.tower, col: 16, row: 0 }, (g) => g.roomId === CHI.top, 200000);
    check('with the key it climbs the rope into the wall\'s top', with_ !== null);
  });
  // the city gate and the rice hat
  SCOPE.section([CHI.gate, CHI.top, CHI.market, CHI.roofs], 'the gates: the city gate and the rice hat', () => {
    // the doors are six rows (48 pixels) of lacquer under the tower's brick: a jump rises 20, so with them there is no way over; with the hat they are gone
    const arc = WORLD.jumpArc;
    let rise = 0;
    for (let i = 0; i < arc.length && arc[i] !== 0xff; i++) rise += arc[i] ?? 0;
    const shut = at(CHI.gate, 10, 17);
    const past = (g: Game) => g.roomId === CHI.gate && colOf(g) >= 18;
    check(`the doors (cols 14-17, rows 11-16, ${6 * 8} pixels) are higher than a jump (${rise}) under solid brick to the roof: shut`, rise < 6 * 8 && DOOR_CELLS.every(([row, col]) => cell(shut.g, col, row) !== 0) && cell(shut.g, 15, 5) !== 0);
    check('and the bot finds no way past them in 150000 states (a pointer)', search(shut, past, undefined, 150000, 0) === null);
    const doorsGone = (g: Game) => DOOR_CELLS.every(([row, col]) => cell(g, col, row) === 0);
    usedAndKept('the city gate and the rice hat (the doors gone)', CHI.gate, HAT, [3, 17], [10, 17], doorsGone);
    const open = at(CHI.gate, 10, 17, [HAT]);
    frame(open, NONE);
    check('with the rice hat taken, at the gate, the doors are gone (empty cells), and the bot gets through into the inner court', doorsGone(open.g) && search(open, past, undefined, 200000, 0) !== null);
  });
  // the raft and the bamboo
  SCOPE.section([CHI.junk, CHI.willow], 'the gates: the raft and the bamboo', () => {
    const bare = at(CHI.junk, 14, 17);
    const deck = (g: Game) => g.roomId === CHI.junk && colOf(g) >= 26 && g.y === standY(17);
    check('without the bamboo the river is seven cells of deadly water and the bot finds no way to the junk\'s deck in 150000 states', RAFT_CELLS.every(([row, col]) => cell(bare.g, col, row) !== JUNK_RAFT_CODE && cell(bare.g, col, row) !== 0) && search(bare, deck, undefined, 150000, 0) === null);
    const laid = (g: Game) => RAFT_CELLS.every(([row, col]) => cell(g, col, row) === JUNK_RAFT_CODE);
    usedAndKept('the raft and the bamboo (the raft laid)', CHI.junk, BAMBOO, [3, 17], [14, 17], laid);
    const raft = at(CHI.junk, 14, 17, [BAMBOO]);
    raft.g.rollers = []; // (the gate on its own: the carp's leap is the bot's, china.ts)
    frame(raft, NONE);
    check('with it (taken in the garden), at the jetty\'s end, the raft is laid and the bot walks over it to the junk\'s deck', laid(raft.g) && search(raft, deck, undefined, 400000, 1.5) !== null);
  });
});

// ---- the rice hat is a costume: it takes the ushanka's place -----------------------------------------
SCOPE.section([CHI.top, ROOM.platform, CHI.wall, CHI.gate], 'the rice hat as a costume', () => {
  const ushanka = itemIndex(newGame(WORLD, false).g, ROOM.platform, 1), hat = itemIndex(newGame(WORLD, false).g, CHI.top, 0);
  const rice = riceHatWorn(WORLD.bankImage);
  const s = newGame(WORLD, false);
  wear(s.g, ushanka);
  const wore = s.g.mem.slice(0x50 * 64, 0x50 * 64 + 63);
  const pool0 = must(HAT_BLOCKS[0], 'the first hat block');
  const hatBlock = (g: Game) => g.mem.slice(pool0 * 64, pool0 * 64 + 63);
  const ushankaPicture = hatBlock(s.g);
  wear(s.g, hat);
  const first = rice.monty[0];
  check('putting on the rice hat writes its pictures over Monty\'s (the ushanka\'s go) and its sprite over the hat pool\'s',
    s.g.worn === hat && first !== undefined && first.ptr === 0x50 && s.g.mem.slice(0x50 * 64, 0x50 * 64 + 63).every((b, i) => b === first.block[i]) && !s.g.mem.slice(0x50 * 64, 0x50 * 64 + 63).every((b, i) => b === wore[i]) && !hatBlock(s.g).every((b, i) => b === ushankaPicture[i]));
  // the overlay on his sprite: sprite 7 in straw yellow at the hat's place
  SCOPE.section([CHI.wall, CHI.top, ROOM.platform], 'the rice hat costume: its sprite over him', () => {
    const play = at(CHI.wall, 20, 9, [], false, false);
    wear(play.g, hat);
    run(play, NONE, 5);
    check('the hat is a sprite of its own over him (sprite 7, straw yellow), enabled', (play.g.vic.enable & 0x80) !== 0 && play.g.scol[7] === 7 && HAT_BLOCKS.includes(play.g.sptr[7] ?? 0));
    const ush = at(CHI.wall, 20, 9);
    wear(ush.g, ushanka);
    run(ush, NONE, 5);
    check('and in the ushanka it is fur brown (colour 9), as before', (ush.g.vic.enable & 0x80) !== 0 && ush.g.scol[7] === 9);
  });
  // wearing the ushanka again on the same game (a save carried on) puts its hat pictures back
  SCOPE.section([CHI.top, ROOM.platform], 'the rice hat costume: the ushanka again', () => {
    wear(s.g, ushanka);
    check('wearing the ushanka again (a game carried on from an older save) puts its hat\'s pictures back over the rice hat\'s', s.g.worn === ushanka && hatBlock(s.g).every((b, i) => b === ushankaPicture[i]));
  });
  // taken, kept in a save, worn on again
  SCOPE.section([CHI.gate, CHI.top, ROOM.platform], 'the rice hat costume: kept in a save', () => {
    const a = newGame(WORLD, false);
    a.g.siCollected[hat] = 0x81;
    wear(a.g, hat);
    enterRoom(a.g, CHI.gate, 0x0c + 20 * 4, standY(17));
    for (let n = 0; n < 200 && (a.g.freeze || a.g.script); n++) frame(a, NONE);
    const b = newGame(WORLD, false);
    wear(b.g, ushanka);
    restore(b.g, CODEC.unpack(CODEC.pack(snapshot(a.g)), CODEC.format));
    check('a save made in the rice hat carries on in it (the hat as the worn item, its pictures in the bank, the doors open)', b.g.worn === hat && b.g.mem.slice(0x50 * 64, 0x50 * 64 + 63).every((v, i) => v === first?.block[i]) && cell(b.g, 15, 12) === 0);
  });
});

// ---- the joins: loops, the ways back, no trap -----------------------------------------------------------
SCOPE.section([...Object.values(CHI), ...Object.values(SIB)], 'the joins: loops, the ways back, no trap', () => {
  const reach = (from: State, aim: { room: number; col: number; row: number }, goal: (g: Game) => boolean, limit = 400000) => search(from, (g) => goal(g) && !g.freeze && !g.script, [aim], limit, 1.5);
  const into = (room: number, from: State, aim: { room: number; col: number; row: number }, limit?: number) => reach(from, aim, (g) => g.roomId === room, limit) !== null;
  /** Into a room by a rope or a gap: and he is where there is something to hold or stand on (on the rope, or on a floor of the room), not in its stone. */
  const lands = (room: number, floors: readonly number[], from: State, aim: { room: number; col: number; row: number }, limit?: number) =>
    reach(from, aim, (g) => g.roomId === room && (g.onRope !== 0 || floors.some((f) => g.y === standY(f))), limit) !== null;
  SCOPE.section([SIB.border, CHI.wall, ...Object.values(SIB)], 'the joins: the village onto the wall\'s foot', () => {
    check('Siberia\'s village walks east onto the wall\'s foot (the planks are gone)', (() => { const s = at(SIB.border, 24, 17, siberiaFinds()); run(s, RIGHT, 140); return s.g.roomId === CHI.wall; })());
  });
  SCOPE.section([CHI.wall, SIB.border], 'the joins: the wall\'s foot back to the village', () => {
    check('the wall\'s foot walks west back to the village', (() => { const s = at(CHI.wall, 3, 17); run(s, LEFT, 80); return s.g.roomId === SIB.border; })());
  });
  SCOPE.section([CHI.wall, CHI.alley, SIB.border, CHI.tower, CHI.market], 'the joins: the tunnel, wall and hutong', () => {
    check('the tunnel under the wall leads east to the hutong and the hutong west back to the wall', into(CHI.alley, at(CHI.wall, 20, 17), { room: CHI.wall, col: 31, row: 15 }) && into(CHI.wall, at(CHI.alley, 12, 17), { room: CHI.alley, col: 0, row: 15 }));
  });
  SCOPE.section([CHI.alley, CHI.market, CHI.wall, CHI.tower, CHI.gate], 'the joins: the hutong\'s rope and the market', () => {
    check('the hutong\'s rope climbs into the market\'s street, and the street\'s gap lets him down it again (both ends on the rope: the gaps are at the same cells)', lands(CHI.market, [17], at(CHI.alley, 5, 17), { room: CHI.alley, col: 4, row: 0 }, 100000) && lands(CHI.alley, [17], at(CHI.market, 7, 17), { room: CHI.market, col: 4, row: 19 }, 100000));
  });
  SCOPE.section([CHI.market, CHI.tower, CHI.alley, CHI.gate, CHI.wall, CHI.top], 'the joins: the market west into the tower', () => {
    check('the market walks west into the tower, low (the hall) and high (the walkway)', into(CHI.tower, at(CHI.market, 8, 17), { room: CHI.market, col: 0, row: 15 }, 100000) && into(CHI.tower, at(CHI.market, 5, 9), { room: CHI.market, col: 0, row: 7 }, 100000));
  });
  SCOPE.section([CHI.market, CHI.tower, CHI.alley, CHI.gate, CHI.wall, CHI.top], 'the joins: the tower east into the market', () => {
    check('the tower walks east into the market, low and high', into(CHI.market, at(CHI.tower, 28, 17), { room: CHI.tower, col: 31, row: 15 }, 100000) && into(CHI.market, at(CHI.tower, 28, 9), { room: CHI.tower, col: 31, row: 7 }, 100000));
  });
  SCOPE.section([CHI.tower, CHI.wall, CHI.market, CHI.top, SIB.border, CHI.alley], 'the joins: the tower\'s rope and the wall\'s top', () => {
    check('the tower\'s floor gap lets him down its rope to the wall\'s top, and the wall\'s top climbs it again: the loop wall, hutong, market, tower, wall',
      lands(CHI.wall, [9], at(CHI.tower, 27, 17), { room: CHI.tower, col: 25, row: 19 }, 100000) && lands(CHI.tower, [17], at(CHI.wall, 22, 9), { room: CHI.wall, col: 25, row: 0 }, 200000));
  });
  SCOPE.section([CHI.wall, SIB.border, CHI.alley, CHI.tower], 'the joins: the wall\'s stair of steps', () => {
    check('the wall\'s foot reaches its top by the stair of steps (the bot goes up the flank)', search(at(CHI.wall, 3, 17), (g) => g.roomId === CHI.wall && g.y === standY(9) && colOf(g) >= 14, [{ room: CHI.wall, col: 20, row: 7 }], 200000, 1.5) !== null);
  });
  SCOPE.section([CHI.gate, CHI.roofs, CHI.top, CHI.market, CHI.willow], 'the joins: the gate\'s rope and the palace', () => {
    check('the gate\'s rope climbs into the palace and back down it to the gate\'s inner court', lands(CHI.roofs, [17], at(CHI.gate, 22, 17, [HAT]), { room: CHI.gate, col: 24, row: 0 }, 100000) && lands(CHI.gate, [17], at(CHI.roofs, 22, 17), { room: CHI.roofs, col: 24, row: 19 }, 100000));
  });
  SCOPE.section([CHI.roofs, CHI.willow, CHI.gate, CHI.junk], 'the joins: the ridge and the garden', () => {
    check('the palace\'s ridge walks east into the garden, and the garden west back onto the ridge', into(CHI.willow, at(CHI.roofs, 22, 9), { room: CHI.roofs, col: 31, row: 7 }, 200000) && into(CHI.roofs, at(CHI.willow, 1, 9), { room: CHI.willow, col: 0, row: 7 }, 100000));
  });
  SCOPE.section([CHI.willow, CHI.junk, CHI.roofs], 'the joins: the well and the quay', () => {
    check('the garden\'s well drops on its rope to the quay, and the quay\'s rope climbs back up to the garden: no trap in the well', lands(CHI.junk, [17], at(CHI.willow, 1, 9), { room: CHI.willow, col: 3, row: 19 }, 200000) && lands(CHI.willow, [9, 15], at(CHI.junk, 6, 17), { room: CHI.junk, col: 3, row: 0 }, 200000));
  });
  SCOPE.section([CHI.junk, CHI.willow, CHI.top, CHI.roofs], 'the joins: the way back from the quay', () => {
    check('from the quay with nothing in hand he can climb back up to the garden and out west onto the ridge and down to the gate (the way back runs the whole way)',
      reach(at(CHI.junk, 6, 17, [HAT]), { room: CHI.junk, col: 3, row: 0 }, (g) => g.roomId === CHI.willow, 200000) !== null);
  });
  // the first-time player who tries the gate before the hat: the doors stop him and the way back is open
  SCOPE.section([CHI.gate, CHI.market, CHI.roofs, CHI.alley, CHI.tower], 'the joins: the gate back west to the market', () => {
    check('with the doors shut the market and the outer court are all he has: he can go back west to the market and on to the tower', into(CHI.market, at(CHI.gate, 4, 17), { room: CHI.gate, col: 0, row: 15 }, 100000));
  });
});

// ---- hints, the map, saves --------------------------------------------------------------------------------
SCOPE.section([], 'hints, the map, saves', () => {
  SCOPE.section([CHI.tower], 'hints: the tower without the key', () => {
    const wants = at(CHI.tower, 6, 17, [], true);
    run(wants, NONE, 120);
    check(`ENHANCED: coming into the tower without the key says so ("${rowText(wants.g)}")`, rowText(wants.g) === 'THE TRAPDOOR IS LOCKED UP');
  });
  SCOPE.section([CHI.gate], 'hints: the gate without the rice hat', () => {
    const gate = at(CHI.gate, 4, 17, [], true);
    run(gate, NONE, 120);
    check(`ENHANCED: the gate without the rice hat says so ("${rowText(gate.g)}")`, rowText(gate.g) === 'THE CITY TURNS FOREIGNERS AWAY');
  });
  SCOPE.section([CHI.junk], 'hints: the quay without the bamboo', () => {
    const quay = at(CHI.junk, 4, 17, [], true);
    run(quay, NONE, 120);
    check(`ENHANCED: the quay without the bamboo says so ("${rowText(quay.g)}")`, rowText(quay.g) === 'THE RIVER IS TOO WIDE TO WADE');
  });
  SCOPE.section([CHI.junk], 'hints: ORIGINAL says nothing', () => {
    const plain = at(CHI.junk, 4, 17, [], false);
    run(plain, NONE, 120);
    check('ORIGINAL says nothing', rowText(plain.g) === 'DOWN THE RIVER');
  });
  for (const [item, text] of [[KEY, 'A KEY: SOMETHING IS LOCKED UP'], [HAT, 'A RICE HAT: LOOK LIKE A LOCAL'], [BAMBOO, 'BAMBOO: SOMETHING TO FLOAT ON']] as const) {
    SCOPE.section([item[0]], 'hints: taking an item says what it is for', () => {
      const [room, nth] = item;
      const rec = must(CHINA_ROOMS.find((r) => r.id === room)?.item, 'the item');
      const take = at(room, rec.col - 4, room === CHI.top ? 5 : room === CHI.willow ? 15 : 9, [], true);
      for (let f = 0; f < 40 && !take.g.siCollected[itemIndex(take.g, room, nth)]; f++) frame(take, NONE);
      run(take, NONE, 3);
      check(`ENHANCED: taking the ${text.split(':')[0]?.toLowerCase()} says what it is for ("${rowText(take.g)}")`, rowText(take.g) === text && take.g.siCollected[itemIndex(take.g, room, nth)] !== 0);
    });
  }

  const s = newGame(WORLD, true);
  const info = montyMap.info(s.g, { rooms: {} });
  check(`the pause screen counts the snacks and the items over every region (${info.join(' | ')})`, info[2] === panelLine('SNACKS', WORLD.progress.cakes.length) && info[1] === panelLine('ITEMS', WORLD.progress.keyItems.length));
  enterRoom(s.g, CHI.market, 0x40, standY(17));
  const places = montyMap.places({ x: 0, y: 0, w: 200, h: 150 }, s.g, { rooms: { 22: [0x40, 0xb2, 1, 9], 23: [0x40, 0xb2, 1, 10] } });
  check('in China the map shows its region (four columns), the rooms he has been to are places to go', places.length === 2 && places.every((p) => p.x >= 0 && p.x < 200 && p.y >= 0 && p.y < 150));

  // a save made on coming into each of China's rooms (every key taken, so the gates are open and the hat is on) carries on in the same room, alive
  {
    const spots = ([[CHI.wall, 11, 17], [CHI.alley, 2, 17], [CHI.tower, 22, 17], [CHI.top, 12, 17], [CHI.market, 8, 17], [CHI.gate, 12, 17], [CHI.roofs, 22, 17], [CHI.willow, 1, 9], [CHI.junk, 28, 17]] as const).filter(([room]) => SCOPE.has(room));
    const failed: number[] = [];
    const carried = spots.filter(([room, col, floor]) => {
      const a = newGame(WORLD, false);
      for (const [r, n] of [KEY, HAT, BAMBOO]) a.g.siCollected[itemIndex(a.g, r, n)] = 0x81;
      wear(a.g, riceHatItem(a.g));
      enterRoom(a.g, room, 0x0c + (col + 4) * 4, standY(floor));
      for (let n = 0; n < 200 && (a.g.freeze || a.g.script); n++) frame(a, NONE);
      const b = newGame(WORLD, false);
      restore(b.g, CODEC.unpack(CODEC.pack(snapshot(a.g)), CODEC.format));
      run(b, NONE, 4);
      b.g.enemies = [];
      b.g.enable &= 0x0f;
      b.g.vic.enable &= 0x0f;
      run(b, NONE, 60);
      const ok = b.g.roomId === room && !dead(b.g) && b.g.worn === riceHatItem(b.g);
      if (!ok) failed.push(room);
      return ok;
    }).length;
    check(`a save made on coming into each of China's nine rooms packs, unpacks and carries on in the same room, alive, in the rice hat (${carried} of ${spots.length}${failed.length ? `; not in rooms ${failed.join(', ')}` : ''})`, carried === spots.length);
  }

  // a save from before China: Siberia's arrays and a grid of Moscow's and Siberia's rooms alone carry on in the new game
  const g1 = newGame(WORLD, true).g;
  const before = entriesBefore(CHI.wall, CHI.junk);
  const last = { coin: before.coins - 1, item: before.items - 1 }; // the last of the earlier regions' entries
  g1.siCollected[0] = 0x81; g1.siCollected[last.item] = 0x81; g1.coinCollected[0] = 0xff; g1.coinCollected[last.coin] = 0xff;
  const old = snapshot(g1);
  const shortGrid = Array.from(WORLD.exitGrid.image, (c) => (c >= CHI.wall && c !== 0xff ? 0xff : c));
  const oldSave = { ...old, coins: old.coins.slice(0, before.coins), items: old.items.slice(0, before.items), exitGrid: shortGrid, roomId: SIB.border, worn: itemIndex(g1, ROOM.platform, 1) };
  const g2 = newGame(WORLD, true).g;
  restore(g2, CODEC.unpack(CODEC.pack(oldSave), CODEC.format));
  check('an old save (Moscow\'s and Siberia\'s arrays and grids) loads: the finds and the ushanka are as saved, and China is on the grid, its coins and finds still to take',
    g2.siCollected[0] === 0x81 && g2.siCollected[last.item] === 0x81 && g2.coinCollected[0] === 0xff && g2.coinCollected[last.coin] === 0xff && g2.worn === oldSave.worn && g2.exitGrid[2 * WORLD.exitGrid.cols + 8] === CHI.wall && g2.siCollected.length === WORLD.specialItems.length / 4 && g2.coinCollected.length === WORLD.coinTable.length / 3 && g2.coinCollected.slice(before.coins).every((c) => c === 0));
});

// ---- the set-up traps: the river's jetty, the market's awning, -------------------------------------------
SCOPE.section([CHI.junk, CHI.market], 'the set-up traps: the jetty, the awning', () => {
  /** A patch of crumbling floor on its own: its codes seen in turn while he stands on it, he lives or dies, it grows back on coming into the room again. */
  const crumbles = (what: string, spec: (typeof JUNK_CRACKS)[number], floor: number) => {
    const s = at(spec.room, spec.col, floor);
    const seen = new Map<number, number>();
    for (let f = 0; f < spec.gone + 10; f++) { frame(s, NONE); const c = cell(s.g, spec.col, spec.row); if (!seen.has(c)) seen.set(c, f); }
    check(`${what}: standing on a cell it frays after ${spec.crack} frames (${seen.get(spec.codes[1])}), splits after ${spec.wide} (${seen.get(spec.codes[2])}) and is gone after ${spec.gone} (${seen.get(0)})`,
      Math.abs((seen.get(spec.codes[1]) ?? -9) - spec.crack) <= 2 && Math.abs((seen.get(spec.codes[2]) ?? -9) - spec.wide) <= 2 && Math.abs((seen.get(0) ?? -9) - spec.gone) <= 2);
    run(s, NONE, 60);
    check(`${what}: and he falls (the river, the street): he is no longer on it (row ${s.g.montyRow})`, dead(s.g) || s.g.montyRow + 2 > spec.row + 3);
    return s;
  };
  check('the jetty is thirteen single cells on row 17, columns 6 to 18, each its own count; the awning one patch of four on row 9, columns 3 to 6 (over the street\'s hole, columns 2 to 6)', JUNK_CRACKS.length === 13 && JUNK_CRACKS.every((c, k) => c.room === CHI.junk && c.cols === 1 && c.row === 17 && c.col === 6 + k)
    && AWNING_CRACKS.length === 1 && AWNING_CRACKS.every((c) => c.room === CHI.market && c.cols === 4 && c.row === 9 && c.col === 3));
  const plank = must(JUNK_CRACKS[4], 'a plank');
  SCOPE.section([CHI.junk], 'the set-up traps: the jetty crumbles', () => {
    const dropped = crumbles('the jetty', plank, 17);
    check('on the jetty a fall is the river: he dies', dead(dropped.g));
  });
  SCOPE.section([CHI.market, CHI.alley], 'the set-up traps: the awning crumbles', () => {
    crumbles('the awning', must(AWNING_CRACKS[0], 'the awning'), 9);
    // Chris, 2026-11-26: "it won't fall if you just run... you just fall to a safe spot": a walk over it drops him, and the fall is down the street's hole into the hutong (the climb again)
    const s = at(CHI.market, 0, 9);
    let f = 0;
    for (; f < 300 && s.g.roomId === CHI.market && colOf(s.g) < 8; f++) frame(s, RIGHT);
    run(s, NONE, 120);
    check(`walking onto the awning from the west he falls through it (${f} frames) and down the street's hole into the hutong (room ${s.g.roomId})`, s.g.roomId === CHI.alley);
  });
  SCOPE.section([CHI.junk], 'the set-up traps: running the jetty', () => {
    // a steady run along the jetty, from the bank to its last plank: every plank holds under him (lines at most), and he lives
    const s = at(CHI.junk, 4, 17);
    let worst = 0, f = 0;
    for (; f < 400 && colOf(s.g) < 17; f++) { frame(s, RIGHT); for (const c of s.g.cracks) worst = Math.max(worst, c.stage); }
    check(`running the jetty (${f} frames from the bank to its end) every plank holds: lines at most (stage ${worst}), and he lives`, colOf(s.g) >= 17 && worst <= 1 && !dead(s.g));
    // a short stop (a creature to wait for) is forgiven: half a stride's pause in the middle
    const t = at(CHI.junk, 4, 17);
    let stopped = false;
    for (let g = 0; g < 400 && colOf(t.g) < 17; g++) { const stop = colOf(t.g) === 11 && !stopped; if (stop) { run(t, NONE, 12); stopped = true; } frame(t, RIGHT); }
    check('and a stop of 12 frames half way along it is forgiven (he crosses all the same)', colOf(t.g) >= 17 && !dead(t.g));
    // standing a long while loses the plank under him
    const u = at(CHI.junk, 8, 17);
    check('but standing on it does not: he falls into the river and dies within 160 frames', diesAt(u, NONE, 160) >= 0);
  });
  SCOPE.section([CHI.junk], 'the set-up traps: the planks whole again', () => {
    // it is whole again when he comes into the room
    const s = at(CHI.junk, 8, 17);
    run(s, NONE, 20);
    for (const c of s.g.cracks) c.t = c.spec.gone + 1;
    frame(s, NONE);
    const gone = cell(s.g, 14, 17) === 0;
    enterRoom(s.g, CHI.junk, 0x0c + (4 + 4) * 4, standY(17));
    for (let n = 0; n < 200 && (s.g.freeze || s.g.script); n++) frame(s, NONE);
    check('the planks that went are whole when he comes into the room again', gone && cell(s.g, 14, 17) === plank.codes[0]);
  });
});

/** The rice hat's index in the table. */
function riceHatItem(g: Game) { return itemIndex(g, CHI.top, 0); }

/** Every find in Siberia's rooms (the ticket among them: it opens the border post), as `at` takes them: whatever Siberia's rooms hold, the village's way east is open. */
function siberiaFinds(): [number, number][] {
  const rooms: readonly number[] = Object.values(SIB);
  const seen = new Map<number, number>();
  const out: [number, number][] = [];
  for (let i = 0; i < WORLD.specialItems.length / 4; i++) {
    const room = WORLD.specialItems[i * 4] ?? -1;
    const nth = seen.get(room) ?? 0;
    seen.set(room, nth + 1);
    if (rooms.includes(room)) out.push([room, nth]);
  }
  return out;
}
SCOPE.report();
finish();
