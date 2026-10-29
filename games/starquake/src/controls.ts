import type { Stick } from 'c64kit';
import type { TouchLayout } from '../../shared/touch';

/**
 * Starquake's controls. The game reads one joystick: up picks up what BLOB stands at (and climbs
 * lift tubes and the hover pad), down builds a hover platform under him (and lowers the pad he rides).
 * Touch has the stick for them and, on the right beside FIRE, a GET and a PAD button that hold the
 * game's own up and down (they stand for the arrow keys, so the letter-picking screens see them as
 * the stick's). The keyboard has G and B for the same two; they mean nothing while letters are typed.
 */
export const GET_KEY = 'KeyG';
export const PAD_KEY = 'KeyB';

export const TOUCH: TouchLayout = {
  stick: '8',
  buttons: [
    { label: 'FIRE', key: 'Space', size: 'big', colour: 'red' },
    { label: 'GET', key: 'ArrowUp' },
    { label: 'PAD', key: 'ArrowDown' },
  ],
};

/** The joystick bits BLOB reads ($76: low = pressed): the stick's own directions, and G / B for up / down unless letters are being typed. */
export function joyBits(held: Stick, down: ReadonlySet<string>, fire: boolean, typing: boolean): number {
  const up = held.up || (!typing && down.has(GET_KEY));
  const dn = held.down || (!typing && down.has(PAD_KEY));
  let j = 0x7f;
  if (up) j &= ~1;
  if (dn) j &= ~2;
  if (held.left) j &= ~4;
  if (held.right) j &= ~8;
  if (fire) j &= ~0x10;
  return j;
}
