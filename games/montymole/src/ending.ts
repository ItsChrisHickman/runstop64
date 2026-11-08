import { Surface, TRANSPARENT, type Renderer } from 'c64kit';
import { PORT_CREDITS } from '../../shared/ending/credits';
import { footOf, type Figure, type Pose } from '../../shared/ending/figures';
import { RoutePilot } from '../../shared/ending/pilot';
import type { Place, Reel, RewardSpec } from '../../shared/ending/show';
import type { Stage } from '../../shared/ending/stage';
import { cellInk, cellPaper, PICTURE_HEIGHT, PICTURE_LEFT, PICTURE_TOP, PICTURE_WIDTH, SPECTRUM } from '../../shared/spectrum';
import { STILL_THERE } from './coal';
import { keyByte, portsFor } from './controls';
import { imageAt, SPRITE_BYTES } from './data';
import { ROUTES, type SceneRoute, type SceneStart } from './ending-routes';
import type { MontyFlow } from './flow';
import type { Game } from './game';
import { COAL_TOTAL, piecesOfRoom, ROOM_COUNT, type MontyFound } from './map';
import { SteadyGame } from './steady';
import { SPRITE_SIZE } from './scenery';
import { MontyView, SPECTRUM_COLOURS } from './view';

/**
 * The reward for beating Wanted: Monty Mole (ENHANCED; shared/ending/show.ts is the show, this is what is Monty's): a montage of rooms of the mine and the castle, each one
 * the game's own engine on a game of its own (`SteadyGame`, whose random numbers make a route found by a search the same game when it is played again) with Monty driven by
 * the route found for the room (re/ending/route.ts: the test suite's bot, as keys: the coal of the room, and the way on), the credits typing on in the top row where the score
 * is (the status rows put away: the score and the lives mean nothing in a show, so nothing is ever under a line), and the game's creatures walking through the rooms; then
 * THE END with the numbers the pause screen keeps and the title's Colonel Bogey all through.
 */

/** The row the credits are drawn at (surface pixels): the top status row, where the score is in play. */
export const CREDIT_ROW = PICTURE_TOP + 3;
/** The rows the status lines take: the show puts both away (surface pixels): the two cell rows at the top and at the bottom of the picture. */
export const STATUS_TOP = { from: PICTURE_TOP, to: PICTURE_TOP + 16 } as const;
export const STATUS_BOTTOM = { from: PICTURE_TOP + PICTURE_HEIGHT - 16, to: PICTURE_TOP + PICTURE_HEIGHT } as const;
/** The part of the picture the room is shown in: the creatures are seen only on it. */
export const STAGE: Stage = { x: PICTURE_LEFT, y: STATUS_TOP.to, w: PICTURE_WIDTH, h: STATUS_BOTTOM.from - STATUS_TOP.to };

/** A scene: the room and its credit lines (upper case, at most 38 letters, the lettering of our font: no apostrophes). */
const PLAN: readonly (readonly [number, readonly string[]])[] = [
  [0, ['WANTED: MONTY MOLE, 1984', 'A GREMLIN GRAPHICS GAME FOR THE', 'ZX SPECTRUM, JULY 1984', 'CREATED AND PROGRAMMED BY PETER HARRAP']],
  [1, ['MONTY MOLE WAS CREATED BY IAN STEWART', 'THE DIRECTOR OF GREMLIN GRAPHICS', 'COVER AND INLAY ART BY DAVID BRACHER', 'A RAID ON A SOUTH YORKSHIRE PIT']],
  [2, ['DURING THE MINERS STRIKE OF 1984', '21 ROOMS, 64 PIECES OF COAL', 'THE TUNES ARE ON THE BEEPER:', 'COLONEL BOGEY BY KENNETH ALFORD']],
  [3, ['ABIDE WITH ME, TO MONKS EVENTIDE', 'CRASH GAVE IT 92 PERCENT AND A SMASH', 'NUMBER 2 IN THE ALL FORMATS CHART', 'IN THE WEEK TO 13 SEPTEMBER 1984']],
  [4, ['20000 COPIES SOLD IN SIX WEEKS', 'CRASH READERS BEST PLATFORM GAME', 'FOLLOWED BY MONTY IS INNOCENT, 1985', 'MONTY ON THE RUN, 1985']],
  [5, ['AUF WIEDERSEHEN MONTY, 1987', 'MOLEY CHRISTMAS, 1987', 'IMPOSSAMOLE, 1990']],
  [6, ['EACH PIECE OF COAL IS WORTH A BYTE', 'LEFT OVER FROM THE SOURCE CODE']],
  [7, [...PORT_CREDITS, 'THANKS FOR PLAYING']],
];

export const SCENE_ROOMS: readonly number[] = PLAN.map(([room]) => room);
export const LINES: readonly string[] = PLAN.flatMap(([, credits]) => credits);

export function routeOf(room: number): SceneRoute {
  const route = ROUTES[room];
  if (route === undefined) throw new Error(`no route for room ${room}`);
  return route;
}

/**
 * A game of the route's key put at the room's way in, the coal all there but for `taken` pieces taken elsewhere (so that the room's own
 * piece is the one a gate counts: a gate's room opens its gate in the show).
 */
export function sceneGame(room: number, start: SceneStart): SteadyGame {
  const game = new SteadyGame(start.key); // (a game as it is made: every piece of coal there, room 0's creatures as the data has them, which is what the opening scene's gift leaves)
  const here = piecesOfRoom(room);
  let left = start.taken;
  game.coal.flags.forEach((flag, id) => {
    if (left > 0 && !here.includes(id)) { game.coal.flags[id] = flag & ~STILL_THERE; left--; }
  });
  game.travel(room, start.x, start.y);
  return game;
}

