/**
 * PACHINKO PARLOUR's machines for Monty Mole: World Tour (region 4): a pachinko machine as a decoration with its player hunched in front of it (a lit panel above, the glass over the pins, the
 * player bent over the tray, one ink for the machine and one for him), and the pictures its steel balls take as they fall through the pins (the room's `charAnims`, a cycle over the glass's six
 * characters). Every name starts `jp`.
 */
import { decor } from './decorations';
import { characters } from './pixels';
import { Raster } from './raster';
import type { NewDecor } from './types';

/** A machine's size in characters: three across, five tall (the panel, the glass over the pins (two rows), the player (two rows)). */
const W = 3, H = 5;
/** The glass's characters (rows 1 and 2 of the machine, row by row): what the balls fall through. */
export const GLASS_CELLS = [3, 4, 5, 6, 7, 8] as const;
/** Pictures in the cycle: the balls' places each. */
const STEPS = 8;

/** The machine as a raster, the steel balls at the given places (x, y in pixels of the glass's 24 by 16, which starts at row 8). */
function machine(balls: readonly (readonly [number, number])[]): Raster {
  const r = new Raster(W * 8, H * 8);
  r.rect(0, 0, 23, 7); r.rect(2, 2, 21, 5, false); r.rect(4, 3, 7, 4); r.rect(10, 3, 13, 4); r.rect(16, 3, 19, 4); // the panel and its three lit reels
  r.rect(0, 8, 1, 23); r.rect(22, 8, 23, 23); // the glass's sides
  for (let y = 10, k = 0; y < 24; y += 4, k++) for (let x = 5 + (k % 2) * 3; x < 21; x += 6) r.rect(x, y, x, y); // the pins
  r.rect(4, 22, 19, 23); r.rect(8, 22, 15, 22, false); // the tray's lip
  for (const [x, y] of balls) r.rect(x, 8 + y, x + 1, 9 + y); // the balls
  // the player: on a stool at the tray, his back a round hump, his head bent forward over the tray (a gap at his neck), an arm out to the knob
  r.ellipse(8.5, 33, 6.4, 5.4); r.disc(16, 28.5, 3.2); r.rect(12, 26, 13, 30, false); // the hump of his back, his head, the gap at his neck
  r.rect(12, 33, 19, 34); r.rect(19, 25, 20, 34); // his arm out and up to the knob
  r.rect(3, 38, 13, 39); // the stool's seat on its post
  return r;
}

/** Where the balls are at a step: three of them falling at their own paces, bouncing off the pins sideways. */
function balls(step: number, phase: number): (readonly [number, number])[] {
  const sway = [0, 3, 5, 2, -1, -3, -4, -1] as const;
  return [0, 1, 2].map((i): readonly [number, number] => {
    const t = (step * 2 + phase + i * 5) % 14;
    return [6 + i * 5 + (sway[(step + i * 3) % STEPS] ?? 0), t];
  });
}

function pachinko(name: string, colour: number): NewDecor {
  const r = machine(balls(0, 0));
  const c = String(colour.toString(16));
  return decor(name, W, H, r, [c.repeat(W), c.repeat(W), c.repeat(W), 'e'.repeat(W), 'e'.repeat(W)]);
}

/** The pictures of the glass's six characters at each step (6 x 8 bytes), the machine's phase making two machines of different looks fall out of step. */
export function pachinkoFrames(phase: number): Uint8Array[] {
  return Array.from({ length: STEPS }, (_, step) => characters(`pachinko glass ${step}`, machine(balls(step, phase)).rows(), W, H).slice(8 * GLASS_CELLS[0], 8 * (GLASS_CELLS[5] + 1)));
}

export const JAPAN_PACHINKO = {
  jpPachinkoOrange: pachinko('jpPachinkoOrange', 8),
  jpPachinkoGreen: pachinko('jpPachinkoGreen', 13),
} as const satisfies Record<string, NewDecor>;
