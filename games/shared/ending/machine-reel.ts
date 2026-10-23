/**
 * The reward's reel for a translated machine (the Pendragon games, Thing on a Spring, Jet Set Willy II): a place is a room of
 * the game, entered the game's own way on a new game of ours (a machine started from the title, never the player's), the hero
 * driven by the joystick as in play, doing one thing that fits the place, a caption on the game's status line in its own lettering.
 * The show itself (credits, visitors, THE END, skip) is `show.ts`, the same for every game; this file makes its places and its
 * cast from the game's scenes and characters, and plays the game's tune on a machine of its own, through the player the game uses
 * (a game with no music, Entombed: the sound of the places themselves, the whip and the bells).
 */

import { C64View, packState, unpackState, type BitmapFont, type FrameCapture, type Host, type MachineState, type PictureLayout, type SidWrite } from 'c64kit';
import { NativeHost, type PortConfig } from '../native/host';
import { clean, type StatusLine } from '../native/narrate';
import { TitleTune } from '../native/title-tune';
import { CREDIT } from './credits';
import { captureShot, recordFigure, shotFeet, type Figure, type SpriteShot } from './figures';
import { RewardShow, type Place, type Reel, type RewardSpec } from './show';

// ---- what a game declares ---------------------------------------------------------------------

/** A way he faces. */
export type Way = 'left' | 'right' | 'up' | 'down';

/** What Pendragon does in a place, one after the other (sprite coordinates are the VIC's, as `capture.sprites` has them). */
export type EndingStep =
  /** Walk to a place along the floor (the joystick, as a player would). */
  | { walk: readonly [number, number] }
  /** Close in on a creature (sprite number) from a side and strike it with the sword for a moment. `dy`: how far below its top he stands (his feet against its). `action`: the game's own number for what he strikes with (default `EndingSpec.action.strike`). */
  | { strike: number; from: 'left' | 'right'; reach?: number; dy?: number; frames?: number; action?: number }
  /**
   * Use an action (the game's own number for it) where he stands: turn to face a way (a moment of the stick), then press fire `times`
   * times, each held `hold` frames with `gap` frames after it (a stone thrown, a dig, the cloak put on).
   */
  | { use: number; face?: Way; times?: number; hold?: number; gap?: number }
  /** Hold a way for a number of frames (along a bridge the engine's oblique floor lets him up only on a line). */
  | { go: Way; frames: number }
  /**
   * Hold ways (two at once for a diagonal) for a number of frames, with fire held too if `fire`, choosing the action `action` first if given:
   * what the joystick does, as it is, for a leap along a ledge or a stroke at a place found by playing (the way there, step by step).
   */
  | { press: readonly Way[]; frames: number; fire?: boolean; action?: number }
  /** Jump (straight up) a few times. */
  | { jump: number }
  /** Stand a moment. */
  | { wait: number };

/** A place to revisit. */
export interface EndingScene {
  /** On the status line (the game's lettering: A-Z, 0-9, a colon; at most 32 letters, or it goes in parts). */
  caption?: string;
  /** Put him there, the game's own way (called at the main loop's wait of a new game); false if it can't. */
  enter(ram: Uint8Array): boolean;
  /** Once the place is there (a few frames after `enter`, before the first frame shown): put him on his spot, where the game's own way in does not (Jet Set Willy II's rooms are come into from above). */
  settle?(ram: Uint8Array): void;
  steps: readonly EndingStep[];
  /** How long it is shown (frames at 50 a second); longer if its credits and visitors need it (`timelineOf`). */
  frames: number;
  /**
   * Credit lines over this place, one after another (a line types on, is held, and goes): upper case, at most 38
   * letters. They stand in the black band between the picture and the status panel (`EndingSpec.creditRow`),
   * which Blackwyche's picture leaves empty, in the title's yellow, never on a box (or, where there is none, in the
   * panel's message line: `EndingSpec.creditLine`).
   */
  credits?: readonly string[];
  /** The frame the credit lines begin at (default 0): where the first part of the scene has the band occupied (Thing's corridors have pipe fixtures at their foot). */
  creditsFrom?: number;
  /** The row the visitors' feet stand on in this place, if not where the hero stands as it begins (picture pixels). */
  ground?: number;
}

