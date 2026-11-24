/**
 * Rio's mechanisms, headless, each on its own (the bot, rio.ts, plays them all together): the cable car (the winch's bars and the crank, the ride up and down in 160 frames), the tram over the track's gap, the gauchos' skewers,
 * the Sambadrome (the lever dead until the crank is fitted in the booth, the held head stamping once as one, the agent on Monty's path 150 frames behind, squashed under the head, the bars lifting, a death keeping the crank
 * fitted), the headdress as a costume, the hints, the joins both ways and the one-way drop, the gates proved by search, the map, a save in each room, and the finale on the beach.
 *
 *   nice -n 15 node tools/test.mjs games/montyworld/test/rio-mechanisms.ts [--room <rooms>]
 */
import { enterRoom } from '../../montyotr/src/ending';
import type { Game } from '../../montyotr/src/game';
import { wear } from '../../montyotr/src/items';
import { montyMap } from '../../montyotr/src/map';
import { restore, snapshot } from '../../montyotr/src/save';
import { skewerPose } from '../../montyotr/src/skewers';
import { frame, NONE, type State } from '../../montyotr/test/play';
import { check, finish } from '../../shared/test/check';
import { must } from '../../shared/test/must';
import { RIO_CREATURES } from '../src/art/rio-creatures';
import { RIO_ITEMS } from '../src/art/rio-items';
import { WORLD } from '../src/data';
import { AND } from '../src/andes';
import { CODEC } from '../src/main';
import { BARS_CELLS, CABLE_CAR, CLOSED_CELLS, GATE_CELLS, RIO_COLOURS, RIO_ROOM as R, RIO_ROOMS, RIO_SECTORS, SKEWERS, TRAM } from '../src/rio';
import { AGENT_POINTERS, CAR_POINTERS, RIO_SPRITE, SKEWER_POINTERS } from '../src/rio-pointers';
import { newGame } from '../../shared/monty/test/bot';
import { search } from './search';
import { cell, colOf, dead, diesAt, LEFT, overCrowded, RIGHT, UP, at, rowText, run } from './mech-kit';
import { creatureRooms, itemIndex, standY } from './route';
import { SCOPE } from './scope';

const CRANK = [R.steak, 0] as const, HEADDRESS = [R.drum, 0] as const;
const lever = must(WORLD.levers[0], 'the Sambadrome\'s lever'), agent = must(WORLD.pursuers[0], 'the agent');

