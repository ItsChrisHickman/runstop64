import type { BitmapFont, Input, Renderer } from 'c64kit';
import type { SaveHistory } from './continue';
import { drawPause, MAP_BOX, PAUSE_TAP, type Found, type PauseMap } from './native/pause';
import { keepFound, readFound } from './saves';
import { readJson } from './guards';

/**
 * The parts of a game's front end that don't depend on how the game runs (a
 * translated port on a C64 model, or a native rewrite): the pause screen with
 * its map and travel, the ORIGINAL/ENHANCED switch (one per game, ENHANCED unless
 * switched off, remembered: AGENTS.md), and the options panel for games without a map. (The C64/HD
 * switch is a system setting, not the game's: the shell's, games/shared/view.ts.)
 *
 * `T` is what the game's PauseMap reads: a C64's RAM for translated ports, the
 * game's own state for native ones. The game says when the pause screen may
 * open and takes the player to a place picked on the map (`going`) at a safe
 * point of its own; "back to room start" and "back to the title" are requests it carries out.
 */
/**
 * One of the curated features of ENHANCED (or one on in both modes): no key or line of its own (one
 * switch, AGENTS.md: the pause screen's keys are the switches', B and T alone).
 */
export interface AssistSpec {
  id: string;
  /** What it is (up to 16 letters). */
  long: string;
  /**
   * What decides it: 'enhanced' (the default) goes with the game's ENHANCED switch; 'always'
   * is on in both modes (presentation, e.g. effects); 'never' is offered nowhere (kept off).
   */
  role?: 'enhanced' | 'always' | 'never';
  /** (Kept for games' own declarations; the switch decides now.) */
  default?: boolean;
}

export interface FrontEndOptions<T> {
  /** Storage key prefix, e.g. 'entombed'. */
  id: string;
  input: Input;
  renderer: Renderer;
  map?: PauseMap<T>;
  assists: AssistSpec[];
  /** The panels' font and box (the continue flow's). */
  font(): BitmapFont;
  panel(lines: string[]): void;
  /** Whether there's a room start to go back to (play under way, with a save). */
  canGoBack(): boolean;
  /** The saves (the game's ContinueFlow): told when a new game begins, and where what's been found is. */
  saves: SaveHistory;
  /** A screen closed: the press that closed it shouldn't carry into play. */
  onClose(): void;
}

export const PAUSE_KEYS = ['KeyP', 'Escape', 'PadStart'];

/** What the player asked for on the pause screen (or the options), for the game to carry out. */
export type PauseRequest = 'roomStart' | 'title' | null;

export class FrontEnd<T> {
  /** Each assist on or off (by id), as the ENHANCED switch and its role decide. */
  readonly assist: Record<string, boolean> = { health: false, lives: false, hints: false };
  /** The ENHANCED switch (on unless switched to ORIGINAL), remembered. */
  enhanced = true;
  /** What the player has found (for the map), kept with the saves. */
  found: Found = {};
  paused = false;
  optionsOpen = false;
  /** A place picked on the map to go to (the game takes the player there, then clears it). */
  going: string | null = null;
  private pauseTicks = 0;
  private page: number | undefined; // the map page shown (e.g. a floor)
  private pickId: string | null = null; // the place picked on the map
  /** The place picked on the map (for tests). */
  get picked() { return this.pickId; }
  private readonly assistKey: string;

  constructor(private readonly o: FrontEndOptions<T>) {
    this.assistKey = `${o.id}.assist`;
    try {
      const kept: unknown = readJson(localStorage.getItem(this.assistKey) ?? '{}');
      if (typeof kept === 'object' && kept !== null && 'enhanced' in kept && typeof kept.enhanced === 'boolean') this.enhanced = kept.enhanced;
    } catch { /* ENHANCED */ }
    this.apply();
    this.found = readFound(o.id);
    o.saves.watchFound(() => this.found);
  }

  get assists() { return this.o.assists; }
  /** Whether the game has anything for the switch to turn on (else there's no switch). */
  get hasSwitch() { return this.o.assists.some((a) => (a.role ?? 'enhanced') === 'enhanced'); }

  /** Each assist from the switch and its role. */
  private apply() {
    for (const a of this.o.assists) {
      const role = a.role ?? 'enhanced';
      this.assist[a.id] = role === 'always' ? true : role === 'never' ? false : this.enhanced;
    }
  }
  /** The game waits (the pause screen or the options are up). */
  get holding() { return this.paused || this.optionsOpen; }