/** The montage's engine: the view that draws the game of a room, made once (it makes the renderer's sprites). */
class MontyStage {
  private view: MontyView | null = null;
  constructor(readonly renderer: Renderer) {}

  viewOf(game: Game): MontyView {
    if (this.view === null) this.view = new MontyView(this.renderer, game, 'enhanced');
    else this.view.setGame(game);
    return this.view;
  }
}

/** Frames a pass is shown for (the game's own pace in the rooms). */
const PASS_FRAMES = 2;

/** A room running: the game's passes with Monty's keys from his route, one every two frames. */
class RoomReel implements Reel {
  private readonly pilot: RoutePilot;
  readonly game: SteadyGame;
  private readonly view: MontyView;
  private fresh = false;
  private frame = 0;

  constructor(private readonly stage: MontyStage, room: number) {
    const route = routeOf(room);
    this.game = sceneGame(room, route);
    this.pilot = new RoutePilot(route.route);
    this.view = stage.viewOf(this.game);
    stage.renderer.sparkles.set([]);
  }

  tick(): void {
    this.fresh = this.frame++ % PASS_FRAMES === 0 && !this.pilot.done;
    if (!this.fresh) return;
    const stick = this.pilot.next();
    this.game.pass(portsFor(keyByte(stick, stick.fire)));
  }

  draw(): void {
    this.view.update({ fresh: this.fresh, frames: PASS_FRAMES });
    // (the status rows put away: the score and the lives mean nothing here, and the top row is the credits')
    const { screen } = this.stage.renderer;
    const width = screen.width;
    for (const band of [STATUS_TOP, STATUS_BOTTOM]) screen.pixels.fill(0, band.from * width, band.to * width);
    screen.version++;
  }

  render(alpha: number): void { this.view.render(alpha); }

  dispose(): void { this.stage.renderer.hideSprites(); }

  get shownArea(): Stage { return STAGE; }

  /** The row Monty's feet are on (his picture is 16 rows from the top, which is 191 - y). */
  get ground(): number { return PICTURE_TOP + 191 - this.game.monty.y + SPRITE_SIZE; }
}

// ---- the cast ---------------------------------------------------------------------------------------

/** A creature's picture in the colour ENHANCED shows sprites in. */
function surfaceOf(address: number, attr: number): Surface {
  const image = imageAt(address);
  const ink = cellInk(attr) === cellPaper(attr) ? SPECTRUM.white : cellInk(attr);
  const s = new Surface(SPRITE_SIZE, SPRITE_SIZE, TRANSPARENT);
  s.palette = SPECTRUM_COLOURS;
  for (let y = 0; y < SPRITE_SIZE; y++) {
    for (let x = 0; x < SPRITE_SIZE; x++) {
      if (((image[y * 2 + (x >> 3)] ?? 0) & (0x80 >> (x & 7))) !== 0) s.pixels[y * s.width + x] = ink;
    }
  }
  s.version++;
  return s;
}

/** The pictures a creature shows going its way (the four of its set, in order, a picture for two passes: `(counter >> 1) & 3`), as a figure. */
function figureOf(name: string, set: number, attr: number): Figure {
  const poses: Pose[] = [0, 1, 2, 3].map((k) => ({ parts: [{ surface: surfaceOf(set + SPRITE_BYTES * k, attr), dx: 0, dy: 0 }], frames: 2 * PASS_FRAMES }));
  return { name, poses, width: SPRITE_SIZE, height: SPRITE_SIZE, foot: footOf(poses) };
}

/**
 * The creatures that visit the places: a name by what it looks like (the game names none), the address of the picture set it goes right with (the data's
 * `sets[3]`, or the set it has) and the colour byte of its record, from the room it is first met in (the room is in the comment).
 */
export const CAST: readonly (readonly [string, number, number])[] = [
  ['THE HAIRSPRAY', 0x6700, 0x47], // room 1
  ['THE LAMP', 0x6780, 0x44], // room 1
  ['THE PICKET', 0x6080, 0x40], // room 1
  ['THE CANDLE', 0x6400, 0x46], // room 2
  ['THE BELL', 0x6380, 0x45], // room 5
  ['THE FISH', 0x6c00, 0x40], // room 5
  ['THE CHOMPER', 0x6880, 0x44], // room 6
  ['THE ANGRY FACE', 0x6980, 0x44], // room 4
];

// ---- the show ---------------------------------------------------------------------------------------

export function montyEnding(renderer: Renderer): RewardSpec {
  const stage = new MontyStage(renderer);
  const places: Place[] = PLAN.map(([room, credits]): Place => ({
    credits,
    // (a room lasts as long as its credits and visitors take: the route's first part is played, the rest is not needed)
    frames: 0,
    open: () => new RoomReel(stage, room),
  }));
  return {
    title: 'WANTED: MONTY MOLE',
    places,
    cast: CAST.map(([name, set, attr]) => () => figureOf(name, set, attr)),
    creditRow: CREDIT_ROW,
    colours: { credit: SPECTRUM.yellow, title: SPECTRUM.yellow, text: SPECTRUM.text },
  };
}

/** The lines under THE END: what the pause screen keeps (lives, rooms, coal, score). */
export function endingStats(flow: MontyFlow, found: MontyFound): string[] {
  const g = flow.game;
  return [`SCORE ${g.score.value}`, `HIGH SCORE ${Math.max(flow.highScore, g.score.value)}`, `COAL ${g.coal.taken} OF ${COAL_TOTAL}`, `ROOMS ${found.reached.length} OF ${ROOM_COUNT}`];
}
