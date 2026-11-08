/**
 * The pause screen's inventory page (inventory.ts, a page of the map beside its two): everything carried, newest first, each with its picture,
 * a plain name and what it is for, from the game's own state. ENHANCED lists the whole bag, ORIGINAL its four places; both show the page.
 * With an out-dir, the page (and the panel with its "+n") are saved as PNGs.
 *
 *   nice -n 15 node tools/test.mjs games/starquake/test/inventory.ts [out-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { Input, PixelRenderer } from 'c64kit';
import { indicesPng } from '../../../tools/probe/render';
import { COL, MAP_BOX } from '../../shared/native/pause';
import * as Bag from '../src/bag';
import * as Flow from '../src/flow';
import { Game } from '../src/game';
import { entries, PER_PAGE, TEXT, pageCount } from '../src/inventory';
import * as Items from '../src/items';
import { INVENTORY, starquakeMap } from '../src/map';
import { run } from '../src/main';
import { rolesOf } from '../src/places';
import { drawRoom } from '../src/room';
import { gameFont } from '../src/screens';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { check, finish } from '../../shared/test/check';

const outDir = process.argv[2];
const empty = () => starquakeMap.found.empty();

/** A game, with the bag on or off, carrying these things (newest first; the panel's places are the first four). */
function carrying(bag: boolean, things: number[]) {
  const g = new Game();
  Flow.newGame(g, 424242);
  g.room = 8; drawRoom(g);
  g.bag = () => bag;
  if (bag) Bag.settle(g, things); else things.slice(0, 4).forEach((t, i) => { g.carried[i] = t; });
  Items.drawCarried(g);
  return g;
}

const want = (g: Game) => g.core.filter((c) => !(c & 0x80));
const probe = carrying(true, []);
const [piece, piece2] = want(probe);
const trade = [0x1a, 0x1b, 0x1c, 0x1d, 0x1e].filter((t) => !probe.core.includes(t));
const symbol = [0x0a, 0x0b, 0x0c, 0x0d].find((t) => !probe.core.includes(t)) ?? 0x0a;
const THINGS = [0x0f, trade[0], 0x10, piece, symbol, trade[1], piece2, trade[2], trade[0], 0x0e];

// ---- what is carried, and what each is for ----
for (const [name, t] of Object.entries(TEXT)) check(`${name}: "${t.name}" / "${t.use}" fit the page (23 letters)`, t.name.length <= 23 && t.use.length <= 23);
check('the lines are the ones asked for: piece (room 199), card, symbol, trade good', TEXT.piece.use.includes('199') && TEXT.card.name === 'ACCESS CARD' && TEXT.symbol.name === 'SYMBOL' && TEXT.trade.name === 'TRADE GOOD' && TEXT.trade.use.includes('PYRAMID'));
{
  const g = carrying(true, THINGS);
  const e = entries(g);
  check(`ENHANCED: all ${THINGS.length} things are listed, newest first (${e.map((x) => x.role)})`, e.map((x) => x.graphic).join() === THINGS.join() && e.map((x) => x.role).join() === 'card,trade,key,piece,symbol,trade,piece,trade,trade,wild');
  check('...the roles come from what the core still wants (the pieces are among its empty places)', e.every((x, i) => rolesOf(g, THINGS)[i] === x.role) && want(g).includes(piece) && want(g).includes(piece2));
  check(`...${THINGS.length} things are ${pageCount(g)} pages of ${PER_PAGE}`, pageCount(g) === 2);
  const o = carrying(false, THINGS);
  check(`ORIGINAL lists its four (${entries(o).map((x) => x.role)}), one page`, entries(o).length === 4 && entries(o).map((x) => x.graphic).join() === THINGS.slice(0, 4).join() && pageCount(o) === 1);
  check('nothing carried: one page, no entries', pageCount(carrying(true, [])) === 1 && entries(carrying(true, [])).length === 0);
}

// ---- a page beside the map's two ----
{
  const g = carrying(true, THINGS);
  check(`the pause screen has the map's two pages, then the inventory's (${starquakeMap.pages(g).list})`, starquakeMap.pages(g).list.join() === '0,1,2,3');
  check('titles: the map\'s, then CARRYING 1/2, 2/2', starquakeMap.title(g, 0) === 'THE SURFACE' && starquakeMap.title(g, 1) === 'THE DEPTHS' && starquakeMap.title(g, INVENTORY) === 'CARRYING 1/2' && starquakeMap.title(g, INVENTORY + 1) === 'CARRYING 2/2');
  const o = carrying(false, THINGS);
  check('ORIGINAL: one page, titled CARRYING', starquakeMap.pages(o).list.join() === '0,1,2' && starquakeMap.title(o, INVENTORY) === 'CARRYING');
  const legend = starquakeMap.legend;
  check('the map\'s legend is not on the inventory page', typeof legend === 'function' && legend(g, { guide: true }, 0).length > 0 && legend(g, { guide: true }, INVENTORY).length === 0);
  check('no places to go to on it', (starquakeMap.places(MAP_BOX, g, empty(), INVENTORY)).length === 0);
}

