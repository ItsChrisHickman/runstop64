import type { Game } from './game';

/**
 * What is held on the stick and the buttons for a frame: the player's (main.ts reads it from the keys, pads and touch) or the
 * ending's pilot's (pilot.ts: the same input a player gives, so Tal runs, jumps and flies as he does in play).
 */
export interface Pad {
  up: boolean; down: boolean; left: boolean; right: boolean;
  /** FIRE: a stone, or the Pulsar Beam in the armour (the original's one button in ORIGINAL). */
  fire: boolean;
  /** ENHANCED's JUMP button, held, and a press of it since the last frame (the game reads the stick only every 7th frame, so a tap is kept until it does). */
  jump: boolean;
  jumpTap: boolean;
  /** ENHANCED's C: fill the armour from a stored recharge cell. */
  cell: boolean;
}

export const NO_PAD: Pad = { up: false, down: false, left: false, right: false, fire: false, jump: false, jumpTap: false, cell: false };

/** The CIA's joystick byte for a pad: a pushed direction or FIRE is a clear bit (port 2, bits 0-4). */
function joystickByte(p: Pad): number {
  let joy = 0x1f;
  if (p.up) joy &= ~1;
  if (p.down) joy &= ~2;
  if (p.left) joy &= ~4;
  if (p.right) joy &= ~8;
  if (p.fire) joy &= ~16;
  return joy;
}

/**
 * Give the game a frame's input (ENHANCED: fire and jump apart, and C for a stored cell; ORIGINAL: the one button, which
 * the caller passes as `fire`). The keyboard stays as it is: the caller sets what it wants (R's restart).
 */
export function giveControls(g: Game, pad: Pad, enhanced: boolean) {
  g.enhanced = enhanced;
  g.cellAsked = enhanced && (g.cellAsked || pad.cell);
  g.jumpButton = enhanced ? (pad.jump ? 1 : 0) | (g.jumpButton & 2) | (pad.jumpTap ? 2 : 0) : 0;
  g.m.joy1 = 0x1f;
  g.m.joy2 = joystickByte(pad);
}
