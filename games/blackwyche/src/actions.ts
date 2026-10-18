import * as engine from './gen/engine';

/** The action in use ($3415: 1 jump, 2 sword), and picking one: $0F32 shows its name. Z and X pick one in play (main.ts), and the ending's Pendragon uses them too (ending.ts). */
export const ACTION = {
  jump: 1,
  strike: 2,
  get: (ram: Uint8Array) => ram[0x3415],
  set: (ram: Uint8Array, n: number, call: (fn: () => void) => void) => { ram[0x3415] = n; call(engine.r_0f32); },
};
