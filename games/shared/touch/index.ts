import type { Input, Renderer } from 'c64kit';
import { TouchController } from './controller';
import { clientToStage, decideMode, edgeGuard, layoutStage, NO_CONTROLS, stageTransform, wantsTouch, type Geometry, type Insets, type StageMode, type SystemSpec, type TouchLayout, type Turn } from './layout';
import { nudgeChoice, nudgeLayout, paintNudge, NUDGE_W } from './nudge';

export type { TouchLayout, ButtonSpec, StickKind } from './layout';
export { NO_CONTROLS } from './layout';

/**
 * The touch layer: on-screen controls for phones and tablets, shared by every
 * game. A game only declares a `TouchLayout` (its stick and buttons); the layer
 * draws them in the gutters beside the picture and presses the keys they stand
 * for on the game's `Input`, so the game needs nothing else.
 *
 * - Desktop: nothing, unless the screen is touched (then the controls appear).
 * - A phone: "TURN YOUR PHONE" until the first tap, which asks for full screen and
 *   a landscape lock (Android does it even with rotation locked). Where the lock
 *   isn't possible (iPhone), the whole stage is drawn turned a quarter inside the
 *   portrait page, so turning the phone shows it the right way up. Playing upright
 *   (picture on top, controls below) can be chosen instead.
 */
export interface TouchHost {
  /** The element holding the canvas (it is what's made full screen, or turned). */
  stage: HTMLElement;
  renderer: Renderer;
  input: Input;
  /** The small buttons' actions (the shell's buttons, on a phone: its gear and home). */
  onPause(): void;
  onHome(): void;
}

const PREF_KEY = 'runstop64.touch.view';
type View = 'land' | 'land-flip' | 'upright';

export class TouchLayer {
  /** The touch controls are showing. */
  active = false;
  private coarse: boolean;
  private started = false;
  private lockPending = false;
  private view: View = 'land';
  private mode: StageMode = 'portrait';
  private turn: Turn | 0 = 0;
  private sensedTurn: Turn | null = null;
  private layout: TouchLayout = NO_CONTROLS;
  private system: SystemSpec[] = [];
  private keys: { pause: boolean; home: boolean } = { pause: false, home: false };
  private ctl: TouchController;
  private ui: HTMLDivElement;
  private nudge: HTMLCanvasElement;
  private nudgeTick = 0;
  private nudgeTimer = 0;
  private els: { base: HTMLDivElement; knob: HTMLDivElement; buttons: HTMLDivElement[]; system: HTMLDivElement[] } | null = null;
  private insetProbe: HTMLDivElement;

