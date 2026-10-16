/**
 * GAME OVER and the ending, the original and the rebuild side by side: the original played into a room from the
 * snapshot, then made to end (`over`: the last life lost at the next step, `ending`: the ending's flag set; one routine
 * for both, $5568), and at every frame of the closing screen the 320 x 200 picture against the rebuild's
 * (src/closing.ts): GAME for 221 frames, OVER for 221, the picture frozen under them with the interrupt chain's side
 * columns going on.
 *
 *   nice -n 15 node tools/test.mjs games/awm/test/closing.ts games/awm/build/play.state [over|ending] [room] [out-dir]
 *
 * Not compared: the frame the routine starts in and the frames the words change in (the original's loop and its
 * interrupts meet in the middle of them). The letters' own colours are masked in both: they are the original's busy
 * loop's counters, whose phase follows the cycles the music driver takes in each interrupt; the rebuild steps them
 * at the loop's average speed (one colour per line of a letter).
 */
import fs from 'node:fs';
import path from 'node:path';
import { unpackState, type FrameCapture } from 'c64kit';
import { indicesPng, renderPixels } from '../../../tools/probe/render';
import { Closing, WORD_FRAMES } from '../src/closing';
import { BOXES } from '../src/panel';
import { Picture } from '../src/picture';
import { applyOriginal, freeSpot, makeGame, startOriginal } from './harness';

const [stateFile, modeArg = 'over', roomArg = '72', outDir] = process.argv.slice(2);
if (!stateFile) throw new Error('usage: closing.ts <play.state> [over|ending] [room] [out-dir]');
const state = unpackState(new Uint8Array(fs.readFileSync(stateFile)));
const W = 320, H = 200;
const room = Number(roomArg);

/** The letters' own colours taken out of a capture (sprites 0-3 where the letters are: y $64 and the rows the rebuild cuts them into). */
function masked(capture: FrameCapture): FrameCapture {
  return { ...capture, sprites: capture.sprites.map((s) => (s.n < 4 && s.y >= 100 && s.y < 121 ? { ...s, colour: 0 } : s)) };
}

// the original, played a little into the room
const walk = modeArg === 'walk';
const spot = walk ? { x: 0x90, y: 0x40 } : freeSpot(room, 1);
const orig = startOriginal(state, room, spot.x, spot.y, walk ? { progress: 0xc3 } : {});
if (walk) {
  // (the entry into room $4D with everything delivered: $5581 puts him in the walk-in; the snapshot start skips that, so it is done here)
  orig.o.ram[0x4f87] = 0x13;
  orig.o.ram[0x4f88] = 0;
  orig.o.ram[0x5c48] = (orig.o.ram[0x5c48] ?? 0) & 0x7f;
}
let now = orig.next(0);
for (let i = 0; i < 20; i++) now = orig.next(0);
// (the walk to the end: the 256th step of state $13 sets the ending's flag, and the next step leaves the main loop for the closing routine)
for (let i = 0; walk && !(now.snap.state === 0x13 && now.snap.step === 0xff) && i < 400; i++) now = orig.next(0);
if (walk && !(now.snap.state === 0x13 && now.snap.step === 0xff)) throw new Error('the walk never reached its last step');
const game = makeGame(now.snap.room);
applyOriginal(game, now);
const pic = new Picture(game);
pic.resume(now.ram[0x4037] ?? 0);
pic.ram.set(now.ram.subarray(0x3808, 0x3880), 0x3808);
pic.ram.set(now.ram.subarray(0x3880, 0x3900), 0x3880);
for (const [col, row] of BOXES) {
  for (const [dc, dr] of [[0, 0], [1, 0], [0, 1], [1, 1]] as const) {
    const at = (row + dr) * 40 + col + dc;
    pic.screen.put(col + dc, row + dr, now.ram[0x400 + at] ?? 0, orig.o.colour[at] ?? 0);
  }
}

// the end: in the original by poking, in the rebuild the same state; one more step of each
const o = orig.o;
let closingFrames = -1;
const step = o.cpu.step.bind(o.cpu);
o.cpu.step = () => {
  if (o.cpu.pc === 0x3540 && closingFrames < 0) closingFrames = 0;
  return step();
};
if (walk) {
  // (nothing to do: the step he is at the end of sets the flag)
} else if (modeArg === 'ending') {
  o.ram[0x402a] = 1;
  game.ended = true;
} else {
  o.ram[0x4048] = 1;
  o.ram[0x4061] = 0x80;
  game.monty.dead = 1;
  game.lives = 0x80;
  pic.assumeLives(0x7f);
}
// (the rebuild's last frames of play: the drawing phase, then the logic phase that ends it)
pic.frameA(game.lift.tick(game.rng));
pic.beginB(game.lift.tick(game.rng));
game.logic(0);
pic.endB();
if (!(game.gameOver || game.ended)) throw new Error('the rebuild does not end the game');
const closing = new Closing(pic.screen, pic.spriteColours);

// the original until the routine's first frame
o.joy1 = o.joy2 = 0x1f;
for (let f = 0; f < 10 && closingFrames < 0; f++) o.runFrame();
if (closingFrames < 0) throw new Error('the original never reached the closing routine');
closing.next();

let same = 0, different = 0, skipped = 0, first = '';
for (let f = 1; f < 2 * WORD_FRAMES; f++) {
  o.runFrame();
  const cap = closing.next();
  if (!cap) throw new Error('the closing ended early');
  if (f === WORD_FRAMES) { skipped++; continue; }
  const a = renderPixels({ ram: o.ram, capture: masked(o.capture) });
  const b = renderPixels({ ram: closing.ram, capture: masked(cap) });
  let count = 0;
  for (let i = 0; i < W * H; i++) if (a[i] !== b[i]) count++;
  if (count === 0) same++;
  else {
    different++;
    if (!first) {
      first = `frame ${f}: ${count} pixels differ`;
      if (outDir) {
        fs.mkdirSync(outDir, { recursive: true });
        indicesPng(path.join(outDir, `closing-${modeArg}-${f}-original.png`), a, W, H);
        indicesPng(path.join(outDir, `closing-${modeArg}-${f}-rebuild.png`), b, W, H);
        indicesPng(path.join(outDir, `closing-${modeArg}-${f}-diff.png`), a.map((v, i) => (v === b[i] ? 0 : 2)), W, H);
      }
    }
  }
  if (outDir && (f === 100 || f === WORD_FRAMES + 100)) {
    fs.mkdirSync(outDir, { recursive: true });
    indicesPng(path.join(outDir, `still-${modeArg}-${room}-${f}.png`), renderPixels({ ram: closing.ram, capture: cap }), W, H);
  }
}
console.log(`closing (${modeArg}, room ${room}): ${same + different} frames compared, ${same} same, ${different} different, ${skipped} word change skipped${first ? `; first: ${first}` : ''}`);
if (different > 0) process.exit(1);
