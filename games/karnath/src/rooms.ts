/**
 * Room code. The Staff of Karnath runs each room's code from one of three slots ($6000,
 * $C000 or $C800, by the room's type), and swaps whole sets of them in and out: the
 * castle's two halves ($D800 <-> $6000, $E100 <-> $C000) and the blocks at $F100 and
 * $F900. Each version is translated on its own (named after where it's stored in the
 * game image), and the native host recognises the loaded one by its code bytes.
 */
import type { OverlayVersion } from '../../shared/native/host';
import * as castle_6000 from './gen/rooms/castle-6000';
import * as castle_c000 from './gen/rooms/castle-c000';
import * as castle_d800 from './gen/rooms/castle-d800';
import * as castle_e100 from './gen/rooms/castle-e100';
import * as castle_f100 from './gen/rooms/castle-f100';
import * as castle_f900 from './gen/rooms/castle-f900';

const version = (m: { CODE: OverlayVersion['code'] }) => ({ module: m, code: m.CODE });
export const LOW_SLOT: OverlayVersion[] = [version(castle_6000), version(castle_d800), version(castle_f100), version(castle_f900)];
export const HIGH_SLOTS: OverlayVersion[] = [version(castle_c000), version(castle_e100)];
