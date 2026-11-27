import { FRAME } from '../../shared/monty/frames';
import { PLAY_COL, PLAY_COLS, PLAY_ROW, ROW, SCREEN } from '../../shared/monty/screen';
import type { Seq } from '../../shared/monty/deaths';
import { FIRST_DECOR_CHR } from '../../montyotr/src/decor-chars';
import type { Game } from '../../montyotr/src/game';
import { CROWD_COLOURS, CROWD_MC, FULL_FEET, FULL_MONTY_PICTURES, LYING_FEET, POSE_SHADES_DX, type FullMontyPicture } from './art/full-monty';
import { HAT_BLOCKS } from './hats';
import { BEACH_VIEW } from './rio';

/**
 * THE FULL MONTY: Do Svidaniya Monty's best ending, played after the finale's dance at 100% complete (montyotr's percent.ts; Chris, 2026-11-25, as he picked it:
 * Monty's reveal and the beach together, a nod to Metroid's suit-off reward and Auf Wiedersehen Monty's beach girl). Cartoon, in the game's style; the finale before
 * it is untouched (its close-up, the bowl, the dance). In two shots on Copacabana, the room's name THE FULL MONTY:
 *
 * 1. the close-up: a cut, and Monty faces us with every regional costume of the journey on at once, stacked on his head in the journey's order (the ushanka, the
 *    rice hat, the hood, the lei, the chullo, the headdress on top); they fly off him all together, and he stands as bare as he always is (he is a mole); he snaps on a speedo
 *    and sunglasses, the first clothes of his own he has worn all game, strikes a pose (a glint off the glasses), and turns his back to us;
 * 2. up the beach: a cut to the sand stretching from the shore, the crowd on it (a volleyball game, a sunbather in trunks under his umbrella, a sunbather in a
 *    bikini on her towel); he walks away from the camera up the beach past them (the speedo from behind), smaller as he goes, and settles on a towel beside the bikini; the
 *    picture fades out.
 *
 * Sprites: the costumes 0, 1, 2, 4, 5, 6 as they fly (the chair 7 stays in shot 1), then the speedo 0, the glasses 1, the glint 2; in shot 2 the crowd 4, 5, 6, 7
 * and the ball 2. Its pictures go into the hat pool's blocks (hats.ts `HAT_BLOCKS`: nothing wears a hat from here to GAME OVER, and a new game's bank is the game's).
 */

/** What the finale hands on: the sand's top (VIC lines), where Monty stands to dance (a sprite x), a playfield pixel as a sprite x, the sand's colour. */
export interface FullMontyStage { feet: number; standSx: number; sxOf: (px: number) => number; sand: number }

/** The room's name for it. */
export const FULL_MONTY_NAME = 'THE FULL MONTY';

/** The sprites the costumes fly on (the chair, 7, stays; Monty is 3). */
const FLYERS = [0, 1, 2, 4, 5, 6] as const;
const S = { speedo: 0, shades: 1, glint: 2, monty: 3, chair: 7 } as const;
/** Monty's colour (the engine's). */
const MONTY = 15;

/** The pictures' blocks: the hats' first (one a costume), then the sequence's own. */
const PICTURE_NAMES = Object.keys(FULL_MONTY_PICTURES).filter((k): k is FullMontyPicture => k in FULL_MONTY_PICTURES);
const HAT_PTRS = HAT_BLOCKS.slice(0, FLYERS.length);
if (FLYERS.length + PICTURE_NAMES.length > HAT_BLOCKS.length) throw new Error('THE FULL MONTY needs more blocks than the hat pool has');
/** A picture's block. */
const ptrOf = (name: FullMontyPicture): number => HAT_BLOCKS[FLYERS.length + PICTURE_NAMES.indexOf(name)] ?? 0;
const PTR = {
  front: ptrOf('front'), pose: ptrOf('pose'), backA: ptrOf('backA'), backB: ptrOf('backB'), lying: ptrOf('lying'),
  speedoFront: ptrOf('speedoFront'), speedoPose: ptrOf('speedoPose'), speedoBack: ptrOf('speedoBack'), speedoLying: ptrOf('speedoLying'),
  shadesFront: ptrOf('shadesFront'), shadesLying: ptrOf('shadesLying'),
  bikini: ptrOf('bikini'), umbrella: ptrOf('umbrella'), towel: ptrOf('towel'), volley: ptrOf('volley'), ball: ptrOf('ball'), glint: ptrOf('glint'),
} as const satisfies Record<FullMontyPicture, number>;

/** The fade to black: each colour's next darker. */
const DARKER = [0, 15, 9, 14, 11, 11, 0, 15, 9, 0, 8, 0, 11, 5, 6, 12] as const;

