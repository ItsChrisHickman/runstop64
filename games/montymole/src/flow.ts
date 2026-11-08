/**
 * The whole game as one flow the front end drives: the title (the loading picture and its tune), the options (ours: the keys), play (the opening scene and the 21 rooms),
 * game over and the ending, and back to the title. `step(input)` is called when the picture of the last step has been shown for its `frames`; it returns the next picture
 * and for how many 50 Hz frames to show it. In play a step is a pass (25 a second in the rooms, as the original runs: 2 frames; the opening's loop is about a frame long:
 * 1) and its picture is the game as it is, whose sprites a front end can glide across the step; a death is shown for the frames the original takes (the picture rising,
 * `death.ts`); the verses are typed a frame at a time (`VersePrinter`).
 *
 * What the original does that this does not: its title is followed by the options with the keys' choice and PLAY GAME (ours is one screen that names our keys and starts
 * with the jump key), and after game over or the ending it goes straight to a new game's options (ours goes to the title, where ENTER CONTINUE is). The rest is the original's:
 * a death plays the rising picture, game over and the ending type their verses and wait 510 frames for a key (any key ends it).
 */
import { DeathScene, SHAKE_DONE, SHAKE_FRESH } from './death';
import { Game, OPENING_ROOM } from './game';
import { portsFor } from './controls';
import { optionsScreen, Screen, titleScreen, VersePrinter, WAIT_FRAMES } from './screens';
import { sceneryBits, spritePlaces, type SpritePlace } from './scenery';
import type { FieldCopy } from './field';

export type Phase = 'title' | 'options' | 'play' | 'over' | 'ending';

/** A picture held: the screen's bytes, the scenery without sprites (ENHANCED's look) and the sprites that are to be drawn over it (a held picture of ours has none). */
export interface Shot {
  readonly bits: Uint8Array;
  readonly attrs: Uint8Array;
  readonly plain: Uint8Array;
  readonly sprites: readonly SpritePlace[];
}

export interface FlowStep {
  readonly phase: Phase;
  /** how many 50 Hz frames the step lasts */
  readonly frames: number;
  /** the picture to hold, or null for the game as it is (a pass: the sprites move) */
  readonly shot: Shot | null;
  /** a pass was made in this step: the sprites moved (a front end that glides them starts from here) */
  readonly fresh: boolean;
}

/** What the player is doing at the moment of a step. */
export interface FlowInput {
  /** the keys of a pass (`Key` bits) */
  readonly keys: number;
  /** a press that goes on from a screen: the jump key, Enter, a tap (the front end decides: with a save to lose it asks first) */
  readonly start: boolean;
  /** any key or button at all (the verses are ended by any) */
  readonly any: boolean;
}

/** A pass takes 2 frames in the rooms (25 a second: `re/README.md`, "The main loop") and about 1 in the opening scene. */
export const ROOM_PASS_FRAMES = 2, OPENING_PASS_FRAMES = 1;

const held = (screen: Screen): Shot => ({ bits: screen.bits, attrs: screen.attrs, plain: screen.bits, sprites: [] });

export class MontyFlow {
  phase: Phase = 'title';
  readonly game: Game;
  /** the best score so far (the original has none; the front end keeps it in the browser) */
  highScore = 0;
  private readonly title = held(titleScreen());
  private options: Shot | null = null;
  private printer: VersePrinter | null = null;
  private waited = 0;
  private dying: { readonly scene: DeathScene; left: number; readonly shot: Shot } | null = null;
  /** `$9179` between deaths: it starts as the tape has it and is as a death left it after */
  private shake = SHAKE_FRESH;
  private overAfter: 'over' | 'ending' | null = null;

  /** A flow at the title, or (with a game) in play already, as after a continue. */
  constructor(game: Game = new Game(), play = false) {
    this.game = game;
    if (play) this.phase = 'play';
  }

  /** The next picture. */
  step(input: FlowInput): FlowStep {
    switch (this.phase) {
      case 'title': return this.titleStep(input);
      case 'options': return this.optionsStep(input);
      case 'play': return this.playStep(input);
      case 'over':
      case 'ending': return this.verseStep(input);
    }
  }

