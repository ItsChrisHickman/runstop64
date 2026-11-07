/**
 * How the rooms are stored, proved against the original. For each of the 21 rooms the game's own routines put the room
 * where the game keeps it ($94C3 copies the record to $C42A) and draw it ($FDD5: the tiles into the picture buffer at
 * $D260 and the attributes into the buffer at $CF54); that picture is compared byte for byte with one made here from the
 * data alone (src/room.ts, `drawRoom`, over src/data/rooms-data.ts). Also: the committed data is the data the tape
 * gives now (re/rooms-parse.ts), and the record the game copies is the record we parsed.
 *
 *   nice -n 15 node tools/test.mjs games/montymole/test/rooms.ts [out-dir]
 *
 * With an out-dir, a PNG of each room as the original draws it and as the data draws it is written there.
 */
import fs from 'node:fs';
import path from 'node:path';
import { check, finish } from '../../../games/shared/test/check';
import { screenPng } from '../../../tools/zx/screen';
import { ROOM_COUNT, ROOM_SIZE, ROOM_TABLE, parseRooms } from '../re/rooms-parse';
import { drawRoom, bitmapRow, ROOM_ROWS, ROOM_TOP_ROW } from '../src/room';
import { ROOMS } from '../src/data/rooms-data';
import { ADDR, CODE_IMAGE, call, machineFrom } from './original';

const outDir = process.argv[2];
if (outDir) fs.mkdirSync(outDir, { recursive: true });

const image = new Uint8Array(fs.readFileSync(CODE_IMAGE));
const parsed = parseRooms(image);
check(`the committed data is the data the tape gives (${ROOM_COUNT} rooms)`, JSON.stringify(parsed) === JSON.stringify(ROOMS));

for (let id = 0; id < ROOM_COUNT; id++) {
  const room = ROOMS[id];
  if (room === undefined) throw new Error(`no room ${id}`);
  const m = machineFrom();
  m.mem[ADDR.roomNumber] = id;
  call(m, ADDR.copyRoom, id);
  const record = image.subarray(ROOM_TABLE + id * ROOM_SIZE, ROOM_TABLE + (id + 1) * ROOM_SIZE);
  // (the game writes into its own table as it runs: an enemy's state byte, the first of its 20, changes; nothing else may)
  const copy = m.mem.slice(0xc42a, 0xc42a + ROOM_SIZE);
  const changed = Array.from(record, (v, i) => (copy[i] === v ? -1 : i)).filter((i) => i >= 0);
  check(`room ${id}: the game copied its 512-byte record to $C42A (${changed.length} bytes changed by play, all enemy state bytes)`, changed.every((i) => i >= 0x16c && i < 0x1e4 && (i - 0x16c) % 20 === 0), true);
  call(m, ADDR.drawRoom);

  const want = drawRoom(room);
  let badBitmap = 0;
  let badAttrs = 0;
  for (let y = ROOM_TOP_ROW * 8; y < (ROOM_TOP_ROW + ROOM_ROWS) * 8; y++) {
    for (let x = 0; x < 32; x++) if (m.mem[ADDR.picture + bitmapRow(y) + x] !== want.bitmap[bitmapRow(y) + x]) badBitmap++;
  }
  for (let i = ROOM_TOP_ROW * 32; i < (ROOM_TOP_ROW + ROOM_ROWS) * 32; i++) if (m.mem[ADDR.attrs + i] !== want.attrs[i]) badAttrs++;
  check(`room ${id}: the picture the game draws is the one made from the data (bitmap ${badBitmap} bytes differ, attributes ${badAttrs})`, badBitmap === 0 && badAttrs === 0);

  if (outDir) {
    const shot = (name: string, bitmap: (i: number) => number, attr: (i: number) => number) => {
      const mem = new Uint8Array(65536);
      for (let i = 0; i < 6144; i++) mem[0x4000 + i] = bitmap(i);
      for (let i = 0; i < 768; i++) mem[0x5800 + i] = attr(i);
      screenPng(path.join(outDir, name), mem, 0, false, 2, false);
    };
    const n = String(id).padStart(2, '0');
    shot(`room${n}-original.png`, (i) => m.mem[ADDR.picture + i], (i) => m.mem[ADDR.attrs + i]);
    shot(`room${n}-data.png`, (i) => want.bitmap[i] ?? 0, (i) => want.attrs[i] ?? 0);
  }
}

finish();
