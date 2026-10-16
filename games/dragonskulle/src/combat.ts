import type { CombatHook, CombatSpec } from '../../shared/native/combat';
import { pendragonControls, type ControlsSpec } from '../../shared/native/controls';
import * as engine from './gen/engine';

/**
 * Dragonskulle's fights, read from its code (re/README.md, "Combat").
 *
 * Pendragon is sprite 2; his weapon is the magic stone (the STONE icon), sprite 3: $27F6 throws
 * it ($1FEF: 1 while he throws, 2 while it flies). The collisions the game read each frame are
 * kept at $3414. Each block of room code checks them for its own creatures: the stone on one
 * (sprites 0, 1, 4 or 5, by block) runs the code for that (`strike`: whether it was destroyed or
 * only hit, like the dragons that take ten, is seen in the next frame's picture). A creature
 * touching him (or a ray, a drop) sets the block's hurt flag (`hurt`): the block flashes him
 * for six frames with the hurt sound ($37AD), then gives the damage ($3432), which takes energy
 * from the face going ($123E: 20 a face; five faces, the lives, $1248).
 */
const strike = (...n: number[]): CombatHook => ({ kind: 'strike', sprite: () => (n.length === 1 ? n[0] : n) });
/** What hit him: the other sprite in the collision read (not him, not the stone). */
const hurt: CombatHook = {
  kind: 'hurt',
  sprite: (ram) => { const bits = ram[0x3414] & ~0x0c; for (let n = 0; n < 8; n++) if (bits & (1 << n)) return n; return -1; },
};

export const dragonskulleCombat: CombatSpec = {
  player: 2,
  weapon: { sprite: 3, active: (ram) => ram[0x1fef] === 2 },
  hooks: {
    0x27f6: { kind: 'swing' }, // a stone thrown
    // the block at $6000 to begin with (the caves' rooms with creatures): its hurt flag $6B74
    0x6438: hurt, 0x648e: hurt, 0x64fa: hurt, 0x6536: hurt, 0x6548: strike(4), 0x6592: strike(5), 0x65d8: strike(1),
    0x624c: hurt, // $C000 (the beach: the skull's rays)
    0x63fc: hurt, 0x6430: hurt, 0x6470: hurt, 0x64ac: hurt, 0x64be: strike(4), 0x650b: strike(5), 0x6558: strike(1), // $C400
    0x63cc: hurt, 0x6422: hurt, 0x647c: hurt, 0x64b8: hurt, 0x64ca: strike(4), 0x6514: strike(5), 0x655a: strike(1), // $CD50
    0x64d1: hurt, 0x6500: hurt, 0x651f: strike(1), // $D870
    0x6255: hurt, // $E010
    0x61d9: hurt, 0x61f0: strike(0), 0x6224: strike(1), // $E460
    0x6177: hurt, 0x61bd: hurt, 0x6214: hurt, 0x6226: strike(5), 0x6273: strike(1), // $E900
    0x6213: hurt, // $EF20 (the shovel room: its creatures take no blows)
    // $F220 (the gas: its flag is set again while a flash is still counting; a hurt starts only when none is)
    0x6150: [{ ...hurt, when: (ram) => ram[0x37ab] === 0 }],
    0x6149: hurt, // $F470
    0x6410: hurt, 0x643f: hurt, 0x6452: strike(5), // $F6E0
  },
  // the faces (lives) in the status line: rows 22-24, columns 23-37
  healthBox: { x: 23 * 8 + 7, y: 176, w: 120, h: 24 }, // (the panel rows are drawn 7 pixels to the right)
};

/**
 * The 8-way controls (games/shared/native/controls.ts): his steps into the picture ($1DF7) and
 * out of it ($1ECE), as his handling ($16C1) runs them every other frame for up and down (and
 * in a jump, which moves the jump's base height $200A the same way), and a pixel more up where
 * the floor check found it so ($1FF1). What stops him is worked out by $24BB (after his
 * handling, each frame) for the way he faces ($2292: 1 right, 2 left, 3 up, 4 down), at the
 * offsets $1281/$1282: $229A up, $2298 down; it also takes him off the screen's edges. His
 * walking frame ($1286, $1287, $2090/$2091) and sprite picture ($0880) are put back after a step.
 */
export const dragonskulleControls: ControlsSpec = pendragonControls({
  facing: { addr: 0x2292, right: 1, left: 2, up: 3, down: 4 },
  offsets: [0x1281, 0x1282], up: [0x10, 0x10], down: [0x18, 0x06],
  floor: engine.r_24bb,
  x: 0x341d, y: 0x341e,
  // $24BB: floor at $254B ($62 only while $72C0 is 0: else it's a wall to it, which the step finds
  // too); facing up, the ways up $8B/$F3 ($263D: the next screen, $2669); facing down, $E0 ($26AD)
  tiles: { open: [0x3f, 0x12, 0x21, 0x62, 0x16, 0x29], up: [0x8b, 0xf3], down: [0xe0] },
  stepUp: engine.r_1df7, stepDown: engine.r_1ece,
  extra: { flag: 0x1ff1, y: 0x341e, spriteY: 0xd005 }, // ($1A8E)
  keep: [0x1286, 0x1287, 0x2090, 0x2091, 0x229c],
  picture: 0x0880,
  place: [0x20a8, 0x20a9, 0x341c, 0x6001, 0x6002],
  jump: { flag: 0x3425, blocked: [0x229a, 0x2298], base: 0x200a },
  // throwing a stone, digging
  busy: (ram) => ram[0x1fef] !== 0 || ram[0x3428] !== 0,
});
