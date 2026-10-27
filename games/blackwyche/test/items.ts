/**
 * Blackwyche's pause screen shows what Pendragon has collected (src/items.ts, the map's second page and the
 * side panel's ITEMS line):
 *
 *  1. the table of things against the game's own code: every room block in the image gives its thing by
 *     "lda #n, sta $342F" (the number the status line names it by) and a store to its found flag $9D60-$9D79
 *     (and the magic sword sets $342B); the pairs found there are exactly src/items.ts's;
 *  2. the names are the game's own (the table at $9C38);
 *  3. things taken by playing (the recorded route that takes the gunpowder and the skull): the flag goes up,
 *     and the game's status line names the thing taken as the table does;
 *  4. through the front end, launched from that save: the side panel says ITEMS 2/24, P then < > (the key for
 *     the pause screen's pages) shows the second page with those two lit and the rest dark; flags set the
 *     way the game sets them (taken, and used: the mirror) change the page's colours and the count; > again
 *     is the map, with its places, travel still on it. PNGs of the pause screen's two pages go to the out dir.
 *
 *   nice -n 15 node tools/test.mjs games/blackwyche/test/items.ts [out-dir]
 */
import fs from 'node:fs';
import { Input, PixelRenderer, packState, unpackState } from 'c64kit';
import { NativeHost } from '../../shared/native/host';
import { COL, MAP_BOX, screenText } from '../../shared/native/pause';
import { GAMES, setJoy } from '../../shared/native/test/games';
import { nowhere, stubFetch, useMemoryStorage } from '../../shared/test/browser';
import { rgbPng } from '../../../tools/probe/render';
import { C64_PALETTE } from '../../../packages/c64kit/src/palette';
import { run } from '../src/main';
import { port } from '../src/native';
import { blackwycheMap } from '../src/map';
import { gameName, held, ITEMS, itemsFound, roomThings, shortName } from '../src/items';
import { THINGS } from '../src/guided';
import { placeName } from '../src/names';
import { CABINS, HALLS } from '../src/ship';
import { keepFound } from '../../shared/saves';
import { readRoutes } from '../../shared/test/data';
import { check, finish } from '../../shared/test/check';
import { continueFromTitle } from '../../shared/test/continue-from-title';

const outDir = process.argv[2];
const game = GAMES.blackwyche;
if (!game) throw new Error('no blackwyche in games.ts');

const titleBytes = fs.readFileSync(game.title);
const g0 = new NativeHost(port, unpackState(new Uint8Array(titleBytes)));

// ---- 1. the table against the game's own code ----
{
  const r = g0.m.ram, pairs = new Set<string>();
  for (let a = 0xc000; a < 0xfff0; a++) {
    if (r[a] === 0xa9 && r[a + 2] === 0x8d && r[a + 3] === 0x2f && r[a + 4] === 0x34) { // lda #n, sta $342F
      for (let k = 5; k < 16; k++) if (r[a + k] === 0x8d && r[a + k + 2] === 0x9d && r[a + k + 1] >= 0x60 && r[a + k + 1] <= 0x79) { pairs.add(`${r[a + 1] - 1}:${0x9d00 + r[a + k + 1]}`); break; }
    }
    if (r[a] === 0xa9 && r[a + 1] === 0x01 && r[a + 2] === 0x8d && r[a + 3] === 0x2b && r[a + 4] === 0x34 && r[a + 5] === 0x8d && r[a + 6] === 0x2f && r[a + 7] === 0x34) pairs.add(`${r[a + 1] - 1}:${0x342b}`); // the sword
  }
  const ours = new Set(ITEMS.map((i) => `${i.name}:${i.flag}`));
  check(`the code gives ${pairs.size} things; the table has ${ours.size}`, pairs.size === ours.size);
  check('every thing in the code is in the table, with the same name number and flag', [...pairs].every((p) => ours.has(p)) && [...ours].every((p) => pairs.has(p)));
  check('the flags are all different', new Set(ITEMS.map((i) => i.flag)).size === ITEMS.length);
  // each thing's room (for the map: what's left where): GUIDED's, which its check plays in each room
  const roomsAgree = ITEMS.every((i) => {
    const r = new Uint8Array(0x10000); r[i.flag] = 1;
    const by = THINGS.filter((t) => t.taken(r) && t.id !== 'mirrorWait');
    return by.length > 0 && by.every((t) => t.room === i.room);
  });
  check('each thing\'s room is the one GUIDED has it in', roomsAgree);
  check('each is a cabin\'s or a hall\'s', ITEMS.every((i) => CABINS.some((c) => c.room === i.room) || HALLS.some((h) => h.room === i.room)));
  check('the rooms of two cabins give nothing (the map can tell them by room)', [0x18, 0x21, 0x22].every((room) => roomThings(g0.m.ram, room).all === 0));
}

