import type { BitmapFont, Surface } from 'c64kit';
import { drawCarrying, pageCount as pagesFor, PER_PAGE } from '../../shared/carrying';
import { COL, type Box } from '../../shared/native/pause';
import * as Bag from './bag';
import { CORE_ROOM, rom } from './data';
import type { Game } from './game';
import { rolesOf, type Role } from './places';

/**
 * The inventory page of the pause screen (a page beside the map's two): everything BLOB carries, newest first as the panel has it, each
 * with its picture, a plain name and what it is for, read from the game's own state (what the core still wants, `rolesOf`). Information,
 * not help, so both modes show it: ENHANCED lists everything in the bag, ORIGINAL its four places. Text in colours over the black screen,
 * no boxes.
 */

/** What a thing is called and what it is for, a line each (23 letters at most: the page's width). */
export const TEXT: Record<Role, { name: string; use: string }> = {
  piece: { name: 'CORE PIECE', use: `GOES TO CORE, ROOM ${CORE_ROOM}` },
  card: { name: 'ACCESS CARD', use: 'OPENS DOORS, PYRAMIDS' },
  key: { name: 'KEY', use: 'OPENS UPRIGHT BARRIERS' },
  symbol: { name: 'SYMBOL', use: 'OPENS A DOOR OR PYRAMID' },
  wild: { name: 'WILD SYMBOL', use: 'STANDS FOR ANY SYMBOL' },
  trade: { name: 'TRADE GOOD', use: 'A PYRAMID SWAPS IT' },
};

/** The colour of each name: the pieces green and the card and key pink as on the map, symbols orange (the doors'). */
const INK: Record<Role, number> = { piece: COL.lgreen, card: COL.pink, key: COL.pink, symbol: COL.orange, wild: COL.orange, trade: COL.lblue };

export interface Entry { graphic: number; role: Role; name: string; use: string }

/** Everything carried, newest first, with what each is for. */
export function entries(g: Game): Entry[] {
  const things = Bag.held(g);
  const roles = rolesOf(g, things);
  return things.map((graphic, i) => ({ graphic, role: roles[i], ...TEXT[roles[i]] }));
}

export { PER_PAGE };

/** How many things the inventory lists. */
export const count = (g: Game) => Bag.held(g).length;

/** How many pages the inventory has (one, if nothing is carried). */
export const pageCount = (g: Game) => pagesFor(count(g));

/** A thing's picture (16 by 16, the game's graphic $C52C + 32 a graphic) in its own colour, as the panel and the room draw it. */
function drawGraphic(s: Surface, graphic: number, x: number, y: number) {
  const ink = rom(0x2f34 + (graphic & 7)) >> 4, at = 0xc52c + (graphic & 0x7f) * 32;
  for (let half = 0; half < 2; half++) {
    for (let row = 0; row < 8; row++) {
      for (let cell = 0; cell < 2; cell++) {
        const bits = rom(at + half * 16 + cell * 8 + row);
        for (let b = 0; b < 8; b++) if (bits & (0x80 >> b)) s.set(x + cell * 8 + b, y + half * 8 + row, ink);
      }
    }
  }
}

/** The inventory's page `page` (from 0): in the map's box, a line each, left to right as the pause screen's lettering goes. */
export function draw(s: Surface, box: Box, g: Game, font: BitmapFont | undefined, page: number) {
  drawCarrying(s, box, font, entries(g), page, ['NOTHING CARRIED', 'STAND ON A THING AND', 'PRESS UP TO PICK IT UP'], (e, x, y) => {
    drawGraphic(s, e.graphic, x, y);
    font?.draw(s, e.name, x + 20, y, INK[e.role]);
    font?.draw(s, e.use, x + 20, y + 8, COL.lgrey);
  });
}
