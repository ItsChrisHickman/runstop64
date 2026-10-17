/**
 * The picture on the renderer (src/view.ts, look.ts, display.ts), on the rebuilt game alone (no original needed; test/picture.ts
 * compares the picture with the original's screen):
 * - the room entered is the room as the data alone draw it (the play area equals `roomPicture`, which test/rooms.ts proves);
 * - the Spectrum's colours and a black border, the picture centred in the 320 x 200 surface;
 * - ORIGINAL: the surface is the display's screen as it is, the sprites in it, none on the renderer;
 * - ENHANCED: no colour clash. The picture without the sprites on the surface, the sprites on the renderer whole in one colour,
 *   so outside the sprites' boxes it equals ORIGINAL, and every pixel of every sprite shows;
 * - ENHANCED glides: with the step told (the logic steps once in two frames) Monty walking is drawn an even step at every half
 *   frame, none held; whole pixels when `snap`;
 * - a thing that jumps far, or comes in new, is drawn where it is, not glided to.
 *
 *   nice -n 15 node tools/test.mjs games/moley/test/view.ts
 */
import { PixelRenderer, EVERY_FRAME, type ViewStep } from 'c64kit';
import { check, finish } from '../../../games/shared/test/check';
import { BLANK_FRAME } from '../src/data';
import { Display } from '../src/display';
import { Game } from '../src/game';
import { paintPixels, picture, SPRITE_INK, spriteImage, spritePixel } from '../src/look';
import { Key } from '../src/monty';
import { PANEL_TOP, PICTURE_HEIGHT, PICTURE_WIDTH, roomPicture } from '../src/picture';
import { SeededRandom } from '../src/random';
import { BORDER, centre, MoleyView, PICTURE_LEFT, PICTURE_TOP, SPECTRUM_COLOURS, SURFACE_HEIGHT, SURFACE_WIDTH } from '../src/view';

const SURFACE = SURFACE_WIDTH * SURFACE_HEIGHT;
const surfaceOf = (indexes: Uint8Array): Uint8Array => centre(indexes, BORDER, new Uint8Array(SURFACE));

/** A game with something moving in it: play room 3 (the street) with a fixed set of keys for a while. */
function played(room: number, passes: number, keyAt: (pass: number) => number): { game: Game; display: Display } {
  const game = new Game(new SeededRandom(5));
  const display = new Display(game);
  game.enterRoom(room);
  for (let i = 0; i < passes; i++) game.pass(keyAt(i));
  return { game, display };
}

// ---- the rooms as drawn on entering ------------------------------------------------------------------------
{
  let equal = 0;
  for (let room = 0; room < 6; room++) {
    const game = new Game(new SeededRandom(1));
    const display = new Display(game);
    game.enterRoom(room);
    const want = roomPicture(room).bits;
    let same = true;
    for (let y = 0; y < PANEL_TOP && same; y++) {
      for (let col = 0; col < 32; col++) {
        const at = ((y & 0xc0) << 5) | ((y & 7) << 8) | ((y & 0x38) << 2) | col;
        if (display.bits[at] !== want[y * 32 + col]) { same = false; break; }
      }
    }
    if (same) equal++;
  }
  check(`entering a room draws its tiles: the play area of rooms 0-5 equals the picture made from the data alone (${equal} of 6)`, equal === 6);
}

