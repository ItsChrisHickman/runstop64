#!/usr/bin/env node
// Extracts the original C64 Starquake's data (rooms, big blocks, tile graphics,
// sprites, the status panel picture, the game's tables, the title picture and
// the music and sound effect players) from a snapshot of the running game.
//
// Usage: node tools/extract-starquake.mjs <title.state> [<loader.state>] [out-dir]
//
// The snapshots come from tools/probe booting the original disk image (see
// games/starquake/build/README.md). Only data is taken, by address; the port's
// code is its own (the music and sound effects are the exception: the
// original's own player code goes into a .sid, as with every runstop64 game).

import fs from 'node:fs';
import path from 'node:path';

const [, , titleState, loaderState, outDir = 'games/starquake'] = process.argv;
if (!titleState) {
  console.error('usage: node tools/extract-starquake.mjs <title.state> [<loader.state>] [out-dir]');
  process.exit(1);
}

/** A probe .state: u32 JSON length, JSON, then the 64K of RAM. */
function ramOf(file) {
  const b = fs.readFileSync(file);
  const n = b.readUInt32LE(0);
  return b.subarray(4 + n, 4 + n + 0x10000);
}
const ram = ramOf(titleState);
const hex = (a, b) => Buffer.from(ram.subarray(a, b)).toString('hex');

// ---- data, by address ---------------------------------------------------------------------
// Each segment is copied as is; the port reads its tables at their original
// addresses (src/data.ts), so a table found in the disassembly is one line here.
const SEGMENTS = [
  // Main loop and room drawing: teleport destinations, room colours, panel tiles, the map's edge columns.
  [0x1100, 0x1200],
  // Enemies: colours, graphics sets, timings.
  [0x1b72, 0x1c00],
  // Enemy graphics: 16×16 frames, 32 bytes each.
  [0x1c00, 0x21b0],
  // Sound effect requests (BLOB's steps, the background hum).
  [0x244e, 0x24e0],
  // Laser directions and colours.
  [0x275e, 0x2766],
  // The core's places on the screen (for its flicker).
  [0x2934, 0x2946],
  // Items: bit masks, screen rows, core pieces, item graphics and colours.
  [0x2ed0, 0x2fd0],
  // Panel: bar glyphs, bonus values.
  [0x33ab, 0x3400],
  // The text screens' words (intro, teleports, doors, Cheops, game over, heroes), and the panel's digits.
  [0x3adf, 0x3fa0],
  // BLOB: animation frames, keys, step sizes.
  [0x4972, 0x49f0],
  // Platforms, sparks, the panel's random seeds.
  [0x4eb3, 0x4f63],
  // Sprite graphics ($5000-$5BFF: sprite pointers $40-$6F).
  [0x5000, 0x5c00],
  // The status panel picture, run-length packed, and its decoder table.
  [0x80c2, 0x90a6],
  // Tile graphics (pointer table at $A000), items, BLOB, digits, font, sound effect table.
  [0xa000, 0xd000],
  // Rooms (512 × 4×3 big blocks), big blocks (2×2 tiles) and tile info.
  [0xe000, 0xfd00],
];
const segments = Object.fromEntries(SEGMENTS.map(([a, b]) => [a.toString(16).padStart(4, '0'), hex(a, b)]));

const data = { segments };

// The loading picture (Nick Strange, Stephen Crow, Bubble Bus): a hi-res bitmap shown while the game unpacks.
if (loaderState) {
  const l = ramOf(loaderState);
  data.titlePicture = {
    bitmap: Buffer.from(l.subarray(0x6000, 0x7f40)).toString('hex'),
    screen: Buffer.from(l.subarray(0x5c00, 0x5fe8)).toString('hex'),
  };
}

