import { C64View, C64_KEYS, HdRooms, SidPlayer, hdRefresher, unpackState, type HdBuilder } from 'c64kit';
import { AudioKeys } from '../audio';
import { ContinueFlow, MACHINE_CODEC, type TitleStrip } from '../continue';
import { FireLatch } from '../fire-latch';
import type { FrameCapture, Host, MachineState, PictureLayout } from 'c64kit';
import { cpu } from './cpu';
import { NativeHost, type PortConfig } from './host';
import { Combat, COMBAT_TIMING, type CombatSpec } from './combat';
import { EightWay, type ControlsSpec, type Runner } from './controls';
import { FrontEnd, PAUSE_KEYS, type PauseRequest } from '../frontend';
import type { HdView } from '../view';
import { mapSummary, type PauseMap } from './pause';
import type { TouchLayout } from '../touch';
import { DEL, drawPending, KeyPacer, NamePicker, RETURN, type NameKey, type NameSpec } from '../letters';

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
  /** Put Pendragon back to full health (and air) in a save, for continuing (`assist`: the options on, for games where that's one). */
  fullHealth?(ram: Uint8Array, colour: Uint8Array, assist: Record<string, boolean>): void;
  /**
   * For the "full health at room start" assist: Pendragon's health, as a number from 0 to
   * `max`, and how to set it.
   */
  health?: { max: number; get(ram: Uint8Array): number; set(ram: Uint8Array, colour: Uint8Array, v: number): void };
  /** For the "hints" assist: places on the screen (C64 pixels) where something can be done and hasn't been yet (`vic`: its registers, for where sprites are). */
  hints?(ram: Uint8Array, vic: Uint8Array): { x: number; y: number }[];
  /** The hints are part of this assist of the game's own (e.g. 'enhanced'), not an option of their own. */
  hintsWith?: string;
  /**
   * The game's own assists (off unless chosen): `apply` runs after each frame (before the next), with
   * whether it's on (and play under way), and what the player has found (kept with the saves).
   * `default`: on unless chosen off.
   */
  assists?: { id: string; long: string; default?: boolean; apply?(ram: Uint8Array, on: boolean, found: F): void }[];
  /** The game's own moments (`hooks` in its translation's config: host.ts `onHook`), as its code reaches them. */
  onHook?(pc: number, ram: Uint8Array): void;
  /** After each frame, once the assists have had it (play under way or not). */
  afterFrame?(ram: Uint8Array): void;
  /** The options on (by id): the live record, for a game's own parts that read them (a map, say). */
  onAssists?(assist: Readonly<Record<string, boolean>>): void;
  /** For the "infinite lives" assist: put the lives back to full (each frame of play). */
  lives?(ram: Uint8Array): void;
  /**
   * No death loops, for games where a room can be come into in the air or onto something that kills
   * (and the game's own restart puts him back there): the autosave on coming into a room waits until
   * the player is `steady` there (on his feet), and is kept once he has lived a moment after it
   * (`SAFE_PASSES`, `lives` no fewer), so continuing never starts where he dies at once. And in
   * ENHANCED, a life lost before that starts him again from the last save kept (with the lives as
   * they are now), not where the game would.
   */
  safe?: { steady(ram: Uint8Array, found: F): boolean; lives: { get(ram: Uint8Array): number; set(ram: Uint8Array, n: number): void } };
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
  /**
   * Direct keys for the game's actions (which the original only cycles through with "any
   * other key"): physical key → action number, how to select one (`set`, which may call
   * the game's own routines through `call`), and whether the key also does it (holds fire).
   */
  actions?: {
    keys: Record<string, number>; also: 'fire' | 'select'; set(ram: Uint8Array, n: number, call: (fn: () => void) => void): void;
    /**
     * Moving the hand on (the original's "any other key": every key that would reach the game's
     * keyboard and isn't remapped): straight to the next action in `order` (as the bar shows them),
     * one a press, instead of the game's own crawl through every icon. `get`: the action now.
     */
    next?: { order: number[]; get(ram: Uint8Array): number };
  };
  /**
   * The picture laid out differently (c64kit's layout.ts: parts moved, labels added), in both modes;
   * the game's memory and logic are untouched. The first whose `when` holds (the picture is the one
   * it's for: e.g. its raster split is there, from the frame as the VIC drew it) is shown.
   */
  layout?: { picture: PictureLayout; when(m: { ram: Uint8Array; capture: FrameCapture }): boolean }[];
  /**
   * ENHANCED: a climb (or any move the game makes of its own, `busy`) that ends with the stick still
   * held leaves him where holding it again does the opposite at once (up a ladder into a cabin whose
   * hole is behind him: the stick still up walks him back into it and down). Those of `bits` held
   * as it ends are ignored until the stick lets go of them. (Stick bits: 1 up, 2 down, 4 left, 8 right.)
   */
  latch?: { busy(ram: Uint8Array): boolean; bits: number };
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
  /**
   * A screen of the game's asking for a name (a high score's), read from its keyboard: on a touch
   * screen the name is picked with the touch controls (games/shared/letters.ts NamePicker) and
   * typed into the game's entry a key at a time; the keyboard types as it always has.
   */
  names?: {
    spec: NameSpec;
    /** Whether the game is asking now (its memory, and where its code last yielded). */
    asking(ram: Uint8Array, lastWait: number): boolean;
    /** Where the entry's cursor is (character column and row), for the letter picked to be drawn there. */
    cursor(ram: Uint8Array): { col: number; row: number };
    /** Where the line naming the touch controls goes (its top, in picture pixels: a part of the screen the game leaves empty). */
    hintY: number;
  };
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

