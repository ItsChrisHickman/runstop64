import { C64View, Surface, TRANSPARENT, decodeSprite, packState, unpackState, type BitmapFont, type Host, type MachineState, type SidWrite, type SpriteHandle } from 'c64kit';
import { NativeHost, type PortConfig } from './host';
import { clean, type StatusLine } from './narrate';

/**
 * The reward for beating a game (ENHANCED's addition: the game's own winning moment stays as it is, and
 * what follows it is ours), written once for the Pendragon games; a game declares its places and its cast.
 *
 *  1. A montage: places aboard revisited, each drawn by the game's own engine on a game of its own
 *     (a new game started on a machine of ours, never the player's), with its creatures moving as the
 *     engine moves them and Pendragon running through it by the joystick, as in play, doing one thing
 *     that fits the place (strike at a creature, take what belonged there). A caption on the game's
 *     status line, in its own lettering.
 *  2. A parade: the game's creatures, their images and animation frames recorded from the engine
 *     (the sprites it shows in a place), walking across one at a time at double size with a name under each.
 *  3. THE END and the player's numbers, then back to the title.
 *
 * Music: the game's title tune, run on a title machine of its own, through the player the game uses.
 * Any key or tap skips, after a couple of seconds. Everything is drawn in the 320x200 picture in the
 * game's own font and the C64's colours; letters stand on the picture's empty parts, never on a box.
 *
 * Watching it again: `Won` keeps that the game has been won (never wiped by a new game); the pause
 * screen offers the ending once it has, and `?ending` on the page shows it at once.
 */

// ---- what a game declares ---------------------------------------------------------------------

/** What Pendragon does in a place, one after the other (sprite coordinates are the VIC's, as `capture.sprites` has them). */
export type EndingStep =
  /** Walk to a place along the floor (the joystick, as a player would). */
  | { walk: readonly [number, number] }
  /** Close in on a creature (sprite number) from a side and strike it with the sword for a moment. `dy`: how far below its top he stands (his feet against its). */
  | { strike: number; from: 'left' | 'right'; reach?: number; dy?: number; frames?: number }
  /** Jump (straight up) a few times. */
  | { jump: number }
  /** Stand a moment. */
  | { wait: number };

/** A place to revisit. */
export interface EndingScene {
  /** On the status line (the game's lettering: A-Z, 0-9, a colon; at most 32 letters, or it goes in parts). */
  caption: string;
  /** Put him there, the game's own way (called at the main loop's wait of a new game); false if it can't. */
  enter(ram: Uint8Array): boolean;
  steps: readonly EndingStep[];
  /** How long it is shown (frames at 50 a second). */
  frames: number;
}

/** One of the game's characters for the parade: the sprites that make it up in a place (top part first). */
export interface EndingCharacter {
  name: string;
  enter(ram: Uint8Array): boolean;
  /** The sprite numbers of its parts (a figure made of two sprites, one under the other, gives both). */
  sprites: readonly number[];
  /** What he does while its frames are recorded (Pendragon walking: `walk`); the others do as the engine does. */
  steps?: readonly EndingStep[];
  /** Frames recorded from the first (default 150). */
  frames?: number;
}

export interface EndingSpec {
  /** The game's title, over the parade. */
  title: string;
  scenes: readonly EndingScene[];
  cast: readonly EndingCharacter[];
  /** The status line the caption goes on. */
  status: StatusLine;
  /** The joystick port the game reads, if only one. */
  joyPort?: 1 | 2;
  /** Pendragon's sprite number (2 in all three games). */
  hero: number;
  /** A new game's memory made ready: what he needs in his hands (the sword). */
  arm(ram: Uint8Array): void;
  /** The action he is using now (1 jump, 2 sword) and picking one: the game's own, as the front end's action keys do. */
  action: { get(ram: Uint8Array): number; set(ram: Uint8Array, n: number, call: (fn: () => void) => void): void };
  /** Each frame: nothing may end it (energy kept up). */
  keepAlive(ram: Uint8Array): void;
  /** Frames the fire button is held on the title to start a game (default 31 to 33), as the title wants. */
  startFire?: readonly [number, number];
}

// ---- won: kept apart from the saves (a new game never wipes it) --------------------------------

const wonKey = (id: string) => `${id}.won`;

/** Whether this game has been won here before. */
export function readWon(id: string): boolean {
  try { return localStorage.getItem(wonKey(id)) === '1'; } catch { return false; }
}

