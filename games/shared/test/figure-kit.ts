import fs from 'node:fs';
import { unpackState, type Host, type MachineState } from 'c64kit';
import type { C64 } from '../../../packages/c64kit/src/c64/machine';
import { NativeHost } from '../native/host';
import { setJoy, type GameTest } from '../native/test/games';
import { boundsOf, FigureSwap, type FigureSpec } from '../pendragon/figure';
import { check } from './check';
import { readRoutes } from './data';
import { must } from './must';
import { PlaySession, type NativeRun } from './play-session';

/**
 * The checks of a game's Pendragon figure swap (shared/pendragon/figure.ts), the same for each game that has one: every picture of
 * him the game draws, over a scripted run of every pose it has, is Dragonskulle's in the capture once the swap has run, and the
 * game's state is the same whether the swap runs or not; through the front end, ENHANCED shows his figure and ORIGINAL shows the
 * game's own.
 */
export interface FigureGame {
  id: string;
  game: GameTest;
  spec: FigureSpec;
  /** The game's action byte and the values to choose (jump, whip, sword, spells...), each tried facing every way. */
  actions: { addr: number; values: number[] };
  /** Energy and the like kept up, called on the game's memory after every frame. */
  keep(ram: Uint8Array): void;
  /** Saves in the game, in different places, to run from. */
  states(): MachineState[];
  /** The game as the page runs it (the test stubs the page's fetch of the title snapshot). */
  run(host: Host): NativeRun;
}

const UP = 1, DOWN = 2, LEFT = 4, RIGHT = 8, FIRE = 16;
/** What he does, one thing after another: stand, walk each way, then each action with the stick each way and the button held. */
function scenes(actions: number[]): { joy: number; frames: number; action: number | null }[] {
  const out: { joy: number; frames: number; action: number | null }[] = [
    { joy: 0, frames: 30, action: null },
    { joy: RIGHT, frames: 60, action: null }, { joy: LEFT, frames: 60, action: null }, { joy: UP, frames: 50, action: null }, { joy: DOWN, frames: 50, action: null },
  ];
  for (const a of actions) for (const way of [LEFT, RIGHT, UP, DOWN]) {
    out.push({ joy: way, frames: 6, action: a }, { joy: FIRE, frames: 40, action: a }, { joy: way | FIRE, frames: 30, action: a });
  }
  return out;
}

interface Seen { picture: string; shown: string; dx: number; dy: number; bottomShift: number }

const hex = (d: Uint8Array) => Buffer.from(d.subarray(0, 63)).toString('hex');
const sprite = (m: C64) => m.capture.sprites.find((s) => s.n === 2);

