import { C64View, HdRooms, SidPlayer, hdRefresher, unpackState, type HdBuilder } from 'c64kit';
import { MACHINE_CODEC, type GameStatus, type TitleStrip } from '../continue';
import type { C64Machine, FrameCapture, Host, MachineState, PictureLayout } from 'c64kit';
import { cpu } from './cpu';
import { NativeHost, type PortConfig } from './host';
import { Combat, type CombatSpec } from './combat';
import { EightWay, type ControlsSpec, type Runner } from './controls';
import {
  ActionKeys, AirJump, EightWayStage, Keyboard, Knockback, Latch, NamePick, NativeEnv, RUN_KEYS, Running, SafeArrival, ScreenWatch, Vitals, stages,
  type ActionsSpec, type AirJumpSpec, type FrameStage, type LatchSpec, type NamesSpec, type NativeAssistId, type RunSpec, type SafeSpec, type StickStage, type VitalsSpec, type WaitStage,
} from './features';
import { PAUSE_KEYS, type AssistSpec } from '../frontend';
import { runPort, type FrameResult, type PortPhase, type ResumeFrom } from '../port';
import type { HdView } from '../view';
import { mapSummary, type PauseMap } from './pause';
import type { TouchLayout } from '../touch';

export type { RunSpec, NativeAssistId };

/**
 * The runstop64 front end for a native port (the Pendragon games): the game as
 * it was, plus quality-of-life additions in the spirit of the Monty remake.
 * Each game's QOL.md lists them: autosave and continue (games/shared/continue.ts),
 * keys as taps, and the start button not carrying into play.
 */
