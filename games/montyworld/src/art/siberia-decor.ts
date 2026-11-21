/**
 * Siberia's decorations for Monty Mole: World Tour (region 2), in Monty on the Run's decoration format and Moscow's manner
 * (decorations.ts): solid ink with the detail cut into it as black lines. Pines, the dining car's table and window, the sleeper's
 * bunks, the mine's lamp and portal, the telegraph pole, a log cabin.
 */
import { decor } from './decorations';
import { Raster } from './raster';
import type { NewDecor } from './types';

/** A pine: tiers of boughs, each tier a triangle with a ragged edge and a black line under it, a trunk. `w` characters across. */
function pine(w: number, h: number, tiers: number, name: string): NewDecor {
  const r = new Raster(w * 8, h * 8);
  const cx = w * 4, trunk = 3;
  const room = h * 8 - trunk - 1;
  for (let k = 0; k < tiers; k++) {
    const top = Math.round((k * room) / (tiers + 0.6)), bottom = Math.round(((k + 1.6) * room) / (tiers + 0.6));
    const half = (w * 4 - 1) * (0.45 + (0.55 * (k + 1)) / tiers);
    for (let y = top; y <= bottom; y++) {
      const t = (y - top) / Math.max(1, bottom - top);
      const x = Math.max(1, 1 + half * t);
      for (let i = -Math.floor(x); i < Math.floor(x); i++) r.set(cx + i, y);
    }
    r.rect(cx - Math.floor(half) + 1, bottom, cx + Math.floor(half) - 2, bottom, false); // the dark under each tier
    for (let i = -Math.floor(half) + 2; i < half - 2; i += 3) r.set(cx + i, bottom - 1, false); // the fringe
  }
  r.rect(cx - 1, h * 8 - trunk, cx, h * 8 - 1);
  const rows = Array.from({ length: h }, (_, j) => (j === h - 1 ? '9'.repeat(w) : '5'.repeat(w)));
  rows[h - 1] = '5'.repeat(Math.floor((w - 1) / 2)) + '9' + '5'.repeat(Math.ceil((w - 1) / 2));
  return decor(name, w, h, r, rows);
}

/** The dining car's table: a white cloth to the floor's edge, two glasses in their holders, a loaf. 3 x 2 characters. */
function diningTable(): NewDecor {
  const r = new Raster(24, 16);
  r.rect(0, 5, 23, 7); // the cloth's top
  r.rect(1, 8, 22, 12); // its hang
  for (let x = 3; x < 22; x += 4) r.rect(x, 9, x, 12, false); // the folds
  r.rect(2, 13, 3, 15); r.rect(20, 13, 21, 15); // the legs
  for (const x of [4, 9]) { r.rect(x, 1, x + 2, 4); r.rect(x + 1, 2, x + 1, 3, false); r.rect(x - 1, 4, x + 3, 4); } // glasses in holders
  r.ellipse(18, 3.5, 3.3, 1.9); // the loaf
  r.rect(16, 3, 20, 3, false);
  return decor('diningTable', 3, 2, r, ['777', '111']);
}

/** A carriage window: a frame, the frosted pane with the snow going by in streaks, a curtain at each side. 2 x 2 characters. */
function carWindow(): NewDecor {
  const r = new Raster(16, 16);
  r.rect(0, 0, 15, 15);
  r.rect(2, 2, 13, 13, false);
  for (const [x, y, n] of [[4, 4, 4], [8, 6, 3], [5, 9, 5], [9, 11, 3]] as const) r.rect(x, y, x + n, y); // streaks of snow
  r.rect(2, 2, 3, 13); r.rect(12, 2, 13, 13); // the curtains
  r.rect(3, 4, 3, 11, false); r.rect(12, 4, 12, 11, false);
  return decor('carWindow', 2, 2, r, ['22', '22']);
}

/** A sleeper's bunks: two berths, a pillow and a rolled blanket each, the ladder between. 3 x 2 characters. */
function bunk(): NewDecor {
  const r = new Raster(24, 16);
  r.rect(0, 0, 23, 1);
  r.rect(0, 2, 23, 6);
  r.rect(1, 3, 6, 5, false); r.rect(1, 3, 5, 4); // the pillow
  for (let x = 9; x < 22; x += 4) r.rect(x, 3, x, 5, false); // the blanket's folds
  r.rect(0, 8, 23, 9);
  r.rect(0, 10, 23, 14);
  r.rect(1, 11, 6, 13, false); r.rect(1, 11, 5, 12);
  for (let x = 9; x < 22; x += 4) r.rect(x, 11, x, 13, false);
  r.rect(0, 15, 23, 15);
  return decor('bunk', 3, 2, r, ['999', '999']);
}