// ---- the music and sound effects: a .sid of the original's own players ------------------------
//
// Steve Crow's music player ($9100-$9F6A: five tunes) and the game's sound
// effect player (run from its raster interrupt, $21EE-$24DF, with its effects
// at $CDB3), copied together (the effect player moved up beside the music),
// with a little glue at $A000:
//   init: songs 1-5 are tunes 0-4 (the title's two take turns, as on the title
//         screen); song 6 is the game, where the effect player runs 4 times a frame.
//   play: the music's interrupt (entered as an interrupt), or the effect player's.
//   SFX_REQUEST (A = effect, X = voice): the game's $21B3; SFX_IF_FREE: $21B6; SFX_STOP: $21B9.
const SID_LOAD = 0x9100;
const GLUE = 0xa000;
const FX_FROM = 0x21ee, FX_TO = 0x24e0, FX_AT = 0xa100;
const FXDATA_FROM = 0xcdb3, FXDATA_TO = 0xd000, FXDATA_AT = FX_AT + (FX_TO - FX_FROM);
const image = new Uint8Array(0x10000);
image.set(ram.subarray(0x9100, 0x9f70), 0x9100);
image.set(ram.subarray(FX_FROM, FX_TO), FX_AT);
image.set(ram.subarray(FXDATA_FROM, FXDATA_TO), FXDATA_AT);
// Move the effect player: absolute operands into it (code $21EE-$244D), and its effect pointers ($24A3-).
const oneByte = new Set([0x00, 0x08, 0x0a, 0x18, 0x28, 0x2a, 0x38, 0x40, 0x48, 0x4a, 0x58, 0x60, 0x68, 0x6a, 0x78, 0x88, 0x8a, 0x98, 0x9a, 0xa8, 0xaa, 0xb8, 0xba, 0xc8, 0xca, 0xd8, 0xe8, 0xea, 0xf8]);
const opLength = (op) => (oneByte.has(op) ? 1 : (op & 0x0f) >= 0x0c || op === 0x20 || (op & 0x1f) === 0x19 ? 3 : 2);
for (let pc = FX_FROM; pc < 0x244e;) {
  const op = ram[pc], n = opLength(op);
  if (n === 3) {
    const a = ram[pc + 1] | (ram[pc + 2] << 8);
    if (a >= FX_FROM && a < FX_TO) {
      const b = a - FX_FROM + FX_AT, at = pc - FX_FROM + FX_AT;
      image[at + 1] = b & 0xff; image[at + 2] = b >> 8;
    }
  }
  pc += n;
}
for (let p = 0x24a3; p < 0x24db; p += 2) {
  const a = ram[p] | (ram[p + 1] << 8);
  if (a < FXDATA_FROM || a >= FXDATA_TO) continue;
  const b = a - FXDATA_FROM + FXDATA_AT, at = p - FX_FROM + FX_AT;
  image[at] = b & 0xff; image[at + 1] = b >> 8;
}
const fx = (addr) => addr - FX_FROM + FX_AT;
// The glue, hand-assembled.
const glue = [];
const here = () => GLUE + glue.length;
const lo = (a) => a & 0xff, hi = (a) => a >> 8;
const CUR = 0x9f7e, MODE = 0x9f7f; // the tune playing; 0 music, 1 effects
const labels = {}, fix = [];
const emit = (...b) => glue.push(...b);
const jsr = (a) => emit(0x20, lo(a), hi(a));
const ref = (op, name) => { emit(op); fix.push([glue.length, name]); emit(0, 0); };
// init
labels.init = here();
emit(0xc9, 0x05, 0xf0); fix.push([glue.length, 'fxinit', 'rel']); emit(0); // cmp #5 / beq fxinit
emit(0x8d, lo(CUR), hi(CUR), 0xa2, 0x00, 0x8e, lo(MODE), hi(MODE)); // sta cur / ldx #0 / stx mode
emit(0xa2, 0x18, 0x86, 0x17); // ldx #$18 / stx $17 (SID registers to clear)
ref(0x20, 'tune');
emit(0xa9, lo(4991), 0x8d, 0x04, 0xdc, 0xa9, hi(4991), 0x8d, 0x05, 0xdc, 0x60); // 3.94 calls a frame, like its raster interrupt
labels.fxinit = here();
emit(0xa9, 0x01, 0x8d, lo(MODE), hi(MODE));
emit(0xa9, 0x00, 0xa0, 0x18, 0x99, 0x00, 0xd4, 0x88, 0x10, 0xfa); // clear the SID
emit(0xa9, 0x0f, 0x8d, 0x18, 0xd4, 0xa9, 0x00, 0x85, 0x5f); // volume, interrupt counter
jsr(fx(0x21ee)); // all voices quiet
emit(0xa9, lo(4914), 0x8d, 0x04, 0xdc, 0xa9, hi(4914), 0x8d, 0x05, 0xdc, 0x60); // 4 calls a frame
// tune (A = tune): the music player's own setup ($9103-$9135, $9158-$9184), without its interrupt.
labels.tune = here();
emit(...ram.subarray(0x9103, 0x9136));
emit(0xa9, 0x01, 0x8d, 0xae, 0x94);
emit(...ram.subarray(0x9158, 0x9185));
emit(0x60);
// play
labels.play = here();
emit(0xad, lo(MODE), hi(MODE), 0xf0, 0x0d); // lda mode / beq music
emit(0xe6, 0x5f, 0xa5, 0x5f, 0x29, 0x03, 0x85, 0x5f, 0xaa); // the effect player's interrupt: inc $5f / and #3 / tax
jsr(fx(0x2242));
emit(0x60);
// music: a finished title tune hands over to the other one (as the title screen does)
emit(0xad, 0xae, 0x94, 0x10, 0x18); // lda $94AE / bpl running
emit(0xad, lo(CUR), hi(CUR), 0xc9, 0x00, 0xf0, 0x05, 0xc9, 0x03, 0xf0, 0x05, 0x60); // cmp #0 / beq to3 / cmp #3 / beq to0 / rts
emit(0xa9, 0x03, 0xd0, 0x02, 0xa9, 0x00); // to3: lda #3 / bne / to0: lda #0
emit(0x8d, lo(CUR), hi(CUR)); ref(0x4c, 'tune'); // sta cur / jmp tune
// running: enter the music's interrupt with an interrupt's stack (it ends with RTI)
const ret = here() + 13;
emit(0xa9, hi(ret), 0x48, 0xa9, lo(ret), 0x48, 0x08, 0x48, 0x48, 0x48, 0x4c, 0xda, 0x91);
emit(0x60);
for (const [at, name, kind] of fix) {
  const target = labels[name];
  if (kind === 'rel') glue[at] = (target - (GLUE + at + 1)) & 0xff;
  else { glue[at] = lo(target); glue[at + 1] = hi(target); }
}
image.set(glue, GLUE);
const SID_END = FXDATA_AT + (FXDATA_TO - FXDATA_FROM);
const header = Buffer.alloc(0x7c);
header.write('PSID', 0);
header.writeUInt16BE(2, 4); header.writeUInt16BE(0x7c, 6);
header.writeUInt16BE(SID_LOAD, 8); header.writeUInt16BE(labels.init, 0x0a); header.writeUInt16BE(labels.play, 0x0c);
header.writeUInt16BE(6, 0x0e); header.writeUInt16BE(1, 0x10);
header.writeUInt32BE(0x3f, 0x12); // CIA timing for all six songs
header.write('Starquake', 0x16, 'latin1'); header.write('Steve Crow', 0x36, 'latin1'); header.write('1985 Bubble Bus', 0x56, 'latin1');
header.writeUInt16BE(0x14, 0x76); // PAL
fs.mkdirSync(path.join(outDir, 'assets'), { recursive: true });
fs.writeFileSync(path.join(outDir, 'assets/starquake.sid'), Buffer.concat([header, Buffer.from(image.subarray(SID_LOAD, SID_END))]));
data.sound = {
  request: fx(0x220d), ifFree: fx(0x2219), stop: fx(0x21ee),
  /** Songs (1-based): the title's (it hands over to song 4), game over, the high score, the end, the intro; 6: the game's effects. */
  songs: { title: 1, game: 6, intro: 5, gameOver: 2, hiScore: 3, ending: 4 },
};
console.log(`wrote ${path.join(outDir, 'assets/starquake.sid')}: ${SID_END - SID_LOAD} bytes, init $${labels.init.toString(16)}, play $${labels.play.toString(16)}`);

fs.mkdirSync(path.join(outDir, 'src/data'), { recursive: true });
fs.writeFileSync(path.join(outDir, 'src/data/starquake.json'), JSON.stringify(data));
console.log(`wrote ${path.join(outDir, 'src/data/starquake.json')}: ${SEGMENTS.length} segments`);
