/**
 * Wanted: Monty Mole's sound, one object for the front end to drive. All of it is the ROM's BEEPER called with a count and a pitch (the footsteps and the jump's ticks, the thud
 * of the crusher, the pick-ups, the title tune of 273 records, the death tune of 24 notes), so it is made from the speaker's flips at start-up, at the browser's sample rate
 * (src/beeper.ts: the routine's timing as a formula, proved against the model; c64kit's `renderToggles`): no recording, no AY. The effects play one after another as the
 * original's do (it blocks while one sounds); the title tune is the picture's and loops while the title is up (the original plays it once and goes on to the options);
 * the death tune plays with the death and stops where it ends.
 *
 * The API:
 * - `new MontySound()`; it is the `player` that `AudioKeys` (games/shared/audio.ts) wants (`unlocked`, `unlock()`, `toggleMute()`), so the first key or tap unlocks the
 *   audio and M mutes everything. Until it is unlocked every call does nothing.
 * - `beeps(list)`: the beeps a pass made (`Game.beeps`); play them and empty the list.
 * - `title(on)`: the title tune; call it every frame with whether the title is up. `death(on)`: the death tune, with whether a death is being shown.
 * - `hold(on)`: silence while the game is stopped (a pause screen, the map).
 */
import { AyPlayer, renderToggles, SPECTRUM_48K_CLOCK, togglesLength } from 'c64kit';
import { beeperToggles } from './beeper';
import { DEATH_TUNE, TITLE_TUNE, type Note } from './data';
import type { Beep } from './game';

/** The loudness of the speaker (its square wave is far louder than it sounds on a recording). */
const GAIN = 0.3;
/** A rest in the title tune is `E` frames (`$D2CF`: `LD B,E`, `HALT`, `DJNZ`; 0 is 256). */
const FRAME_SECONDS = 1 / 50;

/** What of the player the sound uses (c64kit's `AyPlayer`; a test gives one that remembers). */
type SoundOutput = Pick<AyPlayer, 'unlocked' | 'unlock' | 'muted' | 'toggleMute' | 'hold' | 'sampleRate' | 'now' | 'addSample' | 'playStoppable'>;

/** A tune as samples: each note by BEEPER's timing, a rest as silence. */
function tuneSamples(notes: readonly Note[], rate: number): Float32Array {
  const parts = notes.map((n) => (n.hl === 0 ? new Float32Array(Math.round((n.de & 255 || 256) * FRAME_SECONDS * rate)) : renderToggles(beeperToggles(n.de, n.hl), rate)));
  const out = new Float32Array(parts.reduce((a, p) => a + p.length, 0));
  let at = 0;
  for (const p of parts) { out.set(p, at); at += p.length; }
  return out;
}

export class MontySound {
  private readonly beepIds = new Map<string, number>();
  private titleId = -1;
  private deathId = -1;
  private titleSeconds = 0;
  /** the audio time the last effect ends */
  private busyUntil = 0;
  private titleOn: { stop(): void } | null = null;
  private titleEnds = 0;
  private deathOn: { stop(): void } | null = null;

  constructor(private readonly out: SoundOutput = new AyPlayer()) {}

  get unlocked(): boolean { return this.out.unlocked; }
  get muted(): boolean { return this.out.muted; }

  /** Unlock the audio (inside a key or tap) and make the tunes at its sample rate. */
  async unlock(): Promise<void> {
    await this.out.unlock();
    if (this.titleId >= 0) return;
    const rate = this.out.sampleRate;
    const title = tuneSamples(TITLE_TUNE, rate);
    this.titleSeconds = title.length / rate;
    this.titleId = this.out.addSample(title, GAIN);
    this.deathId = this.out.addSample(tuneSamples(DEATH_TUNE, rate), GAIN);
  }

  toggleMute(): boolean { return this.out.toggleMute(); }
  hold(on: boolean): void { this.out.hold(on); }

  /** One beep, after any that is still sounding. */
  beep(b: Beep): void {
    if (!this.out.unlocked) return;
    const key = `${b.de}:${b.hl}`;
    let id = this.beepIds.get(key);
    if (id === undefined) {
      id = this.out.addSample(renderToggles(beeperToggles(b.de, b.hl), this.out.sampleRate), GAIN);
      this.beepIds.set(key, id);
    }
    const at = Math.max(this.out.now, this.busyUntil);
    this.out.playStoppable(id, at);
    this.busyUntil = at + togglesLength(beeperToggles(b.de, b.hl)) / SPECTRUM_48K_CLOCK;
  }

  /** The beeps a pass made: played, and the list emptied. */
  beeps(list: Beep[]): void {
    for (const b of list) this.beep(b);
    list.length = 0;
  }

  /** The title tune, while `on`: begun when it is, again when it is over, stopped when it is not. */
  title(on: boolean): void {
    if (!this.out.unlocked || this.titleId < 0) return;
    if (!on) { this.titleOn?.stop(); this.titleOn = null; return; }
    if (this.titleOn !== null && this.out.now < this.titleEnds) return;
    this.titleOn = this.out.playStoppable(this.titleId, this.out.now);
    this.titleEnds = this.out.now + this.titleSeconds;
  }

  /** The death tune, while a death is shown: begun with it, cut where it ends. */
  death(on: boolean): void {
    if (!this.out.unlocked || this.deathId < 0) return;
    if (!on) { this.deathOn?.stop(); this.deathOn = null; return; }
    if (this.deathOn === null) this.deathOn = this.out.playStoppable(this.deathId, this.out.now);
  }
}