/** One of the game's characters, a visitor of the montage: the sprites that make it up in a place (top part first). The hero is not one: he is in every place. */
export interface EndingCharacter {
  name: string;
  enter(ram: Uint8Array): boolean;
  settle?(ram: Uint8Array): void;
  /** The sprite numbers of its parts (a figure made of two sprites, one under the other, gives both). */
  sprites: readonly number[];
  /** What he does while its frames are recorded (Pendragon walking: `walk`); the others do as the engine does. */
  steps?: readonly EndingStep[];
  /** Frames recorded from the first (default 150). */
  frames?: number;
}

/** The game's actions, as the ending's Pendragon uses them. */
export interface EndingActions {
  get(ram: Uint8Array): number;
  set(ram: Uint8Array, n: number, call: (fn: () => void) => void): void;
  /** The action that jumps, if the game has one (a `jump` step needs it). */
  jump?: number;
  strike: number;
  /** Whether he can take another press of the action now (nothing of the last still under way: a stone in flight, a dig); default always. */
  ready?(ram: Uint8Array): boolean;
}

export interface EndingSpec {
  /** The game's title, over THE END. */
  title: string;
  scenes: readonly EndingScene[];
  cast: readonly EndingCharacter[];
  /** The status line the captions go on (none: a game with no such line has no captions). */
  status?: StatusLine;
  /**
   * For a game whose picture has no empty band to put the credits in: the line of its panel they are typed into instead, in the game's own
   * lettering (a line is cut to `width` and to the letters it has, so the lines of a scene are written for it; blank between lines). Karnath's
   * message line. Without it the credits are drawn in yellow in the empty band (`creditRow`).
   */
  creditLine?: StatusLine;
  /**
   * The empty band the credits stand in is not black but the picture's own plain background colour (Thing on a Spring's rooms fill the
   * screen to its foot), so they are drawn in the colour that reads on it (`creditColourOn`) and the band is checked to hold nothing else.
   */
  plainBand?: boolean;
  /** Where the credit lines are drawn (picture pixels): the row of eight pixels in the empty band, and the column they start at (default 166 in the black band under the picture, and 8: Blackwyche's and Karnath's). */
  creditRow?: number;
  creditX?: number;
  /** The letters the band can have, if not `CREDIT.letters` (a panel's line: its width). */
  creditLetters?: number;
  /** The engine takes one of the four ways for a diagonal (Dragonskulle's): he walks one way at a time. */
  fourWays?: boolean;
  /**
   * Where the game's own tune is heard: on its title (default), or in play (a game with no title tune: Karnath's); or, for a game with no
   * music at all (Entombed's sound is its effects: the whip, the bells), the sound of the places themselves, as each machine of the montage
   * makes it, with THE END in silence.
   */
  tune?: 'title' | 'game' | 'effects';
  /** The picture laid out as the game's front end shows it in play (the montage is drawn so; THE END is not). */
  layout?: PictureLayout;
  /** Each frame, after the game's: what its own panel shows that means nothing in the show (a new game's score, its lives) put away, so the band stays empty. */
  tidy?(ram: Uint8Array): void;
  /** The joystick port the game reads, if only one. */
  joyPort?: 1 | 2;
  /** Pendragon's sprite number (2 in all three games). */
  hero: number;
  /** A new game's memory made ready: what he needs in his hands (the sword). */
  arm(ram: Uint8Array): void;
  /** The action he is using now and picking one: the game's own, as the front end's action keys do; and the numbers of the two a scene needs by name (jumping, and what he strikes with); none for a game whose fire is one thing (Thing on a Spring's). */
  action?: EndingActions;
  /** Each frame: nothing may end it (energy kept up). */
  keepAlive(ram: Uint8Array): void;
  /** Frames the fire button is held on the title to start a game (default 31 to 33), as the title wants. */
  startFire?: readonly [number, number];
}