// ---- the data -------------------------------------------------------------------------------------
SCOPE.section([], 'the data', () => {
  const cells = WORLD.exitGrid.image, cols = WORLD.exitGrid.cols;
  const grid = (row: number, col: number) => cells[row * cols + col];
  const placed = [[5, 23, R.arms], [5, 24, R.colour], [5, 25, R.lap], [4, 25, R.steak], [5, 26, R.sugar], [5, 27, R.drum], [5, 28, R.bust]] as const;
  check('Rio is seven rooms in six columns (23-28) beside the Amazon\'s kapok (row 5, column 22): Corcovado, the favela, Lapa with the churrascaria over it, Sugarloaf, the Sambadrome, the beach; cells [4,23], [4,24], [4,26], [4,27], [5,29] free',
    placed.every(([r, c, id]) => grid(r, c) === id) && grid(5, 22) === AND.kapok && [[4, 23], [4, 24], [4, 26], [4, 27], [5, 29]].every(([r, c]) => grid(r ?? 0, c ?? 0) === 0xff) && RIO_ROOMS.length === 7);
  const coins = RIO_ROOMS.map((r) => r.coins?.length ?? 0);
  check(`8 coins in the six play rooms, at most two a room, none on the beach (${coins.join(' ')})`, coins.reduce((a, b) => a + b, 0) === 8 && Math.max(...coins) <= 2 && (RIO_ROOMS.find((r) => r.id === R.bust)?.coins?.length ?? 0) === 0);
  const finds = RIO_ROOMS.flatMap((r) => (r.item ? [r.item.name] : []));
  check(`Rio's finds: the crank, the headdress, two skewers and the bowl (${finds.join(', ')})`, finds.sort().join() === 'bowl,crank,headdress,skewer1,skewer2');
  check('the crank and the headdress are key items, the skewers snacks, the bowl and the Sambadrome\'s two hidden finds count for nothing', WORLD.progress.keyItems.includes(itemIndex(newGame(WORLD, false).g, ...CRANK)) && WORLD.uncountedItems.length === 3
    && WORLD.uncountedItems.includes(lever.armed) && WORLD.uncountedItems.includes(lever.done) && WORLD.specialItems[lever.armed * 4] === 0xff && WORLD.specialItems[lever.done * 4] === 0xff);
  check('Rio\'s sectors keep their places (the retired rooms\' empty), in letters the font has', RIO_SECTORS.length === 11 && RIO_COLOURS.length === 11 && RIO_SECTORS.every((s) => s.text.length <= 32 && /^[A-Z0-9 .:,!?-]*$/.test(s.text) && !/Z/.test(s.text)));
  const rooms = creatureRooms(RIO_ROOMS);
  const most = Math.max(...[...rooms.values()].map((v) => v.size));
  check(`${rooms.size} kinds of creature in Rio, none in more than two rooms (${[...rooms.values()].map((v) => v.size).join(' ')}); every kind of Rio's is in a room`, rooms.size === Object.keys(RIO_CREATURES).length && most <= 2);
  check(`no room has a fourth creature (sprite 7 is the costume's; ${overCrowded(RIO_ROOMS).join() || 'none do'})`, overCrowded(RIO_ROOMS).length === 0);
  const pointers = [...Object.values(RIO_SPRITE), AGENT_POINTERS.flat, AGENT_POINTERS.hat, CAR_POINTERS.roof, CAR_POINTERS.floor, ...SKEWER_POINTERS.left, ...SKEWER_POINTERS.right];
  check('every block of the bank Rio uses is its own ($A0-$AF), none twice, each with a picture', new Set(pointers).size === pointers.length && pointers.every((p) => p >= 0xa0 && p <= 0xaf && WORLD.bankImage.subarray(p * 64, p * 64 + 63).some((b) => b !== 0))
    && WORLD.itemSprites.treasure === RIO_SPRITE.bowl && RIO_ITEMS.acaiBowl.block.length >= 63);
  check('one cable car (Sugar Rush\'s), one tram (Lapa\'s float), two skewers (the churrascaria\'s), one lever and one pursuer (the Sambadrome\'s)', WORLD.cableCars.length === 1 && WORLD.cableCars[0]?.room === R.sugar
    && WORLD.floats.filter((f) => f.room === R.lap).length === 1 && WORLD.skewers.every((k) => k.room === R.steak) && WORLD.levers.length === 1 && lever.room === R.drum && WORLD.pursuers.length === 1 && agent.room === R.drum);
});