  /** ORIGINAL <-> ENHANCED. */
  toggleEnhanced() {
    this.enhanced = !this.enhanced;
    this.apply();
    this.keepSwitches();
  }

  private keepSwitches() {
    try { localStorage.setItem(this.assistKey, JSON.stringify({ enhanced: this.enhanced })); } catch { /* not kept */ }
  }

  keepFound() { keepFound(this.o.id, this.found); }

  /** A new game: the save so far is kept as the previous one (with what had been found), and nothing is found yet. */
  newGame() { this.o.saves.beginNewGame(this.found); this.found = {}; this.keepFound(); }

  /** Whether a pause key was pressed now (in play, with a map): if so the pause screen opens. */
  pauseKey(state: T, canPause: boolean) {
    const { input } = this.o;
    if (!this.o.map || this.paused || !canPause || !input.typed.some((c) => PAUSE_KEYS.includes(c))) return false;
    this.openPause(state);
    input.typed.length = 0;
    return true;
  }

  openPause(state: T) {
    this.paused = true; this.pauseTicks = 0;
    this.page = this.o.map?.pages?.(state, this.found).current;
    this.pickId = null;
  }

  private close() {
    this.paused = false;
    this.o.onClose();
    this.keepFound();
  }

  /**
   * A frame of the pause screen: options (keys or taps on them), back to the
   * game, the map's controls; `update` draws the game's picture, then the
   * screen goes over it. Returns 'roomStart' or 'title' when the player asked for it.
   */
  pausedTick(state: T, update: () => void): PauseRequest {
    const { input } = this.o;
    this.pauseTicks++;
    // the lines on the right (each one a tap target): the switch (as it is: E ENHANCED or E ORIGINAL),
    // back to room start, the title
    const lines = [
      ...(this.hasSwitch ? [{ text: this.enhanced ? 'E ENHANCED' : 'E ORIGINAL', id: 'E' }] : []),
      { text: 'B BACK TO', id: 'B' }, { text: ' ROOM START', id: 'B' },
      { text: 'T TITLE', id: 'T' },
    ];
    const tapped = input.points.map((t) => PAUSE_TAP.option(t.x, t.y, lines.length)).filter((i) => i >= 0).map((i) => lines[i].id);
    if (this.hasSwitch && (input.typed.includes('KeyE') || tapped.includes('E'))) this.toggleEnhanced();
    if (input.typed.includes('KeyB') || tapped.includes('B')) return 'roomStart';
    if (input.typed.includes('KeyT') || tapped.includes('T')) return 'title';
    const footTap = input.points.some((t) => t.y >= PAUSE_TAP.footY);
    if (this.pauseTicks > 1 && (footTap || input.typed.some((c) => PAUSE_KEYS.includes(c)))) this.close();
    const map = this.o.map;
    const pick = this.paused && map ? this.mapControls(state, map) : null;
    update();
    if (this.paused && map) drawPause(this.o.renderer.screen, this.o.font(), map, state, this.found, this.pauseTicks, lines.map((l) => l.text), { page: this.page, pick, touch: input.touch });
    return null;
  }

