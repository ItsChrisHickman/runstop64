/**
 * The 21 rooms taken out of the game's 64K image (re/image.ts makes code.ram from the tape): 512 bytes each from $9A2A.
 * Shared by the extractor (rooms.ts) and the tests that make the data again from the tape.
 *
 * Layout of a room record (offsets from its start; the game copies it to $C42A, so $C42A + offset is where the running
 * game keeps it):
 *   $000-$0EF  the map: 20 rows of 12 bytes; each 3 bytes are 8 cells of 3 bits (a tile number), most significant bit first
 *   $0F0-$0F3  four colour attributes the physics looks for ($C51A)
 *   $0F4-$0F5  Monty's frames base ($C51E)
 *   $0F6-$0F9  the rooms up, down, left, right ($C520-$C523)
 *   $0FA-$0FC  the object: x, y, sprite frame ($C524-$C526)
 *   $0FD-$102  the crusher ($C527)
 *   $103-$10C  unused (zero in every room)
 *   $10D-$114  the 8 rows of the piece to collect ($C537)
 *   $115-$123  five coal records of 3 bytes: id, column, row ($C53F)
 *   $124-$16B  eight tiles of 9 bytes: attribute, 8 rows ($C54E)
 *   $16C-$1E3  six enemy records of 20 bytes ($C596)
 *   $1E4-$1F7  unused (zero in every room)
 *   $1F8-$1FE  the retractable floor ($C622)
 *   $1FF       unused
 */
import type { Coal, RoomData, Tile } from '../src/room';

export const ROOM_COUNT = 21;
export const ROOM_TABLE = 0x9a2a;
export const ROOM_SIZE = 512;

function bytes(record: Uint8Array, from: number, to: number): number[] {
  return Array.from(record.subarray(from, to));
}

/** The map's 20 rows of 32 digits (tile numbers). */
function mapRows(record: Uint8Array): string[] {
  const rows: string[] = [];
  for (let r = 0; r < 20; r++) {
    let row = '';
    for (let g = 0; g < 4; g++) {
      const at = r * 12 + g * 3;
      const bits = (record[at] << 16) | (record[at + 1] << 8) | record[at + 2];
      for (let c = 0; c < 8; c++) row += String((bits >> (21 - 3 * c)) & 7);
    }
    rows.push(row);
  }
  return rows;
}

/** Room number `id` out of the image; throws on a byte in a place that is supposed to be unused (nothing is dropped silently). */
export function parseRoom(image: Uint8Array, id: number): RoomData {
  const at = ROOM_TABLE + id * ROOM_SIZE;
  const r = image.subarray(at, at + ROOM_SIZE);
  for (const [from, to] of [[0x103, 0x10d], [0x1e4, 0x1f8], [0x1ff, 0x200]] as const) {
    for (let i = from; i < to; i++) if (r[i] !== 0) throw new Error(`room ${id}: byte $${i.toString(16)} is $${r[i].toString(16)}, expected unused`);
  }
  const tiles: Tile[] = [];
  for (let t = 0; t < 8; t++) tiles.push({ attr: r[0x124 + t * 9], rows: bytes(r, 0x125 + t * 9, 0x12d + t * 9) });
  const coal: Coal[] = [];
  for (let k = 0; k < 5; k++) coal.push({ id: r[0x115 + k * 3], col: r[0x116 + k * 3], row: r[0x117 + k * 3] });
  const enemies: number[][] = [];
  for (let e = 0; e < 6; e++) enemies.push(bytes(r, 0x16c + e * 20, 0x180 + e * 20));
  return {
    id,
    map: mapRows(r),
    tiles,
    classes: bytes(r, 0xf0, 0xf4),
    spriteBase: r[0xf4] | (r[0xf5] << 8),
    exits: { up: r[0xf6], down: r[0xf7], left: r[0xf8], right: r[0xf9] },
    object: { x: r[0xfa], y: r[0xfb], sprite: r[0xfc] },
    crusher: bytes(r, 0xfd, 0x103),
    nugget: bytes(r, 0x10d, 0x115),
    coal,
    enemies,
    floor: bytes(r, 0x1f8, 0x1ff),
  };
}

export function parseRooms(image: Uint8Array): RoomData[] {
  if (image.length !== 65536) throw new Error('expected a 64K image');
  const rooms: RoomData[] = [];
  for (let id = 0; id < ROOM_COUNT; id++) rooms.push(parseRoom(image, id));
  return rooms;
}
