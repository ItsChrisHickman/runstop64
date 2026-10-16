import { imageCentre, spriteImage, type EffectsModel, type SpriteImage } from '../../../packages/c64kit/src/effects';
import type { SfxName } from '../../../packages/c64kit/src/sid/sfx';
import type { C64 as Machine, SpriteCapture } from '../../../packages/c64kit/src/c64/machine';
import { cpu } from './cpu';

/**
 * Combat for the translated ports (the Pendragon games): the moments a fight is made of, read
 * from the game's own code, turned into effects over the picture and sounds, and the combat
 * assists built on them.
 *
 * A game declares (`CombatSpec`) where in its code those moments are: instructions listed
 * under "hooks" in its translations' configs (re/*.json), which report reaching them as they
 * run (games/shared/native/host.ts `onHook`): an enemy destroyed, the player starting to be
 * hurt, a weapon swung. Each frame, what was reported is placed using what the VIC drew (the
 * frame capture: sprites as drawn, multiplexed ones too) and handed to the effects
 * (c64kit/effects.ts) and the overlay SID (c64kit/sid/sfx.ts).
 *
 * The assists (off unless chosen) act at the same moments, the game's own way:
 * - invulnerability: for a while after a hurt, a new one doesn't start (the hook's store of
 *   the game's "hurt" flag is made a 0);
 * - knockback: when hurt, Pendragon is pushed away from what hit him by his own movement
 *   routine, run with the stick held away (so walls stop him as they always do);
 * - a moment's grace (grace.ts, not an assist: after every resume, both modes): the same cancel;
 * - hit-stop: the game waits a few frames when an enemy is destroyed (the effects go on).
 */
export type CombatHook =
  /**
   * An enemy destroyed here: which sprite it is (from memory as it is at the hook); a list when
   * one thing is drawn as either of two sprites (the first one drawn is it).
   */
  | { kind: 'kill'; sprite(ram: Uint8Array): number | number[] }
  /** A blow landed (on something that isn't destroyed): which sprite. */
  | { kind: 'hit'; sprite(ram: Uint8Array): number | number[] }
  /**
   * The game takes a blow on this sprite (its weapon touched it, and the code for it runs):
   * whether that destroyed it is seen in the next frame's picture (it's gone, or the game has
   * put it somewhere else: a new one), else it was hit.
   */
  | { kind: 'strike'; sprite(ram: Uint8Array): number | number[] }
  /**
   * The player starts being hurt: the instruction stores A (non-zero) into the game's own
   * "being hurt" flag (or damage to come); storing 0 instead means it doesn't happen.
   * `sprite`: what hit him, if known (for knockback; else the nearest other sprite).
   */
  | { kind: 'hurt'; sprite?(ram: Uint8Array): number | number[] }
  /** Another store of the same hurt's start (its flash, its sound): made 0 too when it's cancelled. */
  | { kind: 'also' }
  /** The weapon is swung (or a spell cast). */
  | { kind: 'swing' };

export interface CombatSpec {
  /** Pendragon's sprite. */
  player: number;
  /** The weapon's sprite and whether it's out now (it leaves a trail while it is). */
  weapon?: { sprite: number; active(ram: Uint8Array): boolean; color?: number };
  /**
   * The hooks: instruction address -> what happens there. An address can be in more than one
   * swapped-in block; `when` tells which block is in (e.g. by its first jump).
   */
  hooks: Record<number, CombatHook | (CombatHook & { when(ram: Uint8Array): boolean })[]>;
  /** Where the player's health is shown (C64 pixels): it pulses when he's hurt. */
  healthBox?: { x: number; y: number; w: number; h: number };
  /** Sprites that are never enemies (e.g. the status line's, scenery), besides the player and weapon. */
  scenery?: number[];
}

interface EventPlace {
  /** Where (C64 screen pixels): the enemy's middle, or the player's. */
  x: number;
  y: number;
  /** (frame counter, for tests) */
  frame: number;
}
/**
 * What happened in a frame, placed on the screen, with the sprite involved as the VIC drew it:
 * the enemy (always, for a blow), what hit him (for a hurt, if anything can be told), none for a swing.
 */
