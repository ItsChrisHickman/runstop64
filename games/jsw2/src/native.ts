import type { MachineState } from '../../../packages/c64kit/src/c64/machine';
import { cpu } from '../../shared/native/cpu';
import { NativeHost, routineAt, type PortConfig } from '../../shared/native/host';
import * as engine from './gen/engine';

/**
 * Jet Set Willy II, native: the game's own logic, translated to TypeScript
 * (src/gen, see re/README.md), on the shared native runtime.
 *
 * Like Thing on a Spring it times itself (delay loops, cycles counted; its raster
 * interrupts chain through the KERNAL's vector at $0314 and leave through vectors
 * in the stack page). The title runs on the original code; from the main game
 * loop ($4BAE) on, everything is native.
 */
export const port: PortConfig = {
  engine,
  restart: engine.r_4bae, // (unused: the title starts on the original code, see bootstrapUntil)
  bootstrapUntil: 0x4bae,
  mainLoop: engine.r_4bae,
  mainLoopReturn: -1,
  mainLoopWait: 0x4bae, // the marker at the top of the main loop
  waitRoutine: -1,
  logicLine: 0,
  timing: 'cycles',
  // the KERNAL's IRQ entry pushes the registers and jumps through $0314
  irq: (m) => {
    const v = m.ram[0x314] | (m.ram[0x315] << 8);
    const fn = routineAt(engine, v);
    if (!fn) throw new Error(`no translated interrupt handler at $${v.toString(16)}`);
    cpu.cy += 7 + 18; // the interrupt, and the KERNAL's entry ($FF48: push the registers, jump through $0314)
    return fn();
  },
  overlays: [],
  kernal: {
    0xea31: (m) => { m.hooks.get(0xea31)?.(m); }, // IRQ exit: jiffy clock, keyboard scan
    0xea81: () => { cpu.cy += 22; }, // IRQ exit: restore registers, RTI
    0xea87: (m) => m.scnkey(), // SCNKEY
    0xffe4: (m) => { cpu.a = m.getin(); cpu.nz = cpu.a; cpu.c = 0; }, // GETIN
    0xffd2: () => {}, // CHROUT (the screen editor isn't modelled)
    0xfff0: () => {}, // PLOT
    0xe518: () => {}, 0xe5a0: () => {}, 0xfd15: () => {}, 0xfda3: () => {}, // screen and I/O set-up
  },
};

export class NativeJsw2 extends NativeHost {
  constructor(state: MachineState, from: 'title' | 'mainLoop' = 'title') {
    super(port, state, from);
  }
}
