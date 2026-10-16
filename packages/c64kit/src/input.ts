/**
 * Joystick-style input: four directions plus fire, from keyboard, gamepad, or
 * an on-screen touch layer (which presses "virtual" keys, so a game sees a touch
 * button exactly as the key it stands for). Call `poll()` once per tick;
 * `pressed` is true only on the tick a button went down.
 */
export interface Stick {
  left: boolean;
  right: boolean;
  up: boolean;
  down: boolean;
  fire: boolean;
}

const STICK = ['left', 'right', 'up', 'down', 'fire'] as const satisfies readonly (keyof Stick)[];

const KEYMAP: Record<string, keyof Stick> = {
  ArrowLeft: 'left', KeyA: 'left',
  ArrowRight: 'right', KeyD: 'right',
  ArrowUp: 'up', KeyW: 'up',
  ArrowDown: 'down', KeyS: 'down',
  Space: 'fire', KeyZ: 'fire', KeyX: 'fire', ControlLeft: 'fire', ControlRight: 'fire',
};

const isMeta = (code: string) => code === 'MetaLeft' || code === 'MetaRight' || code === 'OSLeft' || code === 'OSRight';

/** A place on the C64 screen (pixels, 320×200) that was tapped. */
export interface ScreenPoint { x: number; y: number }

/** What Input reads of a key event (a KeyboardEvent is one). */
export interface KeyEventLike { readonly code: string; readonly repeat: boolean; readonly metaKey: boolean; preventDefault(): void }

/** What Input listens on: a window (keys, focus) and its document (visibility, full screen). */
export interface KeyTarget {
  addEventListener(type: 'keydown' | 'keyup', listener: (e: KeyEventLike) => void): void;
  addEventListener(type: 'blur', listener: () => void): void;
  readonly document?: { addEventListener(type: 'visibilitychange' | 'fullscreenchange', listener: () => void): void };
}

export class Input {
  readonly held: Stick = { left: false, right: false, up: false, down: false, fire: false };
  readonly pressed: Stick = { left: false, right: false, up: false, down: false, fire: false };
  /** Every key held, by KeyboardEvent.code (physical keys and the touch layer's), as of the last poll. */
  readonly down = new Set<string>();
  private physical = new Set<string>();
  /** Keys held by the touch layer (a count each: two fingers can hold one key). */
  private virtual = new Map<string, number>();
  /** Touch keys pressed since the last poll: each is held for at least one poll, however short the tap. */
  private latched = new Set<string>();
  private prev: Stick = { ...this.held };
  private padStartWas = false;
  /** Keys pressed since the last poll, by `code` (for menus and toggles like "M" for music). */
  readonly typed: string[] = [];
  private pendingTyped: string[] = [];
  /**
   * Of `typed`, the presses the touch layer made (its stick's arrows, its buttons' keys): a
   * screen that reads the touch controls its own way (a name picked with the stick) tells them
   * from the keyboard's.
   */
  readonly touchTyped: string[] = [];
  private pendingTouchTyped: string[] = [];
  /** Places on the picture tapped since the last poll (touch only), in C64 pixels. */
  readonly points: ScreenPoint[] = [];
  private pendingPoints: ScreenPoint[] = [];
  /** The touch controls are in use: games may say "tap" instead of naming keys. */
  touch = false;

  constructor(target: KeyTarget = window) {
    target.addEventListener('keydown', (e) => {
      // Cmd (Windows: the Windows key) belongs to the system's shortcuts (screenshots, switching
      // windows): no key counts while it's held, and what was held before it is let go, since
      // macOS sends no releases for keys let go while Cmd is down.
      if (e.metaKey || isMeta(e.code)) { this.letGo(); return; }
      this.physical.add(e.code);
      // Enter and Escape are menu keys (confirm/back), reported via `typed` only; F1 and F7 are the games' (the saved games, a title's
      // choices), not the browser's (its help, caret browsing).
      if (KEYMAP[e.code] || e.code === 'Enter' || e.code === 'NumpadEnter' || e.code === 'Escape' || e.code === 'F1' || e.code === 'F7') e.preventDefault();
      if (!e.repeat) this.pendingTyped.push(e.code);
    });
    target.addEventListener('keyup', (e) => {
      if (isMeta(e.code)) this.letGo();
      else this.physical.delete(e.code);
    });
    // Key releases can go missing when focus moves (another window, full screen, a hidden tab):
    // treat all keys as released then. (Touches end with their own events.)
    const releaseAll = () => this.physical.clear();
    target.addEventListener('blur', releaseAll);
    target.document?.addEventListener('visibilitychange', releaseAll);
    target.document?.addEventListener('fullscreenchange', releaseAll);
  }

  /** A system shortcut began: the keys held go, unseen if they went down this frame (Ctrl, then Cmd, then 4). */
  private letGo() {
    this.pendingTyped = this.pendingTyped.filter((c) => !this.physical.has(c));
    this.physical.clear();
  }

  /** The touch layer pressed a key (as if it were typed on the keyboard). */
  keyDown(code: string) {
    const n = this.virtual.get(code) ?? 0;
    this.virtual.set(code, n + 1);
    if (n === 0) {
      this.latched.add(code);
      this.pendingTyped.push(code);
      this.pendingTouchTyped.push(code);
    }
  }

  /** The touch layer let go of a key. */
  keyUp(code: string) {
    const n = this.virtual.get(code) ?? 0;
    if (n <= 1) this.virtual.delete(code);
    else this.virtual.set(code, n - 1);
  }

  /** Let go of every key the touch layer holds. */
  releaseVirtual() {
    this.virtual.clear();
  }

  /** The touch layer saw a tap on the picture, at C64 pixel (x, y). */
  point(x: number, y: number) {
    this.pendingPoints.push({ x, y });
  }

  poll() {
    this.down.clear();
    for (const c of this.physical) this.down.add(c);
    for (const c of this.virtual.keys()) this.down.add(c);
    for (const c of this.latched) this.down.add(c);
    this.latched.clear();
    const keys = new Set<keyof Stick>();
    for (const c of this.down) { const k = KEYMAP[c]; if (k) keys.add(k); }

    const pad = (typeof navigator !== 'undefined' && navigator.getGamepads?.().find((p) => p && p.connected)) || null;
    const axis = (i: number) => (pad ? pad.axes[i] ?? 0 : 0);
    const btn = (i: number) => !!pad?.buttons[i]?.pressed;

    const h = this.held;
    h.left = keys.has('left') || axis(0) < -0.5 || btn(14);
    h.right = keys.has('right') || axis(0) > 0.5 || btn(15);
    h.up = keys.has('up') || axis(1) < -0.5 || btn(12);
    h.down = keys.has('down') || axis(1) > 0.5 || btn(13);
    h.fire = keys.has('fire') || btn(0) || btn(1);

    for (const k of STICK) {
      this.pressed[k] = h[k] && !this.prev[k];
      this.prev[k] = h[k];
    }
    // Gamepad Start shows up as a typed code, like a key.
    const start = btn(9);
    if (start && !this.padStartWas) this.pendingTyped.push('PadStart');
    this.padStartWas = start;
    this.typed.length = 0;
    this.typed.push(...this.pendingTyped);
    this.pendingTyped.length = 0;
    this.touchTyped.length = 0;
    this.touchTyped.push(...this.pendingTouchTyped);
    this.pendingTouchTyped.length = 0;
    this.points.length = 0;
    this.points.push(...this.pendingPoints);
    this.pendingPoints.length = 0;
  }
}
