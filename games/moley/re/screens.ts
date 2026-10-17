/**
 * Writes PNGs of the credits page, GAME OVER and the Christmas card, to look at: the original's screen beside the rebuilt one at the
 * same frame, each in the 320 x 200 surface the renderer is given (border colour round it, the Spectrum's colours), side by side in one
 * sheet. The original is played to its ending and to a game over by a bot (test/flow-core.ts), and the flow runs beside it.
 *
 *   nice -n 15 node tools/test.mjs games/moley/re/screens.ts <out-dir> [scale]
 *
 * Writes `credits.png`, `game-over.png` (a few frames in, and its last), `card.png` (some way into the scroller) and `start.png`.
 */
import fs from 'node:fs';
import path from 'node:path';
import { palettePng } from '../../../tools/png';
import { pixelsOf } from '../src/display';
import { SPECTRUM_PALETTE } from '../src/palette';
import { BORDER, centre, SURFACE_HEIGHT, SURFACE_WIDTH } from '../src/view';
import { atStart, either, type End, follow, holding, idle, type Pic, reach, type Span } from '../test/flow-core';
import { Player } from '../test/players';

const [outDir, scaleArg = '3'] = process.argv.slice(2);
if (outDir === undefined) throw new Error('usage: screens.ts <out-dir> [scale]');
fs.mkdirSync(outDir, { recursive: true });
const scale = Number(scaleArg);
const STATES = 'games/moley/build';
const BITMAP = 6144;

const surface = (pic: Pic): Uint8Array => centre(pixelsOf(pic.subarray(0, BITMAP), pic.subarray(BITMAP), new Uint8Array(256 * 192), false), BORDER, new Uint8Array(SURFACE_WIDTH * SURFACE_HEIGHT));

/** The flow's picture at a frame. */
function flowAt(spans: readonly Span[], frame: number): Pic {
  for (const span of spans) if (frame >= span.start && frame < span.start + span.step.frames) return span.pic;
  throw new Error(`no step at frame ${frame}`);
}

/** The original's screen and the flow's side by side. */
function sheet(file: string, e: End, spans: readonly Span[], frame: number): void {
  const original = e.rec.at(frame);
  if (original === undefined) throw new Error(`no frame ${frame}`);
  const both = new Uint8Array(SURFACE_WIDTH * 2 * SURFACE_HEIGHT);
  [surface(original), surface(flowAt(spans, frame))].forEach((p, i) => {
    for (let y = 0; y < SURFACE_HEIGHT; y++) both.set(p.subarray(y * SURFACE_WIDTH, (y + 1) * SURFACE_WIDTH), y * SURFACE_WIDTH * 2 + i * SURFACE_WIDTH);
  });
  palettePng(path.join(outDir, file), both, SURFACE_WIDTH * 2, SURFACE_HEIGHT, SPECTRUM_PALETTE, scale);
  console.log(`${file}: frame ${frame - e.p0} after the last pass began (left the original, right the rebuilt)`);
}

// the ending: the card, 120 frames into its scroller; the credits page after it, 60 frames into its scroller; a game started
const ending = reach('room 5 to the ending', `${STATES}/room5.state`, atStart(0x28, 0x70), new Player(), 8000);
if (ending === null) throw new Error('the bot did not reach the ending');
{
  const t = ending.end;
  const script = either(holding('Z', t + 150, t + 153), holding('SPACE', t + 150 + 48 + 40, t + 150 + 48 + 43));
  const { spans } = follow(ending, script, 340);
  sheet('card.png', ending, spans, ending.p0 + 51 + 5 + 100);
  sheet('credits.png', ending, spans, t + 150 + 48 + 30);
  sheet('start.png', ending, spans, t + 150 + 48 + 40 + 12);
}

// a game over: the gauge runs out with no life left
const over = reach('time out, no life left', `${STATES}/play.state`, atStart(0x04, 0x64, 0, 3), idle, 5000);
if (over === null) throw new Error('no game over');
{
  const t = over.end;
  const { spans } = follow(over, holding('SPACE', t + 100 + 48 + 30, t + 100 + 48 + 33), 270);
  sheet('game-over.png', over, spans, over.p0 + 95 + 30);
  sheet('game-over-dying.png', over, spans, over.p0 + 70);
}