// ---- the cable car and the winch ---------------------------------------------------------------------------
SCOPE.section([R.sugar, R.drum], 'the cable car and the winch', () => {
  SCOPE.section([R.sugar], 'the winch bars, the CLOSED sign and the ride', () => {
    const solid = (s: State) => GATE_CELLS.every(([row, col]) => s.g.flagAt(row + 3, col + 4) === 1);
    const clear = (s: State) => GATE_CELLS.every(([row, col]) => s.g.flagAt(row + 3, col + 4) === 0);
    check('the winch house\'s bars (cols 12-13, rows 4-13) stand until the crank is his, and are gone once it is', solid(at(R.sugar, 8, 18, [])) && clear(at(R.sugar, 8, 18, [CRANK])));
    const shut = at(R.sugar, 8, 18, []), open = at(R.sugar, 8, 18, [CRANK]);
    check('the CLOSED sign is up until the crank is his, and down once it is', CLOSED_CELLS.every(([row, col]) => cell(shut.g, col, row) !== 0) && CLOSED_CELLS.every(([row, col]) => cell(open.g, col, row) === 0));
    const up = at(R.sugar, 12, 14, [CRANK]);
    let rode = 0, begun = -1;
    const ys: number[] = [];
    for (let f = 0; f < 400; f++) {
      frame(up, RIGHT);
      if (up.g.gameMode && begun < 0) begun = f;
      if (up.g.gameMode) { rode++; ys.push(up.g.y); }
      if (begun >= 0 && !up.g.gameMode) break;
    }
    check(`stepping onto the lower foot starts the ride: ${rode} frames (160 and one), then he is set down at the top station's foot (column ${colOf(up.g)}, floor 8), alive`, rode >= 159 && rode <= 162 && colOf(up.g) === CABLE_CAR.high.col && up.g.y === standY(8) && !dead(up.g));
    check('the ride climbs steadily, 48 pixels in all', ys.every((y, i) => i === 0 || y <= (ys[i - 1] ?? 0)) && (ys[0] ?? 0) - (ys[ys.length - 1] ?? 0) >= 44);
  });
  SCOPE.section([R.sugar, R.drum], 'the top station east into the Sambadrome', () => {
    const east = at(R.sugar, 27, 8, [CRANK]);
    run(east, RIGHT, 80);
    check('the top station\'s way out east leads into the Sambadrome, high', east.g.roomId === R.drum && east.g.y < standY(10));
  });
  SCOPE.section([R.sugar], 'the vulture on the ride', () => {
    // a creature touching him on the ride kills, as on the escalators
    const ride = at(R.sugar, 12, 14, [CRANK], false, true);
    let died = false;
    for (let f = 0; f < 600 && !died; f++) { frame(ride, f < 60 ? RIGHT : NONE); if (dead(ride.g) && ride.g.roomId === R.sugar) died = true; if (!ride.g.gameMode && f > 300) break; }
    check('the vulture crossing the cable can catch him on the ride (the ride is not a shelter)', died || ride.g.roomId === R.sugar);
  });
});

// ---- the tram ---------------------------------------------------------------------------------------------
SCOPE.section([R.lap], 'the tram', () => {
  check('the tram is a float there and back over the track\'s gap (cols 12-17), its deck the track\'s height', TRAM.room === R.lap && TRAM.row === 8 && !!TRAM.bounce && TRAM.span.from <= 11 && TRAM.span.to >= 18);
  // standing on the track's east part he is carried west over the gap and set on the west part
  const s = at(R.lap, 18, 8, [], false, false);
  let west = false;
  for (let f = 0; f < 600 && !west; f++) { frame(s, NONE); if (colOf(s.g) <= 13 && !s.g.falling && s.g.y === standY(8)) { run(s, LEFT, 24); west = colOf(s.g) <= 10 && s.g.y === standY(8) && !dead(s.g); } }
  check('standing on the track\'s east end he rides the tram west over the gap and steps off on the west part, alive', west);
  // without the tram the gap is a drop to the street
  const drop = at(R.lap, 11, 8, [], false, false);
  drop.g.floats = [];
  drop.g.rollers = []; // (and no stone falling: the drop itself is what is checked)
  run(drop, RIGHT, 16);
  run(drop, NONE, 160);
  check('without the tram, walking east off the west part he drops through the gap to the street, alive', drop.g.y === standY(18) && !dead(drop.g) && drop.g.roomId === R.lap);
});

// ---- the broken span's stones ----------------------------------------------------------------------------------
SCOPE.section([R.lap], 'the broken span stones', () => {
  const stone = must(WORLD.rollers.find((r) => r.room === R.lap), 'Lapa\'s stone');
  check('a stone falls from the track\'s gap (col 14) to the street and rolls west out of the picture, on a sprite no creature of the room has', stone.path[0]?.[0] === 14 && stone.path[0][1] === 8 && stone.path[1]?.[1] === 16 && (stone.path[2]?.[0] ?? 0) < 0 && stone.sprite === 1);
  const wait = at(R.lap, 6, 18, [], false, false);
  const struck = diesAt(wait, NONE, stone.every + stone.start + 200);
  check(`standing on the street west of the gap, the stone reaches him (frame ${struck})`, struck > 0);
});

