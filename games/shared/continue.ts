import { BitmapFont, KIT_GLYPHS, packState, unpackState, type C64Machine, type Input, type MachineState, type Renderer } from 'c64kit';
import { Grace } from './grace';
import { fromBase64, keepFound, readFound, readSaves, startNewGame, tidySummary, toBase64, writeCurrent, type Found } from './saves';

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

export interface ContinueOptions<S = MachineState> {
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
  /**
   * What a save says about the game's progress, for the save manager: where (a room or place
   * name) first, then how it's doing (lives, items found); short parts, tidied by `tidySummary`.
   * `found`: what had been found then (the map's progress).
   */
  describe?(save: S, found: Found): string[];
  /** Launched with a save, straight back into play (default true). */
  continueOnLaunch?: boolean;
}

/** The part of the save history the front end drives (FrontEnd's `saves`): a new game, and what's been found. */
export interface SaveHistory {
  /** A new game begins: the current save is kept as the previous one, with what had been found. */
  beginNewGame(found: Found): void;
  /** Where what's been found (the map's progress) is, for describing saves. */
  watchFound(get: () => Found): void;
}

/**
 * Where the title's ENTER CONTINUE line goes: letters only, no box behind them, so it has to be
 * a place the title leaves empty (each game declares one: its title rendered, the row looked at).
 */
export interface TitleStrip {
  /** The letters' top line. */
  y: number;
  /** Their colour (default white): one that reads on the title's background there. */
  colour?: number;
  /** The middle of the line (default 160: the screen's). */
  x?: number;
  /** Only ENTER CONTINUE (where there's no room for the whole line, and the title says what starts a game). */
  short?: boolean;
  /** Shown only while this holds (a title of several pages: the one with room); Enter continues on any. */
  when?(): boolean;
}

/** The title's line, for a keyboard or a touch screen. */
function stripText(strip: TitleStrip, touch: boolean) {
  if (strip.short) return touch ? 'TAP  CONTINUE' : 'ENTER  CONTINUE';
  return touch ? 'TAP: CONTINUE    FIRE: NEW GAME' : 'ENTER  CONTINUE    SPACE  NEW GAME';
}

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

/** How long a launch waits for the game's title before giving up on going straight back into play. */
const LAUNCH_TICKS = 10 * 50;

export class ContinueFlow<S = MachineState> implements SaveHistory {
  private prompt: { kind: 'title' | 'continue' | 'newGame'; ticks: number } | null = null;
  private playing = false;
  private lastRoom = -1;
  private hasSave: boolean;
  private restartAsked = 1000;
  private fireWasDown = true;
  private titleTicks = 0;
  /** NEW GAME? answered yes: the press goes to the game's title (until it's let go). */
  private startOk = false;
  private font: BitmapFont | null = null;
  private answer: 'title' | 'continue' | null = null;
  /** Launched with a save: going straight back into play once the game is up (ticks waited). */
  private launch: number | null;
  /** A new game has begun (its saves start a new history entry); cleared when play ends. */
  private fresh = false;
  /** Play has just ended (the title came back): CONTINUE? is offered once the title has been up a moment. */
  private over = false;
  /** Rooms entered in this game (kept with each save), and the last save read's. */
  private rooms = 0;
  private loadedRooms = 0;
  private foundNow: () => Found;

  /** A moment's grace after every resume (grace.ts); the game ticks it each frame of play. */
  readonly grace = new Grace();
  private readonly codec: SaveCodec<S>;

  constructor(private readonly opts: ContinueOptions<S>) {
    this.codec = opts.codec;
    this.foundNow = () => readFound(opts.id);
    this.hasSave = this.load() !== null;
    this.launch = this.hasSave && opts.continueOnLaunch !== false ? 0 : null;
    this.describeOld();
  }

  /** For tests. */
  get state() { return { prompt: this.prompt?.kind ?? null, playing: this.playing, hasSave: this.hasSave, launching: this.launching }; }
  /** A question is up (CONTINUE?, NEW GAME?): the game waits, and its sprites are hidden. */
  get holding() { return this.prompt?.kind === 'continue' || this.prompt?.kind === 'newGame'; }
  /** Launched with a save, on the way back into play: the screen is kept black and keys don't reach the title. */
  get launching() { return this.launch !== null; }
  /** A screen of the flow's covers the game's picture (CONTINUE?, or a launch on its way back into play): sprites hidden, music held. */
  get covering() { return this.holding || this.launching; }
  /** Which question the last save came back from: ENTER CONTINUE on the title (or a launch), or CONTINUE? after losing. */
  get lastAnswer() { return this.answer; }

  watchFound(get: () => Found) { this.foundNow = get; }

