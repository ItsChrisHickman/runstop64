import { Surface, TRANSPARENT, type BitmapFont, type Host, type SpriteHandle } from 'c64kit';
import { CREDIT } from './credits';
import { poseAt, type Figure } from './figures';
import { bandAt, nameLeft, sharesOf, timelineOf, visitorLeft, walkOf, type Timeline, type Walk } from './timeline';

/**
 * The reward for beating a game (ENHANCED's addition: the game's own winning moment stays as it was, and what follows it is
 * ours), written once for every game. A game declares what is its own, as places running on its own engine (a `Reel`):
 *
 *  1. A montage of places: each one the game's own engine running (a new game of ours, never the player's), its creatures
 *     moving as the engine moves them, the hero driven by input as in play doing something that fits the place. Over it, in a
 *     part of the picture the game leaves empty (never on a box), the credits type on one line at a time, and between the
 *     lines the show names the cast: the game's creatures walk across the place, each one named for a moment as it passes
 *     the middle, so every one has been seen by the end, in places it never is in the game.
 *  2. THE END and the player's numbers, then back to the title.
 *
 * Two kinds of reel exist, both in this folder's neighbours: a translated machine (`machine-reel.ts`, the Pendragon games, Thing
 * on a Spring, Jet Set Willy II) and a native engine (each rebuild's own: Monty, Auf Wiedersehen Monty, Starquake, Moley
 * Christmas, Antiriad). The show does the rest: the credits' timing, the visitors' recording and drawing, THE END, the skip.
 *
 * The game's tune plays all through (the game starts it: `music`). Any key or tap skips, after a couple of seconds.
 * Everything is drawn in the 320x200 picture in the game's own font and colours.
 */

// ---- what a game declares -------------------------------------------------------------------------

/** A place of the montage, running: one frame of the engine with the hero driven, then its picture. */
export interface Reel {
  /** One frame of the game's logic. */
  tick(): void;
  /** The picture into the renderer (the band's text goes over it after, unless `say` puts it in the picture itself). */
  draw(): void;
  render(alpha: number): void;
  /** Put away (the engine's sprites hidden). */
  dispose(): void;
  /** For a picture whose band is a line of the game's own panel: the text for the band this frame (blank: none), taken before `draw`. Without it the show draws the text. */
  readonly say?: ((text: string) => void) | undefined;
  /** The row (picture pixels) the hero's feet are on now: where the visitors' feet go (the lowest of the last moments, as his jumps do not count). Without it the place's `ground`, else the show's. */
  readonly ground?: number | undefined;
  /** The colour the text of the band reads in here, if not the show's (a plain band of another colour). */
  readonly ink?: number | undefined;
}

/** A place to revisit. */
export interface Place {
  /** Credit lines over it, one after another (a line types on, is held, and goes): upper case, at most `CREDIT.letters` letters. No credits: no empty band, so no visitors either. */
  credits?: readonly string[];
  /** How long it is shown at least (frames at 50 a second); longer if its credits and visitors need it. */
  frames: number;
  /** `false`: none of the cast walks through this place (something the game does here wants the picture to itself). */
  visitors?: false;
  /** The frame the band is empty from (default 0): where the first part of the place has it occupied. */
  bandFrom?: number;
  /** The row its text goes on, if not the show's (a place where the game's creatures are in the show's row). */
  creditRow?: number;
  /** The column its text starts at, if not the show's (a place whose empty part is not the picture's left). */
  creditX?: number;
  /** The row the visitors stand on in this place, if the reel does not say. */
  ground?: number;
  /** The place running, or null if it can't be made. */
  open(): Reel | null;
}