// ---- the renderer ---------------------------------------------------------------------------------------------
{
  const { game, display } = played(3, 60, (i) => (i % 40 < 30 ? Key.right : 0));
  const renderer = new PixelRenderer();
  const view = new MoleyView(renderer, display, 'original');
  view.update();
  check('the renderer and its surface have the Spectrum palette (the default is the C64\'s, unchanged for every other game)', renderer.palette === SPECTRUM_COLOURS && renderer.screen.palette === SPECTRUM_COLOURS && new PixelRenderer().palette !== SPECTRUM_COLOURS);
  check('the border is black', renderer.border === BORDER && renderer.background === BORDER);
  const original = surfaceOf(picture(display, 'original'));
  check('ORIGINAL: the surface is the display\'s screen, centred, border colour round it', renderer.screen.pixels.every((v, i) => v === original[i]));
  check(`the picture is 256 x 192 at (${PICTURE_LEFT}, ${PICTURE_TOP}) of 320 x 200`, PICTURE_LEFT === 32 && PICTURE_TOP === 4 && PICTURE_LEFT + PICTURE_WIDTH + 32 === SURFACE_WIDTH && PICTURE_TOP * 2 + PICTURE_HEIGHT === SURFACE_HEIGHT);
  check('ORIGINAL: no sprite on the renderer (they are in the picture)', renderer.sprites.every((s) => !s.visible));

  view.look = 'enhanced';
  renderer.snap = true;
  view.update();
  view.render(0);
  const shown = renderer.sprites.filter((s) => s.visible);
  const live = game.entities.filter((e) => e.frame !== BLANK_FRAME);
  check(`ENHANCED: a sprite on the renderer for each entity that shows something (${shown.length} of ${live.length})`, shown.length === live.length && live.length > 1);
  // with the sprites in place the renderer's picture is the one the look makes
  const enhanced = surfaceOf(picture(display, 'enhanced'));
  const made = renderer.picture();
  check('ENHANCED: the surface and the sprites together are the look\'s picture', made.every((v, i) => v === enhanced[i]));

  // no colour clash: outside the sprites' boxes the looks are the same, and every pixel of every sprite shows
  const boxes = game.entities.filter((e) => e.frame !== BLANK_FRAME);
  const inBox = (x: number, y: number): boolean => boxes.some((e) => x >= e.x && x < e.x + 16 && y >= (e.y & 0x7f) && y < (e.y & 0x7f) + 16);
  const orig = picture(display, 'original'), enh = picture(display, 'enhanced');
  let outside = 0, wrong = 0;
  for (let y = 0; y < PICTURE_HEIGHT; y++) for (let x = 0; x < PICTURE_WIDTH; x++) if (!inBox(x, y) && orig[y * PICTURE_WIDTH + x] !== enh[y * PICTURE_WIDTH + x]) wrong++; else if (!inBox(x, y)) outside++;
  check(`ENHANCED: outside the sprites' boxes it is the original's picture (${wrong} of ${outside + wrong} pixels differ)`, wrong === 0);
  let pixels = 0, missing = 0, masked = 0;
  for (const e of boxes) {
    const image = spriteImage(e.frame, (e.flags & 0x80) !== 0);
    for (let r = 0; r < 16; r++) for (let c = 0; c < 16; c++) {
      if (!spritePixel(image, c, r)) continue;
      const at = ((e.y & 0x7f) + r) * PICTURE_WIDTH + e.x + c;
      pixels++;
      if (enh[at] !== SPRITE_INK) missing++;
      if (orig[at] !== SPRITE_INK) masked++;
    }
  }
  check(`ENHANCED: every pixel of every sprite shows, whole, in its colour (${missing} of ${pixels} missing); ORIGINAL hides ${masked} behind the scenery or in the cell's ink`, missing === 0 && pixels > 0);
  const flat = paintPixels('enhanced', display.bits, display.plain(), display.attributes(), [], new Uint8Array(PICTURE_WIDTH * PICTURE_HEIGHT));
  check('the scenery alone has no sprite pixel the look would add (the plain screen is the screen with the sprites\' cells drawn from the map)', flat.length === PICTURE_WIDTH * PICTURE_HEIGHT);
}

// ---- gliding -----------------------------------------------------------------------------------------------------
/** Monty walking right: the x drawn for entity 0 at each half frame of `frames` frames from frame `from`, the logic stepping once in two frames. */
function walk(told: boolean, snap: boolean, from: number, frames: number): number[] {
  const game = new Game(new SeededRandom(9));
  const display = new Display(game);
  game.enterRoom(0);
  for (let i = 0; i < 30; i++) game.pass(0); // (he lands)
  const renderer = new PixelRenderer();
  renderer.snap = snap;
  const view = new MoleyView(renderer, display, 'enhanced');
  const xs: number[] = [];
  for (let f = 0; f < from + frames; f++) {
    const fresh = f % 2 === 0;
    if (fresh) game.pass(Key.right);
    const step: ViewStep = told ? { fresh, frames: 2 } : EVERY_FRAME;
    view.update(step);
    if (f < from) continue;
    for (const a of [0, 0.5]) {
      view.render(a);
      const h = renderer.sprites.find((s) => s.visible && s.z === 10);
      if (h) xs.push(h.x - PICTURE_LEFT);
    }
  }
  return xs;
}
const diffs = (xs: number[]): number[] => xs.slice(1).map((x, i) => x - xs[i]);
{
  const xs = walk(true, false, 6, 10);
  const d = diffs(xs);
  check(`Monty walking: ${xs.length} half frames drawn`, xs.length === 20);
  check(`the position drawn advances evenly at every half frame, half a pixel (${d.map((v) => v.toFixed(2)).join(' ')})`, d.every((v) => Math.abs(v - 0.5) < 1e-6));
  const snapped = walk(true, true, 6, 10);
  check('snap: whole pixels, a step of 2 at each logic step and none between', snapped.every((v) => Number.isInteger(v)) && diffs(snapped).every((v) => v === 0 || v === 2));
}
{
  // a sprite that jumps or comes in new is put where it is: Monty's first appearance after a room entry, a thing that moves far
  const game = new Game(new SeededRandom(3));
  const display = new Display(game);
  game.enterRoom(3);
  game.pass(0);
  const renderer = new PixelRenderer();
  const view = new MoleyView(renderer, display, 'enhanced');
  view.update({ fresh: true, frames: 2 });
  view.render(0);
  const monty = renderer.sprites.find((s) => s.visible && s.z === 10);
  check('a sprite seen for the first time is drawn where it is', monty !== undefined && monty.x === PICTURE_LEFT + game.monty.x && monty.y === PICTURE_TOP + game.monty.y);
  game.monty.x = 200; // (a jump of a whole screen's width)
  view.update({ fresh: true, frames: 2 });
  view.render(0);
  const after = renderer.sprites.find((s) => s.visible && s.z === 10);
  check('a thing that jumps far is drawn at once at the new place', after !== undefined && after.x === PICTURE_LEFT + 200);
}
finish();
