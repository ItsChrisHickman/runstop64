/**
 * The ROM's BEEPER (`$03B5`, DE = how many cycles less one, HL = the pitch word) as the flips of the speaker it makes: every sound
 * of the original (the two tunes, the footstep, the thud, the pick-ups) is a call of it. The routine is a delay loop and a count, so
 * its timing is a formula; the instruction costs below are the Z80's T-states for the instructions at `$03B5-$03F7`, and
 * test/data.ts proves the result equals the speaker log of the model for every note of both tunes and every effect.
 *
 * It feeds c64kit's `renderToggles`, as Moley Christmas's effects do.
 */
import { renderToggles, type Toggles } from 'c64kit';

/** T-states of the delay loop at `$03D6` for B and C: `DEC C; JR NZ`, and each time C reaches 0 `LD C,$3F; DEC B; JP NZ`. */
function delay(b: number, c: number): number {
  let t = 0;
  let bb = b & 255, cc = c & 255;
  for (;;) {
    do {
      cc = (cc - 1) & 255;
      t += cc === 0 ? 4 + 7 : 4 + 12;
    } while (cc !== 0);
    cc = 0x3f;
    bb = (bb - 1) & 255;
    t += 7 + 4 + 10;
    if (bb === 0) return t;
  }
}

/** The speaker's flips of BEEPER called with `de` and `hl`: T-states from its first instruction to the first flip, between flips, and from the last flip to the return. */
export function beeperToggles(de: number, hl: number): Toggles {
  const pad = (~hl) & 3; // `LD IX,$03D1; ADD IX,BC` with C = the low two bits of L, complemented: how many of the three NOPs are skipped
  const l = (hl & 255) >> 2; // `SRL L` twice
  const h = (hl >> 8) & 255;
  const setup = 4 + 4 + 8 + 8 + 4 + 7 + 4 + 7 + 14 + 15 + 13 + 7 + 12 + 7; // DI ... OR $08
  const entry = (3 - pad) * 4 + 4 + 4; // the NOPs left, INC B, INC C
  const lead = setup + 3 * 4 + 4 + 4 + delay(1, pad + 1) + 7 + 7; // (from `$03D1`, first time: the three NOPs, B = 1, C = pad + 1; the port is written 7 T-states into the 11 of OUT)
  const out = 7 + 11; // XOR $10, OUT ($FE),A
  const high = 4 + 4 + 8 + 12 + 4 + 4 + 8 + entry + delay(h + 1, l + 2) + out; // after a flip to the speaker's high: `LD B,H; LD C,A; BIT 4,A; JR NZ; LD C,L; INC C; JP (IX)`
  const low = 4 + 4 + 8 + 7 + 4 + 4 + 7 + 4 + 4 + 6 + 8 + entry + delay(h + 1, l + 1) + out; // after a flip to low: the DE test, `LD A,C; LD C,L; DEC DE; JP (IX)`
  const tail = 4 + 4 + 4 + 8 + 7 + 4 + 4 + 12 + 4 + 10; // after the last flip: the rest of OUT, then (low, DE = 0) ... `JR Z`, EI, RET
  const gaps: number[] = [];
  for (let n = 0; n < 2 * (de & 0xffff) + 1; n++) gaps.push(n % 2 === 0 ? high : low);
  return { lead, gaps, tail };
}

/** A sound as samples at `sampleRate` (peaks at 1 before the game's volume). */
export function beeperSamples(de: number, hl: number, sampleRate: number): Float32Array {
  return renderToggles(beeperToggles(de, hl), sampleRate);
}
