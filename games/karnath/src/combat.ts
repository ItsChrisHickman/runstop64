import type { CombatHook, CombatSpec } from '../../shared/native/combat';
import { pendragonControls, type ControlsSpec } from '../../shared/native/controls';
import * as engine from './gen/engine';

/**
 * The Staff of Karnath's fights, read from its code (re/README.md, "Combat").
 *
 * Pendragon is sprite 2; a spell in flight is sprite 3 ($3216 is 1 while one flies; casting it,
 * $1988, costs a point of energy). Each block of room code checks the collisions it read
 * ($321A) for its own creatures: a spell touching one does something only if it's the spell
 * that works on it ($322C), and then the code for it runs (the hooks below): most creatures go
 * (or are put somewhere else: a new one comes), some are only checked or turned. Which it was
 * is seen in the next frame's picture (`strike`). A creature touching him stores the damage to
 * come ($322E) and starts its block's own flash of him (`hurt`, `also`).
 */
const strike = (n: number): CombatHook => ({ kind: 'strike', sprite: () => n });
/** What hit him: the other sprite in the collision read (not him, not the spell). */
const hurt: CombatHook = {
  kind: 'hurt',
  sprite: (ram) => { const bits = ram[0x321a] & ~0x0c; for (let n = 0; n < 8; n++) if (bits & (1 << n)) return n; return -1; },
};
const also: CombatHook = { kind: 'also' };
/** Which block is in the low slot: its first jump ($6000 jumps to $61E8, $61DD, $61B0 or $615A). */
const block = (ram: Uint8Array) => ram[0x6001] | (ram[0x6002] << 8);

export const karnathCombat: CombatSpec = {
  player: 2,
  weapon: { sprite: 3, active: (ram) => ram[0x3216] === 1, color: 0xffe0a0 },
  hooks: {
    0x1988: { kind: 'swing' }, // a spell cast
    // the lower castle's low block ($6000) and its versions: the upper castle's ($D800), the dungeons' ($F100), Karn's abode ($F900)
    0x65e8: strike(5), 0x65fe: strike(7), 0x62d3: hurt, 0x62dc: hurt, 0x62e1: also,
    0x6604: strike(0), 0x6652: strike(6), 0x6675: strike(7), 0x6686: strike(7), 0x62e6: hurt, 0x6338: hurt, 0x633d: also,
    // ($662C is in two of them: the upper castle's spell on sprite 5, a hurt in Karn's abode)
    0x662c: [{ ...strike(5), when: (ram) => block(ram) === 0x61dd }, { ...hurt, when: (ram) => block(ram) === 0x615a }],
    0x65dd: strike(0), 0x65fd: strike(5), 0x6616: strike(6), 0x62a2: hurt, 0x62a7: also, 0x62c7: hurt, 0x62cc: also,
    0x63f9: hurt, 0x63fc: also, 0x65e6: hurt, 0x65e9: also, 0x6605: hurt, 0x6608: also, 0x660b: also, 0x662f: also, 0x6632: also,
    // the high blocks ($C000, and the upper castle's $E100)
    0xc5f3: strike(5), 0xc616: strike(1), 0xc644: strike(4), 0xccff: strike(0), 0xcd1f: strike(6), 0xcd3d: strike(7),
    0xc2f4: hurt, 0xc2f9: also, 0xcb47: hurt, 0xcb4c: also,
    0xc63e: strike(0), 0xc661: strike(5), 0xc684: strike(1), 0xc6a0: strike(7), 0xc6bf: strike(6), 0xcda7: strike(0), 0xcdc7: strike(6), 0xce05: strike(7), 0xce1e: strike(4),
    0xc30d: hurt, 0xc312: also, 0xcbb5: hurt, 0xcbba: also,
  },
  // the energy left, in the status line ($07DC: row 24, columns 28-30)
  healthBox: { x: 224, y: 192, w: 24, h: 8 },
};

/**
 * The 8-way controls (games/shared/native/controls.ts): his steps into the picture ($2FD0) and
 * out of it ($2FF0), as his handling runs them every other frame for up and down. What stops
 * him is worked out by $27BA (after his handling, each frame) for the way he faces ($25C1),
 * at the offsets $7FF2/$7FF3: $25CA up, $25C8 down; walking up there can also change the level
 * (frames of it: a diagonal leaves that to straight up). His walking frame ($7FF9/$7FFA) and
 * sprite picture ($0880) are put back after a step.
 */
export const karnathControls: ControlsSpec = pendragonControls({
  facing: { addr: 0x25c1, right: 1, left: 2, up: 3, down: 4 },
  offsets: [0x7ff2, 0x7ff3], up: [0x10, 0x10], down: [0x18, 0x06],
  floor: engine.r_27ba,
  x: 0x7ff4, y: 0x3238,
  // $27BA: floor at $2835; facing up, the doors $67/$63/$23/$5E ($2907-$2945), $6D and $CF ($2957,
  // $2961: another level, frames of it), $53/$66 and $B8 ($297A, $29C1); facing down $A5-$A7 ($29F3)
  tiles: { open: [0x4f, 0x16, 0x17, 0x18], up: [0x67, 0x63, 0x23, 0x5e, 0x6d, 0xcf, 0x53, 0x66, 0xb8], down: [0xa6, 0xa5, 0xa7] },
  stepUp: engine.r_2fd0, stepDown: engine.r_2ff0,
  keep: [0x7ff9, 0x7ffa],
  picture: 0x0880,
  place: [0x3235, 0x3219], // (the room and the level: a door opening, $2A2C, changes its own bytes before he goes through)
  busy: (ram) => ram[0x6ffd] !== 0,
});
