import { C64Machine, C64View, C64_KEYS, SidPlayer, type MachineState, type Host } from 'c64kit';
import { LIVES_ASSIST } from '../../shared/lives';
import { RewardShow } from '../../shared/ending/show';
import { keepWon, readWon, wantsEnding } from '../../shared/ending/credits';
import { MACHINE_CODEC, type GameStatus } from '../../shared/continue';
import { runPort, type FrameResult } from '../../shared/port';
import { playEvents } from '../../shared/native/combat';
import type { TouchLayout } from '../../shared/touch';
import { writeCells } from './cells';
import { giveControls } from './controls';
import { intoArmour } from './fades';
import { heroAt, placeFeel } from './feel';
import { antiriadEnding, endingStats } from './ending';
import { Game } from './game';
import { takeOff } from './hero';
import { antiriadMap, describeSave, entryOf, type AntiriadFound } from './map';
import { stopMessage } from './panel';
import { loadPlus, startPlus } from './plus';
import { heroAnim, restartHeroAnim } from './sprites';
import { V } from './vars';

/**
 * The Sacred Armour of Antiriad: the runstop64 front end for the ported game
 * (game.ts and the rest are the game): sound, keys, and the shared pause
 * screen with the map and travel, assists, autosave and continue.
 */
/**
 * Touch: Tal walks, jumps (up) and crouches (down); FIRE throws (the Pulsar Beam in the armour),
 * JUMP jumps (lifts the armour), CELL fills the armour from a stored recharge cell (ENHANCED; cells.ts).
 * In ORIGINAL FIRE and JUMP are the original's one button, and CELL does nothing.
 */
const TOUCH: TouchLayout = { stick: '8', buttons: [{ label: 'FIRE', key: 'Space', size: 'big', colour: 'red' }, { label: 'JUMP', key: 'KeyZ' }, { label: 'CELL', key: 'KeyC', size: 'small' }] };

/** ENHANCED's buttons (main.ts controls()): Z jumps; Space, X, Ctrl and the pad's buttons fire. */
const JUMP_KEY = 'KeyZ';
const FIRE_KEYS = ['Space', 'KeyX', 'ControlLeft', 'ControlRight'];

/** The game over's message, which goes round until the game starts again. */
const GAME_OVER = 0x10;

/** The Implosion Mine set off ($B1, bit 7: hero.ts `powerCentre`). */
const MINE_SET_OFF = 0xb1;

/** CONTINUE? after the game is over: full life and all the rejuvenations (in a save's RAM). */
function newLives(ram: Uint8Array) {
  ram[V.life] = 0x1f;
  ram[V.deaths] = 0;
  ram[V.gameOver] = 0;
}

/**
 * Saves written before travel was put right (game.ts travel) can hold states only its bugs made,
 * which the game never makes itself and which it can't get out of; each is put right on loading:
 *
 * - The armour with vertical speed but no vertical direction (travel cleared the one and kept the
 *   other): up and down dead. Its speeds are cleared, as travel now does on arriving.
 * - Tal on foot with no walking speed (travel zeroed it; only stepping out of the armour sets it):
 *   he walks on the spot. It's 2 again, as it always is out of the armour.
 * - Tal stepped out of the armour standing in the air (travel put it there standing): in the
 *   stance he steps out in ($88) his physics are off ($9A6F), so with his jump on he falls for
 *   good, round a room without a way down, and back into the armour, keeping the jump, which
 *   shuts out the joystick: the armour bounces for good. Nothing else gets him into $88 in the
 *   air with the jump on (he only materialises in other frames stepping out, on a floor in the
 *   original), and nothing in the armour sets or clears the jump. Falling, he goes back into the
 *   armour as he was about to (if it's in this room; else he gets the game's falling frame and
 *   lands); in it, the jump goes; either way, standing in the air, the armour takes off ($941D).
 * - The game over gone on past (travel took Tal out of his last death: game.ts `canTravel`): Tal up
 *   and about (in the armour or out of it), never to die again, with "YOU HAVE DIED" going round
 *   on the panel and nothing to end the game. The game was over, so the save goes on as CONTINUE?
 *   would have gone on from it (`newLives`), and the message stops. (A game over the game is in
 *   itself, Tal lying dead, is never saved: saves are made coming into a room.)
 *
 * And the save made the moment the Implosion Mine is set off (`run`: the one to carry on from after
 * the end) goes on as New Game+ (plus.ts): on the first screen, in the armour, for good. (A New
 * Game+ save gets this version's message and '+'.)
 */
