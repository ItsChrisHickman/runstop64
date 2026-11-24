import type { BitmapFont, Input, Renderer } from 'c64kit';
import type { SaveHistory } from './continue';
import { drawPause, MAP_BOX, PAUSE_TAP, type PauseColours, type PauseMap, type PauseOption, PAGE_KEY } from './native/pause';
import { keepFound, readFound } from './saves';
import { readJson } from './guards';

/**
 * The parts of a game's front end that don't depend on how the game runs (a
 * translated port on a C64 model, or a native rewrite): the pause screen with
 * its map and travel, the EASY/HARD switch (one per game, EASY unless switched
 * to HARD, remembered: AGENTS.md).
 *
 * `T` is what the game's PauseMap reads: a C64's RAM for translated ports, the
 * game's own state for native ones; `F` is what the map keeps of the player's progress (its
 * `found` codec reads what was kept once, when the front end starts, and a new game starts it
 * empty). The game says when the pause screen may
 * open and takes the player to a place picked on the map (`going`) at a safe
 * point of its own; "back to room start" and "back to the title" are requests it carries out.
 */
/**
 * One of a port's curated features: no key or line of its own (one switch, AGENTS.md: the pause screen's keys are the
 * switch's, B and T alone). Every quality-of-life change is on in both modes; only the lives go with EASY/HARD.
 */
export interface AssistSpec {
  id: string;
  /** What it is (up to 16 letters). */
  long: string;
  /**
   * What decides it: 'always' (the default) is on in both modes (every quality-of-life change); 'easy' goes with the
   * game's EASY switch (the lives: shared/lives.ts); 'never' is offered nowhere (kept off).
   */
  role?: 'always' | 'easy' | 'never';
}

interface FrontEndOptions<T, F> {
  /** Storage key prefix, e.g. 'entombed'. */
  id: string;
  input: Input;
  renderer: Renderer;
  map: PauseMap<T, F>;
  assists: AssistSpec[];
  /** The pause screen's font (the continue flow's). */
  font(): BitmapFont;
  /** The saves (the game's ContinueFlow): told when a new game begins, and where what's been found is. */
  saves: SaveHistory<F>;
  /** A screen closed: the press that closed it shouldn't carry into play. */
  onClose(): void;
  /** The pause screen's colours, where the game's palette is not the C64's (default the C64's). */
  colours?: PauseColours;
  /** W: the ending can be watched (offered on the pause screen only while this says so). */
  ending?(): boolean;
}

/**
 * The EASY switch as kept (`<id>.assist`): `{ easy }`; before EASY/HARD it was `{ enhanced }`, whose ours had the
 * unlimited lives that are EASY's and whose ORIGINAL the original's lives that are HARD's, so it reads as that. Anything
 * else is EASY, the default.
 */
export function readEasy(kept: unknown): boolean {
  if (typeof kept !== 'object' || kept === null) return true;
  if ('easy' in kept && typeof kept.easy === 'boolean') return kept.easy;
  if ('enhanced' in kept && typeof kept.enhanced === 'boolean') return kept.enhanced;
  return true;
}

export const PAUSE_KEYS = ['KeyP', 'Escape', 'PadStart'];

/** What the player asked for on the pause screen, for the game to carry out. */
export type PauseRequest = 'roomStart' | 'title' | 'ending' | null;

export class FrontEnd<T, F> {
  /** Each assist on or off (by id), as the EASY switch and its role decide. */
  readonly assist: Record<string, boolean> = { health: false, lives: false, hints: false };
  /** The EASY switch (on unless switched to HARD), remembered. */
  easy = true;
  /** What the player has found (for the map), kept with the saves. */
  found: F;
  /** The pause screen is up (the game waits). */
  paused = false;
  /** A place picked on the map to go to (the game takes the player there, then clears it). */
  going: string | null = null;
  private pauseTicks = 0;
  private page: number | undefined; // the map page shown (e.g. a floor)
  private pickId: string | null = null; // the place picked on the map
  /** The place picked on the map (for tests). */
  get picked() { return this.pickId; }
  private readonly assistKey: string;

  constructor(private readonly o: FrontEndOptions<T, F>) {
    this.assistKey = `${o.id}.assist`;
    try {
      this.easy = readEasy(readJson(localStorage.getItem(this.assistKey) ?? '{}'));
    } catch { /* EASY */ }
    this.apply();
    this.found = o.map.found.parse(readFound(o.id));
    o.saves.watchFound(() => this.found);
  }

  get assists() { return this.o.assists; }
  /** Whether the game has anything for the switch to change (else there's no switch). */
  get hasSwitch() { return this.o.assists.some((a) => a.role === 'easy'); }

