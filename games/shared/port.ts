import type { BitmapFont, Host } from 'c64kit';
import { AudioKeys, type AudioKeysOptions, type Unlockable } from './audio';
import { ContinueFlow, type GameStatus, type SaveCodec, type TitleStrip } from './continue';
import { FireLatch } from './fire-latch';
import { FrontEnd, type AssistSpec, type PauseRequest } from './frontend';
import type { PauseMap } from './native/pause';
import { RoomSaves } from './room-saves';

/**
 * The session every port runs, written once: a game gives a `PortSetup` (what the front end needs
 * to know: its id, saves, map, assists) and a `PortAdapter` (what its own code does at each
 * point), and `runPort` owns the rest: ContinueFlow, FrontEnd, the spent press (FireLatch), the audio
 * keys, the room-save bookkeeping, the tick order and the render tail. The native rebuilds (Monty,
 * AWM, Starquake, Antiriad) give an adapter by hand; `runNative` builds one over a translated machine.
 *
 * The tick order, the same for every game:
 *   audio keys; in play: the pause key, a paused tick (and back), travel picked on the map
 *   (`fe.going`); the flow's `before` (CONTINUE? / launch: resume and end the tick); the game's
 *   frame; the grace counted (a frame that ends the tick skips the rest); the game's own bookkeeping after it (`afterFrame`); the flow's
 *   `after` (autosave; a game that saves at its own point inside the frame says so: `savesInFrame`);
 *   the view; the game's overlay on it (`afterView`); the flow's panels.
 *
 * The render tail: the sound held and the sprites hidden while a screen of ours covers the game.
 */

/** Where the game is, as the front end needs to know it. */
export type PortPhase = 'title' | 'play' | 'other';

/**
 * What a frame of the game was: a frame of `played` (the grace counts it), `idle` (the title, a screen
 * of the game's, a screen of ours holding it), or one that `ended` the tick (the game was replaced
 * under the view: nothing more is drawn, as after a resume).
 */
export type FrameResult = 'played' | 'idle' | 'ended';

/** How a game is carried on from a save: ENTER CONTINUE (or a launch), CONTINUE? after the game is over, or B on the pause screen. */
export type ResumeFrom = 'title' | 'continue' | 'roomStart';

/** What a game says about itself before the session exists (static: nothing here needs the flow or the front end). */
export interface PortSetup<S, F, T> {
  /** Storage key prefix. */
  id: string;
  /** The font of the flow's panels and the pause screen. */
  font?: 'game' | 'kit' | BitmapFont;
  /** How saves become bytes. */
  codec: SaveCodec<S>;
  map: PauseMap<T, F>;
  assists: AssistSpec[];
  /** Where the title's ENTER CONTINUE goes. */
  strip?: TitleStrip;
  /** Keys that restart a game on purpose (default F1 and R; none where the game types or uses them). */
  restartKeys?: string[];
  describe?(save: S, found: F): string[];
  /** A press is spent from the start: a launch straight into play must not also fire. */
  launchHeld?: boolean;
}

/** The sound: what the audio keys and the render tail need of the game's player. */
export interface PortSound extends Unlockable {
  /** The sound waits while a screen of ours covers the game. */
  hold(on: boolean): void;
}

/** What a game does at each point of the session. */
export interface PortAdapter<S, T> {
  /** What the pause screen's map reads (the game; read each time: it may be replaced). */
  state(): T;
  phase(): PortPhase;
  /** The game is not there yet (still loading): the tick does nothing but the audio keys. */
  ready?(): boolean;
  /**
   * The game's own say on opening the pause screen, once it is in play and no screen of ours is up
   * (default: yes). `byKey`: the pause key, which is a letter on a screen asking for letters; the
   * gear (or the touch PAUSE button) is not.
   */
  canPause?(byKey: boolean): boolean;
  /** The game is asking for letters: M and V are letters then. */
  typing?(): boolean;
  /** Carry out a place picked on the map; whether it was taken (the grace starts if so). */
  travel(id: string): boolean;
  /** Carry on from a save (a room's start). */
  resume(s: S, from: ResumeFrom): void;
  /** The room number a resume from `s` is at, for the flow (default: the room saves' count, as it stands after the resume). */
  roomOf?(s: S): number;
  /** The game's part of going back to the title (the session's part is done by `Port.backToTitle`). */
  toTitle(): void;
  /** One frame of the game (`holding`: a screen of the flow's is up). */
  frame(holding: boolean): FrameResult;
  /** After the grace is counted: the game's own bookkeeping of the frame. */
  afterFrame?(): void;
  /** The flow's view of the game (default: from the room saves). */
  status?(): GameStatus<S>;
  /** The game takes its autosave at its own point inside the frame (`Port.autosave`), not after it. */
  savesInFrame?: boolean;
  /** The game's picture into the renderer (also drawn behind the pause screen). */
  updateView(): void;
  /** After the picture is up to date, before the flow draws its panels (not on the pause screen). */
  afterView?(): void;
  renderView(alpha: number): void;
  /** Before the picture is rendered (`covered`: a screen of ours is over the game). */
  prepareRender?(covered: boolean): void;
  audio: Omit<AudioKeysOptions, 'canvas' | 'input' | 'renderer' | 'player'> & { player: PortSound };
}