export function repairSave(g: Game) {
  const { ram } = g;
  const inArmour = () => !!(ram[V.inSuit] & 0x80);
  loadPlus(ram);
  writeCells(ram);
  if (ram[MINE_SET_OFF] & 0x80) startPlus(g);
  const lyingDead = !inArmour() && [0xa6, 0xa8, 0xaa].includes(ram[V.anim]);
  if (ram[V.gameOver] & 0x80 && !lyingDead) newLives(ram);
  if (!(ram[V.gameOver] & 0x80) && (ram[V.message] & 0x7f) === GAME_OVER) stopMessage(g);
  if (inArmour() && ram[V.flySpeedY] && !(ram[V.dir] & 3)) {
    ram[V.flySpeedX] = ram[V.flySpeedY] = 0;
    ram[V.speedX] = ram[V.speedX + 1] = ram[V.speedY] = ram[V.speedY + 1] = 0;
  }
  if (!inArmour() && !(ram[V.dying] & 0x80) && ram[V.speedX] !== 2) ram[V.speedX] = ram[V.speedX + 1] = 2;
  const fallingStepped = !inArmour() && ram[V.anim] === 0x88 && ram[V.jumping] & 0x80 && !((ram[V.appearing] | ram[V.dying]) & 0x80);
  if (fallingStepped && ram[V.suitRoom] !== ram[V.room]) { heroAnim(g, 0x94); restartHeroAnim(g); return; }
  if (fallingStepped) intoArmour(g);
  if (inArmour() && ram[V.jumping] & 0x80) {
    ram[V.jumping] = 0;
    ram[V.dir] = ram[V.dir + 1] = 0;
    ram[V.speedY] = ram[V.speedY + 1] = 0;
    if (ram[V.anim] === 0xb2 && ram[0x0680] & 0x80) takeOff(g);
  }
}

export { info } from './info';

