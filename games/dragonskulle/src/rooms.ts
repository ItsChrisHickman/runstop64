/**
 * Room code. Like Blackwyche, each of Dragonskulle's places brings a block of code and data
 * that the game swaps into $6000 ($1137: the table at $9C02 gives where each place's block is
 * stored, $9C2C how many pages it is); the block at $6000 to begin with is the one places 3
 * and 4 use, and place 0 swaps only its first page (from $FF00). Each block is translated on
 * its own (src/gen/rooms, named after where it's stored), and the native host recognises the
 * loaded one by its code bytes.
 */
import type { OverlayVersion } from '../../shared/native/host';
import * as room_6000 from './gen/rooms/room-6000';
import * as room_ff00 from './gen/rooms/room-ff00';
import * as room_c000 from './gen/rooms/room-c000';
import * as room_c400 from './gen/rooms/room-c400';
import * as room_cd50 from './gen/rooms/room-cd50';
import * as room_d870 from './gen/rooms/room-d870';
import * as room_e010 from './gen/rooms/room-e010';
import * as room_e460 from './gen/rooms/room-e460';
import * as room_e900 from './gen/rooms/room-e900';
import * as room_ef20 from './gen/rooms/room-ef20';
import * as room_f220 from './gen/rooms/room-f220';
import * as room_f470 from './gen/rooms/room-f470';
import * as room_f6e0 from './gen/rooms/room-f6e0';

export const ROOMS: OverlayVersion[] = [
  room_6000, room_ff00, room_c000, room_c400, room_cd50, room_d870, room_e010,
  room_e460, room_e900, room_ef20, room_f220, room_f470, room_f6e0,
].map((module) => ({ module, code: module.CODE }));
