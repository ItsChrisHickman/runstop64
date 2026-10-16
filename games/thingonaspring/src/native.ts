import type { MachineState } from '../../../packages/c64kit/src/c64/machine';
import { cpu } from '../../shared/native/cpu';
import { NativeHost, routineAt, type PortConfig } from '../../shared/native/host';
import * as engine from './gen/engine';

/**
 * Thing on a Spring, native: the game's own logic, translated to TypeScript
 * (src/gen, see re/README.md), on the shared native runtime.
 *
 * Unlike the Pendragon games, it times itself: its raster interrupt (one for the
 * title, one for play, set through the vector at $FFFE) draws and moves things,
 * and the main program paces itself with delay loops. So it's translated with
 * every instruction's cycles counted, and runs with 'cycles' timing.
 */
export const port: PortConfig = {
  engine,
  restart: engine.r_735e, // the title (as after a game over), then the game
  mainLoop: engine.r_4371,
  mainLoopReturn: -1,
  mainLoopWait: 0x4377, // the main loop's delay call (its pace)
  waitRoutine: 0x41bb,
  logicLine: 0,
  timing: 'cycles',
  // The handler the game has put in the vector at $FFFE (KERNAL ROM is switched out).
  irq: (m) => {
    const v = m.ram[0xfffe] | (m.ram[0xffff] << 8);
    const fn = routineAt(engine, v);
    if (!fn) throw new Error(`no translated interrupt handler at $${v.toString(16)}`);
    cpu.cy += 7; // the interrupt itself
    return fn();
  },
  overlays: [],
};

export class NativeThing extends NativeHost {
  constructor(state: MachineState, from: 'title' | 'mainLoop' = 'title') {
    super(port, state, from);
  }
}