export interface NativeGameOptions<F> {
  /** Storage key prefix, e.g. 'entombed'. */
  id: string;
  /** URL of the title-screen snapshot. */
  state: string;
  port: PortConfig;
  /** Identifies the room Pendragon is in (a new value means a new room: autosave). */
  room(ram: Uint8Array): number;
  /** Where the game's code waits while its title screen shows (yield addresses), or a test of the machine. */
  titleWaits: number[] | ((ram: Uint8Array) => boolean);
  /**
   * Text to put in the game's memory before it starts (address → text, same length as
   * what it replaces): the title screen's key instructions, rewritten for this keyboard.
   */
  text?: Record<number, string>;
  /**
   * Parts of the game image mended since saves were first made (build/patch.json): a save still
   * holding the part as the old image had it gets the title snapshot's mended bytes when it's
   * resumed, so a save from before the mend doesn't keep the hole. `was`: the FNV-1a hash of each
   * 64 bytes of the part as the old image had it; the part is the old one when most of them match
   * (the game may have written a few bytes into it since: Blackwyche's room $17 keeps two there),
   * so a part the game swaps elsewhere, or a save from the mended image, is left alone.
   */
  mends?: Mend[];
  /** Puts right a save's memory as it is resumed (something an earlier version of the port left wrong: it has the machine's memory and the VIC's registers). */
  repair?: (ram: Uint8Array, vic: Uint8Array) => void;
  /** Health, lives and continuing at full (the assists FULL HEALTH/ROOM and INFINITE LIVES, and CONTINUE?). */
  vitals?: VitalsSpec;
  /** For the "hints" assist: places on the screen (C64 pixels) where something can be done and hasn't been yet (`vic`: its registers, for where sprites are). */
  hints?(ram: Uint8Array, vic: Uint8Array): { x: number; y: number }[];
  /** The hints are part of this assist of the game's own (e.g. 'enhanced'), not an option of their own. */
  hintsWith?: string;
  /**
   * The game's own assists (off unless chosen): `apply` runs after each frame (before the next), with
   * whether it's on (and play under way), and what the player has found (kept with the saves).
   * `default`: on unless chosen off.
   */
  assists?: { id: string; long: string; default?: boolean; apply?(ram: Uint8Array, on: boolean, found: F, m: C64Machine): void }[];
  /** The game's own moments (`hooks` in its translation's config: host.ts `onHook`), as its code reaches them. */
  onHook?(pc: number, ram: Uint8Array): void;
  /** After each frame, once the assists have had it (play under way or not). */
  afterFrame?(ram: Uint8Array): void;
  /** The options on (by id): the live record, for a game's own parts that read them (a map, say). */
  onAssists?(assist: Readonly<Record<string, boolean>>): void;
  /**
   * No death loops, for games where a room can be come into in the air or onto something that kills
   * (and the game's own restart puts him back there): the autosave on coming into a room waits until
   * the player is `steady` there (on his feet), and is kept once he has lived a moment after it
   * (`SAFE_PASSES`, `lives` no fewer), so continuing never starts where he dies at once. And in
   * ENHANCED, a life lost before that starts him again from the last save kept (with the lives as
   * they are now), not where the game would.
   */
  safe?: SafeSpec<F>;
  /**
   * A moment's grace (grace.ts) for what combat doesn't cover (all of it, where there is no `combat`
   * spec): `skip`: routines of the game's code that take a life or health (listed under "skips" in
   * its translation's config), which return at once while the grace lasts; `keep`: put right each
   * frame of grace what only a RAM action can; `hook`: the game's own moments (`hooks`) during the grace,
   * after `onHook`, to refuse what they would take (cpu registers as at the hook).
   */
  grace?: { skip?: number[]; keep?(ram: Uint8Array): void; hook?(pc: number, ram: Uint8Array): void };
  /** The joystick port the game reads, if only one (to some games the other port's lines are keys). */
  joyPort?: 1 | 2;
  /** Direct keys for the game's actions (features.ts `ActionKeys`). */
  actions?: ActionsSpec;
  /**
   * The picture laid out differently (c64kit's layout.ts: parts moved, labels added), in both modes;
   * the game's memory and logic are untouched. The first whose `when` holds (the picture is the one
   * it's for: e.g. its raster split is there, from the frame as the VIC drew it) is shown.
   */
  layout?: { picture: PictureLayout; when(m: { ram: Uint8Array; capture: FrameCapture }): boolean }[];
  /** ENHANCED: a second jump in the air, once per airtime (features.ts `AirJump`; `airJump` in the assists). */
  airJump?: AirJumpSpec;
  /** ENHANCED: a moment's grace (frames) on coming into each room, as the resume's but shorter (grace.ts). */
  entryGrace?: number;
  /** ENHANCED: a move the game makes of its own ends with the stick still held (features.ts `Latch`). */
  latch?: LatchSpec;
  /**
   * Running: Shift held (or the touch RUN key on). Shift is then the front end's: it never reaches
   * the game's keyboard. `RunSpec` says how.
   */
  run?: RunSpec;
  /** The map for the pause screen (P, Esc, pad Start, or the gear, during play), and so what the game keeps of the player's progress (`F`). */
  map: PauseMap<Uint8Array, F>;
  /**
   * What a save says about the game's progress (the save manager shows it): where first, then how
   * it's doing. Default: the map's heading and its side panel (`mapSummary`).
   */
  describe?(ram: Uint8Array, found: F): string[];
  /** The font for panels: the game's own (from its title screen's charset, the default) or the kit's. */
  font?: 'game' | 'kit';
  /** Where the title has room for ENTER CONTINUE (letters only, no box: continue.ts's TitleStrip). */
  strip?: TitleStrip;
  /** A screen of the game's asking for a name, picked on a touch screen (features.ts `NamePick`). */
  names?: NamesSpec;
  /** Physical key → C64 key; keys that never reach the C64 keyboard. */
  remap?: Record<string, string>;
  reserved?: string[];
  /**
   * The touch controls (games/shared/touch): the stick and the buttons, main one first. A RUN
   * button (Shift, on or off) is added for games with `run`.
   */
  touch?: TouchLayout;
  /**
   * Combat (combat.ts): where in the game's code enemies are destroyed, the player is hurt and
   * the weapon swung. Gives the effects over the picture and their sounds (EFFECTS, on unless
   * chosen off; WARNING GLOW, off) and the combat assists (off unless chosen): invulnerability
   * for a moment after a hit, knockback, hit-stop.
   */
  combat?: CombatSpec;
  /** The 8-way controls assist (controls.ts): the game's facing byte and its own steps into the picture. */
  controls?: ControlsSpec;
  /**
   * The HD view (c64kit's hd/; the C64/HD switch is the shell's, games/shared/view.ts): how the rooms
   * are made from the game's frames (`obliqueRooms` for the Pendragon games). The view only: the game
   * is untouched.
   */
  hd?: HdBuilder;
}

