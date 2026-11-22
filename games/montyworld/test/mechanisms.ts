/**
 * Moscow's mechanisms, headless, each on its own with the room's creatures out of the way (the bot, moscow.ts, plays them all
 * together): the icicles (they shiver 24 frames, fall, break, grow back; running straight under one is safe at the pace he runs,
 * stopping or turning back under one is not, nothing is armed while it grows), the escalators (a ride of 96 frames he cannot
 * leave, which sets him down where it should), the Kremlin guard (it blocks the arch without the hat and is gone with it), the
 * turnstile (shut without the token, open with it), the costume (the hat is on his pictures from the pickup, in the save), the
 * hints (ENHANCED says what an item is for, ORIGINAL does not), the pirozhki and the map.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/mechanisms.ts
 */
import { enterRoom } from '../../montyotr/src/ending';
import type { Game } from '../../montyotr/src/game';
import { montyMap } from '../../montyotr/src/map';
import { restore, snapshot } from '../../montyotr/src/save';
import { frame, NONE } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { must } from '../../shared/test/must';
import { MOTR } from '../../montyotr/src/motr';
import { WORLD } from '../src/data';
import { ICICLES, ROOM, SPRITE } from '../src/moscow';
import { FALL, GROW, SHATTER, WARN } from '../../montyotr/src/icicles';
import { MOSCOW_CREATURES } from '../src/art/creatures';
import { FIRST_CREATURE } from '../src/layout';
import { CODEC } from '../src/main';
import { newGame, search } from './bot';
import { at, colOf, dead, LEFT, RIGHT, rowText, run } from './mech-kit';
import { itemIndex, standY } from './route';

const GUARD = FIRST_CREATURE + Object.keys(MOSCOW_CREATURES).indexOf('guard');

/** Whether two byte runs are the same. */
const same = (a: ArrayLike<number>, b: ArrayLike<number>) => a.length === b.length && Array.from(a).every((v, i) => v === b[i]);

// ---- the data -----------------------------------------------------------------------------------
{
  const cells = WORLD.exitGrid.image;
  const at = (row: number, col: number) => cells[row * WORLD.exitGrid.cols + col];
  check('Moscow is nine rooms, a block of four columns by three rows at the grid\'s west end',
    cells.filter((c) => c !== 0xff && c <= 8).length === 9 && [at(0, 1), at(0, 2), at(0, 3), at(1, 0), at(1, 1), at(1, 2), at(1, 3), at(2, 1), at(2, 2)].join() === [ROOM.gum, ROOM.domes, ROOM.kremlin, ROOM.start, ROOM.streets, ROOM.square, ROOM.station, ROOM.hall, ROOM.platform].join());
  check('Moscow has 14 coins, 2 pirozhki and 2 key items (the first entries of the tables; Siberia\'s follow)', WORLD.coinTable.subarray(0, 42).every((_, i) => i % 3 !== 0 || (WORLD.coinTable[i] ?? 99) <= 8) && WORLD.specialItems.subarray(0, 16).every((_, i) => i % 4 !== 0 || (WORLD.specialItems[i] ?? 99) <= 8) && WORLD.progress.cakes.slice(0, 2).every((i) => i < 4) && WORLD.progress.keyItems.slice(0, 2).join() === '1,3');
  check('the pirozhki are drawn with a sprite of their own, in the cupcake\'s way (a special item), and the pause screen calls them SNACKS',
    WORLD.progress.cakes.slice(0, 2).every((i) => WORLD.specialItems[i * 4 + 3] === ((SPRITE.pirozhok - 0x8e) & 0xff)) && WORLD.itemSprites.collectable(SPRITE.pirozhok) && WORLD.progress.foodName === 'SNACKS');
}