/** A miner's lamp hung from a hook: a ring, a cap, a cage of bars round a flame, a base. 1 x 2 characters. */
function mineLamp(): NewDecor {
  const r = new Raster(8, 16);
  r.rect(3, 0, 4, 0); r.rect(2, 1, 2, 2); r.rect(5, 1, 5, 2); // the ring
  r.rect(1, 3, 6, 4); // the cap
  r.rect(1, 5, 6, 12); // the cage
  r.rect(2, 6, 5, 11, false);
  r.rect(3, 7, 4, 10); r.rect(3, 6, 3, 6); // the flame inside
  r.rect(0, 13, 7, 15); // the base
  r.rect(2, 14, 5, 14, false);
  return decor('mineLamp', 1, 2, r, 7);
}

/** The mine's portal: two heavy timbers and the lintel across them with a pit lamp, rock overhead. 4 x 5 characters. */
function minePortal(): NewDecor {
  const r = new Raster(32, 40);
  r.rect(0, 0, 31, 7);
  for (let x = 4; x < 31; x += 7) r.rect(x, 0, x, 7, false); // the rock's joints
  r.rect(0, 8, 31, 12); // the lintel
  r.rect(0, 11, 31, 11, false);
  r.rect(0, 13, 5, 39); r.rect(26, 13, 31, 39); // the posts
  for (const y of [18, 25, 32]) { r.rect(1, y, 4, y, false); r.rect(27, y, 30, y, false); } // their joints
  r.rect(14, 13, 17, 15); r.rect(15, 16, 16, 18); // the lamp hanging
  return decor('minePortal', 4, 5, r, ['CCCC', '9999', '9009', '9009', '9009']);
}

/** A telegraph pole: the pole, two cross-arms with their glass insulators, the wire in a sag to each side. 2 x 4 characters. */
function pole(): NewDecor {
  const r = new Raster(16, 32);
  r.rect(7, 0, 8, 31);
  r.rect(1, 4, 14, 5); r.rect(3, 10, 12, 11);
  for (const x of [2, 6, 9, 13]) r.rect(x, 1, x, 3);
  for (const x of [4, 11]) r.rect(x, 7, x, 9);
  r.rect(7, 14, 8, 14, false); r.rect(7, 22, 8, 22, false); // the grain
  return decor('pole', 2, 4, r, 9);
}

/** A log cabin: logs in courses, a snow roof, a lit window, a door, a chimney. 5 x 4 characters. */
function cabin(): NewDecor {
  const r = new Raster(40, 32);
  r.rect(30, 0, 34, 6); r.rect(31, 2, 33, 3, false); // the chimney
  r.triangle(0, 14, 20, 3, 39, 14); // the snow roof
  r.rect(0, 14, 39, 15);
  r.rect(2, 9, 6, 9, false);
  for (let y = 16; y <= 31; y += 4) { r.rect(0, y, 39, y + 2); r.rect(0, y + 3, 39, y + 3, false); } // the logs
  r.rect(6, 17, 15, 26, false); r.rect(7, 18, 14, 25); r.rect(10, 18, 11, 25, false); r.rect(7, 22, 14, 22, false); // the window
  r.rect(26, 18, 34, 31, false); r.rect(27, 19, 33, 31); r.rect(30, 20, 30, 31, false); r.rect(32, 25, 32, 26, false); // the door
  const rows = ['11111', '11111', '99999', '99999'];
  return decor('cabin', 5, 4, r, rows);
}

/** A row of stalactites hanging from the mine's roof. 3 x 1 characters. */
function stalactites(): NewDecor {
  const r = new Raster(24, 8);
  r.rect(0, 0, 23, 1);
  for (const [x, h] of [[1, 5], [7, 7], [13, 4], [18, 6]] as const) for (let y = 2; y < 2 + h; y++) { const w = Math.max(1, 3 - Math.floor((y - 2) / 2)); r.rect(x, y, x + w, y); }
  return decor('stalactites', 3, 1, r, 12);
}

export const SIBERIA_DECOR = {
  pineTall: pine(3, 6, 4, 'pineTall'),
  pineSmall: pine(2, 3, 2, 'pineSmall'),
  diningTable: diningTable(),
  carWindow: carWindow(),
  bunk: bunk(),
  mineLamp: mineLamp(),
  minePortal: minePortal(),
  pole: pole(),
  cabin: cabin(),
  stalactites: stalactites(),
} as const satisfies Record<string, NewDecor>;

export type SiberiaDecor = keyof typeof SIBERIA_DECOR;