// ---- the machines ---------------------------------------------------------------------------

/** Joystick bits (low = pressed). */
const UP = 1, DOWN = 2, LEFT = 4, RIGHT = 8, FIRE = 16;
export const IDLE = 0x1f;
const WAY: Record<Way, number> = { up: UP, down: DOWN, left: LEFT, right: RIGHT };

export function joy(m: { joy1: number; joy2: number }, port: 1 | 2 | undefined, bits: number) {
  m.joy1 = port === 2 ? IDLE : bits;
  m.joy2 = port === 1 ? IDLE : bits;
}

/** A new game, started from the title and run to its first frames of play (as the title wants it: the fire button held a moment). */
export function bootGame(port: PortConfig, title: MachineState, spec: EndingSpec): MachineState | null {
  const g = new NativeHost(port, unpackState(packState(title)));
  const [from, to] = spec.startFire ?? [31, 33];
  for (let f = 0; f < 40; f++) { joy(g.m, spec.joyPort, f >= from && f <= to ? IDLE & ~FIRE : IDLE); g.tick(); }
  for (let f = 0; f < 400 && (g.lastWait !== port.mainLoopWait || f < 60); f++) { joy(g.m, spec.joyPort, IDLE); g.tick(); }
  // (a game whose frame does not end at the main loop's wait, Jet Set Willy II's, is saved at the last wait it came to)
  const lastWait: { state: MachineState | null } = { state: null };
  g.onWait = (site) => { if (site === port.mainLoopWait) lastWait.state = g.save(); };
  for (let f = 0; f < 30; f++) { joy(g.m, spec.joyPort, IDLE); g.tick(); }
  g.onWait = undefined;
  return g.save() ?? lastWait.state;
}

/** A sprite as the last frame drew it (the first time it appears). */
function spriteOf(g: NativeHost, n: number) {
  return g.m.capture.sprites.find((s) => s.n === n && s.x < 504);
}

/** What Pendragon does, a step at a time, as joystick input on a frame. */
export class Director {
  private i = 0;
  private spent = 0;
  private strike = { swing: 0, rest: 0 };
  /** Where he was last frame and for how long he has not moved, and the frames left of going the other way round (against a wall). */
  private last = { x: -1, y: -1, still: 0, detour: 0 };
  /** The presses of an action step: how many, the frames of the one in hand still to hold, and the rest after it. */
  private presses = { n: 0, held: 0, rest: 0 };
  constructor(private readonly spec: EndingSpec, private readonly steps: readonly EndingStep[]) {}

  get done() { return this.i >= this.steps.length; }

  private next() { this.i++; this.spent = 0; this.strike = { swing: 0, rest: 0 }; this.last = { x: -1, y: -1, still: 0, detour: 0 }; this.presses = { n: 0, held: 0, rest: 0 }; }

  /** The joystick that closes in on a place, with a way round when he is held up: standing still a few frames against what the engine will not let him through, he tries the other way for a while. */
  private steer(me: { x: number; y: number }, tx: number, ty: number, near: number): number {
    const l = this.last;
    l.still = me.x === l.x && me.y === l.y ? l.still + 1 : 0;
    l.x = me.x; l.y = me.y;
    if (l.still >= 8 && l.detour === 0) { l.detour = 24; l.still = 0; }
    const bits = approach(me.x, me.y, tx, ty, near, this.spec.fourWays, l.detour > 0);
    if (l.detour > 0) l.detour--;
    return bits;
  }

