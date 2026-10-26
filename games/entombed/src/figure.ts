import type { FigureSpec } from '../../shared/pendragon/figure';
import { entombedControls } from './combat';
import { ENTOMBED_FIGURE, ENTOMBED_KEEP } from './figure-table';

/**
 * ENHANCED: Pendragon drawn as in Dragonskulle (shared/pendragon/figure.ts). Entombed sets his colours 7 / 10 / 6 (yellow waistcoat,
 * light red face and hands, blue cap and trousers); in a dark chamber the game paints the first and last black, which his tunic and
 * cape then follow. A picture the table does not have shows the stand of the way he faces; the ghost that rises when he dies stays.
 */
export const entombedFigure: FigureSpec = {
  sprite: 2,
  table: ENTOMBED_FIGURE,
  keep: ENTOMBED_KEEP,
  colours: { normal: { own: 7, mc1: 10, mc2: 6 }, face: 'mc1', tunic: 'own', cape: 'mc2' },
  standIn: entombedControls.facing,
};
