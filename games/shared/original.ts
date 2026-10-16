import { C64Machine, C64View, C64_KEYS, SidPlayer, unpackState, type MachineState, type Host } from 'c64kit';
import { ContinueFlow, MACHINE_CODEC, type TitleStrip } from './continue';
import type { Found } from './saves';
import type { TouchLayout } from './touch';

/**
 * Runs an original game's own code on c64kit's C64 machine, from a snapshot
 * (so there's no loading), drawn natively by C64View with smooth sprites, and
 * its sound streamed to the SID emulation.
 */

/** What runs the game: the original code on the emulated 6502 (default), or a native port. */
export interface Driver {
  machine: C64Machine;
  /** One PAL frame. False if the game stopped (then it restarts from the snapshot). */
  tick(): boolean;
}

export interface OriginalOptions {
  /** URL of the machine snapshot to boot from. */
  state: string;
  /** Build the driver from the snapshot (default: the emulated original). */
  driver?: (state: MachineState) => Driver;
  /** Physical key → C64 key it stands for (instead of its own position). */
  remap?: Record<string, string>;
  /** Physical keys that never reach the C64 keyboard (they're the joystick, or ours). */
  reserved?: string[];
  /** Whether the joystick's fire also presses Space on the keyboard. */
  fireIsSpace?: boolean;
  /**
   * Autosave and continue (games/shared/continue.ts): the room the player is in
   * (a new value means a new room: autosave), and whether the title screen is up.
   */
  saves?: {
    id: string; room(ram: Uint8Array): number; onTitle(m: C64Machine): boolean; strip?: TitleStrip;
    /** What a save says about the game's progress (the save manager shows it): where first, then how it's doing. */
    describe?(ram: Uint8Array, found: Found): string[];
  };
  /** The touch controls (games/shared/touch); default: an 8-way stick and fire. */
  touch?: TouchLayout;
}

/** Keys runstop64 keeps for itself in every game. */
const OURS = ['KeyM'];

export function runOriginal(host: Host, opts: OriginalOptions) {
  const { renderer, input, canvas } = host;
  renderer.frame = { x: 32, y: 36 };
  const emulated = (s: MachineState): Driver => {
    const machine = new C64Machine();
    machine.loadState(s);
    return { machine, tick: () => machine.runFrame() };
  };
  let driver: Driver = emulated(new C64Machine().saveState());
  let m = driver.machine;
  let view = new C64View(renderer, m);
  const sound = new SidPlayer();
  const reserved = new Set([...OURS, ...(opts.reserved ?? [])]);
  let ready = false;
  let muted = false;
  let fireHeldOver = true; // the press that launched (or started, or continued) the game: ignored until it's released
  const saves = opts.saves;
  const describe = saves?.describe;
  const flow = saves ? new ContinueFlow({ id: saves.id, renderer, input, font: 'kit', codec: MACHINE_CODEC, strip: saves.strip, describe: describe && ((s, found) => describe(s.ram, found)) }) : null;
  const status = (s: NonNullable<OriginalOptions['saves']>) => {
    const onTitle = s.onTitle(m);
    return { machine: m, onTitle, room: onTitle ? null : s.room(m.ram), save: () => m.saveState() };
  };

  const boot = () =>
    fetch(opts.state)
      .then((r) => r.arrayBuffer())
      .then((b) => {
        driver = (opts.driver ?? emulated)(unpackState(new Uint8Array(b)));
        m = driver.machine;
        view.dispose();
        view = new C64View(renderer, m);
        ready = true;
      });
  void boot();

  const unlock = () => {
    if (sound.unlocked) return;
    void sound.unlock().then(() => sound.startStream());
  };
  canvas.addEventListener('pointerdown', unlock);

  return {
    touch: opts.touch ?? { stick: '8', buttons: [{ label: 'FIRE', key: 'Space', size: 'big' }] },
    get machine() { return m; },
    tick() {
      if (input.typed.length) unlock();
      if (input.typed.includes('KeyM')) {
        muted = !muted;
        if (sound.muted !== muted) sound.toggleMute();
      }
      if (!ready) return;
      if (flow && saves) {
        const resume = flow.before(status(saves));
        if (resume) {
          driver = (opts.driver ?? emulated)(resume);
          m = driver.machine;
          view.dispose();
          view = new C64View(renderer, m);
          flow.resumed(resume, saves.room(resume.ram));
          fireHeldOver = true;
          return;
        }
        if (flow.holding) { view.update(); flow.draw(); return; }
      }

      // Keyboard: physical keys at their C64 positions (or remapped).
      m.keys = [];
      for (const code of input.down) {
        const mapped = opts.remap?.[code];
        if (!mapped && reserved.has(code)) continue;
        if (code === 'Space' && opts.fireIsSpace && fireHeldOver) continue;
        const k = C64_KEYS[mapped ?? code];
        if (k) m.keys.push(k);
      }
      // Joystick/gamepad on both ports.
      let joy = 0x1f;
      if (input.held.up) joy &= ~1;
      if (input.held.down) joy &= ~2;
      if (input.held.left) joy &= ~4;
      if (input.held.right) joy &= ~8;
      if (fireHeldOver && !input.held.fire) fireHeldOver = false;
      if (input.held.fire && !fireHeldOver) joy &= ~16;
      m.joy1 = m.joy2 = joy;
      if (opts.fireIsSpace && input.held.fire && !fireHeldOver && !input.down.has('Space')) m.keys.push(C64_KEYS.Space);

      if (!driver.tick()) {
        // The original hit a BRK: start again from the snapshot.
        ready = false;
        void boot();
        return;
      }
      sound.pushFrame(m.sidWrites);
      view.update();
      if (flow && saves) {
        if (flow.after(status(saves))) fireHeldOver = true; // play just began: the start button isn't a jump
        flow.draw();
      }
    },
    render(alpha: number) {
      view.render(alpha);
      if (flow?.covering) { renderer.hideSprites(); renderer.render(); }
    },
    /** For tests. */
    get state() { return flow?.state; },
  };
}
