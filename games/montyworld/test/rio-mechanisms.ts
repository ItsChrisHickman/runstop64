/**
 * Rio's mechanisms, headless, each on its own with the room's creatures out of the way (the bot, rio.ts, plays them all together): the cable car (the key's gate, the ride up and down in 160 frames, the one car waiting where he comes in), the floats (their cycle, the deck under him and him carried, the channel put back behind them), the gauchos' skewers (the four poses, the deadly ones, the sprites), the steward and the headdress, the
 * costume, the joins both ways, the edges, the hints, the map, a save in each room, and the finale on the beach (the bowl is the treasure and ends the game).
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/rio-mechanisms.ts
 */
import { enterRoom } from '../../montyotr/src/ending';
import { floatCycle, floatLeft } from '../../montyotr/src/floats';
import type { Game } from '../../montyotr/src/game';
import { wear } from '../../montyotr/src/items';
import { montyMap } from '../../montyotr/src/map';
import { restore, snapshot } from '../../montyotr/src/save';
import { skewerPose } from '../../montyotr/src/skewers';
import { frame, NONE, type State } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { must } from '../../shared/test/must';
import { ROW, SCREEN } from '../../shared/monty/screen';
import { WORLD_CREATURES } from '../src/art';
import { RIO_CREATURES } from '../src/art/rio-creatures';
import { FIRST_CREATURE } from '../src/layout';
import { RIO_ITEMS } from '../src/art/rio-items';
import { WORLD } from '../src/data';
import { AND } from '../src/andes';
import { CODEC } from '../src/main';
import { CABLE_CAR, CLOSED_CELLS, FLOATS, GATE_CELLS, RIO_COLOURS, RIO_ROOM as R, RIO_ROOMS, RIO_SECTORS, SKEWERS } from '../src/rio';
import { CAR_POINTERS, RIO_SPRITE, SKEWER_POINTERS } from '../src/rio-pointers';
import { newGame } from '../../shared/monty/test/bot';
import { search } from './search';
import { cell, colOf, dead, LEFT, overCrowded, RIGHT, at, rowText, run } from './mech-kit';
import { creatureRooms, itemIndex, standY } from './route';

const KEY = [R.lap, 0] as const, HEADDRESS = [R.steak, 0] as const;

// ---- the data -------------------------------------------------------------------------------------
{
  const cells = WORLD.exitGrid.image, cols = WORLD.exitGrid.cols;
  const grid = (row: number, col: number) => cells[row * cols + col];
  const placed = [[7, 23, R.quay], [7, 24, R.lap], [6, 24, R.sugar], [6, 25, R.loaf], [6, 26, R.arms], [6, 27, R.monkey], [7, 26, R.colour], [6, 23, R.steak], [7, 27, R.drum], [7, 28, R.float], [7, 29, R.bust]] as const;
  check('Rio is eleven rooms in seven columns (23-29) and two rows (6-7) beside the Amazon\'s last bank (row 7, column 22), room ids 67 to 77',
    placed.every(([r, c, id]) => grid(r, c) === id) && cells.filter((c) => c !== 0xff).length === 66 && grid(7, 22) === AND.bank && R.quay === 67 && R.bust === 77);
  const coinsIn = (lo: number, hi: number) => Array.from({ length: WORLD.coinTable.length / 3 }, (_, i) => WORLD.coinTable[i * 3] ?? 0).filter((r) => r >= lo && r <= hi).length;
  const itemsIn = (lo: number, hi: number) => Array.from({ length: WORLD.specialItems.length / 4 }, (_, i) => WORLD.specialItems[i * 4] ?? 0).filter((r) => r >= lo && r <= hi).length;
  check(`the earlier regions keep their coins and finds, in the same table places, and Rio adds ${coinsIn(67, 77)} coins and 9 finds (the key to the city, the headdress, six skewers and the bowl)`,
    coinsIn(0, 66) === 149 && itemsIn(0, 66) === 31 && itemsIn(67, 77) === 9 && (WORLD.coinTable[148 * 3] ?? 99) <= 66 && (WORLD.coinTable[149 * 3] ?? 0) >= 67);
  check('18 key items and 21 snacks count on the pause screen; the bowl does not count towards a room\'s finds', WORLD.progress.keyItems.length === 18 && WORLD.progress.cakes.length === 21 && WORLD.uncountedItems.length === 1);
  check('Rio\'s sectors and map colours are one each, in letters the font has', RIO_SECTORS.length === 11 && RIO_COLOURS.length === 11 && RIO_SECTORS.every((s) => s.text.length <= 32 && /^[A-Z0-9 .:,!?-]+$/.test(s.text) && !/Z/.test(s.text)));
  const rooms = creatureRooms(RIO_ROOMS);
  const most = Math.max(...[...rooms.values()].map((v) => v.size));
  check(`${rooms.size} kinds of creature in Rio's eleven rooms, none in more than two (${[...rooms.values()].map((v) => v.size).join(' ')})`, rooms.size === Object.keys(RIO_CREATURES).length && rooms.size >= 8 && rooms.size <= 13 && most <= 2);
  check(`no room has a fourth creature (sprite 7 is the headdress's; ${overCrowded(RIO_ROOMS).join() || 'none do'})`, overCrowded(RIO_ROOMS).length === 0);
  const pointers = [...Object.values(RIO_SPRITE), CAR_POINTERS.roof, CAR_POINTERS.floor, ...SKEWER_POINTERS.left, ...SKEWER_POINTERS.right];
  check('every block of the bank Rio uses is its own ($A0-$AF: the flag\'s and the C5\'s, which this game never shows), none twice, and each has a picture', new Set(pointers).size === pointers.length && pointers.every((p) => p >= 0xa0 && p <= 0xaf && WORLD.bankImage.subarray(p * 64, p * 64 + 63).some((b) => b !== 0))
    && WORLD.itemSprites.treasure === RIO_SPRITE.bowl && RIO_ITEMS.acaiBowl.block.length >= 63);
  check('one cable car (Sugar Rush\'s), five floats (the avenue\'s), two skewers (the churrascaria\'s)', WORLD.cableCars.length === 1 && WORLD.cableCars[0]?.room === R.sugar && WORLD.floats.filter((f) => f.room >= 67 && f.room <= 77).length === 5 && WORLD.floats.filter((f) => f.room === R.float).length === 5 && WORLD.skewers.length === 2 && WORLD.skewers.every((k) => k.room === R.steak));
  // the sprites each mechanism takes are not the room's: the cable car's are 0, 1, 2 and 6, its two creatures 4 and 5; the skewers' are 2 and 1, the gauchos' and the dancer's 4 to 6 and the room's item 0
  check('the cars and the skewers take sprites the rooms do not use (items 0 and 1, creatures 4 up, the canopy\'s and the hat\'s 2 and 7: none in these rooms)',
    new Set([CABLE_CAR.roof.sprite, CABLE_CAR.floor.sprite]).size === 2 && [CABLE_CAR.roof.sprite, CABLE_CAR.floor.sprite].every((n) => n !== 3 && n !== 7)
    && (must(RIO_ROOMS.find((r) => r.id === R.sugar), 'a room').enemies?.length ?? 0) <= 2 && SKEWERS.every((k) => k.sprite !== 0 && k.sprite !== 3 && k.sprite !== 6 && k.sprite !== 7) && (RIO_ROOMS.find((r) => r.id === R.steak)?.enemies?.length ?? 0) === 2);
}

