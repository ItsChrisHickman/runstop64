/**
 * Our controls for Wanted: Monty Mole. The original reads Q up, A down, O left, P right and any key of the bottom right group to jump (on the options menu's keyboard
 * choice), or a Kempston or Sinclair joystick (input.ts); ours is the one every game here has: arrows or WASD, Space, Z or X to jump, a gamepad, the touch stick and JUMP
 * button (`Input.held`). They are made into the five keys of a pass (`Key`), and those into the ports the game's own input routine reads (`portsFor`: the keyboard's
 * half-rows, as if the keys Q, A, O, P and SPACE were held), so that what runs is `readInput` as it was proved to be.
 */
import type { Stick } from 'c64kit';
import type { Ports } from './input';

/** The five keys of a pass as bits. */
export const Key = { up: 1, down: 2, left: 4, right: 8, jump: 16 } as const;

/** The keys on the original's keyboard that `portsFor` presses (what the lockstep presses on the original). */
export const KEY_NAMES: readonly (readonly [number, string])[] = [[Key.up, 'Q'], [Key.down, 'A'], [Key.left, 'O'], [Key.right, 'P'], [Key.jump, 'SPACE']];

/** The ports of the keyboard control with these keys held. */
export function portsFor(keys: number): Ports {
  const row = (bits: readonly (readonly [number, number])[]): number => bits.reduce((v, [key, bit]) => (keys & key ? v & ~(1 << bit) : v), 0x1f);
  return {
    halfRow: (high) => {
      if (high === 0xfb) return row([[Key.up, 0]]);
      if (high === 0xfd) return row([[Key.down, 0]]);
      if (high === 0xdf) return row([[Key.left, 1], [Key.right, 0]]);
      if (high === 0x7f) return row([[Key.jump, 0]]);
      return 0x1f;
    },
    kempston: () => 0,
  };
}

/** The keys of a pass from the stick as `Input` has it; `fire` is the jump as the game is to see it (a spent press left out). */
export function keyByte(held: Readonly<Stick>, fire: boolean): number {
  let keys = 0;
  if (held.right) keys |= Key.right;
  if (held.left) keys |= Key.left;
  if (held.down) keys |= Key.down;
  if (held.up) keys |= Key.up;
  if (fire) keys |= Key.jump;
  return keys;
}