  /**
   * The pause map's controls, for maps with places to go back to: < and > (or [ and ]) turn
   * the pages, the arrows pick a place, Enter (or fire) goes there. Returns the pick.
   */
  private mapControls(state: T, map: PauseMap<T>) {
    const { input } = this.o;
    if (!map.places || !map.go) return null;
    const pages = map.pages?.(state, this.found);
    if (pages && this.page !== undefined && pages.list.length > 1) {
      const i = Math.max(0, pages.list.indexOf(this.page));
      const next = ['Period', 'BracketRight'].some((k) => input.typed.includes(k)), prev = ['Comma', 'BracketLeft'].some((k) => input.typed.includes(k));
      const step = (next ? 1 : 0) - (prev ? 1 : 0);
      if (step) { this.page = pages.list[(i + step + pages.list.length) % pages.list.length]; this.pickId = null; }
    }
    // a tap on the title's ends turns the pages
    for (const t of input.points) {
      if (pages && this.page !== undefined && pages.list.length > 1 && t.y < PAUSE_TAP.title.y1 && t.x < PAUSE_TAP.title.x1 && (t.x < 50 || t.x > 164)) {
        const i = Math.max(0, pages.list.indexOf(this.page));
        this.page = pages.list[(i + (t.x < 50 ? -1 : 1) + pages.list.length) % pages.list.length]; this.pickId = null;
      }
    }
    const places = map.places(MAP_BOX, state, this.found, this.page);
    let pick = places.find((p) => p.id === this.pickId) ?? places.find((p) => p.here) ?? places[0];
    if (!pick) return null;
    // a tap on the map picks the place nearest it; a tap on the picked place goes there
    let tapGo = false;
    for (const t of input.points) {
      if (t.x < MAP_BOX.x - 6 || t.x > MAP_BOX.x + MAP_BOX.w + 6 || t.y < MAP_BOX.y - 6 || t.y > MAP_BOX.y + MAP_BOX.h + 6) continue;
      let near: typeof pick | undefined, nd = 24;
      for (const p of places) { const d = Math.hypot(Math.max(Math.abs(p.x - t.x) - (p.rx ?? 0), 0), p.y - t.y); if (d < nd) { nd = d; near = p; } }
      if (!near) continue;
      if (near.id === pick.id) tapGo = true;
      else { pick = near; this.pickId = near.id; }
    }
    const dx = (input.pressed.right ? 1 : 0) - (input.pressed.left ? 1 : 0), dy = (input.pressed.down ? 1 : 0) - (input.pressed.up ? 1 : 0);
    if (dx || dy) {
      // the nearest place that way (straight ahead counts for more than off to the side)
      let best: typeof pick | undefined, bestScore = Infinity;
      for (const p of places) {
        const ax = p.x - pick.x, ay = p.y - pick.y, ahead = ax * dx + ay * dy;
        if (ahead <= 0) continue;
        const score = ahead + 2 * Math.abs(ax * dy - ay * dx);
        if (score < bestScore) { bestScore = score; best = p; }
      }
      if (best) pick = best;
    }
    this.pickId = pick.id;
    if (this.pauseTicks > 1 && !pick.here && (tapGo || input.typed.includes('Enter') || input.typed.includes('NumpadEnter') || input.pressed.fire)) {
      this.going = pick.id;
      this.close();
    }
    return { x: pick.x, y: pick.y, r: pick.r, rx: pick.rx, id: pick.id };
  }

  /** A frame of the options panel (games without a map). Returns 'roomStart' or 'title' when asked for (keys, or a tap on its line). */
  optionsTick(update: () => void): PauseRequest {
    const { input } = this.o;
    const lines = this.optionLines();
    // (the panel's lines are 12 apart in the middle of the screen: continue.ts `panel`)
    const top = Math.floor((200 - lines.length * 12) / 2);
    const tapped = input.points.map((t) => lines[Math.floor((t.y - top + 2) / 12)]?.id).filter((id) => id !== undefined && id !== '');
    if (this.hasSwitch && (['Enter', 'Space', 'KeyE'].some((k) => input.typed.includes(k)) || tapped.includes('E'))) this.toggleEnhanced();
    if (input.typed.includes('KeyB') || tapped.includes('B')) return 'roomStart';
    if (input.typed.includes('KeyT') || tapped.includes('T')) return 'title';
    if (input.typed.includes('Escape') || input.typed.includes('KeyP') || input.typed.includes('PadStart') || tapped.includes('X')) this.optionsOpen = false;
    update();
    this.o.panel(this.optionLines().map((l) => l.text));
    if (!this.optionsOpen) this.o.onClose();
    return null;
  }

  /** The options panel's lines, each with what a tap on it does ('' nothing). */
  private optionLines() {
    const touch = this.o.input.touch;
    const back = this.o.canGoBack() ? [{ text: 'B  BACK TO ROOM START', id: 'B' }] : [];
    const title = { text: 'T  BACK TO THE TITLE', id: 'T' };
    const blank = { text: '', id: '' };
    if (!this.hasSwitch) return [{ text: 'OPTIONS', id: '' }, blank, ...back, title, blank, { text: touch ? 'TAP HERE: BACK' : 'ESC BACK', id: 'X' }];
    return [{ text: 'OPTIONS', id: '' }, blank, { text: `E  ${this.enhanced ? 'ENHANCED' : 'ORIGINAL'}`, id: 'E' }, ...back, title, blank, { text: touch ? 'TAP ONE    TAP HERE: BACK' : 'ENTER CHANGE    ESC BACK', id: 'X' }];
  }

  /** The gear (or the touch PAUSE button): the pause screen (or back from it), or the options. */
  menu(state: T, canPause: boolean) {
    if (this.o.map) {
      if (this.paused) this.close();
      else if (canPause) this.openPause(state);
      return;
    }
    this.optionsOpen = !this.optionsOpen;
  }

  /** "Back to room start" was carried out: the screens close. */
  wentBack() { this.paused = false; this.optionsOpen = false; }
}
