import { Surface, TRANSPARENT, type BitmapFont, type Host, type SpriteHandle } from 'c64kit';
import { CREDIT } from '../native/ending';
import { poseAt, type Figure } from './figures';

/**
 * The reward for beating a game (ENHANCED's addition: the game's own winning moment stays as it was, and what follows
 * it is ours), written once for the native rebuilds on `runPort` (games/shared/port.ts). A game declares what is its own:
 *
 *  1. A montage of places: each one the game's own engine running (a new game of ours, never the player's), its
 *     creatures and crushers moving as the engine moves them, the hero driven by input as in play doing something that
 *     fits the place. Over it the credits (the makers, true facts, the port) type on one line at a time in a part of the
 *     picture the game leaves empty, and are held; never on a box.
 *  2. A parade of the creatures: the game's own sprites and their frames, a name under each, the hero last.
 *  3. THE END and the player's numbers, then back to the title.
 *
 * The game's tune plays all through (the game starts it: `music`). Any key or tap skips, after a couple of seconds.
 * Everything is drawn in the 320x200 picture in the game's own font and the C64's colours.
 *
 * (games/shared/native/ending.ts is the same show for the Pendragon games, whose engine is a translated machine:
 * the two overlap in the credits' timing, the parade, THE END and the won flag, and merge later.)
 */

// ---- what a game declares -------------------------------------------------------------------------

/** A place of the montage, running: one frame of the engine with the hero driven, then its picture. */
export interface Reel {
  /** One frame of the game's logic. */
  tick(): void;
  /** The picture into the renderer (the credits go over it after). */
  draw(): void;
  render(alpha: number): void;
  /** Put away (the engine's sprites hidden). */
  dispose(): void;
}

/** A place to revisit. */
export interface Place {
  /** Credit lines over it, one after another (a line types on, is held, and goes): upper case, at most `CREDIT.letters` letters. */
  credits?: readonly string[];
  /** How long it is shown at least (frames at 50 a second); longer if its credits need it. */
  frames: number;
  /** The row its credits go on, if not the show's (a place where the game's creatures are in the show's row). */
  creditRow?: number;
  /** The place running, or null if it can't be made. */
  open(): Reel | null;
}

export interface RewardSpec {
  /** Over the parade. */
  title: string;
  places: readonly Place[];
  /** The creatures, recorded once the show begins (one that can't be is left out), the hero last. */
  cast: readonly (() => Figure | null)[];
  /** The row (picture pixels) the credit lines are drawn at: eight pixels the game leaves empty. */
  creditRow: number;
  /** Frames a credit line is given (default `CREDIT.slot`). */
  creditSlot?: number;
  /** The column (picture pixels) a credit line starts at, if the row is not free the whole width (default `CREDIT.x`); lines are then shorter. */
  creditX?: number;
}

/** What the show needs of the game running it. */
export interface RewardOptions {
  host: Host;
  spec: RewardSpec;
  /** The game's font (its lettering, upper case). */
  font(): BitmapFont;
  /** The tune: begins as the show does and again on its way out (the title's). */
  music: { start(): void; end(): void };
  /** The show is over (or skipped). */
  done(): void;
}

// ---- the credits over the montage ---------------------------------------------------------------

/** How long a place runs: what it declares, or longer if its credit lines need their slots. */
export function placeLength(place: Pick<Place, 'credits' | 'frames'>, slot: number = CREDIT.slot): number {
  return Math.max(place.frames, (place.credits?.length ?? 0) * slot);
}

/** What the credits show `frame` frames into a place: the line and how much of it has typed on, or null between lines. */
export function creditAt(place: Pick<Place, 'credits' | 'frames'>, frame: number, slot: number = CREDIT.slot): { line: number; shown: string } | null {
  const lines = place.credits;
  if (!lines || lines.length === 0) return null;
  const each = Math.floor(placeLength(place, slot) / lines.length);
  const line = Math.min(lines.length - 1, Math.floor(frame / each));
  const into = frame - line * each;
  if (into >= each - CREDIT.gap) return null;
  return { line, shown: lines[line].slice(0, into) };
}

// ---- the parade ------------------------------------------------------------------------------------

