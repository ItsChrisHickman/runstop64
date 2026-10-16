import { NativeHost, type PortConfig } from '../../shared/native/host';
import type { MachineState } from '../../../packages/c64kit/src/c64/machine';
import * as engine from './gen/engine';
import { ROOMS } from './rooms';

/**
 * Dragonskulle, native: the game's own logic, translated to TypeScript (src/gen),
 * on the shared native runtime (games/shared/native/host.ts).
 */
export const port: PortConfig = {
  engine,
  restart: engine.r_0a00,
  mainLoop: engine.r_166d,
  mainLoopReturn: 0x166f,
  mainLoopWait: 0x166d,
  waitRoutine: 0x1fa5,
  logicLine: 0xd7,
  irq: engine.r_2413,
  overlays: [{ lo: 0x6000, hi: 0x6bff, versions: ROOMS }],
  kernal: {
    0xea31: (m) => { m.hooks.get(0xea31)?.(m); },
    0xfebc: () => {},
  },
};

export class NativeDragonskulle extends NativeHost {
  constructor(state: MachineState, from: 'title' | 'mainLoop' = 'title') {
    super(port, state, from);
  }
}
