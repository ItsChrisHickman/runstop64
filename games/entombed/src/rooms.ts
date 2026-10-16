/**
 * Room code. Each of Entombed's chambers brings a $700-byte block of code and data
 * that the game swaps into $6000 ($6000 runs every frame, $6003 sets the room up);
 * the corridors' block is the one at $6000 to begin with. Each block is translated
 * on its own (src/gen/rooms, named after where it's stored in the game image), and
 * the native host recognises the loaded one by its code bytes.
 */
import type { OverlayVersion } from '../../shared/native/host';
import * as room_6000 from './gen/rooms/room-6000';
import * as room_c200 from './gen/rooms/room-c200';
import * as room_c440 from './gen/rooms/room-c440';
import * as room_c940 from './gen/rooms/room-c940';
import * as room_cb60 from './gen/rooms/room-cb60';
import * as room_cec0 from './gen/rooms/room-cec0';
import * as room_d0f0 from './gen/rooms/room-d0f0';
import * as room_d580 from './gen/rooms/room-d580';
import * as room_d850 from './gen/rooms/room-d850';
import * as room_daf0 from './gen/rooms/room-daf0';
import * as room_df30 from './gen/rooms/room-df30';
import * as room_e300 from './gen/rooms/room-e300';
import * as room_e6f0 from './gen/rooms/room-e6f0';
import * as room_ec70 from './gen/rooms/room-ec70';
import * as room_f090 from './gen/rooms/room-f090';
import * as room_f290 from './gen/rooms/room-f290';
import * as room_f5e0 from './gen/rooms/room-f5e0';
import * as room_f7a0 from './gen/rooms/room-f7a0';
import * as room_fa90 from './gen/rooms/room-fa90';

export const ROOMS: OverlayVersion[] = [
  { module: room_6000, code: room_6000.CODE },
  { module: room_c200, code: room_c200.CODE },
  { module: room_c440, code: room_c440.CODE },
  { module: room_c940, code: room_c940.CODE },
  { module: room_cb60, code: room_cb60.CODE },
  { module: room_cec0, code: room_cec0.CODE },
  { module: room_d0f0, code: room_d0f0.CODE },
  { module: room_d580, code: room_d580.CODE },
  { module: room_d850, code: room_d850.CODE },
  { module: room_daf0, code: room_daf0.CODE },
  { module: room_df30, code: room_df30.CODE },
  { module: room_e300, code: room_e300.CODE },
  { module: room_e6f0, code: room_e6f0.CODE },
  { module: room_ec70, code: room_ec70.CODE },
  { module: room_f090, code: room_f090.CODE },
  { module: room_f290, code: room_f290.CODE },
  { module: room_f5e0, code: room_f5e0.CODE },
  { module: room_f7a0, code: room_f7a0.CODE },
  { module: room_fa90, code: room_fa90.CODE },
];