/** Runs the scripted scenes from a state, applying the swap to `a` and not to `b`, and checks their games stay as one. */
export function checkFigure(g: FigureGame) {
  const swap = new FigureSwap(g.spec);
  const seen = new Map<string, Seen>();
  let frames = 0, drawn = 0, unmapped = 0, standIns = 0, same = true, firstDiff = '';
  const states = g.states();
  states.forEach((st, si) => {
    const a = NativeHost.resume(g.game.port, st), b = NativeHost.resume(g.game.port, st);
    let seed = 7 + si;
    const rnd = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff);
    const run = (sc: { joy: number; frames: number; action: number | null }, f: number) => {
      for (const h of [a, b]) {
        if (sc.action !== null) h.m.ram[g.actions.addr] = sc.action;
        setJoy(h.m, g.game, 0x1f & ~sc.joy);
        h.m.keys = [];
      }
      a.tick(); b.tick();
      g.keep(a.m.ram); g.keep(b.m.ram);
      frames++;
      const s = sprite(a.m);
      if (s) {
        const before = { x: s.x, y: s.y, data: hex(s.data) };
        swap.apply(a.m.capture.sprites, a.m.ram);
        drawn++;
        if (!swap.lookup(Uint8Array.from(Buffer.from(before.data, 'hex')))) standIns++;
        if (swap.shows(s.data)) {
          const o = boundsOf(Buffer.from(before.data, 'hex')), n = boundsOf(s.data);
          seen.set(before.data, { picture: before.data, shown: hex(s.data), dx: s.x - before.x, dy: s.y - before.y, bottomShift: o && n ? o.bottom - (n.bottom + (s.y - before.y) / 2) : 0 });
        } else if (!swap.kept(Uint8Array.from(Buffer.from(before.data, 'hex')))) unmapped++;
      }
      if (same && f % 25 === 0) {
        for (let i = 0; i < a.m.ram.length; i++) if (a.m.ram[i] !== b.m.ram[i]) { same = false; firstDiff = `state ${si} frame ${frames} at $${i.toString(16)}`; break; }
        if (a.m.collisions[0] !== b.m.collisions[0] || a.m.collisions[1] !== b.m.collisions[1]) { same = false; firstDiff = `collisions, state ${si} frame ${frames}`; }
      }
    };
    let f = 0;
    for (const sc of scenes(g.actions.values)) for (let k = 0; k < sc.frames; k++) run(sc, f++);
    // and a burst of random stick and button
    let joy = 0;
    for (let k = 0; k < 400; k++) {
      if (k % 14 === 0) { joy = [0, UP, DOWN, LEFT, RIGHT, UP | RIGHT, DOWN | LEFT][Math.floor(rnd() * 7)] | (rnd() < 0.5 ? FIRE : 0); }
      run({ joy, frames: 1, action: rnd() < 0.05 ? g.actions.values[Math.floor(rnd() * g.actions.values.length)] : null }, f++);
    }
  });
  check(`${g.id}: his figure was drawn in ${drawn} of ${frames} frames of the scripted run over ${states.length} states`, drawn > frames / 2);
  check(`${g.id}: ${seen.size} different pictures of him seen, every one Dragonskulle's once swapped (${unmapped} frames left as drawn; ${standIns} frames with a picture not in the table, shown as his stand)`, seen.size > 20 && unmapped === 0 && standIns <= drawn / 20);
  const feet = [...seen.values()].map((v) => Math.abs(v.bottomShift));
  const worst = Math.max(0, ...feet);
  check(`${g.id}: the feet stay on the original's feet line within a row (worst ${worst} rows)`, worst <= 1);
  // the drawn arms (cast, whip) reach about as far as the game's own picture of the pose: the arm's end within three pixels each way
  const drawnPictures = new Set(g.spec.table.filter(([, id]) => id.startsWith('cast.') || id.startsWith('whip.')).map(([picture]) => picture));
  let reach = 0;
  for (const v of seen.values()) {
    if (!drawnPictures.has(v.picture)) continue;
    const o = must(boundsOf(Buffer.from(v.picture, 'hex')), 'bounds'), n = must(boundsOf(Buffer.from(v.shown, 'hex')), 'bounds');
    const d = v.dx / 2;
    reach = Math.max(reach, Math.abs(o.left - (n.left + d)), Math.abs(o.right - (n.right + d)));
  }
  if (drawnPictures.size) check(`${g.id}: the drawn frames reach as far as the game's pictures of the pose (worst ${reach} pixels off)`, reach <= 3);
  check(`${g.id}: the game's memory and collisions are the same with the swap running or not${firstDiff ? ` (differ: ${firstDiff})` : ''}`, same);
  return seen;
}

/** A save of the game as it will launch from (the first state), run through the front end in ENHANCED and in ORIGINAL. */
export async function checkFigureGate(g: FigureGame) {
  const save = must(g.states()[0], 'a state');
  for (const enhanced of [true, false]) {
    const s = await PlaySession.launch(g.run, g.id, save, g.keep, enhanced);
    const swap = new FigureSwap(g.spec);
    let shown = 0, own = 0, frames = 0;
    s.input.keyDown('ArrowRight');
    for (let i = 0; i < 90; i++) {
      s.tick();
      const m = must(s.p.machine, 'the machine');
      const sp = sprite(m);
      if (!sp) continue;
      frames++;
      if (swap.shows(sp.data)) shown++;
      // the game's own shared colours (its own colour flashes when he is hurt; Dragonskulle's are 5 and 0)
      const n = g.spec.colours.normal;
      if (sp.mc1 === n.mc1 && sp.mc2 === n.mc2) own++;
    }
    s.input.keyUp('ArrowRight');
    if (enhanced) check(`${g.id}: ENHANCED through the front end shows Dragonskulle's figure (${shown} of ${frames} frames)`, frames > 30 && shown === frames);
    else check(`${g.id}: ORIGINAL through the front end leaves the game's own figure (${own} of ${frames} frames in the game's colours; ${shown} in Dragonskulle's pictures)`, frames > 30 && own === frames && (shown === 0 || g.id === 'blackwyche'));
  }
}

/** Saves along the first recorded route of a game (from its title: the route's own keys), one every `every` frames. */
export function routeStates(game: GameTest, id: string, keep: (ram: Uint8Array) => void, every: number, count: number): MachineState[] {
  const title = unpackState(new Uint8Array(fs.readFileSync(game.title)));
  const route = must(readRoutes(`games/${id}/re/routes.json`)[0], 'a route');
  const g = new NativeHost(game.port, title);
  const out: MachineState[] = [];
  let f = 0;
  for (let i = 0; i < route.length && out.length < count; i += 2) for (let k = 0; k < route[i + 1] && out.length < count; k++) {
    setJoy(g.m, game, route[i] & 0x1f); g.m.keys = route[i] & 32 ? [[1, 2]] : [];
    g.tick(); keep(g.m.ram); f++;
    if (f % every === 0) { const s = g.save(); if (s) out.push(s); }
  }
  return out;
}
