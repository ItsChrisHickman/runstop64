import type { FigureSpec } from '../../shared/pendragon/figure';
import { KARNATH_FIGURE } from './figure-table';

/**
 * ENHANCED: Pendragon drawn as in Dragonskulle (shared/pendragon/figure.ts). Karnath sets his colours 7 / 10 / 6: the yellow of his hair
 * and robe is the sprite's own colour, the light red of his face and hands the first shared one, the blue the second. The pictures not
 * in the table are his death (a slit of him in each colour, built by the game) and a star: they stay as drawn.
 */
export const karnathFigure: FigureSpec = {
  sprite: 2,
  table: KARNATH_FIGURE,
  colours: { normal: { own: 7, mc1: 10, mc2: 6 }, face: 'mc1', tunic: 'own', cape: 'mc2' },
};
