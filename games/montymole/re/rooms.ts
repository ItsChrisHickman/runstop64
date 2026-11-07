/**
 * Writes src/data/rooms-data.ts: the 21 rooms taken out of the game's image (re/rooms-parse.ts says where they are).
 *
 *   nice -n 15 node tools/test.mjs games/montymole/re/image.ts games/montymole/build/montymole.tap games/montymole/build
 *   nice -n 15 node tools/test.mjs games/montymole/re/rooms.ts games/montymole/build/code.ram games/montymole/src/data/rooms-data.ts
 */
import fs from 'node:fs';
import type { RoomData } from '../src/room';
import { parseRooms } from './rooms-parse';

const [imageFile, outFile] = process.argv.slice(2);
if (!imageFile || !outFile) throw new Error('usage: rooms.ts <code.ram> <out rooms-data.ts>');

const list = (values: readonly number[]): string => `[${values.join(', ')}]`;
const hex = (v: number, width = 2): string => `0x${v.toString(16).padStart(width, '0')}`;
const hexList = (values: readonly number[]): string => `[${values.map((v) => hex(v)).join(', ')}]`;

function roomSource(room: RoomData): string {
  const lines: string[] = [];
  lines.push('  {');
  lines.push(`    id: ${room.id},`);
  lines.push('    map: [');
  for (const row of room.map) lines.push(`      '${row}',`);
  lines.push('    ],');
  lines.push('    tiles: [');
  for (const t of room.tiles) lines.push(`      { attr: ${hex(t.attr)}, rows: ${hexList(t.rows)} },`);
  lines.push('    ],');
  lines.push(`    classes: ${hexList(room.classes)},`);
  lines.push(`    spriteBase: ${hex(room.spriteBase, 4)},`);
  lines.push(`    exits: { up: ${room.exits.up}, down: ${room.exits.down}, left: ${room.exits.left}, right: ${room.exits.right} },`);
  lines.push(`    object: { x: ${room.object.x}, y: ${room.object.y}, sprite: ${room.object.sprite} },`);
  lines.push(`    crusher: ${list(room.crusher)},`);
  lines.push(`    nugget: ${hexList(room.nugget)},`);
  lines.push('    coal: [');
  for (const c of room.coal) lines.push(`      { id: ${c.id}, col: ${c.col}, row: ${c.row} },`);
  lines.push('    ],');
  lines.push('    enemies: [');
  for (const e of room.enemies) lines.push(`      ${hexList(e)},`);
  lines.push('    ],');
  lines.push(`    floor: ${list(room.floor)},`);
  lines.push('  },');
  return lines.join('\n');
}

const rooms = parseRooms(new Uint8Array(fs.readFileSync(imageFile)));
const header = `/**
 * The 21 rooms of Wanted: Monty Mole, taken out of the original's 64K image by games/montymole/re/rooms.ts
 * (do not edit by hand: make it again). The format is in re/rooms-parse.ts and re/README.md.
 */
import type { RoomData } from '../room';

`;
const body = `export const ROOMS: readonly RoomData[] = [\n${rooms.map(roomSource).join('\n')}\n];\n`;
fs.writeFileSync(outFile, header + body);
console.log(`${rooms.length} rooms -> ${outFile}`);