/** The game has been won: kept. */
export function keepWon(id: string) {
  try { localStorage.setItem(wonKey(id), '1'); } catch { /* not kept: the ending is still shown this time */ }
}

/** `?ending` on the page: the ending at once (for review). */
export function wantsEnding(): boolean {
  try { return new URLSearchParams(location.search).has('ending'); } catch { return false; }
}

// ---- the machines ---------------------------------------------------------------------------

/** Joystick bits (low = pressed). */
const UP = 1, DOWN = 2, LEFT = 4, RIGHT = 8, FIRE = 16, IDLE = 0x1f;

function joy(m: { joy1: number; joy2: number }, port: 1 | 2 | undefined, bits: number) {
  m.joy1 = port === 2 ? IDLE : bits;
  m.joy2 = port === 1 ? IDLE : bits;
}

/** A new game, started from the title and run to its first frames of play (as the title wants it: the fire button held a moment). */
function bootGame(port: PortConfig, title: MachineState, spec: EndingSpec): MachineState | null {
  const g = new NativeHost(port, unpackState(packState(title)));
  const [from, to] = spec.startFire ?? [31, 33];
  for (let f = 0; f < 40; f++) { joy(g.m, spec.joyPort, f >= from && f <= to ? IDLE & ~FIRE : IDLE); g.tick(); }
  for (let f = 0; f < 400 && (g.lastWait !== port.mainLoopWait || f < 60); f++) { joy(g.m, spec.joyPort, IDLE); g.tick(); }
  for (let f = 0; f < 30; f++) { joy(g.m, spec.joyPort, IDLE); g.tick(); }
  return g.save();
}

/** A sprite as the last frame drew it (the first time it appears). */
function spriteOf(g: NativeHost, n: number) {
  return g.m.capture.sprites.find((s) => s.n === n && s.x < 504);
}

/** What Pendragon does, a step at a time, as joystick input on a frame. */
class Director {
  private i = 0;
  private spent = 0;
  private strike = { swing: 0, rest: 0 };
  constructor(private readonly spec: EndingSpec, private readonly steps: readonly EndingStep[]) {}

  get done() { return this.i >= this.steps.length; }

  private next() { this.i++; this.spent = 0; this.strike = { swing: 0, rest: 0 }; }

  /** The joystick for this frame, with the sword or jump chosen for it. */
  frame(g: NativeHost): number {
    const step = this.steps[this.i];
    if (!step) return IDLE;
    const me = spriteOf(g, this.spec.hero);
    this.spent++;
    if ('wait' in step) { if (this.spent >= step.wait) this.next(); return IDLE; }
    if ('jump' in step) {
      this.choose(g, 1);
      // fire for a frame now and then: each press is a jump, and he lands before the next
      const phase = this.spent % 40;
      if (this.spent >= step.jump * 40) this.next();
      return phase === 1 ? IDLE & ~FIRE : IDLE;
    }
    if (!me) return IDLE;
    if ('walk' in step) {
      const [x, y] = step.walk;
      const bits = approach(me.x, me.y, x, y, 2);
      if (bits === IDLE || this.spent > 400) this.next();
      return bits;
    }
    // strike: close in, face it, swing
    this.choose(g, 2);
    const t = spriteOf(g, step.strike);
    // (not in sight yet: he waits for it)
    if (this.spent > (step.frames ?? 240)) { this.next(); return IDLE; }
    if (!t) return IDLE;
    const reach = step.reach ?? 28;
    const goalX = step.from === 'left' ? t.x - reach : t.x + reach, goalY = t.y + (step.dy ?? 0);
    const near = Math.abs(me.x - goalX) <= 4 && Math.abs(me.y - goalY) <= 4;
    const face = step.from === 'left' ? RIGHT : LEFT;
    if (!near && this.strike.swing === 0) return approach(me.x, me.y, goalX, goalY, 3);
    // in place: turn to it (a frame of the stick that way), then fire a stroke and rest
    if (this.strike.swing === 0 && this.strike.rest === 0) { this.strike.swing = 1; return IDLE & ~face; }
    if (this.strike.swing > 0) {
      this.strike.swing++;
      if (this.strike.swing > 16) { this.strike.swing = 0; this.strike.rest = 12; }
      return this.strike.swing === 2 ? IDLE & ~face : IDLE & ~FIRE;
    }
    if (--this.strike.rest <= 0) this.strike.rest = 0;
    return IDLE;
  }

