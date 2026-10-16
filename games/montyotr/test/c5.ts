/**
 * The C5 street ("DRIVE SIR CLIVE(S C5": rooms $24, $25, $31, $32, $33), headless through
 * Monty's front end (c64kit stood in by games/shared/test/kit.ts):
 *
 *  1. Travel. Driven through the whole section for real: 13 arrivals over three passes
 *     (stage 0 left along the top road, the drop in $33, stage 1 right along the middle road,
 *     the drop in $24, stage 2 left along the bottom road, out through $33 into $26). At each
 *     arrival: the room is offered on the map (with every C5 room reached so far), travel
 *     away to the first room (on foot there: no C5, no ramp, he walks) and back lands as the
 *     drive did (Monty, the C5's stage, speed, direction and a jump under way, the ramp, the
 *     exit grid), and driving on from there reaches the next room. Out of the section: room
 *     $33's cell is off the grid, the street and the rooms before it are still on the map's
 *     places, and travel on foot among the rooms west of it works.
 *  2. ENHANCED (the default): a crash in each C5 room (the game's event 7; one a real crash
 *     into a hole) starts Monty again in that room where he came in, the C5 stopped (test/c5respawn.ts),
 *     a life gone; back to room start brings it in as it came, and he drives on.
 *  3. ORIGINAL: a real crash goes back to the tree in $24 (the section's start), a life gone;
 *     the rooms reached stay on the map, and travel takes him back to one to retry it. Back to
 *     room start, the autosave and CONTINUE? in a C5 room bring the C5 back as it came in.
 *  4. After the street (on to $29, Das Boat), travel back across it: every room visited is
 *     offered; travel to $20 puts the street back as before the drive (room $33's cell, the C5
 *     as it starts; the autosave and back to room start too), and walking left from there the
 *     whole drive works again and leads out as before; travel back to $29, to the first room and
 *     to a jetpack room ($1D), and into $33 to drive out again: each with the street as a
 *     normal arrival there has it (the grid, the C5's state).
 *
 * The drive's presses of fire (frames from each arrival) were found by a search over the
 * port (each one where a hop gets furthest, backtracking when stuck). They hold when the
 * arrival is the same, frame parity included (the game moves some things on odd frames
 * only), so each arrival here is matched to the drive's parity first.
 *
 *   nice -n 15 node tools/test.mjs games/montyotr/test/c5.ts
 */
import { Input, PixelRenderer } from 'c64kit';
import { MAP_BOX } from '../../shared/native/pause';
import type { Game } from '../src/game';
import { run } from '../src/main';
import { c5Arrive } from '../src/mechanisms';
import { montyMap } from '../src/map';
import { CODEC } from '../src/save';
import { fromBase64, readSaves } from '../../shared/saves';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';

/** Each arrival of the drive: its room, its stage, the frame parity it came in on, the frames to the next one and fire's presses in them. */
const DRIVE = [
  { room: 0x24, stage: 0, toggle: 1, len: 67, fires: [] },
  { room: 0x25, stage: 0, toggle: 0, len: 64, fires: [55] },
  { room: 0x31, stage: 0, toggle: 0, len: 64, fires: [37] },
  { room: 0x32, stage: 0, toggle: 0, len: 64, fires: [13] },
  { room: 0x33, stage: 0, toggle: 0, len: 292, fires: [105, 135, 165, 195, 233, 263] },
  { room: 0x32, stage: 1, toggle: 0, len: 63, fires: [1, 31] },
  { room: 0x31, stage: 1, toggle: 1, len: 63, fires: [4] },
  { room: 0x25, stage: 1, toggle: 0, len: 63, fires: [5, 35] },
  { room: 0x24, stage: 1, toggle: 1, len: 179, fires: [138] },
  { room: 0x25, stage: 2, toggle: 0, len: 64, fires: [51] },
  { room: 0x31, stage: 2, toggle: 0, len: 64, fires: [17, 61] },
  { room: 0x32, stage: 2, toggle: 0, len: 64, fires: [] },
  { room: 0x33, stage: 2, toggle: 0, len: 64, fires: [] },
];
const OUT = 0x26;
const C5_ROOMS = [0x24, 0x25, 0x31, 0x32, 0x33];
const hex = (n: number) => n.toString(16);

