/**
 * What the research says about the rules, tried on the original (re/README.md): where the game is cheap to steer by poking
 * (the room, Monty's place, the lives) and then run with its own interrupt on.
 *
 *   - every one of the 64 coal pieces, with Monty put on its cell, scores the low 7 bits of its flag byte (`$964D + id`: leftovers of
 *     the programmer's assembler source) and the flag's bit 7 goes
 *   - a death takes one life and puts Monty back at the room's arrival place; the last life ends in game over ($F817)
 *   - leaving by an edge goes to the room the exit table says, arriving at the far side; room 20's right edge is the ending ($F858)
 *   - the main loop's cell classes: a "deadly" attribute under Monty kills him
 *
 *   nice -n 15 node tools/test.mjs games/montymole/test/mechanics.ts
 */
import fs from 'node:fs';
import { check, finish } from '../../../games/shared/test/check';
import type { Spectrum } from '../../../tools/zx/spectrum';
import { ROOMS } from '../src/data/rooms-data';
import { CODE_IMAGE, PLAY_STATE, machineFrom } from './original';

const image = new Uint8Array(fs.readFileSync(CODE_IMAGE));
const A = {
  room: 0x9649, lives: 0x964a, arrival: 0x964b, monty: 0x5c7b, score: 0x9217, flags: 0x964d, loop: 0x940c, death: 0x946e,
  gameOver: 0xf817, ending: 0xf858,
} as const;

/** The score as a number (five digits, units first). */
function score(m: Spectrum): number {
  let n = 0;
  for (let i = 4; i >= 0; i--) n = n * 10 + m.mem[A.score + i];
  return n;
}

/** The original in play: a new game's state with the coal available, put into `room` with Monty at x, y, and started at the room loop. */
function inRoom(room: number, x: number, y: number, lives = 3): Spectrum {
  const m = machineFrom(PLAY_STATE);
  m.cpu.iff1 = true;
  m.cpu.iff2 = true;
  m.cpu.halted = false;
  for (let i = 0; i < 64; i++) m.mem[A.flags + i] |= 0x80;
  m.mem[A.room] = room;
  m.mem[A.lives] = lives;
  m.mem[A.monty] = x;
  m.mem[A.monty + 1] = y;
  m.mem[A.arrival] = x;
  m.mem[A.arrival + 1] = y;
  m.cpu.pc = A.loop;
  return m;
}

/** Run frames until `until` says so (at most `limit`), checking after each; returns the frames used or -1. */
function runUntil(m: Spectrum, limit: number, until: (m: Spectrum) => boolean): number {
  for (let f = 0; f < limit; f++) {
    m.runFrame();
    if (until(m)) return f + 1;
  }
  return -1;
}

// ---- coal
let scored = 0, tried = 0;
const seen = new Set<number>();
for (const room of ROOMS) {
  for (const c of room.coal) {
    if (c.col === 0 && c.row === 0) continue;
    // a cell (column, screen row): his foot corner at x = 8 col, y = 8 (23 - row): the cell is where `$9258` looks
    const x = c.col * 8, y = 8 * (23 - c.row);
    const m = inRoom(room.id, x, y);
    const want = image[A.flags + c.id] & 0x7f;
    const before = score(m);
    const frames = runUntil(m, 90, (mm) => score(mm) !== before);
    m.run(4); // (the points are added a step at a time, the pass spanning frames)
    tried++;
    seen.add(c.id);
    const got = frames < 0 ? -1 : score(m) - before;
    const cleared = (m.mem[A.flags + c.id] & 0x80) === 0;
    if (got === want && cleared) scored++;
    else check(`coal ${c.id} (room ${room.id}, column ${c.col}, row ${c.row}) scores ${want}: got ${got}, flag ${m.mem[A.flags + c.id].toString(16)}, frames ${frames}`, false);
  }
}
check(`coal: ${scored} of ${tried} pieces scored their flag byte's low 7 bits and cleared the flag (ids seen: ${seen.size})`, scored === tried);
check('there are 64 coal ids, 0 to 63, each in exactly one room', seen.size === 64 && [...seen].every((id) => id >= 0 && id < 64));

// ---- death and game over
{
  const room = ROOMS[1];
  if (room === undefined) throw new Error('no room 1');
  const m = inRoom(1, 0x60, 0x40);
  m.run(3);
  m.mem[A.monty] = 0x60; m.mem[A.monty + 1] = 0x40;
  m.cpu.pc = A.death;
  m.cpu.halted = false;
  const first = runUntil(m, 400, (mm) => mm.mem[A.lives] === 2);
  check('a death takes one life (3 to 2)', first >= 0);
}
{
  const m = inRoom(1, 0x60, 0x40, 1);
  m.run(3);
  let reached = false;
  m.onStep = (pc) => { if (pc === A.gameOver) reached = true; };
  m.cpu.pc = A.death;
  m.cpu.halted = false;
  runUntil(m, 600, () => reached);
  check('the last life lost goes to game over ($F817)', reached);
}

// ---- edges
{
  const cases: { room: number; edge: 'right' | 'left' | 'down' | 'up' }[] = [
    { room: 7, edge: 'right' }, { room: 8, edge: 'left' }, { room: 2, edge: 'up' }, { room: 4, edge: 'up' }, { room: 11, edge: 'up' }, { room: 16, edge: 'right' },
    { room: 18, edge: 'left' }, { room: 19, edge: 'up' }, { room: 6, edge: 'down' },
  ];
  for (const c of cases) {
    const room = ROOMS[c.room];
    if (room === undefined) throw new Error(`no room ${c.room}`);
    const target = room.exits[c.edge];
    const xy = c.edge === 'right' ? [0xf0, 0x60] : c.edge === 'left' ? [0, 0x60] : c.edge === 'down' ? [0x60, 0x20] : [0x60, 0xaf];
    const m = inRoom(c.room, xy[0] ?? 0, xy[1] ?? 0);
    const frames = runUntil(m, 90, (mm) => mm.mem[A.room] !== c.room);
    check(`room ${c.room}, ${c.edge} edge: the game moves to room ${target} (${frames >= 0 ? m.mem[A.room] : 'stayed'})`, frames >= 0 && m.mem[A.room] === target);
  }
  // room 16 has a scene of its own: below y $41 Monty is lifted into the castle, room 17 at x $C0, y $A1 (the exit table's "down" is not used)
  const lift = inRoom(16, 0x60, 0x20);
  const took = runUntil(lift, 900, (mm) => mm.mem[A.room] === 17);
  check(`room 16, below y $41: the scene lifts Monty into room 17 (${took} frames), at x $C0, y $A1`, took >= 0 && lift.mem[A.monty] === 0xc0 && lift.mem[A.monty + 1] === 0xa1);
  const m = inRoom(20, 0xf0, 0x60);
  let ending = false;
  m.onStep = (pc) => { if (pc === A.ending) ending = true; };
  runUntil(m, 90, () => ending);
  check('room 20, right edge: the game goes to the ending ($F858)', ending);
}

finish();
