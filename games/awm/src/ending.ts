import { C64View, type Renderer } from 'c64kit';
import { PORT_CREDITS } from '../../shared/ending/credits';
import { recordFigure, shotFeet, type Figure, type SpriteShot } from '../../shared/ending/figures';
import { RoutePilot, type Stick as PilotStick } from '../../shared/ending/pilot';
import type { Place, Reel, RewardSpec } from '../../shared/ending/show';
import { SLOT_COLOURS_HEX } from './data/awm-data';
import { fromHex } from './data';
import { HIDDEN, isPlane } from './enemies';
import type { SkyState } from './flight';
import { Game, NEW_GAME_LIVES } from './game';
import { Stick } from './input';
import { progressLines, type AwmFound } from './map';
import { NO_CONTROLS, Program, START_ROOM, type Controls } from './program';
import { restore, snapshot, type AwmSave } from './save';
import { State } from './tiles';
import { CAST, SCENES, type Goal, type Scene } from './ending-scenes';

/**
 * The reward for beating Auf Wiedersehen Monty (ENHANCED; shared/ending/show.ts is the show, this is what is Monty's): a
 * montage of places across Europe, each one the game's own engine (a `Program` of its own: the game, its picture, the flight
 * over the clouds) on a new game of ours with Monty driven by a route (shared/ending/pilot.ts: input like a player's)
 * doing something there, the credits typing on in the empty row under the room, and the game's creatures walking through
 * and Monty; then THE END with the numbers the pause screen keeps.
 */

/** The row under the room (screen row 18, between the room and the green band), which the game leaves empty between the side columns (the pillars stand on it either side). */
export const CREDIT_ROW = 144;
/** Where a line starts and how long it can be: the room's width, between the side columns' sprites (x 40 to 288). */
export const CREDIT_X = 40;
export const CREDIT_LETTERS = 31;
/** Frames after what Monty does in a place before the next (a moment to take it in). */
const TAIL = 50;

// ---- a place: the game as a new game of ours, put there ------------------------------------------------------------------

/** What goes on through the places: the score and money (the panel keeps counting). */
interface Carry { score: number[]; money: number[] }
const NOTHING: Carry = { score: [0, 0, 0, 0, 0], money: [0, 0, 0, 0, 0] };

/** The colours the boxes are drawn in ($6D6B: the box's own number picks them). */
const SLOT_COLOURS = fromHex(SLOT_COLOURS_HEX);

/** What a place begins with: the room, where Monty comes in, and what the game has by then. */
export type Start = Pick<Scene, 'room' | 'spot' | 'taken' | 'carry' | 'progress'>;

/** A place's game as a save has it (a room's start, Monty where he comes in): `restore` and `Program.resume` put it back. */
function sceneSave(scene: Start, carry: Carry = NOTHING): AwmSave {
  const g = new Game(scene.room);
  for (const i of scene.taken ?? []) g.items.collected[i] = true;
  g.reload();
  (scene.carry ?? []).forEach((type, hand) => { g.items.carried[hand] = type; });
  g.progress = g.progressSeen = scene.progress ?? 0;
  g.lives = NEW_GAME_LIVES;
  g.score.digits.splice(0, 5, ...carry.score);
  g.money.digits.splice(0, 5, ...carry.money);
  const m = g.monty;
  m.x = m.prevX = m.entryX = scene.spot.x;
  m.y = m.prevY = m.entryY = scene.spot.y;
  m.faceLeft = scene.spot.faceLeft ?? false;
  const hands = g.items.carried.map((type, hand) => (type === 0xff ? null : { type, colours: Array.from(SLOT_COLOURS.subarray(hand * 4, hand * 4 + 4)) }));
  return snapshot(g, hands);
}

/** The game a scene begins with (for the route finder and the tests: what the montage's place starts from). */
export function sceneGame(scene: Start, carry: Carry = NOTHING): Game {
  const g = restore(sceneSave(scene, carry));
  g.graceActive = () => true;
  return g;
}

/** The stick as the game reads it (`Stick` bits). */
export function stickBits(s: PilotStick): number {
  return (s.up ? Stick.Up : 0) | (s.down ? Stick.Down : 0) | (s.left ? Stick.Left : 0) | (s.right ? Stick.Right : 0) | (s.fire ? Stick.Fire : 0);
}

