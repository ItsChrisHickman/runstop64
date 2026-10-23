/**
 * The whole game as the original runs it, frame by frame at 50 Hz: the title, play, the closing screen (GAME OVER, which the
 * ending ends in too) and the title again, with the high score kept between games.
 *
 *   title ($406E) --fire--> a new game in room $48 ($5428) --last life lost, or the ending's flag--> GAME, OVER ($3540)
 *     --> the score becomes the high score if it is higher ($82FD) --> the title ($5422)
 *
 * It is what a front end drives: `frame(controls)` once every 50th of a second, then `capture` and `ram` are the picture
 * (what `C64View` draws), and `takeSound()` the requests of the sound drivers since the last frame.
 *
 * Where the original takes frames that the rebuild does not (drawing a room takes it a handful of frames, with the
 * picture filling in; the title set-up too), the rebuild goes straight on: the call that starts a game also runs the game's
 * first pass, the call after the last of the closing screen the title's first.
 */
import { EVERY_FRAME, type FrameCapture, type ViewStep } from 'c64kit';
import { Closing } from './closing';
import { endOf, updateHigh, type Ending } from './flow';
import { type Entry, FIRST_GAME, Game, type GameCarry } from './game';
import type { Flight } from './flight';
import { decodeStick, Stick } from './input';
import { Picture } from './picture';
import { restore, type AwmSave } from './save';
import { Scroller } from './scroller';
import { SoundLog, type SoundCall } from './soundlog';
import { tuneForRoom } from './sound';
import { SETUP_FRAMES_AFTER_GAME, Title, type TitleCarry } from './title';

/** The room a new game starts in ($5457). */
export const START_ROOM = 0x48;

/** What the player holds this frame: the joystick (`Stick` bits), the title's two keys and the key that boards a plane (the Commodore key in the original). */
export interface Controls {
  readonly stick: number;
  readonly f1: boolean;
  readonly f7: boolean;
  readonly fly: boolean;
}

export const NO_CONTROLS: Controls = { stick: 0, f1: false, f7: false, fly: false };

/** Play: the game, its picture, and the flight he is on, if he has boarded a plane (the main loop's logic step waits for it). */
interface Play {
  readonly kind: 'play';
  readonly game: Game;
  readonly picture: Picture;
  flight: Flight | null;
}

type Part =
  | { readonly kind: 'title'; readonly title: Title }
  | Play
  | { readonly kind: 'closing'; readonly game: Game; readonly picture: Picture; readonly closing: Closing };

export class Program {
  /** $4067: the high score, five digits, the least significant first. */
  readonly high: number[] = [0, 0, 0, 0, 0];
  private readonly scroller = new Scroller();
  /** $4066: the title's choice, which stays between games. */
  private soundFlag = 0;
  /** What the last game left for the next (`FIRST_GAME` before any). */
  private carry: GameCarry = FIRST_GAME;
  private readonly sound = new SoundLog();
  private part: Part;
  capture: FrameCapture;
  /**
   * What the frame just made was, for the view's smoothing: play steps once in two frames (the logic phase moves the
   * sprites, the drawing phase after it leaves them), so a sprite glides across both; the title and the closing screen
   * move theirs every frame. A game begun or put back starts with a step of its own: the sprites are all new.
   */
  viewStep: ViewStep = EVERY_FRAME;
  private beginning = false;
  /** How the last game ended (the CONTINUE? that follows treats the ending differently from the last life lost). */
  lastEnd: Ending | null = null;
  /** The front end's rules for the games to come (game.ts `graceActive`, `safeRespawn`, `unlimitedLives`): the original's are off. */
  graceActive: () => boolean = () => false;
  safeRespawn: () => boolean = () => false;
  unlimitedLives: () => boolean = () => false;

  constructor() {
    const title = new Title(this.scroller, this.soundFlag);
    this.part = { kind: 'title', title };
    this.sound.tune(0); // ($4071)
    this.capture = title.capture;
  }

  /** What the part now running is: for a front end that treats the title and play differently. */
  get kind(): Part['kind'] {
    return this.part.kind;
  }

  /** He is on a flight: the picture is the sky, and the logic step he boarded in waits for him to come down. */
  get flying(): boolean {
    return this.part.kind === 'play' && this.part.flight !== null;
  }

