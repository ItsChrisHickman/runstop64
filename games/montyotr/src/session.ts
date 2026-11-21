import { SidPlayer, VicView, type Host } from 'c64kit';
import { RewardShow } from '../../shared/ending/show';
import { keepWon, readWon, wantsEnding } from '../../shared/ending/credits';
import type { SaveCodec } from '../../shared/continue';
import type { AssistSpec } from '../../shared/frontend';
import { LIVES_ASSIST } from '../../shared/lives';
import { montyLettering } from '../../shared/monty/font';
import { runPort } from '../../shared/port';
import { endingStats, montyEnding } from './ending';
import { Game } from './game';
import { describeSave, montyMap, noTravel, noteRoom, type MontyFound } from './map';
import type { AssistId, MontyData, TuneVersion } from './montydata';
import { CODEC, restore, snapshot, type MontySave } from './save';
import { fineScroll, Title, topScore } from './title';
import { TOUCH } from './touch';

/**
 * The runstop64 front end for a Monty game on this engine (Game is the game, Title its title screen): the music, and the shared
 * pause screen with the map and travel, the assist, autosave and continue (games/shared). Which game it is comes from the data it
 * is given: Monty on the Run's (main.ts) or Do Svidaniya Monty's.
 */

/** ENTER CONTINUE's top line on the title: 12 pixels under the high scores' box (row 16), 12 over the table (row 21). */
export const STRIP_Y = 148;

/** What each assist is called on the pause screen (a game's `assists` says which it has). */
const ASSIST_SPECS: Record<AssistId, AssistSpec> = {
  lives: LIVES_ASSIST,
  cloud: { id: 'cloud', long: 'RIDE THE RISING CLOUD' },
  jetpack: { id: 'jetpack', long: 'JETPACK NOT HIT' },
  c5: { id: 'c5', long: 'C5 HOP AND RETRY' },
  rooms: { id: 'rooms', long: 'RUNSTOP64 ROOMS', role: 'enhanced' },
  respawn: { id: 'respawn', long: 'SAFE RESPAWN' },
  hints: { id: 'hints', long: 'ITEM HINTS' },
};

/** What a game adds to the session: work to do before the front end reads the saves (Monty on the Run moves its saves from before the shared front end). */
export interface SessionOptions { migrate?: () => void; /** The game's own save codec (default: Monty on the Run's). */ codec?: SaveCodec<MontySave> }

