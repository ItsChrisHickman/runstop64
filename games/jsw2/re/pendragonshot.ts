/**
 * A Pendragon game's pause map with everything lit, for comparing JSW2's map against (blackwyche, karnath).
 *
 *   nice -n 15 node tools/test.mjs games/jsw2/re/pendragonshot.ts <out-dir>
 */
import path from 'node:path';
import { BitmapFont, KIT_GLYPHS, Surface } from 'c64kit';
import { drawPause } from '../../shared/native/pause';
import { indicesPng } from '../../../tools/probe/render';
import { blackwycheMap } from '../../blackwyche/src/map';
import { CABINS, HALLS } from '../../blackwyche/src/ship';
import { placeId } from '../../blackwyche/src/travel';
import { karnathMap } from '../../karnath/src/map';
import { STRIPS } from '../../karnath/src/strips';

const [, , outDir = '/tmp'] = process.argv;
const font = new BitmapFont().addDrawn(KIT_GLYPHS);
const options = [{ text: 'E ENHANCED', check: true }, { text: 'T TITLE' }];

const b = blackwycheMap.found.empty();
for (let deck = 1; deck <= 5; deck++) for (const part of [0, 1]) { b.ship.panels[`${deck}.${part}`] = [0, 1, 2, 3, 4, 5, 6, 7, 8]; b.ship.at[placeId({ kind: 'deck', deck, part })] = [0]; }
for (const h of HALLS) { b.ship.panels[`${h.deck}.${h.part}`] = [1, 2]; b.ship.at[placeId({ kind: 'hall', deck: h.deck, part: h.part })] = [0]; }
for (const c of CABINS) { const id = placeId({ kind: 'cabin', deck: c.deck, part: c.part, door: c.door }); b.ship.cabins.push(id); b.ship.at[id] = [0]; }
const sb = new Surface(320, 200, 0);
drawPause(sb, font, blackwycheMap, new Uint8Array(0x10000), b, 0, options, {});
indicesPng(path.join(outDir, 'pendragon-blackwyche.png'), sb.pixels, 320, 200, 4);

const k = karnathMap.found.empty();
for (const st of STRIPS) k.castle.cells[st.label] = Array.from({ length: 15 }, (_, i) => i);
for (let r = 1; r <= 25; r++) k.castle.rooms.push(r);
const sk = new Surface(320, 200, 0);
drawPause(sk, font, karnathMap, new Uint8Array(0x10000), k, 0, options, {});
indicesPng(path.join(outDir, 'pendragon-karnath.png'), sk.pixels, 320, 200, 4);
