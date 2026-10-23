/**
 * Every distinct picture of sprite 2 the collector found in a game, numbered, most shown first, at 3x (to look at and to name the poses by).
 *   nice -n 15 node tools/test.mjs games/shared/pendragon/study/atlas.ts <data dir> <game> <out.png>
 */
import { indicesPng } from '../../../../tools/probe/render';
import { Canvas, mainColours, poseSurface, readPoses } from './draw';

const [dir = '', game = '', out = ''] = process.argv.slice(2);
const poses = readPoses(`${dir}/${game}.json`).sort((a, b) => a.room - b.room);
const S = 3, CW = 24 * S + 8, CH = 42 * S + 18, COLS = 16;
const cv = new Canvas(COLS * CW, Math.ceil(poses.length / COLS) * CH);
poses.forEach((p, i) => {
  const x = (i % COLS) * CW, y = Math.floor(i / COLS) * CH;
  cv.blit(poseSurface(p), x + 4, y + 14, S);
  cv.text(String(i), x + 2, y + 2, 1, 2);
});
indicesPng(out, cv.px, cv.w, cv.h, 1);
poses.forEach((p, i) => console.log(`${i}\t${p.count}\t${mainColours(p).join('/')}${p.multicolour ? ' mc' : ''}${p.expandX ? ' xx' : ''}${p.expandY ? ' xy' : ''}\t${p.sources.map((a) => a.toString(16)).join(',')}\t${p.contexts.slice(0, 3).join(' | ')}`));
