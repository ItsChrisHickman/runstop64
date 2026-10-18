import { C64_KEYS, type BitmapFont, type Input, type MachineState, type Surface } from 'c64kit';
import { COMBAT_TIMING, type Combat } from './combat';
import { EightWay, type Runner } from './controls';
import type { NativeHost } from './host';
import { drawPending, KeyPacer, NamePicker, DEL, RETURN, type NameKey, type NameSpec } from '../letters';

/**
 * The parts of a translated game's session that each do one thing (running, knockback, the latch,
 * action keys, a name picked on a touch screen, safe arrival, health and lives), as small objects
 * with their own state, composed in `runNative` (play.ts) in the order it declares. A feature
 * takes part at the points it has a method for:
 *
 * - `shape` (a `StickStage`): the stick on its way to the game, bits 1 up, 2 down, 4 left, 8 right,
 *   16 fire (controls.ts); each stage hands the bits to the next;
 * - `atWait` (a `WaitStage`): the main loop's wait, where the game runs extra handling of its own
 *   between frames, with the registers kept (`NativeEnv.runner`);
 * - `afterFrame`: after the game's frame, with the grace counted.
 */

/** The assists `runNative` itself offers, by id (a game's own `assists` add theirs). */
export type NativeAssistId = 'health' | 'lives' | 'hints' | 'effects' | 'glow' | 'invulnerable' | 'knockback' | 'hitStop' | 'eightWay' | 'respawn' | 'run' | 'airJump';

/** What the features share of the session. */
export class NativeEnv {
  /** The stick as the player holds it this frame (1 = held), before any feature has had it. */
  raw = 0;

  constructor(
    /** Runs translated code between frames, the registers kept. */
    readonly runner: Runner,
    /** The joystick port the game reads, if only one (to some games the other port's lines are keys). */
    private readonly joyPort: 1 | 2 | undefined,
    /** Play is under way (a game, not the title or a name asked for). */
    readonly playing: () => boolean,
    /** The ENHANCED switch. */
    readonly enhanced: () => boolean,
    /** Whether one of `runNative`'s assists is on. */
    readonly on: (id: NativeAssistId) => boolean,
  ) {}

  /** The stick as the game reads it (both ports' lines). */
  put(m: { joy1: number; joy2: number }, bits: number) {
    const joy = 0x1f & ~bits;
    m.joy1 = this.joyPort === 2 ? 0x1f : joy;
    m.joy2 = this.joyPort === 1 ? 0x1f : joy;
  }
}

/** A stage of the stick's way to the game (`active`: play under way and no screen of ours holding the game). */
export interface StickStage {
  shape(bits: number, active: boolean, ram: Uint8Array): number;
}

/** A stage at the main loop's wait. */
export interface WaitStage {
  atWait(g: NativeHost): void;
}

/** A stage after the game's frame. */
export interface FrameStage {
  afterFrame(g: NativeHost): void;
}

// ---- running ------------------------------------------------------------------------------------------

/** The keys that run (the touch RUN key is ShiftLeft). */
export const RUN_KEYS = ['ShiftLeft', 'ShiftRight'];

/**
 * How a game runs (the `run` option): `player`, the player's own movement once more a frame (his
 * player-control routine run a second time, or his next step brought on: JSW2), in the main loop's
 * pass as the game's own; the player alone goes faster, everything else at the game's pace. In both
 * modes, or (`enhanced`) only in ENHANCED.
 */
export interface RunSpec { player(): void; enhanced?: boolean }

/** Running: Shift held (or the touch RUN key on) in play, the player's routine once more a frame. */
export class Running implements WaitStage {
  private on = false;

  constructor(private readonly env: NativeEnv, private readonly spec: RunSpec) {}

  /** Before a frame: whether he runs this one. */
  beforeFrame(input: Input, holding: boolean) {
    this.on = !holding && this.env.playing() && RUN_KEYS.some((k) => input.down.has(k)) && (!this.spec.enhanced || this.env.on('run'));
  }

  // (at the frame's start, its scroll register writes would land on the header's split: so in the main loop's pass, as the game's own)
  atWait() { if (this.on) this.env.runner.call(this.spec.player); }
}

// ---- a jump in mid-air ----------------------------------------------------------------------------------

/**
 * A second jump in the air (ENHANCED, once per airtime), the game's own way: `restart` puts its jump
 * variables back to a jump just begun, at the height he is, so its collisions, rooms and falls work as
 * ever. `airborne`: he is in the air and the game is not holding him (a rope, a ladder).
 */
