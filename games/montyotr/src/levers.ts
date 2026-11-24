import type { Game } from './game';
import * as Items from './items';
import type { CellBox, LeverSpec } from './montydata';
import { pursuerAt, squashPursuer } from './pursuers';

/**
 * Levers (a game's `levers`: Do Svidaniya Monty's Sambadrome): the room's Mole Crushers are held up (mechanisms.ts `hold.held`) until the lever drops them, both shafts as one head. Touching the booth while carrying the
 * lever's key fits it (the `armed` item is taken, so it stays fitted through a death and a save); unarmed, stepping into the lever only rattles it. Armed, stepping into it (again only after stepping out) starts the
 * head's warning (it shudders, `HELD_WARN` frames) and then drops it. It squashes the room's pursuer only if he was under it when the lever was pulled and is still under it as it lands (`hold.watch`): a walker
 * crossing under is out before it falls, so he must be standing there, and he stands only where Monty stood. Then the `done` item is taken, which the room's effects read (the bars lift). Monty under it is killed
 * by the crusher's own test.
 */

/** Whether Monty, standing or not, overlaps a box of playfield cells (his two columns and two rows, a third column when he is between cells). */
function touches(g: Game, b: CellBox): boolean {
  const col = g.montyCol - 4, row = g.montyRow - 3, cols = ((g.x2 - 0x0c) & 3) ? 3 : 2;
  return col <= b.col1 && col + cols - 1 >= b.col0 && row <= b.row1 && row + 1 >= b.row0;
}

const leverOf = (g: Game): LeverSpec | undefined => g.data.levers.find((l) => l.room === g.roomId);

/**
 * Whether the pursuer (his sprite's x2 and y) is under the room's head: his picture over either shaft by more than half a cell (the crusher table's columns are screen columns), and below the head's top
 * (on the floor under it, not on the float or the gantry over it).
 */
export function underHead(g: Game, x2: number, y: number): boolean {
  const col = (x2 - 0x0c) / 4;
  const cfg = g.data.piledriverCfg;
  for (let i = 0; i + 4 < cfg.length; i += 5) {
    if (cfg[i] !== g.roomId) continue;
    const c0 = cfg[i + 1] ?? 0, top = ((cfg[i + 2] ?? 0) * 8 + 0x34) & 0xff;
    if (col + 2 > c0 + 0.5 && col < c0 + 2.5 && y >= top) return true;
  }
  return false;
}

/** A room is loaded: he is not touching the lever (the latch is off). */
export function leverInit(g: Game) { g.leverLatch = false; }

/** One frame (after Monty's move): the booth, the lever, and the head on the pursuer. */
export function leverUpdate(g: Game) {
  const l = leverOf(g);
  if (!l || g.actionCounter || g.freeze) return;
  const taken = (i: number) => !!g.siCollected[i];
  if (!taken(l.armed) && taken(l.key) && touches(g, l.booth)) {
    g.siCollected[l.armed] = 0x81;
    Items.applyRoomEffects(g);
    g.sfx(g.data.sfx.item);
  }
  const man = pursuerAt(g);
  const at = touches(g, { col0: l.lever.col, row0: l.lever.row, col1: l.lever.col, row1: l.lever.row + 1 });
  if (at && !g.leverLatch && !taken(l.done)) {
    if (!taken(l.armed)) g.sfx(g.data.sfx.jump); // (dead: it only rattles)
    else if (!g.pd.state && !g.hold.pull) { g.hold.pull = 1; g.hold.watch = man && underHead(g, man.x2, man.y + 1) ? 1 : 0; }
  }
  g.leverLatch = at;
  // the head on its way down: he must stay under it from the pull to the landing
  const pd = g.pd;
  if (!g.hold.pull && pd.state !== 1) { g.hold.watch = 0; return; }
  if (!man || !underHead(g, man.x2, man.y + 1)) { g.hold.watch = 0; return; }
  if (!g.hold.watch || !g.hold.both || pd.state !== 1) return;
  const headY = (pd.spriteY[0] + pd.position) & 0xff;
  if (headY < man.y + 4) return;
  squashPursuer(g);
  g.hold.watch = 0;
  Items.applyRoomEffects(g);
}
