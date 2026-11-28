/**
 * Rio's mechanisms, headless, each on its own (the bot, rio.ts, plays them all together): the carnival (the floats over the canal both ways, the dancing crowds, no words on the scenery), the tram over the track's gap, the gauchos' skewers,
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
import { RIO_CARNIVAL_CREATURES, RIO_CREATURES } from '../src/art/rio-creatures';
import { RIO_ITEMS } from '../src/art/rio-items';
import { WORLD } from '../src/data';
import { AND } from '../src/andes';
import { CODEC } from '../src/main';
import { BARS_CELLS, CARNIVAL_FLOATS, RIO_ANIMS, RIO_COLOURS, RIO_ROOM as R, RIO_ROOMS, RIO_SECTORS, SKEWERS, SUGARLOAF_CUT, TRAM } from '../src/rio';
import { RETIRED } from '../src/save-migrate';
import { decorIndex } from '../src/layout';
import { FINALE_POINTERS as FP, RIO_SPRITE, SKEWER_POINTERS } from '../src/rio-pointers';
import { SAND_COLOUR } from '../src/finale';
import { FRAME } from '../../shared/monty/frames';
import { newGame } from '../../shared/monty/test/bot';
import { search } from './search';
import { cell, colOf, dead, diesAt, LEFT, overCrowded, RIGHT, UP, at, rowText, run, kept } from './mech-kit';
import { creatureRooms, itemIndex, standY } from './route';
import { SCOPE } from './scope';

const CRANK = [R.float, 0] as const, HEADDRESS = [R.drum, 0] as const, MACHETE = [AND.boat, 0] as const; // (the machete is on THE RIVER QUEEN's top deck)
const lever = must(WORLD.levers[0], 'the Sambadrome\'s lever'), agent = must(WORLD.pursuers.find((p) => p.room === R.drum), 'the agent');

// ---- the data -------------------------------------------------------------------------------------
SCOPE.section([], 'the data', () => {
  const cells = WORLD.exitGrid.image, cols = WORLD.exitGrid.cols;
  const grid = (row: number, col: number) => cells[row * cols + col];
  const placed = [[6, 28, R.arms], [6, 29, R.colour], [6, 30, R.lap], [5, 30, R.steak], [6, 31, R.beat], [6, 32, R.float], [6, 33, R.drum], [6, 34, R.bust]] as const;
  check('Rio is eight rooms in seven columns (28-34) beside the Amazon\'s kapok (row 6, column 27): Corcovado, the favela, Lapa with the churrascaria over it, the carnival\'s street and canal, the Sambadrome, the beach; cells [5,28], [5,29], [5,31]-[5,34], [6,35] free',
    placed.every(([r, c, id]) => grid(r, c) === id) && grid(6, 27) === AND.kapok && [[5, 28], [5, 29], [5, 31], [5, 32], [5, 33], [5, 34], [6, 35]].every(([r, c]) => grid(r ?? 0, c ?? 0) === 0xff) && RIO_ROOMS.length === 8);
  check('the cable car\'s room is cut: no room has its id, a save made there carries on in Lapa', !RIO_ROOMS.some((r) => r.id === SUGARLOAF_CUT) && RETIRED[SUGARLOAF_CUT] === R.lap && !(R.beat in RETIRED) && !(R.float in RETIRED));
  const coins = RIO_ROOMS.map((r) => r.coins?.length ?? 0);
  check(`12 coins in the seven play rooms, at most three a room, none on the beach (${coins.join(' ')})`, coins.reduce((a, b) => a + b, 0) === 12 && Math.max(...coins) <= 3 && (RIO_ROOMS.find((r) => r.id === R.bust)?.coins?.length ?? 0) === 0);
  const finds = RIO_ROOMS.flatMap((r) => (r.item ? [r.item.name] : []));
  const seconds = RIO_ROOMS.flatMap((r) => (r.item2 ? [r.item2.name] : []));
  check(`Rio's finds: the crank, the guarana, the headdress, three skewers and the bowl (${[...finds, ...seconds].join(', ')})`, [...finds, ...seconds].sort().join() === 'bowl,crank,guarana,headdress,skewer1,skewer2,skewer3');
  check('the crank and the headdress are key items, the skewers snacks, the bowl and the Sambadrome\'s two hidden finds count for nothing', WORLD.progress.keyItems.includes(itemIndex(newGame(WORLD, false).g, ...CRANK))
    && WORLD.uncountedItems.includes(lever.armed) && WORLD.uncountedItems.includes(lever.done) && WORLD.specialItems[lever.armed * 4] === 0xff && WORLD.specialItems[lever.done * 4] === 0xff);
  check('Rio\'s sectors keep their places (the retired rooms\' empty), in letters the font has', RIO_SECTORS.length === 11 && RIO_COLOURS.length === 11 && RIO_SECTORS.every((s) => s.text.length <= 32 && /^[A-Z0-9 .:,!?-]*$/.test(s.text) && !/Z/.test(s.text)));
  const rooms = creatureRooms(RIO_ROOMS.filter((r) => r.id !== R.bust)); // (the beach's are the finale's troupe, not met in play)
  const most = Math.max(...[...rooms.values()].map((v) => v.size));
  check(`${rooms.size} kinds of creature in Rio, none in more than two play rooms (${[...rooms.values()].map((v) => v.size).join(' ')}); every kind of Rio's is in a room`, rooms.size === Object.keys(RIO_CREATURES).length + Object.keys(RIO_CARNIVAL_CREATURES).length && most <= 2);
  check(`no room has a fourth creature (sprite 7 is the costume's; ${overCrowded(RIO_ROOMS).join() || 'none do'})`, overCrowded(RIO_ROOMS).length === 0);
  const pointers = [...Object.values(RIO_SPRITE), ...SKEWER_POINTERS.left, ...SKEWER_POINTERS.right];
  check('every block of the bank Rio uses is its own ($A0-$AF), none twice, each with a picture', new Set(pointers).size === pointers.length && pointers.every((p) => p >= 0xa0 && p <= 0xaf && WORLD.bankImage.subarray(p * 64, p * 64 + 63).some((b) => b !== 0))
    && WORLD.itemSprites.treasure === RIO_SPRITE.bowl && RIO_ITEMS.acaiBowl.block.length >= 63);
  check('no cable car (Sugarloaf\'s went with its room), one tram (Lapa\'s float), five parade floats on the canal, two skewers (the churrascaria\'s), one lever and one pursuer (the Sambadrome\'s)', WORLD.cableCars.length === 0
    && WORLD.floats.filter((f) => f.room === R.lap).length === 1 && WORLD.floats.filter((f) => f.room === R.float).length === 5 && WORLD.skewers.every((k) => k.room === R.steak) && WORLD.levers.length === 1 && lever.room === R.drum && WORLD.pursuers.filter((p) => p.room === R.drum).length === 1);
});

// ---- the carnival ---------------------------------------------------------------------------------------------
SCOPE.section([R.beat, R.float, R.drum], 'the carnival', () => {
  check('no words on the scenery in any of Rio\'s rooms: no banner, sign or label (Chris, 2026-11-25: "words on the screen feels like such an AI thing")', RIO_ROOMS.every((r) => !(r.decor ?? []).some((d) => typeof d.type !== 'number')));
  const crowds = [decorIndex('rioCrowd'), decorIndex('rioCrowdB')];
  const dancing = (room: number) => crowds.every((crowd) => RIO_ANIMS.some((a) => a.kind === 'cycle' && a.room === room && a.chars.length === 16 && a.frames.length >= 4 && a.chars.every((c) => typeof c !== 'number' && c.decor === crowd)))
    && (RIO_ROOMS.find((r) => r.id === room)?.decor ?? []).filter((d) => typeof d.type === 'number' && crowds.includes(d.type)).length >= 2;
  check('the grandstands are alive: the crowd dances along the tiers (two rows of it or more, in two colour orders, four poses in a wave) in the carnival\'s street, at the canal and in the Sambadrome', [R.beat, R.float, R.drum].every(dancing));
  check('every parade float carries a dancer dancing on it', RIO_ANIMS.filter((a) => a.room === R.float && a.kind === 'cycle' && a.chars.length === 4).length === 3);
  check('the floats run both ways along the canal: three west to east at the street\'s height, two east to west at the balconies\'', CARNIVAL_FLOATS.filter((f) => f.row === 18 && f.dir === 1).length === 3 && CARNIVAL_FLOATS.filter((f) => f.row === 14 && f.dir === -1).length === 2);
  // across the canal on lane A: from the west bank he is carried east and steps off onto the stage
  const bank = at(R.float, 3, 18, [], false, false);
  let across = false;
  for (let f = 0; f < 900 && !across && !dead(bank.g); f++) { frame(bank, f % 40 < 4 ? RIGHT : NONE); if (colOf(bank.g) >= 25 && bank.g.y === standY(18)) across = true; }
  check('on the parade\'s floats he crosses the canal from the west bank to the stage, alive', across && !dead(bank.g));
  const swim = at(R.float, 5, 18, [], false, false);
  swim.g.floats = [];
  run(swim, RIGHT, 40);
  check('without the floats, stepping into the canal is death', dead(swim.g));
});

// ---- the guarana: Monty on the run ----------------------------------------------------------------------------
SCOPE.section([R.arms, R.colour, R.drum], 'the guarana run', () => {
  const GUARANA = [R.arms, 1] as const;
  const spec = must(WORLD.run, 'the run');
  check('the guarana is the Redeemer\'s second find, a key item, and it makes him run down the hill (the favela, Lapa, the churrascaria, the carnival), not in the Sambadrome\'s showdown', spec.item === itemIndex(newGame(WORLD, false).g, ...GUARANA)
    && WORLD.progress.keyItems.includes(spec.item) && [R.colour, R.lap, R.steak, R.beat, R.float].every((r) => spec.rooms.includes(r)) && !spec.rooms.includes(R.drum) && !spec.rooms.includes(R.arms));
  /** How far (in x2 units) he walks east along the favela's lane in 120 frames, or jumps east from a standstill, with or without the guarana. */
  const walked = (room: number, holds: readonly (readonly [number, number])[], floor: number) => { const s = at(room, 6, floor, holds); run(s, NONE, 4); const x = s.g.x2; for (let f = 0; f < 120; f++) frame(s, RIGHT); return s.g.x2 - x; };
  const jumped = (holds: readonly (readonly [number, number])[]) => { const s = at(R.colour, 6, 18, holds); run(s, NONE, 4); const x = s.g.x2; for (let f = 0; f < 60; f++) frame(s, f === 0 ? { ...RIGHT, fire: true } : f < 40 ? RIGHT : NONE); return s.g.x2 - x; };
  const slow = walked(R.colour, [], 18), fast = walked(R.colour, [GUARANA], 18);
  check(`with the guarana he walks half as fast again along the favela's lane (${slow} units in 120 frames, ${fast} with it)`, slow > 0 && Math.abs(fast / slow - 1.5) < 0.1);
  const hop = jumped([]), runHop = jumped([GUARANA]);
  check(`his jump carries him as far as ever (${hop} units, ${runHop} on the run): the arc is Monty on the Run's`, hop > 0 && Math.abs(runHop - hop) <= 4);
  const drum = walked(R.drum, [GUARANA], 18), drumSlow = walked(R.drum, [], 18);
  check(`in the Sambadrome he walks (${drum} units with it, ${drumSlow} without)`, drum === drumSlow);
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
  for (let f = 0; f < 100 && !squashed; f++) { frame(under, NONE); if (dead(under.g)) squashed = true; }
  check('standing under the head when it falls (after its warning) squashes Monty', squashed);
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
    const on = ((chase.g.vic.enable >> (4 + agent.slot)) & 1) === 1 && (chase.g.pursuers[0]?.intro ?? -1) < 0; // (not his walk-on at the far side as Monty comes in)
    if (on && seenAt < 0) seenAt = f;
    if (on) { const was = path[f - agent.delay]; if (was && (was[0] !== man.x || ((was[1] + 1) & 0xff) !== man.y)) match = false; }
  }
  check(`the agent appears once Monty has left the ledge (frame ${seenAt}), and walks exactly where Monty was ${agent.delay} frames (two and a half seconds) before`, seenAt > 0 && match && agent.delay === 125);
  check('standing still lets him catch up: Monty, waiting, is caught (a creature\'s touch: death)', dead(chase.g));
  // a walker is not squashed: armed, the agent walking under the head as it is pulled is out before it lands (viktor.ts plays the puzzle itself)
  const trap = avenue(21, [CRANK, HEADDRESS], [lever.armed]);
  const p = must(trap.g.pursuers[0], 'the pursuer state');
  p.awake = true;
  // (his ring: Monty walking west to east under the head at his pace, so `delay` frames on he passes under it)
  for (let i = 0; i < agent.delay; i++) { const at3 = i * 3; p.ring[at3] = 0x0c + (Math.min(26, 8 + Math.floor(i / 4)) + 4) * 4; p.ring[at3 + 1] = standY(18); p.ring[at3 + 2] = 1; } // (at a walk: a cell every four frames)
  p.written = agent.delay;
  trap.g.enemies = trap.g.enemies.map((e, i) => (i === agent.slot ? e : { ...e, x: 0xff }));
  let gone = false, opened = false;
  for (let f = 0; f < 300; f++) {
    const man = trap.g.pursuers[0];
    const col = man ? (man.x2 - 0x0c) / 4 - 4 : 0;
    frame(trap, man && man.gone === 'no' && col >= 13 && col <= 16 && !trap.g.leverLatch ? RIGHT : NONE);
    if (trap.g.pursuers[0] && trap.g.pursuers[0].gone !== 'no') gone = true;
    if (BARS_CELLS.every(([row, c]) => trap.g.flagAt(row + 3, c + 4) === 0)) opened = true;
    if (dead(trap.g)) break;
  }
  check('armed, the lever pulled with the agent walking under the head: he walks out before it lands, nothing is squashed and the bars stand', !gone && !trap.g.siCollected[lever.done] && !opened);
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
SCOPE.section([R.drum, R.float, R.steak], 'the costume, the hints', () => {
  const s = at(R.drum, 14, 4, [CRANK], true);
  for (let f = 0; f < 120 && !s.g.siCollected[itemIndex(s.g, ...HEADDRESS)]; f++) frame(s, RIGHT);
  run(s, NONE, 3);
  check(`taking the headdress puts it on him in gold, and the hint says what it is for ("${rowText(s.g)}")`, s.g.worn === itemIndex(s.g, ...HEADDRESS) && s.g.hatPlaced && s.g.vic.sprites[7]?.colour === 7 && rowText(s.g) === 'A HEADDRESS: JOIN THE PARADE');
  const w = at(R.drum, 2, 8, [], true);
  run(w, NONE, 120);
  check(`ENHANCED: coming into the Sambadrome without the crank says why the float will not drop ("${rowText(w.g)}")`, rowText(w.g) === 'THE FLOAT(S WINCH HAS NO HANDLE');
  const plain = at(R.drum, 2, 8, [], false);
  run(plain, NONE, 120);
  check('ORIGINAL says nothing', rowText(plain.g) === 'SPY VERSUS MOLE');
  check('the crank has no hint of its own, and no hint names the steward or the key to the city', !WORLD.hints.take.some((h) => h.item === itemIndex(s.g, ...CRANK)) && ![...WORLD.hints.take, ...WORLD.hints.wanted].some((h) => /STEWARD|KEY TO THE CITY/.test(h.text)));
  for (const n of [1, 2, 3]) check(`the skewer${n} is a snack (a named item with the skewer's sprite)`, RIO_ROOMS.some((r) => r.item?.name === `skewer${n}` && r.item.sprite === RIO_SPRITE.skewer));
});

