import type { Geometry, PlacedButton, PlacedSystem, StickKind, SystemId } from './layout';

/**
 * Turns touches (pointer events, already in stage coordinates) into key presses
 * on a `KeySink` (c64kit's Input): the floating stick presses the arrow keys,
 * buttons press the keys they stand for, the small buttons call back. No DOM
 * here, so it can be tested headless.
 */
export interface KeySink {
  keyDown(code: string): void;
  keyUp(code: string): void;
  /** A tap on the picture, in stage px (not on a control). */
  tap?(x: number, y: number): void;
}

export const DIR_KEYS = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' } as const;
type Dir = keyof typeof DIR_KEYS;

/** The stick's state, for drawing it. */
export interface StickState { active: boolean; cx: number; cy: number; x: number; y: number; dirs: Dir[] }

type Owner =
  | { kind: 'stick' }
  | { kind: 'button'; index: number }
  | { kind: 'system'; id: SystemId }
  | { kind: 'picture' }
  | { kind: 'none' };

export class TouchController {
  private geo: Geometry;
  private stickKind: StickKind;
  private owners = new Map<number, Owner>();
  private stickPointer: number | null = null;
  readonly stick: StickState = { active: false, cx: 0, cy: 0, x: 0, y: 0, dirs: [] };
  /** Buttons held (by index), how many fingers each. */
  private holding = new Map<number, number>();
  /** Toggle buttons that are on (by index). */
  readonly toggled = new Set<number>();
  /** When a touch last happened (ms), for fading the controls when idle. */
  lastActivity = -Infinity;
  /** A press happened (for a haptic tick). */
  onPress: () => void = () => {};
  /** A small button was tapped. */
  onSystem: (id: SystemId) => void = () => {};

  constructor(private sink: KeySink, geo: Geometry, stick: StickKind) {
    this.geo = geo;
    this.stickKind = stick;
    this.resetStick();
  }

  /** New geometry (a resize, or another game's layout): everything held is let go. */
  setGeometry(geo: Geometry, stick: StickKind) {
    this.releaseAll();
    const keepToggles = [...this.toggled].filter((i) => geo.buttons[i]?.spec.mode === 'toggle');
    for (const i of this.toggled) if (!keepToggles.includes(i)) this.sink.keyUp(this.geo.buttons[i].spec.key);
    this.toggled.clear();
    for (const i of keepToggles) this.toggled.add(i); // (still held down in the sink)
    this.geo = geo;
    this.stickKind = stick;
    this.resetStick();
  }

  get geometry() { return this.geo; }

  /** Is a button (by index) shown pressed? */
  isLit(index: number) { return (this.holding.get(index) ?? 0) > 0 || this.toggled.has(index); }

  private resetStick() {
    const h = this.geo.stickHome;
    Object.assign(this.stick, { active: false, cx: h.x, cy: h.y, x: h.x, y: h.y });
  }

  down(id: number, x: number, y: number, now = 0) {
    this.lastActivity = now;
    const owner = this.hit(x, y);
    this.owners.set(id, owner);
    if (owner.kind === 'stick') {
      const z = this.geo.stickZone; // (there is one: the stick was hit)
      if (this.stickPointer !== null || !z) { this.owners.set(id, { kind: 'none' }); return; }
      this.stickPointer = id;
      // the stick's centre is where the thumb lands (kept inside its zone)
      const r = this.geo.stickRadius * 0.5;
      const cx = clamp(x, z.x + r, z.x + z.w - r), cy = clamp(y, z.y + r, z.y + z.h - r);
      Object.assign(this.stick, { active: true, cx, cy, x, y });
      this.updateStick();
    } else if (owner.kind === 'button') {
      this.pressButton(owner.index);
    } else if (owner.kind === 'picture') {
      this.sink.tap?.(x, y);
    } else if (owner.kind === 'system') {
      const key = this.systemKey(owner.id);
      if (key) { this.sink.keyDown(key); this.onPress(); }
    }
  }

