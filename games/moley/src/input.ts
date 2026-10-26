/**
 * The keys of a pass (`$915F`): one byte with the same bits whatever the device (see `Key` in monty.ts). The keyboard is tried
 * first (Z left, X right, O up, K down, SPACE jump); if nothing is pressed, a Kempston joystick if the credits page found one;
 * then Sinclair Interface 2 (6 left, 7 right, 8 down, 9 up, 0 jump). Left with right, or up with down, cancel the whole byte.
 */
import { Key } from './monty';

/** Each device's keys as the bits of `Key`. */
interface KeySources {
  readonly keyboard: number;
  /** the joystick port's low 5 bits (the same bits as `Key`), or null when no Kempston interface was found */
  readonly kempston: number | null;
  readonly sinclair: number;
}

/** The keyboard keys by name, as `tools/zx` and the browser's key map name them. */
export const KEYBOARD_KEYS = { left: 'Z', right: 'X', up: 'O', down: 'K', jump: 'SPACE' } as const;
/** Sinclair Interface 2's keys (joystick 1). */
export const SINCLAIR_KEYS = { left: '6', right: '7', down: '8', up: '9', jump: '0' } as const;

/** The bits of `Key` for the directions and jump held in a device's key map. */
export function bitsOf(keys: Readonly<Record<'left' | 'right' | 'up' | 'down' | 'jump', string>>, down: (key: string) => boolean): number {
  let bits = 0;
  if (down(keys.right)) bits |= Key.right;
  if (down(keys.left)) bits |= Key.left;
  if (down(keys.down)) bits |= Key.down;
  if (down(keys.up)) bits |= Key.up;
  if (down(keys.jump)) bits |= Key.jump;
  return bits;
}

/** The byte a pass uses. */
export function readKeys(sources: KeySources): number {
  let bits = sources.keyboard;
  if (bits === 0 && sources.kempston !== null) bits = sources.kempston & 0x1f;
  if (bits === 0) bits = sources.sinclair;
  if ((bits & (Key.left | Key.right)) === (Key.left | Key.right)) return 0;
  if ((bits & (Key.up | Key.down)) === (Key.up | Key.down)) return 0;
  return bits;
}