  /** The action in hand. */
  private choose(g: NativeHost, n: number) {
    const a = this.spec.action;
    if (a.get(g.m.ram) !== n) a.set(g.m.ram, n, (fn) => g.callNative(fn));
  }
}

/** A caption on the status line (the game's own lettering, from the left; kept there every frame: the game draws its own line back otherwise). */
function caption(ram: Uint8Array, line: StatusLine, text: string) {
  const t = clean(text, line);
  for (let i = 0; i < line.width; i++) {
    const ch = t[i];
    ram[line.at + i] = ch === undefined || ch === ' ' ? line.blank : line.code(ch) ?? line.blank;
  }
}

/** The joystick that closes in on a place (a step at a time along each way); IDLE when there. */
function approach(x: number, y: number, tx: number, ty: number, near: number) {
  let bits = IDLE;
  if (y < ty - near) bits &= ~DOWN; else if (y > ty + near) bits &= ~UP;
  if (x < tx - near) bits &= ~RIGHT; else if (x > tx + near) bits &= ~LEFT;
  return bits;
}

// ---- the cast, recorded ----------------------------------------------------------------------

/** One part of a figure at one moment: its image drawn at double size, and where it stands against the figure's top left (screen pixels at double size). */
interface Part { surface: Surface; dx: number; dy: number }
/** A figure at one moment, and how long (frames) it was so. */
interface Pose { parts: Part[]; frames: number }
interface Figure { name: string; poses: Pose[]; width: number; height: number }

const SCALE = 2;

/** Record a character's poses: the engine runs on a new game in its place for some frames, and each distinct picture of its sprites is kept. */
function record(port: PortConfig, base: MachineState, spec: EndingSpec, c: EndingCharacter): Figure | null {
  const g = placed(port, base, spec, c.enter);
  if (!g) return null;
  const director = new Director(spec, c.steps ?? []);
  const poses: Pose[] = [];
  let last = '';
  let width = 0, height = 0;
  for (let f = 0; f < (c.frames ?? 150); f++) {
    joy(g.m, spec.joyPort, director.frame(g));
    spec.keepAlive(g.m.ram);
    g.tick();
    const seen = c.sprites.map((n) => spriteOf(g, n));
    if (seen.some((s) => s === undefined)) continue;
    // (the highest numbers first: the lower the number, the nearer the front, as the VIC has it)
    const here = seen.flatMap((s) => (s ? [s] : [])).sort((a, b) => b.n - a.n);
    const left = Math.min(...here.map((s) => s.x)), top = Math.min(...here.map((s) => s.y));
    // (shape: the sprites' images and where they stand against each other)
    const key = here.map((s) => `${s.x - left},${s.y - top},${s.colour},${s.multicolour ? 1 : 0},${s.mc1},${s.mc2},${s.expandX ? 1 : 0},${s.expandY ? 1 : 0},${Array.from(s.data.subarray(0, 63)).join('.')}`).join('|');
    const prev = poses[poses.length - 1];
    if (key === last && prev) { prev.frames++; continue; }
    last = key;
    const parts = here.map((s) => {
      const surface = new Surface(24 * SCALE * (s.expandX ? 2 : 1), 21 * SCALE * (s.expandY ? 2 : 1));
      const flat = new Surface(surface.width / SCALE, surface.height / SCALE);
      decodeSprite(s.data, s.colour, s.multicolour, s.mc1, s.mc2, s.expandX, s.expandY, flat);
      for (let y = 0; y < surface.height; y++) for (let x = 0; x < surface.width; x++) surface.pixels[y * surface.width + x] = flat.pixels[Math.floor(y / SCALE) * flat.width + Math.floor(x / SCALE)];
      surface.version++;
      return { surface, dx: (s.x - left) * SCALE, dy: (s.y - top) * SCALE };
    });
    poses.push({ parts, frames: 1 });
    width = Math.max(width, ...parts.map((p) => p.dx + p.surface.width));
    height = Math.max(height, ...parts.map((p) => p.dy + p.surface.height));
  }
  return poses.length ? { name: c.name, poses, width, height } : null;
}