  /**
   * Before the game's tick. Returns a save to resume from when the player chose
   * to continue (the caller restarts the game from it, then calls `resumed`).
   */
  before(g: GameStatus<S>): S | null {
    const { input } = this.opts;
    if ((this.opts.restartKeys ?? ['F1', 'KeyR']).some((k) => input.typed.includes(k))) this.restartAsked = 0;
    this.restartAsked++;
    // Prompts wait until the title has been up a moment (it's drawn over a few frames).
    this.titleTicks = g.onTitle ? this.titleTicks + 1 : 0;
    if (this.titleTicks === 25 && !this.font) this.font = this.opts.font instanceof BitmapFont ? this.opts.font : this.opts.font === 'kit' || !g.machine ? kitFont() : gameFont(g.machine);
    // Launched with a save: back into play as soon as the game is up (for games whose panels use
    // the font of their title, once it has been taken: half a second later, the screen kept black).
    if (this.launch !== null) {
      this.launch++;
      const wait = this.opts.font instanceof BitmapFont || this.opts.font === 'kit' || !g.machine ? 1 : 26;
      if (this.launch > LAUNCH_TICKS) this.launch = null;
      else if (this.titleTicks < wait) return null;
      else {
        this.launch = null;
        const s = this.load();
        if (s) { this.answer = 'title'; return s; }
      }
    }
    // The title is back: play is over there and then (a new game started straight away is a new
    // game, whatever brought the title back: the last life lost, R or F1, the game won). CONTINUE?
    // waits until the title has been up a moment, and isn't asked after a restart on purpose.
    if (g.onTitle && this.playing) { this.endPlay(); this.over = true; }
    if (this.titleTicks > 25) {
      if (this.over) {
        this.over = false;
        if (this.hasSave && this.restartAsked > 100) this.prompt = { kind: 'continue', ticks: 0 };
      }
      if (!this.prompt && this.hasSave) this.prompt = { kind: 'title', ticks: 0 };
    } else if (this.prompt?.kind === 'title') this.prompt = null;

    // A new game over a save (Space or fire on the title) is asked first, NEW GAME?, and so is one
    // started before CONTINUE? is up (a jump still held as the last life went): the press is kept
    // from the game (the question holds it), and only a press again (yes) starts it, the title having
    // that one till it's let go.
    if (this.startOk && !input.held.fire) this.startOk = false;
    if (g.onTitle && this.hasSave && this.launch === null && (!this.prompt || this.prompt.kind === 'title') && input.held.fire && !this.startOk) {
      this.prompt = this.over && this.restartAsked > 100 ? { kind: 'continue', ticks: 0 } : { kind: 'newGame', ticks: 0 };
      this.over = false;
      this.fireWasDown = true;
      return null;
    }
    const p = this.prompt;
    if (!p) return null;
    p.ticks++;
    const fire = input.held.fire;
    // Taps (touch): the words. On the title, its CONTINUE (the line's left half, or all of a short
    // one, and round it); on the CONTINUE? screen, its left half says yes and its right half no.
    const strip = this.stripAt, mid = strip.x ?? 160, half = (stripText(strip, true).length * 8) / 2;
    const onStrip = (t: { x: number; y: number }) => t.y >= strip.y - 12 && t.y < strip.y + 20 && (strip.short ? Math.abs(t.x - mid) < half + 16 : t.x < mid);
    const tapYes = input.points.some((t) => (p.kind === 'title' ? onStrip(t) : t.y >= 60 && t.y < 140 && t.x < 160));
    const tapNo = p.kind === 'continue' && input.points.some((t) => t.y >= 60 && t.y < 140 && t.x >= 160);
    const yes = tapYes || input.typed.includes('Enter') || input.typed.includes('NumpadEnter') || (p.kind === 'continue' && fire && !this.fireWasDown);
    // (CONTINUE? waits for its answer: no countdown answers for the player)
    const no = p.kind === 'continue' && (tapNo || input.typed.includes('Escape'));
    this.fireWasDown = fire;
    if (no) this.prompt = null;
    if (p.kind === 'newGame') {
      // fire (or Space) again: the title has it and starts the game; Esc or a tap: back to the title; Enter continues
      if (input.pressed.fire) { this.prompt = null; this.startOk = true; return null; }
      if (input.typed.includes('Escape') || (input.points.length && !input.held.fire)) { this.prompt = null; return null; }
      if (!input.typed.includes('Enter') && !input.typed.includes('NumpadEnter')) return null;
      this.prompt = null;
      this.answer = 'title';
      return this.load();
    }
    if (!yes) return null;
    this.prompt = null;
    this.answer = p.kind;
    return this.load();
  }

  /** Play is over (the title is back): the next game the title starts is a new one. */
  private endPlay() {
    this.playing = false;
    this.fresh = false;
    this.over = false;
    this.lastRoom = -1;
  }

