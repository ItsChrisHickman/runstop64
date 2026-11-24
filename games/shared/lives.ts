/**
 * EASY's unlimited lives, the same in every game (AGENTS.md): a death costs no life and the game never reaches GAME OVER (and
 * so never asks CONTINUE?); no lives are shown. HARD keeps the game's own lives, exactly as the original. Every other change of
 * ours is on in both. No game has invincibility: he still dies, and is put back at the start of the room as he came into it. A
 * rebuild lists `LIVES_ASSIST` among its assists (`fe.assist.lives`: on in EASY), takes its lives off with `afterLoss` and
 * leaves its lives counter out while it is on (`livesShown`). The translated games (shared/native) do the same through
 * `vitals.lives` with `infinite`.
 */
import type { AssistSpec } from './frontend';

/** The assist, on with EASY. */
export const LIVES_ASSIST = { id: 'lives', long: 'UNLIMITED LIVES', role: 'easy' } as const satisfies AssistSpec;

/** The lives after one is lost: as they were where they are unlimited. */
export const afterLoss = (lives: number, unlimited: boolean): number => (unlimited ? lives : lives - 1);

/** Whether the lives counter is shown: in HARD only (EASY has no lives to count). */
export const livesShown = (assist: Readonly<Record<string, boolean>> | undefined): boolean => assist?.lives !== true;