export interface RewardSpec {
  /** Over THE END. */
  title: string;
  places: readonly Place[];
  /** The cast, recorded once the show begins (one that can't be is left out): the creatures that visit the places. The hero is not here: he is in every place. */
  cast: readonly (() => Figure | null)[];
  /** The row (picture pixels) the text is drawn at: eight pixels the game leaves empty. */
  creditRow: number;
  /** Frames a credit line is given (default `CREDIT.slot`). */
  creditSlot?: number;
  /** The column the text starts at (default `CREDIT.x`), and the most letters it can have (default `CREDIT.letters`): the span of the band the game leaves empty. */
  creditX?: number;
  creditLetters?: number;
  /** The colours of the text, of the title and THE END, and of the numbers: indexes of the renderer's palette (default the C64's yellow and light grey; Moley Christmas's is the Spectrum's). */
  colours?: ShowColours;
  /** The row visitors stand on where neither the place nor the reel says (default `GROUND`). */
  ground?: number;
  /** Whether the show can run at all (the machines it needs are there); default yes. Checked once, as the show begins. */
  ready?(): boolean;
}

/** The show's colours (indexes of the renderer's palette). */
export interface ShowColours { credit: number; title: number; text: number }
const C64_COLOURS: ShowColours = { credit: CREDIT.colour, title: 7, text: 15 };

/** Where a visitor's feet go when nothing says: the lower middle of the picture. */
export const GROUND = 150;

/** What the show needs of the game running it. */
export interface RewardOptions {
  host: Host;
  spec: RewardSpec;
  /** The game's font (its lettering, upper case). */
  font(): BitmapFont;
  /**
   * The tune: begins as the show does and again on its way out (the title's). A game whose tune runs on a machine of its own
   * (Antiriad's, on a C64 the show ticks) steps it each frame of the show with `frame`.
   */
  music: { start(): void; end(): void; frame?(): void };
  /** The show is over (or skipped). */
  done(): void;
}

// ---- THE END ---------------------------------------------------------------------------------------

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

type Phase = 'loading' | 'montage' | 'end';

/** The frames before a key or a tap skips it. */
const SKIP_AFTER = 100;
/** The frames the hero's feet are watched for the floor a visitor walks on (the lowest: he may be in a jump). */
const FLOOR_FRAMES = 50;
/** Frames THE END is held. */
const END_HOLD = 250;

/** A visitor at one moment, for tests: whose, where it stands (its left edge and the row of its feet) and its size. */
export interface Seen { name: string; left: number; feet: number; width: number; height: number }

/** The band's text now, for tests: what and where, and whether it is a credit line or a name (the place's `index`th). */
export interface Said { text: string; kind: 'credit' | 'name'; index: number; x: number; row: number }

export class RewardShow {
  private phase: Phase = 'loading';
  private frames = 0;
  private stats: readonly string[] = [];
  private figures: Figure[] = [];
  private place = -1;
  private reel: Reel | null = null;
  private tl: Timeline = { length: 0, beats: [] };
  /** The visitors of the place being shown (indexes into `figures`), the frames each walks, and the row their feet stand on. */
  private visitors: number[] = [];
  private walks: Walk[] = [];
  private ground = GROUND;
  /** The hero's feet over the last moments (the floor under a jump is the lowest), and where each visitor of the place stands (the floor at the frame its walk began). */
  private feet: number[] = [];
  private stands: (number | undefined)[] = [];
  /** How many of the cast each place takes, how many are placed, and how many a place that did not open left over. */
  private shares: number[] = [];
  private placed = 0;
  private owed = 0;
  /** A place's own floor, if it says (else the hero's). */
  private fixed: number | undefined;
  private handles: SpriteHandle[] = [];
  private readonly black = new Surface(320, 200, 0);
  private seen: Seen[] = [];
  private said: Said | null = null;

  constructor(private readonly o: RewardOptions) {}

  private get colours(): ShowColours { return this.o.spec.colours ?? C64_COLOURS; }

  /** The show is on (the game is ours, not the player's). */
  active = false;

  /** For tests: the figures recorded. */
  get cast(): readonly Figure[] { return this.figures; }

  /** For tests: where the show is, the place's reel, who is walking now and what the band says. */
  get progress() {
    return { phase: this.phase, place: this.place, frames: this.frames, reel: this.reel, visitors: this.seen, said: this.said, figures: this.figures.map((f) => ({ name: f.name, poses: f.poses.length })), length: this.tl.length };
  }