// ---- drawn ----
const renderer = new PixelRenderer();
const font = gameFont();
const s = renderer.screen;
/** The colours used in a band of rows of the page (not black). */
const coloursIn = (y0: number, y1: number) => new Set(Array.from(s.pixels.slice(y0 * 320, y1 * 320)).filter((c) => c !== 0));
const drawPage = (g: Game, page: number) => {
  s.pixels.fill(0);
  starquakeMap.draw(s, MAP_BOX, g, empty(), true, page, font, null, { guide: true });
};
{
  const g = carrying(true, THINGS);
  drawPage(g, INVENTORY);
  const first = coloursIn(MAP_BOX.y, MAP_BOX.y + 17);
  check(`page 1: the first line (the card) is its picture, a pink name and a light grey use (${[...first]})`, first.has(COL.pink) && first.has(COL.lgrey));
  const rows = (i: number) => coloursIn(MAP_BOX.y + i * 18, MAP_BOX.y + i * 18 + 16);
  check('...the pieces in green, trade goods in light blue, the symbol orange', rows(3).has(COL.lgreen) && rows(1).has(COL.lblue) && rows(4).has(COL.orange));
  check('...nothing is drawn under the last line, and no box behind any text', s.pixels.slice((MAP_BOX.y + 8 * 18) * 320, (MAP_BOX.y + 8 * 18 + 8) * 320).every((c) => c === 0));
  if (outDir) {
    fs.mkdirSync(outDir, { recursive: true });
    indicesPng(path.join(outDir, 'inventory-enhanced.png'), s.pixels, 320, 200);
  }
  drawPage(g, INVENTORY + 1);
  const second = coloursIn(MAP_BOX.y, MAP_BOX.y + 17);
  check('page 2: the ninth and tenth things', second.size > 1 && TEXT.wild.name.length > 0 && entries(g).slice(PER_PAGE).length === 2);
}
{
  const o = carrying(false, THINGS);
  drawPage(o, INVENTORY);
  check('ORIGINAL: its four things are listed, the fifth line is empty', coloursIn(MAP_BOX.y + 3 * 18, MAP_BOX.y + 3 * 18 + 16).size > 1 && coloursIn(MAP_BOX.y + 4 * 18, MAP_BOX.y + 4 * 18 + 16).size === 0);
  if (outDir) indicesPng(path.join(outDir, 'inventory-original.png'), s.pixels, 320, 200);
  const none = carrying(true, []);
  drawPage(none, INVENTORY);
  check('nothing carried: it says so', coloursIn(MAP_BOX.y, MAP_BOX.y + 12).size === 1);
  if (outDir) indicesPng(path.join(outDir, 'inventory-empty.png'), s.pixels, 320, 200);
}

// ---- the panel with the bag's "+n" ----
if (outDir) {
  const g = carrying(true, [...THINGS, 0x1f, 0x20]);
  const b = g.scr.bank, px = new Uint8Array(320 * 200);
  for (let cell = 0; cell < 1000; cell++) {
    const cx = (cell % 40) * 8, cy = Math.floor(cell / 40) * 8, c = b[0x1c00 + cell];
    for (let y = 0; y < 8; y++) { const bits = b[0x2000 + cell * 8 + y]; for (let x = 0; x < 8; x++) px[(cy + y) * 320 + cx + x] = bits & (0x80 >> x) ? c >> 4 : c & 15; }
  }
  const crop = new Uint8Array(160 * 48);
  for (let y = 0; y < 48; y++) for (let x = 0; x < 160; x++) crop[y * 160 + x] = px[y * 320 + 160 + x];
  indicesPng(path.join(outDir, 'panel-bag.png'), crop, 160, 48, 6);
}

// ---- in the game: P, then the page keys ----
{
  useMemoryStorage();
  const input = new Input(nowhere);
  const gameRenderer = new PixelRenderer();
  const p = run({ renderer: gameRenderer, input, canvas: nowhere });
  const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); } };
  const tap = (code: string) => { input.keyDown(code); tick(2); input.keyUp(code); tick(2); };
  tick(60 + 6 * 50);
  tap('Space'); tick(30); tap('Space'); tick(100);
  Bag.settle(p.game, [0x0f, piece, trade[0]]);
  tap('KeyP');
  check('P opens the pause screen (on the map page the room is on)', p.state.paused);
  const band = (y0: number, y1: number) => new Set(Array.from(gameRenderer.screen.pixels.slice(y0 * 320, y1 * 320)).filter((c) => c !== 0));
  tap('Period'); tap('Period');
  check('the page keys turn through the map\'s two pages to the inventory', band(MAP_BOX.y, MAP_BOX.y + 17).has(COL.pink));
  if (outDir) indicesPng(path.join(outDir, 'inventory-pause.png'), gameRenderer.screen.pixels, 320, 200);
  tap('KeyE');
  tap('Comma'); tap('Period');
  check('ORIGINAL (E): the page is still there', band(MAP_BOX.y, MAP_BOX.y + 17).has(COL.pink) && !p.state.enhanced);
}
finish();