export type CombatEvent = EventPlace & (
  | { kind: 'kill'; image: SpriteImage; sprite: number }
  | { kind: 'hit'; image: SpriteImage; sprite: number }
  | { kind: 'hurt'; image?: SpriteImage; sprite?: number }
  | { kind: 'swing'; image?: undefined; sprite?: undefined }
);

export interface CombatOptions {
  effects: boolean;
  glow: boolean;
  invulnerable: boolean;
  knockback: boolean;
  hitStop: boolean;
  /** A moment's grace is on (grace.ts): a hurt doesn't start. */
  grace?: boolean;
}

/** How long the assists last (frames, 50 a second). */
export const COMBAT_TIMING = {
  /** After a hurt starts, no new one for this long (the game's own flash is 16 frames of it). */
  invulnerable: 75,
  /** Knockback: frames, and extra steps of his own movement each. */
  knockFrames: 6,
  knockSteps: 2,
  /** Hit-stop: frames the game waits on a kill. */
  hitStop: 4,
};

interface Pending { kind: CombatEvent['kind'] | 'strike'; sprites?: { sprite: number; vx: number; vy: number }[] }

/**
 * Events as effects and sounds: the shared entry for anything that can say what happened and
 * where (the translated ports' `Combat.present`; native ports such as Antiriad, which place
 * their own events). A kill bursts from where the blow came from (`player`), a hurt flashes the
 * edges and shakes (and pulses the health box, if the game has one).
 */
export function playEvents(
  events: readonly CombatEvent[], fx: EffectsModel, sfx: (name: SfxName) => void, now: number,
  where: { player?: { x: number; y: number }; healthBox?: { x: number; y: number; w: number; h: number } } = {},
) {
  for (const e of events) {
    if (e.kind === 'kill' && e.image) {
      fx.destroy(now, e.image, where.player);
      sfx('kill');
    } else if (e.kind === 'hit') {
      fx.hit(now, e.x, e.y);
      sfx('hit');
    } else if (e.kind === 'hurt') {
      fx.hurt(now);
      if (where.healthBox) fx.pulse(now, where.healthBox);
      sfx('hurt');
    }
  }
}

export class Combat {
  /** Events of the last frame (for tests and the front end). */
  events: CombatEvent[] = [];
  private pending: Pending[] = [];
  /** Blows taken last frame, to tell destroyed from hit by this frame's picture. */
  private strikes: { image: SpriteImage; sprite: number; x: number; y: number }[] = [];
  /** The blows taken this frame, judged after the next (for tests). */
  get pendingStrikes(): readonly { readonly sprite: number; readonly x: number; readonly y: number }[] { return this.strikes; }
  /** A hurt was cancelled (invulnerable) in the frame running: its other stores are too. */
  private cancelling = false;
  private lastHit = new Map<number, number>();
  private frame = 0;
  /** Frames left of: invulnerability, knockback, hit-stop. */
  invulnerable = 0;
  knock = { frames: 0, dir: 0 };
  hitStop = 0;
  /** Sprite positions over the last frames (for glows on things closing in). */
  private tracks = new Map<number, { x: number; y: number }[]>();

  constructor(readonly spec: CombatSpec, readonly options: () => CombatOptions) {}

  /** Connect to a host (each time a new one starts): its hooks report here. */
  attach(host: { m: Machine; onHook?: (pc: number) => void }) {
    const m = host.m;
    host.onHook = (pc) => this.hook(pc, m);
    this.pending = []; this.strikes = [];
  }