  /** Begin: `stats` are the lines under THE END. */
  start(stats: readonly string[]) {
    this.stop();
    this.active = true;
    this.phase = 'loading';
    this.frames = 0;
    this.stats = stats;
    this.figures = [];
    this.place = -1;
    this.placed = 0;
    this.owed = 0;
    this.seen = [];
    this.said = null;
    this.o.music.start();
  }

  /** Over: everything ours put away. */
  private stop() {
    this.reel?.dispose();
    this.reel = null;
    // (the game's sprites and ours: the game's own view puts back what it shows on its next frame)
    this.o.host.renderer.hideSprites();
    this.o.host.renderer.backdrop = null;
    this.o.host.renderer.layout = null;
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
    this.o.music.frame?.();
    this.frames++;
    if (this.phase === 'loading') {
      // (a black frame first, then the work: the cast is recorded in one go)
      if (this.frames === 1) { renderer.hideSprites(); renderer.backdrop = this.black; renderer.layout = null; renderer.screen.clear(TRANSPARENT); renderer.border = 0; return; }
      if (this.o.spec.ready && !this.o.spec.ready()) { this.finish(); return; }
      this.figures = this.o.spec.cast.flatMap((record) => { const f = record(); return f ? [f] : []; });
      const { spec } = this.o;
      this.shares = sharesOf(spec.places, this.figures.length, spec.creditSlot ?? CREDIT.slot);
      this.nextPlace();
      return;
    }
    if (this.skipped()) { this.finish(); return; }
    input.typed.length = 0;
    if (this.phase === 'montage') this.montage();
    else this.end();
  }

  // -- the montage

  private nextPlace() {
    const { spec } = this.o;
    this.reel?.dispose();
    this.reel = null;
    this.frames = 0;
    this.seen = [];
    this.said = null;
    for (;;) {
      this.place++;
      const place = spec.places[this.place];
      if (!place) { this.beginEnd(); return; }
      const reel = place.open();
      const share = this.shares[this.place] ?? 0;
      if (!reel) { this.owed += share; continue; }
      // (the cast it takes: its share, and what places that did not open left; the last place takes whoever is left)
      const left = this.figures.length - this.placed;
      const take = this.place === spec.places.length - 1 ? left : Math.min(left, share + this.owed);
      this.owed = 0;
      this.visitors = this.figures.slice(this.placed, this.placed + take).map((_, k) => this.placed + k);
      this.placed += take;
      const slot = spec.creditSlot ?? CREDIT.slot;
      this.tl = timelineOf(place, this.visitors.length, slot);
      this.walks = this.tl.beats.filter((b) => b.kind === 'name').map((b) => walkOf(b, this.tl.length));
      this.reel = reel;
      this.ground = spec.ground ?? GROUND;
      this.feet = [];
      this.stands = [];
      this.fixed = place.ground;
      this.o.host.renderer.backdrop = null;
      this.phase = 'montage';
      return;
    }
  }

  private montage() {
    const reel = this.reel, place = this.o.spec.places[this.place];
    if (!reel || !place) return;
    const t = this.frames - 1;
    const names = this.visitors.map((i) => this.figures[i]?.name ?? '');
    const now = bandAt(this.tl, t, place.credits ?? [], names);
    reel.tick();
    reel.say?.(this.padded(now, place, reel));
    reel.draw();
    // (feet lower than a band at the foot of the picture are a panel's icon, not the hero)
    const feet = reel.ground, row = place.creditRow ?? this.o.spec.creditRow;
    if (feet !== undefined && (row <= 96 || feet <= row)) { this.feet.push(feet); if (this.feet.length > FLOOR_FRAMES) this.feet.shift(); }
    this.drawVisitors(t, place);
    this.band(now, place, reel);
    if (this.frames >= this.tl.length) this.nextPlace();
  }

  /** The columns the band's text may use: where it starts and how many letters. */
  private span(place: Place) { return { x: place.creditX ?? this.o.spec.creditX ?? CREDIT.x, letters: this.o.spec.creditLetters ?? CREDIT.letters }; }