// ---- the cable car ---------------------------------------------------------------------------------------
{
  const shut = at(R.sugar, 5, 14, []), open = at(R.sugar, 5, 14, [KEY]);
  const solid = (s: State) => GATE_CELLS.every(([row, col]) => s.g.flagAt(row + 3, col + 4) === 1);
  const clear = (s: State) => GATE_CELLS.every(([row, col]) => s.g.flagAt(row + 3, col + 4) === 0);
  // (the key's effect is made on taking it, and on coming into the room)
  const withKey = at(R.sugar, 8, 14, [KEY]);
  check('the station\'s gate (cols 10-11, rows 8-13) is solid until the key to the city is his, and gone once it is', solid(at(R.sugar, 8, 14, [])) && clear(withKey) && solid(shut) && clear(open));
  // walking east on the shelf without the key stops at the gate
  const blocked = at(R.sugar, 8, 14, []);
  run(blocked, RIGHT, 80);
  check('without the key he is stopped by the gate (he stands at column 9, on the shelf, no ride)', colOf(blocked.g) <= 9 && blocked.g.roomId === R.sugar && !blocked.g.gameMode);
  // with it he walks onto the foot and the car carries him up: 160 frames, the cars on their sprites, the platform at the end
  const up = at(R.sugar, 8, 14, [KEY]);
  let rode = 0, begun = -1;
  const frames: number[] = [];
  for (let f = 0; f < 400; f++) {
    frame(up, RIGHT);
    if (up.g.gameMode && begun < 0) begun = f;
    if (up.g.gameMode) { rode++; frames.push(up.g.y); }
    if (begun >= 0 && !up.g.gameMode) break;
  }
  check(`stepping onto the foot starts the ride: ${rode} frames of it (160 and one), then he is set down on the upper platform at its foot (column ${colOf(up.g)}, floor 8), alive`, rode >= 159 && rode <= 162 && colOf(up.g) === CABLE_CAR.high.col && up.g.y === standY(8) && !dead(up.g));
  check('the ride climbs steadily (his height never goes down), 48 pixels in all', frames.every((y, i) => i === 0 || y <= (frames[i - 1] ?? 0)) && (frames[0] ?? 0) - (frames[frames.length - 1] ?? 0) >= 44);
  // the car is drawn (roof behind him on sprite 6, floor in front on 2), one car only: the passing car's two sprites are not on
  const mid = at(R.sugar, 8, 14, [KEY]);
  run(mid, RIGHT, 60);
  for (let f = 0; f < 200 && !mid.g.gameMode; f++) frame(mid, RIGHT);
  run(mid, NONE, 80);
  const sp = (n: number) => mid.g.vic.sprites[n];
  check('mid-ride the car is two sprites over him (roof 6 behind, floor 2 in front), the pictures the car\'s, and no second car (sprites 1 and 0 are off)', [6, 2].every((n) => ((mid.g.vic.enable >> n) & 1) === 1) && [1, 0].every((n) => ((mid.g.vic.enable >> n) & 1) === 0)
    && sp(6)?.ptr === CAR_POINTERS.roof && sp(2)?.ptr === CAR_POINTERS.floor);
  // the car waits at the station he comes in at: at the low foot from the beach, at the high one from the summit
  const lowIn = at(R.sugar, 4, 18, [KEY]);
  run(lowIn, NONE, 6);
  const highIn = at(R.sugar, 29, 8, [KEY]);
  run(highIn, NONE, 6);
  const carX = (s: State) => (s.g.sx[CABLE_CAR.floor.sprite] ?? 0) * 2;
  check(`the car waits at the station he came in at (x ${carX(lowIn)} from the beach, ${carX(highIn)} from the summit)`, carX(lowIn) < carX(highIn) && ((lowIn.g.vic.enable >> 2) & 1) === 1 && ((highIn.g.vic.enable >> 2) & 1) === 1);
  // he steps off and the other way: the high foot rides down, and a stand on the platform does not ride again
  const stay = at(R.sugar, 8, 14, [KEY]);
  for (let f = 0; f < 400 && !(stay.g.cable.latch && !stay.g.gameMode); f++) frame(stay, RIGHT);
  run(stay, NONE, 60);
  check('set down on the foot he stays there (no second ride) until he steps off and back', colOf(stay.g) === CABLE_CAR.high.col && !stay.g.gameMode);
  const down = at(R.sugar, 8, 14, [KEY]);
  for (let f = 0; f < 400 && !(down.g.cable.latch && !down.g.gameMode); f++) frame(down, RIGHT);
  run(down, RIGHT, 20);
  run(down, LEFT, 12);
  run(down, RIGHT, 12);
  run(down, LEFT, 12);
  for (let f = 0; f < 400 && !(down.g.cable.latch && !down.g.gameMode && colOf(down.g) <= CABLE_CAR.low.col + 1); f++) frame(down, LEFT);
  check(`from the platform the car carries him back down (column ${colOf(down.g)}, floor 14)`, colOf(down.g) <= CABLE_CAR.low.col + 1 && colOf(down.g) >= CABLE_CAR.low.col && down.g.y === standY(14) && !dead(down.g));
  // out east at the platform's end goes to the summit
  const east = at(R.sugar, 26, 8, [KEY]);
  run(east, RIGHT, 80);
  check('the platform\'s way out east leads into the summit, high', east.g.roomId === R.loaf);
}

