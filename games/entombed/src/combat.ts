import type { CombatHook, CombatSpec } from '../../shared/native/combat';
import { pendragonControls, type ControlsSpec } from '../../shared/native/controls';
import * as engine from './gen/engine';

/**
 * Entombed's fights, read from its code (re/README.md, "Combat"): where the whip destroys a
 * monster, where Pendragon starts being hurt, where the whip is swung; and his own steps into
 * and out of the picture, for the 8-way controls.
 *
 * The game keeps the sprite collisions it read this frame at $3214 (Pendragon is sprite 2,
 * the whip sprite 3): the monster in a collision is the other bit. One of the corridors'
 * monsters is drawn as sprite 1 or 6 (in front of him or behind), and the collision read can be
 * last frame's: either is it.
 */
const other = (ram: Uint8Array) => {
  const bits = ram[0x3214] & ~0x0c;
  for (let n = 0; n < 8; n++) if (bits & (1 << n)) return n === 1 ? [1, 6] : n === 6 ? [6, 1] : n;
  return -1;
};
const hurt: CombatHook = { kind: 'hurt', sprite: other };
const kill: CombatHook = { kind: 'kill', sprite: other };

export const entombedCombat: CombatSpec = {
  player: 2,
  // the whip, while it's out ($20CF: the whip's frames are running)
  weapon: { sprite: 3, active: (ram) => ram[0x20cf] === 1 },
  hooks: {
    0x291f: { kind: 'swing' }, // the whip starts ($291F)
    // the corridors: the monsters the whip destroys ($660B, $667A, $6697: the collision it read is
    // exactly the whip, Pendragon and the monster), and the hurt flag $6C8C set ($6BDE)
    0x661b: kill, 0x6691: kill, 0x66a6: kill,
    0x6c4b: hurt, 0x6c5d: hurt, 0x6c6f: hurt,
    // the chambers: each block's own hurt flag (set where its monsters touch him); none of them
    // has a monster the whip can destroy (it moves things for the puzzles)
    0x647e: hurt, 0x64b2: hurt, 0x64e6: hurt, // chamber block $C440
    0x620b: hurt, // $C940
    0x62e2: hurt, // $CB60
    0x646f: hurt, // $D0F0
    0x624a: hurt, // $D580
    0x636c: hurt, // $DAF0
    0x62d6: hurt, // $DF30
    0x636e: hurt, // $E300
    0x651c: hurt, // $E6F0
    0x62ce: hurt, // $EC70
    0x646d: hurt, 0x649e: hurt, // $FA90
  },
  // the five ankhs in the status line (colour RAM $DB85-$DB89: row 22, columns 21-25)
  healthBox: { x: 168, y: 176, w: 40, h: 8 },
};

/**
 * The 8-way controls (games/shared/native/controls.ts): his steps into the picture ($1EF8) and
 * out of it ($1FC8), the routines his own handling runs every other frame for up and down (and
 * in a jump, when he faces that way: $19E5-$1A11, which also moves the jump's base height
 * $20E7), and a pixel more where $2550 found it so ($20D1). What stops him is worked out by $2550 (run after his handling each frame) for the
 * way he faces ($2365), from the character under his feet at the offsets $17FF/$1800 ($10,$10
 * facing up; $18,$06 facing down): $236D up, $236B down. His walking frame ($1805/$1806) and
 * sprite picture ($0880) are put back after a step.
 */
export const entombedControls: ControlsSpec = pendragonControls({
  facing: { addr: 0x2365, right: 1, left: 2, up: 3, down: 4 },
  offsets: [0x17ff, 0x1800], up: [0x10, 0x10], down: [0x18, 0x06],
  floor: engine.r_2550,
  x: 0x321f, y: 0x3220,
  // $2550: floor at $25D8 ($3D, a step, only lets him on facing up or down: $20D1, a pixel more);
  // facing up, the corners $31/$0B/$1E ($2DA1: round into the next corridor), the ways into a chamber,
  // and up and down a floor, $AB/$64/$AC/$3E ($26C0-$2715); facing down the corners and $BE ($2783)
  tiles: { open: [0x37, 0x01, 0x27, 0x14, 0x3d], up: [0x31, 0x0b, 0x1e, 0xab, 0x64, 0xac, 0x3e], down: [0x31, 0x0b, 0x1e, 0xbe] },
  stepUp: engine.r_1ef8, stepDown: engine.r_1fc8,
  extra: { flag: 0x20d1, y: 0x3220, spriteY: 0xd005 }, // ($1BC9, $1C5E)
  keep: [0x1805, 0x1806],
  picture: 0x0880,
  place: [0x321c, 0x37f7, 0x6001, 0x6002, 0x217e, 0x217f, 0x2181, 0x3231],
  jump: { flag: 0x3227, blocked: [0x236d, 0x236b], base: 0x20e7, gate: [0x37fa, 0x37fb] },
  // the whip, the torch, losing, the way out
  busy: (ram) => ram[0x20cf] === 1 || ram[0x20cb] !== 0 || ram[0x17dd] !== 0 || ram[0x3230] === 2,
});
