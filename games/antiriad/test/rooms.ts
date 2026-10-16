/**
 * Every room, drawn by the port and by the original (its $852C on the 6502, in c64kit's C64
 * model), from the same moment: the screen, colour RAM, the room's character set and
 * character colours, the multicolour registers must be the same byte for byte. Then each goes
 * into the room the game's own way (leaving the room it's in, whose exit is made to lead there),
 * and two frames after the room is drawn the pictures (every pixel; without the sprites, and
 * with them) must be the same as the original's then, or a frame before or after (a room takes
 * the original as long to draw as it takes, the port as long to within a frame; its animated
 * characters step when its main loop gets round to them).
 *
 *   nice -n 15 node tools/test.mjs games/antiriad/test/rooms.ts games/antiriad/test/original.state [out-dir for PNGs of any that differ]
 */
import fs from 'node:fs';
import path from 'node:path';
import { C64Machine, unpackState } from 'c64kit';
import { renderPixels, renderPng } from '../../../tools/probe/render';
import { ROOMS } from '../src/data';
import { Game } from '../src/game';
import { drawRoom } from '../src/rooms';
import { roomName } from '../src/map';

const [stateFile, outDir] = process.argv.slice(2);
const load = () => { const m = new C64Machine(); m.loadState(unpackState(new Uint8Array(fs.readFileSync(stateFile)))); m.collisionsPerLine = true; return m; };
const REGIONS: [string, number, number][] = [['screen', 0x4000, 0x4280], ['room characters', 0x7800, 0x8000], ['character colours', 0x0561, 0x0661], ['multicolour', 0x4b, 0x4f]];

let sameMemory = 0, samePicture = 0, withSprites = 0;
const bad: string[] = [];
for (let room = 0; room < ROOMS; room++) {
  const o = load();
  const regs = { ...o.cpu };
  o.ram[0x5b] = room;
  o.cpu.p |= 4;
  o.call(0x852c);
  Object.assign(o.cpu, regs); // (as if it took no time: the frame goes on as it was)
  const g = new Game(load(), true);
  g.ram[0x5b] = room;
  drawRoom(g);
  const n = g.m;
  const diffs: string[] = [];
  for (const [name, a, b] of REGIONS) {
    let c = 0;
    for (let i = a; i < b; i++) if (o.ram[i] !== n.ram[i]) c++;
    if (c) diffs.push(`${name} (${c} bytes)`);
  }
  let c = 0;
  for (let i = 0; i < 0x280; i++) if (o.colour[i] !== n.colour[i]) c++;
  if (c) diffs.push(`colour RAM (${c})`);
  if (!diffs.length) sameMemory++;
  // the picture: each goes into the room its own way (the room to its right made this one, as the
  // hero leaves by the right), and is shown two frames after it's drawn
  const noSprites = (m: C64Machine) => { const keep = m.capture.sprites; m.capture.sprites = []; const px = renderPixels(m); m.capture.sprites = keep; return px; };
  const shown = (m: C64Machine, frame: () => void) => {
    const here = m.ram[0x5b];
    m.ram[0xf25a + here * 4] = room;
    m.ram[0x6b] = 0x80;
    for (let f = 0; f < 60 && m.ram[0x6b] & 0x80; f++) frame();
    const pics: Uint8Array[] = [], rooms: Uint8Array[] = [];
    for (let f = 0; f < 3; f++) { frame(); pics.push(renderPixels(m)); rooms.push(noSprites(m)); }
    return { pics, rooms };
  };
  const o2 = load(), g2 = new Game(load(), true);
  const A = shown(o2, () => o2.runFrame()), B = shown(g2.m, () => g2.tick());
  const differ = (x: Uint8Array, y: Uint8Array) => { let c = 0; for (let i = 0; i < x.length; i++) if (x[i] !== y[i]) c++; return c; };
  // two frames after it's drawn, the picture without sprites, and with them, the same as the original's
  // then or a frame either side (its animated characters step when its main loop gets to them)
  const px = Math.min(...A.rooms.map((r) => differ(r, B.rooms[1])));
  const sprites = Math.min(...A.pics.map((p) => differ(p, B.pics[1])));
  if (!sprites) withSprites++;
  if (!px) samePicture++;
  else {
    const rows = new Set<number>();
    for (let i = 0; i < A.rooms[1].length; i++) if (A.rooms[1][i] !== B.rooms[1][i]) rows.add(Math.floor(i / 320 / 8)); // (as two frames after)
    diffs.push(`${px} pixels (text rows ${[...rows].join(', ')})`);
    if (outDir) { fs.mkdirSync(outDir, { recursive: true }); renderPng(o2, path.join(outDir, `room-${room}-original.png`)); renderPng(g2.m, path.join(outDir, `room-${room}-port.png`)); }
  }
  if (diffs.length) bad.push(`room ${roomName(room)} ($${room.toString(16)}): ${diffs.join(', ')}`);
}
for (const b of bad) console.log(b);
console.log(`${ROOMS} rooms: memory the same in ${sameMemory}; the room's picture (no sprites) the same within a frame in ${samePicture}; with its sprites in ${withSprites}`);
process.exit(sameMemory < ROOMS ? 1 : 0);