  /** The title's choice of sound effects (F7) over music (F1). */
  get effectsChosen(): boolean {
    return this.soundFlag !== 0;
  }

  /** Back to the title on the player's say-so (the front end's), from play: the title is set up as after a game, and the game left. */
  toTitle(): void {
    if (this.part.kind !== 'play') return;
    const title = new Title(this.scroller, this.soundFlag, this.part.picture.titleCarry, SETUP_FRAMES_AFTER_GAME);
    this.carry = this.part.game.carryOver();
    this.sound.tune(0);
    this.part = { kind: 'title', title };
    this.titleFrame(title, NO_CONTROLS);
  }

  /** The game being played or closed, if there is one. */
  get game(): Game | null {
    return this.part.kind === 'title' ? null : this.part.game;
  }

  /** The picture of the game being played or closed, if there is one. */
  get picture(): Picture | null {
    return this.part.kind === 'title' ? null : this.part.picture;
  }

  /** The 16K the VIC reads for the frame now in `capture`. */
  get ram(): Uint8Array {
    switch (this.part.kind) {
      case 'title': return this.part.title.ram;
      case 'play': return this.part.flight ? this.part.flight.ram : this.part.picture.ram;
      case 'closing': return this.part.closing.ram;
    }
  }

  /** What the game asked of the sound drivers since the last call (the logic step's requests included). */
  takeSound(): SoundCall[] {
    const calls = this.sound.take();
    if (this.part.kind !== 'title') calls.push(...this.part.game.sound.take());
    return calls;
  }

  /** One frame (a fiftieth of a second) with the controls as they are in it. */
  frame(controls: Controls): void {
    const { part } = this;
    switch (part.kind) {
      case 'title': return this.titleFrame(part.title, controls);
      case 'play': return this.playFrame(part, controls);
      case 'closing': return this.closingFrame(part);
    }
  }

  // ---- the title ---------------------------------------------------------------------------------

  private titleFrame(title: Title, controls: Controls): void {
    this.viewStep = EVERY_FRAME;
    const result = title.frame({ fire: (controls.stick & Stick.Fire) !== 0, f1: controls.f1, f7: controls.f7 });
    this.soundFlag = title.soundFlag;
    if (result === null) {
      this.capture = title.capture;
      return;
    }
    // (the fire that started the game is the title's: the first pass of play does not see it)
    this.startGame(title.kept, title.moleLook);
  }

  /** $5428: a new game in room $48: the music stopped (and the title's tune again unless the effects were chosen), the voices cut, the panel, the room. */
  private startGame(carry: TitleCarry, look: { frame: number; faceLeft: boolean }): void {
    const game = new Game(START_ROOM, { carry: this.carry });
    game.soundFlag = this.soundFlag;
    game.monty.frame = look.frame;
    game.monty.faceLeft = look.faceLeft;
    this.lastEnd = null;
    const picture = this.begin(game, carry, tuneForRoom(START_ROOM, this.soundFlag, game.tune));
    const part: Play = { kind: 'play', game, picture, flight: null };
    this.part = part;
    this.beginning = true;
    // (the interrupt has set the main loop's flag while the room was drawn: its first two passes, the drawing and the
    // logic phase in the order the loop's toggle has them, run one straight after the other in the frame it is done in)
    this.playFrame(part, NO_CONTROLS);
    this.playFrame(part, NO_CONTROLS);
  }

  /** What a game begins with, new or put back: the sound as a new game has it, the front end's rules, the picture. */
  private begin(game: Game, carry: TitleCarry, tune: number | null): Picture {
    this.sound.stop();
    if (game.soundFlag === 0) this.sound.tune(0);
    for (let voice = 0; voice < 3; voice++) this.sound.silence(voice);
    if (tune !== null) {
      game.tune = tune;
      this.sound.tune(tune);
    }
    game.graceActive = () => this.graceActive();
    game.safeRespawn = () => this.safeRespawn();
    game.unlimitedLives = () => this.unlimitedLives();
    return new Picture(game, carry, this.high);
  }