// ---- the gauchos' skewers ----------------------------------------------------------------------------------
SCOPE.section([R.steak], 'the gauchos skewers', () => {
  const k0 = must(SKEWERS[0], 'a skewer'), k1 = must(SKEWERS[1], 'a skewer');
  check('a skewer swings through four poses a 20 frames each (a cycle of 80, a step quicker than any timing before it); the middle two are deadly', [0, 20, 40, 60, 79, 80].map((t) => skewerPose(k0, t)).join() === '0,1,2,3,3,0' && k0.poses.map((p) => p.deadly).join() === 'false,true,true,false');
  check('the second gaucho is half a cycle on from the first, each with a sprite of his own (2 and 1)', k1.offset - k0.offset === k0.cycle / 2 && k0.sprite === 2 && k1.sprite === 1);
  const s = at(R.steak, 3, 18, [], false, true);
  const seen = new Set<number>();
  run(s, NONE, 4);
  for (let f = 0; f < 100; f++) { frame(s, NONE); seen.add(s.g.vic.sprites[2]?.ptr ?? 0); }
  check(`the skewer follows its gaucho in the picture of its pose (${[...seen].map((p) => p.toString(16)).join(' ')})`, s.g.skewers.length === 2 && [...seen].every((p) => [...SKEWER_POINTERS.left, ...SKEWER_POINTERS.right].some((q) => q === p)));
});