/** Our keys, never the game's: M mutes. */
const OURS = ['KeyM'];

/** The assists `runNative` offers itself, for the games that have what they need. */
function nativeAssists<F>(opts: NativeGameOptions<F>): AssistSpec[] {
  const own = (id: NativeAssistId, long: string, role?: AssistSpec['role']): AssistSpec => ({ id, long, role });
  return [
    ...(opts.vitals?.health ? [own('health', 'FULL HEALTH/ROOM')] : []),
    ...(opts.vitals?.lives ? [own('lives', 'INFINITE LIVES', opts.vitals.infinite ? undefined : 'never')] : []),
    ...(opts.hints && !opts.hintsWith ? [own('hints', 'HINTS (SPARKLES)')] : []),
    ...(opts.assists ?? []).map((a) => ({ id: a.id, long: a.long, default: a.default })),
    ...(opts.combat ? [
      own('effects', 'EFFECTS', 'always'),
      own('glow', 'WARNING GLOW', 'never'),
      own('invulnerable', 'SAFE AFTER A HIT'),
      own('knockback', 'KNOCKBACK'),
      own('hitStop', 'HIT-STOP'),
    ] : []),
    ...(opts.controls ? [own('eightWay', '8-WAY CONTROLS')] : []),
    ...(opts.safe ? [own('respawn', 'NO DEATH LOOPS')] : []),
    // running, where it's part of ENHANCED
    ...(opts.run?.enhanced ? [own('run', 'RUN (SHIFT)')] : []),
    ...(opts.airJump ? [own('airJump', 'JUMP AGAIN IN THE AIR')] : []),
  ];
}

