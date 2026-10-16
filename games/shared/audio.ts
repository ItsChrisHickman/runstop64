import type { Input, PointerTarget, Renderer } from 'c64kit';

/** What the sound keys need of a SID player (c64kit's `SidPlayer`). */
export interface Unlockable {
  readonly unlocked: boolean;
  unlock(): Promise<void>;
  toggleMute(): boolean;
}

export interface AudioKeysOptions {
  canvas: PointerTarget;
  input: Input;
  renderer: Renderer;
  player: Unlockable;
  /** Once the browser has let the audio start (a key or a tap): what starts the game's sound, which is its own. */
  started(): void | PromiseLike<void>;
  /** M: default mutes the player; a game whose M is something else (Monty's music or sound effects) says what. */
  mute?(): void;
  /** V (authentic pixel steps): on unless the game's keyboard uses V (the translated games, where it is a game key). */
  snapKey?: boolean;
  /** A pad's fire also tries to unlock the audio (Monty and AWM did from the start; a pad is no user gesture, so a browser lets it do nothing). */
  padUnlocks?: boolean;
}

/**
 * The sound's browser side, the same in every game: the audio is unlocked by the first tap on the
 * picture or key, M mutes and V toggles authentic pixel steps. Call `tick()` each frame.
 */
export class AudioKeys {
  constructor(private readonly o: AudioKeysOptions) {
    o.canvas.addEventListener('pointerdown', this.unlock);
  }

  /** Unlock the audio, once, then start the game's sound. */
  readonly unlock = () => {
    const { player, started } = this.o;
    if (player.unlocked) return;
    void player.unlock().then(started);
  };

  /** `typing`: the game is asking for letters (a name): M and V are letters then. */
  tick(typing = false) {
    const { input, renderer, player, mute, snapKey, padUnlocks } = this.o;
    if (input.typed.length || (padUnlocks && input.held.fire)) this.unlock();
    if (typing) return;
    if (input.typed.includes('KeyM')) {
      if (mute) mute();
      else player.toggleMute();
    }
    if (snapKey !== false && input.typed.includes('KeyV')) renderer.snap = !renderer.snap;
  }
}
