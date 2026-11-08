import { applyMonty, decideMonty } from '../../shared/monty/physics';
import { animateMonty } from '../../shared/monty/anim';
import { flameMasks, jumpArc, SFX } from './data';
import type { Game } from './game';
import { c5DriveMovement } from './mechanisms';

/**
 * Monty's movement and animation: the shared Monty (games/shared/monty: the walk, the jump, the fall, the ropes, the exits and
 * his frames, a port of the original Monty.Draw) with what is Monty on the Run's own over it, the C5 and the jetpack.
 * Coordinates are the original's: x2 is the sprite X in 2-pixel units, y the VIC sprite Y; the collision box is 2x2 chars from
 * Monty's top-left.
 */
export function montyDraw(g: Game) {
  updateMovement(g);
  animateMonty(g);
  g.enable |= 0x08;
}

// ---- UpdateMovement ---------------------------------------------------------------------

function updateMovement(g: Game) {
  if (g.gameMode) return;
  if (g.c5.active) return c5DriveMovement(g);
  // (fire starts a jump, not with the jetpack on)
  decideMonty(g, g, { arc: jumpArc, canJump: !g.showJetpack, onJump: () => { g.sfx(SFX.jump, true); } });

  // The jetpack ("The Ultimate Experience"): steer freely; hold up to thrust.
  if (g.showJetpack) {
    const input = g.input;
    g.dirLeft = input.left;
    g.dirRight = input.right;
    if (!input.up) {
      g.jetpackActive = 0;
      g.vic.mc2 = 0;
    } else {
      g.jetpackActive = 1;
      animateFlame(g);
      g.vic.mc2 = (g.vic.mc2 + 1) & 15;
      g.sfx(SFX.jetpack, true);
      g.dirUp = true;
      g.upSteps = 1;
      g.downSteps = 0;
      g.ticker = 0;
    }
  }

  applyMonty(g, g);
}

/** Jetpack.AnimateFlame: random noise through the flame masks, odd frames. */
function animateFlame(g: Game) {
  if (!g.frameToggle) return;
  let y = g.random();
  for (let x = 17; x >= 0; x--, y = (y + 1) & 0xff) {
    const a = 0x1dea + x, b = 0x1e6a + x;
    g.mem[a] = (y ^ g.mem[a]) & flameMasks[x];
    g.mem[b] = (y ^ g.mem[b]) & flameMasks[18 + x];
  }
}