// a browser's storage, in memory (cleared for each game below)
const store = useMemoryStorage();

let failures = 0;
const check = (what: string, ok: boolean) => { console.log(`${ok ? 'ok  ' : 'FAIL'} ${what}`); if (!ok) failures++; };

/** What a C5 room's arrival is: Monty, the C5, the ramp sprite, the exit grid. */
function arrival(g: Game) {
  return {
    room: g.roomId, x2: g.x2, y: g.y, mapRow: g.mapRow, exitCol: g.exitCol,
    active: g.c5.active, fallStage: g.c5.fallStage, speed: g.c5.speed, dir: g.c5.dir, bounce: g.c5.bounce, fall: g.c5.fall, rate: g.c5.rate,
    // (the ramp: sprite 1, in rooms $24 and $33; elsewhere it's put out of sight at y 0)
    expandX: g.expandX, ramp: g.sy[1] ? [g.sx[1], g.sy[1], g.sptr[1]] : [], grid: g.exitGrid.join(','),
  };
}
type Arrival = ReturnType<typeof arrival>;
/** An arrival as ENHANCED's restart after a crash brings it back (mechanisms.ts c5Restart): stopped, on the road. */
const restarted = (a: Arrival): Arrival => ({ ...a, speed: 0, bounce: 0, y: [0x7a, 0xa2, 0xca][a.fallStage] });
const same = (a: Arrival, b: Arrival) => JSON.stringify(a) === JSON.stringify(b);
const show = (a: Arrival) => `${hex(a.room)} x2 ${hex(a.x2)} y ${hex(a.y)} stage ${a.fallStage} speed ${a.speed} dir ${hex(a.dir)} hop ${a.bounce} ramp ${a.ramp.map(hex)}`;

