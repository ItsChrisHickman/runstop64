import { Surface, TRANSPARENT, type BitmapFont, type Host, type SpriteHandle } from 'c64kit';
import { CREDIT } from './credits';
import { poseAt, type Figure, type Part } from './figures';
import { FLAT, movesFor, nameSpot, processionOf, troupeAt, type Move, type TroupeShape } from './procession';
import { WHOLE, cutTo, type Stage } from './stage';
import { bandAt, nameLeft, sharesOf, timelineOf, visitorLeft, walkOf, type Timeline, type Walk } from './timeline';

/**
 * The reward for beating a game (ENHANCED's addition: the game's own winning moment stays as it was, and what follows it is
 * ours), written once for every game. A game declares what is its own, as places running on its own engine (a `Reel`):
 *
 *  1. A montage of places: each one the game's own engine running (a new game of ours, never the player's), its creatures
 *     moving as the engine moves them, the hero driven by input as in play doing something that fits the place. Over it, in a
 *     part of the picture the game leaves empty (never on a box), the credits type on one line at a time; after the last line
 *     the cast parades across the last place, one creature at a time, each named all the way across in a colour of its own (so
 *     a name is never read as part of the credits), so every one has been seen by the end, in places it never is in the game.
 *  2. THE END and the player's numbers, then back to the title.
 *
 * Two kinds of reel exist, both in this folder's neighbours: a translated machine (`machine-reel.ts`, the Pendragon games, Thing
 * on a Spring, Jet Set Willy II) and a native engine (each rebuild's own: Monty, Auf Wiedersehen Monty, Moley
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
  /** The colour the text of the band reads in here, if not the show's (a plain band of another colour), and the names' (a colour apart from it that reads there too). */
  readonly ink?: number | undefined;
  readonly nameInk?: number | undefined;
  /** The part of the picture the room really shows (the VIC's border and the game's frame left out): the cast is seen only on it, cut off where it leaves it. Without it, the whole picture. */
  readonly shownArea?: Stage | undefined;
}

/** A place to revisit. */
export interface Place {
  /** Credit lines over it, one after another (a line types on, is held, and goes): upper case, at most `CREDIT.letters` letters. No credits: no empty band, so no visitors either. */
  credits?: readonly string[];
  /** How long it is shown at least (frames at 50 a second); longer if its credits and visitors need it. */
  frames: number;
  /**
   * `false`: none of the cast parades through this place (something the game does here wants the picture to itself). `true`: a place
   * after the last credit line, with no lines of its own, whose band is empty all the same: the parade may go on in it (the show
   * puts the cast in the last place with a line, and in these after it, each as many as fit in `limit`).
   */
  visitors?: boolean;
  /** The most frames this place can run (the hero has only so long a way, found safe): the parade takes only the walks that fit in it. Without it, the place can run as long as it needs. */
  limit?: number;
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
  /**
   * Where the creatures' names go, if not in the credits' row after a place's lines: another row the game leaves empty (eight pixels).
   * A name is up only while no credit line is, as ever.
   */
  nameRow?: number;
  /** The colour of the names, if not the show's (`colours.name`): one apart from the credits' that reads where they stand. */
  nameInk?: number;
  /** Frames a credit line is given (default `CREDIT.slot`). */
  creditSlot?: number;
  /** The column the text starts at (default `CREDIT.x`), and the most letters it can have (default `CREDIT.letters`): the span of the band the game leaves empty. */
  creditX?: number;
  creditLetters?: number;
  /** The colours of the credits, of the names, of the title and THE END, and of the numbers: indexes of the renderer's palette (default the C64's yellow, cyan, yellow and light grey; Moley Christmas's is the Spectrum's). */
  colours?: ShowColours;
  /** The row visitors stand on where neither the place nor the reel says (default `GROUND`). */
  ground?: number;
  /** Whether the show can run at all (the machines it needs are there); default yes. Checked once, as the show begins. */
  ready?(): boolean;
  /**
   * The parade as a procession (`procession.ts`), after the last place has run its course: the cast marching by in troupes on a
   * plain ground of its own, the hero last. Without it, the cast walks through the last place one at a time (`timeline.ts`).
   */
  procession?: ProcessionSpec;
}