export interface AirJumpSpec {
  airborne(ram: Uint8Array): boolean;
  /** Begin a jump from here; `stick`: the stick bits as the player holds them (4 left, 8 right). */
  restart(ram: Uint8Array, stick: number): void;
}

/**
 * A fresh press of fire while he is in the air (the airtime began at least a frame before the press, so
 * the press that made the jump is never the second one) and no second jump yet in this airtime.
 */
export class AirJump implements StickStage, WaitStage {
  private fireWas = false;
  /** A fresh press this frame, not yet seen at the wait; and the stick then. */
  private press: number | null = null;
  /** Whether he was in the air at the last wait, and has used his jump since he left the ground. */
  private airLast = false;
  private used = false;

  constructor(private readonly env: NativeEnv, private readonly spec: AirJumpSpec) {}

  /** A new game starts. */
  reset() { this.fireWas = false; this.press = null; this.airLast = false; this.used = false; }

  shape(bits: number, active: boolean) {
    const fire = (bits & 16) !== 0;
    // (a press waits for the main loop's next wait: a frame may not reach one)
    if (!active) this.press = null;
    else if (fire && !this.fireWas) this.press = bits;
    this.fireWas = fire;
    return bits;
  }

  atWait(g: NativeHost) {
    const ram = g.m.ram, press = this.press;
    this.press = null;
    if (!this.env.playing() || !this.env.on('airJump')) { this.airLast = false; this.used = false; return; }
    const air = this.spec.airborne(ram);
    if (!air) this.used = false;
    else if (press !== null && this.airLast && !this.used) { this.used = true; this.spec.restart(ram, press); }
    this.airLast = air;
  }
}

// ---- knockback ----------------------------------------------------------------------------------------

/** Knockback (an assist): the stick held away from what hit him, and his own movement a step or two more. */
export class Knockback implements StickStage, WaitStage {
  private push = 0;

  /** `player`: his movement once more (`run`), if the game has it. */
  constructor(private readonly env: NativeEnv, private readonly combat: Combat, private readonly player: (() => void) | null) {}

  shape(bits: number, active: boolean) {
    this.push = active ? this.combat.knockback(this.combat.events) : 0;
    return this.push || bits; // (the player's own input waits)
  }

  atWait() {
    const { player } = this;
    if (this.push && player) for (let i = 0; i < COMBAT_TIMING.knockSteps; i++) this.env.runner.call(player);
  }
}

// ---- 8-way controls -----------------------------------------------------------------------------------

/** The 8-way controls assist (controls.ts) in the stick's way and at the wait. */
export class EightWayStage implements StickStage, WaitStage {
  constructor(private readonly env: NativeEnv, private readonly eight: EightWay) {}

  shape(bits: number, active: boolean, ram: Uint8Array) {
    return active && this.env.on('eightWay') ? this.eight.input(ram, this.env.raw) : bits;
  }

  // his own step into the picture for a diagonal
  atWait(g: NativeHost) {
    if (this.env.on('eightWay') && this.env.playing()) this.eight.beforeFrame(g.m.ram, this.env.raw, this.env.runner);
  }
}

// ---- the latch ----------------------------------------------------------------------------------------

/**
 * ENHANCED: a climb (or any move the game makes of its own, `busy`) that ends with the stick still
 * held leaves him where holding it again does the opposite at once (up a ladder into a cabin whose
 * hole is behind him: the stick still up walks him back into it and down). Those of `bits` held
 * as it ends are ignored until the stick lets go of them. (Stick bits: 1 up, 2 down, 4 left, 8 right.)
 */
export interface LatchSpec { busy(ram: Uint8Array): boolean; bits: number }

export class Latch implements StickStage, WaitStage {
  /** Whether the move was under way last frame, the stick bits ignored until let go, and the stick as wanted. */
  private busy = false;
  private latched = 0;
  private wanted = 0;

  constructor(private readonly env: NativeEnv, private readonly spec: LatchSpec) {}

  /** A new game starts. */
  reset() { this.busy = false; this.latched = 0; }

  shape(bits: number, active: boolean, ram: Uint8Array) {
    this.wanted = bits;
    if (!(this.env.enhanced() && active)) return bits;
    const busy = this.spec.busy(ram);
    if (this.busy && !busy) this.latched = bits & this.spec.bits;
    this.busy = busy;
    return this.free(bits);
  }

  /** The stick without the bits held since the move ended (let go of, they're free again). */
  private free(bits: number) {
    this.latched &= bits;
    return bits & ~this.latched;
  }

