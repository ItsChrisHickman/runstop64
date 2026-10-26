/**
 * The whole game as one flow the front end drives: the credits page, play, GAME OVER, the Christmas card, and back to the credits
 * page. `step(input)` is called when the picture of the last step has been shown for its `frames`; it returns the next picture and
 * for how many 50 Hz frames to show it. In play a step is a logic pass (25 a second, the original's speed: 2 frames) and the
 * picture is the display as it is, whose sprites a front end can glide across the step; everywhere else a step is one frame (the
 * scrollers, GAME OVER's colours) or a picture held for some frames (a death, the credits page while it looks for a joystick).
 *
 * It does what the original's loops do, in their order (re/README.md): the credits page, a jump key and the start of a game
 * (`$81BC`); the main loop's pass (`$822B`), and in it the ending (`$82DA`) when the last delivery was made and GAME OVER (`$8292`)
 * when the lives ran out; either one goes back to the credits page (`$81BC`) when its time is up or a key is pressed. The high
 * score and the maps stay between games, as in the original (the one `Game` is started again, `Game.newGame`).
 * A change of screen takes the frames the original takes (it clears and draws in place over about 4 to 10 frames) and shows the new
 * picture throughout: the original's pictures in between are the old one, a cleared screen and the new one in pieces.
 *
 * test/flow.ts compares every frame with the original running, from the credits page, round a game over and the ending.
 */
import { CREDITS_TEXT, ENDING_ROOM } from './data';
import { Display, type Shot } from './display';
import { Game } from './game';
import { Key } from './monty';
import type { Random } from './random';
import { cardScreen, cardScroller, creditsScreen, creditsScroller, OVER_FRAMES, Screen, type Scroller, twinkle, writeGameOver } from './screens';

export type Phase = 'credits' | 'play' | 'over' | 'ending';

/** What the player is doing at the moment of a step. */
export interface FlowInput {
  /** the keys of a pass (`readKeys`, input.ts): the jump bit starts a game on the credits page */
  readonly keys: number;
  /** any key or button at all: the Christmas card waits for one (`IN A,($FE)` with every half-row, `$82F4`) */
  readonly any: boolean;
}

export interface FlowStep {
  readonly phase: Phase;
  /** how many 50 Hz frames the step lasts */
  readonly frames: number;
  /** the picture to hold, or null for the display as it is (a pass: `Display`, with its sprites) */
  readonly shot: Shot | null;
  /** a pass was made in this step: the sprites moved (a front end that glides them starts from here) */
  readonly fresh: boolean;
  /** the original draws this picture in place over the step's first frames (a new screen, a room entered): old, cleared and new in pieces */
  readonly redraw: boolean;
  /**
   * With `redraw`: the old screen as the original left it when it began to draw this one, when that is not the last picture shown (the
   * scroller moved one more pixel in the frame in which the key was read); a front end that wipes from the old to the new could use it.
   */
  readonly before: Shot | null;
}

/**
 * Frames the original takes, measured on it (test/flow.ts checks them):
 * - the credits page: the screen is cleared and the picture unpacked (4 frames), then it looks for a joystick for 44 frames (65,536 reads);
 *   a jump key is not read until the scroller starts;
 * - a game starts 10 frames after the jump key is read (the screen is cleared, the panel put up, room 0 drawn);
 * - a room entered by a way out takes 6 frames more than a pass; after a death the new room is drawn in the 9 frames after the last picture (5 before GAME OVER);
 * - the card: a pass in which the last delivery is made leaves the screen cleared and the card drawn in `CARD_FRAMES` frames.
 */
export const CREDITS_FRAMES = 48;
export const START_FRAMES = 10;
const ENTRY_FRAMES = 6;
const DEATH_TAIL_FRAMES = 9;
export const CARD_FRAMES = 5;
/** The last delivery's pass until the card: it draws once more (`$9CE0`), adds its 1000 points (`$9CE3`) and waits 50 frames (`$9CE9`), the screen as it was. */
export const ENDING_WAIT_FRAMES = 51;
/** The wait before GAME OVER shows after the death pictures: the room is entered again first (`$854A`). */
export const OVER_ENTRY_FRAMES = 5;
const PASS_FRAMES = 2;

/** What a front end may change of the flow. */
export interface FlowOptions {
  /**
   * The credits page's scrolling text (default the original's, which names the original's keys; a front end gives one with its own: the
   * page can only print the characters the original's texts have, `GLYPHS`).
   */
  readonly creditsText?: string;
}

export class MoleyFlow {
  phase: Phase = 'credits';
  readonly game: Game;
  readonly display: Display;
  /** pictures to show before the phase's own next step: death pictures, the time a screen takes to draw */
  private readonly queue: FlowStep[] = [];
  private screen: Screen = creditsScreen();
  private scroller: Scroller;
  private readonly creditsText: string;
  /** the frame of GAME OVER (0-99): its colour and when it is over */
  private overFrame = 0;
  /** whether the scroller of the credits page or the card has started (it is not shifted in the frame that starts it) */
  private started = false;
  /** the card waits for every key to be let go before its text starts */
  private waiting = false;

  /** A flow at the credits page, or (with a game and its display) one in play already, as after a continue or in a test. */
  constructor(private readonly rng: Random, resume?: { readonly game: Game; readonly display: Display }, options: FlowOptions = {}) {
    this.creditsText = options.creditsText ?? CREDITS_TEXT;
    this.scroller = creditsScroller(this.creditsText);
    if (resume === undefined) {
      this.game = new Game(rng, false);
      this.display = new Display(this.game);
      this.queue.push(this.enterCredits());
    } else {
      this.game = resume.game;
      this.display = resume.display;
      this.phase = 'play';
    }
  }

