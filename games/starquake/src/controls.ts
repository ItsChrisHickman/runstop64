import type { Stick } from 'c64kit';
import type { TouchLayout } from '../../shared/touch';

/**
 * Starquake's controls. The game reads one joystick: up picks up what BLOB stands at (and climbs
 * lift tubes and the hover pad), down builds a hover platform under him (and lowers the pad he rides).
 * Touch has the stick for them and, on the right beside FIRE, a GET and a PAD button: GET presses Z (its own key: the letter-picking
 * screens take it as the stick's up, `NAME.up`) and PAD the down arrow. The keyboard has Z and X for the same two (so they don't fire
 * here: Space and Ctrl do); they mean nothing while letters are typed. In ORIGINAL Z is the game's up, as it was. In ENHANCED Z is GET
 * alone (`getOwn`): it picks up on foot and on the hover pad, where up still rises (items.ts `touch`).
 */
export const GET_KEY = 'KeyZ';
export const PAD_KEY = 'KeyX';
const FIRE_KEYS = ['Space', 'ControlLeft', 'ControlRight'];

/** Fire held: the input's fire, except where it is only Z or X (GET and PAD here; still fire while letters are typed). */
export function fireHeld(held: Stick, down: ReadonlySet<string>, typing: boolean): boolean {
  if (typing || FIRE_KEYS.some((k) => down.has(k))) return held.fire;
  return held.fire && !down.has(GET_KEY) && !down.has(PAD_KEY);
}

export const TOUCH: TouchLayout = {
  stick: '8',
  buttons: [
    { label: 'FIRE', key: 'Space', size: 'big', colour: 'red' },
    { label: 'GET', key: GET_KEY },
    { label: 'PAD', key: 'ArrowDown' },
  ],
};

/** Whether GET (Z) is held: a key of its own in play, a letter while letters are typed. */
export const getHeld = (down: ReadonlySet<string>, typing: boolean) => !typing && down.has(GET_KEY);

/**
 * The joystick bits BLOB reads ($76: low = pressed): the stick's own directions, and Z / X for up / down unless letters are being typed.
 * `getOwn` (ENHANCED): Z is not up, it is GET (`getHeld`), which the game reads apart.
 */
export function joyBits(held: Stick, down: ReadonlySet<string>, fire: boolean, typing: boolean, getOwn = false): number {
  const up = held.up || (!getOwn && getHeld(down, typing));
  const dn = held.down || (!typing && down.has(PAD_KEY));
  let j = 0x7f;
  if (up) j &= ~1;
  if (dn) j &= ~2;
  if (held.left) j &= ~4;
  if (held.right) j &= ~8;
  if (fire) j &= ~0x10;
  return j;
}