// ---- the icicles --------------------------------------------------------------------------------
{
  const spec = must(ICICLES[0], 'an icicle');
  check('Moscow has five icicles (the streets 2, the domes 2, the Kremlin 1), at most two a room', ICICLES.length === 5 && [ROOM.streets, ROOM.domes, ROOM.kremlin].every((r) => ICICLES.filter((i) => i.room === r).length <= 2));
  // run straight under the first one (the street, left to right, the pace he walks)
  {
    const s = at(ROOM.streets, spec.col - 3, 17);
    const when: Record<string, number> = {};
    let f = 0;
    for (; f < 200 && !dead(s.g); f++) {
      frame(s, f < 40 ? RIGHT : NONE);
      const st = must(s.g.ice[0], 'the icicle').state;
      if (!(st in when) && (st !== 'hang' || 'grow' in when)) when[st] = f; // (it starts hanging; 'hang' is it hanging again)
    }
    check('running straight under an icicle is safe', !dead(s.g) && colOf(s.g) > spec.col + 1);
    check(`it shivers ${WARN} frames before it falls`, (when.fall ?? 0) - (when.shiver ?? 0) === WARN);
    const fallFrames = Math.ceil(((spec.floor - spec.row) * 8 - 16) / FALL);
    check(`it falls ${FALL} pixels a frame to the floor (${fallFrames} frames), breaks for ${SHATTER}`, (when.shatter ?? 0) - (when.fall ?? 0) === fallFrames && (when.grow ?? 0) - (when.shatter ?? 0) === SHATTER);
    check(`it is back, armed, ${GROW} frames after it hit the floor`, (when.hang ?? 0) - (when.shatter ?? 0) === GROW);
  }
  // stop under it: it falls on him
  {
    const s = at(ROOM.streets, spec.col, 17);
    let died = false;
    for (let f = 0; f < 100; f++) { frame(s, NONE); died ||= dead(s.g); }
    check('stopping under an icicle is death', died);
  }
  // step in and back out: alive
  {
    const s = at(ROOM.streets, spec.col - 3, 17);
    let f = 0;
    for (; f < 40 && must(s.g.ice[0], 'the icicle').state === 'hang'; f++) frame(s, RIGHT);
    run(s, LEFT, 20);
    run(s, NONE, 100);
    check('stepping in and back out is safe: it falls behind him', !dead(s.g) && colOf(s.g) < spec.col - 1);
  }
  // nothing is armed while it grows
  {
    const s = at(ROOM.streets, spec.col - 1, 17); // (he is in its column: it shivers; he steps back out, the manhole is two columns on)
    run(s, LEFT, 8);
    for (let f = 0; f < 200 && must(s.g.ice[0], 'the icicle').state !== 'grow'; f++) frame(s, NONE);
    s.g.x2 = 0x0c + (spec.col + 4) * 4;
    s.g.y = standY(17);
    run(s, NONE, 20);
    const stillGrowing = must(s.g.ice[0], 'the icicle').state === 'grow';
    check('while it grows back it is not armed: he can stand under it', !dead(s.g) && stillGrowing);
  }
  // all five, run through at his pace
  for (const [i, e] of ICICLES.entries()) {
    const floor = e.floor === 6 ? 6 : 17;
    const right = e.room !== ROOM.domes;
    const s = at(e.room, right ? e.col - 3 : e.col + 3, floor);
    const mine = ICICLES.filter((x) => x.room === e.room).indexOf(e);
    const before = must(s.g.ice[mine], 'icicle').state;
    for (let f = 0; f < 100 && (right ? colOf(s.g) < e.col + 2 : colOf(s.g) > e.col - 3); f++) frame(s, right ? RIGHT : LEFT); // (on, and stop clear of it)
    const fell = must(s.g.ice[mine], 'icicle').state;
    run(s, NONE, 60);
    check(`icicle ${i + 1} (room $${e.room.toString(16)}, column ${e.col}): hanging, armed by his passing (${before} to ${fell}), and he lives`, before === 'hang' && fell !== 'hang' && !dead(s.g));
  }
}