export function runMonty(host: Host, data: MontyData, options: SessionOptions = {}) {
  const { renderer, input } = host;
  renderer.frame = { x: 32, y: 36 };
  const g = new Game(data);
  const view = new VicView(renderer, g.vic);
  const music = new SidPlayer(data.music.sidUrl);
  let musicOn = true;

  g.sound = {
    sfx(id, onlyWithoutMusic) {
      if (onlyWithoutMusic && musicOn) return;
      music.call(data.music.playSfx, id);
    },
    song(n) { music.call(data.music.init, n); },
    stop() { music.call(data.music.stop); },
  };
  /**
   * The version of the tune the music plays (null: Hubbard's as it is): a room asks for its region's (`music.tuneFor`, data of
   * the game), and the tune starts again only when the version changes. The title has the original.
   */
  let tune: TuneVersion | null = null;
  function playVersion(version: TuneVersion | null) {
    if (version?.id === tune?.id) return;
    tune = version;
    music.useTune(version ? (original) => version.make(original) : null);
    if (!musicOn) g.sound.stop();
  }
  const title = new Title(g, { song: (n) => g.sound.song(n), stop: () => g.sound.stop(), musicOn: () => musicOn }, { kit: data.kit, message: data.title.message });

  options.migrate?.();
  type Mode = 'title' | 'play';
  let mode: Mode = 'title';
  let collisions = 0;
  /** The last game ended in France: CONTINUE? carries on with everything as saved (the lives and score too). */
  let won = false;
  /** The ending's show, once the session is up (made in the session's build; a game with no ending has none). */
  let rewardShow: RewardShow | null = null;
  /** Whether ENHANCED is on (the front end's switch, once the session is up). */
  let enhanced = () => false;

  // ---- the session (games/shared/port.ts): saves, continue, the pause screen ---------------------
  const port = runPort<MontySave, MontyFound, Game>(host, {
    id: data.id, font: montyFont(data), codec: options.codec ?? CODEC, map: montyMap, describe: (save, found) => describeSave(data, save, found),
    // (W on the pause screen: the ending, once the game has been won, in ENHANCED)
    ending: () => !!data.ending && enhanced() && readWon(data.id),
    // (ENTER CONTINUE goes in the middle of rows 17-20, between the high scores and the freedom kit's table, which the
    // title leaves empty since the kit stands under the table; on every page of the title. No restart keys: Monty has none)
    restartKeys: [], strip: { y: STRIP_Y },
    assists: data.assists.map((id) => ASSIST_SPECS[id]),
  }, (self) => {
    const { flow, fe, latch, rooms } = self;
    enhanced = () => fe.enhanced;
    // the game reads ENHANCED's assists as the switch has them now
    g.assist = { get lives() { return fe.assist.lives === true; }, get cloud() { return fe.assist.cloud === true; }, get jetpack() { return fe.assist.jetpack === true; }, get c5() { return fe.assist.c5 === true; }, get rooms() { return fe.assist.rooms === true; }, get respawn() { return fe.assist.respawn === true; }, get hints() { return fe.assist.hints === true; } };
    g.graceActive = () => flow.grace.active;

    // ---- the reward for winning (ENHANCED): the montage, the creatures walking through it, THE END (src/ending.ts, shared/ending/show.ts) ----
    /** The show is on from the finale (the title is up under it, CONTINUE? comes after), not from W or ?ending (which end on the title). */
    let afterWin = false;
    const reward = data.ending
      ? rewardShow = new RewardShow({
        host,
        spec: montyEnding(data, renderer, g.assist),
        font: () => flow.getFont(),
        // (the game's tune, from its start, and again as the title's on the way out; nothing in the sound-effects mode)
        music: {
          start() { music.hold(false); if (musicOn) g.sound.song(0); },
          end() { if (musicOn) g.sound.song(0); },
        },
        done() {
          if (afterWin) { afterWin = false; latch.hold(); } else self.backToTitle();
        },
      })
      : null;

    g.onRoomLoaded = (game) => {
      playVersion(data.music.tuneFor?.(game.roomId) ?? null);
      if (noteRoom(game, fe.found)) fe.keepFound();
      // a save on coming into a room (the C5 street too, with the C5 as it came in; not the ending)
      if (!noTravel(data, game.roomId) && !game.completionActive) {
        rooms.enter(snapshot(game));
      }
    };

    function toTitle() {
      mode = 'title';
      playVersion(null);
      latch.hold();
      title.start();
      view.resetSmoothing();
    }

    function startGame() {
      g.start();
      won = false;
      g.vic.border = g.vic.background = 0;
      g.hiScore = Math.max(g.hiScore, topScore(title.table)); // (the best score this visit, or the table's top)
      fe.newGame();
      rooms.clear();
      mode = 'play';
      latch.hold();
      view.resetSmoothing();
      // (the title's tune plays on into the game, as in the original)
    }

    /**
     * Away from the ending (travel, or back to the room's start, before he's aboard): the game's tune
     * again in place of the ending's (Music.Init 0, which the title starts and play keeps), or nothing
     * if the music was switched off for the sound effects.
     */
    function playOn() {
      if (musicOn) g.sound.song(0);
      else g.sound.stop();
    }

    /** The keys and pad, with fire held over from a screen that closed left out until it's let go. */
    function stick() {
      return { ...input.held, fire: latch.filter(input.held.fire) };
    }

    toTitle();
    // ?ending on the page: the ending at once, for review
    if (reward && wantsEnding()) reward.start(endingStats(g, fe.found));
    return {
      ...(reward ? { takeover: reward } : {}),
      watchEnding() { afterWin = false; reward?.start(endingStats(g, fe.found)); },
      state: () => g,
      phase: () => mode,
      /** In a sequence (a death, a teleport, the C5's) no; but in the ending, until Monty walks aboard (travel can take him back to any room visited). */
      canPause: () => (!g.freeze && !g.script) || g.endingLeavable,
      travel(to) {
        // (from the ending, before he's aboard: what it set undone first, as if he'd never begun it)
        const ending = g.endingLeavable;
        if (!montyMap.go(to, g, fe.found)) return false;
        if (ending) { g.leaveEnding(); playOn(); }
        view.resetSmoothing();
        return true;
      },
      /**
       * Carry on from a save (a room's start). After CONTINUE? from the last life lost, as before: five
       * lives, the score from nothing; after the ending (France), everything as saved: the treasure's
       * room as he came into it, the treasure still there to play the ending again.
       */
      resume(s, from) {
        const ending = !!g.completionActive;
        restore(g, s);
        if (ending) playOn();
        if (from === 'continue' && !won) { g.lives = 5; g.score = 0; }
        won = false;
        g.vic.border = g.vic.background = 0;
        g.hiScore = Math.max(g.hiScore, topScore(title.table), g.score);
        g.drawHudData();
        mode = 'play';
        view.resetSmoothing();
      },
      toTitle,
      frame(holding) {
        if (mode === 'title') {
          const j = stick();
          if (holding) j.fire = false;
          if (title.frame(j) === 'start') startGame();
          return 'idle';
        }
        if (holding) return 'idle';
        g.input = stick();
        g.inputFire = g.input.fire;
        g.frame(collisions);
        if (g.finished) {
          // the last life lost, or the ending played out (France): the title, and CONTINUE? over it (no
          // high-score table or name entry: the original's, gone); the save is kept either way
          won = g.finished === 'won';
          if (won) keepWon(data.id);
          const stats = endingStats(g, fe.found);
          toTitle();
          if (won && fe.enhanced && reward) { afterWin = true; reward.start(stats); }
        }
        return 'played';
      },
      updateView() {
        view.update();
        if (mode === 'title') fineScroll(renderer.screen, title.phase, g.vic.border);
      },
      renderView: (alpha) => view.render(alpha),
      afterView() { collisions = mode === 'play' ? view.collisions(g.uncounted) : 0; },
      audio: {
        player: music,
        started: async () => { await music.play(1); if (!musicOn) g.sound.stop(); },
        // the original's choice (the C= key on its title): Hubbard's music, or sound effects
        mute: () => {
          musicOn = !musicOn;
          if (musicOn) g.sound.song(0);
          else g.sound.stop();
        },
      },
    };
  });

  return {
    touch: TOUCH,
    /** For tests: the game, the title and the front end's state. */
    get game() { return g; },
    get title() { return title; },
    get frontEnd() { return port.fe; },
    /** For tests: the ending's show (src/ending.ts). */
    get ending() { return rewardShow; },
    /** For tests: the moment's grace. */
    get grace() { return port.flow.grace; },
    get state() { return { mode, paused: port.fe.paused, going: port.fe.going, found: port.fe.found, grace: port.flow.grace.left, ...port.flow.state }; },
    tick: port.tick,
    render: port.render,
    menu: port.menu,
    paused: port.paused,
  };
}

/** The game's own lettering (screen codes $40-$7F of its charset), topped up with the kit's. */
export function montyFont(data: MontyData) {
  return montyLettering(data.bankImage);
}