  /**
   * A new game begins, however it came about (a new game from the title, after a restart with R or
   * F1, after the last life, after T on the pause screen): FrontEnd.newGame calls this, before
   * what's been found is cleared; so does the first save of a game not resumed from one. The
   * current save is kept as the previous one (saves.ts `startNewGame`). Said twice for the same
   * new game (nothing of it saved yet), the second time changes nothing; a game that has saved is
   * kept even if play never seemed to end (a new game started from a title still busy).
   */
  beginNewGame(found: Found) {
    if (this.fresh && this.rooms === 0) return;
    this.fresh = true;
    this.over = false;
    this.rooms = 0;
    this.lastRoom = -1;
    this.launch = null;
    this.prompt = null;
    startNewGame(this.opts.id, found);
    this.hasSave = false;
  }

  /**
   * Back to the title on the player's say-so (T on the pause screen): the save stays, the title
   * offers ENTER CONTINUE, and only a new game started there begins a new history entry.
   */
  toTitle() {
    this.endPlay();
    this.prompt = null;
    this.titleTicks = 0; // (play has ended already: no CONTINUE?, this was on purpose)
    this.launch = null;
  }

  /** The latest save (taken on coming into the room the player is in). */
  saved(): S | null { return this.load(); }

  /** The game was restarted from a save. */
  resumed(s: S, room: number) {
    this.lastRoom = room;
    this.playing = true;
    this.fresh = false;
    this.over = false;
    this.rooms = this.loadedRooms;
    this.titleTicks = 0;
    this.launch = null;
    this.grace.start();
    void s;
  }

  /** After the game's tick: autosave on entering a new room. Returns true when play has just begun. */
  after(g: GameStatus<S>): boolean {
    if (g.onTitle || g.room === null) return false;
    const started = !this.playing;
    this.playing = true;
    if (started) this.beginNewGame(this.foundNow());
    if (g.room !== this.lastRoom) {
      const s = g.save();
      if (s) { this.write(s); this.hasSave = true; this.lastRoom = g.room; }
    }
    return started;
  }

  /** Draw the panels (after the picture is drawn into the renderer's screen). */
  draw() {
    if (this.launch !== null) { this.opts.renderer.screen.clear(0); return; } // (the title, on the way back into play: not shown)
    const p = this.prompt;
    if (!p || !this.font) return;
    const touch = this.opts.input.touch;
    if (p.kind === 'title') this.strip(touch);
    else if (p.kind === 'newGame') this.panel(touch ? ['NEW GAME?', '', 'FIRE YES        TAP NO'] : ['NEW GAME?', '', 'SPACE YES     ESC NO', '', 'ENTER CONTINUE']);
    else this.panel(['CONTINUE?', '', touch ? 'YES              NO' : 'ENTER YES     ESC NO']);
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
      this.rooms++;
      const found = this.foundNow();
      writeCurrent(this.opts.id, { data: toBase64(this.codec.pack(s)), at: Date.now(), summary: this.summary(s, found), rooms: this.rooms });
      // what's been found goes with it (the map's progress: rooms, places to travel to), so the
      // game continued later has the map as it was, not as it was when the pause screen last closed
      keepFound(this.opts.id, found);
    } catch { /* a save that won't pack: no autosave */ }
  }

  /** What the game says about a save (nothing if it says nothing, or can't). */
  private summary(s: S, found: Found): string[] {
    try { return tidySummary(this.opts.describe?.(s, found) ?? []); } catch { return []; }
  }

  /** A save from before saves were described (moved from the old single save): described now. */
  private describeOld() {
    const slot = readSaves(this.opts.id).current;
    if (!slot || slot.summary.length || !this.opts.describe) return;
    try {
      const summary = this.summary(this.codec.unpack(fromBase64(slot.data)), readFound(this.opts.id));
      if (summary.length) writeCurrent(this.opts.id, { ...slot, summary });
    } catch { /* not one this game reads */ }
  }

  private get stripAt(): TitleStrip { return this.opts.strip ?? { y: 172 }; }

  /** The title's line: the letters alone, where the game says. */
  private strip(touch: boolean) {
    const strip = this.stripAt;
    if (strip.when && !strip.when()) return;
    const text = stripText(strip, touch);
    this.getFont().draw(this.opts.renderer.screen, text, Math.floor((strip.x ?? 160) - (text.length * 8) / 2), strip.y, strip.colour ?? 1);
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
    const y = Math.floor((200 - lines.length * 12) / 2);
    lines.forEach((l, i) => font.draw(s, l, Math.floor((320 - l.length * 8) / 2), y + i * 12, i === 0 ? 7 : 1));
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
