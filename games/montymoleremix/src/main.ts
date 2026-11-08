import { SidPlayer, VicView, type Host } from 'c64kit';
import sidUrl from '../../montyotr/assets/monty_on_the_run.sid?url';
import { LIVES_ASSIST } from '../../shared/lives';
import { montyLettering } from '../../shared/monty/font';
import { runPort } from '../../shared/port';
import { bankImage, MUSIC } from '../../montyotr/src/data';
import { fineScroll, topScore } from '../../montyotr/src/title';
import { OPENING_ROOM, RemixGame, START_LIVES } from './game';
import { coalCount, hintsOf } from './hints';
import { describeSave, noteReached, remixMap, type RemixFound } from './map';
import { CODEC, restore, snapshot, type RemixSave } from './save';
import { remixTitle } from './title';
import { TOUCH } from './touch';

/**
 * Wanted: Monty Mole Remix: the runstop64 front end for the game (`RemixGame` is the game, `remixTitle` its title screen, Monty on the Run's
 * with the remix's logo): the music (Monty on the Run's SID, on the title and in the game), and the shared pause screen with the map and
 * travel, the assists, autosave and continue (games/shared).
 */
export { info } from './info';

/** ENTER CONTINUE's top line on the title: Monty on the Run's place for it, 12 pixels under the high scores' box, 12 over the table. */
export const STRIP_Y = 148;

/** ENHANCED's sparkles: as Moley Christmas's and Wanted's. */
const SPARKLE_SIZE = 2, SPARKLE_GAIN = 2;

export function run(host: Host) {
  const { renderer, input } = host;
  renderer.frame = { x: 32, y: 36 };
  const g = new RemixGame();
  const view = new VicView(renderer, g.vic);
  const music = new SidPlayer(sidUrl);
  let musicOn = true;

  g.sound = {
    sfx(id, onlyWithoutMusic) {
      if (onlyWithoutMusic && musicOn) return;
      music.call(MUSIC.playSfx, id);
    },
    song(n) { music.call(MUSIC.init, n); },
    stop() { music.call(MUSIC.stop); },
  };
  const title = remixTitle(g, { song: (n) => g.sound.song(n), stop: () => g.sound.stop(), musicOn: () => musicOn });

  type Mode = 'title' | 'play';
  let mode: Mode = 'title';
  let collisions = 0;

  // ---- the session (games/shared/port.ts): saves, continue, the pause screen ---------------------
  const port = runPort<RemixSave, RemixFound, RemixGame>(host, {
    id: 'montymoleremix', font: montyLettering(bankImage), codec: CODEC, map: remixMap, describe: describeSave,
    // (ENTER CONTINUE goes in the middle of rows 17-20, between the high scores and the table, as in Monty on the Run's title. No restart keys: Monty has none)
    restartKeys: [], strip: { y: STRIP_Y },
    // ENHANCED is these, together (the pause screen has the one switch): see QOL.md
    assists: [LIVES_ASSIST, { id: 'loops', long: 'NO DEATH LOOPS' }, { id: 'count', long: 'COAL TO GATE' }, { id: 'hints', long: 'SPARKLES' }],
  }, (self) => {
    const { flow, fe, latch, rooms } = self;
    // the game reads ENHANCED's assists as the switch has them now
    g.assist = { get lives() { return fe.assist.lives === true; }, get loops() { return fe.assist.loops === true; } };
    g.graceActive = () => flow.grace.active;

    g.onRoomLoaded = (game) => {
      if (game.roomId === OPENING_ROOM) return; // (the scene is no room: nothing is noted or saved)
      if (noteReached(fe.found, game.roomId, game.entry.x2, game.entry.y)) fe.keepFound();
      // a save on coming into a room
      rooms.enter(snapshot(game));
    };

    function toTitle() {
      mode = 'title';
      latch.hold();
      title.start();
      view.resetSmoothing();
    }

    function startGame() {
      g.start();
      g.vic.border = g.vic.background = 0;
      g.hiScore = Math.max(g.hiScore, topScore(title.table)); // (the best score this visit, or the table's top)
      fe.newGame();
      rooms.clear();
      mode = 'play';
      latch.hold();
      view.resetSmoothing();
      // (the title's tune plays on into the game, as in Monty on the Run)
    }

    /** The keys and pad, with fire held over from a screen that closed left out until it's let go. */
    function stick() {
      return { ...input.held, fire: latch.filter(input.held.fire) };
    }

    toTitle();
    return {
      state: () => g,
      phase: () => mode,
      /** In a sequence (a death, a room's change) no. */
      canPause: () => !g.freeze && !g.script,
      travel(to) {
        if (!remixMap.go(to, g, fe.found)) return false;
        view.resetSmoothing();
        return true;
      },
      /** Carry on from a save (a room's start). After CONTINUE? from the last life lost: a new game's lives, the coal and the score as they were. */
      resume(s, from) {
        restore(g, s);
        if (from === 'continue') g.lives = START_LIVES;
        g.vic.border = g.vic.background = 0;
        g.hiScore = Math.max(g.hiScore, topScore(title.table), g.score);
        g.addScore(0);
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
          // the last life lost: the title, and CONTINUE? over it; the save is kept
          toTitle();
        }
        return 'played';
      },
      updateView() {
        // ENHANCED's help (hints.ts): in play, not on a screen of ours
        const shown = fe.enhanced && mode === 'play' && !g.freeze && !fe.holding;
        if (mode === 'play') g.note(shown && fe.assist.count === true ? coalCount(g) : null);
        renderer.sparkles.set((shown && fe.assist.hints === true ? hintsOf(g) : []).map((h) => ({ x: h.x, y: h.y, size: SPARKLE_SIZE, gain: SPARKLE_GAIN })));
        view.update();
        if (mode === 'title') fineScroll(renderer.screen, title.phase, g.vic.border);
      },
      renderView: (alpha) => view.render(alpha),
      afterView() { collisions = mode === 'play' ? view.collisions() : 0; },
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
    /** For tests: the moment's grace. */
    get grace() { return port.flow.grace; },
    get state() { return { mode, paused: port.fe.paused, going: port.fe.going, found: port.fe.found, grace: port.flow.grace.left, ...port.flow.state }; },
    tick: port.tick,
    render: port.render,
    menu: port.menu,
    paused: port.paused,
  };
}
