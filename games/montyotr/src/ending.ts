import { Surface, TRANSPARENT, VicView, decodeSprite, type Renderer } from 'c64kit';
import { PORT_CREDITS } from '../../shared/ending/credits';
import { recordFigure, shotFeet, vicShot, type Figure, type Part, type SpriteShot } from '../../shared/ending/figures';
import type { Lead, ParadeGag, Place, ProcessionSpec, Reel, RewardSpec } from '../../shared/ending/show';
import { SPLIT_FIRST, splitDeath, type SplitStage } from '../../shared/monty/deaths';
import { PARADE } from '../../shared/ending/procession';
import { FRAME } from '../../shared/monty/frames';
import { Game, type Assists } from './game';
import { copyInto } from './game-copy';
import { montyMap, type MontyFound } from './map';
import { Pilot } from './pilot';
import { TOP_ROW, type Scene } from './ending-scenes';
import { cellOf, type MontyData, type MontyEnding, type MontyParade } from './montydata';

/**
 * The reward for beating Monty on the Run (shared/ending/show.ts is the show, this is what is Monty's):
 * a montage of rooms from the journey, each one the game's own engine on a new game of ours with Monty driven by a route
 * (pilot.ts: input like a player's) doing something there, the credits typing on in the empty row under the playfield;
 * and the game's creatures walking through the places; then THE END with the numbers the pause screen keeps.
 */

/**
 * The credits' row: under the playfield (which ends at row 183), in the middle of the 16 rows to the bottom of the screen: the show
 * puts the room's name there away (`NAME_ROWS`), so the text touches neither the room nor a line of the game's.
 */
export const CREDIT_ROW = 188;
/** The screen rows the room's name takes (put away during the show: the credits' row is in the middle of the space under the playfield). */
const NAME_ROWS = { from: 192, to: 200 } as const;
/** Frames after what Monty does in a room before the next place (a moment to take it in). */
const TAIL = 40;

/** A new game of each game's data, the state every place begins from (a game of the montage is put back to it first). */
const pristines = new WeakMap<MontyData, Game>();
function pristineOf(data: MontyData): Game {
  const known = pristines.get(data);
  if (known) return known;
  const made = new Game(data);
  pristines.set(data, made);
  return made;
}

/**
 * Put Monty in a room (any, but the ending's) as a way in puts him, and let the room load (a dissolve is not played).
 * False if the room has no cell on the exit grid.
 */
export function enterRoom(g: Game, room: number, x2: number, y: number, facing = 0x01): boolean {
  const cell = cellOf(g.data, room);
  if (!cell) return false;
  g.mapRow = cell.row;
  g.exitCol = cell.col;
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
  copyInto(g, pristineOf(g.data));
  g.start();
  scene.prepare(g);
  return enterRoom(g, scene.room, scene.spot.x2, scene.spot.y, scene.spot.facing);
}

