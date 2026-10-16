import { NativeHost, type PortConfig } from '../../shared/native/host';
import type { MachineState } from '../../../packages/c64kit/src/c64/machine';
import * as engine from './gen/engine';
import { HIGH_SLOTS, LOW_SLOT } from './rooms';

/**
 * The Staff of Karnath, native: the game's own logic, translated to TypeScript
 * (src/gen), on the shared native runtime (games/shared/native/host.ts).
 */
export const port: PortConfig = {
  engine,
  restart: engine.r_0a00,
  mainLoop: engine.r_18cf,
  mainLoopReturn: 0x18d1,
  mainLoopWait: 0x18cf,
  waitRoutine: 0x219c,
  logicLine: 0xd1,
  irq: engine.r_272b,
  overlays: [
    { lo: 0x6000, hi: 0x68ff, versions: LOW_SLOT },
    { lo: 0xc000, hi: 0xcfff, versions: HIGH_SLOTS },
  ],
  kernal: {
    0xea31: (m) => { m.hooks.get(0xea31)?.(m); },
    0xfebc: () => {},
  },
};

export class NativeKarnath extends NativeHost {
  constructor(state: MachineState, from: 'title' | 'mainLoop' = 'title') {
    super(port, state, from);
  }
}