/** The parade: how fast the line walks (pixels a frame), the ground it walks on, the gap between neighbours and where a name goes. */
export const PARADE = { speed: 2, ground: 128, gap: 14, nameGap: 10, hold: 150 } as const;
/** The names and numbers: the title's yellow, light grey. */
const YELLOW = 7, GREY = 15;
/** The glyph's width. */
const GLYPH = 8;

/** The width of the block a figure takes in the line: the figure, or its name if that is wider. */
const blockWidth = (f: Figure) => Math.max(f.width, GLYPH * f.name.length);

/**
 * Where each figure of the line stands `t` frames in: its left edge (its name goes under it from there). The line walks
 * right, the first figure leading, a gap between neighbours' blocks; the last parks at `stop`.
 */
export function paradeLefts(figures: readonly Figure[], t: number, stop: number): number[] {
  let behind = 0;
  return figures.map((f, i) => {
    behind += blockWidth(f) + PARADE.gap;
    const left = Math.round(t * PARADE.speed - behind);
    return i === figures.length - 1 ? Math.min(left, stop) : left;
  });
}

/** How many frames the line takes: the last figure reaching `stop`, and a moment. */
export function paradeLength(figures: readonly Figure[], stop: number): number {
  const total = figures.reduce((n, f) => n + blockWidth(f) + PARADE.gap, 0);
  return Math.ceil((total + stop) / PARADE.speed) + PARADE.hold;
}

/** Text at double size (each pixel of the glyph a 2 x 2 block): for THE END. */
function bigText(s: Surface, font: BitmapFont, text: string, x: number, y: number, colour: number) {
  let px = x;
  for (const ch of text) {
    const g = font.glyph(ch);
    if (g) {
      for (let row = 0; row < 8; row++) for (let col = 0; col < 8; col++) if (g[row] & (0x80 >> col)) s.fillRect(px + col * 2, y + row * 2, 2, 2, colour);
    }
    px += 16;
  }
}

// ---- the show -------------------------------------------------------------------------------------------

type Phase = 'loading' | 'montage' | 'parade' | 'end';

/** The frames before a key or a tap skips it. */
const SKIP_AFTER = 100;
/** Frames THE END is held. */
const END_HOLD = 500;

export class RewardShow {
  private phase: Phase = 'loading';
  private frames = 0;
  private stats: readonly string[] = [];
  private figures: Figure[] = [];
  private place = -1;
  private reel: Reel | null = null;
  private handles: SpriteHandle[] = [];
  private readonly black = new Surface(320, 200, 0);

  constructor(private readonly o: RewardOptions) {}

  /** The show is on (the game is ours, not the player's). */
  active = false;

  /** For tests: the figures recorded. */
  get cast(): readonly Figure[] { return this.figures; }

  /** For tests: where the show is. */
  get progress() { return { phase: this.phase, place: this.place, frames: this.frames, figures: this.figures.map((f) => ({ name: f.name, poses: f.poses.length })) }; }

  /** Begin: `stats` are the lines under THE END. */
  start(stats: readonly string[]) {
    this.stop();
    this.active = true;
    this.phase = 'loading';
    this.frames = 0;
    this.stats = stats;
    this.figures = [];
    this.place = -1;
    this.o.music.start();
  }

  /** Over: everything ours put away. */
  private stop() {
    this.reel?.dispose();
    this.reel = null;
    // (the game's sprites and ours: the game's own view puts back what it shows on its next frame)
    this.o.host.renderer.hideSprites();
    this.o.host.renderer.backdrop = null;
    this.active = false;
  }

  private finish() { this.stop(); this.o.music.end(); this.o.host.input.typed.length = 0; this.o.done(); }

  /** A key or a tap, after a moment (M and V are the sound's). */
  private skipped() {
    const { input } = this.o.host;
    const pressed = input.typed.some((c) => c !== 'KeyM' && c !== 'KeyV') || input.points.length > 0 || input.pressed.fire;
    return pressed && this.frames > SKIP_AFTER;
  }