/** The montage's engine: a game of its own and the view that draws it, made once. */
class Stage {
  readonly game: Game;
  readonly view: VicView;
  /** The score through the places (the HUD keeps counting). */
  score = 0;
  constructor(data: MontyData, readonly renderer: Renderer, assist: Assists) {
    this.game = new Game(data);
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
  constructor(private readonly stage: Stage, private readonly scene: Scene) { this.pilot = new Pilot(scene.route); }

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
    // (the room's name put away: the credits stand in the middle of the space under the playfield)
    const { screen } = this.stage.renderer;
    screen.pixels.fill(0, NAME_ROWS.from * screen.width, NAME_ROWS.to * screen.width);
    // (and, in a room whose credits go above it, the score's: the lives' number stands against that row)
    if (this.scene.creditRow === TOP_ROW) screen.pixels.fill(0, 0, TOP_ROW * screen.width);
    screen.version++;
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
function firstSeen(data: MontyData, ending: MontyEnding, types: readonly number[]): { room: number; slots: number[] } | null {
  for (const room of ending.castRooms) {
    const rec = data.enemyRecords(room);
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
function recordCreature(stage: Stage, ending: MontyEnding, name: string, types: readonly number[]): Figure | null {
  const moments = creatureShots(stage, ending, types);
  return moments ? recordFigure(name, moments) : null;
}

/** The sprites of a creature, a moment at a time, as `recordCreature` records them. */
function creatureShots(stage: Stage, ending: MontyEnding, types: readonly number[]): SpriteShot[][] | null {
  const g = stage.game;
  const at = firstSeen(g.data, ending, types);
  if (!at) return null;
  copyInto(g, pristineOf(g.data));
  g.start();
  if (!enterRoom(g, at.room, 0x14, 0x32)) return null;
  const moments: SpriteShot[][] = [];
  // (a pursuer is asleep until Monty trips his wake: here he is woken at once, so he walks the path Monty strolls)
  const chased = g.pursuers.filter((p) => g.data.pursuers[p.index]?.slot === at.slots[0]);
  for (const p of chased) p.awake = true;
  for (let f = 0; f < RECORDED; f++) {
    // (up in the corner: nothing in the room is his to meet; a pursuer walks Monty's own path, so for him Monty strolls to and fro, facing right, for him to follow)
    g.x2 = chased.length ? 0x30 + (f % 64) : 0x14; g.y = 0x32; g.facing = 1;
    g.frame(0);
    const lead = g.enemies[at.slots[0]];
    const shots = at.slots.flatMap((slot) => { const shot = vicShot(g.vic, 4 + slot); return shot ? [shot] : []; });
    if (lead && shots.length === at.slots.length && !(lead.flags & 0x80)) moments.push(shots);
  }
  return moments;
}

// ---- the parade's gag ----------------------------------------------------------------------------------

/** A sprite's 63 bytes as a picture, in the colours of a shot of it. */
function pictureOf(data: Uint8Array, s: { colour: number; multicolour: boolean; mc1: number; mc2: number }): Surface {
  const flat = new Surface(24, 21, TRANSPARENT);
  decodeSprite(data, s.colour, s.multicolour, s.mc1, s.mc2, false, false, flat);
  return flat;
}

/**
 * The engine's death under a Mole Crusher (shared/monty/deaths.ts `splitDeath`, Monty on the Run's four-way split) played on a creature's sixteen split pictures from where he stands (`left`, `top`: picture
 * pixels), a frame each: the pieces in sight, from his top left. It goes on until the last piece has left the picture, as the game's does.
 */
export function splitFrames(split: readonly Uint8Array[], left: number, top: number): { parts: Part[] }[] {
  const s: SplitStage = { sx: new Uint8Array(8), sy: new Uint8Array(8), sptr: new Uint8Array(8), scol: new Uint8Array(8), enable: 0, multicolour: 0, x2: (left + 24) >> 1, y: (top + 50) & 0xff };
  const pictures = new Map<string, Surface>();
  const picture = (ptr: number, colour: number) => {
    const key = `${ptr}:${colour}`, known = pictures.get(key);
    if (known) return known;
    const made = pictureOf(split[ptr - SPLIT_FIRST] ?? new Uint8Array(63), { colour, multicolour: false, mc1: 0, mc2: 0 });
    pictures.set(key, made);
    return made;
  };
  const out: { parts: Part[] }[] = [];
  const steps = splitDeath(s);
  while (!steps.next().done) {
    const parts: Part[] = [];
    for (let n = 0; n < 4; n++) if (s.enable & (1 << n)) parts.push({ surface: picture(s.sptr[n] ?? SPLIT_FIRST, s.scol[n] ?? 1), dx: (s.sx[n] ?? 0) * 2 - 24 - left, dy: (s.sy[n] ?? 0) - 50 - top });
    out.push({ parts });
  }
  return out;
}

/** The engine's Mole Crusher as the room draws it (mechanisms.ts): the head's three characters in their colours, and the shaft (the head's top row, repeated as the glyphs scroll down) as tall as the picture. */
export function crusherPicture(data: MontyData): { shaft: Surface; head: Surface } {
  const COLOURS = [0x0f, 0x0c, 0x0b];
  const head = new Surface(24, 8, TRANSPARENT), shaft = new Surface(24, 200, TRANSPARENT);
  for (let c = 0; c < 3; c++) for (let row = 0; row < 8; row++) {
    const bits = data.piledriverGlyphs[c * 8 + row] ?? 0, top = data.piledriverGlyphs[c * 8] ?? 0;
    for (let x = 0; x < 8; x++) {
      if (bits & (0x80 >> x)) head.pixels[row * 24 + c * 8 + x] = COLOURS[c] ?? 1;
      if (top & (0x80 >> x)) for (let y = 0; y < 200; y++) shaft.pixels[y * 24 + c * 8 + x] = COLOURS[c] ?? 1;
    }
  }
  head.version++; shaft.version++;
  return { shaft, head };
}

/** The parade's gag: the creature recorded as the cast is, his four-way split from where he stops on the parade's ground (`feet`), the crusher, and the game's sound for a death under it. */
function paradeGag(stage: Stage, ending: MontyEnding, gag: NonNullable<MontyParade['gag']>, feet: number, sfx: ((id: number) => void) | undefined): ParadeGag | null {
  const moments = creatureShots(stage, ending, gag.types);
  const walk = moments ? recordFigure(gag.name, moments) : null;
  if (!walk) return null;
  const data = stage.game.data, crunch = data.eventSfx[0];
  return {
    walk, dying: splitFrames(gag.split, PARADE.crushAt, feet - walk.foot),
    crusher: { ...crusherPicture(data), top: 24 },
    ...(sfx && crunch ? { crunch: () => sfx(crunch) } : {}),
  };
}

/** Frames each of Monty's pictures is held: in his walk, and in his dance. */
const WALK_HOLD = 4, DANCE_HOLD = 6, FLIP_HOLD = 3;

/**
 * Monty as he comes last in a procession, from the game's own pictures of him (FRAME): his walk to the right, and his dance (arms
 * up in turn as on a rope, a look left and right, then his somersault on the spot). Drawn as the engine draws him in a place (his
 * colours), with no costume on.
 */
function recordMonty(stage: Stage, scene: Scene, name: string): Lead | null {
  const g = stage.game;
  copyInto(g, pristineOf(g.data));
  g.start();
  if (!enterRoom(g, scene.room, scene.spot.x2, scene.spot.y, scene.spot.facing)) return null;
  // (the room's sprites are put on by the frames after it loads)
  for (let n = 0; n < 5; n++) g.frame(0);
  const shot = vicShot(g.vic, 3);
  if (!shot) return null;
  const at = (ptr: number, hold: number): SpriteShot[][] => Array.from({ length: hold }, () => [{ ...shot, data: Uint8Array.from(g.vic.spriteData(ptr).subarray(0, 63)) }]);
  const run = (from: number, n: number, hold: number) => Array.from({ length: n }, (_, i) => at(from + i, hold)).flat();
  const walk = recordFigure(name, run(FRAME.walkRight, 4, WALK_HOLD));
  const dance = recordFigure(name, [
    ...run(FRAME.rope, 4, DANCE_HOLD), ...run(FRAME.rope, 4, DANCE_HOLD),
    ...at(FRAME.walkLeft, DANCE_HOLD * 2), ...at(FRAME.walkRight, DANCE_HOLD * 2), ...at(FRAME.walkLeft, DANCE_HOLD * 2), ...at(FRAME.walkRight, DANCE_HOLD * 2),
    ...run(FRAME.jumpRight, 12, FLIP_HOLD),
  ]);
  return walk && dance ? { walk, dance } : null;
}

// ---- the show ------------------------------------------------------------------------------------------

/** The show of a game's ending; `sfx` plays the game's sound effects (the parade's crusher). */
export function montyEnding(data: MontyData, renderer: Renderer, assist: Assists, sfx?: (id: number) => void): RewardSpec {
  const ending = data.ending;
  if (!ending) throw new Error(`${data.id} has no ending`);
  const { scenes } = ending, last = ending.closing ?? PORT_CREDITS;
  let made: Stage | null = null;
  const stage = () => (made ??= new Stage(data, renderer, assist));
  const places: Place[] = scenes.map((scene, i): Place => ({
    credits: i === scenes.length - 1 ? [...scene.credits, ...last] : scene.credits,
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
  const proc = ending.procession, first = scenes[0];
  /** The procession: the hero recorded from the first place, and a parade's gag made from its creature. */
  const processionOf = ({ hero, parade, ...rest }: NonNullable<MontyEnding['procession']>): ProcessionSpec => {
    const style = parade ? (({ gag, ...look }) => ({ ...look, ...(gag ? { gag: () => paradeGag(stage(), ending, gag, rest.ground.feet, sfx) } : {}) }))(parade) : undefined;
    return { ...rest, hero: { title: hero.title, record: () => (first ? recordMonty(stage(), first, hero.name) : null) }, ...(style ? { parade: style } : {}) };
  };
  return {
    title: ending.title,
    places,
    cast: ending.cast.map((c) => () => recordCreature(stage(), ending, c.name, c.types)),
    creditRow: CREDIT_ROW,
    ...(proc ? { procession: processionOf(proc) } : {}),
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
