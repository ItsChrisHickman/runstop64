import { cpu } from '../../shared/native/cpu';
import * as engine from './gen/engine';

/**
 * Thing on a Spring, ENHANCED: the original's play made kinder, so the factory can be played
 * through without wrestling Thing (the original is one switch away: ORIGINAL). One set, chosen
 * as a whole; each part is checked against the original by playing (test/assists.ts):
 *
 * - air: in the air the joystick steers him, and a wall stops him instead of throwing him back;
 * - grace: a bounce asked for just after walking off an edge still goes, and one asked for just
 *   before landing goes on landing;
 * - landing: catching a ledge's edge (by up to a character) puts him on it;
 * - fall: falls no faster than 4 pixels a frame (the original: 8);
 * - drain: the oil lasts twice as long;
 * - topup: continuing after the oil ran out starts with at least half.
 *
 * They work on the game's own movement, as the game keeps it (see re/README.md): the game moves
 * Thing once a frame, in its raster interrupt ($4613 → $4893), and reads the joystick in the
 * other half of the frame ($7D50), so what's set between frames is what the next frame's movement
 * starts from; and at the game's own moments, the hooks in re/engine.json (a wall stopping him,
 * oil being taken), as its code reaches them.
 *
 * How Thing moves ($4893): on his feet, the joystick walks him (a unit, two pixels, a frame);
 * fire with left or right is the big bounce ($55 = 1: he rises by the steps at $487B, $56 the
 * step, then falls), pulling down and letting go a straight-up one. Walking off an edge he
 * falls ($53 = 1: by the steps at $486A, up to 8 pixels a frame). In the air the joystick does
 * nothing: he keeps the way he left the ground ($5B left, $5C right, bit 7), and a wall in the
 * way throws him back the other way ($4A8C/$4AAC). A ceiling ends a bounce (and costs oil).
 * $07/$08/$09/$0A/$0B: the joystick (left, right, up, down, fire), bit 7 when held now (the
 * bits below: the reads before).
 */
export const PARTS = ['air', 'grace', 'landing', 'fall', 'drain', 'topup'] as const;
export type Part = typeof PARTS[number];

const held = (ram: Uint8Array, a: number) => (ram[a] & 0x80) !== 0;
/** In the air by his own bounce or fall (not riding a slope, a pole, a belt, a spring or a tube). */
const airborne = (ram: Uint8Array) => (ram[0x55] || ram[0x53]) && !ram[0x7a] && !ram[0x76] && !ram[0x72] && !ram[0x83] && !ram[0x87];
const standing = (ram: Uint8Array) => !ram[0x55] && !ram[0x53] && !ram[0x7a] && !ram[0x76] && !ram[0x83] && !ram[0x87];
/** In play, Thing moving (not between screens, in the lift, or at the end). */
const moving = (ram: Uint8Array) => !ram[0x63] && !ram[0x5d] && !ram[0x1c] && ram[0x0d] !== 2;

/** The game's own big bounce, started as $493A starts it (with its sound, $C00F with 4). */
function bounce(ram: Uint8Array, right: boolean) {
  ram[0x55] = 1; ram[0x56] = 0; ram[0x53] = 0;
  ram[0x76] = 0; ram[0x62] = 0; ram[0x7a] = 0; ram[0x54] = 0;
  ram[0x5b] = right ? 0 : 0x81; ram[0x5c] = right ? 0x81 : 0;
  const regs = { ...cpu };
  cpu.a = 4;
  engine.r_c00f();
  Object.assign(cpu, regs);
}

// ---- the map, as the movement code reads it ----------------------------------------------------

/**
 * The screen's map character at Thing's column + dc, row + dr, where his column and row are
 * $462E's: ($1D - 12) / 4 + $19 (one more left of the middle) and page ($1E - $64) / 8 + $E0.
 */
function around(ram: Uint8Array, dc: number, dr: number) {
  const col = ((ram[0x1d] - 0x0c) >> 2) + ram[0x19] + (ram[0x1d] < 0x54 ? 1 : 0) + dc;
  const page = (((ram[0x1e] - ram[0x64]) & 0xff) >> 3) + 0xe0 + dr;
  return ram[((page & 0xff) << 8) | (col & 0xff)];
}
/** Characters the sideways checks ($4AC6, $4B40) let Thing through (not doorways, nor anything that costs oil). */
const open = (c: number) => c === 0x20 || c < 3 || (c >= 0x0a && c < 0x12) || c === 0x2b;
/** A character that stops him sideways: a ledge to land on (not a doorway $32/$33, nor live wires). */
const ledge = (c: number) => !open(c) && c !== 0x32 && c !== 0x33 && c !== 0x2e && c !== 0x31 && c !== 0x6a && c !== 0x6b;

// ---- ENHANCED ----------------------------------------------------------------------------

/** The fall, a step a frame ($486A, from the fall's start): the original's (up to 8), and a gentler one (up to 4). */
export const FALL = [1, 1, 1, 1, 1, 2, 2, 2, 3, 3, 4, 4, 5, 6, 7, 8];
export const GENTLE_FALL = [1, 1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 4];

/** How long after walking off an edge a bounce still goes from it, and how early one can be asked for before landing (frames). */
export const GRACE = { after: 6, before: 8 };

/**
 * Landing help, at the moment a wall stops him in the air (going right, or left): if the wall is
 * only in his lowest row, with room above it to stand (his width) and open space above him, he goes up level with its top
 * and on over it with the last few pixels of a bounce. Whether it did.
 */
