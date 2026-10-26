import type { FigureSpec } from '../../shared/pendragon/figure';
import { blackwycheControls } from './combat';
import { BLACKWYCHE_FIGURE } from './figure-table';

/**
 * ENHANCED: Pendragon drawn as in Dragonskulle (shared/pendragon/figure.ts). Blackwyche already draws his walk, stand and jump with
 * Dragonskulle's pictures byte for byte; the game sets his colours 10 / 12 / 0 (light red, grey, black), where Dragonskulle's tunic is
 * green. Its sword pictures are the table's. A picture neither has shows the stand of the way he faces.
 */
export const blackwycheFigure: FigureSpec = {
  sprite: 2,
  table: BLACKWYCHE_FIGURE,
  colours: { normal: { own: 10, mc1: 12, mc2: 0 }, face: 'own', tunic: 'mc1', cape: 'mc2' },
  standIn: blackwycheControls.facing,
};
