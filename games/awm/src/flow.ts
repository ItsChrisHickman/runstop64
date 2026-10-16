/**
 * The game's flow outside the logic step (stage 5): what ends it, what it does then and the title's choice.
 *
 * The main loop leaves its logic at $5510 for $5568 in two cases, a life lost with none left ($555D-$5566) and the
 * ending's flag ($402A, set by the 256th step of state $13): both are the same routine. It sets $4029 to $FF, runs
 * $3540 (the closing screen: two words of four big sprites, each shown for about four seconds with the sprites'
 * colours changing every few cycles), sets $4029 to $C0, runs $82FD (the high score) and starts again at the
 * title ($5422: $5C1D, the title's set-up $406E, $5B39, Monty to (128, 104), the raster IRQs, 2 lives... then
 * the room $48).
 */
import type { Game } from './game';

/** Why the main loop leaves play ($5510, $5568). */
export type Ending = 'ending' | 'game over';

/** What ends play after this logic step, if anything: the ending's flag is looked at first ($5513), then a life gone ($5566). */
export function endOf(g: Game): Ending | null {
  if (g.ended) return 'ending';
  if (g.gameOver) return 'game over';
  return null;
}

/**
 * $82FD: the score becomes the high score when it is higher. Both are five digits, the least significant first
 * ($4067 and $404A); they are compared from the most significant, and an equal score changes nothing.
 */
export function updateHigh(high: number[], score: readonly number[]): void {
  for (let i = 4; i >= 0; i--) {
    const h = high[i] ?? 0, s = score[i] ?? 0;
    if (h === s) continue;
    if (h < s) for (let j = 0; j < 5; j++) high[j] = score[j] ?? 0;
    return;
  }
}

/** The title's choice ($4066, set by the keys $21 and $24 on its menu: 0 shows " MUSIC ON ", else "EFFECTS ON"; $41AE, $41BA). */
export const MENU_TEXT = [' MUSIC ON ', 'EFFECTS ON'] as const;
export const menuText = (flag: number): string => (flag === 0 ? MENU_TEXT[0] : MENU_TEXT[1]);