/** A new game in a fresh front end, ENHANCED as kept (or as asked). */
function boot(enhanced: boolean) {
  store.clear();
  store.set('montyotr.assist', JSON.stringify({ enhanced }));
  const input = new Input(nowhere);
  const p = run({ renderer: new PixelRenderer(), input, canvas: nowhere });
  const g = p.game;
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
  const tap = (code: string) => { input.keyDown(code); tick(2); input.keyUp(code); tick(2); };
  const until = (cond: () => boolean, max: number) => { let n = 0; while (!cond() && n++ < max) tick(); return cond(); };
  tick(400);
  tap('Space');
  tick(20);
  const first = g.roomId;
  g.lives = 9;
  g.drawHudData();
  const found = () => p.state.found;
  const places = () => montyMap.places?.(MAP_BOX, g, found()) ?? [];
  /** In a room, the transition done (a dissolve or a death's sequence included). */
  const settled = (room: number) => g.roomId === room && !g.freeze && !g.script;

  /** Into the section the game's own way: as a C5 crash sends him there (DeathByC5, then the respawn). */
  function intoSection() {
    until(() => g.frameToggle === 0, 2);
    g.mapRow = 2; g.exitCol = 8; g.x2 = 0x9b; g.freeze = 1; g.roomExit = 1;
    tick();
    return settled(0x24);
  }

  /** Travel by the map (taps on a touch screen: pick the room, tap it again). */
  function travel(room: number) {
    input.touch = true;
    tap('KeyP');
    const place = places().find((q) => q.id === String(room));
    if (place) {
      input.point(place.x, place.y); tick(2);
      input.point(place.x, place.y); tick(1);
    }
    input.touch = false;
    if (p.state.paused) tap('KeyP');
    return !!place && until(() => settled(room), 300);
  }

  /**
   * Drive on from an arrival as the drive did (left, or right on stage 1; fire where it hopped).
   * Returns the room he comes into, or 'crash' (a life gone) and the frame.
   */
  function drive(i: number, opts: { hop?: boolean; frames?: number } = {}) {
    const d = DRIVE[i];
    const from = g.roomId, lives = g.lives;
    for (let t = 1; t <= (opts.frames ?? d.len + 30); t++) {
      const right = g.c5.fallStage === 1;
      const fire = (opts.hop ?? true) && d.fires.includes(t);
      // (the keys held this frame: the touch layer's, let go of and pressed again)
      input.releaseVirtual();
      input.keyDown(right ? 'ArrowRight' : 'ArrowLeft');
      if (fire) input.keyDown('Space');
      tick();
      if (g.lives < lives || g.actionCounter === 0x86) { input.releaseVirtual(); return { to: 'crash' as const, t, room: g.roomId }; }
      if (g.roomId !== from && !g.freeze) { input.releaseVirtual(); return { to: g.roomId, t, room: g.roomId }; }
    }
    input.releaseVirtual();
    return { to: g.roomId, t: -1, room: g.roomId };
  }

  /**
   * Comes in (travel, a crash, back to room start), again if need be, until on the drive's
   * frame parity: the second time a frame earlier or later, from how long the first took.
   */
  function again(i: number, come: () => boolean) {
    let wait = 0;
    for (let k = 0; k < 2; k++) {
      const before = g.frameToggle;
      tick(wait);
      if (!come()) return false;
      if (g.frameToggle === DRIVE[i].toggle) return true;
      const took = (g.frameToggle ^ before ^ wait) & 1;
      wait = (DRIVE[i].toggle ^ g.frameToggle ^ took) & 1;
    }
    return false;
  }

  /** A key pressed for one frame (no more: the next frames would move the C5). */
  function press(code: string) {
    input.keyDown(code); tick(); input.keyUp(code);
    return true;
  }

  /** Back to room start, from the pause screen. */
  function roomStart(room: number) {
    tap('KeyP');
    return p.state.paused && press('KeyB') && until(() => settled(room) && !p.state.paused, 100);
  }

  /** The room's save (the autosave), unpacked. */
  function save() {
    const slot = readSaves('montyotr').current;
    return slot ? CODEC.unpack(fromBase64(slot.data)) : null;
  }

  return { p, g, input, tick, tap, until, first, found, places, settled, intoSection, travel, drive, again, press, roomStart, save };
}
type Harness = ReturnType<typeof boot>;

/** Rooms noted for travel: Monty's entry, and for a C5 room the C5's as it came in. */
function noted(h: Harness, room: number) {
  const rooms = h.found().rooms;
  if (typeof rooms !== 'object' || rooms === null || !(String(room) in rooms)) return null;
  const e: unknown = Object.entries(rooms).find(([id]) => id === String(room))?.[1];
  return Array.isArray(e) && e.every((v) => typeof v === 'number') ? e : null;
}

