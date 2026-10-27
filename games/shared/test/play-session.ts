import { Input, PixelRenderer, packState, type Host, type MachineState } from 'c64kit';
import type { runNative } from '../native/play';
import { nowhere, useMemoryStorage } from './browser';
import { must } from './must';
import { continueFromTitle } from './continue-from-title';

/** A native game run through the front end, as the browser runs it (what `run(host)` of a game's main.ts gives). */
export type NativeRun = ReturnType<typeof runNative>;

/**
 * A game launched on a save, with the keyboard, the frame loop and the render of the browser: for the tests that go through the
 * front end (the ending's win, W on the pause screen, ORIGINAL).
 */
export class PlaySession {
  readonly input = new Input(nowhere);
  readonly renderer = new PixelRenderer();
  readonly p: NativeRun;
  frames = 0;

  private constructor(run: (host: Host) => NativeRun, private readonly keep: (ram: Uint8Array) => void) {
    this.p = run({ renderer: this.renderer, input: this.input, canvas: nowhere });
  }

  /**
   * The game continued from `save` (its stored save, as the page keeps one), in ENHANCED unless `enhanced` is false (the switch as the
   * page remembers it). `keep` is called on the game's memory after every frame (his energy kept up so nothing ends the game).
   */
  static async launch(run: (host: Host) => NativeRun, id: string, save: MachineState, keep: (ram: Uint8Array) => void, enhanced = true) {
    const kept = new Map([[`${id}.save.v1`, Buffer.from(packState(save)).toString('base64')]]);
    if (!enhanced) kept.set(`${id}.assist`, JSON.stringify({ enhanced: false }));
    useMemoryStorage(kept);
    const s = new PlaySession(run, keep);
    await new Promise((r) => setTimeout(r, 0));
    continueFromTitle(s.p, s.input, (n) => s.tick(n)); // (the title, ENTER CONTINUE, Enter)
    return s;
  }

  get ram() { return must(this.p.machine, 'the machine').ram; }

  /** Frames of the front end, one after the other. */
  tick(n = 1) {
    for (let i = 0; i < n; i++) {
      this.input.poll(); this.p.tick(); this.p.render(0);
      this.frames++;
      const m = this.p.machine;
      if (m) this.keep(m.ram);
    }
  }

  /** Press a key for a frame and let go (two frames to be seen). */
  press(key: string) {
    this.input.keyDown(key); this.tick(2); this.input.keyUp(key); this.tick(2);
  }
}