  /**
   * A game put back from a save (a room's start, Monty where he came in), from the title, from play (back to room start) or
   * from the closing screen's title: the room is on the screen at once and play goes on from the next frame.
   * `lost`: after the last life, a new game's lives and score from nothing.
   */
  resume(save: AwmSave, lost: boolean): void {
    const carry = this.part.kind === 'title' ? this.part.title.kept : this.part.kind === 'play' ? this.part.picture.titleCarry : null;
    if (carry === null) throw new Error('a game cannot be put back during the closing screen');
    const game = restore(save, lost);
    this.soundFlag = game.soundFlag;
    this.lastEnd = null;
    // (the tune the save says was playing, if any: the music's choice plays the title's tune on)
    const picture = this.begin(game, carry, game.soundFlag !== 0 && game.tune !== 0 ? game.tune : null);
    picture.restorePanel(save.hands);
    this.part = { kind: 'play', game, picture, flight: null };
    this.capture = picture.capture;
    this.beginning = true;
  }

  /** Travel (the map's): he comes into a room he has stood in, where he came in, as through an exit. Only in play. */
  travel(to: Entry): boolean {
    if (this.part.kind !== 'play') return false;
    // (a flight on is left behind: he comes into the room by the map as he would have by an exit)
    this.part.flight = null;
    this.part.game.abandonFlight();
    this.part.game.placeAt(to);
    return true;
  }

  // ---- play --------------------------------------------------------------------------------------

  /** The main loop's pass: the drawing phase (A) or the logic phase (B), as the loop's toggle has it. */
  private playFrame(part: Play, controls: Controls): void {
    const { game, picture } = part;
    if (part.flight) return this.flightFrame(part, controls);
    this.viewStep = { fresh: this.beginning || !picture.nextIsA, frames: 2 };
    this.beginning = false;
    if (picture.nextIsA) {
      this.capture = picture.frameA(game.lift.tick(game.rng));
      return;
    }
    picture.beginB(game.lift.tick(game.rng));
    game.logic(decodeStick(controls.stick), controls.fly);
    if (game.boarded !== null) {
      // (he has boarded: the flight begins in this frame, as the screen of the play's picture is, its panel kept; the original takes a couple of frames to set it up)
      picture.takeOff();
      part.flight = game.startFlight(picture.ram);
      return this.flightFrame(part, controls);
    }
    this.finishLogic(part);
  }

  /** The end of a logic step: what it changed on the screen, and whether it was the game's end. */
  private finishLogic(part: Play): void {
    const { game, picture } = part;
    this.capture = picture.endB();
    const end = endOf(game);
    if (end === null) return;
    this.lastEnd = end;
    // ($5510 on: the closing routine takes the machine; its first frame is the one the last step ended in)
    const closing = new Closing(picture.screen, picture.spriteColours);
    this.part = { kind: 'closing', game, picture, closing };
    this.capture = closing.next() ?? this.capture;
  }

  // ---- the flight ($758F) ------------------------------------------------------------------------

  /**
   * One frame of the flight (flight.ts), a fiftieth of a second with the stick as stage 6 reads it; the frame after the last one
   * he comes down and the logic step he boarded in goes on, in the room he is in then.
   */
  private flightFrame(part: Play, controls: Controls): void {
    const { game, picture, flight } = part;
    if (!flight) return;
    this.viewStep = EVERY_FRAME;
    if (flight.over) {
      part.flight = null;
      game.land(flight);
      this.viewStep = { fresh: true, frames: 2 };
      return this.finishLogic(part);
    }
    flight.step(game.scramble(decodeStick(controls.stick)));
    this.capture = picture.flightCapture(flight);
  }

  // ---- GAME OVER ---------------------------------------------------------------------------------

  private closingFrame(part: { readonly game: Game; readonly picture: Picture; readonly closing: Closing }): void {
    this.viewStep = EVERY_FRAME;
    const cap = part.closing.next();
    if (cap) {
      this.capture = cap;
      return;
    }
    // ($82FD, then $5422: the title's set-up, with what the main loop left)
    updateHigh(this.high, part.game.score.digits);
    this.carry = part.game.carryOver();
    const title = new Title(this.scroller, this.soundFlag, part.picture.titleCarry, SETUP_FRAMES_AFTER_GAME);
    this.sound.tune(0);
    this.part = { kind: 'title', title };
    this.titleFrame(title, NO_CONTROLS);
  }
}