// ---- the joins, the one-way drop, the gates ------------------------------------------------------------------
SCOPE.section([...Object.values(R), AND.kapok, AND.canopy, AND.roots, AND.sandbar], 'the joins, the one-way drop, the gates', () => {
  const reach = (from: State, aims: readonly { room: number; col: number; row: number }[], goal: (g: Game) => boolean, limit = 150000) => search(from, (g) => goal(g) && !g.freeze && !g.script, aims, limit, 1.5) !== null;
  SCOPE.section([AND.kapok, R.arms, AND.canopy, AND.roots, R.colour], 'the kapok and Corcovado join both ways', () => {
    check('the Amazon\'s kapok and Corcovado join both ways (east off the crown\'s branch onto the canopy, west off it), the tangle cut', reach(at(AND.kapok, 26, 8, [MACHETE]), [{ room: AND.kapok, col: 31, row: 7 }], (g) => g.roomId === R.arms) && reach(at(R.arms, 3, 8, [MACHETE]), [{ room: R.arms, col: 0, row: 7 }], (g) => g.roomId === AND.kapok));
  });
  SCOPE.section([R.arms, R.colour, AND.kapok], 'Corcovado east into the favela', () => {
    check('Corcovado\'s east hand steps down onto the forest\'s slope and out east into the favela\'s roofs', reach(at(R.arms, 24, 4), [{ room: R.arms, col: 31, row: 7 }], (g) => g.roomId === R.colour));
  });
  SCOPE.section([R.arms, AND.kapok, R.colour], 'Corcovado forest floor back to the canopy', () => {
    check('from Corcovado\'s forest floor the liana climbs back to the canopy, and west into the Amazon (the drop from the canopy is not one way)', reach(at(R.arms, 12, 14, [MACHETE]), [{ room: R.arms, col: 8, row: 8 }, { room: R.arms, col: 0, row: 7 }], (g) => g.roomId === AND.kapok));
  });
  SCOPE.section([R.colour, R.arms, R.lap], 'the favela light well', () => {
    check('the favela\'s light well is crossed by a jump from roof to roof, and a fall into it is climbed out of (no trap)', reach(at(R.colour, 8, 8), [{ room: R.colour, col: 18, row: 7 }], (g) => g.roomId === R.colour && g.y === standY(8) && colOf(g) >= 16)
      && reach(at(R.colour, 13, 10), [{ room: R.colour, col: 18, row: 7 }], (g) => g.roomId === R.colour && g.y === standY(8) && colOf(g) >= 16));
  });
  SCOPE.section([R.colour, R.lap, R.arms, R.steak, R.beat], 'the favela lane onto the Lapa street', () => {
    check('the favela\'s lane runs out east onto Lapa\'s street', reach(at(R.colour, 12, 18), [{ room: R.colour, col: 31, row: 17 }], (g) => g.roomId === R.lap && g.y >= standY(17)));
  });
  SCOPE.section([R.lap, R.beat, R.colour, R.steak, R.float], 'Lapa and the carnival on the street', () => {
    check('Lapa and the carnival\'s street join on the street both ways', reach(at(R.lap, 25, 18), [{ room: R.lap, col: 31, row: 17 }], (g) => g.roomId === R.beat) && reach(at(R.beat, 2, 18), [{ room: R.beat, col: 0, row: 17 }], (g) => g.roomId === R.lap));
  });
  SCOPE.section([R.beat, R.lap, R.colour, R.steak, R.float], 'the Selaron steps', () => {
    check('the Selaron steps climb from the carnival\'s street to the aqueduct\'s end and west onto Lapa\'s track, and the track runs back east onto their head', reach(at(R.beat, 12, 18), [{ room: R.beat, col: 10, row: 16 }, { room: R.beat, col: 2, row: 8 }, { room: R.beat, col: 0, row: 7 }], (g) => g.roomId === R.lap && g.y <= standY(8))
      && reach(at(R.lap, 25, 8), [{ room: R.lap, col: 31, row: 7 }], (g) => g.roomId === R.beat && g.y <= standY(8)));
  });
  SCOPE.section([R.beat, R.float, R.lap, R.drum], 'over the risers to the canal', () => {
    check('over the bateria\'s risers the street runs on east to the canal, and back west', reach(at(R.beat, 12, 18), [{ room: R.beat, col: 21, row: 12 }, { room: R.beat, col: 31, row: 17 }], (g) => g.roomId === R.float) && reach(at(R.float, 2, 18), [{ room: R.float, col: 0, row: 17 }], (g) => g.roomId === R.beat));
  });
  SCOPE.section([R.float, R.drum, R.beat], 'the grandstand up into the Sambadrome', () => {
    check('the grandstand\'s ladder leads out high east into the Sambadrome\'s stand, and the stand back west onto it', reach(at(R.float, 27, 18), [{ room: R.float, col: 28, row: 8 }, { room: R.float, col: 31, row: 7 }], (g) => g.roomId === R.drum && g.y <= standY(8))
      && reach(at(R.drum, 3, 8), [{ room: R.drum, col: 0, row: 7 }], (g) => g.roomId === R.float && g.y <= standY(8)));
  });
  SCOPE.section([R.lap, R.steak, R.colour, R.beat], 'the ladder to the churrascaria', () => {
    check('the ladder joins Lapa\'s track and the churrascaria both ways', reach(at(R.lap, 3, 8), [{ room: R.lap, col: 5, row: 0 }], (g) => g.roomId === R.steak) && reach(at(R.steak, 8, 18), [{ room: R.steak, col: 5, row: 19 }], (g) => g.roomId === R.lap && g.y <= standY(8)));
  });
  SCOPE.section([...Object.values(R), AND.kapok, AND.canopy, AND.roots, AND.sandbar], 'the Sambadrome bars', () => {
    // the bars
    const lane = at(R.drum, 22, 18, [CRANK, HEADDRESS], false, false);
    const pass = search(lane, (g) => g.roomId === R.bust, undefined, 150000, 0);
    check('the bot finds no way past the Sambadrome\'s bars to the beach without the squash', pass === null);
  });
  SCOPE.section([R.bust], 'the beach ends at the rock', () => {
    const s = at(R.bust, 24, 18, [CRANK]);
    run(s, RIGHT, 80);
    check('Copacabana ends at Pedra do Leme: walking east along the promenade he stops at the rock, short of the edge', s.g.roomId === R.bust && colOf(s.g) <= 27);
  });
  void UP; void LEFT;
});

