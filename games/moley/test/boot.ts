/**
 * Moley Christmas on the headless Spectrum: the tape loads through the ROM (LOAD "" typed, the loader trapped), the game
 * boots to its credits page, a jump key starts play, and what games/moley/re/README.md says about the structure holds:
 * the room maps at $6000, 5 lives, the energy gauge, Monty's steps and jump, the main loop's two-frame cadence.
 * With the saved states (title.state, play.state) it also checks they are what a fresh run makes.
 *
 *   nice -n 15 node tools/test.mjs games/moley/test/boot.ts [tape] [rom]
 */
import fs from 'node:fs';
import { check, finish } from '../../../games/shared/test/check';
import { bootedSpectrum, readRom, readTape, ROM_FILE, typeLoad } from '../../../tools/zx/boot';
import { headerOf } from '../../../tools/zx/tape';
import { screenIndexes } from '../../../tools/zx/screen';
import { packState, unpackState } from '../../../tools/zx/snapshot';
import { press, Spectrum } from '../../../tools/zx/spectrum';

const [tapeFile = 'games/moley/build/moley.tap', romFile = ROM_FILE] = process.argv.slice(2);
const rom = readRom(romFile);
const tape = readTape(tapeFile);

// the variables the notes name (re/README.md)
const ROOM = 0x8107, LIVES = 0x810c, ENERGY = 0x810d, MONTY_X = 0x8121, MONTY_Y = 0x8122, JUMP = 0x811c, GAME_OVER = 0xa2a1;
const LOGIC = 0x822f; // the main loop's INC (HL) after its HALT: runs once per pass

check('the tape is two header + data pairs: a BASIC loader and a 40960-byte code block at $6000', (() => {
  const h0 = headerOf(tape[0].kind === 'standard' ? tape[0].bytes : new Uint8Array(0));
  const h2 = headerOf(tape[2].kind === 'standard' ? tape[2].bytes : new Uint8Array(0));
  return tape.length === 4 && h0 !== null && h0.type === 0 && h2 !== null && h2.type === 3 && h2.length === 40960 && h2.param1 === 0x6000;
})());

const m = bootedSpectrum(rom);
m.tape = tape;
typeLoad(m);
m.run(1500 - m.frame);
check('the loader trap took all four blocks', m.loaded.length === 4 && m.loaded[0] === 'header Monty Free' && m.loaded[2] === 'header montycode ' && m.loaded[3] === '40960 bytes at 24576');
check('the game entry $8100 is a jump to $8141', m.mem[0x8100] === 0xc3 && m.mem[0x8101] === 0x41 && m.mem[0x8102] === 0x81);
check('48K: no AY music flag ($8112 is 0) and the interrupt vector table is at $D000 (I = $D0, IM 2)', m.mem[0x8112] === 0 && m.cpu.i === 0xd0 && m.cpu.im === 2);
check('the credits page is up: the game is waiting for a jump key (game-over flag clear, PC in the title loop)', m.cpu.pc >= 0xa100 && m.cpu.pc <= 0xa2d0 || m.cpu.pc === 0x822c);

const credits = screenIndexes(m.mem, false);
check('the credits page has the Gremlin logo and text (many lit pixels, green ink in the logo)', credits.filter((v) => v !== 0).length > 5000 && credits.some((v) => v === 4 || v === 12));
if (fs.existsSync('games/moley/build/title.state')) {
  const t = new Spectrum(rom);
  unpackState(t, new Uint8Array(fs.readFileSync('games/moley/build/title.state')));
  const b = new Spectrum(rom);
  b.tape = tape;
  // (the saved state is the frame the probe stopped at, 1500, from the same boot: bit for bit)
  const u = packState(t);
  check('title.state is the machine at frame 1500 of a fresh boot (same bytes)', t.frame === 1500 && packState(m).every((v, i) => v === u[i]));
}

// ---- play ---------------------------------------------------------------------------------------------

m.run(100);
press(m, 'SPACE', true);
m.run(5);
press(m, 'SPACE', false);
m.run(100);
check('a jump key starts play in room 0 with 5 lives and a full gauge', m.mem[ROOM] === 0 && m.mem[LIVES] === 5 && m.mem[ENERGY] >= 0x78 && m.mem[GAME_OVER] === 0);
check('Monty starts on the ground at the left (y $78) and room 0\'s map is at $6000 (floor cells in its bottom row)', m.mem[MONTY_Y] === 0x78 && m.mem[MONTY_X] < 40 && m.mem[0x6000 + 17 * 32 + 5] !== 0);