  private systemKey(id: SystemId) {
    return this.geo.system.find((p) => p.spec.id === id)?.spec.key;
  }

  move(id: number, x: number, y: number, now = 0) {
    const owner = this.owners.get(id);
    if (!owner) return;
    this.lastActivity = now;
    if (owner.kind === 'stick') {
      const s = this.stick, R = this.geo.stickRadius;
      s.x = x; s.y = y;
      // a thumb that goes past the stick's reach drags the stick along
      const dx = x - s.cx, dy = y - s.cy, d = Math.hypot(dx, dy);
      if (d > R) { s.cx += (dx * (d - R)) / d; s.cy += (dy * (d - R)) / d; }
      this.updateStick();
    } else if (owner.kind === 'button') {
      // sliding a thumb from one button to the next (not onto or off a toggle)
      const now2 = this.nearestButton(x, y);
      const from = this.geo.buttons[owner.index];
      if (now2 && now2.index !== owner.index && from.spec.mode !== 'toggle' && now2.spec.mode !== 'toggle' && this.inZone(x, y)) {
        this.releaseButton(owner.index);
        this.owners.set(id, { kind: 'button', index: now2.index });
        this.pressButton(now2.index);
      }
    }
  }

  up(id: number, x?: number, y?: number, now = 0) {
    const owner = this.owners.get(id);
    if (!owner) return;
    this.lastActivity = now;
    this.owners.delete(id);
    if (owner.kind === 'stick') {
      this.stickPointer = null;
      this.setDirs([]);
      this.resetStick();
    } else if (owner.kind === 'button') {
      this.releaseButton(owner.index);
    } else if (owner.kind === 'system') {
      const key = this.systemKey(owner.id);
      if (key) this.sink.keyUp(key);
      else {
        // (on lifting the finger, still on the button, like any button)
        const s = this.geo.system.find((p) => p.spec.id === owner.id);
        if (s && (x === undefined || y === undefined || Math.hypot(x - s.x, y - s.y) <= s.r + 16)) this.onSystem(owner.id);
      }
    }
  }

  /** A touch was cancelled by the browser: let it go without acting on it. */
  cancel(id: number) {
    const owner = this.owners.get(id);
    if (owner?.kind === 'system' && !this.systemKey(owner.id)) this.owners.set(id, { kind: 'none' });
    this.up(id);
  }

  /** Let go of everything (the controls are going away). Toggles stay as they are. */
  releaseAll() {
    for (const id of [...this.owners.keys()]) this.cancel(id);
  }

  /** What a touch at (x, y) is for. */
  hit(x: number, y: number): Owner {
    const sys = this.nearestSystem(x, y);
    if (sys) return { kind: 'system', id: sys.spec.id };
    if (this.inZone(x, y)) {
      const b = this.nearestButton(x, y);
      if (b) return { kind: 'button', index: b.index };
    }
    const z = this.geo.stickZone;
    if (z && this.stickKind !== 'none' && inRect(x, y, z)) return { kind: 'stick' };
    if (inRect(x, y, this.geo.picture)) return { kind: 'picture' };
    return { kind: 'none' };
  }

  private inZone(x: number, y: number) {
    const z = this.geo.buttonZone;
    return !!z && inRect(x, y, z);
  }

  private nearestButton(x: number, y: number): PlacedButton | null {
    let best: PlacedButton | null = null, bd = Infinity;
    for (const b of this.geo.buttons) {
      const d = Math.hypot(x - b.x, y - b.y) / b.r; // (relative to size: a big button reaches further)
      if (d < bd) { bd = d; best = b; }
    }
    return best;
  }

  private nearestSystem(x: number, y: number): PlacedSystem | null {
    for (const s of this.geo.system) if (Math.hypot(x - s.x, y - s.y) <= s.r + 6) return s;
    return null;
  }

