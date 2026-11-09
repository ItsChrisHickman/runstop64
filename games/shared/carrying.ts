import type { BitmapFont, Surface } from 'c64kit';
import { COL, type Box } from './native/pause';

/**
 * The CARRYING page of a pause screen (a page beside the map's, `PauseMap.pages`): everything the hero carries, a line each,
 * newest first, in colours over the black screen (no boxes). The page's arithmetic and its layout are here; a game gives the
 * things (its own pictures, names and what each is for) and how one is drawn: Starquake's bag, Auf Wiedersehen Monty's hands.
 */

/** Things on a page: 16 pixels of picture a line and a half apart. */
export const PER_PAGE = 8;
export const ROW = 18;

/** How many pages `n` things take (one, if nothing is carried). */
export const pageCount = (n: number): number => Math.max(1, Math.ceil(n / PER_PAGE));

/** The page's heading: CARRYING, and which of the pages when there are several. `page` counts from 0. */
export const carryingTitle = (page: number, pages: number): string => (pages > 1 ? `CARRYING ${page + 1}/${pages}` : 'CARRYING');

/** The pages `PauseMap.pages` lists: `maps` pages that are maps (0, 1...), then one per page of `n` things. */
export const carryingPages = (maps: number, n: number): number[] => [
  ...Array.from({ length: maps }, (_, i) => i),
  ...Array.from({ length: pageCount(n) }, (_, i) => maps + i),
];

/** What to say when nothing is carried (three lines, the game's own words). */
export type Nothing = readonly [string, string, string];

/**
 * Page `page` (from 0) of `things`, in the map's box, left to right as the pause screen's lettering goes: `draw` puts one thing's
 * picture and lines at (x, y), `x` being where its picture starts (its text goes 20 pixels in).
 */
export function drawCarrying<T>(
  s: Surface, box: Box, font: BitmapFont | undefined, things: readonly T[], page: number, nothing: Nothing,
  draw: (thing: T, x: number, y: number) => void,
) {
  if (!font) return;
  const list = things.slice(page * PER_PAGE, (page + 1) * PER_PAGE);
  if (!list.length) {
    font.draw(s, nothing[0], box.x - 4, box.y + 4, COL.lgrey);
    font.draw(s, nothing[1], box.x - 4, box.y + 20, COL.grey);
    font.draw(s, nothing[2], box.x - 4, box.y + 30, COL.grey);
    return;
  }
  list.forEach((t, i) => draw(t, box.x - 4, box.y + i * ROW));
}