// ---- the floats ------------------------------------------------------------------------------------------
{
  const [a] = FLOATS;
  const f0 = must(a, 'a float');
  check('a float\'s cycle is 30 cells, a cell every 8 frames; its left edge enters at the span\'s start less its width, crosses 21 cells and leaves at the end', floatLeft(f0, 0) === f0.span.from - f0.w && floatLeft(f0, 6) === f0.span.from && floatCycle(f0, 8) - floatCycle(f0, 0) === 1
    && floatLeft(f0, 30) === floatLeft(f0, 0) && floatLeft(must(FLOATS[3], 'a float'), 0) === must(FLOATS[3], 'a float').span.to + 1);
  check('lane A\'s three floats go right, 10 cells apart, lane B\'s two go left on the high lane (deck row 14)', FLOATS.filter((f) => f.dir === 1 && f.row === 18).map((f) => f.offset).join() === '0,10,20' && FLOATS.filter((f) => f.dir === -1 && f.row === 14).length === 2);
  // the room as it is a moment in: the channel's water at the cells no float covers, a deck over the cells one does
  const s = at(R.float, 1, 18, [], false, false);
  run(s, NONE, 5);
  const water = WORLD.tileProperty(must(RIO_ROOMS.find((r) => r.id === R.float), 'a room').tiles[2] ?? 0);
  check('the channel is deadly water (class 4) under and between the floats', water === 4);
  const decks = (g: Game) => Array.from({ length: 32 }, (_, c) => c).filter((c) => g.mem[SCREEN + (18 + 3) * ROW + c + 4] === 4);
  const one = decks(s.g).length;
  run(s, NONE, 8 * 15);
  check(`the decks of lane A move on a cell every 8 frames and the channel is put back behind them (${one} deck cells, then ${decks(s.g).length})`, one >= 6 && decks(s.g).length >= 6 && decks(s.g).join() !== '');
  // the cycle repeats: 30 cells of 8 frames
  const p = at(R.float, 1, 18, [], false, false), q = at(R.float, 1, 18, [], false, false);
  run(p, NONE, 100);
  run(q, NONE, 100 + 8 * 30);
  const row = (g: Game, r: number) => Array.from({ length: 32 }, (_, c) => g.mem[SCREEN + (r + 3) * ROW + c + 4]).join();
  check('the avenue is the same a whole cycle later (240 frames), every row of it but the coins\'', [10, 11, 12, 13, 14, 15, 17, 18, 19].every((r) => row(p.g, r) === row(q.g, r)));
  // a float carries him: standing at the left end of lane A's deck as it comes, then across
  const ride = search(at(R.float, 1, 18, [], false, false), (g) => g.roomId === R.bust && !g.freeze && !g.script, [{ room: R.float, col: 31, row: 17 }], 200000, 1.5);
  check('from the street at the left the floats carry him across the channel to the stage and the beach (the bot finds a way)', ride !== null);
  // carried: his column rises while the float goes right without him walking
  const t = at(R.float, 1, 18, [], false, false);
  let carried = -1, onDeck = false;
  for (let f = 0; f < 700 && carried < 0; f++) {
    frame(t, f % 40 < 20 ? RIGHT : NONE);
    const c = colOf(t.g);
    if (c >= 8 && c <= 12 && t.g.y === standY(18) && !onDeck) { onDeck = true; } // (over the channel, not the street's cols 0-5)
    if (onDeck) {
      const before = colOf(t.g);
      run(t, NONE, 40);
      if (colOf(t.g) > before + 2 && t.g.y === standY(18) && t.g.roomId === R.float) carried = colOf(t.g) - before;
      break;
    }
  }
  check(`standing still on a float he is carried along with it (${carried} cells in 40 frames)`, carried >= 4 && carried <= 6);
  // the floats' unseen parts (the cycle runs on past the channel, over the street and the stage) carry nobody, and a float never carries him into a wall
  const still = (col: number) => { const w = at(R.float, col, 18, [], false, false); w.g.floats = w.g.floats.slice(); run(w, NONE, 400); return w; };
  const street = still(2), stage = still(28);
  check('standing still on the street (col 2) for 400 frames he stays there: the floats are not under him', colOf(street.g) === 2 && street.g.roomId === R.float && street.g.y === standY(18) && !dead(street.g));
  check('standing still on the stage (col 28) for 400 frames he stays there, beside the step and the skewer', colOf(stage.g) === 28 && stage.g.roomId === R.float && stage.g.y === standY(18) && !dead(stage.g));
  // riding a float to the end of its channel: he is never inside a wall, and when the float leaves he is on the stage's step or in the water (death), not stuck in the stage
  const wall = at(R.float, 1, 18, [], false, false);
  let inside = false, swum = false;
  for (let f = 0; f < 1500 && !swum; f++) {
    frame(wall, f < 60 ? RIGHT : NONE);
    const g = wall.g;
    if (g.roomId !== R.float || g.actionCounter !== 0) { swum = true; break; }
    if ([g.montyRow, g.montyRow + 1].some((row) => g.flagAt(row, g.montyCol) === 1 || g.flagAt(row, g.montyCol + 1) === 1)) inside = true;
  }
  check('riding a float up to the stage he is never carried into the wall (the step block at cols 25-26): when the float goes on, he falls in the channel or walks off', !inside && swum);
  // above the water at the stage's edge the way is a drop
  const swim = at(R.float, 10, 18, [], false, false);
  swim.g.floats = [];
  const fall = (() => { for (let f = 0; f < 120; f++) { frame(swim, NONE); if (dead(swim.g)) return true; } return false; })();
  check('with no float under him the channel is death', fall);
}