// ---- the escalators -----------------------------------------------------------------------------
{
  for (const [name, room, col, floor, endCol, endFloor, dy, frames] of [
    ['the hall\'s, down', ROOM.hall, 11, 9, 18, 14, 1, 60], ['the platform\'s, up', ROOM.platform, 15, 17, 28, 9, -1, 96],
  ] as const) {
    const s = at(room, col, floor, [], false, true);
    let began = -1, ended = -1;
    for (let f = 0; f < 300; f++) {
      frame(s, f < 60 ? RIGHT : NONE);
      if (began < 0 && s.g.esc.index >= 0) began = f;
      if (began >= 0 && ended < 0 && s.g.esc.index < 0) ended = f;
    }
    check(`${name}: a ride of ${ended - began} frames (a pixel in two frames: ${frames}), he is on his feet after it at the landing (${colOf(s.g)}, floor ${endFloor}), alive, with the room's creatures running`,
      began >= 0 && ended - began === frames && colOf(s.g) === endCol && s.g.y === standY(endFloor) && !s.g.gameMode && !dead(s.g) && Math.sign(endFloor - floor) === dy);
    // the stick does nothing in the ride
    const t = at(room, col, floor, [], false, true);
    for (let f = 0; f < 60 && t.g.esc.index < 0; f++) frame(t, RIGHT);
    const start = { x2: t.g.x2, y: t.g.y };
    for (let f = 0; f < frames - 20; f++) frame(t, { left: true, right: false, up: dy < 0 ? false : true, down: false, fire: f % 7 === 0 });
    check(`${name}: he cannot leave it (left, up and fire held): still riding ${frames - 20} frames in, nothing but the ride moved him`, t.g.esc.index >= 0 && t.g.gameMode === 1 && (t.g.x2 !== start.x2 || t.g.y !== start.y));
    for (let f = 0; f < 40; f++) frame(t, NONE);
    check(`${name}: and the same landing`, colOf(t.g) === endCol && t.g.y === standY(endFloor));
  }
  // from the wrong end: walking onto the landing's far side, against it, the treads turn him back
  for (const [name, room, col, floor, landing] of [
    ['the hall\'s (the terrace)', ROOM.hall, 21, 14, 18], ['the platform\'s (the head)', ROOM.platform, 30, 9, 28],
  ] as const) {
    const s = at(room, col, floor, [], false, true);
    let back = false, least = 99, steady = true;
    for (let f = 0; f < 150; f++) {
      frame(s, LEFT);
      if (s.g.esc.back) back = true;
      if (colOf(s.g) < least) least = colOf(s.g);
      if (s.g.y !== standY(floor) || s.g.roomId !== room || dead(s.g)) steady = false;
    }
    check(`${name}: walking left onto it from the wrong end the treads carry him back, over and over while he holds the stick (never further than a cell short of the landing, ${landing}: ${least}), he does not fall or leave`, back && least >= landing - 1 && steady);
    for (let f = 0; f < 60; f++) frame(s, NONE);
    check(`${name}: let go he stands on the landing, on his feet (${colOf(s.g)})`, colOf(s.g) >= landing && s.g.esc.index < 0 && !s.g.gameMode && s.g.y === standY(floor));
  }
  // jumping over the foot does not ride
  {
    const s = at(ROOM.hall, 9, 9);
    run(s, { ...NONE, right: true, fire: true }, 30);
    check('the foot is a floor to stand on: a jump over it does not start the ride', s.g.esc.index < 0 || s.g.y !== standY(9));
  }
}

