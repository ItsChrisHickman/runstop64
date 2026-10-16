import type { CombatHook, CombatSpec } from '../../shared/native/combat';
import { pendragonControls, type ControlsSpec } from '../../shared/native/controls';
import * as engine from './gen/engine';

/**
 * Blackwyche's fights, read from its code (re/README.md, "Combat").
 *
 * Pendragon is sprite 2, his sword sprite 3 ($279F draws it; $1ED0 is 1 while it's out). The
 * collisions the game read are kept at $3414. On the decks the engine's own code ($6B35) takes
 * a blow of the sword on its three creatures (sprites 4-6, near enough in depth): each goes from
 * 1 to 2, its end (it turns grey and floats away, then a new one comes); the cabins' blocks have their own creatures and things to cut. Which a blow
 * was, destroyed or hit, is seen in the next frame's picture (`strike`). A creature touching him
 * starts the block's hurt flag (as in Entombed: the flash of him, then the damage, $3417).
 */
const strike = (n: number): CombatHook => ({ kind: 'strike', sprite: () => n });
/** What hit him: the other sprite in the collision read (not him, not the sword). */
const hurt: CombatHook = {
  kind: 'hurt',
  sprite: (ram) => { const bits = ram[0x3414] & ~0x0c; for (let n = 0; n < 8; n++) if (bits & (1 << n)) return n; return -1; },
};
const also: CombatHook = { kind: 'also' };
/** Destroyed: the decks' creatures, struck, go from 1 to 2 (they turn grey and float away, then a new one comes). */
const kill = (n: number): CombatHook => ({ kind: 'kill', sprite: () => n });

export const blackwycheCombat: CombatSpec = {
  player: 2,
  weapon: { sprite: 3, active: (ram) => ram[0x1ed0] === 1 },
  hooks: {
    0x279f: { kind: 'swing' }, // the sword drawn
    // the decks (the engine's $6A2F/$6B35): the creatures' sword blows, the hurt flag $6C4E
    0x6b71: kill(4), 0x6bb3: kill(5), 0x6bf5: kill(6),
    0x6a6f: hurt, 0x6ab0: hurt, 0x6af0: hurt, 0x6b2c: hurt,
    // the cabins' and stairways' blocks
    0x60c9: strike(4), // $C000
    0x6371: strike(4), 0x6380: strike(6), 0x6290: hurt, 0x62cc: hurt, // $C110
    0x6274: strike(6), 0x6304: strike(4), 0x6332: strike(5), 0x6220: hurt, 0x624f: hurt, // $C4B0
    0x61e7: hurt, // $C840
    0x6174: hurt, // $CE20
    0x60e0: strike(4), // $D080
    0x6204: hurt, 0x6245: hurt, 0x6285: hurt, // $D1B0
    0x6178: hurt, // $D620
    0x62c4: hurt, 0x62c7: also, 0x62da: hurt, 0x62dd: also, 0x62f7: hurt, 0x6301: also, 0x6316: hurt, 0x6320: also, // $D7B0
    0x618e: hurt, // $DB90
    0x6168: hurt, // $DEB0
    0x6181: hurt, // $E0D0
    0x6298: strike(0), 0x622c: hurt, // $E2C0
    0x618f: hurt, // $E570
    0x6268: hurt, // $E760
    0x61a0: hurt, // $ED70
    0x6126: strike(4), // $F1D0
    0x62d0: strike(4), 0x61a3: hurt, // $F370
    0x6232: hurt, // $F890
    0x622b: strike(4), // $FB20
  },
  // the energy left, in the status line ($07A2: row 23, columns 10-12)
  healthBox: { x: 80, y: 184, w: 24, h: 8 },
};

/**
 * The 8-way controls (games/shared/native/controls.ts): his steps into the picture ($1CCF) and
 * out of it ($1DAD), as his handling runs them every other frame for up and down (and in a
 * jump: $1799-$17BE, which also moves the jump's base height $1EE8), and a pixel more where
 * $236B found it so ($1ED2). What stops him is worked
 * out by $236B (after his handling, each frame) for the way he faces ($216F), at the offsets
 * $153B/$153C: $2177 up, $2175 down. His walking frame ($1541/$1542) and sprite picture ($0880)
 * are put back after a step.
 */
export const blackwycheControls: ControlsSpec = pendragonControls({
  facing: { addr: 0x216f, right: 1, left: 2, up: 3, down: 4 },
  offsets: [0x153b, 0x153c], up: [0x10, 0x10], down: [0x18, 0x06],
  floor: engine.r_236b,
  x: 0x341f, y: 0x3420,
  // $236B: floor at $2403; facing up, the door $05 ($2535: the next place drawn), $14 and $20/$19/$2A
  // ($258B, $25A1: what he does instead, $1EC7); facing down, the ways to other decks $0A/$0B
  // ($25F7, $261C) and $09 ($2641)
  tiles: { open: [0x01, 0x16, 0x17, 0x03, 0x15], up: [0x05, 0x14, 0x20, 0x19, 0x2a], down: [0x0a, 0x0b, 0x09] },
  stepUp: engine.r_1ccf, stepDown: engine.r_1dad,
  extra: { flag: 0x1ed2, y: 0x3420, spriteY: 0xd005 }, // ($1984, $1A19)
  keep: [0x1541, 0x1542],
  picture: 0x0880,
  place: [0x341c, 0x1ecd, 0x9d78, 0x342e, 0x6001, 0x6002, 0x1f88],
  jump: { flag: 0x3427, blocked: [0x2177, 0x2175], base: 0x1ee8 },
  // the sword, and what the game does instead of his handling ($1EC7, $342A)
  busy: (ram) => ram[0x1ed0] === 1 || ram[0x1ec7] !== 0 || ram[0x342a] !== 0,
});
