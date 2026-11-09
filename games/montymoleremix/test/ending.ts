/**
 * The game's own ending (docs/montymole-remix-plan.md, "The scenes"): room 20's right edge is the way out of the game (Wanted's `$F858`): the game is won, no
 * room is loaded, and the verse is typed, a letter at a time in the bottom row, the text a row up after each line (and a blank one after every fourth), in cyan,
 * then a wait for a key. With an out-dir: the verse's pictures.
 *
 *   nice -n 15 node tools/test.mjs games/montymoleremix/test/ending.ts [out-dir]
 */
import fs from 'node:fs';
import path from 'node:path';
import { indicesPng } from '../../../tools/probe/render';
import { ENDING_VERSE } from '../../montymole/src/data';
import { check, finish } from '../../shared/test/check';
import { VIC_LEFT, VIC_TOP } from '../src/coords';
import { EndingScreen, LEFT, LETTER_FRAMES, VERSE_ROW, WAIT_FRAMES } from '../src/ending-screen';
import { ENDING_ROOM } from '../src/game';
import { normaliseCoal } from './bot';
import { type Play, newGame, NONE, picture, step } from './harness';

const out = process.argv[2];
const shot = (name: string, p: Play): void => {
  if (out === undefined) return;
  fs.mkdirSync(out, { recursive: true });
  indicesPng(path.join(out, name), picture(p.g), 320, 200, 2);
};

// ---- room 20's right edge
const p = newGame();
const g = p.g;
normaliseCoal(g, 20);
g.enterAt(20, (222 + VIC_LEFT) >> 1, VIC_TOP + 3 * 8);
g.graceActive = () => true;
let at = -1;
for (let i = 0; i < 200 && g.finished === null; i++) { step(p, { ...NONE, right: true }); if (g.finished !== null) at = i; }
check(`room 20's right edge ends the game: won (${g.finished}, after ${at + 1} frames), room ${g.roomId}, nothing of it loaded and nothing to start again`, g.finished === 'ending' && g.roomId === ENDING_ROOM && g.freeze === 1 && g.roomExit === 0);
const rooms = g.roomLoads;
for (let i = 0; i < 20; i++) step(p, NONE);
check('the game stands still: no room is loaded after it', g.roomLoads === rooms && g.finished === 'ending');

// ---- the verse
const verse = new EndingScreen(g);
verse.start();
check('the screen is cleared but for the score row, no sprite shown', g.vic.enable === 0 && verse.text().every((l) => l === ''));
const lines = EndingScreen.lines;
check(`the verse is Wanted's (${lines.length} lines of it)`, lines.length === ENDING_VERSE.filter((l) => l !== '').length && lines[0] === 'OUR GALLANT MOLES');
let frames = 0, typedFirst = -1, done = false;
const seen = new Set<string>();
while (!done && frames < 20000) {
  frames++;
  const now = verse.frame(false);
  if (frames % 5 === 0) for (const l of verse.text()) if (l !== '') seen.add(l);
  if (typedFirst < 0 && verse.text()[VERSE_ROW - 2] === lines[0]) typedFirst = frames;
  if (frames === 3 * (lines[0]?.length ?? 0) * LETTER_FRAMES) shot('verse-first-line.png', p);
  if (frames === 900) shot('verse-900.png', p);
  if (now === 'done') done = true;
}
check(`the first line is typed a letter every ${LETTER_FRAMES} frames, in the bottom row, in the first ${typedFirst} frames`, typedFirst === (lines[0]?.length ?? 0) * LETTER_FRAMES);
check(`every line of the verse was seen, whole (${seen.size} of ${lines.length})`, lines.every((l) => seen.has(l)));
check(`after the verse the wait is ${WAIT_FRAMES} frames without a key, and it ends (${frames} frames in all, about ${(frames / 50).toFixed(0)} s)`, done && frames > 1500 && frames < 6000);
check('the text is cyan, from the verse column', g.col[VERSE_ROW * 40 + LEFT] === 3);

// a key ends it after the verse, but not at once
{
  const q = new EndingScreen(g);
  q.start();
  let n = 0, early = false;
  for (; n < 20000; n++) {
    const r = q.frame(true);
    if (r === 'done') break;
  }
  early = n < 1500;
  check(`a key held from the start does not skip the verse (it ends at frame ${n})`, !early && n < WAIT_FRAMES + 6000);
}
finish();