  constructor(private host: TouchHost) {
    this.coarse = matchMedia?.('(pointer: coarse)').matches ?? false;
    try { const v = localStorage.getItem(PREF_KEY); if (v === 'land' || v === 'land-flip' || v === 'upright') this.view = v; } catch { /* default */ }
    const { stage, input } = host;
    this.ui = el('div', 'touch-ui');
    this.ui.hidden = true;
    stage.append(this.ui);
    this.nudge = document.createElement('canvas');
    this.nudge.className = 'touch-nudge';
    this.nudge.hidden = true;
    stage.append(this.nudge);
    this.insetProbe = el('div', 'touch-insets');
    document.body.append(this.insetProbe);

    this.ctl = new TouchController({
      keyDown: (c) => input.keyDown(c),
      keyUp: (c) => input.keyUp(c),
      tap: (x, y) => {
        const p = host.renderer.toScreenLocal(x, y);
        if (p.x >= -8 && p.x < 328 && p.y >= -8 && p.y < 208) input.point(p.x, p.y);
      },
    }, this.geometry(), 'none');
    this.ctl.onPress = () => { try { navigator.vibrate?.(10); } catch { /* no haptics */ } };
    this.ctl.onSystem = (id) => {
      if (id === 'pause') host.onPause();
      else if (id === 'home') host.onHome();
      else if (id === 'layout') this.cycleView();
    };

    // Touches anywhere on the stage (the canvas stays the target, so games' own listeners still see them).
    const skip = (e: Event) => e.target instanceof Element && !!e.target.closest('button, a, .leave, .info');
    stage.addEventListener('pointerdown', (e) => {
      if (e.pointerType === 'mouse' || skip(e)) return;
      if (!this.active && wantsTouch(this.coarse, true)) this.activate();
      if (!this.started) { this.start(e); return; }
      const p = this.toStage(e.clientX, e.clientY);
      this.ctl.down(e.pointerId, p.x, p.y, performance.now());
      this.draw();
    });
    const move = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || !this.active) return;
      const p = this.toStage(e.clientX, e.clientY);
      this.ctl.move(e.pointerId, p.x, p.y, performance.now());
      this.draw();
    };
    const up = (e: PointerEvent) => {
      if (e.pointerType === 'mouse' || !this.active) return;
      const p = this.toStage(e.clientX, e.clientY);
      if (e.type === 'pointercancel') this.ctl.cancel(e.pointerId);
      else this.ctl.up(e.pointerId, p.x, p.y, performance.now());
      this.draw();
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
    window.addEventListener('pointercancel', up);
    // No scrolling, zooming, text selection, magnifier or long-press menu on the stage.
    stage.addEventListener('touchstart', (e) => { if (this.active && !skip(e)) e.preventDefault(); }, { passive: false });
    stage.addEventListener('touchmove', (e) => { if (this.active && !skip(e)) e.preventDefault(); }, { passive: false });
    stage.addEventListener('contextmenu', (e) => { if (this.active) e.preventDefault(); });

    window.addEventListener('resize', () => this.relayout());
    screen.orientation?.addEventListener?.('change', () => this.relayout());
    document.addEventListener('fullscreenchange', () => {
      // Leaving full screen (the back gesture): back to the page as it was; a tap starts again.
      if (!document.fullscreenElement && this.started && this.canFullscreen()) {
        this.started = false;
        this.ctl.releaseAll();
        input.releaseVirtual();
      }
      this.relayout();
    });
    // Which way the phone is turned (for drawing the stage turned): Android reports it freely.
    // (iOS asks permission for motion, and reports the other sign: there the default is used.)
    const DM = 'DeviceMotionEvent' in window ? window.DeviceMotionEvent : undefined;
    if (DM && !('requestPermission' in DM && typeof DM.requestPermission === 'function')) {
      window.addEventListener('devicemotion', (e) => {
        const gx = e.accelerationIncludingGravity?.x ?? 0;
        const t: Turn | null = gx > 6 ? 90 : gx < -6 ? -90 : null;
        if (t !== null && t !== this.sensedTurn) { this.sensedTurn = t; if (this.mode === 'rotated') this.relayout(); }
      });
    }
    if (wantsTouch(this.coarse, false)) this.activate();
  }

  /** The game (or the loader) changed: its controls, and whether it has a pause screen. */
  setGame(layout: TouchLayout | undefined, keys: { pause: boolean; home: boolean }) {
    this.layout = layout ?? NO_CONTROLS;
    this.keys = keys;
    this.placeKeys();
  }

  /** The small keys, as the game has them. */
  private placeKeys() {
    const { pause, home } = this.keys, sys: SystemSpec[] = [];
    if (home) sys.push({ id: 'home', label: 'HOME' });
    sys.push({ id: 'layout', label: 'TURN' });
    if (pause) sys.push({ id: 'pause', label: 'PAUSE' });
    if (home) sys.push({ id: 'enter', label: 'RETURN', key: 'Enter' });
    this.system = sys;
    this.relayout();
  }

  /** The game should wait (the "turn your phone" screen is up). */
  get holding() { return this.active && !this.started; }

  private activate() {
    if (this.active) return;
    this.active = true;
    // (a phone or tablet starts with "turn your phone"; a touch screen on a computer just shows the controls)
    if (!this.coarse) this.started = true;
    this.host.input.touch = true;
    this.host.stage.classList.add('touch');
    this.relayout();
  }

  private canFullscreen() {
    return !!this.host.stage.requestFullscreen && document.fullscreenEnabled !== false;
  }

  /** The first tap: full screen, and landscape (or upright, if chosen there or before). */
  private start(e: PointerEvent) {
    const portraitViewport = innerHeight > innerWidth;
    if (!this.nudge.hidden) {
      const r = this.nudge.getBoundingClientRect();
      const l = nudgeLayout(innerWidth, innerHeight);
      if (nudgeChoice(((e.clientY - r.top) / Math.max(1, r.height)) * l.h, l, portraitViewport) === 'upright') this.setView('upright');
      else if (this.view === 'upright') this.setView('land');
    }
    this.started = true;
    if (this.canFullscreen() && this.coarse) {
      this.lockPending = this.view !== 'upright';
      void this.host.stage.requestFullscreen({ navigationUI: 'hide' }).then(() => this.lock(), () => { this.lockPending = false; this.relayout(); });
    }
    this.relayout();
  }

  private lock() {
    const o = screen.orientation;
    if (!o?.lock) { this.lockPending = false; this.relayout(); return; }
    const want = this.view === 'upright' ? 'portrait' : 'landscape';
    this.lockPending = want === 'landscape';
    o.lock(want).then(() => { this.lockPending = false; this.relayout(); }, () => { this.lockPending = false; this.relayout(); });
    // (if the answer never comes, don't wait for it)
    setTimeout(() => { if (this.lockPending) { this.lockPending = false; this.relayout(); } }, 1500);
  }

  private setView(v: View) {
    this.view = v;
    try { localStorage.setItem(PREF_KEY, v); } catch { /* for this visit */ }
  }

  /** The TURN button: landscape, landscape the other way round (when drawn turned), upright. */
  private cycleView() {
    const turned = this.mode === 'rotated';
    const order: View[] = turned ? ['land', 'land-flip', 'upright'] : ['land', 'upright'];
    const cur = this.view === 'land-flip' && !turned ? 'land' : this.view;
    this.setView(order[(order.indexOf(cur) + 1) % order.length]);
    if (document.fullscreenElement) this.lock();
    this.relayout();
  }

  /** Client (viewport) position to stage px. */
  private toStage(cx: number, cy: number) {
    if (this.turn) return clientToStage(cx, cy, innerWidth, innerHeight, this.turn);
    const r = this.host.stage.getBoundingClientRect();
    return { x: cx - r.left, y: cy - r.top };
  }

  private insets(): Insets {
    const s = getComputedStyle(this.insetProbe);
    const n = (v: string) => parseFloat(v) || 0;
    return { top: n(s.paddingTop), right: n(s.paddingRight), bottom: n(s.paddingBottom), left: n(s.paddingLeft) };
  }

  private geometry(): Geometry {
    const stage = this.host.stage;
    const w = stage.clientWidth || innerWidth, h = stage.clientHeight || innerHeight;
    const vi = this.insets();
    // the viewport's safe areas, as the stage sees them when it's drawn turned
    const inset: Insets = this.turn === 90 ? { left: vi.top, right: vi.bottom, top: vi.right, bottom: vi.left }
      : this.turn === -90 ? { left: vi.bottom, right: vi.top, top: vi.left, bottom: vi.right } : vi;
    const mode = this.mode === 'portrait' ? 'portrait' : 'landscape';
    return layoutStage(w, h, mode, this.active ? this.layout : NO_CONTROLS, this.active ? this.system : [], inset, edgeGuard(this.turn));
  }

  /** Work out the mode, turn the stage if need be, and place everything again. */
  relayout() {
    const { stage, renderer } = this.host;
    this.mode = decideMode({ vw: innerWidth, vh: innerHeight, preferPortrait: this.view === 'upright', started: this.started, lockPending: this.lockPending });
    if (!this.active) this.mode = innerWidth >= innerHeight ? 'landscape' : 'portrait';
    this.turn = this.active && this.mode === 'rotated' ? (this.view === 'land-flip' ? turnedOver(this.sensedTurn ?? 90) : this.sensedTurn ?? 90) : 0;
    if (this.turn) {
      Object.assign(stage.style, { position: 'fixed', left: '0', top: '0', width: `${innerHeight}px`, height: `${innerWidth}px`, transformOrigin: '0 0', transform: stageTransform(innerWidth, innerHeight, this.turn) });
      renderer.clientToLocal = (x, y) => clientToStage(x, y, innerWidth, innerHeight, this.turn);
    } else {
      Object.assign(stage.style, { position: '', left: '', top: '', width: '', height: '', transformOrigin: '', transform: '' });
      renderer.clientToLocal = null;
    }
    stage.classList.toggle('turned', !!this.turn);
    const geo = this.geometry();
    this.ctl.setGeometry(geo, this.active ? this.layout.stick : 'none');
    const controls = this.active && this.started;
    renderer.area = controls ? geo.picture : null;
    this.ui.hidden = !controls;
    this.build(geo);
    this.draw();
    this.showNudge(this.active && !this.started && this.coarse);
  }

  private showNudge(on: boolean) {
    this.nudge.hidden = !on;
    clearInterval(this.nudgeTimer);
    if (!on) return;
    const paint = () => paintNudge(this.nudge, nudgeLayout(innerWidth, innerHeight), this.nudgeTick++, innerHeight > innerWidth);
    paint();
    this.nudgeTimer = window.setInterval(paint, 40);
    this.nudge.style.aspectRatio = `${NUDGE_W} / ${nudgeLayout(innerWidth, innerHeight).h}`;
  }

  /** The controls' elements (looks only: touches are handled for the whole stage). */
  private build(geo: Geometry) {
    this.ui.replaceChildren();
    const base = el('div', 'touch-stick'), knob = el('div', 'touch-knob');
    base.hidden = knob.hidden = !geo.stickZone;
    const buttons = geo.buttons.map((b) => {
      const d = el('div', `touch-btn ${b.spec.colour ?? (b.index === 0 ? 'red' : 'grey')}${b.spec.mode === 'toggle' ? ' toggle' : ''}`);
      place(d, b.x, b.y, b.r);
      const label = el('span', '');
      label.textContent = b.spec.label;
      d.append(label);
      d.style.fontSize = `${Math.max(9, Math.min(13, b.r * 0.42))}px`;
      return d;
    });
    const system = geo.system.map((s) => {
      const d = el('div', `touch-key key-${s.spec.id}`);
      place(d, s.x, s.y, s.r);
      d.innerHTML = ICONS[s.spec.id] ?? '';
      d.title = s.spec.label;
      return d;
    });
    this.ui.append(base, knob, ...buttons, ...system);
    this.els = { base, knob, buttons, system };
  }

  private draw() {
    const e = this.els;
    if (!e) return;
    const geo = this.ctl.geometry, s = this.ctl.stick, R = geo.stickRadius;
    place(e.base, s.cx, s.cy, R);
    const dx = s.x - s.cx, dy = s.y - s.cy, d = Math.hypot(dx, dy), k = d > R * 0.7 ? (R * 0.7) / d : 1;
    place(e.knob, s.cx + dx * k, s.cy + dy * k, R * 0.42);
    e.base.classList.toggle('on', s.active);
    e.knob.classList.toggle('on', s.active);
    e.buttons.forEach((b, i) => b.classList.toggle('on', this.ctl.isLit(i)));
    // fade when nothing has been touched for a while
    this.ui.classList.remove('idle');
    clearTimeout(this.idleTimer);
    this.idleTimer = window.setTimeout(() => this.ui.classList.add('idle'), 4000);
  }
  private idleTimer = 0;
}