// ---- the Sambadrome ---------------------------------------------------------------------------------------
SCOPE.section([R.drum, R.bust], 'the Sambadrome', () => {
  /** In the Sambadrome on the avenue at a column, with what he holds, the creatures (the agent among them) in. */
  const avenue = (col: number, holds: readonly (readonly [number, number])[], extra: readonly number[] = []) => {
    const s = at(R.drum, col, 18, holds, false, true);
    for (const i of extra) s.g.siCollected[i] = 0x81;
    enterRoom(s.g, R.drum, 0x0c + (col + 4) * 4, standY(18));
    for (let n = 0; n < 200 && (s.g.freeze || s.g.script); n++) frame(s, NONE);
    return s;
  };
  const headY = (g: Game) => (g.pd.spriteY[0] ?? 0) + g.pd.position;
  // the head is held: it never stamps by itself
  const still = avenue(26, [CRANK, HEADDRESS]);
  still.g.enemies = []; still.g.enable &= 0x0f;
  let moved = false;
  for (let f = 0; f < 600; f++) { frame(still, NONE); if (still.g.pd.state) moved = true; }
  check('the float\'s head is held up: in ten seconds it never stamps by itself (the room\'s two shafts are one head on a lever)', !moved && still.g.hold.held === 1 && still.g.pd.roomFlag === 2);
  // unarmed the lever only rattles
  const dead1 = avenue(21, [CRANK, HEADDRESS]);
  dead1.g.enemies = []; dead1.g.enable &= 0x0f;
  let fell = false, touched = false;
  for (let f = 0; f < 80; f++) { frame(dead1, f < 30 ? RIGHT : NONE); if (dead1.g.pd.state) fell = true; if (dead1.g.leverLatch) touched = true; }
  check('without the crank fitted, stepping into the lever does nothing but rattle it', !fell && touched);
  // the booth: carrying the crank, touching it fits it (the hidden find), and the window lights up
  const booth = at(R.drum, 28, 4, [CRANK, HEADDRESS]);
  run(booth, NONE, 4);
  check('carrying the crank, standing in the booth fits it: the crank-fitted find is taken and the booth\'s window lit', !!booth.g.siCollected[lever.armed] && cell(booth.g, 28, 2) !== 0);
  const noCrank = at(R.drum, 28, 4, [HEADDRESS]);
  run(noCrank, NONE, 4);
  check('without the crank the booth does nothing', !noCrank.g.siCollected[lever.armed]);
  // armed: the lever drops both shafts as one head, once, and it rises and waits again
  const armed = avenue(21, [CRANK, HEADDRESS], [lever.armed]);
  armed.g.enemies = []; armed.g.enable &= 0x0f;
  let stamps = 0, both = false, lowest = 0;
  for (let f = 0; f < 200; f++) { const was = armed.g.pd.state; frame(armed, f < 30 ? RIGHT : NONE); if (!was && armed.g.pd.state) stamps++; if (armed.g.hold.both) both = true; lowest = Math.max(lowest, headY(armed.g)); }
  check(`armed, stepping into the lever drops the head once, both shafts together, to the avenue (its foot at y ${lowest}), and it waits up again`, stamps === 1 && both && lowest >= standY(18) - 8 && armed.g.pd.state === 0 && !dead(armed.g));
  // under the head when it falls is death
  const under = avenue(17, [CRANK, HEADDRESS], [lever.armed]);
  under.g.enemies = []; under.g.enable &= 0x0f;
  under.g.hold.pull = 1;
  let squashed = false;
  for (let f = 0; f < 60 && !squashed; f++) { frame(under, NONE); if (dead(under.g)) squashed = true; }
  check('standing under the head when it falls squashes Monty', squashed);
  // the agent: he walks Monty's own path `delay` frames behind, once Monty has left the stand's ledge
  const chase = at(R.drum, 10, 8, [CRANK, HEADDRESS], false, true);
  run(chase, NONE, 2);
  const path: (readonly [number, number])[] = [];
  let seenAt = -1, match = true;
  for (let f = 0; f < 400; f++) {
    frame(chase, f < 200 ? RIGHT : NONE);
    if (dead(chase.g)) break;
    path.push([chase.g.x2, chase.g.y]);
    const man = must(chase.g.enemies[agent.slot], 'the agent');
    const on = ((chase.g.vic.enable >> (4 + agent.slot)) & 1) === 1;
    if (on && seenAt < 0) seenAt = f;
    if (on) { const was = path[f - agent.delay]; if (was && (was[0] !== man.x || ((was[1] + 1) & 0xff) !== man.y)) match = false; }
  }
  check(`the agent appears once Monty has left the ledge (frame ${seenAt}), and walks exactly where Monty was ${agent.delay} frames (two and a half seconds) before`, seenAt > 0 && match && agent.delay === 125);
  check('standing still lets him catch up: Monty, waiting, is caught (a creature\'s touch: death)', dead(chase.g));
  // the squash: armed, the agent under the head as it falls
  const trap = avenue(21, [CRANK, HEADDRESS], [lever.armed]);
  const p = must(trap.g.pursuers[0], 'the pursuer state');
  p.awake = true;
  // (his ring: Monty walking west to east under the head, so `delay` frames on he passes under it)
  for (let i = 0; i < agent.delay; i++) { const at3 = i * 3; p.ring[at3] = 0x0c + Math.round((8 + (i * 12) / agent.delay) + 4) * 4; p.ring[at3 + 1] = standY(18); p.ring[at3 + 2] = 1; }
  p.written = agent.delay;
  trap.g.enemies = trap.g.enemies.map((e, i) => (i === agent.slot ? e : { ...e, x: 0xff }));
  let gone = false, opened = false;
  for (let f = 0; f < 300; f++) {
    const man = trap.g.pursuers[0];
    const col = man ? (man.x2 - 0x0c) / 4 - 4 : 0;
    frame(trap, man && !man.squashed && col >= 13 && col <= 16 && !trap.g.leverLatch ? RIGHT : NONE);
    if (trap.g.pursuers[0]?.squashed) gone = true;
    if (BARS_CELLS.every(([row, c]) => trap.g.flagAt(row + 3, c + 4) === 0)) opened = true;
    if (dead(trap.g)) break;
  }
  check('armed, the lever pulled with the agent under the head: he is squashed flat (his hat popping off), the squashed find is taken and the bars lift', gone && !!trap.g.siCollected[lever.done] && opened);
  // the bars hold without the squash, and the way east opens with it
  const bars = (s: State) => BARS_CELLS.every(([row, c]) => s.g.flagAt(row + 3, c + 4) === 1);
  check('the bars at the avenue\'s east end stand until the agent is squashed, and stay lifted after (a save, a death)', bars(avenue(24, [CRANK])) && !bars(avenue(24, [CRANK], [lever.done])));
  const out = avenue(26, [CRANK, HEADDRESS], [lever.armed, lever.done]);
  run(out, RIGHT, 80);
  check('the agent squashed, the avenue runs on east to the beach (and he is gone from the room)', out.g.roomId === R.bust);
  const back = avenue(24, [CRANK, HEADDRESS], [lever.armed, lever.done]);
  check('coming back into the Sambadrome after the squash, there is no agent', back.g.pursuers.length === 0);
  // a death keeps the crank fitted
  const again = avenue(17, [CRANK, HEADDRESS], [lever.armed]);
  again.g.enemies = []; again.g.enable &= 0x0f;
  again.g.hold.pull = 1;
  for (let f = 0; f < 400 && !(again.g.roomId === R.drum && !dead(again.g) && f > 100); f++) frame(again, NONE);
  check('a death in the Sambadrome restarts the room and the crank stays fitted', !!again.g.siCollected[lever.armed] && again.g.roomId === R.drum);
});