/** The VIC line of the top of a playfield row (row 18 is the sand's top, `feet`). */
const rowLine = (st: FullMontyStage, row: number) => st.feet + (row - 18) * 8;

export function* fullMonty(g: Game, st: FullMontyStage): Seq {
  // the pictures in; each costume's picture on his walk (the hat as it sits on his head) in a block of its own
  for (const name of PICTURE_NAMES) g.mem.set(FULL_MONTY_PICTURES[name], ptrOf(name) * 64);
  const hats = g.data.costumes.flatMap((c, i) => {
    const at = c.over?.frames.get(FRAME.walkRight) ?? c.over?.frames.values().next().value;
    const pic = at ? c.blocks.find((b) => b.ptr === at.ptr) : undefined;
    const ptr = HAT_PTRS[i];
    if (!c.over || !at || !pic || ptr === undefined) return [];
    g.mem.set(pic.block, ptr * 64);
    return [{ ptr, colour: c.over.colour, rows: litRows(pic.block), cols: litCols(pic.block) }];
  });
  if (hats.length !== FLYERS.length) throw new Error(`THE FULL MONTY stacks ${FLYERS.length} costumes; the game has ${hats.length}`);

  /** What is on the picture: each sprite's drawing, put again every frame (the engine's own frame takes sprites 0 and 1 for the room's items). */
  const cast = new Map<number, () => void>();
  /** A sprite at sprite x `sx` with its picture's `h`th row on VIC line `y` (expanded: twice as wide and tall, as the finale's actors). */
  const put = (n: number, ptr: number, colour: number, sx: number, y: number, h: number, big = true, multicolour = false) => {
    const bit = 1 << n;
    cast.set(n, () => {
      g.sx[n] = sx & 0xff; g.sy[n] = (y - (big ? 2 : 1) * h) & 0xff; g.sptr[n] = ptr; g.scol[n] = colour;
      g.enable |= bit;
      g.expandX = big ? g.expandX | bit : g.expandX & ~bit & 0xff; g.expandY = big ? g.expandY | bit : g.expandY & ~bit & 0xff;
      g.multicolour = multicolour ? g.multicolour | bit : g.multicolour & ~bit & 0xff;
    });
  };
  const off = (...ns: number[]) => { for (const n of ns) { cast.delete(n); g.enable &= ~(1 << n) & 0xff; } };
  /** `n` frames, `each` setting the cast first. */
  const frames = function* (n: number, each?: (t: number) => void): Seq {
    for (let t = 0; t < n; t++) { each?.(t); for (const draw of cast.values()) draw(); yield; }
  };
  /** A cut: the playfield black for a moment, then as it was (`then` changes it while it is black). */
  const cut = function* (then: () => void): Seq {
    const colours = Uint8Array.from(g.col);
    g.col.fill(0, PLAY_ROW * ROW, (PLAY_ROW + 20) * ROW);
    yield* frames(12);
    g.col.set(colours);
    then();
  };
  const playTop = rowLine(st, 0);

  // ---- 1. the close-up: a cut, the name, Monty facing us in every costume -----------------------------------------------
  off(0, 1, 2, 4, 5, 6);
  yield* cut(() => {
    for (const [col, row] of BEACH_VIEW.fireworks) tint(g, col, row, 4, 4, 0); // (the fireworks over)
    g.showName(FULL_MONTY_NAME);
  });
  const sx = st.standSx, feet = st.feet;
  const montyAt = (ptr: number) => put(S.monty, ptr, MONTY, sx, feet, FULL_FEET);
  /**
   * The stack (each block's top, VIC lines): over his head's middle (picture column 6), piled from the crown of his head (row 3 of his picture) in the journey's
   * order (each costume as it sits on his head on his walk), each a pixel into the one under it (expanded: two lines a pixel).
   */
  const headTop = feet - 2 * FULL_FEET;
  let base = headTop + 2 * 3;
  const stack = hats.map((hat) => {
    const y = base - 2 * (hat.rows.to + 1);
    base = y + 2 * (hat.rows.from + 1);
    return { ...hat, x: sx + Math.round(6 - (hat.cols.from + hat.cols.to) / 2), y };
  });
  const showStack = (wobble: number) => stack.forEach((h, i) => put(FLYERS[i] ?? 0, h.ptr, h.colour, h.x + (i > 1 ? Math.round(wobble * (i - 1)) : 0), h.y, 0));
  montyAt(PTR.front);
  yield* frames(70, (t) => showStack(t > 30 ? Math.sin(t / 3) * 0.8 : 0));
  // they fly off him all at once: each its own way, up and out, then down off the picture
  g.sfx(g.data.sfx.jump);
  const flight = stack.map((_, i) => ({ vx: [-3, 3, -2, 2, -4, 4][i] ?? 0, vy: -3 - (i % 3) }));
  yield* frames(64, (t) => stack.forEach((h, i) => {
    const n = FLYERS[i] ?? 0, f = flight[i];
    if (!f) return;
    const x = h.x + f.vx * t, y = h.y + f.vy * t + Math.floor((t * t) / 8);
    if (y < playTop || y > feet + 8 || x < 4 || x > 0xb0) off(n);
    else put(n, h.ptr, h.colour, x, y, 0);
  }));
  off(...FLYERS);
  // bare, as he always is
  yield* frames(50);
  // the speedo snapped on (up from his knees to his hips), then the glasses (down onto his eyes)
  yield* frames(7, (t) => put(S.speedo, PTR.speedoFront, CROWD_COLOURS.speedo, sx, feet + 2 * (6 - t), FULL_FEET));
  g.sfx(g.data.sfx.coin);
  yield* frames(20);
  yield* frames(9, (t) => put(S.shades, PTR.shadesFront, CROWD_COLOURS.shades, sx, feet - 2 * (8 - t), FULL_FEET));
  g.sfx(g.data.sfx.item);
  yield* frames(30);
  // the pose: fists up, a glint off the glasses
  const poseSx = sx - POSE_SHADES_DX;
  put(S.monty, PTR.pose, MONTY, poseSx, feet, FULL_FEET);
  put(S.speedo, PTR.speedoPose, CROWD_COLOURS.speedo, poseSx, feet, FULL_FEET);
  yield* frames(90, (t) => {
    if (t >= 30 && t < 42) put(S.glint, PTR.glint, CROWD_COLOURS.glint, sx + 8, headTop + 2 * 4 + 6, 2, false);
    else off(S.glint);
  });
  // he turns his back to us
  off(S.shades);
  put(S.monty, PTR.backA, MONTY, sx, feet, FULL_FEET);
  put(S.speedo, PTR.speedoBack, CROWD_COLOURS.speedo, sx, feet, FULL_FEET);
  yield* frames(40);

  // ---- 2. up the beach: a cut, the sand from the shore down, the crowd; he walks away from us to the towel -----------------
  off(S.monty, S.speedo, S.chair);
  yield* cut(() => {
    beachUp(g, st.sand);
    g.vic.mc1 = CROWD_MC.skin; g.vic.mc2 = CROWD_MC.cloth;
    g.priority = 0;
  });
  put(4, PTR.volley, CROWD_COLOURS.net, st.sxOf(VOLLEY_PX), rowLine(st, 15), LYING_FEET, false, true);
  // (the volleyball and the umbrella far up the beach, at the sprites' small size; the bikini and the towel nearer, at his)
  put(5, PTR.umbrella, CROWD_COLOURS.umbrella, st.sxOf(84), rowLine(st, 15) + 2, LYING_FEET, false, true);
  put(6, PTR.bikini, CROWD_COLOURS.bikiniTowel, st.sxOf(TOWELS.bikini), TOWEL_Y(st), LYING_FEET, true, true);
  put(7, PTR.towel, CROWD_COLOURS.montyTowel, st.sxOf(TOWELS.monty), TOWEL_Y(st), LYING_FEET, true, true);
  /** The volleyball's ball: over the net from one player to the other and back. */
  let t = 0;
  const ball = () => {
    const k = (t % 50) / 50, way = Math.floor(t / 50) % 2 === 0 ? k : 1 - k;
    put(S.glint, PTR.ball, CROWD_COLOURS.ball, st.sxOf(VOLLEY_PX + 2 + Math.round(way * 18)), rowLine(st, 15) - 14 - Math.round(Math.sin(k * Math.PI) * 10), 4, false);
    t++;
  };
  yield* frames(30, ball);
  // he walks in from under the camera and on up the beach, away from us
  const to = { x: TOWELS.monty + 12, y: TOWEL_Y(st) - 2 }, from = { x: to.x - 24, y: rowLine(st, 20) };
  const steps = 170;
  yield* frames(steps + 1, (k) => {
    ball();
    const f = k / steps, x = Math.round(from.x + (to.x - from.x) * f), y = Math.round(from.y + (to.y - from.y) * f);
    const stride = (k >> 3) % 2;
    put(S.monty, stride ? PTR.backB : PTR.backA, MONTY, st.sxOf(x), y - stride, FULL_FEET);
    put(S.speedo, PTR.speedoBack, CROWD_COLOURS.speedo, st.sxOf(x), y - stride, FULL_FEET);
  });
  // settled on his towel beside her: lying back, the glasses on
  const towelY = TOWEL_Y(st) - 2;
  put(S.monty, PTR.lying, MONTY, st.sxOf(TOWELS.monty), towelY, LYING_FEET);
  put(S.speedo, PTR.speedoLying, CROWD_COLOURS.speedo, st.sxOf(TOWELS.monty), towelY, LYING_FEET);
  put(S.shades, PTR.shadesLying, CROWD_COLOURS.shades, st.sxOf(TOWELS.monty), towelY, LYING_FEET);
  yield* frames(100, ball);
  // the fade out (the sprites' colours with the picture's)
  cast.clear();
  for (let step = 0; step < 5; step++) {
    for (let i = 0; i < g.col.length; i++) g.col[i] = DARKER[(g.col[i] ?? 0) & 15] ?? 0;
    for (let n = 0; n < 8; n++) g.scol[n] = DARKER[(g.scol[n] ?? 0) & 15] ?? 0;
    g.vic.mc1 = DARKER[g.vic.mc1 & 15] ?? 0; g.vic.mc2 = DARKER[g.vic.mc2 & 15] ?? 0;
    yield* frames(8);
  }
  g.enable = 0;
  g.col.fill(0, PLAY_ROW * ROW, (PLAY_ROW + 20) * ROW);
  yield* frames(30);
}