// ---- the gauchos' skewers ----------------------------------------------------------------------------------
{
  const k0 = must(SKEWERS[0], 'a skewer'), k1 = must(SKEWERS[1], 'a skewer');
  check('a skewer swings through four poses a 24 frames each (a cycle of 96): down, forward and low, straight out, up; the middle two are deadly', [0, 24, 48, 72, 95, 96].map((t) => skewerPose(k0, t)).join() === '0,1,2,3,3,0' && k0.poses.map((p) => p.deadly).join() === 'false,true,true,false');
  check('the second gaucho is half a cycle on from the first (48 frames), each with a sprite of his own (2 and 1), left and right pictures in the bank', k1.offset - k0.offset === 48 && k0.sprite === 2 && k1.sprite === 1
    && k0.poses.every((p, i) => p.left.ptr === SKEWER_POINTERS.left[i] && p.right.ptr === SKEWER_POINTERS.right[i]));
  const s = at(R.steak, 24, 18, [], false, true);
  run(s, NONE, 2);
  const seen = new Set<number>();
  for (let f = 0; f < 100; f++) { frame(s, NONE); if (dead(s.g)) break; seen.add(s.g.vic.sprites[2]?.ptr ?? 0); }
  const man = s.g.enemies[0];
  check(`the skewer follows its gaucho, in the picture of the pose it is in (${[...seen].map((p) => p.toString(16)).join(' ')}), on sprite 2`, man !== undefined && s.g.skewers.length === 2 && [...seen].every((p) => [...SKEWER_POINTERS.left, ...SKEWER_POINTERS.right].some((q) => q === p)));
  // the deadly pose over him kills; the same place at the harmless one does not
  const hit = (pose: number): boolean => {
    const u = at(R.steak, 26, 18, [], false, true);
    run(u, NONE, 1);
    const spec = k0, man2 = must(u.g.enemies[0], 'a gaucho');
    const sk = must(u.g.skewers[0], 'a skewer state');
    sk.facing = 'left';
    sk.last = man2.x;
    sk.t = pose * 24 - spec.offset;
    u.g.actionCounter = 0;
    // the skewer's hand is at the gaucho's left: put him where its picture is
    const p = must(spec.poses[pose], 'a pose').left;
    const box = must(p.hit[Math.floor(p.hit.length / 2)], 'a kill box');
    u.g.x2 = Math.round((man2.x * 2 + p.dx + box.x + 2) / 2);
    u.g.y = man2.y + p.dy + box.y;
    u.g.gameMode = 0;
    frame(u, NONE);
    return u.g.actionCounter !== 0;
  };
  const area = (i: number) => must(k0.poses[i], 'a pose').left.hit.reduce((a, b) => a + b.w * b.h, 0);
  check(`what kills is what is drawn: each deadly pose's kill boxes cover well under the picture's 24 x 21 (forward and low ${area(1)}, straight out ${area(2)} pixels of 504), the straight one only its own rows`, area(1) < 300 && area(2) < 200 && must(must(k0.poses[2], 'a pose').left.hit[0], 'a box').y >= 6);
  check('the skewer killing: out straight and forward and low it has him where it is, down or up it does not', hit(2) && hit(1) && !hit(0) && !hit(3));
}

