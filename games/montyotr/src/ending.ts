import { VicView, type Renderer } from 'c64kit';
import { PORT_CREDITS } from '../../shared/ending/credits';
import { recordFigure, shotFeet, vicShot, type Figure, type SpriteShot } from '../../shared/ending/figures';
import type { Place, Reel, RewardSpec } from '../../shared/ending/show';
import { enemyRecords, exitGridImage } from './data';
import { Game, type Assists } from './game';
import { copyInto } from './game-copy';
import { montyMap, type MontyFound } from './map';
import { Pilot } from './pilot';
import { CAST, SCENES, type Scene } from './ending-scenes';

/**
 * The reward for beating Monty on the Run (ENHANCED; shared/ending/show.ts is the show, this is what is Monty's):
 * a montage of rooms from the journey, each one the game's own engine on a new game of ours with Monty driven by a route
 * (pilot.ts: input like a player's) doing something there, the credits typing on in the empty row under the playfield;
 * and the game's creatures walking through the places; then THE END with the numbers the pause screen keeps.
 */

/** The row under the playfield (screen row 23, between the room and its name), which the game leaves empty. */
export const CREDIT_ROW = 184;
/** Frames after what Monty does in a room before the next place (a moment to take it in). */
const TAIL = 40;

/** A new game, the state every place begins from (a game of the montage is put back to it first). */
let pristine: Game | null = null;

/**
 * Put Monty in a room (any, but the ending's) as a way in puts him, and let the room load (a dissolve is not played).
 * False if the room has no cell on the exit grid.
 */
export function enterRoom(g: Game, room: number, x2: number, y: number, facing = 0x01): boolean {
  const cell = exitGridImage.indexOf(room);
  if (cell < 0) return false;
  g.mapRow = Math.floor(cell / 23);
  g.exitCol = cell % 23;
  g.x2 = x2; g.y = y; g.facing = facing;
  g.dissolvePending = 0;
  g.roomExit = 1;
  g.freeze = 1;
  g.input = { left: false, right: false, up: false, down: false, fire: false };
  g.inputFire = false;
  for (let n = 0; n < 20 && (n === 0 || g.freeze || g.script); n++) g.frame(0);
  return !g.freeze && !g.script;
}

/** A new game, ready for a place: everything as in a game that has just begun, the scene's own needs taken. */
function beginPlace(g: Game, scene: Scene): boolean {
  copyInto(g, (pristine ??= new Game()));
  g.start();
  scene.prepare(g);
  return enterRoom(g, scene.room, scene.spot.x2, scene.spot.y, scene.spot.facing);
}

/** The montage's engine: a game of its own and the view that draws it, made once. */
class Stage {
  readonly game = new Game();
  readonly view: VicView;
  /** The score through the places (the HUD keeps counting). */
  score = 0;
  constructor(renderer: Renderer, assist: Assists) {
    this.game.assist = assist;
    // (nothing in the montage can end him: the routes are found without a death, and the crushers' timing is random)
    this.game.graceActive = () => true;
    this.view = new VicView(renderer, this.game.vic);
  }
}

/** A place running: the game's frames with Monty's stick from his route. */
class MontyReel implements Reel {
  private readonly pilot: Pilot;
  private collisions = 0;
  constructor(private readonly stage: Stage, scene: Scene) { this.pilot = new Pilot(scene.route); }

  tick() {
    const g = this.stage.game;
    // (the finale's GAME OVER is not part of it: the last picture, the boat sailing, stays under the credits)
    if (g.gameOverActive) return;
    const stick = this.pilot.next();
    g.input = stick;
    g.inputFire = stick.fire;
    g.frame(this.collisions);
  }

  draw() {
    const { game: g, view } = this.stage;
    view.update();
    this.collisions = view.collisions(g.uncounted);
  }

  render(alpha: number) { this.stage.view.render(alpha); }

  /** The row Monty's feet are on (sprite 3). */
  get ground() {
    const shot = vicShot(this.stage.game.vic, 3);
    return shot ? shotFeet(shot) : undefined;
  }

  dispose() { this.stage.score = this.stage.game.score; }
}

/** How long a scene runs: its route, and a moment. */
const routeFrames = (scene: Scene) => Math.max(scene.frames ?? 0, new Pilot(scene.route).length + TAIL);

// ---- the cast ----------------------------------------------------------------------------------------

/** The room a creature first appears in, and the slot of each of its types there (where its frames are recorded). */
function firstSeen(types: readonly number[]): { room: number; slots: number[] } | null {
  for (let room = 0; room < 0x34; room++) {
    const rec = enemyRecords(room);
    const here: number[] = [];
    for (let i = 0; i + 6 < rec.length && rec[i] !== 0xff && here.length < 4; i += 7) here.push(rec[i + 4]);
    const slots = types.map((t) => here.indexOf(t));
    if (slots.every((n) => n >= 0)) return { room, slots };
  }
  return null;
}

/** Frames of a creature recorded: more than any of its patrols takes to go there and back. */
const RECORDED = 600;

/** A creature as the engine shows it going its way (right, as the visitors walk): the game runs in the room it first appears in, Monty held out of the way. */
function recordCreature(stage: Stage, name: string, types: readonly number[]): Figure | null {
  const at = firstSeen(types);
  if (!at) return null;
  const g = stage.game;
  copyInto(g, (pristine ??= new Game()));
  g.start();
  if (!enterRoom(g, at.room, 0x14, 0x32)) return null;
  const moments: SpriteShot[][] = [];
  for (let f = 0; f < RECORDED; f++) {
    g.x2 = 0x14; g.y = 0x32; // (up in the corner: nothing in the room is his to meet)
    g.frame(0);
    const lead = g.enemies[at.slots[0]];
    const shots = at.slots.flatMap((slot) => { const shot = vicShot(g.vic, 4 + slot); return shot ? [shot] : []; });
    if (lead && shots.length === at.slots.length && !(lead.flags & 0x80)) moments.push(shots);
  }
  return recordFigure(name, moments);
}

// ---- the show ------------------------------------------------------------------------------------------

/** The ending's last lines: the port's, the same in every game. */
const LAST = PORT_CREDITS;

export function montyEnding(renderer: Renderer, assist: Assists): RewardSpec {
  let made: Stage | null = null;
  const stage = () => (made ??= new Stage(renderer, assist));
  const places: Place[] = SCENES.map((scene, i): Place => ({
    credits: i === SCENES.length - 1 ? [...scene.credits, ...LAST] : scene.credits,
    frames: routeFrames(scene),
    creditRow: scene.creditRow,
    open() {
      const s = stage();
      if (!beginPlace(s.game, scene)) return null;
      s.game.score = s.score;
      s.game.drawHudData();
      return new MontyReel(s, scene);
    },
  }));
  return {
    title: 'MONTY ON THE RUN',
    places,
    cast: CAST.map((c) => () => recordCreature(stage(), c.name, c.types)),
    creditRow: CREDIT_ROW,
  };
}

/** The lines under THE END: the score and what the pause screen keeps (lives, rooms, items, cakes), the numbers in a column. */
export function endingStats(g: Game, found: MontyFound): string[] {
  const rows = [['SCORE', String(g.score)], ...montyMap.info(g, found).map((line) => {
    const at = line.indexOf(' ');
    return [line.slice(0, at), line.slice(at + 1).trim()];
  })];
  return rows.map(([label, value]) => `${label.padEnd(6)}${value.padStart(8)}`);
}