function ontoLedge(ram: Uint8Array, right: boolean) {
  const dc = right ? 3 : -1;
  // the wall is only in his lowest row; above it, and above him (two rows: the lift and the hop), it's open
  if (!ledge(around(ram, dc, 2))) return false;
  // (and room to stand on it: his width beyond the edge, open from his height up)
  for (let k = 0; k < 3; k++) for (const dr of [-2, -1, 0, 1]) if (!open(around(ram, dc + (right ? k : -k), dr))) return false;
  for (let c = 0; c < 3; c++) for (const dr of [-2, -1]) if (!open(around(ram, c, dr))) return false;
  // up level with its top (his feet at a character's edge, a row higher)
  ram[0x1e] -= (((ram[0x1e] - ram[0x64]) & 0xff) & 7) + 1;
  // the bounce's last steps (no more than 7 pixels up in all, from the table at $487B as it is now)
  let k = 0, rest = 0;
  for (let i = 0x487b; ram[i] !== 0xff && i < 0x4893; i++) k = i - 0x487b;
  for (rest = ram[0x487b + k]; k > 1 && rest + ram[0x487b + k - 1] <= 7; k--) rest += ram[0x487b + k - 1];
  ram[0x55] = 1; ram[0x53] = 0; ram[0x56] = k - 1; ram[0x57] = 0x81; ram[0x58] = 0;
  // going on as he was
  ram[0x5b] = right ? 0 : 0x81; ram[0x5c] = right ? 0x81 : 0;
  return true;
}

/** ENHANCED, with what it keeps between frames. */
export function makeEnhanced() {
  let last = { air: false, standing: false };
  let sinceEdge = 99, asked = 99, askedRight = false;
  let drains = 0, helped = false;

  /** In the air the joystick steers (left or right turns him that way; let go, he keeps going as he was). */
  function air(ram: Uint8Array) {
    if (!moving(ram) || !airborne(ram)) return;
    if (held(ram, 0x07) && !held(ram, 0x08)) { ram[0x5b] = 0x81; ram[0x5c] = 0; }
    else if (held(ram, 0x08) && !held(ram, 0x07)) { ram[0x5b] = 0; ram[0x5c] = 0x81; }
  }

  /** A bounce asked for just after walking off an edge still goes ("coyote time"); one asked for just before landing goes on landing. */
  function grace(ram: Uint8Array) {
    if (!moving(ram)) return;
    const ask = held(ram, 0x0b) && held(ram, 0x07) !== held(ram, 0x08);
    const right = held(ram, 0x08);
    // walked off an edge: a fall starting this frame, from his feet (on a floor, not riding anything)
    if (ram[0x53] && !ram[0x55] && last.standing && !last.air) sinceEdge = 0; else sinceEdge++;
    if (ask) { asked = 0; askedRight = right; } else asked++;
    if (ram[0x53] && !ram[0x55] && sinceEdge <= GRACE.after && ask && airborne(ram)) {
      // off he goes, from where he's fallen to (a few pixels below the edge)
      bounce(ram, right);
      sinceEdge = 99; asked = 99;
    } else if (standing(ram) && last.air && asked <= GRACE.before && !ask) {
      // landed with a bounce asked for (and let go): it goes now, as if still held
      bounce(ram, askedRight);
      asked = 99;
    }
  }

  /** Falls no faster than 4 pixels a frame: the fall's table ($486A), its step held short of the original's 8 at $487A. */
  function fall(ram: Uint8Array, on: boolean) {
    if (ram[0x486a + 15] !== (on ? GENTLE_FALL : FALL)[15]) ram.set(on ? GENTLE_FALL : FALL, 0x486a);
    if (on && ram[0x53] && ram[0x56] > 14) ram[0x56] = 14;
  }

  /** After each frame, with which parts are on (in play). */
  function afterFrame(ram: Uint8Array, on: (p: Part) => boolean) {
    if (on('air')) air(ram);
    if (on('grace')) grace(ram);
    fall(ram, on('fall'));
    // what's needed of this frame for the next
    if (standing(ram)) helped = false;
    last = { air: !!airborne(ram), standing: standing(ram) && !ram[0x72] && moving(ram) };
  }

  /**
   * The game's own moments (the hooks in re/engine.json), as its code reaches them:
   * - $4A9B / $4ABB: a wall stops Thing going left / right, and the game has just turned him round
   *   ($5B/$5C). Landing help takes him up onto a ledge there (once between landings: a ledge too
   *   narrow to stand on doesn't keep him hopping); air control (in the air) stops him instead.
   * - $56E0: oil is about to be taken, A what will be left (carry clear: none). Slow drain: every
   *   other time, nothing is taken (A as it was, carry set: not run out).
   */
  function hook(pc: number, ram: Uint8Array, on: (p: Part) => boolean) {
    if (pc === 0x56e0) {
      if (on('drain') && (drains++ & 1)) { cpu.a = ram[0x8f]; cpu.c = 1; }
      return;
    }
    if (pc !== 0x4a9b && pc !== 0x4abb) return;
    // (in the air, by his own bounce or fall; not a doorway, which takes the same way out)
    if (!airborne(ram) || ram[0x5d] || ram[0x63]) return;
    const right = pc === 0x4abb;
    if (on('landing') && !helped && ontoLedge(ram, right)) { helped = true; return; }
    if (on('air')) { ram[0x5b] = 0; ram[0x5c] = 0; }
  }

  /** Continuing after the oil ran out (a save from the room's start): at least half full. */
  function onContinue(ram: Uint8Array, on: (p: Part) => boolean) { if (on('topup') && ram[0x8f] < 0x80) ram[0x8f] = 0x80; }

  return { afterFrame, hook, onContinue };
}