/** In a flight: the stick that steers his nose onto the other plane's, to shoot it down (the other plane's place is in the sky's state). */
export function chase(sky: SkyState): number {
  const [px = 0, py = 0] = sky.player, [ex = 0, ey = 0] = sky.enemy;
  const nose = px + 0x1e;
  let stick = 0;
  if (nose + 2 < ex) stick |= Stick.Right; else if (nose > ex + 2) stick |= Stick.Left;
  if (py + 2 < ey) stick |= Stick.Down; else if (py > ey + 2) stick |= Stick.Up;
  return stick;
}

/** Standing at a plane (the two records showing $D0 and $D1) close enough to board it, with the ticket in his hands. */
export function atPlane(g: Game): boolean {
  const m = g.monty, e = g.enemies;
  return g.items.carried.includes(0) && [0, 1, 2, 3].some((slot) => Math.abs(m.x - e.x(slot)) < 12 && Math.abs(m.y - e.y(slot)) < 12 && isPlane(e.frame(slot)));
}

/** What he does there is done (in a game that has run so far): the route's goal is reached. */
export function isDone(goal: Goal, g: Game): boolean {
  if ('near' in goal) return Math.abs(g.monty.x - goal.near.x) <= 4 && Math.abs(g.monty.y - goal.near.y) <= 8;
  if ('take' in goal) return g.items.collected[goal.take] === true;
  if ('enter' in goal) return g.world.room === goal.enter;
  if ('board' in goal) return g.monty.state === State.Free && atPlane(g);
  if ('dance' in goal) return g.monty.state === State.Intro;
  return g.monty.state === State.Ending;
}

/** The last step of the game's own ending before the one that ends the game (the closing screen's GAME OVER is not part of the show). */
const finale = (g: Game) => g.monty.state === State.Ending && g.monty.step === 0xff;

// ---- the montage's engine ----------------------------------------------------------------------------------------------

/** The montage's engine: a game of its own (made again if the last one ended) and the view that draws it, made once. */
export class Stage {
  program = new Program();
  readonly view: C64View;
  carry: Carry = NOTHING;
  constructor(renderer: Renderer) {
    // (what the picture shows is whichever program the stage has now)
    const self = this;
    this.view = new C64View(renderer, { get ram() { return self.program.ram; }, get capture() { return self.program.capture; } });
    this.reset();
  }

  /** A program with nothing in it but the rules of the montage: nothing can end him (the routes are found without a death, and he stands up where a hit would have put him). */
  reset(): Program {
    this.program = new Program();
    this.program.graceActive = () => true;
    return this.program;
  }

  /** The program in play, ready for another place (a closed one, GAME OVER, is replaced). */
  ready(): Program {
    return this.program.kind === 'closing' ? this.reset() : this.program;
  }

  /** A place begun: the game in its room as a new game of ours has it. Null if there is nothing to begin from. */
  begin(scene: Start): Program | null {
    const program = this.ready();
    program.resume(sceneSave(scene, this.carry), false);
    return program.kind === 'play' && program.game?.world.room === scene.room ? program : null;
  }
}

/** A place running: the game's frames with Monty's stick from his route (a step is two frames: the logic's), then the flight, if he boards. */
export class AwmReel implements Reel {
  readonly program: Program;
  private readonly pilot: RoutePilot;
  private frames = 0;

  constructor(private readonly stage: Stage, program: Program, private readonly scene: Scene) {
    this.program = program;
    this.pilot = new RoutePilot(scene.route);
  }

  /** The controls for the next frame: the route's stick in a logic step (the drawing phase before it reads none), the chase in a flight. */
  private controls(): Controls {
    const p = this.program, g = p.game, pic = p.picture;
    if (!g || !pic) return NO_CONTROLS;
    if (p.flying) return { ...NO_CONTROLS, stick: chase(g.sky) };
    if (pic.nextIsA) return NO_CONTROLS;
    if (this.pilot.done) return { ...NO_CONTROLS, fly: this.scene.fly === true };
    return { ...NO_CONTROLS, stick: stickBits(this.pilot.next()) };
  }

  tick() {
    const p = this.program, g = p.game;
    // (the finale's GAME OVER is not part of it: the last picture, the figures beside him, stays under the credits)
    if (p.kind !== 'play' || !g || finale(g)) return;
    p.takeSound();
    this.frames++;
    p.frame(this.controls());
  }

  draw() {
    this.stage.view.update(this.program.viewStep);
    this.stage.view.renderer.backdrop = this.stage.view.backdrop;
  }

  render(alpha: number) { this.stage.view.render(alpha); }

