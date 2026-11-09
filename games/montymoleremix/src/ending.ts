import { VicView, type Renderer } from 'c64kit';
import { PORT_CREDITS } from '../../shared/ending/credits';
import { recordFigure, shotFeet, vicShot, type Figure, type SpriteShot } from '../../shared/ending/figures';
import { RoutePilot } from '../../shared/ending/pilot';
import type { Place, Reel, RewardSpec } from '../../shared/ending/show';
import { COAL_TOTAL, STILL_THERE, piecesOfRoom } from '../../montymole/src/coal-rules';
import { EnemyState } from '../../montymole/src/enemy-rules';
import { CREATURE_SPRITE, RemixGame } from './game';
import { ROUTES, type SceneRoute, type SceneStart } from './ending-routes';
import { ROOM_COUNT, type RemixFound } from './map';

/**
 * The reward for beating Wanted: Monty Mole Remix (ENHANCED; shared/ending/show.ts is the show, this is what is the remix's), as the other Monty games have it:
 * a montage of the first eight rooms, each one the game's own engine on a game of its own, Monty driven by the route found for the room (test/ending-routes.ts:
 * the passability bot's way, a stick a frame: the coal of the room, and the way on), the credits typing on in the row under the playfield, which Wanted's rooms
 * leave empty, and the game's creatures (Monty on the Run's, as the remix draws them) walking through the rooms; then THE END with the numbers the pause screen keeps.
 */

/** The row under the playfield (screen row 23, between the room and the bottom of the screen), which the game leaves empty. */
export const CREDIT_ROW = 184;

/** A place of the montage: the room and its credit lines (upper case, at most 38 letters, the lettering of the font). */
const PLAN: readonly (readonly [number, readonly string[]])[] = [
  [0, ['WANTED: MONTY MOLE, 1984', 'A GREMLIN GRAPHICS GAME FOR THE', 'ZX SPECTRUM, JULY 1984', 'CREATED AND PROGRAMMED BY PETER HARRAP']],
  [1, ['MONTY MOLE WAS CREATED BY IAN STEWART', 'THE DIRECTOR OF GREMLIN GRAPHICS', 'COVER AND INLAY ART BY DAVID BRACHER', 'A RAID ON A SOUTH YORKSHIRE PIT']],
  [2, ['DURING THE MINERS STRIKE OF 1984', '21 ROOMS, 64 PIECES OF COAL', 'THE TUNES ARE ON THE BEEPER:', 'COLONEL BOGEY BY KENNETH ALFORD']],
  [3, ['ABIDE WITH ME, TO MONKS EVENTIDE', 'CRASH GAVE IT 92 PERCENT AND A SMASH', 'NUMBER 2 IN THE ALL FORMATS CHART', 'IN THE WEEK TO 13 SEPTEMBER 1984']],
  [4, ['20000 COPIES SOLD IN SIX WEEKS', 'CRASH READERS BEST PLATFORM GAME', 'FOLLOWED BY MONTY IS INNOCENT, 1985', 'MONTY ON THE RUN, 1985']],
  [5, ['MONTY ON THE RUN: C64 VERSION BY', 'MICRO PROJECTS LTD, 1985', 'ANTHONY CLARKE AND JASON PERKINS', 'GRAPHICS BY MARK RODGERS']],
  [6, ['MUSIC BY ROB HUBBARD', 'THIS REMIX PLAYS WANTED WITH MONTY', 'AND THE LOOK OF MONTY ON THE RUN', 'EACH PIECE OF COAL IS WORTH A BYTE']],
  [7, [...PORT_CREDITS, 'THANKS FOR PLAYING']],
];

export const SCENE_ROOMS: readonly number[] = PLAN.map(([room]) => room);
export const LINES: readonly string[] = PLAN.flatMap(([, credits]) => credits);

export function routeOf(room: number): SceneRoute {
  const route = ROUTES[room];
  if (route === undefined) throw new Error(`no route for room ${room}`);
  return route;
}

/** A new game put at a scene's start, the coal all there but for `taken` pieces taken elsewhere, the room loaded, nothing able to kill him (the routes are found without a death). */
export function sceneGame(room: number, start: SceneStart): RemixGame {
  const g = new RemixGame();
  g.start(false);
  const here = new Set(piecesOfRoom(room));
  let left = start.taken;
  g.coal.flags.forEach((flag, id) => {
    if (left > 0 && !here.has(id)) { g.coal.flags[id] = flag & ~STILL_THERE; left--; }
  });
  g.enterAt(room, start.x2, start.y, start.facing);
  return g;
}

