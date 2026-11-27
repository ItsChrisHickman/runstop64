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
import { keepPlusBegun, openMap, plusStart, plusWear, readPlusBegun } from './plus';
import { tuneWanted } from './pursuers';
import { CODEC, restore, snapshot, type MontySave } from './save';
import { fineScroll, Title, topScore, type TitleScreen } from './title';
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
  rooms: { id: 'rooms', long: 'RUNSTOP64 ROOMS' },
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

  /**
   * The version of the tune the music plays (null: Hubbard's as it is): a room asks for its region's (`music.tuneFor`, data of
   * the game), and the tune starts again only when the version changes, unless the game has a crossing: from one version to
   * another the song then carries on, and only the version changes at the next phrase. The title has the original, and the game's
   * first room starts the tune from its beginning. A room may ask for another .sid altogether (`file`): it plays from its start
   * while the music is on, the game's effects the kit's over it (with the sound effects chosen, the game's own .sid stays loaded
   * for them, as everywhere).
   */
  let tune: TuneVersion | null = null;
  /**
   * The room's own version (`music.tuneFor`); while a pursuer is after Monty in sight, in a room whose own is a version of the song, the chase's (`music.chase`) plays instead. It cuts in at once, the song
   * from its start, as he steps in (his arrival is the cause: a phrase later he could be gone, the train's roof chase lasting two seconds), and crosses back in step at the next phrase once he is escaped.
   */
  let roomTune: TuneVersion | null = null;
  /**
   * Another .sid is playing: the game's routines are not in it, so its song and stop are the player's, and its effects are the
   * kit's (`music.overOther`: on the overlay SID, mixed over the tune, which plays on untouched), so the flight sounds like the
   * rest of the game.
   */
  const foreign = () => musicOn && tune !== null && 'file' in tune;
  g.sound = {
    sfx(id, onlyWithoutMusic) {
      if (onlyWithoutMusic && musicOn) return;
      if (!foreign()) { music.call(data.music.playSfx, id); return; }
      const kit = data.music.overOther[id];
      if (kit) music.sfx(kit);
    },
    song(n) { if (!foreign()) music.call(data.music.init, n); },
    stop() { if (foreign()) music.stop(); else music.call(data.music.stop); },
  };
  function playVersion(version: TuneVersion | null, cut = false) {
    if (version?.id === tune?.id) return;
    const before = tune, cross = !cut && before !== null && 'make' in before && !foreign();
    tune = version;
    loadTune(cross);
  }
  /** Loads what `tune` asks for: another .sid while the music is on, else the game's (its version, or as it is), crossing from the version playing if `cross`. */
  function loadTune(cross: boolean) {
    const version = tune;
    if (version && 'file' in version && musicOn) {
      music.useFile(version.file.url, version.file.song);
      return;
    }
    const make = version && 'make' in version ? (original: Uint8Array) => version.make(original) : null;
    music.useTune(make, cross && make && musicOn ? data.music.crossing : undefined);
    if (!musicOn) g.sound.stop();
  }
  const sound = { song: (n: number) => g.sound.song(n), stop: () => g.sound.stop(), musicOn: () => musicOn };
  const title: TitleScreen = 'screen' in data.title ? data.title.screen(g, sound) : new Title(g, sound, { kit: data.kit, message: data.title.message });

  options.migrate?.();
  type Mode = 'title' | 'play';
  let mode: Mode = 'title';
  let collisions = 0;
  /** The last game ended in France: CONTINUE? carries on with everything as saved (the lives and score too; a game with NEW GAME+ has it waiting instead). */
  let won = false;
  /** The ending's show, once the session is up (made in the session's build; a game with no ending has none). */
  let rewardShow: RewardShow | null = null;

  // ---- the session (games/shared/port.ts): saves, continue, the pause screen ---------------------
  const port = runPort<MontySave, MontyFound, Game>(host, {
    id: data.id, font: montyFont(data), codec: options.codec ?? CODEC, map: montyMap, describe: (save, found) => describeSave(data, save, found, g.livesShown),
    // (W on the pause screen: the ending, once the game has been won)
    ending: () => !!data.ending && readWon(data.id),
    // (ENTER CONTINUE goes in the middle of rows 17-20, between the high scores and the freedom kit's table, which the
    // title leaves empty since the kit stands under the table; on every page of the title. No restart keys: Monty has none)
    restartKeys: [], strip: { y: 'screen' in data.title ? data.title.stripY : STRIP_Y }, fire: TOUCH.buttons[0]?.label,
    assists: data.assists.map((id) => ASSIST_SPECS[id]),
  }, (self) => {
    const { flow, fe, latch, rooms } = self;
    // the game reads the assists as the switch has them now (all on in both modes, the lives with EASY)
    g.assist = { get lives() { return fe.assist.lives === true; }, get cloud() { return fe.assist.cloud === true; }, get jetpack() { return fe.assist.jetpack === true; }, get c5() { return fe.assist.c5 === true; }, get rooms() { return fe.assist.rooms === true; }, get respawn() { return fe.assist.respawn === true; }, get hints() { return fe.assist.hints === true; } };
    g.graceActive = () => flow.grace.active;
    g.onRestart = () => flow.grace.start();

    // ---- the reward for winning: the montage, the creatures walking through it, THE END (src/ending.ts, shared/ending/show.ts) ----
    // (the show ends on the title as it is, waiting for a key, whether it came from the finale, W or ?ending: CONTINUE? only when a key is
    // pressed there; Chris, 2026-11-24: after the credits the title cut straight to the CONTINUE? screen)
    const reward = data.ending
      ? rewardShow = new RewardShow({
        host,
        spec: montyEnding(data, renderer, g.assist, (id) => g.sfx(id)),
        font: () => flow.getFont(),
        // (the ending's song, the game's tune unless it gives its own, from its start; the title's on the way out; nothing in the
        // sound-effects mode)
        music: {
          start() { music.hold(false); if (musicOn) g.sound.song(data.ending?.song ?? 0); },
          end() { if (musicOn) g.sound.song(0); },
        },
        done() { self.backToTitle(); },
      })
      : null;

    g.onRoomLoaded = (game) => {
      roomTune = data.music.tuneFor?.(game.roomId) ?? null;
      playVersion(roomTune);
      // (NEW GAME+: the region's hat on, as no hat is ever picked up in it)
      if (game.plus) plusWear(game);
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

    // ---- NEW GAME+ (plus.ts): once the game has been won here, a game that has it begins every new game so (Chris, 2026-11-26: "a new game plus
    // that lets you start at the beginning with the entire map open. And all the items still collected") ----
    const plus = data.ending?.newGamePlus;
    const plusDue = () => !!plus && readWon(data.id);
    /** The map NEW GAME+ begins with: the one so far, every other room opened. */
    const openAll = (found: MontyFound) => openMap(data, found);
    /**
     * A won game's save becomes NEW GAME+ waiting at its start (the won game's kept as the previous save, the save manager can swap it back), so the
     * title's ENTER CONTINUE begins NEW GAME+, now and after a reload, in place of carrying on in the won game's last room.
     */
    function plusAfterWin() {
      if (!plus) return;
      fe.newGame(openAll);
      flow.beginWith(plusStart(data, plus.worn));
      keepPlusBegun(data.id);
    }
    // (once only: a game won here before NEW GAME+ was, its save the won game's, has it waiting at launch; once begun, the saves are the player's, and a
    // won game's the save manager brings back stays as it is: turned again, it would push the NEW GAME+ game, kept as the previous save, out)
    if (plusDue() && !readPlusBegun(data.id)) {
      const kept = flow.saved();
      if (kept && kept.plus !== true) plusAfterWin();
      else keepPlusBegun(data.id);
    }

    function startGame() {
      title.leave();
      if (plus && plusDue()) {
        fe.newGame(openAll);
        restore(g, plusStart(data, plus.worn));
      } else {
        g.start();
        fe.newGame();
      }
      won = false;
      g.vic.border = g.vic.background = 0;
      g.hiScore = Math.max(g.hiScore, topScore(title.table)); // (the best score this visit, or the table's top)
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
      watchEnding() { reward?.start(endingStats(g, fe.found)); },
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
        title.leave();
        restore(g, s, Object.keys(fe.found.rooms).map(Number));
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
        if (data.music.chase) { const want = tuneWanted(g, roomTune); playVersion(want.tune, want.cut); }
        if (g.finished) {
          // the last life lost, or the ending played out (France): the title, and CONTINUE? over it (no
          // high-score table or name entry: the original's, gone); the save is kept either way
          won = g.finished === 'won';
          if (won) keepWon(data.id);
          const stats = endingStats(g, fe.found);
          if (won) plusAfterWin();
          toTitle();
          if (won && reward) reward.start(stats);
        }
        return 'played';
      },
      updateView() {
        view.update();
        // (the title's own background lines, but not under the ending's show, which has its own picture)
        const titleUp = mode === 'title' && !reward?.active;
        if (title.backdrop) renderer.backdrop = titleUp ? title.backdrop : renderer.backdrop === title.backdrop ? null : renderer.backdrop;
        if (mode === 'title') fineScroll(renderer.screen, title.phase, g.vic.border, title.fine.top, title.fine.lines);
      },
      renderView: (alpha) => view.render(alpha),
      afterView() { collisions = mode === 'play' ? view.collisions(g.uncounted) : 0; },
      audio: {
        player: music,
        started: async () => { await music.play(1); if (!musicOn) g.sound.stop(); },
        // the original's choice (the C= key on its title): Hubbard's music, or sound effects
        mute: () => {
          musicOn = !musicOn;
          // (in a room with another .sid: it, from its start, or the game's own for the effects)
          if (tune && 'file' in tune) loadTune(false);
          else if (musicOn) g.sound.song(0);
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
