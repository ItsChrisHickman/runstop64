import type { PortConfig } from '../../shared/native/host';
import * as engine from './gen/engine';
import { ROOMS } from './rooms';

/**
 * Entombed, native: the game's own logic, translated to TypeScript (src/gen,
 * see re/README.md), on the shared native runtime (games/shared/native/host.ts).
 */
export const port: PortConfig = {
  engine,
  restart: engine.r_0a00, // the game's restart entry; the title snapshot starts here
  mainLoop: engine.r_1814,
  mainLoopReturn: 0x1816,
  mainLoopWait: 0x1814,
  waitRoutine: 0x2098,
  logicLine: 0xd7, // the main loop waits for this raster line, then runs a frame's logic
  irq: engine.r_24a8,
  overlays: [{ lo: 0x6000, hi: 0x66ff, versions: ROOMS }],
  kernal: {
    0xea31: (m) => { m.hooks.get(0xea31)?.(m); }, // KERNAL IRQ: jiffy clock, keyboard scan
    0xfebc: () => {}, // KERNAL: restore registers, return from the interrupt
  },
};
