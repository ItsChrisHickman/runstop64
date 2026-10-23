import { C64_KEYS, type Renderer } from 'c64kit';
import { PORT_CREDITS } from '../../shared/ending/credits';
import { recordFigure, shotFeet, vicShot, type Figure, type SpriteShot } from '../../shared/ending/figures';
import { RoutePilot, type Stick } from '../../shared/ending/pilot';
import type { Place, Reel, RewardSpec } from '../../shared/ending/show';
import { rom } from './data';
import * as Flow from './flow';
import type { Game } from './game';
import { starquakeMap } from './map';
import * as Specials from './specials';
import { installSprites } from './screen';
import { Stage } from './stage';
import { CAST, SCENES, type Goal, type Scene } from './ending-scenes';

/**
 * The reward for beating Starquake (ENHANCED; shared/ending/show.ts is the show, this is what is BLOB's): a montage of places on
 * the planet, each one the game's own engine (a game of its own over its own picture, Flow.play) on a new game of ours with BLOB
 * driven by a route (shared/ending/pilot.ts: input like a player's) doing something there (picking things up, riding a hover pad,
 * a teleport booth, the core), the credits typing on in a part of the picture the place leaves empty, and the
 * game's creatures and BLOB; then THE END with the numbers the pause screen keeps.
 */

/** The game of every place: the seeds its things are scattered by (a place puts the ones it needs where it wants them). */
const SEED = 0x51a7e;
/** The row the credits go on: the screen's last text row (y 192 to 199), which the game leaves empty in every place (and its panel's and rooms' screens). */
export const CREDIT_ROW = 192;
/** Frames after what BLOB does in a place before the next (a moment to take it in). */
const TAIL = 50;
/** The game's joystick idle ($7F: nothing pressed; low bits = pressed) and no key ($40). */
const IDLE = 0x7f, NO_KEY = 64;

// ---- a place: the game as a new game of ours, put there ------------------------------------------------------------------

/** What a place begins with. */
export type Start = Pick<Scene, 'room' | 'spot' | 'lying' | 'carry' | 'complete'>;

/**
 * A new game with BLOB in a room as a way in puts him (a cell), the things the place needs lying where it wants them and in his
 * hands, and the script that plays it: nothing can hurt him (a moment's grace), and the room has been drawn when this returns.
 */
export function openScene(g: Game, scene: Start): Flow.Script {
  Flow.newGame(g, SEED);
  g.graceActive = () => true;
  // (things lying in the room: the game's own items of the core's pieces, moved here and put at their place)
  (scene.lying ?? []).forEach((it, i) => {
    const item = g.items[2 + i];
    if (!item) throw new Error('too many things lying in a place');
    Object.assign(item, { graphic: it.graphic, col: it.col, row: it.row, roomLo: scene.room & 0xff, roomHi: scene.room >> 8 });
  });
  (scene.carry ?? []).forEach((graphic, i) => { g.carried[i] = graphic; });
  if (scene.complete) {
    // (the core all there but two pieces, which he carries: the core's sequence puts them in and the game is won)
    g.core.forEach((v, i) => { g.core[i] = v | 0x80; });
    [0, 1].forEach((i) => {
      const slot = g.coreSlots[i] ?? 0, piece = slot & 7;
      g.core[slot] = piece;
      g.carried[i] = piece;
    });
  }
  g.room = scene.room;
  g.exit = 0; g.exitCol = scene.spot.col; g.exitRow = scene.spot.row;
  const script = Flow.play(g, {});
  g.joy = IDLE; g.key = NO_KEY;
  script.next();
  return script;
}

/** The stick as the game reads it ($76: low = pressed: 1 up, 2 down, 4 left, 8 right, $10 fire). */
export function joyOf(s: Stick): number {
  return IDLE & ~((s.up ? 1 : 0) | (s.down ? 2 : 0) | (s.left ? 4 : 0) | (s.right ? 8 : 0) | (s.fire ? 0x10 : 0));
}

/** What he does there is done (in a game that has run so far): the goal is reached. */
export function isDone(goal: Goal, g: Game): boolean {
  if ('take' in goal) return g.carried.includes(goal.take);
  if ('near' in goal) return Math.abs(g.col - goal.near.col) <= 1 && Math.abs(g.row - goal.near.row) <= 1;
  if ('ride' in goal) return (g.riding & 0x80) !== 0;
  if ('booth' in goal) return g.inScreen && g.exit === 0x3d;
  if ('room' in goal) return g.room === goal.room;
  return g.won;
}

// ---- the montage's engine ----------------------------------------------------------------------------------------------

/** The keys a teleport's name is typed with: the C64's keyboard scan code of each letter (row x 8 + column). */
function keyOfLetter(ch: string): number {
  const k = C64_KEYS[`Key${ch}`];
  return k ? k[0] * 8 + k[1] : NO_KEY;
}

