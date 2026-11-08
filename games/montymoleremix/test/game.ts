/**
 * The remix's game headless (docs/montymole-remix-plan.md, stage 3): Wanted's rules over Monty on the Run's Monty. A new game; Monty's
 * speed and his jump (the shared Monty's: 38 pixels across, 20 up); the coal as coins, scored at Wanted's worth; the gates open at
 * their count wherever he is (the original's trap is gone); the creatures run Wanted's records at 25 passes a second, equal to the
 * faithful game's own pass by pass; the crusher kills, the floor grows and shrinks; every death is Monty on the Run's and puts him back at
 * the room's way in, none from a fall; five lives; the room graph; room 16's pit.
 *
 *   nice -n 15 node tools/test.mjs games/montymoleremix/test/game.ts
 */
import { COAL_FLAGS, imageAt, SPRITE_BYTES, SPRITE_BASE } from '../../montymole/src/data';
import { Enemy } from '../../montymole/src/enemy-rules';
import { OBJECT_FRAMES } from '../../montymole/src/object';
import { ROOMS } from '../../montymole/src/data/rooms-data';
import { Enemies } from '../../montymole/src/enemies';
import { Field } from '../../montymole/src/field';
import { GATES } from '../../montymole/src/gates';
import { Random } from '../../montymole/src/random';
import { ROOM_COLS } from '../../montymole/src/room';
import { check, finish } from '../../shared/test/check';
import { getProp } from '../../shared/guards';
import { must } from '../../shared/test/must';
import { cellRow } from '../src/coords';
import { COAL_CHAR, HOME_COL, HOME_ROW, RemixGame, START_LIVES, TOOL_PTR } from '../src/game';
import { lookOfSet, NAMED_KINDS } from '../src/kinds';
import { PLAY_COL, PLAY_ROW, ROW, SCREEN } from '../../shared/monty/screen';
import { retile, roleAt } from '../src/retile';
import { type Play, collisions, collisionsInView, newGame, NONE, place, settled, step } from './harness';

const R = { ...NONE, right: true };
const JUMP_RIGHT = { ...NONE, right: true, fire: true };

/** A game in a room with Monty at a cell, settled, graced (nothing kills him unless a test lets it). */
function inRoom(id: number, col: number, row: number): Play {
  const p = newGame();
  const at = place(col, row);
  p.g.enterAt(id, at.x2, at.y);
  return p;
}
const frames = (p: Play, n: number, stick = NONE) => { for (let i = 0; i < n; i++) step(p, stick); };
const montyX = (g: RemixGame) => g.x2 * 2 + g.stepGate;

// ---- a new game ----
{
  const p = newGame();
  const g = p.g;
  check(`a new game: room 0, ${START_LIVES} lives, no score, the room drawn`, g.roomId === 0 && g.lives === 5 && g.score === 0 && settled(g));
  check('the room graph starts at its own cell', g.mapRow === HOME_ROW && g.exitCol === HOME_COL);
  frames(p, 80);
  check('Monty has come to rest in room 0 (no fall death: he fell to the floor and lives)', g.falling === 0 && g.lives === 5 && !g.actionCounter);
}

/** A long flat floor with room above, found in the rooms: 10 cells of floor to the right, 3 rows of air over them. */
function findFlat(): { id: number; col: number; row: number } | null {
  for (const data of ROOMS) {
    const room = retile(data);
    const role = (c: number, r: number) => roleAt(room, c, r);
    const air = (c: number, r: number) => { const k = role(c, r); return k === null || k === 'decor'; };
    for (let r = 5; r < 18; r++) {
      for (let c = 1; c < 16; c++) {
        let ok = true;
        for (let k = 0; k < 10 && ok; k++) {
          const f = role(c + k, r + 2); if (f !== 'solid' && f !== 'platform') ok = false;
          for (let h = -3; h < 2 && ok; h++) if (!air(c + k, r + h)) ok = false;
        }
        if (ok) return { id: data.id, col: c, row: r };
      }
    }
  }
  return null;
}

// ---- Monty on the Run's Monty: his speed, his jump ----
{
  // a long flat floor with room above, found in the rooms: 10 cells of floor to the right, 3 rows of air over them
  const spot = must(findFlat(), 'a long flat floor');
  const p = inRoom(spot.id, spot.col, spot.row);
  const g = p.g;
  g.graceActive = () => true;
  frames(p, 30);
  const x0 = montyX(g);
  frames(p, 50, R);
  const walked = montyX(g) - x0;
  check(`he walks 1 pixel a frame, 50 a second (${walked} pixels in 50 frames)`, walked === 50 || walked === 49 || walked === 51);
  // the jump from a standstill
  frames(p, 20);
  const y0 = g.y, x1 = montyX(g);
  let top = y0, moved = 0;
  step(p, JUMP_RIGHT);
  for (let i = 0; i < 80; i++) { step(p, R); top = Math.min(top, g.y); if (g.montyAction === 0 && g.falling === 0 && i > 3) { moved = montyX(g) - x1; break; } }
  check(`the jump is Monty on the Run's: ${y0 - top} pixels up (20), ${moved} across with the stick held`, y0 - top === 20);
}