// ---- the guard and the turnstile -----------------------------------------------------------------
{
  const entry = (hat: boolean, room: number, col: number, floor: number) => {
    const s = newGame(WORLD, false);
    if (hat) s.g.siCollected[itemIndex(s.g, ROOM.platform, 1)] = 0x81;
    enterRoom(s.g, room, 0x0c + (col + 4) * 4, standY(floor));
    return s;
  };
  const pastArch = (g: Game) => g.roomId === ROOM.kremlin && colOf(g) >= 14;
  {
    const guard = entry(false, ROOM.kremlin, 1, 6);
    check('without the hat there is a guard in the arch, in its first creature slot', guard.g.enemies[0]?.type === GUARD && guard.g.enemies[0].x !== 0xff);
    const stats = { exhausted: false };
    const found = search(guard, pastArch, undefined, 60000, 0, stats);
    check(`without the hat the bot finds no way past the guard (60000 states looked at${stats.exhausted ? ', every one there is' : ''}), and walking on into him is death or turned back`, found === null);
    const hat = entry(true, ROOM.kremlin, 1, 6);
    check('with the hat the guard is gone (sent off the screen)', must(hat.g.enemies[0], 'the guard').x === 0xff);
    const way = search(hat, pastArch, undefined, 300000, 0);
    check('and with it Monty walks through the arch to the gorge', way !== null);
  }
  {
    const lower = (token: boolean) => {
      const s = newGame(WORLD, false);
      if (token) s.g.siCollected[itemIndex(s.g, ROOM.gum)] = 0x81;
      enterRoom(s.g, ROOM.hall, 0x0c + (24 + 4) * 4, standY(17));
      s.g.enemies = [];
      s.g.enable &= 0x0f;
      s.g.vic.enable &= 0x0f;
      return s;
    };
    const shut = lower(false);
    run(shut, RIGHT, 100);
    check('without the token the turnstile\'s bars stop him (the lower floor ends at column 27)', shut.g.roomId === ROOM.hall && colOf(shut.g) <= 27);
    const open = lower(true);
    run(open, RIGHT, 120);
    for (let n = 0; n < 200 && (open.g.freeze || open.g.script); n++) frame(open, NONE);
    check('with it the bars are gone and he walks through into the platform', open.g.roomId === ROOM.platform);
    const stats = { exhausted: false };
    const s = lower(false);
    const found = search(s, (g) => g.roomId === ROOM.platform, undefined, 100000, 0, stats);
    check(`no way into the platform without the token exists (${stats.exhausted ? 'every state looked at' : 'limit'})`, found === null);
  }
}

