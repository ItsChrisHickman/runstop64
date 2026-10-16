import { NativeHost, type PortConfig } from '../../shared/native/host';
import type { MachineState } from '../../../packages/c64kit/src/c64/machine';
import * as engine from './gen/engine';
import { ROOMS } from './rooms';

/**
 * Blackwyche, native: the game's own logic, translated to TypeScript (src/gen),
 * on the shared native runtime (games/shared/native/host.ts).
 */
export const port: PortConfig = {
  engine,
  restart: engine.r_0a00,
  mainLoop: engine.r_15e0,
  mainLoopReturn: 0x15e2,
  mainLoopWait: 0x15e0,
  waitRoutine: 0x1e8b,
  logicLine: 0xd7,
  irq: engine.r_22c3,
  overlays: [{ lo: 0x6000, hi: 0x66ff, versions: ROOMS }],
  kernal: {
    0xea31: (m) => { m.hooks.get(0xea31)?.(m); },
    0xfebc: () => {},
  },
};

export class NativeBlackwyche extends NativeHost {
  constructor(state: MachineState, from: 'title' | 'mainLoop' = 'title') {
    super(port, state, from);
  }
}