  /** The row Monty's feet are on (his sprite, 1). */
  get ground() {
    const s = this.program.capture.sprites.find((sp) => sp.n === 1);
    return s ? shotFeet(shotOf(s)) : undefined;
  }

  dispose() {
    const g = this.program.game;
    if (g) this.stage.carry = { score: [...g.score.digits], money: [...g.money.digits] };
    this.stage.view.dispose();
  }
}

/** How many frames a scene's route takes (a step is two frames), and a moment. */
export const routeFrames = (scene: Scene) => Math.max(scene.frames ?? 0, new RoutePilot(scene.route).length * 2 + TAIL);

// ---- the cast ---------------------------------------------------------------------------------------------------------

/** Frames of a creature recorded: more than any of its paths takes to go there and back. */
const RECORDED = 700;

/** A sprite of a frame as the figure's recorder takes it. */
function shotOf(s: Program['capture']['sprites'][number]): SpriteShot {
  return {
    x: s.x >= 504 ? s.x - 504 : s.x, y: s.y, colour: s.colour & 15, multicolour: s.multicolour, mc1: s.mc1 & 15, mc2: s.mc2 & 15,
    expandX: s.expandX, expandY: s.expandY, data: Uint8Array.from(s.data.subarray(0, 63)),
  };
}

/** A creature as the engine shows it going its way (right, as the visitors walk): the game runs in a room with it, Monty held up out of the way. */
function recordCreature(stage: Stage, c: (typeof CAST)[number]): Figure | null {
  const p = stage.begin({ room: c.room, spot: { x: 0x80, y: 0x30 } });
  const g = p?.game;
  if (!p || !g) return null;
  const right: SpriteShot[][] = [], any: SpriteShot[][] = [];
  for (let f = 0; f < RECORDED; f++) {
    g.monty.x = 0x80; g.monty.y = 0x30; // (up in the air: nothing in the room is his to meet)
    p.frame(NO_CONTROLS);
    if (p.kind !== 'play' || g.world.room !== c.room) return null;
    const frame = g.enemies.frame(c.slot);
    const s = p.capture.sprites.find((sp) => sp.n === 2 + c.slot);
    if (!s || frame === HIDDEN) continue;
    any.push([shotOf(s)]);
    if (!g.enemies.facesLeft(c.slot)) right.push([shotOf(s)]);
  }
  return recordFigure(c.name, right.length >= 8 ? right : any);
}

// ---- the show ----------------------------------------------------------------------------------------------------------

/** The ending's last lines: the port's, the same in every game. */
const LAST = PORT_CREDITS;

export function awmEnding(renderer: Renderer): RewardSpec {
  let made: Stage | null = null;
  const stage = () => (made ??= new Stage(renderer));
  const places: Place[] = SCENES.map((scene, i): Place => ({
    credits: i === SCENES.length - 1 ? [...scene.credits, ...LAST] : scene.credits,
    frames: routeFrames(scene),
    ...(scene.creditRow === undefined ? {} : { creditRow: scene.creditRow }),
    open() {
      const s = stage();
      if (i === 0) s.carry = NOTHING;
      const program = s.begin(scene);
      if (!program) return null;
      const reel = new AwmReel(s, program, scene);
      // (a flight is up from the first picture shown: the room it was boarded in has gone by before the show sees it)
      for (let n = 0, flown = 0; scene.fly === true && flown < 4 && n < 12; n++) { reel.tick(); if (program.flying) flown++; }
      return reel;
    },
  }));
  return {
    title: 'AUF WIEDERSEHEN MONTY',
    places,
    cast: CAST.map((c) => () => recordCreature(stage(), c)),
    creditRow: CREDIT_ROW,
    creditX: CREDIT_X,
    creditLetters: CREDIT_LETTERS,
  };
}

/** The lines under THE END: the score and money, then what the pause screen keeps (lives, rooms, items, goal), the numbers in a column. */
export function endingStats(g: Game | null, found: AwmFound): string[] {
  const game = g ?? new Game(START_ROOM);
  const rows = [['SCORE', String(game.score.value)], ['MONEY', String(game.money.value)], ...progressLines(game, found).map((line) => {
    const at = line.indexOf(' ');
    // (the game's lettering has no percent sign)
    return [line.slice(0, at), line.slice(at + 1).trim().replace('%', ' PCT')];
  })];
  return rows.map(([label, value]) => `${label.padEnd(6)}${value.padStart(8)}`);
}

