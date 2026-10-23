import { Surface, TRANSPARENT, type Renderer } from 'c64kit';
import { PORT_CREDITS } from '../../shared/ending/credits';
import { footOf, type Figure, type Pose } from '../../shared/ending/figures';
import type { Place, Reel, RewardSpec } from '../../shared/ending/show';
import { SPECTRUM } from './colours';
import { Display, type SpritePlace } from './display';
import { ROUTES, type Route } from './ending-routes';
import { Pilot } from './ending-pilot';
import { ITEMS_TOTAL, itemsTaken, type MoleyFound } from './map';
import type { MoleyFlow } from './flow';
import { SPRITE_INK, spriteImage, spritePixel } from './look';
import { PANEL_TOP } from './picture';
import type { MoleySound } from './sound';
import { SteadyGame } from './steady';
import { MoleyView, PICTURE_TOP, SPECTRUM_COLOURS, SURFACE_HEIGHT, SURFACE_WIDTH } from './view';

/**
 * The reward for beating Moley Christmas (ENHANCED; shared/ending/show.ts is the show, this is what is Moley's): a montage of the six
 * screens, each the game's own engine on a game of its own (`SteadyGame`, whose random numbers make a route found by a search the
 * same game when it is played again) with Monty driven by the route found for the screen (re/ending/route.ts: the test suite's player
 * doing the screen's puzzle, as keys), the credits typing on in the rows where the panel was, and the creatures walking through the screens;
 * then THE END with the numbers the pause screen keeps. The panel (score, lives, the dial) means nothing in a show: its place is left
 * black, which is where the credits stand, so nothing is ever under a line. The music is the game's, from its start.
 */

/** The row the credits are drawn at (surface pixels): in the part of the surface the panel is, put away. */
export const CREDIT_ROW = 164;
/** Where that part begins in the surface: under the room, which is 144 rows of the picture. */
export const PANEL_ROW = PICTURE_TOP + PANEL_TOP;

/** A scene: the screen and its credit lines (upper case, at most 38 letters, the lettering of our font: no apostrophes). */
const PLAN: readonly (readonly [number, readonly string[]])[] = [
  [0, ['MOLEY CHRISTMAS, 1987', 'A GREMLIN GRAPHICS GAME FOR', 'YOUR SINCLAIR READERS', 'GAME CONCEPT BY PAUL JACKSON']],
  [1, ['PROGRAM CODE BY S HOLLINGWORTH', 'AND P HARRAP, WITH CHRIS KERRY', 'GRAPHICS BY P HARRAP', 'MUSIC BY BENN DAGLISH, 128K VERSION']],
  [2, ['DEVELOPED BY TEQUE SOFTWARE', 'DEVELOPMENT FOR GREMLIN GRAPHICS', 'FREE ON YOUR SINCLAIR 25, JANUARY 1988', 'ON SMASH TAPE 5']],
  [3, ['THE FIFTH MONTY MOLE GAME, AFTER', 'AUF WIEDERSEHEN MONTY', 'OVER 100000 COPIES OF YOUR SINCLAIR', 'WENT OUT WITH MONTY ON THE COVER']],
  [4, ['THE GREMLIN PROGRAMMERS MADE THEIR', 'OWN ESTIMATE OF THE CIRCULATION:', 'EIGHT CASSETTES, YOUR SINCLAIR SAID']],
  [5, ['THE LAST SCREEN HAD A MESSAGE:', 'THE FIRST TO SEND IT WON 15 GAMES', 'AND SIX MORE EACH WON THREE', 'GAMESTM, 2003: AN ESPECIALLY', 'POPULAR COVER GAME', ...PORT_CREDITS, 'THANKS FOR PLAYING']],
];

export const SCENE_ROOMS: readonly number[] = PLAN.map(([room]) => room);
export const LINES: readonly string[] = PLAN.flatMap(([, credits]) => credits);

function routeOf(room: number): Route {
  const route = ROUTES[room];
  if (!route) throw new Error(`no route for screen ${room}`);
  return route;
}

/** A game of the route's seed, its display, at the screen's start (what the route was found from: re/ending/route.ts). */
export function newScreen(room: number): { game: SteadyGame; display: Display } {
  const game = new SteadyGame(routeOf(room).seed);
  const display = new Display(game);
  display.hud();
  if (room > 0) game.travel(room);
  return { game, display };
}

/** The montage's engine: the view that draws the game of a screen, made once (it makes the renderer's sprites). */
class Stage {
  private view: MoleyView | null = null;
  constructor(readonly renderer: Renderer, readonly sound: MoleySound | null) {}

  viewOf(display: Display): MoleyView {
    if (this.view === null) this.view = new MoleyView(this.renderer, display, 'enhanced');
    else this.view.setDisplay(display);
    return this.view;
  }
}

/** A screen running: the game's passes with Monty's keys from his route. */
class ScreenReel implements Reel {
  private readonly pilot: Pilot;
  private readonly game: SteadyGame;
  private readonly display: Display;
  private readonly view: MoleyView;
  private fresh = false;
  private span = 2;

