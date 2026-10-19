import { C64View, type Renderer } from 'c64kit';
import { PORT_CREDITS } from '../../shared/native/ending';
import type { Place, Reel, RewardSpec } from '../../shared/ending/show';
import type { Game } from './game';
import { antiriadCast } from './ending-cast';
import { SCENES, type Scene } from './ending-scenes';
import { ROOMS } from './data';
import type { AntiriadFound } from './map';
import { Pilot } from './pilot';
import { V } from './vars';
import { Bases, arrive, frameOf, fromState } from './stage';

/**
 * The reward for beating The Sacred Armour of Antiriad (ENHANCED; shared/ending/show.ts is the show, this is what is Antiriad's):
 * a montage of places from the quest, each one the game's own engine on a new game of ours (its own C64, never the player's)
 * with Tal driven by a pilot (pilot.ts: input like a player's) doing something there, the credits typing on in the empty row
 * between the playfield and the panel; then the parade of the creatures and Tal; then THE END with the numbers the pause
 * screen keeps. The tune is the title's, played by a C64 of its own that runs the title sequence (main.ts).
 */

/** The row between the playfield (rows 0-15) and the panel (from row 17): screen row 16, which the game leaves empty. */
export const CREDIT_ROW = 128;
/** Frames a credit line is given (a line of 38 letters types on in 38 frames and is held for the rest: over a second and a half). */
const CREDIT_SLOT = 130;
/** The parade's ground: low, as Tal and the armour are 126 pixels tall and would pass over the title above. */
export const PARADE_GROUND = 168;

/** A place running: the game's frames with Tal's pilot. */
export class SceneReel implements Reel {
  readonly g: Game;
  private readonly view: C64View;
  private readonly pilot: Pilot;
  constructor(renderer: Renderer, bases: Bases, readonly scene: Scene) {
    this.g = fromState(bases.get(scene.base));
    scene.prepare(this.g);
    if (scene.arrive) arrive(this.g, scene.arrive);
    this.view = new C64View(renderer, this.g.m);
    this.pilot = new Pilot(scene.steps);
  }
  tick() { frameOf(this.g, this.pilot); }
  draw() { this.view.update(); }
  render(alpha: number) { this.view.render(alpha); }
  dispose() { this.view.dispose(); }
}

/** The lines under THE END: the score, the rooms Tal has been in, the parts of the armour found and the rejuvenations used, the numbers in a column. */
export function endingStats(g: Game, found: AntiriadFound): string[] {
  const { ram } = g;
  const parts = [0, 1, 2, 3].filter((i) => ram[0x067e + i] & 0x80).length;
  const rows = [
    ['SCORE', String(ram[0x0697] | (ram[0x0698] << 8) | (ram[0x0699] << 16))],
    ['ROOMS', `${found.rooms.length} OF ${ROOMS}`],
    ['PARTS', `${parts} OF 4`],
    ['REJUVENATIONS', String(ram[V.deaths])],
  ];
  return rows.map(([label, value]) => `${label.padEnd(14)}${value.padStart(8)}`);
}

export function antiriadEnding(renderer: Renderer): RewardSpec {
  const bases = new Bases();
  const places: Place[] = SCENES.map((scene, i): Place => ({
    credits: i === SCENES.length - 1 ? [...scene.credits, ...PORT_CREDITS] : scene.credits,
    frames: scene.frames,
    open: () => new SceneReel(renderer, bases, scene),
  }));
  return { title: 'THE SACRED ARMOUR OF ANTIRIAD', places, cast: antiriadCast(renderer, bases), creditRow: CREDIT_ROW, creditSlot: CREDIT_SLOT, paradeGround: PARADE_GROUND };
}