/** The name of the teleport (0-14) that is in a room, five letters ($3E8F, 9 bytes each; the table of their rooms $112A/$1139). */
export function teleportName(room: number): string {
  const t = Array.from({ length: 15 }, (_, i) => i).find((i) => Specials.teleportRoom(i) === room);
  if (t === undefined) throw new Error(`no teleport in room ${room}`);
  return String.fromCharCode(...Array.from({ length: 5 }, (_, i) => rom(0x3e8f + t * 9 + i)));
}

/** A place running: the game's frames with BLOB's stick from his route, a teleport's name typed, the core's ending drawn. */
export class SqReel implements Reel {
  private readonly pilot: RoutePilot;
  private typed = 0;
  private ended = false;

  constructor(readonly stage: Stage, private readonly script: Flow.Script, private readonly scene: Scene) {
    this.pilot = new RoutePilot(scene.route);
  }

  /** The key for this frame: the letters of the teleport's name, each held 3 frames and let go 3 (the game takes a key when it changes). */
  private key(g: Game): number {
    if (g.asking !== 'code' || this.scene.teleportTo === undefined) return NO_KEY;
    const frame = this.typed++;
    const at = Math.floor(frame / 6);
    const name = teleportName(this.scene.teleportTo);
    return at < name.length && frame % 6 < 3 ? keyOfLetter(name.charAt(at)) : NO_KEY;
  }

  tick() {
    const g = this.stage.game;
    if (this.ended) return;
    g.joy = joyOf(this.pilot.next());
    g.key = this.key(g);
    if (this.script.next().done) {
      // the core is whole: the game's own ending, a framed message, which stays
      this.ended = true;
      if (g.won) Specials.ending(g);
    }
  }

  draw() { this.stage.update(!this.ended); }
  render(alpha: number) { this.stage.view.render(alpha); }

  /** The row BLOB's feet are on (his body, sprite 0). */
  get ground() {
    const shot = vicShot(this.stage.vic, 0);
    return shot ? shotFeet(shot) : undefined;
  }

  /** (the picture is the stage's, drawn again by the next place; the show puts the sprites away when it is over) */
  dispose() {}
}

/** How many frames a scene lasts: its route, and a moment (the core's sequence and a booth's screen take their time: `frames`). */
export const routeFrames = (scene: Scene) => Math.max(scene.frames ?? 0, new RoutePilot(scene.route).length + TAIL);

// ---- the cast ---------------------------------------------------------------------------------------------------------

/** Frames a creature is looked for: more than the game takes to bring one of the kind about (they come as the room's four enemies materialise). */
const RECORDED = 1500;

/**
 * A creature as the engine shows it (going right, as the visitors walk): the game runs in a room with BLOB standing, and the first
 * enemy of the kind that comes about is followed (one enemy: it keeps its colour) while it goes right.
 */
function recordCreature(stage: Stage, c: (typeof CAST)[number]): Figure | null {
  const g = stage.fresh();
  const script = openScene(g, { room: c.room, spot: { col: 0x15, row: 0x10 } });
  const moments: SpriteShot[][] = [];
  let slot = -1;
  for (let f = 0; f < RECORDED; f++) {
    g.joy = IDLE;
    script.next();
    stage.update(true);
    if (slot < 0) slot = g.enemies.findIndex((e) => e.state === 3 && e.kind === c.kind);
    const e = g.enemies[slot];
    if (!e) continue;
    if (e.state !== 3 || e.kind !== c.kind) { slot = -1; if (moments.length >= 24) break; continue; }
    if (e.dx & 0x80) continue;
    const shot = vicShot(stage.vic, 4 + slot);
    if (shot) moments.push([shot]);
  }
  return recordFigure(c.name, moments);
}

// ---- the show ------------------------------------------------------------------------------------------------------------

/** The ending's last lines: the port's, the same in every game. */
const LAST = PORT_CREDITS;

export function starquakeEnding(renderer: Renderer): RewardSpec {
  let made: Stage | null = null;
  const stage = () => {
    if (!made) {
      made = new Stage(renderer);
      // (the original's sprite graphics: BLOB's body and eyes, the hover pad)
      installSprites(made.vic.bank);
    }
    return made;
  };
  const places: Place[] = SCENES.map((scene, i): Place => ({
    credits: i === SCENES.length - 1 ? [...scene.credits, ...LAST] : scene.credits,
    frames: routeFrames(scene),
    open() {
      const s = stage();
      const g = s.fresh();
      const script = openScene(g, scene);
      return new SqReel(s, script, scene);
    },
  }));
  return {
    title: 'STARQUAKE',
    places,
    cast: CAST.map((c) => () => recordCreature(stage(), c)),
    creditRow: CREDIT_ROW,
  };
}

/** The lines under THE END: the score, then what the pause screen keeps (rooms, lives), the numbers in a column. */
export function endingStats(g: Game): string[] {
  const score = g.score.join('').replace(/^0+(?=\d)/, '');
  const rows = [['SCORE', score], ...starquakeMap.info(g).map((line) => {
    const at = line.indexOf(' ');
    return [line.slice(0, at), line.slice(at + 1).trim()];
  })];
  return rows.map(([label, value]) => `${label.padEnd(6)}${value.padStart(8)}`);
}
