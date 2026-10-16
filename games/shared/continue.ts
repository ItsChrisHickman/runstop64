import { BitmapFont, KIT_GLYPHS, packState, unpackState, type C64Machine, type Input, type MachineState, type Renderer } from 'c64kit';
import { FLOW_LAYOUT, initialState, panelTop, readIntent, step, stripText, type FlowState, type TitleStrip } from './continue-step';
import { Grace } from './grace';
import type { FoundCodec } from './native/pause';
import { fromBase64, keepFound, readFound, readSaves, startNewGame, tidySummary, toBase64, writeCurrent } from './saves';

/**
 * Autosave and continue for every game here (native rewrites, native ports, the original code),
 * in the spirit of the Monty remake:
 *
 * - progress is saved in the browser each time the player enters a new room, through the one
 *   storage module (games/shared/saves.ts), which also keeps the save as it stood before the
 *   last new game began (the save manager, games/saves.ts, can swap it back);
 * - games always continue: launched with a save, the game goes straight back into play where it
 *   was (the title is only shown without a save, or when asked for: T on the pause screen);
 * - the title offers ENTER CONTINUE (Space or fire start a new game, which keeps the save as the
 *   previous one), and a new game over a save asks first: NEW GAME? (Space or fire again yes, Esc or
 *   a tap no, Enter continues). A press (or a jump still held) as the last life goes, before
 *   CONTINUE? is up, brings CONTINUE? up rather than starting a game;
 * - after losing, "CONTINUE?" (Enter yes, Esc no; it waits for an answer) goes back to the last
 *   room entered, as it was then. Not offered after F1/R (a restart on purpose). A game won
 *   keeps its save too: what's left to find can still be found;
 * - a new game, however it begins (from the title, straight after a restart with R or F1, after
 *   the last life), goes through `beginNewGame`: the save so far is kept as the previous one.
 *
 * What's shown is drawn over the game's picture, never into its memory (games
 * read their screens for collisions), and never on a box: the title's line goes
 * where the game says its title has room for it, in a colour that reads there;
 * CONTINUE? (and the options) is a screen of its own, the game held behind it.
 *
 * Saves are C64 machine states by default; a port with its own state (a native
 * rewrite) gives a `codec` to turn its saves into bytes and back.
 */
export interface SaveCodec<S> {
  pack(s: S): Uint8Array;
  unpack(b: Uint8Array): S;
}

/** Saves as c64kit machine states (games running on the C64 machine). */
export const MACHINE_CODEC: SaveCodec<MachineState> = { pack: packState, unpack: unpackState };

export interface ContinueOptions<S, F> {
  /** Storage key prefix, e.g. 'entombed'. */
  id: string;
  renderer: Renderer;
  input: Input;
  /** Panels in the game's own title-screen font (from its charset), the kit's, or one the game gives. */
  font?: 'game' | 'kit' | BitmapFont;
  /** How saves become bytes (MACHINE_CODEC for c64kit's machine states). */
  codec: SaveCodec<S>;
  /** Keys that restart a game on purpose (no CONTINUE? after them; default F1 and R; none for games that type names). */
  restartKeys?: string[];
  /** Where the title's ENTER CONTINUE line goes: a row the title leaves empty (TitleStrip). */
  strip?: TitleStrip;
  /** How what the player has found (the map's progress, kept with each save) is read back: the map's `found`. */
  found: FoundCodec<F>;
  /**
   * What a save says about the game's progress, for the save manager: where (a room or place
   * name) first, then how it's doing (lives, items found); short parts, tidied by `tidySummary`.
   * `found`: what had been found then (the map's progress).
   */
  describe?(save: S, found: F): string[];
  /** Launched with a save, straight back into play (default true). */
  continueOnLaunch?: boolean;
}

/** The part of the save history the front end drives (FrontEnd's `saves`): a new game, and what's been found. */
export interface SaveHistory<F> {
  /** A new game begins: the current save is kept as the previous one, with what had been found. */
  beginNewGame(found: F): void;
  /** Where what's been found (the map's progress) is, for describing saves. */
  watchFound(get: () => F): void;
}

export type { TitleStrip };

/** What the game is doing this tick, as the caller sees it. */
export interface GameStatus<S = MachineState> {
  /** The C64 the game runs on, if it does (for the panels' font from its title screen). */
  machine?: C64Machine;
  /** The title screen is up. */
  onTitle: boolean;
  /** At a point where a save can be taken (a frame boundary in play), the room the player is in; else null. */
  room: number | null;
  /** Take a save now (only called when `room` isn't null). */
  save(): S | null;
}

export class ContinueFlow<S, F> implements SaveHistory<F> {
  /** What the flow knows, changed only by whole new values (`step` for the tick before the game's, the methods below for the rest). */
  private st: FlowState;
  private font: BitmapFont | null = null;
  /** Which question the last save came back from. */
  private answer: 'title' | 'continue' | null = null;
  /** The rooms entered in the game the last save read was from. */
  private loadedRooms = 0;
  private foundNow: () => F;

