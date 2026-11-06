/**
 * Starquake's controls (games/starquake/src/controls.ts), headless: the joystick bits BLOB reads, and
 * which keys fire. GET and PAD (Z and X on a keyboard) are up and down but never fire in play; while letters
 * are typed they are letters and still count as fire.
 *
 *   node tools/test.mjs games/starquake/test/controls.ts
 */
import type { Stick } from 'c64kit';
import { fireHeld, GET_KEY, joyBits, PAD_KEY } from '../src/controls';
import { check, finish } from '../../shared/test/check';

const idle: Stick = { left: false, right: false, up: false, down: false, fire: false };
const keys = (...k: string[]) => new Set(k);

const BITS: [string, Stick, ReadonlySet<string>, boolean, boolean, number][] = [
  ['nothing held', idle, keys(), false, false, 0x7f],
  ['the stick up', { ...idle, up: true }, keys(), false, false, 0x7e],
  ['the stick down (PAD button)', { ...idle, down: true }, keys(), false, false, 0x7d],
  ['left and right', { ...idle, left: true, right: true }, keys(), false, false, 0x73],
  ['Z is up', idle, keys(GET_KEY), false, false, 0x7e],
  ['X is down', idle, keys(PAD_KEY), false, false, 0x7d],
  ['Z and X are letters while typing (fire still counts)', idle, keys(GET_KEY, PAD_KEY), true, true, 0x6f],
  ['the stick still counts while typing', { ...idle, up: true }, keys(), false, true, 0x7e],
];
for (const [what, held, down, fire, typing, want] of BITS) check(`joyBits: ${what} -> ${want.toString(16)}`, joyBits(held, down, fire, typing) === want);

const fire = { ...idle, fire: true };
const FIRES: [string, ReadonlySet<string>, boolean, boolean][] = [
  ['Z does not fire in play', keys(GET_KEY), false, false],
  ['X does not fire in play', keys(PAD_KEY), false, false],
  ['Space fires', keys('Space'), false, true],
  ['Ctrl fires, also with Z held', keys('ControlLeft', GET_KEY), false, true],
  ['the right Ctrl fires, also with X held', keys('ControlRight', PAD_KEY), false, true],
  ['the pad or the FIRE button fires', keys(), false, true],
  ['Z still counts as fire while letters are typed', keys(GET_KEY), true, true],
  ['X still counts as fire while letters are typed', keys(PAD_KEY), true, true],
];
for (const [what, down, typing, want] of FIRES) check(`fireHeld: ${what}`, fireHeld(fire, down, typing) === want);
check('fireHeld: not held is not fire', !fireHeld(idle, keys('Space'), false));

finish();