// ---- 2. the game's own names ----
{
  const names = ['A MAGIC SWORD', 'A BELL', 'A LARGE BOOK', 'A CANDLE', 'SOME GUNPOWDER', 'A PIECE OF MAP', 'A KEY', 'SOME SEAWEED', 'A PEARL', 'SOME DOUBLOONS',
    'A SKULL', 'CROSSBONES', 'A HEAVY ANCHOR', 'A TELESCOPE', 'A SEXTANT', 'A COMPASS', 'A SMALL MIRROR', 'A SMALL COMB', 'SOME WATER', 'A WATER BUCKET'];
  check('the 20 names in the game\'s table', names.every((n, i) => gameName(g0.m.ram, i) === n));
  check('the pause screen\'s names fit twelve letters', ITEMS.every((i) => shortName(g0.m.ram, i.name).length <= 12));
}

// ---- 3. played: the route that takes the gunpowder and the skull ----
const routes = readRoutes('games/blackwyche/re/routes.json');
const route = routes[3];
if (!route) throw new Error('no route 3');
const g = new NativeHost(port, unpackState(new Uint8Array(titleBytes)));
const taken = new Map<number, string>(); // flag -> the status line some frames after it was set
let frame = 0, watching: { flag: number; left: number } | null = null;
const routeFound = blackwycheMap.found.empty(); // (where the map has him been, as the front end notes it)
const frameOf = () => {
  g.tick(); g.m.ram[0x9d77] = 100; g.m.ram[0x3417] = 0; frame++;
  if (g.lastWait === game.mainLoopWait && frame > 200) blackwycheMap.observe(g.m.ram, routeFound, g.m.vic);
  if (watching && --watching.left <= 0) { taken.set(watching.flag, screenText(g.m.ram, 22, 0, 40)); watching = null; }
};
const flagsBefore = ITEMS.map((i) => g.m.ram[i.flag]);
outer: for (let i = 0; i < route.length; i += 2) for (let k = 0; k < route[i + 1]; k++) {
  setJoy(g.m, game, route[i] & 0x1f); g.m.keys = route[i] & 32 ? [[1, 2]] : [];
  frameOf();
  if (!watching) for (const item of ITEMS) if (g.m.ram[item.flag] === 1 && !taken.has(item.flag)) { watching = { flag: item.flag, left: 8 }; }
  if (taken.size >= 2 && !watching) break outer;
}
check(`nothing was taken before the route began`, flagsBefore.every((v) => v === 0));
const gunpowder = ITEMS.findIndex((i) => i.flag === 0x9d60), skull = ITEMS.findIndex((i) => i.flag === 0x9d6d);
check(`the route took the gunpowder and the skull (frame ${frame})`, taken.has(0x9d60) && taken.has(0x9d6d) && itemsFound(g.m.ram) === 2);
check(`the status line names the gunpowder: "${taken.get(0x9d60)}"`, (taken.get(0x9d60) ?? '').includes('GUNPOWDER'));
check(`the status line names the skull: "${taken.get(0x9d6d)}"`, (taken.get(0x9d6d) ?? '').includes('SKULL'));
// (on to a place the game can be saved)
let save = g.save();
for (let f = 0; f < 900 && !save; f++) { setJoy(g.m, game, 0x1f); g.m.keys = []; frameOf(); save = g.save(); }
if (!save) throw new Error('no save after the route');

// ---- 4. the pause screen, through the front end launched from that save ----
useMemoryStorage(new Map([['blackwyche.save.v1', Buffer.from(packState(save)).toString('base64')]]));
keepFound('blackwyche', routeFound);
stubFetch(titleBytes);
const input = new Input(nowhere);
const renderer = new PixelRenderer();
const p = run({ renderer, input, canvas: nowhere });
const ram = () => { const m = p.machine; if (!m) throw new Error('no machine'); return m.ram; };
const tick = (n = 1) => { for (let i = 0; i < n; i++) { input.poll(); p.tick(); p.render(0); const m = p.machine; if (m) { m.ram[0x9d77] = 100; m.ram[0x3417] = 0; } } };
const press = (code: string) => { input.keyDown(code); tick(1); input.keyUp(code); tick(1); };
const shot = (name: string) => {
  if (!outDir) return;
  fs.mkdirSync(outDir, { recursive: true });
  const rgb = new Float32Array(320 * 200 * 3);
  renderer.screen.pixels.forEach((v, i) => { const c = C64_PALETTE[(v === 0xff ? renderer.background : v) & 15]; rgb[i * 3] = (c >> 16) / 255; rgb[i * 3 + 1] = ((c >> 8) & 255) / 255; rgb[i * 3 + 2] = (c & 255) / 255; });
  rgbPng(`${outDir}/blackwyche-${name}.png`, rgb, 320, 200, 2);
};
/** The colours in a box of the pause screen (C64 pixels). */
const coloursIn = (x: number, y: number, w: number, h: number) => {
  const seen = new Set<number>();
  for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) seen.add(renderer.screen.pixels[yy * 320 + xx] & 15);
  return seen;
};
const rows = Math.ceil(ITEMS.length / 2);
/** The colour an item's name is drawn in on the second page. */
const nameColour = (i: number) => {
  const x = MAP_BOX.x + (i < rows ? 0 : 100), y = MAP_BOX.y + (i % rows) * 12, c = coloursIn(x, y, 96, 8);
  return [COL.white, COL.lgreen, COL.dgrey].filter((k) => c.has(k)).join('+');
};
const expectColour = (i: number) => { const h = held(ram(), ITEMS[i]); return String(h === 'no' ? COL.dgrey : h === 'used' ? COL.lgreen : COL.white); };

