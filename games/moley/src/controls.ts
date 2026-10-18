/**
 * Our controls for Moley Christmas, and the credits page's text for them. The original reads Z left, X right, O up, K down, SPACE jump, or a
 * Kempston or Sinclair joystick (input.ts); ours is the one every game here has: arrows or WASD, Space, Z or X to jump, a gamepad, the
 * touch stick and JUMP button (`Input.held`), made into the byte of a pass (`readKeys`, `Key`).
 */
import type { Stick } from 'c64kit';
import { readKeys } from './input';
import { Key } from './monty';

/**
 * The credits page's scrolling text with its key instructions rewritten to our keys (the page scrolls only characters the original's
 * texts print: capitals, most small letters, numerals and `! ' , - . /`, so what it says is worded with those). The rest is the original's.
 */
export const CREDITS_TEXT_OURS = 'Welcome Your Sinclair readers to the Monty  game given with the magazine........Follow the adventures of your favourite mole as he brought this to you........'
  + 'Keys are ARROWS or WASD to move, SPACE or Z or X to jump .....A gamepad or the touch controls work too.........Press JUMP to start........';

/** The byte of a pass (`Key` bits) from the stick as `Input` has it; `fire` is the jump as the game is to see it (a spent press left out). */
export function keyByte(held: Readonly<Stick>, fire: boolean): number {
  let keyboard = 0;
  if (held.right) keyboard |= Key.right;
  if (held.left) keyboard |= Key.left;
  if (held.down) keyboard |= Key.down;
  if (held.up) keyboard |= Key.up;
  if (fire) keyboard |= Key.jump;
  return readKeys({ keyboard, kempston: null, sinclair: 0 });
}
