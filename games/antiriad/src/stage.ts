import { C64Machine, type MachineState } from 'c64kit';
import { giveControls } from './controls';
import { Game } from './game';
import { FIRST_WEARING, type Base } from './ending-scenes';
import { Pilot, inArmour, ready, type Step } from './pilot';

/**
 * The engine's side of the ending: games of ours on machines of their own (never the player's), the states places begin from,
 * and a frame of a game under a pilot.
 */

/** A game of ours running on a machine of its own, as the montage has it: ENHANCED, and nothing in it can hurt Tal. */
function stageGame(m: C64Machine): Game {
  const g = new Game(m, true);
  g.enhanced = true;
  g.graceActive = () => true;
  return g;
}

/** A game resumed from a state. */
export function fromState(s: MachineState): Game {
  const m = new C64Machine();
  m.loadState(s);
  return stageGame(m);
}

/** One frame with the pilot's input. */
export function frameOf(g: Game, pilot: Pilot) {
  giveControls(g, pilot.next(g), true);
  g.m.keys = [];
  g.tick();
}

/** Tal (or the armour, in it) comes into a room as the game's own travel brings him (the map's: between frames). */
export function arrive(g: Game, to: { room: number; x: number; y: number }) {
  g.travelTo = { room: to.room, x: to.x & 0xff, y: to.y, high: to.x > 0xff ? 1 : 0 };
}

/** Run a game under `steps` until they are done (or `max` frames); the frames it took. */
function playSteps(g: Game, steps: readonly Step[], max: number): number {
  const pilot = new Pilot(steps);
  let f = 0;
  for (; f < max && !pilot.done; f++) frameOf(g, pilot);
  return f;
}

/**
 * The states places begin from, each made by playing the game itself, once, when first asked for: a new game (the title, fire,
 * the first frames); the armour worn for the first time (Tal into it, its power-up and all); and Tal out of it again.
 */
export class Bases {
  private readonly made = new Map<Base, MachineState>();

  get(base: Base): MachineState {
    const have = this.made.get(base);
    if (have) return have;
    const s = this.make(base);
    this.made.set(base, s);
    return s;
  }

  private make(base: Base): MachineState {
    if (base === 'new') {
      const g = new Game();
      g.graceActive = () => true;
      for (let f = 0; f < 60; f++) { g.m.joy2 = 0x1f; g.tick(); }
      for (let f = 0; f < 3000 && !g.playing; f++) { g.m.joy2 = 0x1f & ~16; g.tick(); }
      g.m.joy2 = 0x1f;
      for (let f = 0; f < 120; f++) g.tick();
      return g.snapshot();
    }
    if (base === 'suited') {
      const g = fromState(this.get('new'));
      arrive(g, FIRST_WEARING.arrive);
      playSteps(g, FIRST_WEARING.steps, 1500);
      // (a moment for the last of it: the armour standing, Tal's life full)
      playSteps(g, [{ hold: '.', frames: 60 }], 60);
      return g.snapshot();
    }
    // worn: out of the armour again, on foot beside it
    const g = fromState(this.get('suited'));
    playSteps(g, [{ hold: '<', until: (gg) => !inArmour(gg), max: 100 }, { hold: '.', until: ready, max: 100 }], 300);
    return g.snapshot();
  }
}
