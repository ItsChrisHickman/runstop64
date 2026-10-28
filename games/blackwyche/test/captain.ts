/**
 * The captain's blow (src/captain.ts, ENHANCED), as the browser runs it: in his cabin (room $0C,
 * the four pieces of the chart found, the sword in hand) Pendragon walks to the lower plank's left
 * end and swings at the soul in the skull's eye again and again without stopping.
 *
 *  - ENHANCED: the first blow starts the end ($633B 1), the rest of the swings don't restart it: it
 *    runs on to 2 and 3, the captain is freed ($342C 2) within 30 swings (about 10 seconds), and the note ($D40F, the
 *    counter $633E) rises no higher than $20;
 *  - ORIGINAL (as the game was): every swing in contact puts the end back to 1, the counter runs on
 *    past $20 up to $FF (the note a piercing 3.8 kHz) and the captain is not freed in 100 swings.
 *
 *   nice -n 15 node tools/test.mjs games/blackwyche/test/captain.ts
 */
import { check, finish } from '../../shared/test/check';
import { saveAt, Session } from './guided-kit';

const FOUR = { 0x9d64: 1, 0x9d65: 1, 0x9d66: 1, 0x9d79: 1, 0x342b: 1 };
const SWINGS = 100;

/** Swings without a pause at the soul from the lower plank's end: what happened. */
async function fight(enhanced: boolean) {
  const s = await Session.launch(saveAt({ room: 0x0c, flags: FOUR }), enhanced);
  s.tick(60);
  s.walk(['ArrowDown'], () => s.ram[0x3420] >= 122);
  s.walk(['ArrowLeft'], () => s.ram[0x341f] <= 164);
  let swings = 0, firstBlow = 0, peak = 0, endState = 0;
  const watch = () => {
    peak = Math.max(peak, s.ram[0x633e]);
    endState = Math.max(endState, s.ram[0x633b]);
    if (!firstBlow && s.ram[0x633b] >= 1) firstBlow = swings;
  };
  while (swings < SWINGS && s.ram[0x342c] !== 2) {
    swings++;
    s.input.keyDown('KeyX');
    for (let f = 0; f < 14; f++) { s.tick(); watch(); }
    s.input.keyUp('KeyX');
    for (let f = 0; f < 6; f++) { s.tick(); watch(); }
  }
  return { swings, firstBlow, peak, endState, freed: s.ram[0x342c] === 2, frames: s.frames };
}

const enhanced = await fight(true);
check(`ENHANCED: the first swing starts the end (swing ${enhanced.firstBlow}), through 3 to the captain freed in ${enhanced.swings} swings (${enhanced.frames} frames)`, enhanced.firstBlow === 1 && enhanced.endState >= 3 && enhanced.freed && enhanced.swings <= 30);
check(`ENHANCED: the note stops at the counter's $20 (highest ${enhanced.peak})`, enhanced.peak <= 0x20);

const original = await fight(false);
check(`ORIGINAL: swinging on keeps putting the end back: not freed in ${original.swings} swings`, original.firstBlow === 1 && !original.freed);
check(`ORIGINAL: the counter runs past $20 (highest ${original.peak}): the note climbs`, original.peak > 0xf0);

finish();