  /** A moment's grace after every resume (grace.ts); the game ticks it each frame of play. */
  readonly grace = new Grace();
  private readonly codec: SaveCodec<S>;
  private readonly restartKeys: readonly string[];

  constructor(private readonly opts: ContinueOptions<S, F>) {
    this.codec = opts.codec;
    this.restartKeys = opts.restartKeys ?? ['F1', 'KeyR'];
    this.foundNow = () => opts.found.parse(readFound(opts.id));
    this.st = initialState(this.load() !== null, opts.continueOnLaunch !== false);
    this.describeOld();
  }

  /** For tests. */
  get state() {
    const { kind } = this.st.screen;
    return { prompt: kind === 'title' || kind === 'continue' || kind === 'newGame' ? kind : null, playing: this.st.playing, hasSave: this.st.hasSave, launching: this.launching };
  }
  /** A question is up (CONTINUE?, NEW GAME?): the game waits, and its sprites are hidden. */
  get holding() { return this.st.screen.kind === 'continue' || this.st.screen.kind === 'newGame'; }
  /** Launched with a save, on the way back into play: the screen is kept black and keys don't reach the title. */
  get launching() { return this.st.screen.kind === 'launching'; }
  /** A screen of the flow's covers the game's picture (CONTINUE?, or a launch on its way back into play): sprites hidden, music held. */
  get covering() { return this.holding || this.launching; }
  /** Which question the last save came back from: ENTER CONTINUE on the title (or a launch), or CONTINUE? after losing. */
  get lastAnswer() { return this.answer; }

  watchFound(get: () => F) { this.foundNow = get; }

  /**
   * Before the game's tick. Returns a save to resume from when the player chose
   * to continue (the caller restarts the game from it, then calls `resumed`).
   */
  before(g: GameStatus<S>): S | null {
    const kitOnly = this.opts.font instanceof BitmapFont || this.opts.font === 'kit' || !g.machine;
    // (for games whose panels use the font of their title, once it has been taken: half a second later, the screen kept black)
    const { state, resume } = step(this.st, readIntent(this.opts.input, this.stripAt, this.restartKeys), { onTitle: g.onTitle, launchWait: kitOnly ? 1 : 26 });
    this.st = state;
    if (state.titleTicks === 25 && !this.font) this.font = this.opts.font instanceof BitmapFont ? this.opts.font : this.opts.font === 'kit' || !g.machine ? kitFont() : gameFont(g.machine);
    if (!resume) return null;
    const s = this.load();
    if (s) this.answer = resume;
    return s;
  }

  /**
   * A new game begins, however it came about (a new game from the title, after a restart with R or
   * F1, after the last life, after T on the pause screen): FrontEnd.newGame calls this, before
   * what's been found is cleared; so does the first save of a game not resumed from one. The
   * current save is kept as the previous one (saves.ts `startNewGame`). Said twice for the same
   * new game (nothing of it saved yet), the second time changes nothing; a game that has saved is
   * kept even if play never seemed to end (a new game started from a title still busy).
   */
  beginNewGame(found: F) {
    if (this.st.fresh && this.st.rooms === 0) return;
    startNewGame(this.opts.id, found);
    this.st = { ...this.st, fresh: true, over: false, rooms: 0, lastRoom: -1, screen: { kind: 'open' }, hasSave: false };
  }

  /**
   * Back to the title on the player's say-so (T on the pause screen): the save stays, the title
   * offers ENTER CONTINUE, and only a new game started there begins a new history entry.
   */
  toTitle() {
    // (play has ended already: no CONTINUE?, this was on purpose)
    this.st = { ...this.st, playing: false, fresh: false, over: false, lastRoom: -1, screen: { kind: 'open' }, titleTicks: 0 };
  }

  /** The latest save (taken on coming into the room the player is in). */
  saved(): S | null { return this.load(); }

  /** The game was restarted from a save. */
  resumed(s: S, room: number) {
    this.st = { ...this.st, lastRoom: room, playing: true, fresh: false, over: false, rooms: this.loadedRooms, titleTicks: 0, screen: { kind: 'open' } };
    this.grace.start();
    void s;
  }

  /** After the game's tick: autosave on entering a new room. Returns true when play has just begun. */
  after(g: GameStatus<S>): boolean {
    if (g.onTitle || g.room === null) return false;
    const started = !this.st.playing;
    this.st = { ...this.st, playing: true };
    if (started) this.beginNewGame(this.foundNow());
    if (g.room !== this.st.lastRoom) {
      const s = g.save();
      if (s) { this.write(s); this.st = { ...this.st, hasSave: true, lastRoom: g.room }; }
    }
    return started;
  }

  /** Draw the panels (after the picture is drawn into the renderer's screen). */
  draw() {
    const { kind } = this.st.screen;
    if (kind === 'launching') { this.opts.renderer.screen.clear(0); return; } // (the title, on the way back into play: not shown)
    if (!this.font) return;
    const touch = this.opts.input.touch;
    if (kind === 'title') this.strip(touch);
    else if (kind === 'newGame') this.panel(touch ? ['NEW GAME?', '', 'FIRE YES        TAP NO'] : ['NEW GAME?', '', 'SPACE YES     ESC NO', '', 'ENTER CONTINUE']);
    else if (kind === 'continue') this.panel(['CONTINUE?', '', touch ? 'YES              NO' : 'ENTER YES     ESC NO']);
  }

