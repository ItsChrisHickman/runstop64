/**
 * The picture through the renderer against the original's screen: random players play from the opening scene and from places in several rooms (the lockstep's, test/lockstep-core.ts),
 * and after every pass the rebuilt game's picture on `MontyView` (c64kit's renderer stood in by games/shared/test/kit.ts: its surface is the picture the browser shows) is
 * compared, pixel for pixel, with what the Spectrum's ULA would show of the original's own memory (`pixelsOf` of its screen and attributes) in the ORIGINAL look; in
 * ENHANCED the scenery has no sprite in it (every pixel it has is in the screen too: the screen is the scenery with the sprites ORed on), and every sprite's pixels, put where
 * the view puts them, are pixels of the screen; the sprites are what the game has (Monty and the things alive in the room).
 *
 *   nice -n 15 node tools/test.mjs games/montymole/test/picture.ts
 */
import { PixelRenderer } from 'c64kit';
import { check, finish } from '../../../games/shared/test/check';
import { centre, PICTURE_HEIGHT, PICTURE_WIDTH, pixelsOf, rowOffset } from '../../../games/shared/spectrum';
import { A, mulberry, OPENING_LAYOUT, ROOM_LAYOUT, Run, Tally, type Keep } from './lockstep-core';
import { RandomPlayer } from './random-player';
import { sceneryBits, spritePlaces } from '../src/scenery';
import { MontyView } from '../src/view';
import type { Control } from '../src/input';

const KEEP: Keep = { opening: true, coal: true, object: true, enemies: true, crusher: true, floor: true, conveyors: true, room17: true, gate: true };
const tally = new Tally();
let compared = 0, differing = 0, sceneryWrong = 0, spritesWrong = 0, spritesSeen = 0, passes = 0;

function play(label: string, state: string, seed: number, layout: typeof OPENING_LAYOUT, place: ((m: import('../../../tools/zx/spectrum').Spectrum) => void) | undefined, count: number): void {
  const rnd = mulberry(seed);
  const control: Control = 1;
  const run = new Run(tally, state, label, control, false, undefined, KEEP, layout);
  if (layout === OPENING_LAYOUT) run.afterSetup = place ?? null;
  const renderer = new PixelRenderer();
  const view = new MontyView(renderer, run.game, 'original');
  const surface = new Uint8Array(320 * 200);
  const scratch = new Uint8Array(PICTURE_WIDTH * PICTURE_HEIGHT);
  const plain = new Uint8Array(6144);
  let entries = run.game.entries;
  run.hooks.passEnd = (_outcome, mem) => {
    const entered = run.game.entries !== entries;
    entries = run.game.entries;
    passes++;
    if (run.game.outcome !== 'playing' || run.game.exitedTo !== null || run.game.room !== (mem[A.room] ?? 0)) return; // (a way out: the original has not drawn the room it leads to yet)
    // the original look: the surface is the ULA's picture of the original's memory
    view.look = 'original';
    view.update();
    const original = centre(pixelsOf(mem.subarray(A.screen, A.screen + 6144), mem.subarray(A.attrs, A.attrs + 768), scratch, false), 0, surface);
    compared++;
    let same = true;
    for (let i = 0; i < original.length && same; i++) if (original[i] !== renderer.screen.pixels[i]) same = false;
    if (!same) differing++;
    // ENHANCED: the scenery is in the screen, and so are the sprites
    const g = run.game;
    if (g.outcome !== 'playing') return;
    sceneryBits(g, plain);
    let inside = true;
    for (let i = 0; i < 6144 && inside; i++) if (((plain[i] ?? 0) & ~(g.field.screen[i] ?? 0)) !== 0) inside = false;
    if (!inside) sceneryWrong++;
    const places = entered ? [] : spritePlaces(g); // (a room just entered has no sprite on its screen yet: they are drawn by the next pass)
    for (const s of places) {
      // (a thing drawn over by another, or by a blank picture of one of the invisible things, has lost its pixels there: only those with a clear box are checked)
      if (s.x === 0 || places.some((o) => o !== s && Math.abs(o.x - s.x) < 16 && Math.abs(o.y - s.y) < 16)) continue;
      spritesSeen++;
      let ok = true;
      for (let r = 0; r < 16 && ok; r++) {
        for (let c = 0; c < 16; c++) {
          if (((s.image[r * 2 + (c >> 3)] ?? 0) & (0x80 >> (c & 7))) === 0) continue;
          const x = s.x + c, y = s.y + r;
          if (x < 0 || x >= 256 || y < 0 || y >= 192) continue;
          if (((g.field.screen[rowOffset(y) + (x >> 3)] ?? 0) & (0x80 >> (x & 7))) === 0) { ok = false; break; }
        }
      }
      if (!ok) spritesWrong++;
    }
  };
  run.play(new RandomPlayer(rnd, control, 0.15, null), count);
}

play('the opening scene', 'games/montymole/build/opening.state', 1, OPENING_LAYOUT, undefined, 400);
for (let k = 0; k < 4; k++) play(`the opening, a different player ${k}`, 'games/montymole/build/opening.state', 10 + k, OPENING_LAYOUT, undefined, 300);
for (let k = 0; k < 6; k++) {
  play(`room 0, a player ${k}`, 'games/montymole/build/room0.state', 100 + k, ROOM_LAYOUT, (m) => { m.mem[A.x] = 0x30 + 8 * k; }, 400);
}
console.log(`   ${passes} passes, ${compared} pictures compared, ${spritesSeen} sprites checked`);
check(`the picture on the renderer equals the original's screen in the ORIGINAL look, every pass (${differing} of ${compared} differ)`, differing === 0 && compared > 1000);
check(`ENHANCED: the scenery has no pixel the screen has not (${sceneryWrong} passes wrong)`, sceneryWrong === 0);
// (a few are drawn over by what the same pass draws into the screen and the picture both: a piece of coal, the crusher, a floor)
check(`ENHANCED: every pixel of every sprite with a clear box is a pixel of the screen, where the view puts it (${spritesWrong} of ${spritesSeen} are not: under 0.5 %)`, spritesWrong * 200 <= spritesSeen && spritesSeen > 1000);
check(`and the game itself equals the original on every pass (${tally.mismatches} differ)`, tally.mismatches === 0);
finish();