// ---- the coal is coins, at Wanted's worth ----
{
  const data = must(ROOMS[0], 'room 0');
  const piece = must(data.coal.find((k) => k.col !== 0 || k.row !== 0), 'a piece in room 0');
  const p = inRoom(0, piece.col, piece.row - 2);
  const g = p.g;
  g.graceActive = () => true;
  frames(p, 6);
  const worth = (COAL_FLAGS[piece.id] ?? 0) & 0x7f;
  check(`room 0's first piece taken: ${worth} points, one piece taken, the coin gone (score ${g.score}, taken ${g.coal.taken})`, g.score === worth && g.coal.taken === 1);
  g.enterAt(0, place(piece.col, piece.row - 2).x2, place(piece.col, piece.row - 2).y);
  check('the room again: a piece taken is not there', g.entities.every((e) => e.index !== piece.id));
}

// ---- the gates open at their count, wherever he is ----
{
  for (const [i, gate] of GATES.entries()) {
    const room = retile(must(ROOMS[gate.room], 'a gate room'));
    const top = cellRow(gate.y);
    const cellAt = (g: RemixGame, k: number) => g.cells[(top + k) * ROOM_COLS + gate.column] ?? 0;
    // the piece that makes the count is taken elsewhere (not in the gate's room)
    const p = newGame();
    const g = p.g;
    g.graceActive = () => true;
    for (let id = 0; id < gate.count - 1; id++) g.coal.take(id);
    g.enterAt(gate.room, place(2, 2).x2, place(2, 2).y);
    check(`gate ${i + 1} (room ${gate.room}): shut with ${gate.count - 1} pieces taken`, Array.from({ length: gate.cells }, (_, k) => cellAt(g, k)).every((c) => c !== 0) && room.slots.length > 0);
    g.enterAt(0, place(2, 2).x2, place(2, 2).y);
    g.coal.take(gate.count - 1); // the piece that counts, taken away from the gate
    g.enterAt(gate.room, place(2, 2).x2, place(2, 2).y);
    check(`gate ${i + 1}: open when he comes to it after the piece was taken elsewhere (no trap)`, Array.from({ length: gate.cells }, (_, k) => cellAt(g, k)).every((c) => c === 0));
    // and the count reached in the room opens it as he watches
    const q = newGame();
    q.g.graceActive = () => true;
    for (let id = 0; id < gate.count - 1; id++) q.g.coal.take(id);
    q.g.enterAt(gate.room, place(2, 2).x2, place(2, 2).y);
    q.g.coal.take(gate.count - 1);
    frames(q, 60);
    check(`gate ${i + 1}: opens in the room when the count is reached`, Array.from({ length: gate.cells }, (_, k) => (q.g.cells[(top + k) * ROOM_COLS + gate.column] ?? 0) === 0).every(Boolean));
  }
}

// ---- the creatures: Wanted's records, 25 passes a second, equal to the faithful game's own ----
{
  let differ = 0, passes = 0;
  for (const data of ROOMS) {
    const p = inRoom(data.id, 2, 2);
    const g = p.g;
    g.graceActive = () => true;
    const faithful = new Enemies();
    faithful.enter(data.enemies);
    const field = new Field();
    const random = new Random(0x2c5a);
    let seen = g.passes;
    // (the room's records are fresh when the room is loaded: compare from there)
    g.creatures.forEach((e) => e.fromBytes(e.toBytes()));
    for (let i = 0; i < 400; i++) {
      step(p, NONE);
      while (seen < g.passes) {
        seen++;
        passes++;
        faithful.pass(field, { x: 0, y: 0 }, random);
        const same = faithful.list.every((e, k) => e.toBytes().join() === g.creatures[k]?.toBytes().join());
        if (!same) differ++;
      }
    }
  }
  check(`the creatures of all 21 rooms equal the faithful game's own, pass by pass (${passes} passes, ${differ} differ)`, differ === 0 && passes > 0);
  const p = inRoom(1, 2, 2);
  const before = p.g.passes;
  frames(p, 100);
  check(`they pass 25 times a second (${p.g.passes - before} in 100 frames)`, p.g.passes - before === 50);
}