  /**
   * In the frame the move ends: the passes that follow in it (running's second go at his
   * handling) must not read the stick as held either, or they walk him back where he came from.
   */
  atWait(g: NativeHost) {
    if (!this.env.enhanced() || !this.env.playing() || !this.busy || this.spec.busy(g.m.ram)) return;
    this.busy = false;
    this.latched = this.wanted & this.spec.bits;
    this.env.put(g.m, this.free(this.wanted));
  }
}

// ---- action keys --------------------------------------------------------------------------------------

/**
 * Direct keys for the game's actions (which the original only cycles through with "any
 * other key"): physical key → action number, how to select one (`set`, which may call
 * the game's own routines through `call`), and whether the key also does it (holds fire).
 */
export interface ActionsSpec {
  keys: Record<string, number>;
  also: 'fire' | 'select';
  set(ram: Uint8Array, n: number, call: (fn: () => void) => void): void;
  /**
   * Moving the hand on (the original's "any other key": every key that would reach the game's
   * keyboard and isn't remapped): straight to the next action in `order` (as the bar shows them),
   * one a press, instead of the game's own crawl through every icon. `get`: the action now.
   */
  next?: { order: number[]; get(ram: Uint8Array): number };
}

export class ActionKeys {
  /** The action a key picked, still to be selected (a key pressed in a frame the game waited: hit-stop). */
  private picked: number | null = null;

  /** `reachesKeyboard`: whether a key goes to the game's keyboard as itself (not remapped, not kept from it). */
  constructor(private readonly env: NativeEnv, private readonly spec: ActionsSpec, private readonly input: Input, private readonly reachesKeyboard: (code: string) => boolean) {}

  /** In play, the keys that move the hand on are the front end's (`beforeFrame`), not the game's keyboard. */
  get handKeys() { return !!this.spec.next && this.env.playing(); }

  /** Before a frame: the keys pressed since the last one that pick an action, straight to one or the next one along. */
  beforeFrame(g: NativeHost, holding: boolean) {
    const a = this.spec;
    if (!this.env.playing() || holding) { this.picked = null; return; }
    for (const code of this.input.typed) {
      const n = a.keys[code];
      if (n !== undefined) this.picked = n;
      else if (a.next && this.reachesKeyboard(code)) {
        const { order, get } = a.next, at = order.indexOf(this.picked ?? get(g.m.ram));
        this.picked = order[(at + 1) % order.length];
      }
    }
  }

  /** In the frame's input: select the action picked; whether a key held does it by holding fire. */
  fire(g: NativeHost): boolean {
    const a = this.spec;
    if (!this.env.playing()) return false;
    if (this.picked !== null) { a.set(g.m.ram, this.picked, (fn) => g.callNative(fn)); this.picked = null; }
    return a.also === 'fire' && Object.keys(a.keys).some((code) => this.input.down.has(code));
  }
}

// ---- the keyboard -------------------------------------------------------------------------------------

/** Keys reach the game as taps: a press holds its C64 key for a few frames, however long it's held. */
const TAP_FRAMES = 3;

export class Keyboard {
  private readonly taps = new Map<string, number>();

  /** `ours`: keys that are never the game's (pause, mute, run). */
  constructor(private readonly remap: Record<string, string> | undefined, private readonly reserved: ReadonlySet<string>, private readonly ours: readonly string[]) {}

  /** Whether a key reaches the game's keyboard as itself. */
  reaches(code: string) { return !this.remap?.[code] && !this.reserved.has(code) && !this.ours.includes(code) && !!C64_KEYS[code]; }

  /** The C64 keys held this frame, from the keys typed (`skip`: the front end's, the hand's). */
  frame(typed: readonly string[], skip: (code: string) => boolean): [number, number][] {
    const keys: [number, number][] = [];
    for (const code of typed) if (!skip(code)) this.taps.set(code, TAP_FRAMES);
    for (const [code, left] of this.taps) {
      if (left <= 0) { this.taps.delete(code); continue; }
      this.taps.set(code, left - 1);
      const mapped = this.remap?.[code];
      if (!mapped && this.reserved.has(code)) continue;
      const k = C64_KEYS[mapped ?? code];
      if (k) keys.push(k);
    }
    return keys;
  }
}

// ---- a name picked on a touch screen ------------------------------------------------------------------

