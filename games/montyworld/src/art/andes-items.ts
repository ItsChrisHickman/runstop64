/**
 * The Andes' items and moving parts for Monty Mole: World Tour (region 6): the chullo, the panpipes and the machete (the key items), the
 * empanada (the food in place of the cupcake), the parachute's canopy (the flying section's sprite over Monty), the rolling boulder's
 * four frames (T2's terraces) and the swinging vine's segments in every angle (P's river). Hires sprite blocks as the earlier regions'
 * items are (siberia-items.ts): a solid shape with the detail cut into it.
 */
import { PIRANHA_PICTURE } from './andes-creatures';
import { itemBlock, spriteBlock } from './pixels';
import { CHULLO_COLOUR, CHULLO_HAT } from './andes-hat';
import { limb, over, Raster } from './raster';
import type { NewDecor, NewItem } from './types';
import { wantedBlink, wantedPicture } from './wanted';

/** The chullo, the Andean knitted hat, as it is worn (andes-hat.ts): a peaked crown with a tassel, a patterned band and two long ear flaps. */
const chulloPicture = (): readonly string[] => [...CHULLO_HAT, '.'.repeat(16)];

/** The panpipes (zampona): reed tubes of growing length bound together, their mouths cut dark. */
function panpipesPicture(): readonly string[] {
  const r = new Raster(16, 16);
  [14, 12, 10, 8, 6].forEach((h, i) => {
    r.rect(1 + i * 3, 15 - h, 2 + i * 3, 15);
    r.rect(1 + i * 3, 15 - h, 2 + i * 3, 15 - h + 1, false); r.rect(1 + i * 3, 15 - h + 1, 2 + i * 3, 15 - h + 1); // the open mouth
    r.rect(1 + i * 3, 15 - h + 1, 1 + i * 3, 15 - h + 1, false);
  });
  r.rect(0, 9, 15, 10); // the binding
  r.rect(0, 9, 15, 9, false); r.rect(0, 10, 15, 10);
  r.rect(0, 12, 15, 12);
  r.rect(0, 11, 15, 11, false);
  return r.rows();
}

/** The machete: a long broad blade slanting up to the right, a guard across its root and a handle. */
function machetePicture(): readonly string[] {
  const r = new Raster(16, 16);
  limb(r, 14, 1.5, 6.5, 9, 4); // the blade
  r.triangle(15.5, 0, 15.5, 4, 11.5, 0); // its point
  r.line(13, 2.5, 7.5, 8, false); // the groove
  const guard = new Raster(16, 16); limb(guard, 3.5, 8, 8.5, 13, 2); over(r, guard);
  const handle = new Raster(16, 16); limb(handle, 5.5, 11, 1.5, 15, 3); over(r, handle);
  r.cut(['#'], 3, 13); r.cut(['#'], 4, 12);
  return r.rows();
}

/** An empanada: a half-moon pastry, its edge crimped, two slits in the top. Golden. */
function empanada(): NewItem {
  const r = new Raster(16, 16);
  r.ellipse(7.5, 11, 7.6, 6.6);
  r.rect(0, 12, 15, 15, false);
  r.rect(0, 11, 15, 12);
  r.rect(0, 13, 15, 13, false); // (the flat base)
  r.rect(0, 12, 15, 12);
  for (let a = 200; a <= 340; a += 18) r.set(7.5 + Math.cos((a * Math.PI) / 180) * 6.4, 11.4 + Math.sin((a * Math.PI) / 180) * 5.6, false); // the crimp
  r.cut(['..#', '.#.'], 5, 6); r.cut(['..#', '.#.'], 9, 6); // the slits
  r.rect(1, 12, 14, 12, false); r.rect(1, 13, 14, 13);
  return { block: itemBlock('empanada', r.rows()), colour: 7 };
}

/** Each key item's picture and its ink: the item (a hires sprite) and the gate's picture of what it wants (characters, art/wanted.ts) are drawn from the one picture. */
const KEYS = {
  chullo: { picture: chulloPicture, ink: CHULLO_COLOUR },
  panpipes: { picture: panpipesPicture, ink: 7 },
  machete: { picture: machetePicture, ink: 12 },
} as const;
const item = (key: keyof typeof KEYS): NewItem => ({ block: itemBlock(key, KEYS[key].picture()), colour: KEYS[key].ink });

export const ANDES_ITEMS = {
  chullo: item('chullo'),
  panpipes: item('panpipes'),
  machete: item('machete'),
  empanada: empanada(),
} as const satisfies Record<string, NewItem>;

/**
 * The Andes' gates' pictures of what they want (LESSONS: a gate shows what it wants before he has it): the panpipes over the spitting llama at the tunnel's mouth, the chullo over the riverboat's captain,
 * the machete over the tangle on the kapok's branch, each blinking until he uses the item there (data.ts clears it). The machete's in white: its grey is lost on the crown's leaves.
 */
export const ANDES_WANTED = {
  andWantPanpipes: wantedPicture('andWantPanpipes', panpipesPicture(), KEYS.panpipes.ink),
  andWantChullo: wantedPicture('andWantChullo', chulloPicture(), KEYS.chullo.ink),
  andWantMachete: wantedPicture('andWantMachete', machetePicture(), 1),
} as const satisfies Record<string, NewDecor>;
export const ANDES_WANTED_FRAMES = {
  andWantPanpipes: wantedBlink('want panpipes', panpipesPicture()),
  andWantChullo: wantedBlink('want chullo', chulloPicture()),
  andWantMachete: wantedBlink('want machete', machetePicture()),
} as const satisfies Record<keyof typeof ANDES_WANTED, readonly Uint8Array[]>;

export type AndesItem = keyof typeof ANDES_ITEMS;

