/**
 * The input byte (`$832E`) as the original's `$82A6` makes it. Bits 0-2 are the direction (0 up, 1 down, 2 left, 3 right, 4 none),
 * bit 7 is the jump. The control is chosen on the options menu (`$82A3`: 1 keyboard, 2 Kempston, 3 Sinclair) and the routine reads
 * the ports as the Z80 does; `Ports` is what an `IN` gives, so the lockstep test can hand it the model's own ports and a browser
 * can hand it what the player holds.
 *
 * Keyboard: Q up, A down, O left, P right, and any key of the bottom right group (SPACE, SYMBOL SHIFT, M, N, B) jumps.
 * Kempston: the joystick's own bits. Sinclair (interface 2, the left joystick's keys): 4 up, 3 down, 1 left, 2 right, 5 fire.
 * Up beats down beats left beats right when several are held. When no direction is held the byte is left as it was (Monty's pass
 * puts it back to 4 each time, but a death skips that, so the byte is part of the game's state).
 */
export const Direction = { up: 0, down: 1, left: 2, right: 3, none: 4 } as const;
export const JUMP_BIT = 0x80;

export type Control = 1 | 2 | 3;
export const KEYBOARD: Control = 1, KEMPSTON: Control = 2, SINCLAIR: Control = 3;

/** What `IN A,(C)` gives for the ports the game reads. */
export interface Ports {
  /** the five low bits (0 = pressed) of the keyboard half-row whose address line is the port's high byte: $FB, $FD, $DF, $7F, $F7 */
  halfRow(highByte: number): number;
  /** port $1F: Kempston bits 0-4 are right, left, down, up, fire (1 = pressed) */
  kempston(): number;
}

const pressed = (bits: number, bit: number): boolean => (bits & (1 << bit)) === 0;

/** The input byte after `$82A6`, from the byte it was (`held`). */
export function readInput(control: number, ports: Ports, held: number): number {
  let byte = held;
  if (control === KEYBOARD) {
    if (pressed(ports.halfRow(0xfb), 0)) byte = Direction.up; // Q
    else if (pressed(ports.halfRow(0xfd), 0)) byte = Direction.down; // A
    else {
      const row = ports.halfRow(0xdf);
      if (pressed(row, 1)) byte = Direction.left; // O
      else if (pressed(row, 0)) byte = Direction.right; // P
    }
    return (ports.halfRow(0x7f) & 0x1f) !== 0x1f ? byte | JUMP_BIT : byte;
  }
  if (control === KEMPSTON) {
    const a = ports.kempston();
    if ((a & 8) !== 0) byte = Direction.up;
    else if ((a & 4) !== 0) byte = Direction.down;
    else if ((a & 2) !== 0) byte = Direction.left;
    else if ((a & 1) !== 0) byte = Direction.right;
    return (a & 16) !== 0 ? byte | JUMP_BIT : byte;
  }
  const a = ports.halfRow(0xf7);
  if (pressed(a, 3)) byte = Direction.up; // 4
  else if (pressed(a, 2)) byte = Direction.down; // 3
  else if (pressed(a, 0)) byte = Direction.left; // 1
  else if (pressed(a, 1)) byte = Direction.right; // 2
  return pressed(a, 4) ? byte | JUMP_BIT : byte; // 5
}
