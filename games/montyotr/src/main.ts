import { BitmapFont, KIT_GLYPHS, SidPlayer, VicView, type Host } from 'c64kit';
import sidUrl from '../assets/monty_on_the_run.sid?url';
import { AudioKeys } from '../../shared/audio';
import { ContinueFlow } from '../../shared/continue';
import { FireLatch } from '../../shared/fire-latch';
import { FrontEnd, type PauseRequest } from '../../shared/frontend';
import { RoomSaves } from '../../shared/room-saves';
import type { TouchLayout } from '../../shared/touch';
import { bankImage, MUSIC } from './data';
import { Game } from './game';
import { describeSave, montyMap, NO_TRAVEL, noteRoom } from './map';
import { CODEC, migrateOldSave, restore, snapshot, type MontySave } from './save';
import { fineScroll, Title, topScore } from './title';

/** Touch: Monty runs and climbs (four directions) and jumps. */
const TOUCH: TouchLayout = { stick: '4', buttons: [{ label: 'JUMP', key: 'Space', size: 'big' }] };

/**
 * Monty on the Run: the runstop64 front end for the ported game (Game is the
 * game, Title its title screen): the music, and the shared pause screen with
 * the map and travel, the assist, autosave and continue (games/shared).
 */
export const info = {
  title: 'Monty on the Run',
  progress: 'Your progress is saved each time Monty enters a room: coming back to the game carries on where you were, and the save from before your last new game is kept too (the saved games: F1 on the directory).',
  html: `
    <p><a href="https://en.wikipedia.org/wiki/Monty_on_the_Run">Monty on the Run</a> (1985) is the third game in the
    <a href="https://en.wikipedia.org/wiki/Monty_Mole">Monty Mole</a> series. All credit for the game belongs to its creators:</p>
    <ul>
      <li>Original game: Peter Harrap</li>
      <li>Commodore 64 version: Micro Projects Ltd &mdash; Anthony Clarke and Jason Perkins</li>
      <li>Graphics: Mark Rodgers</li>
      <li>Music: <a href="https://en.wikipedia.org/wiki/Rob_Hubbard">Rob Hubbard</a>, played from his original SID file by his own player code</li>
      <li>Published by <a href="https://en.wikipedia.org/wiki/Gremlin_Graphics">Gremlin Graphics</a>, 1985</li>
    </ul>
    <p>Controls: arrows or WASD move &middot; Space jumps (also Z, X, gamepad A) and starts a game from the title &middot;
    P or Esc pauses: your kit, items found, and a map; pick a room you've visited and press Enter to travel there &middot;
    M music or sound effects &middot; V authentic pixel steps &middot; gamepad Start pauses. On the title, up rolls the
    high scores faster.</p>
    <p>Changes from the original (all in the spirit of the 1985 game; the
    <a href="https://github.com/ItsChrisHickman/runstop64/blob/main/games/montyotr/QOL.md">full log</a>):
    no freedom kit selection (you carry the right five) &middot; pause screen with map, items and travel &middot;
    Continue after the last life, and after the ending (everything collected kept, to find the rest) &middot; autosave on every room (coming back carries on where you were; T on the pause screen goes to the title) &middot; smooth movement at any refresh rate &middot;
    ENHANCED (switch to ORIGINAL on the title or the pause screen): ride the rising cloud, in the jetpack
    rooms only Monty himself is hit, not his jetpack, and on the C5 street a crash starts the room again and
    holding fire keeps a hop up longer; a death never starts Monty again into the same death; and walking right from the
    start leads into runstop64's own rooms (a dev room, a playground, warp gates to the jetpack and the C5).</p>
    <p>Source: <a href="https://github.com/ItsChrisHickman/runstop64">this remake</a> &middot;
    <a href="https://github.com/Dave-Agent/monty-on-the-run">Dave-Agent's reconstruction</a>, which made reading the
    original possible &middot; music from the <a href="https://www.hvsc.c64.org/">High Voltage SID Collection</a></p>
  `,
};