await new Promise((r) => setTimeout(r, 0));
continueFromTitle(p, input, tick); // (the title, ENTER CONTINUE, Enter)
check('continued the save', p.state.playing);
check(`the side panel counts them: ${blackwycheMap.info(ram(), p.frontEnd.found).join(' | ')}`, blackwycheMap.info(ram(), p.frontEnd.found).includes('ITEMS  2/24'));
press('KeyP');
check('P: the pause screen, on the map', p.frontEnd.paused && blackwycheMap.title(ram(), 0) !== 'ITEMS');
const mapShot = renderer.screen.pixels.slice();
shot('pause-map');
check('the map page has places to go back to', (blackwycheMap.places?.(MAP_BOX, ram(), p.frontEnd.found, 0) ?? []).length > 0);
check('the second page has none (nothing to pick)', (blackwycheMap.places?.(MAP_BOX, ram(), p.frontEnd.found, 1) ?? []).length === 0);

press('Period'); // the pause screen's key for the next page
tick(2);
check('< > turns to the second page (the screen changed)', renderer.screen.pixels.some((v, i) => v !== mapShot[i]));
shot('pause-items-2');
check(`the gunpowder is lit (${nameColour(gunpowder)}) and the skull (${nameColour(skull)})`, nameColour(gunpowder) === String(COL.white) && nameColour(skull) === String(COL.white));
check('all the others are dark', ITEMS.every((_, i) => i === gunpowder || i === skull || nameColour(i) === String(COL.dgrey)));

// things taken the way the game sets them (1; 2 for the mirror, used): the page follows
const r = ram();
for (const flag of [0x342b, 0x9d61, 0x9d79, 0x9d6c, 0x9d71]) r[flag] = 1;
r[0x9d73] = 2;
tick(2);
shot('pause-items-8');
check('the side panel counts 8', blackwycheMap.info(ram(), p.frontEnd.found).includes('ITEMS  8/24'));
check('each name is drawn in its colour (white taken, green used, dark not yet)', ITEMS.every((_, i) => nameColour(i) === expectColour(i)));
check('the mirror is the green one', ITEMS.filter((_, i) => nameColour(i) === String(COL.lgreen)).length === 1 && nameColour(ITEMS.findIndex((i) => i.flag === 0x9d73)) === String(COL.lgreen));
check('both lots of doubloons and all four pieces of map are separate lines', ITEMS.filter((i) => i.name === 9).length === 2 && ITEMS.filter((i) => i.name === 5).length === 4);

press('Period'); // round again: the map
tick(2);
check('> again is the map, with a place picked to go to', blackwycheMap.title(ram(), 0) !== 'ITEMS' && p.frontEnd.picked !== null);
shot('pause-map-8');
// the places he's emptied shimmer (the gunpowder's cabin, the skull's hall), and the pick line says so
const powderRoom = 'C2.1.7', powder = CABINS.find((c) => `C${c.deck}.${c.part}.${c.door}` === powderRoom);
check(`the gunpowder's cabin is the ${placeName(powderRoom)}`, powder?.room === 0x03 && placeName(powderRoom) === 'POWDER ROOM');
const cabinBox = (deck: number, part: number, door: number) => [MAP_BOX.x + 12 + (part === 0 ? 2 + door : 13 + door) * 8 + 1, MAP_BOX.y + (deck - 1) * 28 + 1 + 2] as const;
const [bx, by] = cabinBox(2, 1, 7), shades = new Set<number>();
for (let f = 0; f < 50; f++) { tick(1); for (const c of coloursIn(bx, by, 4, 3)) shades.add(c); }
check(`the powder room shimmers (${[...shades].join(',')})`, shades.size >= 3 && !shades.has(COL.lblue));
const pickLine = () => coloursIn(MAP_BOX.x, MAP_BOX.y + MAP_BOX.h - 8, MAP_BOX.w, 8);
let tries = 0;
while (p.frontEnd.picked !== powderRoom && tries++ < 60) press('ArrowRight');
if (p.frontEnd.picked !== powderRoom) for (tries = 0; p.frontEnd.picked !== powderRoom && tries < 60; tries++) press('ArrowDown');
tick(2);
shot('pause-map-picked');
check(`picked: ${p.frontEnd.picked}, the line names it and says ALL FOUND (light green)`, p.frontEnd.picked === powderRoom && pickLine().has(COL.lgreen) && pickLine().has(COL.cyan));
press('KeyP');
check('P: back to the game', !p.frontEnd.paused);

finish();