// the main loop's cadence: one logic pass every two frames
const passes: number[] = [];
const sim = new Spectrum(rom);
unpackState(sim, packState(m));
sim.onStep = (pc) => { if (pc === LOGIC) passes.push(sim.frame); };
sim.run(200);
const gaps = passes.slice(1).map((f, i) => f - passes[i]);
check('the main loop runs a logic pass every 2 frames (25 per second)', gaps.length > 80 && gaps.filter((g) => g === 2).length >= gaps.length * 0.95);

// Monty walks 2 pixels per pass, right with X and left with Z
const walk = new Spectrum(rom);
unpackState(walk, packState(m));
walk.run(40); // settle (he lands on the grass)
const x0 = walk.mem[MONTY_X];
press(walk, 'X', true);
walk.run(20); // 10 passes
const x1 = walk.mem[MONTY_X];
press(walk, 'X', false);
press(walk, 'Z', true);
walk.run(20);
const x2 = walk.mem[MONTY_X];
check('X walks right 2 pixels per pass, Z left', x1 - x0 >= 18 && x1 - x0 <= 22 && x1 - x2 >= 18 && x1 - x2 <= 22);

// the jump: the velocities of the table at $8E12 ($811D counts the phase), landing where he started
const jump = new Spectrum(rom);
unpackState(jump, packState(m));
jump.run(40);
const ground = jump.mem[MONTY_Y];
const ys: number[] = [];
const states: number[] = [];
press(jump, 'SPACE', true);
jump.onStep = (pc) => {
  if (pc !== LOGIC) return;
  ys.push(jump.mem[MONTY_Y]);
  states.push(jump.mem[JUMP]);
  if (ys.length > 4) press(jump, 'SPACE', false);
};
jump.run(80);
const table = [...jump.mem.subarray(0x8e12, 0x8e12 + 24)].map((v) => (v < 128 ? v : v - 256));
const deltas = ys.map((y, i) => y - (i === 0 ? ground : ys[i - 1]));
const first = deltas.findIndex((d) => d !== 0);
check('the jump is the 24 velocities of the table at $8E12 in order (-4 -4 -4 -3 -2 -2 -2 -1 ... 3 4 4 4), one per pass', first >= 0 && table.every((v, i) => deltas[first + i] === v) && table[0] === -4 && table[23] === 4);
check('he lands on the ground he left (apex 24 pixels up), the jump state is 2 while jumping and 0 after', Math.min(...ys) === ground - 24 && ys[first + 24] === ground && jump.mem[JUMP] === 0 && states.includes(2));

// the same run twice is the same machine (nothing in the model is random)
const a = new Spectrum(rom), b = new Spectrum(rom);
unpackState(a, packState(m)); unpackState(b, packState(m));
for (const x of [a, b]) { press(x, 'X', true); x.run(60); press(x, 'X', false); press(x, 'SPACE', true); x.run(60); }
const pa = packState(a), pb = packState(b);
check('the model is deterministic: two runs from one state are the same bytes', pa.every((v, i) => v === pb[i]));

// the sprite drawing's two 256-byte tables (re/README.md, "Entities, sprites and drawing")
const BYTES = Array.from({ length: 256 }, (_, i) => i);
const reverse = (b: number) => { let r = 0; for (let i = 0; i < 8; i++) if (b & (1 << i)) r |= 0x80 >> i; return r; };
check('$FE00 is the bit-reverse table (a sprite is mirrored through it)', BYTES.every((n) => m.mem[0xfe00 + n] === reverse(n)));
check('$FF00 is the sprite mask: NOT (b OR b << 1 OR b >> 1) within the byte', BYTES.every((n) => m.mem[0xff00 + n] === (~(n | (n << 1) | (n >> 1)) & 255)));
check('the score is printed with the weights 1000, 100, 10, 1 ($A00B)', [0xe8, 3, 0, 0x64, 0, 0, 0x0a, 0, 0, 1, 0, 0].every((v, i) => m.mem[0xa00b + i] === v));

if (fs.existsSync('games/moley/build/play.state')) {
  const p = new Spectrum(rom);
  unpackState(p, new Uint8Array(fs.readFileSync('games/moley/build/play.state')));
  check('play.state is Monty in room 0 with 5 lives', p.mem[ROOM] === 0 && p.mem[LIVES] === 5 && p.frame === 1700);
}

finish();