  private hook(pc: number, m: Machine) {
    const h = this.spec.hooks[pc];
    if (!h) return;
    const hook = Array.isArray(h) ? h.find((x) => x.when(m.ram)) : h;
    if (!hook) return;
    // (where the sprite is in the VIC as the code runs: to pick the right one of a multiplexed sprite)
    const at = (n: number | number[]) => ({ sprites: (Array.isArray(n) ? n : [n]).filter((k) => k >= 0 && k < 8).map((k) => ({ sprite: k, vx: m.vic[k * 2] | ((m.vic[0x10] >> k) & 1) << 8, vy: m.vic[k * 2 + 1] })) });
    switch (hook.kind) {
      case 'kill': case 'hit': case 'strike': this.pending.push({ kind: hook.kind, ...at(hook.sprite(m.ram)) }); break;
      case 'also': if (this.cancelling) cpu.a = 0; break;
      case 'swing': this.pending.push({ kind: 'swing' }); break;
      case 'hurt': {
        if (cpu.a === 0) break; // (the game stores 0 there too: not a hurt)
        const o = this.options();
        if (o.grace) { cpu.a = 0; this.cancelling = true; break; } // (a moment's grace after a resume: it doesn't start)
        if (o.invulnerable && this.invulnerable > 0) { cpu.a = 0; this.cancelling = true; break; } // (the assist: it doesn't start)
        this.pending.push({ kind: 'hurt', ...(hook.sprite ? at(hook.sprite(m.ram)) : {}) });
        this.invulnerable = COMBAT_TIMING.invulnerable;
        break;
      }
    }
  }

  /**
   * After a frame of play: the frame's events, placed with what the VIC drew (`m.capture`:
   * this frame's picture still shows an enemy the frame's code just destroyed).
   */
  afterFrame(m: Machine): CombatEvent[] {
    this.frame++;
    this.cancelling = false;
    if (this.invulnerable > 0) this.invulnerable--;
    const cap = m.capture.sprites, events: CombatEvent[] = [];
    // last frame's blows: still there (near where it was, as the same sprite): a hit; else destroyed
    for (const st of this.strikes) {
      const still = cap.some((x) => x.n === st.sprite && Math.abs(x.x - 24 - st.image.x) + Math.abs(x.y - 50 - st.image.y) <= 8);
      // (a blow that goes on landing on the same thing frame after frame is one hit)
      if (still && this.frame - (this.lastHit.get(st.sprite) ?? -99) < 12) { this.lastHit.set(st.sprite, this.frame); continue; }
      if (still) this.lastHit.set(st.sprite, this.frame);
      events.push({ kind: still ? 'hit' : 'kill', x: st.x, y: st.y, image: st.image, sprite: st.sprite, frame: this.frame });
    }
    this.strikes = [];
    const playerSprite = this.nearest(cap, this.spec.player);
    const player = playerSprite ? imageCentre(spriteImage(playerSprite)) : { x: 160, y: 100 };
    for (const p of this.pending) {
      const s = p.sprites?.map((q) => this.nearest(cap, q.sprite, q.vx, q.vy)).find((x) => x);
      if (p.kind === 'hurt') {
        const hitter = s ?? this.closestOther(cap, player);
        const image = hitter ? spriteImage(hitter) : undefined;
        events.push({ kind: 'hurt', x: player.x, y: player.y, frame: this.frame, image, sprite: hitter?.n });
        continue;
      }
      if (p.kind === 'swing') { events.push({ kind: 'swing', x: player.x, y: player.y, frame: this.frame }); continue; }
      if (!s) continue; // (not drawn: nothing to show)
      const image = spriteImage(s), c = imageCentre(image);
      if (p.kind === 'strike') { if (!this.strikes.some((x) => x.sprite === s.n)) this.strikes.push({ image, sprite: s.n, x: c.x, y: c.y }); continue; }
      events.push({ kind: p.kind, x: c.x, y: c.y, image, sprite: s.n, frame: this.frame });
    }
    this.pending = [];
    // tracks, for glows
    for (const s of cap) {
      if (s.n === this.spec.player || s.n === this.spec.weapon?.sprite || this.spec.scenery?.includes(s.n)) continue;
      const img = spriteImage(s), c = imageCentre(img);
      const t = this.tracks.get(s.n) ?? [];
      // (a multiplexed sprite: follow the instance nearest where it was)
      t.push(c);
      if (t.length > 12) t.shift();
      this.tracks.set(s.n, t);
    }
    for (const n of [...this.tracks.keys()]) if (!cap.some((s) => s.n === n)) this.tracks.delete(n);
    this.events = events;
    return events;
  }

