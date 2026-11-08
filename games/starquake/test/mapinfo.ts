/**
 * The pause map's context (map.ts, places.ts): the goal with the real count of the core's places filled, what a picked room has (both
 * modes), and ENHANCED's marks: where the pieces the core wants lie (checked by drawing those rooms), the access card and the key, and what
 * a door or a pyramid wants. The doors the map knows are the ones the game draws.
 *
 *   nice -n 15 node tools/test.mjs games/starquake/test/mapinfo.ts [out-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { PixelRenderer } from 'c64kit';
import { indicesPng } from '../../../tools/probe/render';
import { COL, MAP_BOX } from '../../shared/native/pause';
import { Game } from '../src/game';
import { drawRoom } from '../src/room';
import * as Flow from '../src/flow';
import { goalLine, LINE_LETTERS, noteBooth, roomLine, starquakeMap, type StarquakeFound } from '../src/map';
import { CORE_PIECES, doorRooms, GRAPHIC, hasDoor, lyingHere, passRooms, pieceRooms, piecesPlaced, teleportName, TELEPORT_ROOMS } from '../src/places';
import { gameFont } from '../src/screens';
import { check, finish } from '../../shared/test/check';

const outDir = process.argv[2];
const g = new Game();
Flow.newGame(g, 424242);
const empty = (): StarquakeFound => starquakeMap.found.empty();

// ---- the goal: the real count ----
check(`a new game: ${goalLine(g)}`, goalLine(g) === 'REBUILD THE CORE: 0 OF 9' && piecesPlaced(g) === 0 && CORE_PIECES === 9);
check('the side panel keeps its two lines (the legend and the options need the room)', starquakeMap.info(g).length === 2);
g.core[0] |= 0x80; g.core[4] |= 0x80; g.core[8] |= 0x80;
check(`three places filled: ${goalLine(g)}`, goalLine(g) === 'REBUILD THE CORE: 3 OF 9');
g.core[0] &= 0x7f; g.core[4] &= 0x7f; g.core[8] &= 0x7f;

// ---- the doors the map knows are the doors the game draws ----
const scratch = new Game();
Flow.newGame(scratch, 1);
let wrong = 0;
for (let r = 0; r < 512; r++) {
  scratch.room = r; drawRoom(scratch);
  const drawn = scratch.objects.slice(0, scratch.objectCount).some((o) => o.type === 0x30 && o.col >= 4 && o.col < 36);
  if (drawn !== hasDoor(r)) wrong++;
}
check(`security doors: ${doorRooms().length} rooms, all as the game draws them (${wrong} differ)`, wrong === 0 && doorRooms().length > 5);

// ---- where the wanted pieces lie: drawing those rooms shows them ----
const want = new Set(g.core.filter((c) => !(c & 0x80)));
const rooms = pieceRooms(g);
let shownAll = rooms.size > 0;
for (const r of rooms) {
  g.room = r; drawRoom(g);
  if (!g.shown.some((s) => want.has(s.graphic))) shownAll = false;
}
check(`${rooms.size} rooms hold what the core wants, and drawing each shows one`, shownAll && rooms.size >= 5);
const lonely = [...rooms][0];
check('...and nothing else is called a piece there', lyingHere(g, lonely).piece);
check('the card and the key lie in rooms too', passRooms(g).size === 2 && g.items.some((it) => it.graphic === GRAPHIC.card) && g.items.some((it) => it.graphic === GRAPHIC.key));

// ---- the line for a picked room ----
const f = empty();
const door = doorRooms()[0], tele = TELEPORT_ROOMS[3];
check(`a door (room ${door}): ${roomLine(g, f, door, false)} / ${roomLine(g, f, door, true)}`, /^SECURITY DOOR/.test(roomLine(g, f, door, false)) && /3 SYMBOLS\/CARD/.test(roomLine(g, f, door, true)));
check(`a teleport before its booth: no name (${roomLine(g, f, tele, true)})`, roomLine(g, f, tele, false).startsWith('TELEPORT') && !roomLine(g, f, tele, false).includes(teleportName(3)));
noteBooth(f, 3);
check(`...and after: its name (${roomLine(g, f, tele, false)})`, roomLine(g, f, tele, false).includes(teleportName(3)) && teleportName(3) === 'KAPPA');
const calm = [...Array(512).keys()].find((r) => !hasDoor(r) && TELEPORT_ROOMS.indexOf(r) < 0 && r !== 199 && !lyingHere(g, r).piece && !lyingHere(g, r).card && !lyingHere(g, r).key);
f.pyramids.push(calm ?? 0);
check(`a pyramid met: ${roomLine(g, f, calm ?? 0, false)} / ${roomLine(g, f, calm ?? 0, true)}`, roomLine(g, f, calm ?? 0, false) === 'CHEOPS PYRAMID' && /PYRAMID: 2 SYMBOLS/.test(roomLine(g, f, calm ?? 0, true)));
check('the core', roomLine(g, f, 199, false) === 'THE CORE');
const pieceRoom = [...rooms][0];
check(`a room with a piece: ENHANCED says so (${roomLine(g, f, pieceRoom, true)}), ORIGINAL does not (${roomLine(g, f, pieceRoom, false)})`, roomLine(g, f, pieceRoom, true).includes('CORE PIECE') && !roomLine(g, f, pieceRoom, false).includes('PIECE'));
const other = [...Array(512).keys()].find((r) => !hasDoor(r) && TELEPORT_ROOMS.indexOf(r) < 0 && r !== 199 && r !== calm && !lyingHere(g, r).piece && !lyingHere(g, r).card && !lyingHere(g, r).key);
check(`a room with nothing: ${roomLine(g, f, other ?? 0, true)}`, roomLine(g, f, other ?? 0, true) === 'NOTHING MARKED');
const longest = Math.max(...[...Array(512).keys()].map((r) => roomLine(g, { entry: {}, booths: [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14], pyramids: [r] }, r, true).length));
check(`every line fits under the map (longest ${longest} of ${LINE_LETTERS} letters)`, longest <= LINE_LETTERS);

// ---- the drawing: marks only with the help ----
const renderer = new PixelRenderer();
const font = gameFont();
const s = renderer.screen;
const cellOf = (room: number) => {
  const cw = Math.floor(MAP_BOX.w / 16), ch = Math.floor((MAP_BOX.h - 22) / 16);
  const ox = MAP_BOX.x + Math.floor((MAP_BOX.w - cw * 16) / 2), oy = MAP_BOX.y + Math.floor((MAP_BOX.h - 22 - ch * 16) / 2);
  return { x: ox + (room & 15) * cw, y: oy + ((room >> 4) % 16) * ch, cw, ch };
};
const draw = (assist: Record<string, boolean>, pick: string | null) => {
  s.pixels.fill(0);
  starquakeMap.draw(s, MAP_BOX, g, f, true, 0, font, pick, assist);
};
const markAt = (room: number, colour: number) => { const c = cellOf(room); return s.pixels[(c.y + 3) * 320 + c.x + 5] === colour; };
const surfacePieces = [...rooms].filter((r) => r < 256 && r !== g.room);
g.room = 8;
draw({ guide: true }, null);
check(`ENHANCED: ${surfacePieces.length} piece rooms on the surface page are marked green`, surfacePieces.every((r) => markAt(r, COL.lgreen)));
draw({ guide: false }, null);
check('ORIGINAL: none are', surfacePieces.every((r) => !markAt(r, COL.lgreen) && !markAt(r, COL.pink)));
if (outDir) {
  fs.mkdirSync(outDir, { recursive: true });
  g.lo.fill(0xff, 0, 64); // every room seen, for the picture
  draw({ guide: true }, String(door));
  indicesPng(path.join(outDir, 'map-enhanced.png'), Uint8Array.from(s.pixels, (v) => (v === 0xff ? 0 : v)), 320, 200);
}
finish();