// ---- the steward, the headdress -------------------------------------------------------------------------
{
  const s = at(R.drum, 24, 18, [], false, true);
  check('the steward (the first creature of the parade\'s street) stands in the low lane at the right, the only way east', s.g.enemies[0]?.type === FIRST_CREATURE + Object.keys(WORLD_CREATURES).indexOf('steward'));
  const walk = at(R.drum, 21, 18, [], false, true);
  run(walk, RIGHT, 90);
  check('without the headdress he cannot pass the steward (he dies or turns back, never into the avenue)', walk.g.roomId === R.drum);
  const hat = at(R.drum, 21, 18, [HEADDRESS], false, true);
  hat.g.worn = itemIndex(hat.g, R.steak, 0);
  run(hat, NONE, 2);
  const gone = hat.g.enemies[0]?.x === 0xff;
  check('with the headdress the steward has stepped aside (his place is off the room), and the way east is open', gone);
  const pass = at(R.drum, 21, 18, [HEADDRESS], false, true);
  run(pass, RIGHT, 150);
  check('in the headdress he walks through the lane into the avenue, alive', pass.g.roomId === R.float && !dead(pass.g));
}

// ---- the costume -----------------------------------------------------------------------------------------
{
  const s = at(R.steak, 4, 10, [], true);
  for (let f = 0; f < 120 && !s.g.siCollected[itemIndex(s.g, R.steak, 0)]; f++) frame(s, RIGHT);
  run(s, NONE, 3);
  check(`taking the headdress puts it on him: a sprite of its own over his head in gold (colour 7), his face showing, the hint says what it is for ("${rowText(s.g)}")`,
    s.g.worn === itemIndex(s.g, R.steak, 0) && s.g.hatPlaced && s.g.vic.sprites[7]?.colour === 7 && rowText(s.g) === 'A HEADDRESS: JOIN THE PARADE');
  const k = at(R.lap, 12, 4, [], true);
  for (let f = 0; f < 120 && !k.g.siCollected[itemIndex(k.g, R.lap, 0)]; f++) frame(k, RIGHT);
  run(k, NONE, 3);
  check(`taking the key to the city says what it is for ("${rowText(k.g)}")`, rowText(k.g) === 'KEY TO THE CITY: OPENS DOORS');
  const w = at(R.sugar, 4, 18, [], true);
  run(w, NONE, 120);
  check(`ENHANCED: coming into Sugar Rush without the key says so ("${rowText(w.g)}")`, rowText(w.g) === 'THE CABLE CAR STATION IS LOCKED');
  const d = at(R.drum, 3, 18, [], true);
  run(d, NONE, 120);
  check(`ENHANCED: coming into the parade without the headdress says so ("${rowText(d.g)}")`, rowText(d.g) === 'ONLY DANCERS PASS THE STEWARD');
  const plain = at(R.sugar, 4, 18, [], false);
  run(plain, NONE, 120);
  check('ORIGINAL says nothing', rowText(plain.g) === 'SUGAR RUSH');
  for (const n of [1, 2, 3, 4, 5, 6]) check(`the skewer${n} is a 200 point snack (a named item with the skewer's sprite)`, RIO_ROOMS.some((r) => r.item?.name === `skewer${n}` && r.item.sprite === RIO_SPRITE.skewer));
}