function el<K extends keyof HTMLElementTagNameMap>(tag: K, cls: string) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  return e;
}

const turnedOver = (t: Turn): Turn => (t === 90 ? -90 : 90);

// ScreenOrientation.lock() is in browsers (not all: hence optional) but not in TypeScript's DOM lib.
declare global {
  interface ScreenOrientation {
    lock?(orientation: 'portrait' | 'landscape'): Promise<void>;
  }
}

function place(e: HTMLElement, x: number, y: number, r: number) {
  e.style.left = `${x - r}px`;
  e.style.top = `${y - r}px`;
  e.style.width = e.style.height = `${2 * r}px`;
}

const ICONS: Record<string, string> = {
  home: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M1.5 8 8 2l6.5 6M3.5 6.5V14h3.5v-4h2v4h3.5V6.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"/></svg>',
  layout: '<svg viewBox="0 0 16 16" aria-hidden="true"><rect x="5" y="1.5" width="6" height="11" rx="1" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M2 9a6 6 0 0 0 5 5.5M13.5 6.5A6 6 0 0 0 9 1.6" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M5.5 13.3 7 14.6 5.8 16" fill="none" stroke="currentColor" stroke-width="1.4"/></svg>',
  pause: '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M5 3v10M11 3v10" stroke="currentColor" stroke-width="3"/></svg>',
  enter: '<span>RET</span>',
};