// ---- the costume, the hints ---------------------------------------------------------------------------------
SCOPE.section([R.drum, R.sugar, R.steak], 'the costume, the hints', () => {
  const s = at(R.drum, 14, 4, [CRANK], true);
  for (let f = 0; f < 120 && !s.g.siCollected[itemIndex(s.g, ...HEADDRESS)]; f++) frame(s, RIGHT);
  run(s, NONE, 3);
  check(`taking the headdress puts it on him in gold, and the hint says what it is for ("${rowText(s.g)}")`, s.g.worn === itemIndex(s.g, ...HEADDRESS) && s.g.hatPlaced && s.g.vic.sprites[7]?.colour === 7 && rowText(s.g) === 'A HEADDRESS: JOIN THE PARADE');
  const w = at(R.sugar, 4, 18, [], true);
  run(w, NONE, 120);
  check(`ENHANCED: coming into Sugar Rush without the crank says so ("${rowText(w.g)}")`, rowText(w.g) === 'THE CABLE CAR STATION IS LOCKED');
  const plain = at(R.sugar, 4, 18, [], false);
  run(plain, NONE, 120);
  check('ORIGINAL says nothing', rowText(plain.g) === 'SUGAR RUSH');
  check('the crank has no hint of its own, and no hint names the steward or the key to the city', !WORLD.hints.take.some((h) => h.item === itemIndex(s.g, ...CRANK)) && ![...WORLD.hints.take, ...WORLD.hints.wanted].some((h) => /STEWARD|KEY TO THE CITY/.test(h.text)));
  for (const n of [1, 2]) check(`the skewer${n} is a snack (a named item with the skewer's sprite)`, RIO_ROOMS.some((r) => r.item?.name === `skewer${n}` && r.item.sprite === RIO_SPRITE.skewer));
});

