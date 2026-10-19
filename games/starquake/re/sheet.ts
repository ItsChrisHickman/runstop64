import { PixelRenderer } from 'c64kit';
import { indicesPng } from '../../../tools/probe/render';
import { drawRoom } from '../src/room';
import { Stage } from '../src/stage';
import * as Flow from '../src/flow';

/**
 * The rooms as a sheet, two across, as the game draws them (no sprites): to choose places for the montage.
 *
 *   nice -n 15 node tools/test.mjs games/starquake/re/sheet.ts <out.png> <room> ...
 */
const out = process.argv[2] ?? '/tmp/rooms.png';
const rooms = process.argv.slice(3).map(Number);
const renderer = new PixelRenderer();
const stage = new Stage(renderer);
const g = stage.game;
Flow.newGame(g, 1);
const W = 320, H = 200;
const sheet = new Uint8Array(W * 2 * H * Math.ceil(rooms.length / 2));
rooms.forEach((room, n) => {
  g.room = room;
  drawRoom(g);
  stage.update(false);
  const pic = renderer.picture();
  const ox = (n % 2) * W, oy = Math.floor(n / 2) * H;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) sheet[(oy + y) * W * 2 + ox + x] = pic[y * W + x] ?? 0;
});
indicesPng(out, sheet, W * 2, H * Math.ceil(rooms.length / 2), 1);
