/**
 * Sprite shapes: every image of the entity sprites (0-4: Monty and the room's four enemies) the
 * original's VIC draws, over random play in several rooms, must be one of the 256 frames of the
 * data, straight or mirrored (src/sprites.ts), or empty.
 *
 *   nice -n 15 node tools/test.mjs games/awm/test/sprites.ts games/awm/build/play.state
 */
import fs from 'node:fs';
import { C64Machine, unpackState } from 'c64kit';
import { SPRITE_FRAMES } from '../src/data';
import { FRAME_COUNT, SPRITE_BYTES, spriteImage } from '../src/sprites';

const [stateFile] = process.argv.slice(2);
if (!stateFile) throw new Error('usage: sprites.ts <play.state>');
const state = unpackState(new Uint8Array(fs.readFileSync(stateFile)));
const key = (d: ArrayLike<number>) => Array.from({ length: SPRITE_BYTES }, (_, i) => d[i]).join(',');
const known = new Map<string, string>();
for (let f = 0; f < FRAME_COUNT; f++) for (const mirrored of [false, true]) known.set(key(spriteImage(SPRITE_FRAMES, f, mirrored)), `${f}${mirrored ? 'm' : ''}`);

let seed = 7;
const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed >> 8; };
let seen = 0, matched = 0;
const frames = new Set<string>();
const unknown = new Map<string, number>();
for (const room of [72, 0, 5, 13, 24, 33, 47, 58, 66, 71]) {
  const m = new C64Machine();
  m.loadState(state);
  m.ram[0x402b] = room;
  const regs = { ...m.cpu };
  m.call(0x5581);
  Object.assign(m.cpu, regs);
  let j = 0;
  for (let f = 0; f < 400; f++) {
    if (f % 8 === 0) j = [0, 8, 4, 1, 9, 5, 16, 24, 20, 2][rnd() % 10];
    m.joy1 = m.joy2 = 0x1f & ~j;
    if (!m.runFrame()) throw new Error(`CPU stopped in room ${room} at frame ${f}`);
    if ((m.ram[0x4061] & 0x80) === 0) break; // game over: its routine ($3540) draws sprites of its own
    for (const s of m.capture.sprites) {
      if (s.n > 4 || s.data.every((b, i) => i >= SPRITE_BYTES || b === 0)) continue;
      seen++;
      const name = known.get(key(s.data));
      if (name !== undefined) { matched++; frames.add(name); } else unknown.set(`sprite ${s.n} in room ${room}`, (unknown.get(`sprite ${s.n} in room ${room}`) ?? 0) + 1);
    }
  }
}
console.log(`${matched} of ${seen} sprite images are frames of the data (${frames.size} different frames seen)`);
for (const [k, n] of unknown) console.log(`  not a frame: ${k} (${n} times)`);
if (matched !== seen) process.exit(1);
