import type { Input } from 'c64kit';

/**
 * The state machine of ContinueFlow (continue.ts), apart from the browser: what screen the flow is
 * showing and what it knows about the game being played (`FlowState`), what the player asked for
 * this tick (`Intent`, read from the input by `readIntent`), and `step`, the pure function that
 * says what happens next. Nothing here touches the input, the renderer or storage, so every
 * combination can be checked headless (games/shared/test/continue-step.ts).
 */

/**
 * Where the title's ENTER CONTINUE line goes: letters only, no box behind them, so it has to be
 * a place the title leaves empty (each game declares one: its title rendered, the row looked at).
 */
export interface TitleStrip {
  /** The letters' top line. */
  y: number;
  /** Their colour (default white): one that reads on the title's background there. */
  colour?: number;
  /** The middle of the line (default 160: the screen's). */
  x?: number;
  /** Only ENTER CONTINUE (where there's no room for the whole line, and the title says what starts a game). */
  short?: boolean;
  /** Shown only while this holds (a title of several pages: the one with room); Enter continues on any. */
  when?(): boolean;
}

/**
 * Where things are on the flow's screens (C64 pixels), for the drawing and for the taps on them:
 * one set of numbers, so a line moved is a tap target moved.
 */
export const FLOW_LAYOUT = {
  /** The picture's size. */
  screen: { w: 320, h: 200 },
  /** The letters' width. */
  glyph: 8,
  /** A panel (CONTINUE?, NEW GAME?, the options): its lines are this far apart, in the middle of the screen. */
  lineStep: 12,
  /** CONTINUE?: a tap in this band, left of `split`, says yes; right of it, no. */
  question: { y0: 60, y1: 140, split: 160 },
  /** The title's line: where it goes by default, and its tap target round the letters (a short line is tapped near its middle, `pad` beyond the letters). */
  strip: { y: 172, mid: 160, above: 12, below: 20, pad: 16 },
} as const;

/** The top of a panel of `count` lines (the lines are `lineStep` apart, in the middle of the screen). */
export function panelTop(count: number): number {
  return Math.floor((FLOW_LAYOUT.screen.h - count * FLOW_LAYOUT.lineStep) / 2);
}

/** The title's line, for a keyboard or a touch screen. */
export function stripText(strip: TitleStrip, touch: boolean): string {
  if (strip.short) return touch ? 'TAP  CONTINUE' : 'ENTER  CONTINUE';
  return touch ? 'TAP: CONTINUE    FIRE: NEW GAME' : 'ENTER  CONTINUE    SPACE  NEW GAME';
}

/**
 * Which screen of the flow's is up: exactly one. On the game's own title or in play none
 * of the flow's is up (`open`); then ENTER CONTINUE on the title (what a launch with a save
 * shows: the game never goes back into play without a key), or one of the questions that
 * hold the game (CONTINUE? after losing, NEW GAME? over a save).
 */
export type Screen =
  | { readonly kind: 'open' }
  | { readonly kind: 'title' }
  | { readonly kind: 'continue' }
  | { readonly kind: 'newGame' };

const OPEN: Screen = { kind: 'open' };
const TITLE: Screen = { kind: 'title' };
const CONTINUE: Screen = { kind: 'continue' };
const NEW_GAME: Screen = { kind: 'newGame' };

/** Everything the flow knows between ticks. */
export interface FlowState {
  readonly screen: Screen;
  /** A game is being played (a room has been entered since it began). */
  readonly playing: boolean;
  /** There is a save to continue from. */
  readonly hasSave: boolean;
  /** The room last saved on entering (-1: none yet in this game). */
  readonly lastRoom: number;
  /** Rooms entered in this game (kept with each save). */
  readonly rooms: number;
  /** A new game has begun (its saves start a new history entry); cleared when play ends. */
  readonly fresh: boolean;
  /** Play has just ended (the title came back): CONTINUE? is offered once the title has been up a moment. */
  readonly over: boolean;
  /** Ticks since a restart key (a restart on purpose: no CONTINUE? after it). */
  readonly restartAsked: number;
  /** Ticks the game's title has been up (prompts wait until it has been up a moment). */
  readonly titleTicks: number;
  /** Fire was down last tick (a press, for CONTINUE?, is a fire that wasn't). */
  readonly fireWasDown: boolean;
  /** NEW GAME? answered yes: the press goes to the game's title (until it's let go). */
  readonly startOk: boolean;
  /**
   * The player has said a new game is what he wants (NEW GAME? answered yes), until a game begins or is
   * carried on from a save. A game that begins without it, over a save (and not from a restart key
   * typed a moment ago: `restartAsked`), is not his say: the save carries on instead (`ContinueFlow.newGameAsked`).
   */
  readonly newGameOk: boolean;
}

/** The state of a flow just made: the game's own title comes first, and offers ENTER CONTINUE once it is up if there is a save. */
export function initialState(hasSave: boolean): FlowState {
  return {
    screen: OPEN,
    playing: false, hasSave, lastRoom: -1, rooms: 0, fresh: false, over: false,
    restartAsked: 1000, titleTicks: 0, fireWasDown: true, startOk: false, newGameOk: false,
  };
}

/** What the player asked for this tick, apart from where the pointer is (taps are already placed on the screens). */
export interface Intent {
  /** A key that restarts a game on purpose was typed. */
  restart: boolean;
  /** Fire is held / went down this tick. */
  fire: boolean;
  firePressed: boolean;
  /** Enter (or the numpad's) / Escape typed. */
  enter: boolean;
  escape: boolean;
  /** Taps: anywhere; on the title's line; on the left / right half of the CONTINUE? screen. */
  tap: { any: boolean; strip: boolean; left: boolean; right: boolean };
}