export function runNative<F>(host: Host, opts: NativeGameOptions<F>) {
  const { renderer, input } = host;
  renderer.frame = { x: 32, y: 36 };
  const sound = new SidPlayer();
  const map = opts.map;
  const mainWait = opts.port.mainLoopWait;
  let game: NativeHost | null = null;
  /** The title snapshot (back to the title starts from it again). */
  let titleState: Uint8Array | null = null;
  /** Which game image this is: a hash of the title snapshot it was loaded from (stored with each save). */
  let image: string | undefined;
  let view: C64View | null = null;
  /** A resume has begun: the room it comes into is not a new game's. */
  let resuming = false;
  /** The room the entry grace last began in; and a life has just been lost (the entry grace begins again). */
  let entryRoom = -1, diedNow = false;
  /** A game began that the player did not ask for, over a save: the save carries on at the next frame (atMainWait). */
  let carryingOn = false;
  /** A place picked on the map, to be carried out at the main loop's wait. */
  let going: string | null = null;
  /** The HD view's rooms (built again only when the room's part of the picture changes). */
  const hdRooms = opts.hd ? new HdRooms(opts.hd, hdRefresher()) : null;
  /** The HD view, as the shell's C64/HD switch sets it. */
  const hdView: HdView = { on: false };
  /** Whether the HD view's room is drawn now (set each frame of the game; drawn between them as the sprites are: `rooms.at`). */
  let hdShown = false;

  // ---- the session (games/shared/port.ts): saves, continue, the pause screen, with this machine as its game ---
  const port = runPort<MachineState, F, Uint8Array>(host, {
    id: opts.id, font: opts.font, codec: { ...MACHINE_CODEC, image: () => image }, map, strip: opts.strip,
    describe: (s, found) => (opts.describe ? opts.describe(s.ram, found) : mapSummary(map, s.ram, found)),
    assists: nativeAssists(opts),
  }, () => ({
    ready, state, phase, canPause, travel, resume, roomOf: (s) => roomIn(s.ram), toTitle, frame, afterFrame: afterTheFrame,
    status: () => statusOf(live().g),
    // the autosave is taken at the main loop's wait (a clean point to save and resume at)
    savesInFrame: true,
    updateView, renderView, prepareRender,
    // (V is a key of the game's own keyboard here, not the authentic-pixel-steps switch)
    audio: { player: sound, snapKey: false, started: () => sound.startStream() },
  }));
  const { flow, fe, latch: fireLatch } = port;
  const assist = fe.assist;
  opts.onAssists?.(assist);

  // ---- the features (features.ts), each with its own state --------------------------------------
  /** Running translated code between frames (registers kept). */
  const runner: Runner = { call(fn) { const regs = { ...cpu }; fn(); Object.assign(cpu, regs); } };
  const env = new NativeEnv(runner, opts.joyPort, (): boolean => flow.state.playing, (): boolean => fe.enhanced, (id): boolean => assist[id] === true);
  const combat = opts.combat ? new Combat(opts.combat, () => ({
    effects: !!assist.effects, glow: !!assist.glow, invulnerable: !!assist.invulnerable, knockback: !!assist.knockback, hitStop: !!assist.hitStop, grace: flow.grace.active && flow.state.playing,
  })) : null;
  const running = opts.run ? new Running(env, opts.run) : null;
  const knockback = combat ? new Knockback(env, combat, opts.run?.player ?? null) : null;
  const eightWay = opts.controls ? new EightWayStage(env, new EightWay(opts.controls)) : null;
  const latch = opts.latch ? new Latch(env, opts.latch) : null;
  const airJump = opts.airJump ? new AirJump(env, opts.airJump) : null;
  const keyboard = new Keyboard(opts.remap, new Set([...OURS, ...(opts.run ? RUN_KEYS : []), ...(opts.reserved ?? [])]), PAUSE_KEYS);
  const actions = opts.actions ? new ActionKeys(env, opts.actions, input, (code) => keyboard.reaches(code)) : null;
  const names = opts.names ? new NamePick(opts.names, input) : null;
  const safe = opts.safe ? new SafeArrival(env, opts.safe) : null;
  const screens = new ScreenWatch((): boolean => flow.holding);
  const vitals = opts.vitals ? new Vitals(env, opts.vitals, (g) => g.lastWait === mainWait, (ram) => opts.room(ram)) : null;

  /** The stick's way to the game: the 8-way controls first, then what hit him pushes him, then the latch. */
  const stick: StickStage[] = stages<StickStage>(eightWay, knockback, latch, airJump);
  /** At the main loop's wait, the other way round: the latch is let go first, then the extra passes of his handling, then the 8-way step. */
  const atWait: WaitStage[] = stages<WaitStage>(latch, airJump, running, knockback, eightWay);
  /** After the game's frame: combat, the screen watched, the assists (lives, the game's own, the grace's), health. */
  const afters: FrameStage[] = stages<FrameStage>(
    combat ? { afterFrame: (g) => combatFrame(g, combat) } : null,
    screens,
    vitals?.lives ?? null,
    { afterFrame: (g) => { for (const a of opts.assists ?? []) a.apply?.(g.m.ram, !!assist[a.id] && flow.state.playing, fe.found, g.m); } },
    { afterFrame: (g) => { if (flow.grace.active && flow.state.playing) opts.grace?.keep?.(g.m.ram); } },
    { afterFrame: (g) => opts.afterFrame?.(g.m.ram) },
    vitals?.health ?? null,
  );

  void fetch(opts.state)
    .then((r) => r.arrayBuffer())
    .then((b) => {
      titleState = new Uint8Array(b);
      image = fnv1a(titleState).toString(16).padStart(8, '0');
      start(new NativeHost(opts.port, withText(unpackState(titleState))));
    });

  // ---- the session's points (named, with their types: they reach the flow and the front end, which come from the session) ----
  function ready(): boolean { return game !== null && view !== null; }
  function state(): Uint8Array { return live().g.m.ram; }
  function phase(): PortPhase { return onTitle(live().g) ? 'title' : flow.state.playing ? 'play' : 'other'; }
  // (not while a name is typed: the game's screen asking for it is between play and the title)
  function canPause(byKey: boolean): boolean { return !(byKey && names?.asking(live().g)); }
  function travel(id: string): boolean { going = id; return !!map.go; }
  function resume(s: MachineState, from: ResumeFrom) {
    // continuing: back to full health
    if (from !== 'roomStart') opts.vitals?.fullHealth?.(s.ram, s.colour, assist);
    resumeFrom(s);
  }
  function toTitle() {
    const t = titleState;
    if (t) start(new NativeHost(opts.port, withText(unpackState(t))));
  }
  function afterTheFrame() { for (const s of afters) s.afterFrame(live().g); }
  function updateView() { const { g, v } = live(); show(g, v); }
  function renderView(alpha: number) {
    // (the HD view's room scrolled as far along as the sprites are drawn: the same alpha, the same smoothing)
    renderer.hd.room = hdRooms && hdShown ? hdRooms.at(alpha, renderer.snap) : null;
    live().v.render(alpha);
  }
  function prepareRender() {
    // Hints: sparkles where something can be done (only in play)
    const hints = opts.hints, showHints = assist[opts.hintsWith ?? 'hints'] && flow.state.playing && !flow.holding && !fe.holding;
    renderer.sparkles?.set(showHints && hints && game ? hints(game.m.ram, game.m.vic) : []);
    renderer.effects.enabled = !!combat && !!assist.effects && !flow.holding && !fe.holding;
  }

  /** The game and its view, once they are loaded (the session does not tick before: `ready`). */
  function live() {
    if (!game || !view) throw new Error('runNative: the game is not loaded yet');
    return { g: game, v: view };
  }

  const onTitle = (g: NativeHost) => (typeof opts.titleWaits === 'function' ? opts.titleWaits(g.m.ram) : opts.titleWaits.includes(g.lastWait));
  /** The room, as the flow numbers them: the game's room and the screen in it. */
  const roomIn = (ram: Uint8Array): number => opts.room(ram) * 4096 + (screens.count & 0xfff);
  const statusOf = (g: NativeHost): GameStatus<MachineState> => ({
    machine: g.m,
    onTitle: onTitle(g),
    room: g.lastWait === mainWait && !carryingOn ? roomIn(g.m.ram) : null,
    save: () => g.save(),
  });

  /** The game's memory with our text in (`text`): the title snapshot, and a save resumed (made before the text last changed, its title would show the old). */
  function withText(state: MachineState) {
    for (const [addr, text] of Object.entries(opts.text ?? {})) {
      for (let i = 0; i < text.length; i++) state.ram[Number(addr) + i] = text.charCodeAt(i);
    }
    // (a save from before a mend: the mended bytes from the title snapshot)
    if (opts.mends?.length && titleState) applyMends(state.ram, unpackState(titleState).ram, opts.mends);
    opts.repair?.(state.ram, state.vic);
    return state;
  }

  /** A host starts (the title, or a save resumed): hooks, skips and the main loop's wait. */
  function start(g: NativeHost) {
    view?.dispose();
    game = g;
    view = new C64View(renderer, g.m);
    safe?.reset();
    latch?.reset();
    airJump?.reset();
    combat?.attach(g);
    combat?.reset();
    const skips = opts.grace?.skip;
    if (skips) {
      g.onSkip = (pc) => {
        if (!skips.includes(pc)) return false;
        if (flow.grace.active && flow.state.playing) return true;
        diedNow = flow.state.playing; // (a life goes, and the game starts him again: the entry grace, if it has one)
        return false;
      };
    }
    const onHook = opts.onHook, graceHook = opts.grace?.hook;
    if (onHook || graceHook) {
      const h = g.onHook;
      g.onHook = (pc) => {
        h?.(pc);
        onHook?.(pc, g.m.ram);
        if (graceHook && flow.grace.active && flow.state.playing) graceHook(pc, g.m.ram);
      };
    }
    renderer.effects.model.clear();
    g.onWait = (site) => { if (site === mainWait) atMainWait(g); };
  }

  /** The main loop's wait: travel, the features' extra handling, the map's notes, and the autosave. */
  function atMainWait(g: NativeHost) {
    // Going to a place picked on the pause map: the game's own code takes the player there.
    const to = going;
    going = null;
    const travel = to !== null && !!map.go;
    if (to !== null) runner.call(() => map.go?.(to, g.m.ram, fe.found));
    for (const s of atWait) s.atWait(g);
    const st = statusOf(g);
    // Play beginning, not from a save. A new game the player asked for (or with no save to lose): the save so far is kept as
    // the previous one, nothing found yet. Any other beginning (the game's title took a key the front end did not see) is not
    // his say: the save carries on instead, at the next frame, with what had been found.
    if (!flow.state.playing && !resuming && !st.onTitle && st.room !== null) {
      if (flow.newGameAsked || !flow.saved()) fe.newGame();
      else { carryingOn = true; return; }
    }
    // the map notes what's been found (and puts the player where a place picked on it says)
    // before the autosave: the save on coming into a room has him where he is, and the map with it
    if (st.room !== null) map.observe(g.m.ram, fe.found, g.m.vic);
    // ENHANCED: a short grace on coming into each room (a resume's own is longer: it starts at its own points)
    if (opts.entryGrace && st.room !== null && fe.enhanced && flow.state.playing) {
      const room = opts.room(g.m.ram);
      if (room !== entryRoom || diedNow) { entryRoom = room; flow.grace.start(opts.entryGrace); }
    }
    diedNow = false;
    // (`safe`: the room's save as it was when he found his feet there, once he's lived a moment after
    // it; a life lost just as he goes somewhere picked on the map: he goes there)
    if (safe && st.room !== null) st.save = safe.save(g, st.room, travel, fe.found);
    // unlimited lives: filled again here, once the arrival above has seen a life go (a frame of this game rarely ends at this wait)
    vitals?.lives.afterFrame(g);
    port.autosave(st); // play just began: the start button isn't a jump
    resuming = false;
  }

  /** The game going on from a save. */
  function resumeFrom(s: MachineState) {
    start(NativeHost.resume(opts.port, withText(s)));
    resuming = true;
  }

  /**
   * ENHANCED (`safe`): a life lost before he'd lived a moment in the room (he came in falling to his
   * death, or the game started him again where he dies at once): back to the last save kept instead
   * (where he had), with the lives as they are now. A life is lost once, not every one.
   */
  function respawnAtSave(g: NativeHost) {
    const s = flow.saved();
    if (!s || !safe) return;
    safe.spec.lives.set(s.ram, safe.spec.lives.get(g.m.ram));
    resumeFrom(s);
    flow.resumed(s, roomIn(s.ram));
  }

  /** One frame of the game: the keys and stick in, the machine run, the sound out. */
  function frame(holding: boolean): FrameResult {
    const { g } = live();
    // (a game began that was not asked for: the save carries on, as CONTINUE? would)
    if (carryingOn) { carryingOn = false; port.carryOn('continue'); return 'ended'; }
    // (a life lost before he'd lived a moment in the room, in ENHANCED: back to the last save kept)
    if (safe?.takeRespawn()) { respawnAtSave(g); return 'ended'; }
    actions?.beforeFrame(g, holding);
    // Hit-stop (an assist): the game waits a few frames when an enemy is destroyed (the effects go on).
    if (combat && combat.hitStop > 0 && flow.state.playing && !holding) { combat.hitStop--; flow.draw(); return 'ended'; }
    // Running (Shift held, or the touch RUN key on, in play; in ENHANCED for some): the player's own
    // handling once more a frame (see atWait).
    running?.beforeFrame(input, holding);
    feedInput(g, holding || flow.launching);
    let played = false;
    if (!holding) { g.tick(); played = flow.state.playing; }
    sound.pushFrame(g.m.sidWrites);
    return played ? 'played' : 'idle';
  }

  /** The keys and stick into the machine for a frame of the game. */
  function feedInput(g: NativeHost, blocked: boolean) {
    const m = g.m;
    m.keys = [];
    let joy = 0x1f;
    if (!blocked) {
      if (actions?.fire(g)) joy &= ~16;
      // a name asked for, on a touch screen: the touch controls pick it (the keyboard types as ever)
      const name = names?.frame(g);
      if (name?.key) m.keys.push(name.key);
      // (in play, the keys that move the hand on are the front end's: ActionKeys)
      const handKeys = actions?.handKeys ?? false;
      m.keys.push(...keyboard.frame(name?.typed ?? input.typed, (code) => PAUSE_KEYS.includes(code) || (handKeys && keyboard.reaches(code))));
      if (names?.picking) fireLatch.hold(); // (the stick and the button are the picker's)
      else {
        if (input.held.up) joy &= ~1;
        if (input.held.down) joy &= ~2;
        if (input.held.left) joy &= ~4;
        if (input.held.right) joy &= ~8;
      }
      if (fireLatch.filter(input.held.fire)) joy &= ~16;
    }
    env.raw = ~joy & 0x1f;
    let bits = env.raw;
    const active = flow.state.playing && !blocked;
    for (const s of stick) bits = s.shape(bits, active, m.ram);
    env.put(m, bits);
  }

  /** Combat: what the game's code reported this frame, as effects and sounds (combat.ts). */
  function combatFrame(g: NativeHost, c: Combat) {
    if (flow.holding) return;
    const events = flow.state.playing ? c.afterFrame(g.m) : [];
    if (!flow.state.playing) c.events = [];
    c.present(g.m, events, renderer.effects.model, (n) => sound.sfx(n), performance.now());
    c.stopFrames(events);
  }

  /** The machine's picture into the renderer: laid out as the game declares (`layout`) while it's the picture that's for. */
  function show(g: NativeHost, v: C64View) {
    renderer.layout = opts.layout?.find((l) => l.when(g.m))?.picture ?? null;
    v.update();
    // the HD view: the room lit in 3D while play shows (not on the title, a pause screen or CONTINUE?)
    hdShown = !!hdRooms && hdView.on && flow.state.playing && !flow.covering && !fe.holding;
    if (hdRooms && hdShown) hdRooms.room(g.m.ram, g.m.capture, renderer.layout, v.picture);
    renderer.hd.room = hdRooms && hdShown ? hdRooms.at(1, renderer.snap) : null;
    names?.overlay(g, renderer.screen, flow.getFont());
  }

  return {
    touch: touchLayout(opts),
    /** Its HD view, for the shell's C64/HD switch. */
    hd: opts.hd ? hdView : undefined,
    get machine() { return game?.m; },
    /** For tests: where the game waits, and the front end's state. */
    get state() { return { lastWait: game?.lastWait, paused: fe.paused, enhanced: fe.enhanced, found: fe.found, grace: flow.grace.left, ...flow.state }; },
    /** For tests: the combat events of the last frame, the assists' counters, the options. */
    get combat() { return combat; },
    /** For tests: the game running (to take a save of). */
    get host() { return game; },
    /** For tests: the moment's grace (clear it to see what it saves him from). */
    get grace() { return flow.grace; },
    get options() { return assist; },
    get frontEnd() { return fe; },
    tick: port.tick,
    render: port.render,
    /** The gear: the game's options. */
    menu: port.menu,
  };
}

