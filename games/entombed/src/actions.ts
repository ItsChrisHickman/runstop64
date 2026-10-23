import type { EndingActions } from '../../shared/ending/machine-reel';
import * as engine from './gen/engine';

/** The actions ($3215): which one fire does. */
export const ACTION = { jump: 1, whip: 2, torch: 3 } as const;

/**
 * The action in use and picking one, the game's own way: $0F19 shows its name on the panel. The front end's action keys (main.ts) and
 * the ending's Pendragon (ending.ts) pick with this; jumping is the jump and what he strikes with is the whip.
 */
export const ACTIONS: EndingActions = {
  jump: ACTION.jump,
  strike: ACTION.whip,
  /** The whip's frames are over ($20CF is 1 while they run). */
  ready: (ram) => ram[0x20cf] === 0,
  get: (ram) => ram[0x3215],
  set: (ram, n, call) => { ram[0x3215] = n; call(engine.r_0f19); },
};
