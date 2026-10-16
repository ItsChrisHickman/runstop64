import { C64Machine, C64View, C64_KEYS, SidPlayer, type MachineState, type Host } from 'c64kit';
import { ContinueFlow, MACHINE_CODEC } from '../../shared/continue';
import { FrontEnd, type PauseRequest } from '../../shared/frontend';
import { playEvents } from '../../shared/native/combat';
import type { TouchLayout } from '../../shared/touch';
import { writeCells } from './cells';
import { intoArmour } from './fades';
import { heroAt, placeFeel } from './feel';
import { Game } from './game';
import { takeOff } from './hero';
import { antiriadMap, describeSave, entryOf } from './map';
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

export const info = {
  title: 'The Sacred Armour of Antiriad',
  progress: 'Your progress is saved each time Tal comes into a room: coming back to the game carries on where you were, and the save from before your last new game is kept too (the saved games: F1 on the directory).',
  html: `
    <p><a href="https://en.wikipedia.org/wiki/The_Sacred_Armour_of_Antiriad">The Sacred Armour of Antiriad</a> (1986;
    <i>Rad Warrior</i> in the US): after a nuclear war, Tal must find the ancient armour of Antiriad, power it up,
    and destroy the alien oppressors' power centre. All credit for the game belongs to its creators:</p>
    <ul>
      <li>Programming: Stanley Schembri</li>
      <li>Plot, graphics and the comic: <a href="https://en.wikipedia.org/wiki/Dan_Malone">Daniel Malone</a>; graphics also
        Stephen Robertson (as <a href="https://www.c64-wiki.com/wiki/Antiriad">C64-Wiki</a> credits him)</li>
      <li>Sound design and music: <a href="https://en.wikipedia.org/wiki/Richard_Joseph">Richard Joseph</a>,
        played by the game's own music driver</li>
      <li>Published by <a href="https://en.wikipedia.org/wiki/Palace_Software">Palace Software</a>, 1986;
        in the US by <a href="https://en.wikipedia.org/wiki/Epyx">Epyx</a> as <i>Rad Warrior</i> (1988); later by Hi-Tec Software</li>
    </ul>
    <p>Controls: arrows or WASD &middot; out of the armour: left and right walk, down crouches (to pick things up),
    Space (also X, gamepad A) throws a stone, Z or up jumps (with left or right: that way) &middot; in the armour: fly
    with the arrows (once the Gravity Displacer is fitted; Z lifts it too), Space fires the Pulsar Beam (once fitted);
    left or right while standing steps out &middot; P or Esc pauses: a map of the rooms; pick one you can go back to
    (the dark ones you can't, as you are now: in the armour, only rooms it has been in) and press Enter &middot;
    R restarts &middot; C fills the armour from a stored recharge cell (ENHANCED) &middot; M sound on or off &middot; V authentic pixel steps</p>
    <p>ENHANCED (on unless you switch to ORIGINAL with E on the pause screen): fire and jump on buttons of their own
    (the original has one button, which throws standing still and jumps walking, and up only jumps from standing);
    and an armour out of energy sets down and lets Tal out with left or right, anywhere, to fetch a recharge cell
    (in the original it bounces on the floor until held backwards, and in the first ten rooms never lets him out);
    Tal keeps every recharge cell he picks up (the original carries one) and C fills the armour from one
    (the touch CELL button), stepping into the armour does too.
    Hits and kills get effects over the picture in both modes.</p>
    <p>Changes from the original (the
    <a href="https://github.com/ItsChrisHickman/runstop64/blob/main/games/antiriad/QOL.md">full log</a>):
    pause screen with map and travel &middot; autosave on every room and Continue (coming back carries on where you were; T on the pause screen goes to the title) &middot;
    New Game+ after the ending (the armour yours: unlimited energy, no radiation) &middot; smooth movement at any
    refresh rate &middot; ENHANCED's two buttons, a way out of an empty armour and stored recharge cells.</p>
    <p>Source: <a href="https://github.com/ItsChrisHickman/runstop64">this remake</a> &middot; ported from the C64
    original's own code and data</p>
  `,
};