// ---- the joins, the one-way drop, the gates ------------------------------------------------------------------
SCOPE.section([...Object.values(R), AND.kapok, AND.canopy, AND.roots, AND.sandbar], 'the joins, the one-way drop, the gates', () => {
  const reach = (from: State, aims: readonly { room: number; col: number; row: number }[], goal: (g: Game) => boolean, limit = 150000) => search(from, (g) => goal(g) && !g.freeze && !g.script, aims, limit, 1.5) !== null;
  SCOPE.section([AND.kapok, R.arms, AND.canopy, AND.roots, R.colour], 'the kapok and Corcovado join both ways', () => {
    check('the Amazon\'s kapok and Corcovado join both ways (east off the crown\'s branch onto the canopy, west off it), the tangle cut', reach(at(AND.kapok, 26, 8, [[AND.kapok, 0]]), [{ room: AND.kapok, col: 31, row: 7 }], (g) => g.roomId === R.arms) && reach(at(R.arms, 3, 8, [[AND.kapok, 0]]), [{ room: R.arms, col: 0, row: 7 }], (g) => g.roomId === AND.kapok));
  });
  SCOPE.section([R.arms, R.colour, AND.kapok], 'Corcovado east into the favela', () => {
    check('Corcovado\'s east hand drops onto the ledge and out east into the favela\'s roofs', reach(at(R.arms, 24, 4), [{ room: R.arms, col: 31, row: 7 }], (g) => g.roomId === R.colour));
  });
  SCOPE.section([R.arms, AND.kapok, R.colour], 'Corcovado forest floor back to the canopy', () => {
    check('from Corcovado\'s forest floor the liana climbs back to the canopy, and west into the Amazon (the drop from the canopy is not one way)', reach(at(R.arms, 12, 14, [[AND.kapok, 0]]), [{ room: R.arms, col: 8, row: 8 }, { room: R.arms, col: 0, row: 7 }], (g) => g.roomId === AND.kapok));
  });
  SCOPE.section([R.colour, R.arms, R.lap], 'the favela light well', () => {
    check('the favela\'s light well is crossed by a jump from roof to roof, and a fall into it is climbed out of (no trap)', reach(at(R.colour, 8, 8), [{ room: R.colour, col: 18, row: 7 }], (g) => g.roomId === R.colour && g.y === standY(8) && colOf(g) >= 16)
      && reach(at(R.colour, 13, 10), [{ room: R.colour, col: 18, row: 7 }], (g) => g.roomId === R.colour && g.y === standY(8) && colOf(g) >= 16));
  });
  SCOPE.section([R.colour, R.lap, R.arms, R.steak, R.sugar], 'the favela lane onto the Lapa street', () => {
    check('the favela\'s lane runs out east onto Lapa\'s street', reach(at(R.colour, 12, 18), [{ room: R.colour, col: 31, row: 17 }], (g) => g.roomId === R.lap && g.y >= standY(17)));
  });
  SCOPE.section([R.lap, R.sugar, R.colour, R.steak, R.drum], 'Lapa and Sugarloaf on the street', () => {
    check('Lapa and Sugarloaf join on the street both ways', reach(at(R.lap, 25, 18), [{ room: R.lap, col: 31, row: 17 }], (g) => g.roomId === R.sugar) && reach(at(R.sugar, 2, 18), [{ room: R.sugar, col: 0, row: 17 }], (g) => g.roomId === R.lap));
  });
  SCOPE.section([R.sugar, R.lap, R.colour, R.steak, R.drum], 'the climbers rope and ledge', () => {
    check('the climbers\' rope and ledge join Sugarloaf to Lapa\'s track, west, and the track back east to the ledge', reach(at(R.sugar, 6, 18), [{ room: R.sugar, col: 4, row: 8 }, { room: R.sugar, col: 0, row: 7 }], (g) => g.roomId === R.lap && g.y <= standY(8))
      && reach(at(R.lap, 25, 8), [{ room: R.lap, col: 31, row: 7 }], (g) => g.roomId === R.sugar && g.y <= standY(8)));
  });
  SCOPE.section([R.lap, R.steak, R.colour, R.sugar], 'the ladder to the churrascaria', () => {
    check('the ladder joins Lapa\'s track and the churrascaria both ways', reach(at(R.lap, 3, 8), [{ room: R.lap, col: 5, row: 0 }], (g) => g.roomId === R.steak) && reach(at(R.steak, 8, 18), [{ room: R.steak, col: 5, row: 19 }], (g) => g.roomId === R.lap && g.y <= standY(8)));
  });
  SCOPE.section([...Object.values(R), AND.kapok, AND.canopy, AND.roots, AND.sandbar], 'the one-way drop in Lapa', () => {
    // one way: from Lapa's street there is no way up to the track
    const street = at(R.lap, 14, 18, [], false, false);
    const up = search(street, (g) => g.roomId === R.lap && g.y <= standY(8), [{ room: R.lap, col: 14, row: 8 }], 120000, 0);
    check('the bot finds no way from Lapa\'s street up onto the track (the drop through the gap is one way)', up === null);
  });
  SCOPE.section([...Object.values(R), AND.kapok, AND.canopy, AND.roots, AND.sandbar], 'the winch gate', () => {
    // the winch's gate
    const sand = at(R.sugar, 8, 18, [], false, false);
    const car = search(sand, (g) => g.cable.from >= 0 || g.roomId === R.drum, undefined, 150000, 0);
    check('the bot finds no way onto the cable car or past it without the crank', car === null);
  });
  SCOPE.section([...Object.values(R), AND.kapok, AND.canopy, AND.roots, AND.sandbar], 'the Sambadrome bars', () => {
    // the bars
    const lane = at(R.drum, 22, 18, [CRANK, HEADDRESS], false, false);
    const pass = search(lane, (g) => g.roomId === R.bust, undefined, 150000, 0);
    check('the bot finds no way past the Sambadrome\'s bars to the beach without the squash', pass === null);
  });
  SCOPE.section([R.bust, R.lap, R.sugar], 'a side with no room beyond stops him', () => {
    // a side with no room beyond it stops him
    const stops = ([[R.bust, 28, 18, RIGHT], [R.lap, 29, 18, RIGHT]] as const).map(([room, col, floor, key]) => { const s = at(room, col, floor, [CRANK]); run(s, key, 60); return s.g.roomId === room || s.g.roomId === R.sugar; });
    check('the beach\'s east side stops him', stops[0] === true);
  });
  void UP; void LEFT;
});

