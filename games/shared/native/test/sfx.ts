/**
 * The overlay sound effects (packages/c64kit/src/sid/sfx.ts) are for a fight's moments, not a hiss over the game's own sound
 * (Chris: "a hissing sound effect happens a lot", "strange high-pitched frequency sounds"): every voice's pitch stays low
 * (the noise was swept from 5,200 Hz, near the top of the register), every voice ends with its gate closed (none is left
 * sounding), and a frame the game did not run sends no writes (the front end used to send the last frame's again).
 *
 *   nice -n 15 node tools/test.mjs games/shared/native/test/sfx.ts
 */
import { SFX, SFX_NAMES } from '../../../../packages/c64kit/src/sid/sfx';
import { check, finish } from '../../test/check';

const MAX_HZ = 2000;
for (const name of SFX_NAMES) {
  SFX[name].forEach((program, v) => {
    let hz = 0, gate = false, writes = 0;
    let freq = 0;
    for (const step of program) for (const [reg, value] of step) {
      writes++;
      if (reg === 0) freq = (freq & 0xff00) | value;
      if (reg === 1) { freq = (freq & 0xff) | (value << 8); hz = Math.max(hz, (freq * 985248) / 16777216); }
      if (reg === 4) gate = (value & 1) === 1;
    }
    check(`${name}, voice ${v}: pitch up to ${Math.round(hz)} Hz (at most ${MAX_HZ}), ends with the gate closed (${gate ? 'open' : 'closed'}), ${writes} writes`, hz <= MAX_HZ && !gate);
  });
}
finish();