export function run(host: Host) {
  const { renderer, input, canvas } = host;
  renderer.frame = { x: 32, y: 36 };
  let g = new Game();
  let view = new C64View(renderer, g.m);
  const sound = new SidPlayer();

  // ---- saves, continue, the pause screen (games/shared) ---------------------------------------
  const flow = new ContinueFlow<MachineState>({ id: 'antiriad', renderer, input, font: 'kit', codec: MACHINE_CODEC, strip: { y: 183 }, describe: (s) => describeSave(s.ram) }); // (on the black under the title's floor)
  let fireHeldOver = true;
  const fe = new FrontEnd<Game>({
    id: 'antiriad', input, renderer, map: antiriadMap,
    // ENHANCED (on unless chosen off: ORIGINAL): fire and jump on buttons of their own (hero.ts)
    assists: [{ id: 'enhanced', long: 'ENHANCED', default: true }],
    font: () => flow.getFont(),
    panel: (lines) => flow.panel(lines),
    canGoBack: () => g.playing && flow.state.hasSave,
    saves: flow,
    onClose: () => { fireHeldOver = true; },
  });

  /**
   * Each room entered (a new number: autosave); and the Implosion Mine set off, which saves that
   * moment (`won`): the save to carry on from after the end, as New Game+ (`repairSave`, plus.ts).
   * The ending's fire then goes to the title as T on the pause screen does: it waits, offering
   * ENTER CONTINUE into that save (SPACE a new game). (It went on as after losing: CONTINUE?, back
   * into the last room entered, the power centre with the mine, and round to the end again; and
   * the original's fire goes straight on into a new game.)
   */
  let roomCount = 0, won = false;
  const hook = (game: Game) => {
    game.onRoom = () => { roomCount++; };
    game.graceActive = () => flow.grace.active;
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
    fireHeldOver = true;
    fe.wentBack();
  }

  // ---- sound -------------------------------------------------------------------------------------

  let muted = false;
  const unlock = () => {
    if (sound.unlocked) return;
    void sound.unlock().then(() => sound.startStream());
  };
  canvas.addEventListener('pointerdown', unlock);

  /** The joystick (port 2) and keyboard, for this frame. */
  function controls() {
    const m = g.m;
    let joy = 0x1f;
    if (input.held.up) joy &= ~1;
    if (input.held.down) joy &= ~2;
    if (input.held.left) joy &= ~4;
    if (input.held.right) joy &= ~8;
    // ENHANCED: fire and jump apart (Z is the jump; the other fire keys and the pad fire)
    const two = fe.assist.enhanced;
    const fire = two ? FIRE_KEYS.some((k) => input.down.has(k)) || (input.held.fire && !input.down.has(JUMP_KEY)) : input.held.fire;
    if (fireHeldOver && !fire) fireHeldOver = false;
    if (fire && !fireHeldOver) joy &= ~16;
    g.enhanced = two;
    g.cellAsked = two && (g.cellAsked || input.typed.includes('KeyC')); // (ENHANCED: C fills the armour from a stored cell)
    g.jumpButton = two ? (input.down.has(JUMP_KEY) ? 1 : 0) | (g.jumpButton & 2) | (input.typed.includes(JUMP_KEY) ? 2 : 0) : 0;
    m.joy1 = 0x1f;
    m.joy2 = joy;
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

  const status = () => ({
    machine: g.m,
    onTitle: g.onTitle,
    room: g.playing && !fe.holding && !(g.ram[V.roomChange] & 0x80) && !g.travelTo ? roomCount : null,
    save: () => { g.flushShapes(); return g.m.saveState(); },
  });

  return {
    touch: TOUCH,
    /** For tests: the game and the front end's state. */
    get game() { return g; },
    /** For tests: the moment's grace. */
    get grace() { return flow.grace; },
    get state() { return { paused: fe.paused, going: fe.going, found: fe.found, enhanced: !!fe.assist.enhanced, grace: flow.grace.left, ...flow.state }; },
    tick() {
      if (input.typed.length) unlock();
      if (input.typed.includes('KeyM')) { muted = !muted; if (sound.muted !== muted) sound.toggleMute(); }
      if (input.typed.includes('KeyV')) renderer.snap = !renderer.snap;

      if (g.playing) {
        if (fe.optionsOpen) { asked(fe.optionsTick(() => view.update())); return; }
        fe.pauseKey(g, !flow.holding);
        if (fe.paused) {
          asked(fe.pausedTick(g, () => view.update()));
          return;
        }
        // Travel: picked on the map; the game takes Tal there between frames.
        if (fe.going !== null) {
          const room = Number(fe.going), at = entryOf(g, fe.found, room);
          fe.going = null;
          if (at) { g.travelTo = { room, ...at }; flow.grace.start(); }
        }
      }
      const resumeFrom = flow.before(status());
      if (resumeFrom) {
        // continuing after the game is over: Tal comes back with full life and his rejuvenations
        if (flow.lastAnswer === 'continue') newLives(resumeFrom.ram);
        resume(resumeFrom);
        flow.resumed(resumeFrom, roomCount);
        return;
      }
      if (!flow.holding) {
        controls();
        const wasPlaying = g.playing;
        g.tick();
        felt();
        if (g.playing) flow.grace.tick();
        if (!wasPlaying && g.playing && !flow.state.playing) fe.newGame();
        if (!won && g.ram[MINE_SET_OFF] & 0x80) { won = true; roomCount++; }
        if (won && g.onTitle) { backToTitle(); return; }
        if (g.playing && !(g.ram[V.roomChange] & 0x80)) antiriadMap.observe(g, fe.found, new Uint8Array(0));
        sound.pushFrame(g.m.sidWrites);
      }
      view.update();
      if (flow.after(status())) fireHeldOver = true;
      flow.draw();
    },
    render(alpha: number) {
      renderer.effects.enabled = g.playing && !flow.covering && !fe.holding && !flow.holding;
      sound.hold(flow.covering || fe.holding);
      view.render(alpha);
      if (flow.covering || fe.holding) { renderer.hideSprites(); renderer.render(); }
    },
    /** The gear (or the touch PAUSE button): the pause screen, or back from it. */
    menu() {
      if (g.playing) fe.menu(g, !flow.holding);
    },
  };

  /** What the pause screen asked for: back to the room's start, or to the title (the save stays: ENTER CONTINUE). */
  function asked(r: PauseRequest) {
    if (r === 'roomStart') backToRoomStart();
    else if (r === 'title') backToTitle();
  }

  /** Back to the title: the game as it starts (a fresh machine); the save stays. */
  function backToTitle() {
    g = new Game();
    hook(g);
    view.dispose();
    view = new C64View(renderer, g.m);
    renderer.effects.model.clear();
    fireHeldOver = true;
    fe.wentBack();
    flow.toTitle();
  }

  /** Back to how things were on coming into this room. */
  function backToRoomStart() {
    const s = flow.saved();
    if (!s || !g.playing) return;
    resume(s);
    flow.resumed(s, roomCount);
  }
}
