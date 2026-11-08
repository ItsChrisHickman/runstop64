import type { MontyBody } from './body';
import { FRAME } from './frames';

/**
 * Monty's animation: the original's UpdateState. Which of his frames he shows (the walk, the somersault, the rope), advanced
 * every fourth frame while he moves. Shared by Monty on the Run and the remix.
 */
export function animateMonty(b: MontyBody) {
  if (b.gameMode) return;
  b.animTimer = (b.animTimer - 1) & 0xff;
  if (b.animTimer !== 0) return;

  if (!b.dirLeft && !b.dirRight && !b.montyAction && b.onRope && (b.dirUp || b.dirDown)) {
    b.ticker = (b.ticker + 1) & 0xff;
    b.frameIndex = FRAME.rope + (b.ticker & 3);
    b.animTimer = 4;
    return;
  }

  b.stateCur = (b.facing & 0x80 ? 2 : 1) | (b.montyAction ? 4 : 0);
  if (b.stateCur !== b.statePrev) b.ticker = 0xff;
  b.statePrev = b.stateCur;
  if (b.montyAction || b.isMoving) b.ticker = (b.ticker + 1) & 0xff;

  switch (b.stateCur) {
    case 1: b.frameIndex = FRAME.walkRight + (b.ticker & 3); b.animTimer = 4; break;
    case 2: b.frameIndex = FRAME.walkLeft + (b.ticker & 3); b.animTimer = 4; break;
    case 5:
    case 6:
      if (b.ticker >= 12) b.ticker = 11;
      b.frameIndex = (b.stateCur === 5 ? FRAME.jumpRight : FRAME.jumpLeft) + b.ticker;
      b.animTimer = 4;
      break;
    default: b.animTimer = 1;
  }
}