/** The hero as he comes last in a procession: his walk and his dance (both recorded by the game). */
export interface Lead { walk: Figure; dance: Figure }

/** A procession's troupes, its hero and its ground (picture pixels). */
export interface ProcessionSpec {
  /** In order: a heading and how many of the cast (the next ones, in its order) march in it, at most `MARCH.most`. */
  troupes: readonly { title: string; size: number }[];
  /** The hero, last, dancing, under a heading of his own (blank: none), and the gag after him, if there is one (squashed flat, wobbling along). */
  hero?: { title: string; record(): Lead | null };
  gag?: () => Figure | null;
  /**
   * The ground: the picture from row `top` to its foot is one plain colour (`colour`, default black), the place's own picture
   * behind it left out, and the marchers' feet are on row `feet` with a line of `line` under them. The headings go in `titleRow`
   * and the names in `nameRows` (two rows, two names each), all inside it.
   */
  ground: { top: number; feet: number; line: number; colour?: number };
  titleRow: number;
  nameRows: readonly [number, number];
}

/** The show's colours (indexes of the renderer's palette). */
export interface ShowColours { credit: number; name: number; title: number; text: number }
const C64_COLOURS: ShowColours = { credit: CREDIT.colour, name: CREDIT.nameColour, title: 7, text: 15 };

/** Where a visitor's feet go when nothing says: the lower middle of the picture. */
export const GROUND = 150;

/** What the show needs of the game running it. */
interface RewardOptions {
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

type Phase = 'loading' | 'montage' | 'parade' | 'end';

/** The frames before a key or a tap skips it. */
const SKIP_AFTER = 100;
/** The frames the hero's feet are watched for the floor a visitor walks on (the lowest: he may be in a jump). */
const FLOOR_FRAMES = 50;
/** Frames THE END is held. */
const END_HOLD = 250;

/** A visitor at one moment, for tests: whose, where it stands (its left edge and the row of its feet) and its size. */
export interface Seen { name: string; left: number; feet: number; width: number; height: number }

/** The band's text now, for tests: what and where, whether it is a credit line or a name (the place's `index`th), and the colour the show draws it in. */
export interface Said { text: string; kind: 'credit' | 'name'; index: number; x: number; row: number; ink: number }

export class RewardShow {
  private phase: Phase = 'loading';
  private frames = 0;
  /** Frames since the show began (a key skips only after SKIP_AFTER of them; `frames` starts again with each place). */
  private shown = 0;
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
  /** The visitors' parts cut to the stage where they are half out (one spare surface for each handle). */
  private cuts: (Surface | null)[] = [];
  private readonly black = new Surface(320, 200, 0);
  private seen: Seen[] = [];
  private said: Said | null = null;
  /** The procession's troupes (made once the cast is recorded), its clock, and what it shows now (for tests). */
  private troupes: Troupe[] = [];
  private march: ReturnType<typeof processionOf> = { turns: [], length: 0 };
  private marching: Marching | null = null;

  constructor(private readonly o: RewardOptions) {}

  private get colours(): ShowColours { return this.o.spec.colours ?? C64_COLOURS; }

  /** The show is on (the game is ours, not the player's). */
  active = false;

  /** For tests: the figures recorded. */
  get cast(): readonly Figure[] { return this.figures; }

  /** For tests: where the show is, the place's reel, who is walking now and what the band says; in a procession, the troupe on now (its heading and the names up) and every troupe's heading and members. */
  get progress() {
    return {
      phase: this.phase, place: this.place, frames: this.frames, shown: this.shown, reel: this.reel, visitors: this.seen, said: this.said,
      figures: this.figures.map((f) => ({ name: f.name, poses: f.poses.length })), length: this.phase === 'parade' ? this.march.length : this.tl.length,
      marching: this.marching, troupes: this.troupes.map((t) => ({ title: t.title, names: t.members.map((m) => m.fig.name) })),
    };
  }

