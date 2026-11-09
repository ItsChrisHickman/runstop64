import type { BitmapFont, Surface } from 'c64kit';
import { drawCarrying, pageCount } from '../../shared/carrying';
import { COL, type Box } from '../../shared/native/pause';
import { DELIVERIES, type Game } from './game';
import { coloursOfType, TICKET, type Carried } from './items';
import { itemGlyphs } from './panel';
import { COLOUR_OF } from './room';

/**
 * The CARRYING page of the pause screen (a page beside the map, ENHANCED's carry anything: `Items.list`): everything Monty
 * carries, the latest picked up first, each with its picture as the boxes draw it, and what it is for, read from the game's own
 * rules (the four deliveries, the two rooms that ask for something, the plane tickets). Text in colours over the black screen.
 */

/** Rooms that ask for a thing, apart from the deliveries (`Game`: room 5 wants $0A, room $1B wants 5). */
const ASKED: readonly { readonly type: number; readonly room: number }[] = [{ type: 0x0a, room: 5 }, { type: 5, room: 0x1b }];

/** What a thing is for, two lines of 22 letters at most, and the colour of the first. */
export function describe(c: Carried, roomName: (room: number) => string): { first: string; second: string; ink: number } {
  if (c.type === TICKET) return { first: c.count > 1 ? `AIR TICKETS X${c.count}` : 'AIR TICKET', second: 'ONE FLIGHT EACH', ink: COL.cyan };
  const delivery = DELIVERIES.find((d) => d.type === c.type);
  if (delivery) return { first: 'A DELIVERY', second: `TO ${roomName(delivery.room)}`.slice(0, 22), ink: COL.yellow };
  const asked = ASKED.find((a) => a.type === c.type);
  if (asked) return { first: 'WANTED IN', second: roomName(asked.room).slice(0, 22), ink: COL.lgreen };
  return { first: 'A THING TO HAND OVER', second: 'WHEN SOMEONE ASKS', ink: COL.lgreen };
}

/** How many pages what he carries takes. */
export const pages = (g: Game): number => pageCount(g.items.list().length);

/** A thing's picture (16 by 16): its four characters, each in its own colour, as a box draws them. */
function drawItem(s: Surface, type: number, x: number, y: number): void {
  const glyphs = itemGlyphs(type), colours = coloursOfType(type);
  for (let c = 0; c < 4; c++) {
    const ink = COLOUR_OF[(colours[c] ?? 0) & 7];
    for (let row = 0; row < 8; row++) {
      const bits = glyphs[c * 8 + row] ?? 0;
      for (let b = 0; b < 8; b++) if (bits & (0x80 >> b)) s.set(x + (c >> 1) * 8 + b, y + (c & 1) * 8 + row, ink);
    }
  }
}

/** Page `page` (from 0) of what he carries, in the map's box: a line each, left to right as the pause screen's lettering goes. */
export function draw(s: Surface, box: Box, g: Game, font: BitmapFont | undefined, page: number, roomName: (room: number) => string): void {
  drawCarrying(s, box, font, g.items.list(), page, ['NOTHING CARRIED', 'WALK INTO A THING', 'TO PICK IT UP'], (c, x, y) => {
    const { first, second, ink } = describe(c, roomName);
    drawItem(s, c.type, x, y);
    font?.draw(s, first, x + 20, y, ink);
    font?.draw(s, second, x + 20, y + 8, COL.lgrey);
  });
}