// ---- the retractable floor grows and shrinks ----
{
  const data = must(ROOMS[0], 'room 0');
  const p = inRoom(0, 2, 2);
  const g = p.g;
  g.graceActive = () => true;
  const row = cellRow(data.floor[1] ?? 0);
  const count = () => Array.from({ length: ROOM_COLS }, (_, c) => (g.cells[row * ROOM_COLS + c] ?? 0) === g.room.floorCode ? 1 : 0).reduce<number>((a, b) => a + b, 0);
  const seen: number[] = [];
  for (let i = 0; i < 120; i++) { step(p, NONE); seen.push(count()); }
  check(`room 0's floor grows and shrinks (most cells ${Math.max(...seen)}, fewest after that ${Math.min(...seen.slice(40))})`, Math.max(...seen) >= 6 && Math.min(...seen.slice(40)) <= 1);
}

// ---- deaths: his, by cause; a life; back where he came in; none from a fall ----
{
  for (const [what, event] of [['a creature', 2], ['the crusher', 4], ['the water', 5]] as const) {
    const p = inRoom(1, 2, 2);
    const g = p.g;
    const entry = { x2: g.entry.x2, y: g.entry.y };
    frames(p, 30);
    g.coal.take(5); // (a piece taken stays taken)
    g.actionCounter = event;
    let sawDissolve = false;
    for (let i = 0; i < 200 && !settled(g) || i < 3; i++) { step(p, NONE); if (g.sptr[3] === 0x9c) sawDissolve = true; }
    frames(p, 4);
    check(`${what}: his dissolve plays, a life is lost (${g.lives}), and he is back where he came into the room (x2 ${g.x2} y ${g.y}; in at ${entry.x2}, ${entry.y})`, sawDissolve && g.lives === 4 && Math.abs(g.x2 - entry.x2) <= 1 && g.coal.taken === 1);
  }
  const p = inRoom(1, 2, 2);
  const g = p.g;
  g.lives = 1;
  g.actionCounter = 2;
  for (let i = 0; i < 400 && g.finished === null; i++) step(p, NONE);
  check('the last life gone: game over', g.finished === 'gameover' && g.lives === 0);
  const q = inRoom(1, 2, 2);
  q.g.assist.lives = true;
  q.g.actionCounter = 2;
  frames(q, 200);
  check(`ENHANCED's unlimited lives: a death takes none (${q.g.lives})`, q.g.lives === START_LIVES);
  const f = inRoom(1, 14, 0);
  f.g.graceActive = () => true;
  frames(f, 300);
  check('a long fall is not a death (Monty on the Run has none)', f.g.lives === START_LIVES && !f.g.finished);
}

// ---- the crusher kills when it comes down on him ----
{
  const data = must(ROOMS[1], 'room 1');
  const column = data.crusher[0] ?? 0;
  const p = newGame();
  const g = p.g;
  g.enterAt(1, 0x1c + (column * 8 + 4) / 2, 0xf9 - 168);
  let dead = false;
  for (let i = 0; i < 200; i++) { step(p, NONE); if (g.actionCounter === 0x83 || g.lives < 5) dead = true; }
  check(`room 1's crusher (column ${column}) coming down on Monty kills him (lives ${g.lives})`, dead);
}

// ---- the room graph ----
{
  let ok = 0, total = 0;
  for (const data of ROOMS) {
    const g = new RemixGame();
    g.roomId = data.id;
    const to = (r: number, c: number) => g.roomAt(HOME_ROW + r, HOME_COL + c);
    const want = (n: number) => (n >= 21 ? 0xff : n);
    for (const [r, c, n] of [[-1, 0, data.exits.up], [1, 0, data.exits.down], [0, -1, data.exits.left], [0, 1, data.exits.right]] as const) { total++; if (to(r, c) === want(n)) ok++; }
  }
  check(`the graph is Wanted's: every exit of every room leads where the original's does (${ok} of ${total}; the scenes are closed until they are built)`, ok === total);
  const p = inRoom(1, 2, 2);
  p.g.graceActive = () => true;
  frames(p, 60);
  frames(p, 400, { ...NONE, left: true });
  check('walking off the left of room 1 comes back in room 1 from the right (it leads to itself)', p.g.roomId === 1);
  // room 16's pit lifts him into room 17
  const q = newGame();
  q.g.enterAt(16, 0x40, 0xda);
  check(`room 16: entering it low, the pit lifts him into room 17 (${q.g.roomId})`, q.g.roomId === 17);
}

