/**
 * The HD GPU test page's fixtures (games/hdtest.html, games/hdtest/fixture.ts): two frames of
 * Blackwyche's HD view, the deck and the cabin with the lanterns, at the frames of the route its HD
 * test looks at (games/blackwyche/test/hd.ts: `rooms`), each as the drawing layer is given it (the
 * room, the sprites, the C64's picture, the time, the size) and as the software renderer draws it
 * (packages/c64kit/test/hd-raster.ts) at that size, a PNG beside it. Written to test/fixtures/;
 * run again after a change to the look or the builder, and commit what it writes.
 *
 *   nice -n 15 node tools/test.mjs games/blackwyche/test/hd-fixtures.ts [out-dir]
 */
import fs from 'node:fs';
import zlib from 'node:zlib';
import { NativeHost } from '../../shared/native/host';
import { port } from '../src/native';
import { blackwycheHd } from '../src/hd';
import { routeWalker } from '../../shared/test/hd';
import { obliqueRoom } from '../../../packages/c64kit/src/hd/oblique';
import { HdModel, spritesFromCapture } from '../../../packages/c64kit/src/hd/scene';
import { rasteriseHd } from '../../../packages/c64kit/test/hd-raster';
import { joinLayers, renderPixels, rgbPng, shownLayers } from '../../../tools/probe/render';
import { encodeFixture, type HdFixture } from '../../hdtest/fixture';

const outDir = process.argv[2] ?? 'games/blackwyche/test/fixtures';
fs.mkdirSync(outDir, { recursive: true });
const title = new Uint8Array(fs.readFileSync('games/blackwyche/assets/blackwyche-title.state'));
/** The time drawn at (as the HD test's stills), and the scale (the picture 960×600: the layer draws its scene at most 600 lines high). */
const T = 1000, S = 3;

// (his energy kept up along the route, as the HD test does)
const w = routeWalker({ port, title, routes: 'games/blackwyche/re/routes.json', cheat: (ram) => { ram[0x9d77] = 100; ram[0x3417] = 0; } });
for (const [name, frame] of [['deck', 1050], ['cabin', 3750]] as const) {
  const g = NativeHost.resume(port, w.at(frame));
  g.tick();
  const m = g.m, room = obliqueRoom(blackwycheHd, m.ram, m.capture), sprites = spritesFromCapture(m.capture), { fore, back } = shownLayers(m);
  const picture = renderPixels(m);
  const fixture: HdFixture = { name, t: T, view: { w: 320 * S, h: 200 * S }, room, sprites, front: fore, back, background: 0, picture };
  const bytes = zlib.deflateSync(encodeFixture(fixture));
  fs.writeFileSync(`${outDir}/${name}.hd.bin`, bytes);
  const hd = rasteriseHd(new HdModel().frame(T, room, sprites, fore), picture, joinLayers(fore, back), S);
  rgbPng(`${outDir}/${name}.sw.png`, hd.rgb, hd.W, hd.H, 1);
  console.log(`${name} (frame ${frame}): ${room.surface.count} quads, ${sprites.length} sprites, ${room.lights.length} lights; fixture ${(bytes.length / 1024).toFixed(0)} KB, ${outDir}/${name}.sw.png`);
}