  constructor(private readonly stage: Stage, room: number) {
    ({ game: this.game, display: this.display } = newScreen(room));
    this.pilot = new Pilot(routeOf(room));
    this.view = stage.viewOf(this.display);
  }

  tick(): void {
    const { keys, fast } = this.pilot.frame();
    for (const k of keys) {
      this.game.pass(k);
      this.stage.sound?.afterStep(this.game, { frames: 2 });
    }
    this.fresh = keys.length > 0;
    this.span = fast ? 1 : 2;
  }

  draw(): void {
    this.view.update({ fresh: this.fresh, frames: this.span });
    // (the panel put away: the score, the lives and the dial mean nothing here, and its place is the credits')
    const { screen } = this.stage.renderer;
    screen.pixels.fill(0, PANEL_ROW * SURFACE_WIDTH, SURFACE_HEIGHT * SURFACE_WIDTH);
    screen.version++;
  }

  render(alpha: number): void { this.view.render(alpha); }

  dispose(): void { this.stage.renderer.hideSprites(); }

  /** The row Monty's feet are on (entity 0, a sprite 16 rows tall). */
  get ground() {
    const monty = this.game.entities[0];
    return monty === undefined ? undefined : PICTURE_TOP + monty.y + 16;
  }
}

// ---- the cast ---------------------------------------------------------------------------------------

/** Frames a pass is shown for (the game's own pace). */
const PASS_FRAMES = 2;

/** What entity `entity` shows in each pass of a screen's route (from `from` to `to`), as a figure facing right, the way the visitors walk. */
function recordFigure(name: string, room: number, entity: number, from = 0, to = Infinity): Figure | null {
  const { game, display } = newScreen(room);
  const poses: Pose[] = [];
  let last = -1, pass = 0;
  for (const [keys, passes] of routeOf(room).runs) {
    for (let p = 0; p < passes; p++, pass++) {
      game.pass(keys);
      if (pass < from || pass >= to) continue;
      const shown: SpritePlace | undefined = display.sprites().find((s) => s.entity === entity);
      if (shown === undefined) continue;
      const tail = poses[poses.length - 1];
      if (shown.frame === last && tail !== undefined) { tail.frames += PASS_FRAMES; continue; }
      last = shown.frame;
      poses.push({ parts: [{ surface: surfaceOf(shown.frame), dx: 0, dy: 0 }], frames: PASS_FRAMES });
    }
  }
  return poses.length > 0 ? { name, poses, width: 16, height: 16, foot: footOf(poses) } : null;
}

/** A sprite's picture facing right, in the colour ENHANCED shows sprites in. */
function surfaceOf(frame: number): Surface {
  const image = spriteImage(frame, false);
  const s = new Surface(16, 16, TRANSPARENT);
  s.palette = SPECTRUM_COLOURS;
  for (let y = 0; y < 16; y++) {
    for (let x = 0; x < 16; x++) if (spritePixel(image, x, y)) s.pixels[y * s.width + x] = SPRITE_INK;
  }
  s.version++;
  return s;
}

/** The creatures that visit the places, by what they look like (the game names none; the lamp is the code's own word for entity 1 of the first screen): screen and entity. */
const CAST: readonly (readonly [string, number, number])[] = [
  ['THE LAMP', 0, 1],
  ['THE WALKER', 0, 2],
  ['THE BLOB', 0, 4],
  ['THE TAPE REEL', 1, 1],
  ['THE CASSETTE', 2, 4],
  ['THE CAR', 3, 4],
  ['THE GHOST', 4, 7],
  ['THE CHOMPER', 4, 6],
];

// ---- the show ---------------------------------------------------------------------------------------

export function moleyEnding(renderer: Renderer, sound: MoleySound | null): RewardSpec {
  const stage = new Stage(renderer, sound);
  const places: Place[] = PLAN.map(([room, credits]): Place => ({
    credits,
    // (a screen lasts as long as its credits and visitors take: the route's first part is played, the rest is not needed)
    frames: 0,
    open: () => new ScreenReel(stage, room),
  }));
  return {
    title: 'MOLEY CHRISTMAS',
    places,
    cast: CAST.map(([name, room, entity]) => () => recordFigure(name, room, entity)),
    creditRow: CREDIT_ROW,
    colours: { credit: SPECTRUM.yellow, title: SPECTRUM.yellow, text: SPECTRUM.text },
  };
}

/** The lines under THE END: the score, the items and the lives (the numbers the pause screen keeps). */
export function endingStats(flow: MoleyFlow, found: MoleyFound): string[] {
  const g = flow.game;
  return [`SCORE ${g.score}`, `HIGH SCORE ${Math.max(g.highScore, g.score)}`, `ITEMS ${itemsTaken(flow, found)} OF ${ITEMS_TOTAL}`, `LIVES ${Math.max(0, g.lives)}`];
}
