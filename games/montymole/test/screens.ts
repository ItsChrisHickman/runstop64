/**
 * The screens besides the rooms against the original: game over (`$F817`) and the ending (`$CAD1`), the verse typed and scrolled (`VersePrinter`), frame by frame from the
 * moment the original is sent to them (room 0's state, its own interrupts, a player's score in the score line). Each frame of the original is compared with the rebuilt
 * screen of the same frame; the scroll copies 127 lines in a frame and a half, so a frame in which one is under way shows the screen torn between the one before and the one
 * after at a line that varies by a few from one to the next (the rebuilt screen has it at a fixed line: those lines are allowed to differ). The screen when the typing is over, and how long
 * the typing and the wait take, are compared exactly. The options and the title are ours (the words) and the tape's (the picture): see test/data.ts.
 *
 *   nice -n 15 node tools/test.mjs games/montymole/test/screens.ts
 */
import { check, finish } from '../../../games/shared/test/check';
import { bitmapRow } from '../src/room';
import { FIRST_FRAME_LINES, SCROLL_FRAMES, VersePrinter, WAIT_FRAMES } from '../src/screens';
import { A } from './lockstep-core';
import { machineFrom } from './original';

const STATE = 'games/montymole/build/room0.state';
const CLEARING = 3;

/** The screen's bytes (bitmap and attributes) of the original, copied. */
const screenOf = (mem: Uint8Array): Uint8Array => mem.slice(A.screen, A.screen + 6912);
const same = (a: Uint8Array, b: Uint8Array): boolean => a.length === b.length && a.every((v, i) => v === b[i]);
/** Whether the two differ only in the lines round where the scroll has got to (the lines it has copied by the end of the frame vary by a few with the interrupt's time). */
function tornAt(a: Uint8Array, b: Uint8Array): boolean {
  for (let line = 0; line < 192; line++) {
    const at = bitmapRow(line);
    if (line >= 64 + FIRST_FRAME_LINES - 8 && line <= 64 + FIRST_FRAME_LINES + 8) continue;
    for (let i = 0; i < 32; i++) if (a[at + i] !== b[at + i]) return false;
  }
  return a.subarray(6144).every((v, i) => v === b[6144 + i]);
}

function play(name: string, entry: number, ending: boolean, score: readonly number[]): void {
  const m = machineFrom(STATE);
  m.cpu.iff1 = true; m.cpu.iff2 = true;
  score.forEach((d, i) => { m.mem[A.score + i] = d; });
  m.cpu.pc = entry; m.cpu.halted = false;
  const frames = 1700;
  const original: Uint8Array[] = [];
  let waitFrom = -1, ended = -1, frame = 0;
  m.onStep = (pc) => {
    if (pc === 0xf85d && waitFrom < 0) waitFrom = frame; // the wait for a key begins
    if (pc === 0xf7d6 && ended < 0) ended = frame; // `$F7D6`: a new game
  };
  for (frame = 0; frame < frames; frame++) {
    m.runFrame();
    original.push(screenOf(m.mem));
  }
  const printer = new VersePrinter(ending, score);
  const rebuilt: Uint8Array[] = [];
  for (let f = 0; f < frames; f++) {
    printer.step();
    rebuilt.push(new Uint8Array([...printer.screen.bits, ...printer.screen.attrs]));
  }
  // frame by frame, allowing the neighbours (a screen torn in the frame a scroll is made in, the clear taking two frames)
  let exact = 0, near = 0, wrong = 0;
  const wrongAt: number[] = [];
  for (let f = CLEARING; f < Math.min(waitFrom, printer.typingFrames) + 2; f++) { // (the first frames are the clear, which the original takes two frames to make: the old screen going)
    const o = original[f];
    if (o === undefined) break;
    if (same(o, rebuilt[f] ?? o)) exact++;
    else if (tornAt(o, rebuilt[f] ?? o)) near++;
    else { wrong++; wrongAt.push(f); }
  }
  if (wrongAt.length > 0) console.log(`   wrong frames: ${wrongAt.join(' ')}`);
  console.log(`   ${name}: the typing took the original ${waitFrom} frames (the printer ${printer.typingFrames}), the wait to its end ${ended - waitFrom} (${WAIT_FRAMES}); ${exact} frames equal, ${near} equal but for the torn lines, ${wrong} not`);
  const last = original[waitFrom + 2];
  const final = rebuilt[printer.typingFrames + 2];
  check(`${name}: the screen when the typing is over equals the original's`, last !== undefined && final !== undefined && same(last, final));
  check(`${name}: every frame of the typing is the rebuilt screen of that frame, but for the lines the scroll is at (${wrong} are not)`, wrong === 0);
  check(`${name}: the typing takes the original ${waitFrom} frames and the printer ${printer.typingFrames} (within ${SCROLL_FRAMES})`, Math.abs(waitFrom - printer.typingFrames) <= SCROLL_FRAMES);
  check(`${name}: the wait for a key is ${WAIT_FRAMES} frames (the original ${ended - waitFrom})`, Math.abs(ended - waitFrom - WAIT_FRAMES) <= 4);
}

play('game over', 0xf817, false, [7, 2, 0, 0, 0]);
play('the ending', 0xf858, true, [2, 9, 3, 3, 0]);
finish();