// ---- the joins -------------------------------------------------------------------------------------------
{
  const open = (room: number) => {
    const r = must(RIO_ROOMS.find((x) => x.id === room), 'a room');
    return (col: number, row: number) => { const ch = r.map[row]?.[col] ?? '.'; return ch !== '.' && [1, 2, 4].includes(WORLD.tileProperty(r.tiles[Number(ch) - 1] ?? 0)); };
  };
  const rowsOpen = (room: number, col: number) => Array.from({ length: 20 }, (_, row) => row).filter((row) => !open(room)(col, row));
  const sides: readonly (readonly [number, number])[] = [[R.quay, R.lap], [R.steak, R.sugar], [R.sugar, R.loaf], [R.loaf, R.arms], [R.arms, R.monkey], [R.colour, R.drum], [R.drum, R.float], [R.float, R.bust]];
  const clash = (l: number, r: number) => {
    const a = rowsOpen(l, 31), b = rowsOpen(r, 0);
    return [...a.filter((x) => !b.includes(x)), ...b.filter((x) => !a.includes(x))].filter((row) => row >= 3);
  };
  // (the steak room is west of the sugar room: its east edge meets the sugar room's west edge)
  const bad = sides.filter(([l, r]) => clash(l, r).length > 0 || rowsOpen(l, 31).filter((x) => x >= 3).length === 0);
  check(`every east-west join of Rio is open at the same rows on both sides, no open row meeting a wall (${bad.length ? bad.map(([l, r]) => `${l}-${r}: ${clash(l, r).join(' ')}`).join(', ') : 'all eight'})`, bad.length === 0);
  const andesBank = (row: number) => must(RIO_ROOMS.find((x) => x.id === R.quay), 'a room').map[row]?.[0] ?? '.';
  check('the Amazon\'s last bank opens east at rows 6-7 onto the quay\'s gangway (floor 8): both sides open there and nowhere else from the third row down', [6, 7].every((r) => andesBank(r) === '.'));
  const reach = (from: State, aim: { room: number; col: number; row: number }, goal: (g: Game) => boolean, limit = 200000) => search(from, (g) => goal(g) && !g.freeze && !g.script, [aim], limit, 1.5) !== null;
  check('Lapa and Sugarloaf join by the rope both ways (up from the street, down from the beach)', reach(at(R.lap, 20, 18), { room: R.lap, col: 26, row: 0 }, (g) => g.roomId === R.sugar) && reach(at(R.sugar, 22, 18), { room: R.sugar, col: 26, row: 19 }, (g) => g.roomId === R.lap));
  check('Corcovado and the favela join by the rope both ways', reach(at(R.arms, 3, 8), { room: R.arms, col: 5, row: 19 }, (g) => g.roomId === R.colour) && reach(at(R.colour, 3, 8), { room: R.colour, col: 5, row: 0 }, (g) => g.roomId === R.arms));
  check('the forest and the parade join by the rope both ways', reach(at(R.monkey, 19, 8), { room: R.monkey, col: 22, row: 19 }, (g) => g.roomId === R.drum) && reach(at(R.drum, 20, 18), { room: R.drum, col: 22, row: 0 }, (g) => g.roomId === R.monkey));
  check('the summit joins Corcovado and the cable car both ways', reach(at(R.loaf, 3, 8), { room: R.loaf, col: 31, row: 7 }, (g) => g.roomId === R.arms) && reach(at(R.arms, 28, 8), { room: R.arms, col: 0, row: 7 }, (g) => g.roomId === R.loaf));
  // the loop: Corcovado, the forest, the parade, the favela and back up the rope
  check('Corcovado, the forest, the parade and the favela are a loop (the forest\'s rope down, the parade\'s street west to the favela, the favela\'s rope up)',
    reach(at(R.arms, 24, 8), { room: R.monkey, col: 22, row: 19 }, (g) => g.roomId === R.drum) && reach(at(R.drum, 3, 18), { room: R.drum, col: 0, row: 17 }, (g) => g.roomId === R.colour) && reach(at(R.colour, 20, 18), { room: R.colour, col: 5, row: 0 }, (g) => g.roomId === R.arms));
  const edge = (room: number, col: 0 | 31) => {
    const r = must(RIO_ROOMS.find((x) => x.id === room), 'a room');
    return Array.from({ length: 17 }, (_, i) => i + 3).filter((row) => { const ch = r.map[row]?.[col] ?? '.'; return ch === '.' || ![1, 2, 4].includes(WORLD.tileProperty(r.tiles[Number(ch) - 1] ?? 0)); });
  };
  const joins: readonly (readonly [number, 0 | 31, readonly number[]])[] = [
    [R.quay, 0, [6, 7]], [R.quay, 31, [16, 17]], [R.lap, 0, [16, 17]], [R.sugar, 0, [16, 17]], [R.sugar, 31, [6, 7]], [R.loaf, 0, [6, 7]], [R.loaf, 31, [6, 7]], [R.arms, 0, [6, 7]], [R.arms, 31, [6, 7]],
    [R.monkey, 0, [6, 7]], [R.colour, 31, [16, 17]], [R.steak, 31, [16, 17]], [R.drum, 0, [16, 17]], [R.drum, 31, [16, 17]], [R.float, 0, [16, 17]], [R.float, 31, [16, 17]], [R.bust, 0, [16, 17]],
  ];
  const bad2: string[] = [];
  for (const [room, col, rows] of joins) {
    const got = edge(room, col);
    if (!rows.every((r) => got.includes(r)) || got.includes(18) || got.includes(19)) bad2.push(`room ${room} col ${col}: open at ${got.join(' ') || 'none'}, should be open at ${rows.join(' ')} and shut under`);
  }
  check(`every join of Rio is open at its way's rows and shut under them (${bad2.length ? bad2.join('; ') : 'all 17 sides'})`, bad2.length === 0);
  // (a side with no room beyond it is open sky or hill: the engine stops him at it, he never leaves the room)
  const stops = ([[R.lap, 28, 18, RIGHT], [R.bust, 28, 18, RIGHT], [R.colour, 3, 8, LEFT], [R.monkey, 28, 8, RIGHT]] as const).map(([room, col, floor, key]) => {
    const s = at(room, col, floor, []);
    s.g.enemies = [];
    run(s, key, 120);
    return s.g.roomId === room && !dead(s.g);
  });
  check(`where no room lies beyond a side he is stopped at the edge (Lapa's east, the beach's east, the favela's west, the forest's east: ${stops.map((x) => (x ? 'stopped' : 'left')).join(' ')})`, stops.every(Boolean));
}