  private pressButton(i: number) {
    const b = this.geo.buttons[i];
    if (b.spec.mode === 'toggle') {
      if (this.toggled.has(i)) { this.toggled.delete(i); this.sink.keyUp(b.spec.key); }
      else { this.toggled.add(i); this.sink.keyDown(b.spec.key); this.onPress(); }
      return;
    }
    const n = this.holding.get(i) ?? 0;
    this.holding.set(i, n + 1);
    this.sink.keyDown(b.spec.key);
    this.onPress();
  }

  private releaseButton(i: number) {
    const b = this.geo.buttons[i];
    if (!b || b.spec.mode === 'toggle') return;
    const n = this.holding.get(i) ?? 0;
    if (n <= 0) return;
    if (n === 1) this.holding.delete(i);
    else this.holding.set(i, n - 1);
    this.sink.keyUp(b.spec.key);
  }

  /** The directions the stick points (with a dead zone in the middle, and a little stickiness at sector edges). */
  private updateStick() {
    const s = this.stick, R = this.geo.stickRadius;
    const dx = s.x - s.cx, dy = s.y - s.cy, d = Math.hypot(dx, dy);
    const dead = R * 0.28;
    let dirs: Dir[] = [];
    if (this.stickKind === 'lr') {
      const held = s.dirs[0];
      const t = held ? dead * 0.7 : dead;
      if (dx < -t) dirs = ['left'];
      else if (dx > t) dirs = ['right'];
    } else if (d > (s.dirs.length ? dead * 0.8 : dead)) {
      const a = (Math.atan2(dy, dx) * 180) / Math.PI; // 0 = right, 90 = down
      dirs = this.stickKind === '4' ? sector4(a, s.dirs) : sector8(a, s.dirs);
    }
    this.setDirs(dirs);
  }

  private setDirs(dirs: Dir[]) {
    const old = this.stick.dirs;
    for (const d of old) if (!dirs.includes(d)) this.sink.keyUp(DIR_KEYS[d]);
    let pressed = false;
    for (const d of dirs) if (!old.includes(d)) { this.sink.keyDown(DIR_KEYS[d]); pressed = true; }
    this.stick.dirs = dirs;
    if (pressed) this.onPress();
  }
}

const ANGLES4: [number, Dir][] = [[0, 'right'], [90, 'down'], [180, 'left'], [-90, 'up']];
const angleDiff = (a: number, b: number) => Math.abs((((a - b) % 360) + 540) % 360 - 180);

function sector4(a: number, cur: Dir[]): Dir[] {
  // keep the current direction until clearly past the diagonal
  if (cur.length === 1) {
    const at = ANGLES4.find(([, d]) => d === cur[0])?.[0];
    if (at !== undefined && angleDiff(a, at) <= 45 + 8) return cur;
  }
  let best: Dir = 'right', bd = Infinity;
  for (const [ang, d] of ANGLES4) { const df = angleDiff(a, ang); if (df < bd) { bd = df; best = d; } }
  return [best];
}

function sector8(a: number, cur: Dir[]): Dir[] {
  const sectors: [number, Dir[]][] = [
    [0, ['right']], [45, ['right', 'down']], [90, ['down']], [135, ['left', 'down']],
    [180, ['left']], [-135, ['left', 'up']], [-90, ['up']], [-45, ['right', 'up']],
  ];
  const same = (x: Dir[], y: Dir[]) => x.length === y.length && x.every((d) => y.includes(d));
  const curSector = sectors.find(([, d]) => same(d, cur));
  if (curSector && angleDiff(a, curSector[0]) <= 22.5 + 6) return cur;
  let best = sectors[0][1], bd = Infinity;
  for (const [ang, d] of sectors) { const df = angleDiff(a, ang); if (df < bd) { bd = df; best = d; } }
  return best;
}

const clamp = (v: number, lo: number, hi: number) => (hi < lo ? (lo + hi) / 2 : Math.max(lo, Math.min(hi, v)));
const inRect = (x: number, y: number, r: { x: number; y: number; w: number; h: number }) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h;