/**
 * A screen of the game's asking for a name (a high score's), read from its keyboard: on a touch
 * screen the name is picked with the touch controls (games/shared/letters.ts NamePicker) and
 * typed into the game's entry a key at a time; the keyboard types as it always has.
 */
export interface NamesSpec {
  spec: NameSpec;
  /** Whether the game is asking now (its memory, and where its code last yielded). */
  asking(ram: Uint8Array, lastWait: number): boolean;
  /** Where the entry's cursor is (character column and row), for the letter picked to be drawn there. */
  cursor(ram: Uint8Array): { col: number; row: number };
  /** Where the line naming the touch controls goes (its top, in picture pixels: a part of the screen the game leaves empty). */
  hintY: number;
}

export class NamePick {
  private readonly picker: NamePicker;
  /** The picked name's keys, one at a time. */
  private readonly pacer = new KeyPacer(3, 4);
  /** A name is being picked this frame (the stick and the button are the picker's). */
  picking = false;

  constructor(private readonly spec: NamesSpec, private readonly input: Input) {
    this.picker = new NamePicker(spec.spec);
  }

  /** The game is asking for a name now. */
  asking(g: NativeHost) { return this.spec.asking(g.m.ram, g.lastWait); }

  /** A frame of the game's input: the keys typed (the picker's, on a touch screen asking), and the key of the name due now. */
  frame(g: NativeHost): { typed: readonly string[]; key: [number, number] | null } {
    const { input, picker, pacer } = this;
    this.picking = input.touch && this.asking(g);
    let typed: readonly string[] = input.typed;
    if (this.picking) { const r = picker.frame(input); pacer.push(r.keys); typed = r.typed; }
    else { picker.reset(); pacer.clear(); }
    const key = pacer.next();
    return { typed, key: key === null ? null : (C64_KEYS[nameKeyCode(key)] ?? null) };
  }

  /** On the picture: the letter under the cursor (the game's placeholder there taken out), and the line naming our controls. */
  overlay(g: NativeHost, screen: Surface, font: BitmapFont) {
    if (!this.picking) return;
    const { picker, pacer, spec } = this;
    const at = spec.cursor(g.m.ram), ch = picker.pending;
    if (ch && !pacer.busy) drawPending(screen, font, ch, at.col * 8, at.row * 8, 7, (g.m.capture.rows[at.row]?.bg[0] ?? g.m.vic[0x21]) & 15);
    font.drawCentred(screen, picker.hint, spec.hintY, 7);
  }
}

/** A key of a name picked on a touch screen, as the keyboard key that types it (KeyboardEvent.code). */
function nameKeyCode(k: NameKey) {
  if (k === DEL || k === RETURN) return k;
  if (k === ' ') return 'Space';
  if (k === '.') return 'Period';
  if (k === '-') return 'Minus';
  if (k >= '0' && k <= '9') return `Digit${k}`;
  return `Key${k}`;
}

// ---- safe arrival (no death loops) --------------------------------------------------------------------

/** Passes of the main loop (about a second) the player must live through after coming into a room for its save to be kept (`safe`). */
export const SAFE_PASSES = 50;

/**
 * No death loops, for games where a room can be come into in the air or onto something that kills
 * (and the game's own restart puts him back there): the autosave on coming into a room waits until
 * the player is `steady` there (on his feet), and is kept once he has lived a moment after it
 * (`SAFE_PASSES`, `lives` no fewer), so continuing never starts where he dies at once. And in
 * ENHANCED, a life lost before that starts him again from the last save kept (with the lives as
 * they are now), not where the game would.
 */
export interface SafeSpec<F> { steady(ram: Uint8Array, found: F): boolean; lives: { get(ram: Uint8Array): number; set(ram: Uint8Array, n: number): void } }

export class SafeArrival<F> {
  /** The room (and screen) he's in: its save, taken when he was first steady there; passes lived since; the lives then. */
  private arrived: { room: number; save: MachineState | null; n: number; lives: number } | null = null;
  /** A life lost before the room's save was kept (ENHANCED): back to the last save kept, after this frame. */
  private respawn = false;

  constructor(private readonly env: NativeEnv, readonly spec: SafeSpec<F>) {}

  /** A new host starts. */
  reset() { this.arrived = null; }

  /** Whether a life was lost before the room's save was kept (asked once: it clears). */
  takeRespawn() {
    const was = this.respawn;
    this.respawn = false;
    return was;
  }