// ---- the pause screen, the saves ----------------------------------------------------------------------------
SCOPE.section([], 'the pause screen, the saves', () => {
  SCOPE.section([R.beat, R.lap], 'the map in Rio', () => {
    const s = newGame(WORLD, true);
    enterRoom(s.g, R.beat, 0x40, standY(18));
    const places = montyMap.places({ x: 0, y: 0, w: 200, h: 150 }, s.g, { rooms: { [R.beat]: kept(R.beat), [R.lap]: kept(R.lap) } });
    check('in Rio the map shows its region, the rooms he has been to are places to go', places.length === 2 && places.every((p) => p.x >= 0 && p.x < 200 && p.y >= 0 && p.y < 150));
  });
  const spots = [[R.arms, 1, 8], [R.colour, 2, 8], [R.lap, 4, 18], [R.steak, 2, 18], [R.beat, 2, 18], [R.float, 1, 18], [R.drum, 1, 8], [R.bust, 2, 18]] as const;
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
  // every frame: which beat Monty's pictures say he is in (sprite 3), the spoonfuls (the spoon reaching his mouth), the berries left, the troupe on
  type Beat = 'walk' | 'sit' | 'dance';
  const beats: Beat[] = [];
  let over = -1, mouths = 0, lastPtr = -1, troupeOn = -1, expanded = true, chairShown = false, sand = false;
  const berries: number[] = [];
  const sitting = new Set<number>([FP.sitDip, FP.sitUp, FP.sitMouth, FP.sitChew]);
  const dancing = new Set<number>([FP.danceLeft, FP.danceRight]);
  const spoon: number[] = [], spoons: number[] = [];
  for (let f = 0; f < 3000 && over < 0; f++) {
    frame(s, NONE);
    const v = s.g.vic, ptr = v.sprites[3]?.ptr ?? 0;
    if (s.g.gameOverActive) { over = f; break; }
    const shown = (n: number) => (v.enable & (1 << n)) !== 0;
    const beat: Beat | null = !shown(3) || !(v.expandX & 0x08) ? null : sitting.has(ptr) ? 'sit' : dancing.has(ptr) ? 'dance' : ptr >= FRAME.walkLeft && ptr < FRAME.walkLeft + 8 ? 'walk' : null;
    // (his dance has samba steps in his walk's pictures: once he dances, a step is part of it)
    if (beat && beats[beats.length - 1] !== beat && !(beat === 'walk' && beats.includes('dance'))) beats.push(beat);
    if (beat === 'sit' && ptr !== lastPtr) spoon.push(ptr);
    { const sp = shown(0) && (v.sprites[0]?.colour ?? 0) === 1 && beat === 'sit' ? v.sprites[0]?.ptr ?? 0 : 0; if (sp && spoons[spoons.length - 1] !== sp) spoons.push(sp); }
    if (beat === 'sit' && ptr === FP.sitMouth && lastPtr !== FP.sitMouth) mouths++;
    lastPtr = ptr;
    if (beat && !(v.expandY & 0x08)) expanded = false;
    // (until the last is eaten: then sprite 1 is a drummer's)
    if (beat === 'sit' && berries[berries.length - 1] !== 0) { const b = shown(1) ? v.sprites[1]?.ptr ?? 0 : 0; if (berries[berries.length - 1] !== b) berries.push(b); }
    if (shown(7) && v.sprites[7]?.ptr === FP.chair && (v.multicolour & 0x80) && (v.expandX & 0x80)) chairShown = true;
    if (troupeOn < 0 && [1, 4, 5, 6].every(shown) && [1, 4, 5, 6].every((n) => ((v.sprites[n]?.ptr ?? 0) & 0xf0) === 0x30)) troupeOn = beats.length;
    if (beat === 'sit' && !sand) {
      // (the close-up: the sand plain in one colour from under the sea's row to the picture's foot, nothing on it but the umbrella's pole: no black under him, Chris 2026-11-27 "he looks like he's floating")
      const row = (r: number) => Array.from({ length: 32 }, (_, c) => (r + 3) * 40 + c + 4);
      const sandChr = s.g.mem[0x800 + (row(18)[0] ?? 0)] ?? -1;
      sand = [13, 14, 15, 16, 17, 18, 19].every((r) => row(r).every((i) => (s.g.mem[0x800 + i] ?? 0) >= 0x9b || (s.g.col[i] === SAND_COLOUR && s.g.mem[0x800 + i] === sandChr)));
    }
  }
  check(`the picture cuts to the close-up: the sand plain, the palms, the table and the near sea gone (${sand}); the deckchair a striped multicolour sprite, expanded (${chairShown})`, sand && chairShown);
  check(`the beats in order, every one in his own expanded pictures (${beats.join(', ')}; expanded ${expanded}): he walks to the chair, sits, eats, and gets up to dance`, beats.join() === 'walk,sit,walk,dance' && expanded);
  const cycle = spoon.join(' ');
  const fp = (n: number) => n.toString(16);
  check(`he eats with the spoon: bowl, up, to his mouth, chewing, three times (${mouths} spoonfuls: ${spoon.map(fp).join(' ')})`, mouths === 3 && cycle.includes([FP.sitDip, FP.sitUp, FP.sitMouth, FP.sitChew].join(' ')));
  check(`the spoon is a white sprite of its own going bowl, up, mouth (${spoons.map(fp).join(' ')})`, spoons.join(' ').includes([FP.spoonDip, FP.spoonUp, FP.spoonMouth].join(' ')));
  check(`a berry goes with each spoonful (${berries.map(fp).join(' ')})`, berries.join() === [FP.berries3, FP.berries2, FP.berries1, 0].join());
  check(`the samba troupe (two dancers, two drummers) comes on once he has eaten, before he dances (at beat ${troupeOn})`, troupeOn >= 2 && troupeOn <= 3);
  check(`the finale runs by itself to GAME OVER (${over} frames), the game won`, over > 600 && over < 2000 && s.g.won);
});
SCOPE.report();
finish();