/** The game's touch controls, plus RUN for games that can run (Shift, on or off). */
function touchLayout(opts: Pick<NativeGameOptions<unknown>, 'touch' | 'run'>): TouchLayout {
  const t = opts.touch ?? { stick: '8', buttons: [{ label: 'FIRE', key: 'Space', size: 'big' }] };
  return opts.run ? { ...t, buttons: [...t.buttons, { label: 'RUN', key: 'ShiftLeft', size: 'small', mode: 'toggle' }] } : t;
}

/** A part of the game image mended since saves were first made (`NativeGameOptions.mends`). */
export interface Mend { from: number; to: number; was: number[] }

/** Mends applied to a save's memory from the title snapshot's: where at least three quarters of the part's 64-byte blocks are as the old image had them. */
export function applyMends(ram: Uint8Array, title: Uint8Array, mends: Mend[]) {
  for (const { from, to, was } of mends) {
    const old = was.filter((h, i) => fnv1a(ram.subarray(from + i * 64, Math.min(to, from + i * 64 + 64))) === h).length;
    if (old * 4 >= was.length * 3) ram.set(title.subarray(from, to), from);
  }
}

/** FNV-1a (32-bit) of some bytes: how a mend recognises the part as the old image had it. */
export function fnv1a(bytes: Uint8Array) {
  let h = 0x811c9dc5;
  for (const b of bytes) { h ^= b; h = Math.imul(h, 0x01000193) >>> 0; }
  return h;
}