export class Port<S, F, T> {
  readonly flow: ContinueFlow<S, F>;
  readonly fe: FrontEnd<T, F>;
  readonly latch: FireLatch;
  readonly rooms = new RoomSaves<S>();
  private readonly adapter: PortAdapter<S, T>;
  private readonly audio: AudioKeys;

  /** `build` makes the adapter, with the session at hand (the flow's grace, the front end's assists). */
  constructor(private readonly host: Host, setup: PortSetup<S, F, T>, build: (port: Port<S, F, T>) => PortAdapter<S, T>) {
    const { renderer, input } = host;
    this.flow = new ContinueFlow<S, F>({
      id: setup.id, renderer, input, font: setup.font, codec: setup.codec, found: setup.map.found,
      restartKeys: setup.restartKeys, strip: setup.strip, describe: setup.describe,
    });
    this.latch = new FireLatch(setup.launchHeld);
    this.fe = new FrontEnd<T, F>({
      id: setup.id, input, renderer, map: setup.map, assists: setup.assists,
      font: () => this.flow.getFont(), saves: this.flow, onClose: () => this.latch.hold(),
    });
    this.adapter = build(this);
    this.audio = new AudioKeys({ ...this.adapter.audio, canvas: host.canvas, input, renderer });
  }

  /** Back to the title on the player's say-so (T on the pause screen, or the game's own end): the save stays. */
  backToTitle() {
    this.fe.wentBack();
    this.flow.toTitle();
    this.latch.hold();
    this.adapter.toTitle();
  }

  /** The flow's view of the game. */
  private status(): GameStatus<S> {
    const a = this.adapter;
    return a.status?.() ?? this.rooms.status(a.phase() === 'title', a.phase() === 'play' && !this.fe.holding);
  }

  /** The autosave, on coming into a new room (the tick does it after the frame; a game with `savesInFrame` at its own point). Returns true when play has just begun. */
  autosave(status: GameStatus<S> = this.status()) {
    const began = this.flow.after(status);
    if (began) this.latch.hold(); // (the press that began play isn't a jump)
    return began;
  }

  private canPause(byKey: boolean) {
    const a = this.adapter;
    return a.phase() === 'play' && !this.flow.holding && (a.canPause?.(byKey) ?? true);
  }

  /** Carry on from a save: the game's part, then a press spent and the pause screen closed. */
  private resume(s: S, from: ResumeFrom) {
    this.adapter.resume(s, from);
    this.latch.hold();
    this.fe.wentBack();
  }

  /** The room number the flow is told a resume is at. */
  private roomAfterResume(s: S) { return this.adapter.roomOf?.(s) ?? this.rooms.count; }

  /** Back to how things were on coming into this room (out of a trap the game has no way out of). */
  private backToRoomStart() {
    const s = this.flow.saved();
    if (!s || this.adapter.phase() !== 'play') return;
    this.resume(s, 'roomStart');
    this.flow.resumed(s, this.roomAfterResume(s));
  }

  private asked(r: PauseRequest) {
    if (r === 'roomStart') this.backToRoomStart();
    else if (r === 'title') this.backToTitle();
  }

  readonly tick = () => {
    const { adapter: a, fe, flow } = this;
    this.audio.tick(a.typing?.() ?? false);
    if (!(a.ready?.() ?? true)) return;

    if (a.phase() === 'play') {
      const state = a.state();
      fe.pauseKey(state, this.canPause(true));
      if (fe.paused) {
        this.asked(fe.pausedTick(state, () => a.updateView()));
        return;
      }
      // travel: picked on the map, carried out between frames
      if (fe.going !== null) {
        const to = fe.going;
        fe.going = null;
        if (a.travel(to)) flow.grace.start();
      }
    }
    const answered = flow.before(this.status());
    if (answered) {
      this.resume(answered, flow.lastAnswer ?? 'title');
      flow.resumed(answered, this.roomAfterResume(answered));
      return;
    }

    const result = a.frame(flow.holding);
    if (result === 'ended') return;
    if (result === 'played') flow.grace.tick();
    a.afterFrame?.();
    if (!a.savesInFrame) this.autosave();
    a.updateView();
    a.afterView?.();
    flow.draw();
  };

  readonly render = (alpha: number) => {
    const { adapter: a, fe, flow, host } = this;
    if (!(a.ready?.() ?? true)) return;
    const covered = flow.covering || fe.holding;
    a.prepareRender?.(covered);
    a.audio.player.hold(covered);
    a.renderView(alpha);
    if (covered) { host.renderer.hideSprites(); host.renderer.render(); }
  };

  /** The gear (or the touch PAUSE button): the pause screen, or back from it. */
  readonly menu = () => {
    if ((this.adapter.ready?.() ?? true) && this.adapter.phase() === 'play') this.fe.menu(this.adapter.state(), this.canPause(false));
  };
}

/** Run a port's session (see `Port`). */
export function runPort<S, F, T>(host: Host, setup: PortSetup<S, F, T>, build: (port: Port<S, F, T>) => PortAdapter<S, T>): Port<S, F, T> {
  return new Port(host, setup, build);
}