/** A new game's memory with him in a place (entered at the main loop's wait, as travel does it). */
function placed(port: PortConfig, base: MachineState, spec: EndingSpec, enter: (ram: Uint8Array) => boolean): NativeHost | null {
  const g = NativeHost.resume(port, unpackState(packState(base)));
  let done = false, ok = true;
  g.onWait = (site) => {
    if (site !== port.mainLoopWait || done) return;
    done = true;
    spec.arm(g.m.ram);
    ok = enter(g.m.ram);
  };
  // (a few frames for the place to be there)
  for (let f = 0; f < 6; f++) { joy(g.m, spec.joyPort, IDLE); spec.keepAlive(g.m.ram); g.tick(); }
  return done && ok ? g : null;
}

// ---- the show -------------------------------------------------------------------------------

/** What the show needs of the game running it. */
export interface EndingOptions {
  host: Host;
  spec: EndingSpec;
  port: PortConfig;
  /** The title's memory as a new game starts from it (the text and mends applied), or null while it is not loaded. */
  title(): MachineState | null;
  /** The sound: the title tune's writes go in a frame at a time. */
  sound: { pushFrame(w: SidWrite[]): void };
  /** The game's font (the panels'). */
  font(): BitmapFont;
  /** The show is over (or skipped): back to the title. */
  done(): void;
}

type Phase = 'loading' | 'montage' | 'parade' | 'end';

/** The frames before a key or a tap skips it. */
const SKIP_AFTER = 100;
/** The parade: how fast a figure crosses (pixels a frame), and the ground it walks on and where its name goes. */
const PARADE = { speed: 3, ground: 128, nameGap: 10 };
/** The names and numbers: the colours (the title's yellow, light grey). */
const YELLOW = 7, GREY = 15;

export class Ending {
  private phase: Phase = 'loading';
  private frames = 0;
  private stats: readonly string[] = [];
  private base: MachineState | null = null;
  private music: NativeHost | null = null;
  private figures: Figure[] = [];
  // the montage
  private scene = -1;
  private machine: NativeHost | null = null;
  private view: C64View | null = null;
  private director: Director | null = null;
  // the parade and the end
  private handles: SpriteHandle[] = [];
  private black = new Surface(320, 200, 0);

  constructor(private readonly o: EndingOptions) {}

  /** The show is on (the game is ours, not the player's). */
  active = false;

  /** For tests: where the show is (the montage's machine is the game being shown), and the figures recorded. */
  get progress() { return { phase: this.phase, scene: this.scene, frames: this.frames, machine: this.machine?.m, music: this.music?.m, figures: this.figures.map((f) => ({ name: f.name, poses: f.poses.length })) }; }

  /** Begin: `stats` are the lines under THE END. */
  start(stats: readonly string[]) {
    this.stop();
    this.active = true;
    this.phase = 'loading';
    this.frames = 0;
    this.stats = stats;
    this.figures = [];
    this.scene = -1;
  }

  /** Over: everything ours put away. */
  private stop() {
    this.view?.dispose();
    this.view = null; this.machine = null; this.music = null; this.base = null;
    for (const h of this.handles) h.visible = false;
    this.o.host.renderer.backdrop = null;
    this.active = false;
  }

  private finish() { this.stop(); this.o.done(); }

  /** A key or a tap, after a moment (M and V are the sound's). */
  private skipped() {
    const { input } = this.o.host;
    const pressed = input.typed.some((c) => c !== 'KeyM' && c !== 'KeyV') || input.points.length > 0 || input.pressed.fire;
    return pressed && this.frames > SKIP_AFTER;
  }

  /** One frame of the show. */
  tick() {
    if (!this.active) return;
    const { renderer } = this.o.host;
    this.frames++;
    if (this.phase === 'loading') {
      // (a black frame first, then the work: the machines are made and the cast recorded in one go)
      if (this.frames === 1) { renderer.backdrop = this.black; renderer.screen.clear(TRANSPARENT); renderer.border = 0; return; }
      this.load();
      return;
    }
    if (this.skipped()) { this.o.host.input.typed.length = 0; this.finish(); return; }
    this.o.host.input.typed.length = 0;
    this.tune();
    if (this.phase === 'montage') this.montage();
    else if (this.phase === 'parade') this.parade();
    else this.end();
  }

  /** The title tune, a frame of it. */
  private tune() {
    const m = this.music;
    if (!m) return;
    m.tick();
    this.o.sound.pushFrame(m.m.sidWrites);
  }

  /** The machines and the cast. */
  private load() {
    const { spec, port } = this.o;
    const title = this.o.title();
    if (!title) { this.finish(); return; }
    this.base = bootGame(port, title, spec);
    this.music = new NativeHost(port, unpackState(packState(title)));
    const base = this.base;
    if (!base) { this.finish(); return; }
    this.figures = spec.cast.flatMap((c) => { const f = record(port, base, spec, c); return f ? [f] : []; });
    this.next();
  }