  /** Effects and sounds for a frame's events (and the weapon's trail, glows). */
  present(m: Machine, events: CombatEvent[], fx: EffectsModel, sfx: (name: SfxName) => void, now: number) {
    const o = this.options();
    if (!o.effects) { fx.setGlows([]); return; }
    const cap = m.capture.sprites;
    const player = this.nearest(cap, this.spec.player);
    playEvents(events, fx, sfx, now, { player: player ? imageCentre(spriteImage(player)) : undefined, healthBox: this.spec.healthBox });
    const w = this.spec.weapon;
    if (w && w.active(m.ram)) {
      const s = this.nearest(cap, w.sprite);
      if (s) fx.trail(now, spriteImage(s), w.color);
    }
    fx.setGlows(o.glow ? this.closingIn(cap) : []);
  }

  /** Things moving towards the player, near him: a faint glow under each. */
  private closingIn(cap: SpriteCapture[]) {
    const p = this.nearest(cap, this.spec.player);
    if (!p) return [];
    const pc = imageCentre(spriteImage(p)), out: { x: number; y: number; r: number }[] = [];
    for (const [, t] of this.tracks) {
      if (t.length < 8) continue;
      const now = t[t.length - 1], then = t[0];
      const dNow = Math.hypot(now.x - pc.x, now.y - pc.y), dThen = Math.hypot(then.x - pc.x, then.y - pc.y);
      if (dNow < 90 && dThen - dNow > 4) out.push({ x: now.x, y: now.y, r: 16 });
    }
    return out;
  }

  /**
   * Knockback for this frame: the direction to push him (joystick bits, 0: none), counting
   * down. Started by a hurt: away from what hit him, sideways.
   */
  knockback(events: CombatEvent[]) {
    if (!this.options().knockback) { this.knock.frames = 0; return 0; }
    const hurt = events.find((e) => e.kind === 'hurt');
    if (hurt?.image) {
      const c = imageCentre(hurt.image);
      // (not off the screen's edge: a push there could walk him out of the room)
      const dir = c.x > hurt.x ? 4 : 8, edge = dir === 4 ? hurt.x < 40 : hurt.x > 280;
      if (!edge) this.knock = { frames: COMBAT_TIMING.knockFrames, dir };
    }
    if (this.knock.frames <= 0) return 0;
    this.knock.frames--;
    return this.knock.dir;
  }

  /** Hit-stop: frames the game should wait now (started by a kill). */
  stopFrames(events: CombatEvent[]) {
    if (this.options().hitStop && events.some((e) => e.kind === 'kill')) this.hitStop = COMBAT_TIMING.hitStop;
    return this.hitStop;
  }

  /** Forget what was going on (a new game, a resumed save, travel). */
  reset() {
    this.pending = []; this.strikes = []; this.invulnerable = 0; this.knock.frames = 0; this.hitStop = 0; this.tracks.clear();
  }

  /** The drawn instance of sprite `n` (nearest the VIC position given, for multiplexed ones). */
  private nearest(cap: SpriteCapture[], n: number, vx?: number, vy?: number) {
    let best: SpriteCapture | undefined, bd = Infinity;
    for (const s of cap) {
      if (s.n !== n) continue;
      const d = vx === undefined || vy === undefined ? 0 : Math.abs(s.x - vx) + Math.abs(s.y - vy);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }

  /** The sprite nearest the player that isn't him, his weapon or scenery. */
  private closestOther(cap: SpriteCapture[], p: { x: number; y: number }) {
    let best: SpriteCapture | undefined, bd = Infinity;
    for (const s of cap) {
      if (s.n === this.spec.player || s.n === this.spec.weapon?.sprite || this.spec.scenery?.includes(s.n)) continue;
      const c = imageCentre(spriteImage(s)), d = Math.hypot(c.x - p.x, c.y - p.y);
      if (d < bd) { bd = d; best = s; }
    }
    return best;
  }
}