  /** Each assist from the switch and its role. */
  private apply() {
    for (const a of this.o.assists) {
      const role = a.role ?? 'always';
      this.assist[a.id] = role === 'always' ? true : role === 'never' ? false : this.easy;
    }
  }
  /** The game waits (the pause screen is up). */
  get holding() { return this.paused; }

  /** EASY <-> HARD. */
  toggleEasy() {
    this.easy = !this.easy;
    this.apply();
    this.keepSwitches();
  }

  private keepSwitches() {
    try { localStorage.setItem(this.assistKey, JSON.stringify({ easy: this.easy })); } catch { /* not kept */ }
  }

  keepFound() { keepFound(this.o.id, this.found); }

  /** A new game: the save so far is kept as the previous one (with what had been found), and nothing is found yet. */
  newGame() { this.o.saves.beginNewGame(this.found); this.found = this.o.map.found.empty(); this.keepFound(); }

  /** Whether a pause key was pressed now (in play): if so the pause screen opens. */
  pauseKey(state: T, canPause: boolean) {
    const { input } = this.o;
    if (this.paused || !canPause || !input.typed.some((c) => PAUSE_KEYS.includes(c))) return false;
    this.openPause(state);
    input.typed.length = 0;
    return true;
  }

  openPause(state: T) {
    this.paused = true; this.pauseTicks = 0;
    // (a map with only one page has no pages to turn: nothing says "other pages")
    const pages = this.o.map.pages?.(state, this.found);
    this.page = pages && pages.list.length > 1 ? pages.current : undefined;
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
    // the lines on the right (each one a tap target): the switch (E EASY and a box, ticked when on: the line names the
    // thing and the box says whether it is on, so it never reads as "press E for HARD"), back to room start, the title
    const lines: (PauseOption & { id: string })[] = [
      ...(this.hasSwitch ? [{ text: 'E EASY', check: this.easy, id: 'E' }] : []),
      { text: 'B BACK TO', id: 'B' }, { text: ' ROOM START', id: 'B' },
      { text: 'T TITLE', id: 'T' },
      ...(this.o.ending?.() ? [{ text: 'W ENDING', id: 'W' }] : []),
    ];
    const tapped = input.points.map((t) => PAUSE_TAP.option(t.x, t.y, lines.length)).filter((i) => i >= 0).map((i) => lines[i].id);
    if (this.hasSwitch && (input.typed.includes('KeyE') || tapped.includes('E'))) this.toggleEasy();
    if (input.typed.includes('KeyB') || tapped.includes('B')) return 'roomStart';
    if (input.typed.includes('KeyT') || tapped.includes('T')) return 'title';
    if (this.o.ending?.() && (input.typed.includes('KeyW') || tapped.includes('W'))) return 'ending';
    const footTap = input.points.some((t) => t.y >= PAUSE_TAP.footY);
    if (this.pauseTicks > 1 && (footTap || input.typed.some((c) => PAUSE_KEYS.includes(c)))) this.close();
    const map = this.o.map;
    const pick = this.paused ? this.mapControls(state, map) : null;
    update();
    if (this.paused) drawPause(this.o.renderer.screen, this.o.font(), map, state, this.found, this.pauseTicks, lines, { page: this.page, pick, touch: input.touch, assist: this.assist }, this.o.colours);
    return null;
  }

  /**
   * The pause map's controls, for maps with places to go back to: < and > (or [ and ]) turn
   * the pages, the arrows pick a place, Enter (or fire) goes there. Returns the pick.
   */
  private mapControls(state: T, map: PauseMap<T, F>) {
    const { input } = this.o;
    if (!map.places || !map.go) return null;
    const pages = map.pages?.(state, this.found);
    // one key turns to the next page, round to the first (Chris, 2026-11-15: < and > for back and on were confusing): Tab, or a tap on the title
    if (pages && this.page !== undefined && pages.list.length > 1) {
      const turns = (input.typed.includes(PAGE_KEY) ? 1 : 0)
        + input.points.filter((t) => t.y < PAUSE_TAP.title.y1 && t.x < PAUSE_TAP.title.x1).length;
      if (turns > 0) {
        const i = Math.max(0, pages.list.indexOf(this.page));
        this.page = pages.list[(i + turns) % pages.list.length];
        this.pickId = null;
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

  /** The gear (or the touch PAUSE button): the pause screen, or back from it. */
  menu(state: T, canPause: boolean) {
    if (this.paused) this.close();
    else if (canPause) this.openPause(state);
  }

  /** "Back to room start" was carried out: the pause screen closes. */
  wentBack() { this.paused = false; }
}
