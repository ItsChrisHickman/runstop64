import { C64, type MachineState, type SidWrite } from '../../../packages/c64kit/src/c64/machine';

/**
 * The title's tune, played by the original's own code.
 *
 * The Pendragon games' title tunes are loops that time themselves by counting cycles (a wait for raster line $FF, the
 * work, eight more waits for it), and a translation takes no time outside its waits: the loop came round to the line it
 * was still on, and the tune played twice as fast (Blackwyche's notes began every 4.5 frames, the original's every 9).
 * Spending the time in the translation would change when a game starts from the title, and with it the SID's voice 3
 * that the games take their random numbers from, and so every route recorded from the title. So the translated title
 * is what you see and the tune is what the original plays: this machine, a snapshot of the original at its title
 * running its own code, whose SID writes go to the speakers while the title is up. Nothing in it is shown, and nothing
 * of it reaches the game.
 */
export class TitleTune {
  private readonly machine = new C64();

  constructor(title: MachineState) {
    this.machine.loadState(title);
  }

  /** One frame of the tune: the SID writes the original made in it. */
  frame(): SidWrite[] {
    this.machine.runFrame();
    return this.machine.sidWrites;
  }
}
