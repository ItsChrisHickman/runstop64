/**
 * Jet Set Willy II's bed sparkle (ENHANCED hints, src/easy.ts `hintSpots`): nothing in the game says to jump on the bed in the
 * Masters Bedroom once 160 items are taken, so the hints put a sparkle on it from then on until the game's own end is under way.
 * The hints are an ENHANCED assist of the shared front end (ORIGINAL asks none: games/shared/native/play.ts), so ORIGINAL shows nothing.
 *
 *   nice -n 15 node tools/test.mjs games/jsw2/test/bed-hint.ts
 */
import { check, finish } from '../../shared/test/check';
import { hintSpots } from '../src/easy';
import { BEDROOM, NEED } from '../src/items';

const bcd = (n: number) => ((Math.floor(n / 10) % 10) << 4) | (n % 10);
/** A memory with Willy in `room` and `taken` items counted by the game ($8131 hundreds, $8132 the rest, BCD). */
function memory(room: number, taken: number): Uint8Array {
  const ram = new Uint8Array(0x10000);
  ram[0x13] = room;
  ram[0x8131] = bcd(Math.floor(taken / 100));
  ram[0x8132] = bcd(taken % 100);
  return ram;
}
const BED = { x: 32, y: 100 };

check('before all items (159) the bedroom has no sparkle', hintSpots(memory(BEDROOM, NEED - 1)).length === 0);
const on = hintSpots(memory(BEDROOM, NEED));
check(`with ${NEED} items taken, a sparkle on the bed (cells 2-5 of row 12): ${JSON.stringify(on)}`, on.length === 1 && on[0]?.x === BED.x && on[0]?.y === BED.y);
check('with more than 160 it stays', hintSpots(memory(BEDROOM, 178)).length === 1);
check('in another room, none', hintSpots(memory(33, NEED)).length === 0);
const under = memory(BEDROOM, NEED);
under[0x7ec4] = 0xff;
check('once the game\'s own end is under way, none', hintSpots(under).length === 0);
finish();
