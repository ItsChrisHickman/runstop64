/**
 * Chosen pictures of sprite 2 (numbers from the atlas), numbered, at 4x, in the colours they showed most.
 *   nice -n 15 node tools/test.mjs games/shared/pendragon/study/pick.ts <data dir> <game> <out.png> <id,id,...>
 */
import { indicesPng } from '../../../../tools/probe/render';
import { Canvas, poseSurface, readPoses } from './draw';

const [dir = '', game = '', out = '', list = ''] = process.argv.slice(2);
const byRoom = new Map(readPoses(`${dir}/${game}.json`).map((p) => [p.room, p]));
const ids = list.split(',').filter(Boolean).map(Number);
const S = 4, CW = 24 * S + 10, CH = 42 * S + 20, COLS = Math.min(ids.length, 14);
const cv = new Canvas(COLS * CW, Math.ceil(ids.length / COLS) * CH);
ids.forEach((id, i) => {
  const p = byRoom.get(id);
  if (!p) return;
  const x = (i % COLS) * CW, y = Math.floor(i / COLS) * CH;
  cv.blit(poseSurface(p), x + 5, y + 16, S);
  cv.text(String(id), x + 3, y + 3, 1, 2);
});
indicesPng(out, cv.px, cv.w, cv.h, 1);