// ---- the costume, the hints, the save --------------------------------------------------------------------
{
  const USHANKA = itemIndex(newGame(WORLD, true).g, ROOM.platform, 1);
  const TOKEN = itemIndex(newGame(WORLD, true).g, ROOM.gum);
  const takeUshanka = (enhanced: boolean) => {
    const s = at(ROOM.platform, 11, 15, [], enhanced);
    for (let f = 0; f < 10 && !s.g.siCollected[USHANKA]; f++) frame(s, NONE);
    return s;
  };
  const plain = Uint8Array.from(WORLD.bankImage.subarray(0x54 * 64, 0x54 * 64 + 63));
  const s = takeUshanka(true);
  check('the ushanka is taken from its shelf (200 points)', s.g.siCollected[USHANKA] !== 0 && s.g.score === 200);
  const costume = must(WORLD.costumes[0], 'the costume');
  const block = must(costume.blocks.find((b) => b.ptr === 0x54), 'a block for the walk').block;
  check('Monty wears it from then on: his pictures are the costume\'s (all 36 of them, the hat on each)', s.g.worn === USHANKA && costume.blocks.filter((b) => b.ptr >= 0x50 && b.ptr <= 0x73).length === 36
    && same(s.g.mem.subarray(0x54 * 64, 0x54 * 64 + 63), block) && !same(block, plain));
  check('every one of the 36 differs from the plain picture, in pixels near the top of the figure or turned with it', costume.blocks.filter((b) => b.ptr >= 0x50 && b.ptr <= 0x73).every((b) => !same(b.block, WORLD.bankImage.subarray(b.ptr * 64, b.ptr * 64 + 63))));
  // kept in the save
  const saved = snapshot(s.g);
  const back = CODEC.unpack(CODEC.pack(saved), CODEC.format);
  const g2 = newGame(WORLD, true).g;
  restore(g2, back);
  check('it is kept in the save (the item he wears), and a game carried on from one has it on', back.worn === USHANKA && g2.worn === USHANKA && same(g2.mem.subarray(0x54 * 64, 0x54 * 64 + 63), block));
  const fresh = newGame(WORLD, true).g;
  check('a new game has him bare again', fresh.worn === null && same(fresh.mem.subarray(0x54 * 64, 0x54 * 64 + 63), plain));

  // the hints
  const withHints = at(ROOM.platform, 11, 15, [], true);
  for (let f = 0; f < 4; f++) frame(withHints, NONE);
  check(`ENHANCED: taking the ushanka says what it is for in the name row: "${rowText(withHints.g)}"`, rowText(withHints.g) === 'FUR HAT: PAST THE KREMLIN GUARD');
  const without = takeUshanka(false);
  run(without, NONE, 4);
  check(`ORIGINAL: it says nothing (the name stays: "${rowText(without.g)}")`, rowText(without.g) === 'UNDERGROUND MOVEMENT');
  run(withHints, NONE, 220);
  check('and four seconds on the name is back', rowText(withHints.g) === 'UNDERGROUND MOVEMENT');
  const room = (enhanced: boolean, token: boolean) => {
    const r = newGame(WORLD, enhanced);
    if (token) r.g.siCollected[TOKEN] = 0x81;
    enterRoom(r.g, ROOM.hall, 0x0c + (8 + 4) * 4, standY(9));
    r.g.enemies = [];
    return r;
  };
  const wants = room(true, false);
  const name = rowText(wants.g);
  run(wants, NONE, 60);
  const during = rowText(wants.g);
  run(wants, NONE, 60);
  const later = rowText(wants.g);
  run(wants, NONE, 200);
  check(`ENHANCED: a room that wants an item says so, once its name has had its two seconds ("${name}", then "${later}", then the name again)`,
    name === 'ESCALATING TENSIONS' && during === 'ESCALATING TENSIONS' && later === 'THE TURNSTILE WANTS A TOKEN' && rowText(wants.g) === 'ESCALATING TENSIONS');
  const have = room(true, true);
  run(have, NONE, 140);
  check('and says nothing once he has it', rowText(have.g) === 'ESCALATING TENSIONS');
  const orig = room(false, false);
  run(orig, NONE, 140);
  check('ORIGINAL says nothing at all', rowText(orig.g) === 'ESCALATING TENSIONS');
}

// ---- the pause screen's map ------------------------------------------------------------------------
{
  const s = newGame(WORLD, true);
  const info = montyMap.info(s.g, { rooms: {} });
  check(`the pause screen counts the snacks (${info.join(' | ')})`, info[3] === 'SNACKS 0/17' && info[2] === 'ITEMS  0/17');
  check('the panel\'s lines are one width (the 11 characters it has: nothing cut off) and their numbers end in one column', info.length === 4 && info.every((l) => l.length === 11));
  const motr = newGame(MOTR, true);
  const motrInfo = montyMap.info(motr.g, { rooms: {} });
  check(`Monty on the Run's panel still counts CAKES (${motrInfo.join(' | ')}), in lines of 11 as well`, motrInfo[3]?.startsWith('CAKES') === true && motrInfo.every((l) => l.length === 11));
  const places = montyMap.places({ x: 0, y: 0, w: 200, h: 150 }, s.g, { rooms: { 1: [0x15, 0xb2, 1, 1], 7: [0x15, 0xb2, 2, 1] } });
  check('the map shows the region he is in: its cells are large (16), the rooms he has been in are places to go', places.length === 3 && places.every((p) => p.x >= 0 && p.x < 200 && p.y >= 0 && p.y < 150));
}

finish();