/** The montage's engine: a game of its own and the view that draws it, made once. */
class Stage {
  readonly game = new RemixGame();
  readonly view: VicView;
  constructor(readonly renderer: Renderer) {
    // (nothing in the montage can end him: the routes are found without a death)
    this.game.graceActive = () => true;
    this.view = new VicView(renderer, this.game.vic);
  }
}

/** A place running: the game's frames with Monty's stick from his route. */
class RoomReel implements Reel {
  private readonly pilot: RoutePilot;
  private collisions = 0;
  constructor(private readonly stage: Stage, room: number) {
    const route = routeOf(room);
    stage.game.copyFrom(sceneGame(room, route));
    this.pilot = new RoutePilot(route.route);
  }

  tick(): void {
    const g = this.stage.game;
    const stick = this.pilot.next();
    g.input = stick;
    g.inputFire = stick.fire;
    g.frame(this.collisions);
  }

  draw(): void {
    this.stage.view.update();
    this.collisions = this.stage.view.collisions();
  }

  render(alpha: number): void { this.stage.view.render(alpha); }

  dispose(): void { this.stage.renderer.hideSprites(); }

  /** The row Monty's feet are on (sprite 3). */
  get ground(): number | undefined {
    const shot = vicShot(this.stage.game.vic, 3);
    return shot ? shotFeet(shot) : undefined;
  }
}

// ---- the cast ----------------------------------------------------------------------------------------

/**
 * The creatures that visit the places: a name by what it is drawn as in the remix (Monty on the Run's creature for Wanted's kind: kinds.ts), the room it
 * first appears in and its record there. (The game names none.)
 */
export const CAST: readonly { readonly name: string; readonly room: number; readonly slot: number }[] = [
  { name: 'KETTLE', room: 0, slot: 1 },
  { name: 'EYE ON A STALK', room: 0, slot: 0 },
  { name: 'LAMP', room: 1, slot: 2 },
  { name: 'SMILEY', room: 3, slot: 2 },
  { name: 'CONE', room: 4, slot: 0 },
  { name: 'GHOST', room: 4, slot: 2 },
  { name: 'DISH', room: 5, slot: 0 },
  { name: 'COG', room: 6, slot: 0 },
];

/** Frames of a creature recorded: more than any of its legs takes to go there and back. */
const RECORDED = 600;

/** A creature as the engine shows it going its way: the game runs in the room it first appears in, Monty held out of the way. */
function recordCreature(stage: Stage, name: string, room: number, slot: number): Figure | null {
  const g = stage.game;
  const sprite = CREATURE_SPRITE[slot];
  if (sprite === undefined) return null;
  const start = new RemixGame();
  start.start(false);
  start.enterAt(room, 0x1c + 2, 0x32 + 8 * 3);
  g.copyFrom(start);
  const moments: SpriteShot[][] = [];
  for (let f = 0; f < RECORDED; f++) {
    g.x2 = 0x1c + 2; g.y = 0x32 + 8 * 3; g.falling = 0; g.montyAction = 0; // (up in the corner: nothing in the room is his to meet)
    g.frame(0);
    const shot = vicShot(g.vic, sprite);
    const e = g.creatures[slot];
    if (shot !== null && e !== undefined && e.state !== EnemyState.none) moments.push([shot]);
  }
  return recordFigure(name, moments);
}

// ---- the show -----------------------------------------------------------------------------------------

export function remixEnding(renderer: Renderer): RewardSpec {
  let made: Stage | null = null;
  const stage = (): Stage => (made ??= new Stage(renderer));
  const places: Place[] = PLAN.map(([room, credits]): Place => ({
    credits,
    // (a room lasts as long as its credits and visitors take: the route's first part is played, the rest is not needed)
    frames: 0,
    open: () => new RoomReel(stage(), room),
  }));
  return {
    title: 'WANTED: MONTY MOLE REMIX',
    places,
    cast: CAST.map((c) => () => recordCreature(stage(), c.name, c.room, c.slot)),
    creditRow: CREDIT_ROW,
  };
}

/** The lines under THE END: the score and what the pause screen keeps (lives, rooms, coal), the numbers in a column. */
export function endingStats(g: RemixGame, found: RemixFound): string[] {
  const rows: (readonly [string, string])[] = [['SCORE', String(g.score)], ['LIVES', String(g.lives)], ['ROOMS', `${found.reached.length}/${ROOM_COUNT}`], ['COAL', `${g.coal.taken}/${COAL_TOTAL}`]];
  return rows.map(([label, value]) => `${label.padEnd(6)}${value.padStart(8)}`);
}