// ---- Wanted's own coal, tools and creatures ----
{
  let coalOk = 0, coalRooms = 0, toolOk = 0, toolRooms = 0;
  for (const data of ROOMS) {
    const g = new RemixGame();
    g.roomId = data.id;
    g.loadRoom();
    const pieces = data.coal.filter((k) => k.col !== 0 || k.row !== 0);
    if (pieces.length > 0) {
      coalRooms++;
      const piece = must(pieces[0], 'a piece');
      const char = g.mem[SCREEN + (piece.row - 2 + PLAY_ROW) * ROW + PLAY_COL + piece.col];
      if (char === COAL_CHAR && data.nugget.every((b, k) => g.mem[COAL_CHAR * 8 + k] === b)) coalOk++;
    }
    if (data.object.sprite !== 0) {
      toolRooms++;
      const from = imageAt(OBJECT_FRAMES + SPRITE_BYTES * (data.object.sprite - 1));
      let same = true;
      for (let r = 0; r < 16; r++) if (g.mem[TOOL_PTR * 64 + r * 3] !== from[r * 2] || g.mem[TOOL_PTR * 64 + r * 3 + 1] !== from[r * 2 + 1]) same = false;
      if (same) toolOk++;
    }
  }
  check(`the coal is Wanted's own piece, the room's picture of it (${coalOk} of ${coalRooms} rooms)`, coalOk === coalRooms && coalRooms > 15);
  check(`each room's tool is Wanted's own picture of it, pixel for pixel (${toolOk} of ${toolRooms} rooms)`, toolOk === toolRooms && toolRooms >= 13);
  const kinds = new Set<number>();
  for (const data of ROOMS) for (const rec of data.enemies) { const e = new Enemy(); e.fromBytes(rec); for (const set of e.sets) if (lookOfSet(set) !== null) kinds.add(set); }
  const unnamed = [...kinds].filter((k) => !NAMED_KINDS.includes(k) && k >= SPRITE_BASE);
  check(`every kind of creature the rooms use is paired by hand (${kinds.size} kinds, ${unnamed.length} unpaired)`, unnamed.length === 0);
}

// ---- the sprite collisions the game reads are the VIC's ----
{
  let seed = 7, same = 0, total = 0, touching = 0;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
  for (const id of [0, 5, 9, 15, 19]) {
    const p = inRoom(id, 16, 8);
    p.g.graceActive = () => true;
    let stick = NONE;
    for (let i = 0; i < 500; i++) {
      if (i % 12 === 0) stick = { left: rnd() < 0.3, right: rnd() < 0.3, up: rnd() < 0.1, down: rnd() < 0.1, fire: rnd() < 0.2 };
      step(p, stick);
      const mine = collisions(p.g);
      total++;
      if (mine !== 0) touching++;
      if (mine === collisionsInView(p.g)) same++;
    }
  }
  check(`the sprite collisions the game reads (pixel against pixel, from the registers) are the renderer's (${same} of ${total} frames, ${touching} with a touch)`, same === total);
}

// ---- a copy of the game is the game (the bot searches ahead on copies) ----
{
  const dump = (v: unknown): string => JSON.stringify(v, (_k, x: unknown) => (x instanceof Uint8Array || x instanceof Int8Array || x instanceof Int16Array ? Array.from(x).join(',') : typeof x === 'function' ? undefined : x));
  const skip = new Set(['sound', 'onRoomLoaded', 'graceActive', 'script', 'assist']);
  let games = 0, wrong: string[] = [];
  let seed = 11;
  const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x80000000; };
  const other = inRoom(11, 10, 8);
  for (let i = 0; i < 90; i++) step(other, { ...NONE, left: i % 7 < 3, right: i % 7 >= 5, fire: i % 20 === 0 });
  for (const id of [0, 1, 5, 9, 15, 19]) {
    const p = inRoom(id, 16, 8);
    p.g.graceActive = () => true;
    let stick = NONE;
    for (let i = 0; i < 160; i++) {
      if (i % 10 === 0) stick = { left: rnd() < 0.3, right: rnd() < 0.3, up: rnd() < 0.2, down: rnd() < 0.2, fire: rnd() < 0.2 };
      step(p, stick);
    }
    const copy = new RemixGame();
    copy.copyFrom(other.g); // (a game that is copied into again: what it held before must not show)
    copy.copyFrom(p.g);
    games++;
    wrong = wrong.concat(Object.keys(p.g).filter((k) => !skip.has(k) && dump(getProp(p.g, k)) !== dump(getProp(copy, k))));
    // and the copy goes on as the game does
    const q = { g: copy, col: p.col };
    for (let i = 0; i < 60; i++) { step(p, stick); step(q, stick); }
    wrong = wrong.concat(Object.keys(p.g).filter((k) => !skip.has(k) && dump(getProp(p.g, k)) !== dump(getProp(copy, k))).map((k) => `${k} after`));
  }
  check(`a copy of the game is the game, every field, and goes on as it does (${games} games; differing: ${wrong.join(' ') || 'none'})`, wrong.length === 0);
}

finish();
