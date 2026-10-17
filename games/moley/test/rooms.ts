/**
 * How the rooms are stored, proved against the original: for each of the seven screens the game's own room-entry routine
 * ($854A) draws the room, and the picture it leaves in the screen memory (before any sprite) is compared, byte for byte,
 * with one made here from the data alone: the 32 x 18 tile map at $6000 + room * 576, the attribute table at $7080 + room * 576
 * (the ending, room 6, is a full 32 x 24 screen: its map, $6D80, runs on into the attribute table at $7080), and the 8-byte tiles of the character set at $D800 (the ending's
 * is at $F800): tile n is at base + (n - 1) * 8, tile 0 is empty, and tiles $F0 to $F3 (an item already picked up) are drawn
 * as $EC to $EF when the room is entered, as the items they are.
 *
 *   nice -n 15 node tools/test.mjs games/moley/test/rooms.ts [play.state]
 */
import fs from 'node:fs';
import { check, finish } from '../../../games/shared/test/check';
import { readRom } from '../../../tools/zx/boot';
import { rowAddress } from '../../../tools/zx/screen';
import { unpackState } from '../../../tools/zx/snapshot';
import { Spectrum } from '../../../tools/zx/spectrum';

const stateFile = process.argv[2] ?? 'games/moley/build/play.state';
const state = new Uint8Array(fs.readFileSync(stateFile));
const rom = readRom();

const MAP = 0x6000, ATTRS = 0x7080, ROOM_SIZE = 576, TILES = 0xd800, ENDING_TILES = 0xf800, ENTRY = 0x854a, MAIN_LOOP_HALT = 0x822b;

/** The picture of a room made from its data alone: 6144 bitmap bytes then the 768 attribute bytes. */
function decode(mem: Uint8Array, room: number): Uint8Array {
  const out = new Uint8Array(6144 + 768);
  const tiles = room === 6 ? ENDING_TILES : TILES;
  for (let row = 0; row < (room === 6 ? 24 : 18); row++) for (let col = 0; col < 32; col++) {
    let tile = mem[MAP + room * ROOM_SIZE + row * 32 + col];
    if (tile >= 0xf0 && tile <= 0xf3) tile -= 4;
    if (tile === 0) continue;
    for (let line = 0; line < 8; line++) out[rowAddress(row * 8 + line) - 0x4000 + col] = mem[tiles + (tile - 1) * 8 + line];
  }
  const attrBytes = room === 6 ? 768 : ROOM_SIZE;
  out.set(mem.subarray(ATTRS + room * ROOM_SIZE, ATTRS + room * ROOM_SIZE + attrBytes), 6144);
  return out;
}

for (let room = 0; room <= 6; room++) {
  const m = new Spectrum(rom);
  unpackState(m, state);
  const cpu = m.cpu;
  if (room === 6) m.mem.fill(0, 0x4000, 0x5b00); // (the game clears the screen first, $A2A8, before the ending)
  cpu.sp = (cpu.sp - 2) & 0xffff;
  m.mem[cpu.sp] = MAIN_LOOP_HALT & 255; m.mem[cpu.sp + 1] = MAIN_LOOP_HALT >> 8;
  cpu.regs[7] = room;
  cpu.pc = ENTRY;
  let shot: Uint8Array | null = null;
  m.onStep = (pc) => { if (pc === MAIN_LOOP_HALT && shot === null) shot = m.mem.slice(0x4000, 0x5b00); };
  for (let f = 0; f < 20 && shot === null; f++) m.runFrame();
  if (shot === null) { check(`room ${room} drawn`, false); continue; }
  const want = decode(m.mem, room);
  let badBitmap = 0, badAttr = 0;
  const diffRows = new Set<number>();
  for (let y = 0; y < 192; y++) for (let x = 0; x < 32; x++) {
    const i = rowAddress(y) - 0x4000 + x;
    if (y >= 144 && room !== 6) continue; // (the panel below the room is not part of it)
    if (shot[i] !== want[i]) { badBitmap++; diffRows.add(y); }
  }
  if (badBitmap) console.log(`   room ${room}: rows with differences: ${[...diffRows].join(' ')}`);
  for (let i = 0; i < 768; i++) {
    const row = i >> 5, col = i & 31;
    if (room !== 6 && row >= 18) continue; // (the panel below the room is not part of it)
    const tile = m.mem[MAP + room * ROOM_SIZE + row * 32 + col];
    const isItem = (tile >= 0xec && tile <= 0xf3) && room !== 6; // (an item's colour is random: the R register)
    if (!isItem && shot[6144 + i] !== want[6144 + i]) badAttr++;
  }
  check(`room ${room}: the picture the game draws is the one made from the data (bitmap ${badBitmap} bytes differ, attributes ${badAttr})`, badBitmap === 0 && badAttr === 0);
}

finish();