  /** The joystick for this frame, with the sword or jump chosen for it. */
  frame(g: NativeHost): number {
    const step = this.steps[this.i];
    if (!step) return IDLE;
    const me = spriteOf(g, this.spec.hero);
    this.spent++;
    if ('wait' in step) { if (this.spent >= step.wait) this.next(); return IDLE; }
    if ('use' in step) return this.use(g, step);
    if ('press' in step) {
      if (step.action !== undefined && this.spent === 1) this.choose(g, step.action);
      if (this.spent >= step.frames) this.next();
      return step.press.reduce((bits, w) => bits & ~WAY[w], step.fire ? IDLE & ~FIRE : IDLE);
    }
    if ('go' in step) { if (this.spent > step.frames) { this.next(); return IDLE; } return IDLE & ~WAY[step.go]; }
    if ('jump' in step) {
      // (a game with no jump has no use for the step)
      if (this.spec.action?.jump === undefined) { this.next(); return IDLE; }
      this.choose(g, this.spec.action.jump);
      // fire for a frame now and then: each press is a jump, and he lands before the next
      const phase = this.spent % 40;
      if (this.spent >= step.jump * 40) this.next();
      return phase === 1 ? IDLE & ~FIRE : IDLE;
    }
    if (!me) return IDLE;
    if ('walk' in step) {
      const [x, y] = step.walk;
      const bits = this.steer(me, x, y, 2);
      if (bits === IDLE || this.spent > 400) this.next();
      return bits;
    }
    // strike: close in, face it, swing
    this.choose(g, step.action ?? this.spec.action?.strike);
    const t = spriteOf(g, step.strike);
    // (not in sight yet: he waits for it)
    if (this.spent > (step.frames ?? 240)) { this.next(); return IDLE; }
    if (!t) return IDLE;
    const reach = step.reach ?? 28;
    const goalX = step.from === 'left' ? t.x - reach : t.x + reach, goalY = t.y + (step.dy ?? 0);
    const near = Math.abs(me.x - goalX) <= 4 && Math.abs(me.y - goalY) <= 4;
    const face = step.from === 'left' ? RIGHT : LEFT;
    if (!near && this.strike.swing === 0) return this.steer(me, goalX, goalY, 3);
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

  /** An action used where he stands: turn (a moment of the stick), then press fire `times` times: each when the game can take it (`action.ready`) and `gap` frames after the last. */
  private use(g: NativeHost, step: Extract<EndingStep, { use: number }>): number {
    this.choose(g, step.use);
    const turn = step.face ? 2 : 0, p = this.presses;
    if (step.face && this.spent <= turn) return IDLE & ~WAY[step.face];
    if (p.held > 0) { p.held--; return IDLE & ~FIRE; }
    if (p.rest > 0) { p.rest--; return IDLE; }
    if (p.n >= (step.times ?? 1)) { this.next(); return IDLE; }
    if (!(this.spec.action?.ready?.(g.m.ram) ?? true)) return IDLE;
    p.n++; p.held = (step.hold ?? 1) - 1; p.rest = step.gap ?? 24;
    return IDLE & ~FIRE;
  }

  /** The action in hand. */
  private choose(g: NativeHost, n: number | undefined) {
    const a = this.spec.action;
    if (!a || n === undefined) return;
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

/**
 * What we wrote into the screen after the game's frame (the caption, the panel put away) is in this frame's picture too: the capture
 * holds the screen as the VIC fetched it during the frame, which is before. Presentation only, in the picture of the show.
 */
function repaint(m: { ram: Uint8Array; capture: FrameCapture }) {
  m.capture.rows.forEach((r, row) => {
    if (!r) return;
    const base = r.bank + ((r.d018 >> 4) & 15) * 0x400 + row * 40;
    for (let c = 0; c < 40; c++) r.codes[c] = m.ram[base + c];
  });
}

/**
 * The joystick that closes in on a place (a step at a time along each way); IDLE when there. With `fourWays` one way at a time, the
 * one furthest to go (an engine that takes one of the four ways for a diagonal, and might take the blocked one).
 */
function approach(x: number, y: number, tx: number, ty: number, near: number, fourWays = false, other = false) {
  let bits = IDLE;
  if (y < ty - near) bits &= ~DOWN; else if (y > ty + near) bits &= ~UP;
  if (x < tx - near) bits &= ~RIGHT; else if (x > tx + near) bits &= ~LEFT;
  if (fourWays && bits !== IDLE && (bits & (UP | DOWN)) !== (UP | DOWN) && (bits & (LEFT | RIGHT)) !== (LEFT | RIGHT)) {
    return Math.abs(tx - x) >= Math.abs(ty - y) !== other ? bits | UP | DOWN : bits | LEFT | RIGHT;
  }
  return bits;
}

/** The background colour of the picture's last text row (y 192 to 199), as the VIC drew it: what a plain band (`EndingSpec.plainBand`) is. */
export const bandBackground = (m: { capture: FrameCapture }): number => (m.capture.rows[24]?.bg[0] ?? 0) & 15;

/** The credit colour on a plain background colour: black on the light ones (yellow, light green, light grey, cyan), white on the rest. */
export function creditColourOn(bg: number): number {
  return [3, 7, 13, 15].includes(bg & 15) ? 0 : 1;
}

/** A new game's memory with him in a place (entered at the main loop's wait, as travel does it). */
export function placed(port: PortConfig, base: MachineState, spec: EndingSpec, enter: (ram: Uint8Array) => boolean, settle?: (ram: Uint8Array) => void): NativeHost | null {
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
  if (done && ok) settle?.(g.m.ram);
  return done && ok ? g : null;
}

// ---- a place running --------------------------------------------------------------------------

/** A scene running: the game's own frames, the hero driven by a director, the picture the game's machine draws. */
export class MachineReel implements Reel {
  private text = '';
  /** Only where the band is a line of the game's panel (`EndingSpec.creditLine`): the show draws the text otherwise. */
  readonly say: ((text: string) => void) | undefined;
  constructor(
    private readonly g: NativeHost,
    private readonly view: C64View,
    private readonly director: Director,
    private readonly scene: EndingScene,
    private readonly o: EndingOptions,
  ) {
    if (o.spec.creditLine) this.say = (text) => { this.text = text; };
  }

  /** The machine, for tests. */
  get machine() { return this.g.m; }

  tick() {
    const { spec } = this.o;
    joy(this.g.m, spec.joyPort, this.director.frame(this.g));
    spec.keepAlive(this.g.m.ram);
    this.g.tick();
    if (spec.tune === 'effects') this.o.sound.pushFrame(this.g.m.sidWrites);
  }

  draw() {
    const { spec, host } = this.o, { ram } = this.g.m;
    spec.tidy?.(ram);
    if (this.scene.caption !== undefined && spec.status) caption(ram, spec.status, this.scene.caption);
    if (spec.creditLine && this.scene.credits?.length) caption(ram, spec.creditLine, this.text);
    repaint(this.g.m);
    // (the picture as the game's front end lays it out in play, if it does)
    host.renderer.layout = spec.layout ?? null;
    this.view.update();
  }

  render(alpha: number) { this.view.render(alpha); }

  dispose() { this.view.dispose(); }

  get ground() {
    // (a sprite number may be used again lower down the picture, for the panel's icons: the hero is the highest)
    const mine = this.g.m.capture.sprites.filter((s) => s.n === this.o.spec.hero && s.x < 504);
    const me = mine.reduce<(typeof mine)[number] | undefined>((top, s) => (top === undefined || s.y < top.y ? s : top), undefined);
    return me ? shotFeet(captureShot(me)) : undefined;
  }

  get ink() { return this.o.spec.plainBand ? creditColourOn(bandBackground(this.g.m)) : undefined; }
}

// ---- the cast, recorded ----------------------------------------------------------------------

/** Record a character: the engine runs on a new game in its place for some frames, and each distinct picture of its sprites is kept. */
function record(port: PortConfig, base: MachineState, spec: EndingSpec, c: EndingCharacter): Figure | null {
  const g = placed(port, base, spec, c.enter, c.settle);
  if (!g) return null;
  const director = new Director(spec, c.steps ?? []);
  const moments: SpriteShot[][] = [];
  for (let f = 0; f < (c.frames ?? 150); f++) {
    joy(g.m, spec.joyPort, director.frame(g));
    spec.keepAlive(g.m.ram);
    g.tick();
    const seen = c.sprites.map((n) => spriteOf(g, n));
    if (seen.some((s) => s === undefined)) continue;
    // (the highest numbers first: the lower the number, the nearer the front, as the VIC has it)
    moments.push(seen.flatMap((s) => (s ? [s] : [])).sort((a, b) => b.n - a.n).map(captureShot));
  }
  return recordFigure(c.name, moments);
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
  /** The title's tune is the original's own code running (title-tune.ts), not the translation's: the game says so (play.ts `titleTune`). */
  titleTune?: boolean;
  /** The game's font (the panels'). */
  font(): BitmapFont;
  /** The show is over (or skipped): back to the title. */
  done(): void;
}

/** The show for a translated game: `RewardShow` over places made of the game's scenes. */
export class Ending {
  private readonly show: RewardShow;
  private base: MachineState | null | undefined;
  /** The tune: a frame of it at a time (a machine of its own). */
  private music: { frame(): SidWrite[] } | null = null;

  constructor(private readonly o: EndingOptions) {
    const { spec, port } = o;
    const places = spec.scenes.map((scene): Place => ({
      ...(scene.credits ? { credits: scene.credits } : {}),
      ...(scene.creditsFrom === undefined ? {} : { bandFrom: scene.creditsFrom }),
      ...(scene.ground === undefined ? {} : { ground: scene.ground }),
      frames: scene.frames,
      open: () => {
        const base = this.boot();
        const g = base && placed(port, base, spec, scene.enter, scene.settle);
        return g ? new MachineReel(g, new C64View(o.host.renderer, g.m), new Director(spec, scene.steps), scene, o) : null;
      },
    }));
    const rewardSpec: RewardSpec = {
      title: spec.title,
      places,
      cast: spec.cast.map((c) => () => { const base = this.boot(); return base && record(port, base, spec, c); }),
      creditRow: spec.creditRow ?? CREDIT.row,
      // (a panel's line starts at its own column 0 and has its width in letters)
      ...(spec.creditLine ? { creditX: 0, creditLetters: spec.creditLine.width } : { ...(spec.creditX === undefined ? {} : { creditX: spec.creditX }), ...(spec.creditLetters === undefined ? {} : { creditLetters: spec.creditLetters }) }),
      ready: () => this.boot() !== null,
    };
    this.show = new RewardShow({
      host: o.host,
      spec: rewardSpec,
      font: o.font,
      music: { start: () => { this.base = undefined; this.music = null; }, end: () => { this.music = null; }, frame: () => this.tune() },
      done: o.done,
    });
  }

  /** The title's memory as a new game starts, run to its first frames of play (once a show). */
  private boot(): MachineState | null {
    if (this.base === undefined) {
      const title = this.o.title();
      this.base = title ? bootGame(this.o.port, title, this.o.spec) : null;
    }
    return this.base;
  }

  /** The game's own tune, a frame of it (the title's, or where the game has none there, the one it plays in the castle, from a new game standing by). */
  private tune() {
    const { spec, port } = this.o;
    if (spec.tune === 'effects') return;
    if (!this.music) {
      if (spec.tune === 'game') {
        if (!this.base) return;
        const host = NativeHost.resume(port, unpackState(packState(this.base)));
        this.music = { frame: () => { joy(host.m, spec.joyPort, IDLE); spec.keepAlive(host.m.ram); host.tick(); return host.m.sidWrites; } };
      } else {
        const title = this.o.title();
        if (!title) return;
        if (this.o.titleTune) this.music = new TitleTune(unpackState(packState(title)));
        else { const host = new NativeHost(port, unpackState(packState(title))); this.music = { frame: () => { host.tick(); return host.m.sidWrites; } }; }
      }
    }
    this.o.sound.pushFrame(this.music.frame());
  }

  /** The show is on (the game is ours, not the player's). */
  get active() { return this.show.active; }

  /** Begin: `stats` are the lines under THE END. */
  start(stats: readonly string[]) {
    this.show.start(stats);
  }

  tick() {
    this.show.tick();
    if (!this.show.active) this.base = undefined;
  }

  render(alpha: number) { this.show.render(alpha); }

  /** For tests: where the show is. */
  get progress() { return this.show.progress; }
}