/** ENTER CONTINUE's top line on the title: 12 pixels under the high scores' box (row 16), 12 over the table (row 21). */
export const STRIP_Y = 148;

export function run(host: Host) {
  const { renderer, input, canvas } = host;
  renderer.frame = { x: 32, y: 36 };
  const g = new Game();
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
  const title = new Title(g, { song: (n) => g.sound.song(n), stop: () => g.sound.stop(), musicOn: () => musicOn });

  // ---- saves, continue, the pause screen (games/shared) ---------------------------------------
  const font = montyFont();
  migrateOldSave();
  // (ENTER CONTINUE goes in the middle of rows 17-20, between the high scores and the freedom kit's table, which the
  // title leaves empty since the kit stands under the table; on every page of the title. No restart keys: Monty has none)
  const flow = new ContinueFlow<MontySave>({ id: 'montyotr', renderer, input, font, codec: CODEC, restartKeys: [], strip: { y: STRIP_Y }, describe: describeSave });
  const latch = new FireLatch();
  const fe = new FrontEnd<Game>({
    id: 'montyotr', input, renderer, map: montyMap,
    assists: [
      { id: 'cloud', long: 'RIDE THE RISING CLOUD' },
      { id: 'jetpack', long: 'JETPACK NOT HIT' },
      { id: 'c5', long: 'C5 HOP AND RETRY' },
      { id: 'rooms', long: 'RUNSTOP64 ROOMS', role: 'enhanced' },
      { id: 'respawn', long: 'SAFE RESPAWN' },
    ],
    font: () => font,
    panel: (lines) => flow.panel(lines),
    canGoBack: () => mode === 'play' && flow.state.hasSave,
    saves: flow,
    onClose: () => latch.hold(),
  });
  // the game reads ENHANCED's assists as the switch has them now
  g.assist = { get cloud() { return fe.assist.cloud === true; }, get jetpack() { return fe.assist.jetpack === true; }, get c5() { return fe.assist.c5 === true; }, get rooms() { return fe.assist.rooms === true; }, get respawn() { return fe.assist.respawn === true; } };

  g.graceActive = () => flow.grace.active;

  type Mode = 'title' | 'play';
  let mode: Mode = 'title';
  /** Each room's start, as a save, and a number that's new for each room entered. */
  const rooms = new RoomSaves<MontySave>();
  let collisions = 0;
  /** The last game ended in France: CONTINUE? carries on with everything as saved (the lives and score too). */
  let won = false;

  g.onRoomLoaded = (game) => {
    if (noteRoom(game, fe.found)) fe.keepFound();
    // a save on coming into a room (the C5 street too, with the C5 as it came in; not the ending)
    if (!NO_TRAVEL(game.roomId) && !game.completionActive) {
      rooms.enter(snapshot(game));
    }
  };

  function toTitle() {
    mode = 'title';
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
   * Carry on from a save (a room's start). After CONTINUE? from the last life lost, as before: five
   * lives, the score from nothing; after the ending (France), everything as saved: the treasure's
   * room as he came into it, the treasure still there to play the ending again.
   */
  function resume(s: MontySave, afterGameOver: boolean) {
    const ending = !!g.completionActive;
    restore(g, s);
    if (ending) playOn();
    if (afterGameOver && !won) { g.lives = 5; g.score = 0; }
    won = false;
    g.vic.border = g.vic.background = 0;
    g.hiScore = Math.max(g.hiScore, topScore(title.table), g.score);
    g.drawHudData();
    mode = 'play';
    latch.hold();
    fe.wentBack();
    view.resetSmoothing();
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

  /** What the pause screen asked for: back to the room's start, or to the title (the save stays: ENTER CONTINUE). */
  function asked(r: PauseRequest) {
    if (r === 'roomStart') backToRoomStart();
    else if (r === 'title') { fe.wentBack(); flow.toTitle(); toTitle(); }
  }

  /** Back to how things were on coming into this room. */
  function backToRoomStart() {
    rooms.backToRoomStart(flow, mode === 'play', (s) => resume(s, false));
  }

  // ---- sound ------------------------------------------------------------------------

  const audio = new AudioKeys({
    canvas, input, renderer, player: music, padUnlocks: true,
    started: async () => { await music.play(1); if (!musicOn) g.sound.stop(); },
    // the original's choice (the C= key on its title): Hubbard's music, or sound effects
    mute: () => {
      musicOn = !musicOn;
      if (musicOn) g.sound.song(0);
      else g.sound.stop();
    },
  });

  const status = () => rooms.status(mode === 'title', mode === 'play' && !fe.holding);

  /** The keys and pad, with fire held over from a screen that closed left out until it's let go. */
  function stick() {
    return { ...input.held, fire: latch.filter(input.held.fire) };
  }

  /**
   * Whether the pause screen may open now: in play, not in a sequence (a death, a teleport, the C5's);
   * but in the ending, until Monty walks aboard (travel can take him back to any room visited).
   */
  const canPause = () => !flow.holding && ((!g.freeze && !g.script) || g.endingLeavable);

  toTitle();
  return {
    touch: TOUCH,
    /** For tests: the game, the title and the front end's state. */
    get game() { return g; },
    get title() { return title; },
    get frontEnd() { return fe; },
    /** For tests: the moment's grace. */
    get grace() { return flow.grace; },
    get state() { return { mode, paused: fe.paused, going: fe.going, found: fe.found, grace: flow.grace.left, ...flow.state }; },
    tick() {
      audio.tick();

      if (mode === 'play') {
        fe.pauseKey(g, canPause());
        if (fe.paused) {
          asked(fe.pausedTick(g, () => view.update()));
          return;
        }
        // travel: picked on the map, carried out between frames
        if (fe.going !== null) {
          const to = fe.going;
          fe.going = null;
          // (from the ending, before he's aboard: what it set undone first, as if he'd never begun it)
          const ending = g.endingLeavable;
          if (montyMap.go(to, g, fe.found)) {
            flow.grace.start();
            if (ending) { g.leaveEnding(); playOn(); }
            view.resetSmoothing();
          }
        }
      }
      const answered = flow.before(status());
      if (answered) {
        resume(answered, flow.lastAnswer === 'continue');
        flow.resumed(answered, rooms.count);
        return;
      }

      if (mode === 'title') {
        const j = stick();
        if (flow.holding) j.fire = false;
        if (title.frame(j) === 'start') startGame();
      } else if (!flow.holding) {
        g.input = stick();
        g.inputFire = g.input.fire;
        g.frame(collisions);
        flow.grace.tick();
        if (g.finished) {
          // the last life lost, or the ending played out (France): the title, and CONTINUE? over it (no
          // high-score table or name entry: the original's, gone); the save is kept either way
          won = g.finished === 'won';
          toTitle();
        }
      }
      if (flow.after(status())) latch.hold();
      view.update();
      if (mode === 'title') fineScroll(renderer.screen, title.phase, g.vic.border);
      flow.draw();
      collisions = mode === 'play' ? view.collisions(g.uncounted) : 0;
    },
    render(alpha: number) {
      music.hold(flow.covering || fe.holding);
      view.render(alpha);
      if (flow.covering || fe.holding) { renderer.hideSprites(); renderer.render(); }
    },
    /** The gear (or the touch PAUSE button): the pause screen, or back from it. */
    menu() {
      if (mode === 'play') fe.menu(g, canPause());
    },
  };
}

/** The game's own lettering (screen codes $40-$7F of its charset), topped up with the kit's. */
function montyFont() {
  return new BitmapFont()
    .addFromCharsetMapped(bankImage, 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.,!-:/()', (c) => (c & 0x3f) | 0x40)
    .addDrawn(KIT_GLYPHS);
}