export function run(host: Host) {
  const { renderer, input } = host;
  renderer.frame = { x: 32, y: 36 };
  let g = new Game();
  let view = new C64View(renderer, g.m);
  const sound = new SidPlayer();

  /**
   * Each room entered (a new number: autosave); and the Implosion Mine set off, which saves that
   * moment (`won`): the save to carry on from after the end, as New Game+ (`repairSave`, plus.ts).
   * The ending's fire then goes to the title as T on the pause screen does: it waits, offering
   * ENTER CONTINUE into that save (SPACE a new game). (It went on as after losing: CONTINUE?, back
   * into the last room entered, the power centre with the mine, and round to the end again; and
   * the original's fire goes straight on into a new game.)
   */
  let won = false;
  /** The numbers under THE END, taken the moment the mine goes off (a new game after it wipes them). */
  let stats: string[] = [];
  /** Whether ENHANCED is on (the front end's switch, once the session is up). */
  let enhanced = () => false;
  /** The ending's show (made in the session's build), and the start of it from the game's own ending. */
  let rewardShow: RewardShow | null = null;
  let startReward = () => {};

  // ---- the session (games/shared/port.ts): saves, continue, the pause screen ---------------------
  const port = runPort<MachineState, AntiriadFound, Game>(host, {
    id: 'antiriad', font: 'kit', codec: MACHINE_CODEC, map: antiriadMap, describe: (s) => describeSave(s.ram),
    strip: { y: 183 }, // (on the black under the title's floor)
    // ENHANCED (on unless chosen off: ORIGINAL): fire and jump on buttons of their own (hero.ts)
    assists: [{ id: 'enhanced', long: 'ENHANCED', default: true }, LIVES_ASSIST],
    launchHeld: true,
    // (W on the pause screen: the ending, once the game has been won, in ENHANCED)
    ending: () => enhanced() && readWon('antiriad'),
  }, (self) => {
    // ---- the reward for winning (ENHANCED): the montage, the creatures walking through it, THE END (src/ending.ts, shared/ending/show.ts) ----
    /** The show is on from the ending's fire (the title is up under it, ENTER CONTINUE comes after), not from W or ?ending (which end on the title). */
    let afterWin = false;
    /** The tune: the title sequence's own, on a C64 of its own, its writes going into the sound as the game's would. */
    let tune: Game | null = null;
    const reward = new RewardShow({
      host,
      spec: antiriadEnding(renderer),
      font: () => self.flow.getFont(),
      music: {
        start() { tune = new Game(); },
        frame() {
          if (!tune) return;
          tune.m.joy1 = tune.m.joy2 = 0x1f;
          tune.tick();
          sound.pushFrame(tune.m.sidWrites);
        },
        end() { tune = null; },
      },
      done() {
        if (afterWin) afterWin = false; else self.backToTitle();
        // (the key that skipped it may still be down: not a new game's)
        self.latch.hold();
        self.flow.spendPress();
      },
    });
    rewardShow = reward;
    startReward = () => { afterWin = true; reward.start(stats); };
    // ?ending on the page: the ending at once, for review
    if (wantsEnding()) reward.start(endingStats(g, self.fe.found));
    return {
      takeover: reward,
      watchEnding() { afterWin = false; reward.start(endingStats(g, self.fe.found)); },
      state: () => g,
      phase: () => (g.playing ? 'play' : g.onTitle ? 'title' : 'other'),
      // (the save is taken when the flow asks; none inside a room change, or on the way to a place picked on the map)
      status: (): GameStatus<MachineState> => ({
        machine: g.m,
        onTitle: g.onTitle,
        room: g.playing && !fe.holding && !(g.ram[V.roomChange] & 0x80) && !g.travelTo ? rooms.count : null,
        save: () => g.snapshot(),
      }),
      // Travel: picked on the map; the game takes Tal there between frames.
      travel(id) {
        const room = Number(id), at = entryOf(g, fe.found, room);
        if (!at) return false;
        g.travelTo = { room, ...at };
        return true;
      },
      resume(s, from) {
        // continuing after the game is over: Tal comes back with full life and his rejuvenations
        if (from === 'continue') newLives(s.ram);
        resume(s);
      },
      toTitle,
      frame,
      updateView: () => view.update(),
      renderView: (alpha) => view.render(alpha),
      prepareRender(covered) { renderer.effects.enabled = g.playing && !covered && !flow.holding; },
      audio: { player: sound, started: () => sound.startStream() },
    };
  });
  const { flow, fe, rooms } = port;
  enhanced = () => !!fe.assist.enhanced;

  const hook = (game: Game) => {
    game.onRoom = () => rooms.enter();
    game.graceActive = () => flow.grace.active;
    game.unlimitedLives = () => fe.assist.lives === true;
    won = false;
  };
  hook(g);

  /** Start the game again from a save (a room's start): its machine as it was. */
  function resume(s: MachineState) {
    const m = new C64Machine();
    m.loadState(s);
    g = new Game(m, true);
    repairSave(g);
    hook(g);
    view.dispose();
    view = new C64View(renderer, g.m);
    renderer.effects.model.clear();
  }

  /** Back to the title: the game as it starts (a fresh machine); the save stays. */
  function toTitle() {
    g = new Game();
    hook(g);
    view.dispose();
    view = new C64View(renderer, g.m);
    renderer.effects.model.clear();
  }

  /** The joystick (port 2) and keyboard, for this frame. */
  function controls() {
    const m = g.m;
    // ENHANCED: fire and jump apart (Z is the jump; the other fire keys and the pad fire)
    const two = fe.assist.enhanced;
    const fire = two ? FIRE_KEYS.some((k) => input.down.has(k)) || (input.held.fire && !input.down.has(JUMP_KEY)) : input.held.fire;
    giveControls(g, {
      up: input.held.up, down: input.held.down, left: input.held.left, right: input.held.right,
      fire: port.latch.filter(fire),
      jump: input.down.has(JUMP_KEY), jumpTap: input.typed.includes(JUMP_KEY), cell: input.typed.includes('KeyC'), // (ENHANCED: C fills the armour from a stored cell)
    }, two);
    // R (or F1) restarts: the original's Q
    m.keys = input.down.has('KeyR') || input.down.has('F1') ? [C64_KEYS.KeyQ] : [];
  }

  /** What Tal and the creatures felt this frame, as effects over the picture and sounds (feel.ts; both modes: presentation). */
  let frames = 0;
  function felt() {
    const notes = g.feel;
    g.feel = [];
    if (!notes.length || !g.playing) return;
    const sprites = g.m.capture.sprites;
    playEvents(placeFeel(sprites, notes, ++frames), renderer.effects.model, (n) => sound.sfx(n), performance.now(), { player: heroAt(sprites) });
  }

  /** One frame of the game (not while a screen of the flow's is up); whether it was a frame of play (the grace counts it). */
  function frame(holding: boolean): FrameResult {
    if (holding) return 'idle';
    controls();
    const wasPlaying = g.playing;
    g.tick();
    felt();
    const result = g.playing ? 'played' : 'idle';
    if (!wasPlaying && g.playing && !flow.state.playing) fe.newGame();
    if (!won && g.ram[MINE_SET_OFF] & 0x80) { won = true; keepWon('antiriad'); stats = endingStats(g, fe.found); rooms.enter(); }
    if (won && g.onTitle) {
      port.backToTitle();
      // (ENHANCED: the reward over the title, after the game's own ending)
      if (enhanced()) startReward();
      return result;
    }
    if (g.playing && !(g.ram[V.roomChange] & 0x80)) antiriadMap.observe(g, fe.found, new Uint8Array(0));
    sound.pushFrame(g.m.sidWrites);
    return result;
  }

  return {
    touch: TOUCH,
    /** For tests: the game and the front end's state. */
    get game() { return g; },
    /** For tests: the moment's grace. */
    get grace() { return flow.grace; },
    /** For tests: the ending's show (src/ending.ts). */
    get ending() { return rewardShow; },
    get state() { return { paused: fe.paused, going: fe.going, found: fe.found, enhanced: !!fe.assist.enhanced, grace: flow.grace.left, ...flow.state }; },
    tick: port.tick,
    render: port.render,
    menu: port.menu,
  };
}
