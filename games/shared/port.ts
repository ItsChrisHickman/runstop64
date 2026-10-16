import type { BitmapFont, C64Machine, Host } from 'c64kit';
import { AudioKeys, type AudioKeysOptions, type Unlockable } from './audio';
import { ContinueFlow, type GameStatus, type SaveCodec, type TitleStrip } from './continue';
import { FireLatch } from './fire-latch';
import { FrontEnd, type AssistSpec, type PauseRequest } from './frontend';
import type { PauseMap } from './native/pause';
import { RoomSaves } from './room-saves';

/**
 * The session every native port runs, written once: a game gives a `PortConfig` (what the front end
 * needs to know: its id, saves, map, assists) and a `PortAdapter` (what its own code does at each
 * point), and `runPort` owns the rest: ContinueFlow, FrontEnd, the spent press (FireLatch), the audio
 * keys, the room-save bookkeeping, the tick order and the render tail.
 *
 * The tick order, the same for every game:
 *   audio keys; in play: the pause key, a paused tick (and back), travel picked on the map
 *   (`fe.going`); the flow's `before` (CONTINUE? / launch: resume and end the tick); the game's
 *   frame; the grace counted; the flow's `after` (autosave); the view; the flow's panels.
 *
 * The render tail: the sound held and the sprites hidden while a screen of ours covers the game.
 */

/** Where the game is, as the front end needs to know it. */
export type PortPhase = 'title' | 'play' | 'other';

/** What a game says about itself before the session exists (static: nothing here needs the flow or the front end). */
export interface PortConfig<S, F, T> {
  /** Storage key prefix. */
  id: string;
  /** The font of the flow's panels and the pause screen. */
  font: 'game' | 'kit' | BitmapFont;
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
  /** The game's own say on opening the pause screen, once it is in play and no screen of ours is up (default: yes). */
  canPause?(): boolean;
  /** The game is asking for letters: the pause key and M and V are letters then. */
  typing?(): boolean;
  /** Carry out a place picked on the map; whether it was taken (the grace starts if so). */
  travel(id: string): boolean;
  /** Carry on from a save (a room's start); `afterGameOver`: CONTINUE? after the last life, a new game's lives. */
  resume(s: S, afterGameOver: boolean): void;
  /** The game's part of going back to the title (the session's part is done by `Port.backToTitle`). */
  toTitle(): void;
  /** One frame of the game (`holding`: a screen of the flow's is up); whether it was a frame of play, for the grace. */
  frame(holding: boolean): boolean;
  /** The game's picture into the renderer (also drawn behind the pause screen). */
  updateView(): void;
  renderView(alpha: number): void;
  /** After the picture is up to date, before the flow draws its panels (not on the pause screen). */
  afterView?(): void;
  /** Before the picture is rendered (`covered`: a screen of ours is over the game). */
  prepareRender?(covered: boolean): void;
  audio: Omit<AudioKeysOptions, 'canvas' | 'input' | 'renderer' | 'player'> & { player: PortSound };
  /** A game on a C64 model: the machine (for the panels' font from its title). */
  machine?(): C64Machine | undefined;
  /** False at an instant inside a room change, where no save can be taken (default true). */
  roomOpen?(): boolean;
  /** A game that takes its save when the flow asks (not at the start of each room, which `enter(save)` kept). */
  takeSave?(): S | null;
}

export class Port<S, F, T> {
  readonly flow: ContinueFlow<S, F>;
  readonly fe: FrontEnd<T, F>;
  readonly latch: FireLatch;
  readonly rooms = new RoomSaves<S>();
  private readonly adapter: PortAdapter<S, T>;
  private readonly audio: AudioKeys;

  /** `build` makes the adapter, with the session at hand (the flow's grace, the front end's assists). */
  constructor(private readonly host: Host, config: PortConfig<S, F, T>, build: (port: Port<S, F, T>) => PortAdapter<S, T>) {
    const { renderer, input } = host;
    this.flow = new ContinueFlow<S, F>({
      id: config.id, renderer, input, font: config.font, codec: config.codec, found: config.map.found,
      restartKeys: config.restartKeys, strip: config.strip, describe: config.describe,
    });
    this.latch = new FireLatch(config.launchHeld);
    this.fe = new FrontEnd<T, F>({
      id: config.id, input, renderer, map: config.map, assists: config.assists,
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
    const onTitle = a.phase() === 'title';
    const inPlay = a.phase() === 'play' && !this.fe.holding;
    const open = inPlay && (a.roomOpen?.() ?? true);
    const machine = a.machine?.();
    const status = a.takeSave
      ? { onTitle, room: open ? this.rooms.count : null, save: a.takeSave }
      : this.rooms.status(onTitle, inPlay);
    return machine ? { ...status, machine } : status;
  }

  private canPause(typing: boolean) {
    const a = this.adapter;
    return a.phase() === 'play' && !this.flow.holding && !typing && (a.canPause?.() ?? true);
  }

  /** Carry on from a save: the game's part, then a press spent and the pause screen closed. */
  private resume(s: S, afterGameOver: boolean) {
    this.adapter.resume(s, afterGameOver);
    this.latch.hold();
    this.fe.wentBack();
  }

  private asked(r: PauseRequest) {
    if (r === 'roomStart') this.rooms.backToRoomStart(this.flow, this.adapter.phase() === 'play', (s) => this.resume(s, false));
    else if (r === 'title') this.backToTitle();
  }

  readonly tick = () => {
    const { adapter: a, fe, flow, latch, rooms } = this;
    const typing = a.typing?.() ?? false;
    this.audio.tick(typing);

    if (a.phase() === 'play') {
      const state = a.state();
      fe.pauseKey(state, this.canPause(typing));
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
      this.resume(answered, flow.lastAnswer === 'continue');
      flow.resumed(answered, rooms.count);
      return;
    }

    if (a.frame(flow.holding)) flow.grace.tick();
    if (flow.after(this.status())) latch.hold();
    a.updateView();
    a.afterView?.();
    flow.draw();
  };

  readonly render = (alpha: number) => {
    const { adapter: a, fe, flow, host } = this;
    const covered = flow.covering || fe.holding;
    a.prepareRender?.(covered);
    a.audio.player.hold(covered);
    a.renderView(alpha);
    if (covered) { host.renderer.hideSprites(); host.renderer.render(); }
  };

  /** The gear (or the touch PAUSE button): the pause screen, or back from it. */
  readonly menu = () => {
    if (this.adapter.phase() === 'play') this.fe.menu(this.adapter.state(), this.canPause(false));
  };
}

/** Run a native port's session (see `Port`). */
export function runPort<S, F, T>(host: Host, config: PortConfig<S, F, T>, build: (port: Port<S, F, T>) => PortAdapter<S, T>): Port<S, F, T> {
  return new Port(host, config, build);
}