// ---- the parachute's canopy

/**
 * The open canopy over Monty (a 24 x 21 sprite, its colour its own): a round dome with its gores cut in, a scalloped skirt, and the lines
 * that run down to his hands (the bottom middle). `tilt` leans it into a turn: -1 left, 0 level, 1 right.
 */
function canopy(tilt: number): Uint8Array {
  const r = new Raster(24, 21);
  const cx = 11.5 + tilt * 1.5;
  r.ellipse(cx, 6, 11.5, 6.3); r.rect(0, 6, 23, 8);
  r.rect(0, 9, 23, 20, false);
  for (const dx of [-8, -4, 0, 4, 8]) r.line(cx + dx * 0.4, 0, cx + dx, 9, false); // the gores
  for (let x = 1; x < 23; x += 6) r.ellipse(x + 2.5, 9, 3, 1.8, false); // the skirt's scallops: dark bites
  for (const x of [0, 6, 12, 18, 23]) r.line(x, 9, 11.5 + tilt, 20); // the lines
  return spriteBlock('canopy', r.rows());
}

export const CANOPY = { level: canopy(0), left: canopy(-1), right: canopy(1), colour: 2 } as const;

// ---- the rolling boulder

/** A boulder, four rolling frames (16 x 16, a quarter turn of the cracks each): a round rock with a stern face and chips. */
function boulderFrame(turn: number): string[] {
  const r = new Raster(16, 16);
  r.disc(7.5, 7.5, 7.6);
  for (let k = 0; k < 3; k++) {
    const a = ((k * 120 + 10 + turn * 30) * Math.PI) / 180;
    r.ellipse(7.5 + Math.cos(a) * 7.4, 7.5 + Math.sin(a) * 7.4, 1.4, 1.4, false); // the chips knocked from the rim, turning
  }
  r.cut(['###', '#..'], 3, 4); r.cut(['###', '..#'], 9, 4); // the stern brows
  r.cut(['##'], 4, 6); r.cut(['##'], 10, 6); // the eyes
  r.cut(['#######'], 4, 10); // the grim mouth
  return r.rows();
}

export const BOULDER_FRAMES: readonly NewItem[] = [0, 1, 2, 3].map((t) => ({ block: itemBlock(`boulder ${t}`, boulderFrame(t)), colour: 9 }));

// ---- the swinging vine

/** The angles a vine hangs at: from 40 degrees left of straight down to 40 right, ten degrees apart. */
export const VINE_ANGLES = [-40, -30, -20, -10, 0, 10, 20, 30, 40] as const;

/**
 * One segment of a vine at an angle (a 24 x 21 sprite): a stem 20 pixels long from the top middle, leaning `deg` from straight down,
 * leaves along it. The engine puts as many segments end to end as the vine is long (three: 60 pixels), each at the same angle.
 */
export function vineSegment(deg: number): Uint8Array {
  const r = new Raster(24, 21);
  const a = (deg * Math.PI) / 180, len = 20;
  const sx = Math.sin(a), sy = Math.cos(a);
  limb(r, 11.5, 0, 11.5 + sx * len, sy * len, 2);
  for (const t of [5, 11, 17]) {
    const px = 11.5 + sx * t, py = sy * t;
    r.triangle(px, py, px - 5, py + 2, px - 2, py + 4); // a leaf each side
    r.triangle(px + 1, py + 1, px + 6, py + 3, px + 3, py + 5);
  }
  return spriteBlock(`vine ${deg}`, r.rows());
}

export const VINE_SEGMENTS: readonly { readonly deg: number; readonly block: Uint8Array }[] = VINE_ANGLES.map((deg) => ({ deg, block: vineSegment(deg) }));
export const VINE_COLOUR = 5;

/** Every sprite of the region as a list for the preview sheets: the items, the canopy, the boulder and some vines. */
export const ANDES_SPRITES: Readonly<Record<string, NewItem>> = {
  ...ANDES_ITEMS,
  canopyLevel: { block: CANOPY.level, colour: CANOPY.colour },
  canopyLeft: { block: CANOPY.left, colour: CANOPY.colour },
  canopyRight: { block: CANOPY.right, colour: CANOPY.colour },
  boulder0: BOULDER_FRAMES[0] ?? ANDES_ITEMS.chullo,
  boulder1: BOULDER_FRAMES[1] ?? ANDES_ITEMS.chullo,
  boulder2: BOULDER_FRAMES[2] ?? ANDES_ITEMS.chullo,
  boulder3: BOULDER_FRAMES[3] ?? ANDES_ITEMS.chullo,
  vineLeft: { block: vineSegment(-30), colour: VINE_COLOUR },
  vineDown: { block: vineSegment(0), colour: VINE_COLOUR },
  vineRight: { block: vineSegment(30), colour: VINE_COLOUR },
};

// ---- the leaping piranha

/** A picture turned a quarter: clockwise (a fish facing left then faces up) or anticlockwise (it faces down). */
function turned(rows: readonly string[], clockwise: boolean): string[] {
  const n = rows.length;
  return Array.from({ length: n }, (_, y) => Array.from({ length: n }, (_, x) => (clockwise ? rows[n - 1 - x]?.[y] : rows[x]?.[n - 1 - y]) ?? '.').join(''));
}

/** The river's piranha in the air (16 x 16): leaping nose up, level at the top of its arc (it faces right as it comes down the far side), and diving nose down: the piranha of the first build turned. */
export const LEAP_FRAMES: readonly NewItem[] = [turned(PIRANHA_PICTURE, true), PIRANHA_PICTURE, turned(PIRANHA_PICTURE, false)].map((rows, i) => ({ block: itemBlock(`leap ${i}`, rows), colour: 2 }));
