import type { BitmapFont, Surface } from 'c64kit';
import { COL, shimmerColour, type Box } from '../../shared/native/pause';
import type { Game } from './game';
import { isFull, percentOf, tallyOf } from './percent';

/**
 * The pause screen's PASSPORT page (after the map's: Tab, or a tap on the heading), a game with a % complete's (percent.ts): a stamp for each region, in the
 * order of the journey, two to a row, its name and its % beside it. A region at 100% has its stamp in its ink (a rubber stamp's double frame round the region's
 * picture); one not yet has its place for it, dotted, the picture dark, as the items not found are on the map's page.
 */

/** What the page's heading says. */
export const PASSPORT_TITLE = 'PASSPORT';

/** A 16 x 16 icon from 32 bytes (top-left, top-right, bottom-left, bottom-right characters), as the map's items are drawn. */
export function icon(s: Surface, bytes: ArrayLike<number>, x: number, y: number, colour: number) {
  for (let q = 0; q < 4; q++) s.drawChar(Array.from({ length: 8 }, (_, i) => bytes[q * 8 + i] ?? 0), x + (q & 1) * 8, y + (q >> 1) * 8, colour);
}

/** A stamp's size (its frame round the 16 x 16 picture), and the room each region takes on the page. */
const STAMP = 24, COLS = 2;

/** A rubber stamp's frame: two outlines, the corners of the outer one cut (an inked stamp's), or dotted where the stamp is still to come. */
function frame(s: Surface, x: number, y: number, colour: number, inked: boolean) {
  const n = STAMP - 1;
  for (let i = 0; i <= n; i++) {
    if (!inked && i % 2) continue;
    const corner = i === 0 || i === n;
    if (!(inked && corner)) { s.fillRect(x + i, y, 1, 1, colour); s.fillRect(x + i, y + n, 1, 1, colour); s.fillRect(x, y + i, 1, 1, colour); s.fillRect(x + n, y + i, 1, 1, colour); }
  }
  if (!inked) return;
  s.fillRect(x + 2, y + 2, n - 3, 1, colour); s.fillRect(x + 2, y + n - 2, n - 3, 1, colour);
  s.fillRect(x + 2, y + 2, 1, n - 3, colour); s.fillRect(x + n - 2, y + 2, 1, n - 3, colour);
}

/** The page, in the map's box. `tick`: the frames drawn, for a full passport's shimmer. */
export function drawPassport(s: Surface, box: Box, g: Game, font: BitmapFont | undefined, tick: number) {
  const spec = g.data.complete;
  const tally = tallyOf(g.data, { visited: g.visited, coins: g.coinCollected, items: g.siCollected });
  if (!spec || !tally) return;
  const regions = tally.regions.filter((r) => r.all > 0);
  const rows = Math.ceil(regions.length / COLS);
  const w = Math.floor(box.w / COLS), h = Math.min(40, Math.floor((box.h - 4) / Math.max(1, rows)));
  regions.forEach((r, i) => {
    const x = box.x + (i % COLS) * w, y = box.y + 4 + Math.floor(i / COLS) * h;
    const stamp = spec.stamps.find((st) => st.region === r.name);
    const done = isFull(r);
    const ink = done ? stamp?.ink ?? COL.white : COL.dgrey;
    frame(s, x, y, ink, done);
    if (stamp) icon(s, stamp.picture, x + 4, y + 4, ink);
    if (!font) return;
    font.draw(s, r.name, x + STAMP + 6, y + 3, done ? COL.white : COL.lgrey);
    font.draw(s, `${percentOf(r)}%`, x + STAMP + 6, y + 14, done ? shimmerColour(tick, i) ?? COL.yellow : COL.lgreen);
  });
}