  // -- the montage

  private next() {
    const { spec, port } = this.o;
    const base = this.base;
    this.scene++;
    this.frames = 0;
    this.view?.dispose();
    this.view = null;
    if (!base || this.scene >= spec.scenes.length) { this.beginParade(); return; }
    const scene = spec.scenes[this.scene];
    const g = placed(port, base, spec, scene.enter);
    if (!g) { this.next(); return; }
    this.machine = g;
    this.view = new C64View(this.o.host.renderer, g.m);
    this.director = new Director(spec, scene.steps);
    this.phase = 'montage';
  }

  private montage() {
    const g = this.machine, view = this.view, d = this.director, scene = this.o.spec.scenes[this.scene];
    if (!g || !view || !d) return;
    joy(g.m, this.o.spec.joyPort, d.frame(g));
    this.o.spec.keepAlive(g.m.ram);
    g.tick();
    caption(g.m.ram, this.o.spec.status, scene.caption);
    view.update();
    if (this.frames >= scene.frames) this.next();
  }

  // -- the parade

  private beginParade() {
    this.phase = 'parade';
    this.frames = 0;
    this.machine = null;
    const { renderer } = this.o.host;
    renderer.backdrop = this.black;
    renderer.border = 0;
  }

  /** How long each figure takes to cross, with a moment before the next. */
  private crossing(f: Figure) { return Math.ceil((320 + f.width) / PARADE.speed) + 10; }

  private parade() {
    const { renderer } = this.o.host;
    const font = this.o.font();
    let t = this.frames - 1, i = 0;
    while (i < this.figures.length && t >= this.crossing(this.figures[i])) { t -= this.crossing(this.figures[i]); i++; }
    const fig = this.figures[i];
    renderer.screen.clear(TRANSPARENT);
    font.draw(renderer.screen, this.o.spec.title, 8, 12, YELLOW);
    if (!fig) { this.phase = 'end'; this.frames = 0; for (const h of this.handles) h.visible = false; return; }
    const x = Math.round(-fig.width + t * PARADE.speed);
    // its own animation, at the pace it had in the engine
    const cycle = fig.poses.reduce((n, p) => n + p.frames, 0);
    let at = t % cycle, pose = fig.poses[0];
    for (const p of fig.poses) { pose = p; if (at < p.frames) break; at -= p.frames; }
    const top = PARADE.ground - fig.height;
    pose.parts.forEach((part, k) => {
      while (this.handles.length <= k) this.handles.push(renderer.createSprite(1 + this.handles.length * 0.01));
      const h = this.handles[k];
      h.surface = part.surface;
      h.x = x + part.dx; h.y = top + part.dy;
      h.visible = true;
    });
    for (let k = pose.parts.length; k < this.handles.length; k++) this.handles[k].visible = false;
    // the name under it, from its left (nothing centred), kept on the picture
    const nameX = Math.max(8, Math.min(x, 320 - 8 * fig.name.length - 8));
    font.draw(renderer.screen, fig.name, nameX, PARADE.ground + PARADE.nameGap, GREY);
    renderer.screen.version++;
  }

  // -- THE END

  private end() {
    const { renderer } = this.o.host;
    const font = this.o.font();
    renderer.screen.clear(TRANSPARENT);
    for (const h of this.handles) h.visible = false;
    bigText(renderer.screen, font, 'THE END', 24, 50, YELLOW);
    this.stats.forEach((line, i) => font.draw(renderer.screen, line, 24, 100 + i * 14, GREY));
    renderer.screen.version++;
    if (this.frames > 500) this.finish();
  }

  render(alpha: number) {
    if (!this.active) return;
    if (this.phase === 'montage' && this.view) this.view.render(alpha);
    else this.o.host.renderer.render();
  }
}

/** Text at double size (each pixel of the glyph a 2 x 2 block): for THE END. */
function bigText(s: Surface, font: BitmapFont, text: string, x: number, y: number, colour: number) {
  let px = x;
  for (const ch of text) {
    const g = font.glyph(ch);
    if (g) {
      for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) if (g[row] & (0x80 >> col)) s.fillRect(px + col * 2, y + row * 2, 2, 2, colour);
    }
    px += 16;
  }
}