/** An intent in which nothing is asked. */
export const NO_INTENT: Intent = {
  restart: false, fire: false, firePressed: false, enter: false, escape: false,
  tap: { any: false, strip: false, left: false, right: false },
};

/** The parts of the input the flow reads. */
export type FlowInput = Pick<Input, 'typed' | 'held' | 'pressed' | 'points'>;

/** Read the input as an intent: the keys, and the taps placed on the screens' targets (FLOW_LAYOUT). */
export function readIntent(input: FlowInput, strip: TitleStrip, restartKeys: readonly string[]): Intent {
  const L = FLOW_LAYOUT;
  const mid = strip.x ?? L.strip.mid, half = (stripText(strip, true).length * L.glyph) / 2;
  const onStrip = (t: { x: number; y: number }) =>
    t.y >= strip.y - L.strip.above && t.y < strip.y + L.strip.below && (strip.short ? Math.abs(t.x - mid) < half + L.strip.pad : t.x < mid);
  const inBand = (t: { y: number }) => t.y >= L.question.y0 && t.y < L.question.y1;
  return {
    restart: restartKeys.some((k) => input.typed.includes(k)),
    fire: input.held.fire,
    firePressed: input.pressed.fire,
    enter: input.typed.includes('Enter') || input.typed.includes('NumpadEnter'),
    escape: input.typed.includes('Escape'),
    tap: {
      any: input.points.length > 0,
      strip: input.points.some(onStrip),
      left: input.points.some((t) => inBand(t) && t.x < L.question.split),
      right: input.points.some((t) => inBand(t) && t.x >= L.question.split),
    },
  };
}

/** What the game is doing, as `step` needs it. */
export interface StepStatus {
  /** The game's title screen is up. */
  onTitle: boolean;
}

/** What a tick did: the new state, and the save to resume from if the player chose to continue (the question answered). */
interface StepResult {
  state: FlowState;
  resume: 'title' | 'continue' | null;
}

/** A game that begins within this many ticks of a restart key was begun on purpose. */
export const RESTART_TICKS = 500;

/**
 * A tick of the flow before the game's (pure). `resume`: the player chose to continue: the save is
 * to be loaded and the game restarted from it (`'title'`: from ENTER CONTINUE, NEW GAME?'s Enter;
 * `'continue'`: from CONTINUE? after losing).
 */
export function step(prev: FlowState, intent: Intent, status: StepStatus): StepResult {
  let { screen, playing, lastRoom, fresh, over, startOk, fireWasDown, newGameOk } = prev;
  const restartAsked = intent.restart ? 1 : prev.restartAsked + 1;
  // Prompts wait until the title has been up a moment (it's drawn over a few frames).
  const titleTicks = status.onTitle ? prev.titleTicks + 1 : 0;
  const done = (resume: StepResult['resume'] = null): StepResult => ({
    state: { ...prev, screen, playing, lastRoom, fresh, over, startOk, fireWasDown, newGameOk: resume ? false : newGameOk, restartAsked, titleTicks },
    resume,
  });

  // The title is back: play is over there and then (a new game started straight away is a new
  // game, whatever brought the title back: the last life lost, R or F1, the game won). CONTINUE?
  // waits until the title has been up a moment, and isn't asked after a restart on purpose.
  if (status.onTitle && playing) { playing = false; fresh = false; lastRoom = -1; over = true; newGameOk = false; }
  if (titleTicks > 25) {
    if (over) {
      over = false;
      if (prev.hasSave && restartAsked > 100) screen = CONTINUE;
    }
    if (screen.kind === 'open' && prev.hasSave) screen = TITLE;
  } else if (screen.kind === 'title') screen = OPEN;

  // A new game over a save (Space or fire on the title) is asked first, NEW GAME?, and so is one
  // started before CONTINUE? is up (a jump still held as the last life went): the press is kept
  // from the game (the question holds it), and only a press again (yes) starts it, the title having
  // that one till it's let go.
  if (startOk && !intent.fire) startOk = false;
  if (status.onTitle && prev.hasSave && (screen.kind === 'open' || screen.kind === 'title') && intent.fire && !startOk) {
    screen = over && restartAsked > 100 ? CONTINUE : NEW_GAME;
    over = false;
    fireWasDown = true;
    return done();
  }

  // Enter on the title with a save continues it from the first moment the title is up, before ENTER
  // CONTINUE is drawn (and CONTINUE? is asked): the game's own title starts on Return, and would begin a new game.
  if (status.onTitle && prev.hasSave && screen.kind === 'open' && intent.enter) {
    const how = over ? 'continue' : 'title';
    over = false;
    return done(how);
  }

  const kind = screen.kind;
  if (kind === 'open') return done();
  // Taps (touch): the words. On the title, its CONTINUE (the line's left half, or all of a short
  // one, and round it); on the CONTINUE? screen, its left half says yes and its right half no.
  const tapYes = kind === 'title' ? intent.tap.strip : intent.tap.left;
  const yes = tapYes || intent.enter || (kind === 'continue' && intent.fire && !fireWasDown);
  // (CONTINUE? waits for its answer: no countdown answers for the player)
  const no = kind === 'continue' && (intent.tap.right || intent.escape);
  fireWasDown = intent.fire;
  if (no) screen = OPEN;
  if (kind === 'newGame') {
    // fire (or Space) again: the title has it and starts the game; Esc or a tap: back to the title; Enter continues
    if (intent.firePressed) { screen = OPEN; startOk = true; newGameOk = true; return done(); }
    if (intent.escape || (intent.tap.any && !intent.fire)) { screen = OPEN; return done(); }
    if (!intent.enter) return done();
    screen = OPEN;
    return done('title');
  }
  if (!yes) return done();
  screen = OPEN;
  return done(kind);
}