  private load(): S | null {
    const slot = readSaves(this.opts.id).current;
    if (!slot) return null;
    try {
      const s = this.codec.unpack(fromBase64(slot.data));
      this.loadedRooms = slot.rooms;
      return s;
    } catch { return null; }
  }

  private write(s: S) {
    try {
      this.st = { ...this.st, rooms: this.st.rooms + 1 };
      const found = this.foundNow();
      writeCurrent(this.opts.id, { data: toBase64(this.codec.pack(s)), at: Date.now(), summary: this.summary(s, found), rooms: this.st.rooms });
      // what's been found goes with it (the map's progress: rooms, places to travel to), so the
      // game continued later has the map as it was, not as it was when the pause screen last closed
      keepFound(this.opts.id, found);
    } catch { /* a save that won't pack: no autosave */ }
  }

  /** What the game says about a save (nothing if it says nothing, or can't). */
  private summary(s: S, found: F): string[] {
    try { return tidySummary(this.opts.describe?.(s, found) ?? []); } catch { return []; }
  }

  /** A save from before saves were described (moved from the old single save): described now. */
  private describeOld() {
    const slot = readSaves(this.opts.id).current;
    if (!slot || slot.summary.length || !this.opts.describe) return;
    try {
      const summary = this.summary(this.codec.unpack(fromBase64(slot.data)), this.opts.found.parse(readFound(this.opts.id)));
      if (summary.length) writeCurrent(this.opts.id, { ...slot, summary });
    } catch { /* not one this game reads */ }
  }

  private get stripAt(): TitleStrip { return this.opts.strip ?? { y: FLOW_LAYOUT.strip.y }; }

  /** The title's line: the letters alone, where the game says. */
  private strip(touch: boolean) {
    const strip = this.stripAt;
    if (strip.when && !strip.when()) return;
    const text = stripText(strip, touch);
    this.getFont().draw(this.opts.renderer.screen, text, Math.floor((strip.x ?? FLOW_LAYOUT.strip.mid) - (text.length * FLOW_LAYOUT.glyph) / 2), strip.y, strip.colour ?? 1);
  }

  /** The font panels use (the game's own once its title has shown, else the kit's). */
  getFont(): BitmapFont { return this.font ?? (this.opts.font instanceof BitmapFont ? this.opts.font : kitFont()); }

  /**
   * A screen of its own (CONTINUE?, the game's options): the picture cleared to black (the game
   * held behind it), the lines in the middle, the first in yellow. No box over the game's picture.
   */
  panel(lines: string[]) {
    const font = (this.font ??= this.opts.font instanceof BitmapFont ? this.opts.font : kitFont());
    const s = this.opts.renderer.screen;
    s.clear(0);
    const y = panelTop(lines.length), { screen, lineStep, glyph } = FLOW_LAYOUT;
    lines.forEach((l, i) => font.draw(s, l, Math.floor((screen.w - l.length * glyph) / 2), y + i * lineStep, i === 0 ? 7 : 1));
  }
}

const kitFont = () => new BitmapFont().addDrawn(KIT_GLYPHS);

/**
 * The font the game's title screen uses (from its charset), topped up with the kit's.
 * Letters cut out of solid blocks (the Pendragon games' status lines) are turned the
 * other way round, so the panels show coloured letters with nothing behind them.
 */
function gameFont(m: C64Machine) {
  const row = m.capture.rows.find((r) => r && r.codes.some((c) => c >= 1 && c <= 26));
  const font = new BitmapFont();
  if (row) {
    const at = row.bank + ((row.d018 >> 1) & 7) * 0x800;
    let charset = m.ram.slice(at, at + 0x800);
    // cut out of blocks: the letters A-Z have a solid top or bottom row (bold letters can be mostly lit too)
    let solid = 0;
    for (let c = 1; c <= 26; c++) if (charset[c * 8] === 0xff || charset[c * 8 + 7] === 0xff) solid++;
    const cutOut = solid >= 20;
    if (cutOut) charset = charset.map((b) => b ^ 0xff);
    // (those games keep their 0 at $3A, as their status lines do; so does Dragonskulle's title, whose
    // $30 is a picture: the digits 1-9 have an empty top row, and its $30 hasn't where $3A has)
    const digitsTop = [1, 2, 3, 4, 5, 6, 7, 8, 9].every((d) => charset[(0x30 + d) * 8] === 0);
    const zeroAt3a = cutOut || (digitsTop && charset[0x30 * 8] !== 0 && charset[0x3a * 8] === 0);
    // (their charsets have no Q: that cell is a picture)
    font.addFromCharsetMapped(charset, cutOut ? 'ABCDEFGHIJKLMNOPRSTUVWXYZ0123456789' : 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789', (c) => (zeroAt3a && c === 0x30 ? 0x3a : c >= 0x40 ? c - 0x40 : c));
  }
  return font.addDrawn(KIT_GLYPHS);
}