  private still(phase: Phase, shot: Shot): FlowStep { return { phase, frames: 1, shot, fresh: false }; }

  private titleStep(input: FlowInput): FlowStep {
    if (input.start) {
      this.phase = 'options';
      return this.optionsStep({ ...input, start: false });
    }
    return this.still('title', this.title);
  }

  private optionsStep(input: FlowInput): FlowStep {
    if (input.start) return this.begin();
    this.options ??= held(optionsScreen(this.highScore));
    return this.still('options', this.options);
  }

  /** A new game: the opening scene. */
  private begin(): FlowStep {
    this.options = null;
    this.game.newGame();
    this.phase = 'play';
    return { phase: 'play', frames: OPENING_PASS_FRAMES, shot: null, fresh: false };
  }

  /** The room (or scene) the game is in, entered at once from a save or a travel. */
  continued(): FlowStep {
    this.phase = 'play';
    this.dying = null;
    return { phase: 'play', frames: ROOM_PASS_FRAMES, shot: null, fresh: false };
  }

  // ---- play ------------------------------------------------------------------------------------------------------

  private playStep(input: FlowInput): FlowStep {
    const d = this.dying;
    if (d !== null) return this.deathStep(d);
    const g = this.game;
    const outcome = g.pass(portsFor(input.keys));
    const frames = g.room === OPENING_ROOM ? OPENING_PASS_FRAMES : ROOM_PASS_FRAMES;
    if (g.death !== null) { // he died in this pass: the picture rises, and then (no life left) game over; the game is in the next room already
      const scene = new DeathScene(g.death.field, g.death.x, g.death.y, this.shake);
      g.death = null;
      this.shake = SHAKE_DONE;
      this.overAfter = outcome === 'gameOver' ? 'over' : null;
      this.dying = { scene, left: scene.frames, shot: this.deathShot(scene.field) };
      return this.deathStep(this.dying);
    }
    if (outcome === 'ending') return this.startVerse('ending');
    if (outcome === 'gameOver') return this.startVerse('over');
    return { phase: 'play', frames, shot: null, fresh: true };
  }

  private deathShot(field: FieldCopy): Shot {
    return { bits: field.screen, attrs: field.attrs, plain: field.screen, sprites: [] };
  }

  /** One frame of the death: the rising picture drawn by the interrupt routine's death branch. */
  private deathStep(d: { readonly scene: DeathScene; left: number; readonly shot: Shot }): FlowStep {
    d.scene.interrupt();
    if (--d.left <= 0) {
      this.dying = null;
      if (this.overAfter !== null) { const next = this.overAfter; this.overAfter = null; return this.startVerse(next); }
    }
    return { phase: 'play', frames: 1, shot: d.shot, fresh: false };
  }

  // ---- game over and the ending ---------------------------------------------------------------------------------

  private startVerse(kind: 'over' | 'ending'): FlowStep {
    this.highScore = Math.max(this.highScore, this.game.score.value);
    this.phase = kind;
    this.printer = new VersePrinter(kind === 'ending', this.game.score.digits);
    this.waited = 0;
    return this.verseStep({ keys: 0, start: false, any: false });
  }

  /** The verse a frame at a time; once it is typed, any key (or `WAIT_FRAMES` frames) ends it. */
  private verseStep(input: FlowInput): FlowStep {
    const p = this.printer;
    if (p === null) { this.phase = 'title'; return this.titleStep(input); }
    const typing = p.step();
    if (!typing) {
      this.waited++;
      if (input.any || this.waited >= WAIT_FRAMES) {
        this.printer = null;
        this.phase = 'title';
        return this.still('title', this.title);
      }
    }
    return this.still(this.phase, held(p.screen));
  }

  /** A death is being shown. */
  get isDying(): boolean { return this.dying !== null; }

  /** The picture of the game as it is (a held screen of the front end's own behind a panel needs it). */
  scenery(out: Uint8Array): Uint8Array { return sceneryBits(this.game, out); }
  get sprites(): SpritePlace[] { return spritePlaces(this.game); }
}