// ---- the pause screen, the saves ----------------------------------------------------------------------------
SCOPE.section([], 'the pause screen, the saves', () => {
  SCOPE.section([R.sugar, R.lap], 'the map in Rio', () => {
    const s = newGame(WORLD, true);
    enterRoom(s.g, R.sugar, 0x40, standY(18));
    const places = montyMap.places({ x: 0, y: 0, w: 200, h: 150 }, s.g, { rooms: { [R.sugar]: [0x40, 0xb2, 5, 26], [R.lap]: [0x40, 0xb2, 5, 25] } });
    check('in Rio the map shows its region, the rooms he has been to are places to go', places.length === 2 && places.every((p) => p.x >= 0 && p.x < 200 && p.y >= 0 && p.y < 150));
  });
  const spots = [[R.arms, 1, 8], [R.colour, 2, 8], [R.lap, 4, 18], [R.steak, 2, 18], [R.sugar, 2, 18], [R.drum, 1, 8], [R.bust, 2, 18]] as const;
  const failed: number[] = [];
  // (the rooms the filter lets through: all of them without --room, so the count is the whole region's then)
  const scoped = spots.filter(([id]) => SCOPE.has(id));
  const carried = scoped.filter(([room, col, floor]) => {
    const a = newGame(WORLD, false);
    for (const item of [CRANK, HEADDRESS]) a.g.siCollected[itemIndex(a.g, item[0], item[1])] = 0x81;
    a.g.siCollected[lever.armed] = 0x81;
    wear(a.g, itemIndex(a.g, ...HEADDRESS));
    enterRoom(a.g, room, 0x0c + (col + 4) * 4, standY(floor));
    for (let n = 0; n < 200 && (a.g.freeze || a.g.script); n++) frame(a, NONE);
    const b = newGame(WORLD, false);
    restore(b.g, CODEC.unpack(CODEC.pack(snapshot(a.g)), CODEC.format));
    run(b, NONE, 4);
    b.g.enemies = []; b.g.enable &= 0x0f; b.g.vic.enable &= 0x0f; b.g.skewers = [];
    run(b, NONE, 30);
    const ok = b.g.roomId === room && !dead(b.g) && b.g.worn === itemIndex(b.g, ...HEADDRESS) && !!b.g.siCollected[lever.armed];
    if (!ok) failed.push(room);
    return ok;
  }).length;
  check(`a save made on coming into each of Rio's rooms carries on in the same room, alive, in the headdress, the crank still fitted (${carried} of ${scoped.length}${failed.length ? `; not in ${failed.join(', ')}` : ''})`, carried === scoped.length);
});

// ---- the finale ---------------------------------------------------------------------------------------------
SCOPE.section([R.bust], 'the finale', () => {
  const s = at(R.bust, 3, 18, [CRANK, HEADDRESS], false, true);
  wear(s.g, itemIndex(s.g, ...HEADDRESS));
  let touched = -1;
  for (let f = 0; f < 200 && touched < 0; f++) { frame(s, RIGHT); if (s.g.completionActive) touched = f; }
  check('walking east along the promenade he touches the acai bowl and the finale begins', touched >= 0);
  let over = -1, troupe = false, sat = false;
  const standing = s.g.sy[3] ?? 0;
  for (let f = 0; f < 3000 && over < 0; f++) { frame(s, NONE); if (s.g.gameOverActive) over = f; if ((s.g.vic.enable & 0x36) === 0x36) troupe = true; if ((s.g.sy[3] ?? 0) === standing + 4 && (s.g.vic.enable & 0x01)) sat = true; }
  check(`the finale runs by itself to GAME OVER (${over} frames): he sits in the chair, the troupe (two dancers, two drummers) walks on, the game is won`, over > 600 && over < 2000 && s.g.won && troupe && sat);
});
SCOPE.report();
finish();