// ---- 1. travel to every C5 arrival, and on from there -------------------------------------
{
  console.log('-- travel (ENHANCED, the default)');
  const h = boot(true);
  const { g } = h;
  const into = h.intoSection();
  check(`into the section the game's way (as after a crash): room 24, by the tree (x2 ${hex(g.x2)}, y ${hex(g.y)})`, into && g.x2 === 0x8f && g.y === 0x7a);
  check('the first room (on foot) is noted for travel', noted(h, h.first)?.length === 4);
  let ok = true;
  for (let i = 0; i < DRIVE.length; i++) {
    const d = DRIVE[i];
    const driven = arrival(g);
    const right = driven.room === d.room && driven.fallStage === d.stage && g.frameToggle === d.toggle;
    const e = noted(h, d.room);
    const offered = h.places().filter((q) => !q.here).map((q) => Number(q.id));
    const reached = DRIVE.slice(0, i).map((x) => x.room).filter((r) => r !== d.room);
    check(`arrival ${i + 1}, driven: ${show(driven)}; noted with its stage; the C5 rooms reached before offered (${[...new Set(reached)].map(hex)})`,
      right && e?.length === 8 && e[4] === d.stage && reached.every((r) => offered.includes(r)) && h.places().some((q) => q.here && Number(q.id) === d.room));
    // away to the first room, on foot, and back
    const back = h.again(i, () => {
      if (!h.travel(h.first)) return false;
      const foot = g.c5.active === 0 && g.expandX === 0 && g.c5.fallStage === 0 && g.c5.speed === 0;
      const x = g.x2;
      h.input.keyDown('ArrowLeft'); h.tick(12); h.input.keyUp('ArrowLeft');
      if (!foot || g.x2 === x) { check(`  on foot in the first room (no C5: active ${g.c5.active}, expandX ${g.expandX}; walks: x2 ${hex(x)} -> ${hex(g.x2)})`, false); return false; }
      return h.travel(d.room);
    });
    const travelled = arrival(g);
    check(`  travel away (on foot there, walking) and back: as driven (${show(travelled)})`, back && same(driven, travelled));
    if (!back || !same(driven, travelled)) { ok = false; break; }
    const next = h.drive(i);
    const want = DRIVE[i + 1]?.room ?? OUT;
    check(`  drives on from there into room ${hex(want)} (${next.to === 'crash' ? `crashed in ${hex(next.room)} at frame ${next.t}` : `room ${hex(next.room)}, frame ${next.t} of ${d.len}`})`, next.to === want);
    if (next.to !== want) { ok = false; break; }
  }
  if (ok) {
    const out = h.places().map((q) => Number(q.id));
    check(`out through room 33 into 26 on foot: no C5 (active ${g.c5.active}, expandX ${g.expandX}), room 33's cell off the grid`, g.roomId === OUT && g.c5.active === 0 && g.expandX === 0 && g.roomAt(2, 4) === 0xff);
    check(`the street and the rooms before it are still on the map's places (${out.map(hex)})`,
      [h.first, ...C5_ROOMS].every((r) => out.includes(r)) && noted(h, OUT)?.length === 4);
    // on into $27 the game's way (room 26's exit left: x2 $9B, a column left), and travel back
    g.exitCol--; g.x2 = 0x9b; g.freeze = 1; g.roomExit = 1;
    h.tick();
    const in27 = h.settled(0x27);
    const in26 = h.travel(OUT);
    const x = g.x2;
    h.input.keyDown('ArrowLeft'); h.tick(12); h.input.keyUp('ArrowLeft');
    check(`travel among the rooms west of the street still works: room 27 back to 26, on foot, walking (x2 ${hex(x)} -> ${hex(g.x2)}), the grid as he left it`,
      in27 && in26 && g.c5.active === 0 && g.x2 !== x && g.roomAt(2, 4) === 0xff);
  }
}

// ---- 2. ENHANCED: a crash in each C5 room comes back in that room -------------------------------
{
  console.log('-- ENHANCED: a crash starts the room again');
  const h = boot(true);
  const { g } = h;
  check('ENHANCED: the C5 retry on', g.assist.c5 === true && h.intoSection());
  for (let i = 0; i < DRIVE.length; i++) {
    const d = DRIVE[i];
    const driven = arrival(g);
    if (i === 2) {
      // a real crash: no hop at the hole (cols 6-7 of the top road)
      const lives = g.lives;
      const crash = h.drive(i, { hop: false });
      h.until(() => h.settled(d.room) && g.lives < lives, 200);
      check(`  room 31 (stage 0), driven into the hole: crashed (${crash.to}, frame ${crash.t}); back in 31 where he came in, stopped, a life gone (${lives} -> ${g.lives})`,
        crash.to === 'crash' && crash.room === 0x31 && g.lives === lives - 1 && same(restarted(driven), arrival(g)));
    }
    g.lives = 9; // (plenty: a crash or two in each room)
    const lives = g.lives;
    const back = h.again(i, () => {
      h.drive(i, { frames: 10 });
      g.actionCounter = 7; // (the C5's crash, event 7: a hole or an enemy)
      return h.until(() => h.settled(d.room) && g.actionCounter === 0, 200) && g.roomId === d.room;
    });
    const after = arrival(g);
    check(`crash in room ${hex(d.room)} (stage ${d.stage}): back in it where he came in, the C5 stopped (${show(after)}; came in ${show(driven)}), lives ${lives} -> ${g.lives}`, (back || h.settled(d.room)) && same(restarted(driven), after) && g.lives < lives);
    // (on as the drive went: the C5 brought into the room again as it came, the game's own way in; test/c5respawn.ts drives on from the stop)
    h.again(i, () => {
      g.x2 = driven.x2; g.y = driven.y;
      c5Arrive(g, { fallStage: driven.fallStage, speed: driven.speed, dir: driven.dir, bounce: driven.bounce });
      g.freeze = 1; g.roomExit = 1;
      h.tick();
      return h.until(() => h.settled(d.room), 50);
    });
    const next = h.drive(i);
    const want = DRIVE[i + 1]?.room ?? OUT;
    check(`  and drives on into room ${hex(want)}`, next.to === want);
    if (next.to !== want) break;
  }
}

