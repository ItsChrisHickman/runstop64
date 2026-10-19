/**
 * Moley Christmas's sound, one object for the front end to drive: the five beeper effects of the 48K game (made from the speaker's
 * flips at start-up, at the browser's sample rate) and the 128K game's AY music (a recording of the original's player, played by a
 * synthesiser on the audio thread). Both are the original's, in both modes (ORIGINAL and ENHANCED); the music plays on the 48K
 * version of the game too, which had none, and loops for ever as the original does.
 *
 * The API:
 * - `new MoleySound()`; it is the `player` that `AudioKeys` (games/shared/audio.ts) wants (`unlocked`, `unlock()`, `toggleMute()`),
 *   so the first key or tap unlocks the audio, which starts the music, and M mutes music and effects together. `started` can do
 *   nothing.
 * - `afterStep(game, step)`: call it after EVERY `flow.step(...)` with `flow.game` and the step it returned. A pass makes its
 *   effects (`game.sounds`, in the order the original played them, one after another: the original blocks while an effect plays);
 *   this plays them, once per pass. The pickup, energy hit and mechanism sound at once, the pass's own picture. The death (0) and
 *   the time-out noise (1) sound when the step that holds the picture for them comes (3 frames for the death, 13 for the noise,
 *   after the dial's 55 frames when time ran out), found as the first step of the pass that is held 3 frames or more.
 * - `effect(n)`: one effect now, queued after any still sounding (0 death, 1 time-out noise, 2 pickup, 3 energy hit, 5 mechanism).
 * - `music(on)`: the music (on by default). `hold(on)`: silence while the game is stopped (a pause screen, the map) and the music
 *   stops where it is. `toggleMute()`, `muted`. `sync(game)`: after a game is put into play from a save, so its last pass's
 *   effects are not played again.
 *
 * Nothing is needed per frame. Until the audio is unlocked every call does nothing.
 */
import { AyPlayer } from 'c64kit';
import { effectSamples, EFFECT_IDS, effectSeconds } from './beeper';
import { musicBytes, MUSIC_STEP_HZ } from './music';

/** What of a `Game` the sound reads: the pass counter, which changes with every pass, and the effects that pass asked for. */
export interface PassSource {
  readonly counter: number;
  readonly sounds: readonly number[];
}

/** The part of a flow step the sound reads: how long the step's picture is held. */
export interface HeldStep {
  readonly frames: number;
}

/** What of the player the sound uses (c64kit's `AyPlayer`; a test gives one that remembers). */
export type SoundOutput = Pick<AyPlayer, 'unlocked' | 'unlock' | 'muted' | 'toggleMute' | 'hold' | 'sampleRate' | 'now' | 'tune' | 'play' | 'addSample' | 'playSample'>;

/** The loudness of the effects against the music (the speaker's square wave is far louder than the chip's three quiet voices). */
const EFFECT_GAIN = 0.3;
/** A step held this many frames or more is the one that holds the picture for the death's sound (3 frames; the time-out dial's last is 4). */
const SOUND_HOLD_FRAMES = 3;
/** The effects that sound when the picture holds for them, not when the pass is made. */
const HELD_EFFECTS: readonly number[] = [0, 1];

export class MoleySound {
  private readonly samples = new Map<number, number>();
  /** the audio time the last effect ends */
  private busyUntil = 0;
  private wantMusic = true;
  private seenPass = -1;
  private waiting: number[] = [];

  constructor(private readonly out: SoundOutput = new AyPlayer()) {}

  get unlocked(): boolean { return this.out.unlocked; }
  get muted(): boolean { return this.out.muted; }

  /** Unlock the audio (inside a key or tap), make the effects at its sample rate, give it the music and start that. */
  async unlock(): Promise<void> {
    await this.out.unlock();
    if (this.samples.size === 0) {
      for (const id of EFFECT_IDS) {
        const samples = effectSamples(id, this.out.sampleRate);
        if (samples !== null) this.samples.set(id, this.out.addSample(samples, EFFECT_GAIN));
      }
      this.out.tune(musicBytes(), MUSIC_STEP_HZ);
    }
    this.out.play(this.wantMusic);
  }

  toggleMute(): boolean { return this.out.toggleMute(); }
  hold(on: boolean): void { this.out.hold(on); }

  music(on: boolean): void {
    this.wantMusic = on;
    if (this.out.unlocked) this.out.play(on);
  }

  /** The music from its start again (the ending's: the tune begins with the show). */
  restartMusic(): void {
    if (!this.out.unlocked) return;
    this.out.tune(musicBytes(), MUSIC_STEP_HZ);
    this.out.play(this.wantMusic);
  }

  /** One effect (0 death, 1 time-out noise, 2 pickup, 3 energy hit, 5 mechanism), after any that is still sounding. */
  effect(id: number): void {
    const sample = this.samples.get(id);
    if (sample === undefined) return;
    const at = Math.max(this.out.now, this.busyUntil);
    this.out.playSample(sample, at);
    this.busyUntil = at + effectSeconds(id);
  }

  /** Call after every flow step (see the top). */
  afterStep(game: PassSource, step: HeldStep): void {
    if (game.counter !== this.seenPass) {
      this.seenPass = game.counter;
      this.waiting = [];
      for (const id of game.sounds) {
        if (HELD_EFFECTS.includes(id)) this.waiting.push(id);
        else this.effect(id);
      }
    }
    if (this.waiting.length > 0 && step.frames >= SOUND_HOLD_FRAMES) {
      for (const id of this.waiting) this.effect(id);
      this.waiting = [];
    }
  }

  /** A game was put into play from a save: its last pass's effects are not for now. */
  sync(game: PassSource): void {
    this.seenPass = game.counter;
    this.waiting = [];
  }
}
