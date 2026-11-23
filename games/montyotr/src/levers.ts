import type { Game } from './game';
import * as Items from './items';
import type { CellBox, LeverSpec } from './montydata';
import { pursuerAt, squashPursuer } from './pursuers';

/**
 * Levers (a game's `levers`: Do Svidaniya Monty's Sambadrome): the room's Mole Crushers are held up (mechanisms.ts `hold.held`) until the lever drops them, both shafts as one head. Touching the booth while carrying the
 * lever's key fits it (the `armed` item is taken, so it stays fitted through a death and a save); unarmed, stepping into the lever only rattles it. Armed, stepping into it (again only after stepping out) drops the head;
 * if it comes down on the room's pursuer, he is squashed and the `done` item is taken, which the room's effects read (the bars lift). Monty under it is killed by the crusher's own test.
 */

/** Whether Monty, standing or not, overlaps a box of playfield cells (his two columns and two rows, a third column when he is between cells). */
function touches(g: Game, b: CellBox): boolean {
  const col = g.montyCol - 4, row = g.montyRow - 3, cols = ((g.x2 - 0x0c) & 3) ? 3 : 2;
  return col <= b.col1 && col + cols - 1 >= b.col0 && row <= b.row1 && row + 1 >= b.row0;
}

const leverOf = (g: Game): LeverSpec | undefined => g.data.levers.find((l) => l.room === g.roomId);

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
  const at = touches(g, { col0: l.lever.col, row0: l.lever.row, col1: l.lever.col, row1: l.lever.row + 1 });
  if (at && !g.leverLatch && !taken(l.done)) {
    if (!taken(l.armed)) g.sfx(g.data.sfx.jump); // (dead: it only rattles)
    else if (!g.pd.state) g.hold.pull = 1;
  }
  g.leverLatch = at;
  // the head coming down on the pursuer
  const pd = g.pd, man = pursuerAt(g);
  if (!man || !g.hold.both || pd.state !== 1) return;
  const headY = (pd.spriteY[0] + pd.position) & 0xff;
  if (headY < man.y + 4) return;
  const col = (man.x2 - 0x0c) / 4;
  const cfg = g.data.piledriverCfg;
  for (let i = 0; i + 4 < cfg.length; i += 5) {
    if (cfg[i] !== g.roomId) continue;
    const c0 = cfg[i + 1] ?? 0;
    if (col + 2 > c0 + 0.5 && col < c0 + 2.5) {
      squashPursuer(g);
      g.siCollected[l.done] = 0x81;
      Items.applyRoomEffects(g);
      g.sfx(g.data.sfx.item);
      return;
    }
  }
}