/** The colour of a block of the playfield's cells. */
function tint(g: Game, col: number, row: number, w: number, h: number, colour: number) {
  for (let r = 0; r < h; r++) for (let k = 0; k < w; k++) g.col[(row + r + PLAY_ROW) * ROW + col + k + PLAY_COL] = colour;
}

/** Where the volleyball game is (playfield pixels, its left edge): up the beach on the left, near the shore. */
const VOLLEY_PX = 12;

/** Where the towels lie (playfield pixels, their left edge, each 48 wide at his size): hers, and his beside it to the east; and the line their feet are on. */
const TOWELS = { bikini: 148, monty: 200 } as const;
const TOWEL_Y = (st: FullMontyStage) => rowLine(st, 17) + 4;

/**
 * Shot 2's beach: the sand plain from the shore (row 13) down to the playfield's foot, in the close-up's sand colour, the gutters beside the playfield as the room's
 * loading mirrors them; the umbrella the chair stood under is not in this view (a sprite's umbrella stands on the sand instead: a character pole would show the black behind it).
 */
function beachUp(g: Game, sand: number) {
  const at = (col: number, row: number) => (row + PLAY_ROW) * ROW + col + PLAY_COL;
  const solid = g.mem[SCREEN + at(0, 18)] ?? 0, sea = g.mem[SCREEN + at(0, 12)] ?? 0, seaColour = g.col[at(0, 12)] ?? 0;
  const { umbrella, pole } = BEACH_VIEW;
  for (let row = umbrella.row; row < umbrella.row + 2; row++) for (let col = umbrella.col; col < umbrella.col + 8; col++) g.mem[SCREEN + at(col, row)] = 0;
  g.mem[SCREEN + at(pole.col, 12)] = sea; g.col[at(pole.col, 12)] = seaColour;
  for (let row = 13; row < 20; row++) for (let col = 0; col < PLAY_COLS; col++) {
    if ((g.mem[SCREEN + at(col, row)] ?? 0) >= FIRST_DECOR_CHR && col !== pole.col) continue;
    g.mem[SCREEN + at(col, row)] = solid; g.col[at(col, row)] = sand;
  }
  for (let r = PLAY_ROW; r < PLAY_ROW + 20; r++) {
    const a = r * ROW;
    g.mem[SCREEN + a + 2] = g.mem[SCREEN + a + 3] = g.mem[SCREEN + a + 4] ?? 0;
    g.mem[SCREEN + a + 36] = g.mem[SCREEN + a + 37] = g.mem[SCREEN + a + 35] ?? 0;
    g.col[a + 2] = g.col[a + 3] = g.col[a + 4] ?? 0;
    g.col[a + 36] = g.col[a + 37] = g.col[a + 35] ?? 0;
  }
}

/** The rows of a sprite block with a lit pixel: the first and the last. */
function litRows(b: Uint8Array): { from: number; to: number } {
  let from = 21, to = -1;
  for (let y = 0; y < 21; y++) if ((b[y * 3] ?? 0) | (b[y * 3 + 1] ?? 0) | (b[y * 3 + 2] ?? 0)) { from = Math.min(from, y); to = y; }
  return to < 0 ? { from: 0, to: 0 } : { from, to };
}

/** The columns of a sprite block with a lit pixel: the first and the last. */
function litCols(b: Uint8Array): { from: number; to: number } {
  let from = 24, to = -1;
  for (let x = 0; x < 24; x++) for (let y = 0; y < 21; y++) if ((b[y * 3 + (x >> 3)] ?? 0) & (0x80 >> (x & 7))) { from = Math.min(from, x); to = Math.max(to, x); break; }
  return to < 0 ? { from: 0, to: 0 } : { from, to };
}
