/**
 * The C64/HD switch: a system setting, not the game's. The shell owns it (games/shell.ts: its button
 * with the others bottom right, the touch layer's key beside PAUSE on a phone, H on the keyboard,
 * never reaching the game); a game only says it has an HD view (`HdView`) and draws it while `on`.
 * One setting for every game: C64 unless switched, remembered. Where the renderer can't draw the HD
 * view (the GL failed it: `renderer.hd.available` false) the C64 view and no switch for the session;
 * what was chosen is kept.
 */

/** A game's HD view, as the switch drives it: drawn while `on` (the view only: the game the same either way). */
export interface HdView { on: boolean }

/** The switch's key (the shell takes it before the game: it never reaches the game). */
export const VIEW_KEY = 'KeyH';

const KEPT = 'runstop64.view';

export class ViewSwitch {
  /** The switch as the player left it (remembered; C64 unless switched). */
  private wantHd = false;
  private game: HdView | null = null;

  constructor(private readonly renderer: { readonly hd: { readonly available: boolean } }) {
    try { this.wantHd = localStorage.getItem(KEPT) === 'hd'; } catch { /* C64 */ }
  }

  /** A program started: its HD view, or none (the loader, a game without one). */
  attach(game: HdView | undefined) {
    this.game = game ?? null;
    this.sync();
  }

  /** Whether the switch is offered: a game with an HD view, where the renderer can draw it. */
  get offered() { return !!this.game && this.renderer.hd.available; }

  /** The HD view shown (as chosen, where offered). */
  get hd() { return this.wantHd && this.offered; }

  /** What the switch shows: the view now. */
  get label() { return this.hd ? 'HD' : 'C64'; }

  /** C64 <-> HD (the view only). */
  toggle() {
    if (!this.offered) return;
    this.wantHd = !this.wantHd;
    try { localStorage.setItem(KEPT, this.wantHd ? 'hd' : 'c64'); } catch { /* not kept */ }
    this.sync();
  }

  /** The game told which view to draw (each frame: the renderer may give up on the HD view). */
  sync() {
    if (this.game) this.game.on = this.hd;
  }
}
