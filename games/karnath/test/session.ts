/**
 * What Karnath's checks of the hints play with: the game run through the front end (run(host)) with the keyboard, the
 * frame loop and the render, as the browser runs it, the status line's text read back from the screen (re/hints/check.ts,
 * test/web.ts). A test calls `stubFetch(title)` (games/shared/test/browser.ts) once before it launches one.
 */
import { Input, PixelRenderer, packState, unpackState, type MachineState } from 'c64kit';
import { screenText } from '../../shared/native/pause';
import { partsOf } from '../../shared/native/narrate';
import { nowhere, useMemoryStorage } from '../../shared/test/browser';
import { continueFromTitle } from '../../shared/test/continue-from-title';
import { must } from '../../shared/test/must';
import { STATUS } from '../src/guide';
import { run } from '../src/main';

/** His energy kept up, so nothing ends the game. */
export const alive = (ram: Uint8Array) => { ram[0x6ffe] = 100; ram[0x322e] = 0; };

/** The status line as the screen has it (the game's lettering read back, spaces folded). */
export const LINE = (ram: Uint8Array) => screenText(ram, 22, 5, 28);

export class Session {
  readonly input = new Input(nowhere);
  readonly renderer = new PixelRenderer();
  readonly p = run({ renderer: this.renderer, input: this.input, canvas: nowhere });
  /** Each different status line seen, with the frame it first showed. */
  readonly trace: { at: number; text: string }[] = [];
  frames = 0;
  /** Frames the game's own message (the one of the moment: $3232) was up and the line was not its own. */
  covered = 0;
  private constructor() { /* use launch() */ }
  static async launch(save: MachineState, enhanced = true) {
    const kept = new Map([['karnath.save.v1', Buffer.from(packState(save)).toString('base64')]]);
    if (!enhanced) kept.set('karnath.assist', JSON.stringify({ enhanced: false }));
    useMemoryStorage(kept);
    const s = new Session();
    await new Promise((r) => setTimeout(r, 0));
    continueFromTitle(s.p, s.input, (n) => s.tick(n)); // (the title, ENTER CONTINUE, Enter)
    s.trace.length = 0;
    return s;
  }
  get ram() { return must(this.p.machine, 'the machine').ram; }
  get vic() { return must(this.p.machine, 'the machine').vic; }
  tick(n = 1) {
    for (let i = 0; i < n; i++) {
      this.input.poll(); this.p.tick(); this.p.render(0);
      this.frames++;
      const m = this.p.machine;
      if (!m) continue;
      alive(m.ram);
      const text = LINE(m.ram);
      if (this.trace[this.trace.length - 1]?.text !== text) this.trace.push({ at: this.frames, text });
    }
  }
  /** Hold keys until `done()` (or `max` frames), then let go. */
  hold(keys: string[], done: () => boolean, max = 400) {
    for (const k of keys) this.input.keyDown(k);
    for (let i = 0; i < max && !done(); i++) this.tick();
    for (const k of keys) this.input.keyUp(k);
    return done();
  }
  /** The lines the status line showed, in order, as far as they are not the game's own. */
  texts() { return this.trace.map((t) => t.text); }
}

/** A copy of a state with its memory edited. */
export const saved = (edit: (r: Uint8Array) => void, from: MachineState) => { const st = unpackState(packState(from)); edit(st.ram); return st; };
/** What a line of the story (or several) is shown as: its parts, cut to the status line. */
export const partsOf2 = (say: string | readonly string[]) => (typeof say === 'string' ? [say] : [...say]).flatMap((t) => partsOf(t, STATUS));
/** The parts of `say` appear on the status line in order, after `from` (an index into the trace). */
export const saysInOrder = (trace: string[], say: string | readonly string[], from = 0) => {
  let at = from;
  for (const part of partsOf2(say)) { const k = trace.indexOf(part, at); if (k < 0) return false; at = k + 1; }
  return true;
};
