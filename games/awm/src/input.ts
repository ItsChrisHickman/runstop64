/**
 * Monty's controls as the game's logic sees them: one byte, bit 0 right, 1 left, 2 down, 3 up, 4 fire
 * (what $61DA hands back after the table at $6283 has had its say).
 */
export const Dir = { Right: 1, Left: 2, Down: 4, Up: 8, Fire: 16 } as const;

/** A joystick as the CIA reports it once inverted: bit 0 up, 1 down, 2 left, 3 right, 4 fire. */
export const Stick = { Up: 1, Down: 2, Left: 4, Right: 8, Fire: 16 } as const;

/**
 * The game's input byte for a joystick ($6283 for the 32 combinations): left and right together cancel
 * everything but fire (up and down together are lost with them), up and down together cancel each other
 * only. The keyboard is read the same way when the joystick is idle.
 */
export function decodeStick(stick: number): number {
  const fire = stick & Stick.Fire ? Dir.Fire : 0;
  const left = (stick & Stick.Left) !== 0, right = (stick & Stick.Right) !== 0;
  const up = (stick & Stick.Up) !== 0, down = (stick & Stick.Down) !== 0;
  if (left && right) return fire;
  let m = fire;
  if (right) m |= Dir.Right;
  if (left) m |= Dir.Left;
  if (up && !down) m |= Dir.Up;
  if (down && !up) m |= Dir.Down;
  return m;
}