  get highScore(): number { return this.game.highScore; }
  set highScore(score: number) { this.game.highScore = score; }

  /** The next picture. */
  step(input: FlowInput): FlowStep {
    const queued = this.queue.shift();
    if (queued !== undefined) return this.go(queued);
    switch (this.phase) {
      case 'credits': return this.creditsStep(input);
      case 'play': return this.playStep(input);
      case 'over': return this.overStep();
      case 'ending': return this.endingStep(input);
    }
  }

  // ---- the credits page ---------------------------------------------------------------------------------------

  private enterCredits(before: Shot | null = null): FlowStep {
    this.screen = creditsScreen();
    this.scroller = creditsScroller(this.creditsText);
    this.started = false;
    return this.held('credits', this.screen, CREDITS_FRAMES, true, before);
  }

  /** `$A106`: after the wait, each frame shifts the row, reads the keys, and counts. */
  private creditsStep(input: FlowInput): FlowStep {
    if (this.started) this.scroller.shift(this.screen);
    if ((input.keys & Key.jump) !== 0) return this.start();
    this.started = true;
    this.scroller.feed(this.screen);
    return this.held('credits', this.screen, 1);
  }

  private start(): FlowStep {
    this.game.newGame();
    this.display.hud(); // (the panel is up when the first room is: faces, a full gauge)
    return this.go({ phase: 'play', frames: START_FRAMES, shot: this.display.still(START_FRAMES), fresh: false, redraw: true, before: this.screen.shot(1) });
  }

  // ---- play ------------------------------------------------------------------------------------------------------

  private playStep(input: FlowInput): FlowStep {
    const entries = this.display.entries;
    const outcome = this.game.pass(input.keys);
    const shots = this.display.takeShots();
    const entered = this.display.entries !== entries;
    const steps: FlowStep[] = shots.map((shot) => ({ phase: 'play', frames: shot.frames, shot, fresh: false, redraw: false, before: null }));
    switch (outcome) {
      case 'playing':
        steps.push({
          phase: 'play',
          frames: shots.length > 0 ? DEATH_TAIL_FRAMES : PASS_FRAMES + (entered ? ENTRY_FRAMES : 0),
          shot: null,
          fresh: true,
          redraw: entered,
          before: null,
        });
        break;
      case 'ended':
        // (the ending is only ever made in room 5, which has no conveyors to turn after the draw)
        this.display.drawn();
        steps.push({ phase: 'play', frames: ENDING_WAIT_FRAMES, shot: null, fresh: true, redraw: false, before: null });
        steps.push(this.enterCard());
        break;
      case 'over':
        steps.push(...this.enterOver());
        break;
    }
    return this.queueAll(steps);
  }

  /** Make the first of the steps the answer and queue the rest. */
  private queueAll(steps: FlowStep[]): FlowStep {
    const first = steps.shift();
    if (first === undefined) throw new Error('a step with no picture');
    this.queue.push(...steps);
    return this.go(first);
  }

  private go(step: FlowStep): FlowStep {
    this.phase = step.phase;
    return step;
  }

  // ---- GAME OVER ---------------------------------------------------------------------------------------------------

  /** The room entered again behind the death pictures, then the text from the first frame of its 100. */
  private enterOver(): FlowStep[] {
    this.screen = Screen.from(this.display.bits, this.display.attributes());
    this.overFrame = 0;
    return [{ phase: 'over', frames: OVER_ENTRY_FRAMES, shot: this.display.still(OVER_ENTRY_FRAMES), fresh: false, redraw: true, before: null }];
  }

  private overStep(): FlowStep {
    writeGameOver(this.screen, this.overFrame);
    const shot = this.screen.shot(1);
    this.overFrame++;
    if (this.overFrame < OVER_FRAMES) return { phase: 'over', frames: 1, shot, fresh: false, redraw: false, before: null };
    // (the last frame is shown, and the credits page follows it)
    this.queue.push(this.enterCredits());
    return { phase: 'over', frames: 1, shot, fresh: false, redraw: false, before: null };
  }

  // ---- the Christmas card ----------------------------------------------------------------------------------------

  private enterCard(): FlowStep {
    this.game.enterRoom(ENDING_ROOM);
    this.screen = cardScreen();
    this.scroller = cardScroller();
    this.started = false;
    this.waiting = true;
    return this.held('ending', this.screen, CARD_FRAMES, true);
  }

  /** `$82F4`-`$8357`: wait for every key to be up, then each frame shifts, twinkles, reads the keys, and counts. */
  private endingStep(input: FlowInput): FlowStep {
    if (this.waiting) {
      if (input.any) return this.held('ending', this.screen, 1);
      this.waiting = false;
    } else {
      this.scroller.shift(this.screen);
      twinkle(this.screen, this.rng);
      if (input.any) return this.go(this.enterCredits(this.screen.shot(1)));
    }
    this.scroller.feed(this.screen);
    return this.held('ending', this.screen, 1);
  }

  private held(phase: Phase, screen: Screen, frames: number, redraw = false, before: Shot | null = null): FlowStep {
    return { phase, frames, shot: screen.shot(frames), fresh: false, redraw, before };
  }
}