/**
 * How a game runs (the `run` option): `player`, the player's own movement once more a frame (his
 * player-control routine run a second time, or his next step brought on: JSW2), in the main loop's
 * pass as the game's own; the player alone goes faster, everything else at the game's pace. In both
 * modes, or (`enhanced`) only in ENHANCED.
 */
export interface RunSpec { player(): void; enhanced?: boolean }

/** The keys that run (the touch RUN key is ShiftLeft). */
const RUN_KEYS = ['ShiftLeft', 'ShiftRight'];

/** Our keys, never the game's: M mutes. */
const OURS = ['KeyM'];

/** Passes of the main loop (about a second) the player must live through after coming into a room for its save to be kept (`safe`). */
const SAFE_PASSES = 50;

export function runNative<F>(host: Host, opts: NativeGameOptions<F>) {
  const { renderer, input, canvas } = host;
  renderer.frame = { x: 32, y: 36 };
  const sound = new SidPlayer();
  const reserved = new Set([...OURS, ...(opts.run ? RUN_KEYS : []), ...(opts.reserved ?? [])]);
  /** Running: the player's routine once more a frame. */
  const runPlayer = opts.run?.player ?? null;
  const map = opts.map;
  const flow = new ContinueFlow<MachineState, F>({
    id: opts.id, renderer, input, font: opts.font, codec: MACHINE_CODEC, found: map.found, strip: opts.strip,
    describe: (s, found) => (opts.describe ? opts.describe(s.ram, found) : mapSummary(map, s.ram, found)),
  });
  let game: NativeHost | null = null;
  /** The title snapshot (back to the title starts from it again). */
  let titleState: Uint8Array | null = null;
  let view: C64View | null = null;

  const start = (g: NativeHost) => {
    view?.dispose();
    game = g;
    view = new C64View(renderer, g.m);
    arrived = null;
    latchBusy = false; latched = 0;
    combat?.attach(g);
    combat?.reset();
    const skips = opts.grace?.skip;
    if (skips) g.onSkip = (pc) => flow.grace.active && flow.state.playing && skips.includes(pc);
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
    // Autosave: when the main loop reaches its wait (a clean point to save and resume at).
    g.onWait = (site) => {
      if (site !== opts.port.mainLoopWait) return;
      // Going to a place picked on the pause map: the game's own code takes the player there.
      const travel = fe.going !== null && !!map.go;
      const to = fe.going;
      if (to !== null && map.go) { flow.grace.start(); runner.call(() => map.go?.(to, g.m.ram, fe.found)); fe.going = null; }
      latchEnded(g);
      // Running: the player's own handling goes once more, in the main loop's pass as the game's
      // own does (at the frame's start, its scroll register writes would land on the header's split).
      if (running && runPlayer) runner.call(runPlayer);
      // Knockback (an assist): his own movement, pushed away from what hit him, a step or two more.
      if (knock && runPlayer) for (let i = 0; i < COMBAT_TIMING.knockSteps; i++) runner.call(runPlayer);
      // 8-way controls (an assist): his own step into the picture for a diagonal (controls.ts).
      if (eightWay && assist.eightWay && flow.state.playing) {
        eightWay.beforeFrame(g.m.ram, stick, runner);
      }
      const st = status(g);
      // a new game (play beginning, not from a save): the save so far is kept as the previous one, nothing found yet
      if (!flow.state.playing && !resuming && !st.onTitle && st.room !== null) fe.newGame();
      // the map notes what's been found (and puts the player where a place picked on it says)
      // before the autosave: the save on coming into a room has him where he is, and the map with it
      if (st.room !== null) map.observe(g.m.ram, fe.found, g.m.vic);
      // (`safe`: the room's save as it was when he found his feet there, once he's lived a moment after
      // it; a life lost just as he goes somewhere picked on the map: he goes there)
      if (opts.safe && st.room !== null) st.save = arrival(g, st.room, travel);
      if (flow.after(st)) fireLatch.hold(); // play just began: the start button isn't a jump
      resuming = false;
    };
  };

  void fetch(opts.state)
    .then((r) => r.arrayBuffer())
    .then((b) => {
      titleState = new Uint8Array(b);
      start(new NativeHost(opts.port, withText(unpackState(titleState))));
    });

  /** The game's memory with our text in (`text`): the title snapshot, and a save resumed (made before the text last changed, its title would show the old). */
  function withText(state: MachineState) {
    for (const [addr, text] of Object.entries(opts.text ?? {})) {
      for (let i = 0; i < text.length; i++) state.ram[Number(addr) + i] = text.charCodeAt(i);
    }
    // (a save from before a mend: the mended bytes from the title snapshot)
    if (opts.mends?.length && titleState) applyMends(state.ram, unpackState(titleState).ram, opts.mends);
    return state;
  }

  // (V is a key of the game's own keyboard here, not the authentic-pixel-steps switch)
  const audio = new AudioKeys({ canvas, input, renderer, player: sound, snapKey: false, started: () => sound.startStream() });

  // Options (the gear) and the pause screen: games/shared/frontend.ts.
  const fe: FrontEnd<Uint8Array, F> = new FrontEnd<Uint8Array, F>({
    id: opts.id, input, renderer, map,
    assists: [
      ...(opts.health ? [{ id: 'health', long: 'FULL HEALTH/ROOM' }] : []),
      ...(opts.lives ? [{ id: 'lives', long: 'INFINITE LIVES', role: 'never' as const }] : []),
      ...(opts.hints && !opts.hintsWith ? [{ id: 'hints', long: 'HINTS (SPARKLES)' }] : []),
      ...(opts.assists ?? []).map((a) => ({ id: a.id, long: a.long, default: a.default })),
      ...(opts.combat ? [
        { id: 'effects', long: 'EFFECTS', role: 'always' as const },
        { id: 'glow', long: 'WARNING GLOW', role: 'never' as const },
        { id: 'invulnerable', long: 'SAFE AFTER A HIT' },
        { id: 'knockback', long: 'KNOCKBACK' },
        { id: 'hitStop', long: 'HIT-STOP' },
      ] : []),
      ...(opts.controls ? [{ id: 'eightWay', long: '8-WAY CONTROLS' }] : []),
      ...(opts.safe ? [{ id: 'respawn', long: 'NO DEATH LOOPS' }] : []),
      // running, where it's part of ENHANCED
      ...(opts.run?.enhanced ? [{ id: 'run', long: 'RUN (SHIFT)' }] : []),
    ],
    font: () => flow.getFont(),
    saves: flow,
    onClose: () => fireLatch.hold(),
  });
  /** The HD view's rooms (built again only when the room's part of the picture changes). */
  const rooms = opts.hd ? new HdRooms(opts.hd, hdRefresher()) : null;
  /** The HD view, as the shell's C64/HD switch sets it. */
  const hdView: HdView = { on: false };
  /** Whether the HD view's room is drawn now (set each frame of the game; drawn between them as the sprites are: `rooms.at`). */
  let hdShown = false;
  const assist = fe.assist;
  opts.onAssists?.(assist);
  const combat = opts.combat ? new Combat(opts.combat, () => ({
    effects: !!assist.effects, glow: !!assist.glow, invulnerable: !!assist.invulnerable, knockback: !!assist.knockback, hitStop: !!assist.hitStop, grace: flow.grace.active && flow.state.playing,
  })) : null;
  const eightWay = opts.controls ? new EightWay(opts.controls) : null;
  /** Running translated code between frames (registers kept). */
  const runner: Runner = { call(fn) { const regs = { ...cpu }; fn(); Object.assign(cpu, regs); } };
  /** The stick as the game gets it this frame (1 = held), and the knockback's push. */
  let stick = 0, knock = 0;
  /** `latch`: whether the move was under way last frame, and the stick bits ignored until let go. */
  let latchBusy = false, latched = 0, wanted = 0;
  let healthRoom = -1; // (the room the health assist last filled up in)
  let resuming = false;
  /** The room (and screen) he's in (`safe`): its save, taken when he was first steady there; passes lived since; the lives then. */
  let arrived: { room: number; save: MachineState | null; n: number; lives: number } | null = null;
  /** A life lost before the room's save was kept (ENHANCED, `safe`): back to the last save kept, after this frame. */
  let respawn = false;
  /** The room's save (`safe`) as the autosave sees it: none until he's lived a moment after finding his feet. */
  function arrival(g: NativeHost, room: number, travel: boolean): () => MachineState | null {
    const safe = opts.safe, ram = g.m.ram;
    if (!safe) return () => g.save();
    const lives = safe.lives.get(ram), was = arrived;
    // a life lost (the game may have started him again in another room: where a fall began)
    if (was && lives < was.lives) {
      // in ENHANCED, before he'd lived a moment where he was: not where the game starts him again
      if (was.n < SAFE_PASSES && assist.respawn && flow.state.playing && !travel) respawn = true;
      was.save = null; was.n = 0;
    }
    const a: NonNullable<typeof arrived> = was?.room === room ? was : { room, save: null, n: 0, lives };
    arrived = a;
    a.lives = lives;
    if (!a.save) a.save = safe.steady(ram, fe.found) ? g.save() : null;
    else a.n++;
    return () => (a.n >= SAFE_PASSES ? a.save : null);
  }
  let running = false; // Shift is held in play
  /** The press that started (or continued) the game: ignored until it's released. */
  const fireLatch = new FireLatch();
  /** A name picked on a touch screen (`names`), and its keys, one at a time. */
  const picker = opts.names ? new NamePicker(opts.names.spec) : null;
  const pacer = new KeyPacer(3, 4);
  let picking = false;
  /** Keys reach the game as taps: a press holds its C64 key for a few frames, however long it's held. */
  const taps = new Map<string, number>();
  const TAP_FRAMES = 3;

  // A new screen: most of the playfield redrawn at once. Saves are per screen (not just per
  // room), so continuing comes back where the player came in.
  let screens = 0;
  let lastScreen = new Uint8Array(0);
  const watchScreen = (g: NativeHost) => {
    const m = g.m, at = (3 - (m.cia2.pra & 3)) * 0x4000 + ((m.vic[0x18] >> 4) & 15) * 0x400;
    const now = m.ram.slice(at + 2 * 40, at + 20 * 40);
    let changed = 0;
    if (lastScreen.length) for (let i = 0; i < now.length; i++) if (now[i] !== lastScreen[i]) changed++;
    if (changed > now.length * 0.5) screens++;
    lastScreen = now;
  };
  const status = (g: NativeHost) => ({
    machine: g.m,
    onTitle: typeof opts.titleWaits === 'function' ? opts.titleWaits(g.m.ram) : opts.titleWaits.includes(g.lastWait),
    room: g.lastWait === opts.port.mainLoopWait ? opts.room(g.m.ram) * 4096 + (screens & 0xfff) : null,
    save: () => g.save(),
  });

  let actionFire = false;
  /** The action a key picked, still to be selected (a key pressed in a frame the game waited: hit-stop). */
  let picked: number | null = null;
  /** Whether a key reaches the game's keyboard as itself (not remapped, not kept from it). */
  const toKeyboard = (code: string) => !opts.remap?.[code] && !reserved.has(code) && !PAUSE_KEYS.includes(code) && !!C64_KEYS[code];
  /** The keys pressed since the last frame that pick an action: straight to one, or the next one along. */
  function pickActions(g: NativeHost) {
    const a = opts.actions;
    if (!a || !flow.state.playing || flow.holding) { picked = null; return; }
    for (const code of input.typed) {
      const n = a.keys[code];
      if (n !== undefined) picked = n;
      else if (a.next && toKeyboard(code)) {
        const { order, get } = a.next, at = order.indexOf(picked ?? get(g.m.ram));
        picked = order[(at + 1) % order.length];
      }
    }
  }
  /** Direct action keys: select the action picked (and, if it's that kind, hold fire while its key is down). */
  function actionKeys(g: NativeHost) {
    actionFire = false;
    const a = opts.actions;
    if (!a || !flow.state.playing) return;
    if (picked !== null) { a.set(g.m.ram, picked, (fn) => g.callNative(fn)); picked = null; }
    if (a.also === 'fire') for (const code of Object.keys(a.keys)) if (input.down.has(code)) actionFire = true;
  }

  /** The keys and stick into the machine for a frame of the game. */
  function feedInput(g: NativeHost, blocked: boolean) {
    const m = g.m;
    m.keys = [];
    let joy = 0x1f;
    if (!blocked) {
      actionKeys(g);
      if (actionFire) joy &= ~16;
      // (in play, the keys that move the hand on are the front end's: pickActions)
      const handKeys = !!opts.actions?.next && flow.state.playing;
      // a name asked for, on a touch screen: the touch controls pick it (the keyboard types as ever)
      picking = !!picker && !!opts.names && input.touch && opts.names.asking(m.ram, g.lastWait);
      let typed: readonly string[] = input.typed;
      if (picker && picking) { const r = picker.frame(input); pacer.push(r.keys); typed = r.typed; }
      else { picker?.reset(); pacer.clear(); }
      const key = pacer.next();
      const kk = key === null ? undefined : C64_KEYS[nameKeyCode(key)];
      if (kk) m.keys.push(kk);
      for (const code of typed) if (!PAUSE_KEYS.includes(code) && !(handKeys && toKeyboard(code))) taps.set(code, TAP_FRAMES);
      for (const [code, left] of taps) {
        if (left <= 0) { taps.delete(code); continue; }
        taps.set(code, left - 1);
        const mapped = opts.remap?.[code];
        if (!mapped && reserved.has(code)) continue;
        const k = C64_KEYS[mapped ?? code];
        if (k) m.keys.push(k);
      }
      if (picking) fireLatch.hold(); // (the stick and the button are the picker's)
      else {
        if (input.held.up) joy &= ~1;
        if (input.held.down) joy &= ~2;
        if (input.held.left) joy &= ~4;
        if (input.held.right) joy &= ~8;
      }
      if (fireLatch.filter(input.held.fire)) joy &= ~16;
    }
    stick = ~joy & 0x1f;
    let bits = stick;
    if (eightWay && assist.eightWay && flow.state.playing && !blocked) bits = eightWay.input(m.ram, stick);
    // knockback: the stick held away from what hit him (the player's own input waits)
    knock = combat && flow.state.playing && !blocked ? combat.knockback(combat.events) : 0;
    if (knock) bits = knock;
    if (opts.latch && fe.enhanced && flow.state.playing && !blocked) {
      const busy = opts.latch.busy(m.ram);
      if (latchBusy && !busy) latched = bits & opts.latch.bits;
      latchBusy = busy;
      wanted = bits;
      bits = unlatched(bits);
    } else wanted = bits;
    putStick(m, bits);
  }

  /** The stick as the game reads it (both ports' lines). */
  function putStick(m: { joy1: number; joy2: number }, bits: number) {
    const joy = 0x1f & ~bits;
    m.joy1 = opts.joyPort === 2 ? 0x1f : joy;
    m.joy2 = opts.joyPort === 1 ? 0x1f : joy;
  }

  /** `latch`: the stick without the bits held since the move ended (let go of, they're free again). */
  function unlatched(bits: number) {
    latched &= bits;
    return bits & ~latched;
  }

  /**
   * `latch`, in the frame the move ends: the passes that follow in it (running's second go at his
   * handling) must not read the stick as held either, or they walk him back where he came from.
   */
  function latchEnded(g: NativeHost) {
    if (!opts.latch || !fe.enhanced || !flow.state.playing || !latchBusy || opts.latch.busy(g.m.ram)) return;
    latchBusy = false;
    latched = wanted & opts.latch.bits;
    putStick(g.m, unlatched(wanted));
  }

  /** After each frame of the game: combat, the screen watched, the assists. */
  function afterGameFrame(g: NativeHost) {
    // Combat: what the game's code reported this frame, as effects and sounds (combat.ts).
    if (combat && !flow.holding) {
      const events = flow.state.playing ? combat.afterFrame(g.m) : [];
      if (!flow.state.playing) combat.events = [];
      combat.present(g.m, events, renderer.effects.model, (n) => sound.sfx(n), performance.now());
      combat.stopFrames(events);
    }
    if (!flow.holding) watchScreen(g);
    // Assists: full health on coming into each room; lives stay full.
    if (assist.lives && opts.lives && g.lastWait === opts.port.mainLoopWait && flow.state.playing) opts.lives(g.m.ram);
    for (const a of opts.assists ?? []) a.apply?.(g.m.ram, !!assist[a.id] && flow.state.playing, fe.found);
    if (flow.grace.active && flow.state.playing) opts.grace?.keep?.(g.m.ram);
    opts.afterFrame?.(g.m.ram);
    if (assist.health && opts.health && g.lastWait === opts.port.mainLoopWait && flow.state.playing) {
      const room = opts.room(g.m.ram);
      if (room !== healthRoom) {
        healthRoom = room;
        const h = opts.health, now = h.get(g.m.ram);
        if (now > 0 && now < h.max) h.set(g.m.ram, g.m.colour, h.max);
      }
    }
  }

  /** The machine's picture into the renderer: laid out as the game declares (`layout`) while it's the picture that's for. */
  function show(g: NativeHost, v: C64View) {
    renderer.layout = opts.layout?.find((l) => l.when(g.m))?.picture ?? null;
    v.update();
    // the HD view: the room lit in 3D while play shows (not on the title, a pause screen or CONTINUE?)
    hdShown = !!rooms && hdView.on && flow.state.playing && !flow.covering && !fe.holding;
    if (rooms && hdShown) rooms.room(g.m.ram, g.m.capture, renderer.layout, v.picture);
    renderer.hd.room = rooms && hdShown ? rooms.at(1, renderer.snap) : null;
    if (picking && picker && opts.names) {
      // the letter under the cursor (the game's placeholder there taken out), and the line naming our controls
      const font = flow.getFont(), at = opts.names.cursor(g.m.ram), ch = picker.pending;
      if (ch && !pacer.busy) drawPending(renderer.screen, font, ch, at.col * 8, at.row * 8, 7, (g.m.capture.rows[at.row]?.bg[0] ?? g.m.vic[0x21]) & 15);
      font.drawCentred(renderer.screen, picker.hint, opts.names.hintY, 7);
    }
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
    tick() {
      audio.tick();
      const g = game, v = view;
      if (!g || !v) return;
      // The pause screen: the game waits; P, Esc or Start go back; E switches.
      const st0 = status(g);
      // (not while a name is typed: the game's screen asking for it is between play and the title)
      fe.pauseKey(g.m.ram, !flow.holding && !st0.onTitle && flow.state.playing && !opts.names?.asking(g.m.ram, g.lastWait));
      if (fe.paused) {
        asked(fe.pausedTick(g.m.ram, () => show(g, v)));
        return;
      }
      const resume = flow.before(st0);
      if (resume) {
        opts.fullHealth?.(resume.ram, resume.colour, assist); // continuing: back to full health
        const r = NativeHost.resume(opts.port, withText(resume));
        start(r);
        flow.resumed(resume, opts.room(resume.ram) * 4096 + (screens & 0xfff));
        resuming = true;
        fireLatch.hold();
        return;
      }
      // (a life lost before he'd lived a moment in the room, in ENHANCED: back to the last save kept)
      if (respawn) { respawn = false; respawnAtSave(g); return; }
      pickActions(g);
      // Hit-stop (an assist): the game waits a few frames when an enemy is destroyed (the effects go on).
      if (combat && combat.hitStop > 0 && flow.state.playing && !flow.holding) { combat.hitStop--; flow.draw(); return; }
      // Running (Shift held, or the touch RUN key on, in play; in ENHANCED for some): the player's own
      // handling once more a frame (see onWait).
      running = !!runPlayer && !flow.holding && flow.state.playing && RUN_KEYS.some((k) => input.down.has(k)) && (!opts.run?.enhanced || !!assist.run);
      feedInput(g, flow.holding || flow.launching);
      if (!flow.holding) { g.tick(); if (flow.state.playing) flow.grace.tick(); }
      sound.pushFrame(g.m.sidWrites);
      afterGameFrame(g);
      show(g, v);
      flow.draw();
    },
    render(alpha: number) {
      if (!view) return;
      // The game is stopped on these screens: so is its music (rather than a held note).
      sound.hold(flow.covering || fe.holding);
      // Hints: sparkles where something can be done (only in play)
      const hints = opts.hints, showHints = assist[opts.hintsWith ?? 'hints'] && flow.state.playing && !flow.holding && !fe.holding;
      renderer.sparkles?.set(showHints && hints && game ? hints(game.m.ram, game.m.vic) : []);
      renderer.effects.enabled = !!combat && !!assist.effects && !flow.holding && !fe.holding;
      // (the HD view's room scrolled as far along as the sprites are drawn: the same alpha, the same smoothing)
      renderer.hd.room = rooms && hdShown ? rooms.at(alpha, renderer.snap) : null;
      view.render(alpha);
      if (flow.covering || fe.holding) { renderer.hideSprites(); renderer.render(); }
    },
    /** The gear: the game's options. */
    menu() {
      if (!game) return;
      fe.menu(game.m.ram, flow.state.playing && !flow.holding);
    },
  };

  /** What the pause screen (or the options) asked for. */
  function asked(r: PauseRequest) {
    if (r === 'roomStart') backToRoomStart();
    else if (r === 'title') backToTitle();
  }

  /** Back to the title (the game as it starts, from its snapshot); the save stays, for ENTER CONTINUE. */
  function backToTitle() {
    if (!titleState) return;
    start(new NativeHost(opts.port, withText(unpackState(titleState))));
    flow.toTitle();
    fe.wentBack();
    fireLatch.hold();
  }

  /** Back to how things were on coming into this room (out of a trap the game has no way out of). */
  function backToRoomStart() {
    const s = flow.saved();
    if (!s || !flow.state.playing) return;
    resumeFrom(s);
    fireLatch.hold();
    fe.wentBack();
  }

  /**
   * ENHANCED (`safe`): a life lost before he'd lived a moment in the room (he came in falling to his
   * death, or the game started him again where he dies at once): back to the last save kept instead
   * (where he had), with the lives as they are now. A life is lost once, not every one.
   */
  function respawnAtSave(g: NativeHost) {
    const s = flow.saved();
    if (!s || !opts.safe) return;
    opts.safe.lives.set(s.ram, opts.safe.lives.get(g.m.ram));
    resumeFrom(s);
  }

  /** The game going on from a save. */
  function resumeFrom(s: MachineState) {
    start(NativeHost.resume(opts.port, withText(s)));
    flow.resumed(s, opts.room(s.ram) * 4096 + (screens & 0xfff));
    resuming = true;
  }
}

/** The game's touch controls, plus RUN for games that can run (Shift, on or off). */
function touchLayout(opts: Pick<NativeGameOptions<unknown>, 'touch' | 'run'>): TouchLayout {
  const t = opts.touch ?? { stick: '8', buttons: [{ label: 'FIRE', key: 'Space', size: 'big' }] };
  return opts.run ? { ...t, buttons: [...t.buttons, { label: 'RUN', key: 'ShiftLeft', size: 'small', mode: 'toggle' }] } : t;
}

/** A key of a name picked on a touch screen, as the keyboard key that types it (KeyboardEvent.code). */
function nameKeyCode(k: NameKey) {
  if (k === DEL || k === RETURN) return k;
  if (k === ' ') return 'Space';
  if (k === '.') return 'Period';
  if (k === '-') return 'Minus';
  if (k >= '0' && k <= '9') return `Digit${k}`;
  return `Key${k}`;
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