// ---- 3. ORIGINAL: back to the tree; the map, room start, the autosave, continue ---------------
{
  console.log('-- ORIGINAL: a crash goes back to the tree');
  const h = boot(false);
  const { g, p } = h;
  check('ORIGINAL: the C5 retry off', g.assist.c5 === false && h.intoSection());
  const atTree = arrival(g);
  for (let i = 0; i < 5; i++) {
    const next = h.drive(i);
    if (next.to !== DRIVE[i + 1].room) { check(`driving to arrival ${i + 2} (${next.to === 'crash' ? `crashed in ${hex(next.room)} at frame ${next.t}` : `room ${hex(next.room)}, frame ${next.t}`})`, false); break; }
  }
  const in32 = arrival(g);
  check(`a save in a C5 room: room 32, the C5 as it came in (stage ${in32.fallStage}, speed ${in32.speed}, dir ${hex(in32.dir)}, hop ${in32.bounce})`,
    (() => { const s = h.save(); return !!s && s.roomId === 0x32 && s.c5?.fallStage === 1 && s.c5.speed === in32.speed && s.c5.dir === in32.dir && s.c5.bounce === in32.bounce; })());
  const lives = g.lives;
  const crash = h.drive(5, { hop: false });
  h.until(() => h.settled(0x24) && g.lives < lives, 200);
  const tree = arrival(g);
  check(`room 32 (stage 1), driven into the hole: crashed (frame ${crash.t}); back by the tree in room 24 (${show(tree)}), a life gone (${lives} -> ${g.lives})`,
    crash.to === 'crash' && crash.room === 0x32 && g.lives === lives - 1 && same(atTree, tree));
  const offered = h.places().map((q) => Number(q.id));
  check(`the C5 rooms reached are still on the map (${offered.map(hex)}), room 32 as the C5 came in on stage 1`, [0x25, 0x31, 0x32, 0x33].every((r) => offered.includes(r)) && noted(h, 0x32)?.[4] === 1);
  const there = h.again(5, () => h.travel(0x32));
  check(`travel from the tree to room 32: as driven on stage 1 (${show(arrival(g))})`, there && same(in32, arrival(g)));
  const on = h.drive(5);
  check('  and drives on into room 31', on.to === 0x31);
  // back to room start in room 31
  const in31 = arrival(g);
  h.drive(6, { frames: 20 });
  const b = h.again(6, () => h.roomStart(0x31));
  check(`back to room start in room 31: as he came in (${show(arrival(g))})`, b && same(in31, arrival(g)));
  const on2 = h.drive(6);
  check('  and drives on into room 25', on2.to === 0x25);
  // game over in room 25, CONTINUE?: back in room 25 as he came in
  const in25 = arrival(g);
  h.drive(7, { frames: 10 });
  g.lives = 1;
  g.actionCounter = 7;
  h.until(() => p.state.mode === 'title', 3000);
  h.until(() => p.state.prompt === 'continue', 1200);
  const cont = h.again(7, () => {
    if (p.state.mode === 'title') return h.press('Enter') && h.until(() => h.settled(0x25), 60);
    return h.roomStart(0x25);
  });
  check(`game over in room 25, CONTINUE?: back in 25 as he came in (${show(arrival(g))}), five lives`, cont && same(in25, arrival(g)) && g.lives === 5);
  const on3 = h.drive(7);
  check('  and drives on into room 24', on3.to === 0x24);
}

