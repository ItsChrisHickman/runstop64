/**
 * The creatures of the planet, to choose the parade's: rooms run for a while with BLOB standing (as ending.ts records them), every
 * enemy about (state 3) noted by its kind ($034A: the game draws the kind's frames into the enemy's sprite), the room that showed
 * the most of each kind's frames, and a sheet of them as the figures the parade would show.
 *
 *   nice -n 15 node tools/test.mjs games/starquake/re/cast.ts <out.png> [room ...]
 */
import { PixelRenderer, TRANSPARENT } from 'c64kit';
import { indicesPng } from '../../../tools/probe/render';
import { recordFigure, vicShot, type SpriteShot } from '../../shared/ending/figures';
import { openScene } from '../src/ending';
import { Stage } from '../src/stage';

const [out = '/tmp/cast.png', ...roomArgs] = process.argv.slice(2);
const rooms = roomArgs.length ? roomArgs.map(Number) : Array.from({ length: 170 }, (_, i) => 3 * i + 1);
const FRAMES = 900;
const renderer = new PixelRenderer();
const stage = new Stage(renderer);
/** For each kind: the room with the most frames of it and its moments there. */
const best = new Map<number, { room: number; moments: SpriteShot[][] }>();
for (const room of rooms) {
  const g = stage.fresh();
  let script;
  try { script = openScene(g, { room, spot: { col: 21, row: 16 } }); } catch { continue; }
  const here = new Map<number, SpriteShot[][]>();
  for (let f = 0; f < FRAMES; f++) {
    g.joy = 0x7f;
    script.next();
    stage.update(true);
    for (let n = 4; n < 8; n++) {
      const e = g.enemies[n - 4];
      if (!e || e.state !== 3 || e.kind === 0x0f || (e.dx & 0x80)) continue;
      const shot = vicShot(stage.vic, n);
      if (shot) here.set(e.kind, [...(here.get(e.kind) ?? []), [shot]]);
    }
  }
  for (const [kind, moments] of here) {
    const fig = recordFigure('', moments);
    const prev = best.get(kind);
    const prevFig = prev ? recordFigure('', prev.moments) : null;
    if (!prevFig || (fig?.poses.length ?? 0) > prevFig.poses.length) best.set(kind, { room, moments });
  }
}
const kinds = [...best.keys()].sort((a, b) => a - b);
const W = 6 * 70, H = kinds.length * 60;
const sheet = new Uint8Array(W * H);
kinds.forEach((kind, row) => {
  const fig = recordFigure('', best.get(kind)?.moments ?? []);
  fig?.poses.slice(0, 6).forEach((pose, col) => pose.parts.forEach((part) => {
    const s = part.surface;
    for (let y = 0; y < s.height && y + part.dy < 58; y++) for (let x = 0; x < s.width && x + part.dx < 68; x++) { const v = s.pixels[y * s.width + x]; if (v !== TRANSPARENT) sheet[(row * 60 + y + part.dy) * W + col * 70 + x + part.dx] = v; }
  }));
});
indicesPng(out, sheet, W, H, 1);
kinds.forEach((k, i) => { const b = best.get(k); console.log(i, `kind ${k.toString(16)} room ${b?.room} poses ${recordFigure('', b?.moments ?? [])?.poses.length}`); });
