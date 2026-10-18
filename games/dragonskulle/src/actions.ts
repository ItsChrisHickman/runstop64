import { cpu } from '../../shared/native/cpu';
import * as engine from './gen/engine';

/** The actions, as the hand points at them ($12EB; the hand's place $12EC, 7 columns each). */
export const ACTION = { shovel: 0, cloak: 1, pause: 2, stone: 3, jump: 4 };

/**
 * The action in hand and picking one, the game's own way: the hand comes off the icon it was on and onto the new one
 * ($12CF colours it, as $12A1 does). The front end's action keys (main.ts) and the ending's Pendragon (ending.ts) pick
 * with this; jumping is the jump action and what he strikes with is the stone.
 */
export const ACTIONS = {
  jump: ACTION.jump,
  strike: ACTION.stone,
  /** Nothing of the last stone or dig under way ($1FEF: 1 while he throws, 2 while it flies; $3428: digging). */
  ready: (ram: Uint8Array) => ram[0x1fef] === 0 && ram[0x3428] === 0,
  get: (ram: Uint8Array) => ram[0x12eb],
  set: (ram: Uint8Array, n: number, call: (fn: () => void) => void) => call(() => {
    cpu.x = ram[0x12ec]; cpu.a = 0; engine.r_12cf();
    ram[0x12eb] = n; ram[0x12ec] = n * 7; ram[0x12ed] = 0;
    cpu.x = ram[0x12ec]; cpu.a = 0x0a; engine.r_12cf();
  }),
};
