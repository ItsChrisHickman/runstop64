/**
 * Room code. Like Entombed, each of Blackwyche's rooms brings a $700-byte block of
 * code and data that the game swaps into $6000 (its table of where each room's block
 * is stored is at $9D7A); the block at $6000 to begin with is the decks' own. Each
 * block is translated on its own (src/gen/rooms, named after where it's stored), and
 * the native host recognises the loaded one by its code bytes.
 */
import type { OverlayVersion } from '../../shared/native/host';
import * as room_6000 from './gen/rooms/room-6000';
import * as room_c000 from './gen/rooms/room-c000';
import * as room_c110 from './gen/rooms/room-c110';
import * as room_c4b0 from './gen/rooms/room-c4b0';
import * as room_c840 from './gen/rooms/room-c840';
import * as room_ca60 from './gen/rooms/room-ca60';
import * as room_cb00 from './gen/rooms/room-cb00';
import * as room_cc80 from './gen/rooms/room-cc80';
import * as room_ce20 from './gen/rooms/room-ce20';
import * as room_d080 from './gen/rooms/room-d080';
import * as room_d1b0 from './gen/rooms/room-d1b0';
import * as room_d4d0 from './gen/rooms/room-d4d0';
import * as room_d620 from './gen/rooms/room-d620';
import * as room_d7b0 from './gen/rooms/room-d7b0';
import * as room_db90 from './gen/rooms/room-db90';
import * as room_dd60 from './gen/rooms/room-dd60';
import * as room_deb0 from './gen/rooms/room-deb0';
import * as room_e0d0 from './gen/rooms/room-e0d0';
import * as room_e2c0 from './gen/rooms/room-e2c0';
import * as room_e570 from './gen/rooms/room-e570';
import * as room_e760 from './gen/rooms/room-e760';
import * as room_e9e0 from './gen/rooms/room-e9e0';
import * as room_ead0 from './gen/rooms/room-ead0';
import * as room_ebf0 from './gen/rooms/room-ebf0';
import * as room_ed70 from './gen/rooms/room-ed70';
import * as room_ef70 from './gen/rooms/room-ef70';
import * as room_f1d0 from './gen/rooms/room-f1d0';
import * as room_f370 from './gen/rooms/room-f370';
import * as room_f690 from './gen/rooms/room-f690';
import * as room_f890 from './gen/rooms/room-f890';
import * as room_fb20 from './gen/rooms/room-fb20';
import * as room_fe60 from './gen/rooms/room-fe60';

export const ROOMS: OverlayVersion[] = [
  { module: room_6000, code: room_6000.CODE },
  { module: room_c000, code: room_c000.CODE },
  { module: room_c110, code: room_c110.CODE },
  { module: room_c4b0, code: room_c4b0.CODE },
  { module: room_c840, code: room_c840.CODE },
  { module: room_ca60, code: room_ca60.CODE },
  { module: room_cb00, code: room_cb00.CODE },
  { module: room_cc80, code: room_cc80.CODE },
  { module: room_ce20, code: room_ce20.CODE },
  { module: room_d080, code: room_d080.CODE },
  { module: room_d1b0, code: room_d1b0.CODE },
  { module: room_d4d0, code: room_d4d0.CODE },
  { module: room_d620, code: room_d620.CODE },
  { module: room_d7b0, code: room_d7b0.CODE },
  { module: room_db90, code: room_db90.CODE },
  { module: room_dd60, code: room_dd60.CODE },
  { module: room_deb0, code: room_deb0.CODE },
  { module: room_e0d0, code: room_e0d0.CODE },
  { module: room_e2c0, code: room_e2c0.CODE },
  { module: room_e570, code: room_e570.CODE },
  { module: room_e760, code: room_e760.CODE },
  { module: room_e9e0, code: room_e9e0.CODE },
  { module: room_ead0, code: room_ead0.CODE },
  { module: room_ebf0, code: room_ebf0.CODE },
  { module: room_ed70, code: room_ed70.CODE },
  { module: room_ef70, code: room_ef70.CODE },
  { module: room_f1d0, code: room_f1d0.CODE },
  { module: room_f370, code: room_f370.CODE },
  { module: room_f690, code: room_f690.CODE },
  { module: room_f890, code: room_f890.CODE },
  { module: room_fb20, code: room_fb20.CODE },
  { module: room_fe60, code: room_fe60.CODE },
];
