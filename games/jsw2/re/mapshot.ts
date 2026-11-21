/**
 * Pictures of JSW2's pause map, to look at: the whole mansion lit (as if every room had been in and could be travelled to),
 * and the same with a room picked (the room he is in, and the pick).
 *
 *   nice -n 15 node tools/test.mjs games/jsw2/re/mapshot.ts <out-dir> [room to pick, default 63] [name prefix]
 */
import fs from 'node:fs';
import path from 'node:path';
import { BitmapFont, KIT_GLYPHS, Surface } from 'c64kit';
import { drawPause, MAP_BOX } from '../../shared/native/pause';
import { indicesPng } from '../../../tools/probe/render';
import { MANSION } from '../src/mansion';
import { jsw2Map } from '../src/map';

const [, , outDir = '/tmp', pickArg = '63', prefix = 'map'] = process.argv;
fs.mkdirSync(outDir, { recursive: true });
const rooms = Object.keys(MANSION).map(Number);
const found = { ...jsw2Map.found.empty(), rooms, stand: Object.fromEntries(rooms.map((n): [string, [number, number, number]] => [String(n), [0, 0, 0]])) };
const font = new BitmapFont().addDrawn(KIT_GLYPHS);
const options = [{ text: 'E ENHANCED', check: true }, { text: 'B BACK TO' }, { text: ' ROOM START' }, { text: 'T TITLE' }];
const shot = (name: string, room: number, pick: number | null) => {
  const ram = new Uint8Array(0x10000);
  ram[0x13] = room;
  const s = new Surface(320, 200, 0);
  const at = pick === null ? undefined : jsw2Map.places?.(MAP_BOX, ram, found)?.find((p) => p.id === String(pick));
  drawPause(s, font, jsw2Map, ram, found, 0, options, at ? { pick: { x: at.x, y: at.y, id: at.id } } : {});
  indicesPng(path.join(outDir, `${prefix}-${name}.png`), s.pixels, 320, 200, 4);
};
shot('all', 32, null);
shot(`picked-${pickArg}`, Number(pickArg), Number(pickArg));
shot('picked-32', 32, 32);
