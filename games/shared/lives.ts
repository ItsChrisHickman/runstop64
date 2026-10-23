/**
 * ENHANCED's unlimited lives and continues, the same in every game (AGENTS.md): a death costs no life, so the lives shown stay as
 * they are and the game never reaches GAME OVER (and so never asks CONTINUE?); ORIGINAL keeps the game's own lives. No game has
 * invincibility: he still dies, and is put back as the game does. A rebuild lists `LIVES_ASSIST` among its assists (the pause
 * screen shows it with ENHANCED's others, `fe.assist.lives`) and takes its lives off with `afterLoss`. The translated games
 * (shared/native) do the same through `vitals.lives` with `infinite`; Starquake gives a life back (`Panel.extraLife`).
 */
import type { AssistSpec } from './frontend';

/** The assist, on with ENHANCED. */
export const LIVES_ASSIST = { id: 'lives', long: 'UNLIMITED LIVES' } as const satisfies AssistSpec;

/** The lives after one is lost: as they were where they are unlimited. */
export const afterLoss = (lives: number, unlimited: boolean): number => (unlimited ? lives : lives - 1);