  /** The band's text where it stands: a name under its visitor, a credit line from the start. */
  private whereIs(now: NonNullable<ReturnType<typeof bandAt>>, place: Place): number {
    const { x, letters } = this.span(place);
    if (now.beat.kind === 'credit') return x;
    const walk = this.walks[now.beat.index], index = this.visitors[now.beat.index], fig = index === undefined ? undefined : this.figures[index];
    const left = walk && fig ? visitorLeft(walk, this.frames - 1, fig.width) : null;
    return nameLeft(left ?? x, now.text.length, x, letters);
  }

  /** The text for a reel whose band is a line of its panel: spaces to the column, then the text. */
  private padded(now: ReturnType<typeof bandAt>, place: Place, reel: Reel): string {
    if (!now || !reel.say) return '';
    const { x } = this.span(place);
    return ' '.repeat(Math.max(0, Math.floor((this.whereIs(now, place) - x) / 8))) + now.text;
  }

  /** The band's text, over the picture (after the reel has drawn it, so it stays on top). */
  private band(now: ReturnType<typeof bandAt>, place: Place, reel: Reel) {
    this.said = null;
    if (!now || now.text === '') return;
    const x = this.whereIs(now, place), row = place.creditRow ?? this.o.spec.creditRow;
    this.said = { text: now.text, kind: now.beat.kind, index: now.beat.index, x, row };
    if (reel.say) return;
    const { screen } = this.o.host.renderer;
    this.o.font().draw(screen, now.text, x, row, reel.ink ?? this.colours.credit);
    screen.version++;
  }

  /** The row a visitor's feet stand on: the place's own, else where the hero's feet are (the lowest of the last moments); a band at the foot of the picture is never stood on. */
  private floor(place: Place): number {
    const row = place.creditRow ?? this.o.spec.creditRow;
    const stand = this.fixed ?? (this.feet.length > 0 ? Math.max(...this.feet) : this.ground);
    return row > 96 ? Math.min(stand, row) : stand;
  }

  /** The visitors on their way, over the picture: one handle per part drawn, shared along the line. */
  private drawVisitors(t: number, place: Place) {
    const { renderer } = this.o.host;
    this.seen = [];
    let used = 0;
    this.walks.forEach((walk, k) => {
      const index = this.visitors[k], fig = index === undefined ? undefined : this.figures[index];
      if (!fig) return;
      const left = visitorLeft(walk, t, fig.width);
      if (left === null) return;
      const stand = (this.stands[k] ??= this.floor(place));
      const top = stand - fig.foot;
      this.seen.push({ name: fig.name, left, feet: stand, width: fig.width, height: fig.foot });
      poseAt(fig, t - walk.from).parts.forEach((part) => {
        while (this.handles.length <= used) this.handles.push(renderer.createSprite(20 + this.handles.length * 0.001));
        const h = this.handles[used++];
        if (!h) return;
        h.surface = part.surface; h.x = left + part.dx; h.y = top + part.dy; h.visible = true;
      });
    });
    for (let k = used; k < this.handles.length; k++) { const h = this.handles[k]; if (h) h.visible = false; }
  }

  // -- THE END

  private beginEnd() {
    this.phase = 'end';
    this.frames = 0;
    this.seen = [];
    this.said = null;
    const { renderer } = this.o.host;
    renderer.hideSprites();
    renderer.backdrop = this.black;
    // (THE END is drawn as it is, not in the layout a place was drawn in)
    renderer.layout = null;
    renderer.border = 0;
  }

  private end() {
    const { renderer } = this.o.host;
    const font = this.o.font();
    renderer.screen.clear(TRANSPARENT);
    font.draw(renderer.screen, this.o.spec.title, 8, 12, this.colours.title);
    bigText(renderer.screen, font, 'THE END', 24, 50, this.colours.title);
    this.stats.forEach((line, i) => font.draw(renderer.screen, line, 24, 100 + i * 14, this.colours.text));
    renderer.screen.version++;
    if (this.frames > END_HOLD) this.finish();
  }

  render(alpha: number) {
    if (!this.active) return;
    if (this.phase === 'montage' && this.reel) this.reel.render(alpha);
    else this.o.host.renderer.render();
  }
}