// ---- 4. after the street: travel back across it, and the street driven again ------------------
// In the original, driving out through room $33 takes its cell off the exit grid, and nothing
// leads back east from the rooms west of the street: the street and the rooms before it ($20 and
// the jetpack rooms, the start) can't be reached again. Travel goes back to them with the street
// as the game has it before the drive (the cell back, the C5 as it starts), so the way left from
// $20 starts a new drive that leads out as the first did (without the cell, its way out of $32
// headed for nothing and the game failed loading it); and to a room after the street with it as
// the drive leaves it (the cell off, the C5 on the bottom road).
{
  console.log('-- after the street: travel back across it');
  const h = boot(true);
  const { g } = h;
  /** The street's state as a room has it (C5_START's or C5_OUT's: the drive's own speed and hop aren't compared after it). */
  const street = (after: boolean) => ({
    cell: g.roomAt(2, 4), grid: g.exitGrid.join(','), active: g.c5.active, fallStage: g.c5.fallStage, dir: g.c5.dir,
    ...(after ? {} : { speed: g.c5.speed, bounce: g.c5.bounce }),
  });
  const atFirst = street(false);
  /** Into a room the game's way (an exit or a teleporter pointed at it), on its frame parity. */
  function enter(cell: { mapRow: number; exitCol: number; x2: number; y: number }, room: number, dissolve = 0) {
    h.until(() => g.frameToggle === 0, 2);
    Object.assign(g, cell);
    g.dissolvePending = dissolve; g.freeze = 1; g.roomExit = 1;
    h.tick();
    return h.until(() => h.settled(room), 300);
  }
  // a jetpack room ($1D, walking in from $1C), then $20 (the street's approach) from below: up out of $1F
  const in1d = enter({ mapRow: 5, exitCol: 9, x2: 0x9b, y: 0xb2 }, 0x1d);
  check(`into room 1d (a jetpack room) walking in from 1c, the jetpack on (${g.showJetpack})`, in1d && g.showJetpack === 1 && noted(h, 0x1d)?.length === 4);
  const at1d = street(false);
  const in20 = enter({ mapRow: 2, exitCol: 9, x2: 0x40, y: 0xda }, 0x20);
  const at20 = street(false);
  check(`into room 20 from below, the jetpack on (${g.showJetpack}); the street as it starts (room 33's cell ${hex(at20.cell)}, stage ${at20.fallStage})`,
    in20 && g.showJetpack === 1 && noted(h, 0x20)?.length === 4 && at20.cell === 0x33 && sameStreet(at20, atFirst));
  /** The street driven from $20's way left (into $24 by the tree), out through $33 into $26. */
  function driveStreet() {
    let ok = h.intoSection(), to = '24';
    for (let i = 0; ok && i < DRIVE.length; i++) {
      const next = h.drive(i);
      ok = next.to === (DRIVE[i + 1]?.room ?? OUT);
      if (!ok) to = `${next.to === 'crash' ? 'a crash' : `room ${hex(next.to)}`}, driving from ${hex(DRIVE[i].room)} (stage ${DRIVE[i].stage})`;
    }
    return { ok: ok && h.settled(OUT), to: ok ? hex(g.roomId) : to };
  }
  const first = driveStreet();
  const at26 = street(true);
  check(`the street driven, out into room 26 (${first.to}; room 33's cell off the grid: ${hex(at26.cell)}, stage ${at26.fallStage})`, first.ok && at26.cell === 0xff && at26.fallStage === 2);
  // on into $29 (Das Boat) the game's way: as the teleporter in $2A brings him
  const in29 = enter({ mapRow: 3, exitCol: 3, x2: 0x17, y: 0xa2 }, 0x29, 1);
  const at29 = street(true);
  check(`into room 29 (Das Boat), as $2A's teleporter brings him: the street as the drive left it`, in29 && sameStreet(at29, at26));
  const offered = h.places().map((q) => Number(q.id));
  check(`every room visited is offered now (${offered.map(hex)}): 20, 1d, the first room and the street too`,
    [0x20, 0x1d, h.first, ...C5_ROOMS, OUT].every((r) => offered.includes(r)) && !offered.includes(0x30));
  // to $20, and back to its start: the street as before the drive (the autosave and room start too)
  const to20 = h.travel(0x20);
  const s20 = h.save();
  check(`travel to room 20: there, the street as on coming into it before the drive (room 33's cell ${hex(g.roomAt(2, 4))}, stage ${g.c5.fallStage}, on foot), the autosave too`,
    to20 && g.showJetpack === 1 && g.c5.active === 0 && sameStreet(street(false), at20) && !!s20 && s20.roomId === 0x20 && s20.exitGrid.join(',') === at20.grid && s20.c5?.fallStage === 0);
  const back20 = h.roomStart(0x20);
  check(`  back to room start in room 20: as he came in (room 33's cell ${hex(g.roomAt(2, 4))})`, back20 && sameStreet(street(false), at20));
  // the street driven again from there, the game's way in: the whole drive, out as before
  const again = driveStreet();
  check(`  walks left into the street, and the whole drive works again, out into room 26 as before (${again.to})`, again.ok && sameStreet(street(true), at26));
  // and back to $29
  const to29 = h.travel(0x29);
  const s29 = h.save();
  check(`travel back to room 29: as on coming into it after the drive (room 33's cell ${hex(g.roomAt(2, 4))}, stage ${g.c5.fallStage}), the autosave too`,
    to29 && sameStreet(street(true), at29) && !!s29 && s29.exitGrid.join(',') === at29.grid && s29.c5?.fallStage === 2);
  // to the first room and a jetpack room, from after the street
  const toFirst = h.travel(h.first);
  const x = g.x2;
  h.input.keyDown('ArrowLeft'); h.tick(12); h.input.keyUp('ArrowLeft');
  check(`travel from 29 to the first room: as at the start (room 33's cell ${hex(g.roomAt(2, 4))}, stage ${g.c5.fallStage}), on foot, walking (x2 ${hex(x)} -> ${hex(g.x2)})`,
    toFirst && sameStreet(street(false), atFirst) && g.c5.active === 0 && g.x2 !== x);
  h.travel(0x29);
  const to1d = h.travel(0x1d);
  check(`travel from 29 to room 1d: the jetpack on (${g.showJetpack}), the street as before the drive`, to1d && g.showJetpack === 1 && sameStreet(street(false), at1d));
  // into the street itself from after it: the C5 as it came in furthest along, the street as before the drive, and out again
  h.travel(0x29);
  const in33 = h.again(12, () => h.travel(0x33));
  check(`travel from 29 to room 33: the C5 as it came in on stage 2 (${show(arrival(g))}), room 33's cell on the grid`, in33 && g.c5.active === 1 && g.c5.fallStage === 2 && g.roomAt(2, 4) === 0x33);
  const out = h.drive(12);
  check(`  drives out into room 26 as before (${out.to === 'crash' ? `crashed at frame ${out.t}` : `room ${hex(out.to)}`})`, out.to === OUT && sameStreet(street(true), at26));
}

/** Two street states the same. */
function sameStreet(a: object, b: object) { return JSON.stringify(a) === JSON.stringify(b); }

console.log(failures ? `${failures} FAILED` : 'all passed');
process.exit(failures ? 1 : 0);