// ---- the pause screen, the saves ----------------------------------------------------------------------------
{
  const s = newGame(WORLD, true);
  const info = montyMap.info(s.g, { rooms: {} });
  check(`the pause screen counts the snacks and the items over the seven regions (${info.join(' | ')})`, info[3] === 'SNACKS 0/21' && info[2] === 'ITEMS  0/18');
  enterRoom(s.g, R.sugar, 0x40, standY(18));
  const places = montyMap.places({ x: 0, y: 0, w: 200, h: 150 }, s.g, { rooms: { [R.sugar]: [0x40, 0xb2, 6, 24], [R.lap]: [0x40, 0xb2, 7, 24] } });
  check('in Rio the map shows its region (seven columns, two rows), the rooms he has been to are places to go', places.length === 2 && places.every((p) => p.x >= 0 && p.x < 200 && p.y >= 0 && p.y < 150));
  const spots = [[R.quay, 2, 8], [R.lap, 4, 18], [R.sugar, 14, 18], [R.loaf, 2, 8], [R.arms, 1, 8], [R.monkey, 10, 8], [R.colour, 3, 8], [R.steak, 24, 18], [R.drum, 1, 18], [R.float, 1, 18], [R.bust, 2, 18]] as const;
  const failed: number[] = [];
  const carried = spots.filter(([room, col, floor]) => {
    const a = newGame(WORLD, false);
    for (const item of [KEY, HEADDRESS]) a.g.siCollected[itemIndex(a.g, item[0], item[1])] = 0x81;
    wear(a.g, itemIndex(a.g, R.steak, 0));
    enterRoom(a.g, room, 0x0c + (col + 4) * 4, standY(floor));
    for (let n = 0; n < 200 && (a.g.freeze || a.g.script); n++) frame(a, NONE);
    const b = newGame(WORLD, false);
    restore(b.g, CODEC.unpack(CODEC.pack(snapshot(a.g)), CODEC.format));
    run(b, NONE, 4);
    b.g.enemies = [];
    b.g.enable &= 0x0f;
    b.g.vic.enable &= 0x0f;
    b.g.skewers = [];
    run(b, NONE, 30);
    const gateOpen = room !== R.sugar || GATE_CELLS.every(([row, col2]) => b.g.flagAt(row + 3, col2 + 4) === 0);
    const ok = gateOpen && b.g.roomId === room && !dead(b.g) && b.g.worn === itemIndex(b.g, R.steak, 0);
    if (!ok) failed.push(room);
    return ok;
  }).length;
  check(`a save made on coming into each of Rio's eleven rooms packs, unpacks and carries on in the same room, alive, in the headdress (${carried} of ${spots.length}${failed.length ? `; not in rooms ${failed.join(', ')}` : ''})`, carried === spots.length);

  // a save from before Rio: the first six regions' arrays carry on in the new game, Rio's coins and finds still to take
  const g1 = newGame(WORLD, true).g;
  g1.siCollected[0] = 0x81; g1.siCollected[5] = 0x81; g1.coinCollected[0] = 0xff; g1.coinCollected[30] = 0xff;
  const old = snapshot(g1);
  const oldSave = { ...old, coins: old.coins.slice(0, 149), items: old.items.slice(0, 31), roomId: AND.bank, worn: itemIndex(g1, AND.market, 0) };
  const g2 = newGame(WORLD, true).g;
  restore(g2, CODEC.unpack(CODEC.pack(oldSave), CODEC.format));
  check('an old save (the six regions before Rio\'s arrays) loads: the finds and the chullo are as saved, Rio is on the grid, its coins and finds still to take',
    g2.siCollected[0] === 0x81 && g2.siCollected[5] === 0x81 && g2.coinCollected[0] === 0xff && g2.coinCollected[30] === 0xff && g2.worn === oldSave.worn && g2.exitGrid[7 * WORLD.exitGrid.cols + 23] === R.quay && g2.siCollected.length === 40
    && g2.coinCollected.length === 149 + RIO_ROOMS.reduce((n, r) => n + (r.coins?.length ?? 0), 0) && g2.coinCollected.slice(149).every((c) => c === 0));}