  /** The room's save as the autosave sees it: none until he's lived a moment after finding his feet. */
  save(g: NativeHost, room: number, travel: boolean, found: F): () => MachineState | null {
    const { spec } = this, ram = g.m.ram;
    const lives = spec.lives.get(ram), was = this.arrived;
    // a life lost (the game may have started him again in another room: where a fall began)
    if (was && lives < was.lives) {
      // in ENHANCED, before he'd lived a moment where he was: not where the game starts him again
      if (was.n < SAFE_PASSES && this.env.on('respawn') && this.env.playing() && !travel) this.respawn = true;
      was.save = null; was.n = 0;
    }
    const a: NonNullable<typeof this.arrived> = was?.room === room ? was : { room, save: null, n: 0, lives };
    this.arrived = a;
    a.lives = lives;
    if (!a.save) a.save = spec.steady(ram, found) ? g.save() : null;
    else a.n++;
    return () => (a.n >= SAFE_PASSES ? a.save : null);
  }
}

// ---- health and lives ---------------------------------------------------------------------------------

/** The game's health and lives, for the assists (FULL HEALTH/ROOM, INFINITE LIVES) and for continuing. */
export interface VitalsSpec {
  /** Put Pendragon back to full health (and air) in a save, for continuing (`assist`: the options on, for games where that's one). */
  fullHealth?(ram: Uint8Array, colour: Uint8Array, assist: Record<string, boolean>): void;
  /**
   * For the "full health at room start" assist: Pendragon's health, as a number from 0 to
   * `max`, and how to set it.
   */
  health?: { max: number; get(ram: Uint8Array): number; set(ram: Uint8Array, colour: Uint8Array, v: number): void };
  /** For the "infinite lives" assist: put the lives back to full (each frame of play). */
  lives?(ram: Uint8Array): void;
  /**
   * ENHANCED: unlimited lives for a game that has none (its health running out is the game's end). `lifeEnds`: the address of
   * the game's moment where that end begins once its death has played out (listed under "hooks" in its translation's config);
   * in ENHANCED he is put back at the start of the room he died in (the latest autosave) at full health, as CONTINUE? would
   * without the prompt or the title, in place of the game's end. Without a save, the game's end goes on.
   */
  lifeEnds?: number;
  /** The infinite lives are part of ENHANCED (where the game's maker asked for them), not an option off unless chosen. */
  infinite?: boolean;
}

export class Vitals {
  /** The room the health assist last filled up in. */
  private healthRoom = -1;

  /** `atMainWait`: the game is at its main loop's wait now. `room`: the room he is in. */
  constructor(private readonly env: NativeEnv, private readonly spec: VitalsSpec, private readonly atMainWait: (g: NativeHost) => boolean, private readonly room: (ram: Uint8Array) => number) {}

  /** Lives stay full. */
  readonly lives: FrameStage = {
    afterFrame: (g) => {
      if (this.env.on('lives') && this.spec.lives && this.atMainWait(g) && this.env.playing()) this.spec.lives(g.m.ram);
    },
  };

  /** Full health on coming into each room. */
  readonly health: FrameStage = {
    afterFrame: (g) => {
      const h = this.spec.health;
      if (!this.env.on('health') || !h || !this.atMainWait(g) || !this.env.playing()) return;
      const room = this.room(g.m.ram);
      if (room !== this.healthRoom) {
        this.healthRoom = room;
        const now = h.get(g.m.ram);
        if (now > 0 && now < h.max) h.set(g.m.ram, g.m.colour, h.max);
      }
    },
  };
}

// ---- screens ------------------------------------------------------------------------------------------

/**
 * A new screen: most of the playfield redrawn at once. Saves are per screen (not just per room), so
 * continuing comes back where the player came in.
 */
export class ScreenWatch implements FrameStage {
  /** Screens seen so far. */
  count = 0;
  private last = new Uint8Array(0);

  constructor(private readonly holding: () => boolean) {}

  afterFrame(g: NativeHost) {
    if (this.holding()) return;
    const m = g.m, at = (3 - (m.cia2.pra & 3)) * 0x4000 + ((m.vic[0x18] >> 4) & 15) * 0x400;
    const now = m.ram.slice(at + 2 * 40, at + 20 * 40);
    let changed = 0;
    if (this.last.length) for (let i = 0; i < now.length; i++) if (now[i] !== this.last[i]) changed++;
    if (changed > now.length * 0.5) this.count++;
    this.last = now;
  }
}

/** The stages that exist, in the order given (a game without a feature leaves it out). */
export function stages<T>(...all: (T | null)[]): T[] {
  return all.filter((s): s is T => s !== null);
}