  /** One frame of the show. */
  tick() {
    if (!this.active) return;
    const { renderer, input } = this.o.host;
    this.frames++;
    if (this.phase === 'loading') {
      // (a black frame first, then the work: the cast is recorded in one go)
      if (this.frames === 1) { renderer.hideSprites(); renderer.backdrop = this.black; renderer.screen.clear(TRANSPARENT); renderer.border = 0; return; }
      this.figures = this.o.spec.cast.flatMap((record) => { const f = record(); return f ? [f] : []; });
      this.nextPlace();
      return;
    }
    if (this.skipped()) { this.finish(); return; }
    input.typed.length = 0;
    if (this.phase === 'montage') this.montage();
    else if (this.phase === 'parade') this.parade();
    else this.end();
  }

  // -- the montage

  private nextPlace() {
    const { spec } = this.o;
    this.reel?.dispose();
    this.reel = null;
    this.frames = 0;
    for (;;) {
      this.place++;
      const place = spec.places[this.place];
      if (!place) { this.beginParade(); return; }
      const reel = place.open();
      if (reel) { this.reel = reel; this.o.host.renderer.backdrop = null; this.phase = 'montage'; return; }
    }
  }

  private montage() {
    const reel = this.reel, place = this.o.spec.places[this.place];
    if (!reel || !place) return;
    reel.tick();
    reel.draw();
    this.credits(place);
    if (this.frames >= placeLength(place, this.o.spec.creditSlot)) this.nextPlace();
  }

  /** The credit line of this moment, over the picture's empty band (after the picture is drawn, so it stays on top). */
  private credits(place: Place) {
    const now = creditAt(place, this.frames - 1, this.o.spec.creditSlot);
    if (!now) return;
    const { screen } = this.o.host.renderer;
    this.o.font().draw(screen, now.shown, this.o.spec.creditX ?? CREDIT.x, place.creditRow ?? this.o.spec.creditRow, CREDIT.colour);
    screen.version++;
  }

  // -- the parade

  private beginParade() {
    this.phase = 'parade';
    this.frames = 0;
    const { renderer } = this.o.host;
    renderer.hideSprites();
    renderer.backdrop = this.black;
    renderer.border = 0;
  }

  private parade() {
    const { renderer } = this.o.host;
    const font = this.o.font();
    const t = this.frames - 1;
    const stop = 24;
    if (t >= paradeLength(this.figures, stop)) { this.phase = 'end'; this.frames = 0; return; }
    renderer.screen.clear(TRANSPARENT);
    font.draw(renderer.screen, this.o.spec.title, 8, 12, YELLOW);
    const lefts = paradeLefts(this.figures, t, stop);
    let used = 0;
    this.figures.forEach((fig, i) => {
      const left = lefts[i];
      const pose = poseAt(fig, t);
      const top = PARADE.ground - fig.height;
      // (a figure off the picture is not drawn: one handle per part drawn, shared along the line)
      if (left + fig.width > 0 && left < 320) {
        pose.parts.forEach((part) => {
          while (this.handles.length <= used) this.handles.push(renderer.createSprite(1 + this.handles.length * 0.001));
          const h = this.handles[used++];
          h.surface = part.surface; h.x = left + part.dx; h.y = top + part.dy; h.visible = true;
        });
      }
      // (its name under it, from its left: nothing is centred)
      if (left + GLYPH * fig.name.length > 0 && left < 320) font.draw(renderer.screen, fig.name, left, PARADE.ground + PARADE.nameGap, GREY);
    });
    for (let k = used; k < this.handles.length; k++) this.handles[k].visible = false;
    renderer.screen.version++;
  }

  // -- THE END

  private end() {
    const { renderer } = this.o.host;
    const font = this.o.font();
    renderer.screen.clear(TRANSPARENT);
    for (const h of this.handles) h.visible = false;
    bigText(renderer.screen, font, 'THE END', 24, 50, YELLOW);
    this.stats.forEach((line, i) => font.draw(renderer.screen, line, 24, 100 + i * 14, GREY));
    renderer.screen.version++;
    if (this.frames > END_HOLD) this.finish();
  }

  render(alpha: number) {
    if (!this.active) return;
    if (this.phase === 'montage' && this.reel) this.reel.render(alpha);
    else this.o.host.renderer.render();
  }
}