// ---- the way in is two ways, the gates hold, the beach is drawn ---------------------------------------------
{
  // Rio joins the Andes' last bank both ways (Chris: every way but the floats' is two-way; pause-map travel covers only the region he is in, so a way back must be walked)
  const out = at(AND.bank, 24, 8, [], false, false);
  const into = search(out, (g) => g.roomId === R.quay && !g.freeze && !g.script, [{ room: AND.bank, col: 31, row: 7 }], 100000, 1.5);
  check('from the Amazon\'s last bank the bot walks into the quay', into !== null);
  const stats = { exhausted: false };
  const quay = at(R.quay, 20, 18, [], false, false);
  const back = search(quay, (g) => g.roomId === AND.bank && !g.freeze && !g.script, [{ room: R.quay, col: 3, row: 6 }, { room: R.quay, col: 0, row: 7 }], 150000, 1.5, stats);
  check('and from the quay\'s street, up the wharf\'s steps (two rows each) and out west, back to the Andes\' last bank', back !== null);
  // the gates by the bot's search, as the Andes' are: none past a gate without its item
  const shelf = at(R.sugar, 9, 14, [], false, false);
  const st2 = { exhausted: false };
  const gate = search(shelf, (g) => g.cable.from >= 0 || g.roomId === R.loaf, undefined, 150000, 0, st2);
  check('the bot finds no way onto the cable car without the key to the city within 150000 states', gate === null);
  const lane = at(R.drum, 18, 18, [], false, true);
  const steward = search(lane, (g) => g.roomId === R.float, undefined, 150000, 0);
  check('the bot finds no way past the steward into the avenue without the headdress within 150000 states', steward === null);
  // the CLOSED sign comes down with the gate
  const shut = at(R.sugar, 5, 14, []), open = at(R.sugar, 5, 14, [KEY]);
  check('the CLOSED sign over the station hut is up until the key to the city is his, and down once it is', CLOSED_CELLS.every(([row, col]) => cell(shut.g, col, row) !== 0) && CLOSED_CELLS.every(([row, col]) => cell(open.g, col, row) === 0));
  // the beach's sign is drawn (a sign is a character a letter: the room's 101 are all taken, so one that does not fit is quietly left out)
  const beach = at(R.bust, 2, 18, [], false, false);
  run(beach, NONE, 2);
  // the carnival has its dancer (the plan's samba dancers), as the churrascaria does
  const rooms = creatureRooms(RIO_ROOMS);
  const dancer = FIRST_CREATURE + Object.keys(WORLD_CREATURES).indexOf('dancer');
  check('the dancer is in the carnival (room 75) only: the churrascaria has none (the stage is free of creatures)', [...(rooms.get(dancer) ?? [])].join() === String(R.drum));
  // the Andes' map does not offer Rio's rooms as places to go
  const bank = newGame(WORLD, true);
  enterRoom(bank.g, AND.bank, 0x40, standY(15));
  const andesPlaces = montyMap.places({ x: 0, y: 0, w: 200, h: 150 }, bank.g, { rooms: { [R.quay]: [0x40, 0xb2, 7, 33], [R.steak]: [0x40, 0xb2, 6, 33], [AND.cloud]: [0x40, 0xb2, 3, 31] } });
  check('in the Andes\' last bank the map offers the Andes\' rooms but not the quay and the churrascaria (cells of Rio\'s, cut out of the Andes\' rectangle)', andesPlaces.every((p) => p.id !== String(R.quay) && p.id !== String(R.steak)));
}

// ---- the finale ---------------------------------------------------------------------------------------------
{
  const s = at(R.bust, 18, 18, [KEY, HEADDRESS], false);
  wear(s.g, itemIndex(s.g, R.steak, 0));
  let touched = -1;
  for (let f = 0; f < 200 && touched < 0; f++) { frame(s, RIGHT); if (s.g.completionActive) touched = f; }
  check('walking east along the promenade he touches the acai bowl and the finale begins (the treasure, the game\'s)', touched >= 0);
  let over = -1;
  for (let f = 0; f < 3000 && over < 0; f++) { frame(s, NONE); if (s.g.gameOverActive) over = f; }
  check(`the finale runs by itself to GAME OVER (${over} frames): the game is won, the sun was a sprite, the bowl went with him`, over > 600 && over < 1500 && s.g.won);
}
finish();