  /** Begin: `stats` are the lines under THE END. */
  start(stats: readonly string[]) {
    this.stop();
    this.active = true;
    this.phase = 'loading';
    this.frames = 0;
    this.shown = 0;
    this.stats = stats;
    this.figures = [];
    this.troupes = [];
    this.march = { turns: [], length: 0 };
    this.marching = null;
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
    return pressed && this.shown > SKIP_AFTER;
  }

  /** One frame of the show. */
  tick() {
    if (!this.active) return;
    const { renderer, input } = this.o.host;
    this.o.music.frame?.();
    this.frames++;
    this.shown++;
    if (this.phase === 'loading') {
      // (a black frame first, then the work: the cast is recorded in one go)
      if (this.frames === 1) { renderer.hideSprites(); renderer.backdrop = this.black; renderer.layout = null; renderer.screen.clear(TRANSPARENT); renderer.border = 0; return; }
      if (this.o.spec.ready && !this.o.spec.ready()) { this.finish(); return; }
      const { spec } = this.o;
      const recorded = spec.cast.map((record) => record());
      this.figures = recorded.flatMap((f) => (f ? [f] : []));
      if (spec.procession) {
        this.troupes = troupesOf(spec.procession, recorded);
        this.march = processionOf(this.troupes.map((t) => t.shape));
      }
      this.shares = sharesOf(spec.places, this.figures.length, spec.creditSlot ?? CREDIT.slot);
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
    this.seen = [];
    this.said = null;
    for (;;) {
      this.place++;
      const place = spec.places[this.place];
      if (!place) { if (spec.procession) this.beginParade(); else this.beginEnd(); return; }
      const reel = place.open();
      const share = this.shares[this.place] ?? 0;
      if (!reel) { this.owed += share; continue; }
      // (the cast it takes: its share, and what places that did not open left; the last place takes whoever is left)
      const left = this.figures.length - this.placed;
      // (none where the cast marches by in a procession of its own after the places)
      const take = place.visitors === false || spec.procession ? 0 : Math.min(left, share + this.owed);
      if (place.visitors !== false) this.owed = 0;
      this.visitors = this.figures.slice(this.placed, this.placed + take).map((_, k) => this.placed + k);
      this.placed += take;
      this.tl = timelineOf(place, this.visitors.length, spec.creditSlot ?? CREDIT.slot);
      this.walks = this.tl.beats.filter((b) => b.kind === 'name').map((b) => walkOf(b));
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
    if (this.frames < this.tl.length) return;
    // (the procession goes on over the last place, which keeps running behind it)
    if (this.o.spec.procession && this.place === this.o.spec.places.length - 1) this.beginParade();
    else this.nextPlace();
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

  /** Whether this turn's text goes in a row of its own, not the credits' (a name, where the game gives names a row). */
  private apart(now: NonNullable<ReturnType<typeof bandAt>>): boolean { return now.beat.kind === 'name' && this.o.spec.nameRow !== undefined; }

  /** The text for a reel whose band is a line of its panel: spaces to the column, then the text. */
  private padded(now: ReturnType<typeof bandAt>, place: Place, reel: Reel): string {
    if (!now || !reel.say || this.apart(now)) return '';
    const { x } = this.span(place);
    return ' '.repeat(Math.max(0, Math.floor((this.whereIs(now, place) - x) / 8))) + now.text;
  }

  /** The band's text, over the picture (after the reel has drawn it, so it stays on top). */
  private band(now: ReturnType<typeof bandAt>, place: Place, reel: Reel) {
    this.said = null;
    if (!now || now.text === '') return;
    const { spec } = this.o, apart = this.apart(now);
    const x = this.whereIs(now, place), row = apart && spec.nameRow !== undefined ? spec.nameRow : place.creditRow ?? spec.creditRow;
    const ink = this.inkOf(now.beat.kind, apart, reel);
    this.said = { text: now.text, kind: now.beat.kind, index: now.beat.index, x, row, ink };
    if (reel.say && !apart) return;
    const { screen } = this.o.host.renderer;
    this.o.font().draw(screen, now.text, x, row, ink);
    screen.version++;
  }

  /** The colour a turn's text is drawn in: a credit line in the credits' (the reel's, on a plain band), a name in the names' (the reel's on its band, unless in a row of its own). */
  private inkOf(kind: 'credit' | 'name', apart: boolean, reel: Reel): number {
    const { spec } = this.o;
    if (kind === 'credit') return reel.ink ?? this.colours.credit;
    return (apart ? undefined : reel.nameInk) ?? spec.nameInk ?? this.colours.name;
  }

  /** The row a visitor's feet stand on: the place's own, else where the hero's feet are (the lowest of the last moments); a band at the foot of the picture is never stood on. */
  private floor(place: Place): number {
    const row = place.creditRow ?? this.o.spec.creditRow;
    const stand = this.fixed ?? (this.feet.length > 0 ? Math.max(...this.feet) : this.ground);
    return row > 96 ? Math.min(stand, row) : stand;
  }

  /** The visitors on their way, over the picture: one handle per part drawn, shared along the line. */
  private drawVisitors(t: number, place: Place) {
    const stage = this.reel?.shownArea ?? WHOLE;
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
      for (const part of poseAt(fig, t - walk.from).parts) used = this.put(used, part.surface, left + part.dx, top + part.dy, stage);
    });
    this.putAway(used);
  }

  /** A part of a figure drawn on handle `used` (made if there are not that many yet), cut to the stage (a part half out is cut, one wholly out is not drawn): the next handle. */
  private put(used: number, surface: Surface, x: number, y: number, stage: Stage): number {
    while (this.handles.length <= used) { this.handles.push(this.o.host.renderer.createSprite(20 + this.handles.length * 0.001)); this.cuts.push(null); }
    const { cut, spare } = cutTo(surface, x, y, stage, this.cuts[used] ?? null);
    const h = this.handles[used];
    this.cuts[used] = spare;
    if (h && cut) { h.surface = cut.surface; h.x = cut.x; h.y = cut.y; h.visible = true; } else if (h) h.visible = false;
    return used + 1;
  }

  /** The handles from `used` on hidden. */
  private putAway(used: number) { for (let k = used; k < this.handles.length; k++) { const h = this.handles[k]; if (h) h.visible = false; } }

  // -- the procession

  private beginParade() {
    this.phase = 'parade';
    this.frames = 0;
    this.seen = [];
    this.said = null;
    this.marching = null;
    // (the last place stands still behind it as it was last drawn, its own figures put away: the hero comes in the procession; with no place, a black picture)
    const { renderer } = this.o.host;
    renderer.hideSprites();
    if (!this.reel) { renderer.backdrop = this.black; renderer.screen.clear(TRANSPARENT); }
  }

  /** One frame of the procession: the last place's picture behind, the plain ground over its lower part, the troupe on now, its heading and the names up. */
  private parade() {
    const proc = this.o.spec.procession;
    if (!proc || this.frames > this.march.length) { this.beginEnd(); return; }
    const { screen } = this.o.host.renderer, font = this.o.font();
    const t = this.frames - 1;
    const { ground } = proc;
    screen.fillRect(0, ground.top, 320, 200 - ground.top, ground.colour ?? 0);
    screen.fillRect(0, ground.feet, 320, 1, ground.line);
    this.seen = [];
    this.marching = null;
    let used = 0;
    const k = this.march.turns.findIndex((turn) => t >= turn.from && t < turn.from + turn.length);
    const troupe = this.troupes[k], turn = this.march.turns[k];
    if (troupe && turn) {
      const into = t - turn.from;
      const { stances, named } = troupeAt(troupe.shape, into);
      const names = named.map((n) => troupe.members[n]?.fig.name ?? '');
      this.marching = { troupe: k, title: troupe.title, names };
      if (troupe.title) font.draw(screen, troupe.title, 8, proc.titleRow, this.colours.title);
      const nameInk = this.o.spec.nameInk ?? this.colours.name;
      names.forEach((name, n) => { const at = nameSpot(n, proc.nameRows); font.draw(screen, name, at.x, at.row, nameInk); });
      troupe.members.forEach((m, n) => {
        const st = stances[n];
        if (!st) return;
        const fig = st.dancing && m.dance ? m.dance : m.fig;
        const pose = poseAt(fig, st.dancing ? st.moveAt : into);
        const feet = ground.feet - st.lift;
        if (st.left + fig.width > 0 && st.left < 320) this.seen.push({ name: m.fig.name, left: st.left, feet, width: fig.width, height: fig.foot });
        for (const part of pose.parts) {
          const drawn = shapedPart(fig, part, st.mirror, st.squash);
          used = this.put(used, drawn.surface, st.left + drawn.dx, feet - fig.foot + drawn.dy, WHOLE);
        }
      });
    }
    screen.version++;
    this.putAway(used);
  }

  // -- THE END

  private beginEnd() {
    this.reel?.dispose();
    this.reel = null;
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

// ---- the procession's troupes -------------------------------------------------------------------------------------

/** A troupe of the procession: its heading, its members (a figure each, and the hero's dance), and its shape for the clock. */
interface Troupe { title: string; members: { fig: Figure; dance?: Figure }[]; shape: TroupeShape }

/** What the procession shows now, for tests: which troupe, its heading and the names up. */
export interface Marching { troupe: number; title: string; names: readonly string[] }

/** The troupes from the cast as recorded (one that could not be is left out of its troupe; a troupe left with none is not made), the hero's last. */
function troupesOf(proc: ProcessionSpec, recorded: readonly (Figure | null)[]): Troupe[] {
  let at = 0;
  const out = proc.troupes.flatMap((t, i): Troupe[] => {
    const figs = recorded.slice(at, at + t.size).flatMap((f) => (f ? [f] : []));
    at += t.size;
    const moves = movesFor(i, figs.length);
    const members = figs.map((fig, k) => ({ fig, move: moves[k] ?? 'hop' }));
    return members.length ? [{ title: t.title, members, shape: { members: members.map((m) => ({ width: m.fig.width, move: m.move })) } }] : [];
  });
  const lead = proc.hero?.record() ?? null;
  if (lead && proc.hero) {
    const gag = proc.gag?.() ?? null;
    // (the gag behind him, at the left)
    const members: { fig: Figure; dance?: Figure; move: Move }[] = [...(gag ? [{ fig: gag, move: 'flat' as const }] : []), { fig: lead.walk, dance: lead.dance, move: 'dance' }];
    out.push({ title: proc.hero.title, members, shape: { members: members.map((m) => ({ width: m.fig.width, move: m.move })) } });
  }
  return out;
}

/** The pictures made of a part: mirrored, squashed (kept, so each is made once). */
const shaped = new WeakMap<Surface, Map<string, Surface>>();

/** A part of a figure as a stance draws it: turned about (mirrored in the figure's box) and squashed down to its feet (the gag spread wide too). */
function shapedPart(fig: Figure, part: Part, mirror: boolean, squash: number): Part {
  if (!mirror && squash === 1) return part;
  const src = part.surface;
  const wide = squash <= FLAT ? 1.5 : 1;
  const w = Math.round(src.width * wide), h = Math.max(1, Math.round(src.height * squash));
  const key = `${mirror ? 1 : 0}:${w}x${h}`;
  let made = shaped.get(src);
  if (!made) { made = new Map(); shaped.set(src, made); }
  let out = made.get(key);
  if (!out) {
    out = new Surface(w, h, TRANSPARENT);
    out.palette = src.palette;
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const sx = Math.min(src.width - 1, Math.floor(((mirror ? w - 1 - x : x) * src.width) / w)), sy = Math.min(src.height - 1, Math.floor((y * src.height) / h));
      out.pixels[y * w + x] = src.pixels[sy * src.width + sx] ?? TRANSPARENT;
    }
    out.version++;
    made.set(key, out);
  }
  // (mirrored in the figure's box; squashed toward its feet, spread about its middle)
  const dx0 = mirror ? fig.width - part.dx - src.width : part.dx;
  return { surface: out, dx: Math.round(dx0 - (w - src.width) / 2), dy: Math.round(fig.foot - (fig.foot - part.dy) * squash) };
}
